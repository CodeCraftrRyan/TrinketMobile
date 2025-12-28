import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'recent_items_v1';
const MAX = 3;

export async function getRecentlyViewed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch (e) {
    console.warn('getRecentlyViewed failed', e);
    return [];
  }
}

export async function addRecentlyViewed(id: string) {
  if (!id) return;
  try {
    const existing = (await getRecentlyViewed()) || [];
    const deduped = [id, ...existing.filter((x) => x !== id)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(deduped));
  } catch (e) {
    console.warn('addRecentlyViewed failed', e);
  }
}

export async function clearRecentlyViewed() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn('clearRecentlyViewed failed', e);
  }
}
