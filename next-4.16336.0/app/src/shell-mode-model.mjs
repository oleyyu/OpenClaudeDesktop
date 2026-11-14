// '!' shell mode: a draft that starts with '!' runs the rest as the user's own shell command in the session's folder
// instead of going to the model. On a core that serves it (capabilities.shellCommands: Codex's bash mode, tui keymap
// fixed.shell_command → thread/shellCommand) the core runs it; on any other core, while the built-in terminal is there
// (options.terminal), it runs in a terminal tab and its output goes to the model, as Claude Desktop does (2.2553.1
// bashModeAvailable: "Run a shell command in the terminal and send the output to Claude"). Pure.
import { coreSupports } from "../electron/core-registry.mjs";
import { t } from "../electron/i18n/index.mjs";

/** The shell command a draft asks for ('!git status' → 'git status'), or null when it isn't one / the core has none. */
/** Who runs '!command': "core" (its own shell commands), "terminal" (the built-in terminal pane), or null. */
export function shellModeKind(core, { terminal = false } = {}) {
  return coreSupports(core, "shellCommands") ? "core" : terminal ? "terminal" : null;
}

export function shellModeCommand(draft, core, options = {}) {
  if (typeof draft !== "string" || !shellModeKind(core, options)) return null;
  const text = draft.replace(/^\s+/, "");
  if (!text.startsWith("!")) return null;
  const command = text.slice(1).trim();
  return command ? command : null;
}

/** Whether the composer is in shell mode (a leading '!', even before the command is typed) on a core that has it. */
export function shellModeActive(draft, core, options = {}) {
  return typeof draft === "string" && /^\s*!/.test(draft) && !!shellModeKind(core, options);
}

/** The message a terminal run sends the model: the command, its output and how it ended. */
export function shellOutputMessage(command, { output = "", exitCode = null, signal = null } = {}) {
  const body = String(output ?? "").replace(/\s+$/, "");
  const ticks = "`".repeat(Math.max(3, ...[...body.matchAll(/`+/g)].map((match) => match[0].length + 1)));
  // The user's own message, in the UI language (as the edits card's Undo and the git band's Commit prompts).
  const ended = Number.isInteger(exitCode) ? t("Exit code: {code}", { code: exitCode }) : signal ? t("Ended by {signal}", { signal }) : "";
  return [t("I ran this shell command in the terminal:"), `${ticks}console`, `$ ${command}`, ...(body ? [body] : []), ticks, ...(ended ? [ended] : [])].join("\n");
}
