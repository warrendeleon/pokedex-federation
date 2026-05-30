import {createNavigationContainerRef} from '@react-navigation/native';

import {
  ROUTE_REGISTRY,
  type ShellNavigateFn,
  type ShellNavigateResult,
} from '@pokedex/contracts';

import ShellNavigationModule from '../../specs/NativeShellNavigationModule';

import type {RootStackParamList} from './navigationTypes';

// --- Host-side implementation of shell.navigateTo. Resolves a destination name against
// ROUTE_REGISTRY and dispatches to either React Navigation (micro-app: a tab, or a root-stack
// screen like PokemonDetail) or the ShellNavigationModule native module (native: QuickBattle,
// ShareTeam). For native destinations the call returns a promise that resolves with whatever
// the native flow passed back; the full bidirectional handoff. ---

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const shellNavigateHandler: ShellNavigateFn = async (destination, params) => {
  const entry = ROUTE_REGISTRY[destination];
  if (!entry) {
    console.warn(`[shellNavigate] unknown destination: ${destination}`);
    return undefined;
  }

  if (entry.type === 'native') {
    // Round-trip the native flow: hand it the input as JSON, await the result JSON it resolves
    // with. ShellNavigationModule is a required shell capability (getEnforcing), so a missing
    // module fails loudly rather than silently dropping navigation.
    const resultJson = await ShellNavigationModule.openNative(
      entry.nativeId,
      JSON.stringify(params ?? {}),
    );
    return resultJson ? (JSON.parse(resultJson) as ShellNavigateResult) : undefined;
  }

  if (!navigationRef.isReady()) {
    console.warn(`[shellNavigate] navigation not ready; dropping ${destination}`);
    return undefined;
  }

  // micro-app: either a top-level tab (nested under the "Tabs" root screen) or a root-stack
  // screen (PokemonDetail).
  if ('tab' in entry) {
    navigationRef.navigate('Tabs', {screen: entry.tab});
  } else {
    // Forward uid as well as id: the party tab passes the slot uid so the detail screen knows the
    // Pokémon is already a member (it shows an in-party indicator rather than Add to Party).
    const p = params as {id?: unknown; uid?: unknown} | undefined;
    navigationRef.navigate('PokemonDetail', {
      id: Number(p?.id ?? 0),
      uid: typeof p?.uid === 'number' ? p.uid : undefined,
    });
  }
  return undefined;
};

// --- Native -> RN: subscribe once to the module's onShellNavigate event. A native screen emits a
// destination + params; we route it through the SAME shellNavigateHandler that JS callers use, so
// native-driven navigation and micro-app navigation share one code path and one routing table.
// Native fires this only on user interaction, long after the navigator is ready. ---
// Guarded against JS-ahead-of-native build skew (see onDeepLink below): skip rather than crash if
// the event method isn't on the running binary yet.
if (typeof ShellNavigationModule.onShellNavigate === 'function') {
  ShellNavigationModule.onShellNavigate(request => {
    const params = request.paramsJson ? JSON.parse(request.paramsJson) : {};
    void shellNavigateHandler(request.destination, params);
  });
}

// --- Deep / universal links. resolveDeepLink maps a URL onto a ROUTE_REGISTRY destination, so a
// link routes through the SAME shellNavigateHandler as everything else and can open an RN screen
// or a native flow alike. It lives in the host (next to the router), not contracts, because the
// host is the only thing that turns a URL into navigation; the remotes never see links. ---
export function resolveDeepLink(
  url: string,
): {destination: string; params?: Record<string, unknown>} | null {
  // Strip the scheme (pokedex://); for a universal link, also drop a leading "host.tld" segment.
  let rest = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const firstSlash = rest.indexOf('/');
  const head = firstSlash === -1 ? rest : rest.slice(0, firstSlash);
  if (head.includes('.')) {
    rest = firstSlash === -1 ? '' : rest.slice(firstSlash + 1);
  }
  const [resource, value] = rest.split('/').filter(Boolean);
  switch (resource) {
    case 'pokemon':
      return value ? {destination: 'PokemonDetail', params: {id: Number(value)}} : null;
    case 'party':
      return {destination: 'Party'};
    case 'pokedex':
      return {destination: 'Pokedex'};
    case 'regions':
      return {destination: 'Regions'};
    case 'battle':
      return {destination: 'QuickBattle'};
    default:
      return null;
  }
}

function routeDeepLink(url: string): void {
  const resolved = resolveDeepLink(url);
  if (resolved) {
    console.log(`[deepLink] ${url} -> ${resolved.destination}`);
    void shellNavigateHandler(resolved.destination, resolved.params);
  } else {
    console.warn(`[deepLink] unrecognised URL: ${url}`);
  }
}

// Warm path: a URL arriving while the app is running. Guarded: on a JS-ahead-of-native build skew
// (Fast Refresh during dev, or a staged native rollout) the event method may not exist yet; degrade
// to no-deep-links rather than crash the shell at module load.
if (typeof ShellNavigationModule.onDeepLink === 'function') {
  ShellNavigationModule.onDeepLink(event => routeDeepLink(event.url));
}

// Cold path: drain the URL that launched the app, once navigation is ready. Called from the
// NavigationContainer's onReady so the navigator exists before we try to route.
export async function processInitialDeepLink(): Promise<void> {
  if (typeof ShellNavigationModule.consumeInitialDeepLink !== 'function') {
    return;
  }
  const url = await ShellNavigationModule.consumeInitialDeepLink();
  if (url) {
    routeDeepLink(url);
  }
}
