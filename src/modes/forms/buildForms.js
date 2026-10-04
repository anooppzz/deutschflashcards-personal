// Formen trainer (Perfekt + Plural): turns cards into form questions.
// The forms come from what the cards already show - a verb's sub line
// ("hat gekauft", "fuhr · ist gefahren") and a noun's plural note
// ("Pl. ¨-e") - so every new card is practised automatically.
import { buildArticleRound } from "../article/buildRound";
import { ROUND_SIZE } from "../../constants";

// ---- Perfekt ----
// "hat gekauft", "fuhr · ist gefahren", "du lädst ein · hat eingeladen",
// "hat sich gefreut". Only one-word participles: "hat Musik gehört" is a
// phrase, not a form to drill.
const PERFEKT = /(?:^|[·,] )(hat|ist) (sich )?([^\s·,]+)(?=$| ·|,)/;

export const perfektOf = (card) => {
  if (!card || card.type !== "v" || !card.sub) return null;
  const m = card.sub.match(PERFEKT);
  if (!m) return null;
  return { aux: m[1], reflexive: Boolean(m[2]), partizip: m[3] };
};

// ---- Plural ----
const ARTICLE = /^(der\/die|der|die|das)\s+/;

// umlaut on the last a / o / u / au of the stem, keeping capitals:
// Stuhl → Stühl, Haus → Häus, Arzt → Ärzt, Apfel → Äpfel
export const umlaut = (word) => {
  const lower = word.toLowerCase();
  const i = Math.max(lower.lastIndexOf("a"), lower.lastIndexOf("o"), lower.lastIndexOf("u"));
  if (i < 0) return word;
  const map = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
  if (lower[i] === "u" && lower[i - 1] === "a") return word.slice(0, i - 1) + map[word[i - 1]] + "u" + word.slice(i + 1);
  return word.slice(0, i) + map[word[i]] + word.slice(i + 1);
};

// The plural of a noun card from its "Pl. …" note, or null (no plural,
// plural-only, several words, or a note this can't read).
export const pluralOf = (card) => {
  if (!card || card.type !== "n" || !card.sub || !ARTICLE.test(card.front)) return null;
  const word = card.front.replace(ARTICLE, "");
  if (/[\s()]/.test(word)) return null;
  const m = card.sub.match(/^Pl\.\s+([^\s·,]+)/);
  if (!m) return null;
  const tok = m[1];
  if (/[/()]/.test(tok)) return null; // alternatives ("-e/-s") - no single answer
  if (tok === "-") return word;
  const um = tok.startsWith("¨");
  const rest = um ? tok.slice(1) : tok;
  if (rest === "" || rest === "-") return um ? umlaut(word) : word;
  if (rest.startsWith("-")) return (um ? umlaut(word) : word) + rest.slice(1);
  if (/^[A-ZÄÖÜ]/.test(rest)) return rest; // a full form: "Pl. Museen"
  return null;
};

// ---- pools and rounds ----
export const FORM_KINDS = ["perfekt", "plural"];

export const buildFormsPool = (cards, kind) =>
  cards.flatMap((card) => {
    if (kind === "perfekt") {
      const p = perfektOf(card);
      return p ? [{ ...card, ...p }] : [];
    }
    const plural = pluralOf(card);
    return plural ? [{ ...card, plural }] : [];
  });

// same selection as the Artikel trainer: new cards first, then weighted by
// how due each card is; small pools run in full
export const buildFormsRound = (pool, progress) =>
  buildArticleRound(pool, progress, pool.length <= 20 ? pool.length : ROUND_SIZE);
