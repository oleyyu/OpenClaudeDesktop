// w11-cu-protected-names: the save-panel guard's protected lists (electron/computer-use/save-panel.cjs) compared entry
// by entry with 3.6556.2 (asar .vite/build/index.chunk-jPKPzV-P.js wCr / TCr / ECr / DCr / ICr / LCr / RCr / zCr / BCr /
// VCr / qCr and the folder-rule Map JCr), and watch-record's start() refusing a controller that is not set up (3.6556.2
// index.chunk-DinDpVtd.js nn). The official chunks are only read and parsed (rolldown parseAst), never run; nothing here
// touches the keyboard, the mouse, the focus or a real window.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseAst } = require('rolldown/parseAst');
const { policy, lists, createProtectedIndex } = require('../electron/computer-use/save-panel.cjs');
const watchRecord = require('../electron/computer-use/watch-record.cjs');

const BUILD = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/', import.meta.url);
const MAIN = fs.readFileSync(new URL('index.chunk-jPKPzV-P.js', BUILD), 'utf8');
const WATCH = fs.readFileSync(new URL('index.chunk-DinDpVtd.js', BUILD), 'utf8');

// ── The official lists, found by content (not by minified name) ──
const strings = (node) => node?.type === 'ArrayExpression' && node.elements.every((e) => e?.type === 'Literal' && typeof e.value === 'string')
  ? node.elements.map((e) => e.value) : null;
function officialLists() {
  // The one top-level `var` statement that holds the shell start-up file list.
  const start = MAIN.indexOf('"Library/Application Support/SuperCollider/startup.scd"');
  assert.ok(start > 0 && MAIN.indexOf('"Library/Application Support/SuperCollider/startup.scd"', start + 1) === -1, 'one SuperCollider entry');
  const body = parseAst(MAIN).body;
  const stmt = body.find((s) => s.type === 'VariableDeclaration' && s.start < start && s.end > start);
  const decls = new Map(stmt.declarations.map((d) => [d.id.name, d.init]));
  const pick = (test, what) => {
    const found = stmt.declarations.filter((d) => test(d.init));
    assert.equal(found.length, 1, what);
    return found[0];
  };
  const has = (value) => (init) => strings(init)?.includes(value);
  const shell = pick(has('.zshrc'), 'shell files'), names = pick(has('gitdir'), 'names'), opens = pick(has('.webloc'), 'opens and runs');
  const userConfig = pick(has('.config/git/config'), 'home config files'), prefixes = pick(has('opt/homebrew'), 'tool prefixes');
  const toolFolders = pick(has('share/bash-completion/completions'), 'tool folders'), ssh = pick(has('authorized_keys'), 'ssh names');
  const repoConfig = pick((init) => JSON.stringify(strings(init)) === '[".git/config"]', 'repo config');
  const homeFolders = pick((init) => init?.type === 'ArrayExpression' && init.elements.length > 0
    && init.elements.every((e) => e.type === 'ObjectExpression' && e.properties[0]?.key?.name === 'homeRelativePath'), 'home folders');
  const patterns = pick((init) => init?.type === 'ArrayExpression' && init.elements.length > 0 && init.elements.every((e) => e.type === 'Literal' && e.regex), 'path patterns');
  // A refusedSaveNames value: "always" (`()=>!0`), or the suffixes it refuses (`DH(".fish")`, `e=>…endsWith(".plist")`).
  const describe = (node) => {
    if (node.type === 'Identifier') return describe(decls.get(node.name));
    if (node.type === 'ArrowFunctionExpression' && node.body.type === 'UnaryExpression' && node.body.argument.value === 0) return 'always';
    if (node.type === 'CallExpression') return node.arguments.map((a) => a.value);
    const text = MAIN.slice(node.start, node.end), m = /\.endsWith\("([^"]+)"\)/.exec(text);
    assert.ok(m, `a refusedSaveNames rule: ${text}`);
    return [m[1]];
  };
  const homeFolderList = homeFolders.init.elements.map((o) => {
    const [p, rule] = o.properties;
    return { homeRelativePath: p.value.value, refused: describe(rule.value) };
  });
  // qCr: the name prefixes (p10k, zcompdump), `[…].map(AH)` in the next statement.
  const prefixStmt = body.find((s) => s.type === 'VariableDeclaration' && s.start > stmt.end
    && s.declarations.some((d) => d.init?.type === 'CallExpression' && strings(d.init.callee.object)?.includes('p10k-instant-prompt-')));
  const prefixList = strings(prefixStmt.declarations.find((d) => strings(d.init?.callee?.object)?.includes('p10k-instant-prompt-')).init.callee.object);
  // JCr: new Map([["bin", …], …]) in the same statement.
  const map = prefixStmt.declarations.find((d) => d.init?.type === 'NewExpression' && d.init.callee.name === 'Map').init;
  const role = new Map([[homeFolders.id.name, 'homeFolders'], [prefixes.id.name, 'prefixes'], [userConfig.id.name, 'userConfig'], [repoConfig.id.name, 'repoConfig']]);
  const folderRules = map.arguments[0].elements.map((e) => {
    if (e.type === 'ArrayExpression') return { key: e.elements[0].value, rule: MAIN.slice(e.elements[1].start, e.elements[1].end) };
    const target = e.argument.callee.object; // X.map(…) or [...A, ...B].map(…)
    const from = target.type === 'Identifier' ? [role.get(target.name)] : target.elements.map((s) => role.get(s.argument.name));
    return { spread: from };
  });
  return {
    SHELL_FILES: strings(shell.init), GIT_NAMES: strings(names.init), OPENS_AND_RUNS: strings(opens.init), GIT_USER_CONFIG: strings(userConfig.init),
    TOOL_PREFIXES: strings(prefixes.init), BASH_COMPLETIONS: strings(toolFolders.init), GIT_REPO_CONFIG: strings(repoConfig.init), SSH_NAMES: strings(ssh.init),
    PATH_PATTERNS: patterns.init.elements.map((e) => [e.regex.pattern, e.regex.flags]), HOME_FOLDERS: homeFolderList, PROTECTED_PREFIXES: prefixList, folderRules,
  };
}
const official = officialLists();

