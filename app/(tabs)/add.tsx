// app/(tabs)/add.tsx
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { supabase } from '../../lib/supabase';

export default function AddTab() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [datePurchased, setDatePurchased] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('Purchased');
  const [location, setLocation] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        const meta = (user?.user_metadata || {}) as any;
        if (!mounted) return;
        const opts = Array.isArray(meta?.people_list) ? meta.people_list : [];
        setPeopleOptions(opts);
        // Try to fetch location options from a dedicated 'locations' table first
        try {
          const { data: locs, error: locErr } = await supabase.from('locations').select('name').order('name');
          if (!locErr && Array.isArray(locs) && locs.length) {
            setLocationOptions(locs.map((l: any) => l.name));
          } else {
            // fallback: gather distinct locations from items
            const { data: items } = await supabase.from('items').select('location').neq('location', null).limit(100);
            if (Array.isArray(items)) {
              const uniq = Array.from(new Set(items.map((it: any) => it.location).filter(Boolean)));
              setLocationOptions(uniq as string[]);
            }
          }
        } catch (e) {
          // ignore and fallback
          const { data: items } = await supabase.from('items').select('location').neq('location', null).limit(100);
          if (Array.isArray(items)) {
            const uniq = Array.from(new Set(items.map((it: any) => it.location).filter(Boolean)));
            setLocationOptions(uniq as string[]);
          }
        }
      } catch (e: any) {
        console.warn('Could not load user metadata', e?.message ?? e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function togglePerson(name: string) {
    setPeople((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }

  const acquisitionOptions = ['Purchased', 'Gift', 'Inherited', 'Found', 'Made', 'Other'];
  const [uploading, setUploading] = useState(false);
  const [showAcqPicker, setShowAcqPicker] = useState(false);
  const [acqSearch, setAcqSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  async function submit() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    try {
      setSaving(true);
      const userResp = await supabase.auth.getUser();
      const userId = userResp.data?.user?.id;
      const row: any = {
        name: name.trim(),
        category: category || 'other',
        description: description || null,
        // Store storage path (uploadedPath) when available, otherwise fallback to public URL
        photo_url: uploadedPath ?? photoUrl ?? null,
        date_purchased: datePurchased || null,
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        acquisition_method: acquisitionMethod || null,
        location: location || null,
        people: people.length ? people : null,
        user_id: userId || null,
      };

      const { data, error } = await supabase.from('items').insert([row]).select().maybeSingle();
      if (error) throw error;
      Alert.alert('Saved', 'Item added');
      // navigate back to items list
      router.replace('/(tabs)/items');
    } catch (e: any) {
      console.warn('Insert error', e);
      Alert.alert('Could not add item', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function pickAndUpload() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to pick an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
  if ((res as any).canceled) return;
  const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      setUploading(true);
      const userResp = await supabase.auth.getUser();
      const userId = userResp.data?.user?.id ?? 'anon';
      // create a filename
      const parts = uri.split('/');
      const name = parts[parts.length - 1] ?? `photo-${Date.now()}.jpg`;
      const filePath = `${userId}/${Date.now()}-${name}`;

      // fetch blob
      const response = await fetch(uri);
      const blob = await response.blob();

  const { error: upErr } = await supabase.storage.from('images').upload(filePath, blob, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
  setPhotoUrl(urlData.publicUrl);
  setUploadedPath(filePath);
      Alert.alert('Uploaded', 'Image uploaded and attached to item');
    } catch (e: any) {
      console.warn('Upload failed', e);
      Alert.alert('Upload failed', e?.message ?? 'Please try again');
    } finally {
      setUploading(false);
    }
  }

  const renderHeader = () => (
    <>
      <TabHeader title="Add Item" actionTitle={saving ? 'Saving…' : 'Save'} onAction={submit} actionDisabled={saving} actionVariant="ghost" />

      <Card>
        <Text style={styles.label}>Name</Text>
        <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Category</Text>
        <TextInput placeholder="Category (choose a constrained value)" value={category} onChangeText={setCategory} style={styles.input} />

        <Text style={styles.label}>Photo</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Button title={uploading ? 'Uploading…' : (photoUrl ? 'Change Photo' : 'Pick Photo')} onPress={pickAndUpload} disabled={uploading} />
          {uploadedPath ? (
            <Text style={{ marginLeft: 8, color: '#374151' }}>{uploadedPath.split('/').pop()}</Text>
          ) : null}
        </View>
        {photoUrl ? (
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <Image source={{ uri: photoUrl }} style={styles.preview} />
          </View>
        ) : null}

        <Text style={styles.label}>Description</Text>
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]} multiline />

        <Text style={styles.label}>Date Purchased</Text>
        <TextInput placeholder="YYYY-MM-DD" value={datePurchased} onChangeText={setDatePurchased} style={styles.input} />

        <Text style={styles.label}>Estimated Value</Text>
        <TextInput placeholder="123.45" value={estimatedValue} onChangeText={setEstimatedValue} style={styles.input} keyboardType="numeric" />

        <Text style={styles.label}>Acquisition Method</Text>
          <Pressable onPress={() => setShowAcqPicker(true)} style={[styles.input, { justifyContent: 'center' }]}> 
            <Text style={{ color: '#111827' }}>{acquisitionMethod}</Text>
          </Pressable>
          <Modal visible={showAcqPicker} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <TextInput placeholder="Search…" value={acqSearch} onChangeText={setAcqSearch} style={styles.modalSearch} />
                {(() => {
                  const filtered = acquisitionOptions.filter((o) => o.toLowerCase().includes(acqSearch.trim().toLowerCase()));
                  if (filtered.length === 0) {
                    return <Text style={styles.modalEmpty}>No results</Text>;
                  }
                  return filtered.map((opt) => (
                    <Pressable key={opt} onPress={() => { setAcquisitionMethod(opt); setShowAcqPicker(false); setAcqSearch(''); }} style={styles.modalItem}>
                      <View style={styles.modalItemRow}>
                        <Text style={styles.modalItemText}>{opt}</Text>
                        {acquisitionMethod === opt ? <Text style={styles.check}>✓</Text> : null}
                      </View>
                    </Pressable>
                  ));
                })()}
                <Pressable onPress={() => setShowAcqPicker(false)} style={[styles.modalItem, { marginTop: 8 }]}>
                  <Text style={[styles.modalItemText, { color: '#EF4444' }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { marginTop: 8 }]}>Location</Text>
          <Pressable onPress={() => setShowLocationPicker(true)} style={[styles.input, { justifyContent: 'center', marginTop: 8 }]}> 
            <Text style={{ color: '#111827' }}>{location || 'Select a location'}</Text>
          </Pressable>
          <Modal visible={showLocationPicker} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <TextInput placeholder="Search locations…" value={locationSearch} onChangeText={setLocationSearch} style={styles.modalSearch} />
                {(() => {
                  if (locationOptions.length === 0) return <Text style={styles.modalItemText}>No locations available</Text>;
                  const filtered = locationOptions.filter((o) => o.toLowerCase().includes(locationSearch.trim().toLowerCase()));
                  if (filtered.length === 0) return <Text style={styles.modalEmpty}>No results</Text>;
                  return filtered.map((opt) => (
                    <Pressable key={opt} onPress={() => { setLocation(opt); setShowLocationPicker(false); setLocationSearch(''); }} style={styles.modalItem}>
                      <View style={styles.modalItemRow}>
                        <Text style={styles.modalItemText}>{opt}</Text>
                        {location === opt ? <Text style={styles.check}>✓</Text> : null}
                      </View>
                    </Pressable>
                  ));
                })()}
                <Pressable onPress={() => setShowLocationPicker(false)} style={[styles.modalItem, { marginTop: 8 }]}>
                  <Text style={[styles.modalItemText, { color: '#EF4444' }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

        <Text style={[styles.label, { marginTop: 8 }]}>People</Text>
        {loading && <Text style={styles.muted}>Loading people…</Text>}

        {/* render people inline inside the same Card */}
        {peopleOptions.map((p, i) => (
          <View key={`${p}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={styles.personText}>{p}</Text>
            <Text onPress={() => togglePerson(p)} style={[styles.link, { color: people.includes(p) ? '#059669' : '#2563EB' }]}>
              {people.includes(p) ? 'Selected' : 'Add'}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );

  const renderFooter = () => (
    <Card>
      <View style={{ height: 12 }} />
      <Button title={saving ? 'Saving…' : 'Add Item'} onPress={submit} disabled={saving} />
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {renderHeader()}

      {peopleOptions.length === 0 ? (
        <Text style={styles.muted}>No people found in your profile.</Text>
      ) : null}

      {renderFooter()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, backgroundColor: '#E4EBF2', minHeight: '100%' },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#111827', marginBottom: 8 },
  muted: { color: '#6B7280' },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  personText: { color: '#111827', fontWeight: '500' },
  link: { color: '#2563EB', fontWeight: '600' },
  preview: { width: 120, height: 90, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalSearch: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginBottom: 8,
  },
  modalEmpty: { color: '#6B7280', paddingVertical: 12, paddingHorizontal: 8 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 16, color: '#111827' },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { color: '#059669', fontSize: 16, fontWeight: '700' },
});