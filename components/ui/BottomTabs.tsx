import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../lib/tokens';

export default function BottomTabs(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const BAR_HEIGHT = 56;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.pill, { paddingBottom: insets.bottom, height: BAR_HEIGHT + insets.bottom }]}> 
        {/* Left tab(s) */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          {state.routes.filter((r) => r.name === 'home').map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
            };
            return (
              <TouchableOpacity key={route.key} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} onPress={onPress} style={styles.tabItem}>
                <Ionicons name="home-outline" size={28} color={isFocused ? tokens.colors.surface : tokens.colors.inkGhost} />
                <Text style={{ color: isFocused ? tokens.colors.surface : tokens.colors.inkGhost, fontSize: 12, marginTop: 2 }}>Home</Text>
              </TouchableOpacity>
            );
          })}
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
        {/* Right tab(s) */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
          {state.routes.filter((r) => r.name === 'items').map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
            };
            return (
              <TouchableOpacity key={route.key} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} onPress={onPress} style={styles.tabItem}>
                <Ionicons name="albums-outline" size={28} color={isFocused ? tokens.colors.surface : tokens.colors.inkGhost} />
                <Text style={{ color: isFocused ? tokens.colors.surface : tokens.colors.inkGhost, fontSize: 12, marginTop: 2 }}>Collection</Text>
              </TouchableOpacity>
            );
          })}
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
    paddingHorizontal: 12,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    marginLeft: 8,
  },
  searchInner: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  searchInnerActive: {
  backgroundColor: '#0C1620',
  borderColor: '#0C1620',
  },
});
