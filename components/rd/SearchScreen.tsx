// Redesign → Search (TRINKET_SPEC v5 M4, mirroring Trinket-Web's ArchiveSearch).
// One search field over the whole archive (name, story, place, people), and
// one-tap chips for the four people and three places with the most pieces.
// Results are hairline rows: photo, Garamond name, date · place, people.
// Find by photo stays one tap away. Read-only.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { pieceDateLabel } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';
import { coversFor, loadPieces, namesOf, norm, piecesPhrase, type Piece } from '../../lib/spine';
import { useLoader } from '../../lib/useLoader';
import { BackBar, Failed, GUTTER, Loading, pageStyles } from './Page';

type Chip = { kind: 'person' | 'place'; value: string };

async function loadAll() {
  const pieces = await loadPieces();
  return { pieces, covers: await coversFor(pieces) };
}

export default function SearchScreen() {
  const router = useRouter();
  // Same params the current list takes: ?location= (from a piece's place) and
  // ?missingValue=1 (from the home "no value yet" prompt).
  const { location, missingValue } = useLocalSearchParams<{ location?: string; missingValue?: string }>();
  const { data, failed, loading, reload } = useLoader(loadAll, []);
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(location ? String(location) : null);
  const [noValue, setNoValue] = useState(missingValue === '1');
  const [newestFirst, setNewestFirst] = useState(true);

  const pieces = data?.pieces ?? [];

  // The four people and three places with the most pieces.
  const chips = useMemo<Chip[]>(() => {
    const top = (keys: string[], n: number) => {
      const m = new Map<string, { label: string; count: number }>();
      keys.forEach((k) => {
        const key = norm(k);
        if (!key) return;
        const cur = m.get(key) ?? { label: k.trim(), count: 0 };
        cur.count += 1; m.set(key, cur);
      });
      return [...m.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, n).map((v) => v.label);
    };
    const people = top(pieces.flatMap((p) => namesOf(p.people)), 4);
    const places = top(pieces.map((p) => String(p.location ?? '')), 3);
    const list: Chip[] = [...people.map((v) => ({ kind: 'person' as const, value: v })), ...places.map((v) => ({ kind: 'place' as const, value: v }))];
    // A place arriving by link stays visible as a chip even if it isn't top three.
    if (place && !list.some((c) => c.kind === 'place' && norm(c.value) === norm(place))) list.push({ kind: 'place', value: place });
    return list;
  }, [pieces, place]);

  const results = useMemo(() => {
    const q = norm(query);
    const out = pieces.filter((p) => {
      const people = namesOf(p.people);
      if (person && !people.some((n) => norm(n) === norm(person))) return false;
      if (place && norm(p.location) !== norm(place)) return false;
      if (noValue && typeof p.estimated_value === 'number' && p.estimated_value > 0) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || norm(p.description).includes(q) || norm(p.location).includes(q)
        || people.some((n) => norm(n).includes(q));
    });
    return newestFirst ? out : [...out].reverse();
  }, [pieces, query, person, place, noValue, newestFirst]);

  const anyFilter = !!(person || place || noValue);
  const isOn = (c: Chip) => (c.kind === 'person' ? person === c.value : !!place && norm(place) === norm(c.value));
  const toggle = (c: Chip) => (c.kind === 'person' ? setPerson(isOn(c) ? null : c.value) : setPlace(isOn(c) ? null : c.value));
  const clearAll = () => { setPerson(null); setPlace(null); setNoValue(false); };

  const header = (
    <View>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={rd.color.steel} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your archive"
          placeholderTextColor={rd.color.steel}
          style={styles.input}
          autoFocus={!location && missingValue !== '1'}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
          accessibilityLabel="Search your archive"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close" size={18} color={rd.color.steel} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
        accessibilityRole="toolbar" accessibilityLabel="Quick filters">
        <ChipButton label="All" on={!anyFilter} onPress={clearAll} />
        {chips.map((c) => (
          <ChipButton key={`${c.kind}:${c.value}`} label={c.value} icon={c.kind === 'place' ? 'location-outline' : 'person-outline'}
            on={isOn(c)} onPress={() => toggle(c)} />
        ))}
        {noValue && <ChipButton label="No value yet" on onPress={() => setNoValue(false)} />}
      </ScrollView>

      <View style={styles.meta}>
        <Text style={rd.type.label} accessibilityLiveRegion="polite">
          {query || anyFilter ? `${piecesPhrase(results.length)} of ${pieces.length}` : piecesPhrase(pieces.length)}
        </Text>
        <TouchableOpacity onPress={() => setNewestFirst((v) => !v)} style={styles.sort} accessibilityRole="button"
          accessibilityLabel={newestFirst ? 'Newest first. Tap for oldest first' : 'Oldest first. Tap for newest first'}>
          <Ionicons name="swap-vertical" size={15} color={rd.color.steelDeep} />
          <Text style={[rd.type.fact, { color: rd.color.steelDeep }]}>{newestFirst ? 'Newest first' : 'Oldest first'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={pageStyles.page}>
      <BackBar label="Archive" right={
        <TouchableOpacity style={styles.photoBtn} onPress={() => router.push('/visual-search')} accessibilityRole="button" accessibilityLabel="Find by photo">
          <Ionicons name="camera-outline" size={18} color={rd.color.navy} />
          <Text style={rd.type.uiMedium}>Find by photo</Text>
        </TouchableOpacity>
      } />
      {loading && !data ? <Loading /> : failed && !data ? <Failed what="The archive" onRetry={reload} /> : (
        <FlatList
          data={results}
          keyExtractor={(p) => String(p.id)}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 48 }}
          renderItem={({ item, index }) => (
            <ResultRow piece={item} cover={data?.covers[String(item.id)]} first={index === 0} last={index === results.length - 1}
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(item.id) } } as any)} />
          )}
          ListEmptyComponent={
            <View style={styles.none}>
              <Text style={rd.type.name}>{pieces.length ? 'Nothing matches.' : 'Nothing kept yet.'}</Text>
              <Text style={[rd.type.body, { marginTop: 6 }]}>
                {pieces.length ? 'Try fewer words, or clear the filters.' : 'Add a piece and it will be searchable here.'}
              </Text>
              {pieces.length > 0 && (query || anyFilter) && (
                <TouchableOpacity style={styles.outline} onPress={() => { setQuery(''); clearAll(); }} accessibilityRole="button">
                  <Text style={rd.type.uiMedium}>Clear search and filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

function ChipButton({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {icon && <Ionicons name={icon} size={14} color={on ? rd.color.paper : rd.color.steel} />}
      <Text style={[rd.type.fact, { color: on ? rd.color.paper : rd.color.navy }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResultRow({ piece, cover, first, last, onPress }: { piece: Piece; cover?: string; first: boolean; last: boolean; onPress: () => void }) {
  const date = pieceDateLabel(piece);
  const people = namesOf(piece.people);
  const meta = [date, piece.location].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button"
      accessibilityLabel={[piece.name || 'Untitled piece', meta, people.length ? `from ${people.join(', ')}` : ''].filter(Boolean).join(', ')}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !first && styles.rowRule]}>
      <View style={styles.thumb}>
        {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="image-outline" size={18} color={rd.color.powder} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>{piece.name || 'Untitled piece'}</Text>
        {!!meta && <Text style={[rd.type.label, { fontSize: 11, marginTop: 3 }]} numberOfLines={1}>{meta}</Text>}
        {people.length > 0 && <Text style={[rd.type.fact, { marginTop: 3 }]} numberOfLines={1}>from {people.join(', ')}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: rd.minTarget, paddingHorizontal: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: GUTTER, marginTop: 8, paddingLeft: 14,
    minHeight: 52, backgroundColor: rd.color.paper, borderWidth: 1, borderColor: rd.color.mist, borderRadius: rd.radius.md,
  },
  // outlineWidth: the web preview's focus ring; iOS draws none.
  input: { ...rd.type.ui, flex: 1, minHeight: 50, ...({ outlineWidth: 0 } as object) },
  clear: { width: rd.minTarget, height: rd.minTarget, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, maxWidth: 220,
    borderWidth: 1, borderColor: rd.color.mist, borderRadius: rd.radius.sm, backgroundColor: rd.color.paper,
  },
  chipOn: { backgroundColor: rd.color.navy, borderColor: rd.color.navy },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, marginBottom: 10 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: rd.minTarget, paddingLeft: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: rd.color.paper, borderLeftWidth: rd.hairline, borderRightWidth: rd.hairline, borderColor: rd.color.mist, minHeight: 80,
  },
  rowFirst: { borderTopWidth: rd.hairline, borderTopLeftRadius: rd.radius.lg, borderTopRightRadius: rd.radius.lg },
  rowLast: { borderBottomWidth: rd.hairline, borderBottomLeftRadius: rd.radius.lg, borderBottomRightRadius: rd.radius.lg },
  rowRule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  thumb: {
    width: 56, height: 56, borderRadius: rd.radius.sm, overflow: 'hidden', backgroundColor: rd.color.ice,
    borderWidth: rd.hairline, borderColor: rd.color.mist, alignItems: 'center', justifyContent: 'center',
  },
  name: { ...rd.type.name, fontSize: 19, lineHeight: 23 },
  none: {
    marginHorizontal: GUTTER, padding: 20, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  outline: {
    marginTop: 16, minHeight: rd.minTarget, alignSelf: 'flex-start', paddingHorizontal: 16, borderRadius: rd.radius.md,
    borderWidth: rd.hairline, borderColor: rd.color.mist, alignItems: 'center', justifyContent: 'center',
  },
});
