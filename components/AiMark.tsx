import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { tokens } from '../lib/tokens';

const c = tokens.colors;

// The one mark that means "Trinket reads the photograph for you". Used on every
// AI entry point so people learn to recognise it: sparkles + a small AI label.
export default function AiMark({ onDark = false, size = 14 }: { onDark?: boolean; size?: number }) {
  const color = onDark ? c.accent : c.accentDeep;
  return (
    <View
      accessible
      accessibilityLabel="Uses AI"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="sparkles" size={size} color={color} />
      <Text style={{ ...tokens.type.label, color, letterSpacing: 1 }}>AI</Text>
    </View>
  );
}
