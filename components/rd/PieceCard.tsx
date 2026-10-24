// One piece in the redesigned archive grid: the photograph on a paper plate
// (mist hairline, 8px corners, no shadow), the name in Garamond, the date in
// mono. `coverUrl` is signed by the parent for the whole page in one batch.
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pieceDateLabel } from '../../lib/pieces';
import { rd } from '../../lib/rdTokens';

export type PieceRow = {
  id: string | number;
  name: string | null;
  photo_url?: string | null;
  year?: string | null;
  year_manufactured?: string | null;
  memory_date?: string | null;
  created_at?: string | null;
};

export default function PieceCard({ row, coverUrl, width, onPress }: {
  row: PieceRow; coverUrl?: string; width: number; onPress: () => void;
}) {
  const name = row.name || 'Untitled piece';
  const date = pieceDateLabel(row);
  return (
    <TouchableOpacity
      style={{ width }}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={date ? `${name}, ${date}` : name}
    >
      <View style={[styles.plate, { width, height: width }]}>
        {coverUrl
          ? <Image source={{ uri: coverUrl }} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
          : <Ionicons name="image-outline" size={26} color={rd.color.powder} />}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      {date && <Text style={styles.date}>{date}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: rd.color.ice,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.md,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  name: { ...rd.type.name, fontSize: 19, lineHeight: 23, marginTop: 10 },
  date: { ...rd.type.label, fontSize: 11, marginTop: 4 },
});
