import {NativeModules} from 'react-native';
import {createNavigationContainerRef} from '@react-navigation/native';
import {
  ROUTE_REGISTRY,
  type ShellNavigateFn,
  type ShellNavigateResult,
} from '@pokedex/contracts';
import type {RootStackParamList} from './navigationTypes';

// --- Host-side implementation of shell.navigateTo. Resolves a destination name against
// ROUTE_REGISTRY and dispatches to either React Navigation (micro-app: a tab, or a root-stack
// screen like PokemonDetail) or the ShellNavigationModule native module (native: QuickBattle,
// ShareTeam). For native destinations the call returns a promise that resolves with whatever
// the native flow passed back; the full bidirectional handoff. ---

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ShellNavigationNative = {
  openNative: (
    nativeId: string,
    params: Record<string, unknown> | null,
  ) => Promise<ShellNavigateResult>;
};

const nativeBridge: ShellNavigationNative | undefined = (
  NativeModules as Record<string, unknown>
).ShellNavigationModule as ShellNavigationNative | undefined;

export const shellNavigateHandler: ShellNavigateFn = async (destination, params) => {
  const entry = ROUTE_REGISTRY[destination];
  if (!entry) {
    console.warn(`[shellNavigate] unknown destination: ${destination}`);
    return undefined;
  }

  if (entry.type === 'native') {
    if (!nativeBridge?.openNative) {
      console.warn(
        `[shellNavigate] native destination "${destination}" requested but ShellNavigationModule is not linked`,
      );
      return undefined;
    }
    return nativeBridge.openNative(entry.nativeId, params ?? null);
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
    navigationRef.navigate('PokemonDetail', {
      id: Number((params as {id?: unknown} | undefined)?.id ?? 0),
    });
  }
  return undefined;
};
