// W13 w13-chatui-sidebar-star: the Chat session row menu and its starred state, as official 3.6556.2 builds them.
// Plain node module (no JSX, no generated imports) so node --test can load it directly (E42).
//
// Official sources (reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/):
// - shared-22-Bwn3sJTG.js, the sidebar row of a hub session: `Y = n.sessionType === "chat"` and the menu props
//   `onArchive: Y || X ? void 0 : J`, `onUnarchive: X && !Y ? le : void 0`, `onDelete: ue`, `isChatSession: Y`,
//   `isStarred: pe ? t.isStarred : void 0`, `onStarred: (e) => { (ee(e), yy(e ? "pin" : "unpin", D)); }`,
//   `readState: Ms(n.sessionId, { isRunning: …, visibleUnread: he, … })`, `organizeItems: G` (G is null off Cowork:
//   `H = R === "cowork" && !Op(t)`), `reorderItems: W` (shared-18 KU/GU: "Move up" / "Move down").
// - shared-16-ByfgAyLr.js fm (SessionDropdownMenu body): children `[b, x, S, C, k, e, A, ee, te, ne, ie, H, U, ae, oe,
//   le, J, de, fe, me, ye]` — b = Il(separator "after") over the read toggle (`toggle-session-read-trigger`, Eye /
//   EyeSlash, u), ne = the star item, ie = Rename (`rename-session-trigger`, Edit, r), J = Il(separator "before") over
//   the reorder items, de = a separator before the lifecycle items when anything precedes them, ye = um Delete
//   (`delete-session-trigger`, Trash, d, danger). Hotkeys: `K && !_e && e.set("p", ot), j && e.set("u", st),
//   … se && e.set("r", z), W && !ge && e.set("a", ht), ue && !ge && e.set("d", B)`.
// - The star item is `K && (we ? <Pin/Unpin> : <Star/Unstar>)` with `we = Yt()`, and Yt is shared-78 `gK` (exported as
//   `fs`), the desktop-frame hook: `function gK(){…K4($,0,r,t,e,n,e=>!0)…return it(i)}`. In the desktop app it is true
//   (the host's useDesktopFrame, source-cowork-progress-v3-adapters.jsx), so the desktop menu says "Pin" / "Unpin" with
//   the Pin / PinSlash icons. c71dee58b Zl makes the same switch for its section heading: `b = Ct()` (also shared-78
//   `fs`) → `b ? Pi.pinned : "Starred"` (shared-9 OT pinned = "Pinned", A8GDlh2QW4), and the sidebar's pinned list is
//   shared-22 aM `W.formatMessage(rM.pinned)` ("Pinned"). "Star" / "Unstar" / "Starred" are the web branch.
// - Starring a session writes `setStarred(y, !D)` and then `onStarred` → yy("pin" | "unpin"); locally the starred flag
//   is the session's own `pinned` metadata (main.jsx sessionAction "pin" / "unpin"), so there is no second flag.
// - Delete opens shared-16 hm with `kind: f ? "chat" : "task"` (om, `isChatSession: f`); mm.chat is
//   "Delete chat" (ngIzbjIFxF) / "Are you sure you want to delete this chat?" (eoF+zSJr4t), confirm "Delete"
//   (K3r6DQW7h+, confirmVariant "danger"); `chatDeletedWithTask` only adds a sentence for kind "task".

/** shared-78 gK in the desktop frame (see above). */
export const DESKTOP_FRAME = true;

export const CHAT_ROW_MENU_MESSAGES = Object.freeze({
  pin: { defaultMessage: "Pin", id: "AJ2W7itqO2" },
  unpin: { defaultMessage: "Unpin", id: "nR6dLhVwqy" },
  star: { defaultMessage: "Star", id: "VwapsmdMes" },
  unstar: { defaultMessage: "Unstar", id: "Y5zRLWgCMP" },
  rename: { defaultMessage: "Rename", id: "FPJlgifNwD" },
  markAsRead: { defaultMessage: "Mark as read", id: "64Hq/+q+KI" },
  markAsUnread: { defaultMessage: "Mark as unread", id: "vLAPJDu9y6" },
  moveUp: { defaultMessage: "Move up", id: "wmFdwsKtFc" },
  moveDown: { defaultMessage: "Move down", id: "H/r5m64n8M" },
  delete: { defaultMessage: "Delete", id: "K3r6DQW7h+" },
});

