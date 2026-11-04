import test from "node:test";
import assert from "node:assert/strict";
import { attachableSelection, fileRefMenu, linkTarget, messageItemText, messageMenu, quoteBlock } from "../src/transcript-context-menu-model.mjs";

const shape = (entries) => entries.map((entry) => entry.type === "separator" ? "---"
  : entry.submenu ? `${entry.label} ▸ ${entry.submenu.map((child) => child.label).join(" / ")}`
  : entry.shortcut ? `${entry.label} [${entry.shortcut}]` : entry.label);

test("plain message: copy message items, a separator, then Attach message as context (CY order)", () => {
  assert.deepEqual(shape(messageMenu({ messageText: "Hello", canAttach: true })),
    ["Copy message", "Copy message as Markdown", "---", "Attach message as context"]);
  assert.deepEqual(shape(messageMenu({ messageText: "Hello" })), ["Copy message", "Copy message as Markdown"],
    "no composer, no attach item and no trailing separator");
  assert.deepEqual(messageMenu({}), [], "no text and no target: nothing to show");
});

test("selection only: Copy (cmd+c) first; Attach selection takes cmd+shift+l from 2 characters", () => {
  assert.deepEqual(shape(messageMenu({ selectionText: "picked text", messageText: "m", canAttach: true })),
    ["Copy [cmd+c]", "---", "Copy message", "Copy message as Markdown", "---", "Attach selection as context [cmd+shift+l]"]);
  assert.deepEqual(shape(messageMenu({ selectionText: " x ", messageText: "m", canAttach: true })).at(-1), "Attach message as context",
    "a one-character selection still copies but attaches the message");
  assert.deepEqual(shape(messageMenu({ selectionText: "   ", messageText: "m" })), ["Copy message", "Copy message as Markdown"],
    "a blank selection is no selection");
  assert.equal(attachableSelection("ab"), true); assert.equal(attachableSelection(" a "), false);
});

test("code targets: block, inline path and inline code labels; a link suppresses the code item", () => {
  assert.deepEqual(shape(messageMenu({ codeTarget: { text: "const a = 1;", isBlock: true }, messageText: "m", canAttach: true })),
    ["Copy code block", "---", "Copy message", "Copy message as Markdown", "---", "Attach message as context"]);
  assert.equal(shape(messageMenu({ codeTarget: { text: "src/app.js", isBlock: false, isPath: true }, messageText: "m" }))[0], "Copy path");
  assert.equal(shape(messageMenu({ codeTarget: { text: "npm test", isBlock: false, isPath: false }, messageText: "m" }))[0], "Copy code");
  assert.deepEqual(shape(messageMenu({ codeTarget: { text: "", isBlock: true }, messageText: "m" })), ["Copy message", "Copy message as Markdown"]);
  const link = linkTarget("https://example.com/x");
  assert.deepEqual(shape(messageMenu({ codeTarget: { text: "x", isBlock: false }, ...link, messageText: "m" })),
    ["Open in default browser", "Copy link", "---", "Copy message", "Copy message as Markdown"]);
});

test("links: only listed protocols count, only http(s) open in the browser", () => {
  assert.deepEqual(linkTarget("https://example.com"), { linkHref: "https://example.com", canOpenInBrowser: true, canOpenInPreview: false });
  assert.deepEqual(linkTarget("mailto:a@example.com"), { linkHref: "mailto:a@example.com", canOpenInBrowser: false, canOpenInPreview: false });
  assert.deepEqual(linkTarget("javascript:alert(1)"), { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false });
  assert.deepEqual(linkTarget("file:///etc/hosts"), { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false });
  assert.deepEqual(linkTarget("not a url"), { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false });
  assert.deepEqual(linkTarget(null), { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false });
  assert.deepEqual(shape(messageMenu({ selectionText: "a b", ...linkTarget("mailto:a@example.com"), messageText: "m" })),
    ["Copy [cmd+c]", "Copy link", "---", "Copy message", "Copy message as Markdown"]);
});

test("file reference menu (c856385e2 Mn): Attach, Copy ▸, separator, Open in ▸ Files pane, Show in Finder", () => {
  assert.deepEqual(shape(fileRefMenu({ absolute: "/w/src/app.js", relative: "src/app.js", filename: "app.js", canAttach: true, canReveal: true })),
    ["Attach as context", "Copy ▸ Absolute path / Relative path / Filename", "---", "Open in ▸ Files pane", "Show in Finder"]);
  assert.deepEqual(shape(fileRefMenu({ absolute: "/elsewhere/a.js", relative: null, filename: "a.js" })),
    ["Copy ▸ Absolute path / Filename", "---", "Open in ▸ Files pane"]);
  assert.deepEqual(shape(fileRefMenu({ filename: "a.js", canAttach: true, canReveal: true })), ["Copy ▸ Filename", "---", "Open in ▸ Files pane"],
    "without an absolute path there is nothing to attach or reveal");
});

