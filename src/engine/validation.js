// Validate German word input with tolerance rules: case-insensitive,
// articles flexible, umlaut-tolerant. Used by Reverse Mode to check typed
// answers without being overly strict about things that don't actually
// indicate the learner got the word wrong.
export const validateGermanWord = (userInput, correctWord) => {
  const normalize = (s) => {
    if (!s || typeof s !== 'string') return '';
    // strip articles (der, die, das - case insensitive)
    const noArticle = s.trim().replace(/^(der|die|das)\s+/i, '');
    // lowercase
    const lower = noArticle.toLowerCase();
    // umlaut-tolerant: convert ä→ae, ö→oe, ü→ue
    const unumlauted = lower
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
    return unumlauted.trim();
  };

  const userNorm = normalize(userInput);
  const correctNorm = normalize(correctWord);

  return userNorm === correctNorm && userNorm.length > 0;
};
