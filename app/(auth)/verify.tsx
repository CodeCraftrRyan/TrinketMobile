import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; email?: string; returnTo?: string }>();
  const userId = params.userId ?? '';
  const email = params.email ?? '';
  const returnTo = params.returnTo ?? '';

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState('');

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
      setNote('');
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
      setNote('We sent a 6-digit code to your email.');
    } catch (err: any) {
      void err;
      setNote("We couldn't send the code just now — tap Resend in a moment.");
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    try {
      setVerifying(true);
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
        setNote(json?.error || json?.msg || "That code doesn't match — check it and try again.");
        return;
      }
      if (returnTo) {
        router.replace(returnTo as unknown as any);
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      void err;
      Alert.alert('Verification failed', err?.message ?? 'Please try again');
    } finally {
      setVerifying(false);
    }
  }

  const canVerify = code.length === 6 && !verifying;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandHeader layout="row" align="center" style={{ marginBottom: 28 }} />

        <Text style={styles.eyebrow}>CONFIRM YOUR ACCOUNT</Text>
        <Text style={styles.title}>Verify your account</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we emailed to {email || 'you'}.
        </Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Verification code</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            style={styles.input}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="123456"
            placeholderTextColor={c.placeholder}
            maxLength={6}
            autoFocus
          />

          {!!note && <Text style={styles.note}>{note}</Text>}

          <Pressable
            onPress={verify}
            disabled={!canVerify}
            accessibilityRole="button"
            style={[styles.primaryBtn, !canVerify && styles.btnDisabled]}
          >
            <Text style={styles.primaryBtnText}>{verifying ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>

          <Pressable onPress={sendCode} disabled={sending} style={styles.resendBtn}>
            <Text style={[styles.resendBtnText, sending && styles.btnDisabled]}>
              {sending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  container: { flexGrow: 1, padding: 20 },

  eyebrow: { color: c.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.8, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '600', color: c.ink, letterSpacing: -0.4 },
  subtitle: { color: c.muted, marginTop: 8, fontSize: 16, lineHeight: 23, marginBottom: 24 },

  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.lg,
    padding: 20,
  },
  fieldLabel: { color: c.ink, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    color: c.ink,
    minHeight: 56,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  note: {
    marginTop: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg,
    color: c.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: tokens.radius.sm,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 20,
  },
  primaryBtnText: { color: c.primaryText, fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  resendBtn: { paddingVertical: 14, alignItems: 'center' },
  resendBtnText: { color: c.accentCool, fontWeight: '500', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
