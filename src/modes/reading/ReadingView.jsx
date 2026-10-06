import { useState, useEffect, useMemo, Fragment } from "react";
import PropTypes from "prop-types";
import { FlipCard } from "../../components";
import { DECK_META, ALL_CARDS } from "../../data";
import { idOf, parseParagraph, plainParagraph, indexCardsByFront, resolveLink } from "../../engine";
import { speak, stopSpeaking } from "../../engine/speech";

// 📰 Lesen: a short A2 text per chapter (engine/reading.js). Underlined
// words open their card under the paragraph; 🔊 reads the text aloud;
// 🇬🇧 shows the translation; three questions at the end (best score kept).
// openKey/onOpen live in App so the back gesture can close a text.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const CARDS_BY_FRONT = indexCardsByFront(ALL_CARDS);

const rowStyle = {
  display: "flex", width: "100%", boxSizing: "border-box", alignItems: "center", gap: 10, textAlign: "left",
  padding: "11px 12px", marginBottom: 6, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b",
  color: "#f2f5f8", cursor: "pointer", font: "inherit",
};
const toggle = (on) => ({
  padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.12)" : "#1a232b", color: on ? ACCENT : "#9ab0c2",
});
const answerBtn = (state) => ({
  padding: "8px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: state ? "default" : "pointer", textAlign: "left",
  border: `1px solid ${state === "right" ? GREEN : state === "wrong" ? RED : "#2c3a47"}`,
  background: state === "right" ? "rgba(95,168,95,.15)" : state === "wrong" ? "rgba(224,123,111,.12)" : "#0e1419",
  color: state === "right" ? GREEN : state === "wrong" ? RED : "#f2f5f8",
});

