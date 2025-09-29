import { Button, Text, View } from 'react-native';
import Screen from '../../components/Screen';

export default function Items() {
  // placeholder list
  const items: any[] = [];

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Your Items</Text>

      {items.length === 0 ? (
        <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
          <Text style={{ marginBottom: 8 }}>No items yet.</Text>
          <Button title="Add your first item" onPress={() => { /* TODO: open form */ }} />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {/* map items here later */}
        </View>
      )}
    </Screen>
  );
}