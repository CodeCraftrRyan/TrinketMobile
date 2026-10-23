import { supabase } from './supabase';

// "Suggest details" (describe-item) and "Find by photo" (image-search) draw on
// one monthly allowance: subscription_plans.max_ai_searches_per_month, counted
// in ai_search_usage by UTC month. This mirrors how the edge functions read it,
// so the number shown matches what the server will enforce.

export type Lookups = {
  used: number;
  cap: number | null;   // null = unlimited
  left: number | null;  // null = unlimited
};

const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
};

export async function fetchLookups(): Promise<Lookups | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return null;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('subscription_plans ( max_ai_searches_per_month )')
      .eq('user_id', uid)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    const joined: any = (sub as any)?.subscription_plans;
    let planRow = Array.isArray(joined) ? joined[0] : joined;
    if (!planRow) {
      const { data: free } = await supabase
        .from('subscription_plans').select('max_ai_searches_per_month')
        .eq('is_free', true).limit(1).maybeSingle();
      planRow = free;
    }
    const cap: number | null = planRow?.max_ai_searches_per_month ?? null;

    const { data: usage } = await supabase
      .from('ai_search_usage').select('used_count')
      .eq('user_id', uid).eq('month_start', monthStart()).maybeSingle();
    const used = usage?.used_count ?? 0;

    return { used, cap, left: cap === null ? null : Math.max(0, cap - used) };
  } catch (e) {
    console.warn('Could not read AI lookups', e);
    return null;
  }
}

/** "48 of 50 lookups left this month" / "Unlimited lookups" / "" */
export function lookupsLine(l: Lookups | null): string {
  if (!l) return '';
  if (l.left === null) return 'Unlimited lookups on your plan';
  return `${l.left} of ${l.cap} lookup${l.cap === 1 ? '' : 's'} left this month`;
}

/**
 * functions.invoke() wraps a non-2xx reply in a FunctionsHttpError whose
 * message is generic; the real body sits on error.context. Read it so a
 * spent allowance says so instead of "something went wrong".
 */
export async function readFunctionError(e: any): Promise<{ limitReached: boolean; message: string | null }> {
  try {
    const res = e?.context;
    if (res && typeof res.json === 'function') {
      const body = await res.clone().json().catch(() => null);
      if (res.status === 429 || body?.error === 'limit_reached') {
        return { limitReached: true, message: body?.message ?? null };
      }
      return { limitReached: false, message: body?.message ?? body?.error ?? null };
    }
  } catch { /* fall through */ }
  const msg = String(e?.message ?? '');
  return { limitReached: msg.includes('limit_reached') || msg.includes('429'), message: null };
}
