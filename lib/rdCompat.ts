// The redesign (TRINKET_SPEC v5) expressed in the shape of lib/tokens.ts, so a
// long screen built on `tokens` can switch looks without being rewritten:
//   const tokens = redesign ? rdCompat : baseTokens;
// Same keys, v5 values: Public Sans for UI (400, never Light), Garamond 400
// for names, IBM Plex Mono for labels; bronze never fills (accent → steel);
// navy is the only filled colour; radii 6/8/12.
import { rd } from './rdTokens';
import { tokens as base } from './tokens';

const colors = {
  ...base.colors,
  bg: rd.color.frost,
  card: rd.color.paper,
  surface: rd.color.paper,
  surfaceSoft: rd.color.ice,
  tint: rd.color.ice,
  surfaceDark: rd.color.navy,
  ink: rd.color.navy,
  inkBody: rd.color.inkBody,
  inkLabel: rd.color.steelDeep,
  inkFact: rd.color.bronzeDeep,
  inkLight: rd.color.steel,
  border: rd.color.mist,
  ruleSoft: rd.color.mist,
  primary: rd.color.navy,
  primaryText: rd.color.paper,
  accent: rd.color.steel,        // switch tracks, meter fills: never bronze
  accentDeep: rd.color.bronzeDeep,
  accentCool: rd.color.steel,
  link: rd.color.steelDeep,
  text: rd.color.navy,
  muted: rd.color.steelDeep,
  placeholder: rd.color.steel,
  inkMid: rd.color.steelDeep,
};

const type = {
  ...base.type,
  name: { fontFamily: rd.font.display, fontWeight: '400' as const, fontSize: 22, lineHeight: 27 },
  nameSmall: { fontFamily: rd.font.display, fontWeight: '400' as const, fontSize: 19, lineHeight: 23 },
  lead: { fontFamily: rd.font.text, fontWeight: '400' as const, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: rd.font.text, fontWeight: '400' as const, fontSize: 16, lineHeight: 26 },
  ui: { fontFamily: rd.font.text, fontWeight: '400' as const, fontSize: 16, lineHeight: 22 },
  button: { fontFamily: rd.font.textMedium, fontWeight: '500' as const, fontSize: 16 },
  label: { fontFamily: rd.font.mono, fontWeight: '500' as const, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  fact: { fontFamily: rd.font.text, fontWeight: '400' as const, fontSize: 13, lineHeight: 18 },
};

export const rdCompat = {
  ...base,
  colors,
  type,
  radius: { ...base.radius, sm: rd.radius.sm, md: rd.radius.md, lg: rd.radius.lg },
};

export default rdCompat;

const HEAVY = ['500', '600', '700', '800', '900', 'bold'];

/**
 * Turn a screen's existing StyleSheet into its v5 version, for screens whose
 * styles are written as plain weights and sizes (the sign-in screens):
 *   - large bold text (24pt+) becomes EB Garamond 400 (never bold, never 300)
 *   - other bold text becomes Public Sans Medium (custom fonts carry their
 *     own weight; a numeric fontWeight would fall back to the system font)
 *   - pill corners become 8px, and shadows are removed
 * Colours come from building the StyleSheet with rdCompat.colors.
 */
export function rdStyleSheet<T extends Record<string, any>>(styles: T): T {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(styles)) {
    const s: Record<string, any> = { ...(value as object) };
    const w = String(s.fontWeight ?? '');
    if (HEAVY.includes(w)) {
      if ((s.fontSize ?? 0) >= 24) { s.fontFamily = rd.font.display; s.letterSpacing = -0.3; }
      else s.fontFamily = rd.font.textMedium;
      delete s.fontWeight;
    }
    if (typeof s.borderRadius === 'number' && s.borderRadius >= 18) s.borderRadius = rd.radius.md;
    if (s.shadowOpacity || s.shadowRadius || s.elevation) { s.shadowOpacity = 0; s.shadowRadius = 0; s.elevation = 0; }
    out[key] = s;
  }
  return out as T;
}
