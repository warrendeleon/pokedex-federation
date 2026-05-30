// --- Prettier for the repo. prettier-plugin-tailwindcss sorts NativeWind classNames into a canonical
// order; the rest are standard formatting settings applied uniformly across every app and package. ---
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-tailwindcss'],
  // One config drives class ordering for every file; the host config merges the shared @pokedex/ui
  // preset, so it knows every custom class (bg-navy, bg-type-fire, text-midGrey, ...).
  tailwindConfig: './apps/host/tailwind.config.js',
};
