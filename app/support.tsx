import { useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const SUPPORT_EMAIL = 'support@trinket.app';

export default function SupportLockout() {
  const router = useRouter();

  async function contactSupport() {
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Trinket account access')}`;
    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      await Linking.openURL(mailto);
      return;
    }
    router.push('/contact');
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert('Sign out failed', e?.message ?? 'Please try again');
      return;
    }
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Account Access Paused</Text>
        <Text style={styles.body}>
          We couldn’t confirm an active subscription for this account, so access has been paused.
          If you believe this is a mistake, please contact support and we’ll help right away.
        </Text>
        <View style={styles.actions}>
          <Button title="Contact Support" onPress={contactSupport} />
          <Button title="Manage Membership" onPress={() => router.push('/membership')} variant="soft" />
          <Button title="Sign Out" onPress={signOut} variant="ghost" />
        </View>
        <Text style={styles.note}>Support email: {SUPPORT_EMAIL}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { color: '#5B6470', lineHeight: 22 },
  actions: { gap: 10 },
  note: { color: '#8A94A3', fontSize: 12 },
});
