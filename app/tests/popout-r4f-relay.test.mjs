import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { panePromptKind, composerHasDraft, createPaneComposerRegistry, paneComposers, relayPanePrompt } from "../src/popout-r4f-relay.mjs";
import { promptAdditions } from "../src/inline-comments.mjs";

// R4f-popout F3 (layout-04): a popped-out pane's Add to prompt follows 2.42304.0's bridged composer relay
// (c03935b01 zo `r`): over a draft it asks WindowState.getOnScreen, and off screen the window comes forward
// (shared-6 Jk WindowControl show + focus); a session no side shows opens raised; a Terminal selection
// (attachContextToChat) never raises.
const require = createRequire(import.meta.url);
const { windowOnScreen, raiseWindow } = require("../electron/popout-r4f-window.cjs");
const ROOT = path.resolve(import.meta.dirname, "..");
const reference = path.resolve(ROOT, "../reference/installed-2.42304.0-20261017");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const count = (text, needle) => text.split(needle).length - 1;

function fakeWindow({ visible = true, minimized = false, destroyed = false } = {}) {
  const calls = [];
  return { calls, isDestroyed: () => destroyed, isVisible: () => visible, isMinimized: () => minimized,
    restore() { calls.push("restore"); minimized = false; }, show() { calls.push("show"); visible = true; }, focus() { calls.push("focus"); },
    hide() { visible = false; }, minimize() { minimized = true; } };
}

// A controlled host: which session a side shows, that composer's draft, and the window question / raise.
function host({ shown = true, draft = null, onScreen = true, fail = false, lacks = false } = {}) {
  const log = [];
  let answer = null;
  const value = {
    log, shownNow: shown, draftNow: draft, lacksNow: lacks,
    shown: () => value.shownNow,
    draft: () => value.draftNow,
    lacksMessageBox: () => value.lacksNow,
    write: (sessionId, text, meta) => { log.push(["write", sessionId, text, meta ?? null]); return true; },
    open: (sessionId) => { log.push(["open", sessionId]); },
    raise: () => { log.push(["raise"]); },
    getOnScreen: () => { log.push(["getOnScreen"]); return new Promise((resolve, reject) => { answer = () => (fail ? reject(new Error("no window")) : resolve(onScreen)); }); },
    answer: () => answer?.(),
  };
  return value;
}
const comment = (text = "In a.js, line 3:\n> x\nfix this") => ({ kind: "add-to-prompt", sessionId: "s1", text });
const selection = { kind: "add-to-prompt", sessionId: "s1", text: "$ ls\nREADME", meta: { label: "Terminal 2", terminalTabId: "tab-2" } };

test("2.42304.0 anchors: the relay, its draft check, the window question and the raise (renderer and main process)", () => {
  const v1 = (file) => fs.readFileSync(path.join(reference, "ion-dist/assets/v1", file), "utf8");
  const build = (file) => fs.readFileSync(path.join(reference, "asar/.vite/build", file), "utf8");
  const store = v1("c03935b01-CyJKQj4N.js");
  for (const needle of [
    "te?.getOnScreen?.()",
    "if(o)return!0;let c=t=>{let r=t.getState()[e];r(...n)}",
    "(i(n),Le())",
    "Y(s,{raise:i!==void 0})",
    "d.then(f,()=>f(!1))",
    "t.currentSessionId===a&&!t.lacksMessageBox&&l(e)",
    "return t!==void 0&&(t.text.trim()!==\"\"||t.hasAttachments)",
    "r(\"setPendingComposerSeed\",[e],a,Ns(e))",
    "r(\"submitToChat\",[e],a,Ns(e))",
    "attachContextToChat:(e,n,r,s,c)=>{if(a().lacksMessageBox)return;",
    "s===void 0&&l===a().currentSessionId&&l!==\"landing\"&&Y?.(l)",
    "function la(e){return e.kind!==\"popout\"||e.composer!==\"bridged\"}",
    "Ha as Le",
    "Wm as te",
  ]) assert.equal(count(store, needle), 1, needle);
  assert.equal(count(v1("shared-0-ByI5P0CP.js"), "ex=globalThis[\"claude.web\"]?.WindowState"), 1);
  assert.equal(count(v1("shared-0-ByI5P0CP.js"), "Ub=globalThis[\"claude.web\"]?.WindowControl"), 1);
  assert.equal(count(v1("shared-6-Cby4X-ms.js"), "function Jk(){wt?.show?.(),wt?.focus?.()}"), 1);
  assert.equal(count(v1("cd377abb5-D8AWfngM.js"), "r?.raise&&Se()"), 1);
  assert.equal(count(v1("c5638815a-D1NXo6h5.js"), "M?.setState({lacksMessageBox:N})"), 1);
  const main = build("index.chunk-muI2IV6k.js");
  assert.equal(count(main, "getOnScreen:()=>!t.isDestroyed()&&t.isVisible()&&!t.isMinimized()"), 1);
  assert.equal(count(main, "show(){!e||e.isDestroyed()||(GW(e),e.isMinimized()&&e.restore(),e.show())}"), 1);
  assert.equal(count(main, "focus(){!e||e.isDestroyed()||(GW(e),e.focus())}"), 1);
  assert.equal(count(build("mainView.js"), "getOnScreen(){return e.ipcRenderer.invoke(k+\"WindowState_$_getOnScreen\")}"), 1);
});

