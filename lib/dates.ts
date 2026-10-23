// Flexible dates for heirlooms.
//
// People know "1952" or "June 1952" far more often than a full date, so the
// acquired/event fields accept all of these and store a real `date` plus a
// precision so the record can be shown honestly ("1952", not "1952-01-01"):
//
//   1952            → 1952-01-01, year
//   June 1952       → 1952-06-01, month      (also "Jun 1952", "1952-06", "6/1952")
//   1952-06-12      → 1952-06-12, day        (also "6/12/1952", "12 June 1952", "June 12, 1952")
//
// Mirrored on the web in src/lib/dates.js — keep the two in step.

export type DatePrecision = 'day' | 'month' | 'year';
export type ParsedDate = { iso: string; precision: DatePrecision };

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function monthIndex(word: string): number {
  const w = word.toLowerCase().replace(/\.$/, '');
  const i = MONTHS.findIndex((m) => m === w || m.slice(0, 3) === w || (w.length >= 3 && m.startsWith(w)));
  return i; // -1 if not a month
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function valid(y: number, m: number, d: number) {
  if (y < 1000 || y > 2999 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Returns the parsed date, or null when the text can't be read as one. Empty input → null. */
export function parseFlexibleDate(input: string | null | undefined): ParsedDate | null {
  const s = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  let m: RegExpMatchArray | null;

  // 1952
  if ((m = s.match(/^(\d{4})$/))) {
    const y = +m[1];
    return valid(y, 1, 1) ? { iso: `${y}-01-01`, precision: 'year' } : null;
  }
  // 1952-06 or 1952/06
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})$/))) {
    const y = +m[1], mo = +m[2];
    return valid(y, mo, 1) ? { iso: `${y}-${pad(mo)}-01`, precision: 'month' } : null;
  }
  // 1952-06-12 or 1952/06/12
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return valid(y, mo, d) ? { iso: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' } : null;
  }
  // 6/1952
  if ((m = s.match(/^(\d{1,2})[-/](\d{4})$/))) {
    const mo = +m[1], y = +m[2];
    return valid(y, mo, 1) ? { iso: `${y}-${pad(mo)}-01`, precision: 'month' } : null;
  }
  // 6/12/1952 (US order)
  if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
    const mo = +m[1], d = +m[2], y = +m[3];
    return valid(y, mo, d) ? { iso: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' } : null;
  }
  // June 1952 / Jun 1952 / June, 1952
  if ((m = s.match(/^([A-Za-z]+\.?),? (\d{4})$/))) {
    const mo = monthIndex(m[1]) + 1, y = +m[2];
    return mo > 0 && valid(y, mo, 1) ? { iso: `${y}-${pad(mo)}-01`, precision: 'month' } : null;
  }
  // June 12, 1952 / June 12 1952
  if ((m = s.match(/^([A-Za-z]+\.?) (\d{1,2}),? (\d{4})$/))) {
    const mo = monthIndex(m[1]) + 1, d = +m[2], y = +m[3];
    return mo > 0 && valid(y, mo, d) ? { iso: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' } : null;
  }
  // 12 June 1952
  if ((m = s.match(/^(\d{1,2}) ([A-Za-z]+\.?),? (\d{4})$/))) {
    const d = +m[1], mo = monthIndex(m[2]) + 1, y = +m[3];
    return mo > 0 && valid(y, mo, d) ? { iso: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' } : null;
  }
  return null;
}

/** "1952", "June 1952" or "12 June 1952", from a stored ISO date and precision. */
export function formatFlexibleDate(iso: string | null | undefined, precision?: DatePrecision | null): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const y = m[1], mo = +m[2], d = +m[3];
  const month = MONTHS[mo - 1] ? MONTHS[mo - 1][0].toUpperCase() + MONTHS[mo - 1].slice(1) : '';
  const p: DatePrecision = precision ?? 'day';
  if (p === 'year') return y;
  if (p === 'month') return `${month} ${y}`;
  return `${d} ${month} ${y}`;
}

export const DATE_HINT = 'e.g. 1952, June 1952, or 1952-06-12';
export const DATE_ERROR = "We couldn't read that date. Try a year (1952), a month (June 1952), or a full date (1952-06-12).";
