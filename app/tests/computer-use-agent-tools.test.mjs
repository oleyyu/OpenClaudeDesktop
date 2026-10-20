// agent-tools/computer-use.mjs: the computer-use tools the host serves, their schemas (compiled and checked with Ajv),
// the grant check in front of every tool, request_access through the access card, the Accessibility-helper tools
// (app_focus, app_menu, list_apps), app_zoom, app_batch, and the transcript recognizing them. In-process only: fake
// native module, helper and image ops behind the real service, the host never started.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createAppResolver, appIconDataUrl } = require('../electron/computer-use/apps.cjs');
const { createAxHelper } = require('../electron/computer-use/ax-helper.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const Ajv = require('../../harness/node_modules/ajv').default;
const cu = await import('../electron/agent-tools/computer-use.mjs');
const { computerUseAction } = await import('../electron/computer-use/actions.mjs');
const { sdkToolName } = await import('../src/transcript-sdk-tools.mjs');

// The 13 tools that do what they say; the 11 registered with a reason code (the official set of 24 names).
const WORKING = ['request_access', 'app_list_windows', 'app_screenshot', 'app_ax_find', 'app_click', 'app_type', 'app_release',
  'app_focus', 'app_menu', 'app_zoom', 'list_apps', 'app_batch', 'list_granted_applications'];
const REASONED = { app_key: 'requires_raw_path', app_scroll: 'requires_raw_path', app_drag: 'requires_raw_path', app_bring_to_current_space: 'requires_raw_path',
  request_full_control: 'not_supported_in_build', release_full_control: 'not_supported_in_build', read_clipboard: 'permission_denied', write_clipboard: 'permission_denied',
  request_teach_access: 'not_supported_in_build', teach_step: 'not_supported_in_build', teach_batch: 'not_supported_in_build' };
const OPEN = [...WORKING, 'app_key', 'app_scroll', 'app_drag', 'app_bring_to_current_space', 'request_full_control', 'release_full_control',
  'read_clipboard', 'write_clipboard', 'request_teach_access', 'teach_step', 'teach_batch'];
const OFFICIAL = ['request_access', 'app_list_windows', 'app_screenshot', 'app_zoom', 'app_ax_find', 'app_click', 'app_type', 'app_key', 'app_scroll', 'app_drag',
  'app_menu', 'app_batch', 'app_release', 'app_focus', 'app_bring_to_current_space', 'list_apps', 'request_full_control', 'release_full_control', 'read_clipboard',
  'write_clipboard', 'request_teach_access', 'teach_step', 'teach_batch', 'list_granted_applications'];
const FINDER = 'com.apple.finder';

/** A native module that answers like the real one for Finder's one window. */
function fakeNative({ calls = [] } = {}) {
  const elements = [
    { index: 0, role: 'AXButton', title: 'Back', frame: { x: 10, y: 10, width: 20, height: 20 } },
    { index: 1, role: 'AXTextField', subrole: 'AXSearchField', title: 'Search', frame: { x: 400, y: 10, width: 120, height: 22 } },
    { index: 2, role: 'AXButton', title: 'Forward', frame: { x: 40, y: 10, width: 20, height: 20 } },
  ];
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params]);
      if (method === 'probe') return { screenLocked: false, secureInput: false };
      if (method === 'listWindows') return { windows: [{ window_id: 7, title: 'Recents', is_main: true, is_minimized: false, is_hidden: false, is_off_space: false, bounds: { x: 0, y: 0, width: 800, height: 500 }, is_auxiliary: false }] };
      if (method === 'captureWindow') {
        const [width, height] = scaled(fit(1600, 1000), params.scale ?? 1);
        return { dataUrl: 'data:image/jpeg;base64,QUJD', width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7,
          bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements };
      }
      if (method === 'axClick') return { outcome: 'ok', path: 'ax' };
      if (method === 'axType') return { outcome: 'ok', path: 'ax' };
      throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
    },
  };
}
const resolver = { resolveAll: async (names) => names.map((name) => /finder/i.test(name)
  ? { requested: name, bundleId: FINDER, displayName: 'Finder', path: '/System/Library/CoreServices/Finder.app', installed: true }
  : { requested: name, bundleId: null, displayName: name, path: null, installed: false }) };

/** The Accessibility helper (ax-helper.cjs) for Finder: window 7 focusable, a File menu with an enabled and a disabled item. */
function fakeHelper({ calls = [], frontmost = false } = {}) {
  const file = [{ title: 'New Finder Window', enabled: true, shortcut: 'N' }, { title: 'New Folder', enabled: false, shortcut: 'N' }];
  const fail = (code, message, details) => { throw Object.assign(new Error(message), { code, ...(details ? { details } : {}) }); };
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params]);
      if (method === 'focus') return frontmost ? { outcome: 'unsupported', reasonCode: 'app_is_frontmost', focused: false }
        : { outcome: 'ok', focused: true, main: true, window_id: params.windowId ?? 7, activated: false };
      if (method === 'menuList') {
        if (!params.path.length) return { path: [], items: [{ title: 'Finder', enabled: true, submenu: true }, { title: 'File', enabled: true, submenu: true }] };
        if (params.path[0].toLowerCase() === 'file') return { path: ['File'], items: file };
        fail('menu_item_not_found', `No menu item "${params.path[0]}" under the menu bar.`, { closestMatch: 'File', available: ['Finder', 'File'], level: 0, resolved: [], wanted: params.path[0] });
      }
      if (method === 'menu') {
        params = { ...params, path: params.path.map((title) => title.replace(/(…|\.\.\.)$/, '')) }; // the helper ignores a trailing ellipsis
        if (params.path[0].toLowerCase() !== 'file') fail('menu_item_not_found', 'No such title.', { closestMatch: 'File', available: ['Finder', 'File'], level: 0, resolved: [], wanted: params.path[0] });
        if (params.path.length === 1) return { outcome: 'ok', path: ['File'], opened: true, open: true, items: file };
        if (params.path[1]?.toLowerCase() === 'new folder') return { outcome: 'unsupported', reasonCode: 'menu_item_disabled', path: ['File', 'New Folder'] };
        if (params.path[1]?.toLowerCase() === 'new finder window') return { outcome: 'ok', path: ['File', 'New Finder Window'], opened: false };
        fail('menu_item_not_found', 'No such item.', { closestMatch: 'New Finder Window', available: file.map((item) => item.title), level: 1, resolved: ['File'], wanted: params.path[1] });
      }
      if (method === 'menuClose') return { closed: 1 };
      throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
    },
  };
}
/** Electron's nativeImage crop, recorded. */
function fakeImage(calls = []) {
  return { calls, crop: async (request) => { calls.push(request); return { dataUrl: 'data:image/jpeg;base64,Wk9PTQ==' }; } };
}
const fakeApps = (calls = []) => async (options) => {
  calls.push(options);
  return { apps: [{ name: 'Finder', bundleId: FINDER, running: true, pid: 501, path: '/System/Library/CoreServices/Finder.app' },
    { name: 'TextEdit', bundleId: 'com.apple.TextEdit', running: false, path: '/System/Applications/TextEdit.app' }], total: 2 };
};

