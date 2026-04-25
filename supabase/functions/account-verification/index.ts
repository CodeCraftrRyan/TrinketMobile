// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFICATION_HMAC_SECRET = Deno.env.get("VERIFICATION_HMAC_SECRET") || "";
const DEV_RETURN_CODES = !!Deno.env.get("DEV_RETURN_CODES");

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const TWILIO_SID = Deno.env.get("TWILIO_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM");

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hmacHex(message: string) {
  if (typeof globalThis?.crypto?.subtle?.importKey === "function") {
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(VERIFICATION_HMAC_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await globalThis.crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message),
    );
    const arr = Array.from(new Uint8Array(sig));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback (not cryptographically secure) for environments without Web Crypto
  return btoa(message + VERIFICATION_HMAC_SECRET);
}

async function insertHashedCode(userId: string, method: string, destination: string) {
  const code = genCode();
  const hashed = await hmacHex(code);

  const body = JSON.stringify({
    user_id: userId,
    method,
    destination,
    hashed_code: hashed,
    attempts: 0,
    used: false,
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`insertHashedCode failed: ${res.status} ${txt}`);
  }

  return { code };
}

async function sendWithSendGrid(destination: string, subject: string, text: string) {
  if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not configured");

  const payload = {
    personalizations: [{ to: [{ email: destination }] }],
    from: { email: "no-reply@trinket.com" },
    subject,
    content: [{ type: "text/plain", value: text }],
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${txt}`);
  }
}

async function sendWithTwilio(destination: string, bodyText: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    throw new Error("Twilio config missing");
  }

  // Deno/browser-friendly base64
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

  const params = new URLSearchParams();
  params.append("To", destination);
  params.append("From", TWILIO_FROM);
  params.append("Body", bodyText);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${txt}`);
  }
}

async function dispatchCode(method: string, destination: string, code: string) {
  const text = `Your Trinket verification code is: ${code}`;
  if (method === "sms") {
    await sendWithTwilio(destination, text);
    return;
  }
  // default to email
  await sendWithSendGrid(destination, "Your Trinket verification code", text);
}

async function findLatestRow(userId: string) {
  const q = `${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1&select=*`;
  const res = await fetch(q, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data && data[0] ? data[0] : null;
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname.endsWith("/send")) {
      const body = await req.json();
      const { user_id, method, destination } = body;
      if (!user_id || !method || !destination) return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400 });

      const { code } = await insertHashedCode(user_id, method, destination);
      await dispatchCode(method, destination, code);

      return new Response(JSON.stringify({ ok: true, dev_code: DEV_RETURN_CODES ? code : undefined }), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "POST" && url.pathname.endsWith("/verify")) {
      const body = await req.json();
      const { user_id, code } = body;
      if (!user_id || !code) return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400 });

      const row = await findLatestRow(user_id);
      if (!row) return new Response(JSON.stringify({ ok: false, reason: "no-code" }), { status: 400 });

      if (row.locked) return new Response(JSON.stringify({ ok: false, reason: "locked" }), { status: 423 });
      if (row.used) return new Response(JSON.stringify({ ok: false, reason: "used" }), { status: 400 });

      const hashed = await hmacHex(code);
      if (hashed !== row.hashed_code) {
        // increment attempts
        await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ attempts: (row.attempts || 0) + 1 }),
        });
        return new Response(JSON.stringify({ ok: false, reason: "bad" }), { status: 400 });
      }

      // mark used
      await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ used: true }),
      });

      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
// Clean single implementation
// (This file provides two endpoints: POST /send and POST /verify)

const CONTENT = `{"Content-Type":"application/json"}`;

