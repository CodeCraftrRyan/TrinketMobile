import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import TabHeader from '../../../components/ui/TabHeader';
import { supabase } from '../../../lib/supabase';

type Item = {
  id: string;
  title: string;
  tags?: string[];
  location?: string;
  price?: string;
  added_at?: string;
  image_url?: string | null;
  images?: string[] | null;
};

export default function Items() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('items').select('id,title,tags,location,price,added_at,image_url,images');
      if (error) throw error;
      setItems((data ?? []) as Item[]);
    } catch (e: any) {
      console.warn('Failed to load items', e);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadItems();

    // subscribe to realtime changes on the `items` table so the UI stays up-to-date
    const channel = supabase
      .channel('items-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        // payload shape varies by client version; apply changes locally when possible.
        try {
          // prefer to derive intent from presence of `new`/`old` fields
          const newRow = (payload as any).new ?? (payload as any).record ?? (payload as any).payload?.new ?? null;
          const oldRow = (payload as any).old ?? (payload as any).record?.old ?? (payload as any).payload?.old ?? null;

          // If we have explicit rows, decide which operation it is.
          if (newRow && !oldRow) {
            // insert
            setItems((prev) => {
              // avoid duplicates: remove any with same id then add to front
              const filtered = prev.filter((p) => p.id !== newRow.id);
              return [newRow as Item, ...filtered];
            });
            return;
          }

          if (newRow && oldRow) {
            // update
            setItems((prev) => prev.map((p) => (p.id === newRow.id ? ({ ...p, ...(newRow as Item) } as Item) : p)));
            return;
          }

          if (oldRow && !newRow) {
            // delete
            setItems((prev) => prev.filter((p) => p.id !== oldRow.id));
            return;
          }

          // Fallback: if we couldn't parse the payload, re-fetch a full list as a safe fallback
          console.log('[realtime items] unknown payload, falling back to full reload', payload);
          loadItems();
        } catch (e) {
          console.warn('[realtime items] handler error', e);
          loadItems();
        }
      })
      .subscribe();

    return () => {
      // unsubscribe the channel when the component unmounts
      try {
        channel.unsubscribe();
      } catch (e) {
        // backward-compat: older versions used supabase.removeChannel
        // @ts-ignore
        if (typeof (supabase as any).removeChannel === 'function') {
          // @ts-ignore
          (supabase as any).removeChannel(channel);
        }
      }
    };
  }, []);

  function imagesFor(it: Item) {
    if (!it) return [] as string[];
    if (Array.isArray(it.images) && it.images.length > 0) return it.images as string[];
    if (it.image_url) return [it.image_url];
    return [] as string[];
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
      <TabHeader title="Browse Collection" actionTitle="Add Item" onAction={() => router.push('/(tabs)/add')} />

      <View style={{ marginBottom: 12 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#6B7280' }}>Search your collection…</Text>
            <Text style={{ color: '#6B7280' }}>{items.length} items</Text>
          </View>
        </Card>
      </View>

      {items.length === 0 ? (
        <Card>
          <Text style={{ marginBottom: 8 }}>No items yet.</Text>
          <Button title="Add your first item" onPress={() => router.push('/(tabs)/add')} />
        </Card>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {items.map((it) => (
              <TouchableOpacity key={it.id} onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } })} style={{ width: '48%', marginBottom: 20 }}>
                <Card style={{ padding: 12, borderRadius: 18 }}>
                  <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                    {imagesFor(it).length > 0 ? (
                      <Image source={{ uri: imagesFor(it)[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : (
                      <Text style={{ color: '#9CA3AF' }}>No image</Text>
                    )}
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16 }}>{it.title}</Text>
                    {it.tags && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                        {it.tags.map((t) => (
                          <View key={t} style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
                            <Text style={{ color: '#374151', fontSize: 12 }}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: '#6B7280' }}>{it.location}</Text>
                      <Text style={{ color: '#6B7280', marginTop: 4 }}>{it.price}</Text>
                      <Text style={{ color: '#6B7280', marginTop: 4 }}>{`Added ${it.added_at ?? ''}`}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
