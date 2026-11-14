// R4e-terminal (terminal-17): the renderer's side of shell mode's leftover runs. The main process (terminal-service.cjs
// "run") clears a run left going after its wait gave up and says so (interruptedPrevious), as 2.42304.0's runCommand
// does (asar index.chunk-D7Sj9EoB.js); the official bash turn then puts a note before the output it sends the model
// (ion-dist cc43287c9 `r?.interruptedPrevious&&o.push(...)`). Here each run has a tab of its own, so the note says
// "in the terminal" where the official one, for its single hidden shell, says "in this shell".
export const INTERRUPTED_PREVIOUS_NOTE = "[A previous command was still running in the terminal and was interrupted before running this one.]";

/** The message a shell-mode run sends the model, with the note first when the run interrupted a leftover one. */
export function withInterruptedPreviousNote(message, result) {
  return result?.interruptedPrevious === true ? `${INTERRUPTED_PREVIOUS_NOTE}\n${message}` : message;
}

/**
 * A code block's bash-turn run still in flight (c11959232 ur: no run starts while its output still has to reach the
 * model): the tracked inline run is an unsettled dedicated one whose wait has not come back yet. Once it has (the
 * store keeps the run's record: runCodeBlockTurn's recordRun, also at the 30-minute deadline), a command it left
 * running no longer blocks the next run; the main process interrupts that command when the next bash turn starts.
 */
export function bashTurnRunGoing(going, runRecord) {
  return !!going && !going.settled && going.mode === "dedicated" && (typeof runRecord !== "function" || runRecord(going.id) === undefined);
}
