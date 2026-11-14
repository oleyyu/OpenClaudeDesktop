// What a transcript code block can do beyond Copy, from the session that shows it (main.jsx provides it around the
// transcript; c11959232 terminalRun "ur", read by c19e90103 Bg through ws()). null where there is no terminal (a
// session without a local folder). Its shape (B20):
//   sessionKey, powerShell                    the run id's session part (Zm) and whether PowerShell fences run
//   run(id, command)                          type the command at an idle prompt (a new tab when none), pane opened quietly
//   cancel()                                  ^C to the tracked run and end it
//   openInTerminal(id)                        show and focus the tab the tracked run `id` used (else just the pane)
//   bashTurn: { target, run(id, command) }    when the composer can take it: run, then send the output to the model
//   inlineRun(), subscribeInline(), runRecord(id)   the terminal store's tracked run and kept outputs
// terminalCommandText stays for the git band's `gh auth login` row (source-git-status.jsx GhHint).
import React from "react";

export const CodeBlockActionsContext = React.createContext(null);


/**
 * The text a shell block types into the terminal: a console transcript's "$ " prompts dropped (lines without one are
 * its output, left out), line endings as Enter presses, and a final Enter.
 */
export function terminalCommandText(text, language) {
  let lines = String(text ?? "").replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  if (["console", "shellsession", "sh-session"].includes(String(language ?? "").toLowerCase()) && lines.some((line) => /^\s*[$%#] /.test(line)))
    lines = lines.filter((line) => /^\s*[$%#] /.test(line)).map((line) => line.replace(/^\s*[$%#] /, ""));
  const body = lines.join("\r").trim();
  return body ? `${body}\r` : "";
}
