// Built-in terminal pane: pure helpers shared by the main-process PTY service (terminal-service.cjs), the agent tools
// (agent-tools/terminal.mjs) and the renderer (src/source-terminal-pane.jsx). No Node or DOM APIs here, so the renderer
// can import it like the i18n dictionaries (src/ is not packaged; electron/ is).
//
// Shapes:
//   terminal id   "term-" + 6..32 lowercase base-36 characters (random, main-process minted; never a path or a pid)
//   owner key     a session id, or "home:<absolute folder>" for the New session page's terminal
//   info          { id, owner, sessionId, number, title, cwd, status: "starting"|"running"|"exited", exitCode, signal,
//                   backend: "pty"|"script", limited, busy: boolean|null, openedBy: "user"|"agent", userTyped, createdAt }

export const TERMINAL_ID = /^term-[a-z0-9]{6,32}$/;
// Tabs the agent's tools may leave open in one session (agent-tools/terminal.mjs). W14-code R6DC-05: the user's own tabs
// have no cap, as in the official app (only remote hosts have a connection budget).
export const MAX_TERMINALS_PER_OWNER = 12;
export const MAX_INPUT_CHARS = 64 * 1024;
export const MAX_TITLE_CHARS = 64;
export const MIN_COLS = 2, MAX_COLS = 1000, MIN_ROWS = 1, MAX_ROWS = 500;
export const DEFAULT_COLS = 80, DEFAULT_ROWS = 24;
// Raw output kept per terminal in the main process: replay after a window reload and the agent's read_terminal.
export const OUTPUT_KEEP_CHARS = 400 * 1024;
export const READ_DEFAULT_LINES = 200, READ_MAX_LINES = 1000, READ_MAX_WAIT_MS = 10000;
export const MAX_COMMAND_CHARS = 2000;

export const isTerminalId = (value) => typeof value === "string" && TERMINAL_ID.test(value);
const hasControl = (text) => /[\u0000-\u001f\u007f]/.test(text);

/** A session id from the renderer: a short printable string (the main process then checks it is a known session). */
export function isSessionId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && !hasControl(value);
}
export function ownerKey(sessionId, cwd) {
  return sessionId ? sessionId : `home:${cwd}`;
}
const integer = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
};
/** Columns and rows clamped to what a PTY accepts; anything unusable falls back to 80×24. */
export function clampSize(cols, rows) {
  return {
    cols: Math.min(MAX_COLS, Math.max(MIN_COLS, integer(cols, DEFAULT_COLS))),
    rows: Math.min(MAX_ROWS, Math.max(MIN_ROWS, integer(rows, DEFAULT_ROWS))),
  };
}
/** Keyboard input from xterm.js: a string within the size cap (control characters are the point of a terminal). */
export function isInput(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_INPUT_CHARS;
}
/** A user-chosen tab name: trimmed, single line, capped; "" or null clears it back to "Terminal {n}". */
export function cleanTitle(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Invalid terminal name.");
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return text ? [...text].slice(0, MAX_TITLE_CHARS).join("") : null;
}
/** The lowest "Terminal {n}" number not used by the owner's open terminals. */
export function nextNumber(used) {
  const taken = new Set(used);
  let number = 1;
  while (taken.has(number)) number += 1;
  return number;
}

// ---------------------------------------------------------------------------
// Screen text from raw PTY output (agent read_terminal, the busy note): escape sequences removed, carriage returns and
// backspaces applied per line the way a terminal overwrites, trailing blanks trimmed. An approximation of the screen:
// full-screen programs (vim, top) come out as their last painted lines.

const OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g;
const DCS = /\u001b[PX^_][\s\S]*?(?:\u001b\\|$)/g;
const CSI = /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g;
const CHARSET = /\u001b[()*+\-./][0-~]/g;
const ESC2 = /\u001b[ -/]*[0-~]/g;

