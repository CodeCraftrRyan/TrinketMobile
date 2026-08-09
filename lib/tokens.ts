// tokens.ts — mobile's design system, mirroring the web theme
// (src/styles/trinket-theme.css) so the two platforms stay in step.
import { colors as base, radii, space } from './tokens-base.js';

export const colors = {
  // Surfaces
  bg: base.frost,
  card: base.white,
  surface: base.white,
  surfaceSoft: base.ice,
  tint: base.ice,
  surfaceDark: base.navy,

  // Ink
  ink: base.ink,                 // headings, values
  inkBody: base.ink,             // running prose
  inkLabel: base.inkMid,         // field names, captions (steel-deep, 6.1:1)
  inkFact: base.bronzeDeep,      // dates, years, accessions (5.2:1)
  inkLight: base.inkLight,       // placeholders and disabled only
  inkGhost: base.inkGhost,

  // Rules — elevation is a hairline, not a shadow
  border: base.mist,
  ruleSoft: base.ice,
  ruleStrong: base.navy,
  borderStrong: base.navy,

  // Action
  primary: base.navy,
  primaryText: base.white,
  accent: base.bronze,
  accentDeep: base.bronzeDeep,
  accentCool: base.steel,
  link: base.inkMid,
  linkHover: base.bronzeDeep,

  // Aliases kept for older screens
  text: base.ink,
  muted: base.inkMid,
  placeholder: base.inkLight,
  inkMid: base.inkMid,
  accentWarm: base.bronze,
};

// Type scale. Display face is EB Garamond, matching the web.
// (EB Garamond, Public Sans) are not bundled here.
export const type = {
  display:   { fontFamily: 'EBGaramond_400Regular', fontWeight: '400' as const, fontSize: 40, lineHeight: 46, letterSpacing: -0.6 },
  title:     { fontFamily: 'EBGaramond_400Regular', fontWeight: '400' as const, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  name:      { fontFamily: 'DMSans_500Medium',           fontWeight: '500' as const, fontSize: 22, lineHeight: 27 },
  nameSmall: { fontFamily: 'DMSans_500Medium',           fontWeight: '500' as const, fontSize: 17, lineHeight: 22 },
  lead:      { fontFamily: 'DMSans_400Regular',          fontWeight: '400' as const, fontSize: 17, lineHeight: 25 },
  body:      { fontFamily: 'DMSans_400Regular',          fontWeight: '400' as const, fontSize: 16, lineHeight: 24 },
  ui:        { fontFamily: 'DMSans_400Regular',          fontWeight: '400' as const, fontSize: 16, lineHeight: 22 },
  button:    { fontFamily: 'DMSans_500Medium',           fontWeight: '700' as const, fontSize: 16, letterSpacing: 0.3 },
  label:     { fontFamily: 'DMSans_500Medium',           fontWeight: '500' as const, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  fact:      { fontFamily: 'DMSans_400Regular',          fontWeight: '400' as const, fontSize: 13, lineHeight: 18 },
};

export const tokens = {
  colors,
  type,
  radius: radii,
  space,
  minTarget: 44,   // tap target floor
  measure: 68,     // prose column, in characters
};

export default tokens;