test('the official lists are the 3.6556.2 ones (the new start-up files, MERGE_RR, rr-cache, antidote, the app patterns are there)', () => {
  assert.ok(official.SHELL_FILES.includes('Library/Application Support/iTerm/Scripts/AutoLaunch.scpt'));
  assert.ok(official.GIT_NAMES.includes('MERGE_RR') && official.GIT_NAMES.includes('userSetup.py'));
  assert.ok(official.GIT_USER_CONFIG.includes('Library/Application Support/QGIS/QGIS3/startup.py'));
  assert.ok(official.TOOL_PREFIXES.includes('rr-cache') && official.BASH_COMPLETIONS.includes('caches/antidote'));
  assert.ok(official.PATH_PATTERNS.some(([p]) => p.includes('igor procedures')));
  assert.equal(official.PATH_PATTERNS.length, 20);
});

test('save-panel lists = 3.6556.2, entry by entry and in order', () => {
  for (const key of ['SHELL_FILES', 'GIT_NAMES', 'OPENS_AND_RUNS', 'GIT_USER_CONFIG', 'TOOL_PREFIXES', 'BASH_COMPLETIONS', 'GIT_REPO_CONFIG', 'SSH_NAMES', 'PROTECTED_PREFIXES']) {
    const expected = key === 'PROTECTED_PREFIXES' ? official[key].map(policy.fold) : official[key];
    assert.deepEqual(lists[key], expected, key);
  }
  assert.deepEqual(lists.PATH_PATTERNS.map((re) => [re.source, re.flags]), official.PATH_PATTERNS, 'PATH_PATTERNS');
});

test('save-panel home folders = 3.6556.2: the same paths in order, each refusing the same names', () => {
  assert.deepEqual(lists.HOME_FOLDERS.map((e) => e.homeRelativePath), official.HOME_FOLDERS.map((e) => e.homeRelativePath));
  lists.HOME_FOLDERS.forEach((entry, i) => {
    const want = official.HOME_FOLDERS[i].refused;
    if (want === 'always') { assert.equal(entry.refusedSaveNames, lists.ALWAYS, entry.homeRelativePath); return; }
    assert.notEqual(entry.refusedSaveNames, lists.ALWAYS, entry.homeRelativePath);
    for (const suffix of want) {
      assert.equal(entry.refusedSaveNames(`a${suffix}`), true, `${entry.homeRelativePath} ${suffix}`);
      assert.equal(entry.refusedSaveNames(`a${suffix}. `), true, `${entry.homeRelativePath} ${suffix} with trailing dots`);
    }
    assert.equal(entry.refusedSaveNames('a.txt'), false, entry.homeRelativePath);
  });
});

