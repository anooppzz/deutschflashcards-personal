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
- [ ] **Audit 2026-10-01 – proposals, none requested yet** (learner picks):
  1. ~~Global search~~ – done 2026-10-01 (see log).
  2. ~~Backup + installable offline app~~ – done 2026-10-01.
  3. ~~Heute fällig, remember selection, fold topic chips~~ – done 2026-10-01.
  4. New trainers from existing data: Perfekt (hat/ist + Partizip II), Plural.
     Reverse mode strips the article, so a wrong der/die/das counts as correct.
  5. Grammar topics missing for A2: ~~Kasus overview, Adjektivendungen~~ (done 2026-10-04),
     ~~Konjunktiv II, Präteritum war/hatte~~ (done 2026-10-04), Verben mit Dativ,
     Verben mit Präposition + worauf/darauf, trennbare Verben, Imperativ; mini-exercises
     inside topics.
  6. Data: 108 nouns with old/empty plural format, 9 duplicate words that disagree
     (das Glas, das Wetter, die Post …), 51 adjectives without opposite.
  7. Code: App.jsx 1,703 lines / 75 useState; six copy-pasted deck viewers; help texts
     inline; progress keyed by deck+front (fixing a typo in `front` loses progress).

## Log

### 2026-10-04
- **Grammar topics "Präteritum: war, hatte (und Modalverben)"** (`praeteritum`, after Perfekt)
  **and "Konjunktiv II: würde, hätte, wäre, könnte"** (`konjunktiv-2`, after Modalverben):
  - Präteritum: sein/haben/werden table, modal verbs (incl. möchten → wollte), how to
    remember (ich = er, spoken: sein/haben/modals → Präteritum, rest → Perfekt), other verbs
    in texts (-te, ging/fuhr/kam), ⚠️ hatte ≠ hätte, war ≠ wahr. Links: the irregular deck
    (rule) + 13 cards (haben, wissen, werden, dafür/dagegen sein, reiten, streiten, modals).
  - Konjunktiv II: forms of würde/hätte and wäre/könnte (two tables so they fit 320px),
    what for (polite, ordering, wishes, advice with sollte, suggestions, unreal wenn), how to
    form (würde + Infinitiv; own forms for haben/sein/modals; Präteritum + Umlaut trick;
    möchte), politeness ladder, ⚠️ hätte ≠ hatte, würde ≠ wurde. Links: 5 restaurant
    phrases, 2 Firma phrases, haben, können, möchten, werden (11).
  - Two link tests updated (irregular verbs and *können* now also link to these topics).
- **Grammar topics "Kasus: Nominativ, Akkusativ, Dativ"** (`kasus-ueberblick`, Nomen &
  Artikel) **and "Adjektivendungen"** (`adjektivendungen`, Adjektive, before Komparativ):
  - Kasus: one sentence with all three cases, der/die/das and ein/kein/mein tables by case,
    personal pronouns Nom/Akk/Dat, how to remember (only masculine changes in Akk; Dativ
    signals -m/-r; Dativ plural -n), what decides the case (subject, sein, most verbs,
    Dativ verbs, geben + Dat + Akk, prepositions), ⚠️ *es gibt* + Akk, *sein* + Nom.
    Linked: the 19 Dativ/two-object verbs already tagged for Fragewörter + helfen, geben,
    gehören, gefallen (21 words).
  - Adjektivendungen: ending tables after der/die/das, after ein/kein/mein and with no
    article; example table (der Rock / die Jacke / das Kleid); how to remember (5 × -e, else
    -en; ein-words: adjective shows the gender; no article = der/die/das endings); watch
    out (no ending after sein, teuer → teures, prima/lila/rosa/orange, comparatives too);
    ⚠️ einen neuen Rock. Every adjective card links (93), except adverb-like ones.
  - Link rules got `except` (card fronts to skip), +1 test; three tests that used an
    adjective as an "unlinked" example now use other cards. Tables fit 360/390px.

### 2026-10-01
- **19 cards from the reflexive pages** (learner: "Add cards too"):
  - Meine Wörter +7: duschen, rasieren, schminken, vor·stellen, verlieben, beschweren,
    küssen (all "(sich)", "hat sich …" → link to Perfekt + Reflexive Verben; now 25 words).
  - Firma & Produkte +12 Kommunikation phrases (Menschen A2 p. 66): *Ich finde es schön,
    dass …*, *Ich bin froh, dass …*, *Ich denke, dass das eine gute Idee ist.*, *Am besten
    gefällt mir, dass …*, *Den/Das/Die … würde ich gern kaufen.*, *Ich würde gern in der
    Firma arbeiten, weil …*, *Herzlichen Glückwunsch zum Jubiläum!*, *Wir wünschen /
    gratulieren / danken Ihnen …*, *Wir hoffen, …*, *Wir bedanken uns für …*. Not added:
    *Meiner Meinung nach …* (card exists), *Alles Gute* / *Viel Glück* (exist).
  - FlipCard: the back face reserves room for ✓ Gekonnt / ↻ Üben (a long back ran under
    them). Scan of all 1,164 distinct cards at 360px: none overflows.
