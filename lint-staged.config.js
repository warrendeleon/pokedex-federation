// --- Pre-commit on staged files only. ESLint runs WITHOUT --fix: some a11y rules ship an autofix
// that would silently add a bare role to an unlabelled control, so we block instead and make a human
// give it a real accessible name (run `npm run lint:fix` for the mechanical fixes like import order).
// Prettier then formats. Heavier checks (typecheck, full test suite) run on pre-push. ---
module.exports = {
  '{packages,apps}/**/*.{ts,tsx}': [
    'eslint --no-eslintrc --config .eslintrc.js',
    'prettier --write',
  ],
  '{packages,apps}/**/*.{js,cjs,mjs,json}': 'prettier --write',
  '*.{js,cjs,mjs,json}': 'prettier --write',
};
