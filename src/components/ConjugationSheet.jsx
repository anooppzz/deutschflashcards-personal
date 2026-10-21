import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { VERB_FORMS } from "../data";
import { conjugate, buildPatternIndex, sameAs, rowText } from "../engine/conjugate";
import { speak } from "../engine/speech";

// 📊 Alle Formen: a verb's whole conjugation as a full-screen layer, like the
// 🔍 search. The A2 tenses are open; the B1 ones fold away under "➕ Mehr
// Zeitformen". Endings are blue, an irregular stem orange. 🙈 Selbst testen
// hides the forms: say the form, tap the row, check. "Geht wie …" lists the
// app's verbs with the same pattern; a tap opens that verb on top (back
// returns). The forms come from engine/conjugate.js.

const END = "#7fb0d6";
const IRR = "#e0833b";

let patternIndex = null; // built on first use: every verb's pattern
const indexOf = () => {
  if (!patternIndex) patternIndex = buildPatternIndex(VERB_FORMS);
  return patternIndex;
};

const chip = (color) => ({
  display: "inline-block", fontSize: 12, fontWeight: 700, color, border: `1px solid ${color}`,
  borderRadius: 8, padding: "3px 9px", background: "transparent",
});

function Form({ segs }) {
  return segs.map((s, i) => (
    <span
      key={i}
      style={s.k === "end" ? { color: END, fontWeight: 700 }
        : s.k === "irr" ? { color: IRR, fontWeight: 800 }
          : s.k === "w" ? { color: "#f2f5f8", fontWeight: 700 }
            : { color: s.t.endsWith(" ") || s.t.startsWith(" ") ? "#cdd8e2" : "#f2f5f8", fontWeight: s.t.startsWith(" ") ? 500 : 700 }}
    >{s.t}</span>
  ));
}

