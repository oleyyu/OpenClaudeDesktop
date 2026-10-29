// w13-close-cowork-sidebar (G12; closeout cwui-46 remainder, chatui-sidebar-star-02): pure model of the Cowork (hub)
// sidebar list of Claude Desktop 3.6556.2. Evidence is the official text in reference/snapshots/claude-3.6556.2-*/
// ion-dist/assets/v1 (read, never executed); tests/w13-close-cowork-sidebar.test.mjs pins each quoted fragment.
//
//  1. Grouping value: shared-21 iJ `nJ(tJ(pi(Lx(t), t, UL()), xL(t)), t, gg())` with pi = shared-52 j_ (default M_:
//     `e === "code" && t ? "project" : "none"`), tJ (`t && e === "type" ? "date" : e`), nJ (`t === "cowork" && n &&
//     e === "project" ? "date" : e`), and $N's `Z = X && K === "custom" ? "none" : Qp(K, t === "code" && G)`.
//  2. The Cowork "Group and sort" menu: shared-21 PJ `if (t === "cowork")` — Group by (`_t`, separatorBefore "none",
//     disabledValues `bt`), Sort by (`Ie`), then "Show empty groups" for Custom groups (`ce = AJ(t, E)`).
//  3. The Cowork buckets: shared-22 `bD = {project: {cowork: pD}, date: mD, unread: {cowork: gD(iw)}, folder: {cowork:
//     gD(RT)}, state: {cowork: gD(fw), …}, custom: {cowork: vD, …}, none: yD}`; xD falls back to mD.
//  4. The hub multi-selection menu: shared-16 fm `I ? a(ul, {actions: I, …})`, ul = cf259e6ae SidebarBulkMenuItems over
//     the actions c44373cde Le / X build (every selected row must allow an action for it to show).
// Local gate values (E59: no account, no GrowthBook payload) are HUB_GATES; each names its official source.
// Plain node: no JSX, no generated or view-tabs import (E42).

/** The gates the cowork menu and grouping read, at their local values. */
export const HUB_GATES = Object.freeze({
  // shared-21 UL: chorusCoworkListed = shared-26 Vk (`Te() || ir("dramatic_shrimp").isAvailable`, off here, like
  // source-sessions-page-hf-adapters.jsx useChatsPageSwitch), chorusCodeEnabled = shared-78 zy (`return (Ty(), !1)`),
  // hubRail = shared-78 cp (the hub look, off: source-drag-pin-hint.jsx G), isDesktopApp = shared-25 ml (this host).
  chorusCoworkListed: false, chorusCodeEnabled: false, hubRail: false, isDesktopApp: true,
  // shared-21 _L `_l() || jc()` (Vk || shared-78 EY, both off): the Type option and the type filter (`b && !v`).
  typeFilter: false,
  // shared-21 rJ = sR = shared-182 vR (`… return _R`, `var _R = !1`): the cowork Project option is not hidden (`y`).
  projectsHidden: false,
  // shared-21 is = shared-46 SN: GrowthBook claudeai_session_state && account ccr_session_state_buckets (default true);
  // D10 on, as source-sidebar-sections-adapters.jsx useStatusGrouping.
  stateGrouping: true,
});

// shared-21 OJ / PJ, shared-22 tw / uw, shared-26 mM, shared-78 hv, shared-22 zw: descriptors verbatim.
export const HUB_MESSAGES = Object.freeze({
  groupBy: { defaultMessage: "Group by", id: "MHeS4mgvyP" },
  groupAndSort: { defaultMessage: "Group and sort", id: "wib5ZqAv1q" },
  sortBy: { defaultMessage: "Sort by", id: "4WosAJhkMe" },
  date: { defaultMessage: "Date", id: "P7PLVjLe4f" },
  type: { defaultMessage: "Type", id: "+U6ozcnv4r" },
  folder: { defaultMessage: "Folder", id: "ukQpDs7M+0" },
  project: { defaultMessage: "Project", id: "k36uSwr4q5" },
  unread: { defaultMessage: "Unread", id: "UvLihb5JBI" },
  read: { defaultMessage: "Read", id: "5zvJTSJA0C" },
  state: { defaultMessage: "State", id: "5knGgZnlRq" },
  customGroups: { defaultMessage: "Custom groups", id: "yqhs/ALTJm" },
  none: { defaultMessage: "None", id: "9/SKZH+1jy" },
  name: { defaultMessage: "Name", id: "HAlOn1ZsuY" },
  dateCreated: { defaultMessage: "Date created", id: "ZRLnx2Phqf" },
  lastActivity: { defaultMessage: "Last activity", id: "pEcdNTP2U6" },
  showEmptyGroups: { defaultMessage: "Show empty groups", id: "JCuww4OJ/t" },
  recents: { defaultMessage: "Recents", id: "CRKRWkBSJ8" },
  otherProjects: { defaultMessage: "Other", id: "/VnDMl81rh" },
  viewProject: { defaultMessage: "View project", id: "vEMaSy+wz1" },
  blocked: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },
  working: { defaultMessage: "Working", id: "gAR0atqpRn" },
  ready: { defaultMessage: "Ready", id: "IZFEUgrg25" },
  done: { defaultMessage: "Completed", id: "95stPqCnfu" },
  idle: { defaultMessage: "Idle", id: "dDDdlNFks6" },
});

