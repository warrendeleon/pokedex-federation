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
ShellNavigationModule.onShellNavigate(request => {
  const params = request.paramsJson ? JSON.parse(request.paramsJson) : {};
  void shellNavigateHandler(request.destination, params);
});
