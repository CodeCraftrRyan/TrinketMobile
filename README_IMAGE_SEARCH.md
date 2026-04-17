Image search (OpenAI embeddings + Supabase) — scaffold

Overview
--------
This scaffold provides a minimal server function and indexing script to enable image-based similarity search over your `items` collection.

What this includes
- `functions/image-search/index.ts` — Express server that accepts POST { imageUrl } and returns matching item IDs (uses OpenAI embeddings + Supabase vector table).
- `scripts/index-items.ts` — CLI script to compute embeddings for existing items and upsert them into `item_vectors`.
- `migrations/0001_add_item_vectors.sql` — SQL migration to create the `item_vectors` table and a helper RPC `match_item_vectors`.

Env variables
- `OPENAI_API_KEY` — API key for OpenAI (or adjust to your provider)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `NEXT_PUBLIC_IMAGE_SEARCH_URL` — (client) URL to the deployed image-search function

How it works (high level)
1. You run `scripts/index-items.ts` once to index all existing items. That uploads embeddings into `item_vectors`.
2. The client (mobile app) uploads a query image to Supabase storage and calls `NEXT_PUBLIC_IMAGE_SEARCH_URL` with the public image URL.
3. The server downloads the image, computes an embedding, and runs a nearest-neighbor query against the `item_vectors` table (using pgvector). It returns a list of item IDs.
4. The client fetches those items and displays the ordered results.

Notes & next steps
- The example uses OpenAI embeddings as a placeholder for computing features from an image. Replace the embedding call with a proper image model (CLIP / HF / OpenAI image embedding) for better quality.
- Ensure `pgvector` is enabled in your Supabase Postgres database (the migration enables it if you have privileges).
- Secure your function — do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client. The client should only use `NEXT_PUBLIC_IMAGE_SEARCH_URL`.

Quick commands

Index items (run locally with env set):

```bash
# from project root
export OPENAI_API_KEY=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
node ./scripts/index-items.ts
```

Run server locally (for testing):

```bash
export OPENAI_API_KEY=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
npm install # install express, openai, supabase-js, node-fetch
node functions/image-search/index.ts
```

Deployment
- You can deploy `functions/image-search` as a small server (Vercel, Fly, Render) or convert it to a Supabase Edge Function. If you deploy to Vercel/Render, set the required env vars there and use the deployed URL as `NEXT_PUBLIC_IMAGE_SEARCH_URL`.
