import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { digitFor, moveToGroupRows, multiHotkeys, multiMenuState, openSessionLast, pinTargets,
  BULK_DELETE_FALLBACK, bulkDeleteConfirmCopy, bulkFamilyPlan, connectNestedFamilies, couldntCheckConfirm, nestedFamilyProvider, runAskingFamilies } from "../src/sidebar-bulk-model.mjs";
import { bulkNestedFamilies } from "../src/generated/code-current/sidebar-bulk-family.mjs";
import { worktreeConfirmReady } from "../src/worktree-dispose-model.mjs";
import { dictionary } from "../electron/i18n/index.mjs";

const sessions = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("c39a247c4 X: Pin {count} counts the unpinned, Unpin {count} the pinned selected sessions", () => {
  const metadata = { b: { pinned: true } };
  assert.deepEqual(pinTargets(sessions, metadata, true).map((s) => s.id), ["a", "c"]);
  assert.deepEqual(pinTargets(sessions, metadata, false).map((s) => s.id), ["b"]);
  assert.deepEqual(multiMenuState(sessions, metadata), { count: 3, pin: { count: 2 }, unpin: { count: 1 } });
  assert.deepEqual(multiMenuState(sessions, {}), { count: 3, pin: { count: 3 }, unpin: undefined });
  assert.deepEqual(multiMenuState(sessions, { a: { pinned: true }, b: { pinned: true }, c: { pinned: true } }), { count: 3, pin: undefined, unpin: { count: 3 } });
  assert.deepEqual(pinTargets([{ id: "x", canPin: false }], {}, true), []);
});

test("_e: the open session is changed last", () => {
  assert.deepEqual(openSessionLast(sessions, "a").map((s) => s.id), ["b", "c", "a"]);
  assert.deepEqual(openSessionLast(sessions, null).map((s) => s.id), ["a", "b", "c"]);
});

test("Me hotkeys: p pins first, else unpins; a unarchives an all-archived selection", () => {
  assert.deepEqual(multiHotkeys({ pin: { count: 1 }, unpin: { count: 1 } }), [["p", "pin"], ["u", "mark-unread"], ["a", "archive"], ["d", "delete"]]);
  assert.deepEqual(multiHotkeys({ unpin: { count: 2 } }, { allArchived: true }), [["p", "unpin"], ["u", "mark-unread"], ["a", "unarchive"], ["d", "delete"]]);
  assert.deepEqual(multiHotkeys({}), [["u", "mark-unread"], ["a", "archive"], ["d", "delete"]]);
});

test("lz: groups are numbered radios, Ungrouped only for an assigned session, New group… last", () => {
  const groups = [{ id: "g1", name: "Research" }, { id: "g2", name: "Ideas" }];
  assert.deepEqual(moveToGroupRows({ customGroups: groups, currentGroupId: "g2" }), [
    { kind: "group", id: "g1", name: "Research", checked: false, digit: "1" },
    { kind: "group", id: "g2", name: "Ideas", checked: true, digit: "2" },
    { kind: "separator" },
    { kind: "ungrouped", id: null, checked: false, digit: "3" },
    { kind: "create", digit: "4" },
  ]);
  assert.deepEqual(moveToGroupRows({ customGroups: groups, currentGroupId: undefined }).map((row) => row.kind + (row.digit ?? "")),
    ["group1", "group2", "separator", "create3"]);
  assert.deepEqual(moveToGroupRows({ customGroups: [], currentGroupId: null }).map((row) => row.kind + (row.digit ?? "")), ["create1"]);
  assert.deepEqual(moveToGroupRows({ customGroups: groups, currentGroupId: "g1", canCreate: false }).map((row) => row.kind), ["group", "group", "separator", "ungrouped"]);
  assert.equal(moveToGroupRows({ customGroups: groups, currentGroupId: "g1", numbered: false })[0].digit, undefined);
  assert.equal(digitFor(8), "9");
  assert.equal(digitFor(9), undefined);
});

