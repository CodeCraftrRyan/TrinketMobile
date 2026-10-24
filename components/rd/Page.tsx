// Shared building blocks for the redesigned spine screens (Collections,
// Moments, People, Places): page header, back bar, loading / failed states,
// a two-column piece grid and a plate row (three small covers + a title).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rd } from '../../lib/rdTokens';
import type { Piece } from '../../lib/spine';
import PieceCard from './PieceCard';

export const GUTTER = 16;

/** Back link along the top of a detail screen. */
export function BackBar({ label, onPress, right }: { label: string; onPress?: () => void; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home' as any)));
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel={`Back to ${label}`}>
        <Ionicons name="chevron-back" size={22} color={rd.color.navy} />
        <Text style={rd.type.ui} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      {right}
    </View>
  );
}

/** Kicker, Garamond title, optional lead and action. `top` pads for the status bar on tab screens. */
export function PageHead({ kicker, title, lead, action, top = false }: {
  kicker?: string; title: string; lead?: string | null; action?: ReactNode; top?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.head, top && { paddingTop: insets.top + 20 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          {!!kicker && <Text style={rd.type.label}>{kicker}</Text>}
          <Text style={[rd.type.title, { marginTop: kicker ? 6 : 0 }]} accessibilityRole="header">{title}</Text>
        </View>
        {action}
      </View>
      {!!lead && <Text style={[rd.type.lead, { marginTop: 8 }]}>{lead}</Text>}
    </View>
  );
}

/** A small navy-outline button for a header ("New collection"). */
export function HeadButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={rd.color.navy} />
      <Text style={rd.type.uiMedium}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={rd.color.steel} /></View>;
}

export function Failed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={rd.type.name}>{what} didn’t load.</Text>
      <Text style={[rd.type.body, { marginTop: 6 }]}>Check your connection and try again. Nothing has been lost.</Text>
      <TouchableOpacity style={[styles.outline, { marginTop: 16 }]} onPress={onRetry} accessibilityRole="button">
        <Text style={rd.type.uiMedium}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

/** A written empty state with an optional primary action. */
export function Empty({ text, action, onPress }: { text: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={rd.type.body}>{text}</Text>
      {action && onPress && (
        <TouchableOpacity style={[styles.primary, { marginTop: 18 }]} onPress={onPress} accessibilityRole="button">
          <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Two-column grid of pieces. Opening one passes where it was opened from. */
export function PieceGrid({ pieces, covers, from }: {
  pieces: Piece[]; covers: Record<string, string>; from?: { kind: 'collection' | 'event'; id: string };
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gap = 14;
  const w = Math.floor((width - GUTTER * 2 - gap) / 2);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, rowGap: 22, paddingHorizontal: GUTTER }}>
      {pieces.map((p) => (
        <PieceCard
          key={String(p.id)}
          row={p}
          width={w}
          coverUrl={covers[String(p.id)]}
          onPress={() => router.push({
            pathname: '/(tabs)/items/[id]',
            params: { id: String(p.id), ...(from ? { from: from.kind, fromId: from.id } : {}) },
          } as any)}
        />
      ))}
    </View>
  );
}

/** A list row: up to three small covers, a Garamond title, a mono meta line. */
export function PlateRow({ title, meta, covers, onPress, first }: {
  title: string; meta: string; covers: (string | null)[]; onPress: () => void; first?: boolean;
}) {
  const shown = covers.length ? covers.slice(0, 3) : [null];
  return (
    <TouchableOpacity style={[styles.row, !first && styles.rowRule]} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${title}, ${meta}`}>
      <View style={styles.thumbs}>
        {shown.map((u, i) => (
          <View key={i} style={[styles.thumb, { left: i * 14, zIndex: 3 - i }]}>
            {u ? <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />
              : <Ionicons name="image-outline" size={16} color={rd.color.powder} />}
          </View>
        ))}
      </View>
      <View style={{ flex: 1, marginLeft: 14 + Math.max(0, shown.length - 1) * 14 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>{title}</Text>
        <Text style={[rd.type.label, { fontSize: 11, marginTop: 3 }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={rd.color.steel} />
    </TouchableOpacity>
  );
}

/** Paper card holding a list of rows. */
export function ListCard({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export const pageStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  section: { ...rd.type.label, paddingHorizontal: GUTTER, marginTop: 28, marginBottom: 12 },
});

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: rd.minTarget, paddingRight: 8, flexShrink: 1 },
  head: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 18 },
  headBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: rd.minTarget, paddingHorizontal: 12,
    borderWidth: 1, borderColor: rd.color.navy, borderRadius: rd.radius.md, backgroundColor: rd.color.paper,
  },
  center: { paddingVertical: 60, alignItems: 'center' },
  card: {
    marginHorizontal: GUTTER, padding: 20, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg,
  },
  outline: {
    minHeight: rd.minTarget, alignSelf: 'flex-start', paddingHorizontal: 18, borderRadius: rd.radius.md,
    borderWidth: rd.hairline, borderColor: rd.color.mist, alignItems: 'center', justifyContent: 'center',
  },
  primary: {
    minHeight: rd.minTarget, alignSelf: 'flex-start', paddingHorizontal: 18, borderRadius: rd.radius.md,
    backgroundColor: rd.color.navy, alignItems: 'center', justifyContent: 'center',
  },
  list: {
    marginHorizontal: GUTTER, backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.lg, paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: 12 },
  rowRule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  thumbs: { width: 44, height: 44 },
  thumb: {
    position: 'absolute', top: 0, width: 44, height: 44, borderRadius: rd.radius.sm, overflow: 'hidden',
    backgroundColor: rd.color.ice, borderWidth: 1.5, borderColor: rd.color.paper, alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...rd.type.name, fontSize: 20, lineHeight: 24 },
});