function setup({ answer = 'accept', native = fakeNative(), decide, axHelper = fakeHelper(), image = fakeImage(), listApps = fakeApps() } = {}) {
  const service = createComputerUse({ native, axHelper, image, log: { log() {}, warn() {} }, wait: async () => {}, ...(decide ? { decide } : {}) });
  const asked = [];
  const host = createAgentToolsHost({
    tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    modules: [cu], isGroupEnabled: () => true,
    resolveSession: (id, meta) => { const key = id ?? meta?.threadId; return key ? { id: key, cwd: '/work' } : null; },
  });
  host.provide('computerUse', () => ({ service, resolveApps: (names) => resolver.resolveAll(names), listApps, ask: async (access) => { asked.push(access); return answer; } }));
  const call = async (name, args, session = 'thread-a') => host.call(session, { name, arguments: args });
  const body = (result) => JSON.parse(result.content[0].text);
  return { host, service, native, axHelper, image, asked, call, body };
}

test('discovery: the host finds exactly the open tools in the "computer-use" group, from the tools folder', async () => {
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    resolveSession: () => null, isGroupEnabled: () => true });
  await host.ready();
  const names = host.listTools().map((tool) => tool.name);
  for (const name of OPEN) assert.ok(names.includes(name), `${name} is served`);
  assert.equal(cu.group, 'computer-use');
  assert.deepEqual(cu.tools.map((tool) => tool.name), OPEN);
  assert.equal(OFFICIAL.length, 24);
  assert.deepEqual([...OPEN].sort(), [...OFFICIAL].sort(), 'all 24 official names, nothing else');
  const off = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    resolveSession: () => null, modules: [cu], isGroupEnabled: (group) => group !== 'computer-use' });
  await off.ready();
  assert.deepEqual(off.listTools().map((tool) => tool.name), [], 'the group switch turns them all off');
});

test('schemas: every inputSchema compiles under Ajv (strict) and checks real arguments', async () => {
  const { host } = setup();
  await host.ready();
  const ajv = new Ajv({ strict: true, allErrors: true });
  const listed = Object.fromEntries(host.listTools().map((tool) => [tool.name, tool]));
  const validate = Object.fromEntries(OPEN.map((name) => [name, ajv.compile(listed[name].inputSchema)]));
  const ok = (name, args) => assert.ok(validate[name](args), `${name} ${JSON.stringify(args)}: ${ajv.errorsText(validate[name].errors)}`);
  const bad = (name, args) => assert.ok(!validate[name](args), `${name} rejects ${JSON.stringify(args)}`);
  ok('request_access', { apps: ['Finder'], reason: 'List the windows', clipboardRead: true });
  bad('request_access', { apps: [], reason: 'x' });
  bad('request_access', { apps: ['Finder'] });
  ok('app_list_windows', { app: FINDER });
  bad('app_list_windows', {});
  ok('app_screenshot', { app: FINDER, window_id: 7, scale: 0.1 });
  ok('app_screenshot', { app: FINDER, scale: 1 });
  bad('app_screenshot', { app: FINDER, scale: 0.05 });
  bad('app_screenshot', { app: FINDER, scale: 1.5 });
  ok('app_ax_find', { app: FINDER, role: 'button', title_contains: 'back' });
  ok('app_click', { app: FINDER, element_index: 0, count: 2, button: 'right', action_summary: 'Open the menu' });
  ok('app_click', { app: FINDER, coordinate: [10, 20] });
  bad('app_click', { app: FINDER, coordinate: [10] });
  bad('app_click', { app: FINDER, target: 'pointer' });
  ok('app_type', { app: FINDER, text: 'hello', mode: 'replace', target: 'focused' });
  bad('app_type', { app: FINDER, text: 'hello', mode: 'append' });
  bad('app_type', { app: FINDER, text: '' });
  ok('app_release', {});
  ok('app_release', { app: FINDER, window_id: 7 });
  ok('app_focus', { app: FINDER, window_id: 7 });
  bad('app_focus', { app: FINDER, element_index: 1 });
  ok('app_menu', { app: FINDER, path: ['File', 'New Folder'] });
  ok('app_menu', { app: FINDER, list: true });
  ok('app_menu', { app: FINDER, list: null });
  ok('app_menu', { app: FINDER, list: 'File' });
  ok('app_menu', { app: FINDER, list: ['File', 'Open With'] });
  ok('app_menu', { app: FINDER, close: true });
  bad('app_menu', { app: FINDER, path: [] });
  bad('app_menu', { app: FINDER, close: false });
  ok('app_zoom', { app: FINDER, region: [0, 0, 100, 50], scale: 0.5 });
  bad('app_zoom', { app: FINDER, region: [0, 0, 100] });
  bad('app_zoom', { app: FINDER });
  ok('list_apps', {});
  ok('list_apps', { query: 'text', running_first: false, limit: 200, cursor: '25' });
  bad('list_apps', { limit: 0 });
  ok('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 0 }, { action: 'screenshot', scale: 0.5 }, { action: 'type', text: 'x', target: 'focused' }] });
  bad('app_batch', { app: FINDER, actions: [] });
  bad('app_batch', { app: FINDER, actions: [{ action: 'hover' }] });
  bad('app_batch', { app: FINDER, actions: [{ action: 'click', app: 'com.apple.Safari' }] });
  ok('list_granted_applications', {});
  ok('app_key', { app: FINDER, combo: 'cmd+s' });
  bad('app_key', { app: FINDER });
  ok('app_scroll', { app: FINDER, dy: -3, coordinate: [10, 10] });
  bad('app_scroll', { app: FINDER });
  ok('app_drag', { app: FINDER, path: [[0, 0], [10, 10]] });
  bad('app_drag', { app: FINDER, path: [[0, 0]] });
  ok('app_bring_to_current_space', { app: FINDER, window_id: 7 });
  bad('app_bring_to_current_space', { app: FINDER });
  ok('request_full_control', {});
  ok('write_clipboard', { text: 'x' });
  bad('write_clipboard', {});
  ok('request_teach_access', { apps: ['Finder'], reason: 'Show how' });
  ok('teach_step', { explanation: 'e', next_preview: 'n', actions: [{ action: 'click' }], anchor: [1, 2] });
  ok('teach_batch', { steps: [{ explanation: 'e', next_preview: 'n', actions: [] }] });
  bad('teach_batch', { steps: [] });
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.default, 1);
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.minimum, 0.1);
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.maximum, 1);
  assert.deepEqual(listed.app_type.inputSchema.properties.mode.enum, ['insert', 'replace']);
});

