/* TK_THEME */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../../../components/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
// import TabHeader from '../../../components/ui/TabHeader';
import { supabase } from '../../../lib/supabase';
import { tokens } from '../../../lib/tokens';

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

  const plate = { backgroundColor: tokens.colors.card, borderWidth: 1, borderColor: tokens.colors.border, padding: 3 };
  const chip = (on: boolean) => ({
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: on ? tokens.colors.tint : 'transparent',
    paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, marginBottom: 8,
    borderWidth: 1, borderColor: on ? tokens.colors.accent : tokens.colors.border,
    minHeight: tokens.minTarget,
  });
  const panel = { backgroundColor: tokens.colors.card, borderWidth: 1, borderColor: tokens.colors.border, padding: 12, marginBottom: 16 };
  const listRow = (on: boolean) => ({
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4, minHeight: tokens.minTarget,
    backgroundColor: on ? tokens.colors.tint : 'transparent',
    borderLeftWidth: 2, borderLeftColor: on ? tokens.colors.accent : 'transparent',
  });

  return (
    <Screen>
      {/* Header */}
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...tokens.type.title, color: tokens.colors.ink }}>My collection</Text>
          <Text style={{ ...tokens.type.body, color: tokens.colors.inkLabel, marginTop: 2 }}>
            {items.length === 0 ? 'Nothing kept yet' : `${items.length} ${items.length === 1 ? 'object' : 'objects'} kept`}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Sort"
          style={{ borderWidth: 1, borderColor: tokens.colors.border, padding: 11, minWidth: tokens.minTarget, minHeight: tokens.minTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="swap-vertical" size={20} color={tokens.colors.inkLabel} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.colors.card, paddingHorizontal: 14, marginTop: 20, marginBottom: 16, borderWidth: 1, borderColor: tokens.colors.border }}>
        <Ionicons name="search" size={20} color={tokens.colors.inkGhost} style={{ marginRight: 10 }} />
        <TextInput
          placeholder="Search names, people, places"
          placeholderTextColor={tokens.colors.inkLabel}
          style={{ flex: 1, ...tokens.type.ui, color: tokens.colors.ink, paddingVertical: 13 }}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          accessibilityLabel="Search by photograph"
          style={{ marginLeft: 8, borderWidth: 1, borderColor: tokens.colors.accent, width: tokens.minTarget, height: tokens.minTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="camera-outline" size={20} color={tokens.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity
          style={chip(showCollections || !!selectedCollectionId)}
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
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.ink }}>
            {selectedCollectionName ?? 'Collections'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={chip(showPeople || selectedPeople.length > 0)}
          onPress={async () => {
            const next = !showPeople;
            setShowPeople(next);
            setShowCollections(false);
            setShowEvents(false);
            if (next) await loadPeople();
          }}
        >
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.ink }}>
            {selectedPeople.length > 0 ? selectedPeople.join(', ') : 'People'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={chip(showEvents)}
          onPress={async () => {
            setShowEvents((v) => !v);
            setShowCollections(false);
            setShowPeople(false);
            if (!showEvents) await loadEvents();
          }}
        >
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.ink }}>Events</Text>
        </TouchableOpacity>

        {(selectedCollectionId || selectedPeople.length > 0) && (
          <TouchableOpacity
            style={chip(false)}
            onPress={() => {
              setSelectedCollectionId(null);
              setSelectedPeople([]);
              setShowCollections(false);
              setShowPeople(false);
              setShowEvents(false);
            }}
          >
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.link }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCollections && (
        <View style={panel}>
          <TextInput
            value={collectionsFilter}
            onChangeText={setCollectionsFilter}
            placeholder="Search collections"
            placeholderTextColor={tokens.colors.inkLabel}
            style={{ borderWidth: 1, borderColor: tokens.colors.border, paddingHorizontal: 12, paddingVertical: 11, color: tokens.colors.ink, ...tokens.type.ui, marginBottom: 8 }}
          />
          <TouchableOpacity
            onPress={() => { setSelectedCollectionId(null); setShowCollections(false); }}
            style={listRow(!selectedCollectionId)}
          >
            <Text style={{ ...tokens.type.ui, color: tokens.colors.ink }}>All collections</Text>
          </TouchableOpacity>
          {collectionsLoading ? (
            <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, paddingVertical: 8 }}>Loading collections</Text>
          ) : filteredCollections.length === 0 ? (
            <View>
              <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, paddingVertical: 8 }}>No collections yet.</Text>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 6 }}>
                <TextInput
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  placeholder="New collection name"
                  placeholderTextColor={tokens.colors.inkLabel}
                  style={{ flex: 1, borderWidth: 1, borderColor: tokens.colors.border, paddingHorizontal: 12, paddingVertical: 11, color: tokens.colors.ink, ...tokens.type.ui }}
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
                  style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 18, justifyContent: 'center', minHeight: tokens.minTarget }}
                >
                  <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {filteredCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  onPress={() => { setSelectedCollectionId(collection.id); setShowCollections(false); }}
                  style={listRow(selectedCollectionId === collection.id)}
                >
                  <Text style={{ ...tokens.type.ui, color: tokens.colors.ink }}>{collection.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {showPeople && (
        <View style={panel}>
          <TouchableOpacity onPress={() => setSelectedPeople([])} style={listRow(selectedPeople.length === 0)}>
            <Text style={{ ...tokens.type.ui, color: tokens.colors.ink }}>All people</Text>
          </TouchableOpacity>
          {peopleLoading ? (
            <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, paddingVertical: 8 }}>Loading people</Text>
          ) : peopleOptions.length === 0 ? (
            <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, paddingVertical: 8 }}>No people named yet.</Text>
          ) : (
            peopleOptions.map((person) => (
              <TouchableOpacity
                key={person}
                onPress={() => {
                  setSelectedPeople((prev) => (
                    prev.includes(person) ? prev.filter((e) => e !== person) : [...prev, person]
                  ));
                }}
                style={listRow(selectedPeople.includes(person))}
              >
                <Text style={{ ...tokens.type.ui, color: tokens.colors.ink }}>{person}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* The list */}
      {showEvents ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleStrong }}>
            <Text style={{ ...tokens.type.name, color: tokens.colors.ink }}>Events</Text>
            <TouchableOpacity onPress={() => router.push('/events-create')} style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 16, paddingVertical: 12, minHeight: tokens.minTarget, justifyContent: 'center' }}>
              <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Add an event</Text>
            </TouchableOpacity>
          </View>
          {eventsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.colors.border, padding: 28, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, textAlign: 'center', marginBottom: 16 }}>
                No events yet. A day worth remembering — a wedding, a move, a clearing out.
              </Text>
              <TouchableOpacity onPress={() => router.push('/events-create')} style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 18, paddingVertical: 12, minHeight: tokens.minTarget, justifyContent: 'center' }}>
                <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Add your first event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={{ marginTop: 4 }}>
              {events.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  onPress={() => router.push({ pathname: '/events-detail', params: { id: ev.id } })}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleSoft }}
                >
                  <Text style={{ ...tokens.type.name, color: tokens.colors.ink }}>{ev.name}</Text>
                  <Text style={{ ...tokens.type.fact, color: tokens.colors.inkFact, marginTop: 4 }}>{ev.event_date || ev.start_date || ''}</Text>
                  {!!ev.description && (
                    <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, marginTop: 4 }} numberOfLines={2}>{ev.description}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.colors.border, padding: 32, alignItems: 'center' }}>
          <View style={{ width: 16, height: 16, borderWidth: 1, borderColor: tokens.colors.inkGhost, marginBottom: 16 }} />
          <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, textAlign: 'center', marginBottom: 20 }}>
            {selectedCollectionId
              ? 'Nothing in this collection yet.'
              : selectedPeople.length
                ? 'Nothing tagged with these people yet.'
                : 'Nothing catalogued yet. Photograph one thing and the archive begins.'}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/add')} style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 20, paddingVertical: 13, minHeight: tokens.minTarget, justifyContent: 'center' }}>
            <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Add your first item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); loadPeople(); loadCollections(); }} />}
          style={{ marginBottom: 12 }}
        >
          <View style={{ borderTopWidth: 1, borderTopColor: tokens.colors.ruleStrong }} />
          {filteredItems.map((it) => (
            <TouchableOpacity
              key={it.id}
              onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleSoft }}
            >
              <View style={{ ...plate, width: 66, height: 66, marginRight: 14 }}>
                <View style={{ flex: 1, backgroundColor: tokens.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                  {imagesFor(it).length > 0 ? (
                    <Image source={{ uri: imagesFor(it)[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  ) : (
                    <View style={{ width: 13, height: 13, borderWidth: 1, borderColor: tokens.colors.inkGhost }} />
                  )}
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ ...tokens.type.nameSmall, color: tokens.colors.ink }} numberOfLines={2}>{it.name}</Text>
                {(() => {
                  const label = resolveCategoryLabel(it);
                  const bits = [label, it.location].filter(Boolean);
                  return bits.length ? (
                    <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.inkLabel, marginTop: 2 }} numberOfLines={1}>
                      {bits.join(' · ')}
                    </Text>
                  ) : null;
                })()}
                {!!it.created_at && (
                  <Text style={{ ...tokens.type.fact, fontSize: 12, color: tokens.colors.inkFact, marginTop: 5 }}>
                    {new Date(it.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>

              <Ionicons name="chevron-forward" size={20} color={tokens.colors.inkGhost} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Footer */}
      {filteredItems.length > 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.inkLabel }}>
            {filteredItems.length === items.length
              ? `${items.length} ${items.length === 1 ? 'object' : 'objects'}`
              : `Showing ${filteredItems.length} of ${items.length}`}
          </Text>
        </View>
      )}
    </Screen>
  );
}
