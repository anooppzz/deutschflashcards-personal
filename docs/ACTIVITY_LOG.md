# Activity log

The handoff between chat sessions. **Pending** is what's open; the **log** below is what
was done, newest first. Every change adds a log entry here in the same commit
(see `CLAUDE.md`, rule 5).

## Pending

- [ ] **Old repo leftovers:** branch `claude/epic-meitner-f5b32y` in
  `anooppzz/deutschflashcards` couldn't be deleted by the agent (403). The learner can
  delete it on GitHub or leave it.
- [ ] **Old repo touched by mistake (2026-10-05):** a session worked in the legacy
  `anooppzz/deutschflashcards` first and merged its PR #1 there (Essen & Mengen + a der/die
  split in its single-file app). Nothing deploys from it, so it's harmless; revert it only
  if the learner wants the old repo back as it was.
- [ ] Idea, not requested yet: grammar text exists only in German and English (other app
  languages fall back to English).
- [ ] **To check on the learner's phone:** the Android back gesture inside the installed app
  and the card swipe (tested with simulated touch in headless Chrome only).
- [ ] **To check on the learner's phone:** 🎧 Hören speaks with the phone's German voice
  (headless Chrome has none), and 🤖 Frag Claude opens Claude with the question filled in
  (claude.ai/new?q=…; the question is also copied as a fallback).
- [ ] **Starting a new chat:** pick `deutschflashcards-personal` as the repository. Chats
  that still open in the old repo now find a `CLAUDE.md` there sending them here.
- [ ] **To check on the learner's phone:** 🎯 Heute lernen over a few days (does the new-word
  goal feel right? 10/day by default, "Ziel ändern" cycles 5/10/15/20), Satzbau chips are
  easy to tap, 📰 Lesen 🔊 Vorlesen with the phone's German voice.
- [ ] **Phase 3 – DTZ exam training** (the learner's exam is the **DTZ**, integration course;
  Goethe/other telc exams later as separate work). Done: step 1 Hören + Lesen (set 1),
  step 2 Schreiben (4 pairs), step 3 Sprechen. Next: more Hören/Lesen sets (2, 3 …), more
  Sprechen topics, results over time.
- [ ] **To check on the learner's phone – 🗣 Sprechen:** 🎙 recording (microphone permission
  prompt), the examiner/partner voices, 📝 Mitschrift with Google (Android Chrome stops
  listening after a pause – tap again, the text is appended).
- [ ] **To check on the learner's phone – 📥 KI-Eingang:** "📤 Teilen" opens Android's
  share sheet with the `.md` file (falls back to `.txt`, then plain text, then a download).
  First real round trip: export → Claude Code chat "Bitte den KI-Eingang einarbeiten".
- Idea for later (option B of the brainstorm, not requested): AI-suggested cards the
  learner ticks straight into a personal deck on the phone.
- [ ] **To check on the learner's phone – 🔒 key lock:** "👆 Auch mit Fingerabdruck" needs
  Android Chrome with Google Password Manager passkeys (WebAuthn PRF). If the phone says it
  can't, the password alone protects the key. Tested with Chrome's virtual authenticator.
- [ ] **To check on the learner's phone – 🤖 KI-Assistent:** tested only against fake
  Gemini/Claude servers in headless Chrome. First real question with the learner's own key
  (Gemini: aistudio.google.com/apikey; Claude: console.anthropic.com, small top-up + spend
  limit). If Gemini says the model doesn't exist or the free limit is used up, switch to the
  other Gemini model in the settings. Not built (optional): "Frag ChatGPT / Frag Gemini" links.
- [ ] **To check on the learner's phone:** ⏸ Pause / ▶ Weiter in 🎓 DTZ Hören and 📰 Lesen
  Vorlesen with the phone's German voice (tested with a simulated voice in headless Chrome),
  and that the page now scrolls to what a tab or button opens.
- [ ] **To check on the learner's phone:** the "📲 App installieren" button (Android/Chrome) –
  headless Chrome never offers installation, so it is untested.
- The audit of 2026-10-01 is fully done (search, backup + PWA, Heute fällig, Formen
  trainer, Reverse articles, 12 grammar topics, ✏️ Üben, data cleanup, code tidying).

## Log

