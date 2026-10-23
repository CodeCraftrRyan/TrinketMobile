// Clean account-verification Edge Function (single-file Deno function)
// Minimal, single serve() entrypoint and no duplicated blocks.
//
// Both endpoints require the caller's Supabase access token. The user id and
// destination email come from that token, never from the request body, so a
// caller can only verify their own account against their own address.

// @ts-nocheck


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VERIFICATION_HMAC_SECRET = Deno.env.get("VERIFICATION_HMAC_SECRET") || "";
// Only the literal "true" enables this; "false"/"0" must not leak codes.
const DEV_RETURN_CODES = (Deno.env.get("DEV_RETURN_CODES") || "").trim().toLowerCase() === "true";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const CODE_TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_CODES_PER_HOUR = 5;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const adminHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });
}

function genCode() {
  // Rejection sampling keeps the 6-digit distribution uniform.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / 900000) * 900000;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return (100000 + (buf[0] % 900000)).toString();
}

async function hmacHex(message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(VERIFICATION_HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Resolve the caller from their access token. Returns null if missing/invalid.
async function getCaller(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id || !user?.email) return null;
  return { id: user.id as string, email: String(user.email).toLowerCase() };
}

async function insertHashedCode(userId: string, method: string, destination: string) {
  const code = genCode();
  const hashed = await hmacHex(code);
  const payload = { user_id: userId, method, destination, hashed_code: hashed, attempts: 0, used: false };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    // 23505 = the partial unique index account_verification_codes_one_live_per_user:
    // another request issued a live code for this user first. Not an error.
    if (res.status === 409 || txt.includes('23505')) return { code: null, row: null, conflict: true };
    throw new Error(`insertHashedCode failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return { code, row: Array.isArray(data) ? data[0] : data, conflict: false };
}

// Retire any live code for the user so a fresh one can be issued (the unique
// index allows only one live code per user).
async function retireLiveCodes(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&used=is.false&locked=is.false`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ used: true }),
  });
  if (!res.ok) throw new Error(`retireLiveCodes failed: ${res.status}`);
}

