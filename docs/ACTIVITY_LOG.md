# Activity log

The handoff between chat sessions. **Pending** is what's open; the **log** below is what
was done, newest first. Every change adds a log entry here in the same commit
(see `CLAUDE.md`, rule 5).

## Pending

- [ ] **Old repo leftovers:** branch `claude/epic-meitner-f5b32y` in
  `anooppzz/deutschflashcards` couldn't be deleted by the agent (403). The learner can
  delete it on GitHub or leave it.
- [ ] 57 lint warnings predate this log (unused imports/catch variables, hook
  dependencies in `App.jsx`, `FlipCard.jsx`, `ArticleTrainer.jsx`, `speech.js`).
  Don't add new ones; cleaning them up is optional.
- [ ] Ideas, not requested yet: tapping a word under "Deine Wörter" could open its card
  (now it only speaks it); grammar text exists only in German and English (other app
  languages fall back to English).
- [ ] Offered, not requested yet: a grammar topic "Verben mit Präposition" (warten auf,
  denken an, sprechen über …).
- [ ] Asked, no answer yet: remove *streiten* from Meine Wörter now that
  *streiten (sich)* is in Firma & Produkte? (Kept both until the learner says so.)

## Log

### 2026-09-30
- **Grammar topic "Reflexive Verben"** (`reflexive-verben`, group Verben, after
  Modalverben): pronoun table (Akk./Dat.), how to remember, the learner's 12 verbs with
  their prepositions and cases, where *sich* goes (7 sentence types), with/without *sich*,
  two ⚠️ pitfalls. Rule: verbs whose sub has "hat sich …" link automatically; hand tags
  on *anmelden*, *sich Sorgen machen*, *entschuldigen*, *streiten* (Meine Wörter).
  16 words linked. Fixed *kümmern (sich)*: "hat gekümmert" → "hat sich gekümmert".
- **Chapter "Firma & Produkte"** 🏢 (`firma-produkte`, Menschen A2 · Einheit 11,
  Lernwortschatz page): 31 cards – In der Firma, Produkte, Glückwünsche, weitere
  wichtige Wörter. The page names no chapter title, so the label is by content.
  *viel Erfolg / viel Glück* are phrase cards next to the existing nouns *der Erfolg*,
  *das Glück*; *streiten (sich)* is in the chapter as the book lists it, and also stays in
  Meine Wörter. *jung, stark* link to Komparativ; *meiner Meinung nach* to Wortstellung
  and Dativ. A buildGrammarIndex test no longer depends on a topic having no words.
- **Perfekt on every verb card** (the learner asked whether Partizip II and Perfekt are
  on the cards). Before, the irregular deck showed the Partizip II without *hat/ist*, and
  70 chapter verbs showed no Perfekt at all.
  - Irregular deck: new field `hilfsverb`; cards now read *fuhr · ist gefahren*
    (7 with *ist*: fallen, fahren, wachsen, fliegen, bleiben, steigen, gehen).
  - 70 chapter verbs got their Perfekt in `sub` (e.g. *ist angekommen*, *hat eingekauft*,
    *hatte · hat gehabt*, *wusste · hat gewusst*), so they also link to the Perfekt topic.
  - Modal verbs show the Präteritum instead (*konnte*, *wollte*, *durfte*, *musste*;
    *möchten* → *wollte*). The Modalverben topic got a past-tense table, "how to
    remember" bullets and a *möchten* warning.
  - New tests: every verb links to Perfekt or Modalverben; irregular subs show hat/ist.
  - Fixed the *bieten* example (it used *anbieten*: "bietet … an").
- *streiten* added to Meine Wörter (*stritt · hat gestritten*, note: *sich streiten mit /
  über*, *der Streit*).

### 2026-09-29
- **Textbook page "Deshalb, sonst, dann, danach – Hauptsätze verbinden (Position 1)"**
  was already covered by the Konnektoren topic (key `konnektoren-adverbien`), so it was
  extended instead of duplicated: renamed "deshalb, sonst, dann, danach (Position 1)",
  the book's 1–2–3 table and sentences, the three meanings (Folge / sonst = wenn nicht
  … dann … / Zeit), plus sonst ≠ sondern, endlich vs zum Schluss, "und dann",
  "Wenn …, dann …", full stop or comma, vorher / nachher. Linked *zuletzt* and
  *endlich*; *deshalb* accepts *deswegen / darum*; new cards *vorher*, *nachher*.
