import { generateKeyPairSync, sign, type KeyObject } from 'crypto';

import {
  verifyVersionMap,
  versionMapSigningInput,
} from '../src/shell/versionMapVerify';

// verifyVersionMap is the integrity gate on the boot-time version-map: it checks an Ed25519
// signature and a monotonic release counter (seq) before the host trusts which remote versions to
// load. It's pure (crypto + the passed-in seen counter), so it's tested directly. An ephemeral
// keypair is generated per run, so the test never touches the gitignored production key. Signing
// here uses Node's native Ed25519; verification inside the module uses @noble/ed25519, mirroring
// the real split (build machine signs with Node, device verifies in JS).

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyB64url = (publicKey.export({ format: 'jwk' }) as { x: string })
  .x;

function makeSigned(
  seq: number,
  versions: Record<string, string>,
  key: KeyObject = privateKey,
) {
  const sig = sign(
    null,
    Buffer.from(versionMapSigningInput(seq, versions)),
    key,
  );
  return { seq, versions, sig: sig.toString('base64') };
}

const VERSIONS = {
  listApp: '1.0.0',
  partyApp: '1.0.0',
  regionsApp: '1.0.0',
  detailApp: '1.0.0',
};

describe('verifyVersionMap', () => {
  it('accepts a valid map whose seq is above the high-water mark', () => {
    const result = verifyVersionMap(
      makeSigned(5, VERSIONS),
      publicKeyB64url,
      3,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.seq).toBe(5);
      expect(result.map.versions).toEqual(VERSIONS);
    }
  });

  it('accepts a valid map whose seq equals the high-water mark (re-fetch)', () => {
    const result = verifyVersionMap(
      makeSigned(3, VERSIONS),
      publicKeyB64url,
      3,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a replayed older map (seq below the high-water mark)', () => {
    const result = verifyVersionMap(
      makeSigned(2, VERSIONS),
      publicKeyB64url,
      3,
    );
    expect(result).toEqual({ ok: false, reason: 'stale-seq' });
  });

  it('accepts a deliberate rollback: higher seq pointing at older versions', () => {
    // The operational answer to "we shipped a bad release": publish a new map with a higher seq
    // that pins the previous, good versions. The counter moves forward, so it is not a downgrade.
    const rolledBack = makeSigned(9, { ...VERSIONS, listApp: '0.9.0' });
    const result = verifyVersionMap(rolledBack, publicKeyB64url, 8);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.versions.listApp).toBe('0.9.0');
  });

  it('rejects a map whose versions were tampered with after signing', () => {
    const signed = makeSigned(5, VERSIONS);
    const tampered = { ...signed, versions: { ...VERSIONS, listApp: '9.9.9' } };
    const result = verifyVersionMap(tampered, publicKeyB64url, 0);
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rejects a map signed by the wrong key', () => {
    const attacker = generateKeyPairSync('ed25519').privateKey;
    const result = verifyVersionMap(
      makeSigned(5, VERSIONS, attacker),
      publicKeyB64url,
      0,
    );
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rejects malformed inputs', () => {
    expect(verifyVersionMap(null, publicKeyB64url, 0)).toEqual({
      ok: false,
      reason: 'not-an-object',
    });
    expect(
      verifyVersionMap({ versions: VERSIONS, sig: 'x' }, publicKeyB64url, 0),
    ).toEqual({ ok: false, reason: 'bad-seq' });
    expect(verifyVersionMap({ seq: 1, sig: 'x' }, publicKeyB64url, 0)).toEqual({
      ok: false,
      reason: 'bad-versions',
    });
    expect(
      verifyVersionMap({ seq: 1, versions: VERSIONS }, publicKeyB64url, 0),
    ).toEqual({ ok: false, reason: 'missing-sig' });
  });
});
