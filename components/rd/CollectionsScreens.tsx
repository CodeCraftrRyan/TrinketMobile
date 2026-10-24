// Redesign → Collections (mockups #8 and #9, adapted for a phone).
//   CollectionsGrid — collage-tiled cards (up to four covers), each with a count;
//                     "New collection" uses the same insert as the current screen.
//   CollectionView  — the collection's name, count, note, and a grid of its pieces.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { addItemHref } from '../../lib/addItemRoute';
import { rd } from '../../lib/rdTokens';
import { loadCollection, loadCollections, piecesPhrase, type CollectionCard } from '../../lib/spine';
import { supabase } from '../../lib/supabase';
import { useLoader } from '../../lib/useLoader';
import { BackBar, Empty, Failed, GUTTER, HeadButton, Loading, PageHead, PieceGrid, pageStyles } from './Page';

export function CollectionsGrid() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = Math.floor((width - GUTTER * 2 - 14) / 2);
  const { data, failed, loading, reload } = useLoader(loadCollections, []);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Same write as the current Collections screen: one row in `collections`.
  async function create() {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error('Please sign in to make a collection.');
      const { data: row, error } = await supabase.from('collections').insert([{ name, user_id: u.user.id }]).select('id').single();
      if (error) throw error;
      setNewName(''); setAdding(false);
      reload();
      if (row?.id) router.push({ pathname: '/collection/[id]', params: { id: String(row.id) } } as any);
    } catch (e: any) {
      Alert.alert('Could not make the collection', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const list = data ?? [];
  return (
    <ScrollView style={pageStyles.page} contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={rd.color.steel} />}>
      <PageHead top kicker={list.length ? `${list.length} ${list.length === 1 ? 'collection' : 'collections'}` : undefined}
        title="Collections" lead="Pieces that belong together."
        action={<HeadButton label="New" icon="add" onPress={() => setAdding((v) => !v)} />} />

      {adding && (
        <View style={styles.newBox}>
          <Text style={rd.type.label}>Name the collection</Text>
          <TextInput value={newName} onChangeText={setNewName} placeholder="Grandmother’s jewellery" placeholderTextColor={rd.color.steel}
            style={styles.input} autoFocus returnKeyType="done" onSubmitEditing={create} accessibilityLabel="Collection name" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[styles.primary, (!newName.trim() || saving) && { opacity: 0.5 }]} onPress={create}
              disabled={!newName.trim() || saving} accessibilityRole="button">
              <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>{saving ? 'Making…' : 'Make it'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quiet} onPress={() => { setAdding(false); setNewName(''); }} accessibilityRole="button">
              <Text style={rd.type.uiMedium}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading && !data ? <Loading /> : failed && !data ? <Failed what="Your collections" onRetry={reload} /> : list.length === 0 ? (
        <Empty text="No collections yet. Gather pieces that belong together: everything from one person, one house, one summer."
          action={adding ? undefined : 'Make your first collection'} onPress={() => setAdding(true)} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, rowGap: 22, paddingHorizontal: GUTTER }}>
          {list.map((c) => <Collage key={c.id} col={c} width={w}
            onPress={() => router.push({ pathname: '/collection/[id]', params: { id: c.id } } as any)} />)}
        </View>
      )}
    </ScrollView>
  );
}

/** A collection card: a 2×2 collage of its first covers, name, count. */
function Collage({ col, width, onPress }: { col: CollectionCard; width: number; onPress: () => void }) {
  const tiles = [0, 1, 2, 3].map((i) => col.covers[i] ?? null);
  const half = (width - 3) / 2;
  return (
    <TouchableOpacity style={{ width }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${col.name}, ${piecesPhrase(col.count)}`}>
      <View style={[styles.collage, { width, height: width }]}>
        {col.count === 0 ? (
          <Ionicons name="albums-outline" size={26} color={rd.color.powder} />
        ) : col.covers.filter(Boolean).length <= 1 ? (
          col.covers[0] ? <Image source={{ uri: col.covers[0] }} style={{ width: '100%', height: '100%' }} />
            : <Ionicons name="image-outline" size={26} color={rd.color.powder} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
            {tiles.map((u, i) => (
              <View key={i} style={{ width: half, height: half, backgroundColor: rd.color.ice }}>
                {u && <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />}
              </View>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{col.name}</Text>
      <Text style={[rd.type.label, { fontSize: 11, marginTop: 4 }]}>{piecesPhrase(col.count)}</Text>
    </TouchableOpacity>
  );
}

export function CollectionView({ id }: { id: string }) {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(() => loadCollection(id), [id]);
  return (
    <View style={pageStyles.page}>
      <BackBar label="Collections" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/collections' as any)}
        right={data ? (
          <TouchableOpacity style={styles.barBtn} onPress={() => router.push({ pathname: '/collection-edit', params: { id } } as any)}
            accessibilityRole="button" accessibilityLabel="Edit collection">
            <Text style={[rd.type.uiMedium, { color: rd.color.steelDeep }]}>Edit</Text>
          </TouchableOpacity>
        ) : null} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="This collection" onRetry={reload} /> : !data ? (
          <Empty text="This collection couldn’t be found." />
        ) : (
          <>
            <PageHead kicker={`Collection · ${piecesPhrase(data.pieces.length)}`} title={data.name} lead={data.description}
              action={<HeadButton label="Add" icon="add" onPress={() => router.push(addItemHref({ collection: id }))} />} />
            {data.pieces.length === 0
              ? <Empty text="Nothing here yet. Add a piece, or file one from its page." action="Add a piece"
                  onPress={() => router.push(addItemHref({ collection: id }))} />
              : <PieceGrid pieces={data.pieces} covers={data.covers} from={{ kind: 'collection', id }} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  collage: {
    backgroundColor: rd.color.ice, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.md,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  name: { ...rd.type.name, fontSize: 19, lineHeight: 23, marginTop: 10 },
  newBox: {
    marginHorizontal: GUTTER, marginBottom: 18, padding: 16, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  input: {
    ...rd.type.ui, marginTop: 8, minHeight: rd.minTarget, paddingHorizontal: 12,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.md, backgroundColor: rd.color.frost,
  },
  primary: { minHeight: rd.minTarget, paddingHorizontal: 18, borderRadius: rd.radius.md, backgroundColor: rd.color.navy, alignItems: 'center', justifyContent: 'center' },
  quiet: { minHeight: rd.minTarget, paddingHorizontal: 18, borderRadius: rd.radius.md, borderWidth: rd.hairline, borderColor: rd.color.mist, alignItems: 'center', justifyContent: 'center' },
  barBtn: { minHeight: rd.minTarget, minWidth: rd.minTarget, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'flex-end' },
});
