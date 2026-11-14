// Ordinary user text runs (2.2553.1 qQ -> Ob for one trimmed text segment).
// Independent implementation of the observed contract; see
// analysis/user-markdown-20260920/source-contract.md. Only the branches the
// local Codex backend can feed are modelled: a leading /command token, inline
// backtick chips with an optional workspace file reference, Markdown links,
// bare URLs and plain text. Mentions, session pills, Slack spans, thread refs
// and cloaked secrets have no local data source and are deliberately absent.

// dx: a leading slash command token followed by whitespace or the end.
export const LEADING_SLASH = /^\/(\w[\w:.-]*)(?=\s|$)/;
// VQ: single-backtick spans never cross a line break.
const INLINE_CODE = /`([^`\n]+)`/g;
// R: Markdown link with an http(s) URL; the label may not contain ] or a
// newline and the URL keeps one level of balanced parentheses.
const MARKDOWN_LINK = /(?<!\w)\[([^\]\n]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g;
// C (cd902d735 export i): bare URL up to whitespace or an angle bracket.
const BARE_URL = /https?:\/\/[^\s<>]+/g;
// E (cd902d735 export t): bidi control characters stripped from link labels.
const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const TRAILING_PUNCTUATION = /[.,;:!?]$/;
// Ze / Qe / $e (user-markdown.js:165-167): how a link label names a host.
const LABEL_FULL_URL = /^(https?):\/\/([a-zA-Z0-9_.-]+)(:\d+)?(?:[/?#][\x21-\x7E]*)?$/i;
const LABEL_HOST = /^([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+|[a-zA-Z0-9_-]+(?=[:/?#]))(:\d+)?(?:[/?#][\x21-\x7E]*)?$/;
const LABEL_SCHEME = /^(https?):\/\//i;
// Ke (cd535dee8 export U = qe): a slash-separated path whose last part has an
// extension, optionally followed by :line, :line-endLine or :line:column.
const PATH_CHARS = "\\p{L}\\p{N}\\p{M}_";
const FILE_REF = new RegExp(
  `^([${PATH_CHARS}.()\\[\\]-]*(?:/[${PATH_CHARS}.()\\[\\]-]+)*/[${PATH_CHARS}()\\[\\]-]*\\.\\w[\\w.-]*)(?::(\\d+)(?:-(\\d+)|:\\d+)?)?$`,
  "u",
);
// Ob caps decorated matches at 256 per run; beyond that the run stays plain.
export const INLINE_RUN_CAP = 256;

function lineRange(line, endLine) {
  if (!line) return {};
  const first = Number(line);
  if (!endLine) return { line: first };
  const second = Number(endLine);
  if (second === first) return { line: first };
  return second < first ? { line: second, endLine: first } : { line: first, endLine: second };
}

// ug: inline chip text -> { path, line?, endLine? } or null.
export function parseFileRef(text) {
  if (typeof text !== "string" || text === "") return null;
  const match = FILE_REF.exec(text);
  return match ? { path: match[1], ...lineRange(match[2], match[3]) } : null;
}

// gy/Kn -> shared-11 oh(toAbs(path) ?? path, hasWorkspace): whether a parsed
// chip path may become the pane-opening link. The decision is purely
// syntactic (no stat): with a workspace the relative path is joined to the
// root and refused only when it is a UNC/device path (nh) or trips eh, i.e.
// exceeds 4096 characters, resolves under /net, /.vol or /.file (macOS
// automount roots) or nests more than 64 volume roots. Without a workspace
// only the UNC/device form is refused. Missing files are still links; the
// pane reports the real open failure.
const UNC_OR_DEVICE = /^(?:[\\/]{2}|[\\/]\?\?[\\/])/;
const WSL_SHARE = /^[\\/]{2}(wsl\$|wsl\.localhost)(?=[\\/]|$)/i;
const DRIVE_ABSOLUTE = /^[A-Za-z]:[\\/]/;
const AUTOMOUNT_ROOTS = new Set(["net", ".vol", ".file"]);
const MAX_CHIP_PATH = 4096;
const MAX_VOLUME_NESTING = 64;
const isVolumeRoot = (stack) => (stack.length === 2 && stack[0] === "volumes")
  || (stack.length === 3 && stack[0] === "system" && stack[1] === "volumes" && stack[2] === "data");
function refusedAbsolutePath(value) {
  const text = value === "~" || /^~[\\/]/.test(value) ? `/~/${value.slice(2)}` : value;
  if (!text.startsWith("/")) return false;
  if (text.length > MAX_CHIP_PATH) return true;
  let stacks = [[]];
  for (const segment of text.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stacks.forEach((stack) => stack.pop());
      const firstEmpty = stacks.findIndex((stack) => stack.length === 0);
      stacks = stacks.filter((stack, index) => stack.length > 0 || index === firstEmpty);
      continue;
    }
    const part = segment.normalize("NFKC").toLowerCase();
    let volume = false;
    for (const stack of stacks) {
      stack.push(part);
      if (AUTOMOUNT_ROOTS.has(stack[0] ?? "")) return true;
      if (isVolumeRoot(stack)) volume = true;
    }
    if (volume) {
      stacks.push([]);
      if (stacks.length > MAX_VOLUME_NESTING) return true;
    }
  }
  return false;
}
const isUncOrDevice = (value) => UNC_OR_DEVICE.test(value) && !WSL_SHARE.test(value);
export function chipPathOpenable(path, workspaceRoot = null) {
  if (typeof path !== "string" || path === "") return false;
  const root = typeof workspaceRoot === "string" && workspaceRoot !== "" ? workspaceRoot : null;
  if (root === null) return !isUncOrDevice(path);
  const absolute = path.startsWith("/") || DRIVE_ABSOLUTE.test(path) ? path : `${root.replace(/[\\/]+$/, "")}/${path}`;
  return !(isUncOrDevice(absolute) || refusedAbsolutePath(absolute));
}

// rl (shared-0 mO): only http(s) URLs survive, normalized by the URL parser.
export function normalizeHttpUrl(value) {
  if (typeof value !== "string" || value === "") return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.href;
}

function labelHost(label) {
  const trimmed = label.trim();
  const full = LABEL_FULL_URL.exec(trimmed);
  if (full) return { host: full[2].toLowerCase(), port: full[3]?.slice(1) ?? null };
  const bare = LABEL_HOST.exec(trimmed);
  return bare ? { host: bare[1].toLowerCase(), port: bare[2]?.slice(1) ?? null } : null;
}

function labelScheme(label) {
  const printable = label.replace(/[^\x21-\x7E]+/g, "");
  return LABEL_SCHEME.exec(printable)?.[1].toLowerCase() ?? null;
}

// H: decide whether a Markdown label needs a "(→ host)" disclosure.
export function linkTarget(label, href) {
  const normalized = normalizeHttpUrl(href);
  if (normalized === null) return { kind: "plain" };
  const url = new URL(normalized);
  const named = labelHost(label);
  const effectivePort = url.port || (url.protocol === "https:" ? "443" : "80");
  const scheme = labelScheme(label);
  const schemeMismatch = scheme !== null && `${scheme}:` !== url.protocol;
  const matches = url.username === "" && url.password === "" && !schemeMismatch
    && named !== null && named.host === url.hostname
    && (named.port === null || named.port === effectivePort);
  const shown = named !== null && named.port !== null && named.port !== effectivePort
    ? `${url.hostname}:${effectivePort}` : url.host;
  return { kind: "link", href: normalized, discloseHost: matches ? null : schemeMismatch ? `${url.protocol}//${shown}` : shown };
}