// W14-code r8 R8T-01: 3.6556.2 c856385e2 bn — Open in ▸ hn's installed editors, a separator, then Un's extraTargets
// Sn "Files pane" and wn "Default app" (a path inside the session folder); an empty submenu is left out.
test("file reference menu (c856385e2 bn): Open in ▸ editors, separator, Files pane, Default app", () => {
  const editors = [{ type: "cursor", name: "Cursor" }, { type: "vscode", name: "VS Code" }];
  const menu = fileRefMenu({ absolute: "/w/src/app.js", relative: "src/app.js", filename: "app.js", canReveal: true, editors, canOpenDefault: true });
  assert.deepEqual(shape(menu), ["Copy ▸ Absolute path / Relative path / Filename", "---", "Open in ▸ Cursor / VS Code /  / Files pane / Default app", "Show in Finder"]);
  const submenu = menu.find((entry) => entry.id === "open-in").submenu;
  assert.deepEqual(submenu.map((entry) => entry.type === "separator" ? "---" : entry.id),
    ["open-in-editor:cursor", "open-in-editor:vscode", "---", "open-files-pane", "open-default-app"]);
  assert.deepEqual(shape(fileRefMenu({ absolute: "/elsewhere/a.js", relative: null, filename: "a.js", editors, canOpenDefault: true })),
    ["Copy ▸ Absolute path / Filename", "---", "Open in ▸ Cursor / VS Code /  / Files pane"], "Default app only inside the folder (wn inRoot)");
  assert.deepEqual(shape(fileRefMenu({ absolute: "/w/a.js", relative: "a.js", filename: "a.js", canOpen: false, editors: [], canReveal: true })),
    ["Copy ▸ Absolute path / Relative path / Filename", "---", "Show in Finder"], "nothing to open in: no submenu, the reveal item keeps its separator");
  assert.deepEqual(shape(fileRefMenu({ filename: "a.js", editors })), ["Copy ▸ Filename", "---", "Open in ▸ Files pane"],
    "no absolute path, no editor");
});

test("message text: agent/plan Markdown, user text parts joined as the bubble; other rows have none", () => {
  assert.equal(messageItemText({ type: "agentMessage", text: "**hi**" }), "**hi**");
  assert.equal(messageItemText({ type: "plan", text: "1. step" }), "1. step");
  assert.equal(messageItemText({ type: "userMessage", content: [{ type: "text", text: "a" }, { type: "image", url: "x" }, { type: "text", text: "b" }] }), "a\nb");
  assert.equal(messageItemText({ type: "userMessage", content: [{ type: "image", url: "x" }] }), undefined);
  assert.equal(messageItemText({ type: "agentMessage", text: "" }), undefined);
  assert.equal(messageItemText({ type: "commandExecution", command: "ls" }), undefined);
  assert.equal(messageItemText(undefined), undefined);
});

test("attach quotes the text as Markdown", () => {
  assert.equal(quoteBlock("one\n\ntwo  \n"), "> one\n>\n> two");
  assert.equal(quoteBlock("   "), "");
});

test("TI Pin as chapter / Unpin chapter: after Attach, before the Rewind / Fork section; only with message text", () => {
  assert.deepEqual(shape(messageMenu({ messageText: "Answer", canAttach: true, canPin: true, canFork: true })),
    ["Copy message", "Copy message as Markdown", "---", "Attach message as context", "Pin as chapter", "---", "Fork from here"]);
  assert.deepEqual(shape(messageMenu({ messageText: "Answer", canPin: true, pinned: true })),
    ["Copy message", "Copy message as Markdown", "---", "Unpin chapter"], "TI E = attach || pin: the separator heads a Pin offered without Attach");
  const pin = messageMenu({ messageText: "Answer", canPin: true }).find((entry) => entry.id === "pin");
  assert.equal(pin.label, "Pin as chapter");
  assert.deepEqual(messageMenu({ canPin: true }), [], "no message text: no pin");
  assert.ok(!shape(messageMenu({ messageText: "Answer", canAttach: true })).includes("Pin as chapter"), "canPin false: no pin");
});

test("B12 zNe: Rewind to here / Fork from here carry their EI.rewindMenu / EI.forkMenu descriptions", () => {
  const entries = messageMenu({ messageText: "Prompt", canRewind: true, canFork: true });
  assert.deepEqual(shape(entries), ["Copy message", "Copy message as Markdown", "---", "Rewind to here", "Fork from here"]);
  assert.equal(entries.find((entry) => entry.id === "rewind").description, "Removes this message and what follows");
  assert.equal(entries.find((entry) => entry.id === "fork").description, "Starts a new session, keeps this one");
  assert.equal(entries.find((entry) => entry.id === "copy-message").description, undefined, "other items stay one line");
});

test("B12 TI w: over a message image, Copy image and Save image head the menu and count as items above", () => {
  const image = { src: "data:image/png;base64,AA==", fileName: "chart.png" };
  assert.deepEqual(shape(messageMenu({ imageTarget: image, messageText: "m", canAttach: true })),
    ["Copy image", "Save image", "---", "Copy message", "Copy message as Markdown", "---", "Attach message as context"]);
  assert.deepEqual(shape(messageMenu({ imageTarget: image, selectionText: "pick", messageText: "m" })),
    ["Copy image", "Save image", "Copy [cmd+c]", "---", "Copy message", "Copy message as Markdown"], "no separator between the image and selection items");
  assert.deepEqual(messageMenu({ imageTarget: image, messageText: "m" }).slice(0, 2).map((entry) => entry.id), ["copy-image", "save-image"]);
  assert.deepEqual(shape(messageMenu({ imageTarget: { src: "" }, messageText: "m" })), ["Copy message", "Copy message as Markdown"], "no src: no image items");
});
