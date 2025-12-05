// app/(tabs)/events.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type EventItem = { id: string; title: string; date: string; notes?: string };

export default function EventsTab() {
  const router = useRouter();

  // TEMP sample data (replace with Supabase later)
  const [events] = useState<EventItem[]>([
    { id: "1", title: "Yard Sale Prep", date: "2025-10-05", notes: "Gather kitchen items" },
    { id: "2", title: "Photo Day", date: "2025-10-12", notes: "Shoot living room items" },
  ]);

  return (
    <View style={styles.page}>
      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push("./events-new")}>
        <Text style={styles.addBtnText}>+ Add Event</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={<Text style={styles.muted}>No events yet. Tap “+ Add Event”.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.date}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: "#fff" },
  addBtn: { backgroundColor: "#111827", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 12 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#6B7280", textAlign: "center", marginTop: 24 },
  card: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: "#FFF" },
  title: { fontWeight: "700", fontSize: 16, color: "#111827" },
  sub: { color: "#6B7280", marginTop: 4 },
  notes: { color: "#374151", marginTop: 6 },
});