/* TK_THEME */
import { Pressable, StyleSheet, Text } from "react-native";
import { tokens } from "../../lib/tokens";

/* An outline on nothing. There is no filled button in this theme. */
export function Button({ title, onPress, disabled, variant = 'primary' }: { title:string; onPress:() => void; disabled?:boolean; variant?: 'primary' | 'soft' | 'ghost' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[variant === 'primary' ? styles.button : variant === 'soft' ? styles.soft : styles.ghost, disabled && styles.disabled]}
    >
      <Text style={[variant === 'primary' ? styles.text : variant === 'soft' ? styles.softText : styles.ghostText]}>{title}</Text>
    </Pressable>
  );
}

const base = {
  minHeight: tokens.minTarget,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: tokens.radius.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1,
};

const styles = StyleSheet.create({
  button: {
    ...base,
    backgroundColor: 'transparent',
    borderColor: tokens.colors.accent,
  },
  soft: {
    ...base,
    backgroundColor: 'transparent',
    borderColor: tokens.colors.border,
  },
  ghost: {
    ...base,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    ...tokens.type.button,
    color: tokens.colors.ink,
  },
  softText: {
    ...tokens.type.button,
    color: tokens.colors.inkLabel,
  },
  ghostText: {
    ...tokens.type.button,
    color: tokens.colors.link,
  },
});
