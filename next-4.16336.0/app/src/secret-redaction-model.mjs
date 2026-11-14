// Secret detection and masking for settled code (fences and inline code).
// Ported from ion-dist/assets/v1/shared-4-D8W6lHTW.js: the pattern table Bd
// (with the Pd boundary guard and per-pattern triggers), tf (detect: matches
// sorted and merged, scanning a zero-width-stripped shadow too), of (mask one
// value with bullets) and lf (mask a text by its matches); the labels are
// code-block-current.js:1021-1035 Tr. Pure: no DOM.

const BOUNDARY = "(?<![A-Za-z0-9_-])";
const SPACES = "\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000";
const BREAKS = `\\t\\v\\f\\r\\n\\u2028\\u2029 ${SPACES}`;
const GAP = `[${BREAKS}]*`;
const PEM_BEGIN = RegExp(`-----BEGIN[A-Z${BREAKS}]*PRIVATE${GAP}KEY-----`);
const PEM_END = RegExp(`-----END[A-Z${BREAKS}]*PRIVATE${GAP}KEY-----`);

export const SECRET_PATTERNS = Object.freeze([
  { id: "anthropic", regex: RegExp(`${BOUNDARY}sk-ant-[A-Za-z0-9_-]{20,}`), trigger: "sk-ant-" },
  { id: "openai_proj", regex: RegExp(`${BOUNDARY}sk-proj-[A-Za-z0-9_-]{20,}`), trigger: "sk-proj-" },
  // Also the shape of a DeepSeek key (sk- and 32 hex characters).
  { id: "openai", regex: RegExp(`${BOUNDARY}sk-[A-Za-z0-9]{20,}`), trigger: "sk-[A-Za-z0-9]{20}" },
  { id: "github", regex: RegExp(`${BOUNDARY}(?:gh[opsu]_|github_pat_)[A-Za-z0-9_]{20,}`), trigger: "gh[opsu]_|github_pat_" },
  { id: "aws", regex: RegExp(`${BOUNDARY}AKIA[A-Z0-9]{16}`), trigger: "AKIA" },
  { id: "slack", regex: RegExp(`${BOUNDARY}xox[abprs]-[A-Za-z0-9-]{10,}`), trigger: "xox[abprs]-" },
  { id: "google", regex: RegExp(`${BOUNDARY}AIza[A-Za-z0-9_-]{35}`), trigger: "AIza" },
  { id: "stripe", regex: RegExp(`${BOUNDARY}(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}`), trigger: "[sr]k_(?:live|test)_[A-Za-z0-9]{20}" },
  { id: "stripe_webhook", regex: RegExp(`${BOUNDARY}whsec_[A-Za-z0-9]{20,}`), trigger: "whsec_[A-Za-z0-9]{20}" },
  { id: "age", regex: RegExp(`${BOUNDARY}AGE-SECRET-KEY-1[02-9AC-HJ-NP-Z]{58}`), trigger: "AGE-SECRET-KEY-1" },
  { id: "jwt", regex: RegExp(`${BOUNDARY}eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}`), trigger: "\\.eyJ" },
  { id: "private_key", regex: RegExp(`${PEM_BEGIN.source}[A-Za-z0-9+/=$\\\\\\r\\n\\u2028\\u2029${SPACES}]{0,5000}?${PEM_END.source}`), trigger: `PRIVATE${GAP}KEY-----` },
]);

export const SECRET_LABELS = Object.freeze({
  anthropic: "Anthropic API key", openai_proj: "OpenAI API key", openai: "OpenAI API key", github: "GitHub token",
  aws: "AWS access key", slack: "Slack token", google: "Google API key", stripe: "Stripe API key",
  stripe_webhook: "Stripe webhook secret", age: "age secret key", jwt: "JWT", private_key: "private key", unknown: "secret",
});
export const secretLabel = (patternId) => Object.hasOwn(SECRET_LABELS, patternId) ? SECRET_LABELS[patternId] : SECRET_LABELS.unknown;

/** Longest text scanned (Gd); a longer text is reported as having no secrets. */
export const SECRET_SCAN_LIMIT = 262_144;
const ANY = SECRET_PATTERNS.map((pattern) => `(?:${pattern.regex.source})`).join("|");
const TRIGGER = new RegExp(SECRET_PATTERNS.map((pattern) => `(?:${pattern.trigger})`).join("|"));
const allMatches = () => new RegExp(ANY, "g");
const patternFor = (value) => SECRET_PATTERNS.find((pattern) => pattern.regex.test(value));

// Kd/qd: characters that can hide a secret's continuity (zero-width,
// format, combining marks, braille blank, object replacement, controls).
const HIDDEN = /[\p{Default_Ignorable_Code_Point}\p{Cf}\p{Cs}\p{Mn}\p{Mc}\p{Me}⠀￼]|(?![\t\n\r])\p{Cc}/u;
const HIDDEN_RUN = RegExp(`(?:${HIDDEN.source})+`, "gu");
const NON_ASCII = /[^\t\n\r\x20-\x7E]/;
const SECRET_START = RegExp(`^(?:${SECRET_PATTERNS.filter(({ regex }) => regex.source.startsWith(BOUNDARY))
  .map(({ regex }) => `(?:${regex.source.slice(BOUNDARY.length)})`).concat(PEM_BEGIN.source).join("|")})`);
