// Import Chat History's display prefix (analysis/import-chat-history/DESIGN.md "显示"): a conversation brought in by
// inject (Codex thread/inject_items) or handoff (thread/start developerInstructions) is in the model's context but
// not in the core's turns, so the transcript shows the turns it came from (main's chat-import `prefix` op: the
// convert.mjs toCodexTurns copy kept in <userData>/imports/<threadId>.json) before the session's own, closed by a
// quiet "Imported from {source} · {title}" row (item type IMPORTED_DIVIDER, source-session.jsx). Native and fork
// imports are real core history and get nothing. Prefix rows are inert (main.jsx: no rewind, fork, rating, edits or
// turn cards; Copy stays): isImportedTurn tells them by their `imported-` turn ids. Pure: no React, no IPC.
import { t } from "../electron/i18n/index.mjs";
import { sourceLabel } from "./import-history-model.mjs";

export const IMPORTED_DIVIDER = "importedHistory";
export const IMPORTED_TURN_PREFIX = "imported-";
// The strategies whose history only this prefix shows (chat-import index.cjs PREFIX_STRATEGIES).
export const PREFIX_STRATEGIES = new Set(["inject", "handoff"]);

const text = (value) => (typeof value === "string" ? value : "");
const oneLine = (value) => text(value).replace(/\s+/g, " ").trim();

/** Whether a session's sessionMetadata records an inject/handoff import (only those ask main for a prefix). */
export function mayHaveImportedPrefix(metadata) {
  return PREFIX_STRATEGIES.has(metadata?.importedFrom?.strategy);
}

/** Whether a turn id is one of the display prefix's (withImportedPrefix), never a core turn. */
export const isImportedTurn = (turnId) => typeof turnId === "string" && turnId.startsWith(IMPORTED_TURN_PREFIX);

/** The divider's label: "Imported from Codex · Fix the build" (no title: "Imported from Codex"). */
export function importedDividerLabel(importedFrom) {
  const source = sourceLabel(importedFrom?.source);
  const title = oneLine(importedFrom?.title);
  return title ? t("Imported from {source} · {title}", { source, title }) : t("Imported from {source}", { source });
}

/**
 * `thread` with the imported turns first and the divider after them. Prefix turns and items get ids of their own
 * (`imported-<n>-…`, never a core id), settle as completed and carry importedPrefix: true. The thread comes back
 * unchanged when there is no prefix or when it already has one (an `imported-` turn).
 * @param {{ turns?: object[] }} thread
 * @param {object[] | { turns?: object[] | null, importedFrom?: object | null } | null} prefix the `prefix` op's answer, or its turns
 * @param {object | null} [importedFrom] the import's record when `prefix` is only turns
 */
export function withImportedPrefix(thread, prefix, importedFrom = null) {
  const turns = Array.isArray(prefix) ? prefix : Array.isArray(prefix?.turns) ? prefix.turns : null;
  const from = (Array.isArray(prefix) ? null : prefix?.importedFrom) ?? importedFrom ?? null;
  const own = Array.isArray(thread?.turns) ? thread.turns : [];
  if (!thread || !turns?.length) return thread;
  if (own.some((turn) => isImportedTurn(turn?.id))) return thread;
  const shown = turns.filter((turn) => turn && typeof turn === "object").map((turn, index) => {
    const id = `${IMPORTED_TURN_PREFIX}${index}-${text(turn.id) || "turn"}`;
    return {
      ...turn, id, status: "completed", error: null, importedPrefix: true,
      items: (Array.isArray(turn.items) ? turn.items : []).filter((item) => item && typeof item === "object")
        .map((item, at) => ({ ...item, id: `${id}-${text(item.id) || at}`, ...(item.status === "inProgress" ? { status: "completed" } : {}), importedPrefix: true })),
    };
  });
  const last = shown.at(-1);
  const time = last?.completedAt ?? last?.startedAt ?? null;
  const divider = {
    id: `${IMPORTED_TURN_PREFIX}divider`, status: "completed", error: null, importedPrefix: true, startedAt: time, completedAt: time,
    items: [{ type: IMPORTED_DIVIDER, id: `${IMPORTED_TURN_PREFIX}divider-row`, text: importedDividerLabel(from), source: text(from?.source) || null, importedPrefix: true }],
  };
  return { ...thread, turns: [...shown, divider, ...own] };
}
