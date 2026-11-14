// Import Chat History's token arithmetic (targets.mjs budgets, convert.mjs toTranscriptText): a cheap estimate, no
// tokenizer. CJK characters (Han, kana, Hangul, CJK punctuation and full-width forms) count about one token each,
// everything else about four characters a token — close enough to size a share of a model's context window.
// Pure: no I/O.

const CJK = /[ᄀ-ᇿ⺀-⿟　-ヿ㄀-ㇿ㈀-䶿一-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-￯]|[\u{20000}-\u{3134F}]/gu;

/** Estimated tokens of a text (CJK ≈ 1 a character, the rest ≈ 4 characters a token). */
export function estimateTokens(text) {
  if (typeof text !== 'string' || !text) return 0;
  let cjk = 0, cjkUnits = 0;
  for (const match of text.matchAll(CJK)) { cjk += 1; cjkUnits += match[0].length; }
  return cjk + Math.ceil((text.length - cjkUnits) / 4);
}

/** The longest end of `text` within `tokens` (binary search on the cut; never splits a surrogate pair). */
export function tailWithinTokens(text, tokens) {
  if (typeof text !== 'string' || tokens <= 0) return '';
  if (estimateTokens(text) <= tokens) return text;
  let low = 0, high = text.length; // the answer's start lies in (low, high]
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (estimateTokens(text.slice(mid)) <= tokens) high = mid; else low = mid;
  }
  const code = text.charCodeAt(high);
  return text.slice(code >= 0xDC00 && code <= 0xDFFF ? high + 1 : high);
}

/** The longest start of `text` within `tokens`. */
export function headWithinTokens(text, tokens) {
  if (typeof text !== 'string' || tokens <= 0) return '';
  if (estimateTokens(text) <= tokens) return text;
  let low = 0, high = text.length; // the answer's end lies in [low, high)
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (estimateTokens(text.slice(0, mid)) <= tokens) low = mid; else high = mid;
  }
  const code = text.charCodeAt(low - 1);
  return text.slice(0, code >= 0xD800 && code <= 0xDBFF ? low - 1 : low);
}
