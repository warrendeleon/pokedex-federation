// --- Generates the two signing keypairs the integrity layer needs. Neither private key is
// committed (both are gitignored), so a fresh clone runs this once before building the CDN:
//
//   RSA-2048      signs each remote chunk (Re.Pack CodeSigningPlugin, RS256). The host verifies it
//                 natively before executing CDN/offline code. Public key -> iOS Info.plist
//                 RepackPublicKey and Android res/values/strings.xml RepackPublicKey.
//   Ed25519       signs the version-map (which version of each remote to load). The host verifies
//                 it in JS and gates on the seq counter. Public key -> VERSION_MAP_PUBLIC_KEY in
//                 src/shell/scriptManager.ts.
//
// Existing keys are kept (regenerating would invalidate the embedded public keys); the script just
// re-prints the public halves so you can confirm/re-embed them. Usage: node tools/gen-signing-keys.mjs

import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = join(repoRoot, 'code-signing');
mkdirSync(keyDir, { recursive: true });

const rsaPrivPath = join(keyDir, 'private-key.pem');
const rsaPubPath = join(keyDir, 'public-key.pem');
const edPrivPath = join(keyDir, 'version-map-private.pem');

// --- RSA-2048 for chunk signing ---
if (!existsSync(rsaPrivPath)) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(rsaPrivPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
  writeFileSync(rsaPubPath, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('generated RSA-2048 chunk-signing keypair');
} else {
  console.log('RSA chunk-signing key already present (kept)');
}

// --- Ed25519 for version-map signing ---
if (!existsSync(edPrivPath)) {
  const { privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(edPrivPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  console.log('generated Ed25519 version-map-signing keypair');
} else {
  console.log('Ed25519 version-map key already present (kept)');
}

// --- Print the public halves to embed ---
const rsaPubPem = readFileSync(rsaPubPath, 'utf8').trim();
const rsaPubB64Line = rsaPubPem
  .split('\n')
  .filter(l => !l.includes('PUBLIC KEY'))
  .join('');
const edPub = createPublicKey(readFileSync(edPrivPath)).export({ format: 'jwk' });

console.log('\n--- embed these public keys ---\n');
console.log('iOS  Info.plist  RepackPublicKey (full PEM):\n' + rsaPubPem + '\n');
console.log(
  'Android  res/values/strings.xml  RepackPublicKey (single base64 line):\n' + rsaPubB64Line + '\n'
);
console.log(
  'Host  src/shell/scriptManager.ts  VERSION_MAP_PUBLIC_KEY (base64url):\n' + edPub.x + '\n'
);
