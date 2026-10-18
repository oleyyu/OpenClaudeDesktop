import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  sessionChordArchivable,
  sessionChordArchiveFacts,
  sessionChordArchives,
  rowKeySessionId,
  buttonRowKey,
  sessionChordArchiveNeighbour,
  sessionChordAdjacentButton,
  createSessionChordArchiveCommit,
  sidebarHasSelection,
  runSessionChordArchive,
  isSessionChordCommand,
  handleSessionChordKeydown,
  dispatchSessionChord,
} from "../src/session-chord-model.mjs";
import { globalShortcutCommand } from "../src/shortcuts-dialog-model.mjs";

// R3-topbar TT-11 / R4h-topbar K1 (menus-02): ⌥⌘A stays silent — no archive, no preventDefault — on a pinned,
// running, busy or archived session; when it archives, it follows 2.42304.0 cf74bc599 yO:
// - if selectedKeys.size > 0 -> P() (single-session archive + teardownSessionPanes -> Home, without clicking an adjacent row);
// - else -> L(e, yo({ rowKey: q, sessionId: e.id, teardownSessionPanes: s })) (shared-16 bh + Sh opens the next/previous row).
const ROOT = path.resolve(import.meta.dirname, "..");
const reference = path.resolve(ROOT, "../reference/installed-2.42304.0-20261017/ion-dist/assets/v1");

function makeFakeButton(rowKey, { selected = false, current = false, connected = true } = {}) {
  const clicks = [];
  const scrolls = [];
  const rowEl = {
    getAttribute(attr) {
      if (attr === "data-row-key") return rowKey;
      if (attr === "data-selected") return selected ? "focused" : null;
      return null;
    },
  };
  return {
    rowKey,
    clicks,
    scrolls,
    isConnected: connected,
    getAttribute(attr) {
      if (attr === "data-selected") return selected === "open" ? "open" : selected ? "focused" : null;
      if (attr === "aria-current") return current ? "page" : null;
      if (attr === "data-row-key") return rowKey;
      return null;
    },
    closest(selector) {
      if (selector === "[data-row-key]") return rowEl;
      if (selector === "[data-selected]") return selected ? rowEl : null;
      return null;
    },
    scrollIntoView(opts) {
      scrolls.push(opts);
    },
    click() {
      clicks.push(rowKey);
    },
  };
}

test("sessionChordArchivable: archived, pinned, running, operation pending and working sessions do not archive", () => {
  assert.equal(sessionChordArchivable({}), true, "an ordinary session archives");
  for (const fact of ["archived", "pinned", "active", "operationPending", "working"])
    assert.equal(sessionChordArchivable({ [fact]: true }), false, fact);
});

test("sessionChordArchiveFacts reads the sidebar metadata, the reducer state and the action lock", () => {
  const row = { id: "s1", name: "Fix it" };
  assert.equal(sessionChordArchiveFacts(null), null);
  assert.equal(sessionChordArchives(null), false, "no open session: nothing to archive");
  assert.deepEqual(sessionChordArchiveFacts(row), { archived: false, pinned: false, active: false, operationPending: false, working: false });
  assert.equal(sessionChordArchives(row), true);
  // Pinned lives in the session metadata (source-sidebar.jsx metadata.pinned); it overrides the row's own flag.
  assert.equal(sessionChordArchives(row, { metadata: { pinned: true } }), false, "pinned");
  assert.equal(sessionChordArchives({ ...row, pinned: true }), false, "pinned on the row");
  assert.equal(sessionChordArchives({ ...row, pinned: true }, { metadata: { pinned: false } }), true, "unpinned in the metadata");
  // Running: the core's active turn, or the row's live status (sessionState "working").
  assert.equal(sessionChordArchives(row, { state: { active: { s1: true } } }), false, "active turn");
  assert.equal(sessionChordArchives({ ...row, status: { type: "active" } }), false, "working status");
  assert.equal(sessionChordArchives({ ...row, liveStatus: "running" }), false, "live status running");
  assert.equal(sessionChordArchives(row, { state: { active: { other: true } } }), true, "another session's turn");
  // Busy: a session operation in flight (operationPending: starting/running/unknown) or the local action lock.
  for (const phase of ["starting", "running", "unknown"])
    assert.equal(sessionChordArchives(row, { state: { operations: { s1: { phase } } } }), false, phase);
  assert.equal(sessionChordArchives(row, { state: { operations: { s1: { phase: "completed" } } } }), true, "a finished operation");
  assert.equal(sessionChordArchives(row, { locked: true }), false, "action lock");
  // Already archived (either flag).
  assert.equal(sessionChordArchives({ ...row, archived: true }), false);
  assert.equal(sessionChordArchives({ ...row, isArchived: true }), false);
});

