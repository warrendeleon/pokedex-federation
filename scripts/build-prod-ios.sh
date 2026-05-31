#!/usr/bin/env bash
# Build the production CDN for iOS. Ensures the signing keypairs exist and are embedded, then
# assembles the signed, versioned remote bundles plus the per-app-version signed version-maps
# under ./cdn-root. Serve it with `npm run serve:cdn` and point the host at it with MF_CDN_BASE.
#
#   MF_CDN_BASE=http://localhost:8000 ./scripts/build-prod-ios.sh
set -euo pipefail

REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_DIR"

echo "[build-prod-ios] 1/2  signing keys (generate if missing, embed public halves)"
node tools/gen-signing-keys.mjs

echo "[build-prod-ios] 2/2  building signed CDN at ./cdn-root/ios"
node tools/build-cdn.mjs ios

echo "[build-prod-ios] done."
echo "[build-prod-ios] serve it:  npm run serve:cdn"
echo "[build-prod-ios] run host:  cd apps/host && npm run ios   (with MF_CDN_BASE pointing at the server)"