// ---------------------------------------------------------------- R3-sidebar2 (sidebar-15): the 2.42304.0 bulk flow
const app = path.resolve(import.meta.dirname, "..");
const latest = path.resolve(app, "../reference/installed-2.42304.0-20261017/ion-dist/assets/v1");
const generated = path.join(app, "src/generated/code-current");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const official = (file) => readFileSync(path.join(latest, file), "utf8");
const BULK_TARGETS = {
  "sidebar-bulk-family.mjs": ["IX"],
  "sidebar-bulk-delete-copy.mjs": ["IY", "FY", "LY"],
  "sidebar-bulk-worktree-copy.mjs": ["wY", "DY", "AY", "NY"],
};
let server, createIntl, WorktreeCopy;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", logLevel: "error" });
  ({ kt: createIntl } = await server.ssrLoadModule("/src/generated/chat/vendor-intl-Cf4IuK3L.js"));
  WorktreeCopy = await server.ssrLoadModule("/src/generated/code-current/sidebar-bulk-worktree-copy.mjs");
});
after(() => server?.close());
const englishIntl = () => createIntl({ locale: "en-US", messages: {} });

test("IX / LY / AY / NY are 2.42304.0 shared-19 originals; the flow around them is as the chunks wire it", async () => {
  const manifest = JSON.parse(readFileSync(path.join(generated, "manifest.json"), "utf8"));
  for (const [target, bindings] of Object.entries(BULK_TARGETS)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, "2.42304.0");
    assert.equal(path.basename(entry.source), "shared-19-CkPOiIKm.js");
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(latest, "shared-19-CkPOiIKm.js"))));
    assert.deepEqual(entry.bindings, bindings);
    assert.equal(entry.sha256, sha(readFileSync(path.join(generated, target), "utf8")));
  }
  const { extractCurrentCodeHelpers } = await import("../scripts/extract-code-ui-current.mjs");
  await extractCurrentCodeHelpers({ check: true, only: new Set(Object.keys(BULK_TARGETS)) });
  const chunk = official("shared-19-CkPOiIKm.js");
  for (const feature of [
    "a=i&&e.nestedSessionsToAsk(i.codeRef,t)", // IX asks the nested sessions flow
    "let{bulk:g,asking:_}=IX(p,a,h,e=>e)", "x=_.length>0?await xu(e,()=>LX(p,a,_)):0", // YX: bulk part, then LX
    'V=u==="session"&&_&&!h?LY(e,c,_):null', 'initialFocus:V?"cancel":"confirm"', // KY: LY's copy, Cancel focused
    'defaultMessage:"Delete {count, plural, one {session} other {# sessions}}?",id:"kT5Jg7Fz/u"',
    'This can\\u2019t be undone.",id:"4RK/3dvxuB"',
    'state:"unknown",changes:e,sessions:t,action:"delete",ownerWindow:gY(n),openedAt:Date.now()', // yY always records openedAt
    "n.sessions===void 0?x(MY,{changes:E}):x(NY,{titles:E})", // EY: NY lists the titles of a yY entry
    'checkingAfterMs:n.recheck||!n.bulk&&', 'ask:n.recheck?"never":"dirty"', 'a==="always"?b("unknown",e):x(fY)', // bulk: no checking line, only dirty asks
  ]) assert.ok(chunk.includes(feature), feature);
  assert.ok(official("c39a247c4-Beaychqb.js").includes("nestedSessionsToAsk:(e,t)=>{let n=ve(e,t);return n&&{nested:n.family.nested.map(e=>e.sessionId),canStay:n.asks?n.family.canStay:[]}}"));
  const family = official("c48ea26ad-B9mFPusd.js");
  assert.ok(family.includes('function q(e,t){if(e.type!=="local"||!r?.detachFromParent)return null;'), "no detach bridge: nothing is asked");
  assert.ok(family.includes("if(!await _(e,a.length,r))return null"), "the family delete asks yY with the titles and the family size");
  assert.ok(official("c6b8adeaf-C5Aww7gq.js").includes("bulk:n,onProbeStart"), "the bulk delete mutation tells the worktree check it is one");
});

