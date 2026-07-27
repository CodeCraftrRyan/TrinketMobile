/* TK_THEME */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { addRecentlyViewed } from '../../../lib/recent';
import { supabase } from '../../../lib/supabase';
import { tokens } from '../../../lib/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [peopleNames, setPeopleNames] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState(0);

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
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
          <Text style={{ ...tokens.type.name, color: tokens.colors.ink, marginBottom: 12 }}>No such object</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 20, minHeight: tokens.minTarget, justifyContent: 'center' }}
          >
            <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const imageList = imagesForItem();
  const spec = [item.brand, item.model_number, item.year].filter(Boolean).join(' · ');

  const rows: [string, any][] = [
    ['Category', categoryName || item.item_category || item.category || null],
    ['Acquired', [item.acquisition_method || item.acquired, item.date_purchased].filter(Boolean).join(', ') || null],
    ['Collection', item.collection || null],
    ['Event', item.event || null],
    ['Location', item.location || null],
    ['Condition', item.condition || null],
    ['Size', item.size || null],
    ['Value', (item.estimated_value || item.price) ? `$${item.estimated_value || item.price}` : null],
    ['People', peopleNames.length ? peopleNames.join(', ') : null],
    ['Added', item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null],
  ].filter(([, v]) => v) as [string, any][];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* The stage */}
        <View style={{ backgroundColor: tokens.colors.surfaceDark }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 }}>
            <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" style={{ minHeight: tokens.minTarget, justifyContent: 'center', paddingRight: 12 }}>
              <Ionicons name="chevron-back" size={22} color={tokens.colors.onDark} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: item.id } } as any)}
              style={{ minHeight: tokens.minTarget, justifyContent: 'center', paddingLeft: 12 }}
            >
              <Text style={{ ...tokens.type.button, color: tokens.colors.onDarkBody }}>Edit record</Text>
            </TouchableOpacity>
          </View>

          {imageList.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
              }}
            >
              {imageList.map((uri, i) => (
                <View key={i} style={{ width: SCREEN_W, height: 320, alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={{ uri }} style={{ width: SCREEN_W, height: 320 }} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: tokens.colors.onDarkLabel }} />
            </View>
          )}

          {imageList.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, gap: 6 }}>
              {imageList.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === imageIndex ? 20 : 6,
                    height: 2,
                    backgroundColor: i === imageIndex ? tokens.colors.onDarkFact : tokens.colors.ruleDark,
                  }}
                />
              ))}
            </View>
          )}

          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
            <Text style={{ ...tokens.type.title, fontSize: 27, color: tokens.colors.onDark }}>
              {item.name || item.title}
            </Text>
            {!!spec && (
              <Text style={{ ...tokens.type.fact, color: tokens.colors.onDarkFact, marginTop: 8 }}>{spec}</Text>
            )}
          </View>
        </View>

        {/* The record */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ ...tokens.type.body, color: tokens.colors.inkBody }}>
            {item.description ?? item.notes ?? 'Nothing written down yet.'}
          </Text>

          {rows.length > 0 && (
            <View style={{ marginTop: 28, borderTopWidth: 1, borderTopColor: tokens.colors.ruleStrong }}>
              {rows.map(([label, value]) => (
                <View
                  key={label}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleSoft }}
                >
                  <Text style={{ ...tokens.type.label, color: tokens.colors.inkLabel, width: 118 }}>{label}</Text>
                  <Text style={{ ...tokens.type.ui, color: tokens.colors.ink, flex: 1, textTransform: label === 'Condition' ? 'capitalize' : 'none' }}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
