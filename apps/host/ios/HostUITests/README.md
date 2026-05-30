# Native accessibility audit (iOS)

The native layer of the accessibility composite. The Jest layer (`@pokedex/a11y-testing`) checks the
component tree and token contrast; this layer checks the **real rendered accessibility tree** with
Apple's `XCUIApplication.performAccessibilityAudit()` (iOS 17+): contrast as actually drawn, hit
region, clipped/truncated text, missing element descriptions, and trait conflicts.

An audit **reports findings**; it is not a pass/fail gate. `AccessibilityAuditUITests` runs the audit
with the issue-handling closure so it collects every finding instead of stopping at the first, then
prints structured `A11Y_FINDING|screen|type|element|detail` lines that `scripts/parse-ios-audit.mjs`
turns into `ios/accessibility-audit-ios.md`.

## What it covers

Across all four federated screens (Pokédex list, Pokémon detail, Party, Regions):

- **performAccessibilityAudit** - contrast as drawn (1.4.3 / 1.4.11), hit region (2.5.8), clipped
  text / reflow (1.4.4 / 1.4.10), element descriptions and traits (1.1.1 / 4.1.2).
- **testKeyControlsAreReachableAndLabelled** - asserts (fails on regression) that cards and tabs are
  named buttons in the live tree (4.1.2) and that the detail screen is titled (2.4.2).

Not here, by design: keyboard traversal and focus-order-in-practice (2.1.1 / 2.1.2 / 2.4.3). React
Native on the iOS simulator does not support full-keyboard-access traversal reliably, so those stay
in the manual VoiceOver / TalkBack pass rather than being faked with flaky automation.

## Reading a clean result

Clean is necessary, not sufficient. `performAccessibilityAudit` samples the rendered layer tree and
on React Native (Fabric) under-reports on text it cannot sample: the Jest token matrix measures the
midGrey id / subtitle labels at ~2.74:1 (below the 4.5:1 AA floor) yet the native contrast check does
not flag them. A clean native pass is one layer, not a conformance certificate; the token layer and a
manual VoiceOver pass remain required.

## Running it

Prerequisites: Xcode 16+, an **iOS 17+ simulator**, and the federated app must boot fully populated,
so the five Metro dev servers must be running first:

```sh
cd apps/host    && npm run start            # :8081 (host)
cd apps/list    && npm run start:remote     # :8082
cd apps/party   && npm run start:remote     # :8083
cd apps/regions && npm run start:remote     # :8084
cd apps/detail  && npm run start:remote     # :8085
```

Then, from `apps/host`:

```sh
npm run a11y:audit:ios          # runs the audit on the sim, writes ios/accessibility-audit-ios.md
A11Y_SIM="iPhone 15" npm run a11y:audit:ios   # override the simulator
```

The `HostUITests` target and its shared scheme are created by `ios/add_uitest_target.rb` (idempotent,
driven by the `xcodeproj` gem CocoaPods vendors). They are committed, so you only re-run that script
if the target is ever lost.
