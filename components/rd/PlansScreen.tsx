// Redesign → Plans (TRINKET_SPEC v5 §7.5, iOS). There is no in-app purchase:
// this screen compares Free / Pro / Premium and offers one navy button,
// "Continue on the web", which opens yourtrinkets.com/upgrade in the browser.
// No card fields, no payment sheet, no payment UI of any kind.
//
// Everything shown comes from the database: plan limits and prices from
// subscription_plans (null = unlimited), the current plan from the person's
// subscription row (never from metadata). Only five limits are shown:
// pieces, AI lookups, collections, moments, photos per piece.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchLookups } from '../../lib/aiLookups';
import { rd } from '../../lib/rdTokens';
import { supabase } from '../../lib/supabase';
import { useLoader } from '../../lib/useLoader';
import { BackBar, Failed, GUTTER, Loading, PageHead, pageStyles } from './Page';

export const UPGRADE_URL = 'https://yourtrinkets.com/upgrade';

type PlanRow = {
  id: number | string; name: string | null; slug?: string | null; is_free?: boolean | null;
  price_monthly_usd?: number | string | null; price_yearly_usd?: number | string | null;
  max_items?: number | null; max_ai_searches_per_month?: number | null; max_collections?: number | null;
  max_events?: number | null; max_photos_per_item?: number | null;
};

// The five limits the spec allows, in order. Unit names follow the redesign.
const LIMITS: { key: keyof PlanRow; one: string; many: string }[] = [
  { key: 'max_items', one: 'piece', many: 'pieces' },
  { key: 'max_ai_searches_per_month', one: 'AI lookup a month', many: 'AI lookups a month' },
  { key: 'max_collections', one: 'collection', many: 'collections' },
  { key: 'max_events', one: 'moment', many: 'moments' },
  { key: 'max_photos_per_item', one: 'photo per piece', many: 'photos per piece' },
];

async function load() {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error('Not signed in');
  const [plansRes, subRes, items, cols, evs, lookups] = await Promise.all([
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('id', { ascending: true }),
    supabase.from('subscriptions').select('plan_id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', uid).in('status', ['active', 'trialing']).order('current_period_end', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('collections').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    fetchLookups(),
  ]);
  if (plansRes.error) throw plansRes.error;
  const plans = (plansRes.data ?? []) as PlanRow[];
  const sub: any = subRes.data;
  const current = plans.find((p) => String(p.id) === String(sub?.plan_id)) ?? plans.find((p) => p.is_free) ?? null;
  return {
    plans, current, sub,
    usage: {
      max_items: items.count ?? 0,
      max_collections: cols.count ?? 0,
      max_events: evs.count ?? 0,
      max_ai_searches_per_month: lookups?.used ?? null,
    } as Partial<Record<keyof PlanRow, number | null>>,
  };
}

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};
const limitText = (v: number | null | undefined, one: string, many: string) =>
  v == null ? `Unlimited ${many}` : `${v} ${v === 1 ? one : many}`;

