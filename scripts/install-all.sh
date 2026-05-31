#!/usr/bin/env bash
# Turnkey install for a fresh clone:
#   1. starts the repo-local Verdaccio registry (for @pokedex/* packages)
#   2. publishes the three @pokedex/* packages into it
#   3. installs every app (which pulls @pokedex/* from Verdaccio, everything else from npmjs)
#   4. installs iOS pods for the host
# Idempotent: safe to re-run. Requires Node 18+, and for step 4, Ruby/Bundler + CocoaPods + Xcode.
set -euo pipefail

REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_DIR"

REGISTRY="http://localhost:4873"
SKIP_PODS="${SKIP_PODS:-0}"

echo "[install] 1/4  local Verdaccio registry"
if ! command -v verdaccio >/dev/null 2>&1; then
  echo "[install]      installing verdaccio globally (one-time)"
  npm install -g verdaccio >/dev/null 2>&1
fi
if ! curl -sf "$REGISTRY/-/ping" >/dev/null 2>&1; then
  echo "[install]      starting Verdaccio (log: /tmp/pokedex-verdaccio.log)"
  ./scripts/verdaccio.sh >/tmp/pokedex-verdaccio.log 2>&1 &
  for _ in $(seq 1 40); do curl -sf "$REGISTRY/-/ping" >/dev/null 2>&1 && break; sleep 1; done
fi
curl -sf "$REGISTRY/-/ping" >/dev/null 2>&1 || { echo "[install] ERROR: Verdaccio did not come up"; exit 1; }
# Anonymous publish is enabled for @pokedex/* in verdaccio.yaml; a placeholder token satisfies
# npm's local publish-auth check without an interactive `npm adduser`.
npm config set "//localhost:4873/:_authToken" "local-verdaccio" >/dev/null

echo "[install] 2/4  publishing @pokedex/* packages"
for pkg in contracts ui a11y-testing; do
  echo "[install]      @pokedex/$pkg"
  ( cd "packages/$pkg"
    npm install --no-audit --no-fund --silent
    # prepublishOnly builds the package; ignore "already published this version"
    npm publish --registry "$REGISTRY" >/dev/null 2>&1 || echo "[install]      (version already in registry, skipping)" )
done

echo "[install] 3/4  installing apps"
for app in host list party regions detail; do
  echo "[install]      apps/$app"
  ( cd "apps/$app" && npm install --no-audit --no-fund --silent )
done

if [ "$SKIP_PODS" = "1" ]; then
  echo "[install] 4/4  skipping iOS pods (SKIP_PODS=1)"
else
  echo "[install] 4/4  iOS pods (host)"
  ( cd apps/host && bundle install --quiet && cd ios && bundle exec pod install )
fi

echo "[install] done. Next: start the dev servers and run the host (see README Quick start)."
