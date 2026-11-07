// Host filesystem paths in the renderer, for macOS and Windows alike. The main process hands the renderer native
// paths: `/Users/me/proj/src/a.ts` on macOS, `C:\Users\me\proj\src\a.ts` on Windows (git-derived ones may read
// `C:/Users/me/proj`, and the drive letter's case varies). Workspace-relative paths (Files pane tabs, diff paths)
// are always '/'-joined in the renderer.
//
// A path is "Windows style" when it starts with a drive letter (`C:\`, `C:/`, `c:`) on any host, or — on a Windows
// host only — when it is a UNC path (`\\server\share`) or starts with a separator of either kind. Only Windows-style
// paths split on '\' and compare case-insensitively; a POSIX path gives exactly the result it always did (a '\' is
// an ordinary filename character there). Every function takes `{ windows }` (default: this host is Windows) so the
// Windows behaviour is testable on a Mac.

export function isWindowsHost(nav = globalThis.navigator) {
  if (!nav) return false;
  const platform = String(nav.platform || nav.userAgent || "");
  return !/Mac|iPhone|iPad/.test(platform) && /Win/i.test(platform);
}

const DRIVE = /^[A-Za-z]:(?:[\\/]|$)/;
const UNC = /^[\\/]{2}[^\\/]/;
const hostWindows = (options) => (options && "windows" in options ? !!options.windows : isWindowsHost());

/** "win" for a Windows-style path, "posix" otherwise. */
export function pathStyle(value, options) {
  const text = String(value ?? "");
  if (DRIVE.test(text)) return "win";
  if (hostWindows(options) && (UNC.test(text) || /^[\\/]/.test(text) || text.includes("\\"))) return "win";
  return "posix";
}
const isWin = (value, options) => pathStyle(value, options) === "win";

/** An absolute path: `/…` on POSIX; `C:\…`, `C:/…`, `\\server\share…` (and, on Windows, `\…`) on Windows. */
export function isAbsolutePath(value, options) {
  if (typeof value !== "string" || !value) return false;
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  if (value.startsWith("/")) return true;
  return hostWindows(options) && value.startsWith("\\");
}

const SEPARATORS = { win: /[\\/]+/, posix: /\/+/ };
const segments = (text, style) => text.split(SEPARATORS[style]).filter(Boolean);

// The '/'-relative remainder of a path ("." and ".." resolved); null when ".." climbs above its start.
function resolveSegments(parts) {
  const out = [];
  for (const part of parts) { if (part === "..") out.pop(); else if (part && part !== ".") out.push(part); }
  return out;
}

/**
 * The absolute path with "." / ".." resolved and repeated separators collapsed. POSIX: `/a/b` exactly as the old
 * renderer normalizers built it (".." above the root stays at the root). Windows: backslashes, an upper-case drive
 * letter (`C:\a\b`, `C:\` for the drive root), `\\server\share\a` for UNC. Non-absolute input is returned with only
 * the separators tidied ('/' joined).
 */
export function normalizePath(value, options) {
  const text = String(value ?? "");
  if (!isWin(text, options)) {
    if (!text.startsWith("/")) return resolveSegments(text.split("/")).join("/");
    return "/" + resolveSegments(text.split("/")).join("/");
  }
  const drive = /^([A-Za-z]):/.exec(text);
  if (drive) return `${drive[1].toUpperCase()}:\\` + resolveSegments(segments(text.slice(2), "win")).join("\\");
  if (UNC.test(text)) {
    const [server, share, ...rest] = segments(text, "win");
    return `\\\\${server}${share ? `\\${share}` : ""}` + (rest.length ? "\\" + resolveSegments(rest).join("\\") : "");
  }
  if (/^[\\/]/.test(text)) return "\\" + resolveSegments(segments(text, "win")).join("\\");
  return resolveSegments(segments(text, "win")).join("/");
}

/** `relative` resolved against `base` (relative input only; an absolute `relative` is just normalized). */
export function joinPath(base, relative, options) {
  const rel = String(relative ?? "");
  if (isAbsolutePath(rel, options)) return normalizePath(rel, options);
  const root = String(base ?? "");
  return normalizePath(isWin(root, options) ? `${root}\\${rel}` : `${root}/${rel}`, options);
}

// A comparison key: normalized, case-folded for Windows-style paths.
export function pathKey(value, options) {
  const normal = normalizePath(value, options);
  return isWin(value, options) ? normal.toLowerCase() : normal;
}

