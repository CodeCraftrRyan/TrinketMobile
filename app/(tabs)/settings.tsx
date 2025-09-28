import { Text, Button, View } from 'react-native';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';

export default function Settings() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Settings</Text>
      <View style={{ gap: 8 }}>
        <Button title="Log out" onPress={() => supabase.auth.signOut()} />
      </View>
      <Text style={{ opacity: 0.6 }}>More settings coming soon.</Text>
    </Screen>
  );
}