import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import {
  COWORK_GLOBAL_INSTRUCTIONS_MAX, COWORK_FILES_ERRORS, coworkFilesInfo, coworkFilesTargetError, coworkMemoryEnabled,
  createCoworkSettingsService,
} from '../electron/prefs/cowork-settings.mjs';

// w13-coworkui-settings (research/w13-coworkui.md §1.5, cwui-38..42): Settings › Cowork, the 3.6556.2 c71860c77 De page
// generated into src/generated/cowork-settings, fed from local preferences (electron/prefs/cowork-settings.mjs,
// src/source-cowork-settings-adapters.jsx). Source only: generator output text, official chunk text and SSR; no browser,
// no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, host, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  host = await server.ssrLoadModule('/src/source-cowork-settings.jsx');
  adapters = await server.ssrLoadModule('/src/source-cowork-settings-adapters.jsx');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const render = (config = {}, extra = {}) => renderToStaticMarkup(h(host.SourceCoworkSettings, { config, desktopCall: async () => undefined, onSave: async () => {}, ...extra }));

const probe = (hook, config, extra = {}) => {
  let result;
  const Probe = () => { result = hook(); return null; };
  renderToStaticMarkup(h(adapters.CoworkSettingsHostProvider, { value: { config, call: extra.call, onSave: extra.onSave, setMemory: extra.setMemory } }, h(Probe)));
  return result;
};
const order = (haystack, needles) => {
  let at = -1;
  for (const needle of needles) {
    const next = haystack.indexOf(needle, at + 1);
    assert.ok(next > at, `${JSON.stringify(needle)} after position ${at}`);
    at = next;
  }
};

