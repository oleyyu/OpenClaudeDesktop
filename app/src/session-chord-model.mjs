// R3-topbar TT-11 (menus-02): which open session the ⌥⌘A Archive chord acts on.
// 2.42304.0 cf74bc599-D9NZWRyl.js yO (EpitaxySessionPaletteCommands), its global keydown `lt`:
//   ot(t)&&S&&!C&&!pe&&!Gn(q)?.isWorking&&(r=()=>{…archive…}),r&&(!we(t,"yield",De)||wo()||(t.preventDefault(),r()))
// where S = !_&&!x (the session's metadata is loaded and it is one this account may act on), C = t?.isArchived,
// pe = tn(e=>e.starredIds).includes(e.id) (pinned) and Gn(q)?.isWorking the row's working status. A chord that does
// not apply leaves `r` unset, so the key is neither handled nor preventDefaulted: it reaches the page and the menus as
// if no chord were bound. The whole block is gated by ccd_palette_session_actions (H), which B25 ports as on.
// Locally "working" is the core's active turn (state.active), a session operation still in flight (review, fork, …:
// operationPending) or the sidebar's working state (sessionState === "working"); the same facts the ⌘⇧⌫ path
// (source-sidebar.jsx archiveShortcut) and sessionAction("archive") already refuse.
import { sessionArchived, sessionState } from "./sidebar-model.js";
import { operationPending } from "./session-command-model.mjs";
import { openCycleButton } from "./generated/code-current/session-cycle-rows.mjs";
import { sidebarCycleButtons } from "./session-cycle-model.mjs";
import { titlebarFoldedToggles } from "./titlebar-controls-model.mjs";

export function sessionChordArchivable({ archived = false, pinned = false, active = false, operationPending: pending = false, working = false } = {}) {
  return !archived && !pinned && !active && !pending && !working;
}

// The facts for one session row: its sidebar metadata (pinned lives there, source-sidebar.jsx metadata.pinned), the
// reducer state and whether a local session action holds its lock (main.jsx actionLock).
export function sessionChordArchiveFacts(row, { metadata = {}, state = {}, locked = false } = {}) {
  if (!row) return null;
  return {
    archived: sessionArchived(row),
    pinned: !!(metadata?.pinned ?? row.pinned),
    active: !!state?.active?.[row.id],
    operationPending: operationPending(state?.operations?.[row.id]) || !!locked,
    working: sessionState(row, state) === "working",
  };
}

export function sessionChordArchives(row, context) {
  const facts = sessionChordArchiveFacts(row, context);
  return !!facts && sessionChordArchivable(facts);
}

// R4h-topbar K1 (Y1-R3-topbar-2, 2.42304.0 shared-16-B0xHzPjj.js xh / Sh / bh, cf74bc599-D9NZWRyl.js yO):
// - xh(e): e.closest("[data-row-key]")?.getAttribute("data-row-key") ?? undefined
// - Sh(e, t): when the focused sidebar row is e (n[r].getAttribute("data-selected") === "focused"), picks the first
//   unarchived row in [...n.slice(r + 1), ...n.slice(0, r).reverse()] (next rows in DOM order, then previous rows in
//   reverse order).
// - bh({ rowKey, sessionId, teardownSessionPanes, onCommit }): snapshots the adjacent row before commit; on commit, if
//   focus did not move to another row (l = o !== void 0 && xh(o) !== e), opens the adjacent row via im(u) and tears
//   down only the archived session panes when c (a?.getAttribute("data-selected") !== "open"), else runs
//   teardownSessionPanes(t) (which returns the active pane to Home when no adjacent row was opened).
// - yO multi-select branch: if (zn.getState().selectedKeys.size > 0) { P(); return; } where P is
//   c_({ sessionRef: e, sessionTitle: d, afterRemoval: N }).archiveSession (c48ea26ad ge -> Z), archiving the open
//   session and running afterRemoval: N (teardownSessionPanes -> Home) without yo clicking an adjacent row.

export function rowKeySessionId(rowKey) {
  if (typeof rowKey !== "string" || !rowKey) return undefined;
  return rowKey.startsWith("code:") ? rowKey.slice(5) : rowKey;
}

export function buttonRowKey(button) {
  return button?.closest?.("[data-row-key]")?.getAttribute?.("data-row-key")
    ?? button?.getAttribute?.("data-row-key")
    ?? undefined;
}

function selectedOf(button) {
  return button?.getAttribute?.("data-selected")
    ?? button?.closest?.("[data-row-key]")?.getAttribute?.("data-selected")
    ?? null;
}

function sameRowKey(a, b, bSessionId = rowKeySessionId(b)) {
  if (!a || !b) return false;
  if (a === b) return true;
  const aId = rowKeySessionId(a);
  return aId !== undefined && aId === bSessionId;
}

