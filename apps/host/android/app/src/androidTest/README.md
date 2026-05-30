# Native accessibility audit (Android)

The Android half of the native audit layer, mirroring `ios/HostUITests`. Google's Accessibility Test
Framework (ATF), wired in through Espresso's `AccessibilityChecks`, checks the real rendered view tree
(contrast, touch-target size, missing labels, duplicate descriptions). `setRunChecksFromRootView(true)`
audits the full tree before each Espresso action, so a no-op action on the root audits the current
screen. `scripts/parse-android-audit.mjs` turns the captured logcat into
`android/accessibility-audit-android.md`.

## Status: runs, audits clean

The native shell modules are now implemented on Android (Kotlin `ShellNavigationModule` /
`StoreObserverModule`), so the host app boots and the federated screens render. The test drives the
Pokédex list and detail and audits each; ATF reports no findings, the same clean result as the iOS
`performAccessibilityAudit` run on the shared React Native components.

Clean is necessary, not sufficient. ATF samples the rendered view tree and, like Apple's audit,
under-reports on React Native Fabric content. The Jest token layer and a manual TalkBack pass remain
required.

A note on result visibility: the Espresso ATF integration has no per-result log hook, so the test uses
ATF's default behaviour, a genuine finding surfaces as a test failure with the finding in its message,
rather than a silent log. On a clean app the test passes.

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
