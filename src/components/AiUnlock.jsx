import { useState } from "react";
import PropTypes from "prop-types";
import { unlockWithPassword, unlockWithBio } from "../engine/aiVault";

// 🔒 Unlock the AI keys (engine/aiVault.js): fingerprint / screen lock if it
// was set up, otherwise (or as the way back in) the password. Used in the
// KI settings and in the chat.

const ACCENT = "#e0833b";
const RED = "#e07b6f";

function AiUnlock({ vault, onUnlocked }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const attempt = async (fn) => {
    setBusy(true); setError(null);
    try {
      await fn();
      setPassword("");
      onUnlocked?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid #3a5670", background: "#121a21" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f2f5f8", marginBottom: 8 }}>🔒 KI-Schlüssel gesperrt</div>
      {vault.bio && (
        <button
          type="button"
          disabled={busy}
          onClick={() => attempt(() => unlockWithBio(vault))}
          style={{ width: "100%", padding: "11px 0", marginBottom: 8, borderRadius: 10, border: "none", background: ACCENT, color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >👆 Mit Fingerabdruck entsperren</button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (password) attempt(() => unlockWithPassword(vault, password)); }} style={{ display: "flex", gap: 6 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={vault.bio ? "oder Passwort" : "Passwort"}
          aria-label="Passwort"
          autoComplete="current-password"
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={busy || !password}
          style={{ padding: "0 12px", borderRadius: 10, border: vault.bio ? "1px solid #3a5670" : "none", background: vault.bio ? "transparent" : (password ? ACCENT : "#1a232b"), color: vault.bio ? "#8fb8d8" : (password ? "#0e1419" : "#7d8d9c"), fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >{busy ? "⏳" : "Entsperren"}</button>
      </form>
      {error && <div role="alert" style={{ marginTop: 6, fontSize: 12, color: RED }}>{error}</div>}
    </div>
  );
}

AiUnlock.propTypes = {
  vault: PropTypes.shape({ bio: PropTypes.object }).isRequired,
  onUnlocked: PropTypes.func,
};

export default AiUnlock;
