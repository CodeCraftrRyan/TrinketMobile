import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { tokens } from '../../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type Item = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  category_id?: number | string | null;
  location?: string | null;
  photo_url?: string | null;
  created_at?: string | null;
};

const shortDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Items() {
  const router = useRouter();
  const { location: locationParam, missingValue } = useLocalSearchParams<{ location?: string; missingValue?: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [categoryLookup, setCategoryLookup] = useState<Record<string, string>>({});
  const [peopleByItemId, setPeopleByItemId] = useState<Record<string, string[]>>({});
  const [peopleOptions, setPeopleOptions] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [showPeople, setShowPeople] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => { if (locationParam) setSearchQuery(String(locationParam)); }, [locationParam]);
  const [newestFirst, setNewestFirst] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- people names per object, for the subtitle and the filter ---
  const loadItemPeople = useCallback(async (itemIds: string[], userId: string) => {
    try {
      if (!itemIds.length) { setPeopleByItemId({}); return; }
      const { data: peopleRows } = await supabase
        .from('people').select('id,name').eq('user_id', userId);
      const nameById: Record<string, string> = {};
      (peopleRows ?? []).forEach((row: any) => {
        if (row?.id != null && row?.name) nameById[String(row.id)] = String(row.name);
      });
      setPeopleOptions(Array.from(new Set(Object.values(nameById))).sort());

      const { data: linkRows } = await supabase
        .from('item_people').select('item_id,person_id').in('item_id', itemIds);
      const map: Record<string, string[]> = {};
      (linkRows ?? []).forEach((row: any) => {
        if (row?.item_id == null || row?.person_id == null) return;
        const name = nameById[String(row.person_id)];
        if (!name) return;
        const k = String(row.item_id);
        if (!map[k]) map[k] = [];
        if (!map[k].includes(name)) map[k].push(name);
      });
      setPeopleByItemId(map);
    } catch (e) {
      console.warn('Failed to load item people', e);
      setPeopleByItemId({});
    }
  }, []);

  // --- cover photographs. items.photo_url holds a PATH, so it must be signed ---
  const loadCovers = useCallback(async (rows: Item[]) => {
    try {
      const paths: Record<string, string> = {};
      const missing: string[] = [];
      for (const row of rows) {
        if (row.photo_url) paths[String(row.id)] = row.photo_url;
        else missing.push(String(row.id));
      }
      if (missing.length) {
        const { data: photoRows } = await supabase
          .from('item_photos')
          .select('item_id,storage_path,sort_order')
          .in('item_id', missing)
          .order('sort_order', { ascending: true });
        (photoRows ?? []).forEach((r: any) => {
          const k = String(r.item_id);
          if (!paths[k] && r.storage_path) paths[k] = r.storage_path;
        });
      }
      const entries = Object.entries(paths);
      if (!entries.length) { setCovers({}); return; }
      const { data: signed } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
      const out: Record<string, string> = {};
      entries.forEach(([itemId], i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) out[itemId] = url;
      });
      setCovers(out);
    } catch (e) {
      console.warn('Failed to sign covers', e);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { setLoading(false); return; }

      const [{ data, error }, cats, favRows] = await Promise.all([
        supabase.from('items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id,name'),
        supabase.from('user_favorites').select('item_id').eq('user_id', userId),
      ]);
      if (error) throw error;

      const rows = (data ?? []) as Item[];
      setItems(rows);
      setFavourites(new Set((favRows.data ?? []).map((r: any) => String(r.item_id))));

      if (!cats.error) {
        const lookup: Record<string, string> = {};
        (cats.data ?? []).forEach((r: any) => {
          if (r?.id != null && r?.name) lookup[String(r.id)] = r.name;
        });
        setCategoryLookup(lookup);
      }

      await Promise.all([
        loadItemPeople(rows.map((r) => String(r.id)), userId),
        loadCovers(rows),
      ]);
    } catch (e) {
      console.warn('Failed to load objects', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadItemPeople, loadCovers]);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Keep the list live while it is open.
  useEffect(() => {
    const channel = supabase
      .channel('objects-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => load())
      .subscribe();
    const peopleChannel = supabase
      .channel('objects-people')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_people' }, () => load())
      .subscribe();
    return () => {
      try { channel.unsubscribe(); peopleChannel.unsubscribe(); } catch { /* ignore */ }
    };
  }, [load]);

  const normalize = (v?: string | null) => (v ?? '').trim().toLowerCase();
  const query = normalize(searchQuery);
  const chosen = selectedPeople.map(normalize);

  const filtered = items.filter((it) => {
    const people = peopleByItemId[String(it.id)] ?? [];
    const matchesPerson = chosen.length
      ? chosen.some((p) => people.some((n) => normalize(n) === p))
      : true;
    const matchesQuery = query
      ? normalize(it.name ?? it.title).includes(query)
        || normalize(it.description ?? it.notes).includes(query)
        || normalize(it.location).includes(query)
        || people.some((n) => normalize(n).includes(query))
      : true;
    const matchesValue = missingValue === '1'
      ? !(typeof (it as any).estimated_value === 'number' && (it as any).estimated_value > 0)
      : true;
    return matchesPerson && matchesQuery && matchesValue;
  });

  const ordered = newestFirst ? filtered : [...filtered].reverse();

  const subtitleFor = (it: Item) => {
    const people = peopleByItemId[String(it.id)] ?? [];
    return [
      it.category_id != null ? categoryLookup[String(it.category_id)] : null,
      people.length ? `from ${people.join(', ')}` : null,
      it.location,
    ].filter(Boolean).join(' · ');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 72, paddingHorizontal: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
              <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/visual-search')} hitSlop={10}
              accessibilityLabel="Find an object by photograph"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 7,
                paddingHorizontal: 14, paddingVertical: 9,
                borderWidth: 1, borderColor: c.accent,
                borderRadius: tokens.radius.sm,
              }}>
              <Ionicons name="camera-outline" size={17} color={c.accent} />
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accent }}>Find by photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75, marginTop: 22 }}>
            {items.length} {items.length === 1 ? 'object' : 'objects'} kept
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 34, lineHeight: 40, color: c.bg, marginTop: 6 }}>
            All objects
          </Text>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: c.border,
        }}>
          <Ionicons name="search-outline" size={18} color={c.inkLabel} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search names, people, places"
            placeholderTextColor={c.inkLight}
            style={{ flex: 1, ...tokens.type.ui, color: c.ink }}
            returnKeyType="search"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={c.inkLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Narrow by person */}
        <View style={{
          flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
        }}>
          <TouchableOpacity onPress={() => setShowPeople((v) => !v)}>
            <Text style={{ ...tokens.type.label, color: selectedPeople.length ? c.inkFact : c.inkLabel }}>
              {selectedPeople.length ? `From ${selectedPeople.join(', ')}` : 'Anyone'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNewestFirst((v) => !v)}>
            <Text style={{ color: c.inkLabel, fontSize: 15 }}>
              {newestFirst ? 'Newest first' : 'Oldest first'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPeople && (
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: 8,
            paddingHorizontal: 20, paddingBottom: 16,
          }}>
            <TouchableOpacity
              onPress={() => { setSelectedPeople([]); setShowPeople(false); }}
              style={{
                paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: 1, borderRadius: tokens.radius.md,
                borderColor: selectedPeople.length ? c.border : c.ink,
                backgroundColor: selectedPeople.length ? c.card : c.ink,
              }}>
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: selectedPeople.length ? c.ink : c.bg }}>
                Anyone
              </Text>
            </TouchableOpacity>
            {peopleOptions.map((person) => {
              const on = selectedPeople.includes(person);
              return (
                <TouchableOpacity
                  key={person}
                  onPress={() => setSelectedPeople((prev) =>
                    prev.includes(person) ? prev.filter((p) => p !== person) : [...prev, person])}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10,
                    borderWidth: 1, borderRadius: tokens.radius.md,
                    borderColor: on ? c.ink : c.border,
                    backgroundColor: on ? c.ink : c.card,
                  }}>
                  <Text style={{ ...tokens.type.ui, fontSize: 15, color: on ? c.bg : c.ink }}>{person}</Text>
                </TouchableOpacity>
              );
            })}
            {peopleOptions.length === 0 && (
              <Text style={{ color: c.inkLabel, fontSize: 15 }}>No people named yet.</Text>
            )}
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20 }} />

        {/* The register */}
        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the register
          </Text>
        ) : ordered.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 36, alignItems: 'flex-start' }}>
            <Text style={{ color: c.inkLabel, fontSize: 16, lineHeight: 23 }}>
              {items.length === 0
                ? 'Nothing catalogued yet. Photograph one thing and the register begins.'
                : 'Nothing here matches. Try a different name or person.'}
            </Text>
            {items.length === 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/add')}
                style={{
                  marginTop: 18, paddingHorizontal: 22, paddingVertical: 15,
                  borderRadius: tokens.radius.sm, backgroundColor: c.primary,
                }}>
                <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add the first object</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : ordered.map((it) => {
          const isFav = favourites.has(String(it.id));
          const sub = subtitleFor(it);
          return (
            <TouchableOpacity
              key={String(it.id)}
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(it.id) } } as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, marginHorizontal: 20,
                borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
              }}>
              {covers[String(it.id)] ? (
                <Image source={{ uri: covers[String(it.id)] }}
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
                  {it.name || it.title || 'Untitled object'}
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
                <Text style={{ color: c.inkFact, fontSize: 14 }}>{shortDate(it.created_at)}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {!loading && ordered.length > 0 && filtered.length !== items.length && (
          <Text style={{ color: c.inkLabel, fontSize: 15, paddingHorizontal: 20, paddingTop: 22 }}>
            Showing {filtered.length} of {items.length}.
          </Text>
        )}

      </ScrollView>
    </View>
  );
}
