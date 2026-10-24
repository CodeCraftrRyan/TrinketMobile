// Redesign → the Archive tab (TRINKET_SPEC v5, mockup #5 adapted for a phone).
// A quiet header (title, piece count, plan meter, search), then a two-column
// grid of pieces: photograph on a paper plate, Garamond name, a mono date.
// An empty archive is written, never blank: "Begin with one thing."
//
// Read-only. Photos are signed when the screen loads and live only in state.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addItemHref } from '../../lib/addItemRoute';
import { signCovers } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';
import { supabase } from '../../lib/supabase';
import PieceCard, { type PieceRow } from './PieceCard';

const PAGE = 40;
const GUTTER = 16;
const GAP = 14;

// The archive's own name as the person set it; "Your archive" when unset.
function archiveTitle(meta: any): string {
  const raw = String(meta?.archive_name ?? '').trim();
  return raw || 'Your archive';
}

export default function ArchiveHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - GUTTER * 2 - GAP) / 2);

  const [title, setTitle] = useState('Your archive');
  const [rows, setRows] = useState<PieceRow[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [cap, setCap] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchPage = useCallback(async (uid: string, from: number) => {
    const { data, error, count } = await supabase
      .from('items')
      .select('id,name,photo_url,year,year_manufactured,memory_date,created_at', { count: 'exact' })
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const list = (data ?? []) as PieceRow[];
    const signed = await signCovers(list).catch(() => ({} as Record<string, string>));
    return { list, signed, count: count ?? list.length };
  }, []);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) return;
      setTitle(archiveTitle(user.user_metadata));
      const [{ list, signed, count }, planCap] = await Promise.all([
        fetchPage(user.id, 0),
        readItemCap(user.id),
      ]);
      setRows(list);
      setCovers(signed);
      setTotal(count);
      setCap(planCap);
    } catch (e) {
      console.warn('Archive load failed', e);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMore = async () => {
    if (loadingMore || rows.length >= total) return;
    setLoadingMore(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { list, signed } = await fetchPage(u.user.id, rows.length);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => String(r.id)));
        return [...prev, ...list.filter((r) => !seen.has(String(r.id)))];
      });
      setCovers((prev) => ({ ...prev, ...signed }));
    } catch (e) {
      console.warn('Archive page failed', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (row: PieceRow) =>
    router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(row.id) } } as any);

  const header = (
    <View style={[styles.head, { paddingTop: insets.top + 20 }]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={rd.type.label}>The archive</Text>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/visual-search')}
          accessibilityRole="button"
          accessibilityLabel="Find by photo"
        >
          <Ionicons name="camera-outline" size={22} color={rd.color.navy} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/(tabs)/items')}
          accessibilityRole="button"
          accessibilityLabel="Search the archive"
        >
          <Ionicons name="search-outline" size={22} color={rd.color.navy} />
        </TouchableOpacity>
      </View>
      {total > 0 && <Meter total={total} cap={cap} />}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator color={rd.color.steel} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.page}
      data={rows}
      key={cardWidth}               // re-lay out on rotation / split view
      numColumns={2}
      keyExtractor={(r) => String(r.id)}
      columnWrapperStyle={{ gap: GAP, paddingHorizontal: GUTTER }}
      contentContainerStyle={{ paddingBottom: 40, gap: 22 }}
      ListHeaderComponent={header}
      ListEmptyComponent={failed ? <LoadFailed onRetry={load} /> : <ArchiveEmpty onAdd={() => router.push(addItemHref())} />}
      renderItem={({ item }) => (
        <PieceCard row={item} coverUrl={covers[String(item.id)]} width={cardWidth} onPress={() => open(item)} />
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={rd.color.steel} style={{ marginTop: 8 }} /> : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={rd.color.steel} />}
    />
  );
}

/** The plan's item cap (null = unlimited), from the subscription, not metadata. */
async function readItemCap(uid: string): Promise<number | null> {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, subscription_plans ( max_items )')
      .eq('user_id', uid)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    const joined: any = (sub as any)?.subscription_plans;
    const plan = Array.isArray(joined) ? joined[0] : joined;
    if (plan) return plan.max_items ?? null;
    const { data: free } = await supabase
      .from('subscription_plans').select('max_items').eq('is_free', true).limit(1).maybeSingle();
    return free?.max_items ?? null;
  } catch {
    return null;
  }
}

/** "12 pieces" and, on a capped plan, a hairline meter: "12 of 50". */
function Meter({ total, cap }: { total: number; cap: number | null }) {
  const noun = total === 1 ? 'piece' : 'pieces';
  if (cap == null) return <Text style={styles.count}>{total} {noun}</Text>;
  const pct = Math.min(1, total / Math.max(cap, 1));
  return (
    <View style={{ marginTop: 14 }} accessible accessibilityLabel={`${total} of ${cap} pieces on your plan`}>
      <View style={styles.meterLine}>
        <Text style={styles.countInline}>{total} {noun}</Text>
        <Text style={rd.type.label}>{total} of {cap}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string }[] = [
  { icon: 'camera-outline', title: 'Photograph it' },
  { icon: 'document-text-outline', title: 'Tell the story' },
  { icon: 'archive-outline', title: 'Keep it somewhere' },
];

function ArchiveEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={rd.type.label}>A quiet place</Text>
      <Text style={[rd.type.title, { marginTop: 8 }]}>Begin with one thing.</Text>
      <Text style={[rd.type.lead, { marginTop: 10 }]}>
        Photograph it, tell us where it came from, and it will wait for you.
      </Text>
      <View style={{ marginTop: 24, gap: 14 }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <Ionicons name={s.icon} size={26} color={rd.color.bronzeDeep} />
            <Text style={rd.type.label}>{i + 1}</Text>
            <Text style={rd.type.ui}>{s.title}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.primary} onPress={onAdd} accessibilityRole="button">
        <Text style={styles.primaryText}>Add your first piece</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={rd.type.name}>The archive didn’t load.</Text>
      <Text style={[rd.type.body, { marginTop: 6 }]}>Check your connection and try again. Nothing has been lost.</Text>
      <TouchableOpacity style={styles.secondary} onPress={onRetry} accessibilityRole="button">
        <Text style={rd.type.uiMedium}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { paddingHorizontal: GUTTER, paddingBottom: 6 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  title: { ...rd.type.title, marginTop: 6 },
  iconBtn: { width: rd.minTarget, height: rd.minTarget, alignItems: 'center', justifyContent: 'center' },
  count: { ...rd.type.fact, marginTop: 10 },
  countInline: { ...rd.type.fact },
  meterLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 2, backgroundColor: rd.color.mist, marginTop: 8, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2, backgroundColor: rd.color.steel },
  empty: {
    marginHorizontal: GUTTER, marginTop: 12, padding: 24,
    backgroundColor: rd.color.paper, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primary: {
    marginTop: 28, minHeight: rd.minTarget, borderRadius: rd.radius.md, backgroundColor: rd.color.navy,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
  },
  primaryText: { ...rd.type.uiMedium, color: rd.color.paper },
  secondary: {
    marginTop: 18, minHeight: rd.minTarget, borderRadius: rd.radius.md, borderWidth: rd.hairline, borderColor: rd.color.mist,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 18,
  },
});
