// --- Repo-wide accessibility lint. Run uniformly across every app and package with
// `--no-eslintrc --config .eslintrc.js`, so one config and one install covers the whole monorepo
// (which has no workspaces) without each remote needing its own ESLint. This is the static a11y
// layer of the composite: missing labels, invalid roles, nested touchables, caught at author time.
// It is intentionally a11y-only; each app keeps its own style linting separately. ---
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
  // react-hooks is declared (not enforced) only so existing `// eslint-disable react-hooks/...`
  // directives in app code resolve under this a11y-only config instead of erroring as unknown rules.
  // Hooks linting itself stays with each app's own ESLint config.
  plugins: ['react-hooks'],
  rules: {
    // Optional in WCAG, and Apple's HIG warns against overusing hints (read after the label, they
    // become chatter). Add them where they help, do not force one onto every labelled element.
    'react-native-a11y/has-accessibility-hint': 'off',
  },
  ignorePatterns: [
    '**/lib/**',
    '**/node_modules/**',
    'packages/ui/src/components/ui/**',
    '**/test-utils/**',
    '**/__tests__/**',
    '**/*.web.tsx',
  ],
};
