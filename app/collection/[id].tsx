import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

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
  estimated_value: number | null;
};

const longDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const shortDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function CollectionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [collection, setCollection] = useState<any>(null);
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

      const [{ data: col, error: colErr }, cats, favRows] = await Promise.all([
        supabase.from('collections').select('id,name,description,created_at')
          .eq('id', id).maybeSingle(),
        supabase.from('categories').select('id,name'),
        supabase.from('user_favorites').select('item_id').eq('user_id', user.id),
      ]);
      if (colErr) throw colErr;
      setCollection(col ?? null);

      if (!cats.error) {
        const map: Record<string, string> = {};
        (cats.data ?? []).forEach((r: any) => { if (r?.id) map[String(r.id)] = r.name ?? ''; });
        setCategoryNames(map);
      }
      setFavourites(new Set((favRows.data ?? []).map((r: any) => String(r.item_id))));

      // The objects filed in this collection.
      const { data: links, error: linkErr } = await supabase
        .from('collection_items')
        .select('item_id')
        .eq('collection_id', id);
      if (linkErr) throw linkErr;
      const itemIds = (links ?? []).map((r: any) => r.item_id).filter(Boolean);

      if (!itemIds.length) { setItems([]); setLoading(false); return; }

      const { data: rows, error: rowsErr } = await supabase
        .from('items')
        .select('id,name,created_at,photo_url,location,people,category_id,estimated_value')
        .in('id', itemIds)
        .order('created_at', { ascending: true });
      if (rowsErr) throw rowsErr;
      const list = (rows ?? []) as Item[];
      setItems(list);

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
        entries.forEach(([itemId], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) out[itemId] = url;
        });
        setCovers(out);
      }
    } catch (e) {
      console.warn('Collection load failed', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ordered = oldestFirst ? items : [...items].reverse();
  const mosaic = items.map((i) => covers[String(i.id)]).filter(Boolean).slice(0, 3);

  const subtitleFor = (row: Item) => [
    row.category_id ? categoryNames[String(row.category_id)] : null,
    Array.isArray(row.people) && row.people.length ? `from ${row.people.join(', ')}` : null,
    row.location,
  ].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 72, paddingHorizontal: 20, paddingBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
              <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Collections</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/collection-edit', params: { id: String(id) } } as any)}
              hitSlop={10}>
              <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 24 }}>
            {collection?.name ?? 'Collection'}
          </Text>
          {(() => {
            const valued = items.filter(it => typeof it.estimated_value === 'number' && it.estimated_value > 0);
            if (!valued.length) return null;
            const total = valued.reduce((s, it) => s + (it.estimated_value as number), 0);
            const money = '$' + Math.round(total).toLocaleString();
            const note = valued.length === items.length
              ? `Collected value ${money}.`
              : `Collected value ${money}, across ${valued.length} of ${items.length} objects.`;
            return (
              <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10 }}>
                {note}
              </Text>
            );
          })()}
          {(collection?.description || collection?.created_at) && (
            <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10, lineHeight: 23 }}>
              {collection?.description ? `${collection.description} ` : ''}
              {collection?.created_at ? `Started ${longDate(collection.created_at)}.` : ''}
            </Text>
          )}
        </View>

        {/* Mosaic — the first three covers */}
        {mosaic.length > 0 && (
          <View style={{ flexDirection: 'row', height: 232, gap: 2 }}>
            <Image source={{ uri: mosaic[0] }}
              style={{ flex: 2, height: '100%', backgroundColor: c.surfaceSoft }} resizeMode="cover" />
            {mosaic.length > 1 && (
              <View style={{ flex: 1, gap: 2 }}>
                <Image source={{ uri: mosaic[1] }}
                  style={{ flex: 1, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
                {mosaic.length > 2 && (
                  <Image source={{ uri: mosaic[2] }}
                    style={{ flex: 1, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
                )}
              </View>
            )}
          </View>
        )}

        {/* In this collection */}
        <View style={{
          flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 26, paddingBottom: 12,
        }}>
          <Text style={{ ...tokens.type.label, color: c.inkLabel }}>In this collection</Text>
          <TouchableOpacity onPress={() => setOldestFirst((v) => !v)}>
            <Text style={{ color: c.inkLabel, fontSize: 15 }}>
              {oldestFirst ? 'Oldest first' : 'Newest first'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20 }} />

        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the collection
          </Text>
        ) : ordered.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 36, alignItems: 'flex-start' }}>
            <Text style={{ color: c.inkLabel, fontSize: 16, lineHeight: 23 }}>
              Nothing filed here yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { collection: String(id) } } as any)}
              style={{
                marginTop: 18,
                paddingHorizontal: 22, paddingVertical: 15,
                borderRadius: tokens.radius.sm,
                backgroundColor: c.primary,
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
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(row.id), from: 'collection', fromId: String(id) } } as any)}
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
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { collection: String(id) } } as any)}
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
