import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { addRecentlyViewed } from '../../../lib/recent';
import { supabase } from '../../../lib/supabase';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [peopleNames, setPeopleNames] = useState<string[]>([]);

  function imagesForItem() {
    if (!item) return [] as string[];
    if (Array.isArray(item.images) && item.images.length > 0) return item.images as string[];
    if (Array.isArray(item.image_urls) && item.image_urls.length > 0) return item.image_urls as string[];
    if (typeof item.image_urls === 'string' && item.image_urls.trim().length > 0) {
      return item.image_urls.split(',').map((entry: string) => entry.trim()).filter(Boolean);
    }
    if (item.image_url) return [item.image_url];
    if (item.photo_url) return [item.photo_url];
    if (item.cover_photo_url) return [item.cover_photo_url];
    return [] as string[];
  }

  function peopleForItem() {
    return peopleNames;
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
        setPeopleNames([]);
        if (data?.id) {
          try {
            const { data: linkRows, error: linkError } = await supabase
              .from('item_people')
              .select('person_id')
              .eq('item_id', data.id);
            if (linkError) throw linkError;
            const personIds = (linkRows ?? [])
              .map((row: { person_id?: string | number | null }) => row.person_id)
              .filter((value): value is string | number => value != null);
            if (personIds.length) {
              const { data: peopleRows, error: peopleError } = await supabase
                .from('people')
                .select('id,name')
                .in('id', personIds);
              if (peopleError) throw peopleError;
              const names = (peopleRows ?? [])
                .filter((row: { name?: string | null }) => row?.name)
                .map((row: { name?: string | null }) => String(row.name));
              setPeopleNames(names);
            }
          } catch (e) {
            console.warn('Failed to load item people', e);
          }
        }
        if (data?.category_id) {
          try {
            const { data: categoryData, error: categoryError } = await supabase
              .from('categories')
              .select('name')
              .eq('id', data.category_id)
              .maybeSingle();
            if (!categoryError && categoryData?.name) {
              setCategoryName(categoryData.name);
            }
          } catch {
            // non-critical
          }
        }
        // record recently viewed
        try {
          if (data?.id) await addRecentlyViewed(String(data.id));
        } catch {
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
          <Text onPress={() => router.back()} style={{ color: '#B8783A' }}>Go back</Text>
        </View>
      </Screen>
    );
  }

  const imageList = imagesForItem();
  const mainImage = imageList[0];
  const imageCountLabel = imageList.length > 0 ? `1 of ${imageList.length}` : '0 of 0';
  const purchaseYear = item.date_purchased
    ? new Date(item.date_purchased).getFullYear()
    : item.year || item.purchase_year;
  const purchaseLabel = purchaseYear ? `Purchased ${purchaseYear}` : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, backgroundColor: '#F7FAFB' }}>
        <View style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', backgroundColor: '#0C1620' }}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={{ width: '100%', height: 300 }} resizeMode="cover" />
          ) : (
            <View style={{ height: 300, backgroundColor: '#0C1620', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#4A7A9B' }}>No image</Text>
            </View>
          )}

          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(15,23,42,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: item.id } } as any)} style={{ backgroundColor: 'rgba(15,23,42,0.6)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={{ position: 'absolute', bottom: 14, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {[0, 1, 2].map((dot) => (
                <View key={dot} style={{ width: dot === 0 ? 24 : 8, height: 8, borderRadius: 999, backgroundColor: dot === 0 ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </View>
            <View style={{ backgroundColor: 'rgba(15,23,42,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{imageCountLabel}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#D8E6EE', shadowColor: '#0C1620', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
            <Text style={{ color: '#B8783A', fontWeight: '700', letterSpacing: 2, fontSize: 12, marginBottom: 6 }}>
              {(categoryName || item.item_category || item.category || item.category_id || 'Category').toString().toUpperCase()}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0C1620' }}>{item.name || item.title}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {purchaseLabel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D8E6EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                  <Ionicons name="calendar-outline" size={16} color="#4A7A9B" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>{purchaseLabel}</Text>
                </View>
              )}
              {item.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D8E6EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                  <Ionicons name="location-outline" size={16} color="#4A7A9B" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>{item.location}</Text>
                </View>
              )}
              {item.event && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D8E6EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                  <Ionicons name="calendar-outline" size={16} color="#4A7A9B" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>{item.event}</Text>
                </View>
              )}
              {(item.estimated_value || item.price) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D8E6EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>💰 ${item.estimated_value || item.price}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#D8E6EE' }}>
            <Text style={{ color: '#4A7A9B', fontWeight: '700', letterSpacing: 2, fontSize: 12, marginBottom: 8 }}>DESCRIPTION</Text>
            <Text style={{ color: '#0C1620', fontSize: 15, lineHeight: 22 }}>
              {item.description ?? item.notes ?? 'No description.'}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#D8E6EE' }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#D8E6EE' }}>
              <Text style={{ color: '#4A7A9B', fontWeight: '700', letterSpacing: 2, fontSize: 12 }}>ITEM DETAILS</Text>
            </View>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              {item.condition && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Condition</Text>
                  <Text style={{ color: '#B8783A', fontWeight: '800' }}>{item.condition}</Text>
                </View>
              )}
              {item.brand && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Brand</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.brand}</Text>
                </View>
              )}
              {item.model_number && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Model</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.model_number}</Text>
                </View>
              )}
              {item.year && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Year</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.year}</Text>
                </View>
              )}
              {item.size && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Size</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.size}</Text>
                </View>
              )}
              {item.collection && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Collection</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.collection}</Text>
                </View>
              )}
              {item.event && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Event</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.event}</Text>
                </View>
              )}
              {peopleForItem().length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>People</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{peopleForItem().join(', ')}</Text>
                </View>
              )}
              {item.created_at && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>Added</Text>
                  <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#D8E6EE' }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#D8E6EE' }}>
              <Text style={{ color: '#4A7A9B', fontWeight: '700', letterSpacing: 2, fontSize: 12 }}>PURCHASE DETAILS</Text>
            </View>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              {item.price && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Price</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>${item.price}</Text>
                </View>
              )}
              {item.estimated_value && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Estimated Value</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>${item.estimated_value}</Text>
                </View>
              )}
              {item.date_purchased && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Purchased</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.date_purchased}</Text>
                </View>
              )}
              {(item.acquisition_method || item.acquired) && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Acquired Via</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.acquisition_method || item.acquired}</Text>
                </View>
              )}
              {item.location && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '700' }}>Location</Text>
                  <Text style={{ color: '#0C1620', fontWeight: '700' }}>{item.location}</Text>
                </View>
              )}
              {item.updated_at && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>Updated</Text>
                  <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>{new Date(item.updated_at).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

