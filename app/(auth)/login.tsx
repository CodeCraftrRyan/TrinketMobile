import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onLogin() {
    try {
      setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // After login, go to items (dashboard removed)
  router.replace('/(tabs)/items');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Check email/password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to Trinket</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { paddingRight: 56 }]}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.showBtn}>
                  <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Actions */}
            <Pressable
              onPress={onLogin}
              disabled={loading || !email || !password}
              style={[styles.primaryBtn, (loading || !email || !password) && styles.btnDisabled]}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Logging in…' : 'Log in'}</Text>
            </Pressable>

            <View style={styles.linksRow}>
              <Link href="/(auth)/forgot"><Text style={styles.link}>Forgot password?</Text></Link>
              <Text style={styles.muted}>No account? <Text onPress={() => router.push('/(auth)/signup')} style={styles.link}>Sign up</Text></Text>
            </View>
          </View>

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our Terms & Privacy.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  header: { marginTop: 32, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6B7280' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fieldGroup: { gap: 6 },
  label: { color: '#111827', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: '#111827' },
  showBtn: { position: 'absolute', right: 6, top: '50%', marginTop: -18, paddingHorizontal: 10, paddingVertical: 6 },
  showText: { color: '#2563EB', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  linksRow: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: '#2563EB', fontWeight: '600' },
  muted: { color: '#6B7280' },
  footer: { alignItems: 'center', marginTop: 16, marginBottom: 8 },
  footerText: { color: '#9CA3AF', fontSize: 12 },
});