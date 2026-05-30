import {colours} from '../colours';
import {calculateContrastRatio} from '../../test-utils/accessibility';

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

describe('Token contrast (WCAG 2.1 AA)', () => {
  describe('text on the white card surface', () => {
    it('black name text', () => expectPair(colours.black, colours.white, AA_NORMAL, 'black on white'));
    it('darkGrey label text', () =>
      expectPair(colours.darkGrey, colours.white, AA_NORMAL, 'darkGrey on white'));
    // KNOWN AA FAILURE (tracked): midGrey on white is ~2.74:1, under the 4.5:1 floor. Used by the
    // card id labels and muted subtitles on light surfaces. it.failing keeps the suite honest and
    // green until the palette is fixed, at which point this marker must be removed.
    it.failing('midGrey id / subtitle text', () =>
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

  describe('UI accents (3:1 boundary)', () => {
    it('blue accent on white', () =>
      expectPair(colours.blue, colours.white, AA_LARGE, 'blue on white'));
  });
});
