// theme.ts — kept for backward compatibility; re-exports from tokens.ts
import { tokens } from './tokens';

export const theme = {
  background: tokens.colors.bg,
  card: tokens.colors.card,
  primary: tokens.colors.ink,   // NOTE: theme.primary historically = navy text
  muted: tokens.colors.muted,
  accent: tokens.colors.accent,
  list: tokens.colors.ink,
  softBlue: tokens.colors.surfaceSoft,
  gold: tokens.colors.accent,
  offWhite: tokens.colors.bg,
  border: tokens.colors.border,
  borderStrong: tokens.colors.borderStrong,
  inkLight: tokens.colors.inkLight,
  inkGhost: tokens.colors.inkGhost,
  accentCool: tokens.colors.accentCool,
};