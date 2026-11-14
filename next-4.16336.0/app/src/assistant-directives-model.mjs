// Codex App directives in assistant markdown (codex-rs tui/src/assistant_directives.rs, git_action_directives.rs).
// Review skills such as Codex Security write one `::code-comment{title body file start end priority}` per finding,
// and git skills end with receipts such as `::git-create-pr{cwd branch url}`. The Codex TUI turns each code comment
// into a '- [P1] title — file:start-end' item with its body under it, and removes the git receipts from the visible
// text. Here a code comment becomes a list item whose priority link (#codex-priority-N) the transcript renders as a
// badge and whose location links to the file viewer; a git receipt is removed, a created PR's url kept as a link.
// Fenced code and inline code spans are left alone, and while a reply streams an unfinished directive is held back.

const isNameChar = (character) => /[A-Za-z0-9_-]/.test(character);

/**
 * One directive at the start of `source` ('::name{key="value" flag=true}', one to three colons), or null. backslash:
 * a `\"` inside a quoted value is a literal quote (review comments); otherwise backslashes are literal (git receipts).
 */
export function parseAssistantDirective(source, { backslash = false } = {}) {
  if (typeof source !== 'string') return null;
  const colons = /^:{1,3}/.exec(source)?.[0].length ?? 0;
  if (!colons || source[colons] === ':') return null;
  let index = colons;
  while (index < source.length && isNameChar(source[index])) index += 1;
  const name = source.slice(colons, index);
  if (!name || !/^[A-Za-z]/.test(name) || source[index] !== '{') return null;
  index += 1;
  const attributes = {};
  const skipSpace = () => { while (source[index] === ' ' || source[index] === '\t') index += 1; };
  for (;;) {
    skipSpace();
    if (index >= source.length) return null;
    if (source[index] === '}') return { name, attributes, raw: source.slice(0, index + 1) };
    const keyStart = index;
    while (index < source.length && isNameChar(source[index])) index += 1;
    const key = source.slice(keyStart, index);
    if (!key || Object.hasOwn(attributes, key)) return null;
    skipSpace();
    if (source[index] !== '=') return null;
    index += 1;
    skipSpace();
    const delimiter = source[index];
    if (delimiter === '"' || delimiter === "'") {
      index += 1;
      let value = '';
      for (;;) {
        const character = source[index];
        if (character === undefined || character === '\n' || character === '\r') return null;
        if (character === delimiter) { index += 1; break; }
        if (character === '\\' && backslash && source[index + 1] === delimiter) { value += delimiter; index += 2; continue; }
        value += character;
        index += 1;
      }
      attributes[key] = value;
    } else {
      const start = index;
      while (index < source.length && !' \t}\n\r'.includes(source[index])) index += 1;
      if (index === start) return null;
      attributes[key] = source.slice(start, index);
    }
  }
}

const integer = (value) => {
  if (typeof value !== 'string') return null;
  const number = Number(value.trim().replace(/^[Pp]/, ''));
  return Number.isInteger(number) ? number : null;
};

/** A parsed ::code-comment as a finding, or null when its title, body or file is missing (the TUI's rule). */
export function codeCommentFinding(directive, cwd = null) {
  if (directive?.name !== 'code-comment') return null;
  const title = directive.attributes.title?.trim(), body = directive.attributes.body?.trim(), file = directive.attributes.file?.trim();
  if (!title || !body || !file) return null;
  const start = Math.max(1, integer(directive.attributes.start) ?? 1);
  const end = Math.max(start, integer(directive.attributes.end) ?? start);
  const titled = /^\[[Pp](\d)\]\s*/.exec(title);
  const stated = integer(directive.attributes.priority);
  const priority = titled ? Number(titled[1]) : stated !== null && stated >= 0 && stated <= 3 ? stated : null;
  const base = typeof cwd === 'string' && cwd ? cwd.replace(/[\\/]+$/, '') : null;
  const display = (base && file.startsWith(`${base}/`) ? file.slice(base.length + 1) : file).replaceAll('\\', '/');
  return { title: titled ? title.slice(titled[0].length).trim() || title : title, body, file, display, start, end, priority };
}

// Markdown-safe text for a link label (brackets and backslashes would end or escape it).
const labelText = (text) => text.replace(/[\\[\]]/g, (character) => `\\${character}`);
const fileHref = (file, start, end) => {
  const path = encodeURI(file.replaceAll('\\', '/')).replace(/[()<>]/g, (character) => encodeURIComponent(character));
  const fragment = start === end ? `#L${start}` : `#L${start}-L${end}`;
  return `${file.startsWith('/') ? 'file://' : ''}${path}${fragment}`;
};

