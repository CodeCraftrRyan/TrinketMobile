import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { addRecentlyViewed } from '../../../lib/recent';
import { supabase } from '../../../lib/supabase';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'details'>('photos');
  const [activeIndex, setActiveIndex] = useState(0);

  function imagesForItem() {
    if (!item) return [] as string[];
    if (Array.isArray(item.images) && item.images.length > 0) return item.images as string[];
    if (item.image_url) return [item.image_url];
    return [] as string[];
  }

  async function confirmDelete() {
    Alert.alert('Delete item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase.from('items').delete().eq('id', id);
            if (error) throw error;
            router.replace('/(tabs)/items');
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message ?? String(e));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!mounted) return;
        setItem(data ?? null);
        // record recently viewed
        try {
          if (data?.id) await addRecentlyViewed(String(data.id));
        } catch (e) {
          // non-critical
        }
      } catch (e: any) {
        console.warn('Failed to load item', e);
        Alert.alert('Error', 'Could not load item');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ marginBottom: 12 }}>Item not found.</Text>
          <Text onPress={() => router.back()} style={{ color: '#2563EB' }}>Go back</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          {/* Tabs: Photos / Details */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setActiveTab('photos')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: activeTab === 'photos' ? '#0B1220' : 'transparent' }}>
              <Text style={{ color: activeTab === 'photos' ? '#fff' : '#374151', fontWeight: '700' }}>Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('details')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: activeTab === 'details' ? '#0B1220' : 'transparent' }}>
              <Text style={{ color: activeTab === 'details' ? '#fff' : '#374151', fontWeight: '700' }}>Details</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'photos' ? (
            // Photos carousel
            <View>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 260 }} onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / e.nativeEvent.layoutMeasurement.width);
                setActiveIndex(idx);
              }}>
                {(imagesForItem().length > 0 ? imagesForItem() : [null]).map((src, i) => (
                  <View key={i} style={{ width: 360, height: 260, marginRight: 12 }}>
                    {src ? (
                      <Image source={{ uri: src }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderRadius: 10 }}>
                        <Text style={{ color: '#9CA3AF' }}>No image</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                {(imagesForItem().length > 0 ? imagesForItem() : [null]).map((_, i) => (
                  <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === activeIndex ? '#0B1220' : '#E6EEF6', marginHorizontal: 4 }} />
                ))}
              </View>
            </View>
          ) : (
            // Details
            <View>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>{item.title}</Text>
              {item.tags && <Text style={{ color: '#6B7280', marginTop: 8 }}>{(item.tags || []).join(', ')}</Text>}
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: '#111827', marginBottom: 8 }}>{item.description ?? item.notes ?? 'No description.'}</Text>
                <Text style={{ color: '#6B7280' }}>{item.location}</Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>{item.price}</Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>{`Added ${item.added_at ?? item.added}`}</Text>
              </View>

              <View style={{ height: 12 }} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button title="Edit" onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: item.id } } as any)} />
                <Button title="Delete" onPress={() => confirmDelete()} />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

