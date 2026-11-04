import test from "node:test";
import assert from "node:assert/strict";
import { createFileSearchController, isPlainSearchKey, isRelativeFilePath,
  resultNavigation, revealRelation, searchLimitMessage } from "../src/files-search-model.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness({ sessionId = "session-a", pane = "main" } = {}) {
  let time = 0, timerId = 0;
  const timers = new Map(), calls = [], cancels = [], states = [], opened = [];
  const controller = createFileSearchController({ sessionId, pane, workspaceRoot: "/project/a",
    search(request) { const promise = deferred(); calls.push({ request, ...promise }); return promise.promise; },
    cancel: request => { cancels.push(request); }, onState: state => states.push(state), onActivate: entry => opened.push(entry.path),
    setTimer(fn, delay) { const id = ++timerId; timers.set(id, { at: time + delay, fn }); return id; },
    clearTimer: id => timers.delete(id),
  });
  function advance(ms) {
    time += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); }
  }
  function resolve(index, paths, overrides = {}) {
    const { request } = calls[index];
    calls[index].resolve({ ...request, requestedRoot: "/project/a", root: "/canonical/a", source: "git",
      matches: paths.map(path => ({ path, name: path.split("/").at(-1), directory: false, positions: [0] })),
      complete: true, truncated: false, truncationReasons: [], warnings: [], error: null, ...overrides });
  }
  return { controller, calls, cancels, states, opened, advance, resolve, timers };
}

test("120ms debounce sends only the latest query and has no renderer root/scope", async () => {
  const h = harness();
  h.controller.setQuery("rea"); h.advance(119); await flush(); assert.equal(h.calls.length, 0);
  h.controller.setQuery("read"); h.advance(119); await flush(); assert.equal(h.calls.length, 0);
  h.advance(1); await flush(); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].request.query, "read");
  assert.deepEqual(Object.keys(h.calls[0].request).sort(), ["pane", "query", "requestId", "sessionId"]);
  h.controller.dispose();
});

test("main and artifacts transports carry matching fixed pane identity through cancellation", async () => {
  const main = harness(), artifacts = harness({ pane: "artifacts" });
  for (const h of [main, artifacts]) { h.controller.setQuery("file"); h.advance(120); }
  await flush();
  assert.equal(main.calls[0].request.pane, "main"); assert.equal(artifacts.calls[0].request.pane, "artifacts");
  assert.notEqual(main.calls[0].request.requestId, artifacts.calls[0].request.requestId);
  artifacts.controller.dispose(); assert.equal(artifacts.cancels[0].pane, "artifacts"); assert.equal(main.cancels.length, 0);
  main.resolve(0, ["file.txt"]); await flush(); assert.equal(main.controller.getState().phase, "success"); main.controller.dispose();
  assert.throws(() => harness({ pane: "arbitrary" }), /Unsupported/);
});

test("home passes a known-folder selection separately from session identity and validates its cwd echo", async () => {
  const h = harness({ sessionId: null });
  h.controller.setQuery("readme"); h.advance(120); await flush();
  assert.equal(h.calls[0].request.sessionId, null);
  assert.equal(h.calls[0].request.homeWorkspace, "/project/a");
  h.resolve(0, ["README.md"]); await flush();
  assert.equal(h.controller.getState().phase, "success"); h.controller.dispose();
});

test("late cancelled results never overwrite the new query or activate it", async () => {
  const h = harness();
  h.controller.setQuery("alpha"); h.advance(120); await flush(); h.controller.requestEnter();
  h.controller.setQuery("beta"); h.advance(120); await flush();
  assert.equal(h.cancels[0].requestId, h.calls[0].request.requestId);
  h.resolve(1, ["beta.txt"]); await flush();
  h.resolve(0, ["alpha.txt"]); await flush();
  assert.equal(h.controller.getState().matchedQuery, "beta");
  assert.deepEqual(h.controller.getState().matches.map(match => match.path), ["beta.txt"]);
  assert.deepEqual(h.opened, []);
  h.controller.dispose();
});

