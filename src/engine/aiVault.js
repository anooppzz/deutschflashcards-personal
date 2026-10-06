// 🔒 The AI keys' safe (engine/ai.js). The API keys are stored encrypted, so
// someone holding the unlocked phone can neither read them nor use the AI:
// - a random data key (AES-GCM 256) encrypts the keys;
// - the data key is stored twice, encrypted ("wrapped"):
//   · with the learner's password (PBKDF2-SHA-256, 600 000 rounds) – always,
//     as the way back in if the fingerprint ever fails;
//   · optionally with the phone's fingerprint / screen lock: a passkey on this
//     phone with the WebAuthn PRF extension gives a secret only after the
//     phone checked the fingerprint (or PIN/pattern); HKDF turns it into a key.
// After unlocking, the data key lives in memory only (this module) and is
// forgotten after IDLE_MS without AI use, on "🔒 Sperren", or when the app is
// closed. A saved key is never shown again - only its last 4 characters.
//
// Stored vault (inside DEVICE_ONLY_KEYS.AI, never in the backup):
// { v: 1, data: { iv, ct }, pin: { salt, iter, iv, ct },
//   bio: { credId, salt, iv, ct } | null, hints: { gemini, claude } }
// (bytes as base64url; hints: "…a1b2" or null per provider)

export const PBKDF2_ROUNDS = 600000;
export const MIN_PASSWORD = 6;
export const IDLE_MS = 15 * 60 * 1000;

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const toB64 = (bytes) => {
  let s = "";
  new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export const fromB64 = (str) => {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export class VaultError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const aesKey = (raw) => subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
const seal = async (key, bytes) => {
  const iv = random(12);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: toB64(iv), ct: toB64(ct) };
};
const open = async (key, box) => new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct)));

const passwordKey = async (password, salt, iter) => {
  const base = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};
const prfKey = async (secret) => {
  const base = await subtle().importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: enc.encode("deutschflashcards ai vault v1") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};

export const keyHint = (key) => (key ? `…${key.slice(-4)}` : null);

// ---- the unlocked session (memory only) ----
let session = null; // { raw: Uint8Array, until: number }
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
export const onVaultChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const startSession = (raw, now) => { session = { raw, until: now + IDLE_MS }; notify(); };
export const lockVault = () => { if (session) { session.raw.fill(0); session = null; notify(); } };
export const isUnlocked = (now = Date.now()) => {
  if (session && now > session.until) lockVault();
  return Boolean(session);
};
const sessionRaw = (now = Date.now()) => {
  if (!isUnlocked(now)) throw new VaultError("locked", "Gesperrt.");
  session.until = now + IDLE_MS; // every use keeps it open a bit longer
  return session.raw;
};

const readData = async (vault, raw) => JSON.parse(dec.decode(await open(await aesKey(raw), vault.data)));
const hintsOf = (keys) => Object.fromEntries(Object.entries(keys).map(([p, k]) => [p, keyHint(k)]));

// ---- create, unlock, read, change ----

// New safe for keys ({ gemini, claude }); unlocks it right away.
export const createVault = async (keys, password, { iter = PBKDF2_ROUNDS, now = Date.now() } = {}) => {
  if ((password || "").length < MIN_PASSWORD) throw new VaultError("short", `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`);
  const raw = random(32);
  const salt = random(16);
  const vault = {
    v: 1,
    data: await seal(await aesKey(raw), enc.encode(JSON.stringify(keys))),
    pin: { salt: toB64(salt), iter, ...(await seal(await passwordKey(password, salt, iter), raw)) },
    bio: null,
    hints: hintsOf(keys),
  };
  startSession(raw, now);
  return vault;
};

export const unlockWithPassword = async (vault, password, now = Date.now()) => {
  let raw;
  try {
    raw = await open(await passwordKey(password, fromB64(vault.pin.salt), vault.pin.iter), vault.pin);
  } catch {
    throw new VaultError("wrong", "Falsches Passwort.");
  }
  startSession(raw, now);
};

// the plain keys, only while unlocked - never keep them in React state
export const readKeys = async (vault, now = Date.now()) => readData(vault, sessionRaw(now));

