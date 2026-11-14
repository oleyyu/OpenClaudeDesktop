// The command a person reads, without the login-shell wrapper the agent runs it in.
//
// Codex runs every shell command as `[<shell>, "-lc", <script>]` and its app-server
// reports the shlex-joined argv (`/bin/zsh -lc 'touch a.txt'`) in ThreadItem
// commandExecution.command and CommandExecutionRequestApprovalParams.command. Codex's
// own UI never shows that wrapper: tui/src/exec_command.rs strip_bash_lc_and_escape
// (approval_overlay.rs, history_cell/approvals.rs, exec_cell/render.rs) shows the
// script when shell-command's extract_shell_command recognises the argv, else the
// escaped argv. This is the same rule over the joined string (or a legacy argv):
//   - bash / zsh / sh (any path, optional .exe) with exactly `-lc` or `-c` and one script
//   - powershell / pwsh with optional -NoLogo / -NoProfile, then -Command / -c and one script
// Anything else, including a split that does not round-trip, is returned unchanged.
// Written from that reading; no Codex code is copied.

const POSIX_SHELLS = new Set(["bash", "zsh", "sh"]);
const POWERSHELLS = new Set(["powershell", "pwsh"]);
const POSIX_FLAGS = new Set(["-lc", "-c"]);
const POWERSHELL_PRE_FLAGS = new Set(["-nologo", "-noprofile"]);
const POWERSHELL_COMMAND_FLAGS = new Set(["-command", "-c"]);

// Only a bare name (looked up on PATH, as Codex's own wrapper and the bridges write it) or an absolute path names a
// shell. A relative path (`./sh`, `node_modules/.bin/bash`) is a program in the workspace that merely shares the name,
// so it is never unwrapped: the person reads the command that actually runs.
function shellName(word) {
  const text = String(word);
  const absolute = text.startsWith("/") || /^[A-Za-z]:[\\/]/.test(text) || text.startsWith("\\\\");
  if (!absolute && /[\\/]/.test(text)) return "";
  const base = text.split(/[\\/]/).pop().toLowerCase();
  return base.endsWith(".exe") ? base.slice(0, -4) : base;
}

/**
 * POSIX word splitting (what Rust shlex::split accepts): single quotes are literal,
 * double quotes take \$ \` \" \\ and \<newline> escapes, an unquoted backslash
 * escapes the next character. Null for an unterminated quote or escape.
 */
export function splitShellWords(text) {
  if (typeof text !== "string") return null;
  const words = [];
  let word = "";
  let inWord = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'") {
      const end = text.indexOf("'", index + 1);
      if (end < 0) return null;
      word += text.slice(index + 1, end);
      inWord = true;
      index = end;
    } else if (char === "\"") {
      inWord = true;
      let closed = false;
      for (index += 1; index < text.length; index += 1) {
        const inner = text[index];
        if (inner === "\"") { closed = true; break; }
        if (inner === "\\" && index + 1 < text.length && "$`\"\\\n".includes(text[index + 1])) {
          index += 1;
          if (text[index] !== "\n") word += text[index];
        } else word += inner;
      }
      if (!closed) return null;
    } else if (char === "\\") {
      if (index + 1 >= text.length) return null;
      index += 1;
      if (text[index] !== "\n") { word += text[index]; inWord = true; }
    } else if (/\s/.test(char)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
    } else {
      word += char;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
}

/** The script inside a recognised shell wrapper argv, else null (extract_shell_command). */
export function shellScript(argv) {
  if (!Array.isArray(argv) || argv.length < 3 || !argv.every(part => typeof part === "string")) return null;
  const shell = shellName(argv[0]);
  if (POSIX_SHELLS.has(shell))
    return argv.length === 3 && POSIX_FLAGS.has(argv[1]) ? argv[2] : null;
  if (!POWERSHELLS.has(shell)) return null;
  let index = 1;
  while (index < argv.length && POWERSHELL_PRE_FLAGS.has(argv[index].toLowerCase())) index += 1;
  if (index !== argv.length - 2 || !POWERSHELL_COMMAND_FLAGS.has(argv[index].toLowerCase())) return null;
  return argv[index + 1];
}

/**
 * What the transcript row, the approval card and the copy button show for a command:
 * the script without its `<shell> -lc '…'` wrapper. A string or a legacy argv array;
 * other values return "". `raw` is the agent's own string (for a tooltip) when it differs.
 */
export function displayCommand(command) {
  if (Array.isArray(command)) {
    const script = shellScript(command);
    const raw = command.filter(part => typeof part === "string").join(" ");
    return script !== null && script.trim() ? { text: script, raw } : { text: raw, raw: null };
  }
  if (typeof command !== "string") return { text: "", raw: null };
  const script = shellScript(splitShellWords(command));
  return script !== null && script.trim() ? { text: script, raw: command } : { text: command, raw: null };
}

/** displayCommand(command).text. */
export const commandText = command => displayCommand(command).text;