### 2026-10-06
- **🗣 DTZ-Training step 3: Sprechen + banner.** The start-screen banner now reads
  "🎓 DTZ-Prüfungstraining · Hören · Lesen · Schreiben · Sprechen"; the DTZ home explains all
  four parts and the overall result (Sprechen + Hören/Lesen or Schreiben at the same level).
  - Re-read the oral exam (g.a.s.t. Übungssatz 1: flow, task sheets, criteria; handbook
    7.1.2.4 point table) → `docs/DTZ_FORMAT.md` "Sprechen content".
  - **Content** (`src/data/exam/dtz-sprechen.json`, all new): Teil 1 keywords + a model
    introduction + 12 follow-up questions with model answers; Teil 2 six described photos
    (Wochenmarkt, Wartezimmer, Restaurantküche, Park, Umzug, Geburtstagsfeier), each with
    3 A2 + 3 B1 questions and a model description; Teil 3 five planning tasks
    (Abschiedsfest im Kurs, kranke Kollegin besuchen, Sommerfest im Haus, Geschenk für
    einen Kollegen, Ausflug mit Kindern) with notes and a 10-line A/B dialogue; useful
    phrases per Teil; English for everything.
  - **Trainer** (DTZ home → "🗣 SPRECHEN"): Teil 1 / Teil 2 (choose a photo) / Teil 3 (choose
    a task) to practise, or **🎙 Mündliche Prüfung simulieren** (1A + 2 questions, a photo +
    2 A2 + 1 B1 questions, a planning talk; ~16 min clock; no examples; the question text
    hidden – listen first; back gesture asks before cancelling). The phone's voice is the
    examiner (male voice) and the partner (second female voice, higher pitch); 🔊 repeats.
    Per turn: **🎙 Aufnehmen** (stays in memory, ▶ play back), optional **📝 Sprechen →
    Text** (Google speech recognition, off by default, privacy note at the switch,
    transcript editable), 💡 Beispiel and 💬 Nützliche Sätze in practice.
  - **Rating:** with a transcript, ✨ in-app AI ("🗣 Bewerte meine Antworten") or the
    Claude/ChatGPT/Gemini websites with a ready request (per-Teil task completion,
    Korrektheit, Wortschatz, mistakes table, better B1 versions, tips). The simulation ends
    with all recordings/transcripts and a self-rating on the 9 official criteria (points
    shown per step, e.g. Teil 3 max 20) → x/100 → A2 (35) / B1 (75), saved to the DTZ
    results.
  - Tests: `speaking.test.js` (content structure, A/B dialogue order, turn building for
    each Teil and the simulation, weights = 100, thresholds, AI prompt). Headless Chrome at
    360/390 with a fake microphone, a fake voice and a fake recogniser: banner, Teil 1
    (examiner speaks, record → player, transcript, example, rating links), Teil 2 (photo,
    2B lead-in, level tag), Teil 3 (partner voice), full simulation (13 turns, back asks,
    self-rating 64/100 A2 saved) – no sideways scrolling, no errors.
