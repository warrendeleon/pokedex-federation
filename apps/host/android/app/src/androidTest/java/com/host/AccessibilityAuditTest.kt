package com.host

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.ViewInteraction
import androidx.test.espresso.accessibility.AccessibilityChecks
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Native accessibility audit (Android) - the counterpart to the iOS performAccessibilityAudit test.
 *
 * Google's Accessibility Test Framework (ATF), wired in through Espresso's `AccessibilityChecks`,
 * checks the REAL rendered view tree (contrast, touch-target size, missing labels, duplicate
 * descriptions, traits). `setRunChecksFromRootView(true)` runs the full-tree check before every
 * Espresso action, so navigating the federated screens audits each one. `setThrowExceptionForErrors(false)`
 * makes it LOG findings rather than fail the build: an audit reports, it does not gate (same as iOS).
 * ATF logs each result to Logcat; scripts/parse-android-audit.mjs turns a captured logcat into
 * accessibility-audit-android.md.
 *
 * The app must boot fully populated, so the five Metro dev servers must be running and the host app
 * installed in dev mode before this runs (see HostUITests/README.md for the symmetric iOS setup).
 */
@RunWith(AndroidJUnit4::class)
class AccessibilityAuditTest {

  @get:Rule
  val scenarioRule = ActivityScenarioRule(MainActivity::class.java)

  companion object {
    init {
      AccessibilityChecks.enable()
        .setRunChecksFromRootView(true)
        .setThrowExceptionForErrors(false)
    }
  }

  /** Poll for a view matching the content description, so remote bundles have time to load. */
  private fun waitForContentDescription(text: String, timeoutMs: Long = 40_000): ViewInteraction? {
    val deadline = System.currentTimeMillis() + timeoutMs
    while (System.currentTimeMillis() < deadline) {
      try {
        val interaction = onView(withContentDescription(containsString(text)))
        interaction.perform(click()) // also triggers the root-view ATF audit for this screen
        return interaction
      } catch (_: Throwable) {
        Thread.sleep(1000)
      }
    }
    return null
  }

  @Test
  fun auditAcrossScreens() {
    // The app must boot to the Pokédex list before anything can be audited. Assert it loudly rather
    // than letting the test pass silently with nothing audited.
    val listShown = waitForContentDescription("Bulbasaur") != null
    org.junit.Assert.assertTrue(
      "Pokédex list never rendered on Android. The host app aborts at startup: its JS calls " +
        "TurboModuleRegistry.getEnforcing('ShellNavigationModule'), but that module (and " +
        "StoreObserverModule / QuickBattle) is implemented for iOS only - there is no Android " +
        "(Kotlin) implementation - so AppRegistry never registers \"Host\". The ATF harness is " +
        "correct and runs; it cannot audit screens until the native shell is ported to Android.",
      listShown,
    )

    // Past this point the list rendered, so each navigation triggers a root-view ATF audit.
    Thread.sleep(2000)
    androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation
      .performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
    Thread.sleep(1500)

    waitForContentDescription("Party, tab")
    Thread.sleep(2000)

    waitForContentDescription("Regions, tab")
    Thread.sleep(2000)

    try {
      onView(isRoot()).perform(click())
    } catch (_: Throwable) {
    }
  }
}
