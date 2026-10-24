// Redesign → Welcome (first open, signed out). Frost page, the wordmark in
// Garamond, one quiet line, then one navy button and one hairline button.
// Nothing filled in bronze, nothing pill-shaped, no shadows.
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rd } from '../../lib/rdTokens';

const LINKS: [string, string][] = [
  ['Terms of Use', 'https://www.yourtrinkets.com/Terms'],
  ['Privacy Policy', 'https://www.yourtrinkets.com/Privacy'],
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 }]}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={rd.type.label}>A personal archive</Text>
        <Text style={styles.word} accessibilityRole="header">Trinket</Text>
        <View style={styles.thread} />
        <Text style={styles.lead}>
          Keep the things that matter, and the stories that make them matter.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/(auth)/signup')} accessibilityRole="button">
          <Text style={[rd.type.uiMedium, { color: rd.color.paper }]}>Create an account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(auth)/login')} accessibilityRole="button">
          <Text style={rd.type.uiMedium}>I already have an account</Text>
        </TouchableOpacity>
        <View style={styles.links}>
          {LINKS.map(([label, url], i) => (
            <TouchableOpacity key={label} onPress={() => Linking.openURL(url).catch(() => {})} accessibilityRole="link" style={styles.link}>
              <Text style={[rd.type.fact, { color: rd.color.steelDeep }]}>{label}{i < LINKS.length - 1 ? '  ·' : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  wrap: { flexGrow: 1, paddingHorizontal: 24 },
  word: { fontFamily: rd.font.display, fontSize: 64, lineHeight: 70, letterSpacing: -1, color: rd.color.navy, marginTop: 10 },
  thread: { width: 48, height: 2, backgroundColor: rd.color.bronze, marginTop: 18, marginBottom: 18 },
  lead: { ...rd.type.lead, fontSize: 19, lineHeight: 28, maxWidth: 320 },
  primary: { minHeight: 52, borderRadius: rd.radius.md, backgroundColor: rd.color.navy, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    minHeight: 52, borderRadius: rd.radius.md, borderWidth: 1, borderColor: rd.color.mist, backgroundColor: rd.color.paper,
    alignItems: 'center', justifyContent: 'center',
  },
  links: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  link: { minHeight: rd.minTarget, justifyContent: 'center', paddingHorizontal: 4 },
});
