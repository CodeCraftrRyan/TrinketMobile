import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type Item = {
  id: string | number;
  name: string | null;
  created_at: string | null;
  photo_url: string | null;
  location: string | null;
  people: string[] | null;
  category_id: string | null;
};

const longDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const shortDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function EventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<any>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [oldestFirst, setOldestFirst] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setLoading(false); return; }

      const [{ data: ev, error: evErr }, cats, favRows] = await Promise.all([
        supabase.from('events')
          .select('id,name,description,cover_photo_url,event_date,start_date,end_date,people_list,created_at')
          .eq('id', id).maybeSingle(),
        supabase.from('categories').select('id,name'),
        supabase.from('user_favorites').select('item_id').eq('user_id', user.id),
      ]);
      if (evErr) throw evErr;
      setEvent(ev ?? null);

      if (!cats.error) {
        const map: Record<string, string> = {};
        (cats.data ?? []).forEach((r: any) => { if (r?.id) map[String(r.id)] = r.name ?? ''; });
        setCategoryNames(map);
      }
      setFavourites(new Set((favRows.data ?? []).map((r: any) => String(r.item_id))));

      // The event's own photograph. Legacy rows hold a public URL; newer ones a path.
      const raw = ev?.cover_photo_url ?? null;
      if (raw) {
        if (raw.startsWith('http')) setCover(raw);
        else {
          const { data: signed } = await supabase.storage
            .from(PHOTO_BUCKET).createSignedUrl(raw, 60 * 60);
          setCover(signed?.signedUrl ?? null);
        }
      }

      // The objects filed under this event.
      const { data: rows, error: rowsErr } = await supabase
        .from('items')
        .select('id,name,created_at,photo_url,location,people,category_id')
        .eq('user_id', user.id)
        .eq('event_id', id)
        .order('created_at', { ascending: true });
      if (rowsErr) throw rowsErr;
      const list = (rows ?? []) as Item[];
      setItems(list);

      const paths: Record<string, string> = {};
      for (const row of list) {
        let path = row.photo_url ?? null;
        if (!path) {
          const { data: p } = await supabase
            .from('item_photos').select('storage_path')
            .eq('item_id', row.id)
            .order('sort_order', { ascending: true }).limit(1).maybeSingle();
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
        entries.forEach(([itemId], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) out[itemId] = url;
        });
        setCovers(out);
      }
    } catch (e: any) {
      console.warn('Event load failed', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const ordered = oldestFirst ? items : [...items].reverse();

  const subtitleFor = (row: Item) => [
    row.category_id ? categoryNames[String(row.category_id)] : null,
    Array.isArray(row.people) && row.people.length ? `from ${row.people.join(', ')}` : null,
    row.location,
  ].filter(Boolean).join(' · ');

  const when = longDate(event?.start_date ?? event?.event_date ?? event?.created_at);
  const named: string[] = Array.isArray(event?.people_list) ? event.people_list : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
              <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Events</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75, marginTop: 22 }}>
            Event · {items.length} {items.length === 1 ? 'object' : 'objects'}
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 6 }}>
            {event?.name ?? 'Event'}
          </Text>
          {(event?.description || when) && (
            <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10, lineHeight: 23 }}>
              {event?.description ? `${event.description} ` : ''}
              {when ? `${when}.` : ''}
            </Text>
          )}
          {named.length > 0 && (
            <Text style={{ color: c.accent, fontSize: 15, marginTop: 8 }}>
              With {named.join(', ')}
            </Text>
          )}
        </View>

        {/* The event's photograph */}
        {cover && (
          <Image source={{ uri: cover }}
            style={{ width: '100%', height: 232, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
        )}

        {/* Objects from this day */}
        <View style={{
          flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 26, paddingBottom: 12,
        }}>
          <Text style={{ ...tokens.type.label, color: c.inkLabel }}>From this day</Text>
          {items.length > 1 && (
            <TouchableOpacity onPress={() => setOldestFirst((v) => !v)}>
              <Text style={{ color: c.inkLabel, fontSize: 15 }}>
                {oldestFirst ? 'Oldest first' : 'Newest first'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20 }} />

        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the day
          </Text>
        ) : ordered.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 36, alignItems: 'flex-start' }}>
            <Text style={{ color: c.inkLabel, fontSize: 16, lineHeight: 23 }}>
              Nothing filed under this day yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { event: String(id) } } as any)}
              style={{
                marginTop: 18, paddingHorizontal: 22, paddingVertical: 15,
                borderRadius: tokens.radius.sm, backgroundColor: c.primary,
              }}>
              <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add an object</Text>
            </TouchableOpacity>
          </View>
        ) : ordered.map((row) => {
          const isFav = favourites.has(String(row.id));
          const sub = subtitleFor(row);
          return (
            <TouchableOpacity
              key={String(row.id)}
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(row.id) } } as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, marginHorizontal: 20,
                borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
              }}>
              {covers[String(row.id)] ? (
                <Image source={{ uri: covers[String(row.id)] }}
                  style={{ width: 54, height: 54, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
              ) : (
                <View style={{
                  width: 54, height: 54, backgroundColor: c.surfaceSoft,
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

        {!loading && ordered.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { event: String(id) } } as any)}
            style={{
              marginHorizontal: 20, marginTop: 24,
              paddingVertical: 15, alignItems: 'center',
              borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
              borderRadius: tokens.radius.sm, backgroundColor: c.card,
            }}>
            <Text style={{ ...tokens.type.ui, color: c.ink }}>Add an object</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}
