// --- Single source of truth for the Module Federation singleton list, shared by the host
// rspack config and every remote rspack config. The LIST + the eager/lazy rule live here so
// they can never drift between host and remotes (drift is what makes a "shared" dependency
// silently get bundled twice at runtime).
//
// Versions come from each app's own package.json (passed in as `pkg`). The host is the eager
// provider, so its pinned versions are what actually ship at runtime; remotes declare the same
// packages lazy. In this monorepo every app pins identical versions, so they always match.
//
// What's shared (and why it MUST be, not just "nice to share"):
//   - react / react-native / navigation / screens / safe-area-context: one React tree, one
//     navigation graph across host + remotes.
//   - redux-toolkit / react-redux / redux-persist: remotes inject endpoints + slices into the
//     host's single store at runtime; that only works sharing the host's instance.
//   - nativewind: the cssInterop style registry is module-level singleton state; remotes'
//     styled components must register against the host's registry.
//   - @shopify/flash-list: the recycling list engine behind PokemonGrid. FlashList v2 is pure
//     JS on the new architecture (no native module / pod), so sharing it is for dedup, not
//     nativeness: one copy of the engine across host + remotes instead of each bundling its own,
//     and one version so list behaviour can't drift between micro-apps.
//   - @pokedex/contracts / @pokedex/ui: the route registry + design system; remotes consume the
//     host's instances so ROUTE_REGISTRY identity and the Gluestack provider/theme are shared.
//
// What's deliberately NOT shared: react-native-mmkv / nitro (host-only storage; remotes never
// touch them), react-native-reanimated / worklets (native singletons already; sharing the
// worklets runtime is fragile), and react/jsx-runtime (NativeWind owns the JSX runtime via
// jsxImportSource). Mirrors Re.Pack's own tester-federation-v2 host: share only what the
// federation contract genuinely requires.

export const SINGLETON_NAMES = [
  'react',
  'react-native',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@react-navigation/bottom-tabs',
  'react-native-screens',
  'react-native-safe-area-context',
  '@shopify/flash-list',
  '@reduxjs/toolkit',
  'react-redux',
  'redux-persist',
  'nativewind',
  '@pokedex/contracts',
  '@pokedex/ui',
];

/**
 * Build the MF `shared` map for one side of the federation.
 * @param {'host'|'remote'} side  host -> eager provider; remote -> lazy consumer.
 * @param {{dependencies?: Record<string,string>, devDependencies?: Record<string,string>}} pkg
 */
export function getMFShared(side, pkg) {
  const eager = side === 'host';
  const deps = {...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {})};
  const shared = {};
  for (const name of SINGLETON_NAMES) {
    const range = deps[name];
    // MF distinguishes two fields: `version` is the CONCRETE version this side provides;
    // `requiredVersion` is the semver RANGE it accepts. Passing the raw range as `version`
    // (e.g. "^0.4.0") makes the runtime test satisfies("^0.4.0", "^0.4.0") -> false, since a
    // range is not a concrete version, and it logs a noisy "does not satisfy" warning for every
    // caret-ranged singleton. Strip the range operator so the provided version is concrete
    // ("^0.4.0" -> "0.4.0"), which this pinned monorepo installs exactly.
    const version = range ? range.replace(/^[\^~>=<\s]+/, '') : undefined;
    shared[name] = {
      singleton: true,
      eager,
      // requiredVersion missing makes MF V2 silently DROP the shared config, so always set it.
      ...(range ? {version, requiredVersion: range} : {requiredVersion: '*'}),
    };
  }
  return shared;
}
