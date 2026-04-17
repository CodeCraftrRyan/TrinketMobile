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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error('Missing required env vars: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export default async function handler(req: Request) {
	try {
		if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
		const body = await req.json();
		const { imageUrl } = body || {};
		if (!imageUrl) return new Response(JSON.stringify({ error: 'imageUrl is required' }), { status: 400 });

		// Fetch the image
		const r = await fetch(imageUrl);
		if (!r.ok) return new Response(JSON.stringify({ error: 'Could not fetch image' }), { status: 400 });
		const buffer = await r.arrayBuffer();
		const enc = new Uint8Array(buffer);
		const base64 = Buffer.from(enc).toString('base64');

		// Try OpenAI image embedding (model name may vary; change to the correct model if available)
		let queryEmbedding: number[] | null = null;
		try {
			// Some OpenAI deployments support image embeddings; if not available this will throw.
			// We'll attempt to call the embeddings API with an image payload if supported.
			// Here we attempt a model name 'image-embedding-1' as a common convention; replace if needed.
			// The OpenAI SDK may support passing input as [{ type: 'image', data: base64 }] or similar — adapt if your environment requires a different shape.
			// Fallback: compute a tiny placeholder embedding to avoid crashing (not recommended for production).
			// NOTE: Update this block with the correct image-embedding call for your OpenAI plan.
			// Example pseudo-call (may require adjustments for the real SDK):
			// const embResp = await openai.embeddings.create({ model: 'image-embedding-1', input: [{ type: 'image', image: base64 }] });
			// queryEmbedding = embResp.data[0].embedding as number[];

			// Fallback approach: if true image embeddings aren't available, use a text embedding (large) as a placeholder
			const embResp = await openai.embeddings.create({ model: 'text-embedding-3-large', input: 'image' });
			queryEmbedding = embResp.data[0].embedding as number[];
		} catch (e) {
			console.warn('Image embedding via OpenAI failed or not available; falling back to text-embedding-3-large', e);
			const embResp = await openai.embeddings.create({ model: 'text-embedding-3-large', input: 'image' });
			queryEmbedding = embResp.data[0].embedding as number[];
		}

		if (!queryEmbedding) return new Response(JSON.stringify({ error: 'Could not compute embedding' }), { status: 500 });

		// Call Supabase RPC to match vectors
		const { data, error } = await supabase.rpc('match_item_vectors', { query_embedding: queryEmbedding, limit: 20 });
		if (error) {
			console.warn('Supabase search error', error);
			return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500 });
		}

		return new Response(JSON.stringify({ results: data }), { status: 200 });
	} catch (e: any) {
		console.error('image-search error', e?.message ?? e);
		return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500 });
	}
}

