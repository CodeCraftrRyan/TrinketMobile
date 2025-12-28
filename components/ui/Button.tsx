import { Pressable, StyleSheet, Text } from "react-native";

export function Button({ title, onPress, disabled, variant = 'primary' }: { title:string; onPress:() => void; disabled?:boolean; variant?: 'primary' | 'ghost' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[variant === 'primary' ? styles.button : styles.ghost, disabled && styles.disabled]}
    >
      <Text style={[variant === 'primary' ? styles.text : styles.ghostText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0B1220',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0B1220',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ghostText: {
    color: '#0B1220',
    fontWeight: '700',
  },
});