#!/usr/bin/env node
/* global Buffer */
// scripts/test-image-embedding.js
// Usage (quick):
// OPENAI_API_KEY="sk-..." OPENAI_IMAGE_MODEL="model-id" TEST_IMAGE_URL="https://...jpg" node scripts/test-image-embedding.js
// Or pass args: node scripts/test-image-embedding.js <MODEL_ID> <IMAGE_URL>

import 'dotenv/config';

const KEY = process.env.OPENAI_API_KEY;
const MODEL_ARG = process.argv[2];
const IMAGE_ARG = process.argv[3];
const MODEL = process.env.OPENAI_IMAGE_MODEL || MODEL_ARG;
const IMAGE_URL = process.env.TEST_IMAGE_URL || IMAGE_ARG;

if (!KEY) {
  console.error('Missing OPENAI_API_KEY in env.');
  process.exit(1);
}
if (!MODEL) {
  console.error('Missing model id. Provide OPENAI_IMAGE_MODEL env or pass it as first arg.');
  process.exit(1);
}
if (!IMAGE_URL) {
  console.error('Missing image url. Provide TEST_IMAGE_URL env or pass it as second arg.');
  process.exit(1);
}

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

(async () => {
  try {
    console.log('Downloading image...', IMAGE_URL);
    const imRes = await fetch(IMAGE_URL);
    if (!imRes.ok) {
      console.error('Failed to download image:', imRes.status, imRes.statusText);
      process.exit(1);
    }
    const arr = await imRes.arrayBuffer();
    const b = Buffer.from(arr);
    const b64 = b.toString('base64');

    // Try a JSON embeddings request with a data URI. Some OpenAI image-embedding models accept this
    // as input; if the model requires a different endpoint or multipart upload the response will
    // likely indicate that and we print it for guidance.
    const payload = {
      model: MODEL,
      input: `data:image;base64,${b64}`,
    };

    console.log('Calling OpenAI embeddings endpoint with model:', MODEL);
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Non-JSON response from OpenAI:', text);
      process.exit(1);
    }

    if (!resp.ok) {
      console.error('OpenAI returned error:', resp.status, resp.statusText);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    // Expect data to have data[0].embedding
    if (!data || !Array.isArray(data.data) || !data.data[0] || !Array.isArray(data.data[0].embedding)) {
      console.log('Unexpected embedding response structure; full response:');
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    }

    const emb = data.data[0].embedding;
    console.log('Embedding received. length=', emb.length);
    console.log('Embedding sample (first 8 values):', emb.slice(0, 8));
    console.log('\nIf this succeeds, use the length above as the pgvector dimension in your migration.');
  } catch (err) {
    console.error('Error during test embedding:', err);
    process.exit(1);
  }
})();
