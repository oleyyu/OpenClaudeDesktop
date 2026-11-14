import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFile(path.join(root, "src", file), "utf8");

test("the open session's row is selected only while the session view shows it (not on Artifacts or Routines)", async () => {
  const sidebar = await read("source-sidebar.jsx");
  assert.match(sidebar, /const shown = current === session\.id && \(section === undefined \|\| section === "new"\);/);
  assert.match(sidebar, /const selected = shown \|\| isSelected\(selection, session\.id\);/);
  assert.match(sidebar, /aria-current=\{shown \? "page" : undefined\}/);
  assert.doesNotMatch(sidebar, /const selected = current === session\.id \|\|/);
});

// B28: the reference env menu (2.31226.0 cc43287c9 dX Ft) has no 'Environment settings' row: the Local row's trailing
// Settings button / ArrowRight open "Edit local environment" (tests/local-environment.test.mjs). Code › Sessions keeps
// the Worktree location row.
test("Local has no plain 'Environment settings' row; Code › Sessions keeps Worktree location (reference DzP8HoeV hr heading)", async () => {
  const main = await read("main.jsx");
  assert.doesNotMatch(main, /\{t\("Environment settings"\)\}/);
  assert.match(main, /setLocalEnvOpen\(true\)/);
  const settings = await read("source-settings.jsx");
  assert.match(settings, /\{tab:'code',title:'Sessions',rows:\[/);
  assert.match(settings, /row\('worktreeLocation',/);
});

test("forking the open session (⌥⌘O, its row's Fork, Fork from here) opens the fork, as /fork does", async () => {
  const main = await read("main.jsx");
  const fork = main.slice(main.indexOf('      case "fork": {'), main.indexOf('      case "open-terminal":'));
  assert.match(fork, /if \(currentRef\.current === target\.id && expected\.connectionId === stopLive\.current\.connectionId && stopLive\.current\.connected\) \{\n\s+navigate\(fork\.id\);/);
});

test("the Assistant icon picker sits below its label instead of scrolling Settings sideways", async () => {
  const page = await read("source-settings-persona.jsx");
  assert.match(page, /row\('persona-icon', t\('Assistant icon'\), t\('[^']+'\), null,\s+<PersonaIconControl /);
  const css = await read("persona-settings.css");
  assert.match(css, /\.persona-icon-row \{ display: flex; flex-wrap: wrap;[^}]*max-width: 100%; \}/);
});
