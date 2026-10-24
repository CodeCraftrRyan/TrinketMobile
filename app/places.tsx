// Places, reached from the redesign's "More" tab. For now it shows the same
// "Your places" list that lives in Settings; the full Places screen (pieces
// grouped by where they're kept) comes in a later stage.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlacesSection from '../components/PlacesSection';
import { rd } from '../lib/rdTokens';

export default function Places() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 48 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={rd.color.navy} />
        <Text style={rd.type.ui}>More</Text>
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">Places</Text>
      <PlacesSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: rd.color.frost },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: rd.minTarget, alignSelf: 'flex-start' },
  title: { ...rd.type.title, marginTop: 4, marginBottom: 12 },
});
