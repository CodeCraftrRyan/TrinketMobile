import { View, Text, Button } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Home() {
  return (
    <View style={{ padding: 24 }}>
      <Text>Home — logged in ✅</Text>
      <Button title="Log out" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}