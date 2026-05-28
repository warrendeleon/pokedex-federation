// --- TypeScript source of truth for the MF singleton list. The JS counterpart is
// apps/host/mf-shared.mjs (consumed by every rspack config, which is Node-side and can't
// import a .ts file directly). Keep this in sync with that file. ---

// --- WHY @reduxjs/toolkit + react-redux are singletons (and why this stack picks RTK Query
// over TanStack Query + Zustand for a federated app):
//
//   1. Runtime endpoint injection.
//      RTK Query exposes `baseApi.injectEndpoints({...})`. A federated remote loaded weeks
//      after the shell shipped can add its own query endpoints to the shell's shared baseApi
//      cache at runtime. TanStack Query has no equivalent: every query key has to be known
//      at the shell's build time, so a future remote can't add new queries without a host
//      rebuild and re-release. This is the load-bearing argument for federation.
//
//   2. Runtime slice injection.
//      RTK 2.x's `combineSlices({...}).inject(remoteSlice)` lets a remote register its
//      reducer into the shell's store at module load. Zustand stores are defined at build
//      time and have no comparable composition primitive, so federated remotes would each
//      need their own Zustand store. That breaks cross-feature state sharing.
//
//   3. One cache, one tag-invalidation graph.
//      One `createApi` instance for the whole app means one shared HTTP cache, one dedup
//      pipeline, one set of invalidation tags. A remote can invalidate another remote's
//      cached query by tag without importing the dispatching remote's slice file, and
//      without coupling the two via shared query-key conventions. TanStack + Zustand
//      requires per-team query-key registries to achieve the same coordination.
//
//   4. Federation-safe by construction.
//      Because RTK Query is one singleton instance, sharing it via MF singletons is a clean
//      "the host provides, every remote consumes" arrangement. Multiple-cache architectures
//      (TanStack per-remote + Zustand per-feature) duplicate the wiring per remote and
//      defeat the "shared store across the federation" model the strategy depends on.
//
// The trade-off: RTK has more vocabulary up front (slices, builders, tags) than TanStack's
// useQuery-and-done shape. That's a real cost in onboarding effort, paid once. The
// federation primitives above are not optional for the strategy; the onboarding cost is.
// ---

export type SharedDecl = {
  singleton: true;
  eager: boolean;
  requiredVersion: string;
};

export const SINGLETON_NAMES = [
  'react',
  'react-native',
  'react/jsx-runtime',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@react-navigation/bottom-tabs',
  'react-native-screens',
  'react-native-safe-area-context',
  '@reduxjs/toolkit',
  'react-redux',
  'redux-persist',
  '@react-native-async-storage/async-storage',
  '@pokedex/contracts',
  '@pokedex/ui',
] as const;

export type SingletonName = (typeof SINGLETON_NAMES)[number];
