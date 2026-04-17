// Create a Stripe Checkout Session for a recurring subscription.
// Expects POST JSON: { plan: 'pro'|'premium' } OR { priceId: 'price_...' }, and optionally { userId, customerEmail }
// Environment variables required (set in your Supabase Edge Function settings):
// - STRIPE_SECRET_KEY
// - STRIPE_PRICE_PRO
// - STRIPE_PRICE_PREMIUM
// - SUCCESS_URL
// - CANCEL_URL

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const plan = (body.plan as string) || null;
    const priceIdFromBody = (body.priceId as string) || null;
    const userId = (body.userId as string) || null;
    const customerEmail = (body.customerEmail as string) || null;

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: missing STRIPE_SECRET_KEY' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let priceId = priceIdFromBody;
    if (!priceId) {
      if (plan === 'pro') priceId = Deno.env.get('STRIPE_PRICE_PRO') || null;
      if (plan === 'premium') priceId = Deno.env.get('STRIPE_PRICE_PREMIUM') || null;
    }

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Missing priceId or unsupported plan' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const successUrl = Deno.env.get('SUCCESS_URL') || 'trinketmobile://membership?checkout=success';
    const cancelUrl = Deno.env.get('CANCEL_URL') || 'trinketmobile://membership?checkout=cancel';

    // Build form-encoded body expected by Stripe API
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', successUrl + '?session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', cancelUrl);
    params.append('payment_method_types[]', 'card');
    params.append('allow_promotion_codes', 'true');

    if (customerEmail) params.append('customer_email', customerEmail);
    if (userId) params.append('metadata[user_id]', userId);
    if (plan) params.append('metadata[plan]', plan);
    if (userId) params.append('subscription_data[metadata][user_id]', userId);
    if (plan) params.append('subscription_data[metadata][plan]', plan);

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Stripe create session error', data);
      return new Response(
        JSON.stringify({ error: 'Stripe error creating session', details: data, stripeStatus: resp.status }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Return the session URL for the client to redirect to (mobile: open in WebView or external browser)
    return new Response(JSON.stringify({ url: data.url, id: data.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('create-checkout-session error', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'internal', details: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
