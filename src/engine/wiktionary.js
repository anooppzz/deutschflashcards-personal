// 📖 Wörterbuch (Wiktionary) for a searched word that isn't in the app
// (components/WordLookup.jsx). German Wiktionary keeps the facts a learner
// needs in fixed templates, so they can be read without guessing:
//   == Wort ({{Sprache|Deutsch}}) ==
//   === {{Wortart|Substantiv|Deutsch}}, {{f}} ===
//   {{Deutsch Substantiv Übersicht |Genus=f |Nominativ Plural=… }}
//   {{Deutsch Verb Übersicht |Präsens_er, sie, es=… |Präteritum_ich=… |Partizip II=… |Hilfsverb=… }}
//   {{Deutsch Adjektiv Übersicht |Komparativ=… |Superlativ=… }}
//   {{Bedeutungen}} :[1] …   {{Beispiele}} :[1] …   *{{en}}: [1] {{Ü|en|habit}}
// One request (MediaWiki API, CORS with origin=*) asks for the word as typed,
// capitalised and in lower case at once ("essen" → the verb and the noun).
// Content: Wiktionary, CC BY-SA – the panel names and links the source.
// Anything the parser doesn't recognise is simply left out.

const API = "https://de.wiktionary.org/w/api.php";
export const wiktionaryUrl = (title) => `https://de.wiktionary.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

const ARTICLE = { m: "der", f: "die", n: "das" };
const cache = new Map();

// the word without an article and outer punctuation
export const wiktionaryTerm = (q) => (q || "").trim()
  .replace(/^(der|die|das|ein|eine)\s+/i, "")
  .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "")
  .trim();

export const candidates = (q) => {
  const w = wiktionaryTerm(q);
  if (w.length < 2) return [];
  return [...new Set([w, w[0].toUpperCase() + w.slice(1), w.toLowerCase()])];
};

// wiki markup → plain text
export const plain = (s) => (s || "")
  .replace(/<ref[^>]*\/>/g, "")
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
  .replace(/<[^>]+>/g, "")
  .replace(/\{\{K\|[^}]*\}\}/g, "")
  .replace(/\{\{Ü\|[^|}]*\|([^|}]*)(?:\|([^}]*))?\}\}/g, (m, a, b) => b || a)
  .replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
  .replace(/'{2,}/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .trim();

// |Key=Value lines of a {{Name … }} block
const templateFields = (text, name) => {
  const start = text.indexOf(`{{${name}`);
  if (start < 0) return null;
  const end = text.indexOf("\n}}", start);
  const body = text.slice(start, end < 0 ? undefined : end);
  const fields = {};
  body.split("\n").forEach((line) => {
    const m = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  });
  return fields;
};

// ":[1] …" lines after a {{Heading}} block marker
const numbered = (text, marker, max) => {
  const i = text.indexOf(`{{${marker}}}`);
  if (i < 0) return [];
  const out = [];
  for (const line of text.slice(i + marker.length + 4).split("\n")) {
    if (!line.trim()) { if (out.length) break; continue; }
    if (line.startsWith("{{") || line.startsWith("=")) break;
    const m = line.match(/^:+\s*\[[^\]]*\]\s*(.*)$/);
    if (m && plain(m[1])) out.push(plain(m[1]));
    if (out.length >= max) break;
  }
  return out;
};

const englishOf = (text) => {
  const line = text.split("\n").find((l) => /^\*\s*\{\{en\}\}\s*:/.test(l));
  if (!line) return [];
  const words = [...line.matchAll(/\{\{Ü\|en\|([^|}]*)(?:\|([^}]*))?\}\}/g)].map((m) => (m[2] || m[1]).trim()).filter(Boolean);
  return [...new Set(words)].slice(0, 5);
};

const field = (f, ...keys) => {
  for (const k of keys) {
    const v = f?.[k];
    if (v && v !== "—" && v !== "-") return plain(v);
  }
  return null;
};

// one part-of-speech block of a German section
const parseBlock = (title, heading, text) => {
  const pos = (heading.match(/\{\{Wortart\|([^|}]+)\|Deutsch\}\}/) || [])[1];
  if (!pos) return null;
  const entry = { title, pos, meanings: numbered(text, "Bedeutungen", 3), examples: numbered(text, "Beispiele", 2), en: englishOf(text) };
  const noun = templateFields(text, "Deutsch Substantiv Übersicht");
  if (noun) {
    const genders = [noun.Genus, noun["Genus 1"], noun["Genus 2"], noun["Genus 3"]].filter((g) => ARTICLE[g]);
    const fromHeading = [...heading.matchAll(/\{\{([mfn])\}\}/g)].map((m) => m[1]);
    entry.genders = [...new Set(genders.length ? genders : fromHeading)];
    entry.articles = entry.genders.map((g) => ARTICLE[g]);
    const plural = field(noun, "Nominativ Plural", "Nominativ Plural 1");
    const listed = ["Nominativ Plural", "Nominativ Plural 1"].some((k) => k in noun);
    entry.plural = plural || (listed ? "" : null); // "" = kein Plural, null = unknown
  }
  const verb = templateFields(text, "Deutsch Verb Übersicht");
  if (verb) {
    entry.verb = {
      er: field(verb, "Präsens_er, sie, es"),
      praeteritum: field(verb, "Präteritum_ich"),
      partizip: field(verb, "Partizip II"),
      hilfsverb: field(verb, "Hilfsverb"),
    };
  }
  const adj = templateFields(text, "Deutsch Adjektiv Übersicht");
  if (adj) {
    const sup = field(adj, "Superlativ");
    entry.adjective = { komparativ: field(adj, "Komparativ"), superlativ: sup && !sup.startsWith("am ") ? `am ${sup}` : sup };
  }
  return entry;
};

// all German entries of one page's wikitext
export const parseWikitext = (title, wikitext) => {
  const entries = [];
  const sections = (wikitext || "").split(/^(?===[^=])/m);
  sections.filter((s) => /^==[^=].*\{\{Sprache\|Deutsch\}\}/.test(s)).forEach((section) => {
    const blocks = section.split(/^(?====[^=])/m).slice(1);
    blocks.forEach((block) => {
      const nl = block.indexOf("\n");
      const e = parseBlock(title, nl < 0 ? block : block.slice(0, nl), block);
      if (e) entries.push(e);
    });
  });
  return entries;
};

// → [entry] (German entries only, the typed spelling first) · [] · throws when offline
export const lookupWiktionary = async (q, fetchFn = globalThis.fetch) => {
  const titles = candidates(q);
  if (!titles.length) return [];
  const key = titles[0].toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = `${API}?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(titles.join("|"))}`;
  const data = await (await fetchFn(url)).json();
  const pages = (data?.query?.pages || []).filter((p) => !p.missing && p.revisions?.[0]);
  const order = (t) => { const i = titles.indexOf(t); return i < 0 ? titles.length : i; };
  pages.sort((a, b) => order(a.title) - order(b.title));
  const entries = pages.flatMap((p) => parseWikitext(p.title, p.revisions[0].slots?.main?.content ?? p.revisions[0].content)).slice(0, 3);
  cache.set(key, entries);
  return entries;
};

// a short line for the 📥 KI-Eingang: "die Gewohnheit, Pl. Gewohnheiten (Substantiv) – habit, custom"
export const entrySummary = (e) => {
  const head = e.articles?.length ? `${e.articles.join("/")} ${e.title}` : e.title;
  const forms = e.plural !== undefined && e.plural !== null ? (e.plural ? `, Pl. ${e.plural}` : ", kein Plural")
    : e.verb ? `, ${[e.verb.er, e.verb.praeteritum, e.verb.partizip && `${e.verb.hilfsverb === "sein" ? "ist" : "hat"} ${e.verb.partizip}`].filter(Boolean).join(", ")}`
    : e.adjective ? `, ${[e.adjective.komparativ, e.adjective.superlativ].filter(Boolean).join(", ")}` : "";
  return `${head}${forms} (${e.pos})${e.en.length ? ` – ${e.en.join(", ")}` : ""}`;
};

export const clearWiktionaryCache = () => cache.clear();
