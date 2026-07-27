/* TK_THEME */
import { StyleSheet, View, ViewStyle } from "react-native";
import { tokens } from "../../lib/tokens";

/* A bordered, unfilled surface. Elevation is a hairline, not a shadow. */
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
    borderRadius: tokens.radius.md,
    padding: tokens.space.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
});
