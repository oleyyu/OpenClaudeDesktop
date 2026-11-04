// R4i-sidebar SI2 (research-ext/Y/Y1-R3-sidebar2.md -3, -4, -7, -8): behaviour tests for the bulk archive / delete flow
// (2.42304.0 shared-19 YX / IX / LX / zX / uY / yY / EY), the worktree decision of main.jsx sessionWorktree, the yY
// confirm component and the zh-CN plural copy. Node only: no browser, Electron, core or network.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  WorktreeDisposalCancelled, isWorktreeDisposalCancelled, bulkResultFailed, bulkOutcome, bulkActionPayload, worktreeDisposalPlan,
  connectWorktreeConfirmQueue, confirmCouldntCheck, worktreeConfirmVariant, runBulkSessions, runAskingFamilies, mapConcurrent,
  sessionWorktreeGate, worktreeGatedAction, settleWorktreeQueue, familyUnknownRead,
} from "../src/sidebar-bulk-model.mjs";
import { dictionary } from "../electron/i18n/index.mjs";

const app = path.resolve(import.meta.dirname, "..");
const official = (file) => readFileSync(path.join(app, "../reference/installed-2.42304.0-20261017/ion-dist/assets/v1", file), "utf8");
const count = (text, feature) => text.split(feature).length - 1;

// The confirm component renders through SourceConfirmationDialog, which portals to document.body; for SSR the test
// swaps in a stand-in that renders its props and children inline and records the handlers.
const STUB = "\0si2-confirm-dialog-stub";
const dialogStub = {
  name: "si2-confirm-dialog-stub",
  enforce: "pre",
  resolveId(id, importer) { return id === "./source-dialog.jsx" && importer?.endsWith("/src/source-sidebar-bulk-worktree.jsx") ? STUB : null; },
  load(id) {
    if (id !== STUB) return null;
    return `import React from "react";
export function SourceConfirmationDialog(props) {
  globalThis.__si2Dialog = props;
  return React.createElement("section", { "data-title": props.title, "data-confirm": props.confirmLabel, "data-variant": props.confirmVariant,
    "data-focus": props.initialFocus, "data-open": String(props.open) }, React.createElement("p", null, props.body), props.children);
}`;
  },
};
let server, Confirm, createIntl;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [dialogStub, react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", logLevel: "error" });
  ({ SidebarBulkWorktreeConfirm: Confirm } = await server.ssrLoadModule("/src/source-sidebar-bulk-worktree.jsx"));
  ({ createIntl } = await server.ssrLoadModule("/src/generated/chat/vendor-intl-DYfox5Co.js"));
});
after(() => server?.close());

test("2.42304.0 shared-19: uY rejects a cancelled disposal, zX leaves it out of the failures, YX's S counts only fulfilled truthy values", () => {
  const chunk = official("shared-19-CkPOiIKm.js");
  for (const feature of ['super("Worktree disposal cancelled by user"),this.name="WorktreeDisposalCancelled"', "function dY(e){return e instanceof uY}",
    'function zX(e){return e.status==="rejected"&&!dY(e.reason)}', 'S=b.filter(e=>e.status==="fulfilled"&&e.value).length+x', "C=b.filter(zX).length",
    'vo()===Za(e.ref)?(y.skip(e.codeRef),!1)', 'state:"unknown",changes:e,sessions:t,action:"delete"', "n.sessions===void 0?x(MY,{changes:E}):x(NY,{titles:E})"])
    assert.equal(count(chunk, feature), 1, feature);
  const cancelled = new WorktreeDisposalCancelled();
  assert.equal(cancelled.name, "WorktreeDisposalCancelled");
  assert.equal(cancelled.message, "Worktree disposal cancelled by user");
  assert.equal(isWorktreeDisposalCancelled(cancelled), true);
  assert.equal(isWorktreeDisposalCancelled(new Error("x")), false);
  assert.equal(bulkResultFailed({ status: "rejected", reason: cancelled }), false);
  assert.equal(bulkResultFailed({ status: "rejected", reason: new Error("boom") }), true);
  assert.equal(bulkResultFailed({ status: "fulfilled", value: false }), false);
});

