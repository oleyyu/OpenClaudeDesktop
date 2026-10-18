// Terminal pane: pure renderer helpers (labels, the xterm theme from the code theme, links in terminal output, keys,
// auto-close). Independent implementation of the behavior traced from the 2.2553.1 terminal pane (c6bf19e8f ShellTerminal,
// cccc2cf0a pane + tab strip, cf718f694 code theme → xterm theme, c5d464fa3 palettes, shared-21 aR toggleTerminal).
import { t } from "../electron/i18n/index.mjs";
import { selectionBlocksTerminalLink } from "./generated/code-current/terminal-link-selection.mjs";
import { terminalErrorMessages, terminalStartError, loadFailedError } from "./generated/code-current/terminal-errors.mjs";
import { ownerWindow } from "./generated/code-current/owner-window.mjs";
import { suppressKeyRepeat } from "./generated/code-editor-current/keyboard-repeat.mjs";

export const TERMINAL_PANE = "terminal";
export const FOLDER_GONE = "The session folder no longer exists.";
export const SCROLLBACK_LINES = 10000;
export const MINIMUM_CONTRAST_RATIO = 3;
export const MAX_CACHED_TERMINALS = 16;
// Auto-close (official): a shell that exits with 0, or within 2s of the user pressing Enter (typed `exit`), closes its tab.
export const EXIT_AFTER_ENTER_MS = 2000;

// ---------------------------------------------------------------------------
// Labels.

/** The tab's name: its own title, else "Terminal {n}" while several tabs are open, else "Terminal". */
export function tabLabel(info, count) {
  if (info?.title) return info.title;
  return count > 1 ? t("Terminal {n}", { n: info?.number ?? 1 }) : t("Terminal");
}
/**
 * cccc2cf0a r_ shell_pty_close: the tab closes only when the user typed into this shell (W.current, reset by a
 * restart: terminal-service `userTyped`), and it then exited with 0 or within 2s of their Enter (typed `exit`). An
 * agent-opened tab, or one nobody typed in, stays open on "Shell exited.".
 */
export function shouldAutoClose(info, lastEnterAt = 0, now = Date.now()) {
  if (!info || info.status !== "exited" || info.userTyped !== true) return false;
  if (info.exitCode === 0 && !info.signal) return true;
  return lastEnterAt > 0 && now - lastEnterAt <= EXIT_AFTER_ENTER_MS;
}
/** Zg/r_ rename: the field starts with the tab's own name (empty for a numbered tab); an empty submit clears it. */
export function renameDraft(info) {
  return typeof info?.title === "string" ? info.title : "";
}
/** "More terminals" (cfe7c4b3b ot): the tabs scrolled out of the strip, never the selected one. entries: [{id,start,end}]. */
export function hiddenTerminalTabs(entries, { scrollLeft = 0, clientWidth = 0, activeId = null } = {}) {
  const right = scrollLeft + clientWidth;
  return (Array.isArray(entries) ? entries : [])
    .filter((tab) => tab.id !== activeId && (tab.end <= scrollLeft + 1 || tab.end > right + 1))
    .map((tab) => tab.id);
}

// ---------------------------------------------------------------------------
// Tab strip keys and confirmations (2.42304.0 cfe7c4b3b ge/Y, cccc2cf0a Vy). These run inside the official components'
// bodies, so they are restated here for the local strip; each names the source lines it follows.

/**
 * cfe7c4b3b ge Le (terminal-11): `!U || (t.key !== "Delete" && t.key !== "Backspace") || t.ctrlKey || t.metaKey ||
 * t.altKey || (t.preventDefault(), t.repeat)` returns early, else the tab closes. "close": prevent and close; "repeat":
 * a held key, prevent only; null: not a close key (any Control/Meta/Alt chord is left alone, unprevented).
 */
/**
 * cfe7c4b3b ge `U = e.closable ?? !w` (terminal-11/12): `w` is `solo` (`tabs.length === 1`). A lone terminal tab has
 * no `closable` property (cccc2cf0a Vy `M`), so `U` is false when only one tab is open unless `closable: true` is set.
 */