- **✍️ DTZ-Training step 2: Schreiben.** Re-read the official format (handbook 6.3.3 and the
  g.a.s.t. Übungssätze): choose Aufgabe A or B, situation + 4 Leitpunkte, Anrede + Gruß,
  30 min; 4 criteria × 0–5 points, A2 from 7, B1 from 15 of 20. Format added to
  `docs/DTZ_FORMAT.md`.
  - **Content** (`src/data/exam/dtz-schreiben.json`, all new): 4 pairs – Absage
    Geburtstagsfeier (du) / Aufzug kaputt (Hausverwaltung); Kind krank (Kita) / Urlaub
    beantragen (Chef); Hilfe beim Umzug (du) / Anmeldung Computerkurs (VHS);
    Zahnarzttermin absagen / Reklamation Wasserkocher. Each with English, a B1 model
    answer split by Leitpunkt (85–111 words, with English) and 6 useful phrases.
  - **Trainer** (DTZ home → "✍️ SCHREIBEN" → Satz 1–4): both tasks side by side, then
    **📝 Prüfung** (30-min clock with ⏸, no help, handed in at 0:00) or **✏️ Üben** (no
    clock, 💬 Nützliche Sätze, 🇬🇧 English, live checklist). Leitpunkte to tick. Live
    checklist (`writing.js`): Anrede (formal vs. personal), comma after it,
    geehrte/geehrter and Liebe/Lieber with Frau/Herr, Gruß, du in a formal text, linking
    words, word count. Drafts are saved per task (`dtzWriting:v1`, in the backup).
  - **After "Abgeben":** the text, checklist, **📄 Musterlösung** (per Leitpunkt, English on
    request), **rate it** – ✨ in-app AI ("📝 Bewerte meinen Text", follow-ups for
    mistakes / B1) or the Claude / ChatGPT / Gemini websites with a ready request (task,
    Leitpunkte, text, official criteria; asks for points, mistakes table, corrected
    version, tips) – and **self-rating** on the 4 criteria with short descriptions
    (Aufgabenbewältigung pre-filled from the ticked points) → x/20 → level; saved to the
    DTZ results (shown with A2/B1 colour). "✏️ Weiter bearbeiten" / "🗑 Neu anfangen".
  - Tests: `writing.test.js` (every task's format, every model answer passes the checklist
    and is 70–140 words, checklist cases, thresholds, AI prompt). Headless Chrome at
    360/390: choose, practise with mistakes → warnings, draft kept, hand in, model answer,
    self-rating 10/20 A2 saved, exam clock runs out at 30:00 → handed in, formal-letter
    warnings (geehrte, du), AI review in the app with a fake Gemini, back gesture – no
    sideways scrolling, no errors.
- **📥 KI-Eingang – AI answers into the app (options A + D of the brainstorm).**
  - In the KI chat, under each answer: **"📌 Für die App vorschlagen"** → chips for what
    should go in (🃏 Karten, 📖 Grammatik-Text, ✏️ Übungen, 💡 Sonstiges) + a note → saved in
    the inbox (`aiInbox:v1`, in the backup; no secrets). The answer shows "📌 im KI-Eingang".
  - **"📥 KI-Eingang · n"** button at the bottom (when the AI is on or the inbox has
    entries) opens the inbox (`components/AiInboxModal.jsx`): entries (title, time,
    source, wants; tap = answer + 🗑), **"＋ Text einfügen"** for answers from the
    Claude/ChatGPT/Gemini websites, export of all entries as one Markdown file via
    **📤 Teilen** (Android share sheet; `.md`, else `.txt`, else text, else download),
    **⬇ Datei** or **📋 Kopieren**; exported entries get "📤 exportiert" and
    **"🗑 Exportierte löschen"** clears them after Claude has worked them in.
  - The file (`engine/aiInbox.js` `inboxMarkdown`): instructions on top, entries oldest
    first with source, wishes, note, question, and the answer **quoted** (its own headings
    can't break the structure).
  - **Workflow for Claude Code sessions:** `docs/ai-inbox/README.md` (check correctness,
    A2, duplicates → add in the app's formats → report ✅/✏️/❌ per entry → archive in
    `docs/ai-inbox/done/`); CLAUDE.md points to it.
  - Tests: `aiInbox.test.js` (add/cap/parse/mark/remove, Markdown export). Headless Chrome
    at 360/390: save from the chat, paste an entry, export via share/file/copy, delete
    exported, back gesture – no sideways scrolling, no errors.
- **🔒 AI key lock + 🤖 Frag ChatGPT / Gemini.** The learner wanted the key safe even when
  someone else holds the phone.
  - **Encrypted keys** (`engine/aiVault.js`): a random data key (AES-GCM) encrypts the API
    keys; it is stored wrapped by the learner's **password** (PBKDF2-SHA-256, 600 000
    rounds, min. 6 characters) and, if chosen, by the **fingerprint / screen lock** (a
    passkey on the phone; its WebAuthn PRF secret only comes out after the phone checked
    the fingerprint; HKDF → AES key). Unlocked only in memory; locks after 15 min without
    AI use, on "🔒 Jetzt sperren", or when the app closes. The plain key is read from the
    vault per request and never kept in React state or storage.
  - **Settings** (`components/AiKeySection.jsx`): first time = key + password twice +
    "👆 Auch mit Fingerabdruck" → "🔒 Sicher speichern". After that the key is **never shown
    again** (only "…1234"). Locked: 👆 / password unlock (`AiUnlock.jsx`), "Passwort
    vergessen? → löschen und neu eingeben". Unlocked: replace/remove a key, add a key for
    the other provider, fingerprint on/off, change password, lock now, delete all.
  - **Chat**: while locked, the unlock panel replaces the questions.
  - **Old clear-text keys** (first version, same day) are found on load: settings show
    "⚠️ ungeschützt" and "🔒 Jetzt schützen"; the AI stays unusable until they are locked away.
  - **Links**: under a flipped card / grammar topic, "🤖 Frag: Claude ↗ ChatGPT ↗ Gemini ↗"
    (ChatGPT `chatgpt.com/?q=` fills in the question; Gemini has no such link – the
    question is copied and the note says to paste it). "✨ KI fragen" (in-app) sits next to
    🔎 Nachschlagen.
  - Tests: `aiVault.test.js` (nothing readable stored, wrong password, idle lock, replace
    keys, change password, fingerprint with a fake phone – secret at creation or on first
    use –, unsupported phone, cancelled, locked actions), `ai.test.js` (vault in settings,
    clear-text migration), `lookup.test.js` (site links). Headless Chrome at 360/390 on
    `http://localhost` with Chrome's virtual authenticator (PRF): setup with fingerprint,
    chat, lock → fingerprint unlock, fingerprint refused, wrong/right password, add Claude
    key, reload = locked, clear-text migration, delete all, Gemini copy note – storage never
    holds a key in clear, no sideways scrolling, no errors.
