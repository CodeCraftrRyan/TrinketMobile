import { Pressable, StyleSheet, Text } from "react-native";
import { tokens } from "../../lib/tokens";

export function Button({ title, onPress, disabled, variant = 'primary' }: { title:string; onPress:() => void; disabled?:boolean; variant?: 'primary' | 'soft' | 'ghost' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[variant === 'primary' ? styles.button : variant === 'soft' ? styles.soft : styles.ghost, disabled && styles.disabled]}
    >
      <Text style={[variant === 'primary' ? styles.text : variant === 'soft' ? styles.softText : styles.ghostText]}>{title}</Text>
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