test("windowOnScreen is WindowState.getOnScreen: visible and not minimized; a closed window is not on screen", () => {
  assert.equal(windowOnScreen(fakeWindow()), true);
  assert.equal(windowOnScreen(fakeWindow({ minimized: true })), false);
  assert.equal(windowOnScreen(fakeWindow({ visible: false })), false, "hidden by its close button");
  assert.equal(windowOnScreen(fakeWindow({ destroyed: true })), false);
  assert.equal(windowOnScreen(null), false);
});

test("raiseWindow is WindowControl show() then focus(): a minimized window is restored first", () => {
  const minimized = fakeWindow({ minimized: true });
  assert.equal(raiseWindow(minimized), true);
  assert.deepEqual(minimized.calls, ["restore", "show", "focus"]);
  assert.equal(windowOnScreen(minimized), true);
  const hidden = fakeWindow({ visible: false });
  raiseWindow(hidden);
  assert.deepEqual(hidden.calls, ["show", "focus"]);
  const visible = fakeWindow();
  raiseWindow(visible);
  assert.deepEqual(visible.calls, ["show", "focus"]);
  const gone = fakeWindow({ destroyed: true });
  assert.equal(raiseWindow(gone), false);
  assert.deepEqual(gone.calls, []);
  assert.equal(raiseWindow(null), false);
});

test("panePromptKind and composerHasDraft: a Terminal selection is attachContextToChat; Vo is text or attachments", () => {
  assert.equal(panePromptKind(comment()), "seed");
  assert.equal(panePromptKind(selection), "context");
  assert.equal(panePromptKind({ ...selection, meta: { terminalTabId: "t" } }), "context");
  assert.equal(panePromptKind({ ...selection, meta: {} }), "seed");
  assert.equal(composerHasDraft({ text: " draft ", attachments: [] }), true);
  assert.equal(composerHasDraft({ text: "  \n", attachments: [{ kind: "snippet" }] }), true);
  assert.equal(composerHasDraft({ text: "", hasAttachments: true }), true);
  assert.equal(composerHasDraft({ text: "   ", attachments: [] }), false);
  assert.equal(composerHasDraft(undefined), false);
});

test("a comment into a composer with no draft is written at once: no window question, no raise (c(n))", async () => {
  const h = host({ draft: { text: "", attachments: [] }, onScreen: false });
  const result = relayPanePrompt(comment(), h);
  assert.equal(result.handled, true);
  assert.equal(await result.done, "written");
  assert.deepEqual(h.log, [["write", "s1", "In a.js, line 3:\n> x\nfix this", null]]);
});

test("a comment over a draft waits for the window question; on screen it is written and nothing is raised", async () => {
  const h = host({ draft: { text: "my draft", attachments: [] }, onScreen: true });
  const result = relayPanePrompt(comment(), h);
  assert.deepEqual(h.log, [["getOnScreen"]], "the write waits for the answer (d.then(f))");
  h.answer();
  assert.equal(await result.done, "written");
  assert.deepEqual(h.log.map(([kind]) => kind), ["getOnScreen", "write"]);
});

