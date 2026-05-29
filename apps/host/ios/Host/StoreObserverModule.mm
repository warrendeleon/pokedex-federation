#import "StoreObserverModule.h"
#import <HostSpecs/HostSpecs.h>
// See ShellNavigationModule.mm: import the app-delegate superclass before Host-Swift.h so the
// generated header's ReactNativeDelegate declaration resolves in this translation unit.
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Host-Swift.h"

// --- TurboModule implementation. updateState is a synchronous void method called on the JS
// thread after every dispatch; it forwards the envelope to the Swift NativeStore singleton. ---
@interface StoreObserverModule () <NativeStoreObserverModuleSpec>
@end

@implementation StoreObserverModule

RCT_EXPORT_MODULE()

- (void)updateState:(NSString *)dataKey payloadJson:(NSString *)payloadJson
{
  [[NativeStore shared] applyWithDataKey:dataKey payloadJson:payloadJson];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeStoreObserverModuleSpecJSI>(params);
}

@end
