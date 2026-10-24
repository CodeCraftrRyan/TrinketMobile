// Read-only loaders for the redesigned Collections, Moments, People and
// Places screens (M3). Mirrors Trinket-Web's src/lib/spine.js. Nothing here
// writes. People and places aren't their own records yet: a person is a name
// on items.people (plus the `people` list), a place is the text in
// items.location. These helpers group pieces by those.
import { signCovers } from './pieces';
import { supabase } from './supabase';

export const ITEM_FIELDS =
  'id,name,description,photo_url,people,location,year_manufactured,year,memory_date,event_id,created_at';

export type Piece = {
  id: string | number; name: string | null; description?: string | null; photo_url?: string | null;
  people?: string[] | null; location?: string | null; year?: string | null; year_manufactured?: string | null;
  memory_date?: string | null; event_id?: string | number | null; created_at?: string | null;
};
export type Moment = {
  id: string | number; name: string | null; description?: string | null; start_date?: string | null;
  event_date?: string | null; end_date?: string | null; people_list?: string[] | null; cover_photo_url?: string | null;
};

const PAGE = 1000;   // Supabase returns at most 1,000 rows per request
const CHUNK = 150;   // ids per .in() request, to keep URLs short

export const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
export const namesOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/** Every row a query returns, a page at a time. `build` makes a fresh query. */
export async function fetchAllRows<T = any>(build: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** Signed covers for any number of pieces, in chunks: { itemId: url }. */
export async function coversFor(rows: Piece[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < rows.length; i += CHUNK) {
    try { Object.assign(out, await signCovers(rows.slice(i, i + CHUNK))); }
    catch (e) { console.warn('spine: cover signing failed', e); }
  }
  return out;
}

/** Every piece the person has, with the fields these screens need. */
export async function loadPieces(userId?: string): Promise<Piece[]> {
  const id = userId ?? await uid();
  return fetchAllRows<Piece>(() =>
    supabase.from('items').select(ITEM_FIELDS).eq('user_id', id).order('created_at', { ascending: false }));
}

/** The year a piece speaks of, for ordering a timeline. null when undated. */
export function pieceYear(item: Piece): number | null {
  const y = parseInt(String(item.year_manufactured || item.year || '').slice(0, 4), 10);
  if (Number.isFinite(y)) return y;
  const m = /^(\d{4})/.exec(String(item.memory_date || ''));
  return m ? Number(m[1]) : null;
}

/** The year a moment marks, from its start date (or the single event date). */
export function momentYear(ev: Moment): number | null {
  const m = /^(\d{4})/.exec(String(ev?.start_date || ev?.event_date || ''));
  return m ? Number(m[1]) : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "June 2, 1921" from a moment's date, or null. */
export function momentDateLabel(ev: Moment): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ev?.start_date || ev?.event_date || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : null;
}

/** "Nine pieces" — counts spelled out to ten, as the mockups do. */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export function countPhrase(n: number, singular: string, plural: string) {
  return `${n <= 10 ? WORDS[n] : String(n)} ${n === 1 ? singular : plural}`;
}
export const piecesPhrase = (n: number) => countPhrase(n, 'piece', 'pieces');

/** Covers for the first `per` pieces of each group: { key: [url|null…] }. */
async function coversByGroup(groups: Record<string, Piece[]>, per: number) {
  const picks: Record<string, Piece[]> = {};
  Object.entries(groups).forEach(([k, items]) => { picks[k] = items.slice(0, per); });
  const map = await coversFor(Object.values(picks).flat());
  const out: Record<string, (string | null)[]> = {};
  Object.entries(picks).forEach(([k, list]) => { out[k] = list.map((p) => map[String(p.id)] ?? null); });
  return out;
}

export type Group = { name: string; pieces: Piece[]; covers: (string | null)[] };

// ---------------------------------------------------------------- collections

export type CollectionCard = { id: string; name: string; description: string | null; count: number; covers: (string | null)[] };

/** Collections with piece counts and up to four covers each, newest first. */
export async function loadCollections(): Promise<CollectionCard[]> {
  const id = await uid();
  const cols = await fetchAllRows<any>(() =>
    supabase.from('collections').select('id,name,description,created_at').eq('user_id', id).order('created_at', { ascending: false }));
  if (!cols.length) return [];
  const ids = cols.map((c) => c.id);
  const links: any[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    links.push(...await fetchAllRows<any>(() =>
      supabase.from('collection_items').select('collection_id,item_id').in('collection_id', ids.slice(i, i + CHUNK))));
  }
  const byCol: Record<string, string[]> = {};
  links.forEach((l) => { (byCol[String(l.collection_id)] ??= []).push(String(l.item_id)); });
  const firstFour = Object.values(byCol).flatMap((list) => list.slice(0, 4));
  const pieces: Piece[] = [];
  for (let i = 0; i < firstFour.length; i += CHUNK) {
    const { data } = await supabase.from('items').select('id,photo_url').in('id', firstFour.slice(i, i + CHUNK));
    pieces.push(...((data ?? []) as Piece[]));
  }
  const covers = await coversFor(pieces);
  return cols.map((c) => {
    const list = byCol[String(c.id)] ?? [];
    return {
      id: String(c.id), name: String(c.name ?? 'Collection'), description: c.description ?? null,
      count: list.length, covers: list.slice(0, 4).map((pid) => covers[pid] ?? null),
    };
  });
}

/** One collection and its pieces, newest first, with covers. */
export async function loadCollection(collectionId: string) {
  const id = await uid();
  const { data: col, error } = await supabase.from('collections').select('id,name,description').eq('id', collectionId).maybeSingle();
  if (error) throw error;
  if (!col) return null;
  const links = await fetchAllRows<any>(() => supabase.from('collection_items').select('item_id').eq('collection_id', collectionId));
  const ids = links.map((l) => l.item_id);
  const pieces: Piece[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await supabase.from('items').select(ITEM_FIELDS).eq('user_id', id).in('id', ids.slice(i, i + CHUNK));
    pieces.push(...((data ?? []) as Piece[]));
  }
  pieces.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  return { id: String(col.id), name: String(col.name ?? 'Collection'), description: col.description ?? null, pieces, covers: await coversFor(pieces) };
}

// -------------------------------------------------------------------- moments

/** Every moment, with how many pieces each holds. */
export async function loadMoments(): Promise<(Moment & { count: number })[]> {
  const id = await uid();
  const [events, pieces] = await Promise.all([
    fetchAllRows<Moment>(() => supabase.from('events')
      .select('id,name,description,start_date,event_date,end_date,people_list').eq('user_id', id).order('id')),
    fetchAllRows<any>(() => supabase.from('items').select('event_id').eq('user_id', id).not('event_id', 'is', null)),
  ]);
  const tally: Record<string, number> = {};
  pieces.forEach((p) => { if (p.event_id != null) tally[String(p.event_id)] = (tally[String(p.event_id)] ?? 0) + 1; });
  return events.map((e) => ({ ...e, count: tally[String(e.id)] ?? 0 }));
}

/** One moment, its pieces (with covers) and the people in it. */
export async function loadMoment(momentId: string) {
  const id = await uid();
  const { data: ev, error } = await supabase.from('events')
    .select('id,name,description,start_date,event_date,end_date,people_list').eq('id', momentId).maybeSingle();
  if (error) throw error;
  if (!ev) return null;
  const pieces = await fetchAllRows<Piece>(() =>
    supabase.from('items').select(ITEM_FIELDS).eq('user_id', id).eq('event_id', momentId).order('created_at', { ascending: false }));
  const people = Array.from(new Set([...namesOf((ev as Moment).people_list), ...pieces.flatMap((p) => namesOf(p.people))]));
  return { moment: ev as Moment, pieces, people, covers: await coversFor(pieces) };
}

// --------------------------------------------------------------------- people

/** People with their pieces, most pieces first; includes named people with none. */
export async function loadPeopleIndex(): Promise<Group[]> {
  const id = await uid();
  const [pieces, people] = await Promise.all([
    loadPieces(id),
    fetchAllRows<any>(() => supabase.from('people').select('name').eq('user_id', id).order('name')).catch(() => []),
  ]);
  const byKey = new Map<string, { name: string; pieces: Piece[] }>();
  const add = (name: string) => {
    const key = norm(name);
    if (!key) return null;
    if (!byKey.has(key)) byKey.set(key, { name: String(name).trim(), pieces: [] });
    return byKey.get(key)!;
  };
  people.forEach((p) => add(p.name));
  pieces.forEach((it) => namesOf(it.people).forEach((n) => add(n)?.pieces.push(it)));
  const list = [...byKey.values()].sort((a, b) => b.pieces.length - a.pieces.length || a.name.localeCompare(b.name));
  const covers = await coversByGroup(Object.fromEntries(list.map((p) => [norm(p.name), p.pieces])), 3);
  return list.map((p) => ({ ...p, covers: covers[norm(p.name)] ?? [] }));
}

/** One person: their pieces (oldest first), covers, and the moments they're in. */
export async function loadPerson(name: string) {
  const id = await uid();
  const key = norm(name);
  const [pieces, events] = await Promise.all([
    loadPieces(id),
    fetchAllRows<Moment>(() => supabase.from('events').select('id,name,start_date,event_date,people_list').eq('user_id', id).order('id')),
  ]);
  const mine = pieces.filter((it) => namesOf(it.people).some((n) => norm(n) === key))
    .sort((a, b) => (pieceYear(a) ?? 9999) - (pieceYear(b) ?? 9999));
  const moments = events.filter((e) => namesOf(e.people_list).some((n) => norm(n) === key))
    .sort((a, b) => (momentYear(a) ?? 9999) - (momentYear(b) ?? 9999));
  const shown = namesOf(mine[0]?.people).find((n) => norm(n) === key) || name;
  return { name: shown, pieces: mine, moments, covers: await coversFor(mine) };
}

// --------------------------------------------------------------------- places

/** Places that hold pieces, most pieces first, plus how many have no place. */
export async function loadPlacesIndex(): Promise<{ places: Group[]; unplaced: number }> {
  const pieces = await loadPieces();
  const byKey = new Map<string, { name: string; pieces: Piece[] }>();
  pieces.forEach((it) => {
    const key = norm(it.location);
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, { name: String(it.location).trim(), pieces: [] });
    byKey.get(key)!.pieces.push(it);
  });
  const list = [...byKey.values()].sort((a, b) => b.pieces.length - a.pieces.length || a.name.localeCompare(b.name));
  const covers = await coversByGroup(Object.fromEntries(list.map((p) => [norm(p.name), p.pieces])), 3);
  return {
    places: list.map((p) => ({ ...p, covers: covers[norm(p.name)] ?? [] })),
    unplaced: pieces.filter((it) => !norm(it.location)).length,
  };
}

/** One place: the pieces resting there, newest first, with covers. */
export async function loadPlace(name: string) {
  const key = norm(name);
  const pieces = (await loadPieces()).filter((it) => norm(it.location) === key);
  return { name: pieces[0]?.location?.trim() || name, pieces, covers: await coversFor(pieces) };
}
