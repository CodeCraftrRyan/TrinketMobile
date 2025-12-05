// app/events-new.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
// import { supabase } from "../lib/supabase"; // <- hook up later

export default function NewEvent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(""); // e.g. 2025-10-05
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title || !date) return Alert.alert("Missing info", "Title and date are required.");
    try {
      setSaving(true);
      // TODO: connect to Supabase later
      // await supabase.from("events").insert({ title, date, notes });
      Alert.alert("Saved", "Event created (placeholder).");
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.h1}>New Event</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: "top", paddingTop: 12 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholderTextColor="#9CA3AF"
        multiline
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving}>
        <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save Event"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
        <Text style={styles.linkText}>← Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff", padding: 16 },
  h1: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: "#111827", marginBottom: 10 },
  primaryBtn: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  linkBtn: { alignItems: "center", marginTop: 10 },
  linkText: { color: "#2563EB", fontWeight: "600" },
});