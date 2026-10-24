// One place (redesign, M3): what rests there, in hairline-divided rows.
// Only reachable from redesigned screens; with the switch off it opens the
// current list, filtered to that location (as the current piece screen does).
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PlaceView } from '../components/rd/PeoplePlacesScreens';
import { useRedesign } from '../lib/redesign';

export default function Place() {
  const { on } = useRedesign();
  const { name } = useLocalSearchParams<{ name: string }>();
  if (!on || !name) return <Redirect href={{ pathname: '/(tabs)/items', params: name ? { location: String(name) } : {} } as any} />;
  return <PlaceView name={String(name)} />;
}
