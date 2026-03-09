// client/src/crypto/keys.js
// X25519 key generation using libsodium
import _sodium from 'libsodium-wrappers';

let sodium;

async function ensureSodium() {
  if (!sodium) {
    await _sodium.ready;
    sodium = _sodium;
  }
  return sodium;
}

/**
 * Generate an X25519 keypair for ECDH key exchange.
 * Returns { publicKey, privateKey } as base64 strings.
 */
export async function generateKeyPair() {
  const s = await ensureSodium();
  const kp = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(kp.publicKey),
    privateKey: s.to_base64(kp.privateKey)
  };
}

/**
 * Derive a shared secret from our private key + their public key.
 */
export async function deriveSharedKey(myPrivateKeyB64, theirPublicKeyB64) {
  const s = await ensureSodium();
  const myPriv = s.from_base64(myPrivateKeyB64);
  const theirPub = s.from_base64(theirPublicKeyB64);

  // Use crypto_box_beforenm to compute the shared key (X25519 + HSalsa20)
  const sharedKey = s.crypto_box_beforenm(theirPub, myPriv);
  return s.to_base64(sharedKey);
}

export { ensureSodium };
