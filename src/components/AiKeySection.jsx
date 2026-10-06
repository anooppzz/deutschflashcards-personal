import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import AiUnlock from "./AiUnlock";
import { PROVIDERS, KEY_PAGES } from "../engine/ai";
import {
  createVault, readKeys, writeKeys, changePassword, addBio, removeBio, lockVault, bioAvailable, MIN_PASSWORD,
} from "../engine/aiVault";
import { useVaultUnlocked } from "../engine/useVaultUnlocked";

// 🔑 The API keys in the KI settings (engine/aiVault.js). A key is saved only
// inside the encrypted vault and never shown again (only "…a1b2"). Without a
// vault: enter key + password (+ fingerprint). Locked: unlock or delete.
// Unlocked: replace/remove a key, fingerprint on/off, new password, lock.
// The first version stored keys in clear (legacyKeys): they get locked away
// here with a new password.

const ACCENT = "#e0833b";
const RED = "#e07b6f";
const GREEN = "#5fa85f";
const NAMES = { [PROVIDERS.GEMINI]: "Gemini", [PROVIDERS.CLAUDE]: "Claude" };
const label = { display: "block", margin: "16px 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", textTransform: "uppercase" };
const note = { margin: "6px 0 0", fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 };
const input = { flex: 1, minWidth: 0, width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 16 };
const smallBtn = { padding: "8px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none" };
const mainBtn = (on) => ({ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: on ? ACCENT : "#1a232b", color: on ? "#0e1419" : "#7d8d9c", fontSize: 14, fontWeight: 700, cursor: on ? "pointer" : "default" });

const emptyKeys = () => ({ [PROVIDERS.GEMINI]: "", [PROVIDERS.CLAUDE]: "" });

function KeyInput({ value, onChange, provider, id }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={provider === PROVIDERS.CLAUDE ? "sk-ant-…" : "AIza…"}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        style={input}
      />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Eingabe verbergen" : "Eingabe zeigen"} style={smallBtn}>{show ? "🙈" : "👁"}</button>
    </div>
  );
}

// new password twice + "also fingerprint"
function PasswordFields({ pw, setPw, pw2, setPw2, bio, setBio, canBio }) {
  return (
    <>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={`Neues Passwort (min. ${MIN_PASSWORD} Zeichen)`} aria-label="Neues Passwort" autoComplete="new-password" style={{ ...input, marginTop: 8 }} />
      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Passwort wiederholen" aria-label="Passwort wiederholen" autoComplete="new-password" style={{ ...input, marginTop: 6 }} />
      {setBio && canBio && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13, color: "#cdd8e2", cursor: "pointer" }}>
          <input type="checkbox" checked={bio} onChange={(e) => setBio(e.target.checked)} />
          👆 Auch mit Fingerabdruck / Bildschirmsperre entsperren
        </label>
      )}
    </>
  );
}

