import { EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, useFonts as useCormorantFonts } from '@expo-google-fonts/eb-garamond';
import { DMMono_300Light, DMMono_400Regular, useFonts as useDMMonoFonts } from '@expo-google-fonts/dm-mono';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSansFonts } from '@expo-google-fonts/dm-sans';
import { PublicSans_400Regular, PublicSans_500Medium, useFonts as usePublicSansFonts } from '@expo-google-fonts/public-sans';
import { IBMPlexMono_500Medium, useFonts as useIBMPlexMonoFonts } from '@expo-google-fonts/ibm-plex-mono';
import { Stack, router } from "expo-router";
import { useEffect } from 'react';
import { StatusBar, Text, TextInput, View } from 'react-native';
import { AccessibilityProvider, useAccessibilitySettings } from '../lib/accessibility';
import { RedesignProvider, useRedesign } from '../lib/redesign';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { tokens } from '../lib/tokens';

// When the session goes away (refresh token rejected, signed out on another
// device, account deleted) send the user to login. Without this, supabase-js
// quietly drops the session, RLS starts returning empty arrays, and Home shows
// "Nothing catalogued yet" to someone with a full archive.
function AuthWatcher() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        router.replace('/(auth)/login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

const textComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
const textInputComponent = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
const initialTextStyle = textComponent.defaultProps?.style;
const initialInputStyle = textInputComponent.defaultProps?.style;
const baseTokenColors = { ...tokens.colors };
const baseThemeColors = { ...theme };

function AccessibilityTextDefaults() {
  const { settings } = useAccessibilitySettings();
  // Redesign: body text in Public Sans at 400 (never Light), and the person's
  // iOS text-size setting is respected (capped so layouts hold together).
  const { on: redesign } = useRedesign();
  const bodyFont = redesign ? 'PublicSans_400Regular' : 'DMSans_300Light';
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
    { fontFamily: bodyFont, color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
  ];
  textDefaults.allowFontScaling = redesign;
  textDefaults.maxFontSizeMultiplier = redesign ? 1.5 : 1;

  textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
  const inputDefaults = textInputComponent.defaultProps as { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
  const baseInputStyle = Array.isArray(initialInputStyle) ? initialInputStyle : initialInputStyle ? [initialInputStyle] : [];
  inputDefaults.style = [
    ...baseInputStyle,
    { fontFamily: bodyFont, color: textColor, fontSize, transform: [{ scale }], lineHeight: Math.round(22 * scale) },
  ];
  inputDefaults.allowFontScaling = redesign;
  inputDefaults.maxFontSizeMultiplier = redesign ? 1.5 : 1;

  return null;
}

function AccessibilityShell() {
  const { settings } = useAccessibilitySettings();
  const { on: redesign } = useRedesign();
  // Remount on a design switch too, so every screen redraws in the chosen design.
  const stackKey = `${settings.largeText}-${settings.highContrast}-${redesign ? 'rd' : 'classic'}`;
  return (
    <>
      <AccessibilityTextDefaults />
      <AuthWatcher />
      <StatusBar barStyle="dark-content" backgroundColor="#0000" />
      <Stack key={stackKey} screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [cormorantLoaded] = useCormorantFonts({
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
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

  // Redesign faces. Loaded for everyone so the switch can flip instantly.
  const [publicSansLoaded] = usePublicSansFonts({ PublicSans_400Regular, PublicSans_500Medium });
  const [plexMonoLoaded] = useIBMPlexMonoFonts({ IBMPlexMono_500Medium });

  if (!cormorantLoaded || !dmSansLoaded || !dmMonoLoaded || !publicSansLoaded || !plexMonoLoaded) {
    // Navy while fonts load, matching the splash, instead of a white flash.
    return <View style={{ flex: 1, backgroundColor: '#0C1620' }} />;
  }

  return (
    <AccessibilityProvider>
      <RedesignProvider>
        <AccessibilityShell />
      </RedesignProvider>
    </AccessibilityProvider>
  );
}