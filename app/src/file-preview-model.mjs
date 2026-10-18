import { parseCsvPreview as currentCsvPreview } from './generated/code-current/csv-parser.mjs';
import { HIGHLIGHT_LIMITS, isPlainLanguage, normalizeLanguage } from './highlight-model.mjs';
import { FILE_EXTENSION_LANGUAGES, LOCKFILE_LANGUAGES } from './highlight-languages.mjs';
import { t, tn } from '../electron/i18n/index.mjs';

// Highlight tokens describe complete fragments; split without dropping empty
// lines, CRs, or a token that spans multiple lines. No HTML is interpreted.
export function tokenLines(tokens, text) {
  if (!tokens || tokens.map(token => token.text).join('') !== text) return text.split('\n').map(line => [{ text: line }]);
  const lines = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index) lines.push([]);
      if (part) lines.at(-1).push({ ...token, text: part });
    });
  }
  return lines;
}

// Do not join missing hunk context into a fictional document: each hunk has
// its own lexical context and each displayed row refers to one actual side.
export function previewHunks(rows) {
  const hunks = [];
  let current;
  for (const row of rows) {
    if (!current || row.type === 'separator') {
      current = { header: row.type === 'separator' ? row.text : null, rows: [], before: [], after: [] };
      hunks.push(current);
      if (row.type === 'separator') continue;
    }
    const side = row.type === 'removed' ? 'before' : row.type === 'added' || row.type === 'context' ? 'after' : null;
    const line = side ? current[side].length : null;
    current.rows.push({ ...row, side, line });
    if (row.type === 'removed' || row.type === 'context') current.before.push(row.text);
    if (row.type === 'added' || row.type === 'context') current.after.push(row.text);
  }
  return hunks.map(hunk => ({ ...hunk, before: hunk.before.join('\n'), after: hunk.after.join('\n') }));
}

// The original resolver r() (c41eb0199-C-RzbqEe.js; no custom extensions are
// registered locally): the exact name (Dockerfile, CMakeLists.txt,
// CODEOWNERS), then the compound `.a.b` suffix (component.ts -> angular-ts,
// blade.php), then the last extension, else 'text'. Keys are case-sensitive.
function nameLanguage(name) {
  if (Object.hasOwn(FILE_EXTENSION_LANGUAGES, name)) return FILE_EXTENSION_LANGUAGES[name];
  const compound = /\.([^/\\]+\.[^/\\]+)$/.exec(name)?.[1];
  if (compound !== undefined && Object.hasOwn(FILE_EXTENSION_LANGUAGES, compound)) return FILE_EXTENSION_LANGUAGES[compound];
  const last = /\.([^.]+)$/.exec(name)?.[1] ?? '';
  return Object.hasOwn(FILE_EXTENSION_LANGUAGES, last) ? FILE_EXTENSION_LANGUAGES[last] : 'text';
}
// g() (code-language-current.js:78-85) around r(): the base name (wh,
// shared-11), a lockfile name (c8a544a8c, lowercased) first, then r(); a
// 'text' result retries the lowercased name, so 'X.PY' and 'name.TS' still
// resolve. Every value is a bundled id or alias, which consumers pass through
// normalizeLanguage (source-file-viewer.jsx, use-diff-hunk.mjs,
// source-file-tool.jsx).
export function fileHighlightLanguage(path = '') {
  const value = String(path);
  const name = value.split(/[\\/]/).pop() || value;
  const lockfile = name.toLowerCase();
  if (Object.hasOwn(LOCKFILE_LANGUAGES, lockfile)) return LOCKFILE_LANGUAGES[lockfile];
  const language = nameLanguage(name);
  if (language !== 'text') return language;
  return lockfile === name ? language : nameLanguage(lockfile);
}