- **Reflexive Verben extended** from two pages the learner sent (grammar book ch. 31
  "Sie wäscht sich – Reflexive (und reziproke) Verben" and Menschen A2 p. 66 Grammatik):
  pronoun table now *waschen* incl. *man*; "mich/dich/uns/euch = accusative pronoun, only
  3rd person *sich*"; new table *Typische reflexive Verben* (waschen, duschen, rasieren,
  schminken, anziehen, vorstellen …); new section *Reziprok: sich = einander* (küssen,
  kennenlernen, verlieben, treffen, streiten; plural only; *gegenseitig*); *Sie wäscht sich*
  ↔ *Sie wäscht das Baby*; noun subject *Heute freut sich mein Bruder*; *weil er sich
  geärgert hat*; 4 more preposition verbs (entschuldigen bei, treffen mit, beschweren über,
  verlieben in). *treffen* and *kennenlernen* tagged (17 words linked). Fits 360/390px.
- **Backup and installable app** (audit item 2):
  - "💾 Fortschritt sichern & App installieren" (footer) opens a window: download a backup
    file (`deutsch-flashcards-backup-YYYY-MM-DD.json`: progress, streak, settings, own
    translation corrections – not rebuildable caches, never other sites' keys on the shared
    github.io origin), load one back (checks it, asks before replacing, reloads), and how to
    install (button on Android/Chrome, Share → Home Screen steps on iPhone).
  - Reminder line under the streak once 20+ cards have progress and there's no backup from
    the last 14 days. Saving a backup also asks the browser to keep storage persistent.
  - PWA: `public/manifest.webmanifest`, icons (flashcard with the German flag), `sw.js`
    (works offline; the page is fetched network-first so new deploys show up immediately).
    Registered only on https/localhost – the downloaded HTML file (file://) is unchanged.
  - Tested: save → file contents, bad file → error, restore on an empty "new device" →
    25 cards + Heute fällig back, offline reload, file:// build. Install prompt itself
    can't fire in headless Chrome, so that button is untested.
  - `src/engine/backup.js` (+6 tests), `src/engine/pwa.js`, `src/components/BackupModal.jsx`.
- **Phone layout, saved selection, "Heute fällig"** (audit item 3):
  - The 31 topic chips fold into one row "📚 Themen · 👕 Kleidung ▾"; tap to open, "✓ Fertig"
    to close. The language buttons fold into a flag button at the top left (closes after
    picking). The "A1 / A2 · tap to flip" hint line is gone (the footer says the same).
    The first card now starts at y≈595px instead of ≈1150px (360/390px phones).
  - Selected topics and the study mode are saved (`tabs:v1`, `mode:v1`) and restored on
    reload; unknown chapter keys are dropped.
  - "📅 N Karten heute fällig · Wiederholen →" banner under the streak: every studied card
    whose review date has come, from all decks, most overdue first, 20 per session. Flip,
    then "✗ Nicht gewusst" / "✓ Gewusst" – a real FSRS review (same as a quiz answer, counts
    for the daily goal). Summary lists the misses with "↻ Falsche nochmal" and "Weitere
    fällige Karten". Never-studied cards aren't "due"; cards marked "↻ Üben" are (due now).
    `src/engine/review.js` (+3 tests), `src/modes/review/ReviewSession.jsx`; FlipCard got
    `showMarks` (hides ✓ Gekonnt / ↻ Üben in the session).
  - Help texts for topics and language updated in all six languages.
- **App-wide search** (audit item 1): the search box now searches every card in every
  deck plus the text of all grammar topics, whatever topics are selected. Case, umlauts,
  ß and ae/oe/ue don't matter (*fruhstuck* → *frühstücken*); matches the word, its forms
  (*ging* → gehen), the meaning, note and example, best first. Results replace the mode
  content: 📖 Grammatik rows open the topic ("← Zurück" returns to the results), 🃏 card
  rows open the full card in place, "… öffnen →" jumps to that card in its chapter.
  Engine `src/engine/globalSearch.js` (+11 tests); view `src/modes/search/`.
  The old per-deck filter (`engine/search.js`) is gone. Search input is 16px so iPhones
  don't zoom in on focus. `ALL_CARDS` now carries example, note, level, source.
- Full audit of app, data and structure; findings under Pending ("Audit 2026-10-01").

### 2026-09-30
- *streiten* removed from Meine Wörter (learner's choice); it lives on as
  *streiten (sich)* in Firma & Produkte. Meine Wörter: 16 cards.
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