test("a comment over a draft in a window off screen is written, then the window is raised ((i(n),Le()))", async () => {
  const h = host({ draft: { text: "my draft", attachments: [] }, onScreen: false });
  const result = relayPanePrompt(comment(), h);
  h.answer();
  assert.equal(await result.done, "raised");
  assert.deepEqual(h.log.map(([kind]) => kind), ["getOnScreen", "write", "raise"]);
  // Only attachments in the composer count as a draft, and a failed question counts as off screen (()=>f(!1)).
  const failed = host({ draft: { text: "", attachments: [{ kind: "image" }] }, fail: true });
  const second = relayPanePrompt(comment(), failed);
  failed.answer();
  assert.equal(await second.done, "raised");
  assert.deepEqual(failed.log.map(([kind]) => kind), ["getOnScreen", "write", "raise"]);
});

test("a session no side shows is queued and opened in a window brought forward (Y(s,{raise:!0})), unasked", async () => {
  const h = host({ shown: false, draft: { text: "other session draft", attachments: [] } });
  assert.equal(await relayPanePrompt(comment(), h).done, "opened-raised");
  assert.deepEqual(h.log.map(([kind]) => kind), ["write", "open", "raise"]);
  // The side switched away while the question was out: l(e) looks again and opens it.
  const moved = host({ draft: { text: "draft", attachments: [] }, onScreen: true });
  const result = relayPanePrompt(comment(), moved);
  moved.shownNow = false;
  moved.answer();
  assert.equal(await result.done, "opened-raised");
  assert.deepEqual(moved.log.map(([kind]) => kind), ["getOnScreen", "write", "open", "raise"]);
});

test("a Terminal selection is attachContextToChat: written or opened, never asked about or raised", async () => {
  const offscreen = host({ draft: { text: "draft", attachments: [] }, onScreen: false });
  assert.equal(await relayPanePrompt(selection, offscreen).done, "written");
  assert.deepEqual(offscreen.log, [["write", "s1", "$ ls\nREADME", { label: "Terminal 2", terminalTabId: "tab-2" }]]);
  const elsewhere = host({ shown: false });
  assert.equal(await relayPanePrompt(selection, elsewhere).done, "opened");
  assert.deepEqual(elsewhere.log.map(([kind]) => kind), ["write", "open"]);
});

test("lacksMessageBox drops the write (if(o)return!0), also when it turns true during the question; nothing to write is not relayed", async () => {
  const lacking = host({ lacks: true });
  const dropped = relayPanePrompt(comment(), lacking);
  assert.equal(dropped.handled, true);
  assert.equal(await dropped.done, "dropped");
  assert.equal(await relayPanePrompt(selection, lacking).done, "dropped");
  assert.deepEqual(lacking.log, []);
  const later = host({ draft: { text: "draft", attachments: [] }, onScreen: false });
  const result = relayPanePrompt(comment(), later);
  later.lacksNow = true;
  later.answer();
  assert.equal(await result.done, "dropped");
  assert.deepEqual(later.log, [["getOnScreen"]]);
  const quiet = host();
  assert.equal(relayPanePrompt({ ...comment(), text: "   " }, quiet).handled, false);
  assert.equal(relayPanePrompt({ ...comment(), sessionId: "" }, quiet).handled, false);
  assert.equal(relayPanePrompt(null, quiet).handled, false);
  assert.deepEqual(quiet.log, []);
  // Without the window question (no WindowState) the draft case writes as on screen (if(!d)return l(!0)).
  const bare = host({ draft: { text: "draft", attachments: [] } });
  delete bare.getOnScreen;
  assert.equal(await relayPanePrompt(comment(), bare).done, "written");
});

test("the composer registry (Bo/Uo): by session, newest registration answers, unregister restores the previous one", () => {
  const registry = createPaneComposerRegistry();
  const offA = registry.register("s1", () => ({ text: "a", attachments: [] }));
  const offB = registry.register("s1", () => ({ text: "b", attachments: [] }));
  assert.equal(registry.has("s1"), true);
  assert.equal(registry.draft("s1").text, "b");
  offB();
  assert.equal(registry.draft("s1").text, "a");
  offA();
  assert.equal(registry.has("s1"), false);
  assert.equal(registry.draft("s1"), undefined);
  assert.equal(typeof registry.register(null, () => ({})), "function", "Home (no session) registers nothing");
  assert.equal(registry.has("null"), false);
});