- **🤖 KI-Assistent (Phase 3 – AI), off by default.** Footer button "🤖 KI-Assistent: aus/an"
  opens the settings: on/off switch, provider **Gemini** (free tier with a daily limit;
  Google may use free-tier prompts – the settings say so) or **Claude** (prepaid; Opus 5.5
  default, Sonnet 5.5, Haiku 4.5 with prices and ≈ cost per question), the learner's own
  API key (show/hide, delete, "Schlüssel holen" link), safety notes.
  - **Key only on the phone:** stored under `DEVICE_ONLY_KEYS.AI` (`aiAssistant:device:v1`),
    deliberately outside `STORAGE_KEYS`, so it is never in the backup file and a restore
    doesn't touch it (tested). Calls go straight from the phone to Google/Anthropic.
  - **Switched on**, "✨ KI fragen" appears next to 🤖 Frag Claude under a flipped card and a
    grammar topic. It opens a chat (`components/AiChat.jsx`): nothing is sent until the
    learner taps "📖 Erklär mir …" or types a question; the answer streams in (■ Stopp),
    follow-up chips, 📋 Kopieren, ↻ Nochmal after an error, ≈ cost per answer and in total
    for Claude, at most 10 questions per chat. Back gesture closes settings, then the chat.
    Off again: no button, nothing sent; the free links stay.
  - Claude: official `@anthropic-ai/sdk`, loaded only when the first question is sent,
    `effort: "low"`, server-side fallbacks (`fallbacks: "default"`) on Opus/Sonnet 5.5,
    refusals and typed errors shown in German (bad key, empty credit, rate limit, offline).
    Gemini: REST streaming (`gemini-flash-latest`, `gemini-flash-lite-latest`), key in the
    `x-goog-api-key` header, not the URL; 429/404/400 explained in German.
  - Answers render a safe mini-Markdown (`engine/aiText.js`: headings, lists, small tables,
    bold/italic/code – never HTML from the answer).
  - Tests: `ai.test.js` (settings off by default, key not in backup + survives restore,
    Claude params, Gemini SSE parsing + streaming with a fake fetch, errors, nothing sent
    while off), `aiText.test.js`, `lookup.test.js` (subjects). Headless Chrome at 360/390
    against fake Gemini and Claude servers (real SDK): settings, chat, follow-up history,
    429 and 401 messages, back gesture, grammar topic, switch off – no sideways scrolling.
    The app file grew from 300 to 366 kB gzipped (the Claude SDK).
