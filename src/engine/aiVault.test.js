import { describe, it, expect, beforeEach } from "vitest";
import {
  createVault, unlockWithPassword, readKeys, writeKeys, changePassword, lockVault, isUnlocked,
  addBio, unlockWithBio, removeBio, keyHint, toB64, fromB64, IDLE_MS, VaultError,
} from "./aiVault";

const KEYS = { gemini: "AIzaSyTEST-gemini-9876", claude: "sk-ant-api03-secret-1234" };
const fast = { iter: 1000 }; // the app uses 600 000 rounds; tests stay quick

// a fake phone: one passkey whose PRF secret is fixed per (credential, salt)
const fakePhone = ({ prf = true, secretAtCreate = false } = {}) => {
  const secretFor = (salt) => Uint8Array.from(salt, (b, i) => (b * 7 + i) % 256);
  const calls = { create: 0, get: 0 };
  return {
    calls,
    credentials: {
      create: async ({ publicKey }) => {
        calls.create++;
        expect(publicKey.authenticatorSelection.userVerification).toBe("required");
        const salt = publicKey.extensions.prf.eval.first;
        return {
          rawId: new Uint8Array([1, 2, 3, 4]).buffer,
          getClientExtensionResults: () => {
            if (!prf) return {};
            return { prf: secretAtCreate ? { enabled: true, results: { first: secretFor(salt).buffer } } : { enabled: true } };
          },
        };
      },
      get: async ({ publicKey }) => {
        calls.get++;
        expect(publicKey.userVerification).toBe("required");
        expect([...new Uint8Array(publicKey.allowCredentials[0].id)]).toEqual([1, 2, 3, 4]);
        const salt = publicKey.extensions.prf.eval.first;
        return { getClientExtensionResults: () => (prf ? { prf: { results: { first: secretFor(salt).buffer } } } : {}) };
      },
    },
  };
};

beforeEach(() => lockVault());

describe("key vault", () => {
  it("stores nothing readable and unlocks with the password", async () => {
    const vault = await createVault(KEYS, "mein-passwort", fast);
    const stored = JSON.stringify(vault);
    expect(stored).not.toContain("secret-1234");
    expect(stored).not.toContain("gemini-9876");
    expect(vault.hints).toEqual({ gemini: "…9876", claude: "…1234" });
    expect(isUnlocked()).toBe(true); // creating unlocks
    expect(await readKeys(vault)).toEqual(KEYS);
    lockVault();
    expect(isUnlocked()).toBe(false);
    await expect(readKeys(vault)).rejects.toMatchObject({ code: "locked" });
    await expect(unlockWithPassword(vault, "falsch!!")).rejects.toMatchObject({ code: "wrong" });
    expect(isUnlocked()).toBe(false);
    await unlockWithPassword(vault, "mein-passwort");
    expect(await readKeys(vault)).toEqual(KEYS);
  });

  it("needs a password of at least 6 characters", async () => {
    await expect(createVault(KEYS, "12345", fast)).rejects.toBeInstanceOf(VaultError);
  });

  it("locks itself after the idle time, and each use extends it", async () => {
    const t0 = 1_000_000;
    const vault = await createVault(KEYS, "mein-passwort", { ...fast, now: t0 });
    await readKeys(vault, t0 + IDLE_MS - 1); // used just in time
    expect(isUnlocked(t0 + IDLE_MS + 10)).toBe(true);
    expect(isUnlocked(t0 + 2 * IDLE_MS + 10)).toBe(false);
  });

  it("replaces keys and changes the password while unlocked", async () => {
    let vault = await createVault(KEYS, "altes-pw", fast);
    vault = await writeKeys(vault, { ...KEYS, gemini: "" });
    expect(vault.hints.gemini).toBe(null);
    vault = await changePassword(vault, "neues-pw", fast);
    lockVault();
    await expect(unlockWithPassword(vault, "altes-pw")).rejects.toMatchObject({ code: "wrong" });
    await unlockWithPassword(vault, "neues-pw");
    expect((await readKeys(vault)).claude).toBe(KEYS.claude);
  });

  it("adds the fingerprint lock and unlocks with it", async () => {
    for (const secretAtCreate of [false, true]) {
      lockVault();
      const phone = fakePhone({ secretAtCreate });
      let vault = await createVault(KEYS, "mein-passwort", fast);
      vault = await addBio(vault, { credentials: phone.credentials });
      expect(vault.bio.credId).toBe(toB64(new Uint8Array([1, 2, 3, 4])));
      expect(phone.calls.get).toBe(secretAtCreate ? 0 : 1);
      lockVault();
      await unlockWithBio(vault, { credentials: phone.credentials });
      expect(await readKeys(vault)).toEqual(KEYS);
      // the password still works as the way back in
      lockVault();
      await unlockWithPassword(vault, "mein-passwort");
      expect(isUnlocked()).toBe(true);
      expect(removeBio(vault).bio).toBe(null);
    }
  });

  it("says so when the phone can't do the fingerprint key", async () => {
    const vault = await createVault(KEYS, "mein-passwort", fast);
    await expect(addBio(vault, { credentials: fakePhone({ prf: false }).credentials })).rejects.toMatchObject({ code: "noprf" });
    const cancelled = { create: async () => { throw Object.assign(new Error("x"), { name: "NotAllowedError" }); } };
    await expect(addBio(vault, { credentials: cancelled })).rejects.toMatchObject({ code: "cancelled" });
  });

  it("can't add a fingerprint or change keys while locked", async () => {
    const vault = await createVault(KEYS, "mein-passwort", fast);
    lockVault();
    await expect(addBio(vault, { credentials: fakePhone().credentials })).rejects.toMatchObject({ code: "locked" });
    await expect(writeKeys(vault, KEYS)).rejects.toMatchObject({ code: "locked" });
  });

  it("helpers", () => {
    expect(keyHint("")).toBe(null);
    expect(keyHint("abcdef")).toBe("…cdef");
    const bytes = Uint8Array.from([0, 250, 251, 252, 253, 254, 255]);
    expect([...fromB64(toB64(bytes))]).toEqual([...bytes]);
  });
});
