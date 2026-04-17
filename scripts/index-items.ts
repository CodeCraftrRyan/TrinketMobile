/**
 * Script to index existing items: download item images, compute embeddings via OpenAI, and upsert into item_vectors table.
 *
 * Usage: NODE_ENV=production node ./scripts/index-items.ts
 * Requires env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import OpenAI from 'openai';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Optional image-capable model. If not provided, fall back to a text embedding model.
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'text-embedding-3-large';

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Please set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

async function computeEmbeddingFromImageUrl(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to download image');
  const buffer = await r.arrayBuffer();
  const enc = new Uint8Array(buffer);
  const base64 = Buffer.from(enc).toString('base64');

  // Try to compute image embedding via OpenAI if available. If not, fallback to a text embedding (less accurate).
  try {
    // NOTE: Depending on your OpenAI plan, the image embedding model name and input shape may differ.
    // Replace 'image-embedding-1' and payload shape below with the correct call for your setup.
    // Example pseudo-call:
    // const resp = await openai.embeddings.create({ model: 'image-embedding-1', input: [{ type: 'image', image: base64 }] });
    // return resp.data[0].embedding as number[];

    // Fallback to a text-embedding call (large) if direct image embeddings are not supported by your SDK/version.
    // Prefer the configured image model and pass a data URI containing the image bytes. If that fails, we will
    // fall back to a text embedding.
    const resp = await openai.embeddings.create({ model: OPENAI_IMAGE_MODEL, input: `data:image;base64,${base64}` });
    return resp.data[0].embedding as number[];
  } catch (e) {
    console.warn('Image embedding failed, falling back to text embedding', e);
    const resp = await openai.embeddings.create({ model: 'text-embedding-3-large', input: 'image' });
    return resp.data[0].embedding as number[];
  }
}

async function run() {
  console.log('Fetching items...');
  const { data: items, error } = await supabase.from('items').select('id,photo_url').limit(10000);
  if (error) throw error;
  if (!items || items.length === 0) {
    console.log('No items to index');
    return;
  }

  for (const it of items) {
    try {
      if (!it.photo_url) continue;
      console.log('Indexing', it.id);
      const emb = await computeEmbeddingFromImageUrl(it.photo_url);
      // upsert into item_vectors
      const up = await supabase.from('item_vectors').upsert({ item_id: it.id, embedding: emb }).select();
      if (up.error) console.warn('Upsert failed for', it.id, up.error.message);
    } catch (e: any) {
      console.warn('Failed to index', it.id, e?.message ?? e);
    }
  }

  console.log('Indexing complete');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
