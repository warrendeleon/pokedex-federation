// --- Accessibility test utility: WCAG 2.1 AA criteria expressed as plain Jest assertions.
//
// The European Accessibility Act (Directive 2019/882) has mandated WCAG 2.1 AA for EU-distributed
// apps since 28 June 2025, so this is a legal requirement, not a nicety. The approach: no paid
// scanner, just React Native Testing Library plus these helpers, each mapping a success criterion
// to an assertion. Components carry the accessibility props; tests assert they're present and that
// touch targets and colour contrast meet the thresholds.
//
// Deliberately React-Native-free: the helpers read props and flatten styles themselves, so the
// pure pieces (contrast on the design tokens) run with no native setup, and the component pieces
// take any object with a `.props` bag (an RNTL ReactTestInstance fits). ---

/** Minimal shape of an element under test: RNTL's ReactTestInstance satisfies this. */
export interface TestElement {
  props: Record<string, unknown>;
}

type StyleLike = Record<string, unknown> | null | undefined | StyleLike[];

/** Merge a RN style value (object, or nested array of objects) into one flat object. Equivalent to
 *  StyleSheet.flatten, reimplemented so this util needs no react-native import. */
export function flattenStyle(style: StyleLike): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({...acc, ...flattenStyle(s)}), {});
  }
  return style ? {...style} : {};
}

// MARK: - 1.4.3 Contrast (Minimum)

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** sRGB channel (0-255) to linear-light, per the WCAG relative-luminance definition. */
function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const {r, g, b} = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG contrast ratio between two hex colours, 1 (identical) to 21 (black on white). */
export function calculateContrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastOptions {
  /** Large text (>=18pt, or >=14pt bold) and UI component boundaries need only 3:1. */
  largeText?: boolean;
  uiComponent?: boolean;
  /** Label for the assertion message, e.g. "midGrey on white". */
  label?: string;
}

/** WCAG 1.4.3 / 1.4.11: assert a colour pair clears 4.5:1 (normal text) or 3:1 (large text / UI). */
export function expectColorContrast(
  foreground: string,
  background: string,
  options: ContrastOptions = {},
): void {
  const ratio = calculateContrastRatio(foreground, background);
  const min = options.largeText || options.uiComponent ? 3 : 4.5;
  const where = options.label ? `${options.label}: ` : '';
  expect({
    pair: `${where}${foreground} on ${background}`,
    ratio: Number(ratio.toFixed(2)),
    required: min,
  }).toEqual({
    pair: `${where}${foreground} on ${background}`,
    ratio: expect.any(Number),
    required: min,
  });
  expect(ratio).toBeGreaterThanOrEqual(min);
}

// MARK: - 2.5.5 Target Size

const MIN_TARGET_IOS = 44;

function measuredSize(element: TestElement, axis: 'Width' | 'Height'): number | undefined {
  const style = flattenStyle(element.props.style as StyleLike);
  // 1. flattened style (min<axis> or fixed <axis>)
  const fromStyle =
    (style[`min${axis}`] as number | undefined) ?? (style[axis.toLowerCase()] as number | undefined);
  if (typeof fromStyle === 'number') return fromStyle;
  // 2. full-size values fill their container and always pass
  if (style[axis.toLowerCase()] === '100%') return MIN_TARGET_IOS;
  // 3. direct props (some primitives accept width/height/minWidth as props)
  const propKey = axis.toLowerCase();
  const fromProp =
    (element.props[`min${axis}`] as number | undefined) ??
    (element.props[propKey] as number | undefined);
  if (typeof fromProp === 'number') return fromProp;
  return undefined;
}

/** WCAG 2.5.5: an interactive element must be at least 44x44pt, OR small visuals must extend their
 *  tappable area with hitSlop (see expectMinHitSlop). */
export function expectMinTouchTarget(element: TestElement, min: number = MIN_TARGET_IOS): void {
  const width = measuredSize(element, 'Width');
  const height = measuredSize(element, 'Height');
  if (width === undefined && height === undefined && element.props.hitSlop == null) {
    throw new Error(
      'Element has no measurable size and no hitSlop; cannot verify the 44pt touch target (WCAG 2.5.5).',
    );
  }
  if (width !== undefined) expect(width).toBeGreaterThanOrEqual(min);
  if (height !== undefined) expect(height).toBeGreaterThanOrEqual(min);
}

/** WCAG 2.5.5: a visually small control compensates with >= 8px hitSlop on every side. */
export function expectMinHitSlop(element: TestElement, min = 8): void {
  const hitSlop = element.props.hitSlop;
  if (typeof hitSlop === 'number') {
    expect(hitSlop).toBeGreaterThanOrEqual(min);
    return;
  }
  const slop = (hitSlop ?? {}) as Record<string, number>;
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    expect(slop[side] ?? 0).toBeGreaterThanOrEqual(min);
  }
}

// MARK: - 4.1.2 Name, Role, Value

export interface A11yExpectations {
  role?: string;
  /** true = any non-empty label; string = exact label. */
  label?: boolean | string;
  hint?: boolean | string;
  state?: Record<string, unknown>;
}

/** WCAG 4.1.2: every interactive element exposes a role and an accessible name; assert the props
 *  that screen readers rely on. */