function TenseCard({ tense, testing, onGrammar }) {
  const [shown, setShown] = useState(() => new Set());
  useEffect(() => { setShown(new Set()); }, [testing]);
  const all = tense.rows.map(rowText).join(". ");
  const hidden = (i) => testing && !shown.has(i);
  const tapRow = (i, row) => {
    if (hidden(i)) setShown((s) => new Set(s).add(i));
    speak(rowText(row));
  };
  return (
    <section style={{ background: "#161d24", border: "1px solid #2c3a47", borderRadius: 14, padding: "10px 12px 8px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <h3 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 15, color: "#f2f5f8" }}>
          {tense.title.de} <span style={{ fontSize: 12, fontWeight: 500, color: "#7d8d9c" }}>({tense.title.en})</span>
        </h3>
        {tense.grammar && onGrammar && (
          <button type="button" onClick={() => onGrammar(tense.grammar)} aria-label={`Grammatik: ${tense.title.de}`} style={{ ...chip("#8fb8d8"), cursor: "pointer", padding: "4px 8px" }}>📖</button>
        )}
        <button type="button" onClick={() => speak(all)} aria-label={`${tense.title.de} vorlesen`} style={{ width: 36, height: 32, borderRadius: 8, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", cursor: "pointer", fontSize: 14 }}>🔊</button>
      </div>
      {tense.use && <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 2 }}>{tense.use}</div>}
      <div role="list" style={{ marginTop: 6 }}>
        {tense.rows.map((row, i) => (
          <button
            key={row.person}
            type="button"
            role="listitem"
            onClick={() => tapRow(i, row)}
            aria-label={hidden(i) ? `${row.person}: aufdecken` : rowText(row)}
            style={{ display: "flex", width: "100%", alignItems: "baseline", gap: 10, padding: "5px 2px", background: "none", border: "none", borderTop: i ? "1px solid #1f2a33" : "none", cursor: "pointer", textAlign: "left", font: "inherit", fontSize: 15 }}
          >
            <span style={{ width: 70, flexShrink: 0, color: "#7d8d9c", fontSize: 13 }}>{row.person}</span>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
              {hidden(i) ? <span style={{ color: "#5a6b78", letterSpacing: 2 }}>· · · ?</span> : <Form segs={row.segs} />}
            </span>
          </button>
        ))}
      </div>
      {testing && shown.size < tense.rows.length && (
        <button type="button" onClick={() => setShown(new Set(tense.rows.map((_, i) => i)))} style={{ marginTop: 4, background: "none", border: "none", color: "#8fb8d8", fontSize: 12, cursor: "pointer", padding: "4px 0" }}>alle zeigen</button>
      )}
      {tense.note && <div style={{ fontSize: 12, color: "#9ab0c2", marginTop: 4 }}>💡 {tense.note}</div>}
    </section>
  );
}

TenseCard.propTypes = {
  tense: PropTypes.object.isRequired,
  testing: PropTypes.bool.isRequired,
  onGrammar: PropTypes.func,
};

function ConjugationSheet({ cardId, english, depth, onOpen, onBack, onClose, onGrammar }) {
  const front = cardId.slice(cardId.indexOf("::") + 2);
  const c = useMemo(() => conjugate(front, VERB_FORMS.get(cardId)), [front, cardId]);
  const like = useMemo(() => (c ? sameAs(indexOf(), cardId, c.verb) : { list: [], more: 0 }), [c, cardId]);
  const [testing, setTesting] = useState(false);
  const [more, setMore] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    setMore(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [cardId]);

  const pattern = c && c.pattern;
  const a2 = c ? c.tenses.filter((t) => t.level === "A2") : [];
  const b1 = c ? c.tenses.filter((t) => t.level === "B1") : [];
  const title = front.replace(/·/g, "");

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Alle Formen: ${title}`}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "#0e1419", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "system-ui, sans-serif" }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#0e1419", borderBottom: "1px solid #1f2a33", padding: "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={depth > 1 ? onBack : onClose}
            aria-label={depth > 1 ? "Zurück zum vorigen Verb" : "Alle Formen schließen"}
            style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", fontSize: 18, cursor: "pointer" }}
          >{depth > 1 ? "←" : "×"}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f2f5f8", lineHeight: 1.2 }}>
              {title}
              <button type="button" onClick={() => speak(title)} aria-label={`Aussprechen: ${title}`} style={{ marginLeft: 6, background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>🔊</button>
            </div>
            <div style={{ fontSize: 12, color: "#7d8d9c" }}>📊 Alle Formen{english ? ` · ${english}` : ""}</div>
          </div>
          <button
            type="button"
            onClick={() => setTesting((t) => !t)}
            aria-pressed={testing}
            style={{ flexShrink: 0, minHeight: 40, padding: "0 10px", borderRadius: 12, border: testing ? "none" : "1px solid #2c3a47", background: testing ? IRR : "#1a232b", color: testing ? "#0e1419" : "#f2f5f8", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >🙈 Selbst testen</button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        {!c ? (
          <p style={{ color: "#9ab0c2", fontSize: 14 }}>Für dieses Verb gibt es keine Formen.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <span style={chip(c.regular ? "#5fa85f" : IRR)}>{c.regular ? "✅ regelmäßig" : "⚠ unregelmäßig"}</span>
              {c.particle && <button type="button" onClick={() => onGrammar("trennbare-verben")} style={{ ...chip("#8fb8d8"), cursor: "pointer" }}>📖 trennbar: {c.particle}|{c.head}</button>}
              {c.reflexive && <button type="button" onClick={() => onGrammar("reflexive-verben")} style={{ ...chip("#8fb8d8"), cursor: "pointer" }}>📖 reflexiv</button>}
              {c.modal && <button type="button" onClick={() => onGrammar("modalverben")} style={{ ...chip("#8fb8d8"), cursor: "pointer" }}>📖 Modalverb</button>}
            </div>
            {c.keyForms && c.keyForms.length > 0 && (
              <div style={{ fontSize: 14, color: "#cdd8e2", marginBottom: 8 }}>
                Merk dir: <b style={{ color: IRR }}>{c.keyForms.join(" · ")}</b>
              </div>
            )}
            {c.notes.map((n) => <div key={n} style={{ fontSize: 12, color: "#9ab0c2", marginBottom: 4 }}>💡 {n}</div>)}

            {pattern && (
              <div style={{ border: "1px solid #2c3a47", borderRadius: 12, padding: "8px 10px", margin: "8px 0 12px", background: "#121a21" }}>
                <div style={{ fontSize: 13, color: "#cdd8e2" }}>
                  <b>🔗 Geht wie …</b> <span style={{ color: "#7d8d9c" }}>({pattern.label})</span>
                </div>
                {/^(strong|mixed)/.test(pattern.key) && (
                  <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 2 }}>same vowels in: infinitive – er/sie/es – Präteritum – Partizip</div>
                )}
                {like.list.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {like.list.map((x) => (
                      <button key={x.id} type="button" onClick={() => onOpen(x.id)} style={{ ...chip("#e8c39e"), cursor: "pointer", fontWeight: 600 }}>{x.verb}</button>
                    ))}
                    {like.more > 0 && <span style={{ fontSize: 12, color: "#7d8d9c", alignSelf: "center" }}>+{like.more} mehr</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 4 }}>Noch kein anderes Verb in der App mit diesem Muster.</div>
                )}
              </div>
            )}

            <div style={{ fontSize: 12, color: "#7d8d9c", marginBottom: 8 }}>
              {testing
                ? "🙈 Sag die Form laut, dann tipp die Zeile zum Prüfen."
                : <>Tipp eine Zeile zum Anhören · <span style={{ color: END, fontWeight: 700 }}>Endung</span> · <span style={{ color: IRR, fontWeight: 800 }}>unregelmäßig</span></>}
            </div>
            {a2.map((t) => <TenseCard key={`${cardId}-${t.key}`} tense={t} testing={testing} onGrammar={onGrammar} />)}

            {b1.length > 0 && (
              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                aria-expanded={more}
                style={{ width: "100%", minHeight: 44, margin: "4px 0 10px", borderRadius: 12, border: "1px dashed #2c3a47", background: "transparent", color: "#cdd8e2", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >{more ? "➖ Weniger Zeitformen" : `➕ Mehr Zeitformen (B1) · ${b1.length}`}</button>
            )}
            {more && b1.map((t) => <TenseCard key={`${cardId}-${t.key}`} tense={t} testing={testing} onGrammar={onGrammar} />)}
          </>
        )}
      </div>
    </div>
  );
}

ConjugationSheet.propTypes = {
  cardId: PropTypes.string.isRequired,
  english: PropTypes.string,
  depth: PropTypes.number.isRequired,
  onOpen: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onGrammar: PropTypes.func.isRequired,
};

export default ConjugationSheet;