test('annotations: screenshot, window list and find are read-only; the rest are not', () => {
  const hint = Object.fromEntries(cu.tools.map((tool) => [tool.name, tool.annotations?.readOnlyHint]));
  assert.deepEqual(hint, { request_access: false, app_list_windows: true, app_screenshot: true, app_ax_find: true, app_click: false, app_type: false, app_release: false,
    app_focus: false, app_menu: false, app_zoom: true, list_apps: true, app_batch: false, list_granted_applications: true,
    app_key: false, app_scroll: false, app_drag: false, app_bring_to_current_space: false, request_full_control: false, release_full_control: false,
    read_clipboard: true, write_clipboard: false, request_teach_access: false, teach_step: false, teach_batch: false });
  for (const tool of cu.tools) {
    assert.equal(typeof tool.title, 'string');
    assert.ok(tool.description.length > 200, `${tool.name} describes what it does, what it needs and what it returns`);
  }
});

test('no grant: app_click and the others answer app_not_granted with the next step, never a throw or a native call', async () => {
  const { call, body, native } = setup();
  for (const [name, args] of [['app_click', { app: FINDER, element_index: 0 }], ['app_type', { app: FINDER, text: 'x' }],
    ['app_list_windows', { app: FINDER }], ['app_screenshot', { app: FINDER }], ['app_ax_find', { app: FINDER }]]) {
    const result = await call(name, args);
    assert.equal(result.isError, true, name);
    const { ok, error } = body(result);
    assert.equal(ok, false);
    assert.equal(error.code, 'app_not_granted', name);
    assert.match(error.next_step, /request_access/);
  }
  assert.deepEqual(native.calls, []);
  const invalid = body(await call('app_click', { app: 'not a bundle id' }));
  assert.equal(invalid.error.code, 'invalid_params');
});

test('request_access: one card, granted / denied, and the same apps are not asked about again in the session', async () => {
  const { call, body, asked, service } = setup();
  const first = body(await call('request_access', { apps: ['Finder', 'Figma'], reason: 'List the Finder windows' }));
  assert.equal(asked.length, 1);
  assert.equal(asked[0].reason, 'List the Finder windows');
  assert.deepEqual(asked[0].apps.map((app) => [app.displayName, app.tier, app.installed, app.alreadyGranted]),
    [['Finder', 'full', true, false], ['Figma', null, false, false]]);
  assert.deepEqual(first.granted, [{ app: 'Finder', bundleId: FINDER, name: 'Finder', tier: 'full' }]);
  assert.deepEqual(first.denied, [{ app: 'Figma', reason: 'not_installed' }]);
  assert.equal(first.screenshotFiltering, 'granted_apps_only');
  assert.ok(service.grantsFor('thread-a').has(FINDER));
  const again = body(await call('request_access', { apps: ['Finder'], reason: 'Again' }));
  assert.equal(asked.length, 1, 'no second card');
  assert.equal(again.granted[0].bundleId, FINDER);
  // Another session asks for itself.
  await call('request_access', { apps: ['Finder'], reason: 'Other session' }, 'thread-b');
  assert.equal(asked.length, 2);
});

test('request_access: Deny grants nothing; no card to show is an error, not a grant', async () => {
  const denied = setup({ answer: 'decline' });
  const result = denied.body(await denied.call('request_access', { apps: ['Finder'], reason: 'r' }));
  assert.deepEqual(result.granted, []);
  assert.deepEqual(result.denied, [{ app: 'Finder', bundleId: FINDER, reason: 'user_denied' }]);
  assert.ok(!denied.service.grantsFor('thread-a').has(FINDER));
  const none = setup({ answer: 'unavailable' });
  const failed = await none.call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(failed.isError, true);
  assert.equal(none.body(failed).error.code, 'approval_unavailable');
  assert.ok(!none.service.grantsFor('thread-a').has(FINDER));
  const empty = await none.call('request_access', { apps: [' '], reason: 'r' });
  assert.equal(none.body(empty).error.code, 'invalid_params');
});

test('granted: list windows, screenshot (image + summary, scale 1 by default), find, click on AX only, type, release', async () => {
  const { call, body, native, service } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(body(await call('app_list_windows', { app: FINDER })).windows[0].window_id, 7);
  const shot = await call('app_screenshot', { app: FINDER });
  assert.equal(shot.isError, undefined);
  assert.equal(shot.content[0].type, 'text');
  assert.match(shot.content[0].text, /^Window 7 of com\.apple\.finder/);
  assert.match(shot.content[0].text, /\[1\] AXTextField\/AXSearchField "Search"/);
  assert.deepEqual(shot.content[1], { type: 'image', data: 'QUJD', mimeType: 'image/jpeg' });
  assert.equal(native.calls.find(([method]) => method === 'captureWindow')[1].scale, 1);
  assert.equal(body(await call('app_screenshot', { app: FINDER, scale: 3 })).error.code, 'invalid_params');
  const found = await call('app_ax_find', { app: FINDER, role: 'button' });
  assert.match(found.content[0].text, /^2 of 3 elements in window 7 match\.\n\[0\] AXButton "Back"/);
  assert.match((await call('app_ax_find', { app: FINDER, role: 'searchfield' })).content[0].text, /^1 of 3/);
  assert.match((await call('app_ax_find', { app: FINDER, title_contains: 'FORW' })).content[0].text, /\[2\] AXButton "Forward"/);
  // Two addressing modes at once: refused in the handler, before anything reaches the native side.
  const before = native.calls.length;
  const both = await call('app_click', { app: FINDER, element_index: 0, coordinate: [5, 5] });
  assert.equal(body(both).error.code, 'invalid_params');
  assert.match(body(both).error.message, /only one of coordinate, element_index and target/);
  assert.equal(native.calls.length, before);
  const clicked = await call('app_click', { app: FINDER, element_index: 0 });
  assert.deepEqual(body(clicked), { ok: true, outcome: 'ok', path: 'ax', windowId: 7 });
  assert.ok(!native.calls.some(([method]) => method === 'rawClick'));
  const typed = await call('app_type', { app: FINDER, text: 'notes', mode: 'replace', element_index: 1 });
  assert.equal(body(typed).ok, true);
  assert.equal(native.calls.find(([method]) => method === 'axType')[1].mode, 'replace');
  assert.deepEqual(body(await call('app_release', { app: FINDER })), { released: [`${FINDER}:7`] });
  assert.equal(service.lastTarget('thread-a'), null);
  assert.ok(service.grantsFor('thread-a').has(FINDER), 'release keeps the grant');
  assert.equal(body(await call('app_click', { app: FINDER, element_index: 0 })).error.code, 'screenshot_required');
  assert.equal(body(await call('app_release', { window_id: 7 })).error.code, 'invalid_params');
});