test("Y1-R3-sidebar2-3: bulk delete of 3 with one worktree confirm cancelled reports Deleted 2 (not 3) and no failure", () => {
  const results = [{ status: "fulfilled", value: true }, { status: "fulfilled", value: false }, { status: "fulfilled", value: true }];
  assert.deepEqual(bulkOutcome("delete", results), { done: 2, failed: 0 });
  // A provider that rejects with uY instead: still neither.
  assert.deepEqual(bulkOutcome("archive", [{ status: "rejected", reason: new WorktreeDisposalCancelled() }, { status: "fulfilled", value: true }]), { done: 1, failed: 0 });
  assert.deepEqual(bulkOutcome("archive", [{ status: "rejected", reason: new Error("boom") }, { status: "fulfilled", value: true }], 2), { done: 3, failed: 1 });
  // Non-lifecycle actions keep fulfilled = done, rejected = failed (c39a247c4 ve).
  assert.deepEqual(bulkOutcome("pin", [{ status: "fulfilled" }, { status: "rejected", reason: new WorktreeDisposalCancelled() }]), { done: 1, failed: 1 });
  assert.deepEqual(bulkActionPayload("delete", { a: 1 }), { a: 1, bulk: true });
  assert.deepEqual(bulkActionPayload("delete", undefined), { bulk: true });
  assert.equal(bulkActionPayload("archive", undefined), undefined);
});

test("runBulkSessions: the open session is skipped, deletes carry {bulk: true}, 8 at a time, and the counts follow YX", async () => {
  const targets = ["a", "b", "open", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({ id }));
  let running = 0, peak = 0;
  const calls = [];
  const run = async (action, session, payload) => {
    calls.push([action, session.id, payload]);
    running += 1; peak = Math.max(peak, running);
    await new Promise((resolve) => setImmediate(resolve));
    running -= 1;
    if (session.id === "b") return false; // the worktree confirm was cancelled
    if (session.id === "c") throw new Error("thread/delete failed");
    return true;
  };
  const outcome = await runBulkSessions("delete", targets, undefined, { current: "open", run, provider: null });
  assert.equal(calls.some(([, id]) => id === "open"), false, "the open session is not deleted in bulk");
  assert.ok(calls.every(([action, , payload]) => action === "delete" && payload.bulk === true));
  assert.equal(peak, 8);
  assert.deepEqual({ done: outcome.done, failed: outcome.failed }, { done: 7, failed: 1 });
  // Pin goes over every target, the open one last, without {bulk}.
  const pinned = [];
  await runBulkSessions("pin", [{ id: "open" }, { id: "x" }], { pinned: true }, { current: "open", provider: null, run: async (action, session, payload) => { pinned.push([session.id, payload]); } });
  assert.deepEqual(pinned, [["x", { pinned: true }], ["open", { pinned: true }]]);
});

test("Y1-R3-sidebar2-4: a connected nested sessions flow splits the asked family off and runs it through the provider (LX), a called-off one held back", async () => {
  const ran = [];
  const provider = {
    nestedSessionsToAsk: (id) => (id === "p" ? { nested: ["kid"], canStay: ["kid"] } : id === "q" ? { nested: ["kid2"], canStay: ["kid2"] } : null),
    run: async (action, session) => { ran.push(`${action}:${session.id}`); return session.id === "q" ? false : undefined; },
  };
  const bulk = [];
  const outcome = await runBulkSessions("archive", [{ id: "p" }, { id: "x" }, { id: "q" }], undefined, { provider,
    run: async (action, session, payload) => { bulk.push([session.id, payload]); return true; } });
  assert.deepEqual(bulk, [["x", undefined]]);
  assert.deepEqual(ran, ["archive:p", "archive:q"]);
  assert.deepEqual({ done: outcome.done, failed: outcome.failed }, { done: 2, failed: 0 }, "x and p; q was called off");
  // LX: an answer of false holds the family back like a rejection, and so every family nesting it.
  const order = [];
  const done = await runAskingFamilies([{ t: { id: "a" }, codeRef: { id: "a" }, nested: [] }, { t: { id: "b" }, codeRef: { id: "b" }, nested: ["a"] }], "delete",
    { run: async (session) => { order.push(session.id); return false; } });
  assert.equal(done, 0);
  assert.deepEqual(order, ["a"]);
  assert.deepEqual(await mapConcurrent([1, 2], 8, async (n) => { if (n === 2) throw new Error("x"); return n; }),
    [{ status: "fulfilled", value: 1 }, { status: "rejected", reason: new Error("x") }]);
});

