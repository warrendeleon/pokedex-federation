// --- Pokédex colour palette. Used by both the Tailwind preset (so className="bg-pokemonGreen"
// resolves) and runtime code that needs the hex value directly (status bar tint, gradient
// stops, native side). Single source of truth for both consumption paths. ---

export const colours = {
  // --- Brand + accent ---
  blue:          '#3A86FF',
  purple:        '#8338EC',
  red:           '#C92016',
  pokemonGreen:  '#9BE89B',
  lightGreen:    '#D1FFD7',
  darkGreen:     '#A6D3A0',

  // --- Neutrals (light theme) ---
  white:         '#FFFFFF',
  offWhite:      '#F7F8FC',
  offGrey:       '#F0F2F5',
  lightGrey:     '#DBDCE6',
  midGrey:       '#9A9AB0',
  darkGrey:      '#515151',

  // --- Neutrals (dark theme; Party tab uses these) ---
  navy:          '#0F172A',
  black:         '#2E3138',
} as const;

export type ColourToken = keyof typeof colours;