test('save-panel folder rules = 3.6556.2 JCr: the same folder names in the same Map order', () => {
  const fold = policy.fold, base = (p) => p.slice(p.lastIndexOf('/') + 1), dir = (p) => p.slice(0, Math.max(0, p.lastIndexOf('/')));
  const keys = official.folderRules.flatMap((entry) => {
    if (entry.key !== undefined) return [entry.key];
    return entry.spread.flatMap((role) => role === 'homeFolders' ? official.HOME_FOLDERS.map((e) => fold(base(e.homeRelativePath)))
      : role === 'prefixes' ? official.TOOL_PREFIXES.map(base)
        : role === 'userConfig' ? official.GIT_USER_CONFIG.map((e) => fold(base(dir(e))))
          : official.GIT_REPO_CONFIG.map((e) => fold(base(dir(e)))));
  });
  assert.deepEqual([...lists.FOLDER_RULES.keys()], [...new Map(keys.map((k) => [k, true])).keys()]);
  // The two literal rules 3.6556.2 added, as written there.
  assert.ok(official.folderRules.some((e) => e.key === 'scripts' && /===\s*"autolaunch"$/.test(e.rule)));
  assert.ok(official.folderRules.some((e) => e.key === 'igor procedures' && /^\w+\("\.ipf"\)$/.test(e.rule)));
});

test('the 3.6556.2 additions refuse what they protect, and ordinary names stay allowed', () => {
  for (const name of ['startup.scd', '__startup.lua', '__startup.eel', 'AutoLaunch.scpt', 'userSetup.py', 'userSetup.mel', 'StartupMacros.txt',
    'StartupMacros.ijm', 'StartupMacros.fiji.ijm', 'RunAtStartup.ijm', 'MERGE_RR', 'merge_rr']) {
    assert.equal(policy.isProtectedName(name), true, name);
  }
  for (const name of ['startup.txt', 'setup.py', 'macros.ijm', 'notes.txt']) assert.equal(policy.isProtectedName(name), false, name);
  assert.equal(policy.saveVerdict('Scripts', 'AutoLaunch'), 'name_in_folder');
  assert.equal(policy.saveVerdict('Scripts', 'notes.txt'), null);
  assert.equal(policy.saveVerdict('Igor Procedures', 'proc.ipf'), 'name_in_folder');
  assert.equal(policy.saveVerdict('Igor Procedures', 'proc.txt'), null);
  assert.equal(policy.saveVerdict('rr-cache', 'anything'), 'folder');
  assert.equal(policy.saveVerdict('QGIS3', 'startup.py'), 'name_in_folder');
  assert.equal(policy.saveVerdict('QGIS3', 'other.py'), null);
  for (const p of ['/r/.git/MERGE_RR', '/r/.git/worktrees/w/MERGE_RR', '/r/.git/rr-cache/abc/preimage', '/Users/me/Library/Caches/antidote/x.zsh',
    '/Users/me/Library/Caches/antibody/x', '/Users/me/Library/Application Support/Blender/4.2/scripts/startup/a.py',
    '/Users/me/Library/Application Support/SketchUp 2024/SketchUp/Plugins/a.rb', '/Users/me/Library/Application Support/FreeCAD/Mod/m/InitGui.py',
    '/Users/me/Documents/KiCad/8.0/scripting/plugins/p/__init__.py', '/Users/me/Documents/WaveMetrics/Igor Pro 9 User Files/Igor Procedures/a/b.ipf',
    '/Applications/Fiji.app/macros/AutoRun/a.ijm', '/Applications/ImageJ.app/macros/StartupMacros.txt']) {
    assert.equal(policy.pathIsProtectedByPattern(p), true, p);
  }
  for (const p of ['/Users/me/Documents/report.py', '/Users/me/Library/Caches/other/x', '/r/.git/merge_rr.txt']) assert.equal(policy.pathIsProtectedByPattern(p), false, p);
  // A save sheet's parents (innermost first) under a plugin cache, and under an ordinary folder.
  assert.deepEqual(policy.parentsVerdict('x.zsh', ['antidote', 'Caches', 'Library', 'me', 'Users']), { allowed: false, reason: 'confirm_folder_protected' });
  assert.deepEqual(policy.parentsVerdict('x.zsh', ['Projects', 'me', 'Users']), { allowed: true });
});

