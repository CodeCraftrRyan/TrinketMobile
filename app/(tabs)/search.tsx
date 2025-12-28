import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import TabHeader from '../../components/ui/TabHeader';

export default function Search() {
  return (
    <Screen>
      <TabHeader title="Search" />

      <View style={styles.center}>
        <Text style={styles.placeholder}>Search will appear here</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#6B7280' },
});