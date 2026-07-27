import { CormorantGaramond_300Light, CormorantGaramond_300Light_Italic, CormorantGaramond_400Regular, CormorantGaramond_500Medium, useFonts as useCormorantFonts } from '@expo-google-fonts/cormorant-garamond';
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
  const fontSize = 16 * scale;
  const textColor = settings.highContrast ? tokens.colors.ink : tokens.colors.inkMid;

  if (settings.highContrast) {
    // High contrast strengthens the theme rather than discarding it: the
    // ground goes white, every ink becomes Navy (15.9:1), rules darken, and
    // the accent steps to Bronze Deep. Pure black would gain nothing a reader
    // can perceive and would cost the archive its character.
    tokens.colors.bg = '#FFFFFF';
    tokens.colors.card = '#FFFFFF';
    tokens.colors.text = '#0C1620';
    tokens.colors.ink = '#0C1620';
    tokens.colors.inkMid = '#0C1620';
    tokens.colors.inkLight = '#0C1620';
    tokens.colors.inkGhost = '#2C4F66';
    tokens.colors.primary = '#0C1620';
    tokens.colors.border = '#2C4F66';
    tokens.colors.borderStrong = '#0C1620';
    tokens.colors.accent = '#8F5B23';
    tokens.colors.surface = '#FFFFFF';
    tokens.colors.surfaceSoft = '#FFFFFF';
    tokens.colors.tint = '#FFFFFF';
    tokens.colors.accentCool = '#2C4F66';
    tokens.colors.accentWarm = '#8F5B23';
    tokens.colors.inkBody = '#0C1620';
    tokens.colors.inkLabel = '#0C1620';
    tokens.colors.inkFact = '#8F5B23';
    tokens.colors.link = '#0C1620';
    tokens.colors.ruleSoft = '#2C4F66';
    tokens.colors.ruleStrong = '#0C1620';

    theme.background = '#FFFFFF';
    theme.card = '#FFFFFF';
    theme.primary = '#0C1620';
    theme.muted = '#0C1620';
    theme.accent = '#8F5B23';
    theme.list = '#0C1620';
    theme.softBlue = '#FFFFFF';
    theme.gold = '#8F5B23';
    theme.offWhite = '#FFFFFF';
    theme.border = '#2C4F66';
    theme.borderStrong = '#0C1620';
    theme.inkLight = '#0C1620';
    theme.inkGhost = '#2C4F66';
    theme.accentCool = '#2C4F66';
  } else {
    Object.assign(tokens.colors, baseTokenColors);
    Object.assign(theme, baseThemeColors);
  }

  textComponent.defaultProps = textComponent.defaultProps ?? {};
  const textDefaults = textComponent.defaultProps as { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
  const baseTextStyle = Array.isArray(initialTextStyle) ? initialTextStyle : initialTextStyle ? [initialTextStyle] : [];
  textDefaults.style = [
    ...baseTextStyle,
    { fontFamily: 'DMSans_400Regular', color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
  ];
  textDefaults.allowFontScaling = false;
  textDefaults.maxFontSizeMultiplier = 1;

  textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
  const inputDefaults = textInputComponent.defaultProps as { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
  const baseInputStyle = Array.isArray(initialInputStyle) ? initialInputStyle : initialInputStyle ? [initialInputStyle] : [];
  inputDefaults.style = [
    ...baseInputStyle,
    { fontFamily: 'DMSans_400Regular', color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
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

  if (!cormorantLoaded || !dmSansLoaded) {
    return null;
  }

  return (
    <AccessibilityProvider>
      <AccessibilityShell />
    </AccessibilityProvider>
  );
}