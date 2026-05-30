import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// @noble/ed25519 ships without a hash. Its async API reaches for crypto.subtle, which Hermes does
// not have, so we wire in @noble/hashes' pure-JS SHA-512 and use the synchronous verify path. This
// one-time module side effect is what makes verification run on-device. The @noble/hashes CHash is
// callable and returns the digest; the cast aligns its broad Uint8Array type with the exact shape
// ed.hashes expects.
ed.hashes.sha512 = sha512 as typeof ed.hashes.sha512;

// --- Version-map integrity: the boot-time version-map tells the host which version of each remote
// to load. Bundle signing protects each chunk's *content*, but not the *choice* of version: a
// compromised or replaying CDN could serve an old, validly-signed, vulnerable release. This layer
// signs the version-map with Ed25519 and gates it on a monotonic release counter (seq):
//
//   - bad / missing signature  -> reject (someone tampered with the map or doesn't hold the key)
//   - seq lower than the highest the device has seen -> reject (replay / forced downgrade)
//   - valid signature AND seq >= highest seen -> accept, and remember the new high-water seq
//
// Rolling back on purpose still works: publish a *new* map with a *higher* seq that points at the
// older bundle versions. The counter (not the version numbers) is what must move forward, so a
// deliberate rollback is accepted while a replayed old map is not.
//
// Verification runs in JS so it works identically on every platform. Ed25519 is pure-JS (no
// WebCrypto, which Hermes lacks) via @noble/ed25519. The signing key lives only on the build
// machine; the public key below is safe to embed. ---

export interface SignedVersionMap {
  seq: number;
  versions: Record<string, string>;
  /** Base64 Ed25519 signature over versionMapSigningInput(seq, versions). */
  sig: string;
}

export type VerifyResult =
  | { ok: true; map: SignedVersionMap }
  | { ok: false; reason: string };

// --- The exact bytes signed on the build side and re-derived here. Deterministic and independent
// of JSON key order: remote names sorted, each rendered name@version, joined, prefixed with the
// seq. tools/build-cdn.mjs must build the identical string. ---
export function versionMapSigningInput(
  seq: number,
  versions: Record<string, string>,
): Uint8Array {
  const canonical = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  return new TextEncoder().encode(`${seq}|${canonical}`);
}

function base64ToBytes(b64: string): Uint8Array {
  // atob exists in Hermes (RN polyfill) and in Node 18+ (test env). Accepts standard base64;
  // callers normalise base64url first.
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
  return base64ToBytes(padded);
}

// --- Validate a freshly fetched version-map. publicKeyB64url is the embedded Ed25519 verifying
// key (passed in, not hard-coded, so tests can supply an ephemeral key). highestSeenSeq is the
// device's high-water release counter from persistent storage. ---
export function verifyVersionMap(
  raw: unknown,
  publicKeyB64url: string,
  highestSeenSeq: number,
): VerifyResult {
  if (!raw || typeof raw !== 'object')
    return { ok: false, reason: 'not-an-object' };
  const { seq, versions, sig } = raw as Partial<SignedVersionMap>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
    return { ok: false, reason: 'bad-seq' };
  }
  if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
    return { ok: false, reason: 'bad-versions' };
  }
  if (typeof sig !== 'string' || sig.length === 0) {
    return { ok: false, reason: 'missing-sig' };
  }

  let valid = false;
  try {
    valid = ed.verify(
      base64ToBytes(sig),
      versionMapSigningInput(seq, versions as Record<string, string>),
      base64UrlToBytes(publicKeyB64url),
    );
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: 'bad-signature' };

  // Replay / downgrade gate: the counter must not move backwards. Equal is fine (re-fetch of the
  // current release); strictly lower is a stale or rolled-back map being replayed at us.
  if (seq < highestSeenSeq) return { ok: false, reason: 'stale-seq' };

  return {
    ok: true,
    map: { seq, versions: versions as Record<string, string>, sig },
  };
}
