import { useState } from "react";
import PropTypes from "prop-types";
import { WANTS } from "../engine/aiInbox";

// 📌 What should go into the app from this answer (engine/aiInbox.js WANTS)
// + an optional note. Used under a chat answer and in "＋ Text einfügen".
// children: extra fields above (title, pasted text …); canSave: they are filled.

const ACCENT = "#e0833b";
const chip = (on) => ({
  padding: "6px 10px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${on ? ACCENT : "#3a5670"}`, background: on ? "rgba(224,131,59,.15)" : "transparent", color: on ? ACCENT : "#8fb8d8",
});

function InboxWantsForm({ onSave, onCancel, children, canSave = true, saveLabel = "📌 In den KI-Eingang" }) {
  const [wants, setWants] = useState([]);
  const [note, setNote] = useState("");
  const toggle = (k) => setWants((w) => (w.includes(k) ? w.filter((x) => x !== k) : [...w, k]));
  return (
    <div style={{ marginTop: 8, padding: 10, borderRadius: 10, border: "1px solid #2c3a47", background: "#121a21" }}>
      {children}
      <div style={{ fontSize: 12, color: "#9ab0c2", marginBottom: 6 }}>Was soll daraus in die App?</div>
      <div role="group" aria-label="Was soll in die App" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {WANTS.map((w) => (
          <button key={w.key} type="button" aria-pressed={wants.includes(w.key)} onClick={() => toggle(w.key)} style={chip(wants.includes(w.key))}>{w.label}</button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional), z. B. „nur die Beispielsätze“"
        aria-label="Notiz"
        rows={2}
        maxLength={2000}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid #2c3a47", background: "#1a232b", color: "#9ab0c2", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
        <button type="button" disabled={!canSave} onClick={() => onSave({ wants, note })} style={{ flex: 2, padding: "9px 0", borderRadius: 9, border: "none", background: canSave ? ACCENT : "#1a232b", color: canSave ? "#0e1419" : "#7d8d9c", fontSize: 13, fontWeight: 700, cursor: canSave ? "pointer" : "default" }}>{saveLabel}</button>
      </div>
    </div>
  );
}

InboxWantsForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  children: PropTypes.node,
  canSave: PropTypes.bool,
  saveLabel: PropTypes.string,
};

export default InboxWantsForm;