async function sendWithSendGrid(destination: string, subject: string, text: string, signal?: AbortSignal) {
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
    signal,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${txt}`);
  }
}

async function dispatchCode(destination: string, code: string, signal?: AbortSignal) {
  const text = `Your Trinket verification code is: ${code}\n\nIt expires in 15 minutes.`;
  return sendWithSendGrid(destination, "Your Trinket verification code", text, signal);
}

async function findLatestRow(userId: string) {
  const q = `${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1&select=*`;
  const res = await fetch(q, { headers: adminHeaders });
  if (!res.ok) throw new Error(`findLatestRow failed: ${res.status}`);
  const data = await res.json();
  return data && data[0] ? data[0] : null;
}

// Every code for the user that could still be accepted: unused, unlocked and
// inside the TTL. Newest first. More than one is possible when the client
// requested several codes in quick succession (or the user tapped Resend);
// verifying against only the newest silently killed the earlier emails.
async function findLiveRows(userId: string) {
  const since = new Date(Date.now() - CODE_TTL_MS).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&used=is.false&locked=is.false&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&select=*`;
  const res = await fetch(q, { headers: adminHeaders });
  if (!res.ok) throw new Error(`findLiveRows failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function retireOtherLiveRows(userId: string, keepId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&used=is.false&id=neq.${encodeURIComponent(keepId)}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ used: true }),
  });
  if (!res.ok) console.error("retireOtherLiveRows failed", res.status);
}

async function countRecentCodes(userId: string, sinceMs: number) {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/account_verification_codes?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}&select=id`;
  const res = await fetch(q, { headers: { ...adminHeaders, Prefer: "count=exact" } });
  if (!res.ok) throw new Error(`countRecentCodes failed: ${res.status}`);
  const range = res.headers.get("content-range") || "";
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : (await res.json()).length;
}

// Conditional PATCH: applies only if the row still matches `match`, so two
// concurrent requests can't both act on the same snapshot. Returns true if a
// row was updated.
async function patchIf(id: string, match: Record<string, string>, body: Record<string, unknown>) {
  const filters = Object.entries(match).map(([k, v]) => `&${k}=${v}`).join("");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${encodeURIComponent(id)}${filters}`, {
    method: "PATCH",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

async function deliverInBackground(destination: string, code: string, rowId?: string) {
  const maxRetries = 2;
  const baseDelay = 500;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      await dispatchCode(destination, code, controller.signal);
      return;
    } catch (err) {
      console.error(`dispatch attempt ${attempt} failed`, err?.message ?? err);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, baseDelay * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  if (!rowId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/account_verification_codes?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ send_failed: true }),
    });
  } catch (patchErr) {
    console.error("failed to mark send_failed on row", patchErr);
  }
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

    if (!VERIFICATION_HMAC_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("account-verification misconfigured: missing VERIFICATION_HMAC_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
      return json({ ok: false, error: "server misconfigured" }, 500);
    }

    const url = new URL(req.url);
    if (req.method !== "POST" || !(url.pathname.endsWith("/send") || url.pathname.endsWith("/verify"))) {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const caller = await getCaller(req);
    if (!caller) return json({ ok: false, error: "unauthorized" }, 401);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (url.pathname.endsWith("/send")) {
      // Email-only verification, always to the account's own address.
      const userId = caller.id;
      const destination = caller.email;
      const method = "email";

      // Cooldown: if a code was issued in the last 60s, don't create another.
      // (Verify accepts any live code, but several emails in a row still
      // confuse people.)
      const recent = await findLatestRow(userId);
      if (recent && !recent.used && !recent.locked && recent.created_at && (Date.now() - new Date(recent.created_at).getTime()) < RESEND_COOLDOWN_MS) {
        return json({ ok: true, cooldown: true });
      }
      // Hourly cap so requesting new codes can't be used to reset the
      // per-code attempt limit indefinitely.
      if ((await countRecentCodes(userId, 60 * 60_000)) >= MAX_CODES_PER_HOUR) {
        return json({ ok: false, reason: "rate-limited", error: "Too many codes requested. Try again later." }, 429);
      }

      // Past the cooldown: the previous code (if any) is superseded. Between
      // this PATCH and the INSERT a parallel request can slip in; the unique
      // index makes exactly one of them win and the rest report cooldown.
      if (recent && !recent.used && !recent.locked) await retireLiveCodes(userId);
      const { code, row, conflict } = await insertHashedCode(userId, method, destination);
      if (conflict || !code) return json({ ok: true, cooldown: true });

      // Keep the worker alive until delivery finishes; a bare floating promise
      // can be killed as soon as the response is returned.
      const delivery = deliverInBackground(destination, code, row?.id);
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        EdgeRuntime.waitUntil(delivery);
      } else {
        await delivery;
      }

      return json({ ok: true, dev_code: DEV_RETURN_CODES ? code : undefined });
    }

    // /verify
    const userId = caller.id;
    const code = String(body.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) return json({ ok: false, reason: "bad", error: "Enter the 6-digit code." }, 400);

    const live = await findLiveRows(userId);
    if (live.length === 0) {
      // Nothing acceptable — explain why from the most recent row.
      const latest = await findLatestRow(userId);
      if (!latest) return json({ ok: false, reason: "no-code" }, 400);
      if (latest.used) return json({ ok: false, reason: "used" }, 400);
      if (latest.locked || (latest.attempts || 0) >= MAX_ATTEMPTS) {
        return json({ ok: false, reason: "locked", error: "Too many attempts. Request a new code." }, 423);
      }
      return json({ ok: false, reason: "expired", error: "That code has expired. Request a new one." }, 400);
    }

    // Attempts are counted against the newest live code so the lockout is as
    // strict as before, even though any live code is accepted below.
    const row = live[0];
    if ((row.attempts || 0) >= MAX_ATTEMPTS) {
      return json({ ok: false, reason: "locked", error: "Too many attempts. Request a new code." }, 423);
    }

    // Claim an attempt before comparing. The match on the current attempts
    // value makes this a compare-and-swap, so parallel guesses can't all read
    // attempts=0 and bypass the limit.
    const prevAttempts = row.attempts || 0;
    const newAttempts = prevAttempts + 1;
    const claimed = await patchIf(
      row.id,
      { attempts: `eq.${prevAttempts}`, locked: "is.false", used: "is.false" },
      { attempts: newAttempts, locked: newAttempts >= MAX_ATTEMPTS },
    );
    if (!claimed) return json({ ok: false, reason: "busy", error: "Please try again." }, 409);

    const hashed = await hmacHex(code);
    // Compare against every live code, not just the newest; constant-time per
    // row, and the loop always runs to the end so timing doesn't reveal which
    // row (if any) matched.
    let matched: any = null;
    for (const r of live) {
      if (timingSafeEqual(hashed, r.hashed_code) && !matched) matched = r;
    }
    if (!matched) {
      const nowLocked = newAttempts >= MAX_ATTEMPTS;
      return json(
        { ok: false, reason: nowLocked ? "locked" : "bad", error: nowLocked ? "Too many attempts. Request a new code." : undefined },
        nowLocked ? 423 : 400,
      );
    }

    // Stamp the user as verified first, so a failure here doesn't burn the
    // code. app_metadata is only writable with the service role; user_metadata
    // can be set by the user themselves and must not be trusted for this.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ app_metadata: { account_verified: true } }),
    });
    if (!userRes.ok) {
      console.error("failed to mark user verified", userRes.status, await userRes.text());
      return json({ ok: false, error: "Could not complete verification. Please try again." }, 500);
    }

    // Mark the matched code used and retire any other live codes for this
    // user, so nothing in an older email can be replayed.
    await patchIf(matched.id, { used: "is.false" }, { used: true });
    await retireOtherLiveRows(userId, matched.id);

    return json({ ok: true });
  } catch (e) {
    console.error("verification function error", e);
    return json({ ok: false, error: "Internal error" }, 500);
  }
});