// Oe (cd902d735 export a): drop one trailing punctuation mark, then any
// closing parentheses that have no opening partner inside the URL.
export function trimBareUrl(match) {
  let href = match;
  if (TRAILING_PUNCTUATION.test(href)) href = href.slice(0, -1);
  let opening = (href.match(/\(/g) ?? []).length;
  let closing = (href.match(/\)/g) ?? []).length;
  while (closing > opening && href.endsWith(")")) { href = href.slice(0, -1); closing--; }
  return [href, match.slice(href.length)];
}

// Ob for the local subset: Markdown links first, then bare URLs in what is
// left; every slice between decorated matches is re-run so bare URLs before
// or after a Markdown link are still linked.
function textRuns(text, base, budget) {
  if (text === "") return [];
  const plain = () => [{ kind: "text", start: base, end: base + text.length, text }];
  if (text.includes("](")) {
    const runs = [];
    let cursor = 0;
    for (const match of text.matchAll(MARKDOWN_LINK)) {
      if (budget.count >= INLINE_RUN_CAP) return null;
      if (match.index > cursor) {
        const inner = textRuns(text.slice(cursor, match.index), base + cursor, budget);
        if (inner === null) return null;
        runs.push(...inner);
      }
      const label = match[1].replace(BIDI_CONTROLS, "");
      const target = linkTarget(label, match[2]);
      const start = base + match.index, end = start + match[0].length;
      if (target.kind === "plain") runs.push({ kind: "text", start, end, text: match[0] });
      else { budget.count++; runs.push({ kind: "link", start, end, text: match[0], href: target.href, label, discloseHost: target.discloseHost }); }
      cursor = match.index + match[0].length;
    }
    if (cursor > 0) {
      if (cursor < text.length) {
        const tail = textRuns(text.slice(cursor), base + cursor, budget);
        if (tail === null) return null;
        runs.push(...tail);
      }
      return runs;
    }
  }
  if (!text.includes("://")) return plain();
  const runs = [];
  let cursor = 0;
  for (const match of text.matchAll(BARE_URL)) {
    if (budget.count >= INLINE_RUN_CAP) return null;
    if (match.index > cursor) runs.push({ kind: "text", start: base + cursor, end: base + match.index, text: text.slice(cursor, match.index) });
    const [href, trailing] = trimBareUrl(match[0]);
    const start = base + match.index;
    budget.count++;
    runs.push({ kind: "link", start, end: start + href.length, text: href, href, label: href, discloseHost: null, bare: true });
    if (trailing) runs.push({ kind: "text", start: start + href.length, end: start + match[0].length, text: trailing });
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) return plain();
  if (cursor < text.length) runs.push({ kind: "text", start: base + cursor, end: base + text.length, text: text.slice(cursor) });
  return runs;
}