test("controlled run: a minimized main window takes a comment over its draft and is restored, shown and focused", async () => {
  const window = fakeWindow({ minimized: true });
  const live = { text: "half-written prompt", attachments: [] };
  const off = paneComposers.register("r4f-s1", () => live);
  const taken = [];
  // The side showing the session takes the queued text (main.jsx take: makeSnippet → addSnippet, then focus).
  const unsubscribe = promptAdditions.subscribe((sessionId) => { if (sessionId === "r4f-s1") taken.push(...promptAdditions.takeEntries(sessionId)); });
  try {
    const result = relayPanePrompt({ kind: "add-to-prompt", sessionId: "r4f-s1", text: "Plan comment" }, {
      shown: (id) => id === "r4f-s1", draft: paneComposers.draft, write: (id, text, meta) => promptAdditions.queue(id, text, meta),
      open: () => assert.fail("shown: nothing to open"),
      // main.cjs window-on-screen / window-raise for the asking window.
      getOnScreen: () => Promise.resolve(windowOnScreen(window)), raise: () => { raiseWindow(window); } });
    assert.equal(await result.done, "raised");
    assert.deepEqual(taken, [{ text: "Plan comment" }]);
    assert.deepEqual(window.calls, ["restore", "show", "focus"]);
    assert.equal(live.text, "half-written prompt", "the draft is kept beside the new snippet");
    // The same window on screen: written, not raised again.
    const before = window.calls.length;
    const again = relayPanePrompt({ kind: "add-to-prompt", sessionId: "r4f-s1", text: "Second" }, {
      shown: () => true, draft: paneComposers.draft, write: (id, text, meta) => promptAdditions.queue(id, text, meta),
      getOnScreen: () => Promise.resolve(windowOnScreen(window)), raise: () => { raiseWindow(window); } });
    assert.equal(await again.done, "written");
    assert.equal(window.calls.length, before);
    assert.deepEqual(taken.map((entry) => entry.text), ["Plan comment", "Second"]);
  } finally { unsubscribe(); off(); }
});

test("wiring: main.cjs answers window-on-screen / window-raise for the asking main window; main.jsx relays through the module", () => {
  const electron = read("electron/main.cjs");
  assert.equal(count(electron, 'const { windowOnScreen, raiseWindow } = require("./popout-r4f-window.cjs");'), 1);
  assert.equal(count(electron, 'case "window-on-screen": return windowOnScreen(windowRegistry.windowForSender(e.sender));'), 1);
  assert.equal(count(electron, 'case "window-raise": return raiseWindow(windowRegistry.windowForSender(e.sender));'), 1);
  // Pane windows cannot ask: only a main window's own renderer (validSender "primary").
  const actions = new Set(JSON.parse(electron.match(/const POPOUT_ACTIONS = new Set\((\[[^\]]*\])\)/)[1]));
  assert.equal(actions.has("window-on-screen"), false);
  assert.equal(actions.has("window-raise"), false);
  const main = read("src/main.jsx");
  assert.equal(count(main, 'import { paneComposers, relayPanePrompt } from "./popout-r4f-relay.mjs";'), 1);
  assert.match(main, /e\.kind === "add-to-prompt" && side === 0[\s\S]{0,120}\{\n\s+relayPanePrompt\(e, \{ shown: \(id\) => splitStore\.isShown\(id\) \|\| currentRef\.current === id, draft: paneComposers\.draft,/);
  assert.match(main, /getOnScreen: \(\) => call\("window-on-screen"\), raise: \(\) => \{ call\("window-raise"\)\.catch\(\(\) => \{\}\); \} \}\)\n\s+\.done\.catch\(/);
  assert.doesNotMatch(main, /promptAdditions\.queue\(e\.sessionId, e\.text, e\.meta\)/, "the old direct queue is gone");
  // Each composer side registers its live draft for the session it shows; a pane window has no composer.
  assert.match(main, /const unregister = PANE_WINDOW \? \(\) => \{\} : paneComposers\.register\(current, \(\) => liveComposer\.current\);\n\s+return \(\) => \{ unsubscribe\(\); unregister\(\); \};\n\s+\}, \[current\]\);/);
  assert.match(main, /liveComposer\.current = \{ text: draft, attachments, mentions \};/);
});
