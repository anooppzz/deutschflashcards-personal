# DTZ – Deutsch-Test für Zuwanderer A2–B1: format for the 🎓 DTZ trainer

The learner takes the **DTZ** (integration course final exam, telc/g.a.s.t.). Every practice
set in `src/data/exam/` must follow this format exactly. Write **new** texts and tasks –
never copy the official practice tests into the app (they are copyrighted; the repo is
public).

Sources (read 2026-10-06):
- BAMF/Goethe/telc: *DTZ A2–B1 Prüfungsziele, Testbeschreibung* (handbook, 2009) –
  https://www.bamf.de/SharedDocs/Anlagen/DE/Integration/Integrationskurse/Kurstraeger/Modellsaetze/dtz-handbuch_pdf.pdf?__blob=publicationFile&v=8
- g.a.s.t.: *DTZ Übungssatz 1* and *Übungssatz 2* (2023, with transcripts and answer key) –
  https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/gast_DTZ_UEbungssatz_1.pdf ·
  https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/gast_DTZ_UEbungssatz_2.pdf
- (Network: the cloud environment allows www.bamf.de, www.gast.de, www.klett-sprachen.de,
  www.telc.net. WebFetch may still refuse them – `curl` works.)

## Written exam (alone)

| Part | Time | Teil | Items | Texts | Task |
|---|---|---|---|---|---|
| Hören | 25 min | 1 | 1–4 | Phone messages, public announcements | a/b/c |
| (each text **once**) | | 2 | 5–9 | 5 short radio texts (traffic, weather, tips, news) | a/b/c |
| | | 3 | 10–17 | 4 everyday conversations | per conversation: richtig/falsch + a/b/c |
| | | 4 | 18–20 | 3 people's opinions on one topic | match each to one of sentences a–f |
| Lesen | 45 min | 1 | 21–25 | A directory/signpost (Rathaus, Klinikum …) | "which floor?" a/b/c, c = "anderes Stockwerk" |
| | | 2 | 26–30 | 5 situations + 8 adverts a–h | matching; **one situation has no advert → X** |
| | | 3 | 31–36 | 3 short texts (press, email, letter) | per text: richtig/falsch + a/b/c |
| | | 4 | 37–39 | One information leaflet | richtig/falsch |
| | | 5 | 40–45 | Formal letter with 6 gaps | a/b/c per gap (grammar + words) |
| Schreiben | 30 min | – | 1 | Choose task A or B: email/letter with 4 Leitpunkte; greeting + sign-off | – |

## Oral exam (pairs, ~16 min)

| Teil | Time | Task |
|---|---|---|
| 1 Über sich sprechen | ~4 min | Introduce yourself (Name, Geburtsort, Wohnort, Arbeit/Beruf, Familie, Sprachen) + one question |
| 2 Über Erfahrungen sprechen | ~6 min | 2A: describe a photo ("Was sehen Sie? Was für eine Situation?") · 2B: questions about your experiences (A2 and B1 question lists) |
| 3 Gemeinsam etwas planen | ~6 min | Plan something together from keywords (where, what, food, who …) |

## Scoring

| Part | Points | A2 | B1 |
|---|---|---|---|
| Hören + Lesen | 1 per item, 45 | 20–32 | 33–45 |
| Schreiben | Inhalt, Kommunikative Gestaltung, Korrektheit, Wortschatz × 5 = 20 | 7–14 | 15–20 |
| Sprechen | Aufgabenbewältigung 50 (1A 5, 1B 5, 2A 10, 2B 10, 3 20) + Aussprache 10 + Flüssigkeit 10 + Korrektheit 15 + Wortschatz 15 = 100 | 35–74.5 | 75–100 |
| **Overall** | Sprechen at the level **plus** one written result (Hören/Lesen or Schreiben) at the level | | |

## Writing a set (`src/data/exam/dtz-*.json`)

- Integration-course life: Behörden, Arzt, Wohnung/Vermieter, Arbeit/Schichten, Kita/Schule,
  Verkehr, Einkaufen, Freizeit. A2–B1 language; natural spoken German in Hören.
