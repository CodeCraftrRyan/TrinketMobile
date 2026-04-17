import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';

export default function EventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
        if (error) throw error;
        setEvent(data);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to load event.');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Text style={{ color: '#6B7280' }}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen>
  <Text style={{ fontSize: 28, fontWeight: '300', color: '#20232A', fontFamily: 'CormorantGaramond_300Light' }}>{event.name}</Text>
      <Text style={{ color: '#6B7280', marginTop: 6, fontFamily: 'DMSans_400Regular' }}>{event.event_date || event.start_date || ''}</Text>
      {event.description ? <Text style={{ color: '#374151', marginTop: 12, fontFamily: 'DMSans_400Regular' }}>{event.description}</Text> : null}
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ color: '#2563EB', fontWeight: '600', fontFamily: 'DMSans_500Medium' }}>← Back</Text>
      </TouchableOpacity>
    </Screen>
  );
}
