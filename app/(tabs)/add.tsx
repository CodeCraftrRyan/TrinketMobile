import Ionicons from '@expo/vector-icons/Ionicons';
// Lazy-load expo-image-picker at runtime to avoid requiring the native module
// at app startup (prevents crashes when the development client doesn't include
// the module). The module will be dynamically imported when the user attempts
// to pick or take a photo.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';


const CATEGORY_ICON_MAP: Record<string, string> = {
  jewelry: 'diamond',
  collectible: 'star',
  art: 'color-palette',
  photo: 'camera',
  photos: 'camera',
  letter: 'mail',
  letters: 'mail',
  book: 'book',
  books: 'book',
  memory: 'bookmark',
  memories: 'bookmark',
};

const fallbackCategoryIcon = 'pricetag';

const getCategoryIcon = (label: string) => {
  const key = label.trim().toLowerCase();
  return CATEGORY_ICON_MAP[key] ?? fallbackCategoryIcon;
};


const ROOM_OPTIONS = [
  { label: 'Living Room', icon: 'home' },
  { label: 'Bedroom', icon: 'bed' },
  { label: 'Office', icon: 'briefcase' },
  { label: 'Storage', icon: 'archive' },
];

const ACQUIRED_OPTIONS = [
  { label: 'Gift', icon: 'gift' },
  { label: 'Purchase', icon: 'cart' },
  { label: 'Inheritance', icon: 'ribbon' },
  { label: 'Found', icon: 'search' },
  { label: 'Other', icon: 'help-circle' },
];


