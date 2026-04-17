import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onLogin() {
    try {
      setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // After login, go to home
  router.replace('/(tabs)/home');
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

          {/* Title and subtitle */}
          <Text style={styles.bigTitle}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your collection</Text>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                placeholder="[email protected]"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#4A7A9B"
                style={[styles.input, email && styles.inputActive]}
                returnKeyType="next"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#4A7A9B"
                style={[styles.input, password && styles.inputActive]}
              />
            </View>
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot')} style={styles.forgotLinkWrap}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onLogin}
              disabled={loading || !email || !password}
              style={[styles.primaryBtn, (loading || !email || !password) && styles.btnDisabled]}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Logging in…' : 'Log In'}</Text>
            </TouchableOpacity>
          </View>

          {/* Signup link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don&apos;t have an account? <Text style={styles.signupLink} onPress={() => router.push('/(auth)/signup')}>Sign up</Text></Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFB' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 18 },
  logoCircle: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#D8E6EE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D8E6EE' },
  logoTitle: { fontSize: 22, fontWeight: '700', color: '#0C1620' },
  logoSubtitle: { fontSize: 15, color: '#4A7A9B', fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  bigTitle: { fontSize: 32, fontWeight: '800', color: '#0C1620', marginBottom: 2, textAlign: 'left' },
  subtitle: { color: '#4A7A9B', marginBottom: 18, fontSize: 16, textAlign: 'left' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#D8E6EE', marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: '#4A7A9B', fontWeight: '700', fontSize: 15, marginBottom: 4, letterSpacing: 1 },
  input: { backgroundColor: '#F7FAFB', borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#0C1620', fontSize: 17 },
  inputActive: { borderColor: '#B8783A' },
  forgotLinkWrap: { alignItems: 'flex-end', marginBottom: 12 },
  forgotLink: { color: '#B8783A', fontWeight: '700', fontSize: 16 },
  primaryBtn: { backgroundColor: '#B8783A', borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 2, marginBottom: 2, shadowColor: '#B8783A', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 22, letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.5 },
  signupRow: { alignItems: 'center', marginBottom: 8 },
  signupText: { color: '#4A7A9B', fontSize: 16 },
  signupLink: { color: '#B8783A', fontWeight: '700', fontSize: 16 },
});