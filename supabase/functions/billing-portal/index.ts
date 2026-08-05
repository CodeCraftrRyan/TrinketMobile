// billing-portal — hand someone to Stripe to manage their own subscription.
//
// Cancelling used to set a flag in our database, which Stripe never saw: the
// card kept being charged while the app said "Ending". Stripe's own portal
// cancels at source, and the webhook writes the change back to us.
//
// Deploy:
//   npx supabase functions deploy billing-portal --project-ref jephwdsmehrmninpaggs
//
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_RETURN_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  const RETURN_URL = Deno.env.get('PORTAL_RETURN_URL')
    ?? 'https://www.yourtrinkets.com/Subscription';

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server is not configured.' }, 500);
  if (!STRIPE_SECRET_KEY) return json({ error: 'Billing is not configured.' }, 500);

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userWrap, error: userErr } = await admin.auth.getUser(token);
  const user = userWrap?.user;
  if (userErr || !user) return json({ error: 'Could not verify your session.' }, 401);

  try {
    // The customer we hold for this person. A row without one was never a real
    // Stripe subscription, so there is nothing for the portal to open.
    const { data: sub, error: subErr } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subErr) throw subErr;

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return json({
        error: 'no_billing_account',
        message: 'There is no paid subscription on this account yet.',
      }, 404);
    }

    const body = new URLSearchParams({
      customer: String(customerId),
      return_url: RETURN_URL,
    });

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error('Stripe portal session failed', resp.status, detail);
      return json({ error: 'Could not open the billing page.' }, 502);
    }

    const session = await resp.json();
    if (!session?.url) throw new Error('Stripe returned no portal url');

    return json({ url: session.url });
  } catch (e: any) {
    console.error('billing-portal failed', e?.message ?? e);
    return json({ error: 'Could not open the billing page.' }, 500);
  }
});