function toArchivedIdSet(archivedIds, fallbackRowKey) {
  const set = new Set();
  if (archivedIds instanceof Set || Array.isArray(archivedIds)) {
    for (const item of archivedIds) {
      if (typeof item === "string" && item) {
        set.add(item);
        const normalized = rowKeySessionId(item);
        if (normalized) set.add(normalized);
      }
    }
  } else if (typeof fallbackRowKey === "string" && fallbackRowKey) {
    set.add(fallbackRowKey);
    const normalized = rowKeySessionId(fallbackRowKey);
    if (normalized) set.add(normalized);
  }
  return set;
}

// Pure adjacent-key calculation (shared-16 Sh candidate order [...n.slice(r+1), ...n.slice(0,r).reverse()]).
export function sessionChordArchiveNeighbour(keys = [], rowKey, archivedIds) {
  if (!Array.isArray(keys) || !rowKey) return null;
  const targetId = rowKeySessionId(rowKey);
  const r = keys.findIndex((key) => sameRowKey(key, rowKey, targetId));
  if (r === -1) return null;
  const archived = toArchivedIdSet(archivedIds, rowKey);
  const ordered = [...keys.slice(r + 1), ...keys.slice(0, r).reverse()];
  return ordered.find((key) => {
    const id = rowKeySessionId(key);
    return (id === undefined || !archived.has(id)) && (key === undefined || !archived.has(key));
  }) ?? null;
}

// shared-16 Sh(e, t): finds the adjacent button in tm("code").buttons when n[r] has data-selected === "focused".
export function sessionChordAdjacentButton(buttons = [], rowKey, archivedIds) {
  const list = Array.isArray(buttons) ? buttons : [];
  if (!rowKey) return undefined;
  const targetId = rowKeySessionId(rowKey);
  const r = list.findIndex((btn) => sameRowKey(buttonRowKey(btn), rowKey, targetId));
  if (r === -1 || selectedOf(list[r]) !== "focused") return undefined;
  const archived = toArchivedIdSet(archivedIds, rowKey);
  return [...list.slice(r + 1), ...list.slice(0, r).reverse()].find((btn) => {
    const key = buttonRowKey(btn);
    const id = rowKeySessionId(key);
    return (id === undefined || !archived.has(id)) && (key === undefined || !archived.has(key));
  });
}

// shared-16 bh({ rowKey: e, sessionId: t, teardownSessionPanes: n, onCommit: r }):
export function createSessionChordArchiveCommit({
  rowKey,
  sessionId = rowKeySessionId(rowKey),
  buttons = () => sidebarCycleButtons().buttons,
  openButton = openCycleButton,
  teardownSessionPanes = () => {},
  closePanes = () => {},
  onCommit,
} = {}) {
  const key = rowKey ?? sessionId;
  return (archivedIds = new Set([sessionId].filter(Boolean))) => {
    const initialButtons = typeof buttons === "function" ? buttons() : buttons;
    const a = sessionChordAdjacentButton(initialButtons, key, archivedIds);
    const o = a && buttonRowKey(a);
    const s = o !== undefined ? o : undefined;
    const c = selectedOf(a) !== "open";
    return () => {
      const currentButtons = typeof buttons === "function" ? buttons() : buttons;
      const focused = currentButtons.find((btn) => selectedOf(btn) === "focused");
      const l = focused !== undefined && !sameRowKey(buttonRowKey(focused), key, sessionId);
      const u = a?.isConnected ? a : currentButtons.find((btn) => s !== undefined && sameRowKey(buttonRowKey(btn), s));
      const d = !l && !!openButton(u);
      onCommit?.(d);
      if (d && c) closePanes(sessionId);
      else teardownSessionPanes(sessionId);
      return d;
    };
  };
}

// Detects whether the sidebar has an active multi-selection (zn.getState().selectedKeys.size > 0 in cf74bc599 yO).
// Reads explicit selectedKeys when provided, and in the host DOM checks whether .source-sidebar has any row with
// data-selected="focused" that is not the open session row (aria-current="page").
export function sidebarHasSelection(sessionId, { selectedKeys, root = globalThis.document } = {}) {
  if (selectedKeys instanceof Set) return selectedKeys.size > 0;
  if (Array.isArray(selectedKeys)) return selectedKeys.length > 0;
  const rows = root?.querySelectorAll
    ? Array.from(root.querySelectorAll('.source-sidebar .df-session-list [data-row-key][data-selected="focused"]'))
    : [];
  return rows.some((row) => {
    const key = row.getAttribute?.("data-row-key");
    const mainBtn = row.querySelector?.("[data-row-main-button]");
    if (mainBtn?.getAttribute?.("aria-current") === "page") return false;
    return !sameRowKey(key, sessionId);
  });
}

