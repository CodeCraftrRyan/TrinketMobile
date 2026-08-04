// delete-account — permanently removes a user, their data, and their files.
//
// Deploy:
//   npx supabase functions deploy delete-account --project-ref jephwdsmehrmninpaggs
//
// Requires secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY
//
// Order matters. Storage is cleared FIRST: once the items rows are gone the
// paths in items.photo_url are unrecoverable and the files would be orphaned.
// Then the tables that do NOT cascade from auth.users, then the auth user
// itself (which cascades profiles, user_profiles, items, item_photos,
// item_vectors, collections, events, locations, user_favorites,
// ai_search_usage — and via those, collection_items and item_people).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKETS = ['item-photos', 'search-queries'];
const NON_CASCADING = ['subscriptions', 'people', 'jobs', 'account_verification_codes'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Recursively collect every object path under a prefix. */
async function listAll(admin: any, bucket: string, prefix: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (dir: string) => {
    const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    if (error || !data) return;
    for (const entry of data) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      // A folder placeholder has no id; a file has one.
      if (entry.id === null || entry.id === undefined) await walk(path);
      else found.push(path);
    }
  };
  await walk(prefix);
  return found;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('delete-account: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return json({ error: 'Server is not configured for account deletion.' }, 500);
  }

  // --- Identify the caller from their own JWT. The account being deleted is
  // --- always the caller's; a user id is never accepted from the request body.
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userWrap, error: userErr } = await admin.auth.getUser(token);
  const user = userWrap?.user;
  if (userErr || !user) return json({ error: 'Could not verify your session.' }, 401);

  const userId = user.id;
  const report: Record<string, unknown> = { userId };

  // --- Require an explicit confirmation phrase from the client.
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  if (String(body?.confirm || '').trim().toUpperCase() !== 'DELETE') {
    return json({ error: 'Deletion was not confirmed.' }, 400);
  }

  // --- 1. Cancel billing before anything is destroyed, so nobody keeps
  // --- getting charged for an account they can no longer sign in to.
  try {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId);

    const ids = (subs ?? [])
      .filter((s: any) => s.stripe_subscription_id && !String(s.stripe_subscription_id).startsWith('test_'))
      .map((s: any) => s.stripe_subscription_id);

    if (ids.length && !STRIPE_KEY) {
      console.error('delete-account: active Stripe subscription but no STRIPE_SECRET_KEY');
      return json({ error: 'Could not cancel billing. Please contact support.' }, 500);
    }

    const cancelled: string[] = [];
    for (const id of ids) {
      const resp = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${STRIPE_KEY}` },
      });
      if (!resp.ok) {
        const detail = await resp.text();
        // 404 means it is already gone at Stripe — safe to continue.
        if (resp.status !== 404) {
          console.error('delete-account: Stripe cancel failed', id, resp.status, detail);
          return json({ error: 'Could not cancel your subscription. Please contact support.' }, 502);
        }
      }
      cancelled.push(id);
    }
    report.stripeCancelled = cancelled;
  } catch (e) {
    console.error('delete-account: billing step failed', e);
    return json({ error: 'Could not cancel your subscription. Please contact support.' }, 502);
  }

  // --- 2. Storage. Must happen before the rows that reference these paths.
  const removed: Record<string, number> = {};
  for (const bucket of BUCKETS) {
    try {
      const paths = await listAll(admin, bucket, userId);
      if (paths.length) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) console.error(`delete-account: remove failed in ${bucket}`, error);
      }
      removed[bucket] = paths.length;
    } catch (e) {
      console.error(`delete-account: storage sweep failed for ${bucket}`, e);
      removed[bucket] = -1;
    }
  }
  report.filesRemoved = removed;

  // --- 3. Tables that do not cascade from auth.users.
  const rows: Record<string, string> = {};
  for (const table of NON_CASCADING) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      console.error(`delete-account: delete failed on ${table}`, error);
      rows[table] = `error: ${error.message}`;
    } else {
      rows[table] = 'ok';
    }
  }
  report.tables = rows;

  // --- 4. The auth user. Cascades everything else.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error('delete-account: auth delete failed', delErr);
    return json({ error: 'Could not finish deleting your account. Please contact support.' }, 500);
  }

  console.log('delete-account: completed', JSON.stringify(report));
  return json({ ok: true });
});
