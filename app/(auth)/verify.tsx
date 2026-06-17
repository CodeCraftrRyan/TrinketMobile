import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; email?: string; returnTo?: string }>();
  const userId = params.userId ?? '';
  const email = params.email ?? '';
  const returnTo = params.returnTo ?? '';

  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  function getSupabaseUrl() {
    const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
    const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL || '').trim();
    if (!url) throw new Error('Missing Supabase URL configuration');
    return url.replace(/\/$/, '');
  }

  // Auto-send an email code once when arriving at this screen.
  useEffect(() => {
    if (!sent && email) {
      void sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendCode() {
    try {
      setSending(true);
      const base = getSupabaseUrl();
      const sendUrl = `${base}/functions/v1/account-verification/send`;
      const payload = { userId, method: 'email', destination: email };
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
      if (!resp.ok || json?.ok === false) throw new Error(json?.error || json?.msg || text || 'Failed to send code');
      setSent(true);
      Alert.alert('Code sent', 'A verification code was sent to your email.');
    } catch (err: any) {
      void err;
      Alert.alert('Send failed', err?.message ?? 'Please try again');
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    try {
      const base = getSupabaseUrl();
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
        <Text style={styles.subtitle}>Enter the 6-digit code we emailed to {email || 'you'}.</Text>

        {sent && (
          <>
            <TextInput value={code} onChangeText={setCode} style={styles.input} keyboardType="numeric" placeholder="123456" maxLength={6} />
            <Pressable onPress={verify} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Verify</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={sendCode} disabled={sending} style={[styles.resendBtn, sending && styles.btnDisabled]}>
          <Text style={styles.resendBtnText}>{sending ? 'Sending…' : 'Resend code'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#4A7A9B', marginTop: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#0C1620', height: 48, marginTop: 16, textAlign: 'center', fontSize: 22, letterSpacing: 6 },
  primaryBtn: { backgroundColor: '#4A7A9B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  resendBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  resendBtnText: { color: '#5E7E94', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
