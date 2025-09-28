import { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSignUp() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert('Check your email', 'Confirm your email to finish signup.');
      router.replace('/');
    } catch (e:any) {
      Alert.alert('Sign up failed', e.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Create account</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}/>
      <TextInput placeholder="Password (min 6 chars)" secureTextEntry
        value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}/>
      <Button title={loading ? 'Creating…' : 'Sign up'} onPress={onSignUp} disabled={loading}/>
      <Text>Have an account? <Link href="/(auth)/login">Log in</Link></Text>
    </View>
  );
}