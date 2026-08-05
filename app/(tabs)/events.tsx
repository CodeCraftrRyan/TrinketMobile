import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;
const PHOTO_BUCKET = 'item-photos';

type EventRow = {
  id: number | string;
  name?: string | null;
  description?: string | null;
  cover_photo_url?: string | null;
  event_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  count?: number;
};

const longDate = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function EventsTab() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { setLoading(false); setRefreshing(false); return; }

      // Only the columns that exist on `events`. Asking for photo_url or
      // location here returns an error and an empty list.
      const { data, error } = await supabase
        .from('events')
        .select('id,name,description,cover_photo_url,event_date,start_date,end_date,created_at')
        .eq('user_id', userId)
        .order('start_date', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const rows = (data ?? []) as EventRow[];

      // How many objects each event holds.
      if (rows.length) {
        const { data: linked } = await supabase
          .from('items')
          .select('event_id')
          .eq('user_id', userId)
          .in('event_id', rows.map((r) => r.id));
        const tally: Record<string, number> = {};
        (linked ?? []).forEach((r: any) => {
          if (r?.event_id == null) return;
          const k = String(r.event_id);
          tally[k] = (tally[k] ?? 0) + 1;
        });
        rows.forEach((r) => { r.count = tally[String(r.id)] ?? 0; });
      }
      setEvents(rows);

      // Cover photographs. Legacy rows hold a full public URL; newer ones hold
      // a private storage path that has to be signed.
      const paths: Record<string, string> = {};
      const direct: Record<string, string> = {};
      rows.forEach((r) => {
        const v = r.cover_photo_url;
        if (!v) return;
        if (v.startsWith('http')) direct[String(r.id)] = v;
        else paths[String(r.id)] = v;
      });
      const entries = Object.entries(paths);
      let signedMap: Record<string, string> = {};
      if (entries.length) {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrls(entries.map(([, p]) => p), 60 * 60);
        entries.forEach(([eventId], i) => {
          const url = signed?.[i]?.signedUrl;
          if (url) signedMap[eventId] = url;
        });
      }
      setCovers({ ...direct, ...signedMap });
    } catch (e: any) {
      console.warn('Failed to load events', e?.message ?? e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? events.filter((e) =>
        String(e.name ?? '').toLowerCase().includes(normalized)
        || String(e.description ?? '').toLowerCase().includes(normalized))
    : events;

  const objectTotal = events.reduce((sum, e) => sum + (e.count ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 72, paddingHorizontal: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75 }}>
              {events.length} {events.length === 1 ? 'event' : 'events'} · {objectTotal} {objectTotal === 1 ? 'object' : 'objects'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/events-new')} hitSlop={10}>
              <Text style={{ ...tokens.type.ui, color: c.accent }}>New</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ ...tokens.type.display, fontSize: 34, lineHeight: 40, color: c.bg, marginTop: 8 }}>
            Events
          </Text>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 8, lineHeight: 23 }}>
            The days these things came from.
          </Text>
        </View>

        {/* Search */}
        {events.length > 0 && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: c.border,
          }}>
            <Ionicons name="search-outline" size={18} color={c.inkLabel} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search events"
              placeholderTextColor={c.inkLight}
              style={{ flex: 1, ...tokens.type.ui, color: c.ink }}
              returnKeyType="search"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={17} color={c.inkLight} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <Text style={{ color: c.inkLabel, paddingHorizontal: 20, paddingVertical: 28 }}>
            Opening the calendar
          </Text>
        ) : filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 36, alignItems: 'flex-start' }}>
            <Text style={{ color: c.inkLabel, fontSize: 16, lineHeight: 23 }}>
              {events.length === 0
                ? 'No events yet. A wedding, a move, a summer — name the day and file things under it.'
                : 'Nothing here matches.'}
            </Text>
            {events.length === 0 && (
              <TouchableOpacity
                onPress={() => router.push('/events-new')}
                style={{
                  marginTop: 18, paddingHorizontal: 22, paddingVertical: 15,
                  borderRadius: tokens.radius.sm, backgroundColor: c.primary,
                }}>
                <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add the first event</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filtered.map((ev) => {
          const when = longDate(ev.start_date ?? ev.event_date ?? ev.created_at);
          return (
            <TouchableOpacity
              key={String(ev.id)}
              onPress={() => router.push({ pathname: '/events-detail', params: { id: String(ev.id) } } as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 16, marginHorizontal: 20,
                borderBottomWidth: 1, borderBottomColor: c.ruleSoft,
              }}>
              {covers[String(ev.id)] ? (
                <Image source={{ uri: covers[String(ev.id)] }}
                  style={{ width: 58, height: 58, backgroundColor: c.surfaceSoft }} resizeMode="cover" />
              ) : (
                <View style={{
                  width: 58, height: 58, backgroundColor: c.surfaceSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="calendar-outline" size={19} color={c.inkLight} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...tokens.type.nameSmall, color: c.ink }} numberOfLines={1}>
                  {ev.name || 'Untitled event'}
                </Text>
                {!!ev.description && (
                  <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 3 }} numberOfLines={1}>
                    {ev.description}
                  </Text>
                )}
                <Text style={{ color: c.inkFact, fontSize: 14, marginTop: 3 }}>
                  {ev.count ?? 0} {ev.count === 1 ? 'object' : 'objects'}
                  {when ? ` · ${when}` : ''}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={c.inkLabel} />
            </TouchableOpacity>
          );
        })}

        {!loading && events.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/events-new')}
            style={{
              marginHorizontal: 20, marginTop: 24,
              paddingVertical: 15, alignItems: 'center',
              borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
              borderRadius: tokens.radius.sm, backgroundColor: c.card,
            }}>
            <Text style={{ ...tokens.type.ui, color: c.ink }}>New event</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}
