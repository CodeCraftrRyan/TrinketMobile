import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { type CountryCode, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const router = useRouter();

  const COUNTRY_OPTIONS: { code: CountryCode; label: string }[] = [
    { code: 'US', label: 'United States' },
    { code: 'CA', label: 'Canada' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'AU', label: 'Australia' },
    { code: 'NZ', label: 'New Zealand' },
    { code: 'IE', label: 'Ireland' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
  ];

  // Steps: 0 = Welcome, 1 = Name, 2 = Bio, 3 = People List
  const [step, setStep] = useState(0);
  const totalSteps = 4;

  // Form state
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('US');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedPhone = parsePhoneNumberFromString(phoneNumber, phoneCountry);
  const normalizedPhone = parsedPhone?.number ?? '';
  const isPhoneValidValue = parsedPhone?.isValid() ?? false;
  const canNextFromWelcome =
    email.trim().length > 0 &&
  isPhoneValidValue &&
    password.length >= 6 &&
    password === confirmPassword;
  const canNextFromName = firstName.trim().length > 0 && lastName.trim().length > 0;
  const canNextFromBio = bio.trim().length > 0;

  async function createAccount() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!isPhoneValidValue) {
      throw new Error('Please enter a valid phone number for 2FA, including country code.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone_number: normalizedPhone,
          phone_country: phoneCountry,
        },
      },
    });
    if (error) throw error;
    if (!data.session) {
      Alert.alert('Check your email', 'Please confirm your email to finish setting up your account.');
      router.replace('/(auth)/login');
      return false;
    }
    return true;
  }

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
  router.replace('/(tabs)/home');
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else router.back();
  }

  async function next() {
    try {
      setSaving(true);
      if (step === 0) {
        if (!canNextFromWelcome) return;
        const created = await createAccount();
        if (!created) return;
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
  router.replace('/(tabs)/home');
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

          <BrandHeader layout="row" align="center" style={{ marginBottom: 8 }} />

          {step === 0 && (
            <View style={styles.centerWrap}>
              <Text style={styles.welcomeTitle}>Welcome!</Text>
              <Text style={styles.subtitle}>Create your account to get started.</Text>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Phone number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryPickerCompact}>
                  <Text style={styles.countryPickerValue}>
                    {`${phoneCountry} +${getCountryCallingCode(phoneCountry)}`}
                  </Text>
                  <Picker
                    selectedValue={phoneCountry}
                    onValueChange={(value) => setPhoneCountry(value as CountryCode)}
                    style={styles.countryPickerCompactInput}
                  >
                    {COUNTRY_OPTIONS.map((country) => (
                      <Picker.Item
                        key={country.code}
                        label={`${country.code} +${getCountryCallingCode(country.code as any)}`}
                        value={country.code}
                      />
                    ))}
                  </Picker>
                </View>
                <TextInput
                  placeholder="Phone number for 2FA"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  style={[styles.input, styles.phoneInput]}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
              </View>
              <Text style={styles.helperText}>We’ll use this for two-factor verification.</Text>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                placeholder="Password (min 6 chars)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
              />
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <TextInput
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.link}>{showPassword ? 'Hide password' : 'Show password'}</Text>
              </Pressable>
              <Pressable disabled={!canNextFromWelcome || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromWelcome || saving) && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Creating…' : 'Create Account'}</Text>
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
  safe: { flex: 1, backgroundColor: '#F7FAFB' },
  scroll: { flexGrow: 1, padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backLink: { color: '#B8783A', fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D8E6EE' },
  dotActive: { backgroundColor: '#0C1620' },
  centerWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start', paddingTop: 24, gap: 8 },
  welcomeTitle: { fontSize: 32, fontWeight: '800', color: '#0C1620' },
  bigTitle: { fontSize: 32, fontWeight: '800', color: '#0C1620', marginTop: 16 },
  subtitle: { color: '#4A7A9B', marginTop: 4, marginBottom: 8, textAlign: 'left' },
  formWrap: { gap: 12, width: '100%' },
  fieldLabel: { color: '#4A7A9B', fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 4, marginBottom: -2 },
  helperText: { color: '#7B8E9C', fontSize: 12, marginTop: -2, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#0C1620', height: 48 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryPickerCompact: { width: 96, height: 48, borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, justifyContent: 'center', backgroundColor: '#FFFFFF', position: 'relative' },
  countryPickerValue: { color: '#0C1620', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  countryPickerCompactInput: { width: '100%', height: 44, color: '#0C1620', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0 },
  phoneInput: { flex: 1 },
  primaryBtn: { backgroundColor: '#B8783A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F7FAFB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#0C1620', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  link: { color: '#B8783A', fontWeight: '600' },
  muted: { color: '#4A7A9B', marginTop: 10, textAlign: 'center' },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  personText: { color: '#0C1620', fontWeight: '500' },
  removeLink: { color: '#B8783A', fontWeight: '600' },
});