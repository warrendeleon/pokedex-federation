# Native Accessibility Audit (Android) - EAA / WCAG 2.1

> Generated from an Android instrumentation run (`:app:connectedDebugAndroidTest`) with
> Google's Accessibility Test Framework wired in via Espresso's `AccessibilityChecks`. The
> Android counterpart to the iOS `performAccessibilityAudit` layer.

## Status: blocked - the Android app does not boot

The audit could not run against any screen. The host app aborts at startup: its JS calls
`TurboModuleRegistry.getEnforcing('ShellNavigationModule')`, but that native module (and
`StoreObserverModule` / `QuickBattle`) is implemented for **iOS only** - there is no Android
(Kotlin) implementation - so `AppRegistry` never registers `"Host"` and no UI renders.

This is not an accessibility-testing gap. The ATF harness is correct and the full pipeline
runs (AVD, emulator, Gradle build, instrumentation, ATF wiring all verified). It will audit
the real screens as soon as the native shell modules are ported to Android. Until then the
instrumentation test fails on purpose, with this reason, rather than passing on an empty app.

Covered today on Android: nothing at the rendered-tree level. The iOS native audit covers the
shared design-system components (same RN tree), and the Jest layer is platform-independent.
