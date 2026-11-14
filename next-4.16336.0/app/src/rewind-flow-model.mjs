import { turnEdits } from "./turn-edits-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// The Rewind flow (cc43287c9-Bchz60VT.js G4 :35980-36100 requestRewind / confirmRewind, K1 :29899-30060 the
// 'Rewind to this message?' confirm, J1 :30061-30231 the Rewind picker; caec4a2d4 vi/bi/xi :1717-1745). Pure.
//
// Locally the file check (the official rewindFiles dry run) is read from the session's own transcript: the completed
// fileChange items of the target turn and every later turn, which are the agent edits a core with
// capabilities.rewindFiles puts back with the conversation (thread/revert codeDesktop.restoreFiles). Shell commands are
// not edits, which is what the confirm's note says.

/** K1 G1: the confirm quotes at most this many characters of the message. */
export const REWIND_TARGET_TEXT_LIMIT = 600;
/** G4 / w4: a slower file check shows the confirm (or the 'Rewinding…' toast) only after this long. */
export const REWIND_PREVIEW_DELAY_MS = 400;
/** caec4a2d4 _i: the picker's one-line label length. */
export const REWIND_LABEL_LIMIT = 80;

/** caec4a2d4 vi (ox): a picker row's text, whitespace collapsed and cut to 80 characters with an ellipsis. */
export function rewindLabel(text) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > REWIND_LABEL_LIMIT ? `${value.slice(0, REWIND_LABEL_LIMIT)}…` : value;
}

/** K1: the quoted message, trimmed and cut to G1. */
export function rewindTargetText(text) {
  return String(text ?? "").trim().slice(0, REWIND_TARGET_TEXT_LIMIT);
}

/** K1 g: the Restore choices. 'Code only' (restore the files and keep the conversation) needs a file restore without
 * a conversation cut, which no local core serves (thread/revert always cuts the conversation), so it is offered only
 * when the caller says the core can do it. */
export function rewindRestoreItems({ codeOnly = false } = {}) {
  return [
    { value: "both", label: t("Code and conversation") },
    { value: "conversation", label: t("Conversation only") },
    ...(codeOnly ? [{ value: "code", label: t("Code only") }] : []),
  ];
}

/** Whether a Restore choice puts the files back (G4 confirmRewind: e !== "conversation"). */
export const rewindRestoresFiles = (choice) => choice === "both" || choice === "code";

/** bi: the file check for a rewind to `turnId`. items: the session's transcript rows (each with its turnId), in order.
 * null when nothing would be restored (no edits from that turn on, or the turn is not in the transcript); otherwise
 * {filesChanged, insertions, deletions}: every path the agent edited from that turn on and the summed line counts. */
export function rewindPreview(items, turnId) {
  if (!turnId || !Array.isArray(items)) return null;
  const start = items.findIndex((item) => item?.turnId === turnId);
  if (start < 0) return null;
  const files = new Set();
  let insertions = 0, deletions = 0;
  for (const turn of turnEdits(items.slice(start)).values()) {
    for (const file of turn.files) files.add(file.path);
    insertions += turn.additions;
    deletions += turn.deletions;
  }
  return files.size ? { filesChanged: [...files], insertions, deletions } : null;
}

/** Rows of loaded turns ({id, items}) as transcript rows carrying their turnId, for rewindPreview. */
export function turnRows(turns) {
  return (Array.isArray(turns) ? turns : []).flatMap((turn) => (turn?.items || []).map((item) => (item?.turnId ? item : { ...item, turnId: turn.id })));
}

/** G4 requestRewind after the file check: 'confirm' with the preview when files would be restored; 'confirm' with
 * preview 'none' when the check took REWIND_PREVIEW_DELAY_MS or longer (the user already waited, so they confirm);
 * otherwise 'direct' — the conversation rewinds at once. 'restoring': a file restore is still running. */
export function rewindRequestStep({ preview = null, elapsedMs = 0 } = {}) {
  if (preview === "restoring") return { step: "restoring" };
  if (preview && typeof preview === "object") return { step: "confirm", preview };
  if (elapsedMs >= REWIND_PREVIEW_DELAY_MS) return { step: "confirm", preview: "none" };
  return { step: "direct" };
}

/** J1: the picker's starting row — the latest message. */
export const rewindPickerStart = (count) => Math.max(count - 1, 0);

/** J1 g: ArrowDown / ArrowUp move the active row (clamped, no wrap); any other key is not the picker's (null). */
export function rewindPickerMove(key, index, count) {
  const last = Math.max(count - 1, 0);
  if (key === "ArrowDown") return Math.min(index + 1, last);
  if (key === "ArrowUp") return Math.max(index - 1, 0);
  return null;
}