test("the chord itself: ⌥⌘A (matched by code) is archive-session", () => {
  const chord = (options) => globalShortcutCommand({ key: "å", code: "KeyA", metaKey: true, altKey: true, ctrlKey: false, shiftKey: false, isComposing: false, ...options });
  assert.equal(chord(), "archive-session");
  assert.notEqual(chord({ shiftKey: true }), "archive-session");
});

test("sessionChordArchiveNeighbour & sessionChordAdjacentButton: Sh picks the next unarchived row, else the previous in reverse", () => {
  assert.equal(rowKeySessionId("code:s2"), "s2");
  assert.equal(rowKeySessionId("s2"), "s2");
  const keys = ["s1", "s2", "s3", "s4"];
  assert.equal(sessionChordArchiveNeighbour(keys, "s2", new Set(["s2"])), "s3", "picks next row first");
  assert.equal(sessionChordArchiveNeighbour(keys, "s2", new Set(["s2", "s3"])), "s4", "skips cascade-archived next row");
  assert.equal(sessionChordArchiveNeighbour(keys, "s2", new Set(["s2", "s3", "s4"])), "s1", "falls back to previous row in reverse");
  assert.equal(sessionChordArchiveNeighbour(keys, "s2", new Set(["s1", "s2", "s3", "s4"])), null, "none left -> null");
  assert.equal(sessionChordArchiveNeighbour(["code:s1", "code:s2", "code:s3"], "s2", new Set(["s2"])), "code:s3", "matches code: prefix");

  const b1 = makeFakeButton("s1");
  const b2 = makeFakeButton("s2", { selected: true, current: true });
  const b3 = makeFakeButton("s3");
  assert.equal(buttonRowKey(b2), "s2");
  assert.equal(sessionChordAdjacentButton([b1, b2, b3], "s2", new Set(["s2"])), b3);
  assert.equal(sessionChordAdjacentButton([b1, b2], "s2", new Set(["s2"])), b1);
  assert.equal(sessionChordAdjacentButton([b2], "s2", new Set(["s2"])), undefined);
});

