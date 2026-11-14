import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// The terminal's place in the shared app plumbing: the quit confirmation counts terminals running a command, View has
// Show/Hide Terminal (⌘J) once the renderer reports it, main.cjs wires the service, the preload exposes only the
// terminal channels, and every new string has a zh-CN entry.
const require = createRequire(import.meta.url);
const { createQuitGuard } = require("../electron/quit-guard.cjs");
const { installShutdownHandler } = require("../electron/shutdown.cjs");
const { appMenuTemplate, menuState } = require("../electron/app-menu.cjs");
const { t, setLocale, dictionary } = await import("../electron/i18n/index.mjs");
const app = path.resolve(import.meta.dirname, "..");

class App extends EventEmitter {
  exits = 0;
  quit() {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    this.emit("before-quit", event);
    if (!event.prevented) this.exits++;
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup({ responses = [], sessions = 0, terminals = 0, background = 0 } = {}) {
  const application = new App(), prompts = [];
  const counts = { sessions, terminals, background };
  const dialog = { showMessageBox: async (...args) => { prompts.push(args.at(-1)); return { response: responses.shift() }; } };
  const guard = createQuitGuard({ app: application, dialog, t, countNow: () => counts.sessions, terminalsNow: () => counts.terminals,
    mayFindMore: () => counts.background > 0, count: async () => counts.sessions + counts.background, onChange: () => () => {}, pollMs: 20 });
  let stopped = 0;
  installShutdownHandler(application, { guard: (event) => guard.handle(event), stop: () => { stopped++; } });
  return { app: application, prompts, counts, stopped: () => stopped };
}

test("quit: nothing running quits at once; a running terminal command asks Quit anyway / Cancel", async () => {
  setLocale("en-US");
  const idle = setup();
  idle.app.quit();
  await tick();
  assert.equal(idle.prompts.length, 0);
  const cancel = setup({ terminals: 2, responses: [1] });
  cancel.app.quit();
  await tick();
  assert.equal(cancel.prompts.length, 1);
  assert.deepEqual({ message: cancel.prompts[0].message, detail: cancel.prompts[0].detail, buttons: cancel.prompts[0].buttons, defaultId: cancel.prompts[0].defaultId, cancelId: cancel.prompts[0].cancelId },
    { message: "A command is still running in a terminal", detail: "Quitting now will stop the commands running in 2 terminals.", buttons: ["Quit anyway", "Cancel"], defaultId: 0, cancelId: 1 });
  assert.equal(cancel.stopped(), 0, "Cancel keeps the app and its terminals");
  const quit = setup({ terminals: 1, responses: [0] });
  quit.app.quit();
  await tick(); await tick();
  assert.equal(quit.prompts[0].detail, "Quitting now will stop the command running in 1 terminal.");
  assert.equal(quit.stopped(), 1, "Quit anyway stops everything (terminal-service dispose runs in stop)");
});

test("quit: agent work and terminal commands share one confirmation; background lookups still run first", async () => {
  setLocale("en-US");
  const both = setup({ sessions: 1, terminals: 3, responses: [2] });
  both.app.quit();
  await tick();
  assert.equal(both.prompts.length, 1);
  assert.equal(both.prompts[0].buttons.length, 3);
  // 3.6556.2 c5t joins the detail's paragraphs with a blank line (V3-w1-desktop-i18n).
  assert.match(both.prompts[0].detail, /working in 1 session\. Quitting now will interrupt that work\.\n\nCommands are also running in 3 terminals\.$/);
  const lookup = setup({ terminals: 1, background: 1, responses: [2] });
  lookup.app.quit();
  await tick(); await tick();
  assert.equal(lookup.prompts.length, 1);
  // 3.6556.2 c5t: background commands alone make it the background-commands prompt (no Wait), not the agent prompt.
  assert.equal(lookup.prompts[0].message, "Background commands are still running");
  assert.equal(lookup.prompts[0].buttons.length, 2, "a session with background commands alone: Quit anyway / Cancel");
  assert.match(lookup.prompts[0].detail, /Quitting will stop them\.\n\nA command is also running in 1 terminal\.$/);
  setLocale("zh-CN");
  const zh = setup({ terminals: 1, responses: [1] });
  zh.app.quit();
  await tick();
  assert.equal(zh.prompts[0].message, "终端中仍有命令在运行");
  assert.deepEqual(zh.prompts[0].buttons, ["仍要退出", "取消"]);
  setLocale("en-US");
});

test("View menu: Show/Hide Terminal with ⌘J once the renderer reports the terminal pane", () => {
  setLocale("en-US");
  const view = (payload) => appMenuTemplate({ sidebarOpen: true, menuState: menuState(payload), emit: () => {} }).find((item) => item.label === "View").submenu;
  const events = [];
  const base = { panes: { changes: { enabled: true, open: false }, files: { enabled: true, open: false } }, closePane: { enabled: false } };
  assert.equal(view(base).some((item) => /Terminal/.test(item.label ?? "")), false);
  const items = appMenuTemplate({ sidebarOpen: true, menuState: menuState({ ...base, panes: { ...base.panes, terminal: { enabled: true, open: false } } }), emit: (event) => events.push(event) })
    .find((item) => item.label === "View").submenu;
  const show = items.find((item) => item.label === "Show Terminal");
  assert.ok(show);
  assert.equal(show.accelerator, "Command+J");
  assert.equal(show.enabled, true);
  // The official order (index.chunk bNr): Terminal, Changes, Preview, Files, then Close Pane.
  assert.ok(items.indexOf(show) < items.findIndex((item) => item.label === "Show Changes") && items.indexOf(show) < items.findIndex((item) => item.label === "Close Pane"));
  show.click({}, null, {});
  assert.deepEqual(events.at(-1), { kind: "toggle-pane", pane: "terminal" });
  assert.ok(view({ ...base, panes: { ...base.panes, terminal: { enabled: true, open: true } } }).some((item) => item.label === "Hide Terminal"));
  assert.equal(view({ ...base, panes: { ...base.panes, terminal: { enabled: false, open: true } } }).find((item) => item.label === "Show Terminal").enabled, false);
  assert.deepEqual(menuState({ panes: { terminal: { enabled: 1, open: "yes" } } }).panes.terminal, { enabled: false, open: false });
});

test("wiring: main.cjs owns the service, preload exposes only the terminal channels", () => {
  const main = fs.readFileSync(path.join(app, "electron/main.cjs"), "utf8");
  assert.match(main, /const \{ createTerminalService \} = require\("\.\/terminal-service\.cjs"\);/);
  assert.match(main, /resolveOwner: \(\{ sessionId, homeWorkspace \}\) => fileSearchRoot\(sessionId, homeWorkspace\)/);
  assert.match(main, /terminalService\.install\(ipcMain, \{ trustedSender: \(event\) => \{ try \{ return !!validSender\(event, "terminal"\); \} catch \{ return false; \} \} \}\);/);
  assert.match(main, /terminalsNow: \(\) => terminalService\.runningCommands\(\)\.length,/);
  assert.match(main, /const terminalsStopped = terminalService\.dispose\(\);[\s\S]*await Promise\.all\(\[terminalsStopped, previewsStopped\]\);/);
  const preload = fs.readFileSync(path.join(app, "electron/preload.cjs"), "utf8");
  assert.match(preload, /ipcRenderer\.invoke\("terminal:call", String\(op\), params \?\? \{\}\)/);
  assert.match(preload, /ipcRenderer\.send\("terminal:write", id, data\)/);
  assert.match(preload, /ipcRenderer\.on\("terminal:event", listener\)/);
});

test("i18n: every English string of the terminal pane, menus, quit prompt and tools copy has a zh-CN entry", () => {
  const zh = dictionary("zh-CN");
  const sources = ["src/source-terminal-pane.jsx", "src/terminal-pane-model.mjs", "src/source-titlebar.jsx"].map((file) => fs.readFileSync(path.join(app, file), "utf8")).join("\n");
  const strings = new Set();
  for (const match of sources.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) strings.add(match[1]);
  for (const match of sources.matchAll(/\btn\(\s*[^,]+,\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g)) { strings.add(match[1]); strings.add(match[2]); }
  const terminalOnly = [...strings].filter((text) => /[Tt]erminal|[Ss]hell|Close terminal|still running/.test(text));
  assert.ok(terminalOnly.length > 15, `found ${terminalOnly.length}`);
  const missing = terminalOnly.filter((text) => !Object.hasOwn(zh, text));
  assert.deepEqual(missing, []);
  for (const text of ["Show Terminal", "Hide Terminal", "A command is still running in a terminal", "Quitting now will stop the command running in {count} terminal.",
    "Quitting now will stop the commands running in {count} terminals.", "A command is also running in {count} terminal.", "Commands are also running in {count} terminals.",
    "Commands are still running in {count} of the other terminals. Closing them stops those commands.", "Terminal {n}", "Unknown terminal.", "The session folder no longer exists."])
    assert.ok(Object.hasOwn(zh, text), text);
});

test("quit: Wait for the agent asks again about terminal commands still running once the agent is done", async () => {
  setLocale("en-US");
  const waiting = setup({ sessions: 1, terminals: 2, responses: [1, 1] });
  waiting.app.quit();
  await tick();
  assert.equal(waiting.prompts.length, 1);
  waiting.counts.sessions = 0;
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(waiting.stopped(), 0, "the terminal commands are never hung up without asking");
  assert.equal(waiting.prompts.length, 2);
  assert.deepEqual(waiting.prompts[1].buttons, ["Quit anyway", "Cancel"]);
  assert.equal(waiting.prompts[1].detail, "Quitting now will stop the commands running in 2 terminals.");
  const done = setup({ sessions: 1, terminals: 1, responses: [1, 0] });
  done.app.quit();
  await tick();
  done.counts.sessions = 0;
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(done.stopped(), 1, "Quit anyway on the terminal question quits");
  const clear = setup({ sessions: 1, terminals: 1, responses: [1] });
  clear.app.quit();
  await tick();
  clear.counts.sessions = 0; clear.counts.terminals = 0;
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(clear.prompts.length, 1);
  assert.equal(clear.stopped(), 1, "nothing left in the terminals: the wait quits by itself");
});
