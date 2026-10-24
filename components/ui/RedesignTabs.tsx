// Tab bar for the redesign (TRINKET_SPEC v5):
//   Archive · Collections · [ + ] · Moments · More
// Light paper bar on a mist hairline. The + is a navy rounded square (navy is
// the only filled colour; nothing circular, no shadow). The active tab reads
// in navy with a 2px bronze mark above it — bronze as a thread, never a fill.
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addItemParams } from '../../lib/addItemRoute';
import { rd } from '../../lib/rdTokens';

type TabDef = { name: string; label: string; icon: keyof typeof Ionicons.glyphMap; also?: string[] };

// "Archive" is the home screen; the full list (items) belongs to it too.
const LEFT: TabDef[] = [
  { name: 'home', label: 'Archive', icon: 'archive-outline', also: ['items'] },
  { name: 'collections', label: 'Collections', icon: 'albums-outline' },
];
const RIGHT: TabDef[] = [
  { name: 'events', label: 'Moments', icon: 'calendar-outline' },
  { name: 'more', label: 'More', icon: 'ellipsis-horizontal', also: ['account'] },
];

export default function RedesignTabs({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const focusedName: string = state.routes[state.index]?.name;

  const renderTab = (def: TabDef) => {
    const route = state.routes.find((r: any) => r.name === def.name);
    if (!route) return null;
    const active = focusedName === def.name || (def.also || []).includes(focusedName);
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (focusedName !== def.name && !event.defaultPrevented) navigation.navigate(route.name);
    };
    const color = active ? rd.color.navy : rd.color.steel;
    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={def.label}
        style={styles.tab}
      >
        <View style={[styles.mark, active && styles.markOn]} />
        <Ionicons name={def.icon} size={23} color={color} />
        <Text style={[styles.label, { color }]} numberOfLines={1}>{def.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.side}>{LEFT.map(renderTab)}</View>
      <View style={styles.center}>
        <TouchableOpacity
          style={styles.add}
          onPress={() => {
            const addRoute = state.routes.find((r: any) => r.name === 'add');
            if (addRoute) navigation.navigate(addRoute.name, addItemParams());
          }}
          accessibilityRole="button"
          accessibilityLabel="Add a piece"
        >
          <Ionicons name="add" size={30} color={rd.color.paper} />
        </TouchableOpacity>
      </View>
      <View style={styles.side}>{RIGHT.map(renderTab)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: rd.color.paper,
    borderTopWidth: rd.hairline,
    borderTopColor: rd.color.mist,
    paddingTop: 0,
  },
  side: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly' },
  tab: { minWidth: rd.minTarget, minHeight: 52, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 4 },
  mark: { width: 24, height: 2, marginBottom: 7, backgroundColor: 'transparent' },
  markOn: { backgroundColor: rd.color.bronze },
  label: { fontFamily: rd.font.textMedium, fontSize: 11, marginTop: 3 },
  center: { width: 76, alignItems: 'center', paddingTop: 7 },
  add: {
    width: 52, height: 44,
    borderRadius: rd.radius.mark,
    backgroundColor: rd.color.navy,
    alignItems: 'center', justifyContent: 'center',
  },
});