test("pending Enter keeps old rows visible but opens only the stable new first result", async () => {
  const h = harness();
  h.controller.setQuery("old"); h.advance(120); await flush(); h.resolve(0, ["old.txt"]); await flush();
  h.controller.setQuery("new"); h.controller.requestEnter();
  assert.equal(h.controller.getState().matches[0].path, "old.txt"); assert.deepEqual(h.opened, []);
  h.advance(120); await flush(); h.resolve(1, ["new.txt", "newer.txt"]); await flush();
  assert.deepEqual(h.opened, ["new.txt"]);
  h.controller.requestEnter(); assert.deepEqual(h.opened, ["new.txt", "new.txt"]);
  h.controller.dispose();
});

test("blur/pointer intent cancels pending Enter, including empty successful results", async () => {
  const h = harness();
  h.controller.setQuery("missing"); h.controller.requestEnter(); h.controller.cancelEnter();
  h.advance(120); await flush(); h.resolve(0, ["missing.txt"]); await flush(); assert.deepEqual(h.opened, []);
  h.controller.setQuery("empty"); h.controller.requestEnter(); h.advance(120); await flush(); h.resolve(1, []); await flush();
  assert.equal(h.controller.getState().phase, "success"); assert.deepEqual(h.opened, []);
  h.controller.dispose();
});

test("current errors do not open retained rows and explicit retry can recover", async () => {
  const h = harness();
  h.controller.setQuery("file"); h.advance(120); await flush(); h.resolve(0, ["file.txt"]); await flush();
  h.controller.setQuery("bad"); h.controller.requestEnter(); h.advance(120); await flush();
  h.resolve(1, [], { error: { code: "SEARCH_FAILED", message: "Search failed." } }); await flush();
  assert.equal(h.controller.getState().phase, "error"); assert.equal(h.controller.requestEnter(), false); assert.deepEqual(h.opened, []);
  h.controller.refresh(); h.advance(120); await flush(); h.resolve(2, []); await flush();
  assert.equal(h.controller.getState().phase, "success"); h.controller.dispose();
});

test("clear cancels a request and clears retained rows immediately", async () => {
  const h = harness();
  h.controller.setQuery("file"); h.advance(120); await flush();
  h.controller.setQuery(""); assert.equal(h.controller.getState().phase, "idle"); assert.deepEqual(h.controller.getState().matches, []);
  h.resolve(0, ["file.txt"]); await flush(); assert.equal(h.controller.getState().phase, "idle");
  assert.equal(h.cancels.length, 1); h.controller.dispose();
});

test("hidden pane pauses, cancels pending activation, and reissues the retained query on show", async () => {
  const h = harness();
  h.controller.setQuery("file"); h.advance(120); await flush(); h.controller.requestEnter();
  h.controller.setEnabled(false); h.resolve(0, ["file.txt"]); await flush();
  assert.equal(h.controller.getState().phase, "paused"); assert.deepEqual(h.opened, []);
  h.controller.setEnabled(true); h.advance(120); await flush(); assert.equal(h.calls.length, 2);
  h.resolve(1, ["file.txt"]); await flush(); assert.equal(h.controller.getState().phase, "success"); assert.deepEqual(h.opened, []);
  h.controller.dispose();
});

test("dispose covers both in-flight completion and timer-to-microtask startup race", async () => {
  const first = harness(); first.controller.setQuery("file"); first.advance(120); first.controller.dispose(); await flush();
  assert.equal(first.calls.length, 0);
  const second = harness(); second.controller.setQuery("file"); second.advance(120); await flush();
  second.controller.dispose(); const published = second.states.length; second.resolve(0, ["file.txt"]); await flush();
  assert.equal(second.states.length, published); assert.deepEqual(second.opened, []); assert.equal(second.cancels.length, 1);
});