- Distractors must be **mentioned or plausible** (the official tests name times, places and
  people that are not the answer) – but only one option may be right.
- Every item has `why`: one English line quoting the German words that decide it.
- Lesen Teil 2: exactly one situation without an advert (answer `"x"`); the other answers
  are distinct adverts; 3 adverts are distractors.
- Hören lines: `{ who: "f" | "f2" | "m" | "a", name?, text }` – who picks the voice/pitch
  (two women: f and f2), name labels the transcript in conversations.
- Hören Teil 4: 6 sentences, 3 statements, 3 sentences fit nobody.
- `src/modes/exam/examContent.test.js` checks item numbers 1–45, answers among the options,
  the X rule and that every item has a reason.

## Writing a Schreiben pair (`src/data/exam/dtz-schreiben.json`)

Official format (handbook 6.3.3, g.a.s.t. Übungssätze): a short situation, the instruction
("Schreiben Sie …"), **4 Leitpunkte** (all must be covered), Anrede + Gruß, 30 minutes, the
learner chooses Aufgabe A or B. Typical pair: one personal or semi-formal message and one
formal letter/e-mail (Vermieter, Hausverwaltung, Kita, Chef, VHS, Praxis, Kundenservice).

- `{ key, title, a: task, b: task }`; task = `{ key, title, kind: "E-Mail" | "Brief",
  register: "formal" | "informal", situation, situationEn, instruction, instructionEn,
  points: [{de, en}] × 4, model: { anrede, parts: [4 – one per Leitpunkt], partsEn,
  gruss }, phrases: [{de, en}] ≥ 4 }`.
- Model answers: B1 level, 70–140 words, linked with weil/dass/deshalb/wenn …; after
  "Anrede," the first part starts in lower case. New situations only – never the
  official ones.
- Scoring (`src/modes/exam/writing.js`): Aufgabenbewältigung, Kommunikative Gestaltung,
  Korrektheit, Wortschatz, 0–5 each (5/4 B1, 3/2 A2, 1 A1) → A2 from 7, B1 from 15 of 20.
- `writing.test.js` checks the format and runs every model answer through the app's own
  checklist (Anrede, Gruß, register, comma, geehrte/r).

## Sprechen content (`src/data/exam/dtz-sprechen.json`)

Official flow (g.a.s.t. Übungssatz 1, "Information für Prüfende"): Teil 1 introduce
yourself from the keywords Name, Geburtsort, Wohnort, Arbeit/Beruf, Familie, Sprachen, plus
the examiner's follow-up questions (1B); Teil 2 "Sie haben in einer Zeitschrift ein Foto
gefunden … Was sehen Sie? Was für eine Situation?" (2A), then "Welche Erfahrungen haben
Sie damit?" with A2 and B1 questions (2B); Teil 3 plan something together from notes
ending in "…?".

- `teil1`: `keywords`, `say`, `model` [{de, en}], `phrases`, `questions` [{ q: {de, en},
  model: {de, en} }].
- `teil2`: `say`, `sayB`, `phrases`, `topics` [{ key, title, photo: {de, en} (the app has
  no pictures – the photo is described), a2: 3 × {de, en}, b1: 3 × {de, en}, model }].
- `teil3`: `say`, `phrases`, `tasks` [{ key, title, situation: {de, en}, notes (last "…?"),
  dialogue: alternating A/B lines {who, de, en}, starting with A, ending with B }] – the
  learner is A, the app speaks B.
- Scoring (`src/modes/exam/speaking.js`, handbook 7.1.2.4): B1+/B1/A2+/A2/A1/0 = 5…0 ×
  weight – 1A ×1, 1B ×1, 2A ×2, 2B ×2, 3 ×4, Aussprache ×2, Flüssigkeit ×2,
  Korrektheit ×3, Wortschatz ×3 = 100; A2 from 35, B1 from 75.
- `speaking.test.js` checks the structure, the A/B order and the weights.