test('app_click stays on the AX rung: even a reason the policy would send to raw input is refused, never clicked raw', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'no_press_action' }; }
    if (method === 'rawClick') { native.calls.push([method, params]); return { outcome: 'ok', path: 'cgevent' }; }
    return call0(method, params);
  };
  // A policy that opens the raw rung for this reason (as M4 may): the service alone would click raw.
  const decide = (result) => (result?.outcome === 'ok' ? { action: 'done' } : { action: 'fallback', reason: result.reasonCode });
  const { call, body, service } = setup({ native, decide });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const result = await call('app_click', { app: FINDER, coordinate: [20, 20] });
  assert.equal(result.isError, true);
  const parsed = body(result);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reasonCode, 'no_press_action');
  assert.equal(parsed.blocked, true);
  assert.equal(typeof parsed.next_step, 'string');
  assert.ok(!native.calls.some(([method]) => method === 'rawClick'), 'the tool never reaches rawClick');
  // Control: the same call on the service without axOnly does go raw, so the refusal above is the tool's doing.
  assert.equal((await service.appClick('thread-a', { bundleId: FINDER, coordinate: [20, 20] })).path, 'cgevent');
});

test('apps.cjs: a name from the application folders, a bundle id through Spotlight, missing apps not installed', async () => {
  const runs = [];
  const resolver = createAppResolver({
    home: '/Users/me',
    readdir: (dir) => ({ '/System/Library/CoreServices': ['Finder.app', 'Dock.app'], '/System/Applications': ['TextEdit.app'] })[dir] ?? [],
    exec: async (file, args) => {
      runs.push([path.basename(file), args.at(-1)]);
      if (file.endsWith('plutil')) return { '/System/Library/CoreServices/Finder.app/Contents/Info.plist': 'com.apple.finder\n', '/System/Applications/TextEdit.app/Contents/Info.plist': 'com.apple.TextEdit' }[args.at(-1)] ?? '';
      if (args[0].includes('kMDItemCFBundleIdentifier == "com.apple.TextEdit"')) return '/Volumes/Backup/TextEdit.app\n/System/Applications/TextEdit.app\n';
      return '';
    },
  });
  const [finder, textEdit, figma, quoted] = await resolver.resolveAll(['finder', 'com.apple.TextEdit', 'Figma', 'a"b']);
  assert.deepEqual(finder, { requested: 'finder', bundleId: FINDER, displayName: 'Finder', path: '/System/Library/CoreServices/Finder.app', installed: true });
  assert.equal(textEdit.path, '/System/Applications/TextEdit.app', 'the usual folder wins over a backup');
  assert.equal(textEdit.bundleId, 'com.apple.TextEdit');
  assert.deepEqual(figma, { requested: 'Figma', bundleId: null, displayName: 'Figma', path: null, installed: false });
  assert.equal(quoted.installed, false);
  assert.ok(!runs.some(([, query]) => String(query).includes('a"b')), 'a quote never reaches a Spotlight query');
});

test('apps.cjs: the card icon is Quick Look\'s thumbnail of the bundle (getFileIcon is the blank template on macOS 27)', async () => {
  const asked = [];
  const image = (empty) => ({ isEmpty: () => empty, toDataURL: () => 'data:image/png;base64,SUNP' });
  const nativeImage = { createThumbnailFromPath: async (file, size) => { asked.push([file, size]); return image(false); } };
  assert.equal(await appIconDataUrl('/System/Library/CoreServices/Finder.app', nativeImage), 'data:image/png;base64,SUNP');
  assert.deepEqual(asked, [['/System/Library/CoreServices/Finder.app', { width: 64, height: 64 }]]);
  assert.equal(await appIconDataUrl('/System/Library/CoreServices/Finder.app', { createThumbnailFromPath: async () => image(true) }), undefined);
  assert.equal(await appIconDataUrl('/x/Finder.app', { createThumbnailFromPath: async () => { throw new Error('no thumbnail'); } }), undefined);
  assert.equal(await appIconDataUrl(null, nativeImage), undefined, 'not installed: no icon');
  assert.equal(asked.length, 1);
});

test('transcript: the code_desktop computer-use tools are computer-use steps under the official names', () => {
  const item = (tool, args = {}) => ({ type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args });
  assert.deepEqual(computerUseAction(item('app_click', { app: FINDER, element_index: 0 })), { kind: 'click', scope: 'app', app: FINDER });
  assert.equal(computerUseAction(item('app_screenshot', { app: FINDER })).kind, 'window_screenshot');
  assert.equal(computerUseAction(item('request_access', { apps: ['Finder'] })).kind, 'request_access');
  assert.equal(computerUseAction(item('app_release')).kind, 'release');
  assert.equal(computerUseAction(item('read_terminal')), null, 'other code_desktop tools are not computer use');
  assert.equal(computerUseAction(item('app_scroll', { app: FINDER, dy: 3 })).kind, 'scroll');
  assert.equal(computerUseAction(item('app_frobnicate')), null, 'names the app does not serve are not recognized on the app server');
  assert.deepEqual(computerUseAction(item('app_menu', { app: FINDER, path: ['File'] })), { kind: 'menu', path: ['File'], scope: 'app', app: FINDER });
  assert.equal(computerUseAction(item('app_focus', { app: FINDER })).kind, 'focus');
  assert.equal(computerUseAction(item('app_zoom', { app: FINDER, region: [0, 0, 1, 1] })).kind, 'zoom');
  assert.equal(computerUseAction(item('app_batch', { app: FINDER, actions: [] })).kind, 'batch');
  assert.equal(computerUseAction(item('list_apps')).kind, 'list_apps');
  assert.equal(sdkToolName(item('app_menu')), 'mcp__computer-use__app_menu');
  assert.equal(sdkToolName(item('list_apps')), 'mcp__computer-use__list_apps');
  for (const name of OFFICIAL) assert.equal(sdkToolName(item(name)), `mcp__computer-use__${name}`, name);
  assert.equal(sdkToolName(item('app_screenshot')), 'mcp__computer-use__app_screenshot');
  assert.equal(sdkToolName(item('request_access')), 'mcp__computer-use__request_access');
});

