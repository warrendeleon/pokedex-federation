import {ScriptManager} from '@callstack/repack/client';
import {Platform} from 'react-native';
import {registerRemotes} from '@module-federation/runtime';
import {mmkvStorage} from './storage';

// --- Re.Pack ScriptManager setup. In DEV, Re.Pack's built-in resolution plus the manifest
// URLs declared in rspack.config.mjs's `remotes` load each remote's container + chunks from
// its dev server automatically; no custom resolver is needed. The operational layer adds a
// custom resolver later, for the PROD bundled-offline fallback (file:// URLs), per-launch
// version resolution, and health-driven rollback.
//
// All this file does today: back the script cache with MMKV, expose the boot-time federation
// gate, and provide the retry path for FederatedTabBoundary. ---

ScriptManager.shared.setStorage(mmkvStorage);

const REMOTE_DEV_PORTS: Record<string, number> = {
  listApp: 8082,
  partyApp: 8083,
  regionsApp: 8084,
  detailApp: 8085,
};
const REMOTE_NAMES = Object.keys(REMOTE_DEV_PORTS);

declare const __MF_CDN_BASE__: string;
const PROD_CDN_BASE =
  typeof __MF_CDN_BASE__ === 'string' ? __MF_CDN_BASE__ : 'https://cdn.example.com/mf';

type Mode = 'cdn' | 'bundled';
let mode: Mode = 'cdn';
let initialized = false;

function manifestUrlForRemote(name: string): string {
  return `${PROD_CDN_BASE}/${Platform.OS}/${name}/mf-manifest.json`;
}

// --- Awaited by the federation gate in App.tsx before the navigator (and its React.lazy
// federated tabs) mounts. In DEV it resolves immediately to 'cdn' (load from dev servers). The
// boot-time version-map probe + health gating that decide CDN-vs-bundled in PROD are layered
// on with the operational step. ---
export async function initializeFederation(): Promise<{mode: Mode}> {
  if (initialized) return {mode};
  initialized = true;
  mode = 'cdn';
  return {mode};
}

export function getFederationMode(): Mode {
  return mode;
}

// --- Retry handler for FederatedTabBoundary. Forces every layer that caches remote state to
// forget the previous (failed) load: the MF runtime's remote entry, the container global, and
// the ScriptManager script cache. ---
export async function forceReloadRemote(remoteName: string): Promise<void> {
  if (__DEV__ && !REMOTE_NAMES.includes(remoteName)) return;
  try {
    registerRemotes([{name: remoteName, entry: manifestUrlForRemote(remoteName)}], {
      force: true,
    });
  } catch (e) {
    console.warn(`[forceReloadRemote] registerRemotes failed for ${remoteName}:`, e);
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
