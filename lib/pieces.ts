// Shared helpers for showing a piece (an `items` row) in the redesigned
// screens. Mirrors Trinket-Web's src/lib/pieces.js so both apps read the
// same record the same way. Read-only: nothing here writes to the database.
import { supabase } from './supabase';

export const PHOTO_BUCKET = 'item-photos';
const SIGN_SECONDS = 60 * 60;

export type PieceKind = 'photograph' | 'letter' | 'object';

/**
 * Which opened-piece layout a piece gets. `items` has no kind column, so it
 * follows the museum category. TODO(schema): use items.kind once it exists.
 */
export function pieceKind(categoryName?: string | null): PieceKind {
  const name = String(categoryName || '').toLowerCase();
  if (name.startsWith('photograph')) return 'photograph';
  if (name.startsWith('letters') || name.startsWith('documents')) return 'letter';
  return 'object';
}

export const kindLabel = (kind: PieceKind) =>
  ({ photograph: 'Photograph', letter: 'Letter', object: 'Object' }[kind]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The short date line for a piece, from the most telling field it has: the
 * year it was made ("c. 1920"), else the day it marks. Null when it has none.
 */
export function pieceDateLabel(item: any = {}): string | null {
  const year = String(item?.year_manufactured || item?.year || '').trim();
  if (year) return /^\d{4}$/.test(year) ? `c. ${year}` : year;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(item?.memory_date || ''));
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  return null;
}

/** People on a piece, from the item's own list. */
export function piecePeople(item: any = {}): string[] {
  return Array.isArray(item?.people) ? item.people.filter(Boolean).map(String) : [];
}

/**
 * Cover photographs for a set of pieces, signed now, in two requests: one to
 * find the first photo of pieces without `photo_url`, one to sign them all.
 * Returns { [itemId]: signedUrl }. Kept in screen state only, never saved.
 */
export async function signCovers(rows: { id: any; photo_url?: string | null }[]): Promise<Record<string, string>> {
  const paths: Record<string, string> = {};
  const missing: string[] = [];
  for (const r of rows) {
    if (r.photo_url) paths[String(r.id)] = r.photo_url;
    else missing.push(String(r.id));
  }
  if (missing.length) {
    const { data } = await supabase
      .from('item_photos')
      .select('item_id,storage_path,sort_order')
      .in('item_id', missing)
      .order('sort_order', { ascending: true });
    for (const p of (data ?? []) as any[]) {
      const k = String(p.item_id);
      if (!paths[k] && p.storage_path) paths[k] = p.storage_path;
    }
  }
  const entries = Object.entries(paths);
  if (!entries.length) return {};
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(entries.map(([, p]) => p), SIGN_SECONDS);
  const out: Record<string, string> = {};
  entries.forEach(([id], i) => {
    const url = signed?.[i]?.signedUrl;
    if (url) out[id] = url;
  });
  return out;
}

/** Every photograph of one piece, in order, signed now. */
export async function signPiecePhotos(itemId: string | number): Promise<string[]> {
  const { data } = await supabase
    .from('item_photos')
    .select('storage_path,sort_order')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: true });
  const paths = ((data ?? []) as any[]).map((r) => r.storage_path).filter(Boolean);
  if (!paths.length) return [];
  const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGN_SECONDS);
  return (signed ?? []).map((s: any) => s?.signedUrl).filter(Boolean);
}
