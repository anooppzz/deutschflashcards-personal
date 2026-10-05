import { useState, useEffect, useRef, useContext } from "react";
import { genderColor } from "../../constants";
import { DECK_META, GRAMMAR_TOPICS } from "../../data";
import { idOf, translateText, submitCorrection, getCachedAiExample, grammarHintFor, isArticleCorrect } from "../../engine";
import { GrammarNavCtx } from "../../context/GrammarNavCtx";
import { speak } from "../../engine/speech";
import { faceStyle, badgeStyle, iconBtn } from "../../components/cardStyles";
import { FloatingNext } from "../../components";

function ArticleTrainer({ nouns, idx, choice, score, onChoose, onNext, totalAvailable, lang = "en" }) {
  const card = nouns.length ? nouns[idx % nouns.length] : null;
  const [aiEx, setAiEx] = useState(null); // only ever populated from a static example or a vestigial cached value; V1 never generates one
  const [peek, setPeek] = useState(false);
  const [transMeaning, setTransMeaning] = useState(null);
  const [transExEn, setTransExEn] = useState(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const exampleRef = useRef(null);
  const { openGrammar, linksFor } = useContext(GrammarNavCtx);
  // the card's fields as plain values, so the effects below re-run exactly
  // when the card changes
  const cardDeck = card ? card.deck : null;
  const cardFront = card ? card.front : null;
  const cardExample = card ? card.example : null;
  const cardEnglish = card ? card.english : null;
  useEffect(() => {
    setAiEx(null);
    setPeek(false);
    setCorrecting(false);
    setCorrectionText("");
    if (!cardFront || cardExample) return;
    let cancelled = false;
    getCachedAiExample(idOf(cardDeck, cardFront)).then((cached) => {
      if (!cancelled && cached) setAiEx(cached);
    });
    return () => { cancelled = true; };
  }, [cardDeck, cardFront, cardExample]);
  // Scroll the card's TOP edge into view once an answer is given. The
  // der/die/das buttons sit below the card, so on a scrolled-down mobile
  // view the reveal (✓/✗, the correct gender, meaning) can start above the
  // visible area - "block: start" aligns the card's top with the viewport
  // top, regardless of how tall the answered-state content grows below it.
  // (The wrapper's own bottom edge isn't a reliable anchor - its front/back
  // faces are absolutely positioned for the 3D flip, so the box never
  // actually grows to fit the back face's content - but the top edge is
  // unaffected by that and remains an accurate scroll target.)
  useEffect(() => {
    if (choice && exampleRef.current) {
      exampleRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [choice]);
  // #1+#4: translate the noun's meaning into the selected language (used by both the post-answer reveal and the peek button)
  useEffect(() => {
    setTransMeaning(null);
    if (!cardFront || lang === "en" || !cardEnglish) return;
    let cancelled = false;
    translateText(cardEnglish, lang, idOf(cardDeck, cardFront)).then((t) => { if (!cancelled) setTransMeaning(t); });
    return () => { cancelled = true; };
  }, [cardDeck, cardFront, cardEnglish, lang]);
  const shownExampleForTrans = card ? (card.example ? { de: card.example, en: card.exampleEn } : aiEx) : null;
  const shownExampleEn = shownExampleForTrans ? shownExampleForTrans.en : null;
  useEffect(() => {
    setTransExEn(null);
    if (!cardFront || lang === "en" || !shownExampleEn) return;
    let cancelled = false;
    translateText(shownExampleEn, lang, idOf(cardDeck, cardFront) + ":ex").then((t) => { if (!cancelled) setTransExEn(t); });
    return () => { cancelled = true; };
  }, [shownExampleEn, lang, cardDeck, cardFront]);

  if (!card) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎯</div>
        <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Keine Nomen in dieser Auswahl</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Wähle ein Thema mit Nomen (z. B. Kleidung, Essen, Haus).</div>
      </div>
    );
  }
  const word = card.front.replace(/^(der\/die|der|die|das)\s+/i, "");
  const right = isArticleCorrect(choice, card.gender);
  // after a wrong answer, the tip of a rule that covers this noun (e.g.
  // -ung -> die); only topics with a hint have one
  const tips = choice && !right
    ? linksFor(idOf(card.deck, card.front))
        .map((l) => ({ key: l.key, text: grammarHintFor(l, GRAMMAR_TOPICS, lang) }))
        .filter((t) => t.text)
    : [];
  const arts = [["der", "#4f86c6"], ["die", "#c6534f"], ["das", "#c69a3b"]];
  const displayMeaning = lang !== "en" && transMeaning ? transMeaning : card.english;
  const shownExample = card.example ? { de: card.example, en: card.exampleEn } : aiEx;
  const submitMeaningCorrection = () => {
    const text = correctionText.trim();
    if (!text) { setCorrecting(false); return; }
    submitCorrection(idOf(card.deck, card.front), lang, text);
    setTransMeaning(text);
    setCorrecting(false);
    setCorrectionText("");
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 14 }}>
        <span>{idx + 1} / {nouns.length}</span>
        <span>Punkte: {score.right} / {score.total}</span>
      </div>
      {typeof totalAvailable === "number" && totalAvailable > nouns.length && (
        <div style={{ fontSize: 11, color: "#5a6b78", textAlign: "center", marginTop: -6, marginBottom: 14 }}>
          📊 {nouns.length}/{totalAvailable} in dieser Runde · {totalAvailable - nouns.length} für später aufgehoben
        </div>
      )}
      {/* A17: flip animation - same perspective/rotateY mechanics as FlipCard. The
          front never reveals the gender via color (that would spoil the answer);
          only the back face, shown after a choice is made, gets the gender-colored
          border as a small reveal flourish. */}
      <div style={{ perspective: 1200 }} ref={exampleRef}>
        <div
          style={{
            position: "relative", width: "100%", minHeight: 320,
            transformStyle: "preserve-3d",
            transition: "transform .5s cubic-bezier(.4,.2,.2,1)",
            transform: choice ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT */}
          <div style={faceStyle("#2c3a47")}>
            {DECK_META[card.deck] && (
              <span style={badgeStyle("#7fb0d6")}>{DECK_META[card.deck].icon} {DECK_META[card.deck].label}</span>
            )}
            <div style={{ fontSize: 12, color: "#5a6b78", letterSpacing: 1, marginBottom: 10 }}>WELCHER ARTIKEL?</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#f2f5f8", textAlign: "center" }}>{word}</div>
            {peek ? (
              card.english && <div dir="auto" style={{ marginTop: 10, fontSize: 13, color: "#7fb0d6", fontStyle: "italic" }}>{displayMeaning}</div>
            ) : (
              <button
                onClick={() => setPeek(true)}
                style={{ marginTop: 10, background: "none", border: "none", color: "#7fb0d6", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >👁 Bedeutung zeigen</button>
            )}
          </div>
          {/* BACK */}
          <div style={{ ...faceStyle(choice ? genderColor(card.gender) : "#2c3a47"), transform: "rotateY(180deg)" }}>
            <div style={{ fontSize: 34, marginBottom: 4 }}>{right ? "✓" : "✗"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: right ? "#5fa85f" : "#c6534f" }}>
              {right ? "Richtig!" : "Nicht ganz."}
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: genderColor(card.gender) }}>
              {card.gender} {word}
            </div>
            {card.english && (
              <div dir="auto" style={{ marginTop: 6, fontSize: 13, color: "#cdd8e2" }}>{displayMeaning}</div>
            )}
            {lang !== "en" && (
              correcting ? (
                <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
                  <input
                    autoFocus
                    dir="auto"
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitMeaningCorrection(); } if (e.key === "Escape") { setCorrecting(false); setCorrectionText(""); } }}
                    placeholder="richtige Übersetzung…"
                    style={{ flex: 1, maxWidth: 200, padding: "4px 8px", borderRadius: 8, border: "1px solid #e0833b", background: "#161d24", color: "#f2f5f8", fontSize: 12, outline: "none" }}
                  />
                  <button onClick={submitMeaningCorrection} style={{ padding: "4px 9px", borderRadius: 8, border: "none", background: "#5fa85f", color: "#0e1419", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                  <button onClick={() => { setCorrecting(false); setCorrectionText(""); }} style={{ padding: "4px 9px", borderRadius: 8, border: "1px solid #2c3a47", background: "transparent", color: "#7d8d9c", fontSize: 12, cursor: "pointer" }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => { setCorrecting(true); setCorrectionText(displayMeaning); }}
                  style={{ display: "block", margin: "4px auto 0", background: "none", border: "none", color: "#5a6b78", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                >✗ falsch?</button>
              )
            )}
            {/* A2: plural / grammar info */}
            {card.sub && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#9ab0c2" }}>{card.sub}</div>
            )}
            {tips.map((t) => (
              <div key={t.key} style={{ marginTop: 10, fontSize: 12, color: "#8fb8d8", textAlign: "center", lineHeight: 1.4 }}>
                💡 {t.text}
                {openGrammar && (
                  <button
                    onClick={() => openGrammar(t.key)}
                    style={{ marginLeft: 6, background: "none", border: "none", color: "#8fb8d8", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  >📖 Regel</button>
                )}
              </div>
            ))}
            {/* A3: example sentence, static or cached - folded into the back face, same content that used to sit in a separate panel below */}
            {shownExample ? (
              <>
                <div style={{ marginTop: 14, fontSize: 13, color: "#cdd8e2", fontStyle: "italic", textAlign: "center", lineHeight: 1.5 }}>
                  „{shownExample.de}"
                  <button onClick={() => speak(shownExample.de)} style={{ ...iconBtn, fontSize: 13 }}>🔊</button>
                </div>
                {shownExample.en && (
                  <div dir="auto" style={{ marginTop: 4, fontSize: 11, color: "#7d8d9c", textAlign: "center" }}>
                    {lang !== "en" && transExEn ? transExEn : shownExample.en}
                  </div>
                )}
              </>
            ) : (
              <div style={{ marginTop: 14, fontSize: 11, color: "#5a6b78", textAlign: "center", fontStyle: "italic" }}>
                kein Beispielsatz für dieses Wort
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {arts.map(([a, c]) => {
          const answered = Boolean(choice);
          const isCorrect = isArticleCorrect(a, card.gender);
          const isChosen = a === choice;
          let bg = "#1a232b", col = c, bd = c;
          if (answered) {
            if (isCorrect) { bg = "#5fa85f"; col = "#0e1419"; bd = "#5fa85f"; }
            else if (isChosen) { bg = "#c6534f"; col = "#fff"; bd = "#c6534f"; }
            else { col = "#55636e"; bd = "#2c3a47"; }
          }
          return (
            <button
              key={a}
              onClick={() => !answered && onChoose(a)}
              style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: `2px solid ${bd}`, background: bg, color: col, fontSize: 18, fontWeight: 800, cursor: answered ? "default" : "pointer" }}
            >{a}</button>
          );
        })}
      </div>
      {choice && <FloatingNext onNext={onNext} autoFocus={true} />}
    </div>
  );
}

export default ArticleTrainer;
