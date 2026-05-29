import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';
import type {EventEmitter} from 'react-native/Libraries/Types/CodegenTypes';

// --- TurboModule spec: the two-way bridge between the shell router and native.
//
// openNative is RN -> Native with a return value: the shell calls it for any ROUTE_REGISTRY
// destination of type 'native' (Quick Battle, Share Team); native presents the flow and resolves
// the promise with its result, so the handoff is round-trip (RN passes paramsJson, native returns
// the resolved JSON string).
//
// onShellNavigate is the inverse, Native -> RN. A native screen can ask the shell to open ANY
// destination (an RN screen or another native flow) by emitting this event; the host subscribes
// once at boot and feeds it into the same shellNavigateHandler that JS calls. That lets a native
// screen drive React Navigation, without native knowing whether the target is RN or native.
//
// JSON strings (not codegen Object) keep the boundary explicit and match the envelope shape
// StoreObserverModule already uses. The host's shellNavigation handler stringifies/parses. ---

export interface ShellNavigateRequest {
  destination: string;
  paramsJson: string;
}

export interface Spec extends TurboModule {
  openNative(nativeId: string, paramsJson: string): Promise<string>;
  readonly onShellNavigate: EventEmitter<ShellNavigateRequest>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ShellNavigationModule');
