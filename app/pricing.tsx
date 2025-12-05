import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Pricing() {
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
          backgroundColor: "#F3F4F6",
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ color: "#111827", fontWeight: "600" }}>← Back</Text>
      </TouchableOpacity>

      {/* Page content */}
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
        Pricing
      </Text>
      <View style={{ gap: 10 }}>
        <Text>Free – Basics</Text>
        <Text>Pro – More items & export</Text>
        <Text>Premium – Everything + priority support</Text>
      </View>
    </ScrollView>
  );
}