import { useState } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import AiText from "./AiText";
import InboxWantsForm from "./InboxWantsForm";
import { WANTS, inboxMarkdown, inboxFileName } from "../engine/aiInbox";

// 📥 KI-Eingang (engine/aiInbox.js): the saved AI answers. Export them as one
// Markdown file (📤 Teilen via the phone's share sheet, ⬇ Datei, 📋 Kopieren);
// a Claude Code chat then checks them and adds what fits
// (docs/ai-inbox/README.md). "＋ Text einfügen" takes answers pasted from
// the Claude/ChatGPT/Gemini websites.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const btn = { flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
const input = { width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 14, fontFamily: "inherit", marginBottom: 8 };
const SOURCES = ["Claude (Website)", "ChatGPT (Website)", "Gemini (Website)", "Andere"];
const wantLabel = Object.fromEntries(WANTS.map((w) => [w.key, w.label]));
const when = (iso) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// share the file if the phone can, else its text; null when there is no share sheet
const shareFile = async (text, name) => {
  const nav = globalThis.navigator;
  if (!nav?.share) return null;
  for (const [fname, type] of [[name, "text/markdown"], [name.replace(/\.md$/, ".txt"), "text/plain"]]) {
    const file = new File([text], fname, { type });
    if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: name }); return "file"; }
  }
  await nav.share({ title: name, text });
  return "text";
};

const download = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function AiInboxModal({ items, onAdd, onRemove, onExported, onClose }) {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState(SOURCES[1]);
  const [msg, setMsg] = useState(null);
  const exported = items.filter((it) => it.exportedAt);
  const fresh = items.length - exported.length;

  const exportWith = async (how) => {
    const md = inboxMarkdown(items);
    const name = inboxFileName();
    try {
      if (how === "share") {
        const r = await shareFile(md, name);
        if (!r) { download(md, name); setMsg("Teilen geht hier nicht – die Datei wurde heruntergeladen."); } else setMsg("📤 Geteilt.");
      } else if (how === "file") {
        download(md, name); setMsg(`⬇ ${name} heruntergeladen.`);
      } else {
        await navigator.clipboard.writeText(md); setMsg("📋 Kopiert – im Claude-Code-Chat einfügen.");
      }
      onExported(items.map((it) => it.id));
    } catch (e) {
      if (e?.name !== "AbortError") setMsg(`Ging nicht: ${e?.message || e}`);
    }
  };

  return (
    <Modal title={`📥 KI-Eingang (${items.length})`} onClose={onClose}>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 }}>
        KI-Antworten, die in die App sollen. So kommen sie hinein: <strong>exportieren</strong> → in einem <strong>Claude-Code-Chat</strong> (Repository <em>deutschflashcards-personal</em>) anhängen oder einfügen und schreiben: „Bitte den KI-Eingang einarbeiten“. Claude prüft alles und nimmt nur Richtiges auf – danach hier „Exportierte löschen“.
      </p>

      {items.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => exportWith("share")} style={{ ...btn, border: "none", background: ACCENT, color: "#0e1419" }}>📤 Teilen</button>
            <button type="button" onClick={() => exportWith("file")} style={btn}>⬇ Datei</button>
            <button type="button" onClick={() => exportWith("copy")} style={btn}>📋 Kopieren</button>
          </div>
          <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>Exportiert alle {items.length}{fresh < items.length ? ` (${fresh} neu)` : ""} als eine Markdown-Datei.</div>
        </>
      )}
      {msg && <div role="status" style={{ marginTop: 6, fontSize: 12, color: GREEN }}>{msg}</div>}

      {!adding ? (
        <button type="button" onClick={() => setAdding(true)} style={{ ...btn, width: "100%", marginTop: 12, color: "#8fb8d8", border: "1px dashed #3a5670", background: "transparent" }}>＋ Text einfügen (z. B. von ChatGPT)</button>
      ) : (
        <InboxWantsForm
          canSave={Boolean(title.trim() && answer.trim())}
          onCancel={() => setAdding(false)}
          onSave={({ wants, note }) => {
            onAdd({ title, kind: "other", answer, source, wants, note });
            setTitle(""); setAnswer(""); setAdding(false); setMsg("📌 Hinzugefügt.");
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wort oder Thema, z. B. „Perfekt mit sein“" aria-label="Titel" maxLength={200} style={input} />
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Antwort hier einfügen" aria-label="Antwort" rows={5} maxLength={20000} style={{ ...input, resize: "vertical" }} />
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Quelle" style={input}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </InboxWantsForm>
      )}

      {items.length === 0 && !adding && (
        <div role="status" style={{ textAlign: "center", padding: "24px 8px", color: "#7d8d9c", fontSize: 13 }}>
          Noch leer. Im KI-Chat unter einer Antwort: „📌 Für die App vorschlagen“.
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it) => {
          const isOpen = open === it.id;
          return (
            <div key={it.id} style={{ borderRadius: 10, border: `1px solid ${isOpen ? ACCENT : "#2c3a47"}`, background: "#1a232b" }}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 11px", background: "none", border: "none", color: "#f2f5f8", cursor: "pointer", font: "inherit" }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, fontWeight: 700 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                  {it.exportedAt && <span style={{ flexShrink: 0, fontSize: 11, color: GREEN }}>📤 exportiert</span>}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#7d8d9c", marginTop: 2 }}>
                  {when(it.at)}{it.source ? ` · ${it.source}` : ""}{it.wants.length ? ` · ${it.wants.map((k) => wantLabel[k]).join(" ")}` : ""}
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 11px 10px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.5, overflowWrap: "anywhere" }}>
                  {it.note && <div style={{ fontSize: 12, color: "#9ab0c2", marginBottom: 4 }}>📝 {it.note}</div>}
                  <AiText text={it.answer} />
                  <button type="button" onClick={() => { if (window.confirm("Eintrag löschen?")) onRemove([it.id]); }} style={{ marginTop: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid #2c3a47", background: "transparent", color: RED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑 Löschen</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {exported.length > 0 && (
        <button type="button" onClick={() => { if (window.confirm(`${exported.length} exportierte Einträge löschen? (Erst, wenn Claude sie eingearbeitet hat.)`)) onRemove(exported.map((it) => it.id)); }} style={{ ...btn, width: "100%", marginTop: 12, color: RED }}>
          🗑 Exportierte löschen ({exported.length})
        </button>
      )}
    </Modal>
  );
}

AiInboxModal.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired, at: PropTypes.string.isRequired, title: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired, wants: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onExported: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AiInboxModal;
