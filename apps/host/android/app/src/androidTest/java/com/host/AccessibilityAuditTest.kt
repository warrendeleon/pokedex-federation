package com.host

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.accessibility.AccessibilityChecks
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.Matchers.any
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Native accessibility audit (Android) - the counterpart to the iOS performAccessibilityAudit test.
 *
 * Google's Accessibility Test Framework (ATF), wired in through Espresso's `AccessibilityChecks`,
 * checks the REAL rendered view tree (contrast, touch-target size, missing labels, duplicate
 * descriptions). `setRunChecksFromRootView(true)` runs the full-tree check before every Espresso
 * action, so performing a no-op action on the root audits the current screen.
 * `setThrowExceptionForErrors(false)` makes it LOG findings rather than fail the build: an audit
 * reports, it does not gate (same as iOS). ATF logs to Logcat; scripts/parse-android-audit.mjs
 * turns a captured logcat into accessibility-audit-android.md.
 *
 * The app must boot fully populated, so the five Metro dev servers must be running and their ports
 * reversed (adb reverse) before this runs. See android/app/src/androidTest/README.md.
 */
@RunWith(AndroidJUnit4::class)
class AccessibilityAuditTest {

  @get:Rule val scenarioRule = ActivityScenarioRule(MainActivity::class.java)

  companion object {
    init {
      // Default behaviour: a real ATF error surfaces as a test failure with the finding in its
      // message (the Espresso integration has no per-result log hook). On the shared RN components,
      // which audited clean on iOS, this passes; any genuine finding shows up loud.
      AccessibilityChecks.enable().setRunChecksFromRootView(true)
    }
  }

  /** A no-op action whose only purpose is to trigger ATF's root-view audit of the current screen. */
  private val auditScreen =
    object : ViewAction {
      override fun getConstraints() = any(View::class.java)

      override fun getDescription() = "trigger accessibility audit"

      override fun perform(uiController: UiController, view: View) {
        // Intentionally empty: AccessibilityChecks runs the audit around every Espresso action.
      }
    }

  @Test
  fun auditAcrossScreens() {
    // Give the federated list time to load over the wire before driving Espresso (it polls the view
    // tree, which isn't populated until the listApp remote has mounted).
    Thread.sleep(20_000)

    // Pokédex list (listApp remote).
    onView(isRoot()).perform(auditScreen)

    // Pokémon detail (detailApp remote): tap the first card by its accessible name, then audit.
    // Match the card button label specifically ("Bulbasaur, number 001, ...") so it can't collide
    // with the sprite's image alt ("Bulbasaur").
    onView(withContentDescription(containsString("Bulbasaur, number"))).perform(click())
    Thread.sleep(3_000)
    onView(isRoot()).perform(auditScreen)

    // Back to the list.
    InstrumentationRegistry.getInstrumentation()
      .uiAutomation
      .performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
    Thread.sleep(2_000)
    onView(isRoot()).perform(auditScreen)
  }
}