function Questions({ text, best, onScore }) {
  const [picked, setPicked] = useState({}); // question index -> option
  const total = text.questions.length;
  const answered = Object.keys(picked).length;
  const right = text.questions.filter((q, i) => picked[i] === q.answer).length;
  useEffect(() => { if (answered === total) onScore(right, total); }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 8 }}>
        ❓ FRAGEN ZUM TEXT{best != null ? ` · bisher ${best}/${total}` : ""}
      </div>
      {text.questions.map((q, i) => {
        const options = q.options || ["richtig", "falsch"];
        const mine = picked[i];
        return (
          <div key={q.q} style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: "#161d24", border: "1px solid #2c3a47" }}>
            <div style={{ fontSize: 14, color: "#f2f5f8", fontWeight: 600 }}>{q.options ? q.q : `Richtig oder falsch? ${q.q}`}</div>
            {q.en && <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 2 }}>{q.en}</div>}
            <div role="group" aria-label="Antworten" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {options.map((o) => {
                const state = mine == null ? null : o === q.answer ? "right" : o === mine ? "wrong" : null;
                return (
                  <button key={o} type="button" aria-disabled={mine != null} onClick={() => { if (mine == null) setPicked((p) => ({ ...p, [i]: o })); }} style={answerBtn(state)}>
                    {state === "right" ? "✓ " : state === "wrong" ? "✗ " : ""}{o}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {answered === total && (
        <div role="status" style={{ textAlign: "center", padding: "6px 0" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: right === total ? GREEN : "#f2f5f8" }}>{right === total ? "🎉 " : ""}{right} / {total} richtig</div>
          <button type="button" onClick={() => setPicked({})} style={{ marginTop: 8, ...toggle(false) }}>↻ Nochmal</button>
        </div>
      )}
    </div>
  );
}

function TextView({ text, lang, best, onScore, onBack, onOpenChapter }) {
  const [showEn, setShowEn] = useState(false);
  const [reading, setReading] = useState(false);
  const [open, setOpen] = useState(null); // "paragraph:segment" of the opened word
  const paragraphs = useMemo(() => text.paragraphs.map(parseParagraph), [text]);
  const meta = DECK_META[text.deck];
  useEffect(() => () => stopSpeaking(), []);

  const readAloud = () => {
    if (reading) { stopSpeaking(); setReading(false); return; }
    setReading(true);
    speak(text.paragraphs.map(plainParagraph).join(" "), () => setReading(false), 0.9, () => setReading(false));
  };

  return (
    <div>
      <button type="button" onClick={onBack} style={{ marginBottom: 12, background: ACCENT, border: "none", borderRadius: 10, padding: "8px 14px", color: "#0e1419", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Alle Texte</button>
      {meta && <div style={{ fontSize: 12, color: "#8fb8d8" }}>{meta.icon} {meta.label} · {text.level}</div>}
      <h2 style={{ margin: "4px 0 10px", fontSize: 20, color: "#f2f5f8" }}>{text.title}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" aria-pressed={reading} onClick={readAloud} style={toggle(reading)}>{reading ? "⏹ Stopp" : "🔊 Vorlesen"}</button>
        <button type="button" aria-pressed={showEn} onClick={() => setShowEn((v) => !v)} style={toggle(showEn)}>🇬🇧 Übersetzung</button>
      </div>
      <div style={{ fontSize: 11, color: "#7d8d9c", marginBottom: 10 }}>Tippe auf ein unterstrichenes Wort, um seine Karte zu sehen.</div>

      {paragraphs.map((segments, pi) => {
        const openSeg = open && open.startsWith(`${pi}:`) ? Number(open.split(":")[1]) : null;
        const card = openSeg != null ? resolveLink(segments[openSeg].front, text.deck, CARDS_BY_FRONT) : null;
        const cardMeta = card && DECK_META[card.deck];
        return (
          <Fragment key={pi}>
            <p style={{ margin: "0 0 6px", fontSize: 16, lineHeight: 1.65, color: "#e6ecf1" }}>
              {segments.map((s, si) => (s.front ? (
                <button
                  key={si}
                  type="button"
                  aria-expanded={openSeg === si}
                  onClick={() => setOpen(openSeg === si ? null : `${pi}:${si}`)}
                  style={{ background: openSeg === si ? "rgba(224,131,59,.18)" : "none", border: "none", padding: 0, font: "inherit", color: openSeg === si ? ACCENT : "#cfe3f3", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 4, borderRadius: 4 }}
                >{s.text}</button>
              ) : <Fragment key={si}>{s.text}</Fragment>))}
            </p>
            {showEn && <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.5, color: "#7d8d9c", fontStyle: "italic" }}>{text.en[pi]}</p>}
            {!showEn && <div style={{ height: 8 }} />}
            {card && (
              <div style={{ margin: "0 0 14px" }}>
                <FlipCard
                  front={card.front} sub={card.sub} english={card.english} example={card.example} exampleEn={card.exampleEn}
                  type={card.type} gender={card.gender} deck={card.deck} cardId={idOf(card.deck, card.front)}
                  lang={lang} level={card.level} source={card.source} note={card.note}
                />
                {cardMeta && (
                  <button type="button" onClick={() => onOpenChapter(card.deck, card.front)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
                    {cardMeta.icon} {cardMeta.label} öffnen →
                  </button>
                )}
              </div>
            )}
          </Fragment>
        );
      })}
      <Questions key={text.key} text={text} best={best} onScore={onScore} />
    </div>
  );
}

function ReadingView({ texts, allTexts, openKey, onOpen, lang, scores, onScore, onOpenChapter }) {
  const [showAll, setShowAll] = useState(false);
  const open = openKey ? allTexts.find((t) => t.key === openKey) : null;
  if (open) {
    return (
      <TextView
        key={open.key}
        text={open}
        lang={lang}
        best={scores[open.key]}
        onScore={(right) => onScore(open.key, right)}
        onBack={() => onOpen(null)}
        onOpenChapter={onOpenChapter}
      />
    );
  }

  const others = allTexts.filter((t) => !texts.includes(t));
  const row = (t) => {
    const meta = DECK_META[t.deck];
    const best = scores[t.key];
    return (
      <button key={t.key} type="button" onClick={() => onOpen(t.key)} style={rowStyle}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>{meta ? meta.icon : "📰"}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "#9ab0c2", marginTop: 2 }}>{meta ? meta.label : t.deck}</span>
        </span>
        {best != null && <span style={{ flexShrink: 0, fontSize: 12, color: best === t.questions.length ? GREEN : "#9ab0c2" }}>✓ {best}/{t.questions.length}</span>}
      </button>
    );
  };

  return (
    <div>
      <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
        📰 Kurze Texte mit den Wörtern aus deinen Kapiteln
      </div>
      {texts.length > 0 ? texts.map(row) : (
        <div role="status" style={{ textAlign: "center", padding: "10px 16px 16px", color: "#7d8d9c", fontSize: 13 }}>
          Für deine Auswahl gibt es noch keinen Text.
        </div>
      )}
      {others.length > 0 && (texts.length === 0 || showAll ? (
        <>
          {texts.length > 0 && <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c" }}>WEITERE TEXTE</div>}
          {others.map(row)}
        </>
      ) : (
        <button type="button" onClick={() => setShowAll(true)} style={{ ...rowStyle, justifyContent: "center", color: "#9ab0c2", fontSize: 13 }}>
          Alle {allTexts.length} Texte zeigen
        </button>
      ))}
    </div>
  );
}

const textShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  deck: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  level: PropTypes.string,
  paragraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
  en: PropTypes.arrayOf(PropTypes.string).isRequired,
  questions: PropTypes.arrayOf(PropTypes.shape({
    q: PropTypes.string.isRequired,
    en: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
    answer: PropTypes.string.isRequired,
  })).isRequired,
});

Questions.propTypes = { text: textShape.isRequired, best: PropTypes.number, onScore: PropTypes.func.isRequired };
TextView.propTypes = {
  text: textShape.isRequired, lang: PropTypes.string, best: PropTypes.number,
  onScore: PropTypes.func.isRequired, onBack: PropTypes.func.isRequired, onOpenChapter: PropTypes.func.isRequired,
};
ReadingView.propTypes = {
  texts: PropTypes.arrayOf(textShape).isRequired,
  allTexts: PropTypes.arrayOf(textShape).isRequired,
  openKey: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  lang: PropTypes.string,
  scores: PropTypes.objectOf(PropTypes.number).isRequired,
  onScore: PropTypes.func.isRequired,
  onOpenChapter: PropTypes.func.isRequired,
};

export default ReadingView;
