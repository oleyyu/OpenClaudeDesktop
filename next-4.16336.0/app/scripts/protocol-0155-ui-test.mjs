import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Codex app-server 0.155.1 protocol adoption.
//
// Paginated thread history: a thread whose Thread.historyMode is "paginated"
// (every thread created by >=0.154) is resumed with excludeTurns:true plus
// initialTurnsPage and hydrated through thread/turns/list and
// thread/items/list. Full-history hydration on such a thread makes the
// app-server emit a deprecationNotice (thread_processor.rs:36/:37, sent from
// :892 thread/read, :3771 and :4383 thread/resume, :4910 thread/fork); only
// historyMode "legacy" keeps the single-response path. Sub-agent threads
// arrive on this same connection with their own threadId
// (lib.rs:1252-1266 -> thread_processor.rs:3609-3640) and must never become
// sidebar sessions. item/fileChange/patchUpdated replaces a running patch.
//
// Runs only after a fresh build with no other GUI suite active; every row and
// every notification comes from the isolated protocol fixture, never from
// injected DOM. Window 1468x800 so it fits an 851pt macOS work area.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `protocol-0155-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);

const PAG = "p0155-paginated", LEG = "p0155-legacy", BIG = "p0155-big", ARCH = "p0155-archived", OLDMETA = "p0155-unknown-mode";
const now = Math.floor(Date.now() / 1000);
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const turn = (id, items, extra = {}) => ({ id, status: "completed", items, ...extra });
function thread(id, name, turns, { historyMode = "paginated", index = 0, archived = false } = {}) {
  return { id, name, cwd: workspace, createdAt: now - 1000, updatedAt: now - index, archived, historyMode, preview: name, turns };
}
// Four turns, ten items. pag-t2 declares itemsView "summary" so the server
// withholds its items from thread/turns/list and the client has to complete it
// through thread/items/list (TurnItemsView).
const pagTurns = [
  turn("pag-t1", [userItem("pag-u1", "PAG_USER_ONE"), textItem("pag-a1", "PAG_ANSWER_ONE")]),
  turn("pag-t2", [userItem("pag-u2", "PAG_USER_TWO"), textItem("pag-a2", "PAG_ANSWER_TWO"), textItem("pag-a2b", "PAG_ANSWER_TWO_B")], { itemsView: "summary" }),
  turn("pag-t3", [userItem("pag-u3", "PAG_USER_THREE"), textItem("pag-a3", "PAG_ANSWER_THREE")]),
  turn("pag-t4", [userItem("pag-u4", "PAG_USER_FOUR"), textItem("pag-a4", "PAG_ANSWER_FOUR"), textItem("pag-a4b", "PAG_ANSWER_FOUR_B")]),
];
const PAG_ITEM_IDS = pagTurns.flatMap(entry => entry.items.map(item => item.id));
// 30 turns > the 25-turn page, so the resume page is followed by exactly one
// thread/turns/list continuation and the merge has to restore ascending order.
const BIG_TURNS = 30;
const bigTurns = Array.from({ length: BIG_TURNS }, (_, index) =>
  turn(`big-t${index + 1}`, [userItem(`big-u${index + 1}`, `BIG_USER_${index + 1}`), textItem(`big-a${index + 1}`, `BIG_ANSWER_${index + 1}`)]));
