import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';
// Helper to format time ago
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
  
  

  const userName = 'Ryan';
  const blogPosts = [
    {
      title: 'How to Catalog Your Collection',
      summary: 'Simple steps to organize and preserve your favorite finds.',
      url: 'https://www.yourtrinkets.com/blog/catalog-your-collection',
    },
    {
      title: 'Preserve Memories With Photos',
      summary: 'Tips for capturing details that bring your items to life.',
      url: 'https://www.yourtrinkets.com/blog/preserve-memories',
    },
    {
      title: 'Host a Show-and-Tell Night',
      summary: 'Ideas for sharing your trinkets with friends and family.',
      url: 'https://www.yourtrinkets.com/blog/show-and-tell',
    },
  ];
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
        if (session) {
          setIsAuthed(true);
        } else {
          setIsAuthed(false);
        }
      } catch (e) {
        // on error, show home view
        console.warn('Failed to check session', e);
        if (mounted) setIsAuthed(false);
      }
    }
    checkSession();
    return () => {
      mounted = false;
    };
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

  // Placeholder data for demo
  const itemCount = itemsCount ?? 0;
  const collectionCount = collectionsCount ?? 0;
  const [lastItem, setLastItem] = useState<any>(null);

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
      if (!error && data) {
        setLastItem(data);
      }
    }
    if (isAuthed) fetchLastItem();
    return () => { mounted = false; };
  }, [isAuthed]);
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 0 }}>
        {/* Greeting and stats */}
        <View style={{ marginTop: 2, marginBottom: 26, paddingHorizontal: 18 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 31, fontWeight: '300', color: theme.primary, fontFamily: 'CormorantGaramond_300Light' }}>{`${getGreeting()}, ${userName}`}</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(tabs)/account' })}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#F7FAFB', borderWidth: 1, borderColor: '#D8E6EE' }}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.muted, fontSize: 18, marginTop: 2 }}>Your stories are safe here.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.muted, fontSize: 16 }}>{itemCount} items • </Text>
              <Text style={{ color: theme.muted, fontSize: 16 }}>{collectionCount} collections</Text>
              <Ionicons name="arrow-forward-outline" size={14} color={theme.muted} style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>

        {/* Search Memories Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 16.94,
          paddingHorizontal: 18,
          paddingVertical: 13,
          marginBottom: 35,
          marginHorizontal: 13,
          borderWidth: 1,
          borderColor: '#D8E6EE',
          shadowColor: '#000',
          shadowOpacity: 0.03,
          shadowRadius: 6.6,
          shadowOffset: { width: 0, height: 2.2 },
          elevation: 1,
        }}>
          <Ionicons name="search-outline" size={20} color="#4A7A9B" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#4A7A9B', fontSize: 17.6 }}>
              Search your memories...
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { openCamera: 'true' } })}
            style={{ marginLeft: 8, backgroundColor: '#D8E6EE', borderRadius: 8, padding: 6 }}
            accessibilityLabel="Image Search"
          >
            <Ionicons name="camera-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Recent Memory header with See all */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13, marginTop: 9, paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 26.4, fontWeight: '300', color: '#0C1620', fontFamily: 'CormorantGaramond_300Light' }}>Recent Memory</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/items')}>
            <Text style={{ color: '#B8783A', fontSize: 18.7, fontWeight: '600' }}>See all <Ionicons name="arrow-forward-outline" size={17.6} color="#B8783A" /></Text>
          </TouchableOpacity>
        </View>
        {/* Preview of Last Uploaded Item */}
        <View style={{
          backgroundColor: '#F7FAFB',
          borderRadius: 19.8,
          flexDirection: 'row',
          alignItems: 'center',
          padding: 19.8,
          marginBottom: 35,
          marginHorizontal: 17.6,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8.8,
          shadowOffset: { width: 0, height: 2.2 },
          elevation: 1,
          minHeight: 110,
        }}>
          {lastItem ? (
            <>
              <Image
                source={{ uri: (Array.isArray(lastItem.images) && lastItem.images.length > 0) ? lastItem.images[0] : lastItem.image_url }}
                style={{ width: 88, height: 88, borderRadius: 15.4, marginRight: 19.8, backgroundColor: theme.background }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.primary, fontSize: 22, fontWeight: '700', marginBottom: 4.4 }} numberOfLines={1}>{lastItem.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 16.5, marginBottom: 2.2 }} numberOfLines={1}>
                  Added {lastItem.created_at ? timeAgo(lastItem.created_at) : ''}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 15.4 }}>Last Added Item</Text>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Ionicons name="cube-outline" size={40} color={theme.muted} style={{ marginRight: 18 }} />
              <View>
                <Text style={{ color: theme.muted, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>No recent trinkets</Text>
                <Text style={{ color: theme.muted, fontSize: 15 }}>Your latest memory will appear here.</Text>
              </View>
            </View>
          )}
        </View>

        {/* Blog section */}
        <View style={{ marginBottom: 10, paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 26.4, fontWeight: '300', color: '#0C1620', fontFamily: 'CormorantGaramond_300Light' }}>From the Blog</Text>
          <Text style={{ color: theme.muted, fontSize: 16.5, marginTop: 4 }}>Latest tips and stories from Trinket.</Text>
        </View>
        <View style={{ gap: 14, marginBottom: 28, paddingHorizontal: 18 }}>
          {blogPosts.map((post) => (
            <TouchableOpacity
              key={post.url}
              onPress={() => Linking.openURL(post.url)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#D8E6EE',
                shadowColor: '#000',
                shadowOpacity: 0.03,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
              accessibilityRole="link"
              accessibilityLabel={`Open blog post: ${post.title}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primary, fontSize: 18, fontWeight: '600', marginBottom: 6 }}>{post.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 15.5 }}>{post.summary}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={theme.accent} />
              </View>
            </TouchableOpacity>
          ))}
        </View>


      </ScrollView>
    </Screen>
  );
}