#!/usr/bin/env node
// Insert a test item into the `items` table using the project's Supabase anon key.
// Reads .env or app.json.extra for the URL and anon key.

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

  console.log('[insert-test-item] Using', SUPABASE_URL);

  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { autoRefreshToken: false });

    const testItemFull = {
      title: 'TEST ITEM - inserted from mobile repo',
      description: 'This is a test item inserted by a local script to verify Supabase connectivity from the mobile repo.',
      tags: ['test', 'mobile-script'],
      location: 'Unit Test',
      price: '$0',
      image_url: null,
      images: null,
      // add any additional fields your table expects if known
    };

    console.log('\nAttempting to insert test item (full payload)...');
    let res = await client.from('items').insert(testItemFull).select('*');
    if (res.error) {
      console.warn('Full insert failed, trying minimal payload. Reason:', res.error.message || JSON.stringify(res.error));

      // Try a minimal insert with only the title (many schemas will accept this)
      const minimal = { title: 'TEST ITEM - minimal insert' };
      console.log('\nAttempting minimal insert...');
      res = await client.from('items').insert(minimal).select('*');
      if (res.error) {
        console.error('Minimal insert failed as well:', res.error.message || JSON.stringify(res.error));
        process.exitCode = 3;
        return;
      }
    }

    console.log('Insert result:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Script failed:', e.message || e);
    process.exitCode = 4;
  }
})();