test("rejects wrong request/workspace/query envelopes, unsafe paths and directory entries", async () => {
  for (const bad of [
    { requestId: "wrong" }, { requestedRoot: "/project/b" }, { query: "other" },
    { matches: [{ path: "../escape", name: "escape", directory: false }] },
    { matches: [{ path: "folder", name: "folder", directory: true }] },
  ]) {
    const h = harness(); h.controller.setQuery("file"); h.controller.requestEnter(); h.advance(120); await flush();
    h.resolve(0, ["file.txt"], bad); await flush();
    assert.equal(h.controller.getState().phase, "error"); assert.deepEqual(h.opened, []); h.controller.dispose();
  }
});

// B33 (cccc2cf0a Fv): a filter ending in '/' asks main for folder rows and accepts them; Enter on a folder
// result activates it like a click (the pane reveals the folder in the tree).
test("a trailing-slash filter carries folders and accepts folder rows; other filters still reject them", async () => {
  const h = harness();
  h.controller.setQuery("src/"); h.controller.requestEnter(); h.advance(120); await flush();
  assert.equal(h.calls[0].request.folders, true);
  h.resolve(0, [], { matches: [{ path: "src/main", name: "main", directory: true, positions: [0] },
    { path: "src/a.js", name: "a.js", directory: false, positions: [0] }] }); await flush();
  assert.equal(h.controller.getState().phase, "success");
  assert.deepEqual(h.controller.getState().matches.map(match => match.directory), [true, false]);
  assert.deepEqual(h.opened, ["src/main"]);
  h.controller.dispose();
  const content = harness(); content.controller.setQuery("?src/"); content.advance(250); await flush();
  assert.equal(content.calls[0].request.folders, undefined);
  content.controller.dispose();
});

test("UI cap is 50 and reports truncation without claiming a complete search", async () => {
  const h = harness(); h.controller.setQuery("f"); h.advance(120); await flush();
  h.resolve(0, Array.from({ length: 51 }, (_, i) => `file-${i}.txt`)); await flush();
  const state = h.controller.getState();
  assert.equal(state.matches.length, 50); assert.equal(state.truncated, true); assert.equal(state.complete, false);
  assert.deepEqual(state.truncationReasons, ["result-limit"]); h.controller.dispose();
});

test("cancelled service result is quiet and a later Enter can retry current query", async () => {
  const h = harness(); h.controller.setQuery("file"); h.advance(120); await flush();
  h.resolve(0, [], { error: { code: "SUPERSEDED", message: "obsolete" } }); await flush();
  assert.equal(h.controller.getState().error, null); assert.equal(h.controller.getState().phase, "cancelled");
  h.controller.requestEnter(); h.advance(120); await flush(); h.resolve(1, ["file.txt"]); await flush();
  assert.deepEqual(h.opened, ["file.txt"]); h.controller.dispose();
});

