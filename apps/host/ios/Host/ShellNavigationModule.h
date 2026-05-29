#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <HostSpecs/HostSpecs.h>

// --- ShellNavigationModule: the two-way bridge between the shell router and native.
//
// RN -> Native: the shell's shellNavigate handler calls openNative for any ROUTE_REGISTRY
// destination of type 'native'; this module presents the native flow (Quick Battle) and resolves
// the promise with its JSON result, completing the round trip.
//
// Native -> RN: it inherits the codegen NativeShellNavigationModuleSpecBase, which carries the
// generated emitOnShellNavigate event. A native screen asks the shell to navigate by calling
// ShellEventBridge (Swift), whose handler this module wires to emitOnShellNavigate; the host's JS
// subscriber feeds the event into the same shellNavigateHandler. Only this .mm imports the header,
// and there's no Swift bridging header, so pulling the C++ codegen base in here is safe. ---
@interface ShellNavigationModule : NativeShellNavigationModuleSpecBase <NativeShellNavigationModuleSpec>
@end
