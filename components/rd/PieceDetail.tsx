// Redesign → an opened piece (TRINKET_SPEC v5, mockups #5–#7 adapted for a
// phone). The layout follows the piece's kind:
//   object     — the photograph, its story, then Came from / The moment /
//                Where it rests / Made / Collection
//   photograph — the print, matted; Caption, Date, People, From, Where it rests
//   letter     — the scan, then its Transcription and facts
// Every piece links out to its collection, moment and place: the spine.
//
// Reads only, except the favourite star, which uses the same user_favorites
// insert/delete as the current screen. Photos are signed on load, never stored.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addItemHref } from '../../lib/addItemRoute';
import { kindLabel, pieceDateLabel, pieceKind, piecePeople, signPiecePhotos, type PieceKind } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';
import { addRecentlyViewed } from '../../lib/recent';
import { supabase } from '../../lib/supabase';

type Link = { id: string; name: string } | null;

export default function PieceDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const plateWidth = width;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [kind, setKind] = useState<PieceKind>('object');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [people, setPeople] = useState<string[]>([]);
  const [collection, setCollection] = useState<Link>(null);
  const [moment, setMoment] = useState<Link>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [favourite, setFavourite] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!live) return;
        setItem(data ?? null);
        if (!data) return;
        setPeople(piecePeople(data));

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        setUserId(uid);

        // Everything else in parallel; each part fails quietly on its own.
        const [cat, urls, fav, colLink, ev, linked] = await Promise.all([
          data.category_id
            ? supabase.from('categories').select('name').eq('id', data.category_id).maybeSingle().then((r) => r.data?.name ?? null, () => null)
            : Promise.resolve(null),
          signPiecePhotos(data.id).catch(() => [] as string[]),
          uid
            ? supabase.from('user_favorites').select('item_id').eq('user_id', uid).eq('item_id', data.id).maybeSingle().then((r) => !!r.data, () => false)
            : Promise.resolve(false),
          supabase.from('collection_items').select('collection_id').eq('item_id', data.id).limit(1).then((r) => (r.data ?? [])[0]?.collection_id ?? null, () => null),
          data.event_id
            ? supabase.from('events').select('id,name').eq('id', data.event_id).maybeSingle().then((r) => r.data ?? null, () => null)
            : Promise.resolve(null),
          linkedPeople(data.id),
        ]);
        if (!live) return;
        setKind(pieceKind(cat));
        setPhotos(urls);
        setPhotoIndex(0);
        setFavourite(fav);
        setMoment(ev ? { id: String(ev.id), name: String(ev.name ?? 'A moment') } : null);
        if (linked.length) setPeople((prev) => Array.from(new Set([...prev, ...linked])));
        if (colLink) {
          const { data: col } = await supabase.from('collections').select('id,name').eq('id', colLink).maybeSingle();
          if (live) setCollection(col ? { id: String(col.id), name: String(col.name ?? 'Collection') } : null);
        } else {
          setCollection(null);
        }
        addRecentlyViewed(String(data.id)).catch(() => {});
      } catch (e) {
        console.warn('Piece load failed', e);
        if (live) setItem(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [id]));

  async function toggleFavourite() {
    if (!userId || !item?.id) return;
    const next = !favourite;
    setFavourite(next);
    try {
      const { error } = next
        ? await supabase.from('user_favorites').insert([{ user_id: userId, item_id: item.id }])
        : await supabase.from('user_favorites').delete().eq('user_id', userId).eq('item_id', item.id);
      if (error) throw error;
    } catch (e) {
      console.warn('Favourite change failed', e);
      setFavourite(!next);
    }
  }

  const share = () => {
    const lines = [item?.name, item?.description].filter(Boolean);
    Share.share({ message: lines.join('\n\n') }).catch(() => {});
  };

  const edit = () => router.push(addItemHref({ id: String(item.id) }));
  const goCollection = () => collection && router.push({ pathname: '/collection/[id]', params: { id: collection.id } } as any);
  const goMoment = () => moment && router.push({ pathname: '/events-detail', params: { id: moment.id } } as any);
  const goPlace = () => item?.location && router.push({ pathname: '/place', params: { name: item.location } } as any);
  // One person links to their page; several open People.
  const goPeople = () => people.length === 1
    ? router.push({ pathname: '/person', params: { name: people[0] } } as any)
    : router.push('/people');

  if (loading) {
    return <View style={[styles.page, styles.center]}><ActivityIndicator color={rd.color.steel} /></View>;
  }
  if (!item) {
    return (
      <View style={[styles.page, styles.center, { padding: 24 }]}>
        <Text style={rd.type.name}>This piece couldn’t be found.</Text>
        <TouchableOpacity onPress={onBack} style={styles.textBtn} accessibilityRole="button">
          <Text style={[rd.type.uiMedium, { color: rd.color.steelDeep }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const name = item.name || 'Untitled piece';
  const date = pieceDateLabel(item);
  const peopleLine = people.length ? people.join(', ') : null;

  const onSwipe = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / plateWidth);
    if (i !== photoIndex) setPhotoIndex(i);
  };

  const matted = kind === 'photograph' || kind === 'letter';
  const plateH = kind === 'letter' ? Math.round(plateWidth * 1.15) : plateWidth;

  let facts: [string, string | null, (() => void) | null][];
  let lead: React.ReactNode;
  if (kind === 'letter') {
    lead = (
      <>
        <Text style={styles.sideTitle}>Transcription</Text>
        {/* TODO(schema): no transcription field yet — the description stands in. */}
        {item.description
          ? <Text style={styles.transcription}>{item.description}</Text>
          : <Missing text="No transcription yet." action="Add the words" onPress={edit} />}
      </>
    );
    // TODO(schema): "Written by" and "From" need their own fields.
    facts = [['People', peopleLine, people.length ? goPeople : null], ['Date', date, null], ['Collection', collection?.name ?? null, collection ? goCollection : null]];
  } else if (kind === 'photograph') {
    lead = null;
    facts = [
      ['Caption', item.description || null, null],
      ['Date', date, null],
      ['People', peopleLine, people.length ? goPeople : null],
      ['From', collection?.name ?? null, collection ? goCollection : null],
      ['Where it rests', item.location || null, item.location ? goPlace : null],
    ];
  } else {
    lead = item.description
      ? <Text style={styles.story}>{item.description}</Text>
      : <Missing text="Nothing written down yet." action="Add what you remember" onPress={edit} />;
    facts = [
      ['Came from', peopleLine, people.length ? goPeople : null],
      ['The moment', moment?.name ?? null, moment ? goMoment : null],
      ['Where it rests', item.location || null, item.location ? goPlace : null],
      ['Made', date, null],
      ['Collection', collection?.name ?? null, collection ? goCollection : null],
    ];
  }

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={rd.color.navy} />
          <Text style={rd.type.ui} numberOfLines={1}>Archive</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={toggleFavourite} style={styles.iconBtn} accessibilityRole="button"
            accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'} accessibilityState={{ selected: favourite }}>
            <Ionicons name={favourite ? 'star' : 'star-outline'} size={21} color={favourite ? rd.color.bronze : rd.color.steel} />
          </TouchableOpacity>
          <TouchableOpacity onPress={share} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Share">
            <Ionicons name="share-outline" size={21} color={rd.color.steel} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.plateWrap, matted && styles.matWrap]}>
          {photos.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSwipe} scrollEventThrottle={16}>
              {photos.map((uri, i) => (
                <View key={i} style={{ width: plateWidth, height: plateH, padding: matted ? 28 : 0 }}>
                  <View style={[styles.photoFrame, matted && styles.mat]}>
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={matted ? 'contain' : 'cover'}
                      accessibilityLabel={`${name}, photograph ${i + 1} of ${photos.length}`}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.noPhoto, { height: plateWidth * 0.6 }]}>
              <Ionicons name="image-outline" size={30} color={rd.color.powder} />
            </View>
          )}
        </View>
        {photos.length > 1 && (
          <Text style={[rd.type.label, styles.pager]} accessibilityLiveRegion="polite">
            {photoIndex + 1} of {photos.length}
          </Text>
        )}

        <View style={styles.body}>
          <Text style={rd.type.label}>{kindLabel(kind)}{date ? ` · ${date}` : ''}</Text>
          <Text style={styles.title} accessibilityRole="header">{name}</Text>

          {lead ? <View style={{ marginTop: 16 }}>{lead}</View> : null}

          <View style={styles.facts}>
            {facts.map(([label, value, onPress], i) => (
              <Fact key={label} label={label} value={value} onPress={onPress} first={i === 0} />
            ))}
          </View>

          <View style={{ marginTop: 28, gap: 10 }}>
            <TouchableOpacity style={styles.primary} onPress={edit} accessibilityRole="button">
              <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>Edit details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// People joined through item_people (the current screen's source). Merged