export function isTerminalTabClosable(tab, solo = false) {
  return tab?.closable ?? !solo;
}
/**
 * cfe7c4b3b Y `nt = tt === 1, ot = s.some(e => e.closable ?? !nt)` (terminal-12): whether the strip renders the
 * screen-reader close hint (`closeTabDeleteHint`).
 */
export function anyTerminalTabClosable(tabs) {
  const list = Array.isArray(tabs) ? tabs : [];
  const solo = list.length === 1;
  return list.some((tab) => isTerminalTabClosable(tab, solo));
}
export function terminalTabDeleteKey(event, closable = true) {
  if (!closable || !event || (event.key !== "Delete" && event.key !== "Backspace")) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return event.repeat ? "repeat" : "close";
}
/**
 * cfe7c4b3b Y gt (terminal-12): the tabs the move hint describes, those shown in the strip with a shown neighbour.
 * `hiddenIds` are the tabs the official strip moves to its overflow menu; the local strip scrolls instead and keeps
 * every tab in it (Control+Shift+←/→ moves a scrolled-out tab too), so the pane passes none.
 */
export function movableTerminalTabs(tabs, hiddenIds = []) {
  const list = Array.isArray(tabs) ? tabs : [];
  const shown = (tab) => tab !== undefined && !hiddenIds.includes(tab.id);
  return new Set(list.filter((tab, index) => shown(tab) && (shown(list[index - 1]) || shown(list[index + 1]))).map((tab) => tab.id));
}
const commandRunning = (tab) => tab?.busy === true && tab.status === "running";
/**
 * cccc2cf0a Vy W/ne (terminal-13): a close confirmation reads its tab from the live list (`M.find(e => e.id === By(W))`,
 * so a rename or renumbering shows), and is dropped once its tab is gone or the command it would stop is no longer
 * running (`o.includes(e.tabId)`; for "close-others", some other tab still running). Returns the confirmation with the
 * tab's current `name`, or null.
 */
export function liveTerminalConfirm(confirm, tabs) {
  if (!confirm) return null;
  const list = Array.isArray(tabs) ? tabs : [];
  const tab = list.find((value) => value.id === confirm.id);
  if (!tab) return null;
  if (confirm.kind === "close") return commandRunning(tab) ? { ...confirm, name: tabLabel(tab, list.length) } : null;
  return list.some((value) => value.id !== confirm.id && commandRunning(value)) ? { ...confirm, name: tabLabel(tab, list.length) } : null;
}
/**
 * Close a tab in the strip: ignored when the tab is not closable (a lone tab in the strip, cfe7c4b3b ge `U`); asks for
 * confirmation while a command runs in it (cccc2cf0a Vy `H`), else closes immediately.
 */
export function closeTerminalTab(id, { tabs, owner, sessionId, homeWorkspace, terminals, setConfirm }) {
  const list = Array.isArray(tabs) ? tabs : [];
  const tab = list.find((value) => value.id === id);
  if (!tab || !isTerminalTabClosable(tab, list.length === 1)) return null;
  if (commandRunning(tab)) {
    setConfirm?.({ kind: "close", id });
    return "confirm";
  }
  void terminals.close(owner, sessionId, homeWorkspace, id);
  return "closed";
}
/**
 * cfe7c4b3b ge Le + Y (terminal-11, terminal-12): keyboard handling on a focused tab in the terminal strip.
 */
export function handleTerminalTabKeyDown(event, id, {
  tabs,
  owner,
  terminals,
  close,
  select,
  focusTab,
  getWindow = ownerWindow,
  onSuppressKeyRepeat = suppressKeyRepeat,
}) {
  const list = Array.isArray(tabs) ? tabs : [];
  const index = list.findIndex((tab) => tab.id === id);
  if (index < 0) return null;
  if (event.shiftKey && (event.ctrlKey || event.metaKey) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    terminals.move(owner, id, event.key === "ArrowLeft" ? -1 : 1);
    focusTab?.(id);
    return "move";
  }
  const closable = isTerminalTabClosable(list[index], list.length === 1);
  const deleteKey = terminalTabDeleteKey(event, closable);
  if (deleteKey) {
    event.preventDefault();
    if (deleteKey === "repeat") return "repeat";
    const view = getWindow?.(event.currentTarget);
    if (view) onSuppressKeyRepeat?.(event.key, view);
    close(id);
    return "close";
  }
  let next = null;
  if (event.key === "ArrowRight") next = (index + 1) % list.length;
  else if (event.key === "ArrowLeft") next = (index - 1 + list.length) % list.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = list.length - 1;
  if (next === null) return null;
  event.preventDefault();
  select(list[next].id);
  focusTab?.(list[next].id);
  return "navigate";
}

