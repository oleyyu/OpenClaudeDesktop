import { t } from '../electron/i18n/index.mjs';

// Changes-pane file header facts, 2.2553.1 c219730b0-DMsvWaVJ.js (We/Ke/qe/W/Ue)
// and c3e58cab4-BIx3-QB8.js (Copy submenu d/p). Pure: the parser file object in,
// plain strings out. Only facts the local unified-diff parser actually knows are
// used; tooLarge has no local producer, whitespaceOnly comes from "Hide whitespace
// changes" (F12, source-diff.jsx withoutWhitespaceChanges over diff-whitespace-model).

// c219730b0 W: the only row labels, each with its tooltip suffix template.
export const DIFF_ROW_LABELS = Object.freeze({
  binary: { row: t('Binary file'), tooltip: t('{path} (binary file)') },
  tooLarge: { row: t('Too large to show'), tooltip: t('{path} (too large to show)') },
  whitespaceOnly: { row: t('Whitespace only'), tooltip: t('{path} (whitespace only)') },
  madeExecutable: { row: t('Made executable'), tooltip: t('{path} (made executable)') },
  noLongerExecutable: { row: t('No longer executable'), tooltip: t('{path} (no longer executable)') },
});

// c219730b0 qe(modeChange): only 100644 <-> 100755 yields a label; every other
// mode pair (new/deleted file modes, symlinks, submodules) yields none.
export function executableChange(file) {
  if (file?.oldMode === '100644' && file?.newMode === '100755') return 'set';
  if (file?.oldMode === '100755' && file?.newMode === '100644') return 'cleared';
  return undefined;
}

// c219730b0 We `_`: the previous path only when it differs from the path.
export function renamedFrom(file) {
  const previous = file?.renamedFrom;
  return typeof previous === 'string' && previous && previous !== file.path ? previous : undefined;
}

// c219730b0 We `b`, in source order. tooLarge has no local producer (the Git
// adapter returns whole patches); whitespaceOnly is read only when the gn port
// (diff-whitespace-model.mjs, applied with hideWhitespace) set it on the file.
export function rowLabels(file) {
  const mode = executableChange(file);
  return [
    file?.binary === true && DIFF_ROW_LABELS.binary,
    file?.tooLarge === true && DIFF_ROW_LABELS.tooLarge,
    file?.whitespaceOnly === true && DIFF_ROW_LABELS.whitespaceOnly,
    mode === 'set' && DIFF_ROW_LABELS.madeExecutable,
    mode === 'cleared' && DIFF_ROW_LABELS.noLongerExecutable,
  ].filter(Boolean);
}

// c219730b0 We `v`/`x`: path, or "{previousPath} → {path}" for a rename, then
// each label's tooltip template applied in turn to the running text.
export function headerTooltip(file, path = file?.path || '') {
  const previous = renamedFrom(file);
  const base = previous === undefined ? path : `${previous} → ${path}`;
  return rowLabels(file).reduce((text, label) => label.tooltip.replace('{path}', text), base);
}

// c219730b0 Ke: the basename alone when the directory is unchanged.
export function renamedFromDisplay(path, previous) {
  const dir = (value) => value.slice(0, value.lastIndexOf('/') + 1);
  return dir(previous) === dir(path) ? previous.slice(previous.lastIndexOf('/') + 1) : previous;
}

// shared-11 Um (posix): [directory with its trailing slash, last segment].
export function splitPosixPath(value) {
  const text = String(value ?? '');
  const end = text.endsWith('/') ? text.length - 1 : text.length;
  const at = text.lastIndexOf('/', end - 1);
  return at < 0 ? ['', text] : [text.slice(0, at + 1), text.slice(at + 1)];
}

// c784da984 p: the directory shown after the basename, without its trailing
// slash unless it is the root itself.
export function pathParts(value) {
  const [directory, base] = splitPosixPath(value);
  return { base, directory: /^(?:[A-Za-z]:)?[\\/]$/.test(directory) ? directory : directory.slice(0, -1) };
}

// c3e58cab4 u/d: control, bidi and line-separator characters are stripped
// from every copied string.
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;
export function stripClipboardControls(value) {
  return String(value).replace(CONTROL, '');
}

// c219730b0 $e resolveAbsolutePath (c856385e2 Wn -> $(root, path)): the diff
// path is relative to the root the patch was produced in; an absolute patch
// path stays as it is. null when no absolute root is known.
export function absoluteDiffPath(root, value) {
  if (typeof value !== 'string' || !value || value.includes('\0')) return null;
  const normalize = (text) => { const parts = []; for (const part of text.split('/')) { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); } return '/' + parts.join('/'); };
  if (value.startsWith('/')) return normalize(value);
  return typeof root === 'string' && root.startsWith('/') ? normalize(`${root}/${value}`) : null;
}

// c3e58cab4 p: Absolute path only when resolved, Relative path, then Filename
// (shared-2 Wp basename of absolute ?? relative).
export function copyChoices(root, value) {
  const absolute = absoluteDiffPath(root, value);
  const source = absolute ?? value;
  return { absolute, relative: value, filename: splitPosixPath(source)[1] };
}
