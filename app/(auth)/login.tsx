import { useState } from 'react';
import { View, TextInput, Pressable, Text, Alert } from 'react-native';
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
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Check email/password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-bg p-4">
      <View className="bg-card rounded-md p-4 border border-border gap-3">
        <Text className="text-text text-xl font-semibold">Welcome back</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#9CA3AF"
          className="border border-border rounded-md px-3 py-3 text-text"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#9CA3AF"
          className="border border-border rounded-md px-3 py-3 text-text"
        />

        <Pressable
          onPress={onLogin}
          disabled={loading}
          className={`bg-primary rounded-md px-4 py-3 ${loading ? 'opacity-50' : ''}`}
        >
          <Text className="text-white text-base text-center">{loading ? 'Logging in…' : 'Log in'}</Text>
        </Pressable>

        <Text className="text-muted">
          No account? <Link href="/(auth)/signup">Sign up</Link>
        </Text>
        <Text className="text-muted">
          Forgot your password? <Link href="/(auth)/forgot">Reset it</Link>
        </Text>
      </View>
    </View>
  );
}