// ---------------------------------------------------------------------------
// Paths dropped on the terminal (cccc2cf0a lg/og/sg/cg, c73f45bc3 Fo quoteShellPath, shared-28 ek/lk/jk). Every path
// is quoted for the shell; one that cannot be quoted safely refuses the whole drop.

// Td (shared-150 mB without its RTL ranges): control, line/paragraph separators, invisible and format characters.
const DROP_REFUSED = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]|\p{Default_Ignorable_Code_Point}|\p{Cf}/u;
const CONTROL = /[\x00-\x1f\x7f-\x9f]/;
const QUOTE_OR_HISTORY = /['\u2018-\u201b!]/;
const LITERAL_SHELLS = new Set(["ash", "bash", "dash", "fish", "sh", "zsh"]);
const AUTOMOUNT_ROOTS = new Set(["net", ".vol", ".file"]);
const shellName = (shell) => String(shell ?? "").split(/[\\/]/).pop() || String(shell ?? "");
/** c643524cf: PowerShell (Windows builds), which only takes a full drive path. */
export function isPowerShell(shell) {
  const name = shellName(shell);
  return name === "powershell.exe" || name === "pwsh.exe";
}
/** shared-28 ek: an automounter path (/net, /.vol, /.file, also behind /Volumes/X or /System/Volumes/Data) a stat would mount. */
export function isAutomountPath(value) {
  const text = value === "~" || /^~[\\/]/.test(value) ? `/~/${value.slice(2)}` : value;
  if (typeof text !== "string" || !text.startsWith("/")) return false;
  if (text.length > 4096) return true;
  let chains = [[]];
  for (const part of text.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      chains.forEach((chain) => chain.pop());
      const empty = chains.findIndex((chain) => chain.length === 0);
      chains = chains.filter((chain, index) => chain.length > 0 || index === empty);
      continue;
    }
    const name = part.normalize("NFKC").toLowerCase();
    let volume = false;
    for (const chain of chains) {
      chain.push(name);
      if (AUTOMOUNT_ROOTS.has(chain[0] ?? "")) return true;
      if ((chain.length === 2 && chain[0] === "volumes") || (chain.length === 3 && chain[0] === "system" && chain[1] === "volumes" && chain[2] === "data")) volume = true;
    }
    if (volume && (chains.push([]), chains.length > 64)) return true;
  }
  return false;
}
/** shared-28 lk/zO: an absolute POSIX path with "", "." and ".." segments resolved. */
export function normalizePosixPath(value) {
  if (!value.startsWith("/")) return value;
  const parts = [];
  for (const part of value.split(/\/+/)) {
    if (part === "" || part === ".") continue;
    if (part === "..") { if (parts.length) parts.pop(); continue; }
    parts.push(part);
  }
  return `/${parts.join("/")}`;
}
/**
 * c73f45bc3 Fo for a local shell: a single-quoted path, or null when it cannot be given to this shell safely.
 * skipShellCheck: the shell is unknown (og passes it for an in-app drag when the desktop does not report the shell).
 */
export function quoteShellPath(value, shell, { skipShellCheck = false, windows = false } = {}) {
  if (typeof value !== "string" || CONTROL.test(value)) return null;
  if (isAutomountPath(value)) return null;
  if (windows && /[\u2018-\u201b]/.test(value)) return null;
  if (!windows && isPowerShell(shell)) {
    if (!/^[A-Za-z]:[\\/]/.test(value) || value.includes("::") || QUOTE_OR_HISTORY.test(value) || /[&|<>%^]/.test(value)) return null;
    return `'${value.replaceAll("\\", "/")}'`;
  }
  if (windows) return /^[A-Za-z]:[\\/]/.test(value) ? `'${value.replace(/'/g, "''")}'` : null;
  if (value.includes("\\")) return null;
  if (QUOTE_OR_HISTORY.test(value) && !skipShellCheck && !LITERAL_SHELLS.has(shellName(shell))) return null;
  return `'${normalizePosixPath(value).replace(/'/g, "'\\''")}'`;
}
/** cccc2cf0a cg: the dropped paths quoted and joined with a trailing space, or null when any one is refused (og). */
export function terminalDropText(paths, shell, options = {}) {
  const list = Array.isArray(paths) ? paths : [];
  const quoted = list.flatMap((path) => (typeof path === "string" && !DROP_REFUSED.test(path) ? quoteShellPath(path, shell, options) ?? [] : []));
  return quoted.length < list.length ? null : `${quoted.join(" ")} `;
}
/** rg: why a drop inserted nothing. */
export const DROP_ERRORS = Object.freeze({
  refused: "Can’t insert this path. It isn’t one the terminal can be given safely.",
  noPath: "Can’t insert a path. Drop a file or folder that is saved on this computer.",
});

