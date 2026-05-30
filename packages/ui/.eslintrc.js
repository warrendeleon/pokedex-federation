// --- Accessibility lint layer for the design system. Deliberately scoped to the
// eslint-plugin-react-native-a11y rules rather than full @react-native style linting: this package
// was never linted, and the point here is the static a11y guard (missing labels, invalid roles,
// nested touchables) that catches issues at author time, before any test or native audit. It is the
// cheapest, never-stale, cross-platform layer of the accessibility composite. ---
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
  settings: {react: {version: 'detect'}},
  extends: ['plugin:react-native-a11y/all'],
  rules: {
    // accessibilityHint is optional in WCAG and Apple's HIG cautions against overusing it (it is
    // read after the label and quickly becomes chatter). We add hints where they genuinely help
    // (e.g. the card's "Opens details") but do not force one onto every labelled element.
    'react-native-a11y/has-accessibility-hint': 'off',
  },
  // The vendored Gluestack primitives (components/ui/**) and test utilities are not our authored
  // component surface; they carry their own lint directives for plugins this focused config does not
  // load. Lint the components we write.
  ignorePatterns: ['lib/', 'node_modules/', 'src/components/ui/', 'src/test-utils/', '**/__tests__/', '**/*.web.tsx'],
};