test('app_click: right, double and triple click go the normal path; app_drag still answers requires_raw_path', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  for (const args of [{ button: 'right' }, { count: 2 }, { count: 3 }, { button: 'left', count: 1 }]) {
    const parsed = body(await call('app_click', { app: FINDER, element_index: 1, ...args }));
    assert.equal(parsed.ok, true, JSON.stringify(args));
    const sent = native.calls.filter(([method]) => method === 'axClick').at(-1)[1];
    assert.deepEqual([sent.button, sent.count], [args.button ?? 'left', args.count ?? 1], JSON.stringify(args));
  }
  const drag = body(await call('app_drag', { app: FINDER, coordinate: [1, 1], to_coordinate: [5, 5] }));
  assert.equal(drag.reasonCode, 'requires_raw_path');
  // The parameters stay in the schema; their descriptions say what Accessibility does, and nothing about raw input.
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.deepEqual(click.inputSchema.properties.button.enum, ['left', 'right']);
  assert.deepEqual(click.inputSchema.properties.count.enum, [1, 2, 3]);
  for (const text of [click.description, click.inputSchema.properties.button.description, click.inputSchema.properties.count.description]) {
    assert.doesNotMatch(text, /requires_raw_path|raw input/);
  }
  assert.match(click.inputSchema.properties.count.description, /3: triple click — selects the line/);
});

test('app_click: button "right" goes the normal path to the native AXShowMenu, never requires_raw_path', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const result = await call('app_click', { app: FINDER, element_index: 0, button: 'right' });
  const parsed = body(result);
  assert.equal(parsed.ok, true);
  assert.notEqual(parsed.reasonCode, 'requires_raw_path');
  const clicks = native.calls.filter(([method]) => method === 'axClick').map(([, params]) => params);
  assert.deepEqual([clicks.at(-1).button, clicks.at(-1).count, clicks.at(-1).elementIndex], ['right', 1, 0]);
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.match(click.description, /AXShowMenu/);
  assert.match(click.description, /no_menu_action/);
  for (const text of [click.description, click.inputSchema.properties.button.description, click.inputSchema.properties.count.description]) {
    assert.doesNotMatch(text, /synthe|deliver|\bpost/i);
  }
});

test('app_click: count 2 goes the normal path to the native double click (AXSelectedTextRange or two AXPress)', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const parsed = body(await call('app_click', { app: FINDER, element_index: 1, count: 2 }));
  assert.equal(parsed.ok, true);
  assert.notEqual(parsed.reasonCode, 'requires_raw_path');
  const clicks = native.calls.filter(([method]) => method === 'axClick').map(([, params]) => params);
  assert.deepEqual([clicks.at(-1).button, clicks.at(-1).count, clicks.at(-1).elementIndex], ['left', 2, 1]);
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.match(click.description, /AXSelectedTextRange/);
  assert.match(click.description, /80 ms/);
});

test('app_click: a double click with nothing to press or select answers no_press_action with a next step', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'no_press_action', role: 'AXGroup' }; }
    if (method === 'rawClick') { native.calls.push([method, params]); return { outcome: 'ok' }; }
    return call0(method, params);
  };
  const { call, body } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const parsed = body(await call('app_click', { app: FINDER, coordinate: [20, 20], count: 2 }));
  assert.deepEqual([parsed.ok, parsed.reasonCode, parsed.blocked], [false, 'no_press_action', true]);
  assert.match(parsed.next_step, /Accessibility/);
  assert.ok(!native.calls.some(([method]) => method === 'rawClick'));
});

test('app_click: a right click on an element without AXShowMenu answers no_menu_action with a next step, never a silent ok', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'no_menu_action', role: 'AXRadioButton' }; }
    if (method === 'rawClick') { native.calls.push([method, params]); return { outcome: 'ok' }; }
    return call0(method, params);
  };
  const { call, body } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const result = await call('app_click', { app: FINDER, element_index: 0, button: 'right' });
  assert.equal(result.isError, true);
  const parsed = body(result);
  assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode, parsed.blocked], [false, 'unsupported', 'no_menu_action', true]);
  assert.match(parsed.next_step, /context menu/);
  assert.ok(!native.calls.some(([method]) => method === 'rawClick'), 'no other path is tried');
});

test('app_click: no addressing is an error, never a replay of the previous click', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  assert.equal(body(await call('app_click', { app: FINDER, coordinate: [20, 20] })).ok, true);
  const clicks = () => native.calls.filter(([method]) => method === 'axClick').length;
  const empty = await call('app_click', { app: FINDER });
  assert.equal(empty.isError, true);
  assert.equal(body(empty).error.code, 'invalid_params');
  assert.match(body(empty).error.message, /one of coordinate, element_index or target/);
  assert.equal(clicks(), 1, 'the earlier click is not pressed again');
});

test('app_type: a password field is no_text_target before anything is written or selected', async () => {
  const secure = { index: 3, role: 'AXTextField', subrole: 'AXSecureTextField', title: 'Password', frame: { x: 400, y: 100, width: 200, height: 22 } };
  const native = fakeNative();
  const call0 = native.call.bind(native);
  let secureNow = false;
  native.call = async (method, params) => {
    if (method === 'captureWindow') { const shot = await call0(method, params); return { ...shot, elements: [...shot.elements, secure] }; }
    if (method === 'probe') { native.calls.push([method, params]); return { screenLocked: false, secureInput: secureNow }; }
    // The native target resolution refuses a secure field this way, before it selects anything.
    if (method === 'axType' && params.focused) { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'secure_input_active' }; }
    return call0(method, params);
  };
  const { call, body } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const typed = () => native.calls.filter(([method]) => method === 'axType').length;
  for (const target of [{ element_index: 3 }, { coordinate: [450, 110] }]) {
    const result = await call('app_type', { app: FINDER, text: 'hunter2', mode: 'replace', ...target });
    assert.equal(result.isError, true);
    const parsed = body(result);
    assert.equal(parsed.reasonCode, 'no_text_target', JSON.stringify(target));
    assert.equal(parsed.secureTextField, true);
    assert.match(parsed.next_step, /password/);
  }
  assert.equal(typed(), 0, 'nothing reached axType: no select-all, no write');
  // target "focused": only the native side knows the role; its secure-field refusal is remapped when no secure input is on.
  assert.equal(body(await call('app_type', { app: FINDER, text: 'hunter2', target: 'focused' })).reasonCode, 'no_text_target');
  // Real secure input (another app's password field) stays what it is.
  secureNow = true;
  assert.equal(body(await call('app_type', { app: FINDER, text: 'hunter2', target: 'focused' })).reasonCode, 'secure_input_active');
  secureNow = false;
  // An ordinary field next to it is typed into as before.
  assert.equal(body(await call('app_type', { app: FINDER, text: 'notes', element_index: 1 })).ok, true);
});

