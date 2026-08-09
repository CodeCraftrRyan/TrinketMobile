// describe-item — suggest catalogue fields for a photographed object.
//
// The same vision model that powers photo search, asked instead for a
// structured record: name, description, category, era, materials, and an
// estimated value. The suggestions fill empty fields on the add form; they
// never overwrite what the person has written.
//
//   photograph -> structured suggestion (vision, JSON) -> add form
//
// Deploy:
//   npx supabase functions deploy describe-item --project-ref jephwdsmehrmninpaggs
//
// Secrets: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VISION_MODEL = 'gpt-4o-mini';
const QUERY_BUCKET = 'search-queries';

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

/** Ask for the object as a structured catalogue record. */
async function suggestFields(
  imageUrl: string,
  categories: string[],
  apiKey: string,
): Promise<Record<string, unknown>> {
  const catList = categories.length ? categories.join(', ') : 'none';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'You are cataloguing the single main object in this photograph for a '
            + 'personal archive. Respond ONLY with a JSON object with these keys:\n'
            + '  name: a short, natural name for the object (2-5 words, no brand guesses)\n'
            + '  description: two or three warm sentences describing it — what it is, '
            + 'material, colour, era or style, any markings. The object only, not the setting.\n'
            + `  category: choose ONLY if one entry is clearly right for this object: ${catList}\n`
            + '  If none is clearly right, category MUST be null. Never default to the first entry.\n'
            + '  era: a period or decade if evident (e.g. "1960s", "Victorian"), else null\n'
            + '  materials: main materials as a short phrase, else null\n'
            + '  estimated_value: a single conservative US dollar number if a rough '
            + 'estimate is reasonable, else null. Never a range, never a guess for '
            + 'items that could be either worthless or precious.\n'
            + 'Use null for anything not clearly visible. Do not invent.',
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
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Vision returned malformed JSON');
  }
}

/** The photograph has done its work once it has been described. */
async function forgetQueryPhoto(admin: any, imagePath: string) {
  try {
    const { error } = await admin.storage.from(QUERY_BUCKET).remove([imagePath]);
    if (error) throw error;
  } catch (e: any) {
    console.warn('Could not remove the query photograph', e?.message ?? e);
  }
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

  // A user may only describe a photograph they uploaded.
  if (!String(imagePath).startsWith(`${user.id}/`)) {
    return json({ error: 'That photograph is not yours.' }, 403);
  }

  try {
    // ---- 1. What does this user's plan allow, and how much is left? ----
    // Suggestions draw from the same monthly allowance as photo lookups.
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

    if (cap !== null && used >= cap) {
      return json({
        error: 'limit_reached',
        message: `You have used all ${cap} AI lookups this month. They renew at the start of next month.`,
        used,
        cap,
      }, 429);
    }

    // ---- 2. The user's category names, so the suggestion can pick one ----
    const { data: cats } = await admin
      .from('categories')
      .select('name')
      .order('name');
    const categoryNames: string[] = (cats ?? [])
      .map((r: any) => String(r?.name ?? '').trim())
      .filter(Boolean);

    // ---- 3. Read the photograph and describe it ----
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

    const raw = await suggestFields(dataUrl, categoryNames, OPENAI_API_KEY);

    // ---- 4. Keep only what was asked for, in the shape promised ----
    const clean = (v: unknown) => {
      const s = String(v ?? '').replace(/\*\*/g, '').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
      return s || null;
    };
    const category = clean(raw?.category);
    const suggestion = {
      name: clean(raw?.name),
      description: clean(raw?.description),
      category: category && categoryNames.some(c => c.toLowerCase() === category.toLowerCase())
        ? categoryNames.find(c => c.toLowerCase() === category.toLowerCase())
        : null,
      era: clean(raw?.era),
      materials: clean(raw?.materials),
      estimated_value: (() => {
        const n = Number(raw?.estimated_value);
        return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
      })(),
    };

    // ---- 5. Record the spend, forget the photograph ----
    await admin.from('ai_search_usage').upsert(
      { user_id: user.id, month_start: period, used_count: used + 1, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,month_start' },
    );
    await forgetQueryPhoto(admin, imagePath);

    return json({ suggestion, used: used + 1, cap });
  } catch (e: any) {
    console.error('describe-item failed', e?.message ?? e);
    await forgetQueryPhoto(admin, imagePath);
    return json({ error: 'Could not describe that photograph.' }, 500);
  }
});