function AiKeySection({ settings, onChange }) {
  const { provider, vault, legacyKeys } = settings;
  const unlocked = useVaultUnlocked() && Boolean(vault);
  const [canBio, setCanBio] = useState(false);
  const [key, setKey] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [bio, setBio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => { bioAvailable().then(setCanBio); }, []);
  useEffect(() => { setKey(""); setMsg(null); }, [provider]);

  const pwProblem = pw.length < MIN_PASSWORD ? `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.` : pw !== pw2 ? "Die Passwörter sind nicht gleich." : null;

  const run = async (fn) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };
  const save = (patch) => onChange({ ...settings, ...patch });

  // new vault from a fresh key or from the old clear-text keys
  const createWith = (keys) => run(async () => {
    if (pwProblem) throw new Error(pwProblem);
    let v = await createVault(keys, pw);
    let text = "🔒 Gespeichert und verschlüsselt.";
    if (bio && canBio) {
      try { v = await addBio(v); text += " Fingerabdruck ist eingerichtet."; } catch (e) { text += ` ${e.message}`; }
    }
    save({ vault: v, legacyKeys: null });
    setKey(""); setPw(""); setPw2("");
    setMsg({ ok: true, text });
  });

  const deleteAll = () => {
    if (!window.confirm("Alle KI-Schlüssel von diesem Handy löschen?")) return;
    lockVault();
    save({ vault: null, legacyKeys: null });
    setMsg({ ok: true, text: "Gelöscht." });
  };

  const help = (
    <a href={KEY_PAGES[provider]} target="_blank" rel="noopener noreferrer" style={{ ...smallBtn, color: "#8fb8d8" }}>{NAMES[provider]}-Schlüssel holen ↗</a>
  );
  const status = vault && (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, color: "#cdd8e2", marginBottom: 8 }}>
      {Object.values(PROVIDERS).map((p) => (
        <span key={p}>{NAMES[p]}: {vault.hints[p] ? <strong style={{ color: GREEN }}>{vault.hints[p]}</strong> : <span style={{ color: "#7d8d9c" }}>—</span>}</span>
      ))}
      <span style={{ color: "#7d8d9c" }}>{vault.bio ? "👆 + Passwort" : "Passwort"}</span>
    </div>
  );

  let body;
  if (!vault && legacyKeys) {
    body = (
      <>
        <div role="alert" style={{ padding: 10, borderRadius: 10, border: `1px solid ${ACCENT}`, color: "#f2f5f8", fontSize: 13, lineHeight: 1.5 }}>
          ⚠️ Dein Schlüssel ist noch <strong>ungeschützt</strong> gespeichert. Leg ein Passwort fest – dann wird er verschlüsselt und die KI geht erst nach dem Entsperren.
        </div>
        <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} bio={bio} setBio={setBio} canBio={canBio} />
        <button type="button" disabled={busy} onClick={() => createWith(legacyKeys)} style={{ ...mainBtn(!pwProblem), marginTop: 10 }}>{busy ? "⏳" : "🔒 Jetzt schützen"}</button>
      </>
    );
  } else if (!vault) {
    body = (
      <>
        <KeyInput id="ai-key" value={key} onChange={setKey} provider={provider} />
        <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} bio={bio} setBio={setBio} canBio={canBio} />
        <button type="button" disabled={busy || !key} onClick={() => createWith({ ...emptyKeys(), [provider]: key })} style={{ ...mainBtn(Boolean(key) && !pwProblem), marginTop: 10 }}>{busy ? "⏳" : "🔒 Sicher speichern"}</button>
        <div style={{ marginTop: 8 }}>{help}</div>
      </>
    );
  } else if (!unlocked) {
    body = (
      <>
        {status}
        <AiUnlock vault={vault} />
        <p style={note}>Passwort vergessen? Lösch die Schlüssel und gib sie neu ein – du findest sie in deinem Konto bei Google / Anthropic.</p>
      </>
    );
  } else {
    const has = Boolean(vault.hints[provider]);
    body = (
      <>
        {status}
        <div style={{ fontSize: 12, color: "#9ab0c2", marginBottom: 6 }}>{has ? `${NAMES[provider]}-Schlüssel ersetzen:` : `${NAMES[provider]}-Schlüssel hinzufügen:`}</div>
        <KeyInput id="ai-key" value={key} onChange={setKey} provider={provider} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" disabled={busy || !key} onClick={() => run(async () => {
            const keys = await readKeys(vault);
            save({ vault: await writeKeys(vault, { ...keys, [provider]: key }) });
            setKey(""); setMsg({ ok: true, text: "🔒 Gespeichert." });
          })} style={{ ...smallBtn, ...(key ? { background: ACCENT, color: "#0e1419", border: "none" } : {}) }}>🔒 Speichern</button>
          {has && (
            <button type="button" disabled={busy} onClick={() => run(async () => {
              if (!window.confirm(`${NAMES[provider]}-Schlüssel entfernen?`)) return;
              const keys = await readKeys(vault);
              save({ vault: await writeKeys(vault, { ...keys, [provider]: "" }) });
            })} style={{ ...smallBtn, color: RED }}>Entfernen</button>
          )}
          {help}
        </div>

        <span style={label}>Schutz</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {vault.bio ? (
            <button type="button" disabled={busy} onClick={() => { save({ vault: removeBio(vault) }); setMsg({ ok: true, text: "Fingerabdruck entfernt. Den Passkey „KI-Schlüssel“ kannst du in der Passwortverwaltung des Handys löschen." }); }} style={smallBtn}>👆 Fingerabdruck entfernen</button>
          ) : canBio && (
            <button type="button" disabled={busy} onClick={() => run(async () => { save({ vault: await addBio(vault) }); setMsg({ ok: true, text: "👆 Fingerabdruck ist eingerichtet." }); })} style={smallBtn}>👆 Fingerabdruck einrichten</button>
          )}
          <button type="button" onClick={() => setPwOpen((o) => !o)} aria-expanded={pwOpen} style={smallBtn}>Passwort ändern</button>
          <button type="button" onClick={lockVault} style={smallBtn}>🔒 Jetzt sperren</button>
        </div>
        {pwOpen && (
          <>
            <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} />
            <button type="button" disabled={busy} onClick={() => run(async () => {
              if (pwProblem) throw new Error(pwProblem);
              save({ vault: await changePassword(vault, pw) });
              setPw(""); setPw2(""); setPwOpen(false); setMsg({ ok: true, text: "Passwort geändert." });
            })} style={{ ...mainBtn(!pwProblem), marginTop: 8 }}>{busy ? "⏳" : "Neues Passwort speichern"}</button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <label htmlFor="ai-key" style={label}>API-Schlüssel</label>
      {body}
      {msg && <div role={msg.ok ? "status" : "alert"} style={{ marginTop: 8, fontSize: 12, color: msg.ok ? GREEN : RED }}>{msg.text}</div>}
      {(vault || legacyKeys) && (
        <button type="button" onClick={deleteAll} style={{ ...smallBtn, marginTop: 10, color: RED }}>🗑 Alle Schlüssel löschen</button>
      )}
      <ul style={{ ...note, paddingLeft: 18, marginTop: 12 }}>
        <li>Der Schlüssel wird <strong>verschlüsselt</strong> und nur auf diesem Handy gespeichert – nicht im Code, nicht in der Sicherungsdatei. Nach dem Speichern zeigt die App nur noch die letzten 4 Zeichen.</li>
        <li>Die KI geht erst nach dem Entsperren (Fingerabdruck oder Passwort). Nach 15 Minuten ohne KI sperrt sie sich wieder, ebenso beim Schließen der App.</li>
        <li>Nimm ein Passwort, das du sonst nirgends benutzt. Je länger, desto sicherer.</li>
        <li>Die Fragen gehen direkt von deinem Handy an Google bzw. Anthropic – ohne Server dazwischen.</li>
        {provider === PROVIDERS.CLAUDE && <li>Lade nur kleine Beträge auf und stell in der Anthropic Console ein Ausgabenlimit ein.</li>}
      </ul>
    </>
  );
}

KeyInput.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, provider: PropTypes.string.isRequired, id: PropTypes.string };
PasswordFields.propTypes = {
  pw: PropTypes.string.isRequired, setPw: PropTypes.func.isRequired, pw2: PropTypes.string.isRequired, setPw2: PropTypes.func.isRequired,
  bio: PropTypes.bool, setBio: PropTypes.func, canBio: PropTypes.bool,
};
AiKeySection.propTypes = {
  settings: PropTypes.shape({ provider: PropTypes.string.isRequired, vault: PropTypes.object, legacyKeys: PropTypes.object }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default AiKeySection;
