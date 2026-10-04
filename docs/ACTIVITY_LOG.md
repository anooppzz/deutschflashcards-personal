# Activity log

The handoff between chat sessions. **Pending** is what's open; the **log** below is what
was done, newest first. Every change adds a log entry here in the same commit
(see `CLAUDE.md`, rule 5).

## Pending

- [ ] **Old repo leftovers:** branch `claude/epic-meitner-f5b32y` in
  `anooppzz/deutschflashcards` couldn't be deleted by the agent (403). The learner can
  delete it on GitHub or leave it.
- [ ] Ideas, not requested yet: tapping a word under "Deine Wörter" could open its card
  (now it only speaks it); grammar text exists only in German and English (other app
  languages fall back to English).
- [ ] Offered, not requested yet: a grammar topic "Verben mit Präposition" (warten auf,
  denken an, sprechen über …).
- [ ] **Audit 2026-10-01 – proposals, none requested yet** (learner picks):
  1. ~~Global search~~ – done 2026-10-01 (see log).
  2. ~~Backup + installable offline app~~ – done 2026-10-01.
  3. ~~Heute fällig, remember selection, fold topic chips~~ – done 2026-10-01.
  4. ~~Perfekt + Plural trainers~~ (done 2026-10-04, 🔁 Formen).
     ~~Reverse mode article check~~ (done 2026-10-04).
  5. Grammar topics missing for A2: ~~Kasus overview, Adjektivendungen~~ (done 2026-10-04),
     ~~Konjunktiv II, Präteritum war/hatte, Verben mit Dativ, Verben mit Präposition,
     trennbare Verben, Imperativ~~ (done 2026-10-04); ~~mini-exercises~~ (done).
  6. ~~Data cleanup~~ (done 2026-10-04).
  7. ~~Code tidying~~ (done 2026-10-04).

## Log

### 2026-10-04
- **Code tidying 4/4 – lint 57 → 0 warnings:** 22 unused `catch (e)` → `catch`; 4 unused
  imports; 31 effect-dependency warnings fixed by giving the effects plain values (cardDeck,
  cardFront … instead of `card && card.front`) in Artikel, Quiz, Reverse and FlipCard;
  Wortgitter sizes moved out of the component; ErrorBoundary resets via
  getDerivedStateFromProps instead of setState in componentDidUpdate. Rule now: 0 warnings.
  Re-tested in the browser: all decks vs the previous build, help texts, Artikel / Quiz /
  Reverse / Karten in English and Albanian, Formen, all 29 grammar exercise sets, review.
- **Code tidying done** (steps 1–4 above). App.jsx 1,932 → 1,405 lines.
- **Code tidying 3/4 – progress survives renames:** `src/data/renames.json` (old id → new id,
  or null for a deletion) is applied when progress loads (`engine/renames.js`). It starts
  with the four real renames found in git history, so that practice comes back: three
  restaurant cards reworded on 2026-09-24 (Verzeihen Sie. / Stimmt so. / Einen Moment,
  bitte.) and *streiten* moved from Meine Wörter to Firma & Produkte. `src/data/card-ids.json`
  snapshots all 1,194 ids; `cardIds.test.js` fails when a card disappears without a rename
  entry or the snapshot is stale (`npm run ids:update`). New rule 6b in CLAUDE.md. +6 tests.
- **Code tidying 2/4 – help out of App.jsx:** the 56 help/welcome texts (6 languages) are
  now `src/data/help.json`; WelcomeModal / HelpModal live in `components/HelpModals.jsx`;
  a stale comment about an abandoned translation approach is gone (chain.js documents the
  real one). App.jsx 1,690 → 1,400 lines. Welcome and help windows compared with the
  previous build in English, Ukrainian and German: identical text.
