// Redesign tokens (TRINKET_SPEC v5 "Whisper"), used only by screens drawn when
// the redesign switch is on. The current design keeps lib/tokens.ts.
//
// Type: EB Garamond 400 names things (never 300, never under 19pt), Public Sans
// reads (never lighter than 400), IBM Plex Mono states small facts.
// Shape: radii 6/8/10/12 — nothing pill-shaped. Depth: hairlines, no shadows.
// Bronze is a stroke only, never a fill.
import { colors as base } from './tokens-base.js';

export const rd = {
  color: {
    frost: base.frost,          // page
    paper: '#FFFFFF',           // cards, panels
    ice: base.ice,              // tint, selected wash
    mist: base.mist,            // hairlines
    powder: base.powder,        // decorative only — never text
    steel: base.steel,          // icons at rest, secondary text
    steelDeep: base.inkMid,     // small text, labels
    navy: base.navy,            // ink, and the only filled button colour
    inkBody: '#2A3A47',         // long-form copy
    bronze: base.bronze,        // stroke only
    bronzeDeep: base.bronzeDeep,
  },
  font: {
    display: 'EBGaramond_400Regular',
    text: 'PublicSans_400Regular',
    textMedium: 'PublicSans_500Medium',
    mono: 'IBMPlexMono_500Medium',
  },
  type: {
    display: { fontFamily: 'EBGaramond_400Regular', fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: base.navy },
    title:   { fontFamily: 'EBGaramond_400Regular', fontSize: 30, lineHeight: 35, color: base.navy },
    name:    { fontFamily: 'EBGaramond_400Regular', fontSize: 22, lineHeight: 27, color: base.navy },
    lead:    { fontFamily: 'PublicSans_400Regular', fontSize: 17, lineHeight: 26, color: base.inkMid },
    body:    { fontFamily: 'PublicSans_400Regular', fontSize: 16, lineHeight: 26, color: '#2A3A47' },
    ui:      { fontFamily: 'PublicSans_400Regular', fontSize: 16, lineHeight: 22, color: base.navy },
    uiMedium:{ fontFamily: 'PublicSans_500Medium',  fontSize: 16, lineHeight: 22, color: base.navy },
    fact:    { fontFamily: 'PublicSans_400Regular', fontSize: 13, lineHeight: 18, color: base.inkMid },
    label:   { fontFamily: 'IBMPlexMono_500Medium', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: base.inkMid },
  },
  radius: { sm: 6, md: 8, mark: 10, lg: 12 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 },
  hairline: 1,
  minTarget: 44,
};

export default rd;