// replaces the keys (unlocked only); returns the new vault
export const writeKeys = async (vault, keys, now = Date.now()) => {
  const raw = sessionRaw(now);
  return { ...vault, data: await seal(await aesKey(raw), enc.encode(JSON.stringify(keys))), hints: hintsOf(keys) };
};

export const changePassword = async (vault, password, { iter = PBKDF2_ROUNDS, now = Date.now() } = {}) => {
  if ((password || "").length < MIN_PASSWORD) throw new VaultError("short", `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`);
  const raw = sessionRaw(now);
  const salt = random(16);
  return { ...vault, pin: { salt: toB64(salt), iter, ...(await seal(await passwordKey(password, salt, iter), raw)) } };
};

// ---- fingerprint / screen lock (WebAuthn passkey + PRF) ----

export const bioAvailable = async (pkc = globalThis.PublicKeyCredential) => {
  try {
    if (!pkc || !(await pkc.isUserVerifyingPlatformAuthenticatorAvailable())) return false;
    if (pkc.getClientCapabilities) {
      const caps = await pkc.getClientCapabilities();
      if (caps && caps["extension:prf"] === false) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const bioError = (e) => {
  if (e instanceof VaultError) return e;
  if (e?.name === "NotAllowedError") return new VaultError("cancelled", "Abgebrochen – kein Fingerabdruck bestätigt.");
  return new VaultError("bio", `Fingerabdruck ging nicht: ${e?.message || e}`);
};

const prfSecret = async (credentials, credId, salt) => {
  const a = await credentials.get({
    publicKey: {
      challenge: random(32),
      allowCredentials: [{ type: "public-key", id: credId }],
      userVerification: "required",
      timeout: 60000,
      extensions: { prf: { eval: { first: salt } } },
    },
  });
  const first = a?.getClientExtensionResults?.().prf?.results?.first;
  if (!first) throw new VaultError("noprf", "Dieses Handy gibt für den Fingerabdruck keinen Schlüssel heraus. Nutze das Passwort.");
  return new Uint8Array(first);
};

// Adds the fingerprint lock (unlocked only): makes a passkey on this phone
// and stores the data key wrapped with its PRF secret. Returns the new vault.
export const addBio = async (vault, { credentials = globalThis.navigator?.credentials, now = Date.now() } = {}) => {
  const raw = sessionRaw(now);
  const salt = random(32);
  try {
    const cred = await credentials.create({
      publicKey: {
        rp: { name: "Deutsch Flashcards" },
        user: { id: random(16), name: "KI-Schlüssel", displayName: "KI-Schlüssel (Deutsch Flashcards)" },
        challenge: random(32),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
        timeout: 60000,
        extensions: { prf: { eval: { first: salt } } },
      },
    });
    const ext = cred.getClientExtensionResults?.() || {};
    if (!ext.prf?.enabled) throw new VaultError("noprf", "Dieses Handy unterstützt den Fingerabdruck-Schlüssel nicht. Nutze das Passwort.");
    const credId = new Uint8Array(cred.rawId);
    // some phones hand out the secret at once, others only on the first use
    const secret = ext.prf.results?.first ? new Uint8Array(ext.prf.results.first) : await prfSecret(credentials, credId, salt);
    return { ...vault, bio: { credId: toB64(credId), salt: toB64(salt), ...(await seal(await prfKey(secret), raw)) } };
  } catch (e) {
    throw bioError(e);
  }
};

export const unlockWithBio = async (vault, { credentials = globalThis.navigator?.credentials, now = Date.now() } = {}) => {
  if (!vault.bio) throw new VaultError("nobio", "Kein Fingerabdruck eingerichtet.");
  let raw;
  try {
    const secret = await prfSecret(credentials, fromB64(vault.bio.credId), fromB64(vault.bio.salt));
    raw = await open(await prfKey(secret), vault.bio);
  } catch (e) {
    throw e?.name === "OperationError" ? new VaultError("bio", "Fingerabdruck-Schlüssel passt nicht. Nutze das Passwort.") : bioError(e);
  }
  startSession(raw, now);
};

export const removeBio = (vault) => ({ ...vault, bio: null });
