#import "ShellNavigationModule.h"
#import <HostSpecs/HostSpecs.h>
// Host-Swift.h declares every @objc Swift class in the app, including AppDelegate's
// ReactNativeDelegate, whose superclass lives here. Import it first so the generated header's
// forward references resolve in this ObjC++ translation unit.
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Host-Swift.h"

// --- TurboModule implementation. ObjC++ is required to return the codegen C++ JSI module from
// getTurboModule; the actual UI is Swift/SwiftUI (QuickBattlePresenter). openNative is async: it
// holds the promise resolve block until the native screen finishes, then resolves with the
// screen's JSON result, so RN awaits the native flow's return value. ---
@interface ShellNavigationModule () <NativeShellNavigationModuleSpec>
@end

@implementation ShellNavigationModule

RCT_EXPORT_MODULE()

// --- Native -> RN wiring. TurboModules are singletons, so this one instance's emitOnShellNavigate
// (inherited from the codegen SpecBase) is what every native screen reaches through the shared
// ShellEventBridge. A native screen calls ShellEventBridge.requestNavigate(...); that fires this
// handler, which emits the onShellNavigate event the host JS subscriber turns into a shell route.
// By the time a user taps a native button, RN has wired the JS event callback, so the emit is
// live. ---
- (instancetype)init
{
  if (self = [super init]) {
    __weak ShellNavigationModule *weakSelf = self;
    ShellEventBridge.shared.requestHandler = ^(NSString *destination, NSString *paramsJson) {
      ShellNavigationModule *strongSelf = weakSelf;
      if (strongSelf == nil) {
        return;
      }
      [strongSelf emitOnShellNavigate:@{
        @"destination": destination ?: @"",
        @"paramsJson": paramsJson ?: @"{}",
      }];
    };
  }
  return self;
}

- (void)openNative:(NSString *)nativeId
        paramsJson:(NSString *)paramsJson
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  [QuickBattlePresenter presentWithNativeId:nativeId
                                 paramsJson:paramsJson
                                 completion:^(NSString *_Nonnull resultJson) {
                                   resolve(resultJson);
                                 }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeShellNavigationModuleSpecJSI>(params);
}

@end