// ---------------------------------------------------------------------------
// Keys.

/** toggleTerminal: ⌃` everywhere, ⌘J on the Mac (shared-21 aR). Matched by code; never during IME composition. */
export function isTerminalToggle(event) {
  if (!event || event.isComposing) return false;
  if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.code === "Backquote") return true;
  return !!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.code === "KeyJ";
}
/**
 * What a key press inside the terminal does before xterm sees it:
 *   "toggle"     let the app toggle the pane (xterm skips it, the window handler runs)
 *   "clear"      ⌘K clears the screen and scrollback        "find"   ⌘F opens the terminal's find bar
 *   "select-all" ⌘A selects all output                       "find-next" / "find-previous"  ⌘G / ⇧⌘G
 *   "line-start" / "line-end"   ⌘← / ⌘→ (Ctrl-A / Ctrl-E)    "word-left" / "word-right"     ⌥← / ⌥→
 *   null         xterm handles it (or the app, for other ⌘ chords: xterm leaves those alone)
 */
export function terminalKeyAction(event,{bufferType="normal",mac=true}={}) {
  if (!event || event.type !== "keydown" || event.isComposing) return null;
  if (isTerminalToggle(event)) return "toggle";
  const meta = !!event.metaKey, ctrl = !!event.ctrlKey, alt = !!event.altKey, shift = !!event.shiftKey;
  if (meta && !ctrl && !alt) {
    if (!shift && event.code === "KeyK") return "clear";
    if (!shift && event.code === "KeyF") return "find";
    if (!shift && event.code === "KeyA") return "select-all";
    if (event.code === "KeyG") return shift ? "find-previous" : "find-next";
    // ⇧⌘L attachTerminalOutput: selected text, or visible rows when no selection exists.
    if (shift && event.code === "KeyL") return "attach-selection";
    if (mac && bufferType === "normal" && !shift && event.key === "ArrowLeft") return "line-start";
    if (mac && bufferType === "normal" && !shift && event.key === "ArrowRight") return "line-end";
  }
  if (mac && bufferType === "normal" && alt && !meta && !ctrl && !shift) {
    if (event.key === "ArrowLeft") return "word-left";
    if (event.key === "ArrowRight") return "word-right";
  }
  return null;
}
export const KEY_SEQUENCES = Object.freeze({ "line-start": "\u0001", "line-end": "\u0005", "word-left": "\u001bb", "word-right": "\u001bf" });

// ---------------------------------------------------------------------------
// Theme (cf718f694): the code theme's VS Code terminal colours, editor colours when it has none, and the Claude
// palettes for the two Claude themes. Scrollbar thumbs follow the app's alpha tokens through CSS.