export function stripAnsi(text) {
  if (typeof text !== "string") return "";
  return text.replace(OSC, "").replace(DCS, "").replace(CSI, "").replace(CHARSET, "").replace(ESC2, "").replace(/\u001b/g, "");
}
// cols: the terminal's width. A character printed past the last column wraps to a new screen line first (xterm's
// pending wrap), so a "\r" after a wrap — readline's " \r" at the edge of a long command line — returns to the start
// of the continuation line instead of overwriting the prompt. Without cols nothing wraps.
function renderLine(line, cols = Infinity) {
  const rows = [];
  let cells = [], col = 0;
  for (const char of line) {
    if (char === "\r") col = 0;
    else if (char === "\b") col = Math.max(0, Math.min(col, cols - 1) - 1);
    else if (char === "\t") col = Math.min((Math.floor(col / 8) + 1) * 8, cols - 1);
    else if (char < " " || char === "\u007f") continue;
    else {
      if (col >= cols) { rows.push(cells); cells = []; col = 0; }
      while (cells.length < col) cells.push(" ");
      cells[col] = char; col += 1;
    }
  }
  rows.push(cells);
  return rows.map((row) => row.join("").replace(/\s+$/, ""));
}
const width = (cols) => { const value = integer(cols, NaN); return Number.isFinite(value) && value >= MIN_COLS ? Math.min(MAX_COLS, value) : Infinity; };
/** Plain screen lines of raw output (cols: the terminal's width, for autowrap). */
export function terminalLines(raw, cols) {
  const columns = width(cols);
  const lines = stripAnsi(raw).split("\n").flatMap((line) => renderLine(line, columns));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
/** The last `count` lines (clamped 1..1000, default 200) as one string. */
export function lastLines(raw, count = READ_DEFAULT_LINES, cols) {
  const limit = Math.min(READ_MAX_LINES, Math.max(1, integer(count, READ_DEFAULT_LINES)));
  return terminalLines(raw, cols).slice(-limit).join("\n");
}
/** Trim kept output to `limit` characters, starting after a line break where one is near so replay starts cleanly. */
export function trimOutput(text, limit = OUTPUT_KEEP_CHARS) {
  if (text.length <= limit) return text;
  let start = text.length - limit;
  const lineBreak = text.indexOf("\n", start);
  if (lineBreak !== -1 && lineBreak - start < 4096) start = lineBreak + 1;
  return text.slice(start);
}

// ---------------------------------------------------------------------------
// Foreground process: busy when the PTY's foreground program is not the shell itself.

const programName = (value) => String(value || "").split("/").pop().replace(/^-/, "").trim();
// `idle` is the foreground program seen while the shell printed its first prompt: /bin/sh on macOS runs as bash or
// zsh, so the shell's path alone does not name it.
// A shell in the foreground is the prompt waiting, whatever ran when the first output arrived (a login shell's
// profile can be running /usr/libexec/path_helper then, which would otherwise read as busy for good).
const SHELL_PROGRAMS = new Set(["sh", "bash", "zsh", "dash", "ksh", "mksh", "fish", "tcsh", "csh", "nu", "login"]);
export function isBusyProcess(foreground, shell, idle = null) {
  const name = programName(foreground);
  if (!name) return null;
  if (SHELL_PROGRAMS.has(name)) return false;
  return name !== programName(shell) && name !== programName(idle);
}

// ---------------------------------------------------------------------------
// run_in_terminal: one complete command line the user approves and the shell runs as typed. Refused before anything is
// typed when the line would leave the prompt waiting or reaches into the shell's own hooks (a command the user did not
// see would run later). Returns null when acceptable, else the reason.

const SHELL_HOOK_NAMES = /\b(?:PROMPT_COMMAND|PS[0-4]|PROMPT|RPROMPT|RPS1|HISTFILE|HISTCONTROL|histchars|ZDOTDIR|STTY|KEYBOARD_HACK|module_path|fpath|MAILPATH|MAILCHECK|precmd|preexec|chpwd|periodic|zshexit|zshaddhistory|TRAP[A-Z]+|command_not_found_handler?|BASH_ENV|ENV)\b/;
export function commandProblem(command) {
  if (typeof command !== "string" || !command.trim()) return "The command is empty.";
  if (command.length > MAX_COMMAND_CHARS) return "The command is too long.";
  if (/[\r\n]/.test(command)) return "The command must be a single line.";
  if (!/^[\x20-\x7e]+$/.test(command)) return "The command may only contain printable ASCII characters.";
  const line = command.trim();
  if (/\\$/.test(line)) return "The command ends with a line continuation.";
  if (/(?:\|\||&&|\||;;|\bthen|\bdo|\belse|\{)\s*$/.test(line) && !/\|\|\s*true$/.test(line)) return "The command ends with an operator and would wait for more input.";
  if (/<<(?!<)/.test(line)) return "Here-documents are not allowed.";
  if (/\btrap\b/.test(line)) return "Trap actions are not allowed.";
  if (SHELL_HOOK_NAMES.test(line)) return "The command names a shell startup or prompt setting.";
  if (/^\s*exec\b.*</.test(line)) return "exec with an input redirection is not allowed.";
  // History expansion: an interactive zsh or bash replaces "!…" (outside single quotes) and a leading "^old^new" with
  // lines from the user's history before running it, so what runs would not be what the user approved — and could
  // print a saved secret ("echo !?TOKEN?") or re-run a past command ("!?deploy?"). Only "!" followed by a blank, "="
  // or the end of the line is never expanded (bash 3.2 expands "!(", and zsh reads "!\"" — "Done!" — as a marker it
  // removes, leaving the quote open).
  if (/^\^/.test(line)) return "History substitution (^old^new) is not allowed.";
  // Quotes and parentheses must close on the line.
  let single = false, double = false, back = false, depth = 0;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (single) { if (char === "'") single = false; continue; }
    if (char === "\\") { index += 1; continue; }
    if (char === "!") {
      const next = line[index + 1];
      const literal = next === undefined || /[\s=]/.test(next);
      if (!literal) return "History expansion (!) is not allowed. Put the text in single quotes, or use a space after \"!\".";
      continue;
    }
    if (double) { if (char === '"') double = false; continue; }
    if (char === "'") single = true;
    else if (char === '"') double = true;
    else if (char === "`") back = !back;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
  }
  if (single || double || back) return "The command has an unclosed quote.";
  if (depth !== 0) return "The command has unbalanced parentheses.";
  const words = line.split(/[\s;|&()]+/);
  const opens = words.filter((word) => ["if", "for", "while", "until", "case", "select"].includes(word)).length;
  const closes = words.filter((word) => ["fi", "done", "esac"].includes(word)).length;
  if (opens > closes) return "The command has an unfinished if, for, while or case.";
  return null;
}
