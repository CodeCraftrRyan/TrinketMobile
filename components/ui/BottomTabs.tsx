import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../lib/tokens';

type TabDef = { name: string; label: string; icon: keyof typeof Ionicons.glyphMap };

const LEFT_TABS: TabDef[] = [
  { name: 'home', label: 'Home', icon: 'home-outline' },
  { name: 'collections', label: 'Collections', icon: 'albums-outline' },
];
const RIGHT_TABS: TabDef[] = [
  { name: 'events', label: 'Events', icon: 'calendar-outline' },
  { name: 'account', label: 'Profile', icon: 'person-outline' },
];

export default function BottomTabs(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const BAR_HEIGHT = 56;

  const renderTab = (def: TabDef) => {
    const route = state.routes.find((r) => r.name === def.name);
    if (!route) return null;
    const index = state.routes.findIndex((r) => r.key === route.key);
    const isFocused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
    };
    const color = isFocused ? tokens.colors.surface : tokens.colors.inkGhost;
    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={styles.tabItem}
      >
        <Ionicons name={def.icon} size={26} color={color} />
        <Text style={{ color, fontSize: 11, marginTop: 2 }}>{def.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.pill, { paddingBottom: insets.bottom, height: BAR_HEIGHT + insets.bottom }]}>
        {/* Left tabs */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
          {LEFT_TABS.map(renderTab)}
        </View>
        {/* Center floating button */}
        <View style={{ width: 80, alignItems: 'center', marginBottom: 24 }} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              const addRoute = state.routes.find((r) => r.name === 'add');
              if (addRoute) navigation.navigate(addRoute.name as never);
            }}
            accessibilityRole="button"
          >
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: tokens.colors.accentWarm,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: tokens.colors.ink,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
              <Ionicons name="add" size={40} color={tokens.colors.surface} />
            </View>
          </TouchableOpacity>
        </View>
        {/* Right tabs */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
          {RIGHT_TABS.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    marginTop: -32,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.ink,
    borderRadius: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    width: '100%',
    justifyContent: 'space-around',
    shadowColor: tokens.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  tabItem: {
    paddingHorizontal: 8,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
