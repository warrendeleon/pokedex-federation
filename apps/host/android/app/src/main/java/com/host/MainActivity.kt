package com.host

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Host"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // --- Deep / universal links. Hand the raw URL to ShellEventBridge rather than resolve it here: the
  // JS shell owns the routing table. Cold start (onCreate) buffers the launch URL until JS drains it
  // via consumeInitialDeepLink; a warm link (onNewIntent) pushes straight to JS. Mirrors the iOS
  // AppDelegate handoff. ---
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    intent?.data?.let { ShellEventBridge.handleDeepLink(it.toString()) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    intent.data?.let { ShellEventBridge.handleDeepLink(it.toString()) }
  }
}
