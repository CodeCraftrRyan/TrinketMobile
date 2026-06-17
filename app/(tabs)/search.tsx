import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { supabase } from '../../lib/supabase';

// Fields we never want to match against (image URLs, ids, raw vectors, etc.)
const EXCLUDED_KEYS = new Set([
  'id',
  'user_id',
  'images',
  'image_url',
  'photo_url',
  'thumbnail_url',
  'embedding',
  'vector',
]);

const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/;

// Build one lowercase searchable string from every meaningful field on a record.
// Date fields get extra human-readable forms so "august" or "2024" will match.
function buildSearchString(item: any): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(item)) {
    if (EXCLUDED_KEYS.has(key) || value == null) continue;

    if (typeof value === 'string' || typeof value === 'number') {
      const str = String(value);
      parts.push(str.toLowerCase());

      if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          parts.push(d.toLocaleDateString().toLowerCase());
          parts.push(d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase());
          parts.push(d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase());
          parts.push(String(d.getFullYear()));
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((v) => {
        if (typeof v === 'string' || typeof v === 'number') parts.push(String(v).toLowerCase());
      });
    }
  }
  return parts.join(' ');
}

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
});

export default function SearchScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const router = useRouter();

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

  // Precompute a searchable string per item so filtering stays fast while typing.
  const indexedItems = useMemo(
    () => items.map((it) => ({ item: it, haystack: buildSearchString(it) })),
    [items]
  );

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return items;
    const terms = query.split(/\s+/).filter(Boolean);
    return indexedItems
      .filter(({ haystack }) => terms.every((t) => haystack.includes(t)))
      .map(({ item }) => item);
  }, [items, indexedItems, searchText]);

  useEffect(() => {
    loadCollectionItems();
  }, []);

  return (
    <Screen>
      <TabHeader title="Search" />
      <View style={styles.container}>
        {/* Keyword search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#4A7A9B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search everything..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInputInline}
            placeholderTextColor="#4A7A9B"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#4A7A9B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingCollection && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#B8783A" />
            <Text style={{ color: '#4A7A9B', marginTop: 12 }}>Loading your collection...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <Card>
            {items.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="cube-outline" size={64} color="#D8E6EE" />
                <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>No items yet</Text>
                <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 16 }}>Start building your collection by adding your first item</Text>
                <Button title="Add your first item" onPress={() => router.push('/(tabs)/add')} />
              </View>
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
            {searchText ? (
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
      </View>
    </Screen>
  );
}
