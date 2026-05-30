// --- Jest for the accessibility/logic layers, native render path. Uses react-native-css-interop's
// test setup so NativeWind classNames actually resolve to style values in the render tree (its
// render() compiles a css string and injects it), which is what lets contrast/style assertions
// read real resolved colours instead of an unresolved className string. ---
module.exports = {
  preset: '@react-native/jest-preset',
  // Reanimated/worklets can't init in Jest and css-interop's setup.js eagerly loads them; mock it
  // away. The render() helper itself doesn't need reanimated for non-animated components.
  setupFiles: ['<rootDir>/jest/mock-reanimated.js'],
  setupFilesAfterEnv: ['react-native-css-interop/dist/test/setupAfterEnv.js'],
  // Override the preset's transform to use the Jest-specific babel (nativewind as a preset).
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {configFile: './babel.jest.js'}],
  },
  testMatch: [
    '**/*.unit.ts',
    '**/*.accessibility.ts',
    '**/*.accessibility.tsx',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
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
      ].join('|') +
      ')/)',
  ],
};
