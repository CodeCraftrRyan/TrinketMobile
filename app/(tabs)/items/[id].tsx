import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { addRecentlyViewed } from '../../../lib/recent';
import { supabase } from '../../../lib/supabase';
import { tokens } from '../../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TRK-0002 — a stable accession number derived from the row id.
const accession = (id: string | number) => `TRK-${String(id).padStart(4, '0')}`;

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [peopleNames, setPeopleNames] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]); // signed URLs from item_photos
  const [activePhoto, setActivePhoto] = useState(0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id ?? null;
        if (mounted) setUserId(uid);
        if (uid && data?.id) {
          const { data: fav } = await supabase
            .from('user_favorites')
            .select('item_id')
            .eq('user_id', uid)
            .eq('item_id', data.id)
            .maybeSingle();
          if (mounted) setIsFavourite(!!fav);
        }

        // Load photos from item_photos as signed URLs (private bucket)
        try {
          const { data: photoRows, error: photoError } = await supabase
            .from('item_photos')
            .select('storage_path,sort_order')
            .eq('item_id', id)
            .order('sort_order', { ascending: true });
          if (photoError) throw photoError;
          const urls: string[] = [];
          for (const prow of photoRows ?? []) {
            const sp = (prow as any)?.storage_path;
            if (!sp) continue;
            const { data: signed } = await supabase.storage
              .from(PHOTO_BUCKET)
              .createSignedUrl(sp, 60 * 60);
            if (signed?.signedUrl) urls.push(signed.signedUrl);
          }
          if (mounted && urls.length) setPhotos(urls);
        } catch (e) {
          console.warn('Failed to load item photos', e);
        }

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

  async function toggleFavourite() {
    if (!userId || !item?.id) return;
    const next = !isFavourite;
    setIsFavourite(next);
    try {
      if (next) {
        const { error } = await supabase
          .from('user_favorites')
          .insert([{ user_id: userId, item_id: item.id }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', item.id);
        if (error) throw error;
      }
    } catch (e) {
      console.warn('Failed to change favourite', e);
      setIsFavourite(!next);
    }
  }

  async function shareItem() {
    if (!item) return;
    const lines = [item.name ?? item.title, item.description ?? item.notes].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n\n') });
    } catch (e) {
      console.warn('Share failed', e);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accentCool} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ ...tokens.type.ui, color: c.inkLabel, marginBottom: 12 }}>
          That object is no longer in the archive.
        </Text>
        <Text onPress={() => router.back()} style={{ ...tokens.type.ui, color: c.accentDeep }}>Go back</Text>
      </View>
    );
  }

  const hasPhotos = photos.length > 0;
  const imageCountLabel = hasPhotos ? `${activePhoto + 1} of ${photos.length}` : '0 of 0';

  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    if (idx !== activePhoto) setActivePhoto(idx);
  };

  const purchaseYear = item.date_purchased
    ? new Date(item.date_purchased).getFullYear()
    : item.year || item.purchase_year;
  const purchaseLabel = purchaseYear ? `Acquired ${purchaseYear}` : null;

  const chips: [string, string][] = [];
  if (purchaseLabel) chips.push(['calendar-outline', purchaseLabel]);
  if (item.location) chips.push(['location-outline', item.location]);
  if (peopleForItem().length) chips.push(['person-outline', `from ${peopleForItem().join(', ')}`]);
  if (item.event) chips.push(['bookmark-outline', item.event]);
  if (item.estimated_value || item.price) {
    chips.push(['pricetag-outline', `$${item.estimated_value || item.price}`]);
  }

  const detailRows: [string, string][] = [];
  const push = (label: string, value: any) => {
    if (value !== null && value !== undefined && String(value).length) {
      detailRows.push([label, String(value)]);
    }
  };
  push('Condition', item.condition);
  push('Brand', item.brand);
  push('Model', item.model_number);
  push('Year', item.year);
  push('Size', item.size);
  push('Collection', item.collection);
  push('Event', item.event);
  if (peopleForItem().length) push('People', peopleForItem().join(', '));
  if (item.created_at) push('Added', new Date(item.created_at).toLocaleDateString());

  const purchaseRows: [string, string][] = [];
  const pushP = (label: string, value: any) => {
    if (value !== null && value !== undefined && String(value).length) {
      purchaseRows.push([label, String(value)]);
    }
  };
  if (item.price) pushP('Price', `$${item.price}`);
  if (item.estimated_value) pushP('Estimated value', `$${item.estimated_value}`);
  pushP('Acquired', item.date_purchased);
  pushP('Acquired via', item.acquisition_method || item.acquired);
  pushP('Location', item.location);
  if (item.updated_at) pushP('Updated', new Date(item.updated_at).toLocaleDateString());

  const Section = ({ title, rows }: { title: string; rows: [string, string][] }) =>
    rows.length ? (
      <View style={{ paddingHorizontal: 20, marginTop: 34 }}>
        <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 4 }}>{title}</Text>
        {rows.map(([label, value], i) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              paddingVertical: 13,
              borderTopWidth: i === 0 ? 1 : 0,
              borderTopColor: c.border,
              borderBottomWidth: 1,
              borderBottomColor: c.ruleSoft,
            }}>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.inkLabel }}>{label}</Text>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink, flexShrink: 1, textAlign: 'right' }}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>

      {/* Top bar */}
      <View style={{
        backgroundColor: c.surfaceDark,
        paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
          <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Archive</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
          <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityLabel="Favourite">
            <Ionicons name={isFavourite ? 'star' : 'star-outline'} size={21}
              color={isFavourite ? c.accent : c.inkGhost} />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareItem} hitSlop={10} accessibilityLabel="Share">
            <Ionicons name="share-outline" size={21} color={c.inkGhost} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: item.id } } as any)}
            hitSlop={10}>
            <Text style={{ ...tokens.type.ui, color: c.accent }}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* Photographs */}
        <View style={{ backgroundColor: c.surfaceDark }}>
          {hasPhotos ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onPhotoScroll}
              scrollEventThrottle={16}
            >
              {photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }}
                  style={{ width: SCREEN_WIDTH, height: 320 }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={30} color={c.accentCool} />
              <Text style={{ ...tokens.type.ui, color: c.accentCool, marginTop: 8 }}>
                No photograph yet
              </Text>
            </View>
          )}

          {hasPhotos && photos.length > 1 && (
            <View style={{
              position: 'absolute', bottom: 14, left: 20, right: 20,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {photos.map((_, dot) => (
                  <View key={dot} style={{
                    width: dot === activePhoto ? 22 : 7,
                    height: 3,
                    backgroundColor: dot === activePhoto ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  }} />
                ))}
              </View>
              <View style={{
                backgroundColor: 'rgba(12,22,32,0.7)',
                paddingHorizontal: 10, paddingVertical: 4,
                borderRadius: tokens.radius.sm,
              }}>
                <Text style={{ ...tokens.type.label, color: '#FFFFFF' }}>{imageCountLabel}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Identity */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ ...tokens.type.label, color: c.inkFact }}>
            {(categoryName || item.item_category || item.category || 'Uncategorised').toString().toUpperCase()}
            {'  ·  '}{accession(item.id)}
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.ink, marginTop: 6 }}>
            {item.name || item.title}
          </Text>

          {chips.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              {chips.map(([icon, label]) => (
                <View key={label} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  paddingHorizontal: 13, paddingVertical: 10,
                  borderWidth: 1, borderColor: c.border,
                  borderRadius: tokens.radius.md, backgroundColor: c.card,
                }}>
                  <Ionicons name={icon as any} size={15} color={c.accentCool} />
                  <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* The story */}
        <View style={{ paddingHorizontal: 20, marginTop: 34 }}>
          <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 10 }}>The story</Text>
          <Text style={{ ...tokens.type.body, color: c.ink }}>
            {item.description ?? item.notes ?? 'Nothing written down yet. Add what you remember.'}
          </Text>
        </View>

        <Section title="Object details" rows={detailRows} />
        <Section title="Acquisition" rows={purchaseRows} />

      </ScrollView>
    </View>
  );
}
