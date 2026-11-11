import { useState, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../constants";
import { speak } from "../../engine/speech";
import { localize, parseHighlights, isGloss } from "./richText";
import { sectionDomId } from "../../engine/chapterGrammar";
import { splitGrammarWords } from "../../engine/grammarWords";
import { GrammarWordCtx } from "./wordCtx";
import WordPopover from "./WordPopover";

// Renders a grammar topic's body so it can be scanned rather than read:
// a one-line summary, then sections - tables for forms that change by
// person/gender/degree, short bullet points, and a warning box for
// exceptions. All text is data (topics.json), per-language like the rest of
// the grammar content; table cells can also be plain strings, since German
// forms are the same in every language.
//
// Inline markup: **x** highlights x (see richText.js) - used for endings and
// changed letters (wohn**st**, gr**ö**ß**er**) so the part that changes stands out.
//
// Above the rule: a folded "🧭 Worum geht's?" box (topic.intro: what it is,
// when you need it, one sentence to remember) and, until it is closed once,
// a short tip on how to learn a topic.
//
// German sentences in tables carry their English ({ t, en }): tap one to see
// it, or "🇬🇧 English" above the table to show all of that table's.

const ACCENT = "#e0833b";

// a grammar word (nach, woher, zum …): tap for its meaning (WordPopover)
function WordLink({ text, entry }) {
  const open = useContext(GrammarWordCtx);
  if (!open) return text;
  const show = (e) => { e.stopPropagation(); e.preventDefault(); open(entry, e.currentTarget); };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={show}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") show(e); }}
      aria-label={`${text}: Bedeutung zeigen`}
      style={{ cursor: "pointer", borderBottom: "1px dashed #5d7a93" }}
    >{text}</span>
  );
}

WordLink.propTypes = { text: PropTypes.string.isRequired, entry: PropTypes.object.isRequired };

const linked = (text, german, highlighted) => splitGrammarWords(text, { german, highlighted })
  .map((w, j) => (w.entry ? <WordLink key={j} text={w.text} entry={w.entry} /> : w.text));

// german: the text is German - every grammar word in it links; in English
// text only words that can't be English do (see engine/grammarWords.js)
function Rich({ text, german = false }) {
  return parseHighlights(text).map((p, i) =>
    // a short highlight (an ending like -keit) never breaks across lines
    p.hl ? <strong key={i} style={{ color: ACCENT, fontWeight: 700, whiteSpace: p.text.length <= 16 ? "nowrap" : undefined }}>{linked(p.text, german, true)}</strong> : <span key={i}>{linked(p.text, german, false)}</span>
  );
}

// a {de, en} text or a plain (German) string, shown in the reader's language
const isGerman = (field, lang) => lang === "de" || typeof field === "string" || isGloss(field);
function LocalRich({ field, lang }) {
  return <Rich text={localize(field, lang)} german={isGerman(field, lang)} />;
}

LocalRich.propTypes = { field: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired, lang: PropTypes.string };

// a table's column heading: German (as in the book), the reader's language
// small underneath
function HeadCell({ h, lang }) {
  const de = localize(h, "de");
  const own = lang === "de" ? null : localize(h, lang);
  return (
    <>
      <span lang="de"><Rich text={de} german /></span>
      {own && own !== de && <span style={{ display: "block", marginTop: 1, fontSize: 10, fontWeight: 500, fontStyle: "italic", color: "#6f8193", whiteSpace: "normal" }}>{own.replace(/\*\*/g, "")}</span>}
    </>
  );
}

HeadCell.propTypes = { h: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired, lang: PropTypes.string };

const sectionTitleStyle = {
  margin: "14px 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  color: "#7d8d9c", textTransform: "uppercase",
};

// A section's heading: always the German one, as in the textbook, and the
// heading in the reader's language small underneath.
function SectionTitle({ title, lang, style }) {
  const de = localize(title, "de");
  const own = lang === "de" ? null : localize(title, lang);
  return (
    <div style={{ ...sectionTitleStyle, ...style }}>
      <span lang="de">{de}</span>
      {own && own !== de && <span style={{ display: "block", marginTop: 1, fontSize: 11, fontWeight: 500, letterSpacing: 0, textTransform: "none", fontStyle: "italic", color: "#6f8193" }}>{own}</span>}
    </div>
  );
}

SectionTitle.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.objectOf(PropTypes.string)]).isRequired,
  lang: PropTypes.string,
  style: PropTypes.object,
};