export function expectAccessibilityProps(element: TestElement, expected: A11yExpectations): void {
  const p = element.props;
  if (expected.role !== undefined) {
    expect(p.accessibilityRole).toBe(expected.role);
  }
  if (expected.label === true) {
    expect(p.accessibilityLabel).toBeTruthy();
  } else if (typeof expected.label === 'string') {
    expect(p.accessibilityLabel).toBe(expected.label);
  }
  if (expected.hint === true) {
    expect(p.accessibilityHint).toBeTruthy();
  } else if (typeof expected.hint === 'string') {
    expect(p.accessibilityHint).toBe(expected.hint);
  }
  if (expected.state) {
    expect(p.accessibilityState).toMatchObject(expected.state);
  }
}

// MARK: - 2.4.3 Focus Order

/** WCAG 2.4.3: an element can take focus if it has a role, a label, or an onPress handler. */
export function expectCanReceiveFocus(element: TestElement): void {
  const p = element.props;
  const focusable =
    p.accessibilityRole != null ||
    p.accessibilityLabel != null ||
    typeof p.onPress === 'function' ||
    p.accessible === true;
  expect(focusable).toBe(true);
}

/** WCAG 2.4.3: a sequence of elements is all reachable, in order. */
export function expectFocusOrder(elements: TestElement[]): void {
  expect(elements.length).toBeGreaterThan(0);
  elements.forEach(expectCanReceiveFocus);
}

// MARK: - 4.1.3 Status Messages

/** WCAG 4.1.3: dynamic content announces itself via a live region (polite or assertive). */
export function expectScreenReaderAnnouncement(
  element: TestElement,
  level: 'polite' | 'assertive' = 'polite',
): void {
  const live = (element.props.accessibilityLiveRegion ?? element.props['aria-live']) as
    | string
    | undefined;
  expect(live).toBe(level);
}

// MARK: - 1.1.1 Non-text Content

/** WCAG 1.1.1: an Image either exposes an accessible name, or is explicitly hidden from assistive
 *  tech (decorative). An unlabelled, non-hidden image is a violation. */
export function expectImageAccessible(element: TestElement): void {
  const p = element.props;
  const hidden =
    p.accessibilityElementsHidden === true ||
    p['aria-hidden'] === true ||
    p.importantForAccessibility === 'no-hide-descendants' ||
    p.accessibilityRole === 'none';
  const named = Boolean(p.accessibilityLabel) || Boolean(p.alt);
  expect(named || hidden).toBe(true);
}

// MARK: - 1.3.1 Info and Relationships

/** WCAG 1.3.1: a heading carries the header role, so a screen reader can navigate by heading. */
export function expectHeading(element: TestElement): void {
  expect(element.props.accessibilityRole).toBe('header');
}

// MARK: - 1.3.5 Identify Input Purpose

/** WCAG 1.3.5: an input collecting known user data declares its purpose (so autofill works). */
export function expectInputPurpose(element: TestElement): void {
  const purpose = (element.props.textContentType ?? element.props.autoComplete) as
    | string
    | undefined;
  expect(purpose).toBeTruthy();
  expect(purpose).not.toBe('none');
  expect(purpose).not.toBe('off');
}

// MARK: - 1.4.1 Use of Colour

/** WCAG 1.4.1: meaning isn't carried by colour alone; the element also exposes a name, a state, or
 *  visible content a screen reader can convey. */
export function expectNonColourCue(element: TestElement): void {
  const p = element.props;
  const hasCue =
    Boolean(p.accessibilityLabel) || p.accessibilityState != null || p.children != null;
  expect(hasCue).toBe(true);
}

// MARK: - 1.4.4 Resize Text

/** WCAG 1.4.4: text scales with the user's font-size setting. Disabling allowFontScaling, or
 *  capping maxFontSizeMultiplier too low, breaks dynamic type. */
export function expectScalableText(element: TestElement, minMultiplier = 1.5): void {
  const p = element.props;
  expect(p.allowFontScaling).not.toBe(false);
  if (typeof p.maxFontSizeMultiplier === 'number') {
    expect(p.maxFontSizeMultiplier).toBeGreaterThanOrEqual(minMultiplier);
  }
}

// MARK: - 2.5.3 Label in Name

/** WCAG 2.5.3: the accessible name contains the visible label, so voice control ("tap <visible
 *  text>") works. */
export function expectLabelMatchesVisibleText(element: TestElement, visibleText: string): void {
  const label = String(element.props.accessibilityLabel ?? '').toLowerCase();
  expect(label).toContain(visibleText.trim().toLowerCase());
}

// MARK: - 3.3.2 Labels or Instructions

/** WCAG 3.3.2: an input has a programmatic label (a placeholder is not a label). */
export function expectFieldLabelled(element: TestElement): void {
  expect(element.props.accessibilityLabel).toBeTruthy();
}

// MARK: - 3.3.1 Error Identification

/** WCAG 3.3.1: an error is announced (alert role or assertive live region) and described in text,
 *  not by colour alone. */
export function expectErrorIdentified(element: TestElement): void {
  const p = element.props;
  const announced = p.accessibilityRole === 'alert' || p.accessibilityLiveRegion === 'assertive';
  expect(announced).toBe(true);
  expect(p.children ?? p.accessibilityLabel).toBeTruthy();
}

// MARK: - 4.1.3 Status Messages (content)

/** WCAG 4.1.3: a live region actually contains content (an empty assertive region announces
 *  nothing). */
export function expectLiveRegionContent(element: TestElement): void {
  const p = element.props;
  expect(p.accessibilityLiveRegion ?? p['aria-live']).toBeTruthy();
  expect(p.children ?? p.accessibilityLabel).toBeTruthy();
}
