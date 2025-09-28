import { ReactNode } from 'react';
import { SafeAreaView, View } from 'react-native';

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        {children}
      </View>
    </SafeAreaView>
  );
}