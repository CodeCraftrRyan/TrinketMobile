// Redesign → "More" tab: the three places that don't get their own tab.
// Plain list on frost, paper rows on mist hairlines, Garamond title.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rd } from '../../lib/rdTokens';

type Entry = { label: string; note: string; icon: keyof typeof Ionicons.glyphMap; href: string };

const ENTRIES: Entry[] = [
  { label: 'People', note: 'Who your pieces belong to and came from', icon: 'people-outline', href: '/people' },
  { label: 'Places', note: 'Rooms and homes where things are kept', icon: 'home-outline', href: '/places' },
  { label: 'Settings', note: 'Your account, plan and reading options', icon: 'settings-outline', href: '/account' },
];

export default function More() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 48 }}>
      <Text style={styles.title} accessibilityRole="header">More</Text>
      <View style={styles.list}>
        {ENTRIES.map((e, i) => (
          <TouchableOpacity
            key={e.label}
            style={[styles.row, i > 0 && styles.rowRule]}
            onPress={() => router.push(e.href as any)}
            accessibilityRole="link"
            accessibilityLabel={e.label}
            accessibilityHint={e.note}
          >
            <Ionicons name={e.icon} size={22} color={rd.color.steel} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{e.label}</Text>
              <Text style={styles.note}>{e.note}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={rd.color.steel} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  title: { ...rd.type.title, paddingHorizontal: 20, marginBottom: 20 },
  list: {
    marginHorizontal: 16,
    backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.mist,
    borderRadius: rd.radius.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64 },
  rowRule: { borderTopWidth: rd.hairline, borderTopColor: rd.color.mist },
  label: { ...rd.type.uiMedium },
  note: { ...rd.type.fact, marginTop: 2 },
});
