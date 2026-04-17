import { CormorantGaramond_300Light, CormorantGaramond_300Light_Italic, CormorantGaramond_400Regular, CormorantGaramond_500Medium, useFonts as useCormorantFonts } from '@expo-google-fonts/cormorant-garamond';
import { DMMono_300Light, DMMono_400Regular, useFonts as useDMMonoFonts } from '@expo-google-fonts/dm-mono';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSansFonts } from '@expo-google-fonts/dm-sans';
import { Stack } from "expo-router";
import { StatusBar, Text, TextInput } from 'react-native';
import { AccessibilityProvider, useAccessibilitySettings } from '../lib/accessibility';
import { theme } from '../lib/theme';
import { tokens } from '../lib/tokens';

const textComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
const textInputComponent = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
const initialTextStyle = textComponent.defaultProps?.style;
const initialInputStyle = textInputComponent.defaultProps?.style;
const baseTokenColors = { ...tokens.colors };
const baseThemeColors = { ...theme };

function AccessibilityTextDefaults() {
  const { settings } = useAccessibilitySettings();
  const scale = settings.largeText ? 1.2 : 1;
  const fontSize = 15 * scale;
  const textColor = settings.highContrast ? tokens.colors.ink : tokens.colors.inkMid;

  if (settings.highContrast) {
    tokens.colors.bg = '#FFFFFF';
    tokens.colors.card = '#FFFFFF';
    tokens.colors.text = '#000000';
    tokens.colors.ink = '#000000';
    tokens.colors.inkMid = '#000000';
    tokens.colors.inkLight = '#000000';
    tokens.colors.inkGhost = '#000000';
    tokens.colors.primary = '#000000';
    tokens.colors.border = '#000000';
    tokens.colors.borderStrong = '#000000';
    tokens.colors.accent = '#000000';
    tokens.colors.surface = '#FFFFFF';
    tokens.colors.surfaceSoft = '#FFFFFF';
    tokens.colors.tint = '#FFFFFF';
    tokens.colors.accentCool = '#000000';
    tokens.colors.accentWarm = '#000000';

    theme.background = '#FFFFFF';
    theme.card = '#FFFFFF';
    theme.primary = '#000000';
    theme.muted = '#000000';
    theme.accent = '#000000';
    theme.list = '#000000';
    theme.softBlue = '#FFFFFF';
    theme.gold = '#000000';
    theme.offWhite = '#FFFFFF';
    theme.border = '#000000';
    theme.borderStrong = '#000000';
    theme.inkLight = '#000000';
    theme.inkGhost = '#000000';
    theme.accentCool = '#000000';
  } else {
    Object.assign(tokens.colors, baseTokenColors);
    Object.assign(theme, baseThemeColors);
  }

  textComponent.defaultProps = textComponent.defaultProps ?? {};
  const textDefaults = textComponent.defaultProps as { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
  const baseTextStyle = Array.isArray(initialTextStyle) ? initialTextStyle : initialTextStyle ? [initialTextStyle] : [];
  textDefaults.style = [
    ...baseTextStyle,
    { fontFamily: 'DMSans_300Light', color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
  ];
  textDefaults.allowFontScaling = false;
  textDefaults.maxFontSizeMultiplier = 1;

  textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
  const inputDefaults = textInputComponent.defaultProps as { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
  const baseInputStyle = Array.isArray(initialInputStyle) ? initialInputStyle : initialInputStyle ? [initialInputStyle] : [];
  inputDefaults.style = [
    ...baseInputStyle,
    { fontFamily: 'DMSans_300Light', color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
  ];
  inputDefaults.allowFontScaling = false;
  inputDefaults.maxFontSizeMultiplier = 1;

  return null;
}

function AccessibilityShell() {
  const { settings } = useAccessibilitySettings();
  const stackKey = `${settings.largeText}-${settings.highContrast}`;
  return (
    <>
      <AccessibilityTextDefaults />
      <StatusBar barStyle="dark-content" backgroundColor="#0000" />
      <Stack key={stackKey} screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [cormorantLoaded] = useCormorantFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
  });
  const [dmSansLoaded] = useDMSansFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [dmMonoLoaded] = useDMMonoFonts({
    DMMono_300Light,
    DMMono_400Regular,
  });

  if (!cormorantLoaded || !dmSansLoaded || !dmMonoLoaded) {
    return null;
  }

  return (
    <AccessibilityProvider>
      <AccessibilityShell />
    </AccessibilityProvider>
  );
}