test("Y1-R3-sidebar2-7: main.jsx sessionWorktree's decision (worktreeDisposalPlan) for none / clean / dirty / unknown, bulk or not", () => {
  const wt = (fields) => ({ worktree: "/w", ...fields });
  assert.equal(worktreeDisposalPlan("delete", null), "none");
  assert.equal(worktreeDisposalPlan("delete", { worktree: null }), "none");
  assert.equal(worktreeDisposalPlan("delete", wt({ shared: true, changes: 3 })), "none");
  assert.equal(worktreeDisposalPlan("delete", wt({ changes: 0 })), "dispose");
  assert.equal(worktreeDisposalPlan("archive", wt({ changes: 0 })), "dispose");
  assert.equal(worktreeDisposalPlan("delete", wt({ changes: 2 }), { bulk: true }), "ask");
  assert.equal(worktreeDisposalPlan("archive", wt({ changes: 2 })), "ask");
  assert.equal(worktreeDisposalPlan("delete", wt({ unknown: true })), "ask", "a single delete asks Couldn’t check…");
  assert.equal(worktreeDisposalPlan("delete", wt({ unknown: true }), { bulk: true }), "keep", "bulk: _Y has no checking line, the unreadable worktree is kept");
  assert.equal(worktreeDisposalPlan("archive", wt({ unknown: true })), "keep");
  const chunk = official("shared-19-CkPOiIKm.js");
  assert.equal(count(chunk, "checkingAfterMs:n.recheck||!n.bulk&&(rb(e)??!0)&&(n.afterDialog||kJ(e))?mY:null"), 1);
  assert.equal(count(chunk, "var fY={confirmedDirty:!1,discardChangesIn:[]}"), 1);
  // main.jsx hands its call / queue push to the model's gate (behaviour: the end-to-end test below).
  const main = readFileSync(path.join(app, "src/main.jsx"), "utf8");
  assert.equal(count(main, "    return sessionWorktreeGate(action, target, payload, worktreeGateHost);"), 1);
  // W14-code r2 复核 (c48ea26ad X): the nested "only" move runs as prepare, after the worktree confirm, before thread/delete.
  // W14-code r5 R5DC-06: the gate takes `gated` (the payload, or the "Delete all" family's own read of the session).
  assert.equal(count(main, `if (!await worktreeGatedAction(action, target, gated, { ...worktreeGateHost, prepare: typeof nested === "function" ? nested : undefined, perform: () => rpc("thread/delete", { threadId: target.id }) })) return false;`), 1);
  // W14-code r5 R5DC-06: c48ea26ad Be — a "Delete all" member's unreadable worktree is not asked on its own (mergeUnknown);
  // familyUnknownRead picks it for the one yY confirm.
  assert.equal(worktreeDisposalPlan("delete", wt({ unknown: true }), { mergeUnknown: true }), "keep");
  assert.equal(worktreeDisposalPlan("delete", wt({ changes: 2 }), { mergeUnknown: true }), "ask", "dirty still asks (K's x(e, \"delete\"))");
  assert.deepEqual([wt({ unknown: true }), wt({ changes: 0 }), wt({ changes: 2 }), wt({ unknown: true, shared: true }), null, { unknown: true }].map(familyUnknownRead),
    [true, false, false, false, false, false]);
  const be = readFileSync(path.join(app, "../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c48ea26ad-DhTxpIFD.js"), "utf8");
  assert.equal(count(be, 'let t=a.filter(e=>o.get(e.id)?.read==="unknown");if(t.some(e=>!c.has(e.id))){let e=t.map(e=>G(i,W(e.id)));if(!await ne(e,a.length,r))return null;'), 1);
  assert.equal(count(main, `if (unknown.length && !await confirmCouldntCheck(unknown.map((member) => member.name?.trim() || t("A session")), members.length + 1)) return false;`), 1);
  assert.equal(count(main, `const gated = typeof nested === "function" && "worktree" in nested ? { ...payload, worktreeChecked: true, worktree: nested.worktree } : payload;`), 1);
});

