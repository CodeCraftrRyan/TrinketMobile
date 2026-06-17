import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';

type Plan = 'Free' | 'Pro' | 'Premium';

export default function Membership() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<Plan>('Free');
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const loadMembership = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user;
      if (!user) return;

      // Source of truth: the user's row in `subscriptions`, joined to
      // `subscription_plans` for the tier name. Mirrors web exactly. The Stripe
      // webhook (driven by web checkout) writes `plan_id` onto this row, so this
      // join is the only place a real paid upgrade shows up.
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('status, plan_id, subscription_plans ( name, slug )')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      const planJoin = sub?.subscription_plans as
        | { name?: string; slug?: string }
        | { name?: string; slug?: string }[]
        | null
        | undefined;
      const planRow = Array.isArray(planJoin) ? planJoin[0] : planJoin;
      const rawName = planRow?.name ?? 'Free';
      const resolvedPlan = (['Free', 'Pro', 'Premium'].includes(rawName) ? rawName : 'Free') as Plan;

      setCurrentPlan(resolvedPlan);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load membership');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembership();
  }, [loadMembership]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8783A" />
        </View>
      </Screen>
    );
  }

  const plans = [
    {
      id: 'Free' as Plan,
      name: 'Free',
      features: ['Up to 50 items', 'Up to 3 events', 'Up to 3 collections', 'Photo storage'],
      icon: '📦',
    },
    {
      id: 'Pro' as Plan,
      name: 'Pro',
      features: ['Up to 500 items', 'Up to 10 events', 'Up to 25 collections', 'Priority support'],
      icon: '⭐',
    },
    {
      id: 'Premium' as Plan,
      name: 'Premium',
      features: ['Unlimited items', 'Unlimited events', 'Unlimited collections', '24/7 priority support'],
      icon: '💎',
    },
  ];

  function priceFor(planId: Plan, interval: 'monthly' | 'yearly') {
    if (planId === 'Free') return 'Free';
    if (planId === 'Pro') return interval === 'monthly' ? '$9.99 / month' : '$79 / year';
    if (planId === 'Premium') return interval === 'monthly' ? '$19 / month' : '$169 / year';
    return '';
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backButton}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Membership</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.currentPlanBanner}>
            <Text style={styles.bannerLabel}>Current Plan</Text>
            <Text style={styles.bannerPlan}>{currentPlan}</Text>
          </View>

          <Text style={styles.sectionTitle}>Plans</Text>

          <View style={styles.intervalWrap}>
            <View style={styles.intervalToggle}>
              <Pressable
                onPress={() => setBillingInterval('monthly')}
                style={({ pressed }) => [styles.intervalOption, billingInterval === 'monthly' && styles.intervalSelected, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Show monthly pricing"
              >
                <Text style={[styles.intervalText, billingInterval === 'monthly' && styles.intervalTextSelected]}>Monthly</Text>
              </Pressable>
              <Pressable
                onPress={() => setBillingInterval('yearly')}
                style={({ pressed }) => [styles.intervalOption, billingInterval === 'yearly' && styles.intervalSelected, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Show yearly pricing"
              >
                <Text style={[styles.intervalText, billingInterval === 'yearly' && styles.intervalTextSelected]}>Yearly</Text>
              </Pressable>
            </View>
          </View>

          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <View
                key={plan.id}
                style={[styles.planCard, isCurrent && styles.planCardCurrent]}
                accessibilityLabel={`Plan ${plan.name}. ${priceFor(plan.id, billingInterval)}${isCurrent ? ', current plan' : ''}`}
              >
                {plan.id === 'Pro' && (
                  <View style={styles.mostPopularBadge}>
                    <Text style={styles.mostPopularText}>Most popular</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.planHeaderLeft}>
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                    <View style={{ alignItems: 'center', minWidth: 90 }}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>{priceFor(plan.id, billingInterval)}</Text>
                    </View>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={styles.checkmark}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={styles.manageText}>
            To change or cancel your plan, visit yourtrinkets.com from a web browser.
          </Text>

          <Text style={styles.disclaimer}>
            Plans can be cancelled anytime. Changes take effect immediately.
          </Text>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D8E6EE',
  },
  backButton: { color: '#B8783A', fontSize: 17, width: 70 },
  title: { fontSize: 17, fontWeight: '600', color: '#0C1620' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  currentPlanBanner: {
    backgroundColor: '#B8783A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 29,
    alignItems: 'center',
  },
  bannerLabel: { color: '#FFFFFF', fontSize: 15, marginBottom: 4 },
  bannerPlan: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#0C1620', marginBottom: 19 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 31,
    borderWidth: 2,
    borderColor: '#0C1620',
  },
  planCardCurrent: {
    borderColor: '#B8783A',
    backgroundColor: '#D8E6EE',
    shadowColor: '#0C1620',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { fontSize: 32 },
  planName: { fontSize: 20, fontWeight: '700', color: '#0C1620', textAlign: 'center' },
  planPrice: { fontSize: 15, color: '#4A7A9B', marginTop: 2, textAlign: 'center' },
  mostPopularBadge: { position: 'absolute', left: 16, top: -12, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  mostPopularText: { fontSize: 12, fontWeight: '700', color: '#154406', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#D8E6EE', marginBottom: 16 },
  featuresList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 16, color: '#B8783A', fontWeight: '700' },
  featureText: { fontSize: 15, color: '#0C1620' },
  currentBadge: { backgroundColor: '#B8783A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  currentBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  manageText: { fontSize: 14, color: '#4A7A9B', textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 20 },
  disclaimer: { fontSize: 13, color: '#4A7A9B', textAlign: 'center', marginBottom: 38, lineHeight: 18 },
  intervalWrap: { alignItems: 'center', marginBottom: 16 },
  intervalToggle: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 4, elevation: 1 },
  intervalOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  intervalSelected: { backgroundColor: '#B8783A' },
  intervalText: { color: '#0C1620', fontWeight: '600' },
  intervalTextSelected: { color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});