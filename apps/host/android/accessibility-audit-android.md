# Native Accessibility Audit (Android) - EAA / WCAG 2.1

> Generated from an Android instrumentation run (`:app:connectedDebugAndroidTest`) with
> Google's Accessibility Test Framework wired in via Espresso's `AccessibilityChecks`. The
> Android counterpart to the iOS `performAccessibilityAudit` layer.

## Summary

- **Findings:** 0

No ATF findings were logged. As with the iOS audit, clean is necessary, not sufficient: ATF
samples the rendered view tree and the Jest token layer plus a manual TalkBack pass remain
required.
