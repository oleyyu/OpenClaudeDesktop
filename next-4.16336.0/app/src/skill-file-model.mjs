import { parseDocument } from 'yaml';

const hiddenFields = new Set(['name', 'user-invocable', 'argument-hint']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// shared-16 qk uses a 200 KiB UTF-8 limit. The line cap is an explicit local
// safeguard while this independent viewer has no virtual row implementation.
export function skillFileIsLarge(source) {
  if (source.length > 204800 || new TextEncoder().encode(source).length > 204800) return true;
  let lines = 1;
  for (const character of source) if (character === '\n' && ++lines > 10000) return true;
  return false;
}

// Independent interpretation of c1ff8b71a + the caller's W gate. Invalid or
// name-only frontmatter must remain visible through the normal Markdown path.
// Raw mode always receives the original string, never this presentation model.
export function skillFilePreview(source) {
  const fallback = { structured: false, fields: [], content: source };
  if (skillFileIsLarge(source)) return fallback;
  const header = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!header) return fallback;
  try {
    const document = parseDocument(header[1], { prettyErrors: false });
    if (document.errors.length || document.warnings.length) return fallback;
    const data = document.toJS({ maxAliasCount: 50 });
    if (!object(data)) return fallback;
    const fields = [];
    let description = null;
    const stack = new Set();
    let visits = 0;
    const collect = (record, depth = 0) => {
      if (stack.has(record)) return;
      if (depth > 40 || ++visits > 4096) throw Error('Metadata limit');
      stack.add(record);
      for (const [key, value] of Object.entries(record)) {
        if (object(value)) { collect(value, depth + 1); continue; }
        if (value == null) continue;
        let display;
        try { display = Array.isArray(value) && value.some(item => item !== null && typeof item === 'object')
          ? JSON.stringify(value) : String(value); }
        catch { display = '[circular]'; }
        display = display.trim();
        if (display) fields.push({ key, value: display });
      }
      stack.delete(record);
    };
    for (const [key, value] of Object.entries(data)) {
      if (key === 'description' && !object(value)) {
        if (value != null && String(value).trim()) description = String(value).trim();
      } else if (!hiddenFields.has(key) || object(value)) collect({ [key]: value });
    }
    return description !== null || fields.length > 0
      ? { structured: true, fields, content: header[2].trim() } : fallback;
  } catch { return fallback; }
}

export function skillFieldLabel(key) {
  return key.replaceAll('-', ' ').replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}

export function skillSourceLines(source) {
  return source.split('\n');
}