// ---------------------------------------------------------------- 1. the grouping value

const GROUP_VALUES = new Set(["date", "type", "folder", "project", "unread", "state", "custom", "none"]);

/** shared-52 M_: the default grouping (Code in the desktop app: project; Cowork and Chat: none). */
export function defaultHubGroupBy(kind, isDesktopApp = HUB_GATES.isDesktopApp) {
  return kind === "code" && isDesktopApp ? "project" : "none";
}

/** shared-52 j_ (pi): a stored grouping, the default when none; Type / Folder fall back to Date off their gates. */
export function storedHubGroupBy(stored, kind, gates = HUB_GATES) {
  const listed = kind === "cowork" && gates.chorusCoworkListed;
  if (stored === undefined || stored === null || !GROUP_VALUES.has(stored)) {
    return listed && gates.chorusCodeEnabled && !gates.hubRail ? "type" : defaultHubGroupBy(kind, gates.isDesktopApp);
  }
  return (stored === "type" && (!listed || gates.hubRail)) || (stored === "folder" && !(listed && gates.chorusCodeEnabled)) ? "date" : stored;
}

/**
 * The grouping the Cowork list renders (bD key): iJ = nJ(tJ(pi(…), archivedView), kind, projectsHidden), then $N's
 * `X && K === "custom" ? "none" : K` (X = xL: the archived view, which needs yL, off here). Qp is the identity off Code.
 */
export function coworkGroupBy(stored, { gates = HUB_GATES, archivedView = false } = {}) {
  let value = storedHubGroupBy(stored, "cowork", gates);
  if (archivedView && value === "type") value = "date"; // tJ
  if (gates.projectsHidden && value === "project") value = "date"; // nJ
  return archivedView && value === "custom" ? "none" : value;
}

/** PJ cowork `_t`: [Date, …Type, …Folder, …Project, Unread, …State, …Custom groups, None] (w = hubRail && false: never). */
export function coworkGroupByOptions(gates = HUB_GATES) {
  return [
    ["date", HUB_MESSAGES.date],
    ...(gates.typeFilter && !gates.hubRail ? [["type", HUB_MESSAGES.type]] : []),
    ...(gates.chorusCodeEnabled && gates.chorusCoworkListed ? [["folder", HUB_MESSAGES.folder]] : []),
    ...(gates.projectsHidden ? [] : [["project", HUB_MESSAGES.project]]),
    ["unread", HUB_MESSAGES.unread],
    ...(gates.stateGrouping ? [["state", HUB_MESSAGES.state]] : []),
    ["custom", HUB_MESSAGES.customGroups],
    ["none", HUB_MESSAGES.none],
  ];
}

/**
 * PJ `bt`: the Group by values shown disabled. "project" while there is nothing to group by (`pe = Fr(IJ) && !de && !fe`:
 * no spaces bridge here, so IJ holds, and no project to list), "folder" while the folder store is unset (`vt`), "type"
 * in the archived view (`L`). Locally: Project is disabled exactly when there is no local project.
 */
export function coworkGroupByDisabled({ hasProjects = false, archivedView = false, folderReady = true } = {}) {
  const values = new Set();
  if (!hasProjects) values.add("project");
  if (!folderReady) values.add("folder");
  if (archivedView) values.add("type");
  return values.size > 0 ? values : undefined;
}