export const CLAUDE_DARK = Object.freeze({
  background: "#1a1a19", foreground: "#f0efec", cursor: "#0099ff", cursorAccent: "#1a1a19", selectionBackground: "#0099ff4d",
  black: "#262626", red: "#ff3a30", green: "#32d74b", yellow: "#ffd014", blue: "#0099ff", magenta: "#ff2c56", cyan: "#b796ff", white: "#a6a6a6",
  brightBlack: "#525252", brightRed: "#ff5047", brightGreen: "#32d74b", brightYellow: "#ffd014", brightBlue: "#0087ee", brightMagenta: "#ff2c56", brightCyan: "#b796ff", brightWhite: "#ededed",
});
export const CLAUDE_LIGHT = Object.freeze({
  background: "#ffffff", foreground: "#1a1a1a", cursor: "#0073e6", cursorAccent: "#ffffff", selectionBackground: "#0073e640",
  black: "#1a1a1a", red: "#d70015", green: "#1e9e3c", yellow: "#98801f", blue: "#0073e6", magenta: "#cd2054", cyan: "#8e6bd9", white: "#999999",
  brightBlack: "#666666", brightRed: "#d70015", brightGreen: "#1e9e3c", brightYellow: "#98801f", brightBlue: "#0078f0", brightMagenta: "#cd2054", brightCyan: "#8e6bd9", brightWhite: "#d6d6d6",
});
const ANSI = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
const capital = (name) => name[0].toUpperCase() + name.slice(1);
const color = (value) => (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : null);
/** A css colour that is not transparent, else null. */
export function opaqueColor(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  if (text === "transparent" || /rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(text) || /\/\s*0(?:\.0+)?\s*\)$/.test(text)) return null;
  return text;
}
/**
 * xterm ITheme for a code theme id in `mode`. `colors` is the VS Code colour map of a third-party theme (null for the
 * Claude themes or before it loaded); `surface` the pane's own background, which the Claude themes paint with.
 */
export function terminalTheme({ themeId = null, mode = "light", colors = null, surface = null } = {}) {
  const base = mode === "dark" ? CLAUDE_DARK : CLAUDE_LIGHT;
  const claude = !themeId || themeId === "claude-light" || themeId === "claude-dark";
  if (claude || !colors) {
    const background = opaqueColor(surface) ?? base.background;
    return { ...base, background, cursorAccent: background };
  }
  const pick = (...keys) => keys.map((key) => color(colors[key])).find(Boolean) ?? null;
  const background = pick("terminal.background", "editor.background") ?? base.background;
  const theme = {
    background,
    foreground: pick("terminal.foreground", "editor.foreground") ?? base.foreground,
    cursor: pick("terminalCursor.foreground", "editorCursor.foreground") ?? base.cursor,
    cursorAccent: pick("terminalCursor.background") ?? background,
    selectionBackground: pick("terminal.selectionBackground", "editor.selectionBackground") ?? base.selectionBackground,
  };
  for (const name of ANSI) {
    theme[name] = pick(`terminal.ansi${capital(name)}`) ?? base[name];
    theme[`bright${capital(name)}`] = pick(`terminal.ansiBright${capital(name)}`) ?? base[`bright${capital(name)}`];
  }
  return theme;
}
/** Terminal font: the app's code font chain (--cds-font-code), else the official default. */
export function terminalFont(codeFont) {
  const fallback = '"anthropic-mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';
  return typeof codeFont === "string" && codeFont.trim() ? `${codeFont.trim()}, ui-monospace, Menlo, Consolas, monospace` : fallback;
}
/** 12px at the default 16px root size, scaled with the app's font size. */
export function terminalFontSize(rootFontPx) {
  const root = Number(rootFontPx);
  return Math.max(9, Math.min(24, Math.round((12 * (Number.isFinite(root) && root > 0 ? root : 16)) / 16)));
}

// ---------------------------------------------------------------------------
// Links in output. Web: http(s) URLs only (the official pattern), opened through the app's external opener after a
// check; credentials or backslashes are refused. Files: path-looking tokens, opened in the Files pane once the main
// process confirms they are files inside the session folder.

