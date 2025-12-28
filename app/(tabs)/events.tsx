import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { supabase } from '../../lib/supabase';

type EventRow = {
  id: number | string;
  name?: string | null;
  description?: string | null;
  photo_url?: string | null;
  location?: string | null;
  event_date?: string | null;
  created_at?: string | null;
};

export default function EventsTab() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').select('id,name,description,photo_url,location,event_date,created_at');
      if (error) throw error;
      setEvents((data ?? []) as EventRow[]);
    } catch (e: any) {
      console.warn('Failed to load events', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('events-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        // simple re-fetch on changes; granular updates could be applied similarly to items
        loadEvents();
      })
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }, []);

  function renderCard(item: EventRow) {
    return (
  <TouchableOpacity key={String(item.id)} style={styles.cardWrapper} onPress={() => router.push('/events-new')}>
        <Card>
          <View style={styles.imageWrap}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.name ?? 'Untitled Event'}</Text>
            {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
            {item.event_date ? <Text style={styles.meta}>{item.event_date}</Text> : null}
            {item.description ? <Text numberOfLines={2} style={styles.desc}>{item.description}</Text> : null}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <TabHeader title="Browse Events" actionTitle="Add Event" onAction={() => router.push('/events-new')} />

      <View style={{ marginBottom: 12 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#6B7280' }}>Search events…</Text>
            <Text style={{ color: '#6B7280' }}>{events.length} events</Text>
          </View>
        </Card>
      </View>

      {events.length === 0 ? (
        <Card>
          <Text style={{ marginBottom: 8 }}>No events yet.</Text>
          <Button title="Add your first event" onPress={() => router.push('/events-new')} />
        </Card>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderCard(item)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 12, paddingBottom: 48 },
  column: { justifyContent: 'space-between', marginBottom: 12 },
  cardWrapper: { flex: 1, marginHorizontal: 6, minWidth: 160 },
  imageWrap: { height: 140, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#9CA3AF' },
  cardBody: { padding: 12, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6B7280', fontSize: 13 },
  desc: { marginTop: 8, color: '#374151', fontSize: 13 },
});