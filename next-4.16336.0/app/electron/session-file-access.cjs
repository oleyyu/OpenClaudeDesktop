// B32: the session file actions behind the Files pane viewer's outside-root card (2.31226.0 cd2efac6e Gl / tp / pp,
// served in the original by LocalSessions showSessionFileInFolder, suggestFolderForSessionFile and
// addSuggestedFolderForSessionFile: asar index.chunk-CWDSpbbv.js / index.chunk-D5UeOeQn.js resolveSessionFileForReveal,
// suggestFolderFor and the DI/CI/kI folder judge). Local adaptation: the session's folders are its working folder
// plus the additionalFolders kept in its sidebar metadata; there is no managed workspace policy or CLI temp root.
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { scopedPath } = require("./files.cjs");

// SI: control and format characters never name a path we act on.
const UNUSUAL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const within = (child, parent) => child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
const insideAny = (child, folders) => folders.some((folder) => typeof folder === "string" && folder && within(child, folder));

/** The requested path made absolute against the session's primary folder (requestedPath + resolve). */
function requestedAbsolute(root, filePath) {
  if (typeof filePath !== "string" || !filePath || filePath.includes("\0") || UNUSUAL.test(filePath)) return null;
  const expanded = filePath === "~" || filePath.startsWith("~/") ? path.join(os.homedir(), filePath.slice(1)) : filePath;
  return path.resolve(root, expanded);
}

/**
 * resolveSessionFileForReveal: a regular file (lstat, so not a link) at the requested path, inside or outside the
 * session folders; its real path, or null. showSessionFileInFolder then shows it and answers true, else false.
 */
async function resolveFileForReveal(root, filePath) {
  const absolute = requestedAbsolute(root, filePath);
  if (!absolute) return null;
  // resolveSessionFilePaths first: a file inside the working folder, links resolved and kept inside it.
  const inside = await scopedPath(root, path.relative(root, absolute)).catch(() => null);
  if (inside) return (await fs.stat(inside).catch(() => null))?.isFile() && !UNUSUAL.test(inside) ? inside : null;
  const stat = await fs.lstat(absolute).catch(() => null);
  if (!stat?.isFile()) return null;
  const real = await fs.realpath(absolute).catch(() => null);
  return real && !UNUSUAL.test(real) ? real : null;
}
async function revealSessionFile({ root, filePath, showItemInFolder }) {
  const real = await resolveFileForReveal(root, filePath);
  if (!real) return false;
  showItemInFolder(real);
  return true;
}

// DI (posix, simplified to the local single-machine case): "offer" for a folder the session may be given. Withheld:
// the filesystem root, a dot-segment anywhere, a home folder or one of its ancestors, another user's home (a direct
// child of a home's parent), and ~/Library (macOS) or AppData. Inside a session folder nothing is offered (Oq).
function folderVerdict(folder, { homes, sessionFolders }) {
  if (!path.isAbsolute(folder) || UNUSUAL.test(folder)) return "withhold";
  const parts = folder.split(path.sep).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part.startsWith("."))) return "withhold";
  const lower = (value) => (process.platform === "linux" ? value : value.toLowerCase());
  for (const home of homes) {
    const homeParts = home.split(path.sep).filter(Boolean).map(lower), own = parts.map(lower);
    const prefix = (a, b) => a.length <= b.length && a.every((part, index) => part === b[index]);
    if (prefix(own, homeParts)) return "withhold";
    if (homeParts.length > 1 && own.length === homeParts.length && prefix(homeParts.slice(0, -1), own)) return "withhold";
    if (own.length > homeParts.length && prefix(homeParts, own) && ["library", "appdata", "snap"].includes(own[homeParts.length])) return "withhold";
  }
  if (insideAny(folder, sessionFolders)) return "withhold";
  // A folder that holds a session folder: never a top-level one; directly under a home only as a repository root
  // ("probe": the caller checks for .git, as suggestFolderFor's TI/repoRoots do).
  if (!sessionFolders.some((dir) => typeof dir === "string" && within(dir, folder))) return "offer";
  if (parts.length <= 1) return "withhold";
  return homes.some((home) => lowerEq(path.dirname(folder), home)) ? "probe" : "offer";
}
const lowerEq = (a, b) => (process.platform === "linux" ? a === b : a.toLowerCase() === b.toLowerCase());

/**
 * suggestFolderFor: the folder that holds an outside-root file (CI: the file's own folder) when it may be offered —
 * the file is a regular, single-link file outside every session folder, the folder is a real directory (not a link)
 * whose real path is the same place (kI, allowing macOS's /private alias), and the file really lives in it.
 */
async function suggestFolderForFile({ root, sessionFolders = [], filePath, home = os.homedir() }) {
  try {
    const absolute = requestedAbsolute(root, filePath);
    if (!absolute) return null;
    const folders = [root, ...sessionFolders].filter((value) => typeof value === "string" && value);
    const realFolders = [...folders, ...(await Promise.all(folders.map((folder) => fs.realpath(folder).catch(() => null)))).filter(Boolean)];
    if (insideAny(absolute, realFolders)) return null;
    const realHome = await fs.realpath(home).catch(() => home);
    const homes = realHome === home ? [home] : [home, realHome];
    const folder = path.dirname(absolute);
    const verdict = folder === absolute ? "withhold" : folderVerdict(folder, { homes, sessionFolders: realFolders });
    if (verdict === "withhold") return null;
    if (verdict === "probe" && !(await fs.lstat(path.join(folder, ".git")).catch(() => null))) return null;
    const fileStat = await fs.lstat(absolute).catch(() => null);
    if (!fileStat?.isFile() || fileStat.nlink !== 1) return null;
    const folderStat = await fs.lstat(folder).catch(() => null);
    if (!folderStat?.isDirectory() || folderStat.isSymbolicLink()) return null;
    const realFolder = await fs.realpath(folder), realFile = await fs.realpath(absolute);
    if (realFolder !== folder && realFolder !== `/private${folder}`) return null;
    if (!within(realFile, realFolder) || insideAny(realFolder, realFolders)) return null;
    if (folderVerdict(realFolder, { homes, sessionFolders: realFolders }) === "withhold") return null;
    return folder;
  } catch { return null; }
}

/** The session folder (other than the working one) that holds an absolute path, with the path relative to it. */
function sessionFolderFor(absolute, sessionFolders = []) {
  for (const folder of sessionFolders) {
    if (typeof folder !== "string" || !path.isAbsolute(folder)) continue;
    if (absolute !== folder && within(absolute, folder)) return { folder, relative: path.relative(folder, absolute) };
  }
  return null;
}

module.exports = { revealSessionFile, resolveFileForReveal, suggestFolderForFile, sessionFolderFor, folderVerdict, requestedAbsolute };
