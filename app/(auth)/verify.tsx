import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; email?: string; phone?: string; returnTo?: string; devDummy?: string }>();
  const userId = params.userId ?? '';
  const email = params.email ?? '';
  const phone = params.phone ?? '';
  const returnTo = params.returnTo ?? '';

  const [method, setMethod] = useState<'email' | 'sms'>(email ? 'email' : (phone ? 'sms' : 'email'));
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  // Known demo code when bypassing actual send
  const DEMO_CODE = '111111';

  const demoBypass = __DEV__ || params.devDummy === '1' || userId === 'dev-dummy-user';

  useEffect(() => {
    // keep method in sync with supplied params
    // destination state was unused and removed to satisfy lint rules
  }, [method, email, phone]);

  async function sendCode(selectedMethod: 'email' | 'sms') {
    try {
  setSending(true);
  setMethod(selectedMethod);
      // Build absolute Supabase Edge Function URL to work in TestFlight/native builds
      const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
      const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL || '').trim();
      if (!SUPABASE_URL) throw new Error('Missing Supabase URL configuration');
      const base = SUPABASE_URL.replace(/\/$/, '');
      const sendUrl = `${base}/functions/v1/account-verification/send`;
      // Demo bypass: do not call backend, just show the code
      if (demoBypass) {
        setSent(true);
        setCode(DEMO_CODE);
        Alert.alert('Demo code', `Use ${DEMO_CODE} to verify (demo mode).`);
        return;
      }

      const payload = { userId, method: selectedMethod, destination: selectedMethod === 'email' ? email : phone };
      console.log('[verify] sendCode -> url:', sendUrl, 'payload:', payload);
      const resp = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json response */ }
      console.log('[verify] sendCode response:', resp.status, text);
      if (!resp.ok) throw new Error((json?.error) || json?.msg || text || 'Failed to send code');
      setSent(true);
      Alert.alert('Code sent', `A verification code was sent to your ${selectedMethod}.`);
    } catch (err: any) {
      void err;
      Alert.alert('Send failed', err?.message ?? 'Please try again');
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    try {
      // Demo bypass: accept the DEMO_CODE without backend check
      if (demoBypass) {
        if (code !== DEMO_CODE) {
          Alert.alert('Invalid code', 'Please enter the demo code shown when sending.');
          return;
        }
        Alert.alert('Verified', 'Demo verification succeeded.');
        if (returnTo) {
          router.replace(returnTo as unknown as any);
        } else {
          router.replace('/(auth)/login');
        }
        return;
      }

  const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  // Previously this accidentally fell back to the ANON_KEY which produced an invalid base URL.
  const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL || '').trim();
      if (!SUPABASE_URL) throw new Error('Missing Supabase URL configuration');
      const base = SUPABASE_URL.replace(/\/$/, '');
      const verifyUrl = `${base}/functions/v1/account-verification/verify`;

      const payload = { userId, code };
      console.log('[verify] verify -> url:', verifyUrl, 'payload:', payload);
      const resp = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json response */ }
      console.log('[verify] verify response:', resp.status, text);
      if (!resp.ok || (json && json.ok === false)) {
        Alert.alert('Invalid code', json?.error || json?.msg || 'Please check the code and try again.');
        return;
      }
      Alert.alert('Verified', 'Your account is confirmed.');
      // Redirect back to signup to continue onboarding if returnTo provided
      if (returnTo) {
        router.replace(returnTo as unknown as any);
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      void err;
      Alert.alert('Verification failed', err?.message ?? 'Please try again');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandHeader layout="row" align="center" />
        <Text style={styles.title}>Verify your account</Text>
  <Text style={styles.subtitle}>Choose how you would like to receive a confirmation code.</Text>

        <View style={{ marginTop: 12 }}>
          <Pressable onPress={() => sendCode('email')} disabled={!email || sending} style={[styles.primaryBtn, (!email || sending) && styles.btnDisabled]}>
            <Text style={styles.primaryBtnText}>{sending ? 'Sending…' : `Send Email Code${email ? '' : ' (no email)'}`}</Text>
          </Pressable>
          <Pressable onPress={() => sendCode('sms')} disabled={!phone || sending} style={[styles.primaryBtn, (!phone || sending) && styles.btnDisabled, { marginTop: 12 }]}>
            <Text style={styles.primaryBtnText}>{sending ? 'Sending…' : `Send Text Code${phone ? '' : ' (no phone)'}`}</Text>
          </Pressable>
        </View>

        {sent && (
          <>
            <Text style={{ marginTop: 12 }}>Enter the 6-digit code you received:</Text>
            <TextInput value={code} onChangeText={setCode} style={styles.input} keyboardType="numeric" placeholder="123456" maxLength={6} />
            <Pressable onPress={verify} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Verify</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#4A7A9B', marginTop: 6 },
  option: { padding: 12, borderRadius: 10, backgroundColor: '#F7FAFB', marginTop: 8 },
  optionActive: { backgroundColor: '#D8E6EE' },
  optionText: { fontWeight: '600' },
  primaryBtn: { backgroundColor: '#B8783A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#0C1620', height: 48, marginTop: 8 },
});
