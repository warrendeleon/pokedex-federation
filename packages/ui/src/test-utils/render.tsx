import type {ReactElement} from 'react';
// nativewind/test compiles the real Tailwind config and runs setupAllComponents() (enables
// cssInterop) in a beforeEach, so classNames resolve to real style values in the render tree.
// react-native-css-interop/test re-exports RNTL's screen/queries through it.
import {render as nativewindRender} from 'nativewind/test';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const preset = require('../../tailwind.preset.js') as {theme: object};

export {screen, fireEvent, within, act} from 'nativewind/test';

// --- The standard render for the a11y/component tests: feeds our design-system token theme so
// `bg-navy`, `text-midGrey`, `bg-type-water` etc. resolve to their real hex values. Async because
// it compiles Tailwind. ---
export function renderWithTokens(
  ui: ReactElement,
  options: Record<string, unknown> = {},
): ReturnType<typeof nativewindRender> {
  return nativewindRender(ui, {config: {theme: preset.theme}, ...options});
}
