# Deutsch Flashcards – guide for agents

Read this first, then `docs/ACTIVITY_LOG.md` (pending work and history). Both are the
handoff between chat sessions: a new session should be able to continue from them alone.

## ⚠️ Where to work – read before changing anything

- **The only repo to change:** `anooppzz/deutschflashcards-personal`, branch `main`.
  The live app is built from it and nothing else.
- **Not** `anooppzz/deutschflashcards` – the old, retired app. New cloud sessions may
  start in that repo by default. If your working directory is a checkout of it (it has
  no `CLAUDE.md`, only a `src/` with an old single-file app), **stop**: clone
  `https://github.com/anooppzz/deutschflashcards-personal` and work there.
- **Check before you say "done":** the commit is on `main` of the personal repo
  (`git log origin/main -1`), the Actions run for it is green (build + deploy), and the
  learner can see it: the app shows **"Version <date> · <commit>"** at the very bottom
  – tell the learner which commit to look for.
- **"Bitte den KI-Eingang einarbeiten" / a `ki-eingang-*.md` file?** Follow
  `docs/ai-inbox/README.md`: AI answers are unchecked suggestions – verify, dedupe, add
  in the app's formats, report per entry, archive in `docs/ai-inbox/done/`.
- **New chapter?** Give it `"added": "YYYY-MM-DD"` (today). For three weeks the start
  screen shows "🆕 Neues Kapitel … Öffnen →", because new chapters are not ticked
  under 📚 Themen automatically and are easy to miss. Also write its 📰 Lesen text
  (see "Reading texts" below) – every chapter has one.

## The project

A personal German vocabulary and grammar trainer for one learner: an English speaker
studying A2 German with the **Menschen A2** textbook (Hueber). The learner sends photos
of textbook pages ("Lernwortschatz", grammar boxes) and asks to turn them into cards and
grammar topics.

- **Repo:** https://github.com/anooppzz/deutschflashcards-personal (public, work on `main`)
- **Live app:** https://anooppzz.github.io/deutschflashcards-personal/ – rebuilt and
  published by GitHub Actions on every push to `main` (about a minute)
- **Stack:** React 19 + Vite 8, tests with Vitest, lint with Oxlint. The build inlines
  everything into one self-contained `dist/index.html` (`vite-plugin-singlefile`).
- **Legacy:** `anooppzz/deutschflashcards` is the old repo (built bundle only). Don't
  change it – its only addition is a `CLAUDE.md` pointing here (2026-10-06).

## Commands

```bash
npm ci          # install
npm test        # vitest – must pass
npm run lint    # oxlint – 0 warnings; keep it that way
npm run build   # dist/index.html
npm run dev     # local dev server
npm run ids:update  # after adding/renaming/removing cards (see rule 6b)
```

## Rules for agents

1. **Start** by reading `docs/ACTIVITY_LOG.md`. Check `git status` and `git log -5`.
2. **Commit straight to `main`** and push; no branches or pull requests unless the
   learner asks. Use a clear subject and a body that says what and why.
3. **Before every push:** `npm test`, `npm run lint` (0 warnings),
   `npm run build`. For anything visible, open the build in a browser (Playwright +
   Chromium work in this environment) at **360px and 390px** width: no table or page may
   scroll sideways.
4. **After pushing,** point the learner to the live link. **Don't send the built HTML
   file** unless they ask for it. Check the Actions run finished green, including the
   `deploy` job. (Cloud agent sandboxes may not reach `github.io`; the deploy job's
   result is the check then.)
5. **Update `docs/ACTIVITY_LOG.md` in the same commit:** add a log entry, and add or
   close items under "Pending".
6. **Never duplicate cards.** Search all decks for a word before adding it. Words may
   exist in another chapter; adding the same word to a new chapter is fine only when
   the learner asks for it (progress is tracked per chapter).
6b. **Never lose the learner's progress.** Progress is stored per card id
   (`deck::front`). Changing a `front` (even a typo), moving a card to another chapter
   or deleting it: add `"old-id": "new-id"` (or `"old-id": null` for a deletion) to
   `src/data/renames.json`, then run `npm run ids:update`. `src/data/cardIds.test.js`
   fails until both are done; the app moves the progress on the next load.