test('the generated graph pins the official 3.6556.2 page, its mount order and the blocked account parts', () => {
  const manifest = JSON.parse(local('src/generated/cowork-settings/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.publicNames, { CoworkSettingsPage: { file: 'c71860c77-CKIsHnA3.js', local: 'De' } });
  const adapted = Object.fromEntries(manifest.adapters.map(a => [a.original, a.name]));
  // cwui-43 / cwui-44 and the other account-only parts are host adapters that render nothing.
  for (const [original, name] of [['cfea69990-BIgEsLcf.js#R', 'CoworkDispatchRow'], ['c79197f2b-DdO-gXlI.js#Ve', 'CoworkTrustedDevicesSetting'],
    ['c79197f2b-DdO-gXlI.js#Ie', 'CoworkTrustedDevicesList'], ['c79197f2b-DdO-gXlI.js#Re', 'CoworkGuestPassReferral'],
    ['cabd7b1c1-BLDBBA7m.js#ee', 'CoworkBackendToggle'], ['ced6780ff-B4OnNWkF.js#Be', 'CoworkLocalInstructionsImport']]) {
    assert.equal(adapted[original], name);
    assert.equal(adapters[name](), null, `${name} renders nothing`);
  }
  // The official mount conditions, word for word (each occurs once in the raw chunk).
  const page = official('c71860c77-CKIsHnA3.js');
  for (const raw of ['children:[e(pe,{}),d&&e(fe,{}),d&&e(de,{}),e(U,{}),e(H,{}),d&&e(q,{}),e(R,{}),l&&e(W,{}),u&&e(G,{}),(d||f)&&e(me,{})]',
    'import{n as de,t as fe}from"./cfea69990-BIgEsLcf.js"', 'import{n as R,r as z,t as B}from"./c79197f2b-DdO-gXlI.js"'])
    assert.equal(page.split(raw).length, 2, raw);
  assert.ok(official('cfea69990-BIgEsLcf.js').includes('if(c===!0&&!y&&S(!0),!e&&!v||!i||c===null||a&&!y)return null'), 'Dispatch hides itself without the bridge state');
  assert.deepEqual(manifest.callSites.map(site => site.source),
    ['c71860c77-CKIsHnA3.js', 'c71860c77-CKIsHnA3.js', 'cfea69990-BIgEsLcf.js', 'c79197f2b-DdO-gXlI.js', 'shared-46-BIbZBGFq.js', 'ca25db325-TTHrVIfM.js']);
  // Every module is a byte-for-byte slice of its official chunk (the extractor re-hashes them on --check).
  for (const mod of manifest.modules) assert.equal(mod.referenceVersion, '3.6556.2');
  assert.match(local('src/generated/cowork-settings/c71860c77-CKIsHnA3.mjs'), /className: "flex flex-col gap-7"/);
});

test('SSR: the page is main.flex.flex-col.gap-7 with the official sections in De order and the official copy', () => {
  const html = render({ customInstructions: { enabled: true, global: 'Be brief.', projects: {} } });
  assert.ok(html.startsWith('<main class="flex flex-col gap-7">'));
  const shown = text(html);
  order(shown, ['Trusted Cowork folders', 'Manage', 'Open links in built-in browser', 'Allowed sites', 'Manage', 'Global instructions', 'Edit',
    'Memory', 'Use memory in sessions', 'No memories yet. Claude will add entries here as you work together.']);
  // Word for word against the official chunks.
  const copy = [
    ['cabd7b1c1-BLDBBA7m.js', 'When you trust a folder on this device, you allow Claude to use it and the folders inside it. Trusting a folder doesn\\u2019t add it to new tasks. When you add one to a task, you may be asked to allow it again.'],
    ['cdc95db1a-DsLkT8qE.js', 'Links open in the built-in browser instead of your default browser.'],
    ['cdc95db1a-DsLkT8qE.js', 'Sites where Claude can use its Browser tools without a permission prompt.'],
    ['ced6780ff-B4OnNWkF.js', 'Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or context that Claude should always know.'],
    ['c71860c77-CKIsHnA3.js', 'Claude will read and update these memories during Cowork sessions.'],
    ['c71860c77-CKIsHnA3.js', 'Claude saves what it learns about you and your work during Cowork sessions. These files are stored on this device.'],
  ];
  for (const [file, message] of copy) {
    assert.ok(official(file).includes(`defaultMessage:"${message}"`), `${file} has ${message}`);
    assert.ok(shown.includes(message.replace(/\\u2019/g, '’')), `shown: ${message}`);
  }
  // Rows tied to an account or to Claude in Chrome are not on this page.
  for (const absent of ['Dispatch', 'Require trusted devices', 'Preferred browser', 'Cowork isn’t enabled for your organization', 'session host'])
    assert.ok(!shown.includes(absent), absent);
  // The Settings row and section are the official shared-1 xC / EC ones.
  assert.match(html, /data-settings-row="" class="flex items-center justify-between gap-lg py-md/);
  assert.match(html, /<p class="py-md text-footnote text-secondary">No memories yet/);
});

test('SSR: Use memory in sessions reads config.coworkMemory (unset is on) and the paused copy', () => {
  assert.equal(coworkMemoryEnabled({}), true);
  assert.equal(coworkMemoryEnabled({ coworkMemory: false }), false);
  const paused = text(render({ coworkMemory: false }));
  assert.ok(paused.includes('Paused. Existing memories are kept but won’t be read or updated in new sessions.'));
  assert.ok(!paused.includes('Claude will read and update these memories during Cowork sessions.'));
  assert.match(render({}), /role="switch"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="switch"/);
  // The switch writes through the "cowork-settings" memory op (the official PATCH { enabled_cowork_memory }).
  const calls = [], shownMemory = [];
  const update = probe(adapters.useUpdateAccountSettings, {}, { call: (action, params) => { calls.push([action, params]); return Promise.resolve({ enabled: params.enabled }); }, setMemory: value => shownMemory.push(value) });
  update.mutate({ enabled_cowork_memory: false });
  assert.deepEqual(calls, [['cowork-settings', { op: 'memory', enabled: false }]]);
  assert.deepEqual(shownMemory, [false]);
});

test('Global instructions are Settings › Instructions’ global text: read from and saved to config.customInstructions', async () => {
  const config = { customInstructions: { enabled: true, global: 'Answer in English.', projects: { '/work': { text: 'Use tabs.', useFile: true } } } };
  const saves = [];
  const profile = probe(adapters.useCoworkGlobalInstructionsProfile, config, { onSave: async patch => { saves.push(patch); } });
  assert.equal(profile.query.data.cowork_global_instructions, 'Answer in English.');
  assert.equal(profile.notKept, false);
  assert.equal(profile.limit.maxLength, COWORK_GLOBAL_INSTRUCTIONS_MAX);
  assert.ok(official('shared-25-DOWZRSlq.js').includes(`cY=${COWORK_GLOBAL_INSTRUCTIONS_MAX}`), 'shared-25 cY is the official limit');
  await profile.putProfile({ cowork_global_instructions: 'Be brief.' });
  assert.deepEqual(saves, [{ customInstructions: { enabled: true, global: 'Be brief.', projects: { '/work': { text: 'Use tabs.', useFile: true } } } }]);
  // The Instructions page reads the same field (source-settings-instructions.jsx persist({ ...saved, global: text })).
  assert.match(local('src/source-settings-instructions.jsx'), /persist\(\{ \.\.\.saved, global: text \}\)/);
});

test('the desktop bridges: trusted folders go to cowork-folders, Cowork files to cowork-settings', async () => {
  const calls = [];
  probe(() => null, {}, { call: async (action, params) => { calls.push([action, params]); return action === 'cowork-folders' ? { folders: ['/Users/me/Projects'] } : { currentRoot: '/data/cowork-sessions' }; } });
  const changes = [];
  const off = adapters.coworkAppPreferences.onPreferencesChanged(value => changes.push(value));
  assert.deepEqual(await adapters.coworkAppPreferences.getPreferences(), { localAgentModeTrustedFolders: ['/Users/me/Projects'], remoteFolderConsentMemory: [] });
  await adapters.coworkLocalAgentModeSessions.browseAndAddTrustedFolder();
  await adapters.coworkLocalAgentModeSessions.removeTrustedFolder('/Users/me/Projects');
  off();
  assert.deepEqual(calls.splice(0), [['cowork-folders', { op: 'trusted-list' }], ['cowork-folders', { op: 'trusted-add' }], ['cowork-folders', { op: 'trusted-remove', path: '/Users/me/Projects' }]]);
  assert.equal(changes.length, 2, 'add and remove refresh the list');
  await adapters.coworkUserFiles.getInfo();
  await adapters.coworkUserFiles.pickTarget();
  await adapters.coworkUserFiles.migrate('/Volumes/Data');
  await adapters.coworkUserFiles.reveal();
  assert.deepEqual(calls.map(([action, params]) => `${action}:${params.op}`), ['cowork-settings:files-info', 'cowork-settings:files-pick', 'cowork-settings:files-migrate', 'cowork-settings:files-reveal']);
});

test('prefs/cowork-settings.mjs: Cowork files info, the official target error codes and the service ops', async () => {
  assert.deepEqual(coworkFilesInfo({ userData: '/Users/me/Library/Application Support/App', path }),
    { currentRoot: '/Users/me/Library/Application Support/App/cowork-sessions', managedRoot: null, homeRoot: '/Users/me/Library/Application Support/App/cowork-sessions', isLegacyDocumentsRoot: false });
  assert.equal(coworkFilesInfo({ userData: '/data', path, currentRoot: '/Volumes/Data/Cowork' }).currentRoot, '/Volumes/Data/Cowork', 'a moved root');
  const currentRoot = '/data/cowork-sessions';
  assert.equal(coworkFilesTargetError('\\\\server\\share', { currentRoot, path }), 'target-unc');
  assert.equal(coworkFilesTargetError('relative/dir', { currentRoot, path }), 'target-invalid');
  assert.equal(coworkFilesTargetError('/data/cowork-sessions/inner', { currentRoot, path }), 'target-inside-current');
  assert.equal(coworkFilesTargetError('/Volumes/Data', { currentRoot, path }), null);
  // Every code the service answers is one cfea69990 j has a message for.
  const messages = official('cfea69990-BIgEsLcf.js');
  for (const code of COWORK_FILES_ERRORS) assert.ok(messages.includes(`"${code}":{`) || messages.includes(`${code}:{`), code);
  const shown = [];
  const config = {}; let saved = 0, emitted = 0;
  const service = createCoworkSettingsService({ userData: '/data', path, fs: { mkdir: async () => undefined },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: ['/Volumes/Data'] }) }, shell: { showItemInFolder: dir => shown.push(dir) } });
  const ctx = { config, save: () => { saved += 1; }, emitConfig: () => { emitted += 1; } };
  assert.equal((await service.run({ op: 'files-info' }, ctx)).currentRoot, currentRoot);
  // SJiH6Ee8 reveal: `await t.aJ()` (made if missing), then `showItemInFolder(path.join(root,"."))`.
  assert.equal(await service.run({ op: 'files-reveal' }, ctx), true);
  assert.deepEqual(shown, [path.join(currentRoot, '.')]);
  assert.deepEqual(await service.run({ op: 'files-pick' }, ctx), { path: '/Volumes/Data' });
  assert.deepEqual(await service.run({ op: 'memory', enabled: false }, ctx), { enabled: false });
  assert.deepEqual([config.coworkMemory, saved, emitted], [false, 1, 1]);
  await assert.rejects(service.run({ op: 'memory', enabled: 'no' }, ctx));
  await assert.rejects(service.run({ op: 'nope' }, ctx));
});