export default function PlansScreen() {
  const { data, failed, loading, reload } = useLoader(load, []);
  const [yearly, setYearly] = useState(true);

  async function continueOnWeb() {
    try {
      await Linking.openURL(UPGRADE_URL);
    } catch {
      Alert.alert('Couldn’t open the browser', `Visit ${UPGRADE_URL.replace('https://', '')} to change your plan.`);
    }
  }

  const current = data?.current ?? null;
  const isTop = !!current && data?.plans.length ? String(data.plans[data.plans.length - 1].id) === String(current.id) : false;

  return (
    <View style={pageStyles.page}>
      <BackBar label="Back" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="Your plan" onRetry={reload} /> : !data ? null : (
          <>
            <PageHead kicker="Your plan" title={current?.name ?? 'Free'}
              lead={data.sub?.cancel_at_period_end && data.sub?.current_period_end
                ? `Ends ${new Date(data.sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                : 'What your archive holds, and room to grow.'} />

            {/* Usage against the current plan's limits. */}
            {current && (
              <View style={styles.card}>
                {LIMITS.filter((l) => l.key !== 'max_photos_per_item').map((l, i) => {
                  const cap = current[l.key] as number | null | undefined;
                  const used = data.usage[l.key];
                  const pct = cap == null || used == null ? 0 : Math.min(1, used / Math.max(cap, 1));
                  const near = cap != null && used != null && used >= cap;
                  return (
                    <View key={String(l.key)} style={[styles.usage, i > 0 && styles.rule]}
                      accessible accessibilityLabel={`${l.many}: ${used ?? 'unknown'}${cap == null ? ', unlimited' : ` of ${cap}`}`}>
                      <View style={styles.usageLine}>
                        <Text style={rd.type.ui}>{l.many.charAt(0).toUpperCase() + l.many.slice(1)}</Text>
                        <Text style={[rd.type.label, near && { color: rd.color.bronzeDeep }]}>
                          {used ?? '—'}{cap == null ? '' : ` of ${cap}`}
                        </Text>
                      </View>
                      {cap != null && (
                        <View style={styles.track}><View style={[styles.fill, { width: `${pct * 100}%` }, near && { backgroundColor: rd.color.bronze }]} /></View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.toggle} accessibilityRole="radiogroup">
              {[['Yearly', true], ['Monthly', false]].map(([label, val]) => (
                <TouchableOpacity key={String(label)} style={[styles.toggleBtn, yearly === val && styles.toggleOn]} onPress={() => setYearly(val as boolean)}
                  accessibilityRole="radio" accessibilityState={{ selected: yearly === val }}>
                  <Text style={[rd.type.uiMedium, { color: yearly === val ? rd.color.paper : rd.color.navy }]}>{label as string}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {data.plans.map((p) => {
              const isCurrent = current && String(p.id) === String(current.id);
              const price = p.is_free ? 'No charge' : yearly ? `${money(p.price_yearly_usd)} a year` : `${money(p.price_monthly_usd)} a month`;
              const perMonth = !p.is_free && yearly && Number(p.price_yearly_usd) ? `${money(Number(p.price_yearly_usd) / 12)} a month, billed yearly` : null;
              return (
                <View key={String(p.id)} style={[styles.plan, isCurrent && styles.planCurrent]}>
                  <View style={styles.planHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={rd.type.name}>{p.name}</Text>
                      <Text style={[rd.type.ui, { marginTop: 2 }]}>{price}</Text>
                      {perMonth && <Text style={[rd.type.fact, { marginTop: 2 }]}>{perMonth}</Text>}
                    </View>
                    {isCurrent && <Text style={[rd.type.label, { color: rd.color.bronzeDeep }]}>Current</Text>}
                  </View>
                  {LIMITS.map((l, i) => (
                    <View key={String(l.key)} style={[styles.limit, i === 0 && { marginTop: 14 }]}>
                      <Ionicons name="checkmark" size={16} color={rd.color.steel} />
                      <Text style={[rd.type.fact, { color: rd.color.inkBody, fontSize: 15 }]}>{limitText(p[l.key] as number | null, l.one, l.many)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <View style={{ paddingHorizontal: GUTTER, marginTop: 10 }}>
              <TouchableOpacity style={styles.primary} onPress={continueOnWeb} accessibilityRole="link"
                accessibilityHint="Opens yourtrinkets.com in your browser">
                <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>Continue on the web</Text>
                <Ionicons name="open-outline" size={17} color={rd.color.paper} />
              </TouchableOpacity>
              <Text style={[rd.type.fact, { marginTop: 12, lineHeight: 20 }]}>
                {isTop
                  ? 'Plans are managed on the web. Changes there appear here the next time you open the app.'
                  : 'Plans are chosen on the web. Whatever you pick there appears here the next time you open the app.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: GUTTER, paddingHorizontal: 16, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  usage: { paddingVertical: 14 },
  rule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  usageLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 2, backgroundColor: rd.color.mist, marginTop: 10, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2, backgroundColor: rd.color.steel },
  toggle: {
    flexDirection: 'row', alignSelf: 'flex-start', marginHorizontal: GUTTER, marginTop: 28, marginBottom: 14,
    borderWidth: 1, borderColor: rd.color.mist, borderRadius: rd.radius.md, overflow: 'hidden', backgroundColor: rd.color.paper,
  },
  toggleBtn: { minHeight: rd.minTarget, paddingHorizontal: 18, justifyContent: 'center' },
  toggleOn: { backgroundColor: rd.color.navy },
  plan: {
    marginHorizontal: GUTTER, marginBottom: 12, padding: 16, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  planCurrent: { borderColor: rd.color.bronze },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  primary: {
    minHeight: 52, borderRadius: rd.radius.md, backgroundColor: rd.color.navy,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
  },
});
