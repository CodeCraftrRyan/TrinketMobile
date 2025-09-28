import { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSend() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Check your email', 'We sent a password reset link.');
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Reset password</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />
      <Button title={loading ? 'Sending…' : 'Send reset link'} onPress={onSend} disabled={loading || !email} />
      <Text>
        Back to <Link href="/(auth)/login">Log in</Link>
      </Text>
    </View>
  );
}