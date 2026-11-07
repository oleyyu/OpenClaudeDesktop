import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { macChordView, primaryModifier } from "../src/pane-keys-model.mjs";
import { globalShortcutCommand, shortcutsDialogSections } from "../src/shortcuts-dialog-model.mjs";
import { paneShortcutKind } from "../src/pane-shortcuts.mjs";
import { chinShortcutCommand } from "../src/chin-shortcuts.mjs";
import { isGoToFileShortcut } from "../src/diff-go-to-file-model.mjs";
import { sessionCycleDelta } from "../src/session-cycle-model.mjs";
import { enterAction } from "../src/composer-keys-model.mjs";
import { terminalKeyAction, findLinks, relativeToFolder } from "../src/terminal-pane-model.mjs";
import { terminalFindKey } from "../src/terminal-find-model.mjs";
import { routeTerminalKey } from "../src/terminal-event-routing.mjs";
import { splitShortcut } from "../src/split-view-model.mjs";
import { isMetaJumpChord, archiveChord } from "../src/sidebar-jump-model.mjs";
import { fileManagerName, hostPlatform, revealInFileManagerLabel } from "../src/file-manager-labels.mjs";
import { fallbackFonts } from "../src/theme-custom-model.mjs";
import { responseImageTarget } from "../src/response-image-model.mjs";

const W = { mac: false };
const key = (spec, extra = {}) => {
  const parts = spec.split("+"), name = parts.at(-1);
  const code = /^[a-z]$/.test(name) ? `Key${name.toUpperCase()}` : { "[": "BracketLeft", "]": "BracketRight", "/": "Slash", "\\": "Backslash", ";": "Semicolon", "`": "Backquote" }[name] ?? name;
  return { type: "keydown", key: name, code, ctrlKey: parts.includes("ctrl"), metaKey: parts.includes("meta"), altKey: parts.includes("alt"), shiftKey: parts.includes("shift"), isComposing: false, repeat: false, ...extra };
};

test("primaryModifier / macChordView", () => {
  assert.equal(primaryModifier({ ctrlKey: true }, W), true);
  assert.equal(primaryModifier({ metaKey: true }, W), false);
  assert.equal(primaryModifier({ metaKey: true }, { mac: true }), true);
  const view = macChordView(key("ctrl+p"), W);
  assert.equal(view.metaKey, true); assert.equal(view.ctrlKey, false);
  const altGr = macChordView(key("ctrl+alt+p", { getModifierState: (k) => k === "AltGraph" }), W);
  assert.equal(altGr.metaKey, false);
  const event = key("ctrl+p", { preventDefault() { this.prevented = true; } });
  macChordView(event, W).preventDefault();
  assert.equal(event.prevented, true);
});

test("global chords on Windows", () => {
  const cmd = (spec, extra) => globalShortcutCommand(key(spec, extra), W);
  assert.equal(cmd("ctrl+b"), "toggle-sidebar");
  assert.equal(cmd("ctrl+shift+b"), "background-tasks");
  assert.equal(cmd("alt+ArrowLeft", { key: "ArrowLeft" }), "back");
  assert.equal(cmd("alt+ArrowRight", { key: "ArrowRight" }), "forward");
  assert.equal(cmd("ctrl+["), null, "Ctrl+[ is split focus, not Back");
  assert.equal(cmd("ctrl+p"), "go-to-file");
  assert.equal(cmd("ctrl+/"), "shortcuts");
  assert.equal(cmd("ctrl+k"), "search");
  assert.equal(cmd("ctrl+shift+k", { key: "K" }), "search-palette");
  assert.equal(cmd("ctrl+n"), "new-session");
  assert.equal(cmd("ctrl+w"), "close-session");
  assert.equal(cmd("ctrl+shift+t", { key: "T" }), "reopen-closed");
  assert.equal(cmd("ctrl+o"), "transcript-view");
  assert.equal(cmd("ctrl+u"), "file-upload");
  assert.equal(cmd("alt+ArrowUp", { key: "ArrowUp" }), "jump-prev-prompt");
  assert.equal(cmd("ctrl+alt+a"), "archive-session");
  assert.equal(cmd("ctrl+alt+a", { key: "ą", getModifierState: (k) => k === "AltGraph" }), null, "AltGr+A types ą");
  assert.equal(cmd("ctrl+,", { key: ",", code: "Comma" }), "settings");
  assert.equal(cmd("meta+b"), null, "the Windows key is never a chord");
  // macOS unchanged.
  assert.equal(globalShortcutCommand(key("meta+b"), { mac: true }), "toggle-sidebar");
  assert.equal(globalShortcutCommand(key("ctrl+b"), { mac: true }), "background-tasks");
});

