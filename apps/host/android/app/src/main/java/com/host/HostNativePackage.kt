package com.host

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.host.specs.NativeShellNavigationModuleSpec
import com.host.specs.NativeStoreObserverModuleSpec

// --- Registers the host's native TurboModules (new architecture). Added to the package list in
// MainApplication; the iOS side gets the same via RCT_EXPORT_MODULE + autolinking. ---
class HostNativePackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      NativeShellNavigationModuleSpec.NAME -> ShellNavigationModule(reactContext)
      NativeStoreObserverModuleSpec.NAME -> StoreObserverModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider() =
    ReactModuleInfoProvider {
      mapOf(
        NativeShellNavigationModuleSpec.NAME to
          ReactModuleInfo(
            NativeShellNavigationModuleSpec.NAME,
            ShellNavigationModule::class.java.name,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            true, // isTurboModule
          ),
        NativeStoreObserverModuleSpec.NAME to
          ReactModuleInfo(
            NativeStoreObserverModuleSpec.NAME,
            StoreObserverModule::class.java.name,
            false,
            false,
            false,
            true,
          ),
      )
    }
}
