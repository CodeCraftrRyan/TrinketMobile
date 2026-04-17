/*
 * Server-side Supabase client using the Service Role key.
 * Use this only in trusted server environments (Edge Functions, Cloud Run, Render, etc.).
 * Never expose the service role key to browser/mobile clients.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.\n' +
      'Set these on your server/CI environment or in the deployment dashboard (do NOT commit keys into git).'
  );
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default supabaseServer;
