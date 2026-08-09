import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { addRecentlyViewed } from '../../../lib/recent';
import { supabase } from '../../../lib/supabase';
import { tokens } from '../../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ItemDetail() {
  const { id, from, fromId } = useLocalSearchParams<{ id: string; from?: string; fromId?: string }>();
  const goBack = () => {
    if (from === 'collection' && fromId) { router.replace({ pathname: '/collection/[id]', params: { id: fromId } } as any); return; }
    if (from === 'event' && fromId) { router.replace({ pathname: '/events-detail', params: { id: fromId } } as any); return; }
    router.back();
  };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [peopleNames, setPeopleNames] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]); // signed URLs from item_photos
  const [activePhoto, setActivePhoto] = useState(0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [appearsIn, setAppearsIn] = useState<{ id: string; name: string; count: number }[]>([]);
  const [similar, setSimilar] = useState<{ id: string; name: string; uri: string | null }[]>([]);

  function peopleForItem() {
    return peopleNames;
  }

  useFocusEffect(useCallback(() => {
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
        // The collections this object is filed in.
        if (data?.id) {
          try {
            const { data: links } = await supabase
              .from('collection_items').select('collection_id').eq('item_id', data.id);
            const colIds = (links ?? []).map((r: any) => r.collection_id).filter(Boolean);
            if (colIds.length) {
              const [{ data: cols }, { data: allLinks }] = await Promise.all([
                supabase.from('collections').select('id,name').in('id', colIds),
                supabase.from('collection_items').select('collection_id').in('collection_id', colIds),
              ]);
              const tally: Record<string, number> = {};
              (allLinks ?? []).forEach((r: any) => {
                const k = String(r.collection_id);
                tally[k] = (tally[k] ?? 0) + 1;
              });
              if (mounted) {
                setAppearsIn((cols ?? []).map((r: any) => ({
                  id: String(r.id),
                  name: String(r.name ?? 'Collection'),
                  count: tally[String(r.id)] ?? 0,
                })));
              }
            }
          } catch (e) {
            console.warn('Failed to load collections for item', e);
          }
        }

        // Other objects of the same kind. Category, not similarity — the
        // embeddings that would do this properly live on the web side.
        if (data?.id && data?.category_id && uid) {
          try {
            const { data: kin } = await supabase
              .from('items')
              .select('id,name,photo_url')
              .eq('user_id', uid)
              .eq('category_id', data.category_id)
              .neq('id', data.id)
              .order('created_at', { ascending: false })
              .limit(8);
            const rows = kin ?? [];
            const paths: Record<string, string> = {};
            for (const row of rows) {
              let path = (row as any).photo_url ?? null;
              if (!path) {
                const { data: p } = await supabase
                  .from('item_photos').select('storage_path')
                  .eq('item_id', (row as any).id)
                  .order('sort_order', { ascending: true }).limit(1).maybeSingle();
                path = p?.storage_path ?? null;
              }
              if (path) paths[String((row as any).id)] = path;
            }
            const entries = Object.entries(paths);
            const urlById: Record<string, string> = {};
            if (entries.length) {
              const { data: signed } = await supabase.storage
                .from(PHOTO_BUCKET)
                .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
              entries.forEach(([itemId], i) => {
                const url = signed?.[i]?.signedUrl;
                if (url) urlById[itemId] = url;
              });
            }
            if (mounted) {
              setSimilar(rows.map((r: any) => ({
                id: String(r.id),
                name: String(r.name ?? 'Untitled object'),
                uri: urlById[String(r.id)] ?? null,
              })));
            }
          } catch (e) {
            console.warn('Failed to load similar objects', e);
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
  }, [id]));

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
        <Text onPress={goBack} style={{ ...tokens.type.ui, color: c.accentDeep }}>Go back</Text>
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
  push('Category', categoryName || item.item_category || item.category);
  push('Place', item.location);
  detailRows.push(['Valued', item.estimated_value ? `$${item.estimated_value}` : 'Not appraised']);
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
      <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
        <View style={{
          backgroundColor: c.card,
          borderWidth: 1, borderColor: c.border,
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
        }}>
          <View style={{
            paddingHorizontal: 18, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: c.border,
            backgroundColor: c.bg,
          }}>
            <Text style={{ ...tokens.type.label, color: c.inkLabel }}>{title}</Text>
          </View>
          {rows.map(([label, value], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 20,
                paddingHorizontal: 18,
                paddingVertical: 15,
                borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                borderBottomColor: c.ruleSoft,
              }}>
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool }}>{label}</Text>
              <Text style={{ ...tokens.type.ui, fontSize: 15, fontWeight: '500', color: c.ink, flexShrink: 1, textAlign: 'right' }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>

      {/* Top bar */}
      <View style={{
        backgroundColor: c.surfaceDark,
        paddingTop: 72, paddingBottom: 14, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={goBack} hitSlop={10}
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
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.ink, marginTop: 6 }}>
            {item.name || item.title}
          </Text>

          {chips.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              {chips.map(([icon, label]) => {
                const isLocation = icon === 'location-outline';
                const Chip = isLocation ? TouchableOpacity : View;
                return (
                  <Chip key={label}
                    {...(isLocation ? {
                      onPress: () => router.push({ pathname: '/(tabs)/items', params: { location: label } } as any),
                      accessibilityRole: 'button' as const,
                    } : {})}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                      paddingHorizontal: 13, paddingVertical: 10,
                      borderWidth: 1, borderColor: isLocation ? c.accentCool : c.border,
                      borderRadius: tokens.radius.md, backgroundColor: c.card,
                    }}>
                    <Ionicons name={icon as any} size={15} color={c.accentCool} />
                    <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>{label}</Text>
                    {isLocation && <Ionicons name="chevron-forward" size={13} color={c.accentCool} />}
                  </Chip>
                );
              })}
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

        <Section title="Item details" rows={detailRows} />
        <Section title="Acquisition" rows={purchaseRows} />

        {appearsIn.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 10 }}>Appears in</Text>
            {appearsIn.map((col) => (
              <TouchableOpacity
                key={col.id}
                onPress={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } } as any)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 14, marginBottom: 10,
                  backgroundColor: c.card,
                  borderWidth: 1, borderColor: c.border,
                  borderRadius: tokens.radius.lg,
                }}>
                <View style={{
                  width: 46, height: 46, backgroundColor: c.surfaceSoft,
                  borderRadius: tokens.radius.md,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="folder-outline" size={19} color={c.accentCool} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...tokens.type.nameSmall, color: c.ink }} numberOfLines={1}>{col.name}</Text>
                  <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 2 }}>
                    {col.count} {col.count === 1 ? 'object' : 'objects'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {similar.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <Text style={{ ...tokens.type.label, color: c.inkLabel, paddingHorizontal: 20, marginBottom: 12 }}>
              Also {(categoryName || 'in this category').toString().toLowerCase()}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
              {similar.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: row.id } } as any)}
                  activeOpacity={0.8}
                  style={{ width: 132 }}>
                  {row.uri ? (
                    <Image source={{ uri: row.uri }}
                      style={{ width: 132, height: 132, borderRadius: tokens.radius.md, backgroundColor: c.surfaceSoft }}
                      resizeMode="cover" />
                  ) : (
                    <View style={{
                      width: 132, height: 132, borderRadius: tokens.radius.md,
                      backgroundColor: c.surfaceSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="image-outline" size={22} color={c.inkLight} />
                    </View>
                  )}
                  <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink, marginTop: 8 }} numberOfLines={2}>
                    {row.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