/** shared-16 mm.chat, the row menu's delete confirm (hm). */
export const CHAT_DELETE_MESSAGES = Object.freeze({
  title: { defaultMessage: "Delete chat", id: "ngIzbjIFxF" },
  description: { defaultMessage: "Are you sure you want to delete this chat?", id: "eoF+zSJr4t" },
  confirm: { defaultMessage: "Delete", id: "K3r6DQW7h+" },
});

/** The starred section heading: c71dee58b Zl `b ? Pi.pinned : "Starred"`. */
export const STARRED_SECTION_MESSAGES = Object.freeze({
  pinned: { defaultMessage: "Pinned", id: "A8GDlh2QW4" },
  starred: { defaultMessage: "Starred", id: "V7cUPvWFo3" },
});

/** A chat session is starred when its metadata is pinned (shared-22 onStarred → "pin" / "unpin"). */
export const chatSessionStarred = (metadata) => metadata?.pinned === true;

export const starredSectionMessage = (desktopFrame = DESKTOP_FRAME) => desktopFrame ? STARRED_SECTION_MESSAGES.pinned : STARRED_SECTION_MESSAGES.starred;

/**
 * fm's single-row entries for a Chat session, in fm's order. Each item carries the official message, icon, hotkey,
 * data-testid and the host action it runs: "mark-read" | "mark-unread" | "pin" | "unpin" | "rename" | "move-up" |
 * "move-down" | "delete".
 *  - running: shared-2 YG `if (t.isRunning) return;` — no read state, so no read toggle (and no "u").
 *  - pinnedIndex / pinnedCount: the row's place in the pinned list (shared-18 GU: onMoveUp / onMoveDown when it can move).
 */
export function chatRowMenuEntries({ starred = false, unread = false, running = false, canRename = true, canDelete = true,
  pinnedIndex = -1, pinnedCount = 0, desktopFrame = DESKTOP_FRAME } = {}) {
  const M = CHAT_ROW_MENU_MESSAGES;
  const entries = [];
  // b: Il separator "after" with hasOwnRows = !!readState.
  if (!running) {
    entries.push({ kind: "item", key: "read", testId: "toggle-session-read-trigger", icon: unread ? "Eye" : "EyeSlash", shortcut: "u",
      message: unread ? M.markAsRead : M.markAsUnread, action: unread ? "mark-read" : "mark-unread" });
    entries.push({ kind: "separator", key: "read-after" });
  }
  // ne: K && (we ? Pin : Star) — no data-testid on either branch.
  entries.push(desktopFrame
    ? { kind: "item", key: "star", icon: starred ? "PinSlash" : "Pin", shortcut: "p", message: starred ? M.unpin : M.pin, action: starred ? "unpin" : "pin" }
    : { kind: "item", key: "star", icon: starred ? "StarFilled" : "Star", shortcut: "p", message: starred ? M.unstar : M.star, action: starred ? "unpin" : "pin" });
  // ie: Rename.
  if (canRename) entries.push({ kind: "item", key: "rename", testId: "rename-session-trigger", icon: "Edit", shortcut: "r", message: M.rename, action: "rename" });
  // J: Il separator "before" over reorderItems (GU, showIcon defaults on: ArrowUp / ArrowDown, no hotkeys).
  const reorder = [];
  if (starred && pinnedIndex > 0) reorder.push({ kind: "item", key: "move-up", icon: "ArrowUp", message: M.moveUp, action: "move-up" });
  if (starred && pinnedIndex !== -1 && pinnedIndex < pinnedCount - 1) reorder.push({ kind: "item", key: "move-down", icon: "ArrowDown", message: M.moveDown, action: "move-down" });
  if (reorder.length) entries.push({ kind: "separator", key: "reorder-before" }, ...reorder);
  // de: `o && (i || N !== void 0 || P !== void 0)` — the star item always precedes, so a separator, then ye (um).
  // fe / me: no Archive / Unarchive for a chat session (shared-22 `onArchive: Y || X ? void 0 : J`, `X && !Y`).
  if (canDelete) entries.push({ kind: "separator", key: "lifecycle-before" },
    { kind: "item", key: "delete", testId: "delete-session-trigger", icon: "Trash", shortcut: "d", variant: "danger", message: M.delete, action: "delete" });
  return entries;
}