/** The markdown a finding renders as: '- [P1](#codex-priority-1) **title** — [file:10-12](file:///…#L10-L12)', body under it. */
export function findingMarkdown(finding, indent = '') {
  const location = finding.start === finding.end ? `${finding.display}:${finding.start}` : `${finding.display}:${finding.start}-${finding.end}`;
  const badge = finding.priority === null ? '' : `[P${finding.priority}](#codex-priority-${finding.priority}) `;
  const title = finding.title.replace(/\*\*/g, '\\*\\*');
  return `${indent}- ${badge}**${title}** — [${labelText(location)}](<${fileHref(finding.file, finding.start, finding.end)}>)\n${indent}  ${finding.body}`;
}

// Whether `offset` on a line sits inside an inline code span (an odd number of backtick runs before it).
function insideCodeSpan(line, offset) {
  let open = null;
  for (let index = 0; index < offset; index += 1) {
    if (line[index] !== '`') continue;
    let run = 1;
    while (line[index + run] === '`') run += 1;
    if (open === null) open = run; else if (open === run) open = null;
    index += run - 1;
  }
  return open !== null;
}

/**
 * A line with its ::git-* receipts removed (the TUI's strip_line_directives): a created PR's url stays as a link.
 * streaming: an unfinished receipt at the end of the reply is held back instead of shown raw.
 */
function stripGitReceipts(line, { holdUnfinished = false } = {}) {
  if (!line.includes('::git-')) return line;
  let visible = '', rest = line, consumed = 0;
  for (;;) {
    const found = rest.indexOf('::git-');
    if (found < 0) break;
    const at = rest.slice(found);
    // A colon run longer than two before it (':::git-') still starts at its first colon, as in the TUI.
    if (insideCodeSpan(line, consumed + found)) { visible += rest.slice(0, found + 6); consumed += found + 6; rest = rest.slice(found + 6); continue; }
    visible += rest.slice(0, found);
    const directive = parseAssistantDirective(at);
    if (directive) {
      const url = directive.name === 'git-create-pr' ? directive.attributes.url?.trim() : null;
      if (url && /^https?:\/\/\S+$/i.test(url)) visible += `<${url}>`;
      consumed += found + directive.raw.length;
      rest = at.slice(directive.raw.length);
      continue;
    }
    const close = at.indexOf('}');
    if (at.includes('{') && close > at.indexOf('{')) { consumed += found + close + 1; rest = at.slice(close + 1); continue; }
    if (holdUnfinished) return visible.trimEnd();
    visible += at;
    rest = '';
    break;
  }
  return visible + rest;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * The reply as the transcript shows it: each ::code-comment line becomes a finding item and ::git-* receipts are
 * removed, outside fenced code. cwd: the session folder, so a finding names its file relative to it. streaming: an
 * unfinished directive on the reply's last line is held back until it closes.
 */
export function rewriteAssistantDirectives(text, { cwd = null, streaming = false } = {}) {
  if (typeof text !== 'string' || !text.includes('::')) return text;
  if (!/::(?:code-comment|git-)/.test(text)) return text;
  const lines = text.split('\n');
  let fence = null, changed = false;
  const out = lines.map((line, index) => {
    const last = index === lines.length - 1;
    const marker = FENCE.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = null;
      return line;
    }
    if (marker && !(marker[1][0] === '`' && line.slice(marker[0].length).includes('`'))) { fence = marker[1]; return line; }
    const content = line.replace(/^[ \t]+/, '');
    const indent = line.slice(0, line.length - content.length);
    if (/^:{1,3}code-comment\{/.test(content)) {
      const directive = parseAssistantDirective(content, { backslash: true });
      const finding = directive && codeCommentFinding(directive, cwd);
      if (finding) {
        changed = true;
        const suffix = stripGitReceipts(content.slice(directive.raw.length), { holdUnfinished: streaming && last }).trimEnd();
        return findingMarkdown(finding, indent) + suffix;
      }
      if (!directive && streaming && last) { changed = true; return ''; }
    }
    const stripped = stripGitReceipts(line, { holdUnfinished: streaming && last });
    if (stripped !== line) changed = true;
    return stripped === line ? line : stripped.trimEnd();
  });
  if (!changed) return text;
  // A reply that ended in receipts loses the trailing lines they leave empty, as the TUI trims them.
  // While streaming only the lines a held-back directive emptied go, so the reply's own line breaks stay put.
  while (out.length > 1 && out.at(-1).trim() === '' && (!streaming || lines[out.length - 1].trim() !== '')) out.pop();
  return out.join('\n');
}

/** The priority a '#codex-priority-N' link stands for (0–3), or null. */
export function directivePriority(href) {
  const match = typeof href === 'string' ? /^#codex-priority-([0-3])$/.exec(href) : null;
  return match ? Number(match[1]) : null;
}
