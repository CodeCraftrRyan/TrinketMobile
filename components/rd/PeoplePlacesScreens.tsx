// Redesign → People and Places (mockups #10, #13, #14, adapted for a phone).
// People aren't their own records yet: a person is a name on items.people (or
// on the people list); a place is the text in items.location. Read-only.
//   PeopleIndex / PersonView — everyone, then one person's pieces, oldest first.
//   PlacesIndex / PlaceView  — rooms with counts, then a room's contents in
//                              hairline-divided rows.
import { useRouter } from 'expo-router';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { pieceDateLabel } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';
import { loadPeopleIndex, loadPerson, loadPlace, loadPlacesIndex, momentDateLabel, piecesPhrase, type Piece } from '../../lib/spine';
import { useLoader } from '../../lib/useLoader';
import { BackBar, Empty, Failed, GUTTER, ListCard, Loading, PageHead, PlateRow, pageStyles } from './Page';

export function PeopleIndex() {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(loadPeopleIndex, []);
  return (
    <View style={pageStyles.page}>
      <BackBar label="More" right={
        <TouchableOpacity style={styles.barBtn} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Edit the list of people">
          <Text style={[rd.type.uiMedium, { color: rd.color.steelDeep }]}>Edit list</Text>
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={rd.color.steel} />}>
        <PageHead title="People" lead="The people your pieces came from, and the ones they’re kept for." />
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="The people" onRetry={reload} /> : !data?.length ? (
          <Empty text="No one named yet. Name the people on a piece and they gather here." />
        ) : (
          <ListCard>
            {data.map((p, i) => (
              <PlateRow key={p.name} first={i === 0} title={p.name} meta={piecesPhrase(p.pieces.length)} covers={p.covers}
                onPress={() => router.push({ pathname: '/person', params: { name: p.name } } as any)} />
            ))}
          </ListCard>
        )}
      </ScrollView>
    </View>
  );
}

export function PersonView({ name }: { name: string }) {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(() => loadPerson(name), [name]);
  return (
    <View style={pageStyles.page}>
      <BackBar label="People" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="This person" onRetry={reload} /> : !data ? null : (
          <>
            {/* TODO(schema): relation, years and a portrait need fields on a person record. */}
            <PageHead kicker={`Person · ${piecesPhrase(data.pieces.length)}`} title={data.name} />
            {data.pieces.length === 0
              ? <Empty text={`No pieces name ${data.name} yet. Add them on a piece’s “Whose it was”.`} />
              : <Timeline pieces={data.pieces} covers={data.covers} />}
            {data.moments.length > 0 && (
              <>
                <Text style={pageStyles.section}>Moments</Text>
                <ListCard>
                  {data.moments.map((m, i) => (
                    <TouchableOpacity key={String(m.id)} style={[styles.row, i > 0 && styles.rule]} accessibilityRole="link"
                      onPress={() => router.push({ pathname: '/events-detail', params: { id: String(m.id) } } as any)}>
                      <Text style={[rd.type.ui, { flex: 1 }]}>{m.name || 'A moment'}</Text>
                      {!!momentDateLabel(m) && <Text style={[rd.type.label, { fontSize: 11 }]}>{momentDateLabel(m)}</Text>}
                    </TouchableOpacity>
                  ))}
                </ListCard>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** A person's pieces on a vertical line, oldest first. */
function Timeline({ pieces, covers }: { pieces: Piece[]; covers: Record<string, string> }) {
  const router = useRouter();
  return (
    <View style={{ paddingHorizontal: GUTTER }}>
      {pieces.map((p, i) => {
        const u = covers[String(p.id)];
        const date = pieceDateLabel(p);
        return (
          <TouchableOpacity key={String(p.id)} style={styles.tlRow} accessibilityRole="button" accessibilityLabel={[p.name || 'Untitled piece', date].filter(Boolean).join(', ')}
            onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(p.id) } } as any)}>
            <View style={styles.tlRail}>
              <View style={[styles.tlLine, i === 0 && { top: 34 }, i === pieces.length - 1 && { bottom: undefined, height: 34 }]} />
              <View style={styles.tlDot} />
            </View>
            <View style={styles.tlThumb}>{u && <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={[rd.type.label, { fontSize: 11 }]}>{date || 'Undated'}</Text>
              <Text style={styles.tlName} numberOfLines={2}>{p.name || 'Untitled piece'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function PlacesIndex() {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(loadPlacesIndex, []);
  return (
    <View style={pageStyles.page}>
      <BackBar label="More" right={
        <TouchableOpacity style={styles.barBtn} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Edit your places">
          <Text style={[rd.type.uiMedium, { color: rd.color.steelDeep }]}>Edit list</Text>
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={rd.color.steel} />}>
        <PageHead title="Places" lead="Where your pieces rest." />
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="Your places" onRetry={reload} /> : !data?.places.length ? (
          <Empty text="No pieces have a place yet. Choose a location on a piece and its room appears here." />
        ) : (
          <>
            <ListCard>
              {data.places.map((p, i) => (
                <PlateRow key={p.name} first={i === 0} title={p.name} meta={piecesPhrase(p.pieces.length)} covers={p.covers}
                  onPress={() => router.push({ pathname: '/place', params: { name: p.name } } as any)} />
              ))}
            </ListCard>
            {data.unplaced > 0 && (
              <Text style={[rd.type.fact, { paddingHorizontal: GUTTER, marginTop: 14 }]}>
                {piecesPhrase(data.unplaced)} {data.unplaced === 1 ? 'has' : 'have'} no place yet.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function PlaceView({ name }: { name: string }) {
  const router = useRouter();
  const { data, failed, loading, reload } = useLoader(() => loadPlace(name), [name]);
  return (
    <View style={pageStyles.page}>
      <BackBar label="Places" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {loading && !data ? <Loading /> : failed && !data ? <Failed what="This place" onRetry={reload} /> : !data ? null : (
          <>
            <PageHead kicker={`Place · ${piecesPhrase(data.pieces.length)}`} title={data.name} />
            {data.pieces.length === 0 ? <Empty text="Nothing rests here now." /> : (
              <ListCard>
                {/* TODO(schema): the "Moved" tag needs a record of past locations. */}
                {data.pieces.map((p, i) => {
                  const u = data.covers[String(p.id)];
                  const date = pieceDateLabel(p);
                  return (
                    <TouchableOpacity key={String(p.id)} style={[styles.contentRow, i > 0 && styles.rule]} accessibilityRole="button"
                      accessibilityLabel={[p.name || 'Untitled piece', date].filter(Boolean).join(', ')}
                      onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(p.id) } } as any)}>
                      <View style={styles.tlThumb}>{u && <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tlName} numberOfLines={2}>{p.name || 'Untitled piece'}</Text>
                        {!!date && <Text style={[rd.type.label, { fontSize: 11, marginTop: 3 }]}>{date}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ListCard>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barBtn: { minHeight: rd.minTarget, minWidth: rd.minTarget, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'flex-end' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68 },
  tlRail: { width: 16, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  tlLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: rd.color.mist },
  tlDot: { width: 9, height: 9, borderRadius: 2, backgroundColor: rd.color.paper, borderWidth: 1, borderColor: rd.color.bronze },
  tlThumb: { width: 52, height: 52, borderRadius: rd.radius.sm, overflow: 'hidden', backgroundColor: rd.color.ice, borderWidth: rd.hairline, borderColor: rd.color.mist },
  tlName: { ...rd.type.name, fontSize: 19, lineHeight: 23 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10 },
});
