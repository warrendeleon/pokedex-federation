package com.host

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeShellNavigationModuleSpec

// --- The two-way bridge between the shell router and native, mirroring the iOS ShellNavigationModule.
//
// Native -> RN: a native screen calls ShellEventBridge.requestNavigate(...); this module's handler
// emits the onShellNavigate event the host JS subscriber turns into a shell route. Deep links arriving
// natively emit onDeepLink (warm) or are drained via consumeInitialDeepLink (cold).
//
// RN -> Native: openNative launches the native Quick Battle (a Compose Activity) for result and
// resolves the promise with the battle's JSON when it returns. Every exit path of the Activity (Done,
// "View in Pokédex", system back) delivers a result, so the JS await always resolves exactly once. ---
class ShellNavigationModule(reactContext: ReactApplicationContext) :
  NativeShellNavigationModuleSpec(reactContext) {

  // Held until QuickBattleActivity returns; a single pending promise + the re-entrancy guard in
  // openNative mirror the iOS isPresenting flag.
  private var pendingPromise: Promise? = null

  private val activityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != QUICK_BATTLE_REQUEST) return
        // Any exit (Done, view-in-Pokédex, back, cancel) lands here; missing data resolves "{}".
        val result = data?.getStringExtra(QuickBattleActivity.EXTRA_RESULT_JSON) ?: "{}"
        pendingPromise?.resolve(result)
        pendingPromise = null
      }
    }

  init {
    reactApplicationContext.addActivityEventListener(activityEventListener)
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
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pendingPromise != null) {
      // No host, or a flow is already in progress: settle the promise rather than wedge it.
      promise.resolve("{}")
      return
    }
    pendingPromise = promise
    // Read the mirrored party size once at present time, exactly as the iOS presenter does.
    val observedPartySize = NativeStore.partySize
    activity.runOnUiThread {
      val intent =
        Intent(activity, QuickBattleActivity::class.java).apply {
          putExtra(QuickBattleActivity.EXTRA_PARAMS_JSON, paramsJson)
          putExtra(QuickBattleActivity.EXTRA_OBSERVED_PARTY_SIZE, observedPartySize)
        }
      activity.startActivityForResult(intent, QUICK_BATTLE_REQUEST)
    }
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityEventListener)
    super.invalidate()
  }

  companion object {
    private const val QUICK_BATTLE_REQUEST = 0xB47
  }
}
