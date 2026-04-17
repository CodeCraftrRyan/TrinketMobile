import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
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
      <BrandHeader style={{ marginBottom: 8 }} />
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