// R4i-sidebar 复核修复 (-7): main.jsx's delete path (sessionWorktreeGate / worktreeGatedAction / settleWorktreeQueue,
// the functions main.jsx calls) driven end to end with an injected call / rpc and a host-like queue.
function hostQueue() {
  const state = { queue: [], advancedAt: 0 };
  const enqueue = (entry) => new Promise((resolve) => { state.queue = [...state.queue, { ...entry, resolve }]; });
  const settle = (entry, accepted) => { const next = settleWorktreeQueue(state.queue, entry); if (next.advanced) state.advancedAt += 1; state.queue = next.queue; entry.resolve(accepted); };
  return { state, enqueue, settle };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("复核 -7: bulk delete of 3 through main.jsx's gated delete, one dirty worktree cancelled in the queue → Deleted 2, 0 failed", async () => {
  const statuses = { a: { worktree: "/wa", changes: 0 }, b: { worktree: "/wb", changes: 4 }, c: null };
  const calls = [], deleted = [];
  const call = async (channel, args) => { calls.push([channel, args]); if (channel === "worktree-status") return statuses[args.threadId]; return {}; };
  const host = hostQueue();
  const sessionAction = (action, target, payload = {}) => worktreeGatedAction(action, target, payload,
    { call, enqueue: host.enqueue, now: () => 1, perform: async () => { deleted.push(target.id); } });
  const running = runBulkSessions("delete", [{ id: "a" }, { id: "b" }, { id: "c" }], undefined, { run: sessionAction, provider: null });
  while (host.state.queue.length === 0) await tick();
  assert.equal(host.state.queue.length, 1);
  const head = host.state.queue[0];
  assert.deepEqual({ id: head.id, action: head.action, status: head.status }, { id: "b:delete:1", action: "delete", status: statuses.b });
  assert.equal(worktreeConfirmVariant(head), "changes", "a single-session entry renders SourceWorktreeDirtyDialog");
  host.settle(head, false);
  const outcome = await running;
  assert.deepEqual({ done: outcome.done, failed: outcome.failed }, { done: 2, failed: 0 });
  assert.deepEqual(outcome.results.map((result) => result.value), [true, false, true]);
  assert.deepEqual(deleted.sort(), ["a", "c"]);
  await tick();
  assert.deepEqual(calls.filter(([channel]) => channel === "worktree-remove"), [["worktree-remove", { worktree: "/wa" }]], "only the clean own worktree goes");
  assert.equal(host.state.queue.length, 0);
});

test("复核 -7: the gate's other paths — accepted confirm disposes, bulk unknown keeps, single unknown asks, shared / checked / failing status skip", async () => {
  const host = hostQueue();
  const run = (status, action = "delete", payload = {}) => {
    const removed = [];
    const call = async (channel, args) => { if (channel === "worktree-status") { if (status instanceof Error) throw status; return status; } removed.push(args.worktree); };
    let performed = 0;
    return { removed, get performed() { return performed; },
      result: worktreeGatedAction(action, { id: "s" }, payload, { call, enqueue: host.enqueue, now: () => 2, perform: async () => { performed += 1; } }) };
  };
  const dirty = run({ worktree: "/w", changes: 1 });
  while (host.state.queue.length === 0) await tick();
  host.settle(host.state.queue[0], true);
  assert.equal(await dirty.result, true); await tick();
  assert.deepEqual([dirty.performed, dirty.removed], [1, ["/w"]]);
  const keep = run({ worktree: "/w", unknown: true }, "delete", { bulk: true });
  assert.equal(await keep.result, true); await tick();
  assert.deepEqual([keep.performed, keep.removed, host.state.queue.length], [1, [], 0]);
  const single = run({ worktree: "/w", unknown: true });
  while (host.state.queue.length === 0) await tick();
  host.settle(host.state.queue[0], false);
  assert.equal(await single.result, false);
  assert.equal(single.performed, 0);
  for (const status of [{ worktree: "/w", shared: true, changes: 9 }, new Error("ipc down"), null]) {
    const other = run(status);
    assert.equal(await other.result, true); await tick();
    assert.deepEqual([other.performed, other.removed], [1, []]);
  }
  // worktreeChecked (the single Delete dialog's own probe) skips worktree-status.
  let asked = 0;
  assert.deepEqual(await sessionWorktreeGate("delete", { id: "s" }, { worktreeChecked: true, worktree: { worktree: "/p" } },
    { call: async () => { asked += 1; }, enqueue: host.enqueue }), { worktree: "/p" });
  assert.equal(asked, 0);
  // A failed thread/delete rejects (counted as a failure by YX) and leaves the worktree.
  const removed = [];
  await assert.rejects(worktreeGatedAction("delete", { id: "s" }, {}, { call: async (channel, args) => (channel === "worktree-status" ? { worktree: "/w", changes: 0 } : removed.push(args)),
    enqueue: host.enqueue, perform: async () => { throw new Error("thread/delete failed"); } }), /thread\/delete failed/);
  assert.deepEqual(removed, []);
  // cK shift: settling a non-head-only queue marks the next head guarded; an unknown entry leaves the queue alone.
  const one = { id: 1 }, two = { id: 2 };
  assert.deepEqual(settleWorktreeQueue([one, two], one), { queue: [two], advanced: true });
  assert.deepEqual(settleWorktreeQueue([two], two), { queue: [], advanced: false });
  const queue = [two];
  assert.equal(settleWorktreeQueue(queue, one).queue, queue);
});

test("yY: confirmCouldntCheck queues EY's several-sessions entry on the connected queue and resolves with the answer", async () => {
  assert.equal(await confirmCouldntCheck(["A"], 2), false, "no queue: nothing confirmed");
  const queue = [];
  const off = connectWorktreeConfirmQueue((entry) => queue.push(entry));
  const answer = confirmCouldntCheck(["Fix login", "Refactor"], 3, 1_000);
  assert.equal(queue.length, 1);
  const { resolve, ...entry } = queue[0];
  assert.deepEqual(entry, { state: "unknown", action: "delete", sessions: { titles: ["Fix login", "Refactor"], count: 3 }, openedAt: 1_000 });
  assert.equal(worktreeConfirmVariant(queue[0]), "sessions");
  assert.equal(worktreeConfirmVariant({ action: "delete", status: { changes: 2 } }), "changes");
  resolve(true);
  assert.equal(await answer, true);
  off();
  assert.equal(await confirmCouldntCheck([], 0), false);
  // main.jsx connects its queue and renders a `sessions` head with SidebarBulkWorktreeConfirm, the rest with SourceWorktreeDirtyDialog.
  const main = readFileSync(path.join(app, "src/main.jsx"), "utf8");
  assert.equal(count(main, "useEffect(() => connectWorktreeConfirmQueue((entry) => setWorktreeQueue((queue) => [...queue, {"), 1);
  assert.equal(count(main, `worktreeConfirmVariant(shownWorktreeConfirm.value) === "sessions" && <SidebarBulkWorktreeConfirm `), 1);
  assert.equal(count(main, `worktreeConfirmVariant(shownWorktreeConfirm.value) === "changes" && <SourceWorktreeDirtyDialog `), 1);
});

test("SidebarBulkWorktreeConfirm (EY over a yY entry): AY's sessions copy, NY's titles, danger confirm with Cancel focused, the 500 ms guard", () => {
  const titles = Array.from({ length: 12 }, (_, index) => `Session ${index + 1}`);
  const html = renderToStaticMarkup(React.createElement(Confirm, { open: true, sessions: { titles, count: 14 }, more: true, openedAt: Date.now() }));
  assert.match(html, /^<section data-title="Delete 14 sessions\?" data-confirm="Delete 14 sessions" data-variant="danger" data-focus="cancel" data-open="true">/);
  assert.match(html, /<p>Anything uncommitted may be permanently discarded\. Couldn’t check for uncommitted changes in:<\/p>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 11);
  assert.match(html, /<li>… and 2 more<\/li><\/ul>/);
  assert.match(html, /<p class="mt-md text-footnote text-muted-as-secondary">More sessions with uncommitted changes will follow\.<\/p>/);
  // One session: the singular title; no more line.
  const one = renderToStaticMarkup(React.createElement(Confirm, { open: true, sessions: { titles: ["Only"], count: 1 } }));
  assert.match(one, /data-title="Delete session\?"/);
  assert.doesNotMatch(one, /will follow/);
  // The press counts 500 ms after the later of guardSince and openedAt (EY S); Cancel closes.
  let confirmed = 0, closed = 0;
  renderToStaticMarkup(React.createElement(Confirm, { open: true, sessions: { titles: ["A"], count: 2 }, openedAt: Date.now(), onConfirm: () => confirmed++, onClose: () => closed++ }));
  globalThis.__si2Dialog.onConfirm();
  assert.equal(confirmed, 0, "too soon after it opened");
  renderToStaticMarkup(React.createElement(Confirm, { open: true, sessions: { titles: ["A"], count: 2 }, openedAt: Date.now() - 600, guardSince: Date.now() - 700, onConfirm: () => confirmed++, onClose: () => closed++ }));
  globalThis.__si2Dialog.onConfirm();
  globalThis.__si2Dialog.onCancel();
  assert.deepEqual([confirmed, closed], [1, 1]);
});

test("Y1-R3-sidebar2-8: zh-CN plural copy selects =1 for one session and other otherwise, with no unreachable one branch", () => {
  const zh = dictionary("zh-CN");
  const zhIntl = createIntl({ locale: "zh-CN", messages: {} });
  const format = (key, values) => zhIntl.formatMessage({ id: "x", defaultMessage: zh[key] }, values);
  const keys = {
    title: "Delete {count, plural, one {session} other {# sessions}}?",
    body: "{count, plural, one {This session} other {These # sessions}} will be permanently deleted. This can’t be undone.",
    short: "{count, plural, one {This session} other {These # sessions}} will be permanently deleted.",
    group: "{count, plural, one {Delete # session in “{groupName}”?} other {Delete # sessions in “{groupName}”?}}",
    archived: "{count, plural, one {This archived session} other {These # archived sessions}} will be permanently deleted. This can’t be undone.",
  };
  for (const key of Object.values(keys)) assert.doesNotMatch(zh[key], /\bone \{/, key);
  assert.equal(new Intl.PluralRules("zh-CN").select(1), "other");
  assert.equal(format(keys.title, { count: 1 }), "删除会话？");
  assert.equal(format(keys.title, { count: 3 }), "删除 3 个会话？");
  assert.equal(format(keys.body, { count: 1 }), "此会话将被永久删除。此操作无法撤销。");
  assert.equal(format(keys.body, { count: 2 }), "这 2 个会话将被永久删除。此操作无法撤销。");
  assert.equal(format(keys.short, { count: 1 }), "此会话将被永久删除。");
  assert.equal(format(keys.archived, { count: 1 }), "此已归档会话将被永久删除。此操作无法撤销。");
  assert.equal(format(keys.group, { count: 1, groupName: "想法" }), "删除“想法”中的 1 个会话？");
});

// W14-code r5 fr5-05: shared-46 KE / GE (5 s) probes, c6b8adeaf's archive (`known` dirty asks; otherwise archive now and
// settle the read after: s?.then(…dirty → lateDirty, Ue)) and shared-22 QI's warning toast copy.
test("fr5-05: an archive asks only on a dirty read already in; a late read disposes a clean worktree or keeps a dirty one", async () => {
  const { createWorktreeProbes, archiveWorktreeGate, lateArchiveWorktree, WORKTREE_PROBE_FRESH_MS } = await import("../src/sidebar-bulk-model.mjs");
  let clock = 1_000;
  const reads = [];
  const answers = { dirty: { worktree: "/wt/d", changes: 2 }, clean: { worktree: "/wt/c", changes: 0 } };
  const call = (channel, { threadId }) => { reads.push(threadId); return Promise.resolve(answers[threadId] ?? null); };
  const probes = createWorktreeProbes({ now: () => clock });
  const asked = [];
  const host = { probes, call, enqueue: async (entry) => { asked.push(entry.status); return true; }, now: () => clock };
  // No probe yet: the archive goes on at once; the read settles later.
  const first = await archiveWorktreeGate({ id: "dirty" }, {}, host);
  assert.equal(first.worktree, null);
  assert.deepEqual(await first.late, answers.dirty);
  assert.equal(lateArchiveWorktree(await first.late), "kept-dirty");
  assert.equal(asked.length, 0, "nothing asked: the dirty worktree is kept and the QI toast warns");
  // The menu-open probe (aD) settled before Archive: a dirty read asks (Re → mK).
  probes.prefetch(["dirty", "clean"], call);
  await Promise.resolve(); await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await archiveWorktreeGate({ id: "dirty" }, {}, host);
  assert.deepEqual([second.worktree, second.late, asked], [answers.dirty, null, [answers.dirty]]);
  const clean = await archiveWorktreeGate({ id: "clean" }, {}, host);
  assert.deepEqual([clean.worktree, clean.late], [answers.clean, null]);
  // A cancelled confirm calls the archive off.
  assert.equal(await archiveWorktreeGate({ id: "dirty" }, {}, { ...host, enqueue: async () => false }), false);
  // GE: a read older than 5 s is stale, so the next archive starts over (late again).
  const before = reads.length;
  clock += WORKTREE_PROBE_FRESH_MS;
  const stale = await archiveWorktreeGate({ id: "dirty" }, {}, host);
  assert.ok(stale.late && reads.length === before + 1);
  // The nested flow's own read is kept (worktreeChecked).
  assert.deepEqual(await archiveWorktreeGate({ id: "x" }, { worktreeChecked: true, worktree: answers.clean }, host), { worktree: answers.clean, late: null });
  assert.equal(lateArchiveWorktree(answers.clean), "dispose");
  assert.equal(lateArchiveWorktree({ worktree: "/wt/u", unknown: true }), "keep");
  assert.equal(lateArchiveWorktree(null), "keep");
  assert.equal(lateArchiveWorktree({ worktree: "/wt/s", shared: true, changes: 3 }), "keep");
  // aD caps the menu-open probes at 8.
  const many = [];
  createWorktreeProbes().prefetch(Array.from({ length: 12 }, (_, index) => `s${index}`), (channel, { threadId }) => { many.push(threadId); return Promise.resolve(null); });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(many.length, 8);
  // main.jsx / source-sidebar.jsx wiring and the official copy.
  const main = readFileSync(path.join(app, "src/main.jsx"), "utf8");
  const sidebar = readFileSync(path.join(app, "src/source-sidebar.jsx"), "utf8");
  assert.ok(main.includes("useEffect(() => connectWorktreeProbes(call), []);"));
  assert.ok(main.includes('if (outcome === "kept-dirty") warnArchivedWithChanges(target);'));
  assert.ok(main.includes('}, { variant: "warning", key: "archived-uncommitted" });'));
  assert.ok(sidebar.includes('if (mode === "code") prefetchWorktreeProbes(multi ? [...selectionRef.current.selectedKeys] : [session.id]);'));
  const snapshot = (file) => readFileSync(path.join(app, "../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1", file), "utf8");
  const qi = snapshot("shared-22-Bwn3sJTG.js");
  for (const needle of ['variant:"warning"', '"{count, plural, one {Session} other {# sessions}} archived with uncommitted changes"',
    '"{count, plural, one {The worktree is still on disk. Unarchive the session to keep working in it.} other {The worktrees are still on disk. Unarchive the sessions to keep working in them.}}"',
    '"{count, plural, one {Unarchive} other {Unarchive all}}"']) assert.ok(qi.includes(needle), needle);
  assert.ok(snapshot("c6b8adeaf-bLEQVSWL.js").includes('n==="dirty"&&(r?.lateDirty(),qe(t)&&Ue(t,Ge(i)))'));
  // W14-code r8 fr8-04: QI's own descriptors (generated messages-shared-22.mjs) formatted with intl, not host tn pairs.
  assert.ok(main.includes('title: intl.formatMessage(archivedWithChangesMessages.title, { count }),'));
  assert.ok(main.includes('action: { label: intl.formatMessage(archivedWithChangesMessages.action, { count }), onClick'));
  for (const key of ["{count, plural, one {Session} other {# sessions}} archived with uncommitted changes",
    "{count, plural, one {The worktree is still on disk. Unarchive the session to keep working in it.} other {The worktrees are still on disk. Unarchive the sessions to keep working in them.}}",
    "{count, plural, one {Unarchive} other {Unarchive all}}"]) assert.ok(dictionary("zh-CN")[key], key);
});

// W14-code r5 复核 (fr5-05 补做): cc43287c9's header session menu probes on open (`onMenuOpen:nn`, nn = `()=>{t&&da([t])}`),
// c9c63e0ed probes the open local session (`W=()=>{U&&l([{id:H,type:"local"}])}`, deps [H,U]), and QI's "Unarchive all"
// runs shared-22 d: 8 at a time, silent unarchives, one bulkRestored toast (timeout 3 s) and one bulkRestoreFailed toast.
test("fr5-05 补做: header-menu / open-session probes and QI's bulk unarchive copy", async () => {
  const snapshot = (file) => readFileSync(path.join(app, "../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1", file), "utf8");
  assert.ok(snapshot("cc43287c9-Me-M2ucD.js").includes("nn=J1($,139,t)?K1($,139,t,()=>{t&&da([t])})"));
  assert.ok(snapshot("cc43287c9-Me-M2ucD.js").includes("onMenuOpen:nn"));
  assert.ok(snapshot("c9c63e0ed-BcKt-ChI.js").includes('W=()=>{U&&l([{id:H,type:"local"}])},G=[H,U]'));
  const qi = snapshot("shared-22-Bwn3sJTG.js");
  assert.ok(qi.includes("Al(e,8,async e=>vi(e)?(await t.unarchive(e,{skipListInvalidate:!0}),!0):!1)"));
  assert.ok(qi.includes("r>0&&a(l.formatMessage(ha.bulkRestored,{count:r}),{timeout:3e3})"));
  assert.ok(qi.includes("c(n,e=>l.formatMessage(ha.bulkRestoreFailed,{count:e})"));
  const main = readFileSync(path.join(app, "src/main.jsx"), "utf8");
  assert.ok(main.includes('useEffect(() => { if (mode === "code" && current) prefetchWorktreeProbes([current]); }, [current, mode]);'));
  assert.ok(main.includes('if (kind === "session-title" && mode === "code" && data?.id && !(menu?.kind === kind && menu.anchor === anchor && !point && entry === undefined)) prefetchWorktreeProbes([data.id]);'));
  // The probe connection comes before the open-session probe (effects run in order).
  assert.ok(main.indexOf("useEffect(() => connectWorktreeProbes(call), []);") < main.indexOf("prefetchWorktreeProbes([current])"));
  assert.ok(main.includes("void unarchiveKeptDirty(ids);"));
  assert.ok(main.includes('await mapConcurrent(rows, 8, async (row) => sessionArchived(row) ? (await sessionAction("unarchive", row, { silent: true }), true) : false)'));
  assert.ok(main.includes('toasts.add(intl.formatMessage(sidebarListMessages.bulkRestored, { count: restored }), { variant: "neutral", timeout: 3000 })'));
  assert.ok(main.includes("toasts.add(intl.formatMessage(sidebarListMessages.bulkRestoreFailed, { count: failed.length }), { variant: \"danger\" })"));
  assert.ok(!/sessionAction\("unarchive", row\)\.catch/.test(main), "no per-session keyed toast from Unarchive all");
  const { sidebarListMessages } = await import("../src/generated/sessions-page/pure-shared-78.mjs");
  assert.deepEqual([sidebarListMessages.bulkRestored.id, sidebarListMessages.bulkRestoreFailed.id], ["ONUBGyrHFE", "1kRanlGAB8"]);
  for (const message of [sidebarListMessages.bulkRestored, sidebarListMessages.bulkRestoreFailed]) assert.ok(dictionary("zh-CN")[message.defaultMessage], message.defaultMessage);
  // The ICU copy formats per count through the intl main uses.
  const { createIntl } = await import("../src/generated/chat/vendor-intl-DYfox5Co.js");
  const intl = createIntl({ locale: "en", messages: {} });
  assert.equal(intl.formatMessage(sidebarListMessages.bulkRestored, { count: 1 }), "Unarchived 1 session");
  assert.equal(intl.formatMessage(sidebarListMessages.bulkRestoreFailed, { count: 2 }), "2 sessions couldn’t be unarchived. Try again.");
});
