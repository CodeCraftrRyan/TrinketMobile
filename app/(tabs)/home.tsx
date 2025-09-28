import { Text, Button, View } from 'react-native';
import Screen from '../../components/Screen';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Welcome to Trinket 👋</Text>
      <Text>Quick actions</Text>
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