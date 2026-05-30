// --- Repo-wide lint, run uniformly across every app and package with `eslint --no-eslintrc --config
// .eslintrc.js` (one config, one install; the monorepo has no workspaces). Layers typescript-eslint
// recommended, simple-import-sort and Prettier compatibility on top of the React Native accessibility
// rules. Stays on ESLint 8 / eslintrc rather than ESLint 9 flat config because
// eslint-plugin-react-native-a11y has no ESLint 9 build. ---
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
  env: {es2021: true, node: true, jest: true},
  globals: {__DEV__: 'readonly'},
  settings: {react: {version: 'detect'}},
  plugins: ['@typescript-eslint', 'simple-import-sort', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-native-a11y/all',
    'prettier', // eslint-config-prettier: turn off formatting rules Prettier owns. Must stay last.
  ],
  rules: {
    // Optional in WCAG, and Apple's HIG warns against overusing hints. Add them where they help.
    'react-native-a11y/has-accessibility-hint': 'off',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^\\u0000'], // side-effect imports
          ['^react', '^@?\\w'], // react + other external packages
          ['^@pokedex(/.*|$)'], // internal @pokedex/* packages
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'], // parent imports
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'], // relative imports
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
  },
  overrides: [
    {
      // The host renders federated components resolved at RUNTIME; the boundary cannot know a remote
      // screen's prop types statically (that's the whole point of Module Federation), so
      // React.ComponentType<any> is the correct, type-honest representation here. Scoped to this one
      // file; no-explicit-any stays an error everywhere else.
      files: ['**/shell/FederatedTabBoundary.tsx'],
      rules: {'@typescript-eslint/no-explicit-any': 'off'},
    },
  ],
  ignorePatterns: [
    '**/lib/**',
    '**/node_modules/**',
    'packages/ui/src/components/ui/**',
    '**/test-utils/**',
    '**/__tests__/**',
    '**/*.web.tsx',
  ],
};
