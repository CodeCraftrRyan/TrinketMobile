import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { getRecentlyViewed } from '../../lib/recent';
import { supabase } from '../../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [itemsCount, setItemsCount] = useState<number | null>(null);
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  
  

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session ?? null;
        if (!mounted) return;
        if (session) {
          setIsAuthed(true);
          setLoading(false);
        } else {
          setIsAuthed(false);
          setLoading(false);
        }
      } catch (e) {
        // on error, show home view
        console.warn('Failed to check session', e);
        if (mounted) setLoading(false);
      }
    }
    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  // fallback: if checkSession hangs for some reason, clear loading after 5s
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadCounts() {
      try {
        const [itemsRes, eventsRes] = await Promise.all([
          supabase.from('items').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
        ]);
        if (!mounted) return;
        if (!itemsRes.error) setItemsCount(itemsRes.count ?? 0);
        if (!eventsRes.error) setEventsCount(eventsRes.count ?? 0);
      } catch (e) {
        console.warn('Failed to load dashboard counts', e);
      }
    }
    if (isAuthed) loadCounts();
    // load recently viewed items
    async function loadRecent() {
      try {
        const ids = await getRecentlyViewed();
        if (!mounted || !ids || ids.length === 0) return;
        const { data, error } = await supabase.from('items').select('id,title,image_url,images').in('id', ids as string[]);
        if (error) {
          console.warn('Failed to load recent items', error);
          return;
        }
        // preserve order from ids (most recent first)
        const byId: Record<string, any> = {};
        (data ?? []).forEach((d: any) => { byId[String(d.id)] = d; });
        const ordered = ids.map((id) => byId[String(id)]).filter(Boolean);
        if (mounted) setRecentItems(ordered);
      } catch (e) {
        console.warn('loadRecent failed', e);
      }
    }
    if (isAuthed) loadRecent();
    return () => { mounted = false; };
  }, [isAuthed]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }
  if (isAuthed) {
    return (
      <Screen>
        <TabHeader title="Dashboard" actionTitle="Add New Item" onAction={() => router.push('/(tabs)/add')} />
        

        <TouchableOpacity onPress={() => router.push('/(tabs)/items')} style={{ marginBottom: 12 }}>
          <Card>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Collection</Text>
            <Text style={{ marginTop: 6, color: '#6B7280' }}>{itemsCount !== null ? `${itemsCount} items` : '—'}</Text>
          </Card>
        </TouchableOpacity>

        {/* Recently viewed box moved below Events per user request */}

        <TouchableOpacity onPress={() => router.push('/(tabs)/events')} style={{ marginBottom: 12 }}>
          <Card>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Events</Text>
            <Text style={{ marginTop: 6, color: '#6B7280' }}>{eventsCount !== null ? `${eventsCount} events` : '—'}</Text>
          </Card>
        </TouchableOpacity>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Recently viewed</Text>
          <Card>
            {recentItems.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 2, paddingVertical: 6 }}>
                {recentItems.map((it) => (
                  <TouchableOpacity key={it.id} onPress={() => router.push({ pathname: '/(tabs)/items/[id]', params: { id: it.id } } as any)} style={{ width: 260, marginRight: 16 }}>
                    <Card style={{ padding: 12, borderRadius: 16 }}>
                      <View style={{ height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                        {Array.isArray(it.images) && it.images.length > 0 ? (
                          <Image source={{ uri: it.images[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : it.image_url ? (
                          <Image source={{ uri: it.image_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : (
                          <Text style={{ color: '#9CA3AF' }}>No image</Text>
                        )}
                      </View>
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontWeight: '700', fontSize: 15 }}>{it.title}</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No items to display yet</Text>
              </View>
            )}
          </Card>
        </View>

        <View style={{ height: 12 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Welcome to Trinket</Text>
      <Text>Trinket helps you create a beautiful digital archive of your most meaningful possessions, preserving their stories and memories for generations to come.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="View Items" onPress={() => router.push('/(tabs)/items')} />
        <Button title="Add Item" onPress={() => router.push('/(tabs)/add')} />
      </View>
      <Text style={{ opacity: 0.6 }}>
        Tip: use the Items tab to add and organize your stuff.
      </Text>
    </Screen>
  );
}