7. **Read textbook photos carefully.** Transcribe exactly (articles, plural markers,
   A:/CH: variants). Say which readings you're unsure of instead of guessing silently.
8. **Explain the way the learner likes:** scannable – a one-line rule, tables for forms
   (one person/case per row), short bullets, a "watch out" line, English meanings for
   everything. Point out mistakes in the learner's own exercise answers kindly.
9. **Ask before** anything big or destructive (deleting data, rewriting history,
   changing repo settings). Only the learner can change GitHub settings.

## Where things are

```
src/data/decks/            vocabulary
  extra-topics.json        the textbook chapters: [{ key, icon, label, added, note, cards: [...] }]
                           (added: "YYYY-MM-DD" when created – drives the 🆕 banner)
  haushalt|kleidung|verkehr.json, irregular-verbs.json, inseparable-verbs.json
  _deck-manifest.json      labels/icons for the five non-chapter decks
src/data/grammar/topics.json   grammar reference (the Grammatik tab)
src/data/grammar/exercises.json  ✏️ Üben questions per topic (see below)
src/data/reading/texts.json  📰 Lesen: one short A2 text per chapter (see below)
src/data/exam/dtz-sets.json  🎓 DTZ practice sets (Hören 1–20 + Lesen 21–45) – the format
                           is in docs/DTZ_FORMAT.md; follow it exactly for new sets
src/data/index.js          exports; ALL_CARDS = every card in one flat list
src/engine/                logic: FSRS scheduling, filters, grammarLinks.js,
                           globalSearch.js (app-wide search: cards + grammar)
                           review.js ("Heute fällig": due cards from all decks)
                           useBackButton.js (phone back gesture steps back inside
                           the app – App.jsx `backAction` lists the layers in order;
                           add a new overlay/dialog there)
src/modes/cards/deckViews.js  how each deck shows in Karten mode (banner, filter, badge)
src/modes/                 one folder per study mode (cards, article, quiz, reverse,
                           cloze, wordsearch, grammar) + search (results view)
                           + review ("Heute fällig" session)
                           + forms (🔁 Formen: Perfekt + Plural, built from each
                           card's sub line – keep `sub` formats as below)
                           + reverse also has 🎧 Hören: the phone says the card, the
                           learner types it (validation.js isDictatable/checkDictation)
src/components/FlipCard.jsx  the card (front/back, note, 📖 grammar chips)
src/components/Swipeable.jsx  swipe left/right on a card = next/previous
src/components/AudioControls.jsx  ▶ / ⏸ Pause / ▶ Weiter / ⏹ Stopp for longer texts (DTZ Hören,
                           Lesen Vorlesen); engine/speech.js createPlayer speaks sentence by
                           sentence, so Pause resumes at the cut-off sentence
src/components/Reveal.jsx  wrap anything that opens below a tap (a word's card): scrolls it
                           on screen. App.jsx showContent() does the same for tabs/views
src/components/LookupLinks.jsx  🔎 Nachschlagen (Duden, DWDS, Verbformen, Reverso, Leo,
                           Google) + "🤖 Frag: Claude · ChatGPT · Gemini" under a flipped
                           card and a grammar topic; URLs and questions in
                           engine/lookup.js (Claude/ChatGPT take ?q=, Gemini can't – the
                           question is copied to paste). Free: only links
src/engine/ai.js           🤖 KI-Assistent (OFF by default; footer "🤖 KI-Assistent: an/aus"):
                           Gemini (free tier, REST) or Claude (prepaid, official SDK,
                           low effort + server-side fallbacks on Opus/Sonnet). The
                           learner's own key is stored under DEVICE_ONLY_KEYS.AI – never
                           add it to STORAGE_KEYS (that would put the key in the backup
                           file) and never put a key in the repo (it is public).
                           Keys are ENCRYPTED (engine/aiVault.js): password (PBKDF2) +
                           optional fingerprint/screen lock (passkey + WebAuthn PRF);
                           unlocked in memory only, 15 min idle lock; a saved key is
                           never shown again. Never store or log a key in clear.
                           UI: AiKeySection.jsx, AiUnlock.jsx
src/engine/aiInbox.js      📥 KI-Eingang: answers saved from the chat ("📌 Für die App
                           vorschlagen") or pasted; export = one Markdown file
                           (📤 Teilen / ⬇ Datei / 📋 Kopieren) for docs/ai-inbox/README.md.
                           UI: components/AiInboxModal.jsx, InboxWantsForm.jsx
                           UI: components/AiSettingsModal.jsx, AiChat.jsx ("✨ KI fragen"
                           under a flipped card / grammar topic via context/AiCtx.js),
                           AiText.jsx + engine/aiText.js (safe mini-Markdown, no HTML)
src/engine/mistakes.js     📕 Fehlerheft: every wrong answer (App.jsx reviewResult +
                           grammar exercises) until right on 2 different days;
                           view in modes/mistakes/MistakeBook.jsx
src/engine/newTopics.js    🆕 Neues Kapitel banner (see "added" above)
src/engine/dailyPlan.js    🎯 Heute lernen (start screen): due reviews, new words (daily
                           goal), Fehlerheft, one grammar topic; card: components/DailyPlan.jsx,
                           steps built in App.jsx (planSteps)
src/engine/grammarReview.js  📅 grammar topics come back: ✏️ Üben ≥ 80% → 3, 8, 20 … days,
                           else tomorrow; "📅 fällig" chip in the Grammatik tab
src/engine/reading.js      📰 Lesen: [[surface|front]] links in texts → cards
src/modes/satzbau/         🧩 Satzbau: order the words of a card's example sentence
                           (first word given; 4–10 words; no …, /, quotes)
src/modes/reading/         📰 Lesen view (list, text, linked words, questions)
src/modes/exam/            🎓 DTZ trainer: dtz.js (scoring 20 → A2, 33 → B1), DtzTrainer.jsx
                           (practise a Teil / timed simulation / results); the learner's
                           exam is the DTZ (integration course) – see docs/DTZ_FORMAT.md
                           ✍️ Schreiben: writing.js (checklist, criteria, 7 → A2, 15 → B1,
                           AI review prompt) + WritingTrainer.jsx; tasks in
                           src/data/exam/dtz-schreiben.json (pairs A/B)
src/constants/build.js     "Version <date> · <commit>" at the bottom (set in vite.config.js)
src/components/HelpModals.jsx  welcome + ❓ help windows; texts in src/data/help.json
                           (en, de, sq, ar, uk, hi – keep all six when editing)
src/components/BackupModal.jsx  "💾 Sichern & App": backup file, restore, install hint
src/engine/backup.js       what a backup holds (STORAGE_KEYS + corr_*), parse/restore
src/engine/pwa.js, public/ installable app: manifest, icons, sw.js (offline cache;
                           page network-first, so deploys arrive at once; bump
                           CACHE in sw.js only if icons/manifest change)
```

