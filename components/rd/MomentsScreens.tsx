// Redesign → Moments (mockups #11 and #12; iOS gets the vertical timeline).
//   MomentsTimeline — a vertical rail with decade markers; each moment is a
//                     card on the rail (date, name, a line of story, count).
//                     Undated moments gather at the end.
//   MomentView      — title, date, story, a row of the pieces tied to it, the
//                     people in it, and "Add a piece to this moment".
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addItemHref } from '../../lib/addItemRoute';
import { pieceDateLabel } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';
import { loadMoment, loadMoments, momentDateLabel, momentYear, piecesPhrase, type Moment } from '../../lib/spine';
import { useLoader } from '../../lib/useLoader';
import { BackBar, Empty, Failed, GUTTER, HeadButton, Loading, PageHead, pageStyles } from './Page';

type Row = Moment & { count: number };
type Entry = { kind: 'decade'; label: string } | { kind: 'moment'; ev: Row };

export function MomentsTimeline() {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(loadMoments, []);

  const entries = useMemo<Entry[]>(() => {
    const list = data ?? [];
    const dated = list.filter((e) => momentYear(e) !== null).sort((a, b) => momentYear(a)! - momentYear(b)!);
    const undated = list.filter((e) => momentYear(e) === null);
    const out: Entry[] = [];
    let decade: number | null = null;
    dated.forEach((ev) => {
      const d = Math.floor(momentYear(ev)! / 10) * 10;
      if (d !== decade) { decade = d; out.push({ kind: 'decade', label: `${d}s` }); }
      out.push({ kind: 'moment', ev });
    });
    if (undated.length) {
      out.push({ kind: 'decade', label: 'Undated' });
      undated.forEach((ev) => out.push({ kind: 'moment', ev }));
    }
    return out;
  }, [data]);

  const open = (ev: Row) => router.push({ pathname: '/events-detail', params: { id: String(ev.id) } } as any);
  const count = data?.length ?? 0;

  return (
    <ScrollView style={pageStyles.page} contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={rd.color.steel} />}>
      <PageHead top kicker={count ? `${count} ${count === 1 ? 'moment' : 'moments'}` : undefined} title="Moments"
        lead="The days your pieces remember." action={<HeadButton label="New" icon="add" onPress={() => router.push('/events-new')} />} />

      {loading && !data ? <Loading /> : failed && !data ? <Failed what="Your moments" onRetry={reload} /> : count === 0 ? (
        <Empty text="No moments yet. A wedding, a move, a summer by the sea: name the day, then tie pieces to it."
          action="Name a moment" onPress={() => router.push('/events-new')} />
      ) : (
        <View style={styles.rail}>
          <View style={styles.line} />
          {entries.map((e, i) => e.kind === 'decade' ? (
            <View key={`d-${e.label}-${i}`} style={styles.decadeRow} accessibilityRole="header">
              <View style={styles.decadeMark} />
              <Text style={[rd.type.label, { color: rd.color.navy }]}>{e.label}</Text>
            </View>
          ) : (
            <View key={String(e.ev.id)} style={styles.momentRow}>
              <View style={styles.dot} />
              <TouchableOpacity style={styles.card} onPress={() => open(e.ev)} accessibilityRole="button"
                accessibilityLabel={`${e.ev.name ?? 'A moment'}${momentDateLabel(e.ev) ? `, ${momentDateLabel(e.ev)}` : ''}, ${piecesPhrase(e.ev.count)}`}>
                {!!momentDateLabel(e.ev) && <Text style={[rd.type.label, { fontSize: 11 }]}>{momentDateLabel(e.ev)}</Text>}
                <Text style={styles.cardTitle}>{e.ev.name || 'A moment'}</Text>
                {!!e.ev.description && <Text style={[rd.type.fact, { marginTop: 4 }]} numberOfLines={2}>{e.ev.description}</Text>}
                <Text style={[rd.type.label, { fontSize: 11, marginTop: 10 }]}>{piecesPhrase(e.ev.count)}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export function MomentView({ id, onBack }: { id: string; onBack?: () => void }) {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(() => loadMoment(id), [id]);
  const back = onBack ?? (() => router.canGoBack() ? router.back() : router.replace('/(tabs)/events' as any));
  const add = () => router.push(addItemHref({ event: id }));

  return (
    <View style={pageStyles.page}>
      <BackBar label="Moments" onPress={back} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="This moment" onRetry={reload} /> : !data ? (
          <Empty text="This moment couldn’t be found." />
        ) : (
          <>
            <PageHead kicker={['Moment', momentDateLabel(data.moment)].filter(Boolean).join(' · ')} title={data.moment.name || 'A moment'} />
            {data.moment.description
              ? <Text style={styles.story}>{data.moment.description}</Text>
              : <Text style={[styles.story, { color: rd.color.steel }]}>Nothing written about this day yet.</Text>}

            <Text style={pageStyles.section}>{piecesPhrase(data.pieces.length)} from this day</Text>
            {data.pieces.length === 0 ? (
              <Empty text="No pieces tied to this moment yet." action="Add a piece to this moment" onPress={add} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}>
                {data.pieces.map((p) => {
                  const u = data.covers[String(p.id)];
                  const date = pieceDateLabel(p);
                  return (
                    <TouchableOpacity key={String(p.id)} style={{ width: 132 }} accessibilityRole="button" accessibilityLabel={p.name || 'Untitled piece'}
                      onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(p.id), from: 'event', fromId: id } } as any)}>
                      <View style={styles.plate}>{u && <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />}</View>
                      <Text style={styles.pieceName} numberOfLines={2}>{p.name || 'Untitled piece'}</Text>
                      {!!date && <Text style={[rd.type.label, { fontSize: 11, marginTop: 3 }]}>{date}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={pageStyles.section}>People</Text>
            <View style={styles.people}>
              {data.people.length ? data.people.map((n, i) => (
                <TouchableOpacity key={n} style={[styles.personRow, i > 0 && styles.rule]} accessibilityRole="link"
                  onPress={() => router.push({ pathname: '/person', params: { name: n } } as any)}>
                  <Text style={[rd.type.ui, { flex: 1 }]}>{n}</Text>
                </TouchableOpacity>
              )) : <Text style={[rd.type.fact, { paddingVertical: 14 }]}>No one named yet.</Text>}
            </View>

            {data.pieces.length > 0 && (
              <TouchableOpacity style={styles.primary} onPress={add} accessibilityRole="button">
                <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>Add a piece to this moment</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const RAIL_X = 28;
const styles = StyleSheet.create({
  rail: { paddingHorizontal: GUTTER, position: 'relative' },
  line: { position: 'absolute', left: GUTTER + RAIL_X / 2, top: 8, bottom: 8, width: 1, backgroundColor: rd.color.mist },
  decadeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 12 },
  decadeMark: { width: RAIL_X, height: 2, backgroundColor: rd.color.bronze },
  momentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  dot: { width: 9, height: 9, borderRadius: 2, marginTop: 20, marginLeft: RAIL_X / 2 - 4, marginRight: RAIL_X / 2 - 4,
    backgroundColor: rd.color.paper, borderWidth: 1, borderColor: rd.color.steel },
  card: { flex: 1, padding: 14, marginLeft: 10, backgroundColor: rd.color.paper, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg },
  cardTitle: { ...rd.type.name, marginTop: 4 },
  story: { ...rd.type.body, fontSize: 17, lineHeight: 27, paddingHorizontal: GUTTER },
  plate: { width: 132, height: 132, backgroundColor: rd.color.ice, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.md, overflow: 'hidden' },
  pieceName: { ...rd.type.name, fontSize: 19, lineHeight: 23, marginTop: 8 },
  people: { marginHorizontal: GUTTER, backgroundColor: rd.color.paper, borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg, paddingHorizontal: 14 },
  personRow: { minHeight: 48, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  primary: { marginHorizontal: GUTTER, marginTop: 28, minHeight: rd.minTarget, borderRadius: rd.radius.md, backgroundColor: rd.color.navy, alignItems: 'center', justifyContent: 'center' },
});
