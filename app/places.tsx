// Places, reached from the redesign's "More" tab: rooms with their counts.
// With the switch off (not linked from anywhere then) it shows the same
// "Your places" list that lives in Settings.
import { ScrollView } from 'react-native';
import PlacesSection from '../components/PlacesSection';
import { PlacesIndex } from '../components/rd/PeoplePlacesScreens';
import { useRedesign } from '../lib/redesign';

export default function Places() {
  const { on } = useRedesign();
  if (on) return <PlacesIndex />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <PlacesSection />
    </ScrollView>
  );
}
