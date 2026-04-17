// app/events-new.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import BrandHeader from '../components/ui/BrandHeader';
import { supabase } from "../lib/supabase";

export default function NewEvent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(""); // e.g. 2025-10-05
  const [description, setDescription] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [peopleList, setPeopleList] = useState(""); // comma-separated
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !eventDate) return Alert.alert("Missing info", "Event name and date are required.");
    try {
      setSaving(true);
      const { error } = await supabase.from("events").insert({
        name,
        event_date: eventDate,
        description,
        cover_photo_url: coverPhotoUrl || null,
        people_list: peopleList ? peopleList.split(",").map(s => s.trim()) : [],
        start_date: startDate || null,
        end_date: endDate || null,
        // Optionally: add user_id
      });
      if (error) throw error;
      Alert.alert("Saved", "Event created.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      <BrandHeader style={{ marginBottom: 12 }} />
      <Text style={styles.h1}>New Event</Text>



      <TextInput
        style={styles.input}
        placeholder="Event Name"
        value={name}
        onChangeText={setName}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={styles.input}
        placeholder="Event Date (YYYY-MM-DD)"
        value={eventDate}
        onChangeText={setEventDate}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD, optional)"
        value={startDate}
        onChangeText={setStartDate}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={styles.input}
        placeholder="End Date (YYYY-MM-DD, optional)"
        value={endDate}
        onChangeText={setEndDate}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={styles.input}
        placeholder="Cover Photo URL (optional)"
        value={coverPhotoUrl}
        onChangeText={setCoverPhotoUrl}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={styles.input}
        placeholder="People (comma separated, optional)"
        value={peopleList}
        onChangeText={setPeopleList}
  placeholderTextColor="#4A7A9B"
      />

      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: "top", paddingTop: 12 }]}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
  placeholderTextColor="#4A7A9B"
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
  page: { flex: 1, backgroundColor: "#F7FAFB", padding: 16 },
  h1: { fontSize: 24, fontWeight: "800", color: "#0C1620", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#D8E6EE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: "#0C1620", marginBottom: 10 },
  primaryBtn: { backgroundColor: "#B8783A", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  linkBtn: { alignItems: "center", marginTop: 10 },
  linkText: { color: "#B8783A", fontWeight: "600" },
});