// (Re-declare everything cleanly)
const CLEAN_SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

        locked: false,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('failed to insert code: ' + txt);
      }
      const data = await res.json();
      return { code, row: data?.[0] };
    }

    async function sendWithSendGrid(destination, subject, text) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalizations: [{ to: [{ email: destination }] }], from: { email: 'no-reply@trinketmobile.app' }, subject, content: [{ type: 'text/plain', value: text }] }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error('sendgrid send failed: ' + t);
      }
    }

    async function sendWithTwilio(destination, bodyText) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const form = new URLSearchParams();
      form.append('To', destination);
      form.append('From', TWILIO_FROM);
      form.append('Body', bodyText);
      const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
      if (!res.ok) {
        const t = await res.text();
        throw new Error('twilio send failed: ' + t);
      }
    }

    async function dispatchCode(method, destination, code) {
      const text = `Your Trinket verification code is: ${code}`;
      if (method === 'email') {
        if (!SENDGRID_API_KEY) throw new Error('No email provider configured');
        return sendWithSendGrid(destination, 'Your Trinket verification code', text);
      }
      if (method === 'sms') {
        if (!TWILIO_SID) throw new Error('No sms provider configured');
        return sendWithTwilio(destination, text);
      }
      throw new Error('unknown method');
    }

    async function findRowByUser(userId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${userId}&used=eq.false&order=created_at.desc`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });
      if (!res.ok) throw new Error('failed to query code');
      const rows = await res.json();
      return rows && rows.length ? rows[0] : null;
    }

    serve(async (req) => {
      try {
        const url = new URL(req.url);
        if (req.method === 'POST' && url.pathname.endsWith('/send')) {
          const body = await req.json();
          const { userId, method, destination } = body;
          if (!userId || !method || !destination) return new Response('bad request', { status: 400 });
          const { code, row } = await insertHashedCode(userId, method, destination);
          try {
            await dispatchCode(method, destination, code);
          } catch (sendErr) {
            if (DEV_RETURN_CODES) {
              return new Response(JSON.stringify({ ok: true, dev: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            console.error('send failed', sendErr);
            return new Response(JSON.stringify({ ok: false, error: 'send_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (req.method === 'POST' && url.pathname.endsWith('/verify')) {
          const body = await req.json();
          const { userId, code } = body;
          if (!userId || !code) return new Response('bad request', { status: 400 });
          const row = await findRowByUser(userId);
          if (!row) return new Response(JSON.stringify({ ok: false, reason: 'not_found' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          if (row.locked) return new Response(JSON.stringify({ ok: false, reason: 'locked' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          if (new Date(row.expires_at) < new Date()) return new Response(JSON.stringify({ ok: false, reason: 'expired' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          const providedHash = await hmacHex(code);
          if (providedHash === row.code_hash) {
            await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ used: true }) });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          const attempts = (row.attempts ?? 0) + 1;
          const locked = attempts >= (row.max_attempts ?? 5);
          await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ attempts, locked }) });
          return new Response(JSON.stringify({ ok: false, reason: 'invalid', attempts, locked }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response('not found', { status: 404 });
      } catch (e) {
        console.error('verification function error', e);
        return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    });
          await dispatchCode(method, destination, code);
        } catch (sendErr) {
          if (DEV_RETURN_CODES) {
            return new Response(JSON.stringify({ ok: true, code, dev: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          console.error('send failed', sendErr);
          return new Response(JSON.stringify({ ok: false, error: 'send_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (req.method === 'POST' && url.pathname.endsWith('/verify')) {
        const body = await req.json();
        const { userId, code } = body;
        if (!userId || !code) return new Response('bad request', { status: 400 });
        const row = await findRowByUser(userId);
        if (!row) return new Response(JSON.stringify({ ok: false, reason: 'not_found' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (row.locked) return new Response(JSON.stringify({ ok: false, reason: 'locked' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (new Date(row.expires_at) < new Date()) return new Response(JSON.stringify({ ok: false, reason: 'expired' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const providedHash = hashCode(code);
        if (providedHash === row.code_hash) {
          // mark used
          await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ used: true }) });
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // increment attempts and maybe lock
        const attempts = (row.attempts ?? 0) + 1;
        const locked = attempts >= (row.max_attempts ?? 5);
        await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ attempts, locked }) });
        return new Response(JSON.stringify({ ok: false, reason: 'invalid', attempts, locked }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('not found', { status: 404 });
    } catch (e: any) {
      console.error('verification function error', e);
      return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  });