// cf74bc599 yO archive chord body:
// if (Zf(...), zn.getState().selectedKeys.size > 0) { P(); return; }
// L(e, yo({ rowKey: q, sessionId: e.id, teardownSessionPanes: s })).then(t => { t && s_(e); })
export function runSessionChordArchive(row, {
  selectedKeys,
  hasSelection,
  root,
  archiveSession,
  archiveWithCommit,
  buttons,
  openButton,
  teardownSessionPanes,
  closePanes,
  onCommit,
  onCommitted,
} = {}) {
  if (!row?.id) return undefined;
  const multiSelected = typeof hasSelection === "boolean"
    ? hasSelection
    : sidebarHasSelection(row.id, { selectedKeys, root });
  if (multiSelected) {
    return archiveSession?.(row, selectedKeys);
  }
  const prepare = createSessionChordArchiveCommit({
    rowKey: row.id,
    sessionId: row.id,
    buttons,
    openButton,
    teardownSessionPanes,
    closePanes,
    onCommit,
  });
  const commit = prepare(new Set([row.id]));
  const runner = archiveWithCommit ?? archiveSession;
  return Promise.resolve(runner?.(row, commit)).then((committed) => {
    const ok = committed !== false;
    if (ok) {
      commit();
      onCommitted?.(row);
    }
    return ok;
  });
}

// R4h-topbar K1 (Y1-R3-topbar-1 & low-2): pure keydown and command dispatch for ⌥⌘P/R/A/U/G/O so behavioral tests
// verify preventDefault, repeat handling (if(g||t.defaultPrevented||t.repeat)return; in cf74bc599 lt), probe gating,
// and action dispatch without source regexes.
export const SESSION_CHORD_COMMANDS = Object.freeze([
  "pin-session",
  "rename-session",
  "archive-session",
  "unread-session",
  "open-session-pr",
  "fork-session",
]);

export function isSessionChordCommand(command) {
  return SESSION_CHORD_COMMANDS.includes(command);
}

export function handleSessionChordKeydown(event, command, {
  blocked = false,
  actionDialog = null,
  rename = null,
  whatsNew = false,
  menu = null,
  run,
} = {}) {
  if (!isSessionChordCommand(command)) return false;
  // cf74bc599 lt: if(g||t.defaultPrevented||t.repeat)return; — repeat keys return before preventDefault.
  if (!event || event.defaultPrevented || event.repeat) return false;
  if (blocked || actionDialog || rename || whatsNew || menu) return false;
  // cf74bc599 yO: ot(t)&&S&&!C&&!pe&&!Gn(q)?.isWorking&&(r=…), then r&&(…t.preventDefault(),r()).
  if (command === "archive-session" && run?.(command, { probe: true }) !== true) return false;
  event.preventDefault?.();
  run?.(command);
  return true;
}

export function dispatchSessionChord(command, {
  probe = false,
  row,
  metadata = {},
  state = {},
  locked = false,
  updateMetadata,
  onRename,
  onArchive,
  onSessionAction,
  prUrl,
} = {}) {
  const archives = !!row && sessionChordArchives(row, { metadata, state, locked });
  if (probe) return command === "archive-session" ? archives : !!row;
  if (!row) return false;
  if (command === "pin-session") {
    updateMetadata?.(row.id, { pinned: !(metadata?.pinned ?? row.pinned) });
    return true;
  }
  if (command === "rename-session") {
    onRename?.(row);
    return true;
  }
  if (command === "archive-session") {
    if (!archives) return false;
    if (onArchive) onArchive(row);
    else onSessionAction?.("archive", row);
    return true;
  }
  if (command === "unread-session") {
    updateMetadata?.(row.id, { unread: !(metadata?.unread ?? row.unread) });
    return true;
  }
  if (command === "fork-session") {
    onSessionAction?.("fork", row);
    return true;
  }
  if (command === "open-session-pr") {
    const url = typeof prUrl === "function" ? prUrl(row) : prUrl;
    if (!url) return false;
    onSessionAction?.("open-pr", row, { url });
    return true;
  }
  return false;
}

// R4h-topbar K1 (Y1-R3-topbar-1, TT-03 2.42304.0 c73f45bc3 Vh): View options row list assembly — first the toggles the
// titlebar folded away (jh(Rh(...), hiddenMainPaneCount).folded, in toggle order, each with icon, label, shortcut,
// and checked: openPanes.has(kind)), then Background tasks and Plan.
export function titlebarViewOptionsItems({
  surface = "code",
  session = false,
  terminalAvailable = false,
  previewAvailable = false,
  filesAvailable = false,
  panes = new Set(),
  hiddenCount = 0,
  hasTasks = false,
  hasPlan = false,
  onToggleTerminal,
  onTogglePane,
} = {}) {
  const open = panes instanceof Set ? panes : new Set(panes);
  return [
    ...titlebarFoldedToggles({ surface, session, terminalAvailable, previewAvailable, filesAvailable, panes: open }, hiddenCount)
      .map((spec) => ({ kind: spec.pane, label: spec.label, icon: spec.icon, shortcut: spec.shortcut })),
    ...((hasTasks || open.has("tasks")) ? [{ kind: "tasks", label: "Background tasks", icon: "AgentsSimple" }] : []),
    ...((hasPlan || open.has("plan")) ? [{ kind: "plan", label: "Plan", icon: "Checklist" }] : []),
  ].map((item) => ({
    ...item,
    checked: open.has(item.kind),
    onSelect: () => (item.kind === "terminal" ? onToggleTerminal?.() : onTogglePane?.(item.kind)),
  }));
}
