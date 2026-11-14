// Round 3 app-src fixes that live in React components (source checks; the behaviour is driven offscreen).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const src = (file) => fs.readFile(path.join(import.meta.dirname, "..", "src", file), "utf8");

test("composer staging: the follow-up is scheduled from the updater React actually runs, never from a microtask that may find nothing", async () => {
  const main = await src("main.jsx");
  const body = main.slice(main.indexOf("function stageComposerFiles("), main.indexOf("function followStaging("));
  assert.doesNotMatch(body, /const pending = \[\];/);
  assert.match(body, /outcome = \{ notices, infos, pending \};\n\s+if \(!scheduled\) \{ scheduled = true; queueMicrotask\(\(\) => followStaging\(outcome\)\); \}/);
  // Notices and the error surface are set outside the updater.
  assert.doesNotMatch(body, /setError\(/);
  assert.match(main, /function followStaging\(\{ notices, infos, pending \}\) \{[\s\S]*?call\("attachments:stage"/);
});

test("split view: the unfocused pane's titlebar actions fade out, the ring needs ⌘ held, and a ⌘-drag (or the grip) moves a pane", async () => {
  const css = await src("source-split-view.css");
  assert.match(css, /\.split-pane:not\(\[data-focused\]\) \.workspace-toolbar \.st-trailing \{\n\s+opacity: 0;\n\s+transition: opacity 0\.12s ease-out;/);
  assert.match(css, /:not\(\[data-focused\]\):hover \.workspace-toolbar \.st-trailing,/);
  assert.doesNotMatch(css, /\.split-pane\[data-focused\]::after/, "no always-on focused ring");
  assert.doesNotMatch(css, /cursor:\s*pointer/);
  const jsx = await src("source-split-view.jsx");
  // V$: ⌘ held marks the host; the reference sheet draws the ring (.dframe-pane-host[data-cmd-held] .dframe-pane:hover:before).
  assert.match(jsx, /host\.toggleAttribute\("data-cmd-held", mac \? !!event\.metaKey/);
  assert.match(jsx, /if \(!cancelled && chosen !== null\) store\.dropPane\(index, chosen\);/);
  assert.match(jsx, /<span className="dframe-drop-overlay-label">\{t\(paneDropLabel\(split, drop\)\)\}<\/span>/);
});

test("/theme opens Preferences on the Theme row; the large-workflow limits are per side", async () => {
  const main = await src("main.jsx");
  assert.match(main, /if\(parsed\.open\)\{setSettings\("preferences#theme"\);break;\}/);
  assert.doesNotMatch(main, /setWorkflowWarningLimits/);
  // W14-code r4 ct-feed R4T-08b (E95): the Tasks pane no longer draws the host WorkflowCard; it is the official
  // N$ detailed card — cccc2cf0a wN `u(ds,{task:r,variant:"detailed",sessionRef:i,onStop:a,stopping:…,nested:…,ownLine:…})`,
  // which takes no warning limits. Only the two host WorkflowRow sites keep them (the size band reads them separately).
  assert.equal((main.match(/warningLimits=\{workflowWarningLimits\}/g) || []).length, 2);
  assert.match(main, /pickWorkflowSizeWarning\(tasks, workflowSizeEntries, workflowWarningLimits\)/);
});
