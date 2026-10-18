// R4g-composer CP6 (composer-14): the composer's layered permission mode (2.42304.0 c227f4d5e JI over c8eb45883 d) on
// the host. The generated d is compared with the shipped text, the host layers run as a pure reducer, and the two hooks
// (permission-mode-resolution.mjs, source-bypass-permission.jsx) are rendered once with Vite SSR (hmr and ws off).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { resolvePermissionBaseMode } from '../src/generated/permission-mode/resolution.mjs';
import { extractPermissionMode } from '../scripts/extract-permission-mode.mjs';
import {
  FOLDER_PERMISSION_KEY, SESSION_PERMISSION_KEY, SESSION_PERMISSION_LIMIT, readSessionModes, rememberSessionMode, writeSessionModes, draftFolderMove, folderPickWrites, initialPermissionLayers, permissionFolderKey, permissionLayersReducer,
  permissionOpeningKey, readFolderPicks, resolveOpeningMode, usePermissionModeLayers, writeFolderPicks,
} from '../src/permission-mode-resolution.mjs';
import { savedPermission } from '../electron/preferences.mjs';

const app = path.resolve(import.meta.dirname, '..');
const official = name => fs.readFileSync(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const memoryStorage = (initial = {}) => {
  const memory = new Map(Object.entries(initial));
  return { memory, getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
};

let server, Bypass;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Bypass = await server.ssrLoadModule('/src/source-bypass-permission.jsx');
});
after(async () => { await server?.close(); });

test('generated d is the shipped c8eb45883 d (byte slice, --check clean) and agrees with it on every layer combination', async () => {
  await extractPermissionMode({ check: true });
  const chunk = official('c8eb45883-BKWHnsew.js');
  assert.equal(count(chunk, 'baseMode:e??t??r??n??i,'), 1);
  const at = chunk.indexOf('function d({'), shipped = new Function(`${chunk.slice(at, chunk.indexOf('export{', at))}; return d;`)();
  const values = { userChoice: [null, 'ask', 'plan'], userSettingsDefault: [undefined, 'acceptEdits'], folderChoice: [undefined, 'bypass'],
    repoSettingsDefault: [undefined, 'ask'], globalPref: ['auto', 'acceptEdits'], consultedStoredGlobalPref: [null, 'auto'], storedPickLayersSettled: [false, true] };
  let combos = [{}];
  for (const [key, list] of Object.entries(values)) combos = combos.flatMap(combo => list.map(value => ({ ...combo, [key]: value })));
  assert.equal(combos.length, 3 * 2 ** 6);
  for (const combo of combos) assert.deepEqual(resolvePermissionBaseMode(combo), shipped(combo), JSON.stringify(combo));
  // The order: userChoice, settings default, folder pick, repo default, global.
  const base = { userChoice: null, userSettingsDefault: undefined, repoSettingsDefault: undefined, folderChoice: undefined, globalPref: 'auto', consultedStoredGlobalPref: 'auto', storedPickLayersSettled: true };
  assert.equal(resolvePermissionBaseMode({ ...base, repoSettingsDefault: 'ask', folderChoice: 'acceptEdits' }).baseMode, 'acceptEdits');
  assert.equal(resolvePermissionBaseMode({ ...base, repoSettingsDefault: 'ask' }).baseModeSource, 'repo_settings_default_mode');
  assert.equal(resolvePermissionBaseMode({ ...base, userSettingsDefault: 'ask', folderChoice: 'acceptEdits' }).baseModeSource, 'settings_default_mode');
});

test('the c227f4d5e call sites the host adapter follows are pinned once each', () => {
  const manifest = JSON.parse(local('src/generated/permission-mode/manifest.json'));
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  const pins = manifest.pins['c227f4d5e-Ba-r--Rl.js'];
  assert.ok(pins.length >= 12);
  for (const pin of pins) assert.equal(count(composer, pin), 1, pin);
  assert.ok(pins.includes('_=!!h&&o!=="approval_card"&&a!=="plan"&&!(a==="bypassPermissions"&&zI(h));tt(a),_&&Ke(e=>({...e,[h]:a}))'));
  assert.ok(pins.includes('[Ge,Ke]=Bc("epitaxy-folder-permission-mode",BI,{scope:"account"})'));
  // The global preference: only the auto-default nudge (DI O) writes it, and it is a GrowthBook-gated account pref.
  assert.equal(count(composer, 'O=H(()=>(n("auto"),a("auto")),[a,n])'), 1);
  assert.equal(count(composer, 'oe=we("ccd_auto_default_mode")'), 1);
});