/** Same path (Windows: either separator, any case). */
export function samePath(a, b, options) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return pathKey(a, options) === pathKey(b, options);
}

/**
 * `path` relative to `root`, '/'-joined, when it lies strictly inside it; "" when it is the root itself; null when
 * it is outside (or either is not absolute). POSIX keeps the old prefix rule (root "/" contains nothing).
 */
export function relativeTo(root, path, options) {
  if (!isAbsolutePath(root, options) || !isAbsolutePath(path, options)) return null;
  const winRoot = isWin(root, options), winPath = isWin(path, options);
  if (winRoot !== winPath) return null;
  const base = normalizePath(root, options), full = normalizePath(path, options);
  if (!winRoot) {
    if (full === base) return "";
    return full.startsWith(base + "/") ? full.slice(base.length + 1) : null;
  }
  const baseKey = base.toLowerCase(), fullKey = full.toLowerCase();
  if (fullKey === baseKey) return "";
  const prefix = baseKey.endsWith("\\") ? baseKey : baseKey + "\\";
  return fullKey.startsWith(prefix) ? full.slice(prefix.length).replace(/\\/g, "/") : null;
}

/** `path` is `root` or inside it. */
export function isInsidePath(root, path, { orEqual = true, ...options } = {}) {
  const rest = relativeTo(root, path, options);
  return rest !== null && (orEqual || rest !== "");
}

/** [directory with its trailing separator, base name], like diff-file-header splitPosixPath. */
export function splitPath(value, options) {
  const text = String(value ?? "");
  if (!isWin(text, options)) {
    const end = text.endsWith("/") ? text.length - 1 : text.length;
    const at = text.lastIndexOf("/", end - 1);
    return at < 0 ? ["", text] : [text.slice(0, at + 1), text.slice(at + 1)];
  }
  const end = /[\\/]$/.test(text) ? text.length - 1 : text.length;
  const at = Math.max(text.lastIndexOf("/", end - 1), text.lastIndexOf("\\", end - 1));
  if (at < 0) {
    const drive = /^[A-Za-z]:/.exec(text);
    return drive && text.length > 2 ? [drive[0], text.slice(2)] : ["", text];
  }
  return [text.slice(0, at + 1), text.slice(at + 1)];
}

/** The last segment without trailing separators ("" for a root). */
export function pathBasename(value, options) {
  const text = String(value ?? "");
  const style = isWin(text, options) ? "win" : "posix";
  const parts = segments(text, style);
  const last = parts.at(-1) ?? "";
  return style === "win" && parts.length === 1 && /^[A-Za-z]:$/.test(last) ? "" : last;
}

/** The parent directory ("" when there is none). */
export function pathDirname(value, options) {
  const [directory] = splitPath(String(value ?? "").replace(isWin(value, options) ? /(?<=.)[\\/]+$/ : /(?<=.)\/+$/, ""), options);
  if (!directory) return "";
  if (/^(?:[A-Za-z]:)?[\\/]$/.test(directory) || /^[A-Za-z]:$/.test(directory)) return directory;
  return directory.slice(0, -1);
}

/** A folder's display name: its base name, or the path itself for a root ("/", "C:\"). */
export function folderName(value, options) {
  return pathBasename(value, options) || String(value ?? "");
}

const encodeFileUrlPath = (path) => encodeURI(path).replace(/[#?]/g, encodeURIComponent);
/**
 * The file:// URL of an absolute local path. POSIX: `file:///Users/me/a%20b.png` (unchanged). Windows:
 * `file:///C:/Users/me/a%20b.png`, `file://server/share/a.png` for UNC. '#' and '?' are encoded (encodeURI leaves them,
 * which would cut the path into a fragment or query).
 */
export function toFileUrl(path, options) {
  const text = String(path ?? "");
  if (!isWin(text, options)) return encodeFileUrlPath(`file://${text}`);
  if (UNC.test(text)) {
    const [server, ...rest] = segments(text, "win");
    return `file://${encodeFileUrlPath(server)}/${encodeFileUrlPath(rest.join("/"))}`;
  }
  const slashed = text.replace(/\\/g, "/");
  const drive = /^([A-Za-z]):/.exec(slashed);
  return "file:///" + (drive ? `${drive[1].toUpperCase()}:` + encodeFileUrlPath(slashed.slice(2)) : encodeFileUrlPath(slashed.replace(/^\/+/, "")));
}