- **⏸ Pause for audio + scrolling to what opens** (learner: no pause, Stopp starts over; on the
  phone a tapped tab or section opens below the screen).
  - **Audio:** 🎓 DTZ Hören and 📰 Lesen Vorlesen get ▶ / ⏸ Pause / ▶ Weiter / ⏹ Stopp and
    "Satz 3/8" (`components/AudioControls.jsx`). `engine/speech.js` `createPlayer` speaks one
    sentence at a time (`sentencesOf` keeps "1. Juni", "Dr. …", "z. B." together), so Weiter
    repeats the cut-off sentence and goes on – Android's own speechSynthesis.pause() is
    unreliable. Speech cut off by the phone (a call) becomes a pause. In a simulation a text
    may be paused; after it ends or is stopped it still counts as heard once. Single-word 🔊
    buttons are unchanged; tapping one pauses a text being read, which keeps its place.
  - **DTZ simulation ⏸** in the timer bar: the clock stops, a running Hörtext pauses, the tasks
    are hidden (not removed, so the paused text keeps its place) until "▶ Weiter".
  - **Scrolling:** the ten mode tabs sit at the bottom of a phone's first screen. Tapping a tab,
    "✓ Fertig" under 📚 Themen, a chapter's "Öffnen →" or "← Zurück" from Grammatik now brings
    the tab row to the top (not when it already is); 🎓 DTZ, a 🎯 plan step (Wiederholen, Neue
    Wörter, Fehlerheft), a 📰 text and DTZ views/"Nochmal"/next part scroll to the view itself
    (before, `scrollTo(0, 0)` showed the app header instead). A word's card that opens under a
    tapped word (📰 Lesen, Grammatik words, search, Fehlerheft) scrolls into view if it's
    off-screen (`components/Reveal.jsx`).
  - Tested at 360/390px with a simulated voice: pause → Satz 3/5 → Weiter repeats sentence 3;
    Stopp starts over; simulation clock frozen while paused and running after; tab/DTZ/text
    land at the top; no sideways scroll, no errors. `engine/speech.test.js` (10 tests).
- **🎓 DTZ-Prüfungstraining, step 1: Hören + Lesen.** The learner's exam is the DTZ (integration
  course). Read the official sources once the learner allowed www.bamf.de, www.gast.de,
  www.klett-sprachen.de and www.telc.net in the environment (`curl` works; WebFetch still
  refused): the BAMF/Goethe/telc DTZ handbook and g.a.s.t. Übungssatz 1 + 2 (2023). Format
  written down in **`docs/DTZ_FORMAT.md`** (parts, item numbers, task types, scoring, rules
  for new sets – nothing official is copied into the app).
  - **Set 1** (`src/data/exam/dtz-sets.json`): 45 original items – Hören 4 Ansagen, 5 radio
    texts, 4 conversations (richtig/falsch + a/b/c), 3 opinions on Homeoffice (a–f);
    Lesen: Klinikum signpost, 8 adverts with one X, 3 texts (bus line, Hausverwaltung email,
    Kita letter), library leaflet, formal letter to the VHS with 6 gaps. Each item has an
    English reason quoting the deciding German words; answers spread over a/b/c, 5 richtig /
    5 falsch. `examContent.test.js` checks numbering 4+5+8+3 / 5+5+6+3+6, answers, the X
    rule, Teil 4 sentences, gap markers.
  - **Trainer** (`modes/exam/`, button "🎓 DTZ-Prüfungstraining" under the tabs): practise
    one Teil (audio as often as wanted, "Auswerten" → ✓/✗, reason, "Hörtext lesen"), or
    simulate Hören + Lesen (70 min) / only Hören (25) / only Lesen (45) with a sticky timer –
    each Hören text plays once, at 0:00 the part moves on, result x/45 → unter A2 / A2 (20)
    / B1 (33) with a full review. Lesen Teil 5 shows the chosen word inside the letter.
    Hören is read by the phone with different voices/pitch per speaker (`speakLines`).
    Last 50 results saved (`dtzResults:v1`, in the backup). Back gesture: from a Teil or
    simulation to the overview (asks before dropping a running simulation), then closed.
  - Links to the free official Übungssätze on the overview. Help (❓) updated in 6 languages.
  - Tested at 360/390px (timer fast-forwarded with Playwright's clock): practice + review,
    X in Lesen 2, gaps in Lesen 5, Hören → Lesen at 25:00, result and saved history, back
    gesture; no sideways scroll, no errors. 249 tests.
- **Satzbau: "↺ Rückgängig"** after "Meine Reihenfolge ist auch richtig" (the learner tapped it
  by mistake): shows "Deine Reihenfolge: …" and takes the point back – the sentence returns
  to the round's mistakes – until "Weiter". (That button never saved anything beyond the
  round; Satzbau stores nothing.) Tested at 360/390px: accept → 1/1, undo → 0/1, the
  sentence is in "Fehler üben".
