/**
 * The official form is a Korean government document, so every value the user
 * types lands on the PDF in Korean. Nothing here blocks input — the user's own
 * name may legitimately be the Latin spelling printed on their alien
 * registration card, and we cannot tell that apart from "typed in the wrong
 * language" without knowing the card.
 *
 * So this only detects characters that certainly cannot belong on the form and
 * lets the UI warn. Two reasons a warning beats a block:
 *
 * 1. **Khmer silently becomes `?`.** The bundled fonts are Korean, Latin and
 *    Thai — there is no Khmer face, so PdfStamper substitutes `?` and reports
 *    the field in `X-Unrenderable-Fields`. The user finds out at the counter.
 * 2. **Vietnamese does not.** `NotoSans` covers Vietnamese diacritics, so a
 *    Vietnamese address renders cleanly onto a Korean form and nothing warns
 *    at all. That is the worse failure of the two.
 */

/** Hangul syllables and jamo, Latin letters, digits, and the punctuation a Korean form uses. */
const ALLOWED = /^[가-힣ᄀ-ᇿ㄰-㆏A-Za-z0-9\s.,\-()/#·:'’]*$/u;

/** Characters outside the allowed set, de-duplicated, for the warning message. */
export function disallowedCharacters(value: string): string[] {
  if (!value || ALLOWED.test(value)) return [];
  const seen = new Set<string>();
  for (const char of value) {
    if (!ALLOWED.test(char)) seen.add(char);
  }
  return [...seen];
}

export function hasDisallowedCharacters(value: string): boolean {
  return disallowedCharacters(value).length > 0;
}