const legTurns = [
  turn("leg-t1", [userItem("leg-u1", "LEG_USER_ONE"), textItem("leg-a1", "LEG_ANSWER_ONE")]),
  turn("leg-t2", [userItem("leg-u2", "LEG_USER_TWO"), textItem("leg-a2", "LEG_ANSWER_TWO")]),
];
const archTurns = [turn("arch-t1", [userItem("arch-u1", "ARCH_USER_ONE"), textItem("arch-a1", "ARCH_ANSWER_ONE")])];
// An archived session whose local metadata was written by an older backend and
// carries NO historyMode, while the server reports "legacy". The request shape
// and the hydration branch must come from the same decision: deciding the
// request from the unknown local Thread (includeTurns:false) and then
// hydrating from the server's "legacy" reply would hand back the turns that
// request deliberately emptied, i.e. a silently blank transcript.
const oldMetaTurns = [turn("old-t1", [userItem("old-u1", "OLDMETA_USER_ONE"), textItem("old-a1", "OLDMETA_ANSWER_ONE")])];
const threads = {
  [PAG]: thread(PAG, "Paginated session", pagTurns, { index: 0 }),
  [LEG]: thread(LEG, "Legacy session", legTurns, { historyMode: "legacy", index: 1 }),
  [BIG]: thread(BIG, "Paginated long session", bigTurns, { index: 2 }),
  [ARCH]: thread(ARCH, "Archived paginated session", archTurns, { index: 3, archived: true }),
  [OLDMETA]: thread(OLDMETA, "Archived pre-0.155 session", oldMetaTurns, { historyMode: "legacy", index: 4, archived: true }),
};
const threadMetadata = Object.fromEntries(Object.values(threads).map(({ turns, ...meta }) => [meta.id, meta]));
// 0.153.4 persisted no historyMode at all; reproduce that exactly.
delete threadMetadata[OLDMETA].historyMode;
await fs.writeFile(path.join(profile, "protocol-0155-fixture.marker"), "isolated-protocol-0155-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", sidebarWidth: 288, displayName: "Fixture",
  threadIds: [PAG, LEG, BIG], archivedThreadIds: [ARCH, OLDMETA], threadMetadata,
  // Show active and archived rows together so the archived hydration path is
  // reachable without driving the sidebar filter menu in this suite.
  sidebarPreferences: { status: "all" },
}));
// Real 0.155.1 creates paginated threads. No opt-in: verify the fixture default.
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 500, threads }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, profileRemoved = false;
const testSources = ["scripts/protocol-0155-ui-test.mjs", "tests/fixtures/codex-server.cjs", "src/thread-history-model.mjs", "src/state.js"];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/thread-history-model.mjs", "src/state.js", "src/main.jsx", "src/source-session.jsx",
    "electron/main.cjs", "electron/session-operations.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
