import { NativeModules, Platform } from 'react-native';
import { ScriptManager } from '@callstack/repack/client';
import type { ModuleFederationRuntimePlugin } from '@module-federation/runtime';
import { registerPlugins, registerRemotes } from '@module-federation/runtime';

import NativeEmbeddedRemotes from '../../specs/NativeEmbeddedRemotesModule';

import { BUNDLED_VERSIONS, EMBEDDED_MANIFESTS } from './embedded-manifests';
import {
  FAILURE_THRESHOLD,
  nextHealthOnFailure,
  nextHealthOnSuccess,
  type RemoteHealth,
  shouldRollBackVersion,
} from './remoteHealth';
import {
  embeddedManifestRemote,
  manifestRemote,
  resolveRemoteLocator,
} from './remoteLocator';
import { mmkvStorage, mmkvSync } from './storage';
import { verifyVersionMap } from './versionMapVerify';

// --- The federation's operational layer: how remotes are located + version-resolved per launch,
// and how the app degrades when the CDN is unreachable.
//
//   DEV      -> Re.Pack's dev servers (8082-8085). Built-in resolution; this resolver no-ops.
//   CDN      -> RELEASE builds probe a version-map at boot and load each remote's pinned version
//               from the CDN. Ship a remote = upload + one version-map line; no host rebuild.
//   BUNDLED  -> if the probe fails (offline / CDN down / first launch), boot the prod bundles the
//               embed build phase baked into the app, loaded from disk. Always a known-good set.
//
// Mode + resolved versions are exposed via getFederationStatus for the on-screen banner. ---

// --- The .app's directory, derived from RN's SourceCode module. In a release build scriptURL is
// file:///.../Host.app/main.jsbundle; strip the scheme + filename to get the .app dir, then build
// ABSOLUTE file:// URLs for the embedded remote bundles. Absolute (not NSBundle URLForResource)
// is required: URLForResource treats the ".bundle" suffix as a resource-bundle directory and
// silently misses flat files, which is what makes a bundled chunk load deliver nothing. ---
const SCRIPT_URL: string | undefined =
  NativeModules?.SourceCode?.scriptURL ||
  (
    NativeModules?.SourceCode as
      | { getConstants?: () => { scriptURL?: string } }
      | undefined
  )?.getConstants?.()?.scriptURL;
