import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

// Read from env or app.json -> expo.extra, then trim to avoid hidden whitespace/newline issues
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// TEMP DEBUG (remove once working)
console.log(
  '[supabase env]',
  'url?', SUPABASE_URL.startsWith('http'),
  'key?', SUPABASE_ANON_KEY.length > 20
);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in TrinketMobile/app.json (expo.extra) or .env, then restart with: npx expo start -c'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});