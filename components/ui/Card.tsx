import { StyleSheet, View, ViewStyle } from "react-native";
import { tokens } from "../../lib/tokens";
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={[styles.card, style]}> 
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});