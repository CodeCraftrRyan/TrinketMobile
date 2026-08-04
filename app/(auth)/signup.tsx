import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

export default function SignUp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; email?: string; phone?: string }>();
  const devParams = useLocalSearchParams<{ devDummy?: string }>();

  // Steps: 0 = Welcome, 1 = Name, 2 = People List
  const [step, setStep] = useState<number>(() => {
    const s = parseInt(params.step ?? '0', 10);
    return isNaN(s) ? 0 : s;
  });
  const totalSteps = 3;

  // Form state
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [saving, setSaving] = useState(false);

  const canNextFromWelcome = email.trim().length > 0 && password.length >= 8;
  const canNextFromName = firstName.trim().length > 0 && lastName.trim().length > 0;

  async function createAccount() {
    // Dev shortcut: if ?devDummy=1 is present, prefill a dummy account and
    // skip real network sign up so QA can test onboarding UI locally.
    if (devParams?.devDummy === '1') {
      // Prefill sensible dummy values and return false to simulate 'needs verification'
      setEmail('dev+test@example.com');
      setFirstName('Test');
      setLastName('User');
      setPassword('DevTest123!');
      // Simulate the no-session path so the app navigates to verify flow
      const userId = 'dev-dummy-user';
      const returnTo = `/(auth)/signup?step=1&email=${encodeURIComponent('dev+test@example.com')}`;
      router.push(`/(auth)/verify?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent('dev+test@example.com')}&returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    // Basic strength check: require letters + numbers (simple heuristic)
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      throw new Error('Password must include both letters and numbers.');
    }
    let resultData: any = null;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          },
        },
      });
      if (error) {
        const msg = (error?.message) || JSON.stringify(error);
        throw new Error(msg);
      }
      resultData = data;
    } catch (err: any) {
      if (err?.status === 504 || (err?.message || '').toLowerCase().includes('timeout')) {
        throw new Error('Network timeout: could not reach authentication server. Please try again.');
      }
      throw err;
    }
    const data = resultData as any;
    // Always route to email verification after signup, even if Supabase
    // returned a session (confirm-email is off, so a session always comes back).
    const userId = data.user?.id ?? '';
    const returnTo = `/(auth)/signup?step=1&email=${encodeURIComponent(trimmedEmail)}`;
    router.push(`/(auth)/verify?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(trimmedEmail)}&returnTo=${encodeURIComponent(returnTo)}`);
    return false;
  }

  async function saveName() {
    const full_name = `${firstName} ${lastName}`.trim();
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, full_name } });
      if (error) throw error;
    } catch (e: any) {
      // Dev bypass: allow continuing through onboarding even if updateUser fails
      if (devParams?.devDummy === '1' || __DEV__) {
        console.warn('saveName: updateUser failed but continuing in dev mode:', e?.message ?? e);
        return;
      }
      throw e;
    }
  }

  async function savePeopleAndFinish() {
    try {
      const { error } = await supabase.auth.updateUser({ data: { people_list: people } });
      if (error) throw error;
    } catch (e: any) {
      if (devParams?.devDummy === '1' || __DEV__) {
        console.warn('savePeopleAndFinish: updateUser failed but continuing in dev mode:', e?.message ?? e);
      } else {
        throw e;
      }
    }
    // After saving people, navigate to home
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
        // Plan selection removed — everyone starts Free (seeded by the DB trigger).
        // Upgrading happens on the web. Go straight to the people step.
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
              <Text style={styles.welcomeTitle}>Create your account</Text>
              <Text style={[styles.subtitle, { marginTop: 6 }]}>Begin preserving the stories that matter most.</Text>

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Email address</Text>
              <TextInput
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholderTextColor={c.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Create a password</Text>
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholderTextColor={c.placeholder}
                secureTextEntry
                textContentType="newPassword"
                importantForAutofill="yes"
              />

              <Pressable disabled={!canNextFromWelcome || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromWelcome || saving) && styles.btnDisabled, { marginTop: 18 }]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Creating…' : 'Sign up'}</Text>
              </Pressable>

              <Pressable onPress={() => router.push('/(auth)/login')} style={{ marginTop: 12 }}>
                <Text style={[styles.subtitle, { textAlign: 'center' }]}>Already have an account? <Text style={styles.link}>Log in</Text></Text>
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
                placeholderTextColor={c.placeholder}
              />
              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                placeholderTextColor={c.placeholder}
              />
              <Pressable disabled={!canNextFromName || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromName || saving) && styles.btnDisabled]}>
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
                  placeholderTextColor={c.placeholder}
                />
                <Pressable onPress={addPerson} style={[styles.secondaryBtn, { paddingHorizontal: 16 }]}>
                  <Text style={styles.secondaryBtnText}>Add</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 8 }}>
                {people.length === 0 ? (
                  <Text style={styles.muted}>No people yet. Add a few now or skip.</Text>
                ) : people.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.personRow}>
                    <Text style={styles.personText}>{item}</Text>
                    <Pressable onPress={() => removePerson(index)}>
                      <Text style={styles.removeLink}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

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
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 20 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backLink: { color: c.accentDeep, fontWeight: '500', fontSize: 15 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 28, height: 2, backgroundColor: c.border },
  dotActive: { backgroundColor: c.ink },

  centerWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start', paddingTop: 20 },
  formWrap: { gap: 14, width: '100%', paddingTop: 20 },

  welcomeTitle: { fontSize: 32, fontWeight: '600', color: c.ink, letterSpacing: -0.4 },
  bigTitle: { fontSize: 32, fontWeight: '600', color: c.ink, letterSpacing: -0.4, marginTop: 4 },
  subtitle: { color: c.muted, marginTop: 6, marginBottom: 8, fontSize: 16, lineHeight: 23 },

  fieldLabel: { color: c.ink, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  helperText: { color: c.muted, fontSize: 14, marginTop: 8 },

  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: c.ink,
    fontSize: 16,
    minHeight: 48,
  },

  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: tokens.radius.sm,
    paddingVertical: 17,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  primaryBtnText: { color: c.primaryText, fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  secondaryBtn: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnText: { color: c.ink, fontWeight: '500', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  link: { color: c.accentDeep, fontWeight: '500' },
  muted: { color: c.muted, marginTop: 12, textAlign: 'center', fontSize: 15 },

  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    backgroundColor: c.card,
    marginTop: 8,
  },
  personText: { color: c.ink, fontWeight: '500', fontSize: 15 },
  removeLink: { color: c.accentDeep, fontWeight: '500', fontSize: 14 },
});