test('host layers: opening and folder keys, which picks become the folder pick, the draft folder move', () => {
  assert.equal(permissionOpeningKey({}), 'draft:code');
  assert.equal(permissionOpeningKey({ surface: 'chat' }), 'draft:chat');
  assert.equal(permissionOpeningKey({ sessionId: 't1', surface: 'chat' }), 'session:t1');
  assert.equal(permissionFolderKey({ draftCwd: '/r/a' }), '/r/a');
  assert.equal(permissionFolderKey({ draftCwd: '' }), null);
  assert.equal(permissionFolderKey({ sessionId: 't', originCwd: '/r/a', sessionCwd: '/wt/x' }), '/r/a');
  assert.equal(permissionFolderKey({ sessionId: 't', sessionCwd: '/r/a/.claude/worktrees/x' }), '/r/a');
  assert.equal(permissionFolderKey({ sessionId: 't', draftCwd: '/r/b' }), null, 'a session never borrows the draft folder');
  assert.equal(folderPickWrites({ folderKey: '/r/a', value: 'acceptEdits' }), true);
  assert.equal(folderPickWrites({ folderKey: '/r/a', value: 'bypass' }), true);
  assert.equal(folderPickWrites({ folderKey: '/r/a', value: 'plan' }), false);
  assert.equal(folderPickWrites({ folderKey: '/r/a', value: 'ask', how: 'approval_card' }), false);
  assert.equal(folderPickWrites({ folderKey: null, value: 'ask' }), false);
  assert.deepEqual(draftFolderMove({ previous: null, next: '/r/a', userChoice: 'ask' }), { save: { key: '/r/a', value: 'ask' }, reset: true });
  assert.deepEqual(draftFolderMove({ previous: null, next: '/r/a', userChoice: 'plan' }), { save: null, reset: true });
  assert.deepEqual(draftFolderMove({ previous: '/r/a', next: '/r/b', userChoice: 'ask' }), { save: null, reset: true });
  assert.deepEqual(draftFolderMove({ previous: '/r/a', next: '/r/a', userChoice: 'ask' }), { save: null, reset: false });
});

test('host layers: a pick in folder A is A\'s pick only; a new draft in folder B shows the Settings default (the composer-14 scenario)', () => {
  let state = initialPermissionLayers({});
  const draft = permissionOpeningKey({});
  const resolve = (folderKey, globalPref = 'auto') => resolveOpeningMode({ userChoice: state.choices[draft] ?? null, folderChoice: folderKey ? state.folders[folderKey] : undefined, globalPref });
  state = permissionLayersReducer(state, { type: 'folder', openingKey: draft, folderKey: '/r/a' });
  assert.deepEqual(resolve('/r/a'), { mode: 'auto', source: 'global_pick', hasExplicitChoice: false });
  state = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/r/a', value: 'acceptEdits', current: 'auto' });
  assert.deepEqual(state.choices, { [draft]: 'acceptEdits' });
  assert.deepEqual(state.folders, { '/r/a': 'acceptEdits' });
  assert.equal(resolve('/r/a').source, 'in_session_pick');
  // Folder B: the move clears the draft's pick, B has none, so the Settings default shows.
  state = permissionLayersReducer(state, { type: 'folder', openingKey: draft, folderKey: '/r/b' });
  assert.deepEqual(state.choices, {});
  assert.deepEqual(resolve('/r/b'), { mode: 'auto', source: 'global_pick', hasExplicitChoice: false });
  assert.equal(resolve('/r/b', 'ask').mode, 'ask', 'the Settings default stays in effect');
  // Back in A: A's pick.
  state = permissionLayersReducer(state, { type: 'folder', openingKey: draft, folderKey: '/r/a' });
  assert.deepEqual(resolve('/r/a'), { mode: 'acceptEdits', source: 'folder_pick', hasExplicitChoice: true });
  // Plan is the opening's pick only; the approval card's pick never becomes the folder's; the same mode is no pick.
  state = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/r/a', value: 'plan', current: 'acceptEdits' });
  assert.equal(resolve('/r/a').mode, 'plan');
  assert.deepEqual(state.folders, { '/r/a': 'acceptEdits' });
  state = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/r/a', value: 'ask', how: 'approval_card', current: 'plan' });
  assert.deepEqual(state.folders, { '/r/a': 'acceptEdits' });
  const same = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/r/a', value: 'ask', current: 'ask' });
  assert.equal(same, state);
  assert.equal(permissionLayersReducer(state, { type: 'pick', openingKey: draft, value: 'nope', current: 'ask' }), state);
  // A stored Plan folder pick is ignored (official Qe), as is a pick made before a folder carried into the first one.
  assert.equal(resolveOpeningMode({ folderChoice: 'plan', globalPref: 'ask' }).mode, 'ask');
  let fresh = permissionLayersReducer(initialPermissionLayers({}), { type: 'folder', openingKey: draft, folderKey: null });
  fresh = permissionLayersReducer(fresh, { type: 'pick', openingKey: draft, folderKey: null, value: 'ask', current: 'auto' });
  assert.deepEqual(fresh.folders, {});
  fresh = permissionLayersReducer(fresh, { type: 'folder', openingKey: draft, folderKey: '/r/c' });
  assert.deepEqual(fresh.folders, { '/r/c': 'ask' });
  assert.deepEqual(fresh.choices, {});
});

