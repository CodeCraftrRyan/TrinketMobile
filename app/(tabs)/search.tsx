import { Ionicons } from '@expo/vector-icons';
// Lazy-load expo-image-picker when needed so the app can start even if the
// native module isn't present in the current development client build.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { supabase } from '../../lib/supabase';

type SearchResult = {
  id: string | number;
  score?: number;
};

export default function SearchScreen() {
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [mode, setMode] = useState<'collection' | 'events' | 'image' | 'calendar'>('collection');
  const [queryText, setQueryText] = useState('');
  const [loadingCalendar] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: '#F7FAFB',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: '#D8E6EE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInputInline: {
    flex: 1,
    fontSize: 16,
  color: '#0C1620',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  searchInput: {
    fontSize: 16,
  color: '#0C1620',
  backgroundColor: '#D8E6EE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modeButton: {
  backgroundColor: '#D8E6EE',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 2,
  },
  modeButtonActive: {
  backgroundColor: '#B8783A',
  },
  modeText: {
  color: '#0C1620',
    fontWeight: 'bold',
    fontSize: 14,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  backgroundColor: '#D8E6EE',
  },
  yearItem: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  backgroundColor: '#D8E6EE',
  },
  yearItemSelected: {
  backgroundColor: '#B8783A',
  },
  yearText: {
  color: '#0C1620',
    fontSize: 16,
    fontWeight: 'normal',
  },
  yearTextSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  borderBottomColor: '#D8E6EE',
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
});
  const [refreshing, setRefreshing] = useState(false);
  const [collectionSearchText, setCollectionSearchText] = useState('');
  const [generalSearchText, setGeneralSearchText] = useState('');
  const [searchResults] = useState<{ items: any[], events: any[] }>({ items: [], events: [] });
  const [isGeneralSearchActive] = useState(false);
  const [eventsList] = useState<any[]>([]);
  const [loadingEvents] = useState(false);
  const now = useMemo(() => new Date(), []);
  const [calendarView, setCalendarView] = useState<'month' | 'list'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [mounted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const ITEM_WIDTH = 80;
  const [loadingMonth] = useState(false);
  const [monthEventsMap] = useState<Record<string, any[]>>({});
  async function loadCollectionItems() {
    setLoadingCollection(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase.from('items').select('*').eq('user_id', userId);
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.warn('Failed to load collection', e);
    } finally {
      setLoadingCollection(false);
      setRefreshing(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!collectionSearchText.trim()) return items;
    const query = collectionSearchText.toLowerCase();
    return items.filter((it) => {
      const name = (it.name || '').toLowerCase();
      const category = (it.item_category || '').toLowerCase();
      const location = (it.location || '').toLowerCase();
      return name.includes(query) || category.includes(query) || location.includes(query);
    });
  }, [items, collectionSearchText]);

  useEffect(() => {
    loadCollectionItems();
  }, []);

  useEffect(() => {
    if (params.openCamera) {
      pickAndSearch();
    }
  }, [params.openCamera]);

  useEffect(() => {
    if (showYearPicker && scrollRef.current) {
      const currentYear = now.getFullYear();
      const index = currentYear - selectedYear;
      const x = index * ITEM_WIDTH;
      const centerOffset = (screenWidth - ITEM_WIDTH) / 2;
      const target = Math.max(0, x - centerOffset);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: target, animated: false });
      }, 50);
    }
  }, [showYearPicker, selectedYear, screenWidth, now, ITEM_WIDTH]);

  async function pickAndSearch() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if ((res as any).canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      setQueryImage(uri);
      setUploading(true);
      const userResp = await supabase.auth.getUser();
      const userId = userResp.data?.user?.id ?? 'anon';
      const parts = uri.split('/');
      const fname = parts[parts.length - 1] ?? `query-${Date.now()}.jpg`;
      const path = `queries/${userId}/${Date.now()}-${fname}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('images').upload(path, blob, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const searchUrl = process.env.NEXT_PUBLIC_IMAGE_SEARCH_URL;
      if (!searchUrl) {
        setUploading(false);
        setResults([]);
        alert('Image search backend not configured. Set NEXT_PUBLIC_IMAGE_SEARCH_URL in your .env');
        return;
      }
      setLoadingResults(true);
      const resp = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });
      if (!resp.ok) throw new Error('Search request failed');
      const json: { results: SearchResult[] } = await resp.json();
      const ids = json.results.map((r) => r.id);
      if (ids.length === 0) {
        setResults([]);
        setLoadingResults(false);
        setUploading(false);
        return;
      }
      const { data: items } = await supabase.from('items').select().in('id', ids).limit(50);
      const itemsById = new Map((items || []).map((it: any) => [String(it.id), it]));
      const ordered = ids.map((id) => itemsById.get(String(id))).filter(Boolean);
      setResults(ordered as any[]);
      setLoadingResults(false);
      setUploading(false);
    } catch (e: any) {
      console.warn('Search failed', e?.message ?? e);
      alert('Image search failed: ' + (e?.message ?? ''));
      setUploading(false);
      setLoadingResults(false);
    }
  }
  // ...existing callback, memo, and logic code...

  // ...existing JSX return and styles...
  return (
    <Screen>
      <TabHeader title="Search" />
      <View style={styles.container}>
        {/* General Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#4A7A9B" style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Search everything..." 
            value={generalSearchText} 
            onChangeText={setGeneralSearchText} 
            style={styles.searchInputInline}
            placeholderTextColor="#4A7A9B"
          />
          {generalSearchText ? (
            <TouchableOpacity onPress={() => setGeneralSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#4A7A9B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Show general search results when active */}
        {isGeneralSearchActive ? (
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
            {searchResults.items.length === 0 && searchResults.events.length === 0 ? (
              <Card>
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="search-outline" size={48} color="#D8E6EE" />
                  <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 }}>No results found</Text>
                  <Text style={{ color: '#4A7A9B', textAlign: 'center' }}>Try searching with different keywords</Text>
                </View>
              </Card>
            ) : (
              <>
                {/* Items Results */}
                {searchResults.items.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="cube" size={20} color="#B8783A" />
                      <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
                        Items ({searchResults.items.length})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {searchResults.items.slice(0, 6).map((it) => (
                        <TouchableOpacity 
                          key={it.id} 
                          onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } })} 
                          style={{ width: '48%', marginBottom: 16 }}
                        >
                          <Card style={{ padding: 12, borderRadius: 18 }}>
                            <View style={{ height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#D8E6EE', alignItems: 'center', justifyContent: 'center' }}>
                              {(() => {
                                const imgs = Array.isArray(it.images) && it.images.length > 0 ? it.images : it.image_url ? [it.image_url] : it.photo_url ? [it.photo_url] : [];
                                return imgs.length > 0 ? (
                                  <Image source={{ uri: imgs[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                                ) : (
                                  <Ionicons name="image-outline" size={24} color="#D8E6EE" />
                                );
                              })()}
                            </View>
                            <Text style={{ fontWeight: '700', fontSize: 14, marginTop: 8 }} numberOfLines={2}>{it.name || 'Untitled'}</Text>
                            {it.estimated_value && (
                              <Text style={{ color: '#B8783A', fontWeight: '600', fontSize: 12, marginTop: 4 }}>${it.estimated_value}</Text>
                            )}
                          </Card>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {searchResults.items.length > 6 && (
                      <TouchableOpacity 
                        onPress={() => { setMode('collection'); setCollectionSearchText(generalSearchText); setGeneralSearchText(''); }}
                        style={{ alignItems: 'center', paddingVertical: 8 }}
                      >
                        <Text style={{ color: '#B8783A', fontWeight: '600' }}>View all {searchResults.items.length} items →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Events Results */}
                {searchResults.events.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="calendar" size={20} color="#B8783A" />
                      <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
                        Events ({searchResults.events.length})
                      </Text>
                    </View>
                    {searchResults.events.slice(0, 5).map((event) => (
                      <TouchableOpacity key={event.id} style={{ marginBottom: 12 }}>
                        <Card>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{ 
                              backgroundColor: '#D8E6EE', 
                              padding: 10, 
                              borderRadius: 10, 
                              marginRight: 12,
                              alignItems: 'center',
                              minWidth: 50
                            }}>
                              <Ionicons name="calendar" size={20} color="#B8783A" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 4 }}>{event.name || 'Untitled Event'}</Text>
                              {event.location && (
                                <Text style={{ color: '#4A7A9B', fontSize: 13, marginBottom: 2 }}>{event.location}</Text>
                              )}
                              <Text style={{ color: '#4A7A9B', fontSize: 12 }}>
                                {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}
                              </Text>
                            </View>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    ))}
                    {searchResults.events.length > 5 && (
                      <TouchableOpacity 
                        onPress={() => { setMode('events'); setGeneralSearchText(''); }}
                        style={{ alignItems: 'center', paddingVertical: 8 }}
                      >
                        <Text style={{ color: '#B8783A', fontWeight: '600' }}>View all {searchResults.events.length} events →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        ) : (
          <>
            {/* Mode switch with icons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setMode('collection')} style={[styles.modeButton, mode === 'collection' ? styles.modeButtonActive : null]}>
                  <Ionicons name="grid-outline" size={20} color={mode === 'collection' ? '#FFFFFF' : '#4A7A9B'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('events')} style={[styles.modeButton, mode === 'events' ? styles.modeButtonActive : null]}>
                  <Ionicons name="calendar-outline" size={20} color={mode === 'events' ? '#FFFFFF' : '#4A7A9B'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('image')} style={[styles.modeButton, mode === 'image' ? styles.modeButtonActive : null]}>
                  <Ionicons name="camera-outline" size={20} color={mode === 'image' ? '#FFFFFF' : '#4A7A9B'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('calendar')} style={[styles.modeButton, mode === 'calendar' ? styles.modeButtonActive : null]}>
                  <Ionicons name="list-outline" size={20} color={mode === 'calendar' ? '#FFFFFF' : '#4A7A9B'} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {mode === 'collection' ? (
              <>
                {loadingCollection && !refreshing ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#B8783A" />
                    <Text style={{ color: '#4A7A9B', marginTop: 12 }}>Loading your collection...</Text>
                  </View>
                ) : filteredItems.length === 0 ? (
                  <Card>
                    {items.length === 0 ? (
                      <>
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                          <Ionicons name="cube-outline" size={64} color="#D8E6EE" />
                      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>No items yet</Text>
                      <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 16 }}>Start building your collection by adding your first item</Text>
                      <Button title="Add your first item" onPress={() => router.push('/(tabs)/add')} />
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Ionicons name="search-outline" size={48} color="#D8E6EE" />
                    <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 }}>No results found</Text>
                    <Text style={{ color: '#4A7A9B', textAlign: 'center' }}>Try searching with different keywords</Text>
                  </View>
                )}
              </Card>
            ) : (
              <ScrollView 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCollectionItems(); }} />}
                showsVerticalScrollIndicator={false}
              >
                {collectionSearchText ? (
                  <Text style={{ color: '#4A7A9B', marginBottom: 12 }}>
                    Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {filteredItems.map((it) => (
                    <TouchableOpacity key={it.id} onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } })} style={{ width: '48%', marginBottom: 20 }}>
                      <Card style={{ padding: 12, borderRadius: 18 }}>
                        <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F7FAFB', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const imgs = Array.isArray(it.images) && it.images.length > 0 ? it.images : it.image_url ? [it.image_url] : it.photo_url ? [it.photo_url] : [];
                            return imgs.length > 0 ? (
                              <Image source={{ uri: imgs[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                            ) : (
                              <View style={{ alignItems: 'center' }}>
                                <Ionicons name="image-outline" size={32} color="#D8E6EE" />
                                <Text style={{ color: '#4A7A9B', fontSize: 12, marginTop: 4 }}>No image</Text>
                              </View>
                            );
                          })()}
                        </View>
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16 }} numberOfLines={2}>{it.name || 'Untitled'}</Text>
                          {it.item_category && (
                            <View style={{ marginTop: 6 }}>
                              <View style={{ backgroundColor: '#D8E6EE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                                <Text style={{ color: '#B8783A', fontSize: 12, fontWeight: '600' }}>{it.item_category}</Text>
                              </View>
                            </View>
                          )}
                          <View style={{ marginTop: 8 }}>
                            {it.location && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Ionicons name="location-outline" size={14} color="#4A7A9B" />
                                <Text style={{ color: '#4A7A9B', fontSize: 14, marginLeft: 4 }}>{it.location}</Text>
                              </View>
                            )}
                            {it.estimated_value && (
                              <Text style={{ color: '#B8783A', fontWeight: '600', fontSize: 14 }}>${it.estimated_value}</Text>
                            )}
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            {/* Floating Action Button for Collection */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/add')}
              style={{
                position: 'absolute',
                right: 20,
                bottom: 70 + insets.bottom,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#B8783A',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
        <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : mode === 'events' ? (
          <>
            {loadingEvents ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#B8783A" />
                <Text style={{ color: '#4A7A9B', marginTop: 12 }}>Loading events...</Text>
              </View>
            ) : eventsList.length === 0 ? (
              <Card>
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="calendar-outline" size={64} color="#D8E6EE" />
                  <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>No events yet</Text>
                  <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 16 }}>Create your first event to keep track of important dates</Text>
                  <Button title="Create Event" onPress={() => router.push('/events-new')} />
                </View>
              </Card>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: '#4A7A9B', marginBottom: 12 }}>
                  {eventsList.length} event{eventsList.length !== 1 ? 's' : ''}
                </Text>
                {eventsList.map((event) => (
                  <TouchableOpacity key={event.id} style={{ marginBottom: 12 }}>
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ 
                          backgroundColor: '#D8E6EE', 
                          padding: 12, 
                          borderRadius: 10, 
                          marginRight: 12,
                          alignItems: 'center',
                          minWidth: 60
                        }}>
                          <Ionicons name="calendar" size={24} color="#B8783A" />
                          {event.event_date && (
                              <Text style={{ fontSize: 10, color: '#B8783A', marginTop: 4 }}>
                              {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 4 }}>{event.name || 'Untitled Event'}</Text>
                          {event.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Ionicons name="location-outline" size={14} color="#4A7A9B" />
                                <Text style={{ color: '#4A7A9B', marginLeft: 4, fontSize: 14 }}>{event.location}</Text>
                            </View>
                          )}
                          <Text style={{ color: '#4A7A9B', fontSize: 14 }}>
                            {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'No date'}
                          </Text>
                          {event.description && (
                            <Text style={{ color: '#4A7A9B', marginTop: 8 }} numberOfLines={2}>{event.description}</Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        ) : mode === 'image' ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Ionicons name="camera" size={48} color="#B8783A" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>Visual Search</Text>
                <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 }}>
                  Take a photo of an item to find similar objects in your collection
                </Text>
                <Button 
                  title={uploading ? 'Processing…' : 'Take Photo'} 
                  onPress={pickAndSearch} 
                  disabled={uploading} 
                />
              </View>
            </Card>

            {queryImage ? (
              <Card style={{ marginBottom: 16 }}>
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Image source={{ uri: queryImage }} style={{ width: 200, height: 160, borderRadius: 12, marginBottom: 12 }} />
                  {loadingResults ? (
                    <>
                      <ActivityIndicator size="large" color="#B8783A" />
                      <Text style={{ color: '#4A7A9B', marginTop: 12 }}>Searching for similar items...</Text>
                    </>
                  ) : (
                    <Text style={{ color: '#B8783A', fontWeight: '600' }}>
                      ✓ Found {results.length} similar item{results.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </Card>
            ) : null}

            <FlatList 
              data={results} 
              keyExtractor={(i) => String(i.id)} 
              renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: item.id } })}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.resultImage} /> : <View style={[styles.resultImage, { backgroundColor: '#F7FAFB' }]} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: '#4A7A9B' }}>{item.category}</Text>
                </View>
              </Pressable>
            )} 
            ListEmptyComponent={() => !queryImage ? null : (
              <Card>
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="search-outline" size={48} color="#D8E6EE" />
                  <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 }}>No similar items found</Text>
                  <Text style={{ color: '#4A7A9B', textAlign: 'center' }}>Try taking another photo from a different angle</Text>
                </View>
              </Card>
            )} 
            />
          </>
        ) : (
          <>
            <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setSelectedMonth((m) => (m + 11) % 12); }} style={styles.iconButton}>
                  <Text style={{ color: '#0C1620' }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ color: '#0C1620', fontWeight: '700', marginHorizontal: 12 }}>{new Date(selectedYear, selectedMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => { setSelectedMonth((m) => (m + 1) % 12); }} style={styles.iconButton}>
                  <Text style={{ color: '#0C1620' }}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowYearPicker(true)} style={styles.modeButton}>
                  <Text style={[styles.modeText]}>{String(selectedYear)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCalendarView(calendarView === 'month' ? 'list' : 'month')} style={[styles.modeButton, { marginLeft: 8 }]}>
                  <Text style={[styles.modeText]}>{calendarView === 'month' ? 'List' : 'Month'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {calendarView === 'month' ? (
              <>
                {loadingMonth ? <ActivityIndicator /> : null}
                {/* month grid */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                    <Text key={d} style={{ width: `${100/7}%`, textAlign: 'center', color: '#4A7A9B', fontSize: 12 }}>{d}</Text>
                  ))}
                </View>
                <View>
                  {(() => {
                    const days: any[] = [];
                    const firstDay = new Date(selectedYear, selectedMonth, 1);
                    const startWeekday = firstDay.getDay();
                    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                    let week: any[] = [];
                    // leading blanks
                    for (let i = 0; i < startWeekday; i++) week.push(null);
                    for (let d = 1; d <= daysInMonth; d++) {
                      week.push(d);
                      if (week.length === 7) { days.push(week); week = []; }
                    }
                    if (week.length > 0) { while (week.length < 7) week.push(null); days.push(week); }
                    return days.map((wk, ri) => (
                      <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        {wk.map((day, ci) => {
                          if (!day) return <View key={ci} style={{ width: `${100/7}%`, alignItems: 'center' }} />;
                          const dateKey = new Date(selectedYear, selectedMonth, day).toISOString().slice(0,10);
                          const evts = monthEventsMap[dateKey] || [];
                          return (
                            <TouchableOpacity key={ci} style={{ width: `${100/7}%`, alignItems: 'center', paddingVertical: 8 }} onPress={() => { /* optionally filter by day */ }}>
                              <Text style={{ color: '#0C1620' }}>{day}</Text>
                              {evts.length > 0 ? <View style={{ marginTop: 6, backgroundColor: '#B8783A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#FFFFFF', fontSize: 10 }}>{evts.length}</Text></View> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>
              </>
            ) : (
              <>
                <View style={{ marginBottom: 12 }}>
                  <TextInput placeholder="Search events by name or description" value={queryText} onChangeText={setQueryText} style={styles.searchInput} />
                </View>

                {/* Filter pills removed per user request */}

                {loadingCalendar ? <ActivityIndicator /> : null}

                <FlatList data={results} keyExtractor={(i) => String(i.id)} renderItem={({ item }) => (
                  <Pressable style={styles.resultRow} onPress={() => { /* navigate to event detail if desired */ }}>
                    <View style={[styles.resultImage, { backgroundColor: '#F7FAFB', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#4A7A9B', fontSize: 12 }}>{item.event_date ? new Date(item.event_date).toLocaleDateString() : '—'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{item.name ?? 'Untitled Event'}</Text>
                      <Text style={{ color: '#4A7A9B' }}>{item.location}</Text>
                    </View>
                  </Pressable>
                )} ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', marginTop: 20 }}>
                    <Text style={{ color: '#4A7A9B' }}>No events found for this filter.</Text>
                  </View>
                )} />
              </>
            )}
            {/* Year picker modal (render only on client to avoid SSR issues) */}
            {mounted ? (
              <Modal visible={showYearPicker} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <View style={{ backgroundColor: '#FFFFFF', padding: 12 }}>
                    {/* Carousel picklist: horizontal scroll of years from current down to current-100 */}
                    <ScrollView
                      ref={(r) => { scrollRef.current = r; }}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: (screenWidth - ITEM_WIDTH) / 2 }}
                    >
                      {Array.from({ length: 101 }).map((_, i) => {
                        const y = now.getFullYear() - i; // 0 -> current year, 100 -> current-100
                        const isSelected = y === selectedYear;
                        return (
                          <TouchableOpacity
                            key={y}
                            onPress={() => { setSelectedYear(y); setShowYearPicker(false); }}
                            style={[styles.yearItem, isSelected ? styles.yearItemSelected : null]}
                          >
                            <Text style={[isSelected ? styles.yearTextSelected : styles.yearText]}>{String(y)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity onPress={() => setShowYearPicker(false)} style={{ marginTop: 8, padding: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#B8783A' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : null}
            
          </>
        )}
          </>
        )}
      </View>
      </Screen>
    );
  }


