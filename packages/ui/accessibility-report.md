# Accessibility Report - EAA / WCAG 2.1 (A & AA)

> Generated 2026-05-30 from the @pokedex/ui accessibility test suite. The European
> Accessibility Act (Directive 2019/882) has mandated WCAG 2.1 AA for EU-distributed
> apps since 28 June 2025.

## Summary

- **Criteria in scope:** 50 (Level A + AA, per EN 301 549)
- **Automated coverage:** 1 / 15 unit-testable criteria have tests
- **Violations (must fix):** 0
- **Known / accepted findings (tracked):** 1
- **Other layers:** 5 native-audit · 21 manual · 9 N/A

## ⚠️ Known / accepted findings

- **1.4.3 Contrast (Minimum)** - midGrey id / subtitle text (known AA failure: ~2.74:1 < 4.5:1)

## Coverage by success criterion

| SC | Criterion | Level | Owned by | Status |
|---|---|---|---|---|
| 1.1.1 | Non-text Content <br/><sub>image alt / decorative (quality is manual)</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 1.2.1 | Audio-only and Video-only (Prerecorded) <br/><sub>no media</sub> | A | N/A | - n/a |
| 1.2.2 | Captions (Prerecorded) <br/><sub>no media</sub> | A | N/A | - n/a |
| 1.2.3 | Audio Description or Media Alternative <br/><sub>no media</sub> | A | N/A | - n/a |
| 1.2.4 | Captions (Live) <br/><sub>no media</sub> | AA | N/A | - n/a |
| 1.2.5 | Audio Description (Prerecorded) <br/><sub>no media</sub> | AA | N/A | - n/a |
| 1.3.1 | Info and Relationships <br/><sub>semantic roles (header, etc.)</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 1.3.2 | Meaningful Sequence | A | Manual | 👁 manual |
| 1.3.3 | Sensory Characteristics | A | Manual | 👁 manual |
| 1.3.4 | Orientation | AA | Native audit | 🔵 native audit |
| 1.3.5 | Identify Input Purpose <br/><sub>textContentType / autoComplete</sub> | AA | Automated (Jest) | ◻️ not yet tested |
| 1.4.1 | Use of Color <br/><sub>non-colour cue present (perception is manual)</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 1.4.2 | Audio Control <br/><sub>no audio</sub> | A | N/A | - n/a |
| 1.4.3 | Contrast (Minimum) <br/><sub>token matrix; rendered contrast is native</sub> | AA | Automated (Jest) | ⚠️ 1 known finding(s) |
| 1.4.4 | Resize Text <br/><sub>allowFontScaling not disabled</sub> | AA | Automated (Jest) | ◻️ not yet tested |
| 1.4.5 | Images of Text | AA | Manual | 👁 manual |
| 1.4.10 | Reflow | AA | Native audit | 🔵 native audit |
| 1.4.11 | Non-text Contrast <br/><sub>UI/graphics 3:1 (rendered is native)</sub> | AA | Automated (Jest) | ◻️ not yet tested |
| 1.4.12 | Text Spacing | AA | Native audit | 🔵 native audit |
| 1.4.13 | Content on Hover or Focus | AA | Manual | 👁 manual |
| 2.1.1 | Keyboard <br/><sub>external keyboard</sub> | A | Manual | 👁 manual |
| 2.1.2 | No Keyboard Trap | A | Manual | 👁 manual |
| 2.1.4 | Character Key Shortcuts | A | N/A | - n/a |
| 2.2.1 | Timing Adjustable | A | Manual | 👁 manual |
| 2.2.2 | Pause, Stop, Hide | A | Manual | 👁 manual |
| 2.3.1 | Three Flashes or Below Threshold | A | Manual | 👁 manual |
| 2.4.1 | Bypass Blocks <br/><sub>native nav, no page blocks</sub> | A | N/A | - n/a |
| 2.4.2 | Page Titled <br/><sub>screen titles</sub> | A | Manual | 👁 manual |
| 2.4.3 | Focus Order <br/><sub>focusable elements (real order is manual)</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 2.4.4 | Link Purpose (In Context) <br/><sub>link has a name (clarity is manual)</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 2.4.5 | Multiple Ways | AA | Manual | 👁 manual |
| 2.4.6 | Headings and Labels <br/><sub>descriptiveness is judgement</sub> | AA | Manual | 👁 manual |
| 2.4.7 | Focus Visible | AA | Native audit | 🔵 native audit |
| 2.5.1 | Pointer Gestures | A | Manual | 👁 manual |
| 2.5.2 | Pointer Cancellation | A | Manual | 👁 manual |
| 2.5.3 | Label in Name <br/><sub>accessible name contains visible text</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 2.5.4 | Motion Actuation | A | N/A | - n/a |
| 2.5.5 | Target Size <br/><sub>44pt; AAA in 2.1 but EN 301 549 / platform required</sub> | AAA | Automated (Jest) | ◻️ not yet tested |
| 3.1.1 | Language of Page <br/><sub>app language</sub> | A | Native audit | 🔵 native audit |
| 3.1.2 | Language of Parts | AA | Manual | 👁 manual |
| 3.2.1 | On Focus | A | Manual | 👁 manual |
| 3.2.2 | On Input | A | Manual | 👁 manual |
| 3.2.3 | Consistent Navigation | AA | Manual | 👁 manual |
| 3.2.4 | Consistent Identification | AA | Manual | 👁 manual |
| 3.3.1 | Error Identification <br/><sub>errors announced + described</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 3.3.2 | Labels or Instructions <br/><sub>inputs labelled</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 3.3.3 | Error Suggestion | AA | Manual | 👁 manual |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | Manual | 👁 manual |
| 4.1.2 | Name, Role, Value <br/><sub>role + accessible name + state</sub> | A | Automated (Jest) | ◻️ not yet tested |
| 4.1.3 | Status Messages <br/><sub>live region present + has content</sub> | AA | Automated (Jest) | ◻️ not yet tested |

## Methodology

Four layers, no single tool covers all of WCAG:

- **Automated (Jest):** this suite. React tree, props and resolved styles, runs in PR.
- **Native audit:** Apple `performAccessibilityAudit` + Google ATF, the rendered native a11y tree (contrast as drawn, hit region, dynamic type).
- **Manual:** VoiceOver / TalkBack release ritual, focus order and label quality.
- **N/A:** criteria for content this app does not have (audio, video).
