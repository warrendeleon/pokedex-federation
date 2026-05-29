import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

// --- TurboModule spec: RN -> Native navigation with a return value. The shell calls openNative
// for any ROUTE_REGISTRY destination of type 'native' (Quick Battle, Share Team). The native
// side presents the flow and resolves the promise with its result, so the handoff is round-trip:
// RN passes input as paramsJson, native returns output as the resolved JSON string.
//
// JSON strings (not codegen Object) keep the boundary explicit and match the envelope shape
// StoreObserverModule already uses. The host's shellNavigation handler stringifies/parses. ---

export interface Spec extends TurboModule {
  openNative(nativeId: string, paramsJson: string): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ShellNavigationModule');