test("pane, chin, go-to-file, cycle and Enter chords read Ctrl on Windows", () => {
  assert.equal(paneShortcutKind(key("ctrl+shift+d", { key: "D" }), W), "changes");
  assert.equal(paneShortcutKind(key("meta+shift+d", { key: "D" }), W), null);
  assert.equal(chinShortcutCommand(key("ctrl+shift+m", { key: "M" }), W), "mode");
  assert.equal(chinShortcutCommand(key("ctrl+alt+f"), W), "fast");
  assert.equal(isGoToFileShortcut(key("ctrl+p"), W), true);
  assert.equal(isGoToFileShortcut(key("meta+p"), W), false);
  assert.equal(sessionCycleDelta(key("ctrl+shift+]"), W), 1);
  assert.equal(sessionCycleDelta(key("ctrl+Tab", { key: "Tab" }), W), 1);
  assert.equal(enterAction({ event: key("ctrl+alt+Enter", { key: "Enter" }), mac: false }), "submit-fork");
  assert.equal(enterAction({ event: key("ctrl+Enter", { key: "Enter" }), mac: false }), "submit-later");
  assert.equal(enterAction({ event: key("meta+alt+Enter", { key: "Enter" }), mac: true }), "submit-fork");
});

test("terminal keys on Windows", () => {
  assert.equal(terminalKeyAction(key("ctrl+k"), { mac: false }), null, "Ctrl+K is the shell's");
  assert.equal(terminalKeyAction(key("ctrl+shift+k", { key: "K" }), { mac: false }), "clear");
  assert.equal(terminalKeyAction(key("ctrl+shift+f", { key: "F" }), { mac: false }), "find");
  assert.equal(terminalKeyAction(key("F3", { code: "F3" }), { mac: false }), "find-next");
  assert.equal(terminalKeyAction(key("shift+F3", { code: "F3" }), { mac: false }), "find-previous");
  assert.equal(terminalKeyAction(key("ctrl+`"), { mac: false }), "toggle");
  assert.equal(terminalKeyAction(key("meta+k"), { mac: true }), "clear");
  assert.equal(terminalFindKey(key("ctrl+g"), W), "next");
  assert.equal(terminalFindKey(key("F3", { code: "F3" }), W), "next");
  const term = { hasSelection: () => true, getSelection: () => "x" };
  assert.equal(routeTerminalKey(key("ctrl+c", { preventDefault() {} }), term, () => {}, W), "copy");
  assert.equal(routeTerminalKey(key("ctrl+c"), { hasSelection: () => false }, () => {}, W), null, "no selection: ^C interrupts");
  assert.equal(routeTerminalKey(key("ctrl+c"), term, () => {}, { mac: true }), null);
});

test("terminal links: Windows paths and tsc locations", () => {
  const links = (text) => findLinks(text, { windows: true }).filter((l) => l.kind === "file").map((l) => [l.path, l.line, l.column]);
  assert.deepEqual(links("at C:\\Users\\me\\proj\\src\\a.ts:12:5"), [["C:\\Users\\me\\proj\\src\\a.ts", 12, 5]]);
  assert.deepEqual(links("src\\a.ts(12,5): error TS2322"), [["src\\a.ts", 12, 5]]);
  assert.deepEqual(links("C:/x/y.ts:3 and src/b.ts:4:1"), [["C:/x/y.ts", 3, null], ["src/b.ts", 4, 1]]);
  assert.deepEqual(links(".\\b.js ~\\n.txt"), [[".\\b.js", null, null], ["~\\n.txt", null, null]]);
  // POSIX behaviour is unchanged.
  assert.deepEqual(findLinks("src/a.ts:4:1", { windows: false }).map((l) => l.path), ["src/a.ts"]);
  assert.equal(relativeToFolder("C:\\p\\src\\a.ts", "c:\\P", null, { windows: true }), "src/a.ts");
  assert.equal(relativeToFolder("src\\a.ts", "C:\\p", null, { windows: true }), "src/a.ts");
  assert.equal(relativeToFolder("D:\\a.ts", "C:\\p", null, { windows: true }), null);
  assert.equal(relativeToFolder("/p/src/a.ts", "/p"), "src/a.ts");
});

