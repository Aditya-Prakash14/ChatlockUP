// client/src/crypto/messaging.js
// Encrypt / Decrypt using libsodium secretbox (XSalsa20-Poly1305)
import { ensureSodium } from './keys';

/**
 * Encrypt a plaintext string with a shared key (base64).
 * Returns { ciphertext, iv } as base64 strings.
 */
export async function encryptMessage(plaintext, sharedKeyB64) {
  const s = await ensureSodium();
  const key = s.from_base64(sharedKeyB64);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ciphertext = s.crypto_secretbox_easy(plaintext, nonce, key);

  return {
    ciphertext: s.to_base64(ciphertext),
    iv: s.to_base64(nonce)
  };
}

/**
 * Decrypt ciphertext (base64) with shared key and iv (base64).
 * Returns the plaintext string.
 */
export async function decryptMessage(ciphertextB64, ivB64, sharedKeyB64) {
  const s = await ensureSodium();
  const key = s.from_base64(sharedKeyB64);
  const nonce = s.from_base64(ivB64);
  const ciphertext = s.from_base64(ciphertextB64);
  const plaintext = s.crypto_secretbox_open_easy(ciphertext, nonce, key);

  return s.to_string(plaintext);
}
