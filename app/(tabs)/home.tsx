/* TK_THEME */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function inWords(n: number): string {
  n = Number(n) || 0;
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o ? `${t}-${ONES[o]}` : t;
  }
  if (n < 1000) {
    const h = `${ONES[Math.floor(n / 100)]} hundred`;
    const r = n % 100;
    return r ? `${h} and ${inWords(r)}` : h;
  }
  return n.toLocaleString();
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default function Home() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [itemsCount, setItemsCount] = useState<number | null>(null);
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [since, setSince] = useState<string | null>(null);
  const [lastItem, setLastItem] = useState<any>(null);
  const [anniversary, setAnniversary] = useState<any>(null);
  const [unfinished, setUnfinished] = useState<number>(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session ?? null;
        if (!mounted) return;
        setIsAuthed(!!session);
        const meta = session?.user?.user_metadata ?? {};
        const full = String(meta.full_name || meta.name || '').trim();
        setUserName(full ? full.split(' ')[0] : '');
      } catch (e) {
        console.warn('Failed to check session', e);
        if (mounted) setIsAuthed(false);
      }
    }
    checkSession();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    let mounted = true;
    async function loadCounts() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          setItemsCount(0);
          setCollectionsCount(0);
          return;
        }
        const [itemsRes, collectionsRes] = await Promise.all([
          supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('collections').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ]);
        if (!mounted) return;
        if (!itemsRes.error) setItemsCount(itemsRes.count ?? 0);
        if (!collectionsRes.error) setCollectionsCount(collectionsRes.count ?? 0);

        // Since when the archive has been kept
        const { data: firstRow } = await supabase
          .from('items').select('created_at').eq('user_id', userId)
          .order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (mounted && firstRow?.created_at) {
          const d = new Date(firstRow.created_at);
          if (!isNaN(d.getTime())) {
            setSince(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
          }
        }

        // Records with nothing written down yet
        const { count: noStory } = await supabase
          .from('items').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).is('description', null);
        if (mounted) setUnfinished(noStory ?? 0);

        // An event whose anniversary falls today
        const { data: evs } = await supabase
          .from('events').select('id,name,start_date').eq('user_id', userId);
        if (mounted && evs?.length) {
          const now = new Date();
          const match = evs.find((e: any) => {
            const d = e.start_date ? new Date(e.start_date) : null;
            if (!d || isNaN(d.getTime())) return false;
            return d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()
              && d.getUTCFullYear() < now.getFullYear();
          });
          if (match) {
            const years = now.getFullYear() - new Date(match.start_date).getUTCFullYear();
            setAnniversary({ ...match, years });
          }
        }
      } catch (e) {
        console.warn('Failed to load dashboard counts', e);
        if (mounted) {
          setItemsCount(0);
          setCollectionsCount(0);
        }
      }
    }
    if (isAuthed) loadCounts();
    return () => { mounted = false; };
  }, [isAuthed]);

  useEffect(() => {
    let mounted = true;
    async function fetchLastItem() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setLastItem(null);
        return;
      }
      const { data, error } = await supabase
        .from('items')
        .select('id,name,created_at,image_url,images')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (!error && data) setLastItem(data);
    }
    if (isAuthed) fetchLastItem();
    return () => { mounted = false; };
  }, [isAuthed]);

  const itemCount = itemsCount ?? 0;
  const collectionCount = collectionsCount ?? 0;
  const lastImage = lastItem
    ? ((Array.isArray(lastItem.images) && lastItem.images.length > 0) ? lastItem.images[0] : lastItem.image_url)
    : null;

  const facts = [
    collectionCount > 0 ? `${collectionCount} ${collectionCount === 1 ? 'collection' : 'collections'}` : null,
    since ? `since ${since}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* The archive announces itself */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...tokens.type.label, color: tokens.colors.inkLabel }}>
              {userName ? `${getGreeting()}, ${userName}` : getGreeting()}
            </Text>
            <Text style={{ ...tokens.type.display, color: tokens.colors.ink, marginTop: 10 }}>
              {itemCount === 0
                ? 'Nothing kept yet.'
                : `${cap(inWords(itemCount))} ${itemCount === 1 ? 'thing' : 'things'}.`}
            </Text>
            {!!facts && (
              <Text style={{ ...tokens.type.fact, color: tokens.colors.inkFact, marginTop: 8 }}>{facts}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/account' })}
            style={{ borderWidth: 1, borderColor: tokens.colors.border, minWidth: tokens.minTarget, minHeight: tokens.minTarget, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={19} color={tokens.colors.inkLabel} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(tabs)/search' })}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.colors.card, borderWidth: 1, borderColor: tokens.colors.border, paddingHorizontal: 14, minHeight: tokens.minTarget, marginTop: 24, marginBottom: 32 }}
          accessibilityRole="search"
        >
          <Ionicons name="search-outline" size={19} color={tokens.colors.inkGhost} style={{ marginRight: 10 }} />
          <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, flex: 1 }}>Search names, people, places</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { openCamera: 'true' } })}
            style={{ borderWidth: 1, borderColor: tokens.colors.accent, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Search by photograph"
          >
            <Ionicons name="camera-outline" size={18} color={tokens.colors.accent} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Last accessioned */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleStrong }}>
          <Text style={{ ...tokens.type.name, color: tokens.colors.ink }}>Last kept</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/items')}>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.link }}>See all</Text>
          </TouchableOpacity>
        </View>

        {lastItem ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: lastItem.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleSoft }}
          >
            <View style={{ width: 78, height: 78, backgroundColor: tokens.colors.card, borderWidth: 1, borderColor: tokens.colors.border, padding: 3, marginRight: 14 }}>
              <View style={{ flex: 1, backgroundColor: tokens.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                {lastImage ? (
                  <Image source={{ uri: lastImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 13, height: 13, borderWidth: 1, borderColor: tokens.colors.inkGhost }} />
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...tokens.type.nameSmall, color: tokens.colors.ink }} numberOfLines={2}>{lastItem.name}</Text>
              {!!lastItem.created_at && (
                <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.inkLabel, marginTop: 3 }}>
                  Added {timeAgo(lastItem.created_at)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={19} color={tokens.colors.inkGhost} />
          </TouchableOpacity>
        ) : (
          <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.colors.border, padding: 28, alignItems: 'center', marginTop: 16 }}>
            <View style={{ width: 15, height: 15, borderWidth: 1, borderColor: tokens.colors.inkGhost, marginBottom: 14 }} />
            <Text style={{ ...tokens.type.ui, color: tokens.colors.inkLabel, textAlign: 'center', marginBottom: 18 }}>
              Nothing kept yet. Photograph one thing and the archive begins.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/add')}
              style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 20, minHeight: tokens.minTarget, justifyContent: 'center' }}
            >
              <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Add your first item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* On this day */}
        {anniversary && (
          <View style={{ marginTop: 36 }}>
            <Text style={{ ...tokens.type.label, color: tokens.colors.inkLabel, marginBottom: 10 }}>
              {anniversary.years} {anniversary.years === 1 ? 'year' : 'years'} ago today
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/events-detail', params: { id: anniversary.id } })}
              style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: tokens.colors.ruleStrong, borderBottomWidth: 1, borderBottomColor: tokens.colors.ruleSoft }}
            >
              <Text style={{ ...tokens.type.name, color: tokens.colors.ink }}>{anniversary.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Worth finishing */}
        {unfinished > 0 && (
          <View style={{ marginTop: 36, borderWidth: 1, borderColor: tokens.colors.border, padding: 18 }}>
            <Text style={{ ...tokens.type.nameSmall, color: tokens.colors.ink, marginBottom: 6 }}>
              {unfinished} {unfinished === 1 ? 'record has' : 'records have'} no story yet
            </Text>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: tokens.colors.inkLabel, marginBottom: 16 }}>
              A sentence about where it came from is the part nobody can add for you later.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/items')}
              style={{ borderWidth: 1, borderColor: tokens.colors.accent, paddingHorizontal: 18, minHeight: tokens.minTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <Text style={{ ...tokens.type.button, color: tokens.colors.accent }}>Finish them</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
