import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

// Reached from Login ("Forgot?") and from Account ("Password → Change").
// The reset link opens the website, where the new password is set; the app
// has no in-app reset screen, so say so rather than leave people waiting for
// something to happen here.
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Signed-in users (from Account) don't need to type their address.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const e = data?.session?.user?.email;
      if (e) setEmail(e);
    }).catch(() => {});
  }, []);

  async function onSend() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://www.yourtrinkets.com/User',
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      Alert.alert("Couldn't send that", e?.message ?? 'Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !email.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <BrandHeader
            style={styles.logoRow}
            subtitle="YOUR PERSONAL ARCHIVE"
            iconSize={26}
            iconBackgroundColor="transparent"
            iconBackgroundBorderColor="transparent"
            iconBackgroundSize={54}
            iconBackgroundRadius={18}
            titleStyle={styles.logoTitle}
            subtitleStyle={styles.logoSubtitle}
          />

          <Text style={styles.bigTitle}>Reset your password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? `We've emailed a link to ${email.trim()}. It opens Trinket on the web, where you'll choose a new password. Then come back here and log in with it.`
              : "We'll email you a link. It opens Trinket on the web, where you'll choose a new password, then you can log in here with it."}
          </Text>

          {!sent && (
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor={c.placeholder}
                  style={styles.input}
                  returnKeyType="send"
                  onSubmitEditing={() => { if (!disabled) onSend(); }}
                />
              </View>

              <TouchableOpacity
                onPress={onSend}
                disabled={disabled}
                accessibilityRole="button"
                style={[styles.primaryBtn, disabled && styles.btnDisabled]}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Sending…' : 'Send the link'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.backRow}>
            <Text style={styles.backText}>
              <Text style={styles.backLink} onPress={() => router.back()}>
                {sent ? 'Done' : 'Back'}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },

  logoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 28 },
  logoTitle: { fontSize: 24, fontWeight: '600', color: c.ink },
  logoSubtitle: { fontSize: 11, color: c.muted, fontWeight: '500', letterSpacing: 1.6, marginTop: 3 },

  bigTitle: { fontSize: 34, fontWeight: '600', color: c.ink, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { color: c.muted, marginBottom: 24, fontSize: 16, lineHeight: 23 },

  formCard: {
    backgroundColor: c.card,
    borderRadius: tokens.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 18 },
  inputLabel: { color: c.ink, fontWeight: '500', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: c.bg,
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
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: { color: c.primaryText, fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.5 },

  backRow: { alignItems: 'center' },
  backText: { color: c.muted, fontSize: 15 },
  backLink: { color: c.accentDeep, fontWeight: '500' },
});
