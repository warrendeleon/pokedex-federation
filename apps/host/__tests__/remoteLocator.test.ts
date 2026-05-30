import {
  embeddedManifestRemote,
  manifestRemote,
  resolveRemoteLocator,
  type ResolveInput,
} from '../src/shell/remoteLocator';

// resolveRemoteLocator + embeddedManifestRemote are the pure decision logic behind the ScriptManager
// resolver and the bundled-manifest plugin. The interesting behaviour is the per-remote fallback:
// in CDN mode a remote in the fallback set must resolve to its embedded copy while the others keep
// loading from the CDN. Tested directly so it doesn't ride on a device build.

const REMOTES = ['listApp', 'partyApp', 'regionsApp', 'detailApp'] as const;

function input(over: Partial<ResolveInput>): ResolveInput {
  return {
    scriptId: 'listApp',
    caller: undefined,
    remoteNames: REMOTES,
    mode: 'cdn',
    cdnVersions: { listApp: '1.1.0', partyApp: '1.0.0' },
    bundledVersions: { listApp: '1.0.0', partyApp: '1.0.0' },
    fallbackRemotes: new Set<string>(),
    platform: 'ios',
    appPath: '/var/app/Host.app',
    cdnBase: 'https://cdn.example.com/mf',
    verify: 'strict',
    ...over,
  };
}

describe('resolveRemoteLocator', () => {
  it('defers in dev mode', () => {
    expect(resolveRemoteLocator(input({ mode: 'dev' }))).toBeUndefined();
  });

  it('resolves a CDN container to the CDN url at the cdn version', () => {
    const loc = resolveRemoteLocator(input({ scriptId: 'listApp' }));
    expect(loc).toEqual({
      url: 'https://cdn.example.com/mf/ios/listApp/1.1.0/listApp.container.js.bundle',
      cache: true,
      verifyScriptSignature: 'strict',
    });
  });

  it('resolves a CDN chunk via its caller remote', () => {
    const loc = resolveRemoteLocator(
      input({ scriptId: '__federation_expose_ListStack', caller: 'listApp' }),
    );
    expect(loc?.url).toBe(
      'https://cdn.example.com/mf/ios/listApp/1.1.0/__federation_expose_ListStack.chunk.bundle',
    );
  });

  it('defers when the script maps to no known remote', () => {
    expect(
      resolveRemoteLocator(input({ scriptId: 'whatever', caller: 'nope' })),
    ).toBeUndefined();
  });

  it('drops a fallback remote to its EMBEDDED copy even in CDN mode', () => {
    const loc = resolveRemoteLocator(
      input({ scriptId: 'listApp', fallbackRemotes: new Set(['listApp']) }),
    );
    expect(loc).toEqual({
      // embedded version (1.0.0), file:// into the .app, not the CDN url
      url: 'file:///var/app/Host.app/cdn/ios/listApp/1.0.0/listApp.container.js.bundle',
      cache: true,
      absolute: true,
      verifyScriptSignature: 'strict',
    });
  });

  it('keeps a non-fallback remote on the CDN while another has fallen back', () => {
    const loc = resolveRemoteLocator(
      input({ scriptId: 'partyApp', fallbackRemotes: new Set(['listApp']) }),
    );
    expect(loc?.url).toBe(
      'https://cdn.example.com/mf/ios/partyApp/1.0.0/partyApp.container.js.bundle',
    );
  });

  it('defers a fallback remote when there is no embedded path (dev build)', () => {
    expect(
      resolveRemoteLocator(
        input({ fallbackRemotes: new Set(['listApp']), appPath: undefined }),
      ),
    ).toBeUndefined();
  });

  it('resolves everything to embedded in bundled mode', () => {
    const loc = resolveRemoteLocator(input({ mode: 'bundled' }));
    expect(loc?.url).toBe(
      'file:///var/app/Host.app/cdn/ios/listApp/1.0.0/listApp.container.js.bundle',
    );
  });

  it('defers when there is no version for the remote', () => {
    expect(
      resolveRemoteLocator(input({ cdnVersions: {}, scriptId: 'listApp' })),
    ).toBeUndefined();
  });
});

describe('manifestRemote', () => {
  it('identifies the remote a manifest url belongs to', () => {
    expect(
      manifestRemote(
        'https://cdn.example.com/mf/ios/partyApp/1.0.0/mf-manifest.json',
        REMOTES,
      ),
    ).toBe('partyApp');
  });

  it('returns undefined for a non-manifest url or unknown remote', () => {
    expect(
      manifestRemote(
        'https://cdn.example.com/mf/ios/listApp/1.0.0/x.bundle',
        REMOTES,
      ),
    ).toBeUndefined();
    expect(
      manifestRemote(
        'https://cdn.example.com/mf/ios/nope/1.0.0/mf-manifest.json',
        REMOTES,
      ),
    ).toBeUndefined();
  });
});

describe('embeddedManifestRemote', () => {
  const url = 'https://cdn.example.com/mf/ios/listApp/1.1.0/mf-manifest.json';

  it('serves embedded for any remote in bundled mode', () => {
    expect(embeddedManifestRemote(url, REMOTES, 'bundled', new Set())).toBe(
      'listApp',
    );
  });

  it('serves embedded for a fallback remote in CDN mode', () => {
    expect(
      embeddedManifestRemote(url, REMOTES, 'cdn', new Set(['listApp'])),
    ).toBe('listApp');
  });

  it('lets a healthy CDN remote fetch from the network', () => {
    expect(
      embeddedManifestRemote(url, REMOTES, 'cdn', new Set()),
    ).toBeUndefined();
  });

  it('ignores non-manifest urls', () => {
    expect(
      embeddedManifestRemote(
        'https://cdn.example.com/mf/ios/listApp/1.1.0/listApp.container.js.bundle',
        REMOTES,
        'bundled',
        new Set(),
      ),
    ).toBeUndefined();
  });
});
