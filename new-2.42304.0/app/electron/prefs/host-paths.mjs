// Absolute-folder checks for preferences. Pure and renderer-safe: no node:* imports (the renderer imports prefs/*).
// A stored folder is either POSIX (`/Users/me/proj`) or Windows (`C:\Users\me\proj`, `C:/Users/me/proj`,
// `\\server\share\proj`). A POSIX path compares exactly as before (a "\" is an ordinary filename character there);
// a Windows path compares case-insensitively with "\" and "/" alike, and its root (`C:\`) keeps its separator.

const DRIVE = /^[A-Za-z]:[\\/]/;
const UNC = /^\\\\[^\\/]+[\\/][^\\/]+/;

/** True for a Windows-style absolute path (drive letter or UNC). */
export const isWindowsPath = (value) => typeof value === 'string' && (DRIVE.test(value) || UNC.test(value));

/** An absolute folder path of either style. */
export function isAbsoluteFolder(value) {
  return typeof value === 'string' && !!value && (value.startsWith('/') || isWindowsPath(value));
}

/** The folder without trailing separators (a root keeps its own: "/", "C:\", "\\server\share"). */
export function trimFolder(value) {
  if (typeof value !== 'string') return value;
  if (!isWindowsPath(value)) return value.length > 1 ? value.replace(/\/+$/, '') || '/' : value;
  if (/^[A-Za-z]:[\\/]+$/.test(value)) return value.slice(0, 3);
  return value.replace(/[\\/]+$/, '');
}

const winForm = (value) => trimFolder(value).replace(/\//g, '\\').toLowerCase();

/** True when `file` is `folder` or inside it. */
export function folderContains(folder, file) {
  if (!isAbsoluteFolder(folder) || !isAbsoluteFolder(file)) return false;
  if (isWindowsPath(folder) !== isWindowsPath(file)) return false;
  if (!isWindowsPath(folder)) return folder === '/' || file === folder || file.startsWith(folder + '/');
  const base = winForm(folder), target = winForm(file);
  return target === base || target.startsWith(base.endsWith('\\') ? base : base + '\\');
}

/** True when a and b are the same folder (Windows: ignoring case and separator style). */
export function sameFolder(a, b) {
  if (!isAbsoluteFolder(a) || !isAbsoluteFolder(b)) return false;
  if (!isWindowsPath(a) && !isWindowsPath(b)) return a === b;
  return isWindowsPath(a) && isWindowsPath(b) && winForm(a) === winForm(b);
}