test('app_focus: gives the window focus without a screenshot, after which target "focused" works there', async () => {
  const { call, body, native, axHelper } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  // No screenshot and no focus: target "focused" has no window to mean.
  assert.equal(body(await call('app_type', { app: FINDER, text: 'notes', target: 'focused' })).error.code, 'screenshot_required');
  const focused = await call('app_focus', { app: FINDER });
  assert.equal(focused.isError, undefined);
  assert.deepEqual(body(focused), { ok: true, outcome: 'ok', focused: true, main: true, window_id: 7, activated: false });
  assert.deepEqual(axHelper.calls.at(-1), ['focus', { bundleId: FINDER }]);
  const typed = await call('app_type', { app: FINDER, text: 'notes', target: 'focused' });
  assert.equal(body(typed).ok, true);
  assert.deepEqual(native.calls.find(([method]) => method === 'axType')[1], { bundleId: FINDER, windowId: 7, text: 'notes', mode: 'insert', focused: true });
  assert.equal(body(await call('app_click', { app: FINDER, target: 'focused' })).ok, true);
  // An explicit window goes to the helper as is.
  await call('app_focus', { app: FINDER, window_id: 9 });
  assert.deepEqual(axHelper.calls.at(-1), ['focus', { bundleId: FINDER, windowId: 9 }]);
});

test('app_focus: refused while the app is frontmost, and while the screen is locked; never without a grant', async () => {
  const front = setup({ axHelper: fakeHelper({ frontmost: true }) });
  assert.equal(front.body(await front.call('app_focus', { app: FINDER })).error.code, 'app_not_granted');
  assert.equal(front.axHelper.calls.length, 0);
  await front.call('request_access', { apps: ['Finder'], reason: 'r' });
  const refused = front.body(await front.call('app_focus', { app: FINDER }));
  assert.equal(refused.ok, false);
  assert.equal(refused.reasonCode, 'app_is_frontmost');
  assert.match(refused.next_step, /user is working in it/);
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => (method === 'probe' ? { screenLocked: true, secureInput: false } : call0(method, params));
  const locked = setup({ native });
  await locked.call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(locked.body(await locked.call('app_focus', { app: FINDER })).reasonCode, 'screen_locked');
  assert.equal(locked.axHelper.calls.length, 0);
});

test('app_menu: list the bar and a menu, open a menu, run a command, disabled and unknown items, close', async () => {
  const { call, body, axHelper } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const bar = body(await call('app_menu', { app: FINDER, list: true }));
  assert.deepEqual(bar.items.map((item) => item.title), ['Finder', 'File']);
  assert.deepEqual(axHelper.calls.at(-1), ['menuList', { bundleId: FINDER, path: [] }]);
  assert.equal(body(await call('app_menu', { app: FINDER, list: 'file' })).items.length, 2);
  assert.deepEqual(axHelper.calls.at(-1), ['menuList', { bundleId: FINDER, path: ['file'] }]);
  const opened = body(await call('app_menu', { app: FINDER, path: ['File'] }));
  assert.equal(opened.ok, true);
  assert.equal(opened.opened, true);
  assert.deepEqual(opened.items.map((item) => [item.title, item.enabled]), [['New Finder Window', true], ['New Folder', false]]);
  assert.equal(body(await call('app_menu', { app: FINDER, close: true })).closed, 1);
  const ran = body(await call('app_menu', { app: FINDER, path: ['File', 'New Finder Window…'] }));
  assert.deepEqual([ran.ok, ran.opened], [true, false]);
  const disabled = await call('app_menu', { app: FINDER, path: ['File', 'New Folder'] });
  assert.equal(disabled.isError, true);
  assert.equal(body(disabled).reasonCode, 'menu_item_disabled');
  assert.match(body(disabled).next_step, /disabled/);
  const missing = body(await call('app_menu', { app: FINDER, path: ['Fiel'] }));
  assert.equal(missing.error.code, 'menu_item_not_found');
  assert.equal(missing.error.closestMatch, 'File');
  assert.deepEqual(missing.error.available, ['Finder', 'File']);
  assert.match(missing.error.next_step, /closestMatch/);
  for (const args of [{}, { path: ['File'], list: true }, { list: true, close: true }]) {
    assert.equal(body(await call('app_menu', { app: FINDER, ...args })).error.code, 'invalid_params', JSON.stringify(args));
  }
});

test('app_menu: a view-only app can list menus but not press them', async () => {
  const { service, axHelper } = setup();
  service.grantsFor('s').grant(['com.apple.Safari']);
  assert.equal((await service.appMenu('s', { bundleId: 'com.apple.Safari', list: true })).items.length, 2);
  await assert.rejects(() => service.appMenu('s', { bundleId: 'com.apple.Safari', path: ['File'] }), (error) => error.code === 'tier_refused');
  assert.ok(!axHelper.calls.some(([method]) => method === 'menu'));
});

