/* Trinket theme v1.0 — legacy colour map.
 *
 * Kept because nine screens import it and the accessibility layer in
 * app/_layout.tsx assigns into it by key. Values mirror lib/tokens.ts;
 * new work should import tokens instead.
 */
export const theme = {
  background: '#EEF3F6',  // the page
  card: '#FFFFFF',        // mats and panels
  primary: '#0C1620',     // headings, object names
  muted: '#3A6480',       // labels, captions (6.1:1)
  accent: '#B8783A',      // stroke only
  list: '#0C1620',
  softBlue: '#F7FAFB',
  gold: '#B8783A',
  offWhite: '#F7FAFB',
  border: '#D8E6EE',
  borderStrong: '#B9CFDC',
  inkLight: '#3A6480',
  inkGhost: '#9BBCD1',    // marks only, never text
  accentCool: '#4A7A9B',
};