- **Learning audit, phase 2:**
  - **🎯 Heute lernen** (`engine/dailyPlan.js`, `components/DailyPlan.jsx`) replaces the
    "Heute fällig" and Fehlerheft banners: one card with four steps – 📅 due reviews,
    🆕 new words (daily goal 10, "Ziel ändern" → 5/10/15/20; unseen cards from the selected
    chapters first, then the rest in chapter order), 📕 Fehlerheft (entries not yet answered
    right today), ✏️ one grammar topic (the most overdue, else the next one never practised).
    Done steps show ✅; the card folds (remembered for the day). Not knowing a word on its
    first look in the new-words session doesn't go into the Fehlerheft.
  - **📅 Grammar topics come back** (`engine/grammarReview.js`): finishing a topic's ✏️ Üben
    schedules it – ≥ 80% → 3, 8, 20 … (max 60) days, else tomorrow (`grammarReview:v1`).
    "📅 fällig" on the topic header and "📅 N heute fällig" at the top of the Grammatik tab.
  - **✏️ Üben: 5 → 10 questions per topic** (145 new, 290 in total), each with English and a
    reason in both languages; no item where two options are correct German; 5 first drafts
    repeated sentences from their own topic and were replaced (the test caught them).
  - **🧩 Satzbau** (new tab, `modes/satzbau/`): the words of a card's example sentence
    (4–10 words, ~1,200 sentences) as chips; the first word is given, tap to build, tap to
    take back. Wrong order → the right sentence (🔊) and "Meine Reihenfolge ist auch
    richtig" for the cases where German allows both. Summary with "Fehler üben".
  - **📰 Lesen** (new tab, `modes/reading/`, `data/reading/texts.json`): 31 short A2 texts,
    one per chapter (all 28 textbook chapters + Kleidung, Verkehr, Haushalt), 450 linked
    words that open their card under the paragraph, 🔊 Vorlesen, 🇬🇧 translation per
    paragraph, 3 questions (richtig/falsch + multiple choice), best score kept
    (`readingScores:v1`). Back gesture returns from a text to the list.
  - Tabs: ten in two rows of five; count badges sit on the corner. Help (❓) mentions the
    new parts in all six languages.
  - Tested at 360/390px: plan steps (new words counted, grammar round → schedule → due chip,
    folding), Satzbau round, a text with a word card and the questions, back gesture, tab
    labels not clipped; no sideways scroll, no errors. 243 tests.
