import { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
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
      router.replace('/');
    } catch (e:any) {
      Alert.alert('Login failed', e.message ?? 'Check email/password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Welcome back</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}/>
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}/>
      <Button title={loading ? 'Logging in…' : 'Log in'} onPress={onLogin} disabled={loading}/>
      <Text>No account? <Link href="/(auth)/signup">Sign up</Link></Text>
      <Text>Forgot your password? <Link href="/(auth)/forgot">Reset it</Link>
      </Text>
    </View>
  );
}