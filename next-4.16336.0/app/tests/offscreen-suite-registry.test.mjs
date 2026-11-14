import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Registry consistency for the offscreen whole-app harness
// (work/offscreen-app-integration-20260922/run-suite.mjs `suites`, 0.2.118): every
// registered script is a standard validate-local script and writes the canonical
// report that run-suite reads back (`result.passed===true`, run-suite.mjs:33).
const app = path.resolve(import.meta.dirname, '..');
const runSuite = fs.readFileSync(path.join(app, '../work/offscreen-app-integration-20260922/run-suite.mjs'), 'utf8');
const suites = new Function(`return ${runSuite.match(/const suites=(\{.*?\});/)[1]}`)();
const standard = new Function(`return ${fs.readFileSync(path.join(app, 'scripts/validate-local.mjs'), 'utf8').match(/const standard=(\[.*?\]);/)[1]}`)();

test('every offscreen suite is a standard script that writes its canonical report with a passed field', () => {
  assert.ok(Object.keys(suites).length >= 36);
  for (const [name, [script, canonical]] of Object.entries(suites)) {
    assert.ok(standard.includes(script.replace(/\.mjs$/, '')), `${name}: ${script} in validate-local standard`);
    assert.match(canonical, /^analysis\//, `${name}: report under analysis`);
    const source = fs.readFileSync(path.join(app, 'scripts', script), 'utf8');
    assert.ok(source.includes(JSON.stringify(path.basename(canonical))) || source.includes(`'${path.basename(canonical)}'`) || source.includes('`' + path.basename(canonical) + '`') || source.includes('/' + path.basename(canonical)), `${name}: writes ${path.basename(canonical)}`);
    // `{passed, checks, …}` (shorthand, the current-* scripts) carries the field as well as `passed: …`.
    assert.match(source, /\bpassed\s*:|[{,]\s*passed\s*[,}]/, `${name}: report carries passed`);
  }
});

test('0.2.118 registers the seven previously unexecuted native scripts', () => {
  for (const name of ['tooltip', 'permission', 'approval-transport', 'session', 'titlebar', 'sidebar', 'scrollbar-mode'])
    assert.ok(suites[name], name);
  const tooltip = fs.readFileSync(path.join(app, 'scripts/tooltip-ui-test.mjs'), 'utf8');
  assert.match(tooltip, /pass: true,\s*passed: true/);
  assert.match(tooltip, /pass: false,\s*passed: false/);
});

test('0.2.119 registers pane/pane-layout/file-search/diff/transcript-fade/ui029 with per-suite memory clipboard floors', () => {
  const expected = { pane: 'pane-source-test.json', 'pane-layout': 'pane-layout-ui-report.json', 'file-search': 'file-search-ui-test.json', diff: 'diff-ui-test.json', 'transcript-fade': 'transcript-fade-ui-report.json', ui029: 'ui029-ui-report.json' };
  for (const [name, report] of Object.entries(expected)) assert.equal(path.basename(suites[name][1]), report, name);
  const calls = new Function(`return ${runSuite.match(/const clipboardCalls=(\{.*?\});/)[1]}`)();
  // Every suite that reads/writes Electron's clipboard (diff-ui-test:80-82/:204, transcript-fade:280-282/:429,
  // ui029:94-100) must run on the in-memory store, and only the copying suites declare a floor.
  for (const name of ['diff', 'transcript-fade', 'ui029']) assert.ok(calls[name]?.read >= 1 && calls[name].write >= 1 && calls[name].writeText >= 1, name);
  for (const name of ['pane', 'pane-layout', 'file-search']) assert.equal(calls[name], undefined, name);
  assert.equal(calls['user-markdown'].write, 1);
  // 0.2.122: an array holds per-launch floors (run-suite indexes it by launch); each entry uses the same methods.
  for (const [name, floors] of Object.entries(calls)) {
    assert.ok(suites[name], name);
    for (const launch of Array.isArray(floors) ? floors : [floors])
      for (const method of Object.keys(launch)) assert.ok(['read', 'write', 'writeText', 'readText'].includes(method), `${name}: ${method}`);
  // readText: memory-clipboard.cjs records it (`readText(){record('readText');…}`); preview and file-editor paste back.
  }
  // changes-pane copies once (c219730b0 $e / c3e58cab4 Copy > Relative path) in its first launch only.
  assert.deepEqual(calls['changes-pane'], [{ read: 1, writeText: 1 }, {}]);
  // Frozen native-Retina baselines (transcript-fade 0.2.7, ui029 0.2.8) are compared at DPR 2.
  const scaled = new Function(`return ${runSuite.match(/const deviceScaleFactor=(\[.*?\])\.includes/)[1]}`)();
  for (const name of ['transcript-fade', 'ui029', 'user-markdown', 'edit-read']) assert.ok(scaled.includes(name), name);
  // pane-layout's second launch toggles the popout pin twice (fidelity F04 setAlwaysOnTop) and focuses the existing
  // popout exactly once (duplicate popout-open); menu-bar adds the F04 close-hides shows (Show App, activate, Show Main Window).
  const expectedBlocked = new Function(`return ${runSuite.match(/const expectedBlocked=(\{.*?\});/)[1]}`)();
  assert.deepEqual(expectedBlocked['pane-layout'], { 1: ['window.setAlwaysOnTop', 'window.setAlwaysOnTop', 'window.focus'] });
  assert.deepEqual(expectedBlocked['menu-bar'], { 0: ['window.show', 'window.show', 'window.focus', 'window.show', 'window.show', 'window.show'] });
  // ui029 reports failure through process.exitCode; run-suite imports it, so it must also throw.
  assert.match(fs.readFileSync(path.join(app, 'scripts/ui029-ui-test.mjs'), 'utf8'), /if\(failure\)\{process\.exitCode=1;throw failure;\}\s*$/);
  // The OS clipboard stays unreachable: every Electron reader is replaced before main.cjs loads.
  const bootstrap = fs.readFileSync(path.join(app, '../work/offscreen-app-integration-20260922/bootstrap.cjs'), 'utf8');
  const blocked = JSON.parse(bootstrap.match(/for\(const name of (\[[^\]]*\])\)electron\.clipboard\[name\]=forbidden/)[1].replaceAll("'", '"'));
  for (const method of ['readText', 'readHTML', 'readRTF', 'readBookmark', 'readFindText', 'readImage', 'readBuffer', 'read', 'has', 'availableFormats', 'writeText', 'write', 'clear'])
    assert.ok(blocked.includes(method), method);
});

