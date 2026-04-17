import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';
import { createCheckoutSession, openCheckout } from '../services/payments';

type Plan = 'Free' | 'Pro' | 'Premium';

export default function Membership() {
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const [currentPlan, setCurrentPlan] = useState<Plan>('Free');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'pending' | 'success' | 'cancel'>('idle');
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
          setCheckoutStatus('success');
          loadMembership();
          router.replace('/membership-success');
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
        const session = await createCheckoutSession(checkoutPlan, user?.id, user?.email ?? undefined);
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
      price: '$8/month',
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
      price: '$15/month',
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

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Membership</Text>
          <TouchableOpacity onPress={updateSubscription} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
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

          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <View style={styles.planHeaderLeft}>
                  <Text style={styles.planIcon}>{plan.icon}</Text>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.price}</Text>
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
            </TouchableOpacity>
          ))}

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
    marginBottom: 24,
    alignItems: 'center',
  },
  checkoutBanner: {
    backgroundColor: '#F7FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#D8E6EE',
  },
  planCardSelected: {
    borderColor: '#B8783A',
    backgroundColor: '#D8E6EE',
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
  },
  planPrice: {
    fontSize: 15,
    color: '#4A7A9B',
    marginTop: 2,
  },
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
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 18,
  },
});