test('host layers: a running session is its own pick, else the mode it started with, else the Settings default; Bypass drops with the opt-in', () => {
  assert.deepEqual(resolveOpeningMode({ sessionId: 't', globalPref: 'acceptEdits', folderChoice: 'ask' }), { mode: 'acceptEdits', source: 'global_pick', hasExplicitChoice: false });
  assert.equal(resolveOpeningMode({ sessionId: 't', spawnMode: 'ask', globalPref: 'auto' }).mode, 'ask');
  assert.equal(resolveOpeningMode({ sessionId: 't', userChoice: 'plan', spawnMode: 'ask', globalPref: 'auto' }).mode, 'plan');
  assert.equal(resolveOpeningMode({ globalPref: 'bogus' }).mode, 'auto');
  const draft = permissionOpeningKey({});
  let state = initialPermissionLayers({ '/r/a': 'bypass', '/r/b': 'ask' });
  state = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/r/b', value: 'acceptEdits', current: 'ask' });
  state = permissionLayersReducer(state, { type: 'adopt', sessionId: 't1', openingKey: draft, mode: 'acceptEdits' });
  assert.deepEqual(state.spawn, { t1: 'acceptEdits' });
  assert.equal(state.choices[draft], 'acceptEdits', 'a start beside the draft leaves the draft alone');
  state = permissionLayersReducer(state, { type: 'entered', sessionId: 't1' });
  assert.deepEqual(state.choices, {}, 'opening the session it became clears the draft opening');
  assert.equal(permissionLayersReducer(state, { type: 'entered', sessionId: 't1' }), state);
  state = permissionLayersReducer(state, { type: 'pick', openingKey: 'session:t1', folderKey: '/r/b', value: 'bypass', current: 'acceptEdits' });
  assert.deepEqual(state.folders, { '/r/a': 'bypass', '/r/b': 'bypass' }, 'a Bypass pick in a session is its folder\'s pick too (gn)');
  state = permissionLayersReducer(state, { type: 'purgeBypass' });
  assert.deepEqual(state.folders, {}, 'the opt-in turned off: no remembered Bypass survives (the initial /r/a one included)');
  assert.deepEqual(state.choices, {});
  assert.equal(permissionLayersReducer(state, { type: 'purgeBypass' }), state);
});

