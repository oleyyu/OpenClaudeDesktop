// W13 closeout (E78, E73 remainder): local Chat/Cowork rows stay out of the multi-selection, and a Chat's cwd never
// comes from a saved folder. Source checks against 3.6556.2's own text (parsed only, never run).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (prefix) => {
  const name = fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'));
  assert.ok(name, prefix);
  return fs.readFileSync(path.join(assets, name), 'utf8');
};

test('3.6556.2: x7() is the constant m7 = !1 and Le takes a cowork-source row only when it is true', () => {
  const shared21 = official('shared-21-R7LldJ05');
  assert.match(shared21, /\b(\w+)=!1,(\w+)="data-multiselect-row"/);
  const flag = shared21.match(/\b(\w+)=!1,\w+="data-multiselect-row"/)[1];
  assert.match(shared21, new RegExp(`function (\\w+)\\(\\)\\{return ${flag}\\}`));
  const rail = official('c44373cde-CAOQ4vZq');
  assert.match(rail, /import\{F as (\w+)[^}]*\}from"\.\/shared-21-R7LldJ05\.js"/);
  assert.match(rail, /\(\w+\|\|\w+\.source\.kind==="chat"\)/);
});

test('the sidebar selects Code rows only; the hub bulk branch stays as the unreachable official one', () => {
  const sidebar = read('src/source-sidebar.jsx');
  assert.match(sidebar, /const selectable = mode === "code";\n    if \(selectable && event\.shiftKey && command\) \{/);
  assert.match(sidebar, /    if \(selectable && event\.shiftKey\) \{\n      event\.preventDefault\(\);\n      setSelectionState\(\(previous\) => selectRange\(/);
});

test('a Chat never takes its cwd from a saved folder (E73)', () => {
  const main = read('electron/main.cjs');
  const workspace = main.slice(main.indexOf('case "surface-workspace": {'));
  assert.match(workspace.slice(0, 900), /const saved = p\.surface === 'chat' \? null : config\.surfaceFolders\?\.\[p\.surface\];/);
});
