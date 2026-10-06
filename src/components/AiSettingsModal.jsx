import { useState } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import {
  PROVIDERS, CLAUDE_MODELS, GEMINI_MODELS, KEY_PAGES, typicalCost, formatUsd,
} from "../engine/ai";

// 🤖 KI-Assistent settings (engine/ai.js): the on/off switch (off by
// default), provider, model and the learner's own API key. Every change is
// saved at once (onChange); the key only ever goes into this phone's storage.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const label = { display: "block", margin: "16px 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", textTransform: "uppercase" };
const note = { margin: "6px 0 0", fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 };
const option = (on) => ({
  display: "flex", width: "100%", boxSizing: "border-box", gap: 10, alignItems: "flex-start", textAlign: "left", font: "inherit",
  padding: "10px 12px", marginBottom: 6, borderRadius: 12, cursor: "pointer",
  border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.1)" : "#1a232b", color: "#f2f5f8",
});
const smallBtn = { padding: "8px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 12, fontWeight: 700, cursor: "pointer" };

const PROVIDER_INFO = {
  [PROVIDERS.GEMINI]: {
    title: "Gemini (Google)",
    price: "kostenlos",
    text: "Kostenlos mit Tageslimit. Google darf kostenlose Anfragen auswerten und zur Verbesserung nutzen – schreib keine persönlichen Daten in deine Fragen.",
  },
  [PROVIDERS.CLAUDE]: {
    title: "Claude (Anthropic)",
    price: "Prepaid",
    text: "Du zahlst pro Frage von deinem Guthaben (Prepaid). Anthropic trainiert standardmäßig nicht mit API-Anfragen.",
  },
};

function Radio({ on }) {
  return (
    <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, width: 16, height: 16, borderRadius: "50%", border: `2px solid ${on ? ACCENT : "#3a5670"}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />}
    </span>
  );
}

function AiSettingsModal({ settings, onChange, onClose }) {
  const [showKey, setShowKey] = useState(false);
  const { enabled, provider } = settings;
  const key = settings.keys[provider];
  const set = (patch) => onChange({ ...settings, ...patch });
  const setKey = (value) => onChange({ ...settings, keys: { ...settings.keys, [provider]: value.trim() } });
  const setModel = (id) => onChange({ ...settings, models: { ...settings.models, [provider]: id } });
  const models = provider === PROVIDERS.CLAUDE ? CLAUDE_MODELS : GEMINI_MODELS;

  return (
    <Modal title="🤖 KI-Assistent" onClose={onClose} primaryLabel="Fertig" onPrimary={onClose}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => set({ enabled: !enabled })}
        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${enabled ? GREEN : "#2c3a47"}`, background: enabled ? "rgba(95,168,95,.1)" : "#1a232b", color: "#f2f5f8", fontSize: 15, fontWeight: 700, cursor: "pointer", font: "inherit" }}
      >
        <span>KI-Assistent {enabled ? "an" : "aus"}</span>
        <span aria-hidden="true" style={{ position: "relative", width: 44, height: 24, borderRadius: 12, background: enabled ? GREEN : "#3a4752", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 3, left: enabled ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#f2f5f8", transition: "left .2s" }} />
        </span>
      </button>
      <p style={note}>
        {enabled
          ? "Unter Karten und Grammatik-Themen erscheint „✨ KI fragen“. Es wird nur etwas gesendet, wenn du eine Frage abschickst."
          : "Aus: die App schickt nichts an eine KI. „🤖 Frag Claude“ (öffnet claude.ai) und 🔎 Nachschlagen gehen immer."}
      </p>

      <span style={label}>Anbieter</span>
      {Object.values(PROVIDERS).map((p) => (
        <button key={p} type="button" role="radio" aria-checked={provider === p} onClick={() => { set({ provider: p }); setShowKey(false); }} style={option(provider === p)}>
          <Radio on={provider === p} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, fontWeight: 700 }}>
              {PROVIDER_INFO[p].title}
              <span style={{ fontSize: 11, color: p === PROVIDERS.GEMINI ? GREEN : ACCENT, whiteSpace: "nowrap" }}>{PROVIDER_INFO[p].price}</span>
            </span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "#9ab0c2", lineHeight: 1.45 }}>{PROVIDER_INFO[p].text}</span>
          </span>
        </button>
      ))}

      <span style={label}>Modell</span>
      {models.map((m) => {
        const on = settings.models[provider] === m.id;
        return (
          <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setModel(m.id)} style={option(on)}>
            <Radio on={on} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, fontWeight: 700 }}>
                {m.label}
                {provider === PROVIDERS.CLAUDE && <span style={{ fontSize: 11, color: ACCENT, whiteSpace: "nowrap" }}>≈ {formatUsd(typicalCost(m))} / Frage</span>}
              </span>
              <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "#9ab0c2" }}>
                {m.note}{provider === PROVIDERS.CLAUDE && ` · $${m.in} / $${m.out} pro Mio. Tokens (rein / raus)`}
              </span>
            </span>
          </button>
        );
      })}
      {provider === PROVIDERS.CLAUDE && (
        <p style={note}>Bei Opus und Sonnet ist der Ersatz-Modus von Anthropic an: ist das Modell überlastet oder lehnt ab, antwortet automatisch ein Ersatzmodell.</p>
      )}

      <label htmlFor="ai-key" style={label}>Dein API-Schlüssel ({PROVIDER_INFO[provider].title})</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          id="ai-key"
          type={showKey ? "text" : "password"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={provider === PROVIDERS.CLAUDE ? "sk-ant-…" : "AIza…"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 14 }}
        />
        <button type="button" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? "Schlüssel verbergen" : "Schlüssel zeigen"} style={smallBtn}>{showKey ? "🙈" : "👁"}</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <a href={KEY_PAGES[provider]} target="_blank" rel="noopener noreferrer" style={{ ...smallBtn, textDecoration: "none", color: "#8fb8d8" }}>Schlüssel holen ↗</a>
        {key && (
          <button type="button" onClick={() => { if (window.confirm("Schlüssel von diesem Handy löschen?")) setKey(""); }} style={{ ...smallBtn, color: "#e07b6f" }}>🗑 Schlüssel löschen</button>
        )}
      </div>
      <ul style={{ ...note, paddingLeft: 18, marginTop: 12 }}>
        <li>Der Schlüssel bleibt <strong>nur auf diesem Handy</strong> – nicht im Code, nicht in der Sicherungsdatei. Auf einem neuen Handy gibst du ihn neu ein.</li>
        <li>Die Fragen gehen direkt von deinem Handy an {PROVIDER_INFO[provider].title} – ohne Server dazwischen.</li>
        {provider === PROVIDERS.CLAUDE && <li>Lade nur kleine Beträge auf und stell in der Anthropic Console ein Ausgabenlimit ein.</li>}
        <li>Gibst du das Handy weiter: Schlüssel löschen.</li>
      </ul>
    </Modal>
  );
}

Radio.propTypes = { on: PropTypes.bool };

AiSettingsModal.propTypes = {
  settings: PropTypes.shape({
    enabled: PropTypes.bool.isRequired,
    provider: PropTypes.string.isRequired,
    models: PropTypes.object.isRequired,
    keys: PropTypes.object.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AiSettingsModal;
