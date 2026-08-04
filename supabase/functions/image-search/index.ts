// image-search — find objects in the archive that match a photograph.
//
// The vectors are text vectors, so a photograph cannot be matched directly.
// The photograph is described first, that description is embedded, and the
// embedding is matched against the objects' own descriptions.
//
//   photograph -> description (vision) -> embedding -> nearest objects
//
// Deploy:
//   npx supabase functions deploy image-search --project-ref jephwdsmehrmninpaggs
//
// Secrets: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VISION_MODEL = 'gpt-4o-mini';
const EMBED_MODEL = 'text-embedding-3-large';
const QUERY_BUCKET = 'search-queries';
const MATCH_LIMIT = 12;

// Cosine distance beyond which two things are not the same thing. Measured
// against a real archive: an object's distance to itself is 0, while unrelated
// objects sat between 0.98 and 1.31. Past this, results are noise.
const MAX_DISTANCE = 1.0;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
};

/** Describe the object in the photograph, in the words someone would catalogue it with. */
async function describePhotograph(imageUrl: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 160,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe the single main object in this photograph as it would be '
                + 'written in a personal catalogue: what it is, its material, colour, '
                + 'era or style, and any markings. Two or three sentences. '
                + 'Describe only the object, not the setting or the person holding it.',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Vision failed: ${resp.status} ${detail}`);
  }
  const body = await resp.json();
  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Vision returned nothing');
  // The model writes markdown. Asterisks and hashes are noise in an embedding.
  return String(text)
    .replace(/\*\*/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function embed(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
  const imagePath = body?.imagePath;
  if (!imagePath) return json({ error: 'No photograph given.' }, 400);

  // A user may only search with a photograph they uploaded.
  if (!String(imagePath).startsWith(`${user.id}/`)) {
    return json({ error: 'That photograph is not yours.' }, 403);
  }

  try {
    // ---- 1. What does this user's plan allow, and how much is left? ----
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan_id, subscription_plans ( max_ai_searches_per_month )')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    let cap: number | null = null;
    const joined: any = (sub as any)?.subscription_plans;
    const planRow = Array.isArray(joined) ? joined[0] : joined;
    if (planRow) {
      cap = planRow.max_ai_searches_per_month ?? null;
    } else {
      const { data: free } = await admin
        .from('subscription_plans')
        .select('max_ai_searches_per_month')
        .eq('is_free', true).limit(1).maybeSingle();
      cap = free?.max_ai_searches_per_month ?? null;
    }

    const period = monthStart();
    const { data: usageRow } = await admin
      .from('ai_search_usage')
      .select('used_count')
      .eq('user_id', user.id)
      .eq('month_start', period)
      .maybeSingle();
    const used = usageRow?.used_count ?? 0;

    // null means the plan does not cap this.
    if (cap !== null && used >= cap) {
      return json({
        error: 'limit_reached',
        message: `You have used all ${cap} photo lookups this month. They renew at the start of next month.`,
        used,
        cap,
      }, 429);
    }

    // ---- 2. Describe the photograph ----
    // Send the photograph inline rather than as a link. A signed URL carries a
    // query string, which the vision endpoint can misread as an unsupported format.
    const { data: blob, error: dlErr } = await admin.storage
      .from(QUERY_BUCKET)
      .download(imagePath);
    if (dlErr || !blob) throw new Error('Could not read that photograph');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const dataUrl = `data:image/jpeg;base64,${btoa(binary)}`;

    const description = await describePhotograph(dataUrl, OPENAI_API_KEY);

    // ---- 3. Embed it and find the nearest objects ----
    const vector = await embed(description, OPENAI_API_KEY);

    const { data: matches, error: matchErr } = await admin.rpc('match_item_vectors_for_user', {
      p_user_id: user.id,
      query_embedding: vector,
      limit_count: MATCH_LIMIT,
    });
    if (matchErr) throw matchErr;

    // ---- 4. Count the lookup, whatever it found ----
    const { error: usageErr } = await admin
      .from('ai_search_usage')
      .upsert(
        { user_id: user.id, month_start: period, used_count: used + 1, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,month_start' }
      );
    if (usageErr) console.error('Could not record the lookup', usageErr);

    // The RPC returns `distance` — smaller is closer — already ordered.
    // Anything past the ceiling is not a match, however few results remain.
    const results = (matches ?? [])
      .filter((r: any) => typeof r.distance === 'number' && r.distance <= MAX_DISTANCE)
      .map((r: any) => ({ id: r.item_id, distance: r.distance }));

    return json({
      ok: true,
      results,
      description,
      used: used + 1,
      cap,
    });
  } catch (e: any) {
    console.error('image-search failed', e?.message ?? e);
    return json({ error: 'The search could not be completed.' }, 500);
  }
});
