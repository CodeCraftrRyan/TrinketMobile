// app/index.tsx
//
// Cold-start router. A returning user with a persisted session goes straight
// to the archive; everyone else sees the welcome screen. Before this, every
// launch landed on welcome and asked for a login even when a valid session
// was sitting in storage.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [dest, setDest] = useState<'/(tabs)/home' | '/welcome' | null>(null);

  useEffect(() => {
    let mounted = true;
    // getSession() reads local storage; it does not block on the network, so
    // an offline launch still resolves quickly.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setDest(data?.session ? '/(tabs)/home' : '/welcome');
      })
      .catch(() => {
        if (mounted) setDest('/welcome');
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!dest) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1620' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return <Redirect href={dest} />;
}
