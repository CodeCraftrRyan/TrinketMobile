#!/usr/bin/env node
// scripts/run-e2e-image-search.js
// Usage: node -r dotenv/config scripts/run-e2e-image-search.js <IMAGE_URL>
// Mirrors functions/image-search flow: fetch image, try direct image embedding (if model supports), else ask vision model for a short caption then embed with embedding model, then call Supabase RPC match_item_vectors.

const { Buffer } = require('buffer');

const argv = process.argv.slice(2);
const IMAGE_URL = argv[0] || process.env.TEST_IMAGE_URL || 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';
// Default embedding model set to text-embedding-3-large to match migrations (vector(3072)).
const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID;

if (!OPENAI_KEY) {
  console.error('Missing OPENAI_API_KEY in env.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or service role key in env.');
  process.exit(1);
}
if (!TEST_USER_ID) {
  console.error('Missing TEST_USER_ID in env (the user UUID to scope matches).');
  process.exit(1);
}

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

async function fetchImageAsBase64(url) {
  console.log('Downloading image...', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status} ${res.statusText}`);
  const arr = await res.arrayBuffer();
  const buf = Buffer.from(arr);
  return buf.toString('base64');
}

function looksLikeImageEmbeddingModel(model) {
  if (!model) return false;
  return /image|embed|embedding|gpt-image|clip/i.test(model);
}

async function tryDirectImageEmbedding(model, b64) {
  try {
    console.log('Trying direct image embedding with model:', model);
    const url = 'https://api.openai.com/v1/embeddings';
    const body = { model, input: `data:image;base64,${b64}` };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('Non-JSON response from embeddings endpoint: ' + text); }
    if (!resp.ok) {
      throw new Error(JSON.stringify(data));
    }
    const emb = data?.data?.[0]?.embedding;
    if (!Array.isArray(emb)) throw new Error('No embedding in response');
    return emb;
  } catch (e) {
    console.warn('Direct image embedding failed:', e.message || e);
    return null;
  }
}

async function getCaptionFromVisionModel(model, imageUrl) {
  try {
    console.log('Requesting caption from vision/chat model (using image URL):', model);
    const url = 'https://api.openai.com/v1/responses';
    const payload = {
      model,
      input: `Give a concise (1-2 sentence) description of the following image: ${imageUrl}`,
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    // Try extract caption in a few shapes
    let caption = null;
    if (Array.isArray(data.output) && data.output.length > 0) {
      const out = data.output[0];
      if (typeof out === 'string') caption = out;
      else if (Array.isArray(out?.content)) {
        caption = out.content.map(c => (typeof c === 'string' ? c : c?.text)).filter(Boolean).join(' ');
      } else if (typeof out?.content === 'string') caption = out.content;
    }
    caption = caption || data.output_text || data.text || null;
    if (!caption) throw new Error('Could not extract caption from response: ' + JSON.stringify(data));
    console.log('Caption:', caption);
    return caption;
  } catch (e) {
    console.warn('Vision model caption failed:', e.message || e);
    return null;
  }
}

async function embedText(model, text) {
  console.log('Embedding text with model:', model);
  const url = 'https://api.openai.com/v1/embeddings';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Embedding error: ' + JSON.stringify(data));
  return data?.data?.[0]?.embedding;
}

async function callSupabaseMatch(embedding, limit = 10) {
  console.log('Calling Supabase RPC match_item_vectors_for_user (limit=', limit, ')');
  // Prefer using the supabase-js client if available to avoid PostgREST schema cache parameter ordering issues.
  try {
  const { createClient } = require('@supabase/supabase-js');
  console.log('Using @supabase/supabase-js client for RPC');
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  // Call the unambiguous RPC wrapper to avoid function overload selection problems.
  const rpcRes = await client.rpc('match_item_vectors_for_user', { p_user_id: TEST_USER_ID, query_embedding: embedding, limit_count: limit });
    if (rpcRes.error) throw rpcRes.error;
    return rpcRes.data;
  } catch (e) {
    console.warn('supabase-js RPC attempt failed or package not available:', e.message || e);
    // Fallback to REST call (try named params)
  const restUrl = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/match_item_vectors_for_user';
    // First try named params via REST (may fail due to PostgREST parameter ordering)
    let resp = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_user_id: TEST_USER_ID, query_embedding: embedding, limit_count: limit }),
    });
    let text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }
    if (resp.ok) return data;

    // Removed positional JSON-array fallback as per instructions

    if (!resp.ok) throw new Error(`Supabase RPC error ${resp.status}: ${JSON.stringify(data)}. Check that the function is named public.match_item_vectors_for_user and its argument names match: p_user_id, query_embedding, limit_count.`);
  }
}


(async () => {
  try {
    const b64 = await fetchImageAsBase64(IMAGE_URL);

    // 1) Try direct image embedding if model looks like it supports it
    let embedding = null;
    if (IMAGE_MODEL && looksLikeImageEmbeddingModel(IMAGE_MODEL)) {
      embedding = await tryDirectImageEmbedding(IMAGE_MODEL, b64);
    }

    // 2) If no embedding, get caption from vision/chat model and embed that caption
    if (!embedding) {
      if (!IMAGE_MODEL) {
        console.log('No OPENAI_IMAGE_MODEL provided; falling back to embedding an auto-caption (not possible without vision model)');
      }
    const caption = await getCaptionFromVisionModel(IMAGE_MODEL, IMAGE_URL);
      if (!caption) {
        console.error('Failed to obtain caption from vision model; aborting.');
        process.exit(1);
      }
      embedding = await embedText(EMBED_MODEL, caption);
    }

    if (!Array.isArray(embedding)) {
      console.error('Embedding was not returned as an array; aborting.');
      process.exit(1);
    }

    console.log('Embedding length:', embedding.length);

    // 3) Call Supabase RPC
    const results = await callSupabaseMatch(embedding, 10);
    console.log('Supabase RPC results:', JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('E2E test failed:', e.message || e);
    process.exit(1);
  }
})();
