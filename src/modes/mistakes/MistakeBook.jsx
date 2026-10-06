import { useState } from "react";
import PropTypes from "prop-types";
import { FlipCard } from "../../components";
import { DECK_META } from "../../data";
import { CLEAR_AFTER_DAYS } from "../../engine";
import GrammarExercises from "../grammar/GrammarExercises";

// 📕 Fehlerheft: the words and grammar questions answered wrong anywhere in
// the app (engine/mistakes.js). Words are practised in a review session
// (onPracticeWords), grammar questions right here. Each entry leaves the
// list once it is answered right on CLEAR_AFTER_DAYS different days.

const ACCENT = "#e0833b";
const PAGE = 20;
const sectionTitle = { margin: "18px 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", textTransform: "uppercase" };
const rowStyle = {
  display: "flex", width: "100%", boxSizing: "border-box", alignItems: "center", gap: 10, textAlign: "left",
  padding: "10px 12px", marginBottom: 6, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b",
  color: "#f2f5f8", cursor: "pointer", font: "inherit",
};
const mainBtn = { width: "100%", padding: "11px 0", borderRadius: 12, border: "none", background: ACCENT, color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer" };

// "✗ 3 · ✓ 1/2 Tage"
function Tally({ wrong, rightDays }) {
  return (
    <span style={{ flexShrink: 0, fontSize: 11, color: "#7d8d9c", whiteSpace: "nowrap" }}>
      <span style={{ color: "#e07b6f" }}>✗ {wrong}</span>
      {rightDays.length > 0 && <span style={{ color: "#5fa85f" }}> · ✓ {rightDays.length}/{CLEAR_AFTER_DAYS}</span>}
    </span>
  );
}

function MistakeBook({ words, grammar, lang, onPracticeWords, onGrammarAnswer, onOpenChapter, onClose }) {
  const [open, setOpen] = useState(null); // id of the opened word
  const [shown, setShown] = useState(PAGE);
  // the grammar round is fixed when the book opens: answering clears entries,
  // which must not reshuffle the questions under the learner's finger
  const [grammarRound] = useState(() => grammar.map((g) => ({ ...g.item, topicTitle: g.topicTitle, mistakeId: g.id })));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#f2f5f8" }}>📕 Fehlerheft</h2>
        <button type="button" onClick={onClose} style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#9ab0c2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Schließen</button>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 }}>
        Alles, was du irgendwo falsch beantwortet hast. Ein Eintrag verschwindet, wenn du ihn an {CLEAR_AFTER_DAYS} verschiedenen Tagen richtig beantwortest.
      </p>

      {!words.length && !grammar.length && (
        <div role="status" style={{ textAlign: "center", padding: "40px 16px", color: "#7d8d9c", fontSize: 14 }}>
          🎉 Keine offenen Fehler.
        </div>
      )}

      {words.length > 0 && (
        <>
          <div style={sectionTitle}>🃏 Wörter · {words.length}</div>
          <button type="button" onClick={onPracticeWords} style={{ ...mainBtn, marginBottom: 10 }}>▶ Wörter wiederholen ({words.length})</button>
          {words.slice(0, shown).map(({ id, card, wrong, rightDays }) => {
            const meta = DECK_META[card.deck];
            const isOpen = open === id;
            return (
              <div key={id}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} style={{ ...rowStyle, borderColor: isOpen ? ACCENT : "#2c3a47" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{card.front}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#9ab0c2", marginTop: 2 }}>{card.english}</span>
                  </span>
                  <Tally wrong={wrong} rightDays={rightDays} />
                </button>
                {isOpen && (
                  <div style={{ margin: "4px 0 14px" }}>
                    <FlipCard
                      front={card.front}
                      sub={card.sub}
                      english={card.english}
                      example={card.example}
                      exampleEn={card.exampleEn}
                      type={card.type}
                      gender={card.gender}
                      deck={card.deck}
                      cardId={id}
                      lang={lang}
                      level={card.level}
                      source={card.source}
                      note={card.note}
                    />
                    {meta && (
                      <button type="button" onClick={() => onOpenChapter(card.deck, card.front)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
                        {meta.icon} {meta.label} öffnen →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {words.length > shown && (
            <button type="button" onClick={() => setShown(shown + PAGE)} style={{ ...rowStyle, justifyContent: "center", color: "#9ab0c2", fontSize: 13 }}>
              Mehr zeigen ({words.length - shown} weitere)
            </button>
          )}
        </>
      )}

      {grammarRound.length > 0 && (
        <>
          <div style={sectionTitle}>📖 Grammatik · {grammar.length}</div>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24" }}>
            <GrammarExercises
              items={grammarRound}
              lang={lang}
              onDone={() => {}}
              onAnswer={(item, correct) => onGrammarAnswer(item.mistakeId, correct)}
            />
          </div>
        </>
      )}
    </div>
  );
}

Tally.propTypes = { wrong: PropTypes.number.isRequired, rightDays: PropTypes.arrayOf(PropTypes.string).isRequired };

const entryShape = { id: PropTypes.string.isRequired, wrong: PropTypes.number.isRequired, rightDays: PropTypes.arrayOf(PropTypes.string).isRequired };

MistakeBook.propTypes = {
  words: PropTypes.arrayOf(PropTypes.shape({ ...entryShape, card: PropTypes.object.isRequired })).isRequired,
  grammar: PropTypes.arrayOf(PropTypes.shape({ ...entryShape, item: PropTypes.object.isRequired, topicTitle: PropTypes.string })).isRequired,
  lang: PropTypes.string,
  onPracticeWords: PropTypes.func.isRequired,
  onGrammarAnswer: PropTypes.func.isRequired,
  onOpenChapter: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MistakeBook;