const URL_PATTERN = /(?:https?|HTTPS?):\/\/[^\s"'!*(){}|\\^<>`]*[^\s"':,.!?{}|\\^~[\]`()<>]/g;
/** A safe http(s) URL to open externally, or null. */
export function safeWebUrl(text) {
  if (typeof text !== "string" || text.length > 4096 || text.includes("\\")) return null;
  let url;
  try { url = new URL(text); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || !url.hostname) return null;
  return url.href;
}
// A file path token: absolute, ./ ../ ~/ relative, or dir/name, or name.ext; optional :line[:col] or (line,col).
const PATH_PATTERN = /(?<![\w./~-])((?:~|\.{1,2})?\/?(?:[\w@+.-]+\/)*[\w@+-][\w@+.-]*\.[A-Za-z][\w]{0,11}|(?:~|\.{1,2})?\/(?:[\w@+.-]+\/)*[\w@+.-]+|(?:[\w@+.-]+\/)+[\w@+.-]+)(?::(\d{1,7})(?::(\d{1,5}))?|\((\d{1,7}),(\d{1,5})\))?/g;
/** Links on one line of terminal text: [{ kind: "web"|"file", start, end, text, url? , path?, line?, column? }]. */
export function findLinks(text) {
  if (typeof text !== "string" || !text) return [];
  const links = [];
  const taken = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = safeWebUrl(match[0]);
    if (!url) continue;
    links.push({ kind: "web", start: match.index, end: match.index + match[0].length, text: match[0], url });
    taken.push([match.index, match.index + match[0].length]);
  }
  for (const match of text.matchAll(PATH_PATTERN)) {
    const start = match.index, end = start + match[0].length;
    if (taken.some(([a, b]) => start < b && end > a)) continue;
    const path = match[1];
    if (path.length < 3 || /^\d+(?:\.\d+)+$/.test(path) || /^\.+\/?$/.test(path) || path.includes("//")) continue;
    const line = Number(match[2] ?? match[4]) || null, column = Number(match[3] ?? match[5]) || null;
    links.push({ kind: "file", start, end, text: match[0], path, line, column });
  }
  return links.sort((a, b) => a.start - b.start);
}
/** A clicked file path relative to the session folder (what the Files pane opens), or null outside it. */
export function relativeToFolder(path, folder, home = null) {
  if (typeof path !== "string" || !path || typeof folder !== "string" || !folder.startsWith("/")) return null;
  let absolute = path;
  if (path.startsWith("~/")) { if (!home) return null; absolute = `${home.replace(/\/$/, "")}/${path.slice(2)}`; }
  else if (!path.startsWith("/")) absolute = `${folder.replace(/\/$/, "")}/${path}`;
  const parts = [];
  for (const part of absolute.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!parts.length) return null; parts.pop(); } else parts.push(part);
  }
  const normal = `/${parts.join("/")}`, root = folder.replace(/\/+$/, "") || "/";
  if (normal === root) return null;
  if (!normal.startsWith(root === "/" ? "/" : `${root}/`)) return null;
  return normal.slice(root === "/" ? 1 : root.length + 1);
}

// ---------------------------------------------------------------------------
// Output replay: data events carry the running character count (`end`); one already covered by an attach is skipped,
// one straddling it is trimmed.

export function unseenData(event, written) {
  if (!event || typeof event.data !== "string" || !Number.isFinite(event.end)) return "";
  if (!Number.isFinite(written) || written < 0) return event.data;
  if (event.end <= written) return "";
  const start = event.end - event.data.length;
  return start >= written ? event.data : event.data.slice(written - start);
}

/** A failure's message without Electron's IPC wrapper, translated when it is one of the service's own messages. */
export function terminalError(error, fallback) {
  const message = String(error?.message ?? error ?? "").replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "").trim();
  return message ? t(message) : fallback;
}
/**
 * c6bf19e8f Sn activate: only a primary click opens a link, and not one that ends a selection (xn, terminal-01).
 */
export function terminalLinkBlocked(term, event) {
  return !event || event.button !== 0 || selectionBlocksTerminalLink(term, event);
}
/**
 * Wire WebLinksAddon and the file-path link provider on `term`, gating both activations through `terminalLinkBlocked`.
 */
