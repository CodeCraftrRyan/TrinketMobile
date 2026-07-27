/* Trinket theme v1.0 — mobile token layer.
 *
 * Mirrors src/styles/trinket-theme.css on the web app. Every value here has a
 * counterpart there; if one changes, change both.
 *
 * Two rules this file exists to hold:
 *   1. Serif never goes below 19px. Under that, DM Sans at 500.
 *   2. Nothing lighter than weight 400 below 20px.
 *
 * NOTE: the accessibility layer in app/_layout.tsx assigns directly into
 * tokens.colors, so this must stay a plain mutable object and every key below
 * must keep its name.
 */

export const palette = {
  frost:       '#EEF3F6',
  white:       '#FFFFFF',
  ice:         '#E2EDF3',
  mist:        '#D8E6EE',
  powder:      '#9BBCD1',
  steel:       '#4A7A9B',
  steelDeep:   '#3A6480',
  navy:        '#0C1620',
  bronze:      '#B8783A',
  bronzeDeep:  '#8F5B23',
  bronzeLight: '#D9A05B',
};

export const tokens = {
  colors: {
    bg:           palette.frost,
    card:         palette.white,
    primary:      palette.steel,
    text:         palette.navy,
    muted:        palette.steelDeep,
    border:       palette.mist,
    accent:       palette.bronze,
    surface:      palette.white,
    surfaceSoft:  '#F7FAFB',
    tint:         palette.ice,
    borderStrong: '#B9CFDC',
    ink:          palette.navy,
    inkMid:       'rgba(12, 22, 32, 0.86)',
    inkLight:     palette.steelDeep,
    inkGhost:     palette.powder,
    accentWarm:   palette.bronze,
    accentCool:   palette.steel,

    inkBody:      'rgba(12, 22, 32, 0.86)',
    inkLabel:     palette.steelDeep,
    inkFact:      palette.bronzeDeep,
    link:         palette.steelDeep,
    ruleSoft:     palette.ice,
    ruleStrong:   palette.navy,
    onDark:       palette.frost,
    onDarkBody:   'rgba(247, 250, 251, 0.88)',
    onDarkLabel:  'rgba(216, 230, 238, 0.92)',
    onDarkFact:   palette.bronzeLight,
    ruleDark:     'rgba(216, 230, 238, 0.18)',
    surfaceDark:  palette.navy,
  },

  fonts: {
    display:       'CormorantGaramond_300Light',
    displayMedium: 'CormorantGaramond_500Medium',
    text:          'DMSans_400Regular',
    textMedium:    'DMSans_500Medium',
  },

  type: {
    display:   { fontFamily: 'CormorantGaramond_300Light',  fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
    title:     { fontFamily: 'CormorantGaramond_300Light',  fontSize: 30, lineHeight: 34 },
    name:      { fontFamily: 'CormorantGaramond_500Medium', fontSize: 22, lineHeight: 27 },
    nameSmall: { fontFamily: 'DMSans_500Medium',            fontSize: 17, lineHeight: 22 },
    lead:      { fontFamily: 'DMSans_400Regular',           fontSize: 17, lineHeight: 28 },
    body:      { fontFamily: 'DMSans_400Regular',           fontSize: 16, lineHeight: 27 },
    ui:        { fontFamily: 'DMSans_400Regular',           fontSize: 16, lineHeight: 22 },
    button:    { fontFamily: 'DMSans_500Medium',            fontSize: 15, lineHeight: 20 },
    tab:       { fontFamily: 'DMSans_500Medium',            fontSize: 12, lineHeight: 16 },
    label:     { fontFamily: 'DMSans_500Medium',            fontSize: 12, lineHeight: 16, letterSpacing: 0.9, textTransform: 'uppercase' as const },
    fact:      { fontFamily: 'DMSans_500Medium',            fontSize: 13, lineHeight: 17, letterSpacing: 1.2, textTransform: 'uppercase' as const },
    figure:    { fontFamily: 'CormorantGaramond_300Light',  fontSize: 34, lineHeight: 36 },
  },

  space: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },

  radius: { md: 0, mark: 10 },

  hairline: 1,
  minTarget: 44,
  mat: 12,
  matHero: 26,
};

export type Tokens = typeof tokens;
