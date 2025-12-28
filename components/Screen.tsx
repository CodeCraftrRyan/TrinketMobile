import { ReactNode } from 'react';
import { SafeAreaView, View } from 'react-native';

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EFF6FA' }}>
      <View style={{ flex: 1, padding: 20, gap: 12 }}>
        {children}
      </View>
    </SafeAreaView>
  );
}