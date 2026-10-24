// People (redesign): everyone named on a piece or on the people list, with
// their pieces. The old people editor (which kept names in user metadata)
// was removed as an orphan; with the switch off this route sends you to
// Settings, where the people list lives.
import { Redirect } from 'expo-router';
import { PeopleIndex } from '../components/rd/PeoplePlacesScreens';
import { useRedesign } from '../lib/redesign';

export default function People() {
  const { on } = useRedesign();
  return on ? <PeopleIndex /> : <Redirect href="/account" />;
}
