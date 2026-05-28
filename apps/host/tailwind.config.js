// --- Tailwind config for the host. Merges the @pokedex/ui preset (the shared colour tokens +
// the per-type colour namespace) so className="bg-pokemonGreen" / "bg-type-fire" resolve the
// same here as in any federated remote.
//
// `content` must scan the host's own source AND the @pokedex/ui package's compiled output,
// because the design-system components carry the className strings Tailwind needs to see to
// generate the matching utilities. Without the @pokedex/ui glob, classes only used inside the
// library (and not literally in host source) would be tree-shaken out of the generated CSS. ---

const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [
    require('nativewind/preset'),
    require('@pokedex/ui/tailwind.preset.js'),
  ],
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
    // --- Scan the design system's shipped source so its className strings are picked up. ---
    path.join(
      path.dirname(require.resolve('@pokedex/ui/package.json')),
      'src/**/*.{js,jsx,ts,tsx}',
    ),
  ],
  theme: {extend: {}},
  plugins: [],
};
