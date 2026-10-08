import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LookupLinks from "./LookupLinks";
import { quickMeaning } from "../engine/quickMeaning";
import { wordLinks, searchQuestion, searchSubject } from "../engine/lookup";

// 🔍 A word the search didn't find (modes/search/SearchResults.jsx):
// ⚡ a quick machine translation (engine/quickMeaning.js, fetched once the
// learner stops typing), 🔎 the dictionaries, 🤖 Claude / ChatGPT / Gemini,
// ✨ the in-app AI (when switched on) and 📌 "Als Karte vorschlagen", which
// puts the word into the 📥 KI-Eingang (engine/aiInbox.js) so a Claude Code
// session can turn it into a card.
// missing: true = nothing in the app matched ("noch nicht in der App").

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const WAIT_MS = 700;

function WordLookup({ q, missing, onSuggest }) {
  const [meaning, setMeaning] = useState({ state: "waiting" }); // waiting · loading · found · none · offline
  const [suggested, setSuggested] = useState(false);

  useEffect(() => {
    setSuggested(false);
    setMeaning({ state: "waiting" });
    let live = true;
    const t = setTimeout(() => {
      setMeaning({ state: "loading" });
      quickMeaning(q)
        .then((r) => { if (live) setMeaning(r ? { state: "found", ...r } : { state: "none" }); })
        .catch(() => { if (live) setMeaning({ state: "offline" }); });
    }, WAIT_MS);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const text = meaning.state === "found" ? meaning.text : null;
  const suggest = () => {
    onSuggest({
      title: q,
      kind: "word",
      question: "Gesucht in der App – noch keine Karte",
      answer: text ? `${q} → ${text} (automatische Übersetzung, ungeprüft)` : `${q} (noch keine Bedeutung)`,
      source: "Suche",
      wants: ["cards"],
    });
    setSuggested(true);
  };

  return (
    <div style={{ padding: missing ? "24px 4px 8px" : "4px 0 8px" }}>
      {missing && (
        <div role="status" style={{ textAlign: "center", marginBottom: 14 }}>
          <div aria-hidden="true" style={{ fontSize: 34 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#cdd8e2", marginTop: 4 }}>„{q}“ ist noch nicht in der App.</div>
          <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 4 }}>Bedeutung, Wörterbücher und KI – direkt von hier:</div>
        </div>
      )}

      {/* ⚡ quick meaning */}
      <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", minHeight: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 4 }}>⚡ KURZ ERKLÄRT</div>
        {(meaning.state === "waiting" || meaning.state === "loading") && <div style={{ fontSize: 14, color: "#7d8d9c" }}>… sucht</div>}
        {meaning.state === "found" && (
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f2f5f8" }}>{q}</span>
            <span style={{ color: "#7d8d9c" }}> → </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{meaning.text}</span>
            <span style={{ fontSize: 12, color: "#7d8d9c" }}> {meaning.from === "de" ? "🇬🇧" : "🇩🇪"}</span>
            <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 4 }}>Automatische Übersetzung (MyMemory) – kann bei Redewendungen falsch sein. Für Artikel, Plural und Beispiele: 🔎 oder 🤖.</div>
          </div>
        )}
        {meaning.state === "none" && <div style={{ fontSize: 13, color: "#9ab0c2" }}>Keine schnelle Übersetzung gefunden – schau im Wörterbuch nach oder frag die KI.</div>}
        {meaning.state === "offline" && <div style={{ fontSize: 13, color: "#c6925a" }}>Keine Verbindung – die schnelle Übersetzung braucht Internet.</div>}
      </div>

      {/* 🔎 dictionaries · 🤖 AI sites · ✨ in-app AI */}
      <LookupLinks links={wordLinks(q)} question={searchQuestion(q)} aiSubject={searchSubject(q, text)} defaultOpen />

      {/* 📌 into the KI-Eingang */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        {suggested ? (
          <div role="status" style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>📌 Im KI-Eingang – unten in der App unter „📥 KI-Eingang“ exportieren.</div>
        ) : (
          <button type="button" onClick={suggest} style={{ padding: "7px 12px", borderRadius: 10, border: `1px dashed ${ACCENT}`, background: "transparent", color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            📌 Als Karte vorschlagen
          </button>
        )}
      </div>
    </div>
  );
}

WordLookup.propTypes = {
  q: PropTypes.string.isRequired,
  missing: PropTypes.bool,
  onSuggest: PropTypes.func.isRequired,
};

export default WordLookup;
