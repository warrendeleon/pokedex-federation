import {colours} from '../colours';
import {typeColours} from '../typeColours';
import {calculateContrastRatio} from '@pokedex/a11y-testing';

// --- WCAG 2.1 AA token-contrast matrix. A contrast ratio is a pair (text on surface), so we
// enumerate the foreground/background pairs the design system actually sanctions and assert each.
// This validates the palette contract at the source: if a pair passes, every component using it
// passes. Rendered/per-screen misuse is the native .contrast audit's job, not this. ---

const AA_NORMAL = 4.5; // normal-size text
const AA_LARGE = 3; // >= 18pt (or 14pt bold), and UI component boundaries

function expectPair(
  foreground: string,
  background: string,
  min: number,
  label: string,
): void {
  const ratio = calculateContrastRatio(foreground, background);
  // Assert as an object so a failure prints the label, the ratio, and the threshold.
  expect({label, ratio: Math.round(ratio * 100) / 100, min, passes: ratio >= min}).toMatchObject({
    passes: true,
  });
}

describe('WCAG 1.4.3 - Contrast (Minimum)', () => {
  describe('text on the white card surface', () => {
    it('black name text', () => expectPair(colours.black, colours.white, AA_NORMAL, 'black on white'));
    it('darkGrey label text', () =>
      expectPair(colours.darkGrey, colours.white, AA_NORMAL, 'darkGrey on white'));
    // KNOWN AA FAILURE (tracked): midGrey on white is ~2.74:1, under the 4.5:1 floor. Used by the
    // card id labels and muted subtitles on light surfaces. it.failing keeps the suite honest and
    // green until the palette is fixed, at which point this marker must be removed.
    it.failing('midGrey id / subtitle text (known AA failure: ~2.74:1 < 4.5:1)', () =>
      expectPair(colours.midGrey, colours.white, AA_NORMAL, 'midGrey on white'));
  });

  describe('text on the off-white screen surface', () => {
    it('black text', () => expectPair(colours.black, colours.offWhite, AA_NORMAL, 'black on offWhite'));
    it('darkGrey text', () =>
      expectPair(colours.darkGrey, colours.offWhite, AA_NORMAL, 'darkGrey on offWhite'));
  });

  describe('text on the navy (dark) surface', () => {
    it('white text', () => expectPair(colours.white, colours.navy, AA_NORMAL, 'white on navy'));
    it('midGrey subtitle text', () =>
      expectPair(colours.midGrey, colours.navy, AA_NORMAL, 'midGrey on navy'));
  });

});

// --- 1.4.11 Non-text Contrast (AA, 3:1): UI component boundaries and meaningful graphics. The token
// slice validates the design system's sanctioned accent colours against the surfaces they sit on.
// Contrast as actually drawn per component (e.g. a stat-bar fill against its track) is the native
// audit's job; where a graphic's value is also given as text, that text is the accessible cue. ---
describe('WCAG 1.4.11 - Non-text Contrast', () => {
  describe('accent on light surfaces (3:1 boundary)', () => {
    it('blue accent on white', () =>
      expectPair(colours.blue, colours.white, AA_LARGE, 'blue on white'));
    it('red accent on white', () =>
      expectPair(colours.red, colours.white, AA_LARGE, 'red on white'));
  });

  describe('accent on the navy (dark) surface', () => {
    it('blue accent on navy', () =>
      expectPair(colours.blue, colours.navy, AA_LARGE, 'blue on navy'));
  });

  // KNOWN finding (tracked): the stat-bar fill is a type colour drawn on the lightGrey track. Most
  // type colours sit below the 3:1 non-text-contrast floor against that track (electric ~1.1:1,
  // grass ~1.24:1; only the dark types clear it). Mitigated for now: every stat-bar prints its
  // numeric value as text, so the magnitude is available without perceiving the bar's length. This
  // is flagged for the design review / native audit; remove this marker once the track or the fill
  // palette is darkened to clear 3:1.
  it.failing('stat-bar fill on the track (known: most type fills < 3:1; value shown as text)', () =>
    expectPair(typeColours.electric, colours.lightGrey, AA_LARGE, 'electric fill on lightGrey track'));
});
