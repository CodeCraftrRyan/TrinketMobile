import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type Row = {
  id: string | number;
  name: string | null;
  created_at: string | null;
  photo_url: string | null;
  location: string | null;
  people: string[] | null;
  category_id: string | null;
};

// "Haviland Family Archive" / "Ryan Haviland" -> "Haviland"
function familyNameFrom(meta: any): string {
  const raw = String(meta?.archive_name ?? '').trim();
  if (raw) {
    const trimmed = raw
      .replace(/\s*family\s+archive\s*$/i, '')
      .replace(/\s*archive\s*$/i, '')
      .replace(/(?:'|\u2019)s\s+collection\s*$/i, '')
      .trim();
    return trimmed || raw;
  }
  const full = String(meta?.full_name ?? '').trim();
  if (full) return full.split(/\s+/).pop() ?? '';
  return '';
}

function initialsFrom(meta: any, email?: string | null): string {
  const full = String(meta?.full_name ?? meta?.name ?? '').trim();
  if (full) {
    const p = full.split(/\s+/);
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  return email ? email[0].toUpperCase() : 'T';
}

const shortDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Home() {
  const router = useRouter();
  const [totalValue, setTotalValue] = useState<number>(0);
  const [valuedCount, setValuedCount] = useState<number>(0);
  const [familyName, setFamilyName] = useState('');
  const [initials, setInitials] = useState('T');
  const [counts, setCounts] = useState({ items: 0, collections: 0, events: 0 });
  const [recent, setRecent] = useState<Row[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [itemCap, setItemCap] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setLoading(false); return; }
      const meta = user.user_metadata ?? {};
      setFamilyName(familyNameFrom(meta));
      setInitials(initialsFrom(meta, user.email));

      const [it, co, ev, cats, vals] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('collections').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('categories').select('id,name'),
        supabase.from('items').select('estimated_value').eq('user_id', user.id).not('estimated_value', 'is', null),
      ]);
      {
        const rows = (vals?.data ?? []) as { estimated_value: number | null }[];
        const valued = rows.filter(r => typeof r.estimated_value === 'number' && r.estimated_value > 0);
        setValuedCount(valued.length);
        setTotalValue(valued.reduce((s, r) => s + (r.estimated_value as number), 0));
      }
      // What the plan holds, so the archive can say when it is nearly full.
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_id, subscription_plans ( max_items )')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();
        const joined: any = (sub as any)?.subscription_plans;
        const planRow = Array.isArray(joined) ? joined[0] : joined;
        if (planRow) {
          setItemCap(planRow.max_items ?? null);
        } else {
          const { data: free } = await supabase
            .from('subscription_plans')
            .select('max_items')
            .eq('is_free', true)
            .limit(1)
            .maybeSingle();
          setItemCap(free?.max_items ?? null);
        }
      } catch (e) {
        console.warn('Could not read the plan cap', e);
      }

      setCounts({
        items: it.count ?? 0,
        collections: co.count ?? 0,
        events: ev.count ?? 0,
      });
      if (!cats.error) {
        const map: Record<string, string> = {};
        (cats.data ?? []).forEach((r: any) => { if (r?.id) map[String(r.id)] = r.name ?? ''; });
        setCategoryNames(map);
      }

      const { data: rows, error: rowsErr } = await supabase
        .from('items')
        .select('id,name,created_at,photo_url,location,people,category_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      if (rowsErr) throw rowsErr;
      const list = (rows ?? []) as Row[];
      setRecent(list);

      // Favourites, so a kept object shows a star rather than a date.
      const { data: favRows } = await supabase
        .from('user_favorites')
        .select('item_id')
        .eq('user_id', user.id);
      setFavourites(new Set((favRows ?? []).map((r: any) => String(r.item_id))));

      // Cover photographs. items.photo_url holds a storage PATH — sign it.
      const paths: Record<string, string> = {};
      for (const row of list) {
        let path = row.photo_url ?? null;
        if (!path) {
          const { data: p } = await supabase
            .from('item_photos')
            .select('storage_path')
            .eq('item_id', row.id)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();
          path = p?.storage_path ?? null;
        }
        if (path) paths[String(row.id)] = path;
      }
      const entries = Object.entries(paths);
      if (entries.length) {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
        const out: Record<string, string> = {};
        entries.forEach(([id], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) out[id] = url;
        });
        setCovers(out);
      }
    } catch (e) {
      console.warn('Home load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const subtitleFor = (row: Row) => [
    row.category_id ? categoryNames[String(row.category_id)] : null,
    Array.isArray(row.people) && row.people.length ? `from ${row.people.join(', ')}` : null,
    row.location,
  ].filter(Boolean).join(' · ');

  const stats: [number, string, string][] = [
    [counts.items, counts.items === 1 ? 'OBJECT' : 'OBJECTS', '/(tabs)/items'],
    [counts.collections, counts.collections === 1 ? 'COLLECTION' : 'COLLECTIONS', '/(tabs)/collections'],
    [counts.events, counts.events === 1 ? 'EVENT' : 'EVENTS', '/(tabs)/events'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 0 }}>
          <View>
            <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.85, fontSize: 15, letterSpacing: 2.2 }}>
              Trinket
            </Text>
            <Text style={{
              ...tokens.type.display,
              fontSize: 34,
              lineHeight: 40,
              color: c.bg,
              marginTop: 6,
            }} numberOfLines={2}>
              {familyName ? `${familyName} Family Archive` : 'Your Family Archive'}
            </Text>
          </View>

          {/* Register totals */}
          <View style={{ flexDirection: 'row', marginTop: 26 }}>
            {stats.map(([value, label, href], i) => (
              <TouchableOpacity
                key={label}
                onPress={() => router.push(href as any)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`${value} ${label.toLowerCase()}`}
                style={{
                  flex: 1,
                  paddingVertical: 18,
                  paddingLeft: i ? 16 : 0,
                  borderLeftWidth: i ? 1 : 0,
                  borderLeftColor: 'rgba(216,230,238,0.18)',
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(216,230,238,0.18)',
                }}
              >
                <Text style={{ color: c.bg, fontSize: 26, fontWeight: '500' }}>{value}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Text style={{ ...tokens.type.label, letterSpacing: 0.4, color: c.inkGhost, opacity: 0.8 }}>
                    {label}
                  </Text>
                  <Ionicons name="chevron-forward" size={11} color={c.inkGhost} style={{ opacity: 0.6 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {totalValue > 0 && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/items', params: { missingValue: '1' } } as any)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="See objects without a value"
              style={{ paddingVertical: 18, borderTopWidth: 1, borderTopColor: 'rgba(216,230,238,0.18)' }}>
              <Text style={{ color: c.bg, fontSize: 26, fontWeight: '500' }}>
                ${Math.round(totalValue).toLocaleString()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ ...tokens.type.label, letterSpacing: 0.4, color: c.inkGhost, opacity: 0.8 }}>
                  {valuedCount === counts.items
                    ? 'ARCHIVE VALUE'
                    : `ARCHIVE VALUE ACROSS ${valuedCount} OF ${counts.items} OBJECTS`}
                </Text>
                <Ionicons name="chevron-forward" size={11} color={c.inkGhost} style={{ opacity: 0.6 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Find by photograph */}
        <TouchableOpacity
          onPress={() => router.push('/visual-search')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Find an object by photograph"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginHorizontal: 20,
            marginTop: 20,
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: c.accent,
            borderRadius: tokens.radius.lg,
            backgroundColor: c.card,
          }}>
          <View style={{
            width: 40, height: 40,
            borderRadius: tokens.radius.sm,
            backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="camera" size={20} color={c.primaryText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...tokens.type.nameSmall, color: c.ink }}>Search by Image</Text>
            <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 2 }}>
              Find an object in your archive by taking a photo of it, or selecting one from your camera roll.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
        </TouchableOpacity>

        {/* Recently added */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 26,
          paddingBottom: 12,
        }}>
          <Text style={{ ...tokens.type.label, color: c.inkLabel }}>Recently added</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/items')}>
            <Text style={{ color: c.accentDeep, fontSize: 15 }}>
              {counts.items > 0 ? `All ${counts.items} objects  →` : 'Newest first'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20 }} />

        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the register
          </Text>
        ) : recent.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 36 }}>
            <Text style={{ color: c.inkLabel, fontSize: 16, lineHeight: 23 }}>
              Nothing catalogued yet. Photograph one thing and the register begins.
            </Text>
          </View>
        ) : recent.map((row) => {
          const isFav = favourites.has(String(row.id));
          const sub = subtitleFor(row);
          return (
            <TouchableOpacity
              key={String(row.id)}
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(row.id) } } as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                marginHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: c.ruleSoft,
              }}
            >
              {covers[String(row.id)] ? (
                <Image
                  source={{ uri: covers[String(row.id)] }}
                  style={{ width: 54, height: 54, backgroundColor: c.surfaceSoft }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 54, height: 54,
                  backgroundColor: c.surfaceSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="image-outline" size={18} color={c.inkLight} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...tokens.type.nameSmall, color: c.ink }} numberOfLines={1}>
                  {row.name || 'Untitled object'}
                </Text>
                {!!sub && (
                  <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 3 }} numberOfLines={1}>
                    {sub}
                  </Text>
                )}
              </View>

              {isFav ? (
                <Ionicons name="star" size={17} color={c.accent} />
              ) : (
                <Text style={{ color: c.inkFact, fontSize: 14 }}>{shortDate(row.created_at)}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* How full the archive is — only once it is nearly so */}
        {!loading && itemCap !== null && counts.items >= Math.floor(itemCap * 0.8) && (
          <Text style={{
            color: c.inkFact, fontSize: 15, lineHeight: 22,
            paddingHorizontal: 20, paddingTop: 22,
          }}>
            {counts.items >= itemCap
              ? `Your archive holds ${itemCap} objects, and it is full.`
              : `${counts.items} of ${itemCap} objects kept.`}
          </Text>
        )}

        {/* Closing line */}
        {!loading && counts.items > 0 && (
          <Text style={{
            color: c.inkLabel,
            fontSize: 16,
            lineHeight: 23,
            paddingHorizontal: 20,
            paddingTop: 24,
          }}>
          </Text>
        )}

      </ScrollView>
    </View>
  );
}
