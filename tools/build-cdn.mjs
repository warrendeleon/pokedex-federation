// --- Assembles a local stand-in for the production CDN. For each federated remote it runs the
// prod Module Federation build (container + mf-manifest.json + exposed/shared chunks) at a pinned
// version, copies the output into a single cdn-root/<platform>/<remote>/<version>/ tree, and
// writes the version-map the host probes at boot. Serve cdn-root with any static server (e.g.
// `npx http-server cdn-root -p 8000`) and point the host at it with MF_CDN_BASE=http://localhost:8000.
//
// This is the operational layer's "CDN" half: per-launch version resolution + health-gated
// loading run against real prod bundles, no cloud required. The embed phase bakes the same
// output into the app for the offline fallback. Prod chunks are code-signed (see the remote
// rspack configs); the host verifies the signature before executing CDN/offline-loaded code.
//
// Usage: node tools/build-cdn.mjs [platform]
//   no arg   -> builds ios + android (kept in lockstep for parity)
//   ios|android -> builds just that platform, leaving the other's cdn-root subtree intact

import { execSync } from 'node:child_process';
import { createPrivateKey, sign } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL_PLATFORMS = ['ios', 'android'];
const arg = process.argv[2];
const platforms = arg ? [arg] : ALL_PLATFORMS;

// --- Monotonic release counter signed into every version-map. The host refuses a map whose seq is
// below the highest it has seen, which blocks replay / forced-downgrade attacks. Bump it on every
// publish; to roll back deliberately, publish a HIGHER seq pointing at the older versions. ---
const RELEASE_SEQ = Number(process.env.MF_RELEASE_SEQ || 1);

// --- Ed25519 private key that signs the version-map. Gitignored and never shipped; only the public
// half is embedded in the host (src/shell/scriptManager.ts). Generate it once with
// tools/gen-signing-keys.mjs. Must stay in sync with versionMapVerify.versionMapSigningInput. ---
const vmKeyPath = join(repoRoot, 'code-signing', 'version-map-private.pem');
if (!existsSync(vmKeyPath)) {
  console.error(
    `\nMissing ${vmKeyPath}.\nRun: node tools/gen-signing-keys.mjs  (then embed the printed public keys)\n`
  );
  process.exit(1);
}
const vmPrivateKey = createPrivateKey(readFileSync(vmKeyPath));

// Deterministic signing input: remote names sorted, name@version joined, prefixed with seq.
// versionMapVerify.versionMapSigningInput rebuilds this byte-for-byte on the device.
function signVersionMap(seq, versions) {
  const canonical = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  const sig = sign(null, Buffer.from(`${seq}|${canonical}`, 'utf8'), vmPrivateKey);
  return { seq, versions, sig: sig.toString('base64') };
}

// The version each remote is published at for this build. Bump one to simulate a remote-only
// release; the host's version-map probe picks it up on the next launch with no host rebuild.
const REMOTES = {
  listApp: '1.0.0',
  partyApp: '1.0.0',
  regionsApp: '1.0.0',
  detailApp: '1.0.0',
};

const cdnRoot = join(repoRoot, 'cdn-root');

for (const platform of platforms) {
  // Wipe only this platform's subtree so a single-platform rebuild keeps the other intact.
  rmSync(join(cdnRoot, platform), { recursive: true, force: true });
  mkdirSync(join(cdnRoot, platform), { recursive: true });

  for (const [remote, version] of Object.entries(REMOTES)) {
    const appDir = join(repoRoot, 'apps', remote.replace(/App$/, ''));
    console.log(`\n=== building ${remote}@${version} (${platform}) ===`);
    execSync(`npm run bundle:${platform}:prod`, {
      cwd: appDir,
      stdio: 'inherit',
      env: { ...process.env, MF_REMOTE_VERSION: version },
    });
    const from = join(appDir, 'cdn', platform, remote, version);
    const to = join(cdnRoot, platform, remote, version);
    cpSync(from, to, { recursive: true });
    console.log(`copied -> ${to}`);
  }

  const versions = Object.fromEntries(Object.entries(REMOTES));
  const signedMap = signVersionMap(RELEASE_SEQ, versions);
  writeFileSync(
    join(cdnRoot, platform, 'version-map.json'),
    JSON.stringify(signedMap, null, 2) + '\n'
  );
  console.log(
    `\nversion-map.json (${platform}, seq ${RELEASE_SEQ}, signed):\n${JSON.stringify(versions, null, 2)}`
  );
}

// --- Regenerate src/shell/embedded-manifests.ts from EVERY platform present in cdn-root (not just
// the ones built this run), so a single-platform rebuild never drops the other platform's offline
// data. The offline (bundled) path serves each remote's mf-manifest.json to the MF runtime from
// EMBEDDED_MANIFESTS (so it reads the shared-dependency config without a network call), and
// BUNDLED_VERSIONS tells the resolver which version subdirectory the embed phase copied into the
// app, so it can build absolute file:// URLs. Both are platform-keyed to match the
// cdn/<platform>/<remote>/<version>/ layout. ---
const embeddedManifests = {};
const bundledVersions = {};
const presentPlatforms = existsSync(cdnRoot)
  ? readdirSync(cdnRoot, { withFileTypes: true })
      .filter(d => d.isDirectory() && ALL_PLATFORMS.includes(d.name))
      .map(d => d.name)
  : [];
for (const platform of presentPlatforms) {
  const { versions } = JSON.parse(
    readFileSync(join(cdnRoot, platform, 'version-map.json'), 'utf8')
  );
  embeddedManifests[platform] = {};
  bundledVersions[platform] = {};
  for (const [remote, version] of Object.entries(versions)) {
    embeddedManifests[platform][remote] = JSON.parse(
      readFileSync(join(cdnRoot, platform, remote, version, 'mf-manifest.json'), 'utf8')
    );
    bundledVersions[platform][remote] = version;
  }
}
const embeddedTs = `// AUTO-GENERATED by tools/build-cdn.mjs. Do not edit by hand.
//
// EMBEDDED_MANIFESTS: each remote's mf-manifest.json, served offline by the MF runtime plugin in
// scriptManager.ts when the CDN probe fails. BUNDLED_VERSIONS: which version subdirectory the
// embed build phase copied into the app, so the resolver builds the right file:// path.

export type EmbeddedManifest = Record<string, unknown>;

export const EMBEDDED_MANIFESTS: Record<string, Record<string, EmbeddedManifest>> = ${JSON.stringify(
  embeddedManifests,
  null,
  2
)};

export const BUNDLED_VERSIONS: Record<string, Record<string, string>> = ${JSON.stringify(
  bundledVersions,
  null,
  2
)};
`;
writeFileSync(join(repoRoot, 'apps', 'host', 'src', 'shell', 'embedded-manifests.ts'), embeddedTs);
console.log(
  `\nembedded manifests for [${presentPlatforms.join(', ')}] into host src (embedded-manifests.ts)`
);

console.log(`\nCDN assembled at ${cdnRoot}`);
console.log('Serve it with:  npx http-server cdn-root -p 8000 --cors');
console.log('Point the host at it:  MF_CDN_BASE=http://localhost:8000');