// Every thread/read, thread/resume, thread/turns/list and thread/items/list the
// fixture served, in order.
async function history(method, threadId) {
  let text = "";
  try { text = await fs.readFile(path.join(profile, "fixture-history.jsonl"), "utf8"); } catch { return []; }
  return text.split("\n").filter(Boolean).map(line => JSON.parse(line))
    .filter(entry => (!method || entry.method === method) && (!threadId || entry.params?.threadId === threadId));
}
const readThreads = async () => JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8"));
async function poll(check, label, timeout = 10000) {
  const until = Date.now() + timeout;
  for (;;) {
    try { const value = await check(); if (value) return value; } catch {}
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}
const transcriptIds = () => page.$$eval("[data-transcript-item-id]", nodes => nodes.map(node => node.dataset.transcriptItemId));
async function open(id, lastItem) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(`[data-transcript-item-id="${lastItem}"]`).waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
}
async function send(text) {
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await page.locator(`[data-source-session-id="${PAG}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1468, 800));
  await page.waitForFunction(() => innerWidth === 1468);

  // 0. The session list itself is metadata-only: thread/read never asks for turns.
  metrics.listReads = (await history("thread/read")).map(entry => ({ threadId: entry.params.threadId, includeTurns: !!entry.params.includeTurns, historyMode: entry.historyMode }));
  assert.ok(metrics.listReads.length >= 3, "the session list reads every owned thread");
  assert.deepEqual([...new Set(metrics.listReads.map(entry => entry.threadId))].sort(), [BIG, LEG, PAG].sort(),
    "the session list reads exactly the owned threads");
  assert.deepEqual(metrics.listReads.filter(entry => entry.includeTurns), [], "the session list never hydrates full history");
  checks.push("The session list reads thread/read with includeTurns:false for every owned thread, so a paginated thread never emits the thread/read deprecation");

  // 1. A paginated session is resumed with excludeTurns + initialTurnsPage and
  // paged; the transcript equals the server's turn/item set exactly.
  await open(PAG, "pag-a4b");
  const pagResume = (await history("thread/resume", PAG)).at(-1);
  metrics.paginatedResume = pagResume.params;
  assert.equal(pagResume.historyMode, "paginated");
  assert.equal(pagResume.params.excludeTurns, true, "a paginated resume must exclude turns");
  assert.deepEqual(pagResume.params.initialTurnsPage, { limit: 25, sortDirection: "desc", itemsView: "full" });
  assert.deepEqual(await history("thread/read", PAG).then(entries => entries.filter(entry => entry.params.includeTurns)), [],
    "no deprecated thread/read includeTurns:true for the paginated session");
  const pagRendered = await transcriptIds();
  metrics.paginatedTranscript = { rendered: pagRendered, expected: PAG_ITEM_IDS };
  assert.deepEqual(pagRendered, PAG_ITEM_IDS, "the transcript equals the paginated turn/item set, in ascending order");
  checks.push(`Paginated resume sends excludeTurns:true + initialTurnsPage{25,desc,full}; the transcript renders exactly the ${PAG_ITEM_IDS.length} items the server holds, oldest first`);

  // 2. The turn the server withheld is completed through thread/items/list.
  const pagItemCalls = await history("thread/items/list", PAG);
  metrics.itemsListCalls = pagItemCalls.map(entry => entry.params);
  assert.equal(pagItemCalls.length, 1, "exactly the summary turn is backfilled");
  assert.deepEqual(pagItemCalls[0].params, { threadId: PAG, turnId: "pag-t2", limit: 200, sortDirection: "asc" });
  for (const id of ["pag-u2", "pag-a2", "pag-a2b"]) assert.equal(await page.locator(`[data-transcript-item-id="${id}"]`).count(), 1, `${id} came from thread/items/list`);
  checks.push("A turn returned with itemsView 'summary' is completed through thread/items/list{turnId,asc} instead of deprecated full hydration");

  // 3. More turns than one page: one continuation, still ascending.
  await open(BIG, `big-a${BIG_TURNS}`);
  const bigTurnCalls = await history("thread/turns/list", BIG);
  metrics.bigTurnCalls = bigTurnCalls.map(entry => entry.params);
  assert.equal(bigTurnCalls.length, 1, "25 of 30 turns arrive with the resume page; one continuation covers the rest");
  assert.equal(bigTurnCalls[0].params.cursor, "turns:25");
  assert.equal(bigTurnCalls[0].params.sortDirection, "desc");
  const bigRendered = await transcriptIds();
  assert.equal(bigRendered.length, BIG_TURNS * 2);
  assert.equal(bigRendered[0], "big-u1", "descending pages merge back into ascending transcript order");
  assert.equal(bigRendered.at(-1), `big-a${BIG_TURNS}`);
  metrics.bigTranscript = { count: bigRendered.length, first: bigRendered[0], last: bigRendered.at(-1) };
  checks.push(`A ${BIG_TURNS}-turn paginated session needs exactly one thread/turns/list continuation (cursor turns:25) and renders all ${BIG_TURNS * 2} items oldest first`);

  // 4. historyMode "legacy" keeps the single-response path.
  await open(LEG, "leg-a2");
  const legResume = (await history("thread/resume", LEG)).at(-1);
  metrics.legacyResume = legResume.params;
  assert.equal(legResume.historyMode, "legacy");
  assert.equal(legResume.params.excludeTurns, undefined, "a legacy thread is resumed unchanged");
  assert.equal(legResume.params.initialTurnsPage, undefined);
  assert.deepEqual(await history("thread/turns/list", LEG), [], "a legacy thread is not paged");
  assert.deepEqual(await history("thread/items/list", LEG), [], "thread/items/list is not supported for legacy threads");
  assert.deepEqual(await transcriptIds(), ["leg-u1", "leg-a1", "leg-u2", "leg-a2"]);
  checks.push("historyMode 'legacy' keeps thread/resume without excludeTurns and never calls the pagers, which the real server rejects with -32601 for legacy threads");

  // 5. An archived paginated session reads metadata only and pages.
  await open(ARCH, "arch-a1");
  const archReads = await history("thread/read", ARCH);
  metrics.archivedReads = archReads.map(entry => ({ includeTurns: !!entry.params.includeTurns }));
  assert.deepEqual(archReads.filter(entry => entry.params.includeTurns), [], "an archived paginated session is never read in full");
  assert.ok((await history("thread/turns/list", ARCH)).length >= 1, "an archived paginated session is hydrated through the pager");
  assert.deepEqual(await history("thread/resume", ARCH), [], "an archived session is not resumed");
  assert.deepEqual(await transcriptIds(), ["arch-u1", "arch-a1"]);
  checks.push("An archived paginated session hydrates from thread/read includeTurns:false plus thread/turns/list, with no thread/resume");

  // 6. Nothing in the whole run took a deprecated route.
  const deprecatedCalls = (await history()).filter(entry =>
    entry.historyMode === "paginated" && ((entry.method === "thread/read" && entry.params.includeTurns) || (entry.method === "thread/resume" && !entry.params.excludeTurns)));
  metrics.deprecatedCalls = deprecatedCalls.map(entry => ({ method: entry.method, threadId: entry.params.threadId }));
  assert.deepEqual(metrics.deprecatedCalls, [], "no request on a paginated thread can make the server emit a deprecationNotice");
  checks.push("Across the whole run no request on a paginated thread takes a route the app-server answers with deprecationNotice");

  // 7. item/fileChange/patchUpdated replaces a running patch in place.
  await open(PAG, "pag-a4b");
  await send("fixture:patch");
  const patchRow = page.locator('[data-cds="TurnStatusStep"]').filter({ hasText: "Editing" }).first();
  await patchRow.waitFor();
  await poll(async () => (await patchRow.locator(".source-step-label").textContent()) === "Editing 3 files", "patchUpdated replaces the change set");
  metrics.patch = { meta: await patchRow.locator(".source-step-meta").count(), state: await patchRow.getAttribute("data-state"),
    label: await patchRow.locator(".source-step-label").textContent() };
  // cf6ae6197:16245–16440 group-summary + approval-current:4195–4210:
  // a Codex multi-file patch has a grouped label, never a primary "N files" meta.
  assert.equal(metrics.patch.meta, 0);
  assert.equal(metrics.patch.label, "Editing 3 files");
  assert.equal(metrics.patch.state, "busy", "the patch update does not settle the item");
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  checks.push("item/fileChange/patchUpdated replaces the whole change set on the running fileChange row (one path -> grouped 'Editing 3 files') while it stays data-state=busy");

  // 8. item/mcpToolCall/progress is consumed without disturbing the row.
  await send("fixture:mcp-progress");
  await poll(async () => (await page.locator('[data-transcript-item-id]').allTextContents()).some(text => text.includes("MCP_PROGRESS_FIXTURE_REPLY")), "mcp progress turn completes");
  const mcpRow = page.locator('[data-cds="TurnStatusStep"]').filter({ hasText: "fixture-server" }).first();
  metrics.mcp = { count: await mcpRow.count(), state: await mcpRow.getAttribute("data-state") };
  assert.equal(metrics.mcp.count, 1, "the mcpToolCall row survives the progress notification");
  assert.equal(metrics.mcp.state, "done");
  checks.push("item/mcpToolCall/progress is reduced onto the running call without creating a second row or settling it early");

  // 9. A sub-agent thread is bucketed to its own threadId and never listed.
  const sidebarBefore = await page.locator("[data-source-session-id]").count();
  const transcriptBefore = await transcriptIds();
  await send("fixture:subagent");
  await poll(async () => (await page.locator('[data-transcript-item-id]').allTextContents()).some(text => text.includes("SUBAGENT_FIXTURE_REPLY")), "parent turn completes");
  const child = Object.values((await readThreads()).threads).find(entry => entry.parentThreadId === PAG);
  assert.ok(child, "the fixture really created a sub-agent thread");
  metrics.subagent = { childId: child.id, agentNickname: child.agentNickname, agentRole: child.agentRole,
    childItemIds: child.turns.flatMap(entry => entry.items.map(item => item.id)) };
  assert.ok(metrics.subagent.childItemIds.length >= 1, "the sub-agent thread really produced items");
  assert.equal(await page.locator(`[data-source-session-id="${child.id}"]`).count(), 0, "a sub-agent thread is never a sidebar session");
  assert.equal(await page.locator("[data-source-session-id]").count(), sidebarBefore, "the sidebar gained no row");
  const afterIds = await transcriptIds();
  for (const id of metrics.subagent.childItemIds)
    assert.equal(afterIds.includes(id), false, `sub-agent item ${id} must not appear in the parent transcript`);
  assert.ok(afterIds.length > transcriptBefore.length, "the parent turn itself did render");
  assert.deepEqual(await history("thread/read", child.id), [], "a sub-agent turn/completed never triggers a session refresh for the child");
  checks.push("A spawned sub-agent thread (thread/started with parentThreadId) keeps its own event bucket: no sidebar row, no item in the parent transcript and no thread/read refresh for the child");

  // 10. Deprecated RPCs stay unreachable from the renderer. The fixture logs
  // every request it cannot handle, so "never reached the server" is falsifiable;
  // the control below proves that detector fires on a call that does get through.
  metrics.rollback = await page.evaluate(() => window.desktop.call("rpc", { method: "thread/rollback", params: { threadId: "p0155-rollback-probe", numTurns: 1 } }).then(() => null, error => error.message));
  assert.match(metrics.rollback, /deprecated in Codex 0\.155\.1/, "thread/rollback is refused with its deprecation reason");
  assert.deepEqual(await history(null, "p0155-rollback-probe"), [], "the refused call never reached the server");
  // Control: account/rateLimits/read now has a real-shaped handler for slash Usage
  // (0.155.1 GetAccountRateLimitsResponse). It MUST still log receipt through
  // the same detector; only its former unknownMethod flag changes.
  metrics.rollbackControl = await page.evaluate(() => window.desktop.call("rpc", { method: "account/rateLimits/read", params: { threadId: "p0155-rollback-control" } }).then(() => "resolved", error => error.message));
  const controlEntries = await history(null, "p0155-rollback-control");
  metrics.rollbackControlEntries = controlEntries.map(entry => ({ method: entry.method, unknownMethod: !!entry.unknownMethod }));
  assert.deepEqual(metrics.rollbackControlEntries, [{ method: "account/rateLimits/read", unknownMethod: false }],
    "the control call did reach the app-server and was logged, so the rollback assertion above can fail");
  checks.push("thread/rollback is refused in the main process with its 0.155.1 deprecation reason (thread/revert replaces it) and never reaches the app-server, while an allowlisted control call on the same probe id does reach it and is logged");

  // 11. An archived session whose stored metadata predates historyMode still
  // renders: request shape and hydration branch come from one decision.
  await open(OLDMETA, "old-a1");
  const oldReads = await history("thread/read", OLDMETA);
  metrics.unknownModeReads = oldReads.map(entry => ({ includeTurns: !!entry.params.includeTurns, historyMode: entry.historyMode }));
  assert.ok(oldReads.length >= 1, "the archived pre-0.155 session is read");
  assert.deepEqual(oldReads.filter(entry => entry.params.includeTurns), [], "an unknown historyMode takes the paginated request shape");
  assert.equal(oldReads.at(-1).historyMode, "legacy", "while the server reports this thread as legacy");
  assert.ok((await history("thread/turns/list", OLDMETA)).length >= 1, "it is hydrated through the pager the request asked for");
  assert.deepEqual(await transcriptIds(), ["old-u1", "old-a1"], "the transcript is not silently blank");
  checks.push("An archived session whose local metadata carries no historyMode (persisted by 0.153.4) is requested with includeTurns:false and hydrated through thread/turns/list even though the server reports historyMode 'legacy': the transcript renders instead of going blank");

  // 12. A thread created now is paginated, and reopening it stays on the
  // paginated route: the route comes from the Thread the client just stored.
  await page.getByRole("button", { name: "New", exact: true }).click();
  await send("fixture:complete");
  await poll(async () => (await page.locator("[data-transcript-item-id]").allTextContents()).some(text => text.includes("Fixture response")), "the new session answers");
  const created = (await history("thread/start")).at(-1);
  metrics.createdThread = { threadId: created?.params?.threadId, historyMode: created?.historyMode };
  assert.equal(metrics.createdThread.historyMode, "paginated", "a thread created now uses the 0.155.1 paginated contract");
  const createdId = metrics.createdThread.threadId;
  await open(PAG, "pag-a4b");
  await open(createdId, `reply-${(await readThreads()).threads[createdId].turns.at(-1).id}`);
  const createdResume = (await history("thread/resume", createdId)).at(-1);
  metrics.createdResume = createdResume.params;
  assert.equal(createdResume.params.excludeTurns, true, "reopening a freshly created paginated thread excludes turns");
  assert.deepEqual(createdResume.params.initialTurnsPage, { limit: 25, sortDirection: "desc", itemsView: "full" });
  assert.deepEqual(await history("thread/read", createdId).then(entries => entries.filter(entry => entry.params.includeTurns)), [],
    "and never reads it in full");
  assert.ok((await transcriptIds()).length >= 2, "the reopened transcript is hydrated");
  checks.push("A session created in this run is a paginated thread (real 0.155.1 behaviour) and reopening it resumes with excludeTurns:true + initialTurnsPage, with no full-history read");

  // 13. A review sub-agent is classified by Thread.source, not parentThreadId.
  await open(PAG, "pag-a4b");
  const sidebarBeforeReview = await page.locator("[data-source-session-id]").count();
  await send("fixture:subagent-review");
  await poll(async () => (await page.locator("[data-transcript-item-id]").allTextContents()).some(text => text.includes("REVIEW_SUBAGENT_FIXTURE_REPLY")), "the review sub-agent turn completes");
  const review = Object.values((await readThreads()).threads).find(entry => entry.source?.subAgent === "review");
  assert.ok(review, "the fixture really created a review sub-agent thread");
  metrics.reviewSubagent = { id: review.id, source: review.source, parentThreadId: review.parentThreadId };
  assert.equal(review.parentThreadId, null, "a review sub-agent carries no parentThreadId, exactly like the three on this machine");
  assert.equal(await page.locator(`[data-source-session-id="${review.id}"]`).count(), 0, "a review sub-agent is never a sidebar session");
  assert.equal(await page.locator("[data-source-session-id]").count(), sidebarBeforeReview, "the sidebar gained no row");
  assert.deepEqual(await history("thread/read", review.id), [], "and its turn/completed triggers no session refresh");
  checks.push("A sub-agent classified only by Thread.source {subAgent:'review'} (parentThreadId null, as the app-server reports for real review threads) is excluded from the sidebar and from thread/read refreshes");

  // 14. A sub-agent's approval is answerable from the session that owns it.
  await send("fixture:subagent-approval");
  const card = page.locator("[data-approval-card-root]").first();
  await card.waitFor();
  const approvalChild = Object.values((await readThreads()).threads).filter(entry => entry.parentThreadId === PAG).at(-1);
  assert.ok(approvalChild, "the fixture really created the sub-agent that asks for approval");
  metrics.subagentApproval = { childThreadId: approvalChild.id, rendered: (await card.textContent())?.includes("SUBAGENT_APPROVAL_FIXTURE") };
  assert.equal(metrics.subagentApproval.rendered, true, "the sub-agent's request is rendered in the owning session");
  // Allow buttons carry a real 400ms activation grace (approval-actions Xo),
  // so the click has to wait it out exactly as the other approval suites do.
  await page.waitForTimeout(450);
  await card.locator('[data-approval-action="accept"]').click();
  // A distinct reply string: the plain sub-agent check above already left
  // SUBAGENT_FIXTURE_REPLY in this thread's history.
  await poll(async () => (await page.locator("[data-transcript-item-id]").allTextContents()).some(text => text.includes("SUBAGENT_APPROVAL_FIXTURE_REPLY")), "the sub-agent turn is released by the answer");
  const answered = JSON.parse((await fs.readFile(path.join(profile, "fixture-responses.jsonl"), "utf8")).split("\n").filter(Boolean).at(-1));
  metrics.subagentApproval.decision = answered.result?.decision;
  assert.equal(metrics.subagentApproval.decision, "accept", "the answer really reached the server as an approval decision");
  checks.push("An approval raised on a sub-agent threadId is shown in, and answerable from, the session that owns that sub-agent, so the sub-agent turn is not blocked behind an empty screen");

  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "protocol-0155-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "protocol-0155-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
