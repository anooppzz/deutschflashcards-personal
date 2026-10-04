import { useState, useEffect, useRef } from "react";
import { DECK_META } from "../../data";
import { idOf, translateText, getCachedAiExample } from "../../engine";
import { speak } from "../../engine/speech";
import { badgeStyle, iconBtn } from "../../components/cardStyles";
import { FloatingNext } from "../../components";

/* Multiple-choice translation quiz */
function QuizTrainer({ questions, idx, choice, score, onChoose, onNext, lang = "en" }) {
  const q = questions.length ? questions[idx % questions.length] : null;
  const [aiEx, setAiEx] = useState(null); // only ever populated from a static example or a vestigial cached value; V1 never generates one
  const [transOptions, setTransOptions] = useState(null);
  const [transExEn, setTransExEn] = useState(null);
  const exampleRef = useRef(null);
  // the question's fields as plain values, so the effects below re-run
  // exactly when the question changes (options as one string: they are
  // fixed for a question)
  const qDeck = q ? q.deck : null;
  const qFront = q ? q.front : null;
  const qExample = q ? q.example : null;
  const qOptions = q ? JSON.stringify(q.options) : "[]";
  useEffect(() => {
    setAiEx(null);
    if (!qFront || qExample) return; // no question yet, or it already has a static example
    let cancelled = false;
    getCachedAiExample(idOf(qDeck, qFront)).then((cached) => {
      if (!cancelled && cached) setAiEx(cached);
    });
    return () => { cancelled = true; };
  }, [qDeck, qFront, qExample]);
  // #1+#4: translate the 4 answer options into the selected language, cached per option text
  useEffect(() => {
    setTransOptions(null);
    if (!qFront || lang === "en") return;
    let cancelled = false;
    Promise.all(JSON.parse(qOptions).map((opt) => translateText(opt, lang, idOf(qDeck, qFront) + ":opt:" + opt))).then((res) => {
      if (!cancelled) setTransOptions(res);
    });
    return () => { cancelled = true; };
  }, [qDeck, qFront, qOptions, lang]);
  // bring the example panel into view once an answer is given, so it's never hidden below the fold on mobile
  useEffect(() => {
    if (choice && exampleRef.current) {
      exampleRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [choice]);
  const shownExample = q ? (q.example ? { de: q.example, en: q.exampleEn } : aiEx) : null;
  // #1+#4: translate the example's English line too, once an answer has been given
  const shownExampleEn = shownExample ? shownExample.en : null;
  useEffect(() => {
    setTransExEn(null);
    if (!qFront || lang === "en" || !shownExampleEn) return;
    let cancelled = false;
    translateText(shownExampleEn, lang, idOf(qDeck, qFront) + ":ex").then((t) => { if (!cancelled) setTransExEn(t); });
    return () => { cancelled = true; };
  }, [shownExampleEn, lang, qDeck, qFront]);

  if (!q || questions.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
        <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Zu wenige Karten für ein Quiz</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Wähle ein Thema mit mehr Wörtern.</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 14 }}>
        <span>{idx + 1} / {questions.length}</span>
        <span>Punkte: {score.right} / {score.total}</span>
      </div>
      <div style={{ position: "relative", background: "#161d24", border: "2px solid #2c3a47", borderRadius: 18, padding: "30px 20px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.45)" }}>
        {DECK_META[q.deck] && (
          <span style={badgeStyle("#7fb0d6")}>{DECK_META[q.deck].icon} {DECK_META[q.deck].label}</span>
        )}
        <div style={{ fontSize: 12, color: "#5a6b78", letterSpacing: 1, marginBottom: 10 }}>WAS BEDEUTET?</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#f2f5f8" }}>
          {q.front}
          <button onClick={() => speak(q.front)} style={{ ...iconBtn, fontSize: 16 }}>🔊</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {q.options.map((opt, i) => {
          const answered = Boolean(choice);
          const isCorrect = opt === q.answer;
          const isChosen = opt === choice;
          let bg = "#1a232b", col = "#cdd8e2", bd = "#2c3a47";
          if (answered) {
            if (isCorrect) { bg = "#5fa85f"; col = "#0e1419"; bd = "#5fa85f"; }
            else if (isChosen) { bg = "#c6534f"; col = "#fff"; bd = "#c6534f"; }
            else { col = "#55636e"; }
          }
          const label = lang !== "en" && transOptions ? transOptions[i] : opt;
          return (
            <button
              key={opt}
              dir="auto"
              onClick={() => !answered && onChoose(opt)}
              style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${bd}`, background: bg, color: col, fontSize: 14, fontWeight: 600, cursor: answered ? "default" : "pointer", textAlign: "left" }}
            >{label}</button>
          );
        })}
      </div>
      {choice && (
        <div ref={exampleRef} style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#161d24", border: "1px solid #2c3a47", scrollMarginBottom: 90 }}>
          {shownExample ? (
            <>
              <div style={{ fontSize: 13, color: "#cdd8e2", fontStyle: "italic", textAlign: "center" }}>
                „{shownExample.de}"
                <button onClick={() => speak(shownExample.de)} style={{ ...iconBtn, fontSize: 13 }}>🔊</button>
              </div>
              {shownExample.en && (
                <div dir="auto" style={{ marginTop: 4, fontSize: 11, color: "#7d8d9c", textAlign: "center" }}>{lang !== "en" && transExEn ? transExEn : shownExample.en}</div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", fontSize: 11, color: "#5a6b78", fontStyle: "italic" }}>
              kein Beispielsatz für dieses Wort
            </div>
          )}
        </div>
      )}
      {choice && <FloatingNext onNext={onNext} autoFocus={true} />}
    </div>
  );
}

export default QuizTrainer;
