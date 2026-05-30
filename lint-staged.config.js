// --- Pre-commit: run the repo-wide accessibility lint on staged TS/TSX only. No `--fix`: some a11y
// rules ship an autofix that would silently add a bare role to an unlabelled control and let the
// commit through. We want the opposite, a hard block that makes a human give the control a real
// accessible name. Heavier checks (typecheck, full test suite) run on pre-push so commits stay fast. ---
module.exports = {
  '{packages,apps}/**/*.{ts,tsx}': 'eslint --no-eslintrc --config .eslintrc.js',
};
