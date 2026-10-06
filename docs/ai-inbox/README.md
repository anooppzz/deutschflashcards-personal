# 📥 KI-Eingang – adding AI answers to the app

The learner saves AI answers they want in the app (in-app chat "📌 Für die App
vorschlagen", or pasted from the Claude/ChatGPT/Gemini websites with "＋ Text einfügen").
The app exports them as one Markdown file, `ki-eingang-YYYY-MM-DD.md`
(`src/engine/aiInbox.js` → `inboxMarkdown`). The learner attaches or pastes it into a
Claude Code chat: **"Bitte den KI-Eingang einarbeiten"**. This page is that session's
checklist.

**The AI answers are unchecked.** They are suggestions, not sources. Nothing goes in
because "the AI said so" – only what is correct German, fits A2 and isn't in the app yet.

## Steps

1. **Read** `CLAUDE.md` and `docs/ACTIVITY_LOG.md` as always. Keep the file the learner
   sent; if it was pasted, save it as `docs/ai-inbox/ki-eingang-YYYY-MM-DD.md` first.
2. **Per entry**, look at "Learner wants" and the note. If nothing is said, decide what
   is useful (usually cards for words, exercises or a few lines for grammar).
3. **Check the content** before using it:
   - Is the German correct (articles, plurals, Perfekt with haben/sein, cases, word
     order)? Fix it or leave it out. When unsure, say so – don't guess.
   - A2 level (B1 at most for DTZ phrases); everyday, integration-course language.
   - Does the app have it already? Search all decks (`src/data/decks/*.json`) for every
     word – **never duplicate cards** (CLAUDE.md rule 6) – and `topics.json` /
     `exercises.json` for the grammar point.
4. **Add** in the app's formats (CLAUDE.md sections):

   | Learner wants | Where | Notes |
   |---|---|---|
   | 🃏 Karten | the matching chapter in `extra-topics.json`, else the chapter `ki-eingang` ("📥 Aus dem KI-Eingang"; create it on first use) | full card format: `sub`, example with the word, `exampleEn`; `source`: `"KI-Eingang · YYYY-MM-DD"`; then `npm run ids:update` |
   | 📖 Grammatik-Text | a `points`/`warning` section or `examples` in the existing topic (`topics.json`); a new topic only if none fits | both languages `{de, en}`; tables ≤ 4 short columns |
   | ✏️ Übungen | `exercises.json` under the topic | format and "only one correct option" rule; no sentence that is already in the topic |
   | 💡 Sonstiges | ask the learner | – |

   Rewrite in the app's style (short, scannable, English meanings) instead of pasting
   the AI text. Don't copy long passages.
5. **Test and ship** as usual (`npm test`, `npm run lint`, `npm run build`, 360/390px
   check), one commit with an ACTIVITY_LOG entry.
6. **Report per entry** to the learner: ✅ taken (what, where) · ✏️ corrected (what was
   wrong in the AI answer) · ❌ left out (why: wrong, too advanced, already in the app).
7. **Archive**: move the file to `docs/ai-inbox/done/` with a short "Result" section at the
   end (the same per-entry report). Then tell the learner they can tap
   "🗑 Exportierte löschen" in the 📥 KI-Eingang.

## Privacy

The repo is public. The export holds only the learner's questions, notes and the AI
answers – no keys. If an entry contains anything personal, leave it out of the archived
file.
