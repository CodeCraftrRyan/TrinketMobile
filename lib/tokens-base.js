// Shared tokens (JS) used by mobile TypeScript entrypoint `lib/tokens.ts`.
// Values follow the Trinket Visual Brand Guide ("Whisper" palette).
export const colors = {
  // Palette
  frost:  '#F7FAFB',  // the page
  white:  '#FFFFFF',  // cards, surfaces
  ice:    '#E2EDF3',  // hover / soft tint
  mist:   '#D8E6EE',  // hairline, border
  powder: '#9BBCD1',  // icon strokes, disabled — never body text
  steel:  '#4A7A9B',  // primary interactive, large text
  navy:   '#0C1620',  // ink, dark surfaces
  bronze: '#B8783A',  // accent, stroke

  // Semantic ink
  ink:      '#0C1620',  // headings, values
  inkMid:   '#3A6480',  // steel-deep — small text, labels, links (6.1:1)
  inkLight: '#9BBCD1',  // placeholders and disabled only
  inkGhost: '#D8E6EE',

  // Accent on light grounds (5.2:1)
  bronzeDeep: '#8F5B23',
};

export const radii = {
  sm: 999, // buttons — pill, the iOS idiom for actions
  md: 8,   // inputs, rows
  lg: 12,  // cards, panels
};

export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64,
};

export default { colors, radii, space };