test('R4g fix: a session keeps its mode across a restart (host stand-in for _t = s?.permissionMode), a pick in it updates it, Bypass drops with the opt-in', () => {
  // Official: the running-session chain reads the session record's permissionMode before the spawn mode and the global.
  assert.equal(count(official('c227f4d5e-Ba-r--Rl.js'), '_t=s?.permissionMode,vt=tm('), 1);
  assert.equal(count(official('c227f4d5e-Ba-r--Rl.js'), 'J=M(()=>o?q??(vt?"bypassPermissions":void 0)??_t??yt??l??De'), 1);
  const storage = memoryStorage();
  const draft = permissionOpeningKey({});
  let run = initialPermissionLayers(readFolderPicks(storage), readSessionModes(storage));
  run = permissionLayersReducer(run, { type: 'adopt', sessionId: 't1', openingKey: draft, mode: 'acceptEdits' });
  assert.deepEqual(run.sessions, { t1: 'acceptEdits' }, 'the mode a session starts with is recorded for it');
  run = permissionLayersReducer(run, { type: 'pick', openingKey: 'session:t1', folderKey: '/r/a', value: 'ask', current: 'acceptEdits' });
  assert.deepEqual(run.sessions, { t1: 'ask' }, 'an in-session Mode-menu pick becomes the session\'s mode');
  run = permissionLayersReducer(run, { type: 'pick', openingKey: draft, folderKey: '/r/b', value: 'plan', current: 'ask' });
  assert.deepEqual(run.sessions, { t1: 'ask' }, 'a draft pick is not a session mode');
  assert.equal(writeSessionModes(storage, run.sessions), true);
  // Restart: in-memory picks and spawn modes are gone; the recorded mode wins over the Settings default.
  const restarted = initialPermissionLayers(readFolderPicks(storage), readSessionModes(storage));
  assert.deepEqual(restarted.spawn, {});
  assert.deepEqual(resolveOpeningMode({ sessionId: 't1', sessionMode: restarted.sessions.t1, globalPref: 'auto' }), { mode: 'ask', source: 'session_mode', hasExplicitChoice: false });
  assert.equal(resolveOpeningMode({ sessionId: 't0', sessionMode: restarted.sessions.t0, globalPref: 'auto' }).mode, 'auto', 'a session with no record: the Settings default');
  assert.equal(resolveOpeningMode({ sessionId: 't1', userChoice: 'plan', sessionMode: 'ask', spawnMode: 'auto' }).mode, 'plan', 'q first');
  assert.equal(resolveOpeningMode({ sessionId: 't1', sessionMode: 'ask', spawnMode: 'auto' }).mode, 'ask', '_t before l');
  // Storage hygiene and the cap.
  assert.deepEqual(readSessionModes(memoryStorage({ [SESSION_PERMISSION_KEY]: JSON.stringify({ a: 'ask', b: 'bogus', '': 'auto' }) })), { a: 'ask' });
  assert.deepEqual(readSessionModes({ getItem() { throw new Error('denied'); } }), {});
  assert.equal(writeSessionModes({ setItem() { throw new Error('full'); } }, {}), false);
  let many = {};
  for (let i = 0; i <= SESSION_PERMISSION_LIMIT; i++) many = rememberSessionMode(many, 's' + i, 'ask');
  assert.equal(Object.keys(many).length, SESSION_PERMISSION_LIMIT);
  assert.equal(many.s0, undefined, 'the oldest session drops first');
  many = rememberSessionMode(many, 's1', 'plan');
  assert.deepEqual(Object.keys(many).at(-1), 's1', 'a re-recorded session becomes the newest');
  // Bypass: a recorded Bypass session mode does not survive the opt-in turning off.
  let bypassed = permissionLayersReducer(initialPermissionLayers({}, { t1: 'bypass', t2: 'ask' }), { type: 'purgeBypass' });
  assert.deepEqual(bypassed.sessions, { t2: 'ask' });
  assert.equal(permissionLayersReducer(bypassed, { type: 'purgeBypass' }), bypassed);
});

test('folder picks persist under the official key; bad entries and broken storage read as none', () => {
  const storage = memoryStorage({ [FOLDER_PERMISSION_KEY]: JSON.stringify({ '/r/a': 'ask', '/r/b': 'bogus', '': 'auto' }) });
  assert.deepEqual(readFolderPicks(storage), { '/r/a': 'ask' });
  assert.equal(writeFolderPicks(storage, { '/r/c': 'plan' }), true);
  assert.equal(storage.memory.get(FOLDER_PERMISSION_KEY), '{"/r/c":"plan"}');
  assert.deepEqual(readFolderPicks(memoryStorage({ [FOLDER_PERMISSION_KEY]: '[1]' })), {});
  assert.deepEqual(readFolderPicks({ getItem() { throw new Error('denied'); } }), {});
  assert.deepEqual(readFolderPicks(null), {});
  assert.equal(writeFolderPicks({ setItem() { throw new Error('full'); } }, {}), false);
});

