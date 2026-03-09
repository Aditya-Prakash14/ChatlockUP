// client/src/crypto/storage.js
// Secure local storage for keys – uses localStorage with a namespace.
// User-specific data (contacts, messages, sharedKeys, keypair) is scoped
// per username so it persists across logout/login cycles.

const PREFIX = 'chatlockup_';

// ── Helper: get the current username for scoped keys ──
function userPrefix() {
  const u = localStorage.getItem(`${PREFIX}username`);
  return u ? `${PREFIX}u_${u}_` : PREFIX;
}

// ── Keypair (scoped per user) ──
export function savePrivateKey(privateKeyB64) {
  localStorage.setItem(`${userPrefix()}privateKey`, privateKeyB64);
}
export function loadPrivateKey() {
  return localStorage.getItem(`${userPrefix()}privateKey`);
}

export function savePublicKey(publicKeyB64) {
  localStorage.setItem(`${userPrefix()}publicKey`, publicKeyB64);
}
export function loadPublicKey() {
  return localStorage.getItem(`${userPrefix()}publicKey`);
}

// ── Session (global, not per-user) ──
export function saveToken(token) {
  localStorage.setItem(`${PREFIX}token`, token);
}
export function loadToken() {
  return localStorage.getItem(`${PREFIX}token`);
}

export function saveUsername(username) {
  localStorage.setItem(`${PREFIX}username`, username);
}
export function loadUsername() {
  return localStorage.getItem(`${PREFIX}username`);
}

// ── Contacts (scoped per user) ──
export function saveContacts(contacts) {
  localStorage.setItem(`${userPrefix()}contacts`, JSON.stringify(contacts));
}
export function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(`${userPrefix()}contacts`)) || [];
  } catch {
    return [];
  }
}

// ── Messages (scoped per user) ──
export function saveMessages(messages) {
  localStorage.setItem(`${userPrefix()}messages`, JSON.stringify(messages));
}
export function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(`${userPrefix()}messages`)) || {};
  } catch {
    return {};
  }
}

// ── Shared keys (scoped per user) ──
export function saveSharedKeys(keys) {
  localStorage.setItem(`${userPrefix()}sharedKeys`, JSON.stringify(keys));
}
export function loadSharedKeys() {
  try {
    return JSON.parse(localStorage.getItem(`${userPrefix()}sharedKeys`)) || {};
  } catch {
    return {};
  }
}

// ── Logout: only clear session tokens, keep all user data ──
export function clearAll() {
  localStorage.removeItem(`${PREFIX}token`);
}
