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
    tokens.colors.bg = tokens.colors.card;
    tokens.colors.card = tokens.colors.card;
    tokens.colors.text = tokens.colors.ink;
    tokens.colors.ink = tokens.colors.ink;
    tokens.colors.inkMid = tokens.colors.ink;
    tokens.colors.inkLight = tokens.colors.ink;
    tokens.colors.inkGhost = tokens.colors.inkLabel;
    tokens.colors.primary = tokens.colors.ink;
    tokens.colors.border = tokens.colors.inkLabel;
    tokens.colors.borderStrong = tokens.colors.ink;
    tokens.colors.accent = tokens.colors.inkFact;
    tokens.colors.surface = tokens.colors.card;
    tokens.colors.surfaceSoft = tokens.colors.card;
    tokens.colors.tint = tokens.colors.card;
    tokens.colors.accentCool = tokens.colors.inkLabel;
    tokens.colors.accentWarm = tokens.colors.inkFact;
    tokens.colors.inkBody = tokens.colors.ink;
    tokens.colors.inkLabel = tokens.colors.ink;
    tokens.colors.inkFact = tokens.colors.inkFact;
    tokens.colors.link = tokens.colors.ink;
    tokens.colors.ruleSoft = tokens.colors.inkLabel;
    tokens.colors.ruleStrong = tokens.colors.ink;

    theme.background = tokens.colors.card;
    theme.card = tokens.colors.card;
    theme.primary = tokens.colors.ink;
    theme.muted = tokens.colors.ink;
    theme.accent = tokens.colors.inkFact;
    theme.list = tokens.colors.ink;
    theme.softBlue = tokens.colors.card;
    theme.gold = tokens.colors.inkFact;
    theme.offWhite = tokens.colors.card;
    theme.border = tokens.colors.inkLabel;
    theme.borderStrong = tokens.colors.ink;
    theme.inkLight = tokens.colors.ink;
    theme.inkGhost = tokens.colors.inkLabel;
    theme.accentCool = tokens.colors.inkLabel;
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