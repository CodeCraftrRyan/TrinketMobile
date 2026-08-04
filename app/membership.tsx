import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;

type Plan = 'Free' | 'Pro' | 'Premium';

export default function Membership() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<Plan>('Free');
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const [planRows, setPlanRows] = useState<any[]>([]);

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
      const planJoin = sub?.subscription_plans as any;
      const planRow = Array.isArray(planJoin) ? planJoin[0] : planJoin;
      const rawName = planRow?.name ?? 'Free';
      setCurrentPlan((['Free', 'Pro', 'Premium'].includes(rawName) ? rawName : 'Free') as Plan);

      // Prices and limits come from the database, never from constants here —
      // hardcoded copies drift the moment a price changes.
      const { data: rows, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });
      if (plansError) throw plansError;
      setPlanRows(rows ?? []);
    } catch (e: any) {
      Alert.alert('Could not load your plan', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembership(); }, [loadMembership]);

  // "Up to 500 objects" / "Unlimited objects" — null means no cap.
  function limitLine(value: number | null | undefined, singular: string, plural: string) {
    if (value === null || value === undefined) return `Unlimited ${plural}`;
    return `Up to ${value} ${value === 1 ? singular : plural}`;
  }

  function featuresFor(row: any): string[] {
    return [
      limitLine(row?.max_items, 'object', 'objects'),
      limitLine(row?.max_collections, 'collection', 'collections'),
      limitLine(row?.max_events, 'event', 'events'),
      limitLine(row?.max_photos_per_item, 'photograph per object', 'photographs per object'),
    ];
  }

  const money = (value: number | null | undefined) => {
    const n = Number(value ?? 0);
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
  };

  const plans = planRows.map((row) => {
    const name = String(row?.name ?? '');
    return {
      id: (['Free', 'Pro', 'Premium'].includes(name) ? name : 'Free') as Plan,
      name,
      features: featuresFor(row),
      row,
    };
  });

  function priceFor(row: any) {
    if (!row) return '';
    if (row.is_free) return 'No charge';
    return yearly
      ? `${money(row.price_yearly_usd)} / year`
      : `${money(row.price_monthly_usd)} / month`;
  }

  function perMonth(row: any) {
    if (!row || row.is_free || !yearly) return null;
    const y = Number(row.price_yearly_usd ?? 0);
    if (!y) return null;
    return `${money(y / 12)} a month, billed yearly`;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accentCool} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
            <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Profile</Text>
          </TouchableOpacity>

          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75, marginTop: 22 }}>
            Your plan
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 6 }}>
            {currentPlan}
          </Text>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10, lineHeight: 23 }}>
            Plans are managed on the web, at yourtrinkets.com.
          </Text>
        </View>

        {/* Billing period */}
        <View style={{ alignItems: 'center', paddingTop: 26 }}>
          <View style={{
            flexDirection: 'row', padding: 4,
            borderWidth: 1, borderColor: c.border,
            borderRadius: tokens.radius.sm,
            backgroundColor: c.card,
          }}>
            {[['Monthly', false], ['Yearly', true]].map(([label, val]) => {
              const on = yearly === val;
              return (
                <TouchableOpacity
                  key={String(label)}
                  onPress={() => setYearly(val as boolean)}
                  style={{
                    paddingHorizontal: 26, paddingVertical: 11,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: on ? c.ink : 'transparent',
                  }}>
                  <Text style={{ ...tokens.type.ui, fontSize: 15, color: on ? c.bg : c.ink }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Plans */}
        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <View
                key={plan.id}
                style={{
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: isCurrent ? c.accent : c.border,
                  borderRadius: tokens.radius.lg,
                  padding: 20,
                  marginBottom: 14,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...tokens.type.name, color: c.ink }}>{plan.name}</Text>
                    <Text style={{ color: c.inkLabel, fontSize: 15, marginTop: 4 }}>
                      {priceFor(plan.row)}
                    </Text>
                    {!!perMonth(plan.row) && (
                      <Text style={{ ...tokens.type.fact, color: c.inkFact, marginTop: 4 }}>
                        {perMonth(plan.row)}
                      </Text>
                    )}
                  </View>
                  {isCurrent && (
                    <Text style={{ ...tokens.type.label, color: c.inkFact, marginTop: 6 }}>Current</Text>
                  )}
                </View>

                <View style={{ marginTop: 18 }}>
                  {plan.features.map((feature, i) => (
                    <View
                      key={feature}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingVertical: 11,
                        borderTopWidth: i === 0 ? 1 : 0,
                        borderTopColor: c.border,
                        borderBottomWidth: i === plan.features.length - 1 ? 0 : 1,
                        borderBottomColor: c.ruleSoft,
                      }}>
                      <Text style={{ color: c.accentCool, fontSize: 15 }}>✓</Text>
                      <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={{
          ...tokens.type.fact,
          color: c.inkLabel,
          paddingHorizontal: 20, paddingTop: 8,
          lineHeight: 21,
        }}>
          Changing plans happens on the web. Whatever you choose there appears
          here the next time you open the app.
        </Text>

      </ScrollView>
    </View>
  );
}