/** fm's hotkey map (letter → action), from the entries that carry a shortcut. */
export function chatRowHotkeys(entries) {
  return new Map(entries.filter((entry) => entry.kind === "item" && entry.shortcut).map((entry) => [entry.shortcut, entry.action]));
}

/** shared-16 hm for kind "chat": title, description, confirm label (English; the host formats them with t()). */
export function chatDeleteConfirmCopy() {
  return { title: CHAT_DELETE_MESSAGES.title.defaultMessage, body: CHAT_DELETE_MESSAGES.description.defaultMessage,
    confirmLabel: CHAT_DELETE_MESSAGES.confirm.defaultMessage, danger: true };
}

/**
 * c71dee58b Zl's split of a list into starred rows and recent items (`i.kind === "chat"` → `conversation.is_starred`;
 * a session → `session.isStarred`), keeping each list in its input order. `isStarred(row)` reads the local flag.
 */
export function splitStarredRows(rows, isStarred) {
  const starredRows = [], recentRows = [];
  for (const row of rows ?? []) (isStarred(row) ? starredRows : recentRows).push(row);
  return { starredRows, recentRows };
}

// ---------------------------------------------------------------- the Chat session title's menu (chatui-sidebar-star-02)
//
// w13-close-cowork-sidebar (G12 review fix): a Chat session's title in its own view is ca2ef848d F5, the split title
// (`${testIdKind}-title-split`): the title button plus a CaretDown trigger ("More options for {label}", w5) whose
// K.Popup (`align: "end"`) holds Ote(A) = shared-16 om → fm. The props reach F5 like this (all static in the chunks):
// - c21f11e6d BP (CoworkSessionView, which also hosts sessionType "chat" sessions: `isChatSession: mi`) renders
//   ca2ef848d Uae/Bae (`hp`) with `onRenameSession: i || o ? void 0 : so`, `onArchiveSession: Ui && !o ? Vi : void 0`,
//   `onDeleteSession: i || o || !Ni ? void 0 : co`, `scheduledTaskId`, `sessionId`, `hideShare: !0`,
//   `temporaryVerdictResolved: !0` — and no onUnarchiveSession, chatConversation, isStarred, onToggleStarred,
//   renamesConversation, isExternalConversation or headerTitleMenuItems.
// - Bae builds `headerProps` (Ec) with `isLocalAgentSession: ec === "local_agent_mode_session"`,
//   `onScheduleTask: Cc` (`Cc = Ni.enabled && !Te ? Fi : void 0`, Ni = shared-78 yE, the scheduled-tasks verdict; Fi =
//   `ji.current?.setContent(Tw(Ir), e => e, e => e)`, Tw = shared-28 TD "Set this up to run on a schedule"),
//   `onTurnIntoSkill: wc` (`wc = Te ? void 0 : Ii`, Ii = `setContent("Turn this task into a skill", [], [])`),
//   `onCreateAgent: Vs`, `titleMenuItems: Qn` (headerTitleMenuItems, not passed) and hands them to y7 → S5 = y5.
// - y5's session branch (`w` = onRenameSession) renders F5 with `onArchive: Ot` (`Ot = Dt ? void 0 : D`, Dt = shared-52
//   mM: the session is sessionType "chat" → no Archive), `archiveIsChatArchive: A !== void 0` (false),
//   `onUnarchive: O` (none), `onDelete: k`, `chatConversation: be ? void 0 : A` (none), `isChatSession: Dt`,
//   `organizeItems: Ee` (none: Te is void 0, Ce needs !hideShare, te = titleMenuItems is void 0),
//   `isStarred: be ? void 0 : (j ?? Et)` (Et = Ed(sessionId), the session's own starred flag), `onToggleStarred: M`
//   (none), `onScheduleTask: I`, `onTurnIntoSkill: R`, `onCreateAgent: z`.
// - fm then gives, in its children order `[b, x, S, C, k, e, A, ee, te, ne, ie, H, U, ae, oe, le, J, de, fe, me, ye]`:
//   no read toggle (no readState), no Select, no "View task" (no scheduledTaskId), C = `!f && p` Schedule (Clock),
//   k = `m &&` the turnInto item (shared-12 Q: "Turn into skill", icon "Scroll" unless the plugin wording ships),
//   e = null (the create-agent slot is always null), A = a separator after them, no Open as quick task, no Copy
//   session ID (shared-0 oa: only a session_/cse_ id has one), ne = Pin / Unpin (p; desktop frame), ie = Rename
//   (r; om me opens the nm rename dialog, copy = the session wording, "Rename session"), oe = the move-to-space block
//   (Add to project / Change project, Remove from project), de = a separator, ye = um Delete (d; om he opens hm
//   `kind: f ? "chat" : "task"` = "Delete chat" 100ms later). No Archive / Unarchive (fe / me).
export const CHAT_TITLE_MENU_MESSAGES = Object.freeze({
  schedule: { defaultMessage: "Schedule", id: "1rQBje0k5s" },
  turnIntoSkill: { defaultMessage: "Turn into skill", id: "ufQmUah9fM" },
  // shared-28 wD.prompt, the composer text Schedule puts in (Fi → Tw(Ir)).
  schedulePrompt: { defaultMessage: "Set this up to run on a schedule", id: "KfWwH6nrJO" },
});

