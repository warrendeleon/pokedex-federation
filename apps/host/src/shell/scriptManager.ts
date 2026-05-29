import {ScriptManager} from '@callstack/repack/client';
import {Platform} from 'react-native';
import {registerRemotes} from '@module-federation/runtime';
import {mmkvStorage} from './storage';

// --- The federation's operational layer: how remotes are located and version-resolved per
// launch, and how the app degrades when the CDN is unreachable.
//
//   DEV      -> Re.Pack's dev servers (8082-8085). Built-in resolution, nothing to configure.
//   CDN      -> RELEASE builds probe a version-map at boot and load each remote's pinned version
//               from the CDN. Shipping a remote = upload + one line in the version-map; no host
//               rebuild, no app-store round trip.
//   BUNDLED  -> if the version-map probe fails (offline, CDN down, first launch), fall back to the
//               prod bundles embedded in the app and resolved off the filesystem. The app always
//               boots from a known-good set.
//
// The mode + resolved versions are exposed via getFederationStatus for the on-screen banner. ---

// --- Persistent script cache: PROD only. In PROD a fetched container survives restarts so the
// app boots offline from the last-known-good bundle; in DEV it would mask remote edits (the dev
// server is the single source of truth, fetched fresh each launch). ---
if (!__DEV__) {
  ScriptManager.shared.setStorage(mmkvStorage);
}

const REMOTE_NAMES = ['listApp', 'partyApp', 'regionsApp', 'detailApp'] as const;

declare const __MF_CDN_BASE__: string;
const PROD_CDN_BASE =
  typeof __MF_CDN_BASE__ === 'string' ? __MF_CDN_BASE__ : 'https://cdn.example.com/mf';

export type FederationMode = 'dev' | 'cdn' | 'bundled';

export interface FederationStatus {
  mode: FederationMode;
  /** Human-readable source label for the banner (dev servers / CDN base / embedded). */
  source: string;
  /** Resolved remote -> version map driving this launch. Empty in DEV. */
  versions: Record<string, string>;
}

let status: FederationStatus = {mode: 'dev', source: 'metro dev servers', versions: {}};
let initialized = false;

function cdnManifestUrl(name: string, version: string): string {
  return `${PROD_CDN_BASE}/${Platform.OS}/${name}/${version}/mf-manifest.json`;
}

// --- Boot-time version-map probe. Returns the remote -> version map the CDN is currently
// serving, or null if it can't be reached (which trips the bundled fallback). ---
async function fetchVersionMap(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(`${PROD_CDN_BASE}/${Platform.OS}/version-map.json`, {
      headers: {'cache-control': 'no-cache'},
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, string>;
  } catch {
    return null;
  }
}

function registerCdnRemotes(versions: Record<string, string>): void {
  registerRemotes(
    REMOTE_NAMES.map(name => ({name, entry: cdnManifestUrl(name, versions[name] ?? 'latest')})),
    {force: true},
  );
}

// --- Bundled (offline) fallback (PARTIAL; CDN is the verified production path). The embed build
// phase copies each remote's prod container + chunks into the app's Resources, and
// tools/build-cdn.mjs embeds the remotes' manifests into the JS bundle. Two pieces are wired: ---
//
// STATUS: the container loads from the bundle and, with the embedded manifest, MF reads each
// remote's shared-dependency config so shared deps (react, react-native, nativewind, ...) resolve
// from the host's singletons. STILL BROKEN: a remote's NON-shared code-split chunk
// (nativewind/jsx-runtime) loads from file:// but fails webpack chunk-registration offline (the
// same chunk registers fine over HTTP), so a bundled launch still crashes with ChunkLoadError.
// Closing this needs eager-sharing the JSX runtime, or building remotes without code-splitting
// (which breaks singleton sharing), or a Re.Pack offline chunk-registration fix; none of these
// landed without risking the CDN/dev paths. Do NOT run a Release build offline until resolved. ---

// 1. A high-priority resolver maps every remote script (container + chunks) to its embedded
//    file:// copy by filename. The remote's runtime computes chunk URLs from publicPath "noop:///"
//    (a Re.Pack sentinel that forces ScriptManager resolution), so referenceUrl is noop:///<file>
//    and we rewrite it to file:///<file>; the native loader serves it from the app bundle.
let bundledResolverAdded = false;
function addBundledResolver(): void {
  if (bundledResolverAdded) return;
  bundledResolverAdded = true;
  ScriptManager.shared.addResolver(
    async (scriptId, _caller, referenceUrl) => {
      let filename: string | undefined;
      if (referenceUrl) {
        filename = referenceUrl.split('?')[0].split('/').pop() || undefined;
      } else if (REMOTE_NAMES.includes(scriptId as (typeof REMOTE_NAMES)[number])) {
        filename = `${scriptId}.container.js.bundle`;
      }
      if (!filename) return undefined;
      return {url: `file:///${filename}`, cache: false};
    },
    {key: '__bundled_fs__', priority: 100},
  );
}

// 2. The MF runtime fetches each remote's mf-manifest.json to learn its shared-dependency config.
//    RN's fetch can't read file://, so we serve the manifests (embedded in the JS bundle by
//    tools/build-cdn.mjs) from a sentinel scheme via a scoped fetch patch. With the manifest, MF
//    knows the remote shares nativewind/react/... and resolves them from the host's singletons
//    instead of loading the remote's own copies (which previously failed chunk-registration
//    offline). Everything that isn't a sentinel manifest URL passes through untouched.
const EMBEDDED_MANIFEST_PREFIX = 'embedded-manifest:///';
let embeddedFetchInstalled = false;
function installEmbeddedManifestFetch(): void {
  if (embeddedFetchInstalled) return;
  embeddedFetchInstalled = true;
  const original = globalThis.fetch;
  globalThis.fetch = function patchedFetch(input: RequestInfo, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith(EMBEDDED_MANIFEST_PREFIX)) {
      const name = url.slice(EMBEDDED_MANIFEST_PREFIX.length).split('/')[0];
      const manifest = (embeddedManifests as Record<string, unknown>)[name];
      if (manifest) {
        return Promise.resolve(
          new Response(JSON.stringify(manifest), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
          }),
        );
      }
    }
    return original.call(globalThis, input, init);
  } as typeof fetch;
}