Chapters in `extra-topics.json` appear automatically as topic buttons; nothing else
needs registering. The last chapter, `persoenlich` ("Meine Wörter" ⭐), is where the
learner's own single words go.

## Card format (`extra-topics.json` → `cards`)

```jsonc
{
  "type": "n",                    // n (noun), v (verb), adj, sonst (phrase / other)
  "gender": "die",                // nouns only: der / die / das (or "der/die")
  "front": "die Rechnung",        // nouns with article
  "sub": "Pl. -en",               // see below
  "english": "bill",
  "example": "Können wir bitte die Rechnung haben?",
  "exampleEn": "Could we have the bill, please?",
  "note": "…",                    // optional one-line tip on the back
  "level": "A2",                  // A1 or A2
  "source": "Menschen A2 · Einheit 10",   // chapter cards from the textbook
  "grammar": ["praep-dativ"],     // optional hand links to grammar topics
  "acceptableAlternates": ["…"]   // optional TRUE synonyms only (Cloze accepts them)
}
```

`sub` conventions:
- nouns: `Pl. -en`, `Pl. ¨-er`, `Pl. -`, `kein Plural`, `nur Plural`; regional variants
  after a dot: `Pl. -n · CH: der Krug, ¨-e`, `Pl. -e · A: das Gasthaus, ¨-er`
