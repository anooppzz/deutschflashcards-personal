import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import AiText from "./AiText";
import AiUnlock from "./AiUnlock";
import InboxWantsForm from "./InboxWantsForm";
import { askAi, followUps, modelLabel, formatUsd, MAX_QUESTIONS, PROVIDERS } from "../engine/ai";
import { readKeys } from "../engine/aiVault";
import { useVaultUnlocked } from "../engine/useVaultUnlocked";

// ✨ KI fragen: a chat about one card or grammar topic (engine/ai.js). Nothing
// is sent until the learner taps a question or sends their own; the answer
// streams in and can be stopped. Follow-up questions keep the conversation
// (up to MAX_QUESTIONS). Closing the chat stops a running answer. It sits
// below Modal (z 200), so the ⚙️ settings open on top of it. While the keys
// are locked (engine/aiVault.js), the unlock panel replaces the questions;
// the key is read from the vault for each request and never kept.
// "📌 Für die App vorschlagen" under an answer puts it into the 📥 KI-Eingang
// (engine/aiInbox.js) via onSaveToInbox.
// subject: { kind: "word" | "topic", title, question, context } (engine/lookup.js)

const ACCENT = "#e0833b";
const RED = "#e07b6f";
const chip = (primary) => ({
  padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left",
  border: primary ? "none" : "1px solid #3a5670", background: primary ? ACCENT : "transparent", color: primary ? "#0e1419" : "#8fb8d8",
});
const smallBtn = { padding: "4px 10px", borderRadius: 8, border: "1px solid #2c3a47", background: "#1a232b", color: "#9ab0c2", fontSize: 11, fontWeight: 700, cursor: "pointer" };

