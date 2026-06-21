import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import TabHeader from '../components/ui/TabHeader';
import { supabase } from '../lib/supabase';

type SearchResult = {
  id: string | number;
  score?: number;
};

export default function VisualSearchScreen() {
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const router = useRouter();
  const autoStarted = useRef(false);

  // Open the camera automatically when the screen loads (the user tapped the
  // camera icon expecting it to fire straight away).
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    pickAndSearch();
  }, []);

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
      setSearched(false);
      setResults([]);

      const userResp = await supabase.auth.getUser();
      const userId = userResp.data?.user?.id ?? 'anon';
      const parts = uri.split('/');
      const fname = parts[parts.length - 1] ?? `query-${Date.now()}.jpg`;
      const path = `${userId}/${Date.now()}-${fname}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage
        .from('search-queries')
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      setLoadingResults(true);

      // Call the image-search edge function. invoke() sends the user's auth
      // token automatically, which the function uses to scope results to this user.
      const { data: searchData, error: searchErr } = await supabase.functions.invoke('image-search', {
        body: { imagePath: path },
      });
      if (searchErr) throw searchErr;

      const json = searchData as { results: SearchResult[] };
      const ids = (json?.results ?? []).map((r) => r.id);
      if (ids.length === 0) {
        setResults([]);
        setSearched(true);
        setLoadingResults(false);
        setUploading(false);
        return;
      }
      const { data: items } = await supabase.from('items').select().in('id', ids).limit(50);
      const itemsById = new Map((items || []).map((it: any) => [String(it.id), it]));
      const ordered = ids.map((id) => itemsById.get(String(id))).filter(Boolean);
      setResults(ordered as any[]);
      setSearched(true);
      setLoadingResults(false);
      setUploading(false);
    } catch (e: any) {
      console.warn('Visual search failed', e?.message ?? e);
      alert('Image search failed: ' + (e?.message ?? ''));
      setUploading(false);
      setLoadingResults(false);
      setSearched(true);
    }
  }

  return (
    <Screen>
      <TabHeader title="Visual Search" />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Take / retake photo */}
          <Card style={{ marginBottom: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Ionicons name="camera" size={48} color="#B8783A" style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>Visual Search</Text>
              <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 }}>
                Take a photo of an item to find similar objects in your collection
              </Text>
              <Button
                title={uploading ? 'Processing…' : queryImage ? 'Retake Photo' : 'Take Photo'}
                onPress={pickAndSearch}
                disabled={uploading}
              />
            </View>
          </Card>

          {/* Query image + status */}
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

          {/* Results grid */}
          {results.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {results.map((it) => (
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
          ) : searched && !loadingResults && queryImage ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="search-outline" size={48} color="#D8E6EE" />
                <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 }}>No similar items found</Text>
                <Text style={{ color: '#4A7A9B', textAlign: 'center', marginBottom: 20 }}>This item isn't in your archive yet. Want to add it?</Text>
                <View style={{ width: '100%', paddingHorizontal: 8 }}>
                  <Button title="Create new item" onPress={() => router.push('/(tabs)/add')} />
                  <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#4A7A9B', fontWeight: '600' }}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFB',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
