import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSidebarGroups, CLASSIC_GROUP_OPTIONS, CLASSIC_SORT_OPTIONS,
  normalizeSidebarPreferences, clearSidebarFilters, hasSidebarFilters,
  localDayBoundaries, sessionState, timestampMs, buildNestedRuns, bulkTargets, movePinned, orderPinned,
  sessionParentId, lineageKind, nestedStubCounts, truncateRuns, sidebarEmptyVariant,
  showAllSessionsPreferences, sidebarEmptyHasNonDefaultFilter,
  toggleCollapsedGroup, expandCollapsedGroup, stickyListFailure, showFewerRows,
} from "../src/sidebar-model.js";

const now = new Date(2026, 8, 20, 12).getTime();
const atDay = (days, hour = 12) => {
  const date = new Date(now); date.setDate(date.getDate() - days); date.setHours(hour, 0, 0, 0);
  return date.getTime() / 1000;
};
const thread = (id, fields = {}) => ({ id, name: id, cwd: "/work/project", createdAt: atDay(5), updatedAt: atDay(0), ...fields });
const ids = (groups) => groups.flatMap((group) => group.sessions.map((session) => session.id));

test("sidebar settings reject invalid choices and preserve metadata visibility", () => {
  assert.deepEqual(CLASSIC_GROUP_OPTIONS.map(([key]) => key), ["date", "project", "state", "custom", "none"]);
  assert.deepEqual(CLASSIC_SORT_OPTIONS.map(([key]) => key), ["alpha", "created", "recency"]);
  assert.deepEqual(normalizeSidebarPreferences({ groupBy: "status", sortBy: "lastUpdated", status: "running", stateActivityDays: 14 }), {
    groupBy: "project", sortBy: "recency", status: "active", stateActivityDays: 7, showEmptyGroups: false, showPrStatus: true, showMetadata: false, ascending: false, collapsedNested: [], collapsedGroups: [],
  });
  // lI 'Show PR status' (show_pr_status): on by default, off only when saved false.
  assert.equal(normalizeSidebarPreferences({ showPrStatus: false }).showPrStatus, false);
  // sidebar-groups vc().keys: folded nested heads are string ids, deduplicated.
  assert.deepEqual(normalizeSidebarPreferences({ collapsedNested: ["p", "p", 3, "", "q"] }).collapsedNested, ["p", "q"]);
});

test("date grouping uses local calendar days and seven buckets, not elapsed 24-hour windows", () => {
  const sessions = [thread("today", { updatedAt: atDay(0, 0) }), thread("yesterday", { updatedAt: atDay(1, 23) }),
    thread("day6", { updatedAt: atDay(6) }), thread("old", { updatedAt: atDay(7) }), thread("unknown", { updatedAt: null })];
  const groups = buildSidebarGroups({ sessions, preferences: { groupBy: "date" }, now, locale: "en-US" });
  assert.deepEqual(groups.map((group) => group.key), ["day-0", "day-1", "day-6", "older"]);
  assert.deepEqual(groups.map((group) => group.label), ["Today", "Yesterday", "Sep 14", "Older"]);
  assert.deepEqual(groups.at(-1).sessions.map((session) => session.id), ["old", "unknown"]);
});