test("IX: with no nested sessions flow every target is bulk; a family whose nested sessions are not all selected is asked about, deepest first", () => {
  const p = { id: "p" }, c = { id: "c" }, d = { id: "d" }, g = { id: "g" }, x = { id: "x" };
  assert.equal(nestedFamilyProvider(), null);
  assert.deepEqual(bulkFamilyPlan("archive", [p, x]), { bulk: [p, x], asking: [] });
  const families = { g: { nested: ["p", "c", "d"], canStay: ["p", "c", "d"] }, p: { nested: ["c", "d"], canStay: ["c", "d"] } };
  const asked = [];
  const provider = { nestedSessionsToAsk: (id, action) => { asked.push(`${action}:${id}`); return families[id] ?? null; } };
  // p alone: c and d can stay and are not selected → p is asked about.
  const plan = bulkFamilyPlan("archive", [x, p], provider);
  assert.deepEqual(plan.bulk, [x]);
  assert.deepEqual(plan.asking.map((entry) => ({ t: entry.t, codeRef: entry.codeRef, nested: entry.nested })), [{ t: p, codeRef: { type: "local", id: "p" }, nested: ["c", "d"] }]);
  assert.deepEqual(asked, ["archive:x", "archive:p"]);
  // The whole family selected: nobody can stay behind, so it all goes in bulk.
  assert.deepEqual(bulkFamilyPlan("delete", [p, c, d], provider), { bulk: [p, c, d], asking: [] });
  // g and p both asked: p (nested in g) first.
  assert.deepEqual(bulkFamilyPlan("archive", [g, p, x], provider).asking.map((entry) => entry.t.id), ["p", "g"]);
  // A family nesting an asked one is asked too, even when its own members are all selected.
  const nestedAsk = { nestedSessionsToAsk: (id) => ({ g: { nested: ["p"], canStay: [] }, p: { nested: ["c"], canStay: ["c"] } })[id] ?? null };
  assert.deepEqual(bulkFamilyPlan("archive", [g, p], nestedAsk).asking.map((entry) => entry.t.id), ["p", "g"]);
  // Same as the generated IX over the records YX passes.
  const records = (session) => ({ ref: { kind: "code", id: session.id }, codeRef: { type: "local", id: session.id } });
  assert.deepEqual(bulkNestedFamilies({ nestedSessionsToAsk: (ref) => families[ref.id] ?? null }, "archive", [x, p], records).bulk, [x]);
  const off = connectNestedFamilies(provider);
  assert.equal(nestedFamilyProvider(), provider);
  assert.equal(bulkFamilyPlan("archive", [p]).asking.length, 1, "the connected flow is the default");
  off();
  assert.equal(nestedFamilyProvider(), null);
});

test("LX: asked families run one at a time; the open session, a failed or called-off one and families nesting them are held back", async () => {
  const entry = (id, nested = []) => ({ t: { id }, codeRef: { type: "local", id }, nested });
  const ran = [];
  const run = async (session) => { ran.push(session.id); if (session.id === "bad") throw Error("archive called off or failed"); };
  const done = await runAskingFamilies([entry("open"), entry("a"), entry("holds-open", ["open"]), entry("bad"), entry("holds-bad", ["bad"]), entry("gone"), entry("old"), entry("b")], "archive",
    { run, currentId: "open", present: (id) => id !== "gone", archived: (id) => id === "old" });
  assert.deepEqual(ran, ["a", "bad", "b"]);
  assert.equal(done, 2);
  assert.equal(await runAskingFamilies([entry("old")], "delete", { run, archived: () => true }), 1, "deleting: an archived family still goes");
  assert.equal(await runAskingFamilies([], "archive", { run }), 0);
});

