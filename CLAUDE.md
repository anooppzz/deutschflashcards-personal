# Deutsch Flashcards – guide for agents

Read this first, then `docs/ACTIVITY_LOG.md` (pending work and history). Both are the
handoff between chat sessions: a new session should be able to continue from them alone.

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
  change it.

## Commands

```bash
npm ci          # install
npm test        # vitest – must pass
npm run lint    # oxlint – 57 warnings already exist; add no new ones
npm run build   # dist/index.html
npm run dev     # local dev server
```

## Rules for agents

1. **Start** by reading `docs/ACTIVITY_LOG.md`. Check `git status` and `git log -5`.
2. **Commit straight to `main`** and push; no branches or pull requests unless the
   learner asks. Use a clear subject and a body that says what and why.
3. **Before every push:** `npm test`, `npm run lint` (warning count unchanged),
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
  extra-topics.json        the textbook chapters: [{ key, icon, label, note, cards: [...] }]
  haushalt|kleidung|verkehr.json, irregular-verbs.json, inseparable-verbs.json
  _deck-manifest.json      labels/icons for the five non-chapter decks
src/data/grammar/topics.json   grammar reference (the Grammatik tab)
src/data/index.js          exports; ALL_CARDS = every card in one flat list
src/engine/                logic: FSRS scheduling, search, filters, grammarLinks.js
src/modes/                 one folder per study mode (cards, article, quiz, reverse,
                           cloze, wordsearch, grammar)
src/components/FlipCard.jsx  the card (front/back, note, 📖 grammar chips)
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
  Nomen & Artikel · Verben · Adjektive · Satz & Fragen · Präpositionen.
- Tables must fit a 360px phone: at most ~4 short columns; put long text in bullets.
- `match` rules link cards automatically: `type`, `gender`, `decks`, `endings`,
  `subPattern` (regex on `sub`). Gender rules only link cards whose gender agrees.
  Anything else: add the topic key to the card's `grammar` list.
- `src/modes/grammar/grammarContent.test.js` checks both languages, table row
  lengths, balanced `**`, groups; `src/engine/grammarLinks.test.js` checks that every
  `grammar` tag names an existing topic.

## Editing the JSON

`extra-topics.json` and the deck files round-trip through
`json.dump(data, f, ensure_ascii=False, indent=2)` plus a final newline, so Python edits
keep the diff small. `topics.json` uses a compact style (short objects on one line,
width ~118); keep it when rewriting.
