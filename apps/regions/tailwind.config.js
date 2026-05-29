// --- regionsApp's Tailwind config. Merges the @pokedex/ui preset (shared colour tokens + the
// per-type colour namespace) so the remote resolves the same classes as the host, and scans
// both this remote's own source and the @pokedex/ui source so every className it renders is
// generated into this bundle's CSS. The cssInterop registry is a shared singleton at runtime,
// so styles merge with the host's; generating them here keeps the remote self-contained. ---

const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset'), require('@pokedex/ui/tailwind.preset.js')],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    path.join(
      path.dirname(require.resolve('@pokedex/ui/package.json')),
      'src/**/*.{js,jsx,ts,tsx}',
    ),
  ],
  theme: {extend: {}},
  plugins: [],
};