test("the bulk delete confirmation is KY over LY: Delete # sessions, the archived lines, Cancel focused (English and zh-CN catalog)", () => {
  const intl = englishIntl();
  assert.deepEqual(bulkDeleteConfirmCopy(intl, { count: 3 }), {
    title: "Delete 3 sessions?", body: "These 3 sessions will be permanently deleted. This can’t be undone.", confirmLabel: "Delete 3 sessions", danger: true, initialFocus: "cancel",
  });
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 3, archivedCount: 1 }).body, "These 3 sessions will be permanently deleted. One of them is archived. This can’t be undone.");
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 3, archivedCount: 2 }).body, "These 3 sessions will be permanently deleted. 2 of them are archived. This can’t be undone.");
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 2, archivedCount: 2 }).body, "These 2 archived sessions will be permanently deleted. This can’t be undone.");
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 2, unloadedRemain: true }).body, "These 2 sessions will be permanently deleted. This can’t be undone. Sessions that haven’t loaded yet won’t be deleted.");
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 2, groupName: "Ideas" }).title, "Delete 2 sessions in “Ideas”?");
  assert.equal(bulkDeleteConfirmCopy(intl, { count: 2, someRanElsewhere: true }).body, "These 2 sessions will be deleted. This can’t be undone, but SSH and WSL conversations aren’t deleted from where they ran.");
  const zh = dictionary("zh-CN");
  for (const message of [BULK_DELETE_FALLBACK.title, BULK_DELETE_FALLBACK.description,
    { defaultMessage: "{count, plural, one {This session} other {These # sessions}} will be permanently deleted." },
    { defaultMessage: "{archivedCount, plural, =1 {One of them is archived.} one {# of them is archived.} other {# of them are archived.}}" },
    { defaultMessage: "This can’t be undone." }, { defaultMessage: "Sessions that haven’t loaded yet won’t be deleted." },
    { defaultMessage: "{count, plural, one {This archived session} other {These # archived sessions}} will be permanently deleted. This can’t be undone." },
    { defaultMessage: "{count, plural, one {Delete # session in “{groupName}”?} other {Delete # sessions in “{groupName}”?}}" },
    { defaultMessage: "Delete {count, plural, one {# session} other {# sessions}}" },
    { defaultMessage: "Anything uncommitted may be permanently discarded. Couldn’t check for uncommitted changes in:" }])
    assert.ok(zh[message.defaultMessage], message.defaultMessage);
  // The zh-CN copy formats as ICU with the same values.
  const zhIntl = { formatMessage: (message, values) => englishIntl().formatMessage({ ...message, defaultMessage: zh[message.defaultMessage] ?? message.defaultMessage }, values) };
  assert.deepEqual(bulkDeleteConfirmCopy(zhIntl, { count: 3, archivedCount: 1 }), { title: "删除 3 个会话？", body: "这 3 个会话将被永久删除。 其中一个已归档。 此操作无法撤销。", confirmLabel: "删除 3 个会话", danger: true, initialFocus: "cancel" });
});

