import type {ReactElement} from 'react';
// nativewind/test runs setupAllComponents() (enables cssInterop) and compiles the design system's
// Tailwind theme, so classNames resolve to real style values in the render tree. That's what lets
// the rendered-style a11y assertions (contrast, touch targets) read actual colours and sizes.
import {render as nativewindRender} from 'nativewind/test';

export {screen, fireEvent, within, act} from 'nativewind/test';

/**
 * Bind a render to a design system's token theme (its Tailwind preset's `theme`), so that the
 * project's own classes (e.g. `bg-navy`, `text-midGrey`) resolve to their real hex values.
 *
 * In a consuming project:
 *   import {renderWithTheme} from '@pokedex/a11y-testing';
 *   import preset from '../tailwind.preset';
 *   export const render = renderWithTheme(preset.theme);
 */
export function renderWithTheme(
  theme: object,
): (ui: ReactElement, options?: Record<string, unknown>) => ReturnType<typeof nativewindRender> {
  return (ui, options = {}) => nativewindRender(ui, {config: {theme}, ...options});
}
