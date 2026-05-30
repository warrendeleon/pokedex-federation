// --- Tailwind preset shipped by @pokedex/ui. Consumer apps import this and merge it into
// their own tailwind.config.js so every screen — host or federated remote — resolves the same
// colour tokens. This is what makes className="bg-pokemonGreen" or "bg-type-fire/30" work
// consistently across the whole federation.
//
// Two colour namespaces:
//   - top-level brand + neutral tokens (white, offWhite, midGrey, navy, pokemonGreen, ...)
//   - `type.<name>` for the 18 Pokémon types (bg-type-fire, text-type-fire, bg-type-water/30)
//
// Tokens stay in sync with src/tokens/colours.ts and src/tokens/typeColours.ts. If a token
// is added in one place, add it in both. ---

const colours = {
  // --- Brand + accent ---
  blue: '#3A86FF',
  purple: '#8338EC',
  red: '#C92016',
  pokemonGreen: '#9BE89B',
  lightGreen: '#D1FFD7',
  darkGreen: '#A6D3A0',

  // --- Neutrals (light theme) ---
  white: '#FFFFFF',
  offWhite: '#F7F8FC',
  offGrey: '#F0F2F5',
  lightGrey: '#DBDCE6',
  midGrey: '#9A9AB0',
  darkGrey: '#515151',

  // --- Neutrals (dark theme; Party tab) ---
  navy: '#0F172A',
  black: '#2E3138',
};

const typeColours = {
  normal: '#C5B1A1',
  fire: '#F78E69',
  water: '#3A86FF',
  electric: '#F7D02C',
  grass: '#A6D3A0',
  ice: '#A3D9FF',
  fighting: '#6C0E23',
  poison: '#ECB0E1',
  ground: '#E2BF65',
  flying: '#F5CAC3',
  psychic: '#E75A7C',
  bug: '#A8A77A',
  rock: '#775B59',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#1C2321',
  steel: '#797270',
  fairy: '#D685AD',
};

module.exports = {
  theme: {
    extend: {
      colors: {
        ...colours,
        type: typeColours,
      },
    },
  },
};
