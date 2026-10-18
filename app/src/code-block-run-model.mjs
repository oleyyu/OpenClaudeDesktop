// A transcript code block's "Run in terminal" (B20 / P8), pure parts. Reference 2.31226.0:
//   c19e90103 Bg (readable 7010-7310): which fences offer Run (bs/Ss, the "!" prefix of a text fence, never with hidden
//     characters zi/Vi or masked secrets), the run id Zm (5927), Play → Cancel while running, the 160px output box Lg
//     (6923-6977) and its "(no output)" fallback;
//   c7146e7f4 (readable 1-251): bs = R (runnable languages), Ss = H (a plain-text known command), _s = O (diff mode),
//     vs = F (ANSI or git-diff coloured output), xs = b (stick-to-bottom scrolling, 4px/24px);
//   c26fb8b6b qn/Xn (1315-1348) with shared-150 mB/SB: control, format, bidi and odd-space characters refuse a run;
//   ca41b3815 (909-1430): the single inline run (runInline, appendInlineOutput, cancelInlineRun, settle reasons);
//   c03935b01 It/Lt (376-405, the tab a run is typed into) and Vt (422, whether the pane opens).
// The output here is read straight from the PTY stream (OSC 133 C/D from terminal-shell-integration.cjs delimit the
// command when the shell has the integration; otherwise the echoed command line and the next prompt are dropped).

// ---- Which fences run -------------------------------------------------------------------------------------------

const RUN_LANGUAGES = new Set(["bash", "sh", "shell", "shellscript", "zsh"]);
const POWERSHELL_LANGUAGES = new Set(["powershell", "ps1", "pwsh"]);
/** c7146e7f4 R: a fence language that holds shell commands (PowerShell ones only where the shell is PowerShell). */
export function isRunLanguage(language, powerShell = false) {
  const value = String(language ?? "").trim().toLowerCase();
  return RUN_LANGUAGES.has(value) || (powerShell && POWERSHELL_LANGUAGES.has(value));
}

