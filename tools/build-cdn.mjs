// --- Assembles a local stand-in for the production CDN. For each federated remote it runs the
// prod Module Federation build (container + mf-manifest.json + exposed/shared chunks) at a pinned
// version, copies the output into a single cdn-root/<platform>/<remote>/<version>/ tree, and
// writes the version-map the host probes at boot. Serve cdn-root with any static server (e.g.
// `npx http-server cdn-root -p 8000`) and point the host at it with MF_CDN_BASE=http://localhost:8000.
//
// This is the operational layer's "CDN" half: per-launch version resolution + health-gated
// loading run against real prod bundles, no cloud required. The embed phase bakes the same
// output into the app for the offline fallback.
//
// Usage: node tools/build-cdn.mjs [platform]   (platform defaults to ios)

import {execSync} from 'node:child_process';
import {cpSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2] ?? 'ios';

// The version each remote is published at for this build. Bump one to simulate a remote-only
// release; the host's version-map probe picks it up on the next launch with no host rebuild.
const REMOTES = {
  listApp: '1.0.0',
  partyApp: '1.0.0',
  regionsApp: '1.0.0',
  detailApp: '1.0.0',
};

const cdnRoot = join(repoRoot, 'cdn-root');
rmSync(cdnRoot, {recursive: true, force: true});
mkdirSync(join(cdnRoot, platform), {recursive: true});

for (const [remote, version] of Object.entries(REMOTES)) {
  const appDir = join(repoRoot, 'apps', remote.replace(/App$/, ''));
  console.log(`\n=== building ${remote}@${version} (${platform}) ===`);
  execSync(`npm run bundle:${platform}:prod`, {
    cwd: appDir,
    stdio: 'inherit',
    env: {...process.env, MF_REMOTE_VERSION: version},
  });
  const from = join(appDir, 'cdn', platform, remote, version);
  const to = join(cdnRoot, platform, remote, version);
  cpSync(from, to, {recursive: true});
  console.log(`copied -> ${to}`);
}

const versionMap = Object.fromEntries(
  Object.entries(REMOTES).map(([remote, version]) => [remote, version]),
);
writeFileSync(
  join(cdnRoot, platform, 'version-map.json'),
  JSON.stringify(versionMap, null, 2) + '\n',
);

// --- Embed each remote's manifest into the host source. The offline (bundled) path serves these
// to the MF runtime via a patched fetch so it gets the remotes' shared-dependency config without
// a network request, which is what lets the embedded bundles boot offline. ---
const embeddedManifests = {};
for (const [remote, version] of Object.entries(REMOTES)) {
  embeddedManifests[remote] = JSON.parse(
    readFileSync(join(cdnRoot, platform, remote, version, 'mf-manifest.json'), 'utf8'),
  );
}
writeFileSync(
  join(repoRoot, 'apps', 'host', 'src', 'shell', 'embeddedManifests.json'),
  JSON.stringify(embeddedManifests, null, 2) + '\n',
);
console.log(`embedded ${Object.keys(embeddedManifests).length} manifests into host src`);

console.log(`\nversion-map.json:\n${JSON.stringify(versionMap, null, 2)}`);
console.log(`\nCDN assembled at ${cdnRoot}`);
console.log('Serve it with:  npx http-server cdn-root -p 8000 --cors');
console.log('Build the host pointing at it:  MF_CDN_BASE=http://localhost:8000 (Release build)');
