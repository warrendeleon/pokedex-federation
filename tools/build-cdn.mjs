// --- Assembles a local stand-in for the production CDN. It builds each federated remote's prod
// Module Federation output (container + mf-manifest.json + exposed/shared chunks) at every version
// referenced by an app-version map, lays them out at cdn-root/<platform>/<remote>/<version>/, and
// writes one SIGNED version-map per app version at cdn-root/<platform>/maps/<appVersion>/. Serve
// cdn-root with any static server (e.g. `npx http-server cdn-root -p 8000`) and point the host at
// it with MF_CDN_BASE=http://localhost:8000.
//
// Per-app-version maps are how an old store binary keeps working. Each host release has an app
// version; the host probes maps/<its app version>/version-map.json and only ever loads the
// micro-app versions listed there, versions it was built to run. You keep an old app version's map
// (and the micro-app versions it points at) until no user is left on that app version, then retire
// them, exactly like sunsetting an old API endpoint once the last caller is gone. Prod chunks are
// code-signed (see the remote rspack configs); the host verifies the signature before executing
// CDN/offline-loaded code.
//
// Usage: node tools/build-cdn.mjs [platform]
//   no arg   -> builds ios + android (kept in lockstep for parity)
//   ios|android -> builds just that platform, leaving the other's cdn-root subtree intact
// Env: MF_APP_VERSION selects which app version's set to bake as the embedded fallback (defaults to
//      the newest configured); MF_RELEASE_SEQ sets the signed release counter.

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

// --- App version -> the micro-app versions that app version is allowed to load. Each store release
// of the host gets an entry. An old app keeps its entry (and the CDN keeps those micro-app
// versions) until no user is on that app version. Here 2.0.0 ships a newer listApp (1.1.0) while
// 1.0.0 stays pinned to listApp 1.0.0, so an old app never gets handed the newer one. ---
const APP_VERSION_MAPS = {
  '1.0.0': {
    listApp: '1.0.0',
    partyApp: '1.0.0',
    regionsApp: '1.0.0',
    detailApp: '1.0.0',
  },
  '2.0.0': {
    listApp: '1.1.0',
    partyApp: '1.0.0',
    regionsApp: '1.0.0',
    detailApp: '1.0.0',
  },
};

// The app version THIS build bakes its embedded fallback for. Must match the MF_APP_VERSION the
// host binary is built with, so the offline set matches what that binary carries. Defaults to the
// newest configured. (String sort is fine for the demo's single-digit versions.)
const APP_VERSION = process.env.MF_APP_VERSION || Object.keys(APP_VERSION_MAPS).sort().at(-1);
if (!APP_VERSION_MAPS[APP_VERSION]) {
  console.error(
    `\nUnknown MF_APP_VERSION "${APP_VERSION}". Known: ${Object.keys(APP_VERSION_MAPS).join(', ')}\n`
  );
  process.exit(1);
}

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

// remote -> the set of versions any app-version map references, so each is built exactly once.
const remoteVersions = {};
for (const map of Object.values(APP_VERSION_MAPS)) {
  for (const [remote, version] of Object.entries(map)) {
    (remoteVersions[remote] ??= new Set()).add(version);
  }
}

const cdnRoot = join(repoRoot, 'cdn-root');

for (const platform of platforms) {
  // Wipe only this platform's subtree so a single-platform rebuild keeps the other intact.
  rmSync(join(cdnRoot, platform), { recursive: true, force: true });
  mkdirSync(join(cdnRoot, platform, 'maps'), { recursive: true });

  for (const [remote, versions] of Object.entries(remoteVersions)) {
    const appDir = join(repoRoot, 'apps', remote.replace(/App$/, ''));
    for (const version of [...versions].sort()) {
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
  }

  for (const [appVer, versions] of Object.entries(APP_VERSION_MAPS)) {
    const signedMap = signVersionMap(RELEASE_SEQ, versions);
    const dir = join(cdnRoot, platform, 'maps', appVer);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'version-map.json'), JSON.stringify(signedMap, null, 2) + '\n');
  }
  console.log(
    `\nsigned maps (${platform}, seq ${RELEASE_SEQ}) for app versions: ${Object.keys(APP_VERSION_MAPS).join(', ')}`
  );
}

// --- Regenerate src/shell/embedded-manifests.ts for the app version being built (APP_VERSION), so
// the offline fallback set matches what this binary carries. Read from every platform present in
// cdn-root so a single-platform rebuild never drops the other. EMBEDDED_MANIFESTS feeds the MF
// runtime plugin (it serves each remote's mf-manifest.json without a network call); BUNDLED_VERSIONS
// tells the resolver which version subdirectory to build file:// URLs against. ---
const embeddedManifests = {};
const bundledVersions = {};
const appMap = APP_VERSION_MAPS[APP_VERSION];
const presentPlatforms = existsSync(cdnRoot)
  ? readdirSync(cdnRoot, { withFileTypes: true })
      .filter(d => d.isDirectory() && ALL_PLATFORMS.includes(d.name))
      .map(d => d.name)
  : [];
for (const platform of presentPlatforms) {
  embeddedManifests[platform] = {};
  bundledVersions[platform] = {};
  for (const [remote, version] of Object.entries(appMap)) {
    const manifestPath = join(cdnRoot, platform, remote, version, 'mf-manifest.json');
    if (!existsSync(manifestPath)) continue;
    embeddedManifests[platform][remote] = JSON.parse(readFileSync(manifestPath, 'utf8'));
    bundledVersions[platform][remote] = version;
  }
}
const embeddedTs = `// AUTO-GENERATED by tools/build-cdn.mjs. Do not edit by hand.
//
// EMBEDDED_MANIFESTS: each remote's mf-manifest.json, served offline by the MF runtime plugin in
// scriptManager.ts when the CDN probe fails or a single remote falls back. BUNDLED_VERSIONS: which
// version subdirectory the embed build phase copied into the app, so the resolver builds the right
// file:// path. Both reflect the app version this build was made for (MF_APP_VERSION).

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
  `\nembedded fallback baked for app ${APP_VERSION} across [${presentPlatforms.join(', ')}]`
);

console.log(`\nCDN assembled at ${cdnRoot}`);
console.log('Serve it with:  npx http-server cdn-root -p 8000 --cors');
console.log('Point the host at it:  MF_CDN_BASE=http://localhost:8000');
