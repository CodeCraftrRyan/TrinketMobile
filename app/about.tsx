import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import BrandHeader from '../components/ui/BrandHeader';

export default function About() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginBottom: 16,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: "#D8E6EE",
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
  <Text style={{ color: "#0C1620", fontWeight: "600" }}>← Back</Text>
      </TouchableOpacity>
    <BrandHeader style={{ marginBottom: 16 }} />
      {/* Page content */}
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:20 }}>
      <Text style={{ fontSize:20, textAlign:"center", color: "#0C1620" }}>
        ℹ️ Trinket helps you save and remember your items.
      </Text>
    </View>
    </ScrollView>
  );
}