test("yY: the several-sessions Couldn’t check confirm (AY's sessions copy over NY's titles) opens with openedAt, so a press counts 500 ms later", () => {
  const intl = englishIntl();
  const entry = couldntCheckConfirm(["Fix login", "Refactor"], 3, 1_000);
  assert.deepEqual(entry, { state: "unknown", action: "delete", sessions: { titles: ["Fix login", "Refactor"], count: 3 }, openedAt: 1_000 });
  const copy = WorktreeCopy.worktreeConfirmCopyOf(intl, "delete", "unknown", { changes: entry.sessions.titles, sessions: entry.sessions.count });
  assert.equal(copy.title, "Delete 3 sessions?");
  assert.equal(copy.confirmLabel, "Delete 3 sessions");
  assert.equal(renderToStaticMarkup(copy.description), "Anything uncommitted may be permanently discarded. Couldn’t check for uncommitted changes in:");
  // AY without `sessions` is the single-session copy (as SourceWorktreeDirtyDialog's worktreeConfirmCopy).
  assert.equal(WorktreeCopy.worktreeConfirmCopyOf(intl, "delete", "unknown", { changes: [] }).title, "Delete session?");
  assert.equal(WorktreeCopy.worktreeConfirmCopyOf(intl, "archive", "dirty", { changes: ["M a"] }).confirmLabel, "Archive anyway");
  const twelve = Array.from({ length: 12 }, (_, index) => `Session ${index + 1}`);
  const list = renderToStaticMarkup(React.createElement(WorktreeCopy.WorktreeSessionTitles, { titles: twelve }));
  assert.match(list, /^<ul class="mt-md flex flex-col gap-xs break-words"><li>Session 1<\/li>/);
  assert.equal((list.match(/<li>/g) ?? []).length, 11, "ten titles, then the more line");
  assert.match(list, /<li>… and 2 more<\/li><\/ul>$/);
  assert.equal(WorktreeCopy.worktreeListLimit, 10);
  assert.equal(worktreeConfirmReady({ now: 1_499, openedAt: entry.openedAt }), false);
  assert.equal(worktreeConfirmReady({ now: 1_500, openedAt: entry.openedAt }), true);
  // The confirm component: EY's danger confirm with Cancel focused over the generated copy and list.
  const source = readFileSync(path.join(app, "src/source-sidebar-bulk-worktree.jsx"), "utf8");
  assert.match(source, /worktreeConfirmCopyOf\(intl, "delete", "unknown", \{ changes: titles, sessions: sessions\?\.count \?\? titles\.length \}\)/);
  assert.match(source, /confirmVariant="danger" initialFocus="cancel"/);
  assert.match(source, /if \(worktreeConfirmReady\(\{ guardSince, openedAt \}\)\) onConfirm\?\.\(\);/);
  assert.match(source, /<WorktreeSessionTitles titles=\{titles\} \/>/);
  // The official classes are @layer utilities rules of the loaded CSS.
  const css = readFileSync(path.join(app, "public/assets/v1/c6a992d55-sXiDGMFQ.css"), "utf8");
  for (const rule of [".gap-xs{gap:var(--cds-gap-xs)}", ".break-words{", ".mt-md{"]) assert.ok(css.includes(rule), rule);
});

test("SourceSidebar runs the bulk flow through IX / LX, asks LY's confirmation and marks a bulk delete; main keeps an unreadable worktree in bulk", () => {
  const sidebar = readFileSync(path.join(app, "src/source-sidebar.jsx"), "utf8");
  // R4i-sidebar SI2: the flow (IX, the 8-wide bulk part with {bulk: true}, LX, YX's counts) is runBulkSessions, whose
  // behaviour tests are tests/sidebar-bulk-flow.test.mjs; runBulk hands it onSessionAction and the session list.
  assert.match(sidebar, /const \{ results, done, failed \} = await runBulkSessions\(action, targets, payload, \{ current, run: onSessionAction,/);
  assert.match(sidebar, /const copy = bulkDeleteConfirmCopy\(intl, \{ count, archivedCount: sessions\.filter\(sessionArchived\)\.length \}\);/);
  assert.match(sidebar, /deleteConfirmCopy\(targets, \{ engine, intl \}\)/);
  assert.match(sidebar, /initialFocus=\{shownConfirm\.value\.initialFocus\}/);
  assert.match(sidebar, /export function SourceConfirmDialog\(\{ title, body, confirmLabel, danger = false, initialFocus = "confirm",/);
  const main = readFileSync(path.join(app, "src/main.jsx"), "utf8");
  // R4i-sidebar 复核修复: the decision moved into sidebar-bulk-model sessionWorktreeGate (behaviour in sidebar-bulk-flow).
  assert.match(main, /return sessionWorktreeGate\(action, target, payload, worktreeGateHost\);/);
});
