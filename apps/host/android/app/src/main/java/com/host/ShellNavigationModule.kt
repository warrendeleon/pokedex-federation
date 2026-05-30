package com.host

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeShellNavigationModuleSpec

// --- The two-way bridge between the shell router and native, mirroring the iOS ShellNavigationModule.
//
// Native -> RN: a native screen calls ShellEventBridge.requestNavigate(...); this module's handler
// emits the onShellNavigate event the host JS subscriber turns into a shell route. Deep links arriving
// natively emit onDeepLink (warm) or are drained via consumeInitialDeepLink (cold).
//
// RN -> Native: openNative presents a native flow (Quick Battle) and resolves the promise with its
// JSON result. Phase A is a stub that resolves "{}" so the app boots and the JS await never hangs;
// the Compose battle screen is wired in next. ---
class ShellNavigationModule(reactContext: ReactApplicationContext) :
  NativeShellNavigationModuleSpec(reactContext) {

  init {
    ShellEventBridge.requestHandler = { destination, paramsJson ->
      emitOnShellNavigate(
        Arguments.createMap().apply {
          putString("destination", destination)
          putString("paramsJson", paramsJson)
        }
      )
    }
    ShellEventBridge.deepLinkHandler = { url ->
      emitOnDeepLink(Arguments.createMap().apply { putString("url", url) })
    }
  }

  override fun consumeInitialDeepLink(promise: Promise) {
    promise.resolve(ShellEventBridge.consumeInitialDeepLink())
  }

  override fun openNative(nativeId: String, paramsJson: String, promise: Promise) {
    // Phase A: native flow not wired yet on Android. Resolve so the openNative await never hangs.
    promise.resolve("{}")
  }
}
