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
        // Read the session locally first. getSession() does not make a blocking
        // network call the way getUser() does, so a stale token right after the
        // app returns from the background (e.g. the camera during visual search)
        // no longer ejects the user to login.
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }
        // Plan comes from subscriptions -> subscription_plans (the source of
        // truth the Stripe webhook writes to), NOT user_metadata, which the
        // webhook never touches. Mirrors account.tsx / membership.tsx.
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('status, plan_id, subscription_plans ( name, slug )')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        // Fail open on a transient read error: don't eject a paying user just
        // because the subscription query blipped on resume. RLS still protects data.
        if (subError) {
          if (mounted) setChecking(false);
          return;
        }
        const planJoin = sub?.subscription_plans as
          | { name?: string; slug?: string }
          | { name?: string; slug?: string }[]
          | null
          | undefined;
        const planRow = Array.isArray(planJoin) ? planJoin[0] : planJoin;
        const plan = String(planRow?.slug || 'free').toLowerCase();
        const status = String(sub?.status || '').toLowerCase();
        // Only paid plans in good standing reach the tabs.
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