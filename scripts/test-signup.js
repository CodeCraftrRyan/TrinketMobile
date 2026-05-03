#!/usr/bin/env node
// Attempt to sign up a test user using the anon key from app.json or .env
const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const out = {};
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      out[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
    }
    return out;
  }
  const appJsonPath = path.resolve(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const content = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const extra = content?.expo?.extra || {};
    return {
      SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL || extra.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
  }
  return {};
}

(async function main() {
  const env = Object.assign({}, process.env, readEnv());
  const SUPABASE_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  const SUPABASE_ANON_KEY = (env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(2);
  }

  console.log('Using', SUPABASE_URL, 'anonKey length:', SUPABASE_ANON_KEY.length);
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const now = Date.now();
  const email = `test+signup-${now}@example.com`;
  const password = `TestPass!${now % 10000}`;
  console.log('Attempting signUp for', email);
  try {
    const res = await client.auth.signUp({ email, password });
    console.log('signUp response:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('signUp failed:', err?.message || err);
  }
})();
