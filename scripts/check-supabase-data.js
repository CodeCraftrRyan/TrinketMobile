#!/usr/bin/env node
// Check whether Supabase shows items and profiles that match web app data.
// - Reads .env or app.json.extra for SUPABASE URL and anon key
// - Queries `items` (limit 50) and `profiles` (limit 50 if present)

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
    } catch (e) {}
  }
  const appJsonPath = path.resolve(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const extra = (content?.expo?.extra) || {};
      return {
        EXPO_PUBLIC_SUPABASE_URL: extra.EXPO_PUBLIC_SUPABASE_URL || extra.NEXT_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
    } catch (e) {}
  }
  return {};
}

(async function main() {
  const env = Object.assign({}, process.env, readEnv());
  const SUPABASE_URL = (env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const SUPABASE_ANON_KEY = (env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env or app.json.extra');
    process.exitCode = 2;
    return;
  }

  console.log('[check-supabase] Using', SUPABASE_URL);

  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { autoRefreshToken: false });

  try {
  console.log('\n[1] Querying recent items (limit 50)');
  // previous ordering by added_at failed when that column didn't exist in the table
  const { data: items, error: itemsErr } = await client.from('items').select('*').limit(50);
    if (itemsErr) {
      console.error('Query items error:', itemsErr.message || itemsErr);
    } else {
      console.log(`Found ${Array.isArray(items) ? items.length : 0} items`);
      if (Array.isArray(items)) {
        items.forEach((it, i) => {
          console.log(`\n#${i + 1} id=${it.id} title="${it.title}" owner=${it.owner ?? it.user_id ?? it.created_by ?? 'n/a'}`);
          // show images if present
          if (it.image_url) console.log('  image_url:', it.image_url);
          if (it.images) console.log('  images:', JSON.stringify(it.images).slice(0, 200));
          // show raw object keys
          const keys = Object.keys(it).sort();
          console.log('  columns:', keys.join(', '));
        });
      }
    }
  } catch (e) {
    console.error('Error querying items:', e.message || e);
  }

  // Try to query profiles table if present
  try {
    console.log('\n[2] Querying profiles (limit 50) if table exists');
    const { data: profiles, error: profErr } = await client.from('profiles').select('id,username,full_name,email').limit(50);
    if (profErr) {
      console.warn('profiles query error (may not exist):', profErr.message || profErr);
    } else if (Array.isArray(profiles)) {
      console.log(`Found ${profiles.length} profiles`);
      profiles.slice(0, 10).forEach((p, i) => console.log(`#${i + 1} id=${p.id} username=${p.username} full_name=${p.full_name}`));
    }
  } catch (e) {
    console.warn('Error querying profiles:', e.message || e);
  }

  console.log('\n[done]`');
})();
