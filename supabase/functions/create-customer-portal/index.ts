// Create a Stripe Billing Portal session for a customer.
// Expects POST JSON: { customerId?: string, customerEmail?: string }
// Environment variables required (set in your Supabase Edge Function settings):
// - STRIPE_SECRET_KEY
// - PORTAL_RETURN_URL (optional, defaults to app deep link)

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await req.json().catch(() => ({}));
    const customerId = (body.customerId as string) || null;
    const customerEmail = (body.customerEmail as string) || null;

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: missing STRIPE_SECRET_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const returnUrl = Deno.env.get('PORTAL_RETURN_URL') || 'trinketmobile://membership?portal=return';

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customerEmail) {
      const searchParams = new URLSearchParams();
      searchParams.append('email', customerEmail);
      searchParams.append('limit', '1');

      const customerResp = await fetch(`https://api.stripe.com/v1/customers?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });
      const customerData = await customerResp.json();
      resolvedCustomerId = customerData?.data?.[0]?.id ?? null;
    }

    if (!resolvedCustomerId) {
      return new Response(JSON.stringify({ error: 'Missing Stripe customer id or email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.append('customer', resolvedCustomerId);
    params.append('return_url', returnUrl);

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Stripe portal session error', data);
      return new Response(JSON.stringify({ error: 'Stripe error creating portal session', details: data }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: data.url, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-customer-portal error', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
