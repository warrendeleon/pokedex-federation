// --- Pure resolution logic for the ScriptManager resolver and the bundled-manifest plugin, split
// out of scriptManager.ts so it can be unit-tested without the native ScriptManager side effects.
//
// A remote is loaded from the CDN unless either the whole app is in bundled mode (CDN unreachable
// at boot) OR that specific remote is in the per-remote fallback set (its CDN load failed this
// session, so we drop just it to the embedded copy the app shipped with). The embedded copy is
// always compatible with this binary, so falling back to it is always safe. ---

export type FederationMode = 'dev' | 'cdn' | 'bundled';
export type VerifyMode = 'strict' | 'off';

export interface RemoteLocator {
  url: string;
  cache: boolean;
  absolute?: boolean;
  verifyScriptSignature: VerifyMode;
}

export interface ResolveInput {
  scriptId: string;
  caller: string | undefined;
  remoteNames: readonly string[];
  mode: FederationMode;
  /** remote -> version for the current CDN launch. */
  cdnVersions: Record<string, string>;
  /** remote -> version the embed phase baked into the app. */
  bundledVersions: Record<string, string>;
  /** remotes whose CDN load failed this session and have been dropped to embedded. */
  fallbackRemotes: ReadonlySet<string>;
  platform: string;
  /** the .app directory for building embedded file:// URLs; undefined in a dev (Metro) build. */
  appPath: string | undefined;
  cdnBase: string;
  verify: VerifyMode;
}

function remoteFor(
  scriptId: string,
  caller: string | undefined,
  remoteNames: readonly string[],
): string | undefined {
  if (remoteNames.includes(scriptId)) return scriptId;
  if (caller && remoteNames.includes(caller)) return caller;
  return undefined;
}

// --- Map a script (a remote container or one of its chunks) to a URL + verification mode, or
// undefined to defer to Re.Pack's built-in resolution. ---
export function resolveRemoteLocator(
  input: ResolveInput,
): RemoteLocator | undefined {
  if (input.mode === 'dev') return undefined;
  const remoteName = remoteFor(input.scriptId, input.caller, input.remoteNames);
  if (!remoteName) return undefined;

  // Effective per-remote mode: bundled if the whole app fell back, or just this remote did.
  const useBundled =
    input.mode === 'bundled' || input.fallbackRemotes.has(remoteName);
  const version = useBundled
    ? input.bundledVersions[remoteName]
    : input.cdnVersions[remoteName];
  if (!version) return undefined;

  const filename =
    input.scriptId === remoteName
      ? `${remoteName}.container.js.bundle`
      : `${input.scriptId}.chunk.bundle`;
  const relativePath = `${input.platform}/${remoteName}/${version}/${filename}`;

  if (useBundled) {
    if (!input.appPath) return undefined;
    return {
      url: `file://${input.appPath}/cdn/${relativePath}`,
      cache: true,
      absolute: true,
      verifyScriptSignature: input.verify,
    };
  }
  return {
    url: `${input.cdnBase}/${relativePath}`,
    cache: true,
    verifyScriptSignature: input.verify,
  };
}

// --- The remote a manifest URL belongs to (or undefined if it isn't a known remote's manifest). ---
export function manifestRemote(
  url: string,
  remoteNames: readonly string[],
): string | undefined {
  return remoteNames.find(
    n => url.includes(`/${n}/`) && url.endsWith('/mf-manifest.json'),
  );
}

// --- For the MF runtime's manifest fetch: return the remote whose embedded mf-manifest.json should
// be served right now (bundled mode, or this remote already fell back), or undefined to let the
// fetch proceed (a healthy CDN remote, handled with a try-then-fall-back in scriptManager). ---
export function embeddedManifestRemote(
  url: string,
  remoteNames: readonly string[],
  mode: FederationMode,
  fallbackRemotes: ReadonlySet<string>,
): string | undefined {
  const remote = manifestRemote(url, remoteNames);
  if (!remote) return undefined;
  if (mode === 'bundled' || fallbackRemotes.has(remote)) return remote;
  return undefined;
}
