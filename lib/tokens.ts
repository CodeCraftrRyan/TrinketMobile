// tokens.ts — mobile's single source, values flow from shared tokens.js
import { colors, radii } from './tokens.js'; // adjust path to the shared file

export const tokens = {
  colors: {
    bg: colors.frost,
    card: colors.white,
    primary: colors.steel,      // steel = primary/interactive (per guide)
    text: colors.ink,
    muted: colors.inkMid,
    border: colors.mist,
    accent: colors.bronze,      // bronze = CTA
    surface: colors.white,
    surfaceSoft: colors.blush,
    tint: colors.ice,
    borderStrong: colors.sage,
    ink: colors.ink,
    inkMid: colors.inkMid,
    inkLight: colors.inkLight,
    inkGhost: colors.inkGhost,
    accentWarm: colors.bronze,
    accentCool: colors.steel,
  },
  radius: { md: radii.md },
};