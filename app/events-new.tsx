import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

export default function NewEvent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [peopleList, setPeopleList] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickCover(fromCamera: boolean) {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed',
          fromCamera ? 'Please allow camera access.' : 'Please allow photo access.');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 2], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 2], quality: 0.8 });
      if (!result.canceled && result.assets?.length) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to open the picker', e);
      Alert.alert('Unavailable', 'Please try again in a moment.');
    }
  }

  // Same private bucket and path shape the web uses for event covers.
  async function uploadCover(localUri: string, userId: string) {
    const ext = (localUri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
    const path = `${userId}/events/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, decode(base64), { contentType, upsert: false });
    if (error) throw error;
    return path;
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'An event needs a name.');
      return;
    }
    try {
      setSaving(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Please sign in first.');

      let coverPath: string | null = null;
      if (coverUri) coverPath = await uploadCover(coverUri, userId);

      const { data, error } = await supabase
        .from('events')
        .insert({
          name: name.trim(),
          user_id: userId,
          event_date: eventDate.trim() || null,
          start_date: startDate.trim() || null,
          end_date: endDate.trim() || null,
          description: description.trim() || null,
          cover_photo_url: coverPath,
          people_list: peopleList
            ? peopleList.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        })
        .select('id')
        .single();
      if (error) throw error;

      if (data?.id) {
        router.replace({ pathname: '/events-detail', params: { id: String(data.id) } } as any);
        return;
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save the event', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const labelStyle = { ...tokens.type.label, color: c.inkLabel, marginBottom: 8 };
  const fieldBox = {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
    justifyContent: 'center' as const,
  };
  const fieldText = { ...tokens.type.ui, color: c.ink };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>

      {/* Top bar */}
      <View style={{
        backgroundColor: c.surfaceDark,
        paddingTop: 72, paddingBottom: 16, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ ...tokens.type.nameSmall, color: c.bg }}>New event</Text>
        <TouchableOpacity onPress={save} disabled={saving} hitSlop={10}>
          <Text style={{ ...tokens.type.ui, color: c.accent, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">

        {/* Cover photograph */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 120, height: 120 }}>
            {coverUri ? (
              <>
                <Image source={{ uri: coverUri }}
                  style={{ width: 120, height: 120, borderRadius: tokens.radius.md }}
                  resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => setCoverUri(null)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: c.surfaceDark, borderRadius: 11,
                    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Ionicons name="close" size={13} color={c.bg} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{
                width: 120, height: 120,
                backgroundColor: c.surfaceSoft,
                borderRadius: tokens.radius.md,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="calendar-outline" size={26} color={c.inkLight} />
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 12 }}>
            <TouchableOpacity
              onPress={() => pickCover(true)}
              style={{
                flex: 1, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
                borderRadius: tokens.radius.md, backgroundColor: c.card,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Ionicons name="camera-outline" size={20} color={c.accentCool} />
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool, marginTop: 4 }}>
                Photograph
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickCover(false)}
              style={{
                flex: 1, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
                borderRadius: tokens.radius.md, backgroundColor: c.card,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Ionicons name="images-outline" size={20} color={c.accentCool} />
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool, marginTop: 4 }}>
                From library
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* What happened */}
        <Text style={{ ...labelStyle, marginTop: 26 }}>What happened</Text>
        <View style={fieldBox}>
          <TextInput
            style={fieldText}
            value={name}
            onChangeText={setName}
            placeholder="Our wedding day"
            placeholderTextColor={c.inkLight}
          />
        </View>

        {/* When */}
        <Text style={{ ...labelStyle, marginTop: 22 }}>When</Text>
        <View style={fieldBox}>
          <TextInput
            style={fieldText}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.inkLight}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        {/* If it ran across days */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Began</Text>
            <View style={fieldBox}>
              <TextInput
                style={fieldText}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Optional"
                placeholderTextColor={c.inkLight}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Ended</Text>
            <View style={fieldBox}>
              <TextInput
                style={fieldText}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="Optional"
                placeholderTextColor={c.inkLight}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* Who was there */}
        <Text style={{ ...labelStyle, marginTop: 22 }}>Who was there</Text>
        <View style={fieldBox}>
          <TextInput
            style={fieldText}
            value={peopleList}
            onChangeText={setPeopleList}
            placeholder="Diane, Ryan, Lily"
            placeholderTextColor={c.inkLight}
          />
        </View>
        <Text style={{ ...tokens.type.fact, color: c.inkLabel, marginTop: 8 }}>
          Separate names with a comma.
        </Text>

        {/* The story */}
        <Text style={{ ...labelStyle, marginTop: 22 }}>The story</Text>
        <View style={[fieldBox, { minHeight: 132, paddingVertical: 12, justifyContent: 'flex-start' }]}>
          <TextInput
            style={[fieldText, { minHeight: 108, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What the day was, and what it left behind."
            placeholderTextColor={c.inkLight}
            multiline
          />
        </View>

      </ScrollView>
    </View>
  );
}
