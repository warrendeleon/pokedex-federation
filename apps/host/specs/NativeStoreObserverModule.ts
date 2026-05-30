import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// --- TurboModule spec: the RN -> Native state mirror. The store middleware calls updateState
// after every dispatch with an envelope (dataKey + JSON payload), so the native side can read
// live cross-cutting state (party size, last battle winner) without a React render. Unidirectional
// by design: native observes, it does not mutate the RN store.
//
// Resolved with TurboModuleRegistry.get (not getEnforcing) so the middleware degrades to a
// transparent pass-through if the module isn't linked on a given platform/build. ---

export interface Spec extends TurboModule {
  updateState(dataKey: string, payloadJson: string): void;
}

export default TurboModuleRegistry.get<Spec>('StoreObserverModule');
