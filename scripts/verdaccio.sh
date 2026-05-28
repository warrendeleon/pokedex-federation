#!/usr/bin/env bash
# --- Start the repo-local Verdaccio npm registry on :4873.
# Storage + auth file live under ./verdaccio-storage (gitignored).
# First-run only: `npm adduser --registry http://localhost:4873/` to create your publish user.
# Then `cd packages/<name> && npm publish` from any @pokedex/* workspace.
# ---
set -euo pipefail

REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_DIR"

if ! command -v verdaccio >/dev/null 2>&1; then
  echo "[verdaccio.sh] verdaccio not installed. Run: npm install -g verdaccio"
  exit 1
fi

echo "[verdaccio.sh] starting Verdaccio at http://localhost:4873/"
echo "[verdaccio.sh] storage: $REPO_DIR/verdaccio-storage"
exec verdaccio --config "$REPO_DIR/verdaccio.yaml"
