import { Tabs, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import BottomTabs from '../../components/ui/BottomTabs';
import { supabase } from "../../lib/supabase";

export default function TabsLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const paidPlans = useMemo(() => new Set(['pro', 'premium']), []);

  useEffect(() => {
    let mounted = true;
    async function verifySubscription() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }
        const meta = user.user_metadata || {};
        const plan = String(meta.subscription_plan || 'free').toLowerCase();
        const status = String(meta.subscription_status || '').toLowerCase();
        // If subscription is missing, not a paid plan, or in a bad status, route to support
        if (!paidPlans.has(plan) || status === 'past_due' || status === 'canceled' || status === 'deleted') {
          router.replace('/support' as any);
          return;
        }
      } catch (e) {
        console.warn('Failed to verify subscription', e);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    verifySubscription();
    return () => {
      mounted = false;
    };
  }, [paidPlans, router]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1620' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <BottomTabs {...(props as any)} />}
      screenOptions={{
        headerShown: false,
  tabBarActiveTintColor: "#FFFFFF",
  tabBarInactiveTintColor: "#4A7A9B",
  tabBarStyle: { backgroundColor: "#0C1620", borderTopColor: "#D8E6EE" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      {/* Keep items, events, and add screens but hide from tabs - accessible via direct navigation */}
      <Tabs.Screen name="items" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="add" options={{ href: null }} />
    </Tabs>
  );
}