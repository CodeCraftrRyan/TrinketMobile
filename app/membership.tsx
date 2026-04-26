import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';
import { createCheckoutSession, openCheckout } from '../services/payments';

type Plan = 'Free' | 'Pro' | 'Premium';

export default function Membership() {
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const [currentPlan, setCurrentPlan] = useState<Plan>('Free');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Pro');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  // animated value for cross-fading prices (0 = monthly, 1 = yearly)
  const priceAnim = useRef(new Animated.Value(billingInterval === 'monthly' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(priceAnim, {
      toValue: billingInterval === 'monthly' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [billingInterval, priceAnim]);
  const scaleAnim = priceAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const planParam = (() => {
    if (!plan) return null;
    const normalized = String(plan).toLowerCase();
    if (normalized === 'pro') return 'Pro' as Plan;
    if (normalized === 'premium' || normalized === 'lifetime') return 'Premium' as Plan;
    if (normalized === 'free' || normalized === 'basic') return 'Free' as Plan;
    return null;
  })();

  const loadMembership = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data?.user;
      if (!user) return;
      const meta = user.user_metadata || {};
      const plan = (meta.subscription_plan || 'Free') as Plan;
      setCurrentPlan(plan);
      setSelectedPlan(plan);
      if (planParam) {
        setSelectedPlan(planParam);
      }
      return plan;
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load membership');
    } finally {
      setLoading(false);
    }
  }, [planParam]);

  useEffect(() => {
    loadMembership();
  }, [loadMembership, router]);

  useEffect(() => {
    const handleCheckoutUrl = (url?: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const checkout = parsed.searchParams.get('checkout');
        const sessionId = parsed.searchParams.get('session_id');
        if (checkout === 'success' || sessionId) {
          (async () => {
            setCheckoutStatus('success');
            const plan = await loadMembership();
            // if plan is upgraded, send user to home; otherwise show success page
            if (plan && plan !== 'Free') {
              router.replace('/(tabs)/home');
            } else {
              router.replace('/membership-success');
            }
          })();
          return;
        }
        if (checkout === 'cancel') {
          setCheckoutStatus('cancel');
        }
      } catch (e) {
        console.warn('Failed to parse checkout return url', e);
      }
    };

    Linking.getInitialURL().then(handleCheckoutUrl);
    const subscription = Linking.addEventListener('url', (event) => handleCheckoutUrl(event.url));
    return () => subscription.remove();
  }, [loadMembership, router]);

  async function updateSubscription() {
    if (selectedPlan === currentPlan) {
      router.back();
      return;
    }

    try {
      setSaving(true);
      if (selectedPlan !== 'Free') {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        const checkoutPlan = selectedPlan === 'Pro' ? 'pro' : 'premium';
        const interval = billingInterval;
        const session = await createCheckoutSession(checkoutPlan, user?.id, user?.email ?? undefined, interval);
        if (!session?.url) throw new Error('Checkout session not available.');
        setCheckoutStatus('pending');
        await openCheckout(session.url);
        Alert.alert('Almost there', 'Complete payment in Stripe, then return to the app to finish upgrading.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ 
        data: { subscription_plan: selectedPlan } 
      });
      if (error) throw error;
      
      Alert.alert(
        'Success', 
        `Your subscription has been updated to ${selectedPlan}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update subscription');
    } finally {
      setSaving(false);
    }
  }

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
      name: 'Basic',
      price: 'Free',
      features: [
        'Up to 50 items',
        'Basic search',
        'Photo storage',
        'Email support',
      ],
      icon: '📦',
    },
    {
      id: 'Pro' as Plan,
      name: 'Pro',
      price: '$9/month or $79/year',
      features: [
        'Up to 500 items',
        'Advanced search',
        'Photo storage',
        'Priority support',
        'Export data',
      ],
      icon: '⭐',
    },
    {
      id: 'Premium' as Plan,
      name: 'Premium',
      price: '$19/month or $79/year',
      features: [
        'Unlimited items',
        'AI-powered search',
        'Unlimited photo storage',
        '24/7 priority support',
        'Export data',
        'Team collaboration',
      ],
      icon: '💎',
    },
  ];

  function priceFor(planId: Plan, interval: 'monthly' | 'yearly') {
    if (planId === 'Free') return 'Free';
    if (planId === 'Pro') return interval === 'monthly' ? '$9 / month' : '$79 / year';
    if (planId === 'Premium') return interval === 'monthly' ? '$19 / month' : '$169 / year';
    return '';
  }

  return (
    <Screen>
      <View style={styles.container}>
          <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.cancelButton}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Membership</Text>
          <Pressable onPress={updateSubscription} disabled={saving} accessibilityRole="button" accessibilityLabel="Save subscription">
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.currentPlanBanner}>
            <Text style={styles.bannerLabel}>Current Plan</Text>
            <Text style={styles.bannerPlan}>{currentPlan}</Text>
          </View>
          {checkoutStatus !== 'idle' && (
            <View style={[
              styles.checkoutBanner,
              checkoutStatus === 'success' && styles.checkoutBannerSuccess,
              checkoutStatus === 'cancel' && styles.checkoutBannerCancel,
            ]}
            >
              <Text style={styles.checkoutBannerText}>
                {checkoutStatus === 'pending' && 'Stripe checkout opened. Return here after payment to finish.'}
                {checkoutStatus === 'success' && 'Payment confirmed. Your subscription is now updated.'}
                {checkoutStatus === 'cancel' && 'Checkout was cancelled. You can try again anytime.'}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          <View style={styles.intervalWrap}>
              <View style={styles.intervalToggle}>
              <Pressable onPress={() => setBillingInterval('monthly')} style={({ pressed }) => [styles.intervalOption, billingInterval === 'monthly' && styles.intervalSelected, pressed && styles.planCardPressed]} accessibilityRole="button" accessibilityLabel={`Set billing to monthly`}>
                <Text style={[styles.intervalText, billingInterval === 'monthly' && styles.intervalTextSelected]}>Monthly</Text>
              </Pressable>
              <Pressable onPress={() => setBillingInterval('yearly')} style={({ pressed }) => [styles.intervalOption, billingInterval === 'yearly' && styles.intervalSelected, pressed && styles.planCardPressed]} accessibilityRole="button" accessibilityLabel={`Set billing to yearly`}>
                <Text style={[styles.intervalText, billingInterval === 'yearly' && styles.intervalTextSelected]}>Yearly</Text>
              </Pressable>
            </View>
          </View>

          {plans.map((plan) => (
            <AnimatedPressable
              key={plan.id}
              accessibilityRole="button"
              accessibilityLabel={`Plan ${plan.name}. ${priceFor(plan.id, billingInterval)}${selectedPlan === plan.id ? ', selected' : ''}`}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
              onPress={() => setSelectedPlan(plan.id)}
              style={({ pressed }) => [
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                pressed && styles.planCardPressed,
                { transform: [{ scale: selectedPlan === plan.id ? scaleAnim : 1 }] },
              ]}
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
                <View style={[
                  styles.radioButton,
                  selectedPlan === plan.id && styles.radioButtonSelected,
                ]}>
                  {selectedPlan === plan.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
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

              {currentPlan === plan.id && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </AnimatedPressable>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Pressable onPress={() => setBillingInterval('monthly')} style={({ pressed }) => [styles.secondaryBtn, billingInterval === 'monthly' && { borderWidth: 2, borderColor: '#0C1620' }, pressed && styles.planCardPressed]} accessibilityRole="button" accessibilityLabel={`Set billing interval to monthly`}>
              <Text style={styles.secondaryBtnText}>Monthly</Text>
            </Pressable>
            <Pressable onPress={() => setBillingInterval('yearly')} style={({ pressed }) => [styles.secondaryBtn, billingInterval === 'yearly' && { borderWidth: 2, borderColor: '#0C1620' }, pressed && styles.planCardPressed]} accessibilityRole="button" accessibilityLabel={`Set billing interval to yearly`}>
              <Text style={styles.secondaryBtnText}>Yearly</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            Plans are billed monthly and can be cancelled anytime. Changes take effect immediately.
          </Text>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  cancelButton: {
    color: '#B8783A',
    fontSize: 17,
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0C1620',
  },
  saveButton: {
    color: '#B8783A',
    fontSize: 17,
    fontWeight: '600',
    width: 70,
    textAlign: 'right',
  },
  saveButtonDisabled: {
    color: '#4A7A9B',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  currentPlanBanner: {
    backgroundColor: '#B8783A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 29,
    alignItems: 'center',
  },
  checkoutBanner: {
    backgroundColor: '#F7FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 19,
    borderWidth: 1,
    borderColor: '#D8E6EE',
  },
  checkoutBannerSuccess: {
    backgroundColor: '#EAF6EF',
    borderColor: '#B6DEC3',
  },
  checkoutBannerCancel: {
    backgroundColor: '#FCEFEB',
    borderColor: '#F0C7BC',
  },
  checkoutBannerText: {
    color: '#2E4A5E',
    fontSize: 14.5,
    fontWeight: '600',
  },
  bannerLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 4,
  },
  bannerPlan: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0C1620',
    marginBottom: 19,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 31,
    borderWidth: 2,
    borderColor: '#0C1620',
  },
  planCardSelected: {
    borderColor: '#B8783A',
    backgroundColor: '#D8E6EE',
    // Subtle shadow for selected card (iOS)
    shadowColor: '#0C1620',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    // Elevation for Android
    elevation: 6,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIcon: {
    fontSize: 32,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0C1620',
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 15,
    color: '#4A7A9B',
    marginTop: 2,
    textAlign: 'center',
  },
  mostPopularBadge: { position: 'absolute', left: 16, top: -12, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  mostPopularText: { fontSize: 12, fontWeight: '700', color: '#154406', fontStyle: 'italic' },
  secondaryBtn: { backgroundColor: '#F7FAFB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#0C1620', fontWeight: '600' },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D8E6EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#B8783A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B8783A',
  },
  divider: {
    height: 1,
    backgroundColor: '#D8E6EE',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmark: {
    fontSize: 16,
    color: '#B8783A',
    fontWeight: '700',
  },
  featureText: {
    fontSize: 15,
    color: '#0C1620',
  },
  currentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#B8783A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 13,
    color: '#4A7A9B',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 38,
    lineHeight: 18,
  },
  intervalWrap: { alignItems: 'center', marginBottom: 12 },
  intervalToggle: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 4, elevation: 1 },
  intervalOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  intervalSelected: { backgroundColor: '#B8783A' },
  intervalText: { color: '#0C1620', fontWeight: '600' },
  intervalTextSelected: { color: '#FFFFFF' },
  planCardPressed: { opacity: 0.85, transform: [{ scale: 0.998 }] },
});
