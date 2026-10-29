import {connectionInterrupted} from "./item-observation.mjs";
// Run-a-command row: state, labels, copy payload and the running duration.
//
// Source chain (reference/current-2.2553.1/readable/approval-current.js):
//   :16927-16955  interrupted / rejected / policyDenied / real failure
//   :16964-16993  state = blocked | busy | stopped | denied | failed | done
//   :17105-17255  classic verb: runningVerb when busy, failedVerb for failure;
//                 do not mix the gated Step outcome word into classic rows
//   :4140-4160    verb "Ran", runningVerb "Running", meta = description ?? summary
//                 ?? "a command", metaIsCode only for the summary; with a
//                 description: runningLabel/doneLabel = ZD(description) ?? description,
//                 failedLabel = "Failed to {infinitive}" (description-verb-model.mjs)
//   :16926-16936  the label: busy -> runningLabel, failed -> failedLabel, done ->
//                 doneLabel; otherwise (or with no failedLabel) the verb and the meta
//   :16997-17009  metaIsCode false folds the meta into the label ("Ran a command")
//   :6875-6884    copy payload: "$ <command>", a blank line, the stripped output
//   :2814-2846    HE: the running footer is hidden while an approval is unresolved
//   :2894-2926    KE: "Running" plus the elapsed suffix at thresholdS = 10
//   cf6ae6197 :3638-3645  the suffix is "· " + the formatted seconds
//   c3894114c :1-6        Ns / Nm Ns / Nh Nm Ns
//   shared-2  :12279      the client-side interrupt sentence
// TurnStatus.Step outcome words: c05970c42 :61-92.
import { stripAnsi } from "./ansi-model.mjs";
import { summarizeCommand } from "./command-summary.mjs";
import { describeVerb } from "./description-verb-model.mjs";
import { commandText } from "./shell-command-model.mjs";
import { t } from "../electron/i18n/index.mjs";

export const RUNNING_VERB = t("Running");
export const DONE_VERB = t("Ran");
/** :4152 - the meta when no summary can be produced. */
export const PLAIN_META = t("a command");
/** shared-2 LM :12279 - the output an interrupted tool call shows. */
export const INTERRUPTED_OUTPUT = t("Tool execution was interrupted.");
/** KE :2813 VE - the running footer only shows a duration from ten seconds on. */
export const DURATION_THRESHOLD_S = 10;

const RUNNING_STATUSES = ["inProgress", "running"];
const STOPPED_STATUSES = ["interrupted", "cancelled", "canceled", "stopped"];

/**
 * The row state. `awaitingApproval` is true while an unresolved
 * item/commandExecution/requestApproval names this item (HE :2814-2846).
 */
export function commandRowState(item = {}, awaitingApproval = false) {
  if (item[connectionInterrupted]) return "unknown";
  const status = item.status;
  if (RUNNING_STATUSES.includes(status)) return awaitingApproval ? "blocked" : "busy";
  if (["declined", "denied"].includes(status)) return "denied";
  if (STOPPED_STATUSES.includes(status)) return "stopped";
  // Codex reports the outcome in `status`. A non-zero exitCode on a completed
  // command is the command's own result, not a tool failure (:16934, and the
  // official row never reads an exit code at all), so it is not a failure here.
  if (status === "failed") return "failed";
  return "done";
}

/**
 * Label and meta for the step trigger. The model's `description` (the
 * DeepSeek bash tool asks for one) is the label in the row's tense; without
 * one a summarisable command puts the summary in the code-coloured meta, and
 * otherwise the plain meta joins the verb.
 */
// w12b-transcript: the user's own '!' command (source userShell) is no command row any more: it is the user entry
// c19e90103 Dg (source-user-shell.jsx), so the host's 'You ran / Running your command / Your command failed' (copy the
// desktop does not have) is gone.
export function commandRowLabel(command, state, description) {
  // Classic PN :17105–17255 uses failedVerb (:4156), unlike gated Step.
  const verb = state === "busy" || state === "blocked" ? RUNNING_VERB : state === "failed" ? t("Failed to run") : DONE_VERB;
  if (typeof description === "string" && description.trim()) {
    const tenses = describeVerb(description);
    if (state === "busy") return { label: tenses?.running ?? description, meta: null };
    if (state === "done") return { label: tenses?.done ?? description, meta: null };
    if (state === "failed" && tenses) return { label: `Failed to ${tenses.infinitive}`, meta: null };
    // Awaiting approval, stopped, denied, unknown, or a failure without
    // tenses: the verb, with the description as the meta.
    return { label: verb, meta: description };
  }
  // The summary is of the script, not of Codex's `<shell> -lc '…'` wrapper (shell-command-model.mjs).
  const summary = summarizeCommand(commandText(command));
  return summary === null
    ? { label: state === "busy" || state === "blocked" ? t("Running a command") : state === "failed" ? t("Failed to run a command") : t("Ran a command"), meta: null }
    : { label: verb, meta: summary };
}

/** c3894114c :1-6. */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return t("{hours}h {minutes}m {seconds}s", { hours, minutes, seconds: rest });
  if (minutes > 0) return t("{minutes}m {seconds}s", { minutes, seconds: rest });
  return t("{seconds}s", { seconds: rest });
}

/** cf6ae6197 ip :3638-3645 - null below the threshold. */
export function elapsedSuffix(startedAtMs, nowMs, thresholdS = DURATION_THRESHOLD_S) {
  if (!Number.isFinite(startedAtMs)) return null;
  const seconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return seconds < thresholdS ? null : `· ${formatDuration(seconds)}`;
}

/**
 * The output the block renders. Codex leaves a stopped command's partial
 * output in place, so the interrupt sentence is appended rather than
 * replacing it (the official client-side view had no output to keep).
 */
export function commandOutput(item = {}, state = "done") {
  const streamed = typeof item.aggregatedOutput === "string" ? item.aggregatedOutput : "";
  if (state === "stopped") {
    const separator = streamed === "" || streamed.endsWith("\n") ? "" : "\n";
    return { text: `${streamed}${separator}${INTERRUPTED_OUTPUT}`, isError: true };
  }
  return { text: streamed, isError: state === "failed" };
}

/** DO :6364 - the prompt line, a blank line, then the output without ANSI. */
export function commandCopyText(command, output) {
  const prompt = command ? `$ ${command}` : "";
  const body = output ? stripAnsi(output) : "";
  return [prompt, body].filter(Boolean).join("\n\n");
}

/**
 * Item ids with an unresolved commandExecution approval request, from the
 * transport's pending serverRequest list.
 */
export function pendingCommandItemIds(approvals = []) {
  const ids = new Set();
  for (const approval of approvals) {
    if (approval?.method !== "item/commandExecution/requestApproval") continue;
    const itemId = approval.params?.itemId;
    if (typeof itemId === "string" && itemId) ids.add(itemId);
  }
  return ids;
}