// "🇬🇧 English" above a table or list with German sentences: shows all their
// meanings at once
function GlossToggle({ on, onToggle, lang }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      style={{ flex: "none", margin: "0 0 4px", padding: "2px 8px", borderRadius: 999, border: "1px solid #2c3a47", background: on ? "#24313c" : "none", color: "#9ab0c2", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
    >{localize(on ? GLOSS_TEXT.hide : GLOSS_TEXT.show, lang)}</button>
  );
}

GlossToggle.propTypes = { on: PropTypes.bool, onToggle: PropTypes.func.isRequired, lang: PropTypes.string };

// Short cells (forms, pronouns) stay on one line so columns line up; long
// ones (explanations, sentences) wrap instead of making the table wider
// than a phone screen.
const wrapStyle = (text) => (text.replace(/\*\*/g, "").length <= 12 ? { whiteSpace: "nowrap" } : null);
// Tables with 5+ columns (e.g. modal verb conjugation) get slightly
// smaller text and padding so they still fit a 360px phone screen.
const GLOSS_TEXT = { show: { de: "🇬🇧 Englisch", en: "🇬🇧 English" }, hide: { de: "🇬🇧 ausblenden", en: "🇬🇧 Hide" } };

// a German cell with its meaning: tap the German to show / hide the English
// inline: inside running text (a bullet). A <button> is always an inline
// block (the bullet would sit at its last line), so there it's a span that
// acts as a button.
function GlossCell({ cell, showAll, inline = false }) {
  const [open, setOpen] = useState(false);
  const shown = open || showAll;
  const toggle = () => setOpen((o) => !o);
  const style = { border: "none", background: "none", padding: 0, margin: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "underline dotted #4b5d6d", textUnderlineOffset: 3 };
  return (
    <>
      {inline ? (
        <span
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
          aria-expanded={shown}
          style={style}
        ><Rich text={cell.t} german /></span>
      ) : (
        <button type="button" className="inline-tap" onClick={toggle} aria-expanded={shown} style={style}><Rich text={cell.t} german /></button>
      )}
      {shown && <div style={{ marginTop: 2, fontSize: inline ? 12 : 11, fontWeight: 400, fontStyle: "italic", color: "#8fa3b5", whiteSpace: "normal" }}>{cell.en.replace(/\*\*/g, "")}</div>}
    </>
  );
}

function TableSection({ section, lang }) {
  const wide = section.head.length >= 5;
  const cellPad = wide ? "6px 5px" : "6px 7px";
  const hasGloss = section.rows.some((row) => row.some(isGloss));
  const [showAll, setShowAll] = useState(false);
  const content = (cell) => (isGloss(cell) ? <GlossCell cell={cell} showAll={showAll} /> : <LocalRich field={cell} lang={lang} />);
  return (
    <>
      {(section.title || hasGloss) && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: section.title ? 0 : 12 }}>
          {section.title ? <SectionTitle title={section.title} lang={lang} style={{ flex: 1, minWidth: 0 }} /> : <div style={{ flex: 1 }} />}
          {hasGloss && <GlossToggle on={showAll} onToggle={() => setShowAll((v) => !v)} lang={lang} />}
        </div>
      )}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #2c3a47", marginTop: section.title || hasGloss ? 0 : 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: wide ? 12 : 13 }}>
          <thead>
            <tr>
              {section.head.map((h, i) => (
                <th key={i} scope="col" style={{ padding: cellPad, textAlign: "left", fontSize: 11, fontWeight: 700, color: "#7d8d9c", background: "#0e1419", ...wrapStyle(localize(h, "de")) }}>
                  <HeadCell h={h} lang={lang} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, r) => (
              <tr key={r} style={{ borderTop: "1px solid #22303c" }}>
                {row.map((cell, c) => (c === 0 ? (
                  <th key={c} scope="row" style={{ padding: cellPad, textAlign: "left", fontWeight: 600, color: "#f2f5f8", ...wrapStyle(localize(cell, lang)) }}>
                    {content(cell)}
                  </th>
                ) : (
                  <td key={c} style={{ padding: cellPad, color: "#cdd8e2", ...wrapStyle(localize(cell, lang)) }}>
                    {content(cell)}
                  </td>
                )))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Bullets: an explanation is { de, en } (shown in the reader's language); a
// German sentence to learn is { t, en } - the German always shows, its
// English on tap (or "🇬🇧 English" for all of them), as in the tables.
function PointsSection({ section, lang }) {
  const hasGloss = section.items.some(isGloss);
  const [showAll, setShowAll] = useState(false);
  return (
    <>
      {(section.title || hasGloss) && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {section.title ? <SectionTitle title={section.title} lang={lang} style={{ flex: 1, minWidth: 0 }} /> : <div style={{ flex: 1, marginTop: 12 }} />}
          {hasGloss && <GlossToggle on={showAll} onToggle={() => setShowAll((v) => !v)} lang={lang} />}
        </div>
      )}
      <ul style={{ margin: section.title || hasGloss ? 0 : "12px 0 0", paddingLeft: 18, color: "#cdd8e2", fontSize: 13, lineHeight: 1.5 }}>
        {section.items.map((item, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {isGloss(item) ? <span lang="de" style={{ color: "#f2f5f8" }}><GlossCell cell={item} showAll={showAll} inline /></span> : <LocalRich field={item} lang={lang} />}
          </li>
        ))}
      </ul>
    </>
  );
}

function WarningSection({ section, lang }) {
  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(224,131,59,.35)", background: "rgba(224,131,59,.08)", fontSize: 13, lineHeight: 1.5, color: "#cdd8e2" }}>
      <span aria-hidden="true">⚠️</span>
      <span><LocalRich field={section.text} lang={lang} /></span>
    </div>
  );
}

const SECTIONS = { table: TableSection, points: PointsSection, warning: WarningSection };

const INTRO_TEXT = {
  head: { de: "🧭 Worum geht's?", en: "🧭 What's this about?" },
  what: { de: "Was ist das?", en: "What is it?" },
  when: { de: "Wann brauchst du es?", en: "When do you need it?" },
  english: { de: "Im Vergleich zum Englischen", en: "Compared with English" },
  remember: { de: "Merksatz", en: "Remember this" },
  glossary: { de: "📘 Grammatik-Wörter erklärt →", en: "📘 Grammar words explained →" },
  how: { de: "So lernst du ein Thema", en: "How to learn a topic" },
  steps: {
    de: "1. Regel lesen · 2. Beispiele laut sagen 🔊 · 3. ✏️ Üben · 4. 🗂 Wörter",
    en: "1. Read the rule · 2. Say the examples aloud 🔊 · 3. ✏️ Üben (practise) · 4. 🗂 Wörter (your words)",
  },
};

const tipSeen = () => {
  try { return localStorage.getItem(STORAGE_KEYS.GRAMMAR_TIP_SEEN) === "1"; } catch { return false; }
};

// shown above the first topics until the learner closes it (then it lives in ❓ Hilfe)
function HowToTip({ lang }) {
  const [open, setOpen] = useState(() => !tipSeen());
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEYS.GRAMMAR_TIP_SEEN, "1"); } catch { /* storage off */ }
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", marginBottom: 10, borderRadius: 8, border: "1px dashed #2c3a47", fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: "#cdd8e2" }}>💡 {localize(INTRO_TEXT.how, lang)}:</strong> {localize(INTRO_TEXT.steps, lang)}
      </div>
      <button type="button" onClick={close} aria-label="Tipp schließen" style={{ border: "none", background: "none", color: "#7d8d9c", fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
    </div>
  );
}

function IntroRow({ icon, label, children }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: "#7d8d9c", textTransform: "uppercase" }}>{icon} {label}</div>
      <div style={{ fontSize: 13, color: "#cdd8e2", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// onGlossary: opens the "Grammatik-Wörter" topic (not shown on that topic itself)
function TopicIntro({ intro, lang, onGlossary }) {
  return (
    <details style={{ padding: "8px 12px", marginBottom: 10, borderRadius: 10, background: "#161d24", border: "1px solid #24313c" }}>
      <summary style={{ fontSize: 14, fontWeight: 700, color: "#f2f5f8", cursor: "pointer", minHeight: 28, display: "flex", alignItems: "center" }}>
        {localize(INTRO_TEXT.head, lang)} ▸
      </summary>
      <IntroRow icon="🧭" label={localize(INTRO_TEXT.what, lang)}><LocalRich field={intro.what} lang={lang} /></IntroRow>
      <IntroRow icon="🗓" label={localize(INTRO_TEXT.when, lang)}><LocalRich field={intro.when} lang={lang} /></IntroRow>
      <IntroRow icon="🇬🇧" label={localize(INTRO_TEXT.english, lang)}><LocalRich field={intro.english} lang={lang} /></IntroRow>
      <IntroRow icon="💬" label={localize(INTRO_TEXT.remember, lang)}>
        <em style={{ color: "#f2f5f8", fontSize: 14 }}>{intro.remember.de}</em>{" "}
        <button type="button" onClick={() => speak(intro.remember.de)} aria-label={`Aussprechen: ${intro.remember.de}`} className="inline-tap" style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: 0 }}>🔊</button>
        <div style={{ fontSize: 12, color: "#7d8d9c" }}>{intro.remember.en}</div>
      </IntroRow>
      {onGlossary && (
        <button type="button" onClick={onGlossary} style={{ marginTop: 10, padding: "4px 0", border: "none", background: "none", color: "#e0833b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {localize(INTRO_TEXT.glossary, lang)}
        </button>
      )}
    </details>
  );
}

export const GLOSSARY_KEY = "grammatik-woerter";

// highlight: index of the section just jumped to (🔍 result, 📌 chapter link)
// - it lights up for a moment. Every section has an anchor (sectionDomId);
// a section with "book" shows where it is in the textbook.
// onTopic(key): open another topic (the 📖 link in a word's meaning box)
function TopicBody({ topic, lang, onGlossary, highlight = null, onTopic }) {
  // the tapped grammar word: { entry, anchor } (WordPopover)
  const [word, setWord] = useState(null);
  const openWord = useCallback((entry, anchor) => setWord((w) => (w && w.anchor === anchor ? null : { entry, anchor })), []);
  const closeWord = useCallback(() => setWord(null), []);
  // older/free-text topics without structure still render as a paragraph
  if (!topic.summary && !topic.sections) {
    return topic.explanation ? (
      <p style={{ margin: 0, fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>{localize(topic.explanation, lang)}</p>
    ) : null;
  }
  return (
    <GrammarWordCtx.Provider value={openWord}>
      {word && <WordPopover entry={word.entry} anchor={word.anchor} lang={lang} topicKey={topic.key} onTopic={onTopic} onClose={closeWord} />}
      {topic.intro && <HowToTip lang={lang} />}
      {topic.intro && <TopicIntro intro={topic.intro} lang={lang} onGlossary={onGlossary} />}
      {topic.summary && (
        <div style={{ padding: "10px 12px", borderRadius: 8, borderLeft: `3px solid ${ACCENT}`, background: "#1e2a36", fontSize: 14, fontWeight: 600, color: "#f2f5f8", lineHeight: 1.5 }}>
          <LocalRich field={topic.summary} lang={lang} />
        </div>
      )}
      {(topic.sections || []).map((section, i) => {
        const Section = SECTIONS[section.type];
        if (!Section) return null;
        return (
          <div key={i} id={sectionDomId(topic.key, i)} className={highlight === i ? "grammar-flash" : undefined} style={{ scrollMarginTop: 132, borderRadius: 10 }}>
            <Section section={section} lang={lang} />
            {section.book && <div style={{ marginTop: 4, fontSize: 11, color: "#8fb8d8", textAlign: "right" }}>📗 {section.book}</div>}
          </div>
        );
      })}
    </GrammarWordCtx.Provider>
  );
}

const textShape = PropTypes.oneOfType([PropTypes.string, PropTypes.objectOf(PropTypes.string)]);

const sectionShape = PropTypes.shape({
  type: PropTypes.oneOf(["table", "points", "warning"]).isRequired,
  title: textShape,
  head: PropTypes.arrayOf(textShape),
  rows: PropTypes.arrayOf(PropTypes.arrayOf(textShape)),
  items: PropTypes.arrayOf(textShape),
  text: textShape,
  id: PropTypes.string, // anchor for 📌 chapter links ("topic#id")
  book: PropTypes.string, // where it is in the textbook
});

const introShape = PropTypes.shape({
  what: textShape.isRequired,
  when: textShape.isRequired,
  english: textShape.isRequired,
  remember: PropTypes.shape({ de: PropTypes.string.isRequired, en: PropTypes.string.isRequired }).isRequired,
});

TopicBody.propTypes = {
  topic: PropTypes.shape({
    intro: introShape,
    summary: textShape,
    sections: PropTypes.arrayOf(sectionShape),
    explanation: textShape,
    key: PropTypes.string,
  }).isRequired,
  lang: PropTypes.string,
  onGlossary: PropTypes.func,
  highlight: PropTypes.number,
  onTopic: PropTypes.func,
};
TableSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
PointsSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
WarningSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
Rich.propTypes = { text: PropTypes.string.isRequired };
HowToTip.propTypes = { lang: PropTypes.string };
IntroRow.propTypes = { icon: PropTypes.string.isRequired, label: PropTypes.string.isRequired, children: PropTypes.node };
GlossCell.propTypes = { cell: PropTypes.shape({ t: PropTypes.string.isRequired, en: PropTypes.string.isRequired }).isRequired, showAll: PropTypes.bool, inline: PropTypes.bool };
TopicIntro.propTypes = { intro: introShape.isRequired, lang: PropTypes.string, onGlossary: PropTypes.func };

export default TopicBody;
