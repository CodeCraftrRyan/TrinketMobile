import Ionicons from '@expo/vector-icons/Ionicons';
// Lazy-load expo-image-picker at runtime to avoid requiring the native module
// at app startup (prevents crashes when the development client doesn't include
// the module). The module will be dynamically imported when the user attempts
// to pick or take a photo.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
// SDK 54 moved readAsStringAsync to the legacy entry point.
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

const PHOTO_BUCKET = 'item-photos';

type PhotoEntry = {
  key: string;          // local-only unique key for React + removal
  localUri?: string;    // newly picked, not yet uploaded
  storagePath?: string; // already in the bucket (existing photo)
  displayUri: string;   // what we render (local uri or signed url)
};

const genKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;


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
  const { id, incomingPhoto } = useLocalSearchParams<{ id?: string; incomingPhoto?: string }>();
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
  const [acquiredModalVisible, setAcquiredModalVisible] = useState(false);
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

  // --- Photos (multi-image, plan-gated) ---
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [removedStoragePaths, setRemovedStoragePaths] = useState<string[]>([]);
  const [maxPhotos, setMaxPhotos] = useState(1); // Free fallback
  const [savingPhotos, setSavingPhotos] = useState(false);

  // When arriving from visual search with a photo, pre-load it for a new item.
  // Guarded to new items only (no id) so it never overwrites an edit-mode photo.
  const incomingPhotoApplied = useRef(false);
  useEffect(() => {
    if (incomingPhotoApplied.current) return;
    if (isEditing) return;
    if (incomingPhoto && typeof incomingPhoto === 'string' && incomingPhoto.length > 0) {
      incomingPhotoApplied.current = true;
      setPhotos([{ key: genKey(), localUri: incomingPhoto, displayUri: incomingPhoto }]);
    }
  }, [incomingPhoto, isEditing]);

  const filteredEvents = events.filter((row) => row.name.toLowerCase().includes(eventsFilter.toLowerCase()));
  const filteredCollections = collections.filter((row) => row.toLowerCase().includes(collectionsFilter.toLowerCase()));

  // Read the user's photo cap from subscriptions -> subscription_plans.
  // NOTE: this query mirrors the session gate's read; if your gate filters by
  // status or uses a different join, align these few lines. The DB trigger
  // enforces the true limit regardless, so a wrong read only affects UX.
  useEffect(() => {
    let mounted = true;
    async function loadCap() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from('subscriptions')
          .select('subscription_plans(max_photos_per_item)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const cap = (data as any)?.subscription_plans?.max_photos_per_item;
        if (mounted && Number.isFinite(cap) && cap > 0) setMaxPhotos(cap);
      } catch (e) {
        console.warn('Failed to load photo cap; defaulting to 1', e);
      }
    }
    loadCap();
    return () => { mounted = false; };
  }, []);

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

  function addLocalPhoto(uri: string) {
    if (photos.length >= maxPhotos) {
      Alert.alert('Photo limit reached', `Your plan allows up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} per item.`);
      return;
    }
    setPhotos((prev) => [...prev, { key: genKey(), localUri: uri, displayUri: uri }]);
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.storagePath) {
        setRemovedStoragePaths((r) => [...r, target.storagePath as string]);
      }
      return prev.filter((p) => p.key !== key);
    });
  }

  async function pickFromLibrary() {
    if (photos.length >= maxPhotos) {
      Alert.alert('Photo limit reached', `Your plan allows up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} per item.`);
      return;
    }
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
        addLocalPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to load image picker', e);
      Alert.alert('Image picker unavailable', 'Please try again later.');
    }
  }

  async function takePhoto() {
    if (photos.length >= maxPhotos) {
      Alert.alert('Photo limit reached', `Your plan allows up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} per item.`);
      return;
    }
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
        addLocalPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to load image picker', e);
      Alert.alert('Camera unavailable', 'Please try again later.');
    }
  }

  async function handlePhotoUpload() {
    if (photos.length >= maxPhotos) {
      Alert.alert('Photo limit reached', `Your plan allows up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} per item.`);
      return;
    }
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
    setAcquiredModalVisible(true);
  };

  const handleAcquiredSelect = (item: { label: string; icon: string }) => {
    setAcquired(item);
    setAcquiredModalVisible(false);
  };

  // Upload one local file into item-photos/<uid>/<itemId>/<file> and return the path.
  async function uploadPhoto(localUri: string, userId: string, itemId: string | number, index: number) {
    const ext = (localUri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
    const fileName = `${Date.now()}-${index}.${ext}`;
    const path = `${userId}/${itemId}/${fileName}`;
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, decode(base64), { contentType, upsert: false });
    if (error) throw error;
    return path;
  }

  // Used on create: upload every (local) photo, write item_photos rows, set cover.
  async function persistNewPhotos(itemId: string | number, userId: string) {
    let coverPath: string | null = null;
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!p.localUri) continue;
      const path = await uploadPhoto(p.localUri, userId, itemId, i);
      const { error } = await supabase
        .from('item_photos')
        .insert({ item_id: itemId, user_id: userId, storage_path: path, sort_order: i });
      if (error) throw error;
      if (i === 0) coverPath = path;
    }
    if (coverPath) {
      await supabase.from('items').update({ photo_url: coverPath }).eq('id', itemId);
    }
  }

  // Used on edit save: delete removed files, upload new ones, rewrite rows in order, set cover.
  async function syncItemPhotos(itemId: string | number) {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = userData?.user?.id;
    if (!userId) return;

    if (removedStoragePaths.length) {
      await supabase.storage.from(PHOTO_BUCKET).remove(removedStoragePaths);
    }

    const finalPaths: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      let path = p.storagePath;
      if (!path && p.localUri) {
        path = await uploadPhoto(p.localUri, userId, itemId, i);
      }
      if (path) finalPaths.push(path);
    }

    // Rewrite rows so sort_order matches the current on-screen order.
    const { error: delError } = await supabase.from('item_photos').delete().eq('item_id', itemId);
    if (delError) throw delError;
    if (finalPaths.length) {
      const rows = finalPaths.map((sp, idx) => ({ item_id: itemId, user_id: userId, storage_path: sp, sort_order: idx }));
      const { error: insError } = await supabase.from('item_photos').insert(rows);
      if (insError) throw insError;
    }

    await supabase.from('items').update({ photo_url: finalPaths[0] ?? null }).eq('id', itemId);
    setRemovedStoragePaths([]);
  }

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
    console.warn('AUTH CHECK — user:', userData?.user?.id ?? 'NO USER', 'error:', error?.message ?? 'none');
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
      category_id: category?.id ?? null,
      event_id: eventId ?? null,
      user_id: userId,
      photo_url: null, // set to cover storage_path after photos upload
    };
    const { data, error: insertError } = await supabase
      .from('items')
      .insert([row])
      .select('id')
      .maybeSingle();
    if (insertError) throw insertError;
    if (!data?.id) {
      console.warn('INSERT RETURNED NO ROW — sent user_id:', row.user_id, 'full row:', JSON.stringify(row));
    }
    if (data?.id) {
      await syncItemPeople(data.id);
      await syncItemCollection(data.id);
      if (userId) await persistNewPhotos(data.id, userId);
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


        const categoryValue = data.category_id ?? null;
        if (categoryValue) {
          const foundCategory = categoryOptions.find(option => option.id === categoryValue);
          if (foundCategory) {
            setCategory(foundCategory);
            setCategoryLabel(foundCategory.label);
          }
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

        // Load multi-photos from item_photos, signing each path for display.
        try {
          const { data: photoRows, error: photoError } = await supabase
            .from('item_photos')
            .select('id,storage_path,sort_order')
            .eq('item_id', id)
            .order('sort_order', { ascending: true });
          if (photoError) throw photoError;
          const entries: PhotoEntry[] = [];
          for (const prow of photoRows ?? []) {
            const sp = (prow as any)?.storage_path;
            if (!sp) continue;
            const { data: signed } = await supabase.storage
              .from(PHOTO_BUCKET)
              .createSignedUrl(sp, 60 * 60);
            entries.push({ key: genKey(), storagePath: sp, displayUri: signed?.signedUrl ?? '' });
          }
          if (mounted && entries.length) setPhotos(entries);
        } catch (e) {
          console.warn('Failed to load item photos', e);
        }
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
    // Only adopt a matched option (which carries its id). Never replace the
    // selection with an id-less object, or category_id saves as null.
    if (found) {
      setCategory(prev => (prev?.id === found.id ? prev : found));
    }
  }, [categoryLabel, categoryOptions]);

  useEffect(() => {
    if (eventId && !eventName) {
      const matched = events.find((row) => row.id === eventId);
      if (matched) setEventName(matched.name);
    }
  }, [eventId, eventName, events]);

  const labelStyle = { ...tokens.type.label, color: c.inkLabel, marginBottom: 8 };
  const fieldBox = {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
    justifyContent: 'center' as const,
  };
  const fieldText = { ...tokens.type.ui, color: c.ink };

  async function onSave() {
    try {
      setSavingPhotos(true);
      if (isEditing && id) {
        await syncItemPeople(id);
        await syncItemCollection(id);
        await syncItemPhotos(id);
        router.replace({ pathname: '/(tabs)/items/[id]', params: { id } } as any);
        return;
      }
      const newId = await createItem();
      if (newId) {
        router.replace({ pathname: '/(tabs)/items/[id]', params: { id: newId } } as any);
        return;
      }
      Alert.alert('Save failed', 'The object could not be saved. Please try again.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again');
    } finally {
      setSavingPhotos(false);
    }
  }

  const cover = photos[0];
  const atPhotoLimit = photos.length >= maxPhotos;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>

      <View style={{
        backgroundColor: c.surfaceDark,
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ ...tokens.type.nameSmall, color: c.bg }}>
          {isEditing ? 'Edit object' : 'Add an object'}
        </Text>
        <TouchableOpacity onPress={onSave} disabled={savingPhotos} hitSlop={10}>
          <Text style={{ ...tokens.type.ui, color: c.accent, opacity: savingPhotos ? 0.5 : 1 }}>
            {savingPhotos ? 'Saving' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 120, height: 120 }}>
            {cover?.displayUri ? (
              <>
                <Image source={{ uri: cover.displayUri }}
                  style={{ width: 120, height: 120, borderRadius: tokens.radius.md }}
                  resizeMode="cover" />
                <View style={{
                  position: 'absolute', left: 0, bottom: 0, right: 0,
                  backgroundColor: 'rgba(12,22,32,0.55)',
                  borderBottomLeftRadius: tokens.radius.md,
                  borderBottomRightRadius: tokens.radius.md,
                  paddingVertical: 5, paddingHorizontal: 8,
                }}>
                  <Text style={{ ...tokens.type.label, color: c.bg }}>Cover</Text>
                </View>
                <TouchableOpacity onPress={() => removePhoto(cover.key)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: c.surfaceDark, borderRadius: 11,
                    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Ionicons name="close" size={13} color={c.bg} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{
                width: 120, height: 120,
                backgroundColor: c.surfaceSoft,
                borderRadius: tokens.radius.md,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="image-outline" size={26} color={c.inkLight} />
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 12 }}>
            <TouchableOpacity
              onPress={handlePhotoUpload}
              disabled={atPhotoLimit}
              style={{
                flex: 1, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
                borderRadius: tokens.radius.md, backgroundColor: c.card,
                alignItems: 'center', justifyContent: 'center',
                opacity: atPhotoLimit ? 0.45 : 1,
              }}>
              <Ionicons name="camera-outline" size={20} color={c.accentCool} />
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool, marginTop: 4 }}>
                Photograph
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePhotoUpload}
              disabled={atPhotoLimit}
              style={{
                flex: 1, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
                borderRadius: tokens.radius.md, backgroundColor: c.card,
                alignItems: 'center', justifyContent: 'center',
                opacity: atPhotoLimit ? 0.45 : 1,
              }}>
              <Ionicons name="images-outline" size={20} color={c.accentCool} />
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool, marginTop: 4 }}>
                From library
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingTop: 12 }}>
            {photos.slice(1).map((p) => (
              <View key={p.key} style={{ width: 66, height: 66 }}>
                {p.displayUri ? (
                  <Image source={{ uri: p.displayUri }}
                    style={{ width: 66, height: 66, borderRadius: tokens.radius.md }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 66, height: 66, borderRadius: tokens.radius.md, backgroundColor: c.surfaceSoft }} />
                )}
                <TouchableOpacity onPress={() => removePhoto(p.key)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: c.surfaceDark, borderRadius: 10,
                    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Ionicons name="close" size={12} color={c.bg} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Text style={{ ...tokens.type.fact, color: c.inkLabel, marginTop: 10 }}>
          {photos.length} of {maxPhotos} {maxPhotos === 1 ? 'photograph' : 'photographs'}
        </Text>

        <Text style={{ ...labelStyle, marginTop: 26 }}>What is it</Text>
        <View style={fieldBox}>
          <TextInput
            style={fieldText}
            value={name}
            onChangeText={setName}
            placeholder="Faience plate"
            placeholderTextColor={c.inkLight}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField('')}
          />
        </View>

        <Text style={{ ...labelStyle, marginTop: 22 }}>Category</Text>
        <TouchableOpacity
          onPress={() => { setFocusedField('category'); setCategoryModalVisible(true); }}
          style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={[fieldText, { flex: 1, color: category?.label ? c.ink : c.inkLight }]} numberOfLines={1}>
            {categoriesLoading ? 'Loading categories' : (category?.label ?? 'Select a category')}
          </Text>
          <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Where it lives</Text>
            <TouchableOpacity onPress={handleRoomPress} style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[fieldText, { flex: 1 }]} numberOfLines={1}>{room.label}</Text>
              <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Whose it was</Text>
            <TouchableOpacity
              onPress={() => { setFocusedField('people'); setPeopleModalVisible(true); }}
              style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[fieldText, { flex: 1, color: selectedPeople.length ? c.ink : c.inkLight }]} numberOfLines={1}>
                {selectedPeople.length ? selectedPeople.join(', ') : 'Anyone'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ ...labelStyle, marginTop: 22 }}>The story</Text>
        <View style={[fieldBox, { minHeight: 132, paddingVertical: 12, justifyContent: 'flex-start' }]}>
          <TextInput
            style={[fieldText, { minHeight: 108, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Who gave it to you, when, and what was happening at the time."
            placeholderTextColor={c.inkLight}
            multiline
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField('')}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {['Who gave it to you?', 'What sat next to it?', 'Where did it live before?'].map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => setDescription((prev) => (prev ? prev + ' ' : '') + prompt + ' ')}
              style={{
                paddingHorizontal: 13, paddingVertical: 10,
                borderWidth: 1, borderColor: c.border,
                borderRadius: tokens.radius.md, backgroundColor: c.card,
              }}>
              <Text style={{ ...tokens.type.ui, fontSize: 14, color: c.accentCool }}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>How it arrived</Text>
            <TouchableOpacity onPress={handleAcquiredPress} style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[fieldText, { flex: 1 }]} numberOfLines={1}>{acquired.label}</Text>
              <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Date acquired</Text>
            <View style={fieldBox}>
              <TextInput
                style={fieldText}
                value={date}
                onChangeText={setDate}
                placeholder={today}
                placeholderTextColor={c.inkLight}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        <Text style={{ ...labelStyle, marginTop: 22 }}>Estimated value</Text>
        <View style={fieldBox}>
          <TextInput
            style={fieldText}
            value={estimatedValue}
            onChangeText={setEstimatedValue}
            placeholder="Optional, for insurance"
            placeholderTextColor={c.inkLight}
            keyboardType="numeric"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Event</Text>
            <TouchableOpacity
              onPress={() => { setFocusedField('event'); setEventModalVisible(true); setNewEventName(''); }}
              style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[fieldText, { flex: 1, color: eventName ? c.ink : c.inkLight }]} numberOfLines={1}>
                {eventName || 'None'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Collection</Text>
            <TouchableOpacity
              onPress={() => { setFocusedField('collection'); setCollectionModalVisible(true); setNewCollectionName(''); }}
              style={[fieldBox, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[fieldText, { flex: 1, color: collection ? c.ink : c.inkLight }]} numberOfLines={1}>
                {collection || 'None'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={c.inkLabel} />
            </TouchableOpacity>
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={() => {
              if (!id) return;
              Alert.alert('Delete object', 'This permanently removes the object and its photographs. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      try {
                        const { data: photoRows } = await supabase
                          .from('item_photos').select('storage_path').eq('item_id', id);
                        const paths = (photoRows ?? [])
                          .map((r: { storage_path?: string | null }) => r.storage_path)
                          .filter((v): v is string => Boolean(v));
                        if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
                        await supabase.from('item_photos').delete().eq('item_id', id);
                      } catch (e) {
                        console.warn('Failed to clean item photos on delete', e);
                      }
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
            style={{ marginTop: 32, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ ...tokens.type.ui, color: c.accentDeep }}>Delete this object</Text>
          </TouchableOpacity>
        )}

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
        <Modal
          visible={acquiredModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAcquiredModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(12,22,32,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, width: '80%', maxHeight: 320, padding: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#0C1620', textAlign: 'center' }}>How was this acquired?</Text>
              <FlatList
                data={ACQUIRED_OPTIONS}
                keyExtractor={item => item.label}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleAcquiredSelect(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F7FAFB' }}
                  >
                    <Ionicons name={item.icon as any} size={18} color="#B8783A" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, color: '#0C1620', fontWeight: item.label === acquired.label ? 'bold' : '600' }}>{item.label}</Text>
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
              <TouchableOpacity onPress={() => setAcquiredModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#B8783A', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

      </ScrollView>
    </View>
  );
}