const KNOWN_COMMANDS = new Set("aws.brew.bun.bunx.cargo.cd.chmod.claude.cp.curl.deno.docker.gcloud.gh.git.grep.kubectl.ls.mkdir.mv.node.npm.npx.pip.pip3.pnpm.python.python3.rg.rm.sed.ssh.tar.uv.wget.yarn".split("."));
const FIRST_WORD = /^(?:sudo\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(\S+)/;
const SHELL_META = /[|&;<>()`$\\]/;
/** c7146e7f4 H: an unlabelled/text fence that is one simple, well-known command (no shell metacharacters). */
export function isPlainTextCommand(text) {
  const value = String(text ?? "");
  if (SHELL_META.test(value)) return false;
  const word = FIRST_WORD.exec(value.trimStart())?.[1];
  return word ? (word.startsWith("./") ? true : KNOWN_COMMANDS.has(word)) : false;
}

// c26fb8b6b qn (with shared-150 mB minus the right-to-left ranges, and SB) and Xn: a command with control characters
// (a line break included, so only one-line commands run), invisible format characters, unusual spaces, or right-to-left
// letters next to digits or punctuation is not offered for running. Emoji (and their joiners) are allowed.
const RTL = "\\u0590-\\u08ff\\ufb1d-\\ufdff\\ufe70-\\ufeff\\u{10800}-\\u{10fff}\\u{1e800}-\\u{1efff}";
let patterns = null;
function hiddenPatterns() {
  if (patterns) return patterns;
  const skin = "[\\u{1F3FB}-\\u{1F3FF}]";
  const flags = "\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|\\u{1F3F4}\\u{E0067}\\u{E0062}(?:\\u{E0065}\\u{E006E}\\u{E0067}|\\u{E0073}\\u{E0063}\\u{E0074}|\\u{E0077}\\u{E006C}\\u{E0073})\\u{E007F}";
  const joined = `(?:${flags}|(?!\\p{Regional_Indicator})\\p{Emoji_Presentation}\\uFE0F?${skin}?|\\p{Extended_Pictographic}(?:\\uFE0F${skin}?|${skin}))`;
  const single = `(?:${flags}|\\p{Extended_Pictographic}[\\uFE0E\\uFE0F]?${skin}?)`;
  let rgi = null;
  try { rgi = new RegExp("^\\p{RGI_Emoji_ZWJ_Sequence}$", "v"); } catch { rgi = null; }
  const space = "(?:[^\\P{Zs} ]|[\\u2800\\uFFFC\\u{1D159}\\u{13441}\\u{13442}\\u{16910}])";
  patterns = {
    emoji: new RegExp(`${joined}(?:\\u200D${joined})+|${single}`, "gu"),
    rgi,
    hidden: /[\u0000-\u001f\u007f-\u009f\u2028\u2029]|\p{Default_Ignorable_Code_Point}|\p{Cf}/u,
    space: new RegExp(space, "u"),
    rtl: new RegExp(`[${RTL}]\\p{M}*[^\\p{L}\\p{M}][^\\p{L}]*[${RTL}]|[${RTL}]\\p{M}*(?:[^\\p{L}\\p{M}\\p{Nd}][^\\p{L}\\p{Nd}]*)?\\p{Nd}`, "u"),
  };
  return patterns;
}
/** c26fb8b6b qn || Xn: the command holds characters a reader can't see or that reorder what they see. */
export function hasHiddenCharacters(command) {
  const { emoji, rgi, hidden, space, rtl } = hiddenPatterns();
  const value = String(command ?? "");
  const stripped = value.replace(emoji, (match) => (!match.includes("‍") || rgi?.test(match) ? "" : match));
  return hidden.test(stripped) || space.test(stripped) || rtl.test(value);
}

/**
 * Bg (7037-7058): what a fence would run, whether it is a shell fence at all (its run id and kept output), and whether
 * it offers Run. `text` is the fence body as shown (masked
 * secrets refuse below), `language` its info string. A text fence may start with "!" (a shell-mode line), dropped
 * from the command; otherwise only a well-known single command counts.
 */
export function codeBlockRun(text, language, { powerShell = false, masked = false } = {}) {
  const trimmed = String(text ?? "").trimEnd();
  const lang = String(language ?? "").trim().toLowerCase();
  const plain = lang === "text";
  const command = plain ? trimmed.replace(/^![ \t]*/, "") : trimmed;
  const bang = command !== trimmed;
  const shellish = isRunLanguage(lang, powerShell) || bang || (plain && isPlainTextCommand(command));
  const runnable = shellish && !masked && !!command.trim() && !hasHiddenCharacters(command);
  return { command, shellish, runnable };
}

/** Zm (5927): one run id per session, message and command — the same command twice in one message shares its output. */
export function codeBlockRunId(sessionKey, command, scope) {
  return `block:${sessionKey ?? ""}:${scope ?? ""}:${command}`;
}

// ---- The block's kept output (2.42304.0 c19e90103-muBq-gyt.js Ng ≡ 2.37337.1 sy, Bg ≡ py) ----------------------

/**
 * Ng commandDone: `t.inlineRun?.id === e && t.inlineRun.endedBy === "idle"` — the tracked run ended at an idle prompt.
 * Only "idle" counts, as in the source: "silence", "cancel", "shell-exit", "error", "superseded" and the local
 * dedicated tab's "exit" (terminal-store runDedicated, a tab running just the command) do not.
 */
export function inlineCommandDone(run) {
  return !!run && run.endedBy === "idle";
}

/**
 * Bg `me = (!se || fe) && ae ? ie : void 0`: the run record (ie, c26fb8b6b jn) shows in the kept box once the block
 * shows runs (ae), unless its run is still tracked (se) and has not ended at the prompt (fe = commandDone). The live box
 * wins while there is live output or an error (`pe || ue ? Lg(...) : me === void 0 ? null : Lg(kept)`).
 */
export function keptRunVisible({ tracked = false, commandDone = false, showsRun = false } = {}) {
  return (!tracked || commandDone) && !!showsRun;
}

// ---- Which tab a run is typed into, and whether the pane opens ---------------------------------------------------

/**
 * c03935b01 It (376-397): the first tab — the active one, then the first, then the rest — whose shell is live and
 * known idle (probe: { live, busy, unknown } ids) and whose prompt holds no unsent input; null → a new tab. Without a
 * probe nothing is known to be idle, so a new tab is used.
 */
export function pickRunTab({ tabs = [], activeId = null, probe = null, dirty = () => false } = {}) {
  if (!probe) return null;
  const live = new Set(probe.live ?? []), busy = new Set(probe.busy ?? []), unknown = new Set(probe.unknown ?? []);
  const first = tabs[0]?.id;
  const rank = (tab) => (tab.id === activeId ? 0 : tab.id === first ? 1 : 2);
  const found = [...tabs].sort((a, b) => rank(a) - rank(b))
    .find((tab) => live.has(tab.id) && !busy.has(tab.id) && !unknown.has(tab.id) && !dirty(tab.id) && tab.status === "running");
  return found?.id ?? null;
}

/** c03935b01 Vt (422-426): a plain run opens the pane (without taking focus); a captured one only when it's open. */
export function runOpensPane({ captured = false, paneOpen = false } = {}) {
  return !captured || paneOpen;
}

// c03935b01 / ca41b3815 noteUserInput (1343-1366): a line ending in Enter (or ^C) leaves the prompt clean; anything
// else but cursor movement leaves unsent input there.
// eslint-disable-next-line no-control-regex
const NAVIGATION = /\x1b\[(?:[\d;]*[CDHF]|(?:[1-47-8]|1[1-57-9]|2[0-4])(?:;\d+)?~)|\x1bO[CDHFPQRS]|\x1b[bfd\x7f]|[\x01-\x08\x0b\x0c\x15\x17\x7f]|\x1b$/g;
// c6bf19e8f Fn/In/Ln/zn (2665-2675): xterm's own replies to the shell's queries (device attributes, cursor reports,
// focus in/out, colour and DECRQSS answers) come through onData too, but are not something the user typed.
// eslint-disable-next-line no-control-regex
const REPLY_CSI = /^\x1b\[(?:[?>]\d*(?:;\d+)*c|\??\d+(?:;\d+)*[Rn]|\??\d+;\d\$y|\d+(?:;\d+)*t|[IO])$/;
// eslint-disable-next-line no-control-regex
const REPLY_OSC = /^\x1b\](?:4;\d{1,3}|1[0-2]);rgb:[0-9a-f]{4}\/[0-9a-f]{4}\/[0-9a-f]{4}\x1b\\$/;
// eslint-disable-next-line no-control-regex
const REPLY_DCS = /^\x1bP(?:0\$r|1\$r(?:[\d;:]*m|\d+;\d+r|\d q|[01]"q|6\d;\d"p))\x1b\\$/;
export const isTerminalReply = (data) => typeof data === "string" && data.length <= 64 && (REPLY_CSI.test(data) || REPLY_OSC.test(data) || REPLY_DCS.test(data));
export function promptAfterInput(previous, data) {
  if (typeof data !== "string" || data === "" || isTerminalReply(data)) return previous ?? "clean";
  if (/[\r\n]$/.test(data) && !/(^|[^\\])\\[\r\n]+$/.test(data)) return "clean";
  if (/\x03$/.test(data)) return "clean";
  return data.replace(NAVIGATION, "") !== "" ? "dirty" : previous ?? "clean";
}

// ---- Output read from the PTY stream ------------------------------------------------------------------------------

export const INLINE_SILENCE_MS = 750; // ca41b3815 H: quiet this long after the last output → a plain run settles
export const INLINE_START_MS = 2000; // Qe: an integrated shell that never marks the command start falls back to quiet
export const INLINE_MAX_LINES = 2000;
const MAX_PENDING = 4096;

/** A fresh output reader. mode "typed": typed at an interactive prompt; "dedicated": a tab running just the command. */
export function createInlineOutput(mode = "typed") {
  return { mode, lines: [[]], row: 0, col: 0, style: "", pending: "", alt: false, started: false, finished: false,
    exitCode: null, integrated: false, headTruncated: false, cleared: false };
}

const emptyLine = () => [];
function ensureRow(state) { while (state.lines.length <= state.row) state.lines.push(emptyLine()); }
function put(state, char) {
  ensureRow(state);
  const line = state.lines[state.row];
  while (line.length < state.col) line.push({ c: " ", s: "" });
  line[state.col] = { c: char, s: state.style };
  state.col += 1;
}
function capLines(state) {
  const extra = state.lines.length - INLINE_MAX_LINES;
  if (extra > 0) { state.lines.splice(0, extra); state.row = Math.max(0, state.row - extra); state.headTruncated = true; }
}
function resetScreen(state) { state.lines = [[]]; state.row = 0; state.col = 0; }

function applyCsi(state, params, final) {
  const priv = params.startsWith("?");
  const numbers = (priv ? params.slice(1) : params).split(";").map((value) => (value === "" ? NaN : Number(value)));
  const n = Number.isFinite(numbers[0]) ? numbers[0] : null;
  if (priv) {
    if ((final === "h" || final === "l") && numbers.some((value) => value === 1049 || value === 47 || value === 1047)) state.alt = final === "h";
    return;
  }
  if (state.alt || state.finished) return;
  ensureRow(state);
  const line = state.lines[state.row];
  switch (final) {
    case "m":
      if (params === "" || params === "0") state.style = "";
      else if (/^0;/.test(params)) state.style = `\x1b[${params}m`;
      else state.style = (state.style + `\x1b[${params}m`).slice(-256);
      return;
    case "K":
      if (!n) line.length = Math.min(line.length, state.col);
      else if (n === 1) for (let index = 0; index < Math.min(state.col + 1, line.length); index++) line[index] = { c: " ", s: "" };
      else if (n === 2) line.length = 0;
      return;
    case "J":
      if (n === 2 || n === 3) { resetScreen(state); state.cleared = true; }
      else if (!n) { line.length = Math.min(line.length, state.col); state.lines.length = state.row + 1; }
      return;
    case "A": state.row = Math.max(0, state.row - (n || 1)); return;
    case "B": case "E": state.row += n || 1; if (final === "E") state.col = 0; ensureRow(state); return;
    case "F": state.row = Math.max(0, state.row - (n || 1)); state.col = 0; return;
    case "C": state.col += n || 1; return;
    case "D": state.col = Math.max(0, state.col - (n || 1)); return;
    case "G": state.col = Math.max(0, (n || 1) - 1); return;
    default: return;
  }
}

function applyOsc(state, body) {
  if (!body.startsWith("133;")) return;
  state.integrated = true;
  const [kind, ...rest] = body.slice(4).split(";");
  if (kind === "C" && !state.finished && !state.started) { state.started = true; resetScreen(state); }
  else if (kind === "D" && state.started && !state.finished) {
    state.finished = true;
    const code = rest.find((value) => /^\d+$/.test(value));
    state.exitCode = code === undefined ? null : Number(code);
  }
}

/** Feed one chunk of raw PTY output (escape sequences may be split across chunks). Mutates and returns `state`. */
export function feedInlineOutput(state, chunk) {
  const text = state.pending + String(chunk ?? "");
  state.pending = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "\x1b") {
      const next = text[index + 1];
      if (next === undefined) { state.pending = text.slice(index); break; }
      if (next === "[") {
        let end = index + 2;
        while (end < text.length && !/[@-~]/.test(text[end])) end++;
        if (end >= text.length) { state.pending = text.slice(index); break; }
        applyCsi(state, text.slice(index + 2, end), text[end]);
        index = end + 1;
        continue;
      }
      if (next === "]" || next === "P" || next === "^" || next === "_" || next === "X") {
        const bell = text.indexOf("\x07", index + 2), st = text.indexOf("\x1b\\", index + 2);
        const end = bell === -1 ? st : st === -1 ? bell : Math.min(bell, st);
        if (end === -1) { state.pending = text.length - index > MAX_PENDING ? "" : text.slice(index); break; }
        if (next === "]") applyOsc(state, text.slice(index + 2, end));
        index = end + (end === st ? 2 : 1);
        continue;
      }
      index += "()*+".includes(next) ? 3 : 2;
      continue;
    }
    index += 1;
    if (state.alt || state.finished) continue;
    if (char === "\r") state.col = 0;
    else if (char === "\n") { state.row += 1; state.col = 0; ensureRow(state); capLines(state); }
    else if (char === "\b") state.col = Math.max(0, state.col - 1);
    else if (char === "\t") state.col = (Math.floor(state.col / 8) + 1) * 8;
    else if (char < " " || char === "\x7f") continue;
    else put(state, char);
  }
  return state;
}

const plainOf = (line) => line.map((cell) => cell.c).join("").replace(/\s+$/, "");
function styledOf(line) {
  let out = "", style = "";
  const end = plainOf(line).length;
  for (let index = 0; index < end; index++) {
    const cell = line[index];
    if (cell.s !== style) { out += style ? "\x1b[0m" : ""; out += cell.s; style = cell.s; }
    out += cell.c;
  }
  return style ? `${out}\x1b[0m` : out;
}
const squash = (value) => value.replace(/\s+/g, " ").trim();

/**
 * ca41b3815 A / Me: the echoed command line (within the first three lines) and everything before it are the prompt,
 * not output; the prompt text before the command ("chrome") marks the next prompt at the end, which is dropped too.
 */
function echoAt(plain, wanted) {
  for (let at = 0; at < plain.length; at++)
    if (!/\s/.test(plain[at]) && squash(plain.slice(at)) === wanted) return at;
  return -1;
}
// ca41b3815 ze: a right-hand prompt (zsh RPROMPT) after the command, past a run of spaces, is not part of the echo.
const withoutRightPrompt = (plain) => { const at = plain.lastIndexOf("  "); if (at === -1) return plain; let start = at; while (start > 0 && plain[start - 1] === " ") start--; return plain.slice(0, start); };
function dropEcho(lines, command) {
  const wanted = squash(command);
  if (!wanted) return { lines, chrome: null };
  for (let index = 0; index < Math.min(lines.length, 3); index++) {
    for (const plain of [plainOf(lines[index]), withoutRightPrompt(plainOf(lines[index]))]) {
      const at = echoAt(plain, wanted);
      if (at !== -1) return { lines: lines.slice(index + 1), chrome: plain.slice(0, at) };
    }
  }
  return { lines, chrome: null };
}

/** The output to show: ANSI-styled text, trailing blank lines dropped. */
export function inlineOutputText(state, command = "") {
  let lines = state.lines;
  let chrome = null;
  if (state.mode === "typed" && !state.started) ({ lines, chrome } = dropEcho(lines, command));
  let end = lines.length;
  while (end > 0 && plainOf(lines[end - 1]) === "") end--;
  if (state.mode === "typed" && !state.started && end > 0) {
    const last = plainOf(lines[end - 1]).trim();
    const prompt = chrome?.trim();
    if (prompt && (last === prompt || (last.startsWith(prompt) && last.length - prompt.length <= 1))) end--;
    while (end > 0 && plainOf(lines[end - 1]) === "") end--;
  }
  return lines.slice(0, end).map(styledOf).join("\n");
}

// ---- What the box shows ----------------------------------------------------------------------------------------

// c7146e7f4 O: a command's git diff colouring mode.
export function outputDiffMode(command) {
  return command ? (/--(?:word-diff|color-words)/.test(command) ? "words" : "lines") : "either";
}

const HUNK = /@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/y;
const HUNK_LINE = new RegExp(`^${HUNK.source}`, "m");
const MAX_SEGMENTS = 2000;
function segmenter(text) {
  const segments = [];
  let from = 0, style;
  const cut = (at, next) => { if (at > from) segments.push({ text: text.slice(from, at), kind: style }); from = at; style = next; };
  return { segments, cut, done: () => { cut(text.length, undefined); return segments.some((segment) => segment.kind) ? segments : null; } };
}
function lineSegments(text) {
  const { segments, cut, done } = segmenter(text);
  let current, removed = 0, added = 0, balanced = true, at = 0;
  while (at < text.length && segments.length < MAX_SEGMENTS) {
    const newline = text.indexOf("\n", at);
    const lead = newline === at || text.startsWith("\r\n", at) ? " " : text[at];
    let kind;
    if (lead === "+" && added > 0) { added--; kind = "added"; }
    else if (lead === "-" && removed > 0) { removed--; kind = "removed"; }
    else if (lead === " " && removed > 0 && added > 0) { removed--; added--; }
    else if (lead !== "\\") {
      balanced &&= removed + added === 0;
      HUNK.lastIndex = at;
      const match = HUNK.exec(text);
      removed = match ? Number(match[1] ?? 1) : 0;
      added = match ? Number(match[2] ?? 1) : 0;
    }
    if (kind !== current) { cut(at, kind); current = kind; }
    at = newline < 0 ? text.length : newline + 1;
  }
  balanced &&= at < text.length || removed + added === 0;
  cut(at, undefined);
  return { segments: done(), balanced };
}
function wordSegments(text, start) {
  const { segments, cut, done } = segmenter(text);
  const marks = { "[-": { close: "-]", kind: "removed" }, "{+": { close: "+}", kind: "added" } };
  let at = start;
  while (at < text.length && segments.length < MAX_SEGMENTS) {
    const newline = text.indexOf("\n", at);
    const line = text.slice(at, newline < 0 ? undefined : newline);
    const open = /\[-|\{\+/g, unclosed = new Set();
    for (let match = open.exec(line); match && segments.length < MAX_SEGMENTS; match = open.exec(line)) {
      const { close, kind } = marks[match[0]];
      const end = unclosed.has(match[0]) ? -1 : line.indexOf(close, open.lastIndex);
      if (end === -1) { unclosed.add(match[0]); continue; }
      open.lastIndex = end + close.length;
      cut(at + match.index, kind);
      cut(at + open.lastIndex, undefined);
    }
    at += line.length + 1;
  }
  return done();
}
/** c7146e7f4 k: git diff output as [{ text, kind: "added"|"removed"|undefined }], or null when it isn't a diff. */
export function diffSegments(text, mode) {
  const hunk = HUNK_LINE.exec(text);
  if (!hunk) return null;
  const words = mode === "lines" ? null : wordSegments(text, hunk.index);
  if (mode === "words") return words;
  const { segments, balanced } = lineSegments(text);
  return words && !(segments && balanced) ? words : segments;
}

/** c7146e7f4 b: whether a scrolled output box keeps following new output (4px from the bottom once left, else 24px). */
export function followsOutput({ following, scrollTop, lastTop, scrollHeight, clientHeight }) {
  const distance = scrollHeight - scrollTop - clientHeight;
  return scrollTop < lastTop - 1 ? following && distance <= 4 : distance <= 24;
}
