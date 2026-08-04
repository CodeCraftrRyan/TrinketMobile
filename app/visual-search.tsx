import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type SearchResult = { id: string | number; distance?: number };

// How close is close? Measured against a real archive, where a correct match
// came back at 0.95 and unrelated objects sat above 0.98.
function matchStrength(distance: number | null | undefined) {
  if (typeof distance !== 'number') return null;
  if (distance < 0.85) return { label: 'Strong match', strong: true };
  if (distance < 0.95) return { label: 'Possible match', strong: false };
  return { label: 'Distant match', strong: false };
}

export default function VisualSearchScreen() {
  const router = useRouter();
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'searching'>('idle');
  const [results, setResults] = useState<any[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);
  const [seenDescription, setSeenDescription] = useState<string | null>(null);
  const [distances, setDistances] = useState<Record<string, number | null>>({});

  async function choosePhoto(fromCamera: boolean) {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed',
          fromCamera ? 'Please allow camera access.' : 'Please allow photo access.');
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if ((res as any).canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) await search(uri);
    } catch (e: any) {
      console.warn('Picker failed', e?.message ?? e);
      Alert.alert('Unavailable', 'Please try again in a moment.');
    }
  }

  async function search(uri: string) {
    setQueryImage(uri);
    setResults([]);
    setCovers({});
    setSearched(false);
    setSeenDescription(null);
    setDistances({});
    setBusy(true);
    setStage('uploading');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Please sign in first.');

      // Upload the query photograph. Read it as base64 rather than fetch/blob —
      // blob uploads are unreliable on React Native and fail silently.
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const path = `${userId}/${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const { error: upErr } = await supabase.storage
        .from('search-queries')
        .upload(path, decode(base64), { contentType, upsert: false });
      if (upErr) throw upErr;

      setStage('searching');

      // invoke() sends the user's auth token, which the function uses to scope
      // results to this archive.
      const { data: searchData, error: searchErr } = await supabase.functions.invoke('image-search', {
        body: { imagePath: path },
      });
      if (searchErr) throw searchErr;

      const payload = searchData as { results: SearchResult[]; description?: string };
      setSeenDescription(payload?.description ?? null);
      const byDistance: Record<string, number | null> = {};
      (payload?.results ?? []).forEach((r: any) => {
        byDistance[String(r.id)] = typeof r.distance === 'number' ? r.distance : null;
      });
      setDistances(byDistance);
      const ids = (payload?.results ?? []).map((r) => r.id);
      if (!ids.length) { setSearched(true); return; }

      const { data: items } = await supabase
        .from('items')
        .select('id,name,photo_url,location,category_id,estimated_value')
        .in('id', ids)
        .limit(50);
      const byId = new Map((items ?? []).map((it: any) => [String(it.id), it]));
      const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean) as any[];
      setResults(ordered);
      setSearched(true);

      // items.photo_url holds a storage PATH, so it must be signed to display.
      const paths: Record<string, string> = {};
      for (const row of ordered) {
        let p = row.photo_url ?? null;
        if (!p) {
          const { data: photo } = await supabase
            .from('item_photos').select('storage_path')
            .eq('item_id', row.id)
            .order('sort_order', { ascending: true }).limit(1).maybeSingle();
          p = photo?.storage_path ?? null;
        }
        if (p) paths[String(row.id)] = p;
      }
      const entries = Object.entries(paths);
      if (entries.length) {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
        const out: Record<string, string> = {};
        entries.forEach(([itemId], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) out[itemId] = url;
        });
        setCovers(out);
      }
    } catch (e: any) {
      console.warn('Visual search failed', e?.message ?? e);
      Alert.alert('Search failed', e?.message ?? 'Please try again.');
      setSearched(true);
    } finally {
      setBusy(false);
      setStage('idle');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
            <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Back</Text>
          </TouchableOpacity>

          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75, marginTop: 22 }}>
            Find by photograph
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 6 }}>
            Point at a thing.
          </Text>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10, lineHeight: 23 }}>
            Photograph an object and we&rsquo;ll look for it in your archive.
          </Text>
        </View>

        {/* Take or choose */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 26 }}>
          <TouchableOpacity
            onPress={() => choosePhoto(true)}
            disabled={busy}
            style={{
              flex: 1, paddingVertical: 18, alignItems: 'center',
              borderRadius: tokens.radius.sm, backgroundColor: c.primary,
              opacity: busy ? 0.5 : 1,
            }}>
            <Ionicons name="camera-outline" size={20} color={c.primaryText} />
            <Text style={{ ...tokens.type.button, color: c.primaryText, marginTop: 6 }}>
              {queryImage ? 'Again' : 'Photograph'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => choosePhoto(false)}
            disabled={busy}
            style={{
              flex: 1, paddingVertical: 18, alignItems: 'center',
              borderRadius: tokens.radius.sm,
              borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
              opacity: busy ? 0.5 : 1,
            }}>
            <Ionicons name="images-outline" size={20} color={c.ink} />
            <Text style={{ ...tokens.type.button, color: c.ink, marginTop: 6 }}>From library</Text>
          </TouchableOpacity>
        </View>

        {/* The photograph, and what came of it */}
        {queryImage && (
          <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
            <Image source={{ uri: queryImage }}
              style={{ width: '100%', height: 220, backgroundColor: c.surfaceSoft, borderRadius: tokens.radius.md }}
              resizeMode="cover" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
              {busy && <ActivityIndicator color={c.accentCool} />}
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.inkLabel }}>
                {stage === 'uploading' ? 'Sending the photograph'
                  : stage === 'searching' ? 'Looking through your archive'
                  : searched
                    ? results.length
                      ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}`
                      : 'Nothing like it here yet'
                    : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Matches */}
        {results.length > 0 && (
          <View style={{ paddingTop: 26 }}>
            <Text style={{ ...tokens.type.label, color: c.inkLabel, paddingHorizontal: 20, marginBottom: 12 }}>
              Closest first
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginHorizontal: 20 }} />
            {results.map((it) => (
              <TouchableOpacity
                key={String(it.id)}
                onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: String(it.id) } } as any)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 14, marginHorizontal: 20,
                  borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
                }}>
                {covers[String(it.id)] ? (
                  <Image source={{ uri: covers[String(it.id)] }}
                    style={{ width: 54, height: 54, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
                ) : (
                  <View style={{
                    width: 54, height: 54, backgroundColor: c.surfaceSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="image-outline" size={18} color={c.inkLight} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...tokens.type.nameSmall, color: c.ink }} numberOfLines={1}>
                    {it.name || 'Untitled object'}
                  </Text>
                  {!!it.location && (
                    <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 3 }} numberOfLines={1}>
                      {it.location}
                    </Text>
                  )}
                </View>
                {(() => {
                  const strength = matchStrength(distances[String(it.id)]);
                  if (!strength) return null;
                  return (
                    <Text style={{
                      ...tokens.type.fact,
                      color: strength.strong ? c.inkFact : c.inkLabel,
                      marginRight: 8,
                    }}>
                      {strength.label}
                    </Text>
                  );
                })()}
                <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Found something, but it may not be the same thing */}
        {searched && !busy && results.length > 0 && queryImage && (
          <View style={{ paddingHorizontal: 20, paddingTop: 26, alignItems: 'flex-start' }}>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.inkLabel, lineHeight: 22 }}>
              Not the one you meant? Keep this as its own object.
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { incomingPhoto: queryImage ?? '', incomingDescription: seenDescription ?? '' } } as any)}
              style={{
                marginTop: 14, paddingHorizontal: 22, paddingVertical: 14,
                borderRadius: tokens.radius.sm,
                borderWidth: 1, borderColor: c.border,
                backgroundColor: c.card,
              }}>
              <Text style={{ ...tokens.type.ui, color: c.ink }}>Add it anyway</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Nothing found */}
        {searched && !busy && results.length === 0 && queryImage && (
          <View style={{ paddingHorizontal: 20, paddingTop: 30, alignItems: 'flex-start' }}>
            <Text style={{ ...tokens.type.body, color: c.inkLabel }}>
              This one isn&rsquo;t in your archive yet. Keep it?
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { incomingPhoto: queryImage ?? '', incomingDescription: seenDescription ?? '' } } as any)}
              style={{
                marginTop: 18, paddingHorizontal: 22, paddingVertical: 15,
                borderRadius: tokens.radius.sm, backgroundColor: c.primary,
              }}>
              <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add this object</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
