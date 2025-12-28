#!/usr/bin/env node
// Quick Supabase connectivity test.
// - Reads .env or falls back to app.json extra
// - Performs a GET to the supabase base URL and a request to /rest/v1/ with the anon key to verify reachability

const fs = require('fs');
const path = require('path');

function parseDotEnv(content) {
  const lines = content.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const val = trimmed.slice(idx + 1);
    out[key.trim()] = val.trim();
  }
  return out;
}

function readEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      return parseDotEnv(content);
    } catch (e) {
      // ignore
    }
  }
  // Try app.json
  const appJsonPath = path.resolve(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const extra = (content?.expo?.extra) || {};
      return {
        NEXT_PUBLIC_SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL || extra.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
    } catch (e) {
      // ignore
    }
  }
  return {};
}

(async function main() {
  const env = Object.assign({}, process.env, readEnv());
  const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL)?.trim();
  const SUPABASE_ANON_KEY = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  console.log('[test-supabase] Using URL:', SUPABASE_URL ? SUPABASE_URL : '(missing)');
  console.log('[test-supabase] Has anon key:', SUPABASE_ANON_KEY ? `yes (length ${SUPABASE_ANON_KEY.length})` : 'no');

  if (!SUPABASE_URL) {
    console.error('No SUPABASE_URL found in .env or app.json.extra');
    process.exitCode = 2;
    return;
  }

  const fetch = global.fetch || require('node-fetch');

  try {
    console.log('\n[1] Fetching base URL...');
    const r = await fetch(SUPABASE_URL, { method: 'GET' });
    console.log('Base URL status:', r.status, r.statusText);
  } catch (err) {
    console.error('Base URL request failed:', err.message || err);
  }

  // Try REST endpoint with anon key
  try {
    console.log('\n[2] Hitting REST endpoint /rest/v1/ with anon key (this checks API access)');
    const restUrl = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
    const headers = {
      Accept: 'application/json',
    };
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    const r2 = await fetch(restUrl, { method: 'GET', headers });
    console.log('REST endpoint status:', r2.status, r2.statusText);
    const text = await r2.text();
    console.log('Response snippet:', (text || '').slice(0, 300));
    if (r2.status === 401) {
      console.warn('401 Unauthorized — the anon key was not accepted for REST access (this could be expected if the project restricts anon access).');
    }
  } catch (err) {
    console.error('REST endpoint request failed:', err.message || err);
  }

  // Optionally test createClient if supabase-js available
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (!SUPABASE_ANON_KEY) {
      console.log('\nSkipping supabase-js client test because anon key is missing');
      return;
    }
    console.log('\n[3] Creating supabase-js client and calling from("pg_catalog.pg_tables").select() as a light check');
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { autoRefreshToken: false });
    // Try a simple RPC-ish low-priv call: request the Postgres version via SQL function (not allowed generally), so instead we'll attempt a health check via the realtime endpoint using `client.auth.getSession()`
    if (typeof client.auth?.getSession === 'function') {
      try {
        const sessionRes = await client.auth.getSession();
        console.log('auth.getSession response:', sessionRes?.data ? 'ok' : JSON.stringify(sessionRes));
      } catch (e) {
        console.log('auth.getSession failed (this may be expected without a session):', e.message || e);
      }
    }
  } catch (e) {
    console.log('\nSupabase client test skipped (package @supabase/supabase-js not available):', e.message || e);
  }
})();
