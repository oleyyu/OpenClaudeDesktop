import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// w13-chatfn-branches review fix: the main process loads the Chat version and feedback models, so they must be inside
// what the package script ships. Its electron-packager filter drops every src/*.mjs outside a short whitelist; a main
// module that imports ../src/… works in development and fails with ERR_MODULE_NOT_FOUND in the packaged app (every core
// request imports surface-policy.mjs). Same filter as tests/agent-tools-packaging.test.mjs: the package script's own
// electron-packager arguments through @electron/packager's userPathFilter.
const app = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const packager = (file) => import(pathToFileURL(path.join(app, 'node_modules/@electron/packager/dist', file)).href);

function packagerArgs(script) {
  const command = script.split('&&').map((part) => part.trim()).find((part) => part.startsWith('electron-packager'));
  const words = [];
  for (const match of command.matchAll(/'([^']*)'|(\S+)/g)) {
    if (match[1] !== undefined) words.push(match[1]);
    else words.push(match[2].replace(/'([^']*)'/g, '$1'));
  }
  return words.slice(1);
}

let filter;
test.before(async () => {
  const { parseArgs } = await packager('cli.js');
  const opts = parseArgs(packagerArgs(pkg.scripts.package));
  const { populateIgnoredPaths, userPathFilter } = await packager('copy-filter.js');
  opts.dir = app;
  populateIgnoredPaths(opts);
  filter = userPathFilter(opts);
});

// Relative static imports / re-exports and literal dynamic imports, followed to the files they name.
function closure(entries) {
  const seen = new Set();
  const queue = entries.map((entry) => path.join(app, entry));
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const code = fs.readFileSync(file, 'utf8');
    for (const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])(\.\.?\/[^'"]+)\1/gm)) {
      const target = path.resolve(path.dirname(file), match[2]);
      assert.ok(fs.existsSync(target), `${path.relative(app, file)} imports ${match[2]}, which exists`);
      queue.push(target);
    }
  }
  return [...seen].map((file) => path.relative(app, file));
}

test('surface-policy, the Chat version service and the Chat feedback store ship with everything they import', async () => {
  // surface-policy.mjs: requestRpc / requestCowork in main.cjs; chat-branches.mjs / chat-feedback.mjs: main.cjs's
  // case "chat-branches" / case "chat-feedback".
  const files = closure(['electron/surface-policy.mjs', 'electron/chat-branches.mjs', 'electron/chat-feedback.mjs']);
  for (const file of ['electron/chat-branches-model.mjs', 'electron/chat-feedback-model.mjs']) assert.ok(files.includes(file), file);
  for (const file of files) assert.equal(await filter(path.join(app, file)), true, `${file} is packaged`);
  assert.deepEqual(files.filter((file) => !file.startsWith('electron/')), []);
});

test('the renderer keeps its src/ paths to the two models as re-exports of the electron/ modules', async () => {
  for (const name of ['chat-branches-model', 'chat-feedback-model']) {
    const shim = fs.readFileSync(path.join(app, 'src', `${name}.mjs`), 'utf8');
    assert.match(shim, new RegExp(`^export \\* from '\\.\\./electron/${name}\\.mjs';$`, 'm'));
    assert.doesNotMatch(shim.replace(/^\/\/.*$/gm, ''), /\bfunction\b|\bconst\b/);
    const [viaSrc, direct] = await Promise.all([import(`../src/${name}.mjs`), import(`../electron/${name}.mjs`)]);
    assert.deepEqual(Object.keys(viaSrc).sort(), Object.keys(direct).sort());
    for (const key of Object.keys(direct)) assert.equal(viaSrc[key], direct[key], `${name} ${key}`);
  }
});

// w13-close-main-process (closeout chatfn-branches-02): the same holds for every main-process module, not only the
// three above — the Chat artifacts store and tool (chat-artifact-types.mjs), the Chat tools context and local projects
// (chat-tools-store.mjs) included. Every file under electron/ is a starting point: static imports, re-exports, literal
// dynamic imports and require() calls, and the `path.join(__dirname, '../src/…')` form (workflow-service.cjs), followed
// to the files they name; each must be in the packaged app.
function mainClosure() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(app, 'electron'));
  const seen = new Set(), queue = [...files], edges = [];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    // Comments name modules in prose (`require("./x")` in a sentence): only code counts.
    const code = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
    const targets = [
      ...[...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|\brequire\s*\(\s*)(['"])(\.\.?\/[^'"]+)\1/gm)].map((match) => match[2]),
      ...[...code.matchAll(/path\.join\(\s*__dirname\s*,\s*(['"])(\.\.?\/[^'"]+)\1\s*\)/g)].map((match) => match[2]),
    ];
    for (const target of targets) {
      const resolved = path.resolve(path.dirname(file), target);
      if (!/\.(?:mjs|cjs|js|json)$/.test(resolved) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue; // not a module (dist/index.html), a directory
      // main.cjs's watch-record test hook (CODE_DESKTOP_WATCH_RECORD_FIXTURE, inside a try): a test fixture, never shipped.
      if (path.relative(app, resolved).startsWith(`tests${path.sep}fixtures${path.sep}`)) continue;
      edges.push([path.relative(app, file), path.relative(app, resolved)]);
      queue.push(resolved);
    }
  }
  return { files: [...seen].map((file) => path.relative(app, file)), edges };
}

test('no main-process module reaches a file the package script leaves out (the whole electron/ tree)', async () => {
  const { files, edges } = mainClosure();
  assert.ok(files.includes('electron/chat-tools-store.mjs') && files.includes('electron/chat-artifact-types.mjs'));
  const left = [];
  for (const file of files) if (!(await filter(path.join(app, file)))) left.push(file);
  assert.deepEqual(left.map((file) => `${file} (from ${edges.filter(([, to]) => to === file).map(([from]) => from).join(', ')})`), []);
  // The src/ ones are the package script's whitelist only (other folders, e.g. extensions/, ship whole).
  const outside = [...new Set(files.filter((file) => file.startsWith('src/')))].sort();
  for (const file of outside) assert.match(file, /^src\/(?:workflow-progress-model|bridge-text-model|deliverable-records|agent-tool-titles|thread-history-model|turn-error-model)\.mjs$/, file);
});

test('the Chat tools model keeps its src/ path as a re-export of the packaged store', async () => {
  const shim = fs.readFileSync(path.join(app, 'src/chat-tools-model.mjs'), 'utf8');
  assert.match(shim, /^export \* from '\.\.\/electron\/chat-tools-store\.mjs';$/m);
  for (const rel of ['electron/chat-context/tools.mjs', 'electron/local-projects.mjs']) {
    const text = fs.readFileSync(path.join(app, rel), 'utf8');
    assert.doesNotMatch(text, /src\/chat-tools-model\.mjs['"]/, `${rel} imports the packaged store`);
  }
  const [viaSrc, store] = await Promise.all([import('../src/chat-tools-model.mjs'), import('../electron/chat-tools-store.mjs')]);
  for (const key of Object.keys(store)) assert.equal(viaSrc[key], store[key], key);
});