test('the hooks together: the draft reads its folder pick, the Settings default elsewhere, and Bypass stays behind the opt-in', () => {
  const storage = memoryStorage({ [FOLDER_PERMISSION_KEY]: JSON.stringify({ '/r/a': 'acceptEdits', '/r/x': 'bypass' }) });
  const seen = [];
  function Probe({ folder, sessionId = null, globalPref, enabled = true }) {
    const layers = usePermissionModeLayers({ globalPref, sessionId, folder, storage });
    const bypass = Bypass.useBypassPermission({ permission: globalPref, enabled, mode: 'code', sessionKey: sessionId, cwd: folder, connectionKey: 'c', layers, onChange: (...args) => seen.push(args) });
    return React.createElement('i', { 'data-mode': bypass.permission, 'data-layer': layers.mode, 'data-source': layers.source, 'data-other': bypass.forSession('t9', null) });
  }
  const render = props => Object.fromEntries([...renderToString(React.createElement(Probe, props)).matchAll(/data-(\w+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  assert.deepEqual(render({ folder: '/r/a', globalPref: 'auto' }), { mode: 'acceptEdits', layer: 'acceptEdits', source: 'folder_pick', other: 'auto' });
  assert.deepEqual(render({ folder: '/r/b', globalPref: 'ask' }), { mode: 'ask', layer: 'ask', source: 'global_pick', other: 'ask' });
  assert.deepEqual(render({ folder: '/r/a', sessionId: 't1', globalPref: 'plan' }), { mode: 'plan', layer: 'plan', source: 'global_pick', other: 'plan' });
  // A remembered Bypass folder pick applies only while Bypass is available; without the opt-in it reads as Auto.
  assert.equal(render({ folder: '/r/x', globalPref: 'ask' }).mode, 'bypass');
  assert.deepEqual(render({ folder: '/r/x', globalPref: 'ask', enabled: false }), { mode: 'auto', layer: 'bypass', source: 'folder_pick', other: 'ask' });
  // A saved Settings default of Bypass (the pre-migration remembered mode) still applies everywhere while opted in.
  assert.deepEqual(render({ folder: '/r/b', globalPref: 'bypass' }), { mode: 'bypass', layer: 'bypass', source: 'global_pick', other: 'bypass' });
  assert.equal(savedPermission({ permission: 'acceptEdits' }), 'acceptEdits');
  // R4g fix: after a restart the hook reads a session's recorded mode, for the open session and for forSession.
  const recorded = memoryStorage({ [SESSION_PERMISSION_KEY]: JSON.stringify({ t1: 'ask', t9: 'acceptEdits' }) });
  function Restarted({ sessionId }) {
    const layers = usePermissionModeLayers({ globalPref: 'auto', sessionId, folder: '/r/a', storage: recorded });
    const bypass = Bypass.useBypassPermission({ permission: 'auto', enabled: true, mode: 'code', sessionKey: sessionId, cwd: '/r/a', connectionKey: 'c', layers, onChange: () => {} });
    return React.createElement('i', { 'data-mode': bypass.permission, 'data-source': layers.source, 'data-other': bypass.forSession('t9', null) });
  }
  const restarted = Object.fromEntries([...renderToString(React.createElement(Restarted, { sessionId: 't1' })).matchAll(/data-(\w+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  assert.deepEqual(restarted, { mode: 'ask', source: 'session_mode', other: 'acceptEdits' });
});

test('the bypass hook hands picks to the layers: Mode-menu picks plainly, the approval card\'s marked approval_card', () => {
  const seen = [], adopted = [];
  const layers = { mode: 'ask', modeFor: id => id === 't2' ? 'acceptEdits' : 'ask', adoptSession: id => adopted.push(id) };
  let hook;
  function Probe() { hook = Bypass.useBypassPermission({ permission: 'auto', enabled: true, mode: 'code', sessionKey: null, cwd: '/r/a', connectionKey: 'c', layers, onChange: (...args) => seen.push(args) }); return null; }
  renderToString(React.createElement(Probe));
  assert.equal(hook.permission, 'ask', 'the layered mode, not the Settings default');
  assert.equal(hook.forSession('t2', null), 'acceptEdits');
  hook.select('plan');
  hook.adopt('acceptEdits');
  hook.adoptSession('t3');
  assert.deepEqual(seen, [['plan'], ['acceptEdits', 'approval_card']]);
  assert.deepEqual(adopted, ['t3']);
});

test('main.jsx wiring: the layers feed the bypass hook, a pick goes to the layers, /plan picks Plan, Settings keeps the default', () => {
  const main = local('src/main.jsx');
  for (const needle of [
    "import { usePermissionModeLayers, permissionFolderKey } from './permission-mode-resolution.mjs';",
    'const permissionLayers = usePermissionModeLayers({ globalPref: permission, settled: initSettled, sessionId: current, surface: mode, bypassOptIn,',
    'folder: permissionFolderKey({ sessionId: current, originCwd: sessionMetadata[current]?.originCwd, sessionCwd: sessions.find(s => s.id === current)?.cwd, draftCwd: cwd }) });',
    'layers: permissionLayers, onChange: (value, how) => permissionLayers.pick(value, how)});',
    "if(plan.switchToPlan)bypassMode.select('plan');",
    'setPermission(savedPermission(b.config));',
  ]) assert.equal(count(main, needle), 1, needle);
  assert.equal(count(main, 'preference("permission"'), 0);
  assert.equal(count(main, "updatePreferences({permission:"), 0);
  // Settings' Default permission mode still saves the global preference (the layer every opening falls back to).
  assert.match(local('src/source-settings.jsx'), /onChange=\{value=>save\('permission',value,'permissions'\)\}/);
});
