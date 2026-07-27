/* TK_THEME */
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../components/ui/BrandHeader';
import { tokens } from '../lib/tokens';

export default function Welcome() {
  const router = useRouter();

  /* Buttons on the dark ground: bronze stroke, never a fill. */
  const btn = {
    width: '88%' as const,
    minHeight: tokens.minTarget,
    paddingVertical: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    marginBottom: 12,
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.surfaceDark }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 60, paddingBottom: 40 }}>
          <BrandHeader
            layout="column"
            align="center"
            iconSize={42}
            iconBackgroundSize={28}
            iconBackgroundRadius={tokens.radius.mark}
            textColor={tokens.colors.onDark}
            subtitle="Your personal archive"
            subtitleColor={tokens.colors.onDarkLabel}
            style={{ marginBottom: 24 }}
            titleStyle={{ fontSize: 46, fontFamily: tokens.fonts.display, letterSpacing: -0.5 }}
            subtitleStyle={{ ...tokens.type.label, color: tokens.colors.onDarkLabel }}
          />

          <Text
            style={{
              ...tokens.type.lead,
              color: tokens.colors.onDarkBody,
              textAlign: 'center',
              marginBottom: 36,
              paddingHorizontal: 32,
            }}
          >
            The things you own, and where each of them came from.
          </Text>

          <TouchableOpacity
            style={{ ...btn, borderColor: tokens.colors.accent }}
            onPress={() => router.push('/(auth)/signup')}
            accessibilityRole="button"
          >
            <Text style={{ ...tokens.type.button, color: tokens.colors.onDark }}>Start your archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ ...btn, borderColor: tokens.colors.ruleDark }}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
          >
            <Text style={{ ...tokens.type.button, color: tokens.colors.onDarkBody }}>I already have one</Text>
          </TouchableOpacity>

          {/* Development affordance: walks past authentication. */}
          {__DEV__ && (
            <TouchableOpacity
              style={{ ...btn, borderColor: 'transparent' }}
              onPress={() => router.push('/(tabs)/items')}
              accessibilityRole="button"
            >
              <Text style={{ ...tokens.type.button, color: tokens.colors.onDarkLabel }}>Preview logged in</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            {['Terms of Use', 'Privacy Policy', 'Subscription Terms'].map((txt, i) => (
              <TouchableOpacity key={txt} onPress={() => {}} accessibilityRole="link">
                <Text style={{ ...tokens.type.ui, fontSize: 14, color: tokens.colors.onDarkLabel, marginHorizontal: 4 }}>
                  {txt}{i < 2 ? ' ·' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