test('0.2.124 registers the eight no-clipboard scripts with exact reports, no memory clipboard and the standalone fixture policy', () => {
  const expected = {
    'protocol-0155': ['protocol-0155-ui-test.mjs', 'analysis/batch-20260920/protocol-0155-ui-report.json'],
    'settings-rest': ['settings-rest-ui-test.mjs', 'analysis/batch-20260920/settings-rest-ui-report.json'],
    'session-actions': ['session-actions-ui-test.mjs', 'analysis/functions-20260920/session-actions-local.json'],
    'menus-states': ['menus-states-ui-test.mjs', 'analysis/batch-20260920/menus-states-ui-report.json'],
    'sidebar-rest': ['sidebar-rest-ui-test.mjs', 'analysis/batch-20260920/sidebar-rest-ui-report.json'],
    'transcript-scroll': ['transcript-scroll-ui-test.mjs', 'analysis/batch-20260920/transcript-scroll-ui-report.json'],
    'integration-race': ['integration-race-test.mjs', 'analysis/batch-20260920/integration-race-test.json'],
    'connection-lifecycle': ['connection-lifecycle-test.mjs', 'analysis/batch-20260920/connection-lifecycle-test.json'],
  };
  const calls = new Function(`return ${runSuite.match(/const clipboardCalls=(\{.*?\});/)[1]}`)();
  const expectedBlocked = new Function(`return ${runSuite.match(/const expectedBlocked=(\{.*?\});/)[1]}`)();
  const scaled = new Function(`return ${runSuite.match(/const deviceScaleFactor=(\[.*?\])\.includes/)[1]}`)();
  for (const [name, [script, report]] of Object.entries(expected)) {
    assert.deepEqual(suites[name], [script, report], name);
    const source = fs.readFileSync(path.join(app, 'scripts', script), 'utf8');
    // The canonical report is written with a passed field (session-actions picks -local.json when TEST_APP_PATH is unset).
    assert.ok(source.includes(path.basename(report)), `${name}: writes ${path.basename(report)}`);
    assert.match(source, /\bpassed\s*:|report\.passed\s*=/, `${name}: passed`);
    // No clipboard in these scripts, so no memory clipboard, DPR 1 and no blocked window calls.
    assert.doesNotMatch(source, /clipboard/i, `${name}: no clipboard use`);
    assert.equal(Object.hasOwn(calls, name), false, `${name}: no clipboardCalls entry`);
    assert.equal(scaled.includes(name), false, `${name}: DPR 1`);
    assert.equal(expectedBlocked[name], undefined, `${name}: no blocked window calls`);
  }
  // integration-race-test's proxy spawns only the allowed codex-server fixture (bootstrap proxyOf); connection-lifecycle
  // writes a standalone server accepted only by the exact standaloneOf shape (connection-lifecycle-test.mjs:8-21).
  const bootstrap = fs.readFileSync(path.join(app, '../work/offscreen-app-integration-20260922/bootstrap.cjs'), 'utf8');
  const standalone = bootstrap.match(/^const standaloneOf=.*$/m)[0];
  assert.equal(standalone, String.raw`const standaloneOf=binary=>{if(!binary?.startsWith(profile+path.sep)||path.basename(binary)!=='connection-server.cjs')return false;const [shebang,...rest]=fs.readFileSync(binary,'utf8').split('\n'),body=rest.join('\n');return /^#!(\/usr\/bin\/env node|\/\S+\/node)$/.test(shebang)&&!/spawn\(|exec|fork|\bimport\b|\beval\(|Function\(|process\.(binding|dlopen)|\b(child_process|net|http|https|tls|dgram|vm|worker_threads)\b|\brequire\b(?!\()/.test(body)&&[...body.matchAll(/require\(([^)]*)\)/g)].every(match=>/^'node:(fs|path|readline)'$/.test(match[1]));};`);
  // 0.2.125 appends stubbornOf (shutdown-ui-test) to the same disjunction; the three earlier rules stay first and unchanged.
  assert.match(bootstrap, /assert\(fixtures\.includes\(process\.env\.CODEX_BINARY\)\|\|proxyOf\(process\.env\.CODEX_BINARY\)\|\|standaloneOf\(process\.env\.CODEX_BINARY\)\|\|stubbornOf\(process\.env\.CODEX_BINARY\)\|\|coresSuite\(\)\);/);
  const connection = fs.readFileSync(path.join(app, 'scripts/connection-lifecycle-test.mjs'), 'utf8');
  assert.match(connection, /binary=path\.join\(profile,'connection-server\.cjs'\)/);
  assert.match(connection, /const fs=require\('node:fs'\),path=require\('node:path'\),readline=require\('node:readline'\);/);
  const race = fs.readFileSync(path.join(app, 'scripts/integration-race-test.mjs'), 'utf8');
  assert.equal(race.split('spawn(').length, 2);
  assert.match(race, /spawn\(process\.execPath,\[\$\{JSON\.stringify\(fixture\)\}\]/);
  assert.match(race, /fixture=path\.join\(root,'tests\/fixtures\/codex-server\.cjs'\)/);
});

test('0.2.125 registers the ten clipboard/lifecycle scripts with exact floors, the memory store surface and the git-rail/shutdown adapter rules', async () => {
  const adapter = path.join(app, '../work/offscreen-app-integration-20260922');
  const expected = {
    'workflow-package': ['workflow-package-ui-test.mjs', 'analysis/batch-20260920/workflow-package-ui-report.json'],
    git: ['git-ui-test.mjs', 'analysis/batch-20260920/git-ui-test.json'],
    highlight: ['highlight-ui-test.mjs', 'analysis/batch-20260920/highlight-ui-test.json'],
    'highlight-coalescing': ['highlight-coalescing-ui-test.mjs', 'analysis/batch-20260920/highlight-coalescing-ui-report.json'],
    'turn-footer': ['turn-footer-ui-test.mjs', 'analysis/batch-20260920/turn-footer-ui-report.json'],
    'user-actions': ['user-actions-ui-test.mjs', 'analysis/batch-20260920/user-actions-ui-report.json'],
    'rich-copy': ['rich-copy-ui-test.mjs', 'analysis/batch-20260920/rich-copy-ui-report.json'],
    'git-rail': ['git-rail-ui-test.mjs', 'analysis/batch-20260920/git-rail-ui-report.json'],
    shutdown: ['shutdown-ui-test.mjs', 'analysis/batch-20260920/shutdown-ui-test.json'],
    'file-search-shutdown': ['file-search-shutdown-test.mjs', 'analysis/batch-20260920/file-search-shutdown-test.json'],
  };
  const calls = new Function(`return ${runSuite.match(/const clipboardCalls=(\{.*?\});/)[1]}`)();
  const expectedBlocked = new Function(`return ${runSuite.match(/const expectedBlocked=(\{.*?\});/)[1]}`)();
  const scaled = new Function(`return ${runSuite.match(/const deviceScaleFactor=(\[.*?\])\.includes/)[1]}`)();
  const read = script => fs.readFileSync(path.join(app, 'scripts', script), 'utf8');
  for (const [name, [script, report]] of Object.entries(expected)) {
    assert.deepEqual(suites[name], [script, report], name);
    assert.ok(read(script).includes(path.basename(report)), `${name}: writes ${path.basename(report)}`);
    assert.equal(scaled.includes(name), false, `${name}: DPR 1 (no frozen Retina baseline)`);
    assert.equal(expectedBlocked[name], undefined, `${name}: no blocked window calls`);
  }
  // Exact floors (run-suite.mjs comment cites each product copy site); every copying suite saves with read() and restores with write().
  assert.deepEqual({ git: calls.git, highlight: calls.highlight, 'highlight-coalescing': calls['highlight-coalescing'], 'turn-footer': calls['turn-footer'], 'user-actions': calls['user-actions'], 'rich-copy': calls['rich-copy'] }, {
    git: { read: 1, writeText: 1, write: 1 }, highlight: { read: 1, writeText: 5, write: 1 }, 'highlight-coalescing': { read: 1, writeText: 2, write: 1 },
    'turn-footer': { read: 1, write: 4, writeText: 1 }, 'user-actions': { read: 1, write: 3, writeText: 1 }, 'rich-copy': { read: 1, write: 4, writeText: 2 } });
  for (const name of ['workflow-package', 'git-rail', 'shutdown', 'file-search-shutdown']) assert.equal(Object.hasOwn(calls, name), false, `${name}: OS clipboard stays blocked`);
  // workflow-package mentions the clipboard only in a restore guarded by a flag it never sets; the other three never mention it.
  assert.doesNotMatch(read('workflow-package-ui-test.mjs'), /clipboardSaved\s*=\s*true/);
  for (const script of ['git-rail-ui-test.mjs', 'shutdown-ui-test.mjs', 'file-search-shutdown-test.mjs']) assert.doesNotMatch(read(script), /clipboard/i, script);
  // Memory store surface is unchanged: the legacy readRTF/readImage/readBookmark snapshot branches in highlight/turn-footer/
  // user-actions/rich-copy are reached only when clipboard.read or ClipboardItem is missing, and the store provides both.
  const { createMemoryClipboard } = await import(path.join(adapter, 'memory-clipboard.cjs'));
  const store = createMemoryClipboard();
  assert.deepEqual(Object.keys(store.clipboard), ['readText', 'readHTML', 'writeText', 'writeHTML', 'clear', 'availableFormats', 'read', 'write']);
  assert.equal(typeof store.ClipboardItem, 'function');
  for (const script of ['highlight-ui-test.mjs', 'turn-footer-ui-test.mjs', 'user-actions-ui-test.mjs', 'rich-copy-ui-test.mjs']) {
    const source = read(script), items = source.indexOf('if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {'), legacy = source.indexOf('clipboard.readRTF()');
    assert.ok(items > 0 && legacy > items && source.slice(items, legacy).includes('return '), `${script}: ClipboardItem branch returns before the legacy readers`);
  }
  assert.match(read('highlight-coalescing-ui-test.mjs'), /electron\.launch\(\{executablePath,args:appPath\?\[\]:\[root\],env,timeout:20000\}\)/);
  // git-rail: only its composer-window relaunch may bypass args [appRoot], and bootstrap then loads that fixture instead of main.cjs.
  assert.ok(runSuite.includes("const fixtureEntry=path.join(appRoot,'tests/fixtures/composer-window.cjs');"));
  assert.ok(runSuite.includes("const entry=name==='git-rail'&&options.args?.length===1&&options.args[0]===fixtureEntry?fixtureEntry:null;"));
  assert.ok(runSuite.includes("if(entry)assert.equal(options.env.CODE_DESKTOP_DATA,undefined);else{assert.deepEqual(options.args,[appRoot]);"));
  const bootstrap = fs.readFileSync(path.join(adapter, 'bootstrap.cjs'), 'utf8');
  assert.ok(bootstrap.includes(String.raw`if(entry){assert.equal(entry,path.join(root,'tests/fixtures/composer-window.cjs'));assert.match(process.env.COMPOSER_FIXTURE_URL,/^http:\/\/127\.0\.0\.1:\d+\/tests\/fixtures\/git-rail-fixture\.html$/);assert.equal(process.env.CODEX_BINARY,undefined);}`));
  assert.ok(bootstrap.includes("if(entry)app.setPath('userData',path.join(profile,'user-data'));\nrequire(entry||path.join(root,'electron/main.cjs'));"));
  const composer = fs.readFileSync(path.join(app, 'tests/fixtures/composer-window.cjs'), 'utf8');
  assert.match(composer, /const \{ app, BrowserWindow \} = require\("electron"\);/);
  assert.match(composer, /show: false/);
  assert.match(read('git-rail-ui-test.mjs'), /args: \[path\.join\(root, "tests\/fixtures\/composer-window\.cjs"\)\], env: fixtureEnv/);
  assert.match(read('git-rail-ui-test.mjs'), /vite\?\.kill\("SIGTERM"\);/);
  // shutdown: its stubborn fake server is accepted only by the exact stubbornOf shape; turn-footer's repo fixture is allow-listed.
  assert.ok(bootstrap.includes("'approval-server.cjs','turn-footer-server.cjs']"));
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'tests/fixtures/turn-footer-server.cjs'), 'utf8'), /child_process|spawn\(|exec|\bnet\b|http/);
  assert.match(bootstrap, /assert\(fixtures\.includes\(process\.env\.CODEX_BINARY\)\|\|proxyOf\(process\.env\.CODEX_BINARY\)\|\|standaloneOf\(process\.env\.CODEX_BINARY\)\|\|stubbornOf\(process\.env\.CODEX_BINARY\)\|\|coresSuite\(\)\);/);
  const stubbornSource = bootstrap.match(/^const stubbornOf=.*$/m)[0];
  const stubbornOf = new Function('fs', 'path', 'profile', `${stubbornSource}\nreturn stubbornOf;`);
  const profile = fs.mkdtempSync(path.join(app, '../analysis/stubborn-rule-')), write = (name, text) => { const file = path.join(profile, name); fs.writeFileSync(file, text); return file; };
  try {
    const template = read('shutdown-ui-test.mjs').match(/await fs\.writeFile\(binary, `([\s\S]*?)`, \{ mode: 0o755 \}\);/)[1];
    const real = template.replaceAll('${JSON.stringify(log)}', JSON.stringify(path.join(profile, 'fixture-processes.jsonl'))).replaceAll('\\\\n', '\\n');
    const accept = stubbornOf(fs, path, profile);
    assert.equal(accept(write('stubborn-codex.cjs', real)), true);
    for (const bad of [real + "\nrequire('node:child_process');", real + '\nrequire("node:net");', real + '\nconst r=require;', real + '\nprocess.kill(1);', real + '\nimport("x");', real.replace("require('node:readline')", "require('readline')")])
      assert.equal(accept(write('stubborn-codex.cjs', bad)), false);
    assert.equal(accept(write('stubborn-codex.cjs', real.replace('#!/usr/bin/env node', '#!/bin/sh'))), false);
    assert.equal(accept(write('other-codex.cjs', real)), false);
    assert.equal(stubbornOf(fs, path, path.join(profile, 'nested'))(path.join(profile, 'stubborn-codex.cjs')), false);
  } finally { fs.rmSync(profile, { recursive: true, force: true }); }
  // A host that ends itself is accepted only with this launch's will-quit file; SIGKILL leaves record.closed unset.
  assert.ok(bootstrap.includes("JSON.stringify({launch:process.env.CODE_DESKTOP_OFFSCREEN_LAUNCH,evidence,clipboard:"));
  assert.ok(runSuite.includes("assert.equal(quit.launch,launcher);record.beforeClose={evidence:quit.evidence,clipboard:quit.clipboard,windows:quit.windows,at:'will-quit'};record.closed=true;"));
  assert.ok(runSuite.includes("record.beforeClose.evidence.created.every(w=>!w.visible&&!w.focused&&w.offscreen)"));
  // Every Electron clipboard entry point stays forbidden in bootstrap (no name removed).
  const blocked = JSON.parse(bootstrap.match(/for\(const name of (\[[^\]]*\])\)electron\.clipboard\[name\]=forbidden/)[1].replaceAll("'", '"'));
  assert.deepEqual(blocked, ['writeText', 'writeHTML', 'writeRTF', 'writeImage', 'writeBuffer', 'writeBookmark', 'writeFindText', 'write', 'clear', 'readText', 'readHTML', 'readRTF', 'readBookmark', 'readFindText', 'readImage', 'readBuffer', 'read', 'has', 'availableFormats']);
});

test('cores-ui-test runs without CODEX_BINARY only when no real core can spawn', () => {
  // cores-suite rule appended last to the bootstrap disjunction (Settings › Cores decides the core there).
  const bootstrap = fs.readFileSync(path.join(app, '../work/offscreen-app-integration-20260922/bootstrap.cjs'), 'utf8');
  const rule = bootstrap.match(/^const coresSuite=.*$/m)?.[0];
  assert.ok(rule, 'coresSuite rule present');
  for (const condition of ["process.env.CODEX_BINARY===undefined", "process.env.CODE_DESKTOP_CORE===undefined", "process.env.CODE_DESKTOP_DEEPSEEK_CORE===fixtures[0]",
    "process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS===''", "process.env.CODE_DESKTOP_CORE_RELEASE_MANIFEST?.startsWith(path.dirname(profile)+path.sep)", "process.env.DSH_HOME?.startsWith(profile+path.sep)"])
    assert.ok(rule.includes(condition), condition);
  assert.ok(bootstrap.indexOf(rule) < bootstrap.indexOf('const entry=process.env.CODE_DESKTOP_VERIFY_ENTRY;'), 'defined before the if/else');
});