// cwui-40: Change copies the files and moves core-cowork.mjs's pointer, in the official migrate order
// (index.chunk-SJiH6Ee8.js: running sessions, the target check, cp recursive/force, JJ retried once, relaunch).
test('Cowork files › Change: the official checks, the copy, the pointer and the relaunch (cwui-40)', async () => {
  const migrate = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-SJiH6Ee8.js'), 'utf8');
  for (const pin of ['if(await n.r(),e.hasAnyRunningSession())return{ok:!1,errorCode:t.A2.SessionsRunning}', '(0,a.cp)(l,c,{recursive:!0,force:!0,',
    'moving pointer only', 'await(0,a.mkdir)(n,{recursive:!0,mode:448})}catch{return{ok:!1,errorCode:t.A2.TargetNotWritable}}',
    '(o(n,d)||o(d,n)))return{ok:!1,errorCode:t.A2.TargetInvalid}', 'errorCode:t.A2.StateWriteFailed', 'setImmediate(()=>t.QR(!0)),{ok:!0,newRoot:c}'])
    assert.ok(migrate.includes(pin), pin);
  const core = await import('../electron/cowork-runtime/core-cowork.mjs');
  const policy = await import('../electron/cowork-runtime/folder-policy.mjs');
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-files-')));
  try {
    const userData = path.join(base, 'App'), home = path.join(base, 'home'), target = path.join(base, 'Volumes', 'Cowork files');
    fs.mkdirSync(userData); fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    const storage = await core.createCoworkStorage(userData);
    fs.writeFileSync(path.join(storage.outputs, 'report.md'), 'done');
    let running = 1, relaunched = 0, failWrites = 0;
    const logged = [];
    const service = createCoworkSettingsService({ userData, path, fs: fs.promises, platform: process.platform, home, configDirs: [path.join(home, '.claude')],
      runningCoworkSessions: () => running, currentRoot: () => core.coworkStorageRoot(userData),
      setRoot: async root => { if (failWrites-- > 0) throw new Error('disk full'); return core.writeCoworkFilesPointer(userData, root); },
      relaunch: () => { relaunched += 1; }, defer: callback => callback(), log: message => logged.push(message),
      denied: async dir => !!policy.protectedRoot(dir, { home, platform: process.platform }) });
    const run = target => service.run({ op: 'files-migrate', path: target }, {});
    assert.deepEqual(await run(target), { ok: false, errorCode: 'sessions-running' }, 'checked first, as the official does');
    running = 0;
    assert.deepEqual(await run('relative/dir'), { ok: false, errorCode: 'target-invalid' });
    assert.deepEqual(await run(path.join(userData, 'elsewhere')), { ok: false, errorCode: 'target-invalid' }, 'inside the app data folder');
    assert.deepEqual(await run(base), { ok: false, errorCode: 'target-invalid' }, 'above the app data folder (refuseAncestors)');
    assert.deepEqual(await run(path.join(home, '.claude', 'x')), { ok: false, errorCode: 'target-invalid' }, 'an agent configuration folder (rL)');
    assert.deepEqual(await run(home), { ok: false, errorCode: 'target-invalid' }, 'above an agent configuration folder');
    fs.writeFileSync(path.join(base, 'file'), '');
    assert.deepEqual(await run(path.join(base, 'file', 'inner')), { ok: false, errorCode: 'target-not-writable' }, 'mkdir 0700 fails');
    failWrites = 2;
    assert.deepEqual(await run(target), { ok: false, errorCode: 'state-write-failed' }, 'the pointer write is retried once');
    assert.equal(core.coworkStorageRoot(userData), core.defaultCoworkStorageRoot(userData));
    failWrites = 1;
    assert.deepEqual(await run(target), { ok: true, newRoot: target });
    assert.equal(relaunched, 1);
    assert.ok(logged.some(line => line.includes('state write retry')) && logged.at(-1).includes('relaunching'));
    // The files are copied (the old ones stay: "Your existing files will remain in {previousLocation}") and the root moved.
    assert.equal(fs.readFileSync(path.join(target, storage.id, 'outputs', 'report.md'), 'utf8'), 'done');
    assert.ok(fs.existsSync(path.join(storage.outputs, 'report.md')));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(userData, core.COWORK_FILES_POINTER), 'utf8')), { root: target, previous: [] });
    assert.equal(core.coworkStorageRoot(userData), target);
    assert.equal(core.coworkStoragePaths(userData, storage.id).outputs, path.join(target, storage.id, 'outputs'));
    assert.equal((await service.run({ op: 'files-info' }, {})).currentRoot, target);
    // E60: both the new root and the old one stay Cowork's own storage: never granted, carved out of a wider grant.
    assert.equal(core.insideCoworkStorage(path.join(target, 'x'), userData), true);
    assert.equal(core.insideCoworkStorage(storage.outputs, userData), true);
    assert.equal(policy.lexicalRefusal(path.join(target, storage.id), { userData, home, platform: process.platform })?.kind, 'session_storage');
    assert.equal((await policy.judgeFolder(target, { userData, home, platform: process.platform }))?.kind, 'session_storage');
    assert.deepEqual(await policy.carveGrant(path.join(base, 'Volumes'), { userData, home, platform: process.platform }), [], 'the grant above the root holds nothing else');
    fs.mkdirSync(path.join(base, 'Volumes', 'Notes'));
    assert.deepEqual(await policy.carveGrant(path.join(base, 'Volumes'), { userData, home, platform: process.platform }), [path.join(base, 'Volumes', 'Notes')]);
    // New sessions go to the moved root (its parent is wherever the user put it; its mode is the user's).
    const next = await core.createCoworkStorage(userData);
    assert.equal(next.root, path.join(target, next.id));
    // Moving on again: the target inside the current root is refused; the source missing moves only the pointer.
    assert.deepEqual(await run(path.join(target, 'inner')), { ok: false, errorCode: 'target-inside-current' });
    const third = path.join(base, 'Third');
    fs.rmSync(target, { recursive: true });
    assert.deepEqual(await run(third), { ok: true, newRoot: third });
    assert.ok(logged.some(line => line.includes('absent; moving pointer only')));
    assert.deepEqual(core.readCoworkFilesPointer(userData), { root: third, previous: [target] });
    assert.deepEqual(core.coworkStorageRoots(userData), [third, core.defaultCoworkStorageRoot(userData), target]);
    // A broken pointer reads as none.
    fs.writeFileSync(path.join(userData, core.COWORK_FILES_POINTER), '{"root":"relative"}');
    assert.equal(core.coworkStorageRoot(userData), core.defaultCoworkStorageRoot(userData));
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('main.cjs: Change counts running Cowork tasks and moves the root through core-cowork.mjs', () => {
  const main = local('electron/main.cjs');
  const block = main.slice(main.indexOf('case "cowork-settings":'), main.indexOf('case "files":', main.indexOf('case "cowork-settings":')));
  for (const part of ['runningCoworkSessions: () =>', 'coworkSessions?.live?.keys()', 'computerUseActiveTurns.keys()', 'surface === "cowork"',
    'currentRoot: () => cowork.coworkStorageRoot(userData)', 'setRoot: (root) => cowork.writeCoworkFilesPointer(userData, root)',
    'app.relaunch(); app.quit();', 'folderPolicy.protectedRoot(dir,']) assert.ok(block.includes(part), part);
});