test("calendar buckets survive the daylight-saving boundary", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const days = localDayBoundaries(new Date(2026, 2, 9, 12).getTime());
    assert.equal(days[0] - days[1], 23 * 3600000);
    assert.equal(new Date(days[1]).getHours(), 0);
    assert.equal(new Date(days[1]).getDate(), 8);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("Active, Archived and All use the real thread archive flag, including pinned threads", () => {
  const sessions = [thread("active"), thread("archive", { archived: true }), thread("compat", { isArchived: true })];
  const metadata = { archive: { pinned: true } };
  assert.deepEqual(ids(buildSidebarGroups({ sessions, metadata, preferences: { status: "active" } })), ["active"]);
  assert.deepEqual(ids(buildSidebarGroups({ sessions, metadata, preferences: { status: "archived" } })), ["archive", "compat"]);
  assert.equal(ids(buildSidebarGroups({ sessions, metadata, preferences: { status: "all" } })).length, 3);
});

test("name/date-created/last-activity sorting is stable and does not mutate server records", () => {
  const sessions = Object.freeze([
    Object.freeze(thread("z", { name: "Task 10", updatedAt: atDay(0), createdAt: atDay(4) })),
    Object.freeze(thread("a", { name: "Task 2", updatedAt: atDay(2), createdAt: atDay(0) })),
    Object.freeze(thread("b", { name: "Task 1", updatedAt: atDay(1), createdAt: atDay(3) })),
  ]);
  for (const [sortBy, expected] of [["alpha", ["b", "a", "z"]], ["created", ["a", "b", "z"]], ["recency", ["z", "b", "a"]]]) {
    assert.deepEqual(ids(buildSidebarGroups({ sessions, preferences: { groupBy: "none", sortBy } })), expected);
  }
  assert.deepEqual(sessions.map((session) => session.id), ["z", "a", "b"]);
});

test("pinned sessions appear once; missing custom-group assignments return to Ungrouped", () => {
  const sessions = [thread("pinned"), thread("assigned"), thread("removed"), thread("free")];
  const metadata = { pinned: { pinned: true, customGroupId: "g1" }, assigned: { customGroupId: "g1" }, removed: { customGroupId: "deleted" } };
  const groups = buildSidebarGroups({ sessions, metadata, customGroups: [{ id: "g1", name: "Focus" }], preferences: { groupBy: "custom" } });
  assert.deepEqual(groups.map((group) => group.label), ["Pinned", "Focus", "Ungrouped"]);
  assert.deepEqual(groups[1].sessions.map((session) => session.id), ["assigned"]);
  assert.equal(new Set(ids(groups)).size, 4);
});

test("state buckets follow classic labels/order and approval takes priority over running", () => {
  const sessions = [thread("working"), thread("review", { prState: "open" }), thread("approval"), thread("error"), thread("completed")];
  const state = { active: { working: "turn1", approval: "turn2" }, errors: { error: "Failure" }, approvals: [{ params: { threadId: "approval" } }] };
  const groups = buildSidebarGroups({ sessions, state, preferences: { groupBy: "state" }, now });
  assert.deepEqual(groups.map((group) => group.label), ["Needs input", "Ready for review", "Working", "Completed"]);
  assert.equal(sessionState(sessions[2], state), "blocked");
  assert.equal(sessionState(thread("working", { archived: true }), state), "done");
});

test("state age filter is scoped to State and keeps pinned sessions visible", () => {
  const sessions = [thread("old", { updatedAt: atDay(20) }), thread("pin", { updatedAt: atDay(20) }), thread("recent")];
  const metadata = { pin: { pinned: true } };
  assert.deepEqual(ids(buildSidebarGroups({ sessions, metadata, preferences: { groupBy: "state" }, now })), ["pin", "recent"]);
  assert.equal(ids(buildSidebarGroups({ sessions, metadata, preferences: { groupBy: "date" }, now })).length, 3);
  assert.equal(ids(buildSidebarGroups({ sessions, metadata, preferences: { groupBy: "state", stateActivityDays: 0 }, now })).length, 3);
});

test("empty groups are explicit and are suppressed while searching", () => {
  const options = { sessions: [thread("live")], knownFolders: ["/work/project", "/work/empty"], preferences: { showEmptyGroups: true } };
  assert.equal(buildSidebarGroups(options).length, 2);
  assert.equal(buildSidebarGroups({ ...options, search: "missing" }).length, 0);
  assert.equal(buildSidebarGroups({ ...options, search: " LIVE " }).length, 1);
});

test("Clear filters resets filtering without discarding the user's grouping and sorting", () => {
  const prefs = { groupBy: "custom", sortBy: "alpha", status: "archived", showEmptyGroups: true, stateActivityDays: 30 };
  assert.equal(hasSidebarFilters(prefs), true);
  const result = clearSidebarFilters(prefs);
  assert.equal(result.groupBy, "custom");
  assert.equal(result.sortBy, "alpha");
  assert.equal(hasSidebarFilters(result), false);
  assert.equal(timestampMs("invalid date"), 0);
  assert.equal(timestampMs(1720000000), 1720000000000);
});

test("nested runs: real lineage only, restricted to the bucket, chains flattened to one level", () => {
  // sidebar-groups WF/GF/KF. Sorted order: child before its parent pulls the family to the child's slot.
  const sessions = [thread("f1", { forkedFromId: "p" }), thread("p"), thread("x"), thread("f2", { forkedFromId: "p" }),
    thread("grand", { forkedFromId: "f1" }), thread("orphan", { forkedFromId: "missing" }), thread("side", { parentThreadId: "x" })];
  const { runs, parentOf, ordered } = buildNestedRuns(sessions, { orphan: {} });
  assert.deepEqual(ordered.map((s) => s.id), ["p", "f1", "f2", "x", "side", "grand", "orphan"]);
  assert.deepEqual(runs.map((run) => [run.parentId, run.rows.map((s) => s.id)]), [
    [null, ["p"]], ["p", ["f1", "f2"]], [null, ["x"]], ["x", ["side"]], [null, ["grand", "orphan"]],
  ]);
  assert.equal(parentOf.has("grand"), false, "a grandchild becomes a top-level row instead of a deeper level");
  assert.equal(parentOf.has("orphan"), false);
  assert.equal(sessionParentId(thread("m"), { m: { forkedFrom: "p" } }), "p");
  assert.equal(sessionParentId(thread("self", { forkedFromId: "self" })), null);
  assert.equal(lineageKind(sessions[0]), "fork");
  assert.equal(lineageKind(sessions[6]), "side_session");
  assert.equal(lineageKind(thread("plain")), null);
  const flat = [thread("a"), thread("b")];
  assert.deepEqual(buildNestedRuns(flat).runs, [{ parentId: null, rows: flat }]);
  assert.deepEqual(buildNestedRuns([]).runs, []);
});

test("bulk targets skip pinned, open, running and (for archive) archived sessions", () => {
  const sessions = [thread("pin"), thread("open"), thread("run"), thread("gone", { archived: true }), thread("ok")];
  const options = { metadata: { pin: { pinned: true } }, currentId: "open", state: { active: { run: "turn" } } };
  assert.deepEqual(bulkTargets(sessions, { ...options, action: "archive" }).map((s) => s.id), ["ok"]);
  assert.deepEqual(bulkTargets(sessions, { ...options, action: "delete" }).map((s) => s.id), ["gone", "ok"]);
});

test("pinned order: persisted order first, unknown ids keep sort order, Move up/down swaps neighbours", () => {
  const pinned = [thread("a"), thread("b"), thread("c")];
  assert.deepEqual(orderPinned(pinned, ["c", "a"]).map((s) => s.id), ["c", "a", "b"]);
  assert.deepEqual(orderPinned(pinned, []).map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(movePinned(["a", "b", "c"], "a", "down"), ["b", "a", "c"]);
  assert.deepEqual(movePinned(["a", "b", "c"], "c", "down"), null);
  assert.deepEqual(movePinned(["a", "b", "c"], "a", "up"), null);
  const metadata = { a: { pinned: true }, b: { pinned: true } };
  const groups = buildSidebarGroups({ sessions: pinned, metadata, pinnedOrder: ["b", "a"], preferences: { groupBy: "none" } });
  assert.deepEqual(groups[0].sessions.map((s) => s.id), ["b", "a"]);
});

test("fold stub: current pz counts failed before unread before working", () => {
  const rows = [thread("a"), thread("b"), thread("c"), thread("d")];
  const unread = new Set(["a", "b"]), working = new Set(["b", "c"]);
  const adapter = { isUnread: row => unread.has(row.id), isWorking: row => working.has(row.id) };
  assert.deepEqual(nestedStubCounts(rows, adapter), { count: 4, failed: 0, unread: 2, working: 1 });
  assert.deepEqual(nestedStubCounts(rows, { ...adapter, isFailed: row => row.id === 'b' }), { count: 4, failed: 1, unread: 1, working: 1 });
  assert.deepEqual(nestedStubCounts([]), { count: 0, failed: 0, unread: 0, working: 0 });
});

// sidebar-groups.js bF/xF + shared-16 dc/fc: code-mode buckets cut at 20 rows.
const flatRuns = (count, prefix = "r") => [{ parentId: null, rows: Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` })) }];
const rowIds = (result) => result.runs.flatMap((run) => run.rows.map((row) => row.id));

test("truncateRuns cuts at truncateAt, reveals in truncateAt steps and never leaves one hidden row", () => {
  const runs = flatRuns(45);
  const first = truncateRuns(runs, { truncateAt: 20 });
  assert.equal(rowIds(first).length, 20);
  assert.deepEqual([first.hiddenCount, first.revealCount, first.firstHiddenId, first.extraRevealed], [25, 20, "r20", 0]);
  const second = truncateRuns(runs, { truncateAt: 20, extraRevealed: 20 });
  assert.equal(rowIds(second).length, 40);
  assert.deepEqual([second.hiddenCount, second.revealCount, second.firstHiddenId], [5, 5, "r40"]);
  const third = truncateRuns(runs, { truncateAt: 20, extraRevealed: 40 });
  assert.equal(third.runs, runs);
  assert.deepEqual([third.hiddenCount, third.revealCount, third.firstHiddenId], [0, 0, null]);
  // dc(len, t, n) = len > t + n + 1: 21 rows stay whole, 22 hide two.
  assert.equal(truncateRuns(flatRuns(21), { truncateAt: 20 }).hiddenCount, 0);
  assert.deepEqual(truncateRuns(flatRuns(22), { truncateAt: 20 }).hiddenCount, 2);
  const none = truncateRuns(runs, { truncateAt: undefined });
  assert.equal(none.runs, runs);
  assert.equal(none.hiddenCount, 0);
});

test("truncateRuns keeps a nested run whole and extends to keep-visible rows without reordering", () => {
  const head = { parentId: null, rows: Array.from({ length: 18 }, (_, index) => ({ id: `a${index}` })) };
  const nested = { parentId: "a17", rows: Array.from({ length: 5 }, (_, index) => ({ id: `c${index}` })) };
  const tail = { parentId: null, rows: Array.from({ length: 20 }, (_, index) => ({ id: `b${index}` })) };
  const straddle = truncateRuns([head, nested, tail], { truncateAt: 20 });
  assert.equal(straddle.runs.length, 2);
  assert.equal(straddle.runs[1], nested);
  assert.deepEqual([rowIds(straddle).length, straddle.hiddenCount, straddle.revealCount, straddle.firstHiddenId], [23, 20, 20, "b0"]);
  // A cut right after the parent row keeps its family: 20 flat rows, parent last.
  const parentLast = [{ parentId: null, rows: Array.from({ length: 20 }, (_, index) => ({ id: `p${index}` })) },
    { parentId: "p19", rows: [{ id: "k0" }, { id: "k1" }] }, ...flatRuns(10, "z")];
  const family = truncateRuns(parentLast, { truncateAt: 20 });
  assert.deepEqual([rowIds(family).length, family.hiddenCount, family.firstHiddenId], [22, 10, "z0"]);
  // Folded nested run: only the shown children count as rendered rows.
  const folded = truncateRuns(parentLast, { truncateAt: 20, shownRows: (run) => run.rows.slice(0, 1) });
  assert.deepEqual([rowIds(folded).length - 1, folded.hiddenCount], [21, 10]);
  // bF: a keep-visible row at index 30 moves the cut to 31 and reports the extension.
  const kept = truncateRuns(flatRuns(45), { truncateAt: 20, keepVisibleIds: new Set(["r30", "r3"]) });
  assert.deepEqual([rowIds(kept).length, kept.hiddenCount, kept.revealCount, kept.extraRevealed, kept.firstHiddenId], [31, 14, 14, 11, "r31"]);
  assert.deepEqual(rowIds(kept), Array.from({ length: 31 }, (_, index) => `r${index}`));
  // dc on the extended cut: 18 flat rows + parent r18, its 2-child run straddling
  // row 20, then 1 trailing row (22 rows). The family extension shows 21, so the
  // lone trailing row is rendered instead of a "Show 1 more" row.
  const lone = [flatRuns(19)[0], { parentId: "r18", rows: [{ id: "n0" }, { id: "n1" }] }, ...flatRuns(1, "t")];
  const loneResult = truncateRuns(lone, { truncateAt: 20 });
  assert.equal(loneResult.runs, lone);
  assert.deepEqual([rowIds(loneResult).length, loneResult.hiddenCount, loneResult.revealCount, loneResult.firstHiddenId], [22, 0, 0, null]);
  // Two trailing rows still hide both behind "Show 2 more".
  const two = truncateRuns([...lone, ...flatRuns(1, "u")], { truncateAt: 20 });
  assert.deepEqual([rowIds(two).length, two.hiddenCount, two.revealCount, two.firstHiddenId], [21, 2, 2, "t0"]);
  // Keep ids inside the visible window change nothing.
  assert.equal(truncateRuns(flatRuns(45), { truncateAt: 20, keepVisibleIds: ["r2"] }).extraRevealed, 0);
});

test("empty variant follows CO/wO: rows visible -> none, filtered behind filters or archived, otherwise no-sessions", () => {
  assert.equal(sidebarEmptyVariant({ visible: 3, total: 3 }), undefined);
  assert.equal(sidebarEmptyVariant({ visible: 1, total: 0, hasNonDefaultFilter: true, hasArchived: true }), undefined);
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0 }), "no-sessions");
  assert.equal(sidebarEmptyVariant(), "no-sessions");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 2 }), "filtered");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, hasNonDefaultFilter: hasSidebarFilters({ status: "archived" }) }), "filtered");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, hasNonDefaultFilter: hasSidebarFilters({}) }), "no-sessions");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, hasArchived: true }), "filtered");
});

test("Show all sessions follows OU (sidebar-groups.js:21843-21847), not Clear filters", () => {
  // Archived-only list with default filters: Clear filters is a no-op, OU switches to all.
  assert.deepEqual(clearSidebarFilters({}), normalizeSidebarPreferences({}));
  const all = showAllSessionsPreferences({ status: "active", groupBy: "project", stateActivityDays: 3, showEmptyGroups: true });
  assert.deepEqual([all.status, all.stateActivityDays, all.showEmptyGroups, all.groupBy], ["all", 3, true, "project"]);
  const state = showAllSessionsPreferences({ status: "archived", groupBy: "state", stateActivityDays: 7 });
  assert.deepEqual([state.status, state.stateActivityDays], ["all", 0]);
});

test("empty-state hasNonDefaultFilter follows fO (sidebar-groups.js:7600-7609), not the filter badge", () => {
  assert.equal(sidebarEmptyHasNonDefaultFilter({}), false);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ status: "all" }), false);
  assert.equal(hasSidebarFilters({ status: "all" }), true);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ status: "archived" }), true);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ groupBy: "state", stateActivityDays: 3 }), true);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ groupBy: "state", stateActivityDays: 1 }), true);
  for (const days of [0, 7, 30]) assert.equal(sidebarEmptyHasNonDefaultFilter({ groupBy: "state", stateActivityDays: days }), false);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ groupBy: "project", stateActivityDays: 3 }), false);
  assert.equal(sidebarEmptyHasNonDefaultFilter({ groupBy: "project", showEmptyGroups: true }), false);
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, hasNonDefaultFilter: sidebarEmptyHasNonDefaultFilter({ status: "all" }) }), "no-sessions");
});

// ---- Fidelity F08: automatic unread, repo grouping with 'Other', persisted section order ----
import {
  unreadOnTurnCompleted, projectKey, OTHER_PROJECT_KEY, orderCustomGroups, sectionOrderKeys, withSectionOrder,
  moveSection, sortSectionsAlphabetically, customOrderKey,
} from "../src/sidebar-model.js";
import { readFileSync } from "node:fs";
import path from "node:path";

test("unreadOnTurnCompleted: only a background sidebar row becomes unread (kR / serverUnread && !paneSelected)", () => {
  const knownIds = new Set(["A", "B"]), ownerOf = (id) => (id === "child" ? "B" : id);
  assert.equal(unreadOnTurnCompleted({ threadId: "B", currentId: "A", knownIds, ownerOf }), true, "background row");
  assert.equal(unreadOnTurnCompleted({ threadId: "B", currentId: null, knownIds, ownerOf }), true, "Home is open");
  assert.equal(unreadOnTurnCompleted({ threadId: "A", currentId: "A", knownIds, ownerOf }), false, "the open session");
  assert.equal(unreadOnTurnCompleted({ threadId: "child", currentId: "A", knownIds: new Set(["A", "B", "child"]), ownerOf }), false, "a sub-agent thread");
  assert.equal(unreadOnTurnCompleted({ threadId: "Z", currentId: "A", knownIds, ownerOf }), false, "an unknown id");
  assert.equal(unreadOnTurnCompleted({ threadId: "B", currentId: "A", knownIds: ["A", "B"] }), true, "array of ids, default owner");
  assert.equal(unreadOnTurnCompleted({ threadId: undefined, currentId: "A", knownIds }), false);
});

test("Folder grouping keys on repo identity (IJ): worktrees merge, no-remote repos key on the cwd, 'Other' is last without a cwd", () => {
  const sessions = [
    thread("main", { cwd: "/src/widget", updatedAt: atDay(0, 9) }),
    thread("tree", { cwd: "/worktrees/widget-feature", updatedAt: atDay(0, 11) }),
    thread("local", { cwd: "/src/scratch-repo", updatedAt: atDay(0, 10) }),
    thread("plain", { cwd: "/tmp/notes", updatedAt: atDay(0, 12) }),
    thread("pending", { cwd: "/src/unknown", updatedAt: atDay(0, 8) }),
  ];
  const repoIdentities = {
    "/src/widget": { isRepo: true, toplevel: "/src/widget", owner: "acme", name: "widget", parent: "/src" },
    "/worktrees/widget-feature": { isRepo: true, toplevel: "/worktrees/widget-feature", owner: "acme", name: "widget", parent: "/worktrees" },
    "/src/scratch-repo": { isRepo: true, toplevel: "/src/scratch-repo", owner: null, name: "scratch-repo", parent: "/src" },
    "/tmp/notes": { isRepo: false, toplevel: null, owner: null, name: null, parent: "/tmp" },
  };
  const groups = buildSidebarGroups({ sessions, repoIdentities, now });
  assert.deepEqual(groups.map((group) => [group.key, group.label]), [
    ["project:acme/widget", "widget"], ["project:/src/scratch-repo", "scratch-repo"], ["project:/src/unknown", "unknown"], [`project:${OTHER_PROJECT_KEY}`, "Other"],
  ]);
  assert.deepEqual(groups[0].sessions.map((session) => session.id), ["tree", "main"], "clones and worktrees share one bucket");
  assert.equal(groups[0].cwd, "/worktrees/widget-feature", "'+' opens the newest session's folder");
  assert.equal(groups.at(-1).cwd, undefined, "Other has no cwd, so no '+' renders");
  assert.deepEqual(groups.at(-1).sessions.map((session) => session.id), ["plain"]);
  // No identities yet: every folder keys on its cwd as before, nothing goes to Other.
  assert.deepEqual(buildSidebarGroups({ sessions, now }).map((group) => group.key).includes(`project:${OTHER_PROJECT_KEY}`), false);
  assert.equal(projectKey("", undefined), OTHER_PROJECT_KEY);
  assert.equal(projectKey("/a/b/", undefined), "/a/b");
  assert.equal(projectKey("/a/b", null), OTHER_PROJECT_KEY);
  // Empty known folders resolve the same way; a non-repo folder adds no empty bucket.
  const empty = buildSidebarGroups({ sessions: [], knownFolders: ["/src/widget", "/tmp/notes"], repoIdentities, preferences: { showEmptyGroups: true }, now });
  assert.deepEqual(empty.map((group) => group.key), ["project:acme/widget"]);
});

test("duplicate project names get ' · {owner}' or ' · {parent folder}' (BJ disambiguationText)", () => {
  const repoIdentities = {
    "/a/app": { isRepo: true, owner: "one", name: "app", parent: "/a" },
    "/b/app": { isRepo: true, owner: "two", name: "app", parent: "/b" },
    "/c/tool": { isRepo: true, owner: null, name: "tool", parent: "~/c" },
    "/d/tool": { isRepo: true, owner: null, name: "tool", parent: "~/d" },
  };
  const sessions = Object.keys(repoIdentities).map((cwd, index) => thread("s" + index, { cwd, updatedAt: atDay(0, 12 - index) }));
  assert.deepEqual(buildSidebarGroups({ sessions, repoIdentities, now }).map((group) => group.label), ["app · one", "app · two", "tool · ~/c", "tool · ~/d"]);
  // Unknown identities fall back to the parent path of the cwd.
  const fallback = buildSidebarGroups({ sessions: [thread("x", { cwd: "/p/work" }), thread("y", { cwd: "/q/work", updatedAt: atDay(1) })], now });
  assert.deepEqual(fallback.map((group) => group.label), ["work · /p", "work · /q"]);
});

test("projectOrder: a stored order ranks projects (manual), unranked follow, and Sort A to Z stores the A–Z order", () => {
  const sessions = [thread("b", { cwd: "/w/beta", updatedAt: atDay(0, 12) }), thread("a", { cwd: "/w/alpha", updatedAt: atDay(0, 11) }), thread("c", { cwd: "/w/gamma", updatedAt: atDay(0, 10) })];
  const labels = (projectOrder) => buildSidebarGroups({ sessions, projectOrder, now }).map((group) => group.label);
  assert.deepEqual(labels([]), ["beta", "alpha", "gamma"], "no stored order: recency, as before");
  assert.deepEqual(labels(["/w/gamma", "/w/alpha"]), ["gamma", "alpha", "beta"], "ranked first, the rest after");
  assert.deepEqual(labels(["/w/missing"]), ["beta", "alpha", "gamma"], "an order naming no present project is ignored");
  const groups = buildSidebarGroups({ sessions, now });
  const keys = sectionOrderKeys(groups);
  assert.deepEqual(keys, ["/w/beta", "/w/alpha", "/w/gamma"]);
  assert.deepEqual(moveSection(keys, "/w/alpha", "down"), ["/w/beta", "/w/gamma", "/w/alpha"]);
  assert.equal(moveSection(keys, "/w/beta", "up"), null);
  const sorted = sortSectionsAlphabetically(groups);
  assert.deepEqual(sorted, ["/w/alpha", "/w/beta", "/w/gamma"]);
  assert.deepEqual(labels(withSectionOrder([], sorted)), ["alpha", "beta", "gamma"]);
  // One stored list holds both kinds: custom keys stay when the project order is rewritten and vice versa.
  const stored = withSectionOrder([customOrderKey("g2"), customOrderKey("g1"), "/w/old"], ["/w/gamma", "/w/beta"]);
  assert.deepEqual(stored, [customOrderKey("g2"), customOrderKey("g1"), "/w/gamma", "/w/beta", "/w/old"]);
  assert.deepEqual(withSectionOrder(stored, [customOrderKey("g1"), customOrderKey("g2")]), [customOrderKey("g1"), customOrderKey("g2"), "/w/gamma", "/w/beta", "/w/old"]);
  // Other never takes part in the order.
  const other = buildSidebarGroups({ sessions: [...sessions, thread("o", { cwd: "/w/plain" })], repoIdentities: { "/w/plain": null }, now });
  assert.equal(sectionOrderKeys(other).includes(OTHER_PROJECT_KEY), false);
});

test("custom groups follow the stored 'ccg::' order; unranked groups keep creation order first (xB)", () => {
  const customGroups = [{ id: "g1", name: "One" }, { id: "g2", name: "Two" }, { id: "g3", name: "Three" }];
  assert.deepEqual(orderCustomGroups(customGroups, []).map((group) => group.id), ["g1", "g2", "g3"]);
  assert.deepEqual(orderCustomGroups(customGroups, [customOrderKey("g3"), customOrderKey("g1")]).map((group) => group.id), ["g2", "g3", "g1"]);
  const metadata = { a: { customGroupId: "g1" }, b: { customGroupId: "g3" } };
  const groups = buildSidebarGroups({ sessions: [thread("a"), thread("b")], metadata, customGroups, preferences: { groupBy: "custom", showEmptyGroups: true },
    projectOrder: [customOrderKey("g3"), customOrderKey("g2"), customOrderKey("g1")], now });
  assert.deepEqual(groups.map((group) => group.label), ["Three", "Two", "One"]);
  assert.deepEqual(sectionOrderKeys(groups), [customOrderKey("g3"), customOrderKey("g2"), customOrderKey("g1")]);
});

test("R2-sections: the seeded sections (sidebar-sections-store, kp/Bp) keep the classic custom list's groups, order and members", async () => {
  const Store = await import("../electron/sidebar-sections-store.mjs");
  const customGroups = [{ id: "g1", name: "One" }, { id: "g2", name: "Two" }, { id: "g3", name: "Three" }];
  const metadata = { a: { customGroupId: "g1" }, b: { customGroupId: "g3" }, c: { customGroupId: "g3" }, d: { pinned: true } };
  const sessions = [thread("a"), thread("b"), thread("c"), thread("d"), thread("e")];
  const projectOrder = [customOrderKey("g3"), "/w/other", customOrderKey("g2"), customOrderKey("g1")];
  const preferences = { groupBy: "custom", showEmptyGroups: true };
  const classic = buildSidebarGroups({ sessions, metadata, customGroups, preferences, projectOrder, now });
  const sections = Store.sidebarSectionsFor({ customGroups, sessionMetadata: metadata, projectOrder, sidebarPreferences: preferences });
  const manual = sections.filter((section) => section.kind === "manual");
  assert.deepEqual(manual.map((section) => section.name), classic.filter((group) => group.customGroupId).map((group) => group.label));
  for (const group of classic.filter((g) => g.customGroupId))
    assert.deepEqual([...manual.find((s) => s.id === group.customGroupId).members].sort(), group.sessions.map((s) => `code:${s.id}`).sort(), group.label);
  // Ungrouped becomes Sessions (custom → none), after the manual sections; Pinned leads.
  assert.deepEqual(sections.map((section) => section.kind), ["pinned", "routines", "manual", "manual", "manual", "sessions"]);
  assert.equal(sections.at(-1).groupBy, "none");
  // Host difference, as officially (shared-22 Qb → Bp): a group without a "ccg::" key, which the classic list shows
  // first (xB / i$ rank it -Infinity), follows the ranked ones once seeded (Bp ranks it r.size + index).
  const partial = [customOrderKey("g2")];
  assert.deepEqual(orderCustomGroups(customGroups, partial).map((group) => group.id), ["g1", "g3", "g2"]);
  assert.deepEqual(Store.sidebarSectionsFor({ customGroups, sessionMetadata: metadata, projectOrder: partial, sidebarPreferences: preferences })
    .filter((section) => section.kind === "manual").map((section) => section.id), ["g2", "g1", "g3"]);
});

test("main.cjs persists the section order (sidebar-state project-order) and drops a deleted group's key", () => {
  const main = readFileSync(path.resolve(import.meta.dirname, "../electron/main.cjs"), "utf8");
  assert.match(main, /p\.operation === "project-order"/);
  assert.match(main, /config\.projectOrder = \[\.\.\.p\.ids\]/);
  assert.match(main, /projectOrder: Array\.isArray\(config\.projectOrder\) \? config\.projectOrder : \[\]/);
  assert.match(main, /case "repo-identities":/);
  // R2-sections: create/rename/delete-group moved into electron/sidebar-sections-store.mjs (sections kept in step);
  // delete-group still drops the group's "ccg::" key, and the snapshot carries the sections.
  assert.match(main, /sidebarSectionsStore\.applySidebarSectionOperation\(config, p, \{/);
  assert.match(main, /sidebarSections: sidebarSectionsStore \? sidebarSectionsStore\.sidebarSectionsFor\(config\)/);
  assert.doesNotMatch(main, /p\.operation === "(create|rename|delete)-group"/);
  const store = readFileSync(path.resolve(import.meta.dirname, "../electron/sidebar-sections-store.mjs"), "utf8");
  assert.match(store, /config\.projectOrder = config\.projectOrder\.filter\(key => key !== "ccg::" \+ p\.id\)/);
});

test("collapsedGroups persist in the sidebar preferences (shared-50 G toggleGroupCollapsed / expandGroup / mm)", () => {
  assert.deepEqual(normalizeSidebarPreferences({ collapsedGroups: ["pinned", "pinned", 4, "", "project:/a"] }).collapsedGroups, ["pinned", "project:/a"]);
  const folded = toggleCollapsedGroup({ groupBy: "date" }, "day-0");
  assert.deepEqual(folded.collapsedGroups, ["day-0"]);
  assert.equal(folded.groupBy, "date", "the rest of the preferences is kept");
  assert.deepEqual(toggleCollapsedGroup(folded, "older").collapsedGroups, ["day-0", "older"]);
  assert.deepEqual(toggleCollapsedGroup(folded, "day-0").collapsedGroups, []);
  assert.deepEqual(expandCollapsedGroup(folded, "day-0").collapsedGroups, []);
  const same = normalizeSidebarPreferences(folded);
  assert.deepEqual(expandCollapsedGroup(same, "older"), same);
  // A filter reset keeps folded groups (showAllSessionsPreferences spreads the normalized preferences).
  assert.deepEqual(showAllSessionsPreferences(folded).collapsedGroups, ["day-0"]);
});

test("sidebarEmptyVariant: load-failed (HQ) only when nothing is behind the filters; UQ keeps it", () => {
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, failed: true }), "load-failed");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, failed: true, hasArchived: true }), "load-failed");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 0, failed: true, hasNonDefaultFilter: true }), "load-failed");
  assert.equal(sidebarEmptyVariant({ visible: 0, total: 3, failed: true }), "filtered");
  assert.equal(sidebarEmptyVariant({ visible: 2, total: 3, failed: true }), undefined);
});

test("stickyListFailure (VQ): a failure stays shown while the same list reloads; a settled load replaces it", () => {
  let state = stickyListFailure(null, { failed: false, loading: true, list: "active" });
  assert.deepEqual(state, { list: "active", failed: false });
  state = stickyListFailure(state, { failed: true, loading: false, list: "active" });
  assert.equal(state.failed, true);
  // Try again: loading again with the error cleared keeps the failure (no skeleton flash).
  const retry = stickyListFailure(state, { failed: false, loading: true, list: "active" });
  assert.equal(retry, state, "unchanged state object");
  // Another list (status filter) while loading: no held failure unless it failed too.
  assert.equal(stickyListFailure(state, { failed: false, loading: true, list: "archived" }).failed, false);
  assert.equal(stickyListFailure(state, { failed: true, loading: true, list: "archived" }).failed, true);
  // Settled: the load's own result.
  assert.equal(stickyListFailure(state, { failed: false, loading: false, list: "active" }).failed, false);
});

test("showFewerRows (xg): collapse to the keep-visible floor, held when the floor keeps the end open", () => {
  // 45 rows revealed to the end (extra 40), nothing kept: fold back.
  assert.equal(showFewerRows({ total: 45, truncateAt: 20, extraRevealed: 40, hiddenCount: 0, floor: 0 }), "collapse");
  // Rows still hidden: "Show N more", no Show less.
  assert.equal(showFewerRows({ total: 45, truncateAt: 20, extraRevealed: 20, hiddenCount: 5, floor: 0 }), undefined);
  // Never revealed (extra 0): nothing to fold.
  assert.equal(showFewerRows({ total: 21, truncateAt: 20, extraRevealed: 0, hiddenCount: 0 }), undefined);
  // The open row is the last one (floor 25 = 45 - 20): folding would hide nothing past it → held.
  const kept = truncateRuns(flatRuns(45), { truncateAt: 20, keepVisibleIds: new Set(["r44"]) });
  assert.equal(kept.hiddenCount, 0);
  assert.equal(showFewerRows({ total: kept.total, truncateAt: 20, extraRevealed: kept.extraRevealed, hiddenCount: 0, floor: kept.extraRevealed }), "held");
  // The open row at 30: revealed to the end folds back to 31 rows (floor 11).
  const floor = truncateRuns(flatRuns(45), { truncateAt: 20, keepVisibleIds: new Set(["r30"]) }).extraRevealed;
  assert.equal(floor, 11);
  assert.equal(showFewerRows({ total: 45, truncateAt: 20, extraRevealed: 40, hiddenCount: 0, floor }), "collapse");
  const folded = truncateRuns(flatRuns(45), { truncateAt: 20, extraRevealed: floor, keepVisibleIds: new Set(["r30"]) });
  assert.deepEqual([rowIds(folded).length, folded.hiddenCount], [31, 14]);
  // No truncation at all (chat mode): undefined.
  assert.equal(showFewerRows({ total: 45, truncateAt: undefined, extraRevealed: 40, hiddenCount: 0 }), undefined);
  assert.equal(truncateRuns(flatRuns(45), { truncateAt: 20 }).total, 45);
});