function AiChat({ settings, subject, onClose, onOpenSettings, onSaveToInbox }) {
  // turns: [{ q, label, a, streaming, cost, error, refused, aborted, truncated, fallback }]
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(null);
  const [saving, setSaving] = useState(null); // index of the answer whose 📌 form is open
  const abortRef = useRef(null);
  const endRef = useRef(null);
  const busy = turns.some((t) => t.streaming);
  const unlocked = useVaultUnlocked();
  const isClaude = settings.provider === PROVIDERS.CLAUDE;
  const asked = turns.length;
  const totalCost = turns.reduce((s, t) => s + (t.cost || 0), 0);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const lastLen = turns.length ? (turns[turns.length - 1].a || "").length : 0;
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [turns.length, lastLen]);

  const update = (i, patch) => setTurns((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  // send question q (shown as label) as turn number i; earlier answered turns are the history
  const run = async (i, q, label, history) => {
    let apiKey;
    try { apiKey = (await readKeys(settings.vault))[settings.provider]; } catch { return; } // locked: the unlock panel shows
    const controller = new AbortController();
    abortRef.current = controller;
    setTurns((ts) => [...ts.slice(0, i), { q, label, a: "", streaming: true }]);
    const messages = [
      ...history.filter((t) => t.a && !t.error && !t.refused).flatMap((t) => [{ role: "user", content: t.q }, { role: "assistant", content: t.a }]),
      { role: "user", content: q },
    ];
    const r = await askAi(settings, {
      apiKey,
      messages,
      signal: controller.signal,
      onText: (a) => update(i, { a }),
      onFallback: (model) => update(i, { fallback: model || "Ersatzmodell" }),
    });
    if (abortRef.current === controller) abortRef.current = null;
    update(i, {
      streaming: false,
      ...(r.text !== undefined ? { a: r.text } : {}),
      cost: r.cost || 0,
      error: r.error || null,
      refused: Boolean(r.refused),
      aborted: Boolean(r.aborted),
      truncated: Boolean(r.truncated),
    });
  };

  const send = (q, label) => {
    if (busy || asked >= MAX_QUESTIONS || !q.trim()) return;
    // the first question of a chat needs the card/topic, unless it is the full explanation
    const full = asked === 0 && q !== subject.question ? `${subject.context}\n\nMy question: ${q.trim()}` : q.trim();
    run(asked, full, label || q.trim(), turns);
    setDraft("");
  };
  const retry = (i) => run(i, turns[i].q, turns[i].label, turns.slice(0, i));
  const stop = () => abortRef.current?.abort();
  const copy = (i) => {
    try { navigator.clipboard.writeText(turns[i].a).then(() => setCopied(i), () => {}); } catch { /* no clipboard */ }
  };

  const explainLabel = subject.kind === "writing" ? "📝 Bewerte meinen Text" : `📖 Erklär mir „${subject.title}“`;
  const suggestions = asked === 0 ? [] : followUps(subject.kind);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ai-chat-title" style={{ position: "fixed", inset: 0, zIndex: 150, background: "#0e1419", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid #1f2a33" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ai-chat-title" style={{ margin: 0, fontSize: 16, color: "#f2f5f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✨ KI · {subject.title}</h2>
            <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 2 }}>
              {modelLabel(settings)} · {isClaude ? `bezahlt pro Frage${totalCost ? ` · bisher ≈ ${formatUsd(totalCost)}` : ""}` : "kostenlos (Tageslimit)"}
            </div>
          </div>
          <button type="button" onClick={onOpenSettings} aria-label="KI-Einstellungen" style={{ ...smallBtn, fontSize: 14, padding: "6px 9px" }}>⚙️</button>
          <button type="button" onClick={onClose} aria-label="Schließen" style={{ ...smallBtn, fontSize: 14, padding: "6px 10px" }}>✕</button>
        </div>

        {/* conversation */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
          {asked === 0 && (
            <div style={{ fontSize: 13, color: "#9ab0c2", lineHeight: 1.5, marginBottom: 12 }}>
              Frag die KI zu {subject.kind === "topic" ? "diesem Grammatik-Thema" : "dieser Karte"}. Es wird erst etwas gesendet, wenn du eine Frage abschickst.
              <div style={{ marginTop: 6, fontSize: 12, color: "#7d8d9c" }}>KI kann Fehler machen – im Zweifel im Buch oder bei 🔎 Nachschlagen prüfen.</div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: "14px 14px 4px 14px", background: "rgba(224,131,59,.15)", border: `1px solid ${ACCENT}`, color: "#f2f5f8", fontSize: 14, overflowWrap: "anywhere" }}>{t.label}</div>
              </div>
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: "14px 14px 14px 4px", background: "#161d24", border: "1px solid #2c3a47", color: "#cdd8e2", fontSize: 14, lineHeight: 1.55, overflowWrap: "anywhere" }}>
                {t.a ? <AiText text={t.a} /> : t.streaming ? <span style={{ color: "#7d8d9c" }}>… denkt nach</span> : null}
                {t.fallback && <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>↪ Ersatzmodell hat übernommen ({t.fallback})</div>}
                {t.refused && <div role="alert" style={{ color: RED, fontSize: 13, marginTop: 4 }}>Die KI hat diese Frage abgelehnt. Formuliere sie anders.</div>}
                {t.error && <div role="alert" style={{ color: RED, fontSize: 13 }}>⚠️ {t.error}</div>}
                {t.aborted && <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>■ gestoppt</div>}
                {t.truncated && <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>… Antwort war zu lang und wurde abgeschnitten.</div>}
                {!t.streaming && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                    {t.a && <button type="button" onClick={() => copy(i)} style={smallBtn}>{copied === i ? "✓ kopiert" : "📋 Kopieren"}</button>}
                    {(t.error || t.refused || t.aborted) && i === turns.length - 1 && <button type="button" onClick={() => retry(i)} style={smallBtn}>↻ Nochmal</button>}
                    {t.a && !t.error && !t.refused && (t.saved
                      ? <span style={{ fontSize: 11, color: "#5fa85f", fontWeight: 700 }}>📌 im KI-Eingang</span>
                      : saving !== i && <button type="button" onClick={() => setSaving(i)} style={smallBtn}>📌 Für die App vorschlagen</button>)}
                    {isClaude && t.cost > 0 && <span style={{ fontSize: 11, color: "#7d8d9c" }}>≈ {formatUsd(t.cost)}</span>}
                  </div>
                )}
                {saving === i && (
                  <InboxWantsForm
                    onCancel={() => setSaving(null)}
                    onSave={({ wants, note }) => {
                      onSaveToInbox({ title: subject.title, kind: subject.kind, question: t.label, answer: t.a, source: modelLabel(settings), wants, note });
                      update(i, { saved: true });
                      setSaving(null);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* questions */}
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #1f2a33" }}>
          {!unlocked && !busy ? (
            <AiUnlock vault={settings.vault} />
          ) : busy ? (
            <button type="button" onClick={stop} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${RED}`, background: "transparent", color: RED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>■ Stopp</button>
          ) : asked >= MAX_QUESTIONS ? (
            <button type="button" onClick={() => setTurns([])} style={{ ...chip(true), width: "100%", textAlign: "center" }}>Genug für dieses Gespräch – neu anfangen</button>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {asked === 0 && <button type="button" onClick={() => send(subject.question, explainLabel)} style={chip(true)}>{explainLabel}</button>}
                {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} style={chip(false)}>{s}</button>)}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(draft); }} style={{ display: "flex", gap: 6 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={asked === 0 ? "Eigene Frage …" : "Noch eine Frage …"}
                  aria-label="Eigene Frage"
                  maxLength={1000}
                  style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#161d24", color: "#f2f5f8", fontSize: 16 }}
                />
                <button type="submit" disabled={!draft.trim()} aria-label="Senden" style={{ padding: "0 14px", borderRadius: 10, border: "none", background: draft.trim() ? ACCENT : "#1a232b", color: draft.trim() ? "#0e1419" : "#7d8d9c", fontSize: 16, fontWeight: 800, cursor: draft.trim() ? "pointer" : "default" }}>➤</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

AiChat.propTypes = {
  settings: PropTypes.object.isRequired,
  subject: PropTypes.shape({
    kind: PropTypes.oneOf(["word", "topic", "writing"]).isRequired,
    title: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    context: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenSettings: PropTypes.func.isRequired,
  onSaveToInbox: PropTypes.func.isRequired,
};

export default AiChat;
