import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
// import TabHeader from '../../../components/ui/TabHeader';
import { supabase } from '../../../lib/supabase';

type Item = {
  id: string;
  name: string;
  tags?: string[];
  category_id?: number | string | null;
  people_list?: string[] | string | null;
  people?: string[] | string | null;
  description?: string | null;
  notes?: string | null;
  title?: string | null;
  location?: string;
  price?: string;
  created_at?: string;
  image_url?: string | null;
  images?: string[] | null;
  image_urls?: string[] | string | null;
  photo_url?: string | null;
  cover_photo_url?: string | null;
};

export default function Items() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [categoryLookup, setCategoryLookup] = useState<Record<string, string>>({});
  const [showCollections, setShowCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionItemMap, setCollectionItemMap] = useState<Record<string, string[]>>({});
  const [collectionsFilter, setCollectionsFilter] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionsUserId, setCollectionsUserId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<string[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleByItemId, setPeopleByItemId] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');

  async function loadEvents() {
    setEventsLoading(true);
    const { data, error } = await supabase.from('events').select('*');
    if (!error) setEvents(data ?? []);
    setEventsLoading(false);
  }

  const loadPeople = useCallback(async () => {
    try {
      setPeopleLoading(true);
      const { data: userData, error } = await supabase.auth.getUser();
      if (error) throw error;
      const userId = userData?.user?.id;
      if (!userId) {
        setPeopleOptions([]);
        return;
      }
      const { data: peopleRows, error: peopleError } = await supabase
        .from('people')
        .select('id,name')
        .eq('user_id', userId)
        .order('name');
      if (peopleError) throw peopleError;
      const names = (peopleRows ?? [])
        .map((row: { name?: string | null }) => String(row?.name ?? '').trim())
        .filter(Boolean);
      setPeopleOptions(Array.from(new Set(names)));
    } catch (e) {
      console.warn('Failed to load people', e);
      setPeopleOptions([]);
    } finally {
      setPeopleLoading(false);
    }
  }, []);

  const loadItemPeople = useCallback(async (itemIds: string[]) => {
    try {
      if (itemIds.length === 0) {
        setPeopleByItemId({});
        return;
      }
      const { data: userData, error } = await supabase.auth.getUser();
      if (error) throw error;
      const userId = userData?.user?.id;
      if (!userId) {
        setPeopleByItemId({});
        return;
      }
      const { data: peopleRows, error: peopleError } = await supabase
        .from('people')
        .select('id,name')
        .eq('user_id', userId);
      if (peopleError) throw peopleError;
      const nameById: Record<string, string> = {};
      (peopleRows ?? []).forEach((row: { id?: string | number | null; name?: string | null }) => {
        if (row?.id == null || !row?.name) return;
        nameById[String(row.id)] = String(row.name);
      });

      const { data: linkRows, error: linkError } = await supabase
        .from('item_people')
        .select('item_id,person_id')
        .in('item_id', itemIds);
      if (linkError) throw linkError;

      const nextMap: Record<string, string[]> = {};
      (linkRows ?? []).forEach((row: { item_id?: string | number | null; person_id?: string | number | null }) => {
        if (row?.item_id == null || row?.person_id == null) return;
        const itemId = String(row.item_id);
        const personId = String(row.person_id);
        const name = nameById[personId];
        if (!name) return;
        if (!nextMap[itemId]) nextMap[itemId] = [];
        if (!nextMap[itemId].includes(name)) nextMap[itemId].push(name);
      });
      setPeopleByItemId(nextMap);
    } catch (e) {
      console.warn('Failed to load item people', e);
      setPeopleByItemId({});
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id,name');
      if (error) throw error;
      const lookup: Record<string, string> = {};
      (data ?? []).forEach((row: { id?: string | number | null; name?: string | null }) => {
        if (row?.id != null && row?.name) {
          const id = String(row.id);
          lookup[id] = row.name;
        }
      });
      setCategoryLookup(lookup);
    } catch (e) {
      console.warn('Failed to load categories', e);
      setCategoryLookup({});
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      setCollectionsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
    setCollectionsUserId(userId ?? null);
  let query = supabase.from('collections').select('id,name');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const normalized = (data ?? [])
        .filter((row: { id?: string | number | null; name?: string | null }) => row?.id)
        .map((row: { id?: string | number | null; name?: string | null }) => ({
          id: String(row.id),
          name: String(row.name ?? `Collection ${row.id}`),
        }));
      setCollections(normalized);

      if (normalized.length === 0) {
        setCollectionItemMap({});
        return;
      }

      const collectionIds = normalized.map((collection) => collection.id);
      const { data: mapRows, error: mapError } = await supabase
        .from('collection_items')
        .select('collection_id,item_id')
        .in('collection_id', collectionIds);
      if (mapError) throw mapError;

      const map: Record<string, string[]> = {};
      (mapRows ?? []).forEach((row: { collection_id?: string | number | null; item_id?: string | number | null }) => {
        if (row?.collection_id == null || row?.item_id == null) return;
        const collectionId = String(row.collection_id);
        const itemId = String(row.item_id);
        if (!map[collectionId]) map[collectionId] = [];
        map[collectionId].push(itemId);
      });
      setCollectionItemMap(map);
    } catch (e) {
      console.warn('Failed to load collections', e);
      setCollections([]);
      setCollectionItemMap({});
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      let query = supabase.from('items').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      const nextItems = (data ?? []) as Item[];
      setItems(nextItems);
      const ids = nextItems.map((it) => String(it.id));
      await loadItemPeople(ids);
    } catch (e: any) {
      console.warn('Failed to load items', e);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadItemPeople]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    loadItems();
    loadPeople();
    loadCategories();
    loadCollections();
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
            let nextItems: Item[] = [];
            setItems((prev) => {
              const filtered = prev.filter((p) => p.id !== newRow.id);
              nextItems = [newRow as Item, ...filtered];
              return nextItems;
            });
            if (nextItems.length) {
              loadItemPeople(nextItems.map((it) => String(it.id)));
            }
            return;
          }

          if (newRow && oldRow) {
            let nextItems: Item[] = [];
            setItems((prev) => {
              nextItems = prev.map((p) => (p.id === newRow.id ? ({ ...p, ...(newRow as Item) } as Item) : p));
              return nextItems;
            });
            if (nextItems.length) {
              loadItemPeople(nextItems.map((it) => String(it.id)));
            }
            return;
          }

          if (oldRow && !newRow) {
            // delete
            let nextItems: Item[] = [];
            setItems((prev) => {
              nextItems = prev.filter((p) => p.id !== oldRow.id);
              return nextItems;
            });
            loadItemPeople(nextItems.map((it) => String(it.id)));
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

    const peopleChannel = supabase
      .channel('item-people')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_people' }, () => {
        const ids = itemsRef.current.map((it) => String(it.id));
        loadItemPeople(ids);
      })
      .subscribe();

    const collectionsChannel = supabase
      .channel('collection-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_items' }, () => {
        loadCollections();
      })
      .subscribe();

    const collectionsListChannel = supabase
      .channel('collections-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        loadCollections();
      })
      .subscribe();

    return () => {
      // unsubscribe the channel when the component unmounts
      try {
        channel.unsubscribe();
        peopleChannel.unsubscribe();
        collectionsChannel.unsubscribe();
        collectionsListChannel.unsubscribe();
      } catch {
        // backward-compat: older versions used supabase.removeChannel
        // @ts-ignore
        if (typeof (supabase as any).removeChannel === 'function') {
          // @ts-ignore
          (supabase as any).removeChannel(channel);
          // @ts-ignore
          (supabase as any).removeChannel(peopleChannel);
          // @ts-ignore
          (supabase as any).removeChannel(collectionsChannel);
          // @ts-ignore
          (supabase as any).removeChannel(collectionsListChannel);
        }
      }
    };
  }, [loadCategories, loadCollections, loadItemPeople, loadItems, loadPeople]);

  function imagesFor(it: Item) {
    if (!it) return [] as string[];
    if (Array.isArray(it.images) && it.images.length > 0) return it.images as string[];
    if (Array.isArray(it.image_urls) && it.image_urls.length > 0) return it.image_urls as string[];
    if (typeof it.image_urls === 'string' && it.image_urls.trim().length > 0) {
      return it.image_urls.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    if (it.image_url) return [it.image_url];
    if (it.photo_url) return [it.photo_url];
    if (it.cover_photo_url) return [it.cover_photo_url];
    return [] as string[];
  }

  const resolveCategoryLabel = useCallback(
    (it: Item) =>
      (it.category_id != null ? categoryLookup[String(it.category_id)] : null) ??
      (it.category_id != null ? String(it.category_id) : null) ??
      '',
    [categoryLookup]
  );

  const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

  const selectedCollectionName = selectedCollectionId
    ? collections.find((collection) => collection.id === selectedCollectionId)?.name ?? null
    : null;
  const filteredCollections = collections.filter((collection) => (
    collection.name.toLowerCase().includes(collectionsFilter.toLowerCase())
  ));
  const normalizedSelectedPeople = selectedPeople.map((person) => normalizeText(person));
  const normalizedQuery = normalizeText(searchQuery);

  const filteredItems = items.filter((it) => {
  const peopleList = peopleByItemId[String(it.id)] ?? [];
  const rawText = peopleList.join(', ');
    const matchesPerson = normalizedSelectedPeople.length > 0
      ? normalizedSelectedPeople.some((person) => (
        peopleList.some((entry) => normalizeText(entry) === person)
        || normalizeText(rawText).includes(person)
      ))
      : true;
    const matchesCollection = selectedCollectionId
      ? (collectionItemMap[selectedCollectionId] ?? []).includes(String(it.id))
      : true;
    const itemName = it.name ?? it.title ?? '';
    const itemDesc = it.description ?? it.notes ?? '';
    const matchesQuery = normalizedQuery
      ? normalizeText(itemName).includes(normalizedQuery)
        || normalizeText(itemDesc).includes(normalizedQuery)
      : true;
    return matchesCollection && matchesPerson && matchesQuery;
  });

  if (loading && !refreshing) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <View style={{ marginTop: 8, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <View>
          <Text style={{ fontSize: 34, fontWeight: '300', color: '#0C1620', fontFamily: 'CormorantGaramond_300Light' }}>My Collection</Text>
          <Text style={{ color: '#4A7A9B', fontSize: 18, marginTop: 2 }}>34 trinkets preserved</Text>
        </View>
  <TouchableOpacity style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#D8E6EE', shadowColor: '#0C1620', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Ionicons name="swap-vertical" size={24} color="#0C1620" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, marginTop: 18, marginBottom: 16, marginHorizontal: 0, borderWidth: 1, borderColor: '#D8E6EE', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
        <Ionicons name="search" size={22} color="#4A7A9B" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search your trinkets..."
          placeholderTextColor="#4A7A9B"
          style={{ flex: 1, fontSize: 18, color: '#0C1620', paddingVertical: 0, backgroundColor: 'transparent' }}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={{ marginLeft: 8, backgroundColor: '#B8783A', borderRadius: 999, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: '#B8783A', shadowOpacity: 0.12, shadowRadius: 8 }}>
          <Ionicons name="camera" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: showCollections ? '#D8E6EE' : '#F7FAFB', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: '#D8E6EE' }}
          onPress={async () => {
            const next = !showCollections;
            setShowCollections(next);
            setShowPeople(false);
            setShowEvents(false);
            if (next) {
              setCollectionsFilter('');
              setNewCollectionName('');
              await loadCollections();
            }
          }}
        >
          <Ionicons name="albums-outline" size={18} color="#B8783A" style={{ marginRight: 6 }} />
          <Text style={{ color: '#0C1620', fontWeight: '600' }}>{selectedCollectionName ? `Collection: ${selectedCollectionName}` : 'Collections'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: showPeople ? '#D8E6EE' : '#F7FAFB', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: '#D8E6EE' }}
          onPress={async () => {
            const next = !showPeople;
            setShowPeople(next);
            setShowCollections(false);
            setShowEvents(false);
            if (next) await loadPeople();
          }}
        >
          <Ionicons name="people-outline" size={18} color="#B8783A" style={{ marginRight: 6 }} />
          <Text style={{ color: '#0C1620', fontWeight: '600' }}>
            {selectedPeople.length > 0 ? `People: ${selectedPeople.join(', ')}` : 'People'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: showEvents ? '#D8E6EE' : '#F7FAFB', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: '#D8E6EE' }}
          onPress={async () => {
            setShowEvents((v) => !v);
            setShowCollections(false);
            setShowPeople(false);
            if (!showEvents) await loadEvents();
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#B8783A" style={{ marginRight: 6 }} />
          <Text style={{ color: '#0C1620', fontWeight: '600' }}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFB', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#D8E6EE' }}
          onPress={() => {
            setSelectedCollectionId(null);
            setSelectedPeople([]);
            setShowCollections(false);
            setShowPeople(false);
            setShowEvents(false);
          }}
        >
          <Ionicons name="close-circle-outline" size={18} color="#4A7A9B" style={{ marginRight: 6 }} />
          <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>Clear Filters</Text>
        </TouchableOpacity>
      </View>

      {showCollections && (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#D8E6EE', padding: 12, marginBottom: 16 }}>
          <View style={{ paddingBottom: 8 }}>
            <TextInput
              value={collectionsFilter}
              onChangeText={setCollectionsFilter}
              placeholder="Search collections"
              placeholderTextColor="#9BBCD1"
              style={{ backgroundColor: '#F7FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14, borderWidth: 1, borderColor: '#D8E6EE' }}
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedCollectionId(null);
              setShowCollections(false);
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: selectedCollectionId ? '#F7FAFB' : '#D8E6EE', marginBottom: 6 }}
          >
            <Text style={{ color: '#B8783A', fontWeight: '700' }}>All Collections</Text>
          </TouchableOpacity>
          {collectionsLoading ? (
            <Text style={{ color: '#4A7A9B', paddingVertical: 6 }}>Loading collections...</Text>
          ) : filteredCollections.length === 0 ? (
            <View>
              <Text style={{ color: '#4A7A9B', paddingVertical: 6 }}>No collections found.</Text>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 6 }}>
                <TextInput
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  placeholder="New collection name"
                  placeholderTextColor="#9BBCD1"
                  style={{ flex: 1, backgroundColor: '#F7FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14, borderWidth: 1, borderColor: '#D8E6EE' }}
                />
                <TouchableOpacity
                  onPress={async () => {
                    const name = newCollectionName.trim();
                    if (!name) return;
                    if (!collectionsUserId) {
                      Alert.alert('Missing user', 'Please sign in to create a collection.');
                      return;
                    }
                    const { data: created, error } = await supabase
                      .from('collections')
                      .insert([{ name, user_id: collectionsUserId }])
                      .select('id,name')
                      .single();
                    if (error) {
                      Alert.alert('Create failed', error.message ?? 'Could not create collection.');
                      return;
                    }
                    if (created?.id) {
                      const updated = [...collections, { id: String(created.id), name: String(created.name ?? name) }];
                      updated.sort((a, b) => a.name.localeCompare(b.name));
                      setCollections(updated);
                      setSelectedCollectionId(String(created.id));
                      setShowCollections(false);
                      setNewCollectionName('');
                    }
                  }}
                  style={{ backgroundColor: '#B8783A', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {filteredCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  onPress={() => {
                    setSelectedCollectionId(collection.id);
                    setShowCollections(false);
                  }}
                  style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: selectedCollectionId === collection.id ? '#D8E6EE' : '#F7FAFB', marginBottom: 6 }}
                >
                  <Text style={{ color: '#0C1620', fontWeight: '600' }}>{collection.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {showPeople && (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#D8E6EE', padding: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setSelectedPeople([])}
            style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: selectedPeople.length ? '#F7FAFB' : '#D8E6EE', marginBottom: 6 }}
          >
            <Text style={{ color: '#B8783A', fontWeight: '700' }}>All People</Text>
          </TouchableOpacity>
          {peopleLoading ? (
            <Text style={{ color: '#4A7A9B', paddingVertical: 6 }}>Loading people...</Text>
          ) : peopleOptions.length === 0 ? (
            <Text style={{ color: '#4A7A9B', paddingVertical: 6 }}>No people yet.</Text>
          ) : (
            peopleOptions.map((person) => (
              <TouchableOpacity
                key={person}
                onPress={() => {
                  setSelectedPeople((prev) => (
                    prev.includes(person)
                      ? prev.filter((entry) => entry !== person)
                      : [...prev, person]
                  ));
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: selectedPeople.includes(person) ? '#D8E6EE' : '#F7FAFB', marginBottom: 6 }}
              >
                <Text style={{ color: '#0C1620', fontWeight: '600' }}>{person}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Items or Events List */}
      {showEvents ? (
        <View>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#4A7A9B', fontWeight: '600', fontSize: 18 }}>Your Events</Text>
              <Button title="Add an Event" onPress={() => router.push('/events-create')} />
            </View>
          </Card>
          {eventsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <Card>
              <Text style={{ marginBottom: 8 }}>No events yet.</Text>
              <Button title="Add your first event" onPress={() => router.push('/events-create')} />
            </Card>
          ) : (
            <ScrollView style={{ marginTop: 12 }}>
              {events.map(ev => (
                <TouchableOpacity key={ev.id} style={{ marginBottom: 16 }} onPress={() => router.push({ pathname: '/events-detail', params: { id: ev.id } })}>
                  <Card>
                    <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#0C1620' }}>{ev.name}</Text>
                    <Text style={{ color: '#4A7A9B', fontSize: 15, marginTop: 2 }}>{ev.event_date || ev.start_date || ''}</Text>
                    <Text style={{ color: '#4A7A9B', fontSize: 14, marginTop: 2 }}>{ev.description || ''}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : filteredItems.length === 0 ? (
        <Card>
          <Text style={{ marginBottom: 8 }}>{selectedCollectionId ? 'No items match this collection yet.' : selectedPeople.length ? 'No items match these people yet.' : 'No items yet.'}</Text>
          <Button title="Add your first item" onPress={() => router.push('/(tabs)/add')} />
        </Card>
      ) : (
  <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); loadPeople(); loadCollections(); }} />} style={{ marginBottom: 12 }}>
          {filteredItems.map((it) => (
            <TouchableOpacity key={it.id} onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } })} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, shadowColor: '#0C1620', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: '#D8E6EE' }}>
                <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#0C1620', alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' }}>
                  {imagesFor(it).length > 0 ? (
                    <Image source={{ uri: imagesFor(it)[0] }} style={{ width: 56, height: 56, borderRadius: 14, resizeMode: 'cover' }} />
                  ) : (
                    <Ionicons name="cube-outline" size={32} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '300', fontSize: 20, color: '#0C1620', fontFamily: 'CormorantGaramond_300Light' }} numberOfLines={1}>{it.name}</Text>
                  <Text style={{ color: '#4A7A9B', fontSize: 15, marginTop: 2 }} numberOfLines={1}>{it.location || 'No description'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {(() => {
                      const label = resolveCategoryLabel(it);
                      return label ? (
                        <View style={{ backgroundColor: '#D8E6EE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>
                          <Text style={{ color: '#B8783A', fontWeight: '600', fontSize: 13 }}>{label}</Text>
                        </View>
                      ) : null;
                    })()}
                    <Text style={{ color: '#4A7A9B', fontSize: 14 }}>{it.created_at ? new Date(it.created_at).toLocaleDateString() : ''}</Text>
                  </View>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Ionicons name="chevron-forward" size={24} color="#4A7A9B" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: 'transparent' }}>
        <Text style={{ color: '#4A7A9B', fontWeight: '600', fontSize: 16 }}>{`Showing ${Math.min(items.length, 5)} of ${items.length} memories`}</Text>
      </View>
    </Screen>
  );
}
