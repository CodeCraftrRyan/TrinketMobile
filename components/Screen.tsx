import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View, useWindowDimensions } from 'react-native';
import { useAccessibilitySettings } from '../lib/accessibility';
import { tokens } from '../lib/tokens';
import BrandHeader from './ui/BrandHeader';

export default function Screen({ children }: { children: ReactNode }) {
  const { settings } = useAccessibilitySettings();
  const backgroundColor = settings.highContrast ? '#FFFFFF' : tokens.colors.bg;
  const scale = settings.largeText ? 1.3 : 1;
  const { width, height } = useWindowDimensions();
  const paddedWidth = width * scale + 60;
  const paddedHeight = height * scale + 60;
  const content = settings.largeText ? (
    <View
      style={{
        minWidth: paddedWidth,
        minHeight: paddedHeight,
        padding: 20,
        gap: 12,
        transform: [{ scale }],
        transformOrigin: 'top left' as any,
      }}
    >
      <BrandHeader style={{ marginTop: 4, marginBottom: 4 }} />
      {children}
    </View>
  ) : (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <BrandHeader style={{ marginTop: 4, marginBottom: 4 }} />
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {settings.largeText ? (
        <ScrollView
          horizontal
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ minWidth: paddedWidth, paddingRight: 40 }}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ minHeight: paddedHeight, paddingBottom: 40 }}
          >
            {content}
          </ScrollView>
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}