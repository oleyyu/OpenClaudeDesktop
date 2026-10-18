import { binaryFileExtension, isOfficeDocument } from './generated/code-current/file-document-types.mjs';
import { hasReplacementLoss, needsPlainTextView } from './generated/code-current/file-text-decoding.mjs';
import { filePreviewKind } from './file-preview-model.mjs';
import { t } from '../electron/i18n/index.mjs';

// cd2efac6e Hd/Ud/Wd/Zd: corrupt binary source can only be downloaded from
// its original document bytes. Text downloads retain the shown contents.
export function fileDownloadPlan(file, { documentLoader = false } = {}) {
  if (!file || typeof file.text !== 'string') return { available: false };
  const replacementLoss = hasReplacementLoss(file.text, file.size);
  const plain = needsPlainTextView({ contents: file.text, encoding: file.encoding,
    filePath: file.path, hasPreview: !!filePreviewKind(file.path), isRemoteImageEscape: !!file.forcedText });
  const raw = replacementLoss && plain && (binaryFileExtension.test(file.path) || file.text.includes('\0'));
  const canReadDocument = documentLoader && file.inSessionFolders !== false && (isOfficeDocument(file.path) || /\.pdf$/i.test(file.path));
  return { available: !raw || canReadDocument, raw, replacementLoss };
}

// R4i-files FI1 (files-13): 2.42304.0 shared-6-Cby4X-ms.js my (exported tu) — the name a download and its toasts use:
// invisible / control / unassigned / private-use code points dropped (dy, keeping ZWNJ, ZWJ and VS15/16, py), and no
// path separators. gy sets it as the link's download attribute.
const KEPT_INVISIBLES = new Set(['\u200C', '\u200D', '\uFE0E', '\uFE0F']);
export function downloadFileName(name) {
  return String(name).replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}\u2028\u2029]/gu, (c) => (KEPT_INVISIBLES.has(c) ? c : '')).replace(/[/\\]/g, '');
}
// c56477982-BgMvKoF8.js T (w = 80): the name in a download toast, first-strong isolated, with the middle elided past 80
// code points (39 + … + 40).
export function downloadToastName(name) {
  const points = [...downloadFileName(name)];
  return `\u2068${(points.length > 80 ? [...points.slice(0, 39), '\u2026', ...points.slice(-40)] : points).join('')}\u2069`;
}
// c56477982 k's V: a failed byte read is addError "Couldn’t download {name}" (ut+EuwPib9) with the cause's description
// (unknown, slow and read_twice have none) and uniqueKey `epitaxy-download-failed:${surface}:${name}`.
const FAILURE_DESCRIPTIONS = Object.freeze({
  unreachable: () => t('This session isn’t reachable right now. Try again.'),
  missing: () => t('This file is no longer available.'),
  outside: () => t('This file is outside this session’s folders. You can ask Claude to copy it into one of them, then download the copy.'),
  too_large: () => t('This file is too large to download.'),
  lossy_text: () => t('Some characters in this file can’t be copied exactly, so nothing was saved.'),
  undecodable: () => t('Right-click the file’s tab, choose Reload file, then try again.'),
  read_error: () => t('Couldn’t read this file.'),
});
export function downloadFailureToast(fileName, cause = 'undecodable', surface = 'pane') {
  const name = downloadToastName(fileName);
  const description = Object.hasOwn(FAILURE_DESCRIPTIONS, cause) ? FAILURE_DESCRIPTIONS[cause]() : undefined;
  return { message: t('Couldn’t download {name}', { name }),
    options: { variant: 'danger', ...(description ? { description } : {}), key: `epitaxy-download-failed:${surface}:${name}` } };
}
// The cause of a failed document-byte read. c56477982 G re-reads the file after M fails and classifies it with O(…, true):
// missing → missing, outside_workspace → outside, read_error → read_error (too_large reads as "there" and retries M,
// whose second failure is read_twice). Host adapter: file:document-bytes answers the classified reason itself
// (electron/files.cjs readFile with documentBytes: missing / outside_root / read_error, and the host-only "unsupported"
// type refusal), so the reason is mapped directly; a thrown read (the IPC call) is k's catch, "unknown" for a local
// session that is always reachable.
export function documentReadFailureCause(result) {
  switch (result?.unavailable) {
    case 'missing': return 'missing';
    case 'outside_root': return 'outside';
    case 'read_error': return 'read_error';
    default: return result && typeof result === 'object' ? 'read_twice' : 'unknown';
  }
}

export function downloadBlob(blob, name, document) {
  const view = document.defaultView;
  const url = view.URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  try { link.click(); } finally { view.setTimeout(() => view.URL.revokeObjectURL(url), 30000); }
}

// c56477982 k's download(e, t, n): with n (every local entry is a menu item, cd2efac6e Sf(!0)), a byte read still
// pending after C = 1000 ms shows addInfo "Downloading…" (Is04USHDG1) with the T name as its description, no timeout
// and a fresh uniqueKey, cleared (clearToast) once the read settles. notify answers the toast id; dismiss closes it.
export const DOWNLOAD_PROGRESS_DELAY = 1000;
export async function downloadFileContents(file, { document, loadDocument, notify = () => {}, dismiss = () => {},
  schedule = (fn, ms) => setTimeout(fn, ms), cancel = (id) => clearTimeout(id) }) {
  const plan = fileDownloadPlan(file, { documentLoader: typeof loadDocument === 'function' });
  if (!plan.available) return false;
  let data = file.text;
  const name = String(file.path).split(/[\\/]/).pop();
  if (plan.raw) {
    let cause = null, progress;
    const timer = schedule(() => {
      progress = notify(t('Downloading…'), { variant: 'neutral', description: downloadToastName(name), timeout: Infinity,
        key: globalThis.crypto?.randomUUID?.() ?? `epitaxy-download:${Date.now()}:${Math.random()}` });
    }, DOWNLOAD_PROGRESS_DELAY);
    try {
      const result = await loadDocument(file.path);
      if (result?.bytes) data = new Uint8Array(result.bytes);
      else cause = documentReadFailureCause(result);
    } catch { cause = 'unknown'; }
    cancel(timer);
    if (progress !== undefined && progress !== null) dismiss(progress);
    if (cause !== null) {
      const failure = downloadFailureToast(name, cause);
      notify(failure.message, failure.options);
      return false;
    }
  }
  downloadBlob(new document.defaultView.Blob([data], { type: 'application/octet-stream' }), downloadFileName(name), document);
  // cd2efac6e Sf: after the shown-text download, Sc (q.truncated === true) warns that the download is incomplete
  // (cGEVamcSKC), then _f warns about replacement characters (9dkcGKbiNT). The host reader refuses a file past the
  // 1 MiB preview limit (too_large card, no text) instead of truncating it, so the first warning only fires for a tab
  // that carries truncated: true.
  if (!plan.raw && file.truncated === true) notify(t('This file is too large to load in full, so the download is incomplete.'), { variant: 'warning' });
  if (!plan.raw && plan.replacementLoss) notify(t('Some characters in this file couldn’t be read, so the download has {replacement} in their place.', { replacement: '\uFFFD' }), { variant: 'warning' });
  return true;
}