export default function AddTab() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const today = new Date().toISOString().split('T')[0];
  const [focusedField, setFocusedField] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<{ id?: string; label: string; icon: string } | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<{ id?: string; label: string; icon: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [room, setRoom] = useState(ROOM_OPTIONS[0]);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [acquired, setAcquired] = useState(ACQUIRED_OPTIONS[0]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<string[]>([]);
  const [peopleModalVisible, setPeopleModalVisible] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [eventsUserId, setEventsUserId] = useState<string | null>(null);
  const [collection, setCollection] = useState('');
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [eventsFilter, setEventsFilter] = useState('');
  const [collectionsFilter, setCollectionsFilter] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionsUserId, setCollectionsUserId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(null);

  const filteredEvents = events.filter((row) => row.name.toLowerCase().includes(eventsFilter.toLowerCase()));
  const filteredCollections = collections.filter((row) => row.toLowerCase().includes(collectionsFilter.toLowerCase()));

  async function fetchPeopleOptions() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = data?.user?.id;
    if (!userId) return [];
    const { data: peopleRows, error: peopleError } = await supabase
      .from('people')
      .select('id,name')
      .eq('user_id', userId)
      .order('name');
    if (peopleError) throw peopleError;
    const unique = Array.from(
      new Set((peopleRows ?? [])
        .map((row: { name?: string | null }) => String(row?.name ?? '').trim())
        .filter(Boolean))
    );
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }

  async function pickFromLibrary() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to load image picker', e);
      Alert.alert('Image picker unavailable', 'Please try again later.');
    }
  }

  async function takePhoto() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to load image picker', e);
      Alert.alert('Camera unavailable', 'Please try again later.');
    }
  }

  async function handlePhotoUpload() {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  const handleCategorySelect = (item: { label: string; icon: string }) => {
    setCategory(item);
    setCategoryLabel(item.label);
    setCategoryModalVisible(false);
  };

  const handleRoomPress = () => {
    setRoomModalVisible(true);
  };

  const handleRoomSelect = (item: { label: string; icon: string }) => {
    setRoom(item);
    setRoomModalVisible(false);
  };

  const handleAcquiredPress = () => {
    const currentIndex = ACQUIRED_OPTIONS.findIndex(opt => opt.label === acquired.label);
    const nextIndex = (currentIndex + 1) % ACQUIRED_OPTIONS.length;
    setAcquired(ACQUIRED_OPTIONS[nextIndex]);
  };

  useEffect(() => {
    let mounted = true;
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        let query = supabase.from('events').select('id,name');
        if (userId) {
          query = query.eq('user_id', userId);
          if (mounted) setEventsUserId(userId);
        } else if (mounted) {
          setEventsUserId(null);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (!mounted) return;
        setEvents((data ?? []).filter((row) => row?.id && row?.name));
      } catch (e) {
        console.warn('Failed to load events', e);
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoadingEvents(false);
      }
    }
    loadEvents();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPeopleOptions() {
      try {
        const unique = await fetchPeopleOptions();
        if (mounted) setPeopleOptions(unique);
      } catch (e) {
        console.warn('Failed to load people list', e);
        if (mounted) setPeopleOptions([]);
      }
    }
    loadPeopleOptions();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!peopleModalVisible) return;
    let mounted = true;
    async function refreshPeopleOptions() {
      try {
        const unique = await fetchPeopleOptions();
        if (mounted) setPeopleOptions(unique);
      } catch (e) {
        console.warn('Failed to refresh people list', e);
      }
    }
    refreshPeopleOptions();
    return () => { mounted = false; };
  }, [peopleModalVisible]);

  useEffect(() => {
    let mounted = true;
    async function loadCollections() {
      try {
        setLoadingCollections(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          if (mounted) {
            setCollections([]);
            setCollectionsUserId(null);
          }
          return;
        }
        if (mounted) setCollectionsUserId(userId);
        const { data, error } = await supabase
          .from('collections')
          .select('id,name')
          .eq('user_id', userId)
          .order('name');
        if (error) throw error;
        if (!mounted) return;
        const uniqueCollections = Array.from(
          new Set(
            (data ?? [])
              .map((row: { name?: string | null }) => row?.name)
              .filter((value): value is string => Boolean(value && String(value).trim()))
              .map((value) => String(value).trim())
          )
        );
        uniqueCollections.sort((a, b) => a.localeCompare(b));
        setCollections(uniqueCollections);
      } catch (e) {
        console.warn('Failed to load collections', e);
        if (mounted) setCollections([]);
      } finally {
        if (mounted) setLoadingCollections(false);
      }
    }
    loadCollections();
    return () => { mounted = false; };
  }, []);

  async function syncItemPeople(itemId: string | number) {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: peopleRows, error: peopleError } = await supabase
      .from('people')
      .select('id,name')
      .eq('user_id', userId);
    if (peopleError) throw peopleError;

    const nameToId = new Map<string, string>();
    (peopleRows ?? []).forEach((row: { id?: string | number | null; name?: string | null }) => {
      if (row?.id == null || !row?.name) return;
      nameToId.set(String(row.name).toLowerCase(), String(row.id));
    });

    const selectedIds = selectedPeople
      .map((name) => nameToId.get(String(name).toLowerCase()))
      .filter((value): value is string => Boolean(value));

    const { error: deleteError } = await supabase
      .from('item_people')
      .delete()
      .eq('item_id', itemId);
    if (deleteError) throw deleteError;

    if (selectedIds.length === 0) return;
    const rows = selectedIds.map((personId) => ({ item_id: itemId, person_id: personId }));
    const { error: insertError } = await supabase.from('item_people').insert(rows);
    if (insertError) throw insertError;
  }

  async function syncItemCollection(itemId: string | number) {
    const name = collection.trim();
    const { data: userData, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = userData?.user?.id;
    if (!userId) return;

    const { error: deleteError } = await supabase
      .from('collection_items')
      .delete()
      .eq('item_id', itemId);
    if (deleteError) throw deleteError;

    if (!name) return;

    const { data: existing, error: findError } = await supabase
  .from('collections')
  .select('id,name')
  .eq('user_id', userId)
  .ilike('name', name)
      .maybeSingle();
    if (findError) throw findError;

    let collectionId = existing?.id ? String(existing.id) : null;
    if (!collectionId) {
      const { data: created, error: createError } = await supabase
  .from('collections')
  .insert([{ name, user_id: userId }])
        .select('id')
        .maybeSingle();
      if (createError) throw createError;
      collectionId = created?.id ? String(created.id) : null;
    }

    if (!collectionId) return;
    const { error: linkError } = await supabase
      .from('collection_items')
      .insert([{ collection_id: collectionId, item_id: itemId }]);
    if (linkError) throw linkError;
  }

  async function createItem() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a name');
      return null;
    }
    const { data: userData, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = userData?.user?.id ?? null;
    const cleanedValue = estimatedValue.trim()
      ? Number(estimatedValue.replace(/[^0-9.]/g, ''))
      : null;
    const row: Record<string, any> = {
      name: trimmedName,
      description: description.trim() || null,
      estimated_value: Number.isFinite(cleanedValue as number) ? cleanedValue : null,
      date_purchased: date.trim() || null,
      acquisition_method: acquired?.label ?? null,
      location: room?.label ?? null,
      item_category: category?.label ?? categoryLabel ?? null,
      event_id: eventId ?? null,
      user_id: userId,
      photo_url: photo ?? null,
    };
    const { data, error: insertError } = await supabase
      .from('items')
      .insert([row])
      .select('id')
      .maybeSingle();
    if (insertError) throw insertError;
    if (data?.id) {
      await syncItemPeople(data.id);
      await syncItemCollection(data.id);
      return String(data.id);
    }
    return null;
  }

  useEffect(() => {
    let mounted = true;
    async function loadItem() {
      if (!id) return;
      try {
        const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!mounted || !data) return;
        setName(data.name ?? data.title ?? '');
        setDescription(data.description ?? data.notes ?? '');
        setEstimatedValue(String(data.estimated_value ?? data.price ?? ''));
  setDate(data.date_purchased ?? data.purchase_date ?? today);
  setSelectedPeople([]);
        try {
          const { data: linkRows, error: linkError } = await supabase
            .from('item_people')
            .select('person_id')
            .eq('item_id', id);
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
              .filter((row: { id?: string | number | null; name?: string | null }) => row?.name)
              .map((row: { name?: string | null }) => String(row.name));
            setSelectedPeople(names);
          }
        } catch (e) {
          console.warn('Failed to load item people', e);
        }
        try {
          const { data: collectionLinkRows, error: collectionLinkError } = await supabase
            .from('collection_items')
            .select('collection_id')
            .eq('item_id', id)
            .maybeSingle();
          if (collectionLinkError) throw collectionLinkError;
          if (collectionLinkRows?.collection_id) {
            const { data: collectionRow, error: collectionError } = await supabase
              .from('collections')
              .select('id,name')
              .eq('id', collectionLinkRows.collection_id)
              .maybeSingle();
            if (!collectionError && collectionRow?.name) {
              setCollection(String(collectionRow.name));
            }
          }
        } catch (e) {
          console.warn('Failed to load collection', e);
        }
        if (data.event_id) {
          setEventId(String(data.event_id));
        } else if (data.event) {
          setEventName(String(data.event));
        }


        const categoryValue = data.item_category ?? data.category ?? null;
        if (categoryValue) {
          const label = String(categoryValue);
          setCategoryLabel(label);
          const foundCategory = categoryOptions.find(option => option.label.toLowerCase() === label.toLowerCase());
          if (foundCategory) setCategory(foundCategory);
        }

        const roomLabel = data.location ?? data.room ?? null;
        if (roomLabel) {
          const foundRoom = ROOM_OPTIONS.find(option => option.label.toLowerCase() === String(roomLabel).toLowerCase());
          if (foundRoom) setRoom(foundRoom);
        }

        const acquiredLabel = data.acquisition_method ?? data.acquired ?? null;
        if (acquiredLabel) {
          const foundAcquired = ACQUIRED_OPTIONS.find(option => option.label.toLowerCase() === String(acquiredLabel).toLowerCase());
          if (foundAcquired) setAcquired(foundAcquired);
        }

        const image = Array.isArray(data.images) && data.images.length > 0
          ? data.images[0]
          : Array.isArray(data.image_urls) && data.image_urls.length > 0
            ? data.image_urls[0]
            : typeof data.image_urls === 'string'
              ? data.image_urls.split(',')[0]
              : data.image_url ?? data.photo_url ?? data.cover_photo_url ?? null;
        if (image) setPhoto(image);
      } catch (e) {
        console.warn('Failed to load item for edit', e);
      }
    }
    loadItem();
    return () => { mounted = false; };
  }, [id, categoryOptions, today]);

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        const { data, error } = await supabase.from('categories').select('id,name');
        if (error) throw error;
        if (!mounted) return;
        const options = (data ?? []).map((row: { id?: string; name?: string | null }) => ({
          id: row.id,
          label: row.name ?? 'Uncategorized',
          icon: getCategoryIcon(row.name ?? 'Uncategorized'),
        }));
        setCategoryOptions(options);
        if (options.length > 0) {
          setCategory(prev => prev ?? options[0]);
          setCategoryLabel(prev => prev ?? options[0].label);
        }
      } catch (e) {
        console.warn('Failed to load categories', e);
        if (mounted) setCategoryOptions([]);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }
    loadCategories();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!categoryLabel || categoryOptions.length === 0) return;
    const found = categoryOptions.find(option => option.label.toLowerCase() === categoryLabel.toLowerCase());
    if (found) {
      setCategory(found);
    } else {
      setCategory({ label: categoryLabel, icon: getCategoryIcon(categoryLabel) });
    }
  }, [categoryLabel, categoryOptions]);

  useEffect(() => {
    if (eventId && !eventName) {
      const matched = events.find((row) => row.id === eventId);
      if (matched) setEventName(matched.name);
    }
  }, [eventId, eventName, events]);

  return (
  <ScrollView style={{ flex: 1, backgroundColor: '#4A7A9B' }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        <BrandHeader
          style={{ marginTop: 32, marginBottom: 20 }}
          textColor="#FFFFFF"
          subtitleColor="#9BBCD1"
        />
        {/* Photo Upload */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#F7FAFB', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#D8E6EE', alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}
            onPress={handlePhotoUpload}
            activeOpacity={0.8}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: 101, height: 101, borderRadius: 12, resizeMode: 'cover' }} />
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name="camera" size={36} color="#4A7A9B" />
                <Text style={{ color: '#4A7A9B', fontWeight: '700', fontSize: 12, textAlign: 'center' }} numberOfLines={1}>
                  Upload Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={{ color: '#4A7A9B', marginTop: 8, fontWeight: '600' }}>
            {photo ? 'Change Photo' : 'Click to upload'}
          </Text>
        </View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 17.85,
          paddingVertical: 16.8,
          borderWidth: 1,
          borderColor: '#D8E6EE',
          backgroundColor: '#FFFFFF',
          marginTop: '2%',
          marginBottom: '2%',
          ...(focusedField !== 'name' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
          borderRadius: 10,
        }}>
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 15.225, fontFamily: 'DMSans_500Medium' }}>Name</Text>
          <TextInput
            style={{ flex: 2, color: '#4A7A9B', fontSize: 15.225, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}
            value={name}
            onChangeText={setName}
            placeholder="Grandma's Locket..."
            placeholderTextColor="#9BBCD1"
            onFocus={() => {
              setFocusedField('name');
              if (name === '' || name === "Grandma's Locket...") setName('');
            }}
            onBlur={() => setFocusedField('')}
          />
        </View>

        {/* Category */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'category' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => {
            setFocusedField('category');
            setCategoryModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Category</Text>
          <Text style={{ flex: 2, color: '#4A7A9B', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}>
            {category?.label ?? 'Select category'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

  {/* Description */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'description' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => setFocusedField('description')}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Description</Text>
          <View style={{ flex: 2 }}>
            <TextInput
              style={{ color: '#4A7A9B', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 'Gold locket with initials'"
              placeholderTextColor="#9BBCD1"
              onFocus={() => {
                setFocusedField('description');
                if (description === '' || description === "'Gold locket with initials'") setDescription('');
              }}
              onBlur={() => setFocusedField('')}
            />
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

  {/* Category Modal */}
        <Modal
          visible={categoryModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '80%', maxHeight: 320, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>Select Category</Text>
              <FlatList
                data={categoryOptions}
                keyExtractor={item => item.id ?? item.label}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleCategorySelect(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                  >
                    <Ionicons name={item.icon as any} size={18} color="#B8783A" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: item.label === category?.label ? 'bold' : '600' }}>{item.label}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>
                    {categoriesLoading ? 'Loading categories...' : 'No categories found.'}
                  </Text>
                }
                showsVerticalScrollIndicator={false}
              />
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

  {/* Room/Location (Scrollable Picklist) */}
        <TouchableOpacity
          onPress={handleRoomPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'room' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onFocus={() => setFocusedField('room')}
          onBlur={() => setFocusedField('')}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Room/Location</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A7A9B', borderRadius: 12.75, paddingHorizontal: 10, paddingVertical: 2.5, marginRight: 6 }}>
            <Ionicons name={room.icon as any} size={14.5} color="#fff" style={{ marginRight: 4 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.75, fontFamily: 'DMSans_500Medium' }}>{room.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* Room/Location Modal */}
        <Modal
          visible={roomModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRoomModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '80%', maxHeight: 320, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>Select Room/Location</Text>
              <FlatList
                data={ROOM_OPTIONS}
                keyExtractor={item => item.label}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleRoomSelect(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                  >
                    <Ionicons name={item.icon as any} size={18} color="#4A7A9B" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: item.label === room.label ? 'bold' : '600' }}>{item.label}</Text>
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
              <TouchableOpacity onPress={() => setRoomModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Estimated Value */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 17.85,
          paddingVertical: 16.8,
          borderWidth: 1,
          borderColor: '#D8E6EE',
          backgroundColor: '#FFFFFF',
          marginTop: '2%',
          marginBottom: '2%',
          ...(focusedField !== 'value' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
          borderRadius: 10,
        }}>
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 15.225, fontFamily: 'DMSans_500Medium' }}>Estimated Value</Text>
          <View style={{ flex: 2 }}>
            <TextInput
              style={{ color: '#4A7A9B', fontSize: 15.225, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              placeholder="$0.00 (optional)"
              placeholderTextColor="#9BBCD1"
              keyboardType="numeric"
              onFocus={() => setFocusedField('value')}
              onBlur={() => setFocusedField('')}
            />
            <Text style={{ color: '#4A7A9B', fontSize: 11, textAlign: 'right', marginTop: 2 }}>Estimate if known, e.g. $100.00</Text>
          </View>
        </View>

        {/* People */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'people' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => {
            setFocusedField('people');
            setPeopleModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>People</Text>
          <Text style={{ flex: 2, color: selectedPeople.length ? '#4A7A9B' : '#9AAAB5', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}>
            {selectedPeople.length ? selectedPeople.join(', ') : 'Select people'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* People Modal */}
        <Modal
          visible={peopleModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setPeopleModalVisible(false);
            setFocusedField('');
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '85%', maxHeight: 420, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>Select People</Text>
              <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                <TextInput
                  style={{ backgroundColor: '#D8E6EE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14 }}
                  value={peopleFilter}
                  onChangeText={setPeopleFilter}
                  placeholder="Search people"
                  placeholderTextColor="#9BBCD1"
                />
              </View>
              <FlatList
                data={peopleOptions.filter((person) => person.toLowerCase().includes(peopleFilter.toLowerCase()))}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const selected = selectedPeople.includes(item);
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedPeople((prev) => (
                          prev.includes(item)
                            ? prev.filter((entry) => entry !== item)
                            : [...prev, item]
                        ));
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                    >
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? '#B8783A' : '#B0C4D4'} style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: selected ? 'bold' : '600' }}>{item}</Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>No people found.</Text>
                }
                showsVerticalScrollIndicator={false}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedPeople([])}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: '#4A7A9B', fontWeight: '700', fontSize: 15 }}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPeopleModalVisible(false);
                    setFocusedField('');
                  }}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Date */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'date' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => setFocusedField('date')}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Date</Text>
          <TextInput
            style={{ flex: 2, color: '#4A7A9B', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}
            value={date}
            onChangeText={setDate}
            placeholder={today}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            placeholderTextColor="#9BBCD1"
            onFocus={() => setFocusedField('date')}
            onBlur={() => setFocusedField('')}
          />
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* Acquired Picklist */}
        <TouchableOpacity
          onPress={handleAcquiredPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'acquired' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onFocus={() => setFocusedField('acquired')}
          onBlur={() => setFocusedField('')}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Acquired</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#B8783A', borderRadius: 12.75, paddingHorizontal: 10, paddingVertical: 2.5, marginRight: 6 }}>
            <Ionicons name={acquired.icon as any} size={14.5} color="#fff" style={{ marginRight: 4 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.75, fontFamily: 'DMSans_500Medium' }}>{acquired.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* Event Lookup */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'event' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => {
            setFocusedField('event');
            setEventModalVisible(true);
            setNewEventName('');
          }}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Event</Text>
          <Text style={{ flex: 2, color: '#4A7A9B', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}>
            {eventName || 'Select event'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* Event Modal */}
        <Modal
          visible={eventModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEventModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '85%', maxHeight: 420, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>Select Event</Text>
              <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                <TextInput
                  style={{ backgroundColor: '#D8E6EE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14 }}
                  value={eventsFilter}
                  onChangeText={setEventsFilter}
                  placeholder="Search events"
                  placeholderTextColor="#9BBCD1"
                />
              </View>
              {!loadingEvents && filteredEvents.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 12 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#F7FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14, borderWidth: 1, borderColor: '#D8E6EE' }}
                    value={newEventName}
                    onChangeText={setNewEventName}
                    placeholder="New event name"
                    placeholderTextColor="#9BBCD1"
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      const name = newEventName.trim();
                      if (!name) return;
                      if (!eventsUserId) {
                        Alert.alert('Missing user', 'Please sign in to create an event.');
                        return;
                      }
                      const { data: created, error } = await supabase
                        .from('events')
                        .insert([{ name, user_id: eventsUserId }])
                        .select('id,name')
                        .single();
                      if (error) {
                        Alert.alert('Create failed', error.message ?? 'Could not create event.');
                        return;
                      }
                      if (created?.id && created?.name) {
                        const updated = [...events, { id: created.id, name: created.name }];
                        updated.sort((a, b) => a.name.localeCompare(b.name));
                        setEvents(updated);
                        setEventId(created.id);
                        setEventName(created.name);
                        setEventModalVisible(false);
                        setFocusedField('');
                        setNewEventName('');
                      }
                    }}
                    style={{ backgroundColor: '#B8783A', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Add</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {loadingEvents ? (
                <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>Loading events...</Text>
              ) : (
                <FlatList
                  data={filteredEvents}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setEventId(item.id);
                        setEventName(item.name);
                        setEventModalVisible(false);
                        setFocusedField('');
                      }}
                      style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                    >
                      <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: item.name === eventName ? 'bold' : '600' }}>{item.name}</Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>No events found.</Text>
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
              <TouchableOpacity onPress={() => setEventModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Collection Lookup */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 17,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            backgroundColor: '#FFFFFF',
            marginTop: '2%',
            marginBottom: '2%',
            ...(focusedField !== 'collection' && { borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }),
            borderRadius: 10,
          }}
          onPress={() => {
            setFocusedField('collection');
            setCollectionModalVisible(true);
            setNewCollectionName('');
          }}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, fontWeight: '700', color: '#0C1620', fontSize: 14.5, fontFamily: 'DMSans_500Medium' }}>Collection</Text>
          <Text style={{ flex: 2, color: '#4A7A9B', fontSize: 14.5, textAlign: 'right', fontFamily: 'DMSans_400Regular', fontWeight: '600' }}>
            {collection || 'Select collection'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4A7A9B" />
        </TouchableOpacity>

        {/* Collection Modal */}
        <Modal
          visible={collectionModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCollectionModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '85%', maxHeight: 420, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>Select Collection</Text>
              <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                <TextInput
                  style={{ backgroundColor: '#D8E6EE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14 }}
                  value={collectionsFilter}
                  onChangeText={setCollectionsFilter}
                  placeholder="Search collections"
                  placeholderTextColor="#9BBCD1"
                />
              </View>
              {!loadingCollections && filteredCollections.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 12 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#F7FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0C1620', fontSize: 14, borderWidth: 1, borderColor: '#D8E6EE' }}
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="New collection name"
                    placeholderTextColor="#9BBCD1"
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
                      if (created?.name) {
                        const updated = Array.from(new Set([created.name, ...collections]));
                        updated.sort((a, b) => a.localeCompare(b));
                        setCollections(updated);
                        setCollection(created.name);
                        setCollectionModalVisible(false);
                        setFocusedField('');
                        setNewCollectionName('');
                      }
                    }}
                    style={{ backgroundColor: '#B8783A', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Add</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {loadingCollections ? (
                <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>Loading collections...</Text>
              ) : (
                <FlatList
                  data={filteredCollections}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setCollection(item);
                        setCollectionModalVisible(false);
                        setFocusedField('');
                      }}
                      style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                    >
                      <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: item === collection ? 'bold' : '600' }}>{item}</Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: '#4A7A9B', paddingVertical: 12 }}>No collections found.</Text>
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
              <TouchableOpacity onPress={() => setCollectionModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {isEditing && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    if (id) {
                      await syncItemPeople(id);
                      await syncItemCollection(id);
                    }
                    Alert.alert('Saved', 'Item changes saved.');
                  } catch (e: any) {
                    Alert.alert('Save failed', e?.message ?? 'Please try again');
                    return;
                  }
                  if (id) {
                    router.replace({ pathname: '/(tabs)/items/[id]', params: { id } } as any);
                    return;
                  }
                  router.back();
                }}
                style={{ flex: 1, backgroundColor: '#B8783A', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (id) {
                    router.replace({ pathname: '/(tabs)/items/[id]', params: { id } } as any);
                    return;
                  }
                  router.back();
                }}
                style={{ flex: 1, backgroundColor: '#D8E6EE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#0C1620', fontWeight: '700', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!id) return;
                Alert.alert('Delete item', 'This will permanently delete the item. Continue?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await supabase.from('item_people').delete().eq('item_id', id);
                        await supabase.from('collection_items').delete().eq('item_id', id);
                        const { error } = await supabase.from('items').delete().eq('id', id);
                        if (error) throw error;
                        router.replace('/(tabs)/items');
                      } catch (e: any) {
                        Alert.alert('Delete failed', e?.message ?? 'Please try again');
                      }
                    },
                  },
                ]);
              }}
              style={{ backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#F3B4B4', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#C0392B', fontWeight: '700', fontSize: 16 }}>Delete Item</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isEditing && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const newId = await createItem();
                  Alert.alert('Saved', 'Item created.');
                  if (newId) {
                    router.replace({ pathname: '/(tabs)/items/[id]', params: { id: newId } } as any);
                    return;
                  }
                  router.replace('/(tabs)/items');
                } catch (e: any) {
                  Alert.alert('Save failed', e?.message ?? 'Please try again');
                }
              }}
              style={{ flex: 1, backgroundColor: '#B8783A', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flex: 1, backgroundColor: '#D8E6EE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#0C1620', fontWeight: '700', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Extra space at bottom of page */}
        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}
