function registerBundledRemotes(_versions: Record<string, string>): void {
  installEmbeddedManifestFetch();
  addBundledResolver();
  // Manifest entries (served offline by the fetch patch above) so MF gets the shared config; the
  // resolver then maps the container + chunks to their embedded files.
  registerRemotes(
    REMOTE_NAMES.map(name => ({
      name,
      entry: `${EMBEDDED_MANIFEST_PREFIX}${name}/mf-manifest.json`,
    })),
    {force: true},
  );
}

// --- The version-map shipped inside the app alongside the embedded bundles. The embed phase
// writes the real values; this default keeps a release build honest if the phase is skipped. ---
import embeddedVersionMap from './embeddedVersionMap.json';
// Remote manifests embedded by tools/build-cdn.mjs; served to the MF runtime offline (see the
// fetch patch above) so it gets each remote's shared-dependency config without a network call.
import embeddedManifests from './embeddedManifests.json';

// --- Awaited by the federation gate in App.tsx before the navigator (and its React.lazy
// federated tabs) mounts, so the resolver + remote registrations are in place before the MF
// runtime fires its first request. ---
export async function initializeFederation(): Promise<{mode: FederationMode}> {
  if (initialized) return {mode: status.mode};
  initialized = true;

  if (__DEV__) {
    status = {mode: 'dev', source: 'metro dev servers', versions: {}};
    return {mode: status.mode};
  }

  const cdnVersions = await fetchVersionMap();
  if (cdnVersions) {
    registerCdnRemotes(cdnVersions);
    status = {mode: 'cdn', source: PROD_CDN_BASE, versions: cdnVersions};
  } else {
    registerBundledRemotes(embeddedVersionMap);
    status = {mode: 'bundled', source: 'embedded (offline)', versions: embeddedVersionMap};
  }
  return {mode: status.mode};
}

export function getFederationStatus(): FederationStatus {
  return status;
}

// --- Retry handler for FederatedTabBoundary. Forces every layer that caches remote state to
// forget the previous (failed) load: the MF runtime's remote entry, the container global, and
// the ScriptManager script cache. ---
export async function forceReloadRemote(remoteName: string): Promise<void> {
  if (!REMOTE_NAMES.includes(remoteName as (typeof REMOTE_NAMES)[number])) return;
  // In DEV the remote entry comes from rspack's `remotes` (dev-server URLs) and Re.Pack's
  // built-in resolution owns it; re-registering a CDN URL would break the retry. Just clear the
  // caches below and let the dev server reload. CDN/bundled re-register their resolved entry.
  if (status.mode !== 'dev') {
    const version = status.versions[remoteName];
    const entry =
      status.mode === 'bundled'
        ? `${remoteName}/${version ?? '0.0.0'}/mf-manifest.json`
        : cdnManifestUrl(remoteName, version ?? 'latest');
    try {
      registerRemotes([{name: remoteName, entry}], {force: true});
    } catch (e) {
      console.warn(`[forceReloadRemote] registerRemotes failed for ${remoteName}:`, e);
    }
  }
  try {
    (globalThis as Record<string, unknown>)[remoteName] = undefined;
  } catch {}
  try {
    await ScriptManager.shared.invalidateScripts([remoteName]);
  } catch (e) {
    console.warn(`[forceReloadRemote] invalidateScripts failed for ${remoteName}:`, e);
  }
}