- **Konnektoren section** (new group, 4 topics): overview of the three types (verb stays /
  goes to the end / comes right after), *und, aber, oder, denn, sondern* (ADUSO,
  sondern vs aber, two-part connectors), *Nebensätze: dass, weil, wenn, ob, als*
  (replaces "Nebensatz mit dass", key `nebensatz`; adds wenn/als/ob, indirect questions,
  "verb, verb"), *deshalb, trotzdem, dann, danach …* (storytelling order, danach vs
  nachdem, *also* false friend). B1 connectors (obwohl, damit, bevor, nachdem,
  während) are only mentioned.
  - 10 new cards in Meine Wörter: denn, wenn, als (time), ob, trotzdem, dann, danach,
    zuerst, zum Schluss, sonst. 21 connector cards linked in total; the comparison
    *als* (Kleidung) now links to Komparativ; *sondern* got a note (≠ aber).
- **Three fixes the learner reported:**
  - Cloze: word edges are Unicode-aware, so words starting or ending in Ä/Ö/Ü/ß/é
    reach Cloze (11 cards, e.g. *das Öl*, *groß*, *Österreich*). Phrases ending in
    . ! ? stay out on purpose (you'd have to type the whole sentence).
  - Mode tabs: a uniform grid, two rows of four (icon over label, counts as corner
    badges, Grammatik spans the last two cells) instead of uneven flex buttons.
  - Grammatik: opening a topic scrolls its title to the top; before, closing the topic
    above pushed the new one off-screen.
- **GitHub Pages on:** the learner switched Pages on (source: GitHub Actions); the app
  is live at https://anooppzz.github.io/deutschflashcards-personal/ and redeploys on
  every push to `main`.
- **Handoff system:** `CLAUDE.md` (overview, formats, rules), this log, `AGENTS.md`.
- **Live link instead of HTML files:** repo is public now; the workflow builds, tests
  and deploys to GitHub Pages (skipping the deploy with a notice if Pages is off), and
  still attaches the HTML as a download. Agents stop sending the HTML file.
- `b5f83eb` Im Restaurant: 13 phrase cards from the textbook's Kommunikation box
  (bestellen, reklamieren, bezahlen); chapter now 44 cards.
- `2ac6d4d` Grammar topic "Nebensatz mit dass"; *reiten* added to Meine Wörter.
  Pointed out in the learner's exercise: *dass **sie** Pommes haben* (lowercase *sie*).
- `69c23c0` Prepositions section (7 topics: overview, Akkusativ, Dativ,
  Wechselpräpositionen, Genitiv, time, places) and group headings for all topics.
  No preposition takes the Nominativ – explained in the overview.

### 2026-09-28
- `339e3cb` Grammar topic "Fragewörter: wer, wen, wem, was" (from the chapter
  "Wem schenkst du was?"); 24 cards linked.
- `05b7f82` Mode tab bar fits 320–360px phones (text scales below 390px).
- `0eed3cb` Grammar topics rewritten from paragraphs into summary / tables / bullets /
  warnings (the learner found paragraphs hard to scan).
- `33d7faa` Grammar ↔ card links both ways: "Deine Wörter" lists, Perfekt rule,
  hand tags (`grammar` field).
- `3e21b02` Grammar chips on cards, "Genus nach Endung" topic, Artikel-trainer tips,
  card `note` field.
- `7931d7b` *die Zeichnung* added to Meine Wörter.

### 2026-09-26
- `3c08e3a` Chapter "Meine Wörter" ⭐ (`persoenlich`) for the learner's own words.

### 2026-09-24
- `4724147` Pages deploy failed (repo was private) → replaced with build + download.
- `8f8ebec` Im Restaurant checked against a clear photo and corrected (Besteck -e,
  Hendl, zusammen/getrennt zahlen split, missing words added).
- `b7e0aa2` Chapter Im Restaurant (Menschen A2, Einheit 10).

### 2026-09-21
- `587ee5e` Project moved from `anooppzz/deutschflashcards` (bundle only) into this repo
  with its source history; README and first workflow.
- `411bf51`, `e3dc844` (learner's own commits): the app and Einheit 9 (Arbeitsleben).
