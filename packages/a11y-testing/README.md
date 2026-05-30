# @pokedex/a11y-testing

Drop-in WCAG 2.1 / EAA accessibility testing for React Native. Jest assertion helpers, a NativeWind-aware render, a WCAG criteria catalogue, and an `accessibility-report` generator. No paid scanner.

The European Accessibility Act (Directive 2019/882) has mandated WCAG 2.1 AA for EU-distributed apps since 28 June 2025. axe-core needs a DOM and React Native has none, so this is the RN-native equivalent: WCAG criteria expressed as plain Jest assertions over the component tree and its resolved styles.

## Setup

1. Install (plus the peers if your app doesn't already have them):

   ```sh
   npm i -D @pokedex/a11y-testing nativewind react-native-css-interop @tailwindcss/container-queries
   ```

2. Point Jest at the preset, it wires the NativeWind babel, the css-interop matchers, the reanimated mock, and the transform allowlist:

   ```js
   // jest.config.js
   module.exports = {
     preset: '@pokedex/a11y-testing',
     testMatch: ['**/*.accessibility.{ts,tsx}', '**/*.unit.ts'],
   };
   ```

3. Bind a render to your design tokens so your classes resolve to real values:

   ```ts
   // test-utils/render.ts
   import {renderWithTheme} from '@pokedex/a11y-testing';
   import preset from '../tailwind.preset';
   export const render = renderWithTheme(preset.theme);
   export {screen} from '@pokedex/a11y-testing';
   ```

## Writing tests

Group tests by success criterion so the report can map them (`WCAG <n.n.n>` in the describe title):

```tsx
import {render, screen} from '../test-utils/render';
import {expectAccessibilityProps, calculateContrastRatio} from '@pokedex/a11y-testing';

describe('WCAG 4.1.2 - Name, Role, Value', () => {
  it('the add button exposes a role and an accessible name', async () => {
    await render(<AddButton />);
    expectAccessibilityProps(screen.getByRole('button'), {role: 'button', label: true});
  });
});
```

## The report

```json
"scripts": {
  "accessibility-report": "jest --reporters=default --reporters=@pokedex/a11y-testing/reporter"
}
```

`npm run accessibility-report` writes `accessibility-report.md`: a WCAG 2.1 A+AA coverage map plus a findings list. It is deliberately honest, criteria the unit layer can't prove are marked as owned by the native-audit or manual layer rather than faked as passing.

## Helpers (criterion -> assertion)

| Helper | WCAG |
|---|---|
| `expectImageAccessible` | 1.1.1 |
| `expectHeading` / `expectSemanticRole` | 1.3.1 |
| `expectInputPurpose` | 1.3.5 |
| `expectNonColourCue` | 1.4.1 |
| `calculateContrastRatio` / `expectColorContrast` | 1.4.3, 1.4.11 |
| `expectScalableText` | 1.4.4 |
| `expectFocusOrder` / `expectCanReceiveFocus` | 2.4.3 |
| `expectLabelMatchesVisibleText` | 2.5.3 |
| `expectMinTouchTarget` / `expectMinHitSlop` | 2.5.5 |
| `expectErrorIdentified` | 3.3.1 |
| `expectFieldLabelled` | 3.3.2 |
| `expectAccessibilityProps` | 4.1.2 |
| `expectScreenReaderAnnouncement` / `expectLiveRegionContent` | 4.1.3 |

## What it can't do (by design)

Contrast as actually drawn, hit-region, dynamic type, and reflow live in the native a11y tree: cover them with Apple's `performAccessibilityAudit` and Google's ATF. Focus order in practice and label quality are human judgement: a VoiceOver / TalkBack pass. The report marks all of these honestly so the automated number is never overstated.