test("split chords on Windows are Ctrl+Alt", () => {
  assert.equal(splitShortcut(key("ctrl+alt+\\"), W), "new-right");
  assert.equal(splitShortcut(key("ctrl+alt+w"), W), "close");
  assert.equal(splitShortcut(key("ctrl+]"), W), "focus-next");
  assert.equal(splitShortcut(key("ctrl+alt+w", { getModifierState: (k) => k === "AltGraph" }), W), null);
  assert.equal(splitShortcut(key("ctrl+meta+w"), { mac: true }), "close");
});

test("sidebar jump / archive by platform", () => {
  assert.equal(isMetaJumpChord(key("ctrl+1"), W), true);
  assert.equal(isMetaJumpChord(key("meta+1"), W), false);
  assert.equal(archiveChord(key("ctrl+shift+Backspace", { key: "Backspace" }), W), true);
});

test("shortcuts dialog lists the Windows chords", () => {
  const rows = Object.fromEntries(shortcutsDialogSections({ mac: false }).flatMap((s) => s.rows).map((r) => [r.command, r.keys]));
  assert.deepEqual(rows["background-tasks"], ["ctrl+shift+b"]);
  assert.deepEqual(rows["jump-prev-prompt"], ["alt+up"]);
  assert.deepEqual(rows.terminal, ["ctrl+`"]);
  assert.deepEqual(rows["split-close"], ["ctrl+alt+w"]);
  const mac = Object.fromEntries(shortcutsDialogSections({ mac: true }).flatMap((s) => s.rows).map((r) => [r.command, r.keys]));
  assert.deepEqual(mac["background-tasks"], ["ctrl+b"]);
});

test("app menu accelerators on Windows", () => {
  const { appMenuTemplate, rendererOwned } = createRequire(import.meta.url)("../electron/app-menu.cjs");
  const flat = (items) => items.flatMap((item) => [item, ...(Array.isArray(item.submenu) ? flat(item.submenu) : item.submenu?.submenu ? flat(item.submenu.submenu) : [])]);
  const accelerators = (platform) => flat(appMenuTemplate({ sidebarOpen: true, emit: () => {}, platform })).map((item) => item.accelerator).filter(Boolean);
  const win = accelerators("win32");
  assert.ok(!win.some((a) => /Command(?!OrControl)/.test(a)), `no Command+ accelerator on Windows: ${win.filter((a) => /Command/.test(a))}`);
  for (const a of ["Alt+Left", "Alt+Right", "Ctrl+Shift+[", "Ctrl+Shift+]", "Ctrl+Shift+K", "F11", "Ctrl+Alt+W"]) assert.ok(win.includes(a), a);
  const mac = accelerators("darwin");
  for (const a of ["Command+[", "Command+]", "Command+Shift+K", "Control+Command+F", "Control+Command+W"]) assert.ok(mac.includes(a), a);
  assert.equal(rendererOwned({ triggeredByAccelerator: true, ctrlKey: true }, false), true);
  assert.equal(rendererOwned({ triggeredByAccelerator: true, ctrlKey: true }, true), false);
});

test("file manager labels, fonts and file:// images", () => {
  assert.equal(hostPlatform({ platform: "Win32" }), "win32");
  assert.equal(hostPlatform({ platform: "MacIntel" }), "darwin");
  assert.equal(revealInFileManagerLabel("win32"), "Show in Explorer");
  assert.equal(revealInFileManagerLabel("darwin"), "Show in Finder");
  assert.equal(fileManagerName("win32"), "File Explorer");
  assert.ok(fallbackFonts(true).includes("Segoe UI"));
  assert.ok(fallbackFonts(false).includes("SF Pro"));
  assert.deepEqual(responseImageTarget("file:///C:/Users/me/a%20b.png", "C:\\Users\\me"), { kind: "file", path: "C:/Users/me/a b.png" });
});
