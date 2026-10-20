// agent-tools/computer-use.mjs: the seven computer-use tools the host serves this round, their schemas (compiled and
// checked with Ajv), the grant check in front of every tool, request_access through the access card, and the
// transcript recognizing them. In-process only: a fake native module behind the real service, the host never started.
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
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const Ajv = require('../../harness/node_modules/ajv').default;
const cu = await import('../electron/agent-tools/computer-use.mjs');
const { computerUseAction } = await import('../electron/computer-use/actions.mjs');
const { sdkToolName } = await import('../src/transcript-sdk-tools.mjs');

const OPEN = ['request_access', 'app_list_windows', 'app_screenshot', 'app_ax_find', 'app_click', 'app_type', 'app_release'];
const CLOSED = ['app_scroll', 'app_drag', 'app_key', 'app_menu', 'app_batch'];
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

function setup({ answer = 'accept', native = fakeNative(), decide } = {}) {
  const service = createComputerUse({ native, log: { log() {}, warn() {} }, wait: async () => {}, ...(decide ? { decide } : {}) });
  const asked = [];
  const host = createAgentToolsHost({
    tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    modules: [cu], isGroupEnabled: () => true,
    resolveSession: (id, meta) => { const key = id ?? meta?.threadId; return key ? { id: key, cwd: '/work' } : null; },
  });
  host.provide('computerUse', () => ({ service, resolveApps: (names) => resolver.resolveAll(names), ask: async (access) => { asked.push(access); return answer; } }));
  const call = async (name, args, session = 'thread-a') => host.call(session, { name, arguments: args });
  const body = (result) => JSON.parse(result.content[0].text);
  return { host, service, native, asked, call, body };
}

test('discovery: the host finds exactly the seven open tools in the "computer-use" group, from the tools folder', async () => {
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    resolveSession: () => null, isGroupEnabled: () => true });
  await host.ready();
  const names = host.listTools().map((tool) => tool.name);
  for (const name of OPEN) assert.ok(names.includes(name), `${name} is served`);
  for (const name of CLOSED) assert.ok(!names.includes(name), `${name} is not served`);
  assert.equal(cu.group, 'computer-use');
  assert.deepEqual(cu.tools.map((tool) => tool.name), OPEN);
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
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.default, 1);
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.minimum, 0.1);
  assert.equal(listed.app_screenshot.inputSchema.properties.scale.maximum, 1);
  assert.deepEqual(listed.app_type.inputSchema.properties.mode.enum, ['insert', 'replace']);
});

test('annotations: screenshot, window list and find are read-only; the rest are not', () => {
  const hint = Object.fromEntries(cu.tools.map((tool) => [tool.name, tool.annotations?.readOnlyHint]));
  assert.deepEqual(hint, { request_access: false, app_list_windows: true, app_screenshot: true, app_ax_find: true, app_click: false, app_type: false, app_release: false });
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
  assert.equal(computerUseAction(item('app_scroll')), null, 'tools not served are not recognized on the app server');
  assert.equal(sdkToolName(item('app_screenshot')), 'mcp__computer-use__app_screenshot');
  assert.equal(sdkToolName(item('request_access')), 'mcp__computer-use__request_access');
});