// qQ for one trimmed text segment. Runs are contiguous over `text` with
// UTF-16 offsets; a run beyond the cap collapses the whole segment to text.
export function parseInlineRuns(text, { leadingSlash = false } = {}) {
  if (typeof text !== "string" || text === "") return [];
  const whole = [{ kind: "text", start: 0, end: text.length, text }];
  const runs = [];
  const budget = { count: 0 };
  let offset = 0;
  if (leadingSlash) {
    const match = LEADING_SLASH.exec(text);
    if (match) {
      runs.push({ kind: "slash", start: 0, end: match[0].length, text: match[0], name: match[1] });
      offset = match[0].length;
      budget.count++;
    }
  }
  const body = text.slice(offset);
  let cursor = 0;
  for (const match of body.matchAll(INLINE_CODE)) {
    if (budget.count >= INLINE_RUN_CAP) return whole;
    if (match.index > cursor) {
      const between = textRuns(body.slice(cursor, match.index), offset + cursor, budget);
      if (between === null) return whole;
      runs.push(...between);
    }
    const start = offset + match.index;
    budget.count++;
    runs.push({ kind: "code", start, end: start + match[0].length, text: match[1], fileRef: parseFileRef(match[1]) });
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) {
    const tail = textRuns(body.slice(cursor), offset + cursor, budget);
    if (tail === null) return whole;
    runs.push(...tail);
  }
  return runs;
}

// d$: the pill only exists when the message carries no file-type attachment
// and the raw message text itself starts with the token.
export function hasLeadingSlashCommand(text, { hasFileAttachments = false } = {}) {
  return !hasFileAttachments && typeof text === "string" && LEADING_SLASH.test(text);
}
