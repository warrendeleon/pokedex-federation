import { NativeModules, Platform } from 'react-native';
import { ScriptManager } from '@callstack/repack/client';
import type { ModuleFederationRuntimePlugin } from '@module-federation/runtime';
import { registerPlugins, registerRemotes } from '@module-federation/runtime';

import { BUNDLED_VERSIONS, EMBEDDED_MANIFESTS } from './embedded-manifests';
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

function cdnManifestUrl(name: string, version: string): string {
  return `${PROD_CDN_BASE}/${Platform.OS}/${name}/${version}/mf-manifest.json`;
}

// --- MF runtime plugin: in bundled mode, intercept the manifest fetch and return the embedded
// JSON. The MF runtime asks for each remote's mf-manifest.json to learn its shared-dependency
// config; RN's fetch can't read file://, so we serve it from EMBEDDED_MANIFESTS. Matched by remote
// name so it works regardless of the version segment in the host bundle's baked-in URL. ---
const bundledFallbackPlugin: ModuleFederationRuntimePlugin = {
  name: 'pokedex-bundled-fallback',
  fetch(url: string) {
    if (status.mode !== 'bundled') return undefined;
    const remote = REMOTE_NAMES.find(
      n => url.includes(`/${n}/`) && url.endsWith('/mf-manifest.json'),
    );
    if (!remote) return undefined;
    const manifest = EMBEDDED_MANIFESTS[Platform.OS]?.[remote];
    if (!manifest) {
      console.warn(
        `[mf-fallback] no embedded manifest for ${Platform.OS}/${remote}`,
      );
      return undefined;
    }
    return Promise.resolve(
      new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
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
  async (scriptId, caller) => {
    if (status.mode === 'dev') return undefined;
    const remoteName = REMOTE_NAMES.includes(
      scriptId as (typeof REMOTE_NAMES)[number],
    )
      ? scriptId
      : caller && REMOTE_NAMES.includes(caller as (typeof REMOTE_NAMES)[number])
        ? caller
        : undefined;
    if (!remoteName) return undefined;
    const version =
      status.mode === 'cdn'
        ? status.versions[remoteName]
        : BUNDLED_VERSIONS[Platform.OS]?.[remoteName];
    if (!version) return undefined;
    const filename =
      scriptId === remoteName
        ? `${remoteName}.container.js.bundle`
        : `${scriptId}.chunk.bundle`;
    const relativePath = `${Platform.OS}/${remoteName}/${version}/${filename}`;
    if (status.mode === 'bundled') {
      if (!APP_PATH) return undefined;
      return {
        url: `file://${APP_PATH}/cdn/${relativePath}`,
        cache: true,
        absolute: true,
        verifyScriptSignature: VERIFY_SIGNATURE,
      };
    }
    return {
      url: `${PROD_CDN_BASE}/${relativePath}`,
      cache: true,
      verifyScriptSignature: VERIFY_SIGNATURE,
    };
  },
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
      `${PROD_CDN_BASE}/${Platform.OS}/version-map.json`,
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

  const cdnVersions = await fetchVersionMap();
  if (cdnVersions) {
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
// entry); CDN re-registers the resolved versioned URL. ---
export async function forceReloadRemote(remoteName: string): Promise<void> {
  if (!REMOTE_NAMES.includes(remoteName as (typeof REMOTE_NAMES)[number]))
    return;
  if (status.mode === 'cdn') {
    const version = status.versions[remoteName] ?? 'latest';
    try {
      registerRemotes(
        [{ name: remoteName, entry: cdnManifestUrl(remoteName, version) }],
        {
          force: true,
        },
      );
    } catch (e) {
      console.warn(
        `[forceReloadRemote] registerRemotes failed for ${remoteName}:`,
        e,
      );
    }
  }
  try {
    (globalThis as Record<string, unknown>)[remoteName] = undefined;
  } catch {
    // best-effort: clearing the federation global is non-critical, ignore failures
  }
  try {
    await ScriptManager.shared.invalidateScripts([remoteName]);
  } catch (e) {
    console.warn(
      `[forceReloadRemote] invalidateScripts failed for ${remoteName}:`,
      e,
    );
  }
}