/** PJ cowork `i`: the checked Group by value (Type in the archived view and a hidden Project read as Date). */
export function coworkGroupByMenuValue(stored, { gates = HUB_GATES, archivedView = false } = {}) {
  const value = storedHubGroupBy(stored, "cowork", gates);
  return (archivedView && value === "type") || (gates.projectsHidden && value === "project") ? "date" : value;
}

/** PJ `Ie` (Sort by) and shared-11 gf (`sortByByMode[e] ?? "recency"`). */
export const HUB_SORT_OPTIONS = Object.freeze([["alpha", HUB_MESSAGES.name], ["created", HUB_MESSAGES.dateCreated], ["recency", HUB_MESSAGES.lastActivity]]);
export const hubSortBy = (stored) => (HUB_SORT_OPTIONS.some(([value]) => value === stored) ? stored : "recency");

/** PJ `ce = AJ(t, E)`: `e !== "chat" && t === "custom"` (the Code-only Ni branch aside): Show empty groups is offered. */
export const coworkOffersEmptyGroups = (groupBy) => groupBy === "custom";

/**
 * The host's list preferences for the Cowork list: buildSidebarGroups runs the date / custom renderers itself and a flat
 * list (groupBy "none") for the buckets this model splits (unread, state, project). Cowork has no status filter in its
 * menu (PJ: the Status row is behind `x = yL()`, off here), so the list is the active one.
 */
export function coworkListPreferences(preferences, view = {}) {
  const groupBy = coworkGroupBy(view.groupBy);
  return { ...preferences, groupBy: groupBy === "date" || groupBy === "custom" ? groupBy : "none", sortBy: hubSortBy(view.sortBy),
    ascending: false, status: "active", showEmptyGroups: view.showEmptyGroups === true };
}

// ---------------------------------------------------------------- 3. the Cowork buckets

/**
 * One row's facts for the cowork buckets (host-derived): {error, awaiting, running, unread, explicitUnread, archived,
 * hasCompleted, open}. iw: a row is Unread when up (the read state) holds and it is not `u.has(ur(n.ref)) && !nw(…)`,
 * u = Fx() = shared-21 qQ (the set of sessions on screen: the IC panes plus the WQ route) — an open row that is not
 * explicitly unread reads as Read. Running does not enter here (a running, unread, closed row stays Unread).
 */
export function coworkRowUnread(facts) {
  return !!facts.unread && !(facts.open && !facts.explicitUnread);
}

/** iw: Unread then Read ({key, label, sessions}), each kept only when it has rows (keys "unread-unread", "unread-read"). */
export function coworkUnreadBuckets(sessions, factsOf) {
  const unread = [], read = [];
  for (const session of sessions) (coworkRowUnread(factsOf(session)) ? unread : read).push(session);
  return [
    ...(unread.length > 0 ? [{ key: "unread-unread", label: HUB_MESSAGES.unread, sessions: unread }] : []),
    ...(read.length > 0 ? [{ key: "unread-read", label: HUB_MESSAGES.read, sessions: read }] : []),
  ];
}

/** fw `lw`: the state bucket order. */
export const COWORK_STATE_ORDER = Object.freeze(["blocked", "working", "ready", "done", "idle"]);

/**
 * fw for a cowork row: `o = Ed({kind, hasError, liveStatus, hasCompleted, isUnread: a && !i, prState: "none", isArchived})`
 * with Ed = shared-8 pb over shared-26 Ij (`if (!e.isArchived) { hasError → error; awaiting / running → itself }`, else
 * `hasCompleted && isUnread ? ready : idle`; pb returns that state for a non-Code row), then `s`: error / awaiting →
 * blocked, running → working, `ready && !r` → ready, `pr || n.hasCompleted || (r && code)` → done, else idle.
 * `a && !i` is coworkRowUnread (iw's open-not-explicit read case).
 */
export function coworkStateKey(facts) {
  const archived = !!facts.archived;
  const isUnread = coworkRowUnread(facts);
  const state = !archived && facts.error ? "error"
    : !archived && (facts.awaiting || facts.running) ? (facts.awaiting ? "awaiting" : "running")
      : facts.hasCompleted && isUnread ? "ready" : "idle";
  if (state === "error" || state === "awaiting") return "blocked";
  if (state === "running") return "working";
  if (state === "ready" && !archived) return "ready";
  return facts.hasCompleted ? "done" : "idle";
}

