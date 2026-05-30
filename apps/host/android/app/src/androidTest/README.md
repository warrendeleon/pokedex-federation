# Native accessibility audit (Android)

The Android half of the native audit layer, mirroring `ios/HostUITests`. Google's Accessibility Test
Framework (ATF), wired in through Espresso's `AccessibilityChecks`, checks the real rendered view tree
(contrast, touch-target size, missing labels, duplicate descriptions). `setRunChecksFromRootView(true)`
audits the full tree before each Espresso action; `setThrowExceptionForErrors(false)` makes it log
findings rather than gate the build. `scripts/parse-android-audit.mjs` turns the captured logcat into
`android/accessibility-audit-android.md`.

## Current status: blocked on the native shell

The harness is complete and the whole pipeline is verified to run, AVD, emulator, Gradle build, the
instrumentation run, and ATF wiring all work. But it cannot audit any screen yet, because the **host
app does not boot on Android**: the JS calls `TurboModuleRegistry.getEnforcing('ShellNavigationModule')`,
and that module (plus `StoreObserverModule` and `QuickBattle`) is implemented for iOS only
(`ios/Host/*.mm`). There is no Android (Kotlin) implementation, so `AppRegistry` never registers
`"Host"` and nothing renders.

So the test **fails on purpose**, with that reason, instead of passing on an empty app. It will audit
the real screens as soon as the native shell modules are ported to Android. This is a native-platform
gap, not an accessibility-testing gap.

## Running it

Prerequisites: an Android emulator (e.g. `avdmanager create avd -n a11y_pixel -k
"system-images;android-35;google_apis;arm64-v8a" -d pixel_7`), the five Metro dev servers running, and
the Metro ports reversed so the app reaches them:

```sh
adb reverse tcp:8081 tcp:8081   # repeat for 8082-8085
cd apps/host/android && ./gradlew :app:connectedDebugAndroidTest
adb logcat -d > /tmp/android-logcat.log
node ../scripts/parse-android-audit.mjs /tmp/android-logcat.log android/accessibility-audit-android.md
```