- **Old repo now points here** (learner's OK): `anooppzz/deutschflashcards` got a
  `CLAUDE.md` on `main` (051d074) saying the repo is retired and to work in
  `deutschflashcards-personal` – new chats open in the old repo by default and edited the
  old app on 2026-10-05. Its own code is unchanged.
- **Why the Essen & Mengen update "didn't show":** the other session's commit (ed46532)
  was on `main` and deployed green. Two likely reasons it wasn't visible: (1) new chapters
  aren't ticked under 📚 Themen automatically; (2) the installed app's service worker
  fetched the page through the browser cache, which GitHub Pages lets keep a page for
  10 minutes. Fixes: `sw.js` now fetches the page with `cache: "no-cache"` (CACHE v2);
  a **🆕 Neues Kapitel** banner (chapters with `"added"`, for 21 days, until opened or
  dismissed); **"Version <date> · <commit>"** at the bottom of the app. CLAUDE.md now opens
  with "Where to work" (personal repo only, how to verify a deploy, `added` for chapters).
- **Learning audit, phase 1:**
  - **📕 Fehlerheft** (`engine/mistakes.js`, `modes/mistakes/MistakeBook.jsx`): every
    wrong answer – Artikel, Quiz, Reverse, Hören, Lücke, Formen, "Nicht gewusst" in
    reviews, and ✏️ Üben grammar questions – is collected (`mistakes:v1`, in the backup).
    It leaves the list after right answers on 2 different days; a new mistake restarts
    the count. Start screen banner "📕 Fehlerheft · N Einträge"; inside: "▶ Wörter
    wiederholen" (review session), each word opens its card, grammar questions are
    practised right there with their topic shown. Back gesture closes it.
  - **🎧 Hören** in Reverse (toggle 📖 Lesen / 🎧 Hören, remembered): the phone says the
    word, the learner types it; 🔊 Nochmal, 🐢 Langsam (rate 0.6), 💡 Bedeutung zeigen.
    Punctuation doesn't count, the article does. Only cards with one clear spoken
    answer (no …, /, optional brackets). No voice → the meaning shows with a hint.
  - **🔎 Nachschlagen + 🤖 Frag Claude** (`components/LookupLinks.jsx`,
    `engine/lookup.js`): under every flipped card – Duden, DWDS, Verbformen, Reverso,
    Leo, Google – and at the end of every grammar topic (Google, YouTube). Frag Claude
    opens claude.ai in the learner's own account with an A2 question about the word or
    topic (card meaning + example included) and copies it too. All free; nothing runs
    in the app, so nobody can use the learner's quota.
  - New tests for the Fehlerheft, lookup links, Hören checks and the 🆕 banner (226 in
    total). Tested at 360/390px: banners, card links, Hören, wrong answers in
    Artikel/Reverse/grammar → Fehlerheft (3 entries), its grammar round, review from
    it, back gesture; no sideways scroll, no errors.

### 2026-10-05
- **Chapter "Essen & Mengen"** 🥗 (`essen-mengen`, Menschen A2 · Einheit 12, Lernwortschatz
  page): 36 cards – Essen und Getränke, Mengen, weitere wichtige Wörter, each with an example.
  The page names no chapter title, so the label is by content. A/CH variants in `sub`
  (*das Gericht* · A: die Speise, *das Huhn* · CH: das Poulet, *die Limonade* · CH: das
  Süssgetränk, *preiswert* · A/CH: günstig). Reading notes: the book prints *vorbereiten
  (sich)* without the dot – it is separable, so the card is *vor·bereiten (sich)*. No
  duplicates: *der Braten* (Essen) is the noun, *braten* the new verb; *rund* here means
  "around, approximately" (the shape card stays in Farben & Dinge); *wenn, dann* stay in
  Meine Wörter and *wenn …, dann …* is the construction as a phrase card (→ Nebensätze).
  *doppelt so viele* → Komparativ (so … wie).
- **Artikel mode: der/die nouns can be answered.** *der/die Bekannte, Verwandte,
  Angestellte, Erwachsene* (and now *Deutsche*) had no right answer – the tap was compared
  with the literal "der/die" – and the question showed "der/die …", giving it away. Either
  article now counts (`isArticleCorrect` in `engine/validation.js`, used for the buttons,
  the ✓ and the score), the question shows the word without "der/die", and the summary
  strips it too. `genderColor()` (constants/colors.js) gives these nouns the colour of their
  first article in Artikel, Karten, Reverse, Lücke and the card badge (was no colour).
  +3 tests. Checked at 360/390px: tapping der and die both say Richtig!, no sideways scroll.

### 2026-10-04
- **Phone fixes from testing the installed app:**
  - **Back gesture stays in the app** (`engine/useBackButton.js`): Android back / browser back
    now steps back one layer – welcome/help/backup window → language picker → grammar page
    opened from a card → search → review → topic picker → Karten tab – and only leaves
    the app from Karten. Works by keeping one history entry while there is somewhere to go
    back to (removed again when you get back to Karten by tapping).
  - **"← Zurück" is orange** (was grey on dark grey) and a bit bigger.
  - **Swipe between cards** (`components/Swipeable.jsx`): swipe left = next, right =
    previous, in every deck and the mixed view. A tap still flips; up/down still scrolls.
  - **Wortgitter fits the screen:** cells are sized from the available width (14–38px), so
    the whole grid is visible at 360px and long words can be dragged end to end.
  - **"Deine Wörter" opens the card:** tapping a word under a grammar topic shows its full
    card right below it (flip, 🔊, ✓ Gekonnt, chips) plus "… öffnen →" to its chapter.
  - Tested at 360/390px with simulated touch: swipe, tap, vertical scroll, every back step,
    word card + chapter link, no sideways scroll, no errors.
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