/** fw: one bucket per state in `lw` order with rows (key `cowork-state-${state}`, dw label). */
export function coworkStateBuckets(sessions, factsOf) {
  const byState = new Map();
  for (const session of sessions) {
    const key = coworkStateKey(factsOf(session));
    byState.set(key, [...(byState.get(key) ?? []), session]);
  }
  return COWORK_STATE_ORDER.filter((key) => byState.has(key))
    .map((key) => ({ key: `cowork-state-${key}`, label: HUB_MESSAGES[key], sessions: byState.get(key) }));
}

/**
 * Bw over shared-26 Qk for local projects: a row with a project (`userSelectedProjectUuids[0]`, the host's
 * sessionMetadata projectId of a known local project) goes to `chat-project-${id}` (label: the project's name), the rest
 * to `space-__no_project__` (label hv.otherProjects "Other", containerRef null) last; project buckets sort by label
 * (`localeCompare`). Bw renders the flat list (Nw) when every bucket has no container (`k.every(Vw)`): `flat` is then true.
 */
export function coworkProjectBuckets(sessions, { projectIdOf, projects = [] } = {}) {
  const byId = new Map((Array.isArray(projects) ? projects : []).filter((project) => project?.id).map((project) => [project.id, project]));
  const buckets = new Map(), other = [];
  for (const session of sessions) {
    const id = projectIdOf(session);
    if (typeof id === "string" && byId.has(id)) buckets.set(id, [...(buckets.get(id) ?? []), session]);
    else other.push(session);
  }
  const label = (id) => byId.get(id)?.name ?? id;
  const result = [...buckets.keys()].sort((a, b) => label(a).localeCompare(label(b)))
    .map((id) => ({ key: `chat-project-${id}`, label: label(id), sessions: buckets.get(id), project: byId.get(id) }));
  if (other.length > 0) result.push({ key: "space-__no_project__", label: HUB_MESSAGES.otherProjects, sessions: other, project: null });
  return { buckets: result, flat: result.every((bucket) => bucket.project === null) };
}

// ---------------------------------------------------------------- 4. the hub multi-selection menu

/**
 * c44373cde Fe for a hub row (a local session is a cowork-source row; a Chat row is one with sessionType "chat"):
 * isPinned (shared-11 uw isStarred), isTask true, isArchivableTask `sessionType !== "chat" && !isArchived`, and the read
 * toggle c7ab4beb6 `i`: none while running / awaiting / asking permission, else isUnread = `unread && (not the open row ||
 * explicitUnread)`, canMarkUnread = !isUnread. groupable: `n.onCoworkRail && k(t, …)` (the Cowork rail only).
 */
export function hubBulkRow({ id, pinned = false, unread = false, explicitUnread = false, running = false, awaiting = false,
  archived = false, open = false, sessionType = "cowork", onCoworkRail = false } = {}) {
  const live = running || awaiting;
  const isUnread = !!unread && (!open || !!explicitUnread);
  return { id, isPinned: !!pinned, pinWritable: true, isChat: false, isTask: true, temporaryChat: false,
    isArchivableTask: sessionType !== "chat" && !archived, isArchivableChat: false,
    readToggle: live ? null : { isUnread, canMarkUnread: !isUnread }, groupable: !!onCoworkRail };
}

/** Le's partition (`c = e => s.length > 0 && s.every(e) ? s : Ie`): an action lists every row, or none. */
export function hubBulkActions(rows = []) {
  const all = (predicate) => (rows.length > 0 && rows.every(predicate) ? rows : []);
  return {
    items: rows,
    pin: all((row) => !row.isPinned && !row.temporaryChat && row.pinWritable),
    unpin: all((row) => row.isPinned && row.pinWritable),
    markRead: all((row) => row.readToggle?.isUnread === true),
    markUnread: all((row) => row.readToggle?.canMarkUnread === true),
    moveToGroup: all((row) => row.groupable),
    archive: all((row) => row.isArchivableTask || row.isArchivableChat),
    deleteChats: all((row) => row.isChat),
    deleteTasks: all((row) => row.isTask),
  };
}

