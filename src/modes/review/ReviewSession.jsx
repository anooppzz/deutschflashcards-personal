import { useState } from "react";
import PropTypes from "prop-types";
import { FlipCard } from "../../components";
import { DECK_META } from "../../data";
import { idOf } from "../../engine";

// "📅 Heute fällig": the cards whose review date has come, from every deck
// at once (spaced repetition, see engine/fsrs.js). Flip, then grade
// honestly - "Gewusst" pushes the card further out, "Nicht gewusst" brings
// it back soon. Each grade is a real review (onGrade), the same as a quiz
// answer, so it also counts toward the daily goal.

const gradeBtn = (color, filled) => ({
  flex: 1, padding: "12px 8px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${color}`, background: filled ? color : "transparent", color: filled ? "#0e1419" : color,
});
const linkBtn = { background: "none", border: "none", color: "#7d8d9c", fontSize: 13, cursor: "pointer", padding: 4 };

// title: the session's name in its header (🆕 Neue Wörter from the daily plan)
function ReviewSession({ cards, lang, onGrade, onExit, onRepeat, moreCount, onMore, title = "📅 Wiederholung" }) {
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState([]);
  const done = idx >= cards.length;

  if (done) {
    const right = cards.length - missed.length;
    return (
      <div role="status" style={{ textAlign: "center", padding: "24px 8px" }}>
        <div aria-hidden="true" style={{ fontSize: 40 }}>{missed.length ? "💪" : "🎉"}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f2f5f8", marginTop: 6 }}>Wiederholung fertig</div>
        <div style={{ fontSize: 14, color: "#cdd8e2", marginTop: 6 }}>
          <span style={{ color: "#5fa85f" }}>✓ {right} gewusst</span> · <span style={{ color: "#e07b6f" }}>✗ {missed.length} nicht gewusst</span>
        </div>
        {missed.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "16px auto 0", maxWidth: 360, textAlign: "left" }}>
            {missed.map((c) => (
              <li key={idOf(c.deck, c.front)} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 10, background: "#1a232b", border: "1px solid #2c3a47", fontSize: 13, color: "#cdd8e2" }}>
                <b style={{ color: "#f2f5f8" }}>{c.front}</b> – {c.english}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, margin: "18px auto 0" }}>
          {missed.length > 0 && <button type="button" onClick={() => onRepeat(missed)} style={gradeBtn("#e0833b", true)}>↻ Falsche nochmal ({missed.length})</button>}
          {moreCount > 0 && <button type="button" onClick={onMore} style={gradeBtn("#e0833b", !missed.length)}>📅 Weitere fällige Karten ({moreCount})</button>}
          <button type="button" onClick={onExit} style={gradeBtn("#7d8d9c", false)}>Fertig</button>
        </div>
      </div>
    );
  }

  const card = cards[idx];
  const id = idOf(card.deck, card.front);
  const grade = (correct) => {
    onGrade(id, correct);
    if (!correct) setMissed((m) => [...m, card]);
    setIdx(idx + 1);
  };
  const meta = DECK_META[card.deck];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#cdd8e2" }}>{title} · {idx + 1} / {cards.length}</span>
        <button type="button" onClick={onExit} style={linkBtn}>Beenden ×</button>
      </div>
      <div aria-hidden="true" style={{ height: 4, borderRadius: 3, background: "#1e2630", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${(idx / cards.length) * 100}%`, height: "100%", background: "#e0833b", transition: "width .3s" }} />
      </div>
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
        showMarks={false}
      />
      <div style={{ fontSize: 12, color: "#7d8d9c", textAlign: "center", margin: "10px 0 8px" }}>
        Erst umdrehen, dann ehrlich bewerten{meta ? ` · ${meta.icon} ${meta.label}` : ""}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => grade(false)} style={gradeBtn("#e07b6f", false)}>✗ Nicht gewusst</button>
        <button type="button" onClick={() => grade(true)} style={gradeBtn("#5fa85f", true)}>✓ Gewusst</button>
      </div>
    </div>
  );
}

ReviewSession.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.shape({
    deck: PropTypes.string.isRequired,
    front: PropTypes.string.isRequired,
    english: PropTypes.string,
  })).isRequired,
  lang: PropTypes.string,
  onGrade: PropTypes.func.isRequired,
  onExit: PropTypes.func.isRequired,
  onRepeat: PropTypes.func.isRequired,
  moreCount: PropTypes.number,
  title: PropTypes.string,
  onMore: PropTypes.func,
};

export default ReviewSession;