test('app_zoom: needs a screenshot, crops it in image pixels and enlarges to the region\'s frame size', async () => {
  const { call, body, image, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(body(await call('app_zoom', { app: FINDER, region: [0, 0, 100, 100] })).error.code, 'screenshot_required');
  await call('app_screenshot', { app: FINDER });
  const captures = native.calls.filter(([method]) => method === 'captureWindow').length;
  const zoomed = await call('app_zoom', { app: FINDER, region: [400, 10, 520, 32] });
  assert.equal(zoomed.isError, undefined);
  assert.match(zoomed.content[0].text, /^Zoom of window 7 of com\.apple\.finder, region \[400, 10, 520, 32\]/);
  assert.deepEqual(zoomed.content[1], { type: 'image', data: 'Wk9PTQ==', mimeType: 'image/jpeg' });
  // 1600×1000 frame shot as 1254×784 (the budget): image px = frame px × 0.78375.
  const [w] = fit(1600, 1000);
  const k = w / 1600;
  assert.deepEqual(image.calls[0].rect, { x: Math.floor(400 * k), y: Math.floor(10 * k), width: Math.round(120 * k), height: Math.round(22 * k) });
  assert.deepEqual([image.calls[0].width, image.calls[0].height], [120, 22]);
  assert.equal(image.calls[0].dataUrl, 'data:image/jpeg;base64,QUJD');
  await call('app_zoom', { app: FINDER, region: [0, 0, 1600, 1000], scale: 0.5 });
  assert.deepEqual([image.calls[1].width, image.calls[1].height], scaled(fit(1600, 1000), 0.5));
  assert.equal(native.calls.filter(([method]) => method === 'captureWindow').length, captures, 'nothing captured again');
  for (const region of [[10, 10, 5, 20], [0, 0, 1601, 10], [-1, 0, 10, 10]]) {
    assert.equal(body(await call('app_zoom', { app: FINDER, region })).error.code, 'invalid_params', JSON.stringify(region));
  }
});

test('list_apps: needs no grant; marks the granted apps; passes query, order, page size and cursor', async () => {
  const calls = [];
  const { call, body } = setup({ listApps: fakeApps(calls) });
  const before = body(await call('list_apps', {}));
  assert.deepEqual(before.apps.map((app) => [app.name, app.running, app.pid ?? null, app.granted]), [['Finder', true, 501, false], ['TextEdit', false, null, false]]);
  assert.deepEqual(calls[0], { query: undefined, runningFirst: true, limit: 25, cursor: undefined });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const after = body(await call('list_apps', { query: 'fin', running_first: false, limit: 5, cursor: '5' }));
  assert.deepEqual(after.apps[0], { name: 'Finder', bundleId: FINDER, running: true, pid: 501, path: '/System/Library/CoreServices/Finder.app', granted: true, tier: 'full' });
  assert.deepEqual(calls[1], { query: 'fin', runningFirst: false, limit: 5, cursor: '5' });
});

test('apps.cjs list: running first with pid, installed from the same folders, query, Spotlight fallback, pages', async () => {
  const seen = [];
  const resolver = createAppResolver({
    home: '/Users/me', readdir: () => [],
    exec: async (file, args) => {
      if (file.endsWith('mdfind') && args[0].includes('"Figma"')) return '/Applications/Figma.app\n';
      if (file.endsWith('plutil')) return 'com.figma.Desktop';
      return '';
    },
    enumerate: async (folders) => {
      seen.push(folders);
      return {
        running: [{ bundleId: 'com.apple.TextEdit', name: 'TextEdit', pid: 42, path: '/System/Applications/TextEdit.app' }],
        installed: [{ bundleId: 'com.apple.Notes', name: 'Notes', path: '/System/Applications/Notes.app' },
          { bundleId: 'com.apple.TextEdit', name: 'TextEdit', path: '/System/Applications/TextEdit.app' },
          { bundleId: 'com.apple.Calculator', name: 'Calculator', path: '/System/Applications/Calculator.app' }],
      };
    },
  });
  const all = await resolver.list();
  assert.deepEqual(all.apps.map((app) => [app.name, app.running, app.pid ?? null]), [['TextEdit', true, 42], ['Calculator', false, null], ['Notes', false, null]]);
  assert.equal(all.total, 3);
  assert.ok(seen[0].includes('/System/Library/CoreServices') && seen[0].includes('/Users/me/Applications'), 'the folders request_access searches');
  assert.deepEqual((await resolver.list({ runningFirst: false })).apps.map((app) => app.name), ['Calculator', 'Notes', 'TextEdit']);
  assert.deepEqual((await resolver.list({ query: 'APPLE.NOTES' })).apps.map((app) => app.name), ['Notes']);
  const page = await resolver.list({ limit: 2 });
  assert.equal(page.nextCursor, '2');
  assert.deepEqual((await resolver.list({ limit: 2, cursor: page.nextCursor })).apps.map((app) => app.name), ['Notes']);
  // Nothing listed matches: the request_access lookup (Spotlight) finds it.
  assert.deepEqual((await resolver.list({ query: 'Figma' })).apps, [{ name: 'Figma', bundleId: 'com.figma.Desktop', running: false, path: '/Applications/Figma.app' }]);
  await assert.rejects(() => resolver.list({ cursor: 'x' }), (error) => error.code === 'invalid_params');
});

test('app_batch: runs the tools in order; a mid-batch screenshot is a picture only and the coordinates stay on the earlier one', async () => {
  const { call, body, native, service } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(body(await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 0 }] })).results[0].error.code, 'screenshot_required');
  await call('app_screenshot', { app: FINDER });
  const before = service.axFind('thread-a', { bundleId: FINDER });
  const result = await call('app_batch', { app: FINDER, actions: [
    { action: 'click', element_index: 0 }, { action: 'screenshot', scale: 0.5 }, { action: 'click', coordinate: [20, 20] },
    { action: 'type', text: 'notes', element_index: 1 }, { action: 'zoom', region: [0, 0, 100, 100] },
  ] });
  assert.equal(result.isError, undefined);
  const parsed = body(result);
  assert.deepEqual([parsed.ok, parsed.completed, parsed.total], [true, 5, 5]);
  assert.deepEqual(parsed.results.map((r) => [r.index, r.action, r.ok]), [[0, 'click', true], [1, 'screenshot', true], [2, 'click', true], [3, 'type', true], [4, 'zoom', true]]);
  assert.match(parsed.results[1].text, /mid-batch: a picture only/);
  // Pictures follow, each labelled with its action.
  assert.deepEqual(result.content.slice(1).map((part) => part.type === 'text' ? part.text : part.type), ['actions[1] (screenshot):', 'image', 'actions[4] (zoom):', 'image']);
  // The mid-batch capture listed no elements, so the native element cache and the reference screenshot are the earlier ones.
  const captures = native.calls.filter(([method]) => method === 'captureWindow');
  assert.equal(captures.length, 2);
  assert.equal(captures[1][1].listsElements, undefined);
  assert.equal(captures[1][1].scale, 0.5);
  assert.deepEqual(service.axFind('thread-a', { bundleId: FINDER }), before);
  const clicks = native.calls.filter(([method]) => method === 'axClick').map(([, params]) => params);
  assert.equal(clicks[0].elementIndex, 0);
  assert.deepEqual(clicks[1].winLocalPt, { x: 10, y: 10 }, 'frame px of the first screenshot ÷ its scale factor');
});

test('app_batch: stops at the first action that fails; the rest do not run', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const clicks = () => native.calls.filter(([method]) => method === 'axClick').length;
  for (const [stopper, code] of [[{ action: 'key', combo: 'return' }, 'requires_raw_path'], [{ action: 'click' }, 'invalid_params'], [{ action: 'scroll', dy: 3 }, 'requires_raw_path'], [{ action: 'drag', coordinate: [1, 1], to_coordinate: [5, 5] }, 'requires_raw_path']]) {
    const start = clicks();
    const result = await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 0 }, stopper, { action: 'click', element_index: 2 }] });
    assert.equal(result.isError, true);
    const parsed = body(result);
    assert.deepEqual([parsed.ok, parsed.completed, parsed.stoppedAt], [false, 1, 1], JSON.stringify(stopper));
    assert.equal(parsed.results.length, 2);
    assert.equal(parsed.results[1].reasonCode ?? parsed.results[1].error?.code, code, JSON.stringify(stopper));
    assert.match(parsed.next_step, /actions\[1\]/);
    assert.equal(clicks() - start, 1, 'the click after the stop never ran');
  }
  assert.equal(body(await call('app_batch', { app: 'com.apple.TextEdit', actions: [{ action: 'click', element_index: 0 }] })).error.code, 'app_not_granted');
});

