import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Host",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // --- Custom-scheme deep links (pokedex://...). We hand the raw URL to ShellEventBridge rather
  // than resolve it here: the JS shell owns the routing table, so it decides whether the link opens
  // an RN screen or a native flow. ShellEventBridge pushes it to JS if the app is running, or
  // buffers it for the cold-start drain if the link launched the app. ---
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    ShellEventBridge.shared.handleDeepLink(url: url.absoluteString)
    return true
  }

  // --- Universal links (https://<associated-domain>/...). Same handoff as the custom scheme: hand
  // the raw URL to ShellEventBridge and let the JS shell resolve it (resolveDeepLink already drops
  // a leading host segment, so https and pokedex:// URLs map to the same routes). Requires the
  // associated-domains entitlement plus an apple-app-site-association hosted on the domain and a
  // signed build; it cannot be exercised on the simulator without those. ---
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL
    else {
      return false
    }
    ShellEventBridge.shared.handleDeepLink(url: url.absoluteString)
    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