// with the item's own list so no name is lost either way.
async function linkedPeople(itemId: any): Promise<string[]> {
  try {
    const { data: links } = await supabase.from('item_people').select('person_id').eq('item_id', itemId);
    const ids = (links ?? []).map((r: any) => r.person_id).filter((v: any) => v != null);
    if (!ids.length) return [];
    const { data: rows } = await supabase.from('people').select('id,name').in('id', ids);
    return (rows ?? []).map((r: any) => r?.name).filter(Boolean).map(String);
  } catch {
    return [];
  }
}

// A facts row. A missing value says so instead of vanishing, so you can see
// what the record still lacks. Linked values open their collection/moment/place.
function Fact({ label, value, onPress, first }: { label: string; value: string | null; onPress: (() => void) | null; first: boolean }) {
  const inner = (
    <>
      <Text style={[rd.type.label, { width: 116 }]}>{label}</Text>
      <Text style={[styles.factValue, !value && { color: rd.color.steel }, onPress && styles.link]}>
        {value || 'Not recorded'}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={rd.color.steel} /> : null}
    </>
  );
  const style = [styles.fact, !first && styles.factRule];
  return onPress
    ? <TouchableOpacity style={style} onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label}: ${value}`}>{inner}</TouchableOpacity>
    : <View style={style} accessible accessibilityLabel={`${label}: ${value || 'not recorded'}`}>{inner}</View>;
}

function Missing({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <Text style={[rd.type.body, { color: rd.color.steel }]}>
      {text}{' '}
      <Text onPress={onPress} style={styles.link} accessibilityRole="link">{action}</Text>.
    </Text>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: rd.minTarget, paddingRight: 8, flexShrink: 1 },
  iconBtn: { width: rd.minTarget, height: rd.minTarget, alignItems: 'center', justifyContent: 'center' },
  textBtn: { minHeight: rd.minTarget, justifyContent: 'center', marginTop: 8 },
  plateWrap: { backgroundColor: rd.color.ice, borderTopWidth: rd.hairline, borderBottomWidth: rd.hairline, borderColor: rd.color.mist },
  matWrap: { backgroundColor: rd.color.frost },
  photoFrame: { flex: 1, overflow: 'hidden' },
  mat: { backgroundColor: rd.color.paper, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.sm, padding: 14 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  pager: { textAlign: 'center', marginTop: 10 },
  body: { paddingHorizontal: 20, paddingTop: 22 },
  title: { ...rd.type.title, marginTop: 6 },
  sideTitle: { ...rd.type.name, marginBottom: 8 },
  story: { ...rd.type.body, fontSize: 17, lineHeight: 27 },
  transcription: { ...rd.type.body, fontFamily: rd.font.display, fontSize: 19, lineHeight: 28 },
  facts: {
    marginTop: 24, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg, paddingHorizontal: 16,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 12 },
  factRule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  factValue: { ...rd.type.ui, flex: 1 },
  link: { color: rd.color.steelDeep, textDecorationLine: 'underline' },
  primary: {
    minHeight: rd.minTarget, borderRadius: rd.radius.md, backgroundColor: rd.color.navy,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
  },
});