// cwui-42: Use memory in sessions is what the Cowork memory contributor reads (c71860c77 ge `enabled_cowork_memory !== !1`).
test('Use memory in sessions off keeps memory out of Cowork sessions only', async () => {
  const contributor = await import('../electron/chat-context/memory.mjs');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-memory-'));
  try {
    fs.mkdirSync(path.join(dataDir, 'memory'));
    fs.writeFileSync(path.join(dataDir, 'memory', 'global.md'), 'Prefers short answers');
    const config = { chatMemory: { enabled: true } };
    const apply = (surface, overrides = {}) => contributor.apply({ config: { ...config, ...overrides }, method: 'thread/start', params: {}, surface, project: null, threadId: null, dataDir });
    assert.match(await apply('cowork'), /Prefers short answers/, 'unset reads as on');
    assert.match(await apply('cowork', { coworkMemory: true }), /Prefers short answers/);
    assert.equal(await apply('cowork', { coworkMemory: false }), null);
    assert.match(await apply('chat', { coworkMemory: false }), /Prefers short answers/, 'Chat keeps its own memory switch');
  } finally { fs.rmSync(dataDir, { recursive: true, force: true }); }
});

test('command palette: Settings → Memory and Settings → Cowork as the nav lists them, Cowork only while Cowork is on', async () => {
  const { paletteActions, PALETTE_SETTINGS_SECTIONS } = await import('../src/sidebar-palette-model.mjs');
  const ids = PALETTE_SETTINGS_SECTIONS.map(([id]) => id);
  assert.deepEqual(ids.slice(0, 7), ['preferences', 'privacy', 'usage', 'memory', 'theme', 'code', 'cowork']);
  assert.deepEqual(PALETTE_SETTINGS_SECTIONS.find(([id]) => id === 'cowork'), ['cowork', 'Cowork', 'Tasks']);
  const labels = options => paletteActions({ onOpenSettings() {}, ...options }).map(action => action.label);
  assert.ok(labels({}).includes('Settings → Cowork') && labels({}).includes('Settings → Memory'));
  assert.equal(labels({ coworkEnabled: false }).includes('Settings → Cowork'), false);
  assert.match(local('src/source-sidebar.jsx'), /paletteActions\(\{[^}]*coworkEnabled: homeMode === 'cowork'/);
});

test('wiring: the Settings nav lists Cowork after Code (shared-46) and main answers desktop:call "cowork-settings"', () => {
  assert.ok(official('shared-46-BIbZBGFq.js').includes('e.push({id:"cowork",href:"/settings/cowork",label:t,name:a.formatMessage({defaultMessage:"Cowork",id:"+MH0VdRCHz"}),icon:Fp})'));
  assert.ok(official('shared-46-BIbZBGFq.js').includes('Fp={name:"Tasks"'));
  const settings = local('src/source-settings.jsx');
  const code = settings.indexOf("{id:'code',label:'Code',icon:'Code',group:'Settings'}");
  const cowork = settings.indexOf("{id:'cowork',label:'Cowork',icon:'Tasks',group:'Settings',");
  const instructions = settings.indexOf("{id:'instructions',label:'Instructions'");
  assert.ok(code > 0 && cowork > code && instructions > cowork);
  assert.match(settings, /page:SourceCoworkSettings\}/);
  assert.match(local('electron/main.cjs'), /case "cowork-settings": \{[^\n]*\n[^\n]*\n\s*return \(await import\("\.\/prefs\/cowork-settings\.mjs"\)\)\.createCoworkSettingsService\(/);
});

test('zh-CN: the page reads in Chinese with Claude kept (D23)', () => {
  i18n.setLocale('zh-CN');
  try {
    const shown = text(render({}));
    order(shown, ['受信任的协作文件夹', '在内置浏览器中打开链接', '全局指令', '在会话中使用记忆', '还没有记忆。你们一起工作时，Claude 会在这里添加条目。']);
  } finally { i18n.setLocale('en-US'); }
});
