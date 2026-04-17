/**
 * Lightweight image-search server function using OpenAI embeddings + Supabase vector table.
 *
 * Expects POST { imageUrl: string }
 * Returns { results: [{ id, score }] }
 *
 * Env required:
 * - OPENAI_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Supabase Edge Function handler
// Expects POST { imageUrl }

const OPENAI_KEY = process.env.OPENAI_API_KEY;
// Models used by this function. OPENAI_IMAGE_MODEL may be a vision/chat-capable model (e.g. gpt-4.1-mini).
// OPENAI_EMBEDDING_MODEL is used to produce numeric vectors (e.g. text-embedding-3-small).
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || '';
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Timeouts (ms) to avoid letting external calls hang and trigger platform EarlyDrop
const TIMEOUT_IMAGE_FETCH_MS = 10_000; // 10s
const TIMEOUT_OPENAI_MS = 20_000; // 20s
const TIMEOUT_SUPABASE_MS = 15_000; // 15s

async function withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
  let timer: any = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer as any);
  }
}

export default async function handler(req: Request) {
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    const body = await req.json();
    const { imageUrl } = body || {};
    if (!imageUrl) return new Response(JSON.stringify({ error: 'imageUrl is required' }), { status: 400 });

    // Validate required secrets early
    if (!OPENAI_KEY) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
    if (!SUPABASE_SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });

    // Fetch the image with a timeout
    let r: Response;
    try {
      r = await withTimeout(fetch(imageUrl), TIMEOUT_IMAGE_FETCH_MS, 'Image fetch timed out');
    } catch (e: any) {
      console.warn('Image fetch error', e?.message ?? e);
      return new Response(JSON.stringify({ error: 'Could not fetch image', detail: String(e?.message ?? e) }), { status: 400 });
    }
    if (!r.ok) return new Response(JSON.stringify({ error: 'Could not fetch image', status: r.status }), { status: 400 });
    const buffer = await r.arrayBuffer();
    const enc = new Uint8Array(buffer);
    const base64 = Buffer.from(enc).toString('base64');

    // Compute an embedding for the query image.
    // Strategy:
    // 1) If OPENAI_IMAGE_MODEL appears to accept direct image embeddings (e.g. model ids containing 'image' or 'embed'),
    //    try calling the embeddings endpoint with the data URI.
    // 2) Otherwise (vision/chat model like gpt-4.1-mini), call the model to produce a short caption/description
    //    and then embed that caption with OPENAI_EMBEDDING_MODEL.
    let queryEmbedding: number[] | null = null;
    const imageModel = OPENAI_IMAGE_MODEL;
    const embedModel = OPENAI_EMBEDDING_MODEL;
    const looksLikeImageEmbeddingModel = /image|embed|embedding|gpt-image|clip/i.test(imageModel || '');

    if (imageModel && looksLikeImageEmbeddingModel) {
      try {
        const embPromise = openai.embeddings.create({ model: imageModel, input: `data:image;base64,${base64}` });
        const embResp: any = await withTimeout(embPromise, TIMEOUT_OPENAI_MS, 'OpenAI embedding timed out');
        queryEmbedding = embResp.data?.[0]?.embedding as number[];
      } catch (e: any) {
        console.warn('OpenAI image-embedding attempt failed', e?.message ?? e);
      }
    }

    // If no embedding yet, and we have a vision/chat model configured, ask the model for a short caption
    // and embed that caption using the embedding model.
    if (!queryEmbedding) {
      try {
        if (!imageModel) throw new Error('No OPENAI_IMAGE_MODEL configured');

        // Use the Responses API to ask the vision/chat model to describe the image briefly.
        // We pass a short prompt instructing a concise caption.
        const respPromise = openai.responses.create({
          model: imageModel,
          input: `Give a concise (1-2 sentence) description of the following image: data:image;base64,${base64}`,
        });
        const resp: any = await withTimeout(respPromise, TIMEOUT_OPENAI_MS, 'OpenAI vision model timed out');

        // Extract text from the response in a few common shapes.
        let caption: string | null = null;
        if (resp?.output && Array.isArray(resp.output) && resp.output.length > 0) {
          // New Responses API: output may be array with content objects
          const out = resp.output[0];
          if (typeof out === 'string') caption = out;
          else if (Array.isArray(out?.content)) {
            // content array of {type, text}
            const textParts = out.content.map((c: any) => (typeof c === 'string' ? c : c?.text)).filter(Boolean);
            caption = textParts.join(' ');
          } else if (out?.content && typeof out.content === 'string') caption = out.content;
        }
        // Fallback older shape: resp.output_text
        if (!caption) caption = resp?.output_text || resp?.text || null;

        if (!caption) throw new Error('Could not extract caption from vision model response');

        // Now embed the caption with the embedding model
        const embResp: any = await withTimeout(openai.embeddings.create({ model: embedModel, input: caption }), TIMEOUT_OPENAI_MS, 'OpenAI embedding timed out');
        queryEmbedding = embResp.data?.[0]?.embedding as number[];
      } catch (e: any) {
        console.warn('OpenAI vision->caption->embed path failed', e?.message ?? e);
        return new Response(JSON.stringify({ error: 'OpenAI embedding failed', detail: String(e?.message ?? e) }), { status: 502 });
      }
    }

    if (!queryEmbedding) return new Response(JSON.stringify({ error: 'Could not compute embedding' }), { status: 500 });

    // Call Supabase RPC to match vectors
    let rpcRes: any;
    try {
  // supabase.rpc may not present as a native Promise type in some builds; wrap with Promise.resolve
  // Use the unambiguous RPC wrapper name to avoid PostgREST overload selection problems.
  rpcRes = await withTimeout(Promise.resolve(supabase.rpc('match_item_vectors_v1', { query_embedding: queryEmbedding, limit_count: 20 })), TIMEOUT_SUPABASE_MS, 'Supabase RPC timed out');
    } catch (e: any) {
      console.warn('Supabase RPC error', e?.message ?? e);
      return new Response(JSON.stringify({ error: 'Supabase RPC failed', detail: String(e?.message ?? e) }), { status: 502 });
    }
    const { data, error } = rpcRes;
    if (error) {
      console.warn('Supabase search error', error);
      return new Response(JSON.stringify({ error: 'Search failed', detail: error?.message ?? error }), { status: 500 });
    }

    return new Response(JSON.stringify({ results: data }), { status: 200 });
  } catch (e: any) {
    console.error('image-search error', e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500 });
  }
}
