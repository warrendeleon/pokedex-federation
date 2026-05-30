# Native Accessibility Audit (iOS) - EAA / WCAG 2.1

> Generated from `xcodebuild test -scheme HostUITests` on an iOS 17+ simulator. This is the
> native layer of the composite: Apple's `performAccessibilityAudit` checks the REAL rendered
> accessibility tree (contrast as drawn, hit region, clipped text, element descriptions,
> traits), the criteria the Jest layer deliberately defers here. An audit reports findings; it
> is not a pass/fail gate.

## Summary

- **Screens audited:** 4 (Pokedex list, Pokemon detail, Party, Regions)
- **Findings:** 0

## Reading a clean result

Clean is necessary, not sufficient. `performAccessibilityAudit` samples the rendered layer
tree, and on React Native (Fabric) it under-reports on text it cannot sample: the Jest token
matrix measures the midGrey id / subtitle labels at ~2.74:1 (below the 4.5:1 AA floor) yet the
native contrast check does not flag them here. So a clean native pass does not certify
conformance; it is one layer. The token layer (Jest) and a manual VoiceOver pass remain
required, and the two known token findings (midGrey text, stat-bar fill) still stand.

## By screen

### Pokedex list

No native audit findings on this screen.

### Pokemon detail

No native audit findings on this screen.

### Party

No native audit findings on this screen.

### Regions

No native audit findings on this screen.
