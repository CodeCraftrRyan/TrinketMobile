// Clean account-verification Edge Function (single-file Deno function)
// Minimal, single serve() entrypoint and no duplicated blocks.

// @ts-nocheck


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VERIFICATION_HMAC_SECRET = Deno.env.get("VERIFICATION_HMAC_SECRET") || "";
const DEV_RETURN_CODES = !!Deno.env.get("DEV_RETURN_CODES");

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  const data = await res.json();
  return { code, row: Array.isArray(data) ? data[0] : data };
}

async function sendWithSendGrid(destination: string, subject: string, text: string) {
  if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not configured");
  const payload = {
    personalizations: [{ to: [{ email: destination }] }],
    from: { email: "admin@yourtrinkets.com" },
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

async function dispatchCode(destination: string, code: string) {
  const text = `Your Trinket verification code is: ${code}`;
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
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname.endsWith("/send")) {
      const body = await req.json();
      const userId = body.userId ?? body.user_id ?? "";
      // enforce email-only verification
      const destination = body.destination ?? body.email ?? "";
      if (!userId || !destination) {
        return new Response(JSON.stringify({ ok: false, error: "missing userId or email" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      }
      const method = 'email';
      const { code, row } = await insertHashedCode(userId, method, destination);

      const earlyResp = new Response(JSON.stringify({ ok: true, dev_code: DEV_RETURN_CODES ? code : undefined }), { headers: { "Content-Type": "application/json", ...cors } });

      (async () => {
        const maxRetries = 2;
        const baseDelay = 500;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                try {
                  await Promise.race([dispatchCode(destination, code), new Promise((_, rej) => controller.signal.addEventListener('abort', () => rej(new Error('timeout'))))]);
                } finally {
                  clearTimeout(timeout);
                }
                break;
              } catch (err) {
            console.error(`dispatch attempt ${attempt} failed`, err?.message ?? err);
            if (attempt < maxRetries) {
              await new Promise((res) => setTimeout(res, baseDelay * (attempt + 1)));
              continue;
            }
            try {
              if (row && row.id) {
                await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${encodeURIComponent(row.id)}`, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
                  body: JSON.stringify({ send_failed: true }),
                });
              } else {
                await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}`, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
                  body: JSON.stringify({ send_failed: true }),
                });
              }
            } catch (patchErr) {
              console.error('failed to mark send_failed on row', patchErr);
            }
          }
        }
      })();

      return earlyResp;
    }

    if (req.method === "POST" && url.pathname.endsWith("/verify")) {
      const body = await req.json();
      const userId = body.userId ?? body.user_id ?? "";
      const code = body.code ?? "";
      if (!userId || !code) return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      const row = await findLatestRow(userId);
      if (!row) return new Response(JSON.stringify({ ok: false, reason: "no-code" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      if (row.locked) return new Response(JSON.stringify({ ok: false, reason: "locked" }), { status: 423, headers: { "Content-Type": "application/json", ...cors } });
      if (row.used) return new Response(JSON.stringify({ ok: false, reason: "used" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      const hashed = await hmacHex(code);
      if (hashed !== row.hashed_code) {
        await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ attempts: (row.attempts || 0) + 1 }),
        });
        return new Response(JSON.stringify({ ok: false, reason: "bad" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
      }
      // Mark the code used.
      await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ used: true }),
      });
      // Stamp the user as verified so the apps know access is allowed.
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ user_metadata: { account_verified: true } }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...cors } });
    }

    return new Response("Not found", { status: 404, headers: cors });
  } catch (e) {
    console.error("verification function error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });
  }
});