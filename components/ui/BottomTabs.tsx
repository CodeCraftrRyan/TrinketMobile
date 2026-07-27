/* TK_THEME */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../lib/tokens';

const SLOTS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'home',   label: 'Home',    icon: 'home-outline' },
  { name: 'items',  label: 'Objects', icon: 'albums-outline' },
  { name: 'events', label: 'Events',  icon: 'calendar-outline' },
  { name: 'account', label: 'You',    icon: 'person-outline' },
];

export default function BottomTabs(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const BAR_HEIGHT = 60;

  const go = (name: string, key?: string, isFocused?: boolean) => {
    if (key) {
      const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
      if (isFocused || event.defaultPrevented) return;
    }
    navigation.navigate(name as never);
  };

  const Slot = ({ name, label, icon }: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index === -1) return <View style={styles.tabItem} />;
    const route = state.routes[index];
    const isFocused = state.index === index;
    const tint = isFocused ? tokens.colors.onDarkFact : tokens.colors.onDarkBody;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => go(name, route.key, isFocused)}
        style={styles.tabItem}
      >
        <Ionicons name={icon} size={23} color={tint} />
        <Text style={{ ...tokens.type.tab, color: tint, marginTop: 3 }}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: insets.bottom, height: BAR_HEIGHT + insets.bottom }]}>
        <Slot {...SLOTS[0]} />
        <Slot {...SLOTS[1]} />

        {/* Add — a bronze-stroked square, never a filled circle */}
        <View style={styles.addWrap} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add an object"
            onPress={() => go('add')}
            style={styles.add}
          >
            <Ionicons name="add" size={26} color={tokens.colors.onDark} />
          </TouchableOpacity>
        </View>

        <Slot {...SLOTS[2]} />
        <Slot {...SLOTS[3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: tokens.colors.surfaceDark,
  },
  tabItem: {
    flex: 1,
    minHeight: tokens.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  addWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: tokens.minTarget,
    height: tokens.minTarget,
    borderRadius: tokens.radius.mark,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
