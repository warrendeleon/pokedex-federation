#!/usr/bin/env bash
# --- Xcode "Run Script" build phase (after "Bundle React Native code and images"): copies the
# federated remotes' prod bundles into the .app so the host can boot them from disk when the CDN
# is unreachable. Run it for Release; for Debug you want the dev servers, so the phase is a no-op
# there (guarded below). Source is the local stand-in CDN produced by `node tools/build-cdn.mjs`. ---
set -euo pipefail

# Repo root is three levels up from this script: apps/host/scripts -> apps/host -> apps -> repo.
REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
SRC_CDN="$REPO_DIR/cdn-root/ios"

: "${BUILT_PRODUCTS_DIR:?BUILT_PRODUCTS_DIR not set; run from an Xcode build phase}"
: "${UNLOCALIZED_RESOURCES_FOLDER_PATH:?UNLOCALIZED_RESOURCES_FOLDER_PATH not set}"
APP_RES="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"

if [ ! -d "$SRC_CDN" ]; then
  echo "warning: $SRC_CDN does not exist; run 'node tools/build-cdn.mjs' before a release build"
  exit 0
fi

echo "[embed-remotes-ios] copying $SRC_CDN/ -> $APP_RES/cdn/ios/ (preserving <remote>/<version>/)"
# Preserve per-remote + per-version subdirectories. Copying flat would overwrite vendor chunks
# that different remotes share by filename, leaving one copy registered under the wrong webpack
# namespace; the resolver builds absolute file:// URLs that include both subdirs, so the layout
# must match. Only the .bundle files are needed (skip .map).
mkdir -p "$APP_RES/cdn/ios"
rsync -a \
  --include='*/' \
  --include='*.bundle' \
  --exclude='*' \
  "$SRC_CDN/" "$APP_RES/cdn/ios/"
echo "[embed-remotes-ios] done"
