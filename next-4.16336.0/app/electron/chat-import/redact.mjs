// Import Chat History: likely secrets masked in everything an import hands to a model (targets.mjs prepareImport: the
// handoff transcript, the inject items, the DeepSeek seed) — another provider must not receive the keys an old chat
// happened to print. The display prefix and the originals keep their text; the structured display of a tool call that
// travels with the seed to a core (redactValue) is masked like its text. Pure: no I/O.
//
// Covered: OpenAI / Anthropic / DeepSeek-style `sk-…` keys, GitHub tokens (ghp_ / gho_ / ghu_ / ghs_ / ghr_,
// github_pat_), AWS access key ids (AKIA / ASIA), Slack tokens (xoxa- / xoxb- / xoxp- / xoxr- / xoxs-), Google API keys,
// `Bearer <token>`, PEM private key blocks, and .env-style `NAME=value` lines (or JSON `"name": "value"` pairs) whose
// name contains KEY, TOKEN, SECRET or PASSWORD.

export const REDACTED = '[REDACTED]';
const EDGE = '(?<![A-Za-z0-9_-])';
const PATTERNS = [
  RegExp(`-----BEGIN[A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END[A-Z ]*PRIVATE KEY-----`, 'g'),
  RegExp(`${EDGE}sk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}`, 'g'),
  RegExp(`${EDGE}(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})`, 'g'),
  RegExp(`${EDGE}(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Za-z0-9])`, 'g'),
  RegExp(`${EDGE}xox[abprs]-[A-Za-z0-9-]{10,}`, 'g'),
  RegExp(`${EDGE}AIza[A-Za-z0-9_-]{35}`, 'g'),
];
const BEARER = /\b(Bearer[ \t]+)[A-Za-z0-9._~+/-]{16,}=*/g;
const NAME = '[A-Za-z0-9_.-]*(?:key|token|secret|password|passwd)[A-Za-z0-9_.-]*';
// NAME=value on its own line (optionally `export`): quoted, or a bare value that is no call or expression.
const ENV_LINE = RegExp(`^([ \\t]*(?:export[ \\t]+)?${NAME}[ \\t]*=[ \\t]*)(?:"[^"\\n]{4,}"|'[^'\\n]{4,}'|[^\\s'"(){};,]{4,})(?=[ \\t]*(?:#.*)?$)`, 'gim');
const JSON_PAIR = RegExp(`("${NAME}"[ \\t]*:[ \\t]*)"[^"\\n]{4,}"`, 'gi');

const SECRET_FIELD = RegExp(`^${NAME}$`, 'i');
// What is left of a PEM block a display string was clipped through (convert.mjs clips arguments and diffs longer than
// the text's): an opening line to the string's end, or the string's start to a closing line.
const PEM_OPENED = /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*$/;
const PEM_CLOSED = /^[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/;

/**
 * A JSON value (a tool call's structured display, convert.mjs toolCallDisplay) with every string redacted like text,
 * and the string of a field whose name says secret (KEY, TOKEN, SECRET, PASSWORD: the ENV_LINE / JSON_PAIR rule for
 * structured data) masked whole → { value, count, strings } (strings: the redacted strings, in order, so a caller can
 * check what they spell together). A string's value also loses the part of a private key block whose other end it
 * lacks (strings still hold it, for that check).
 */
export function redactValue(value) {
  let count = 0;
  const strings = [];
  const walk = (entry, field) => {
    if (typeof entry === 'string') {
      if (field !== null && SECRET_FIELD.test(field) && entry.length >= 4 && !entry.includes(REDACTED)) { count += 1; strings.push(REDACTED); return REDACTED; }
      const clean = redactSecrets(entry);
      count += clean.count;
      // strings keeps a key's loose end, so the caller sees a key its text and this string spell together.
      strings.push(clean.text);
      return clean.text.replace(PEM_CLOSED, () => { count += 1; return REDACTED; }).replace(PEM_OPENED, () => { count += 1; return REDACTED; });
    }
    if (Array.isArray(entry)) return entry.map((item) => walk(item, null));
    if (entry && typeof entry === 'object') return Object.fromEntries(Object.entries(entry).map(([key, item]) => [key, walk(item, key)]));
    return entry;
  };
  return { value: walk(value, null), count, strings };
}

/** `text` with likely secrets replaced by [REDACTED] → { text, count }. */
export function redactSecrets(text) {
  if (typeof text !== 'string' || !text) return { text: typeof text === 'string' ? text : '', count: 0 };
  let count = 0;
  const hit = () => { count += 1; return REDACTED; };
  let out = text;
  for (const pattern of PATTERNS) out = out.replace(pattern, hit);
  out = out.replace(BEARER, (match, prefix) => { count += 1; return `${prefix}${REDACTED}`; });
  out = out.replace(ENV_LINE, (match, prefix) => { if (match.slice(prefix.length).includes(REDACTED)) return match; count += 1; return `${prefix}${REDACTED}`; });
  out = out.replace(JSON_PAIR, (match, prefix) => { if (match.slice(prefix.length).includes(REDACTED)) return match; count += 1; return `${prefix}"${REDACTED}"`; });
  return { text: out, count };
}
