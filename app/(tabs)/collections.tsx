import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type Collection = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
  created_at: string | null;
  count: number;
};

const shortDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Collections() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [objectTotal, setObjectTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      const { data: rows, error } = await supabase
        .from('collections')
        .select('id,name,description,created_at,updated_at')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const list = (rows ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? 'Untitled collection'),
        description: r.description ?? null,
        updated_at: r.updated_at ?? null,
        created_at: r.created_at ?? null,
        count: 0,
      })) as Collection[];

      if (!list.length) {
        setCollections([]); setObjectTotal(0); setLoading(false); return;
      }

      // Object counts, and the first object in each for its cover.
      const { data: links } = await supabase
        .from('collection_items')
        .select('collection_id,item_id')
        .in('collection_id', list.map((x) => x.id));

      const byCollection: Record<string, string[]> = {};
      (links ?? []).forEach((r: any) => {
        if (r?.collection_id == null || r?.item_id == null) return;
        const k = String(r.collection_id);
        (byCollection[k] ||= []).push(String(r.item_id));
      });
      list.forEach((col) => { col.count = (byCollection[col.id] ?? []).length; });
      setCollections(list);
      setObjectTotal(new Set(Object.values(byCollection).flat()).size);

      // One cover per collection.
      const firstItemIds = list
        .map((col) => (byCollection[col.id] ?? [])[0])
        .filter(Boolean) as string[];
      if (!firstItemIds.length) { setLoading(false); return; }

      const { data: itemRows } = await supabase
        .from('items')
        .select('id,photo_url')
        .in('id', firstItemIds);
      const pathByItem: Record<string, string> = {};
      for (const row of itemRows ?? []) {
        let path = (row as any).photo_url ?? null;
        if (!path) {
          const { data: p } = await supabase
            .from('item_photos')
            .select('storage_path')
            .eq('item_id', (row as any).id)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();
          path = p?.storage_path ?? null;
        }
        if (path) pathByItem[String((row as any).id)] = path;
      }

      const pathByCollection: Record<string, string> = {};
      list.forEach((col) => {
        const firstItem = (byCollection[col.id] ?? [])[0];
        const path = firstItem ? pathByItem[String(firstItem)] : null;
        if (path) pathByCollection[col.id] = path;
      });

      const entries = Object.entries(pathByCollection);
      if (entries.length) {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
        const out: Record<string, string> = {};
        entries.forEach(([colId], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) out[colId] = url;
        });
        setCovers(out);
      }
    } catch (e) {
      console.warn('Collections load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function createCollection() {
    const name = newName.trim();
    if (!name) return;
    if (!userId) { Alert.alert('Not signed in', 'Please sign in to make a collection.'); return; }
    const { data, error } = await supabase
      .from('collections')
      .insert([{ name, user_id: userId }])
      .select('id')
      .single();
    if (error) {
      Alert.alert('Could not create the collection', error.message ?? 'Please try again.');
      return;
    }
    setNewName(''); setAdding(false);
    await load();
    if (data?.id) {
      router.push({ pathname: '/collection/[id]', params: { id: String(data.id) } } as any);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75 }}>
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'} · {objectTotal} {objectTotal === 1 ? 'object' : 'objects'}
            </Text>
            <TouchableOpacity onPress={() => setAdding((v) => !v)} hitSlop={10}>
              <Text style={{ ...tokens.type.ui, color: c.accent }}>{adding ? 'Cancel' : 'New'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ ...tokens.type.display, fontSize: 34, lineHeight: 40, color: c.bg, marginTop: 8 }}>
            Collections
          </Text>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 8, lineHeight: 23 }}>
            Objects grouped the way you&rsquo;d group them on a table.
          </Text>
        </View>

        {/* New collection */}
        {adding && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 4 }}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Souvenirs from our trips"
              placeholderTextColor={c.inkLight}
              autoFocus
              onSubmitEditing={createCollection}
              style={{
                flex: 1, backgroundColor: c.card,
                borderWidth: 1, borderColor: c.border,
                borderRadius: tokens.radius.md,
                paddingHorizontal: 14, minHeight: 48,
                ...tokens.type.ui, color: c.ink,
              }}
            />
            <TouchableOpacity
              onPress={createCollection}
              disabled={!newName.trim()}
              style={{
                paddingHorizontal: 20, justifyContent: 'center',
                borderRadius: tokens.radius.sm, backgroundColor: c.primary,
                opacity: newName.trim() ? 1 : 0.5,
              }}>
              <Text style={{ ...tokens.type.button, color: c.primaryText }}>Make</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20, marginTop: 20 }} />

        {/* Everything, filed or not */}
        {!loading && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/items')}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              paddingVertical: 16, marginHorizontal: 20,
              borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
            }}>
            <View style={{
              width: 58, height: 58, backgroundColor: c.surfaceSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="grid-outline" size={19} color={c.accentCool} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...tokens.type.nameSmall, color: c.ink }}>All objects</Text>
              <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 3 }}>
                Everything you have kept, filed or not
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
          </TouchableOpacity>
        )}

        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the shelves
          </Text>
        ) : collections.map((col) => (
          <TouchableOpacity
            key={col.id}
            onPress={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } } as any)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              paddingVertical: 16, marginHorizontal: 20,
              borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
            }}>
            {covers[col.id] ? (
              <Image source={{ uri: covers[col.id] }}
                style={{ width: 58, height: 58, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
            ) : (
              <View style={{
                width: 58, height: 58, backgroundColor: c.surfaceSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="albums-outline" size={19} color={c.inkLight} />
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...tokens.type.nameSmall, color: c.ink }} numberOfLines={1}>
                {col.name}
              </Text>
              {!!col.description && (
                <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 3 }} numberOfLines={1}>
                  {col.description}
                </Text>
              )}
              <Text style={{ color: c.inkFact, fontSize: 14, marginTop: 3 }}>
                {col.count} {col.count === 1 ? 'object' : 'objects'}
                {shortDate(col.updated_at ?? col.created_at)
                  ? ` · Updated ${shortDate(col.updated_at ?? col.created_at)}`
                  : ''}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
          </TouchableOpacity>
        ))}

        {/* Invitation */}
        {!loading && (
          <View style={{
            margin: 20, marginTop: 24, padding: 24,
            borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
            borderRadius: tokens.radius.md, alignItems: 'center',
          }}>
            <Text style={{
              ...tokens.type.ui, color: c.inkLabel,
              textAlign: 'center', lineHeight: 24,
            }}>
              A shelf, a room, a person, a trip — group it however you&rsquo;d tell it.
            </Text>
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={{
                marginTop: 18, paddingHorizontal: 22, paddingVertical: 14,
                borderWidth: 1, borderColor: c.border,
                borderRadius: tokens.radius.sm, backgroundColor: c.card,
              }}>
              <Text style={{ ...tokens.type.ui, color: c.ink }}>New collection</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