test('the protected index covers the new home files (a temporary home, nothing written there)', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'w11-cu-protected-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const index = createProtectedIndex({ home });
  for (const rel of ['Library/Application Support/SuperCollider/startup.scd', 'Library/Application Support/REAPER/Scripts/__startup.lua',
    'Library/Application Support/iTerm/Scripts/AutoLaunch.scpt', 'Library/Application Support/QGIS/QGIS3/startup.py']) {
    assert.equal(await index.isProtectedUrl(pathToFileURL(path.join(home, rel)).href), true, rel);
  }
  assert.equal(await index.isProtectedUrl(pathToFileURL(path.join(home, 'Documents/notes.txt')).href), false);
});

// ── watch-record: 3.6556.2 nn refuses a controller initCuWatchRecord has not set up ──
const CONTROLLER = '[watch-record] start blocked \\u2014 controller not set up (initCuWatchRecord has not run)';

test('official nn: the controller check comes right after the platform check and before the context gate', () => {
  const at = WATCH.indexOf(CONTROLLER);
  assert.ok(at > 0 && WATCH.indexOf(CONTROLLER, at + 1) === -1, 'one controller check');
  const platform = WATCH.lastIndexOf('[watch-record] start blocked \\u2014 unsupported platform', at);
  const context = WATCH.indexOf('[watch-record] start blocked \\u2014 context recording gate disabled', at);
  assert.ok(platform > 0 && context > at && context - platform < 600, 'platform, controller, context in that order');
  assert.match(WATCH.slice(platform, at), /if\(![\w$]{1,3}\|\|![\w$]{1,3}\)return [\w$]+\.[\w$]+\.warn\("$/);
  // Its two values are the ones initCuWatchRecord sets.
  const [, a, b] = /if\(!([\w$]{1,3})\|\|!([\w$]{1,3})\)return [\w$]+\.[\w$]+\.warn\("$/.exec(WATCH.slice(platform, at));
  assert.match(WATCH, new RegExp(`function [\\w$]+\\(e,t,n,r\\)\\{${a.replace('$', '\\$')}=t,${b.replace('$', '\\$')}=e,`));
  assert.match(WATCH, /exports\.initCuWatchRecord=/);
});

function controller(over = {}) {
  const logs = [];
  const log = { info: (m) => logs.push(['info', m]), warn: (m) => logs.push(['warn', m]) };
  const calls = [];
  const native = { call: async (method) => { calls.push(method); throw new Error(`unexpected ${method}`); } };
  const options = { native, BrowserWindow: function FakeWindow() { throw new Error('no window may open'); }, screen: { getDisplayNearestPoint: () => ({ id: 1, bounds: {} }) },
    systemPreferences: { getMediaAccessStatus: () => 'granted' }, fs: { rm: async () => {} }, tmpdir: () => os.tmpdir(),
    permissions: async () => ({ screenRecording: true, accessibility: true }), platform: 'darwin', log, ...over };
  return { recorder: watchRecord.createWatchRecord(options), logs, calls };
}

test('watch-record start(): a controller made without its computer-use side or window plumbing refuses as 3.6556.2 does', async () => {
  for (const missing of ['native', 'BrowserWindow', 'screen']) {
    for (const purpose of ['skill', 'context']) {
      const { recorder, logs, calls } = controller({ [missing]: null });
      assert.equal(await recorder.start(undefined, false, { purpose }), watchRecord.RESULT.Cancelled, missing);
      assert.deepEqual(logs, [['warn', '[watch-record] start blocked — controller not set up (initCuWatchRecord has not run)']], `${missing} ${purpose}`);
      assert.deepEqual(calls, []);
    }
  }
  // The platform check still comes first.
  const { recorder, logs } = controller({ native: null, platform: 'linux' });
  assert.equal(await recorder.start(undefined, false, { purpose: 'skill' }), watchRecord.RESULT.Cancelled);
  assert.deepEqual(logs, [['info', '[watch-record] start blocked — unsupported platform']]);
  // Set up, the context purpose reaches its own gate as before.
  const set = controller();
  assert.equal(await set.recorder.start(undefined, false, { purpose: 'context' }), watchRecord.RESULT.Cancelled);
  assert.deepEqual(set.logs, [['info', '[watch-record] start blocked — context recording gate disabled']]);
});
