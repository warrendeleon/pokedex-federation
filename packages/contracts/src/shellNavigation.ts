// --- The shell's routing surface. Federated remotes import `shellNavigate` (and nothing else)
// and call it with a destination name. They never need to know whether the destination is
// another micro-app or a fully-native screen. Adding a destination is one row in
// ROUTE_REGISTRY; migrating a native feature to RN later is one row edit and no
// remote-side code changes. ---

export type RouteEntry =
  /** Switches to a bottom-tab destination via the host's NavigationContainer. */
  | { type: 'micro-app'; tab: 'PokedexTab' | 'PartyTab' | 'RegionsTab' }
  /** Pushes a screen onto the host's root native-stack (sits over the tabs as a modal-style
   *  presentation). Used for screens reachable from any tab; Detail is the canonical case. */
  | { type: 'micro-app'; rootScreen: 'PokemonDetail' }
  /** Hands off to native via ShellNavigationModule.openNative. Native VC presents, takes user
   *  input, dismisses, resolves the JS promise with a result object. */
  | { type: 'native'; nativeId: string };

export const ROUTE_REGISTRY: Record<string, RouteEntry> = {
  // --- Micro-app tabs ---
  Pokedex: { type: 'micro-app', tab: 'PokedexTab' },
  Party: { type: 'micro-app', tab: 'PartyTab' },
  Regions: { type: 'micro-app', tab: 'RegionsTab' },

  // --- Cross-cutting micro-app screen (root-stack modal over the tabs) ---
  PokemonDetail: { type: 'micro-app', rootScreen: 'PokemonDetail' },

  // --- Native flows (kept native because their value lives in platform integration:
  // game perf + audio mixing + haptics for QuickBattle; image composition + system share
  // sheet for ShareTeam). ---
  QuickBattle: { type: 'native', nativeId: 'quickBattle' },
  ShareTeam: { type: 'native', nativeId: 'shareTeam' },
};

/** What the native side may return. For micro-app destinations, resolves with undefined. */
export type ShellNavigateResult = Record<string, unknown> | undefined;

export type ShellNavigateFn = (
  destination: string,
  params?: Record<string, unknown>
) => Promise<ShellNavigateResult>;

// --- Bridge between the host and federated remotes. The host registers its real handler at
// boot; remotes call `shellNavigate` which proxies through globalThis. Using globalThis (rather
// than React Context) avoids the federated-module-identity issue: the contracts package is
// bundled into both the host and every remote, so a Context defined here would have distinct
// refs in each. globalThis is one runtime, one slot. ---
const GLOBAL_KEY = '__POKEDEX_SHELL_NAVIGATE__';

export function registerShellNavigateHandler(fn: ShellNavigateFn): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = fn;
}

export function shellNavigate(
  destination: string,
  params?: Record<string, unknown>
): Promise<ShellNavigateResult> {
  const fn = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as ShellNavigateFn | undefined;
  if (typeof fn !== 'function') {
    console.warn(`[shellNavigate] no handler registered (called with ${destination})`);
    return Promise.resolve(undefined);
  }
  return fn(destination, params);
}