test("createSessionChordArchiveCommit & runSessionChordArchive: bh opens the adjacent row or tears down panes, and selectedKeys > 0 takes P()", async () => {
  // 1. Standard single-session chord with an adjacent row: archives with keepView, scrolls + clicks neighbour.
  const b1 = makeFakeButton("s1");
  const b2 = makeFakeButton("s2", { selected: true, current: true });
  const b3 = makeFakeButton("s3");
  const events = [];
  const committed = await runSessionChordArchive(
    { id: "s2" },
    {
      hasSelection: false,
      buttons: () => [b1, b2, b3],
      archiveWithCommit: async (row) => {
        events.push(["archiveWithCommit", row.id]);
        return true;
      },
      teardownSessionPanes: (id) => events.push(["teardown", id]),
      closePanes: (id) => events.push(["closePanes", id]),
      onCommit: (hadAdjacent) => events.push(["onCommit", hadAdjacent]),
      onCommitted: (row) => events.push(["onCommitted", row.id]),
    },
  );
  assert.equal(committed, true);
  assert.deepEqual(b3.clicks, ["s3"], "clicked next row s3");
  assert.equal(b3.scrolls.length, 1);
  assert.deepEqual(events, [
    ["archiveWithCommit", "s2"],
    ["onCommit", true],
    ["closePanes", "s2"],
    ["onCommitted", "s2"],
  ]);

  // 2. Reconnected neighbour button: if the captured button disconnected during re-render, bh finds the replacement by rowKey.
  const staleB3 = makeFakeButton("s3", { connected: false });
  const freshB3 = makeFakeButton("s3", { connected: true });
  let live = [b1, b2, staleB3];
  const commitReconnect = createSessionChordArchiveCommit({
    rowKey: "s2",
    sessionId: "s2",
    buttons: () => live,
    teardownSessionPanes: (id) => events.push(["teardown-reconnect", id]),
  })(new Set(["s2"]));
  live = [b1, freshB3];
  commitReconnect();
  assert.deepEqual(freshB3.clicks, ["s3"], "clicked replacement button for s3");

  // 3. Focus moved to another row before commit (l = true): bh does not click neighbour and calls teardownSessionPanes.
  const bOtherFocused = makeFakeButton("s1", { selected: true });
  const b3Unclicked = makeFakeButton("s3");
  const tornDown = [];
  let focusList = [b1, b2, b3Unclicked];
  const commitMoved = createSessionChordArchiveCommit({
    rowKey: "s2",
    sessionId: "s2",
    buttons: () => focusList,
    teardownSessionPanes: (id) => tornDown.push(id),
  })(new Set(["s2"]));
  focusList = [bOtherFocused, b3Unclicked];
  commitMoved();
  assert.deepEqual(b3Unclicked.clicks, []);
  assert.deepEqual(tornDown, ["s2"]);

  // 4. Last remaining row (no neighbour): bh falls back to teardownSessionPanes (Home).
  const lone = makeFakeButton("s2", { selected: true, current: true });
  const loneTeardown = [];
  await runSessionChordArchive(
    { id: "s2" },
    {
      hasSelection: false,
      buttons: () => [lone],
      archiveWithCommit: async () => true,
      teardownSessionPanes: (id) => loneTeardown.push(id),
    },
  );
  assert.deepEqual(loneTeardown, ["s2"]);

  // 5. Cancelled archive (worktree dialog rejected -> false): commit() does not run.
  const b3Cancel = makeFakeButton("s3");
  const cancelResult = await runSessionChordArchive(
    { id: "s2" },
    {
      hasSelection: false,
      buttons: () => [b2, b3Cancel],
      archiveWithCommit: async () => false,
    },
  );
  assert.equal(cancelResult, false);
  assert.deepEqual(b3Cancel.clicks, []);

  // 6. Multi-selection active (selectedKeys.size > 0): yO calls P() (archiveSession) without yo opening a neighbour.
  const pCalls = [];
  const b3Multi = makeFakeButton("s3");
  await runSessionChordArchive(
    { id: "s2" },
    {
      selectedKeys: new Set(["s1", "s2"]),
      buttons: () => [b1, b2, b3Multi],
      archiveSession: (row, keys) => pCalls.push([row.id, [...keys]]),
      archiveWithCommit: () => assert.fail("should not take yo path when selectedKeys > 0"),
    },
  );
  assert.deepEqual(pCalls, [["s2", ["s1", "s2"]]]);
  assert.deepEqual(b3Multi.clicks, []);
  assert.equal(sidebarHasSelection("s2", { selectedKeys: new Set(["s2"]) }), true);
  assert.equal(sidebarHasSelection("s2", { selectedKeys: new Set() }), false);
});

