// --- Jest preset that wires the whole a11y harness so a consuming RN project only writes:
//   module.exports = { preset: '@pokedex/a11y-testing/jest-preset', testMatch: [...] };
// It extends @react-native/jest-preset and adds: the NativeWind babel (className -> cssInterop),
// the reanimated mock (worklets can't init in Jest), css-interop's toHaveStyle matcher, and a
// transform-ignore allowlist for the RN/NativeWind ecosystem so classNames resolve to real
// styles in the render tree. ---

const rnPreset = require('@react-native/jest-preset');

// Packages that ship untranspiled ESM/Flow and must be transformed (not ignored).
const TRANSPILE = [
  '@react-native',
  'react-native',
  'nativewind',
  'react-native-css-interop',
  '@gluestack-ui',
  '@legendapp',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-safe-area-context',
  'react-native-svg',
  '@shopify/flash-list',
  '@expo',
  '@pokedex',
];

module.exports = {
  ...rnPreset,
  setupFiles: [...(rnPreset.setupFiles || []), require.resolve('./jest/mock-reanimated.js')],
  setupFilesAfterEnv: [
    ...(rnPreset.setupFilesAfterEnv || []),
    require.resolve('react-native-css-interop/dist/test/setupAfterEnv.js'),
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: require.resolve('./babel.jest.js') }],
  },
  transformIgnorePatterns: [`node_modules/(?!(${TRANSPILE.join('|')})/)`],
};
