import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { theme } from '../lib/theme';

export default function MembershipSuccess() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#EAF6EF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 42 }}>✅</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.primary, textAlign: 'center' }}>Subscription confirmed</Text>
        <Text style={{ fontSize: 16, color: theme.muted, textAlign: 'center' }}>
          Thanks for upgrading! Your plan is active and ready to use.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          style={{ marginTop: 6, backgroundColor: theme.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Go to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/membership')}
          style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Text style={{ color: theme.accentCool, fontWeight: '600', fontSize: 15 }}>Manage Membership</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
