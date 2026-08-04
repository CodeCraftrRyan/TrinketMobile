// embed-item — write (or refresh) the searchable embedding for one object.
//
// Called after an object is created or edited. The embedding is built from the
// object's words — name, story, category, place, people — because the vectors
// are text vectors (text-embedding-3-large, 3072 dimensions). Visual search
// works by describing a photograph and matching that description against these.
//
// Deploy:
//   npx supabase functions deploy embed-item --project-ref jephwdsmehrmninpaggs
//
// Secrets: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMBED_MODEL = 'text-embedding-3-large';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Everything about an object that is worth searching on, as one passage. */
function describe(item: any, categoryName: string | null): string {
  const parts: string[] = [];
  if (item.name) parts.push(String(item.name));
  if (categoryName) parts.push(`A ${categoryName}.`);
  if (item.description) parts.push(String(item.description));
  if (item.location) parts.push(`Kept in the ${item.location}.`);
  if (Array.isArray(item.people) && item.people.length) {
    parts.push(`From ${item.people.join(', ')}.`);
  }
  if (item.acquisition_method) parts.push(`Acquired by ${item.acquisition_method}.`);
  if (item.brand) parts.push(`Made by ${item.brand}.`);
  if (item.year) parts.push(`From ${item.year}.`);
  return parts.join(' ').trim();
}

async function embed(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Embedding failed: ${resp.status} ${detail}`);
  }
  const body = await resp.json();
  const vector = body?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) throw new Error('Embedding response had no vector');
  return vector;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server is not configured.' }, 500);
  if (!OPENAI_API_KEY) return json({ error: 'No OpenAI key configured.' }, 500);

  // The caller's own token decides which objects they may touch.
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userWrap, error: userErr } = await admin.auth.getUser(token);
  const user = userWrap?.user;
  if (userErr || !user) return json({ error: 'Could not verify your session.' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const itemId = body?.itemId;
  if (!itemId) return json({ error: 'No object given.' }, 400);

  try {
    const { data: item, error: itemErr } = await admin
      .from('items')
      .select('id,user_id,name,description,location,people,category_id,acquisition_method,brand,year')
      .eq('id', itemId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return json({ error: 'That object no longer exists.' }, 404);
    if (item.user_id !== user.id) return json({ error: 'That object is not yours.' }, 403);

    let categoryName: string | null = null;
    if (item.category_id) {
      const { data: cat } = await admin
        .from('categories').select('name').eq('id', item.category_id).maybeSingle();
      categoryName = cat?.name ?? null;
    }

    const passage = describe(item, categoryName);
    if (!passage) {
      // Nothing to embed yet. Remove any stale vector so search does not
      // return an object on the strength of words it no longer has.
      await admin.from('item_vectors').delete().eq('item_id', item.id);
      return json({ ok: true, skipped: 'no words to embed' });
    }

    const vector = await embed(passage, OPENAI_API_KEY);

    const { error: upErr } = await admin
      .from('item_vectors')
      .upsert(
        { item_id: item.id, user_id: item.user_id, embedding: vector, updated_at: new Date().toISOString() },
        { onConflict: 'item_id' }
      );
    if (upErr) throw upErr;

    return json({ ok: true });
  } catch (e: any) {
    console.error('embed-item failed', e?.message ?? e);
    return json({ error: 'Could not index that object.' }, 500);
  }
});