export function installTerminalLinks(term, { WebLinksAddon, id, getHandlers, checkedMs = 3000 }) {
  const linkBlocked = (event) => terminalLinkBlocked(term, event);
  term.loadAddon(new WebLinksAddon((event, uri) => {
    if (linkBlocked(event)) return;
    event.preventDefault?.();
    getHandlers()?.web?.(uri, event);
  }));
  const checked = new Map();
  term.registerLinkProvider({
    provideLinks(lineNumber, callback) {
      const line = term.buffer.active.getLine(lineNumber - 1);
      if (!line) { callback(undefined); return; }
      let text = "";
      const columns = [];
      for (let x = 0; x < term.cols; x++) {
        const cell = line.getCell(x);
        if (!cell) break;
        const chars = cell.getChars();
        if (!chars && cell.getWidth() === 0) continue;
        for (const char of chars || " ") { columns.push(x); text += char; }
      }
      const candidates = findLinks(text).filter((link) => link.kind === "file");
      if (!candidates.length) { callback(undefined); return; }
      const now = Date.now();
      const unknown = [...new Set(candidates.map((link) => link.path))].filter((path) => !(now - (checked.get(path)?.at ?? -Infinity) < checkedMs));
      Promise.resolve(unknown.length ? getHandlers()?.paths?.(unknown, id) : []).then((results) => {
        const at = Date.now();
        unknown.forEach((path, index) => checked.set(path, { value: results?.[index] ?? null, at }));
        if (checked.size > 500) checked.clear();
        const found = new Map(candidates.map((link) => [link.path, checked.get(link.path)?.value ?? null]));
        callback(candidates.filter((link) => found.get(link.path)).map((link) => ({
          range: { start: { x: columns[link.start] + 1, y: lineNumber }, end: { x: columns[link.end - 1] + 1, y: lineNumber } },
          text: link.text,
          decorations: { underline: true, pointerCursor: false },
          activate: (event) => {
            if (linkBlocked(event)) return;
            event.preventDefault?.();
            getHandlers()?.file?.(found.get(link.path), link.line);
          },
        })));
      }, () => callback(undefined));
    },
  });
}
/**
 * c6bf19e8f pi: acquire the active tab's xterm view; on failure clear the host container and record {kind:"raw", text}
 * for an Error with a message, else Jr loadFailedError ("Failed to load terminal").
 */
export function acquireTerminalView({ activeId, sessionId, homeWorkspace, terminals, createView, hostNode, viewError, setViewError }) {
  let view;
  try {
    view = terminals.view(activeId, sessionId, homeWorkspace, createView);
  } catch (failure) {
    hostNode?.replaceChildren?.();
    setViewError?.({
      id: activeId,
      error: failure instanceof Error && failure.message ? { kind: "raw", text: failure.message } : loadFailedError,
    });
    return null;
  }
  if (viewError?.id === activeId) setViewError?.(null);
  return view;
}
/**
 * c6bf19e8f Qr/Rr: restart the active tab's shell; on failure mark startFailed for the registry (Clear: "No terminal
 * to clear") and surface Qr(error, ptyKey, sessionId) ({kind:"raw"} when the main process gave a message, else
 * startFailed "Failed to start shell").
 */
export async function restartTerminalTab({ active, sessionId, homeWorkspace, terminals, startFailedTerminals, setError, setRestartError, onRestarted }) {
  if (!active) return false;
  const id = active.id;
  try {
    await terminals.restart(sessionId, homeWorkspace, id);
    startFailedTerminals?.delete(id);
    setError?.(null);
    setRestartError?.(null);
    onRestarted?.();
    return true;
  } catch (failure) {
    startFailedTerminals?.add(id);
    setRestartError?.({ id, error: terminalStartError(terminalError(failure, undefined), id, id) });
    return false;
  }
}
/**
 * c6bf19e8f pi: the error (A) takes the place of the exited shell (N). A raw message shows as is; every kind but
 * needsNewerApp offers Try again. A tab whose folder is gone says so without a button (local).
 */
export function terminalCoverState({ active, loadFailed = false, viewError = null, restartError = null, onRetryView, onRestart }) {
  if (loadFailed) return null;
  const id = active?.id ?? null;
  const exited = active?.status === "exited";
  const coverError = (viewError && viewError.id === id ? viewError.error : null)
    ?? (exited && restartError?.id === id ? restartError.error : null);
  if (coverError) {
    return {
      kind: coverError.kind,
      text: coverError.kind === "raw" ? coverError.text : t(terminalErrorMessages[coverError.kind].defaultMessage),
      action: coverError.kind !== "needsNewerApp" && !(coverError.kind === "raw" && coverError.text === t(FOLDER_GONE)) ? t("Try again") : null,
      retry: viewError?.id === id ? onRetryView : onRestart,
      exited,
    };
  }
  if (exited) {
    return {
      kind: "exited",
      text: active?.error === FOLDER_GONE ? t(FOLDER_GONE) : t("Shell exited"),
      action: active?.error === FOLDER_GONE ? null : t("Restart shell"),
      retry: onRestart,
      exited,
    };
  }
  return null;
}