/** Bae Ii: the composer text Turn into skill puts in (a literal, not a message), with no mentions or attachments. */
export const TURN_INTO_SKILL_PROMPT = "Turn this task into a skill";

/** om he: the delete confirm opens 100ms after the menu closes (`setTimeout(() => K(!0), 100)`). */
export const CHAT_TITLE_DELETE_DELAY_MS = 100;

/**
 * fm's entries for the Chat session title (F5), in fm's order. Actions: "schedule" | "turn-into-skill" | "pin" |
 * "unpin" | "rename" | "delete". The move-to-space block renders right after Rename (as the row menu does).
 *  - scheduleOffered: Bae `Ni.enabled && !Te` (the app's scheduled tasks are on; a local chat is never external).
 *  - turnIntoSkillOffered: Bae `!Te` (always for a local chat).
 */
export function chatTitleMenuEntries({ starred = false, canRename = true, canDelete = true, scheduleOffered = true,
  turnIntoSkillOffered = true, desktopFrame = DESKTOP_FRAME } = {}) {
  const M = CHAT_ROW_MENU_MESSAGES, T = CHAT_TITLE_MENU_MESSAGES;
  const entries = [];
  // C: `!f && p && O.Item {onClick: dt, icon: "Clock"}` (no test id, no hotkey).
  if (scheduleOffered) entries.push({ kind: "item", key: "schedule", icon: "Clock", message: T.schedule, action: "schedule" });
  // k: `m && O.Item {onClick: ft, icon: he, children: pe}` (la(): turnInto / icons.turnInto).
  if (turnIntoSkillOffered) entries.push({ kind: "item", key: "turn-into-skill", icon: "Scroll", message: T.turnIntoSkill, action: "turn-into-skill" });
  // A: `(f || p || m || e !== null) && O.Separator`.
  if (scheduleOffered || turnIntoSkillOffered) entries.push({ kind: "separator", key: "commands-after" });
  // ne: K && (we ? Pin : Star).
  entries.push(desktopFrame
    ? { kind: "item", key: "star", icon: starred ? "PinSlash" : "Pin", shortcut: "p", message: starred ? M.unpin : M.pin, action: starred ? "unpin" : "pin" }
    : { kind: "item", key: "star", icon: starred ? "StarFilled" : "Star", shortcut: "p", message: starred ? M.unstar : M.star, action: starred ? "unpin" : "pin" });
  // ie: Rename (renameOffered: onRename is set).
  if (canRename) entries.push({ kind: "item", key: "rename", testId: "rename-session-trigger", icon: "Edit", shortcut: "r", message: M.rename, action: "rename" });
  // de: `o && (i || N !== void 0 || P !== void 0)` — Delete is the only lifecycle item; the star item always precedes.
  if (canDelete) entries.push({ kind: "separator", key: "lifecycle-before" },
    { kind: "item", key: "delete", testId: "delete-session-trigger", icon: "Trash", shortcut: "d", variant: "danger", message: M.delete, action: "delete" });
  return entries;
}