const APP_PATH =
  SCRIPT_URL && SCRIPT_URL.startsWith('file://')
    ? SCRIPT_URL.replace(/^file:\/\//, '').replace(/\/[^/]+\.jsbundle$/, '')
    : undefined;

// --- Root directory the resolver builds absolute file:// URLs for embedded remotes against. On
// iOS it is the .app dir derived from scriptURL above. On Android the embedded bundles live in the
// APK assets (not a real path), so the native EmbeddedRemotesModule extracts them to the files dir
// and initializeFederation sets this to that dir before any load fires. ---
let embeddedRoot: string | undefined = APP_PATH;

// --- Persistent script cache: PROD only. In PROD a fetched container survives restarts; in DEV
// it would mask remote edits (the dev server is the single source of truth each launch). ---
if (!__DEV__) {
  ScriptManager.shared.setStorage(mmkvStorage);
}

const REMOTE_NAMES = [
  'listApp',
  'partyApp',
  'regionsApp',
  'detailApp',
] as const;

declare const __MF_CDN_BASE__: string;
const PLACEHOLDER_CDN_BASE = 'https://cdn.example.com/mf';
const PROD_CDN_BASE =
  typeof __MF_CDN_BASE__ === 'string' ? __MF_CDN_BASE__ : PLACEHOLDER_CDN_BASE;
// CDN mode is normally release-only. But when a REAL CDN base is configured (MF_CDN_BASE set to
// something other than the placeholder), use CDN mode even in a dev build, so the green CDN path can
// be demoed against a local `build-cdn.mjs` server without making a release build.
const CDN_CONFIGURED = PROD_CDN_BASE !== PLACEHOLDER_CDN_BASE;
const PROBE_TIMEOUT_MS = 1500;

// --- This binary's app version (frozen at build time via DefinePlugin). Sent to the CDN on the
// boot probe so the CDN returns a version-map of micro-app versions this binary can run. An old
// app keeps getting its own compatible map until its users have moved on; the CDN retires a
// micro-app version only when no live app version's map references it. ---
declare const __APP_VERSION__: string;
const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

// --- Ed25519 public key (base64url, 32-byte raw) that verifies the version-map signature. The
// matching private key signs the map in tools/build-cdn.mjs and never leaves the build machine.
// Safe to embed: it can only verify, not sign. ---
const VERSION_MAP_PUBLIC_KEY = 'NJhE1HMqb1oJluNK8P99sDbfVNPNtyN2FTEnBbCJwEo';
// Persistent high-water release counter. A version-map whose seq is below this is a replay / forced
// downgrade and is rejected (see versionMapVerify). Survives restarts via MMKV.
const VERSION_MAP_SEQ_KEY = 'mf.versionMap.seq';

export type FederationMode = 'dev' | 'cdn' | 'bundled';

export interface FederationStatus {
  mode: FederationMode;
  /** Human-readable source label for the banner (dev servers / CDN base / embedded). */
  source: string;
  /** Resolved remote -> version map driving this launch. Empty in DEV. */
  versions: Record<string, string>;
}

let status: FederationStatus = {
  mode: 'dev',
  source: 'Re.Pack dev servers',
  versions: {},
};
let initialized = false;

// --- Per-remote bundled fallback. When a remote fails to load from the CDN this session (its
// version was retired, the network dropped, or the loaded code crashed at runtime), it is added
// here and from then on resolves to the embedded copy the app shipped with, which is always
// compatible with this binary. Other remotes keep loading from the CDN. In-memory on purpose: a
// transient failure self-heals on the next launch when the boot probe re-runs. ---
const bundledFallbackRemotes = new Set<string>();

function isKnownRemote(name: string): name is (typeof REMOTE_NAMES)[number] {
  return REMOTE_NAMES.includes(name as (typeof REMOTE_NAMES)[number]);
}

// --- Persistent per-remote health, for cross-launch auto-rollback (the pure decision logic lives
// in remoteHealth.ts). A remote that fails to load at a given CDN version FAILURE_THRESHOLD times in
// a row is skipped on the next boot: it loads its embedded copy instead of retrying the bad version,
// a silent rollback. A successful render of the remote clears the count, so only CONSECUTIVE
// failures roll back, and shipping a new version starts the count over. The count lives in MMKV so
// it survives the relaunch the rollback takes effect on; bundledFallbackRemotes above stays
// in-memory for the within-session drop. ---
const healthKey = (remote: string): string => `mf.health.${remote}`;

function readHealth(remote: string): RemoteHealth | null {
  const raw = mmkvSync.getString(healthKey(remote));
  if (!raw) return null;
  try {
    const h = JSON.parse(raw) as Partial<RemoteHealth>;
    return typeof h?.version === 'string' && typeof h?.fails === 'number'
      ? { version: h.version, fails: h.fails }
      : null;
  } catch {
    return null;
  }
}

// Record a failed load of a remote's current CDN version (called from the fallback path).
function recordRemoteFailure(remote: string): void {
  const version = status.versions[remote];
  if (!version) return;
  mmkvSync.set(
    healthKey(remote),
    JSON.stringify(nextHealthOnFailure(readHealth(remote), version)),
  );
}

// --- Called by FederatedTabBoundary once a remote's component has actually mounted: its current
// CDN version loaded cleanly, so clear the consecutive-failure count for it. ---
export function markRemoteLoadSuccess(remote: string): void {
  if (!isKnownRemote(remote)) return;
  const next = nextHealthOnSuccess(
    readHealth(remote),
    status.versions[remote],
    bundledFallbackRemotes.has(remote),
  );
  if (next) mmkvSync.set(healthKey(remote), JSON.stringify(next));
}

export function isRemoteBundledFallback(remoteName: string): boolean {
  return bundledFallbackRemotes.has(remoteName);
}

// --- Whether the FederatedTabBoundary should drop a failed remote to its embedded copy: only in
// CDN mode, only once per remote, and only if an embedded version actually exists. In bundled/dev
// mode there is nothing to fall back to (already embedded, or the dev server owns it). ---
export function shouldAttemptBundledFallback(remoteName: string): boolean {
  return (
    status.mode === 'cdn' &&
    !bundledFallbackRemotes.has(remoteName) &&
    !!BUNDLED_VERSIONS[Platform.OS]?.[remoteName]
  );
}

// --- Forget a remote's cached runtime so the next mount re-resolves + re-fetches it. Clears the MF
// container global and the script cache; best-effort, failures here are non-critical. ---
async function clearRemoteRuntime(remoteName: string): Promise<void> {
  try {
    (globalThis as Record<string, unknown>)[remoteName] = undefined;
  } catch {
    // clearing the federation global is best-effort
  }
  try {
    await ScriptManager.shared.invalidateScripts([remoteName]);
  } catch (e) {
    console.warn(`[federation] invalidateScripts failed for ${remoteName}:`, e);
  }
}

// --- Record that a remote must load from its embedded copy from now on. Returns true if this is
// the first time (so callers can avoid redundant work). No runtime clearing: used mid-load by the
// manifest fetch, before the remote's container/chunks have loaded. ---
function addBundledFallback(remoteName: string): boolean {
  if (!isKnownRemote(remoteName) || bundledFallbackRemotes.has(remoteName)) {
    return false;
  }
  bundledFallbackRemotes.add(remoteName);
  console.warn(
    `[federation] ${remoteName} failed from CDN; falling back to its embedded copy`,
  );
  // Persist the failure so FAILURE_THRESHOLD consecutive ones roll this version back on next boot.
  recordRemoteFailure(remoteName);
  return true;
}

// --- Drop one remote to its embedded copy after a CDN failure, then clear its runtime so the
// boundary's reload re-resolves it to the embedded files. Used by the boundary, where the remote
// was already loaded (a runtime crash) and its cached state must be forgotten before reloading. ---
export async function markRemoteBundledFallback(
  remoteName: string,
): Promise<void> {
  if (addBundledFallback(remoteName)) {
    await clearRemoteRuntime(remoteName);
  }
}

function cdnManifestUrl(name: string, version: string): string {
  return `${PROD_CDN_BASE}/${Platform.OS}/${name}/${version}/mf-manifest.json`;
}

function embeddedManifestResponse(remote: string): Response {
  const manifest = EMBEDDED_MANIFESTS[Platform.OS]?.[remote];
  if (!manifest) {
    console.warn(
      `[mf-fallback] no embedded manifest for ${Platform.OS}/${remote}`,
    );
  }
  return new Response(JSON.stringify(manifest ?? {}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Fetch a CDN remote's manifest, but never let it throw: try the network, and on ANY failure
// (retired version -> 404, network drop) drop the remote to its embedded copy and resolve with the
// embedded manifest instead. Always resolves to a Response, so the MF runtime's manifest loader
// can't surface an unhandled "failed to get manifest" that crashes a release build. ---
async function cdnManifestOrEmbedded(
  url: string,
  remote: string,
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return res;
  } catch {
    // network error -> fall through to the embedded copy
  }
  addBundledFallback(remote);
  return embeddedManifestResponse(remote);
}

// --- MF runtime plugin: own each remote's manifest fetch. The MF runtime asks for a remote's
// mf-manifest.json to learn its shared-dependency config, and if that fetch fails it throws an
// UNHANDLED "failed to get manifest" that, in a release build, crashes the app before any React
// error boundary can see it. So this is where the bundled fallback has to start:
//   - already disk-backed (bundled mode, or this remote fell back earlier) -> serve the embedded
//     manifest synchronously (RN's fetch can't read file://, so it comes from EMBEDDED_MANIFESTS).
//   - a healthy CDN remote -> hand off to cdnManifestOrEmbedded, which tries the network and falls
//     back to the embedded manifest on failure. The chunk loads that follow resolve to the embedded
//     files (see resolver). Returns undefined to defer for anything that isn't a known manifest. ---
const bundledFallbackPlugin: ModuleFederationRuntimePlugin = {
  name: 'pokedex-bundled-fallback',
  fetch(url: string) {
    const embedded = embeddedManifestRemote(
      url,
      REMOTE_NAMES,
      status.mode,
      bundledFallbackRemotes,
    );
    if (embedded) return Promise.resolve(embeddedManifestResponse(embedded));

    if (status.mode !== 'cdn') return undefined;
    const remote = manifestRemote(url, REMOTE_NAMES);
    if (!remote) return undefined;
    return cdnManifestOrEmbedded(url, remote);
  },
};
registerPlugins([bundledFallbackPlugin]);

// --- ScriptManager resolver for the prod paths (CDN + bundled offline). Priority 100 so it runs
// before Re.Pack's built-in per-remote resolver. It maps each script (the remote container or a
// chunk) to its URL and attaches the code-signature verification mode:
//   - bundled -> an ABSOLUTE file:// URL into the .app's cdn/<platform>/<remote>/<version>/ tree.
//   - cdn     -> the same relative path under the CDN base, fetched over HTTP.
// verifyScriptSignature is 'strict' on iOS and Android: build-cdn.mjs signs every remote chunk
// with Re.Pack's CodeSigningPlugin (RS256 JWT of the chunk hash) and the public key is embedded in
// the native app (iOS Info.plist RepackPublicKey, Android res/values/strings.xml RepackPublicKey);
// the native ScriptManager rejects a tampered or swapped bundle before executing it. Any other
// platform has no signing tooling, so it falls back to 'off'. DEV returns undefined before this is
// reached: Metro serves unsigned bundles and Re.Pack's dev resolver handles them. ---
const SIGNED_PLATFORMS = ['ios', 'android'];
const VERIFY_SIGNATURE: 'strict' | 'off' = SIGNED_PLATFORMS.includes(
  Platform.OS,
)
  ? 'strict'
  : 'off';

ScriptManager.shared.addResolver(
  async (scriptId, caller) =>
    resolveRemoteLocator({
      scriptId,
      caller,
      remoteNames: REMOTE_NAMES,
      mode: status.mode,
      cdnVersions: status.versions,
      bundledVersions: BUNDLED_VERSIONS[Platform.OS] ?? {},
      fallbackRemotes: bundledFallbackRemotes,
      platform: Platform.OS,
      appPath: embeddedRoot,
      cdnBase: PROD_CDN_BASE,
      verify: VERIFY_SIGNATURE,
    }),
  { key: '__signed_resolver__', priority: 100 },
);

// --- Boot-time version-map probe. Doubles as the CDN reachability check AND the integrity gate: a
// 200 gives the signed version-map, which must pass an Ed25519 signature check and a monotonic
// release-counter (seq) check before its versions are trusted. Any failure (unreachable, bad
// signature, replayed/older seq) returns null -> bundled mode on the known-good embedded set. ---
async function fetchVersionMap(): Promise<Record<string, string> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(
      `${PROD_CDN_BASE}/${Platform.OS}/maps/${APP_VERSION}/version-map.json`,
      {
        signal: controller.signal,
        headers: { 'cache-control': 'no-cache' },
      },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    const highestSeenSeq = mmkvSync.getNumber(VERSION_MAP_SEQ_KEY) ?? 0;
    const result = verifyVersionMap(
      raw,
      VERSION_MAP_PUBLIC_KEY,
      highestSeenSeq,
    );
    if (!result.ok) {
      console.warn(
        `[federation] version-map rejected (${result.reason}); using embedded bundles`,
      );
      return null;
    }
    // Advance the high-water counter so a later replay of an older signed map is refused.
    if (result.map.seq > highestSeenSeq) {
      mmkvSync.set(VERSION_MAP_SEQ_KEY, result.map.seq);
    }
    return result.map.versions;
  } catch {
    return null;
  }
}

function registerCdnRemotes(versions: Record<string, string>): void {
  registerRemotes(
    REMOTE_NAMES.map(name => ({
      name,
      entry: cdnManifestUrl(name, versions[name] ?? 'latest'),
    })),
    { force: true },
  );
}

// --- Awaited by the federation gate in App.tsx before the navigator (and its React.lazy
// federated tabs) mounts, so the resolver/plugin + remote registrations are in place before the
// MF runtime fires its first request. ---
export async function initializeFederation(): Promise<{
  mode: FederationMode;
}> {
  if (initialized) return { mode: status.mode };
  initialized = true;

  if (__DEV__ && !CDN_CONFIGURED) {
    status = { mode: 'dev', source: 'Re.Pack dev servers', versions: {} };
    return { mode: status.mode };
  }

  // Android: extract the APK-embedded remotes to a real dir before any load can fire, so both the
  // offline (bundled) path and the per-remote backstop have a file:// root to resolve against. iOS
  // already has embeddedRoot from scriptURL. Best-effort: if it fails, embeddedRoot stays undefined
  // and the resolver simply can't serve embedded (same as having no fallback).
  if (Platform.OS === 'android' && NativeEmbeddedRemotes) {
    try {
      embeddedRoot = await NativeEmbeddedRemotes.prepare(APP_VERSION);
    } catch (e) {
      console.warn('[federation] embedded remote extraction failed:', e);
    }
  }

  const cdnVersions = await fetchVersionMap();
  if (cdnVersions) {
    // Auto-rollback: any remote whose pinned CDN version has failed FAILURE_THRESHOLD launches in a
    // row loads its embedded copy this launch instead of retrying the bad version. Added to the
    // fallback set before registration, so the manifest plugin + resolver serve it from disk.
    for (const name of REMOTE_NAMES) {
      const version = cdnVersions[name];
      if (
        version &&
        BUNDLED_VERSIONS[Platform.OS]?.[name] &&
        shouldRollBackVersion(readHealth(name), version)
      ) {
        bundledFallbackRemotes.add(name);
        console.warn(
          `[federation] rolling back ${name}: CDN version ${version} failed ${FAILURE_THRESHOLD} launches in a row, loading the embedded copy`,
        );
      }
    }
    registerCdnRemotes(cdnVersions);
    status = { mode: 'cdn', source: PROD_CDN_BASE, versions: cdnVersions };
  } else {
    // Bundled: leave the build-time remote registrations in place; the plugin serves their
    // manifests from EMBEDDED_MANIFESTS and the resolver maps container + chunks to the embedded
    // files. No re-registration needed.
    status = {
      mode: 'bundled',
      source: 'embedded (offline)',
      versions: BUNDLED_VERSIONS[Platform.OS] ?? {},
    };
  }
  return { mode: status.mode };
}

export function getFederationStatus(): FederationStatus {
  return status;
}

// --- Retry handler for FederatedTabBoundary. Forces every layer that caches remote state to
// forget the previous (failed) load: the MF runtime entry, the container global, the script
// cache. DEV + bundled don't re-register (Re.Pack's resolution / the bundled resolver own the
// entry). CDN re-registers the resolved versioned URL, EXCEPT for a remote that has fallen back to
// its embedded copy, where the manifest plugin owns the entry and re-registering the CDN URL would
// undo the fallback. ---
export async function forceReloadRemote(remoteName: string): Promise<void> {
  if (!isKnownRemote(remoteName)) return;
  if (status.mode === 'cdn' && !bundledFallbackRemotes.has(remoteName)) {
    const version = status.versions[remoteName] ?? 'latest';
    try {
      registerRemotes(
        [{ name: remoteName, entry: cdnManifestUrl(remoteName, version) }],
        { force: true },
      );
    } catch (e) {
      console.warn(
        `[forceReloadRemote] registerRemotes failed for ${remoteName}:`,
        e,
      );
    }
  }
  await clearRemoteRuntime(remoteName);
}
