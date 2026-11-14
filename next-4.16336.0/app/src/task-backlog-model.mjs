// B29 suggested-task backlog, pure parts (cc43287c9 u0/d0/_0/o0 and j0's take insertion).
import { t } from "../electron/i18n/index.mjs";

export const BACKLOG_LIMIT = 20; // l0: getTaskBacklog(folder, 20)
export const BACKLOG_CHIPS = 3; // A0/O0: three rows, then 'See # more'
export const TAKE_GUARD_MS = 500; // j0 S / y0: a second take or delete within 500ms is a double click
const CHIP_WORDS = 8; // g0

/** u0: the title, else the prompt's first line, else 'Untitled task'. */
export function backlogTitle(item) {
  const title = typeof item?.title === "string" ? item.title.replace(/\s+/g, " ").trim() : "";
  if (title) return title;
  const line = String(item?.prompt ?? "").replace(/\r\n?/g, "\n").split("\n", 1)[0].replace(/\s+/g, " ").trim();
  return line || t("Untitled task");
}

/** d0: the tldr (one line), or "". */
export function backlogDetail(item) {
  return typeof item?.tldr === "string" ? item.tldr.replace(/\s+/g, " ").trim() : "";
}

/** _0: a chip shows at most eight words, then an ellipsis. */
export function chipLabel(title) {
  const words = String(title).split(/\s+/);
  return words.length <= CHIP_WORDS ? title : `${words.slice(0, CHIP_WORDS).join(" ")}…`;
}


/**
 * j0 C: the prompt goes into the message box. A blank box takes it as is (caret at the start); otherwise it is
 * appended as a new paragraph after an empty one (caret at the start of the inserted text). Bash mode or an empty
 * prompt takes nothing: null.
 */
export function insertTakenPrompt(draft, prompt, { bashMode = false } = {}) {
  const text = String(prompt ?? "").replace(/\r\n?/g, "\n").trim();
  if (bashMode || !text) return null;
  const current = String(draft ?? "");
  if (!current.trim()) return { draft: text, caret: 0 };
  const base = current.replace(/\s+$/, "");
  return { draft: `${base}\n\n${text}`, caret: base.length + 2 };
}

/** The list after removing `id`, and how to put it back (l0 f's rollback keeps filedAt order, newest first). */
export function withoutItem(items, id) {
  return (Array.isArray(items) ? items : []).filter((item) => item.id !== id);
}
export function restoreItem(items, item) {
  if (!item || items.some((entry) => entry.id === item.id)) return items;
  return [...items, item].sort((a, b) => b.filedAt - a.filedAt);
}
