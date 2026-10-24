import { Pressable, StyleSheet, Text } from "react-native";
import { rd } from "../../lib/rdTokens";
import { useRedesign } from "../../lib/redesign";
import { tokens } from "../../lib/tokens";

export function Button({ title, onPress, disabled, variant = 'primary' }: { title:string; onPress:() => void; disabled?:boolean; variant?: 'primary' | 'soft' | 'ghost' }) {
  const { on: redesign } = useRedesign();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        variant === 'primary' ? styles.button : variant === 'soft' ? styles.soft : styles.ghost,
        redesign && (variant === 'primary' ? rdStyles.button : variant === 'soft' ? rdStyles.soft : rdStyles.ghost),
        disabled && styles.disabled,
      ]}
    >
      <Text style={[
        variant === 'primary' ? styles.text : variant === 'soft' ? styles.softText : styles.ghostText,
        redesign && (variant === 'primary' ? rdStyles.text : rdStyles.quietText),
      ]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  soft: {
    backgroundColor: tokens.colors.surfaceSoft,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.inkGhost,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: tokens.colors.surface,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },
  softText: {
    color: tokens.colors.ink,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },
  ghostText: {
    color: tokens.colors.ink,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },
});

// Redesign: 8px corners, no shadow; navy is the only filled button.
const rdStyles = StyleSheet.create({
  button: {
    backgroundColor: rd.color.navy, borderRadius: rd.radius.md, minHeight: rd.minTarget,
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  soft: { backgroundColor: rd.color.paper, borderColor: rd.color.mist, borderRadius: rd.radius.md, minHeight: rd.minTarget },
  ghost: { borderColor: rd.color.mist, borderRadius: rd.radius.md, minHeight: rd.minTarget },
  text: { fontFamily: rd.font.textMedium, color: rd.color.paper },
  quietText: { fontFamily: rd.font.textMedium, color: rd.color.navy },
});
