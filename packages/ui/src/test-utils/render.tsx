// --- The design system's render for a11y/component tests: the shared @pokedex/a11y-testing render
// bound to our token theme, so our classes (bg-navy, text-midGrey, bg-type-water) resolve to their
// real hex values in the tree. ---
import { renderWithTheme } from '@pokedex/a11y-testing';

export { screen, fireEvent, within, act } from '@pokedex/a11y-testing';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const preset = require('../../tailwind.preset.js') as { theme: object };

export const renderWithTokens = renderWithTheme(preset.theme);
