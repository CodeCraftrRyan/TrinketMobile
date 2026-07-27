import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandHeader from '../../components/ui/BrandHeader';
import { tokens } from '../../lib/tokens';

const icons = [
  'camera-outline', 'infinite-outline', 'home-outline', 'telescope-outline',
  'book-outline', 'color-palette-outline', 'heart-outline', 'leaf-outline'
] as const;
const colors = [
  tokens.colors.accent, tokens.colors.accentCool, tokens.colors.border, tokens.colors.bg, tokens.colors.card, tokens.colors.ink
];

export default function ChooseIcon() {
  const [selectedIcon, setSelectedIcon] = useState<(typeof icons)[number]>(icons[0]);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BrandHeader layout="column" align="center" style={{ marginBottom: 18 }} />
        <Text style={styles.title}>Choose an icon</Text>
        <Text style={styles.subtitle}>Pick an icon and a highlight color for your archive.</Text>
        <View style={styles.iconGrid}>
          {icons.map((icon, i) => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconBox, selectedIcon === icon && { borderColor: tokens.colors.accent, borderWidth: 2 }]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Ionicons name={icon} size={38} color={tokens.colors.ink} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.colorRow}>
          {colors.map((color, i) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorCircle, { backgroundColor: color }, selectedColor === color && styles.colorSelected]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn}>
          <Text style={styles.nextText}>Next  →</Text>
        </TouchableOpacity>
  <TouchableOpacity style={styles.previewBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.previewText}>Preview Logged In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '800', color: tokens.colors.ink, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: tokens.colors.accentCool, fontSize: 18, marginBottom: 32, textAlign: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginBottom: 32 },
  iconBox: { width: 72, height: 72, borderRadius: 16, backgroundColor: tokens.colors.bg, alignItems: 'center', justifyContent: 'center', margin: 8 },
  colorRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 7, borderWidth: 2, borderColor: tokens.colors.border },
  colorSelected: { borderColor: tokens.colors.accent, borderWidth: 3 },
  nextBtn: { backgroundColor: tokens.colors.accent, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', marginTop: 12 },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  previewBtn: { backgroundColor: tokens.colors.accentCool, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', marginTop: 18 },
  previewText: { color: '#fff', fontWeight: '700', fontSize: 18 },
});
