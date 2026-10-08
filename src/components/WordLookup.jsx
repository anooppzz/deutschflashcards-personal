import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LookupLinks from "./LookupLinks";
import { quickMeaning } from "../engine/quickMeaning";
import { lookupWiktionary, wiktionaryUrl, entrySummary } from "../engine/wiktionary";
import { GENDER_COLORS, TYPE_META } from "../constants";
import { wordLinks, searchQuestion, searchSubject } from "../engine/lookup";

// 🔍 A word the search didn't find (modes/search/SearchResults.jsx):
// ⚡ a quick machine translation (engine/quickMeaning.js, fetched once the
// learner stops typing), 🔎 the dictionaries, 🤖 Claude / ChatGPT / Gemini,
// 📖 Wörterbuch details from Wiktionary (engine/wiktionary.js: article,
// plural, verb forms, comparison, English, meanings, an example – for an
// English word, the German word the quick meaning found),
// ✨ the in-app AI (when switched on) and 📌 "Als Karte vorschlagen", which
// puts the word into the 📥 KI-Eingang (engine/aiInbox.js) so a Claude Code
// session can turn it into a card.
// missing: true = nothing in the app matched ("noch nicht in der App").

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const WAIT_MS = 700;

const POS_EN = { Substantiv: "noun", Verb: "verb", Adjektiv: "adjective", Adverb: "adverb", Präposition: "preposition", Konjunktion: "conjunction", Redewendung: "phrase", Partizip: "participle" };
const posColor = (e) => (e.pos === "Verb" ? TYPE_META.v.color : e.pos === "Adjektiv" ? TYPE_META.adj.color : e.pos === "Substantiv" ? "#9ab0c2" : TYPE_META.sonst.color);

// one Wiktionary entry, like the back of a card
function Entry({ e }) {
  const forms = e.plural !== undefined && e.plural !== null ? (e.plural ? `Pl. die ${e.plural}` : "kein Plural")
    : e.verb ? [e.verb.er, e.verb.praeteritum, e.verb.partizip && `${e.verb.hilfsverb === "sein" ? "ist" : "hat"} ${e.verb.partizip}`].filter(Boolean).join(" · ")
    : e.adjective ? [e.adjective.komparativ, e.adjective.superlativ].filter(Boolean).join(" · ") : "";
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid #1f2a33" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#f2f5f8", overflowWrap: "anywhere" }}>
          {e.articles?.map((a, i) => <span key={a} style={{ color: GENDER_COLORS[a] }}>{i ? "/" : ""}{a}</span>)}{e.articles?.length ? " " : ""}{e.title}
        </span>
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: posColor(e) }}>{e.pos}{POS_EN[e.pos] ? ` · ${POS_EN[e.pos]}` : ""}</span>
      </div>
      {forms && <div style={{ fontSize: 13, color: "#cdd8e2", marginTop: 2 }}>{forms}</div>}
      {e.en.length > 0 && <div style={{ fontSize: 14, color: ACCENT, fontWeight: 700, marginTop: 4 }}>🇬🇧 {e.en.join(", ")}</div>}
      {e.meanings.slice(0, 2).map((m, i) => <div key={m} style={{ fontSize: 13, color: "#9ab0c2", marginTop: 3 }}>{e.meanings.length > 1 ? `[${i + 1}] ` : ""}{m}</div>)}
      {e.examples[0] && <div style={{ fontSize: 13, color: "#cdd8e2", fontStyle: "italic", marginTop: 4 }}>„{e.examples[0]}“</div>}
    </div>
  );
}

function WordLookup({ q, missing, onSuggest }) {
  const [meaning, setMeaning] = useState({ state: "waiting" }); // waiting · loading · found · none · offline
  const [dict, setDict] = useState({ state: "waiting", entries: [] }); // waiting · loading · found · none · offline
  const [suggested, setSuggested] = useState(false);

  useEffect(() => {
    setSuggested(false);
    setMeaning({ state: "waiting" });
    setDict({ state: "waiting", entries: [] });
    let live = true;
    const t = setTimeout(() => {
      setMeaning({ state: "loading" });
      setDict({ state: "loading", entries: [] });
      const quick = quickMeaning(q)
        .then((r) => { if (live) setMeaning(r ? { state: "found", ...r } : { state: "none" }); return r; })
        .catch(() => { if (live) setMeaning({ state: "offline" }); return null; });
      // the word itself – or, for an English word, the German word the quick meaning found
      lookupWiktionary(q)
        .then(async (entries) => {
          if (entries.length) return entries;
          const r = await quick;
          return r?.from === "en" ? lookupWiktionary(r.text) : [];
        })
        .then((entries) => { if (live) setDict(entries.length ? { state: "found", entries } : { state: "none", entries: [] }); })
        .catch(() => { if (live) setDict({ state: "offline", entries: [] }); });
    }, WAIT_MS);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const text = meaning.state === "found" ? meaning.text : null;
  const suggest = () => {
    onSuggest({
      title: q,
      kind: "word",
      question: "Gesucht in der App – noch keine Karte",
      answer: [
        text ? `${q} → ${text} (automatische Übersetzung, ungeprüft)` : `${q} (noch keine Bedeutung)`,
        ...dict.entries.map((e) => `Wiktionary: ${entrySummary(e)}`),
      ].join("\n"),
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

      {/* 📖 Wiktionary */}
      {dict.state !== "none" && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 4 }}>📖 WÖRTERBUCH</div>
          {(dict.state === "waiting" || dict.state === "loading") && <div style={{ fontSize: 14, color: "#7d8d9c" }}>… sucht</div>}
          {dict.state === "offline" && <div style={{ fontSize: 13, color: "#c6925a" }}>Wiktionary ist gerade nicht erreichbar.</div>}
          {dict.entries.map((e) => <Entry key={`${e.title}|${e.pos}`} e={e} />)}
          {dict.state === "found" && (
            <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>
              Quelle: <a href={wiktionaryUrl(dict.entries[0].title)} target="_blank" rel="noopener noreferrer" style={{ color: "#8fb8d8" }}>Wiktionary ↗</a> (CC BY-SA) – von Freiwilligen geschrieben, meist zuverlässig.
            </div>
          )}
        </div>
      )}

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

Entry.propTypes = { e: PropTypes.object.isRequired };

WordLookup.propTypes = {
  q: PropTypes.string.isRequired,
  missing: PropTypes.bool,
  onSuggest: PropTypes.func.isRequired,
};

export default WordLookup;
