// One person (redesign, M3): their pieces, oldest first, and their moments.
// Only reachable from redesigned screens; with the switch off it goes to the
// current People screen.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PersonView } from '../components/rd/PeoplePlacesScreens';
import { useRedesign } from '../lib/redesign';

export default function Person() {
  const { on } = useRedesign();
  const { name } = useLocalSearchParams<{ name: string }>();
  if (!on || !name) return <Redirect href="/people" />;
  return <PersonView name={String(name)} />;
}
