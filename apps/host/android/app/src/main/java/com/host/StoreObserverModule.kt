package com.host

import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeStoreObserverModuleSpec

// --- RN -> Native state mirror TurboModule. updateState is called on the JS thread after every
// dispatch with a bridge envelope (dataKey + JSON payload); it forwards to the NativeStore singleton.
// Mirrors the iOS StoreObserverModule. ---
class StoreObserverModule(reactContext: ReactApplicationContext) :
  NativeStoreObserverModuleSpec(reactContext) {

  override fun updateState(dataKey: String, payloadJson: String) {
    NativeStore.apply(dataKey, payloadJson)
  }
}
