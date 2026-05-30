// --- The accessibility/logic test config. The harness (NativeWind babel, css-interop matchers,
// reanimated mock, transform allowlist) all comes from the shared @pokedex/a11y-testing preset, so
// this file only declares which files are tests. ---
module.exports = {
  preset: '@pokedex/a11y-testing',
  testMatch: ['**/*.unit.ts', '**/*.accessibility.ts', '**/*.accessibility.tsx'],
};
