import React from "react";
import { UserBashRun } from "./generated/transcript-rows-v4/index.mjs";
import { commandText } from "./shell-command-model.mjs";

// w12b-transcript (W12b-TR-4): the user's own '!' command (Codex thread/shellCommand: a commandExecution with source
// userShell) is a user entry, not an assistant tool row. c96d752d0's user row `ii = km(t.items); if (ii === "bash")` maps
// each bash item to `f(dfe, {command, output, error, runId, kept, commandOnly})` inside
// `_("div", {className: "flex flex-col gap-sm w-full", children: [on, e]})`; dfe was 3.6556.2 c19e90103 Dg. Wave 8b: it is
// the 4.16336.0 c19e90103 k_ (generated transcript-rows-v4 UserBashRun): the command in a bash-highlighted epitaxy fence,
// then the max-h-100 output box ("No output" when empty, "Running…" while no output came back yet, the copy button over
// a non-empty output). The command is the one the user typed (Codex
// wraps it as `<shell> -lc '…'`, shell-command-model commandText); the output is the core's aggregated output, trimmed
// as c06cf64bb fp trims bash-stdout / bash-stderr. No runId: the host's '!' runs are not the terminal's tracked inline
// run, so k_ offers no "Open in terminal" (`x = _.tracked && !!h`), as the official entry without one.
export function userShellItem(item) {
  return item?.type === "commandExecution" && item.source === "userShell";
}

export function userShellRun(item) {
  const running = item?.status === "inProgress" || item?.status === "running";
  const output = typeof item?.aggregatedOutput === "string" ? item.aggregatedOutput.trim() : "";
  return { command: commandText(item?.command ?? ""), output: running ? undefined : output };
}

export function SourceUserShell({ item, turnStart = false }) {
  const run = userShellRun(item);
  return <div className="source-message source-user-shell flex flex-col gap-sm w-full" data-transcript-item-id={item.id}
    data-turn-start={turnStart || undefined}>
    <UserBashRun command={run.command} output={run.output} />
  </div>;
}
