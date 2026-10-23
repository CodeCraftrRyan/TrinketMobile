import { supabase } from './supabase';

// Locations live in the `locations` table. Rows with user_id = null are the
// built-in rooms everyone sees; rows with a user_id are that person's own.
// Items store the location as plain text in items.location, not as a foreign
// key, so renaming a location also rewrites the items that use it.

export type LocationOption = {
  id?: number;          // undefined for the offline fallback list
  label: string;
  icon: string;
  own: boolean;         // true = the user's own, editable
};

const PRESET_ICONS: Record<string, string> = {
  Attic: 'home', Balcony: 'sunny', Basement: 'layers', Bathroom: 'water',
  'Bedroom 1': 'bed', 'Bedroom 2': 'bed', 'Bedroom 3': 'bed', Closet: 'shirt',
  'Craft Room': 'color-palette', 'Dining Room': 'restaurant', Entryway: 'enter',
  Garage: 'car', 'Guest Room': 'people', Hallway: 'walk', 'Home Gym': 'barbell',
  'Kids Room': 'happy', Kitchen: 'pizza', 'Laundry Room': 'shirt',
  'Living Room': 'home', 'Main Bedroom': 'bed', 'Media Room': 'tv',
  Mudroom: 'footsteps', Nursery: 'heart', Office: 'briefcase', Pantry: 'basket',
  Patio: 'sunny', Playroom: 'game-controller', Safe: 'lock-closed',
  Shed: 'construct', Storage: 'archive', 'Utility Room': 'build', Workshop: 'hammer',
};

// "Other" was the old free-text escape hatch; adding your own replaces it.
const HIDDEN_PRESETS = new Set(['other']);

export const OWN_LOCATION_ICON = 'location';

export function iconForLocation(label: string, own = false): string {
  if (own) return OWN_LOCATION_ICON;
  return PRESET_ICONS[label] ?? OWN_LOCATION_ICON;
}

const FALLBACK: LocationOption[] = Object.keys(PRESET_ICONS).map((label) => ({
  label, icon: PRESET_ICONS[label], own: false,
}));

const norm = (s: string) => s.trim().toLowerCase();

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/** The user's own locations first (A–Z), then the built-in rooms (A–Z). */
export async function fetchLocations(): Promise<LocationOption[]> {
  try {
    const userId = await currentUserId();
    if (!userId) return FALLBACK;
    const { data, error } = await supabase
      .from('locations')
      .select('id,name,user_id')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .is('event_id', null)
      .order('name');
    if (error) throw error;
    const own: LocationOption[] = [];
    const presets: LocationOption[] = [];
    const seen = new Set<string>();
    for (const row of data ?? []) {
      const label = String(row.name ?? '').trim();
      if (!label || HIDDEN_PRESETS.has(norm(label))) continue;
      const isOwn = row.user_id === userId;
      if (seen.has(norm(label))) continue;
      seen.add(norm(label));
      (isOwn ? own : presets).push({ id: row.id, label, icon: iconForLocation(label, isOwn), own: isOwn });
    }
    // addLocation refuses names that match a built-in room, so the de-dupe
    // above never hides one of the user's own.
    return [...own, ...presets];
  } catch (e) {
    console.warn('Could not load locations; using built-in rooms', e);
    return FALLBACK;
  }
}

/** Adds a location for the current user. Returns the existing one on a duplicate. */
export async function addLocation(name: string, existing: LocationOption[]): Promise<LocationOption> {
  const label = name.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Give the place a name.');
  const dup = existing.find((o) => norm(o.label) === norm(label));
  if (dup) return dup;
  const userId = await currentUserId();
  if (!userId) throw new Error('Please sign in first.');
  const { data, error } = await supabase
    .from('locations')
    .insert({ name: label, user_id: userId })
    .select('id,name')
    .single();
  if (error) throw error;
  return { id: data.id, label: data.name, icon: OWN_LOCATION_ICON, own: true };
}

/** Renames one of the user's locations and moves their items to the new name. */
export async function renameLocation(loc: LocationOption, newName: string, existing: LocationOption[]): Promise<number> {
  const label = newName.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Give the place a name.');
  if (!loc.own || loc.id == null) throw new Error('Built-in rooms can’t be renamed.');
  if (existing.some((o) => o.id !== loc.id && norm(o.label) === norm(label))) {
    throw new Error(`You already have “${label}”.`);
  }
  const userId = await currentUserId();
  if (!userId) throw new Error('Please sign in first.');
  const { error } = await supabase.from('locations').update({ name: label }).eq('id', loc.id);
  if (error) throw error;
  const { data: moved, error: itemsErr } = await supabase
    .from('items')
    .update({ location: label })
    .eq('user_id', userId)
    .eq('location', loc.label)
    .select('id');
  if (itemsErr) throw itemsErr;
  return moved?.length ?? 0;
}

/** How many of the user's items are filed under this location. */
export async function countItemsAt(label: string): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  const { count } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('location', label);
  return count ?? 0;
}

/** Removes one of the user's locations. Items keep the name as text. */
export async function deleteLocation(loc: LocationOption): Promise<void> {
  if (!loc.own || loc.id == null) throw new Error('Built-in rooms can’t be removed.');
  const { error } = await supabase.from('locations').delete().eq('id', loc.id);
  if (error) throw error;
}