// Files viewer preview kinds (cd2efac6e jo :2626-2627 zt/Bt and qo :4777-4792):
// markdown for .md/.mdx/.markdown, csv with the delimiter of .tsv or .csv, and
// the nu "sandbox" arm for the rich-text MIME of Ql (2.31226.0 cd2efac6e
// readable :6783-6799): .htm/.html renders in the sandboxed preview frame
// (kind 'html', electron/file-preview-frame.cjs), .svg as the drawn graphic
// (kind 'svg', an <img> of the text: no script runs).
export function filePreviewKind(path = '') {
  const value = String(path);
  if (/\.html?$/i.test(value)) return { kind: 'html', delimiter: null };
  if (/\.svg$/i.test(value)) return { kind: 'svg', delimiter: null };
  if (/\.tsv$/i.test(value)) return { kind: 'csv', delimiter: '\t' };
  if (/\.csv$/i.test(value)) return { kind: 'csv', delimiter: ',' };
  if (/\.(md|mdx|markdown)$/i.test(value)) return { kind: 'markdown', delimiter: null };
  return null;
}
// nr/ir (cd2efac6e :2672-2673): je = shared-4 Jh (the last extension,
// lowercased, among png jpg jpeg gif bmp webp avif; no svg) shows an <img>;
// ye = shared-11 gh, video (mp4 webm mov m4v ogv) or audio (mp3 m4a aac wav
// flac opus ogg oga), shows a <video> or, for audio (we), an <audio>.
// electron/files.cjs classifies the same lists without reading the bytes.
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'avif']);
export function fileMediaKind(path = '') {
  const value = String(path), at = value.lastIndexOf('.');
  if (IMAGE_EXTENSIONS.has(at < 0 ? '' : value.slice(at + 1).toLowerCase())) return 'image';
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(value)) return 'video';
  if (/\.(mp3|m4a|aac|wav|flac|opus|ogg|oga)$/i.test(value)) return 'audio';
  // B13: a PDF shows in Chromium's built-in viewer from its file:// URL (the
  // local stand-in for the desktop native preview, c6e1d8764 On).
  if (/\.pdf$/i.test(value)) return 'pdf';
  return null;
}
// The composer's file:// preview URL (main.jsx filePreviewUrl), the same
// encoding for the Files viewer's <img>/<video>/<audio>.
export const filePreviewUrl = (filePath) => encodeURI(`file://${filePath}`);
// The drawn SVG: the shown text as an image (the app CSP allows data: images),
// so the graphic follows the text the viewer holds and its scripts never run.
export const svgPreviewUrl = (text) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(text ?? ''))}`;
// A web link the preview frame posted (file-preview-frame.cjs LINK_SCRIPT): an
// http(s) URL and the click's modifiers for the link router, else null.
export const PREVIEW_FRAME_LINK = 'oc-file-preview-link';
export function previewFrameLink(data) {
  if (!data || typeof data !== 'object' || data.type !== PREVIEW_FRAME_LINK || typeof data.href !== 'string' || data.href.length > 8192) return null;
  let url;
  try { url = new URL(data.href); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const flag = (key) => data[key] === true;
  return { href: url.href, event: { button: data.button === 1 ? 1 : 0, metaKey: flag('metaKey'), ctrlKey: flag('ctrlKey'), shiftKey: flag('shiftKey'), altKey: flag('altKey') } };
}

// B13 review: the frame's externalLinkBehavior "ask" (2.31226.0 cc61d0d63 OpenExternal :1463-1497). A posted
// link opens at once only when it follows a real gesture and the page wrote it as an <a href> (cd2efac6e Ba :560
// with runsScript, za :549-558: at most Ia = 256 written links); anything else, such as a link a script made up,
// asks first through the cfdfec14c "Open external link" dialog.
const PREVIEW_WRITTEN_LINK_LIMIT = 256;
let writtenLinks = null;
export function previewLinkWritten(html, href, limit = PREVIEW_WRITTEN_LINK_LIMIT) {
  const source = String(html ?? '');
  if (writtenLinks?.html !== source) {
    const values = typeof globalThis.DOMParser === 'function'
      ? Array.from(new globalThis.DOMParser().parseFromString(source, 'text/html').querySelectorAll('a[href]'), (node) => node.getAttribute('href') ?? '')
      : Array.from(source.matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi), (match) => match[1] ?? match[2] ?? match[3] ?? '');
    const written = new Set();
    for (const value of values) { try { written.add(new URL(value).href); } catch { /* relative or invalid */ } }
    writtenLinks = { html: source, written };
  }
  return writtenLinks.written.size <= limit && writtenLinks.written.has(href);
}

// cfdfec14c F/I (punycode toUnicode, RFC 3492) for the deceptive-domain warning.
function punycodeLabel(input) {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, maxInt = 2147483647;
  const digit = (code) => (code >= 48 && code < 58 ? code - 22 : code >= 65 && code < 91 ? code - 65 : code >= 97 && code < 123 ? code - 97 : base);
  const adapt = (delta, points, first) => {
    let k = 0;
    for (delta = first ? Math.floor(delta / damp) : delta >> 1, delta += Math.floor(delta / points); delta > 455; k += base) delta = Math.floor(delta / 35);
    return Math.floor(k + (36 * delta) / (delta + skew));
  };
  const output = [];
  let i = 0, n = 128, bias = 72, basic = input.lastIndexOf('-');
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; ++j) { if (input.charCodeAt(j) >= 128) throw new RangeError('not-basic'); output.push(input.charCodeAt(j)); }
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length;) {
    const old = i;
    for (let w = 1, k = base; ; k += base) {
      if (index >= input.length) throw new RangeError('invalid-input');
      const value = digit(input.charCodeAt(index++));
      if (value >= base || value > Math.floor((maxInt - i) / w)) throw new RangeError('invalid-input');
      i += value * w;
      const threshold = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (value < threshold) break;
      if (w > Math.floor(maxInt / (base - threshold))) throw new RangeError('overflow');
      w *= base - threshold;
    }
    const length = output.length + 1;
    bias = adapt(i - old, length, old === 0);
    if (Math.floor(i / length) > maxInt - n) throw new RangeError('overflow');
    n += Math.floor(i / length);
    i %= length;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}
/** U / W: the dialog's warnings, an internationalized (xn--) host shown decoded and embedded credentials. */
export function externalLinkWarnings(href) {
  let url;
  try { url = new URL(href); } catch { return { hasPunycode: false, decodedHostname: null, hasUserinfo: false, host: null }; }
  const labels = url.hostname.split('.');
  const hasPunycode = labels.some((label) => label.toLowerCase().startsWith('xn--'));
  let decodedHostname = null;
  if (hasPunycode) {
    try { decodedHostname = labels.map((label) => (/^xn--/i.test(label) ? punycodeLabel(label.slice(4).toLowerCase()) : label)).join('.'); }
    catch { decodedHostname = url.hostname; }
  }
  const hasUserinfo = url.username !== '' || url.password !== '';
  return { hasPunycode, decodedHostname, hasUserinfo, host: hasUserinfo ? url.host : null };
}

// EpitaxyCsvPreview's parse (c02d6193d-EqKLGBaH.js p): at most 1 MiB of text
// (cut after the last complete record), the delimiter sniffed from the first
// 16 non-blank lines (o), at most 500 rows of 64 columns and 300-unit cells,
// a header when the first row reads as labels over a data row (s). Locally
// the csv-parse call (bom, relax_column_count, relax_quotes,
// skip_empty_lines, to: 501) is a small RFC 4180 reader with the same options.
// Preserve the host's nullable-content boundary; use the shipped parser for
// quote handling, row/cell limits and surrogate-safe truncation.
export function parseCsvPreview(contents, delimiter) {
  return currentCsvPreview(String(contents ?? ''), delimiter);
}
// cd5fd9055 l: the truncation caption above the table (ICU plural/number
// messages rendered for en-US).
export function csvTruncationCaption({ rowCount, columnCount, rowsTruncated, colsTruncated, cellsTruncated }) {
  const cells = cellsTruncated ? t(' Long cells are shortened.') : '';
  const rowsText = tn(rowCount, '{count} row', '{count} rows');
  if (rowsTruncated && colsTruncated) return t('Showing the first {rows} and {columns} columns.{cells} Switch to Source to see more.', { rows: rowsText, columns: columnCount.toLocaleString('en-US'), cells });
  if (rowsTruncated) return t('Showing the first {rows}.{cells} Switch to Source to see more.', { rows: rowsText, cells });
  if (colsTruncated) return tn(columnCount, 'Showing the first {count} column.{cells} Switch to Source to see more.', 'Showing the first {count} columns.{cells} Switch to Source to see more.', { cells });
  return t('Long cells are shortened. Switch to Source to see more.');
}

// Files pane viewer (source-file-viewer.jsx). The rows of a file: a terminal LF
// ends the last line and adds no numbered row, as in the Read rows.
export function fileViewerLines(tokens, text) {
  const lines = tokenLines(tokens, text);
  if (text.endsWith('\n') && lines.length > 1) lines.pop();
  return lines;
}

// "Shown as plain text: formatting this file would be too slow." (cd2efac6e
// :990-1012 ji). The original falls back above its own size limits (Ci
// :888-897); locally the limits are the highlighter's own (HIGHLIGHT_LIMITS:
// code units, line count, longest line), so the notice appears exactly when a
// highlightable file would otherwise be formatted and is not.
export function fileViewerTooSlow(text, language) {
  if (typeof text !== 'string' || !text) return false;
  const normalized = normalizeLanguage(language);
  if (!normalized || isPlainLanguage(normalized)) return false;
  if (text.length > HIGHLIGHT_LIMITS.maxCodeUnits) return true;
  const lines = text.split(/\r\n|\n|\r/);
  return lines.length > HIGHLIGHT_LIMITS.maxLines || lines.some((line) => line.length > HIGHLIGHT_LIMITS.maxLineUnits);
}

// ja (cd2efac6e :1690-1711) without a lister: the leading slash(es), the
// directory segments and the file name of the displayed path.
export function breadcrumbParts(displayPath = '') {
  const value = String(displayPath);
  const at = value.lastIndexOf('/', value.endsWith('/') ? value.length - 2 : value.length - 1);
  const directory = at < 0 ? '' : value.slice(0, at + 1), name = at < 0 ? value : value.slice(at + 1);
  return { lead: /^\/+/.exec(directory)?.[0] ?? '', dirs: directory.split('/').filter(Boolean), name };
}

// ua (cd2efac6e :1519-1528): the active range covers line..endLine, at most
// 200 rows (la); a single line when endLine is missing or not after line.
export const JUMP_RANGE_MAX = 200;
export function jumpRange(line, endLine) {
  if (!Number.isInteger(line) || line < 1) return null;
  const last = Number.isInteger(endLine) && endLine > line ? Math.min(endLine, line + JUMP_RANGE_MAX - 1) : line;
  return { first: line, last };
}