test("handleSessionChordKeydown & dispatchSessionChord: probe runs before preventDefault, repeat is ignored, and all chords dispatch", () => {
  assert.equal(isSessionChordCommand("archive-session"), true);
  assert.equal(isSessionChordCommand("pin-session"), true);
  assert.equal(isSessionChordCommand("toggle-terminal"), false);

  const row = { id: "s1", name: "Fix bug", pinned: false, unread: false };
  const calls = [];
  const dispatch = (cmd, opts) =>
    dispatchSessionChord(cmd, {
      ...opts,
      row,
      metadata: { pinned: false, unread: true },
      state: { active: {} },
      locked: false,
      updateMetadata: (id, patch) => calls.push(["metadata", id, patch]),
      onRename: (r) => calls.push(["rename", r.id]),
      onArchive: (r) => calls.push(["archive", r.id]),
      onSessionAction: (act, r, extra) => calls.push(["action", act, r.id, extra]),
      prUrl: () => "https://github.com/org/repo/pull/42",
    });

  // When blocked by a dialog/menu, keydown neither probes nor preventDefaults.
  let prevented = false;
  assert.equal(
    handleSessionChordKeydown(
      { preventDefault: () => { prevented = true; }, repeat: false },
      "archive-session",
      { menu: { kind: "titlebar" }, run: dispatch },
    ),
    false,
  );
  assert.equal(prevented, false);

  // When session is pinned/running/archived, probe returns false BEFORE preventDefault.
  const pinnedDispatch = (cmd, opts) =>
    dispatchSessionChord(cmd, { ...opts, row, metadata: { pinned: true }, state: { active: {} }, locked: false });
  assert.equal(
    handleSessionChordKeydown(
      { preventDefault: () => { prevented = true; }, repeat: false },
      "archive-session",
      { run: pinnedDispatch },
    ),
    false,
  );
  assert.equal(prevented, false, "pinned session does not preventDefault ⌥⌘A");

  // cf74bc599 lt: if(g||t.defaultPrevented||t.repeat)return; — repeat returns before preventDefault and before action.
  let repeatPrevented = false;
  assert.equal(
    handleSessionChordKeydown(
      { preventDefault: () => { repeatPrevented = true; }, repeat: true },
      "archive-session",
      { run: dispatch },
    ),
    false,
  );
  assert.equal(repeatPrevented, false);
  assert.deepEqual(calls, [], "repeat event does not fire action");

  handleSessionChordKeydown(
    { preventDefault: () => { prevented = true; }, repeat: false },
    "archive-session",
    { run: dispatch },
  );
  assert.equal(prevented, true);
  assert.deepEqual(calls, [["archive", "s1"]]);

  // Other chords dispatch through the same pure table.
  calls.length = 0;
  for (const cmd of ["pin-session", "rename-session", "unread-session", "fork-session", "open-session-pr"]) {
    handleSessionChordKeydown({ preventDefault() {}, repeat: false }, cmd, { run: dispatch });
  }
  assert.deepEqual(calls, [
    ["metadata", "s1", { pinned: true }],
    ["rename", "s1"],
    ["metadata", "s1", { unread: false }],
    ["action", "fork", "s1", undefined],
    ["action", "open-pr", "s1", { url: "https://github.com/org/repo/pull/42" }],
  ]);
});

test("official: cf74bc599 yO gates ⌥⌘A on S, !C, !pe and !isWorking, checks selectedKeys.size > 0, and runs yo (shared-16 bh/Sh)", () => {
  const text = fs.readFileSync(path.join(reference, "cf74bc599-D9NZWRyl.js"), "utf8");
  for (const needle of [
    "ot(t)&&S&&!C&&!pe&&!Gn(q)?.isWorking&&(r=()=>{",
    "zn.getState().selectedKeys.size>0){P();return}",
    "L(e,yo({rowKey:q,sessionId:e.id,teardownSessionPanes:s})).then(t=>{t&&s_(e)})",
    'r&&(!we(t,"yield",De)||wo()||(t.preventDefault(),r()))',
    "S=!_&&!x,C=t?.isArchived??!1",
    "fe=tn(e=>e.starredIds),pe=fe.includes(e.id)",
    '{matchShortcut:ot}=Ee("archive_code_session_chord")',
    'H=B("ccd_palette_session_actions")',
  ]) assert.ok(text.includes(needle), needle);
  const s16 = fs.readFileSync(path.join(reference, "shared-16-B0xHzPjj.js"), "utf8");
  assert.ok(s16.includes("function bh({rowKey:e,sessionId:t,teardownSessionPanes:n,onCommit:r})"));
  assert.ok(s16.includes("function Sh(e,t){let{buttons:n}=tm(\"code\"),r=n.findIndex(t=>xh(t)===e);"));
  const c48 = fs.readFileSync(path.join(reference, "c48ea26ad-B9mFPusd.js"), "utf8");
  assert.ok(c48.includes("function he(){"));
  assert.ok(c48.includes("function ge({sessionRef:e,sessionTitle:n,afterRemoval:r,afterDeleted:i})"));
});
