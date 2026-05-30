// --- Reanimated 4 / worklets can't initialise their native module under Jest. The design-system
// components don't animate in a way the a11y tests care about, so mock reanimated to a no-op and
// stub worklets so any transitive import (e.g. via @legendapp/motion) doesn't crash at load. ---
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
  createWorkletRuntime: () => ({}),
  runOnJS: fn => fn,
  runOnUI: fn => fn,
}));

jest.mock('react-native-reanimated', () => {
  try {
    return require('react-native-reanimated/mock');
  } catch {
    return { __esModule: true, default: {} };
  }
});