const LOOKAHEAD = 512;
const JWT_START = /^eyJ[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*){0,2}$/;
const WORD = /[A-Za-z0-9_-]/;
const EDGE = "\0";

// ef: a copy of the text with hidden runs removed. When a previous shadow is
// given, a hidden run right after a word character that starts a secret in
// that shadow is kept as a NUL edge, so the boundary guard still applies.
function shadowOf(text, previous) {
  let removedBefore = 0, edges = 0, shift = 0;
  const starts = [], shifts = [];
  const shadow = text.replace(HIDDEN_RUN, (run, index) => {
    const at = index - removedBefore;
    removedBefore += run.length;
    const ahead = previous !== undefined && index > 0 && WORD.test(text[index - 1]) ? previous.slice(at, at + LOOKAHEAD) : undefined;
    const edge = ahead !== undefined && (SECRET_START.test(ahead) || (ahead.length === LOOKAHEAD && JWT_START.test(ahead))) ? EDGE : "";
    edges += edge.length;
    starts.push(index - shift + edge.length);
    shift += run.length - edge.length;
    shifts.push(shift);
    return edge;
  });
  const toRaw = (offset) => {
    let low = 0, high = starts.length;
    while (low < high) { const middle = (low + high) >>> 1; if (starts[middle] <= offset) low = middle + 1; else high = middle; }
    return low === 0 ? offset : offset + shifts[low - 1];
  };
  return { shadow, edges, toRaw };
}

/** tf: secrets in `text` as sorted, non-overlapping {start, end, value, patternId}. */
export function detectSecrets(text) {
  if (typeof text !== "string" || text.length > SECRET_SCAN_LIMIT) return [];
  const found = [];
  const add = (start, end, value) => found.push({ start, end, patternId: patternFor(value)?.id ?? "unknown" });
  if (TRIGGER.test(text)) for (const match of text.matchAll(allMatches())) add(match.index, match.index + match[0].length, match[0]);
  if (NON_ASCII.test(text) && HIDDEN.test(text)) {
    const scan = (previous) => {
      const { shadow, edges, toRaw } = shadowOf(text, previous);
      if ((previous === undefined || edges !== 0) && TRIGGER.test(shadow))
        for (const match of shadow.matchAll(allMatches())) add(toRaw(match.index), toRaw(match.index + match[0].length - 1) + 1, match[0]);
      return shadow;
    };
    scan(scan());
  }
  found.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const match of found) {
    const last = merged[merged.length - 1];
    if (last !== undefined && match.start < last.end) last.end = Math.max(last.end, match.end);
    else merged.push({ ...match });
  }
  return merged.map(({ start, end, patternId }) => ({ start, end, value: text.slice(start, end), patternId }));
}

const KEEP = 8;
const PEM = "-----BEGIN";
// af: the index after the fifth '-' that closes the BEGIN header line.
function pemBodyStart(value) {
  let dashes = 0;
  for (let index = 10; index < value.length;) {
    const char = String.fromCodePoint(value.codePointAt(index) ?? 0);
    if (char === "-") { dashes += 1; if (dashes === 5) return index + 1; }
    else if (!HIDDEN.test(char)) dashes = 0;
    index += char.length;
  }
  return -1;
}
/** of: bullets for one secret. A PEM block keeps its header, footer and line
 * breaks; a short value is all bullets; a longer one keeps its first 8 characters. */
export function maskSecret(value) {
  if (value.startsWith(PEM)) {
    const footer = value.lastIndexOf("-----END"), end = footer >= 0 ? footer : value.length;
    const header = pemBodyStart(value), start = header >= 0 && header <= end ? header : 10;
    return value.slice(0, start) + value.slice(start, end).replace(/[^\n]/g, "•") + value.slice(end);
  }
  if (!HIDDEN.test(value)) return value.length <= 12 ? "•".repeat(value.length) : value.slice(0, KEEP) + "•".repeat(value.length - KEEP);
  let visible = 0, cut = 0;
  for (let index = 0; index < value.length;) {
    const char = String.fromCodePoint(value.codePointAt(index) ?? 0);
    index += char.length;
    if (!HIDDEN.test(char)) { visible += 1; if (visible === KEEP) cut = index; }
  }
  return visible <= 12 ? "•".repeat(value.length) : value.slice(0, cut) + "•".repeat(value.length - cut);
}
/** lf: `text` with every match replaced by its mask. */
export function maskSecrets(text, matches = detectSecrets(text)) {
  if (!matches.length) return text;
  let result = "", offset = 0;
  for (const match of matches) { result += text.slice(offset, match.start) + maskSecret(match.value); offset = match.end; }
  return result + text.slice(offset);
}
