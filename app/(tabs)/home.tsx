import { Link } from 'expo-router';
import { Button, Text, View } from 'react-native';
import Screen from '../../components/Screen';

export default function Home() {
  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Welcome to Trinket</Text>
      <Text>Trinket helps you create a beautiful digital archive of your most meaningful possessions, preserving their stories and memories for generations to come.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Link href="/(tabs)/items">
          <Button title="View Items" />
        </Link>
        <Link href="/(tabs)/items">
          <Button title="Add Item" />
        </Link>
      </View>
      <Text style={{ opacity: 0.6 }}>
        Tip: use the Items tab to add and organize your stuff.
      </Text>
    </Screen>
  );
}