test("keyboard boundaries, modifiers and IME preserve input/navigation intent", () => {
  assert.equal(resultNavigation("ArrowUp", 0, 3), "input");
  assert.equal(resultNavigation("ArrowUp", 0, 3, false), 0);
  assert.equal(resultNavigation("ArrowDown", 2, 3), 2); assert.equal(resultNavigation("End", 0, 3), 2);
  assert.equal(resultNavigation("ArrowRight", 0, 3), 1); assert.equal(resultNavigation("ArrowRight", -1, 3), null);
  assert.equal(resultNavigation("Home", 2, 3), 0); assert.equal(resultNavigation("ArrowDown", 0, 0), null);
  assert.equal(isPlainSearchKey({}), true);
  for (const event of [{ shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { keyCode: 229 }, { nativeEvent: { isComposing: true } }])
    assert.equal(isPlainSearchKey(event), false);
});

// W14-code r8 gen-final-8: the host pathSegments is gone; r8pa-01 hit marks are the generated SessionsHighlight
// (c1ea8a271 r, imported by cccc2cf0a as gl).
test("the host path highlighter is gone (hits are the generated SessionsHighlight)", async () => {
  assert.equal((await import("../src/files-search-model.mjs")).pathSegments, undefined);
});

test("follow reveal expands only actual path ancestors and never a prefix sibling", () => {
  assert.equal(revealRelation({ path: "src", directory: true }, "src/deep/file.js"), "ancestor");
  assert.equal(revealRelation({ path: "src/deep", directory: true }, "src/deep/file.js"), "ancestor");
  assert.equal(revealRelation({ path: "src/deep/file.js", directory: false }, "src/deep/file.js"), "target");
  assert.equal(revealRelation({ path: "src", directory: true }, "src2/file.js"), null);
  assert.equal(revealRelation({ path: "src", directory: true }, "src/../file.js"), null);
  assert.equal(isRelativeFilePath("<tag>/😀.txt"), true); assert.equal(isRelativeFilePath("line\nfeed.txt"), true);
  assert.equal(isRelativeFilePath("/absolute"), false);
});

// 3.6556.2 cccc2cf0a _T: one cap note (F8ftTrFYrH, the shown count) for every cut of a local filename search.
test("limit message is the one _T cap note with the shown count, whatever cut the search", () => {
  const rows = Array.from({ length: 50 }, () => ({}));
  for (const truncationReasons of [["result-limit"], ["directory-limit", "candidate-limit"], ["result-limit", "index-byte-limit"], ["result-output-limit"], ["future-limit"]])
    assert.equal(searchLimitMessage({ matches: rows, truncationReasons }), "Only the first 50 results are shown. Keep typing to narrow.");
  assert.equal(searchLimitMessage({ matches: [{}], truncationReasons: ["result-limit"] }),
    "Only the first 1 result is shown. Keep typing to narrow.");
});

test('content mode uses 250ms debounce, carries options, invalidates stale requests and opens line context',async()=>{
 const h=harness();h.controller.setQuery('?');h.advance(500);await flush();assert.equal(h.calls.length,0);
 h.controller.setQuery('?needle');h.advance(249);await flush();assert.equal(h.calls.length,0);h.advance(1);await flush();assert.equal(h.calls[0].request.mode,'content');
 h.controller.setOptions({matchCase:true,wholeWord:true,regexp:false});h.advance(250);await flush();assert.equal(h.calls[1].request.options.matchCase,true);
 const matches=[{path:'a.txt',name:'a.txt',directory:false,line:3,column:2,preview:' needle',ranges:[[1,7]]},{path:'a.txt',name:'a.txt',directory:false,line:8,column:1,preview:'needle',ranges:[[0,6]]}];
 h.resolve(1,[],{matches});await flush();assert.equal(h.controller.getState().matches.length,2);assert.equal(h.controller.getState().matches[0].findQuery,'needle');assert.equal(h.controller.getState().matches[0].findOptions.wholeWord,true);
 h.resolve(0,[],{error:{code:'INVALID_PATTERN',message:'old'}});await flush();assert.equal(h.controller.getState().phase,'success');
 h.controller.requestEnter();assert.deepEqual(h.opened,['a.txt']);h.controller.setQuery('a');assert.deepEqual(h.controller.getState().matches,[]);h.controller.dispose();
});

// B32 ko "Reveal in file tree" on a breadcrumb folder: revealInFilesTree(`${dir}/`).
test('B32 a folder reveal targets that folder row and expands only its ancestors', () => {
  assert.equal(revealRelation({ path: 'src/deep', directory: true }, 'src/deep/'), 'target');
  assert.equal(revealRelation({ path: 'src', directory: true }, 'src/deep/'), 'ancestor');
  assert.equal(revealRelation({ path: 'src/deep/x', directory: true }, 'src/deep/'), null);
  assert.equal(revealRelation({ path: 'src/deep', directory: false }, 'src/deep/'), null);
  assert.equal(revealRelation({ path: 'src', directory: true }, '../x/'), null);
});
test('B32 a folder reveal asks each listing for the next folder on its way', async () => {
  const { revealChild } = await import('../src/files-search-model.mjs');
  assert.equal(revealChild('', 'src/deep/'), 'src');
  assert.equal(revealChild('src', 'src/deep/'), 'deep');
  assert.equal(revealChild('src/deep', 'src/deep/'), undefined);
});
