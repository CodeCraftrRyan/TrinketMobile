import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const router = useRouter();

  // Steps: 0 = Welcome, 1 = Name, 2 = Bio, 3 = People List
  const [step, setStep] = useState(0);
  const totalSteps = 4;

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [saving, setSaving] = useState(false);

  const canNextFromName = firstName.trim().length > 0 && lastName.trim().length > 0;
  const canNextFromBio = bio.trim().length > 0;

  async function saveName() {
    const full_name = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, full_name } });
    if (error) throw error;
  }

  async function saveBio() {
    const { error } = await supabase.auth.updateUser({ data: { bio } });
    if (error) throw error;
  }

  async function savePeopleAndFinish() {
  const { error } = await supabase.auth.updateUser({ data: { people_list: people } });
  if (error) throw error;
  router.replace('/(tabs)/items');
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else router.back();
  }

  async function next() {
    try {
      setSaving(true);
      if (step === 0) {
        setStep(1);
      } else if (step === 1) {
        if (!canNextFromName) return;
        await saveName();
        setStep(2);
      } else if (step === 2) {
        if (!canNextFromBio) return;
        await saveBio();
        setStep(3);
      }
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function finish(skipPeople = false) {
    try {
      setSaving(true);
      if (!skipPeople) {
        await savePeopleAndFinish();
      } else {
        // Save empty list and finish
  const { error } = await supabase.auth.updateUser({ data: { people_list: [] } });
  if (error) throw error;
  router.replace('/(tabs)/items');
      }
    } catch (e: any) {
      Alert.alert('Could not finish onboarding', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  function addPerson() {
    const name = newPerson.trim();
    if (!name) return;
    setPeople((prev) => [...prev, name]);
    setNewPerson('');
  }
  function removePerson(index: number) {
    setPeople((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text onPress={back} style={styles.backLink}>← Back</Text>
            <View style={styles.dots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.dot, i <= step ? styles.dotActive : undefined]} />
              ))}
            </View>
            <View style={{ width: 48 }} />
          </View>

          {step === 0 && (
            <View style={styles.centerWrap}>
              <Text style={styles.welcomeTitle}>Welcome!</Text>
              <Text style={styles.subtitle}>Let’s set up your profile.</Text>
              <Pressable onPress={next} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Get Started</Text>
              </Pressable>
            </View>
          )}

          {step === 1 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>What’s your name?</Text>
              <Text style={styles.subtitle}>Let’s get to know you.</Text>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <Pressable disabled={!canNextFromName || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromName || saving) && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Next  →'}</Text>
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>Tell us about yourself</Text>
              <Text style={styles.subtitle}>A short bio will help personalize your experience.</Text>
              <TextInput
                placeholder="Write a few sentences about yourself or your collection…"
                value={bio}
                onChangeText={setBio}
                style={[styles.input, { height: 140, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <Pressable disabled={!canNextFromBio || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromBio || saving) && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Next  →'}</Text>
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>Create your People List</Text>
              <Text style={styles.subtitle}>Add family and friends to easily tag them in events.</Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="Add a person (e.g., Mom, Alex)"
                  value={newPerson}
                  onChangeText={setNewPerson}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable onPress={addPerson} style={[styles.secondaryBtn, { paddingHorizontal: 16 }]}>
                  <Text style={styles.secondaryBtnText}>Add</Text>
                </Pressable>
              </View>

              <FlatList
                data={people}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.personRow}>
                    <Text style={styles.personText}>{item}</Text>
                    <Pressable onPress={() => removePerson(index)}>
                      <Text style={styles.removeLink}>Remove</Text>
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.muted}>No people yet. Add a few now or skip.</Text>}
                style={{ marginTop: 8 }}
              />

              <Pressable onPress={() => finish(false)} disabled={saving} style={[styles.primaryBtn, saving && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save & Finish'}</Text>
              </Pressable>

              <Pressable onPress={() => finish(true)} style={[styles.secondaryBtn, { marginTop: 10 }]}> 
                <Text style={styles.secondaryBtnText}>Skip for Now & Finish</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E4EBF2' },
  scroll: { flexGrow: 1, padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backLink: { color: '#2563EB', fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#111827' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 16 },
  welcomeTitle: { fontSize: 40, fontWeight: '800', color: '#111827' },
  bigTitle: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 24 },
  subtitle: { color: '#6B7280', marginTop: 6, marginBottom: 14, textAlign: 'center' },
  formWrap: { gap: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#111827' },
  primaryBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#111827', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  link: { color: '#2563EB', fontWeight: '600' },
  muted: { color: '#6B7280', marginTop: 10, textAlign: 'center' },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  personText: { color: '#111827', fontWeight: '500' },
  removeLink: { color: '#EF4444', fontWeight: '600' },
});