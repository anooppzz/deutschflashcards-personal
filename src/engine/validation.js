// Validate German word input with tolerance rules: case-insensitive,
// umlaut-tolerant, and forgiving about things that aren't part of the word
// itself: the separable-verb dot (an·rufen = anrufen) and a reflexive
// "(sich)" / "sich" (duschen (sich) = sich duschen).
const ARTICLE = /^(der\/die|der|die|das)\s+/i;

const normalize = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s.trim()
    .replace(ARTICLE, '')
    .toLowerCase()
    .replace(/·/g, '')
    .replace(/\(sich\)/g, '')
    .replace(/^sich\s+/, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
};

// The word alone, articles ignored - used where only the word matters
// (Cloze fills a blank inside a sentence that already has its article).
export const validateGermanWord = (userInput, correctWord) => {
  const userNorm = normalize(userInput);
  return userNorm.length > 0 && userNorm === normalize(correctWord);
};

// Reverse mode: the word AND, for a noun shown with its article, the
// article. { correct, reason }: reason is "word" (wrong word),
// "missing-article" or "wrong-article"; null when correct. A noun with two
// genders ("der/die Angestellte") accepts either article.
export const checkReverseAnswer = (userInput, front) => {
  if (!validateGermanWord(userInput, front)) return { correct: false, reason: 'word' };
  const needed = (front.trim().match(ARTICLE) || [])[1];
  if (!needed) return { correct: true, reason: null };
  const typed = (userInput.trim().match(ARTICLE) || [])[1];
  if (!typed) return { correct: false, reason: 'missing-article' };
  const allowed = needed.toLowerCase().split('/');
  const t = typed.toLowerCase();
  return t === needed.toLowerCase() || allowed.includes(t)
    ? { correct: true, reason: null }
    : { correct: false, reason: 'wrong-article' };
};