- **Code tidying 1/4 – one deck view:** the five copy-pasted deck screens (Irregular, Nicht
  trennbar, Haushalt, Verkehr, Kleidung) and the chapter view are one `DeckView`, driven by
  configs in `modes/cards/deckViews.js` (banner, filter by type or vowel group, colour,
  badge, 💡 tip). 20 useState and ~230 lines gone from App.jsx (1,932 → 1,690). Compared
  against the previous build: same cards, banners, chips, counters and tips in 7 decks.
  Side effects: ← → arrow keys now work in chapters too; search "… öffnen →" now really
  opens the found card (it always opened the chapter's first card); the card back no
  longer shows the previous card's meaning for a moment after "next".
- **✏️ Üben in every grammar topic:** 145 multiple-choice questions (5 × 29 topics) in
  `src/data/grammar/exercises.json`, after the examples. One question at a time, options
  shuffled every round, ✓/✗ with a one-line reason + the sentence in English, "↻ Nochmal".
  Best score per topic saved (`grammarScores:v1`, part of the backup) and shown on the topic
  header (✏️ 5/5, green when perfect). 45 questions first repeated a sentence shown in their
  own topic – rewritten, and a test now prevents it. All 29 topics played through at 360px.
  `src/modes/grammar/GrammarExercises.jsx`; +3 content tests.
- **Data cleanup** (audit item 6):
  - Nouns: 46 old-format plurals got the "Pl." prefix ("-n · …" → "Pl. -n · …"); 61 empty
    or plural-less notes got the real plural or "kein Plural" (Wetter, Milch, Geld, Gepäck …;
    Kaffee → Pl. -s · "Zwei Kaffee, bitte!"; Papier → "die Papiere = Dokumente"; das Glas as
    material vs Trinkglas ¨-er); months say "Monat". Every noun now has plural information
    except Ostern / Weihnachten. The duplicates that disagreed (das Glas, das Wetter, die
    Post, der Moment) now agree. The plural trainer grew from 435 to 492 nouns.
  - Adjectives: 33 got a natural opposite (neu ↔ alt, leer ↔ voll, pünktlich ↔ unpünktlich,
    sonnig ↔ bewölkt …); colours and adverb-like words stay without.
  - Scan of all cards at 360px after the change: none overflows.
- **🔁 Formen trainer** (new mode tab; 8 tabs = two even rows of four, Grammatik no longer
  spans two): Perfekt | Plural switch (remembered, `formsKind:v1`).
  - Perfekt: pick hat / ist (+ sich for reflexive verbs), type the Partizip II. 225 verbs
    across the app – read from each card's sub ("hat gekauft", "fuhr · ist gefahren");
    phrases like "hat Musik gehört" are skipped.
  - Plural: "die ___" – 435 nouns, built from "Pl. -en / ¨-e / -" etc. (umlaut on the last
    a/o/u/au, capitals too: Arzt → Ärzte); skipped: kein/nur Plural, "-e/-s" alternatives.
    All 435 plurals and 225 Perfekt forms were listed and checked by hand.
  - Feedback names what was wrong ("Hilfsverb + Partizip"); round of 15 like Artikel (new
    cards first, then due ones); every answer is a real review; summary with "Fehler üben".
  - `src/modes/forms/` (buildForms.js +8 tests, FormsTrainer.jsx); help text lists all modes.
- **Reverse mode checks the article:** a noun shown with der/die/das must be typed with the
  right one – "✗ Falscher Artikel" / "✗ Artikel fehlt" on the card, "(Artikel!)" / "(ohne
  Artikel)" in the summary; *der/die* nouns accept either. Placeholder says "mit Artikel …"
  for nouns; input 16px (no iPhone zoom). `checkReverseAnswer` in `engine/validation.js`.
  Fixed on the way: *der/die Angestellte* could never be answered right, and *an·rufen*
  needed the dot; reflexive "(sich)" is optional now. +7 tests (`validation.test.js`).
- **Four grammar topics (Verben):** order now Präsens · Trennbare Verben · Imperativ · Perfekt ·
  Präteritum · Modalverben · Konjunktiv II · Reflexive · Verben mit Dativ · Verben mit Präposition.
  - *Trennbare Verben* (A1): where the prefix goes (6 sentence types), 12 prefixes, stress
    trick, ge in the middle, trennbar vs untrennbar, ⚠️ forgotten prefix, no split in
    Nebensatz. Rule: new `frontPattern` (separable prefix, with or without ·) except
    *antworten*, *zusammen zahlen*; plus the inseparable deck for the contrast → 54 words.
  - *Imperativ* (A1): du/ihr/Sie/wir table, du-form table (nimm, lies, fahr, arbeite, ruf …
    an, beeil dich), sein (sei/seid/seien Sie), bitte/mal, ⚠️ Sie never dropped, no umlaut.
    4 words (lassen, lass uns, Entschuldigen Sie, Verzeihen Sie).
  - *Verben mit Dativ*: 14 dative-only verbs with examples, Dativ + Akkusativ verbs, "back to
    front" gefallen/fehlen, word order of two objects, ⚠️ helfe dich, fragen/anrufen = Akk.
    23 words.
  - *Verben mit Präposition*: 14 verbs with case, wo(r)-/da(r)- vs person, auf/über = Akk.,
    ⚠️ warten für, denken an vs nachdenken über. 19 words; 10 verb cards got a back-of-card
    note with their preposition (warten auf, denken an, sich freuen auf/über …).
  - Tests: separable rule (+2), one exact-link test updated.
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
