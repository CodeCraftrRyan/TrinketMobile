import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onLogin() {
    try {
      setLoading(true);
      // Trim: a trailing space from autofill or a paste is invisible and
      // fails the sign-in with no explanation.
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Check email/password');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !email || !password;

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

          <Text style={styles.eyebrow}></Text>
          <Text style={styles.bigTitle}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log into your account.</Text>

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
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <Text style={styles.forgotLink} onPress={() => router.push('/(auth)/forgot')}>
                  Forgot?
                </Text>
              </View>
              <TextInput
                placeholder="Your password"
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={c.placeholder}
                style={styles.input}
                onSubmitEditing={() => { if (!disabled) onLogin(); }}
              />
              <Text style={styles.toggleLink} onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide password' : 'Show password'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onLogin}
              disabled={disabled}
              accessibilityRole="button"
              style={[styles.primaryBtn, disabled && styles.btnDisabled]}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Log in'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>
              New to Trinket?{' '}
              <Text style={styles.signupLink} onPress={() => router.push('/(auth)/signup')}>
                Create an account
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

  eyebrow: { color: c.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.8, marginBottom: 10 },
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
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
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
  toggleLink: { color: c.accentCool, fontSize: 14, marginTop: 10 },
  forgotLink: { color: c.accentCool, fontSize: 14 },

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

  signupRow: { alignItems: 'center' },
  signupText: { color: c.muted, fontSize: 15 },
  signupLink: { color: c.accentDeep, fontWeight: '500' },
});