// cf259e6ae `m`: the items, in order [F, I, L, R, z, B, V, H], with their descriptors, test ids, icons and keys.
export const HUB_BULK_MESSAGES = Object.freeze({
  pin: { defaultMessage: "Pin {count}", id: "JdqAgc2NFS" },
  unpin: { defaultMessage: "Unpin {count}", id: "k/1sa+m76H" },
  markRead: { defaultMessage: "Mark {count} as read", id: "VUwiWnwpcS" },
  markUnread: { defaultMessage: "Mark {count} as unread", id: "UmH4IX1ER9" },
  archive: { defaultMessage: "Archive {count}", id: "QhJxtbMJfB" },
  delete: { defaultMessage: "Delete {count}", id: "gkoSAmTJDl" },
  // shared-18 ck (pk off the Code overlay): the groups copy of shared-20 Wx / Ux / Hx.
  moveCountTo: { defaultMessage: "Move {count} to group", id: "nX1+Eie4aq" },
  ungrouped: { defaultMessage: "Ungrouped", id: "97vzU+lFpS" },
  newGroup: { defaultMessage: "New group…", id: "ZLhKz4Rw7U" },
});

/**
 * X → m: the bulk menu entries for the actions (X: `Y(list, run)` = `{count}` when the list is not empty; archive also
 * needs the bridge's archiveCowork, deleteTasks its deleteCowork — both local here). anyAssigned: X's
 * `o.some(t => e[me(t.key)] !== void 0)` (some selected row is in a custom group: Wx shows Ungrouped). Returns
 * [{kind: "item" | "move" | "separator", action, message, count, testId, icon, shortcut, variant}].
 */
export function hubBulkMenuEntries(actions, { anyAssigned = false } = {}) {
  const count = (list) => (list?.length > 0 ? list.length : 0);
  const pin = count(actions.pin), unpin = count(actions.unpin), markRead = count(actions.markRead), markUnread = count(actions.markUnread);
  const move = count(actions.moveToGroup), archive = count(actions.archive);
  const deleteChats = count(actions.deleteChats), deleteTasks = count(actions.deleteTasks), del = deleteChats || deleteTasks;
  const entries = [];
  if (pin) entries.push({ kind: "item", action: "pin", message: HUB_BULK_MESSAGES.pin, count: pin, testId: "bulk-pin-trigger", icon: "Pin", shortcut: "p" });
  if (unpin) entries.push({ kind: "item", action: "unpin", message: HUB_BULK_MESSAGES.unpin, count: unpin, testId: "bulk-unpin-trigger", icon: "PinSlash", shortcut: pin ? undefined : "p" });
  if (markRead) entries.push({ kind: "item", action: "mark-read", message: HUB_BULK_MESSAGES.markRead, count: markRead, testId: "bulk-mark-read-trigger", icon: "Eye", shortcut: "u" });
  if (markUnread) entries.push({ kind: "item", action: "mark-unread", message: HUB_BULK_MESSAGES.markUnread, count: markUnread, testId: "bulk-mark-unread-trigger", icon: "EyeSlash", shortcut: markRead ? undefined : "u" });
  if (move) entries.push({ kind: "move", action: "move-to-group", message: HUB_BULK_MESSAGES.moveCountTo, count: move, testId: "move-to-group-trigger", icon: "Folder",
    anyAssigned: !!anyAssigned });
  if ((archive || del) && (pin || unpin || markRead || markUnread || move)) entries.push({ kind: "separator", key: "lifecycle" });
  if (archive) entries.push({ kind: "item", action: "archive", message: HUB_BULK_MESSAGES.archive, count: archive, testId: "bulk-archive-trigger", icon: "Archive", shortcut: "a" });
  if (del) entries.push({ kind: "item", action: "delete", message: HUB_BULK_MESSAGES.delete, count: del, variant: "danger",
    testId: deleteChats ? "delete-chat-trigger" : "bulk-delete-tasks-trigger", icon: "Trash", shortcut: "d" });
  return entries;
}

/** cf259e6ae `p`: the menu's letter keys, first come first served (p pin / unpin, u read / unread, a archive, d delete). */
export function hubBulkHotkeys(entries) {
  const keys = new Map();
  for (const key of ["pin", "unpin", "mark-read", "mark-unread", "archive", "delete"]) {
    const entry = entries.find((item) => item.action === key);
    const letter = { pin: "p", unpin: "p", "mark-read": "u", "mark-unread": "u", archive: "a", delete: "d" }[key];
    if (entry && !keys.has(letter)) keys.set(letter, key);
  }
  return keys;
}
