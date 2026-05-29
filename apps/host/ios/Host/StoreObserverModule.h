#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

// --- StoreObserverModule: the RN -> Native state mirror. The Redux middleware calls updateState
// after every dispatch with a bridge envelope (stable dataKey + JSON payload). Native writes it
// into NativeStore so native surfaces (the Quick Battle screen) can read live party state without
// a React render. Observation only; native never mutates the RN store. ---
@interface StoreObserverModule : NSObject <RCTBridgeModule>
@end
