import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const authed = !!data.session;
        const inAuth = pathname.startsWith('/(auth)');

        if (!authed && !inAuth) router.replace('/(auth)/login');
        if (authed && inAuth) router.replace('/');
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = !!session;
      const inAuth = pathname.startsWith('/(auth)');
      if (authed) router.replace('/');
      else if (!inAuth) router.replace('/(auth)/login');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}