// Clean account-verification Edge Function (single-file Deno function)
// Minimal, single serve() entrypoint and no duplicated blocks.

// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VERIFICATION_HMAC_SECRET = Deno.env.get("VERIFICATION_HMAC_SECRET") || "";
const DEV_RETURN_CODES = !!Deno.env.get("DEV_RETURN_CODES");

// Clean account-verification Edge Function (single-file Deno function)
// Minimal, single serve() entrypoint and no duplicated blocks.

// @ts-nocheck

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
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
    const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (not cryptographically secure) for environments without subtle
  return btoa(message + VERIFICATION_HMAC_SECRET);
}

async function insertHashedCode(userId: string, method: string, destination: string) {
  const code = genCode();
  const hashed = await hmacHex(code);
  const payload = { user_id: userId, method, destination, hashed_code: hashed, attempts: 0, used: false };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
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
    from: { email: "no-reply@trinketmobile.app" },
    subject,
    content: [{ type: "text/plain", value: text }],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${txt}`);
  }
}

async function sendWithTwilio(destination: string, bodyText: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) throw new Error("Twilio config missing");
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const params = new URLSearchParams();
  params.append("To", destination);
  params.append("From", TWILIO_FROM);
  params.append("Body", bodyText);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${txt}`);
  }
}

async function dispatchCode(method: string, destination: string, code: string) {
  const text = `Your Trinket verification code is: ${code}`;
  if (method === "sms") return sendWithTwilio(destination, text);
  return sendWithSendGrid(destination, "Your Trinket verification code", text);
}

async function findLatestRow(userId: string) {
  const q = `${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1&select=*`;
  const res = await fetch(q, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } });
  if (!res.ok) return null;
  const data = await res.json();
  return data && data[0] ? data[0] : null;
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname.endsWith("/send")) {
      const body = await req.json();
      const userId = body.userId ?? body.user_id ?? "";
      const method = body.method;
      const destination = body.destination ?? body.email ?? body.phone ?? "";
      if (!userId || !method || !destination) {
        return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const { code } = await insertHashedCode(userId, method, destination);
      try {
        await dispatchCode(method, destination, code);
      } catch (sendErr) {
        if (DEV_RETURN_CODES) return new Response(JSON.stringify({ ok: true, dev_code: code }), { headers: { "Content-Type": "application/json" } });
        console.error("send failed", sendErr);
        return new Response(JSON.stringify({ ok: false, error: "send_failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, dev_code: DEV_RETURN_CODES ? code : undefined }), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "POST" && url.pathname.endsWith("/verify")) {
      const body = await req.json();
      const userId = body.userId ?? body.user_id ?? "";
      const code = body.code ?? "";
      if (!userId || !code) return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const row = await findLatestRow(userId);
      if (!row) return new Response(JSON.stringify({ ok: false, reason: "no-code" }), { status: 400, headers: { "Content-Type": "application/json" } });
      if (row.locked) return new Response(JSON.stringify({ ok: false, reason: "locked" }), { status: 423, headers: { "Content-Type": "application/json" } });
      if (row.used) return new Response(JSON.stringify({ ok: false, reason: "used" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const hashed = await hmacHex(code);
      if (hashed !== row.hashed_code) {
        await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ attempts: (row.attempts || 0) + 1 }),
        });
        return new Response(JSON.stringify({ ok: false, reason: "bad" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ used: true }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  } catch (e) {
    console.error("verification function error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
