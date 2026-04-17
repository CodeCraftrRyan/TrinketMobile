// Stripe webhook handler for subscription lifecycle events
// Environment variables required (set in Supabase Edge Function settings):
// - STRIPE_WEBHOOK_SECRET
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// Optional:
// - STRIPE_WEBHOOK_TOLERANCE (seconds, default 300)

// Minimal implementation: verifies signature and logs/acknowledges events.
// You can extend the handler to upsert subscriptions into a Supabase table using the service role key.

function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}

async function computeHmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

Deno.serve(async (req) => {
  let receivedEventId: string | null = null;

  // Audit logging helpers declared outside try so they are available in the catch block.
  async function insertAuditEvent(eventId: string | null, eventType: string | null, payloadObj: any) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceRoleKey) return null;
    try {
      const body = { event_id: eventId, event_type: eventType, payload: payloadObj };
      const resp = await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Failed to insert audit event', resp.status, txt);
        return null;
      }
      const data = await resp.json();
      return data?.[0]?.id ?? null;
    } catch (e) {
      console.error('insertAuditEvent error', e);
      return null;
    }
  }

  async function markAuditProcessed(eventId: string | null, processed: boolean, errorMsg?: string | null) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceRoleKey || !eventId) return;
    try {
      const body: any = { processed };
      if (processed) body.processed_at = new Date().toISOString();
      if (errorMsg) body.processing_error = errorMsg;
      const resp = await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Failed to mark audit event', resp.status, txt);
      }
    } catch (e) {
      console.error('markAuditProcessed error', e);
    }
  }

  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const payload = await req.text();
    const sigHeader = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return new Response('Missing webhook secret', { status: 500 });
    }

    // Parse Stripe signature header: t=timestamp,v1=signature,...
    const parts = sigHeader.split(',').map((p) => p.split('='));
    const kv: Record<string, string[]> = {};
    for (const p of parts) {
      if (!p || p.length !== 2) continue;
      const k = p[0];
      const v = p[1];
      kv[k] = kv[k] || [];
      kv[k].push(v);
    }
    const timestamp = kv['t']?.[0];
    const sigs = kv['v1'] || [];
    if (!timestamp || sigs.length === 0) {
      console.error('Invalid stripe-signature header', sigHeader);
      return new Response('Invalid signature header', { status: 400 });
    }

    // Verify timestamp tolerance to mitigate replay attacks
    const tolerance = Number(Deno.env.get('STRIPE_WEBHOOK_TOLERANCE') || '300');
    const now = Math.floor(Date.now() / 1000);
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum)) {
      console.error('Invalid stripe signature timestamp', timestamp);
      return new Response('Invalid signature timestamp', { status: 400 });
    }
    if (Math.abs(now - tsNum) > tolerance) {
      console.error('Stripe webhook timestamp outside tolerance', { now, tsNum, tolerance });
      return new Response('Webhook timestamp outside tolerance', { status: 400 });
    }

    // Compute expected v1 signature (HMAC SHA256 over `${timestamp}.${payload}`)
    const signedPayload = `${timestamp}.${payload}`;
    const expected = await computeHmacSha256(webhookSecret, signedPayload);

    // Allow multiple v1 signatures in header (Stripe may include rotated signatures)
    let verified = false;
    for (const s of sigs) {
      if (safeCompare(s, expected)) { verified = true; break; }
    }
    if (!verified) {
      console.error('Webhook signature verification failed', { expected, sigHeader });
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log('stripe event:', event.type);
    // Insert audit row for troubleshooting (mark processed later)
    receivedEventId = event?.id ?? null;
    await insertAuditEvent(receivedEventId, event?.type ?? null, event);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';

    async function updateUserMetadata(userId: string, metadata: Record<string, any>) {
      if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        return;
      }
      const body = { user_metadata: metadata };
      const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error('Failed to update user metadata', resp.status, err);
      }
    }

    async function fetchStripeSubscription(subscriptionId: string) {
      if (!stripeSecret) return null;
      try {
        const resp = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { Authorization: `Bearer ${stripeSecret}` },
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('Failed to fetch subscription from Stripe', resp.status, text);
          return null;
        }
        return await resp.json();
      } catch (e) {
        console.error('Error fetching stripe subscription', e);
        return null;
      }
    }

    

    // Basic handling of a few useful events
    switch (event.type) {
      case 'checkout.session.completed': {
        // The session may include `subscription` and `customer` fields. You can use these to create
        // a mapping in your database from your user_id (if you passed metadata[user_id]) to the
        // Stripe subscription id.
        const session = event.data?.object || {};
        console.log('checkout.session.completed:', session.id, session.subscription);
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          const normalized = String(plan).toLowerCase();
          const mappedPlan = normalized === 'pro' ? 'Pro' : normalized === 'premium' ? 'Premium' : plan;
          await updateUserMetadata(userId, { subscription_plan: mappedPlan, subscription_status: 'active' });
        }
        break;
      }
      case 'invoice.payment_failed': {
        console.log('invoice.payment_failed', event.data?.object?.id);
        // Try to map to our user: subscription id may be available on the invoice
        const invoice = event.data?.object || {};
        const subscriptionId = invoice.subscription as string | undefined;
        if (subscriptionId) {
          const sub = await fetchStripeSubscription(subscriptionId);
          const uid = sub?.metadata?.user_id || invoice?.metadata?.user_id;
          if (uid) {
            await updateUserMetadata(uid, { subscription_status: 'past_due', last_payment_failed_at: new Date().toISOString() });
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data?.object || {};
        const status = subscription.status;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          // Update both status and keep plan if present
          const planMeta = subscription.metadata?.plan;
          const updates: Record<string, any> = { subscription_status: status };
          if (planMeta) updates.subscription_plan = (String(planMeta).toLowerCase() === 'pro' ? 'Pro' : String(planMeta));
          // If subscription was canceled/deleted, mark plan as Free
          if (status === 'canceled' || status === 'deleted') {
            updates.subscription_plan = 'Free';
          }
          await updateUserMetadata(userId, updates);
        }
        console.log('subscription updated', subscription.id, status);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data?.object || {};
        const userId = subscription.metadata?.user_id;
        if (userId) {
          await updateUserMetadata(userId, { subscription_plan: 'Free', subscription_status: 'deleted', cancelled_at: new Date().toISOString() });
        }
        console.log('subscription cancelled', subscription.id);
        break;
      }
      default:
        console.log('unhandled stripe event type:', event.type);
    }

    // Mark audit row processed
    await markAuditProcessed(receivedEventId, true, null);

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('webhook handler error', err);
    try {
      await markAuditProcessed(receivedEventId, false, String(err));
    } catch (e) {
      console.error('failed to mark audit errored', e);
    }
    return new Response('internal', { status: 500 });
  }
});
