import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

// Helper to get current user id from Supabase auth
async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export default function CreateEvent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
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
      const userId = await getUserId();
      const { data, error } = await supabase.from("events").insert({
        name,
        event_date: eventDate,
        description,
        cover_photo_url: coverPhotoUrl || null,
        people_list: peopleList ? peopleList.split(",").map(s => s.trim()) : [],
        start_date: startDate || null,
        end_date: endDate || null,
      }).select().single();
      if (error) throw error;

      // Save people to people table
      const peopleArr = peopleList ? peopleList.split(",").map(s => s.trim()).filter(Boolean) : [];
      if (peopleArr.length > 0 && data?.id && userId) {
        const peopleRows = peopleArr.map(name => ({ name, event_id: data.id, user_id: userId }));
        const { error: peopleError } = await supabase.from("people").insert(peopleRows);
        if (peopleError) throw peopleError;
      }

      Alert.alert("Saved", "Event created.");
      router.replace({ pathname: "/(tabs)/add", params: { eventId: data.id } });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={{ marginTop: 8, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <View>
          <Text style={{ fontSize: 34, fontWeight: '300', color: '#0C1620', fontFamily: 'CormorantGaramond_300Light' }}>Create New Event</Text>
          <Text style={{ color: '#4A7A9B', fontSize: 18, marginTop: 2 }}>Add details for your event</Text>
        </View>
      </View>

      {/* Form */}
  <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, marginTop: 18, marginBottom: 16, borderWidth: 1, borderColor: '#D8E6EE', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
        <TextInput
          style={{ ...styles.input, fontSize: 18, fontFamily: 'DMSans_400Regular', color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="Event Name*"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={{ ...styles.input, fontSize: 18, fontFamily: 'DMSans_400Regular', color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="Event Date (YYYY-MM-DD)*"
          value={eventDate}
          onChangeText={setEventDate}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={{ ...styles.input, fontSize: 16, color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="Start Date (YYYY-MM-DD, optional)"
          value={startDate}
          onChangeText={setStartDate}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={{ ...styles.input, fontSize: 16, color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="End Date (YYYY-MM-DD, optional)"
          value={endDate}
          onChangeText={setEndDate}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={{ ...styles.input, fontSize: 16, color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="Cover Photo URL (optional)"
          value={coverPhotoUrl}
          onChangeText={setCoverPhotoUrl}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={{ ...styles.input, fontSize: 16, color: '#0C1620', backgroundColor: 'transparent' }}
          placeholder="People (comma separated, optional)"
          value={peopleList}
          onChangeText={setPeopleList}
          placeholderTextColor="#4A7A9B"
        />
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top", paddingTop: 12, fontSize: 16, color: '#0C1620', backgroundColor: 'transparent' }]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholderTextColor="#4A7A9B"
          multiline
        />
  <TouchableOpacity style={{ backgroundColor: '#B8783A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6, shadowColor: '#B8783A', shadowOpacity: 0.12, shadowRadius: 8 }} onPress={save} disabled={saving}>
          <Text style={{ color: '#fff', fontWeight: '500', fontSize: 18, fontFamily: 'DMSans_500Medium' }}>{saving ? "Saving…" : "Save Event"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#B8783A', fontWeight: '600', fontSize: 16, fontFamily: 'DMSans_500Medium' }}>← Cancel</Text>
        </TouchableOpacity>
      </View>
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