test('ax-helper.cjs: one JSON request per process, the envelope unwrapped, details kept, a missing binary is helper_unavailable', async () => {
  const runs = [];
  const helper = createAxHelper({ file: '/x/cu-ax-helper', platform: 'darwin', exec: async (file, input) => {
    runs.push([file, JSON.parse(input)]);
    const { method } = JSON.parse(input);
    if (method === 'probe') return '{"ok":true,"result":{"axTrusted":true}}\n';
    if (method === 'bad') return 'not json';
    return JSON.stringify({ ok: false, error: { code: 'menu_item_not_found', message: 'nope', details: { closestMatch: 'File' } } });
  } });
  assert.deepEqual(await helper.call('probe'), { axTrusted: true });
  assert.deepEqual(runs[0], ['/x/cu-ax-helper', { method: 'probe', params: {} }]);
  await assert.rejects(() => helper.call('menu', { path: ['Fiel'] }), (error) => error.code === 'menu_item_not_found' && error.details.closestMatch === 'File');
  await assert.rejects(() => helper.call('bad'), (error) => error.code === 'helper_failed');
  const missing = createAxHelper({ file: path.join(os.tmpdir(), 'no-such-cu-ax-helper') });
  await assert.rejects(() => missing.call('probe'), (error) => error.code === 'helper_unavailable');
  await assert.rejects(() => createAxHelper({ platform: 'linux', exec: async () => '' }).call('probe'), (error) => error.code === 'helper_unavailable');
});

test('the 11 names without the capability yet: a precise reasonCode, a next step, and nothing reaches the native side or the helper', async () => {
  const { call, body, native, axHelper } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const before = [native.calls.length, axHelper.calls.length];
  const args = { app_key: { app: FINDER, combo: 'return' }, app_scroll: { app: FINDER, dy: 3 }, app_drag: { app: FINDER, coordinate: [1, 1], to_coordinate: [9, 9] },
    app_bring_to_current_space: { app: FINDER, window_id: 7 }, write_clipboard: { text: 'x' }, request_teach_access: { apps: ['Finder'], reason: 'r' },
    teach_step: { explanation: 'e', next_preview: 'n', actions: [] }, teach_batch: { steps: [{ explanation: 'e', next_preview: 'n', actions: [] }] } };
  for (const [name, reasonCode] of Object.entries(REASONED)) {
    const result = await call(name, args[name] ?? {});
    assert.equal(result.isError, true, name);
    const parsed = body(result);
    assert.equal(parsed.ok, false, name);
    assert.equal(parsed.reasonCode, reasonCode, name);
    assert.equal(typeof parsed.next_step, 'string', name);
    assert.notEqual(parsed.reasonCode, 'unsupported');
    if (reasonCode === 'not_supported_in_build') assert.match(parsed.build, /one granted app's window at a time/, name);
    if (reasonCode === 'permission_denied') assert.match(parsed.next_step, /request_access with clipboard(Read|Write): true/, name);
    const tool = cu.tools.find((entry) => entry.name === name);
    assert.match(tool.description, reasonCode === 'permission_denied' ? /permission_denied/ : /Not available in this build/, name);
    assert.match(tool.description, new RegExp(reasonCode), name);
  }
  assert.deepEqual([native.calls.length, axHelper.calls.length], before);
  // With the clipboard permissions granted, the clipboard is still outside this build (display-scope control).
  await call('request_access', { apps: ['Finder'], reason: 'r', clipboardRead: true, clipboardWrite: true });
  assert.equal(body(await call('read_clipboard', {})).reasonCode, 'not_supported_in_build');
  assert.equal(body(await call('write_clipboard', { text: 'x' })).reasonCode, 'not_supported_in_build');
  // app_batch goes through app_key for a key step.
  await call('app_screenshot', { app: FINDER });
  assert.match(body(await call('app_batch', { app: FINDER, actions: [{ action: 'key', combo: 'return' }] })).results[0].message, /A key press needs the raw input path/);
});

test('list_granted_applications: the session\'s apps, tiers, flags and the coordinate mode; nothing asked', async () => {
  const { call, body, asked } = setup();
  assert.deepEqual(body(await call('list_granted_applications', {})), { apps: [], flags: { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false }, coordinateMode: 'app_window' });
  await call('request_access', { apps: ['Finder'], reason: 'r', clipboardRead: true });
  assert.deepEqual(body(await call('list_granted_applications', {})), { apps: [{ bundleId: FINDER, name: 'Finder', tier: 'full' }],
    flags: { clipboardRead: true, clipboardWrite: false, systemKeyCombos: false }, coordinateMode: 'app_window' });
  assert.equal(asked.length, 1, 'only request_access showed a card');
  assert.deepEqual(body(await call('list_granted_applications', {}, 'thread-b')).apps, [], 'per session');
});

test('settings: every session\'s grants by app, and revoking one app from one session or from all (its windows released)', async () => {
  const { call, body, service } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' }, 'thread-a');
  await call('request_access', { apps: ['Finder'], reason: 'r' }, 'thread-b');
  service.grantsFor('thread-b').grant([{ bundleId: 'com.apple.TextEdit', displayName: 'TextEdit' }]);
  await call('app_screenshot', { app: FINDER }, 'thread-a');
  assert.deepEqual((await service.call('computer-use:all-grants', {})).result, { apps: [
    { bundleId: FINDER, displayName: 'Finder', tier: 'full', sessionIds: ['thread-a', 'thread-b'] },
    { bundleId: 'com.apple.TextEdit', displayName: 'TextEdit', tier: 'full', sessionIds: ['thread-b'] }] });
  assert.deepEqual((await service.call('computer-use:revoke', { bundleId: FINDER, sessionId: 'thread-b' })).result, { bundleId: FINDER, revoked: ['thread-b'] });
  assert.ok(service.grantsFor('thread-a').has(FINDER));
  assert.deepEqual((await service.call('computer-use:revoke', { bundleId: FINDER })).result, { bundleId: FINDER, revoked: ['thread-a'] });
  assert.equal(service.lastTarget('thread-a'), null, 'the window it was looking at is released');
  const after = body(await call('app_screenshot', { app: FINDER }, 'thread-a'));
  assert.equal(after.error.code, 'app_not_granted', 'the agent has to ask again');
  assert.equal((await service.call('computer-use:revoke', {})).error.code, 'invalid_params');
});