- verbs: the Perfekt form, `hat reserviert` / `ist gesunken`, or `ritt · ist geritten`
  (a `hat …`/`ist …` sub links the verb to the Perfekt topic automatically)
  Every verb needs one – a test checks it. Modal verbs show the Präteritum instead
  (`konnte`) and carry `"grammar": ["modalverben"]`.
- adjectives: an opposite as `↔ unangenehm`
- phrases: alternatives as `auch: Ich nehme …`

The example should contain the front word (Cloze blanks it out; cards whose word isn't
found in the example are left out of Cloze, which is fine for phrases).

## Grammar topic format (`topics.json`)

```jsonc
{
  "key": "praep-dativ",
  "level": "A1",
  "group": {"de": "Präpositionen", "en": "Prepositions"},
  "title": {"de": "Präpositionen mit Dativ", "en": "Prepositions with the Dative"},
  "summary": {"de": "…", "en": "…"},          // the rule in one line
  "sections": [
    {"type": "table", "title": {…}, "head": [cell, …], "rows": [[cell, …], …]},
    {"type": "points", "title": {…}, "items": [{"de": "…", "en": "…"}, …]},
    {"type": "warning", "text": {"de": "…", "en": "…"}}
  ],
  "examples": [{"de": "…", "en": "…"}],
  "hint": {"de": "…{ending}…", "en": "…"},    // optional, Artikel-trainer tip
  "match": {…} or [{…}, …]                     // optional rules that link cards
}
```

- Every text is `{de, en}`; a table cell may be a plain string (German forms).
  `**x**` highlights x (use it for endings: `wohn**st**`). Use ❌/✅ for wrong/right.
- Topics of one `group` must sit together; groups are headings in the Grammatik tab:
  Nomen & Artikel · Verben · Adjektive · Satz & Fragen · Konnektoren · Präpositionen.
- Tables must fit a 360px phone: at most ~4 short columns; put long text in bullets.
- `match` rules link cards automatically: `type`, `gender`, `decks`, `endings`,
  `subPattern` (regex on `sub`), `frontPattern` (regex on `front`), `except` (card
  fronts to skip). Gender rules only link cards whose gender agrees.
  Anything else: add the topic key to the card's `grammar` list.
- `src/modes/grammar/grammarContent.test.js` checks both languages, table row
  lengths, balanced `**`, groups; `src/engine/grammarLinks.test.js` checks that every
  `grammar` tag names an existing topic.

## Grammar exercises (`exercises.json`)

`{ "topic-key": [ { "q": "Ich warte ___ den Bus.", "options": ["auf", "für", "an"],
"answer": "auf", "en": "I'm waiting for the bus.", "why": {"de": "…", "en": "…"} } ] }`
– one `___` per question, 3 options (shuffled in the app), a one-line reason in both
languages. Ending questions use options like `"-en"` and `"keine Endung"`. 10 per topic
(a new topic needs ≥ 4). Only one option may be correct German – no "Kannst/Könntest"
pairs where both work. One question per line in the file. Tests check the format and that no question repeats a
sentence from its own topic (the answer would be on screen right above it).

## Reading texts (`reading/texts.json`)

One per chapter (`key` = `deck` = chapter key), 3 short paragraphs of A2 German using
that chapter's words, with an English translation per paragraph and 3 questions:

`{ "key", "deck", "level": "A2", "title", "paragraphs": ["… [[Wohnung|die Wohnung]] …"],
"en": ["…"], "questions": [{ "q", "en", "answer": "richtig" }, { "q", "en",
"options": ["…", "…", "…"], "answer": "…" }] }`

- `[[surface|card front]]` makes a word tappable; `[[front]]` when the text shows the
  front unchanged. A separable verb can link the whole phrase (`[[kommt er an|ankommen]]`).
- A question without `options` is "Richtig oder falsch?".
- `engine/reading.test.js` fails if a link has no card or a question is malformed.

## Editing the JSON

`extra-topics.json` and the deck files round-trip through
`json.dump(data, f, ensure_ascii=False, indent=2)` plus a final newline, so Python edits
keep the diff small. `topics.json` uses a compact style (short objects on one line,
width ~118); keep it when rewriting.
