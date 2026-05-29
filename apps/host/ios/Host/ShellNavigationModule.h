#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

// --- ShellNavigationModule: RN -> Native navigation with a return value. The shell's
// shellNavigate handler calls openNative for any ROUTE_REGISTRY destination of type 'native';
// this module presents the corresponding native flow (Quick Battle) and resolves the promise
// with its JSON result, completing the round trip. ---
@interface ShellNavigationModule : NSObject <RCTBridgeModule>
@end
