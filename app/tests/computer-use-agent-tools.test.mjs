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
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { createAppResolver, appIconDataUrl } = require('../electron/computer-use/apps.cjs');
const { createAxHelper } = require('../electron/computer-use/ax-helper.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const Ajv = require('../../harness/node_modules/ajv').default;
const cu = await import('../electron/agent-tools/computer-use.mjs');
const { computerUseAction } = await import('../electron/computer-use/actions.mjs');
// 0.1 has no transcript-sdk-tools.mjs (2.42304.0's SDK tool names): the same classification is checked through
// actions.mjs ownComputerUseTool, which that table asks — a computer-use tool of the app's server under its official
// name (screenshot / scroll / type only with computer use's own arguments), anything else as the code_desktop tool it is.
const { ownComputerUseTool } = await import('../electron/computer-use/actions.mjs');
const sdkToolName = (entry) => { const own = ownComputerUseTool(entry); return own ? `mcp__computer-use__${own}` : `mcp__code_desktop__${entry.tool}`; };

// The 17 tools that do what they say; the 7 registered with a reason code (the official set of 24 names).
const WORKING = ['request_access', 'app_list_windows', 'app_screenshot', 'app_ax_find', 'app_click', 'app_type', 'app_release',
  'app_focus', 'app_menu', 'app_zoom', 'list_apps', 'app_batch', 'list_granted_applications', 'app_drag', 'app_key', 'app_scroll',
  'app_bring_to_current_space'];
// read_clipboard / write_clipboard work since the clipboard step (tests/computer-use-clipboard.test.mjs), teach mode since
// the teach step (tests/computer-use-teach.test.mjs): no official name answers not_supported_in_build any more.
const REASONED = {};
const OPEN = [...WORKING.filter((name) => !['app_drag', 'app_key', 'app_scroll', 'app_bring_to_current_space'].includes(name)), 'app_key', 'app_scroll', 'app_drag', 'app_bring_to_current_space', 'request_full_control', 'release_full_control',
  'screenshot', 'zoom', 'left_click', 'double_click', 'triple_click', 'right_click', 'middle_click', 'scroll', 'left_click_drag', 'mouse_move',
  'cursor_position', 'left_mouse_down', 'left_mouse_up',
  'type', 'key', 'hold_key', 'open_application', 'switch_display', 'wait', 'computer_batch',
  'read_clipboard', 'write_clipboard', 'request_teach_access', 'teach_step', 'teach_batch'];
// The screen-wide (display-scope) tools of official §1.1, all of them.
const DISPLAY = ['screenshot', 'zoom', 'left_click', 'double_click', 'triple_click', 'right_click', 'middle_click', 'scroll', 'left_click_drag',
  'mouse_move', 'cursor_position', 'left_mouse_down', 'left_mouse_up', 'type', 'key', 'hold_key', 'open_application', 'switch_display', 'wait',
  'computer_batch'];
// The official 2.42304.0 tool list in full (docs/computer-use-official-spec-20261021.md §1.0, Ne() + Pe() + Fe() on macOS
// Desktop with appScoped.supportsRawInput and teachMode): 44 names.
const OFFICIAL_ALL = ['request_access', 'screenshot', 'zoom', 'left_click', 'double_click', 'triple_click', 'right_click', 'middle_click', 'type', 'key',
  'scroll', 'left_click_drag', 'mouse_move', 'open_application', 'switch_display', 'list_granted_applications', 'list_apps', 'read_clipboard',
  'write_clipboard', 'wait', 'cursor_position', 'hold_key', 'left_mouse_down', 'left_mouse_up', 'computer_batch', 'request_teach_access', 'teach_step',
  'teach_batch', 'release_full_control', 'request_full_control', 'app_list_windows', 'app_ax_find', 'app_screenshot', 'app_zoom', 'app_click', 'app_type',
  'app_key', 'app_scroll', 'app_focus', 'app_drag', 'app_menu', 'app_batch', 'app_release', 'app_bring_to_current_space'];
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
      if (method === 'drag') return { outcome: 'ineffective', reasonCode: 'drag_ineffective', delivered: true, mouseUpSent: true };
      if (method === 'axType') return { outcome: 'ok', path: 'ax' };
      if (method === 'axKey') {
        if (params.combo === 'return') return { outcome: 'ok', reasonCode: null, axOp: 'AXConfirm', role: 'AXTextField', subrole: 'AXSearchField', title: 'Search', descentPath: ['AXWindow', 'AXToolbar', 'AXTextField'], verified: false };
        return { outcome: 'unsupported', reasonCode: 'no_ax_key_action', role: 'AXButton', title: 'Back', descentPath: ['AXWindow', 'AXButton'] };
      }
      if (method === 'rawKey') {
        if (params.combo === 'f') return { outcome: 'unsupported', reasonCode: 'key_not_mapped', delivered: false };
        return { outcome: 'ok', reasonCode: null, delivered: true, verified: false, role: 'AXButton', title: 'Back', descentPath: ['AXWindow', 'AXButton'], windowId: 7, ...(params.combo === 'cmd+a' ? { cmdASentAsKeystroke: true } : {}) };
      }
      if (method === 'axScroll') {
        const area = { role: 'AXScrollArea', title: null, descentPath: ['AXWindow', 'AXSplitGroup', 'AXScrollArea'], windowId: 7 };
        if (params.winLocalPt && params.winLocalPt.x < 50) return { outcome: 'unsupported', reasonCode: 'canvas', role: 'AXButton', title: 'Back', descentPath: ['AXWindow', 'AXButton'], windowId: 7, noVerticalScrollBar: true };
        if (params.dy >= 20) return { ...area, outcome: 'ineffective', reasonCode: 'scrollbar_unchanged', axOp: 'set scrollbar AXValue=1.00', before: 1, after: 1, atLimit: 'bottom', verified: true };
        if (params.dy === 4) return { ...area, outcome: 'ineffective', reasonCode: 'scrollbar_unchanged', axOp: 'set scrollbar AXValue=0.40', axError: 'success', before: 0.2, after: 0.2, verified: true };
        if (params.dy === -7) return { ...area, outcome: 'ineffective', reasonCode: 'ax_error', axOp: 'set scrollbar AXValue', axError: 'cannotComplete', before: 0.5, verified: false };
        const after = Math.min(Math.max(0.2 + params.dy * 0.05, 0), 1);
        return { ...area, outcome: 'ok', reasonCode: null, axOp: `set scrollbar AXValue=${after.toFixed(2)}`, before: 0.2, after, verified: true };
      }
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
        // Native MenuBar.press: a path ending at a menu presses nothing and opens nothing (official path_ends_at_submenu).
        if (params.path.length === 1) return { outcome: 'unsupported', reasonCode: 'path_ends_at_submenu', path: ['File'], items: file };
        if (params.path[1]?.toLowerCase() === 'new folder') return { outcome: 'unsupported', reasonCode: 'menu_item_disabled', path: ['File', 'New Folder'] };
        if (params.path[1]?.toLowerCase() === 'locked item') return { outcome: 'unsupported', reasonCode: 'menu_press_failed', axError: -25206, path: ['File', 'Locked Item'] };
        if (params.path[1]?.toLowerCase() === 'new finder window') return { outcome: 'ok', path: ['File', 'New Finder Window'] };
        fail('menu_item_not_found', 'No such item.', { closestMatch: 'New Finder Window', available: file.map((item) => item.title), level: 1, resolved: ['File'], wanted: params.path[1] });
      }
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

function setup({ answer = 'accept', native = fakeNative(), decide, axHelper = fakeHelper(), image = fakeImage(), listApps = fakeApps(), fullControl, savePanel } = {}) {
  const service = createComputerUse({ native, axHelper, image, log: { log() {}, warn() {} }, wait: async () => {}, ...(decide ? { decide } : {}), ...(fullControl ? { fullControl } : {}), ...(savePanel ? { savePanel } : {}) });
  const asked = [];
  const host = createAgentToolsHost({
    tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-agent-tools-')), logger: { warn() {}, log() {} },
    modules: [cu], isGroupEnabled: () => true,
    resolveSession: (id, meta) => { const key = id ?? meta?.threadId; return key ? { id: key, cwd: '/work' } : null; },
  });
  const takeovers = [];
  host.provide('computerUse', () => ({ service, resolveApps: (names) => resolver.resolveAll(names), listApps,
    ask: async (access) => { asked.push(access); return answer; },
    askTakeover: async (opts) => { takeovers.push(opts); return answer; } }));
  const call = async (name, args, session = 'thread-a') => host.call(session, { name, arguments: args });
  const body = (result) => JSON.parse(result.content[0].text);
  return { host, service, native, axHelper, image, asked, takeovers, call, body };
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
  assert.deepEqual([...OPEN].sort(), [...OFFICIAL, ...DISPLAY].sort(), 'the 24 app-scope names and 20 screen-wide ones, nothing else');
  assert.equal(OFFICIAL_ALL.length, 44);
  assert.deepEqual([...OPEN].sort(), [...OFFICIAL_ALL].sort(), 'exactly the official tool list');
  const { OWN_COMPUTER_USE_TOOLS } = await import('../electron/computer-use/actions.mjs');
  assert.deepEqual([...OWN_COMPUTER_USE_TOOLS].sort(), [...OFFICIAL_ALL].sort(), 'OWN_COMPUTER_USE_TOOLS is the official list');
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
  bad('app_menu', { app: FINDER, close: true });
  bad('app_menu', { app: FINDER, path: [] });
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
  ok('app_drag', { app: FINDER, coordinate: [0, 0], to_coordinate: [20, 20], path: [[0, 0], [10, 10]], button: 'left' });
  bad('app_drag', { app: FINDER, path: [[0, 0], [10, 10]] });
  bad('app_drag', { app: FINDER, path: [[0, 0]] });
  ok('app_bring_to_current_space', { app: FINDER, window_id: 7 });
  bad('app_bring_to_current_space', { app: FINDER });
  ok('request_full_control', {});
  ok('screenshot', {});
  ok('screenshot', { scale: 0.5 });
  bad('screenshot', { scale: 2 });
  bad('screenshot', { quality: 80 });
  ok('zoom', { region: [0, 0, 100, 50] });
  bad('zoom', { region: [0, 0, 100] });
  bad('zoom', { region: [0, 0, 1.5, 2] });
  for (const name of ['left_click', 'double_click', 'triple_click', 'right_click', 'middle_click']) {
    ok(name, { coordinate: [10, 20] });
    ok(name, { coordinate: [10, 20], text: 'shift+cmd' });
    bad(name, {});
    bad(name, { coordinate: [10] });
  }
  ok('scroll', { coordinate: [1, 2], scroll_direction: 'down', scroll_amount: 3 });
  bad('scroll', { coordinate: [1, 2], scroll_direction: 'sideways', scroll_amount: 3 });
  bad('scroll', { coordinate: [1, 2], scroll_direction: 'down', scroll_amount: 101 });
  bad('scroll', { direction: 'down' });
  ok('left_click_drag', { coordinate: [5, 5] });
  ok('left_click_drag', { coordinate: [5, 5], start_coordinate: [1, 1] });
  bad('left_click_drag', { start_coordinate: [1, 1] });
  ok('mouse_move', { coordinate: [3, 4] });
  bad('mouse_move', {});
  ok('cursor_position', {});
  ok('left_mouse_down', {});
  ok('left_mouse_up', {});
  bad('left_mouse_down', { coordinate: [1, 1] });
  ok('write_clipboard', { text: 'x' });
  bad('write_clipboard', {});
  ok('type', { text: 'hello\nworld' });
  bad('type', {});
  ok('key', { text: 'cmd+s' });
  ok('key', { text: 'down', repeat: 100 });
  bad('key', { text: 'down', repeat: 0 });
  bad('key', { text: 'down', repeat: 101 });
  bad('key', { text: 'down', repeat: 1.5 });
  ok('hold_key', { text: 'shift', duration: 0.5 });
  bad('hold_key', { text: 'shift' });
  bad('hold_key', { text: 'shift', duration: 101 });
  ok('open_application', { app: 'TextEdit' });
  bad('open_application', {});
  ok('switch_display', { display: 'auto' });
  bad('switch_display', {});
  ok('wait', { duration: 0 });
  bad('wait', { duration: -1 });
  bad('wait', { duration: 100.5 });
  ok('computer_batch', { actions: [{ action: 'screenshot', scale: 0.5 }, { action: 'left_click', coordinate: [1, 2], text: 'cmd' }, { action: 'key', text: 'return', repeat: 2 },
    { action: 'type', text: 'x' }, { action: 'hold_key', text: 'shift', duration: 1 }, { action: 'zoom', region: [0, 0, 10, 10] }, { action: 'wait', duration: 1 },
    { action: 'scroll', coordinate: [1, 1], scroll_direction: 'down', scroll_amount: 3 }, { action: 'left_click_drag', start_coordinate: [1, 1], coordinate: [2, 2] }] });
  bad('computer_batch', { actions: [] });
  bad('computer_batch', { actions: [{ action: 'open_application', app: 'TextEdit' }] });
  bad('computer_batch', { actions: [{ action: 'key', text: 'a', bogus: 1 }] });
  ok('request_teach_access', { apps: ['Finder'], reason: 'Show how' });
  ok('teach_step', { explanation: 'e', next_preview: 'n', actions: [{ action: 'left_click', coordinate: [1, 2] }, { action: 'type', text: 'x' }], anchor: [1, 2] });
  bad('teach_step', { explanation: 'e', next_preview: 'n', actions: [{ action: 'zoom', region: [0, 0, 1, 1] }] });
  bad('teach_step', { explanation: 'e', next_preview: 'n' });
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
    screenshot: true, zoom: true, left_click: false, double_click: false, triple_click: false, right_click: false, middle_click: false, scroll: false,
    left_click_drag: false, mouse_move: false, cursor_position: true, left_mouse_down: false, left_mouse_up: false,
    type: false, key: false, hold_key: false, open_application: false, switch_display: false, wait: true, computer_batch: false,
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
    const { ok, outcome, reasonCode, next_step: nextStep } = body(result);
    assert.equal(ok, false);
    assert.equal(outcome, 'unsupported', name);
    assert.equal(reasonCode, 'app_not_granted', name);
    assert.match(nextStep, /request_access/);
  }
  assert.deepEqual(native.calls, []);
  const invalid = body(await call('app_click', { app: 'not a bundle id' }));
  assert.equal(invalid.reasonCode, 'invalid_params');
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
  assert.equal(none.body(failed).reasonCode, 'approval_unavailable');
  assert.ok(!none.service.grantsFor('thread-a').has(FINDER));
  const empty = await none.call('request_access', { apps: [' '], reason: 'r' });
  assert.equal(none.body(empty).reasonCode, 'invalid_params');
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
  assert.equal(body(await call('app_screenshot', { app: FINDER, scale: 3 })).reasonCode, 'invalid_params');
  const found = await call('app_ax_find', { app: FINDER, role: 'button' });
  assert.match(found.content[0].text, /^2 of 3 elements in window 7 match\.\n\[0\] AXButton "Back"/);
  assert.match((await call('app_ax_find', { app: FINDER, role: 'searchfield' })).content[0].text, /^1 of 3/);
  assert.match((await call('app_ax_find', { app: FINDER, title_contains: 'FORW' })).content[0].text, /\[2\] AXButton "Forward"/);
  // Two addressing modes at once: refused in the handler, before anything reaches the native side.
  const before = native.calls.length;
  const both = await call('app_click', { app: FINDER, element_index: 0, coordinate: [5, 5] });
  assert.equal(body(both).reasonCode, 'invalid_params');
  assert.match(body(both).message, /only one of coordinate, element_index and target/);
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
  assert.equal(body(await call('app_click', { app: FINDER, element_index: 0 })).reasonCode, 'screenshot_required');
  assert.equal(body(await call('app_release', { window_id: 7 })).reasonCode, 'invalid_params');
});

test('app_click stays on the AX rung: even a reason the policy would send to raw input is refused, never clicked raw', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'select_refused' }; }
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
  assert.equal(parsed.reasonCode, 'select_refused');
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
  for (const name of DISPLAY.filter((name) => !['screenshot', 'scroll', 'type'].includes(name))) assert.equal(sdkToolName(item(name)), `mcp__computer-use__${name}`, name);
  // type is preview's too, and both take just text: it counts as preview's.
  assert.equal(sdkToolName(item('type', { text: 'hi' })), 'mcp__code_desktop__type');
  assert.equal(computerUseAction(item('key', { text: 'cmd+s' })).kind, 'key');
  assert.equal(computerUseAction(item('open_application', { app: 'TextEdit' })).kind, 'open_app');
  // screenshot / scroll are preview's too on this server: computer use's only with its own arguments.
  assert.equal(sdkToolName(item('screenshot', { scale: 0.5 })), 'mcp__computer-use__screenshot');
  assert.equal(sdkToolName(item('scroll', { coordinate: [1, 2], scroll_direction: 'down', scroll_amount: 2 })), 'mcp__computer-use__scroll');
  assert.equal(sdkToolName(item('screenshot', { quality: 80 })), 'mcp__code_desktop__screenshot');
  assert.equal(sdkToolName(item('scroll', { ref: 'ref_3' })), 'mcp__code_desktop__scroll');
  assert.equal(computerUseAction(item('scroll', { direction: 'down', amount: 3 })), null, "preview's scroll is not a computer-use step");
  assert.equal(computerUseAction(item('scroll', { coordinate: [1, 2], scroll_direction: 'down', scroll_amount: 2 })).kind, 'scroll');
  assert.equal(computerUseAction(item('left_click', { coordinate: [1, 2] })).kind, 'click');
  assert.equal(sdkToolName(item('app_screenshot')), 'mcp__computer-use__app_screenshot');
  assert.equal(sdkToolName(item('request_access')), 'mcp__computer-use__request_access');
});

test('app_click: double and triple click go the normal path; app_drag reaches the native sequence', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  for (const args of [{ count: 2 }, { count: 3 }, { button: 'left', count: 1 }]) {
    const parsed = body(await call('app_click', { app: FINDER, element_index: 1, ...args }));
    assert.equal(parsed.ok, true, JSON.stringify(args));
    const sent = native.calls.filter(([method]) => method === 'axClick').at(-1)[1];
    assert.deepEqual([sent.button, sent.count], [args.button ?? 'left', args.count ?? 1], JSON.stringify(args));
  }
  const drag = body(await call('app_drag', { app: FINDER, coordinate: [1, 1], to_coordinate: [5, 5] }));
  assert.equal(drag.reasonCode, 'drag_ineffective');
  assert.equal(drag.mouseUpSent, true);
  assert.equal(native.calls.filter(([method]) => method === 'drag').length, 1);
  // The parameters stay in the schema; their descriptions say what Accessibility does, and nothing about raw input.
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.deepEqual(click.inputSchema.properties.button.enum, ['left', 'right']);
  assert.deepEqual(click.inputSchema.properties.count.enum, [1, 2, 3]);
  for (const text of [click.description, click.inputSchema.properties.button.description, click.inputSchema.properties.count.description]) {
    assert.doesNotMatch(text, /requires_raw_path|raw input/);
  }
  assert.match(click.inputSchema.properties.count.description, /3: triple click — selects the line/);
});

test('app_click: button "right" is checked like a click, then refused (context_menu, official words); nothing reaches the app', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const before = native.calls.length;
  const result = await call('app_click', { app: FINDER, element_index: 0, button: 'right' });
  assert.equal(result.isError, true);
  const parsed = body(result);
  assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode, parsed.errorKind, parsed.blocked], [false, 'unsupported', 'context_menu', 'feature_unavailable', true]);
  assert.equal(parsed.message, 'Opening a context (right-click) menu would bring the app to the front, so it was NOT done. Use app_menu to run the equivalent menu bar command, or click the target directly. To use the context menu itself, call app_release and use the display-scope tools.');
  assert.match(parsed.next_step, /app_menu/);
  assert.match(parsed.next_step, /right_click/);
  const sent = native.calls.slice(before).map(([method]) => method);
  assert.ok(!sent.some((method) => ['axClick', 'rawClick', 'drag', 'hidClick'].includes(method)), `nothing delivered: ${sent}`);
  // The target is checked first: a bad element_index or no screenshot is the usual error, not the refusal.
  assert.equal(body(await call('app_click', { app: FINDER, element_index: 99, button: 'right' })).reasonCode, 'invalid_params');
  const fresh = setup();
  await fresh.call('request_access', { apps: ['Finder'], reason: 'r' });
  assert.equal(fresh.body(await fresh.call('app_click', { app: FINDER, coordinate: [1, 1], button: 'right' })).reasonCode, 'screenshot_required');
  // A locked screen is said as such (official Y()).
  const locked = fakeNative();
  const call0 = locked.call.bind(locked);
  locked.call = async (method, params) => (method === 'probe' ? { screenLocked: true, secureInput: false } : call0(method, params));
  const l = setup({ native: locked });
  await l.call('request_access', { apps: ['Finder'], reason: 'r' });
  await l.call('app_screenshot', { app: FINDER });
  const lockedBody = l.body(await l.call('app_click', { app: FINDER, element_index: 0, button: 'right' }));
  assert.deepEqual([lockedBody.reasonCode, lockedBody.errorKind], ['screen_locked', 'state_conflict']);
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.match(click.description, /context_menu/);
  assert.doesNotMatch(click.description, /AXShowMenu|no_menu_action|Dock item/);
  assert.match(click.inputSchema.properties.button.description, /always refused/);
  for (const text of [click.description, click.inputSchema.properties.button.description, click.inputSchema.properties.count.description]) {
    assert.doesNotMatch(text, /synthe|deliver|\bpost/i);
  }
});

test('zh-CN: the right click\'s refusal, the Dock refusal and their next steps are translated', async () => {
  const { setLocale } = await import('../electron/i18n/index.mjs');
  setLocale('zh-CN');
  try {
    const { call, body } = setup();
    await call('request_access', { apps: ['Finder'], reason: 'r' });
    await call('app_screenshot', { app: FINDER });
    const right = body(await call('app_click', { app: FINDER, element_index: 0, button: 'right' }));
    assert.equal(right.reasonCode, 'context_menu');
    assert.match(right.message, /^打开上下文（右键）菜单会把应用带到前台/);
    assert.match(right.next_step, /^改用 app_menu/);
    const dock = body(await call('app_click', { app: 'com.apple.dock', coordinate: [1, 1] }));
    assert.match(dock.message, /^程序坞/);
    assert.match(dock.next_step, /^不要对程序坞使用 app_\* 工具/);
    const submenu = body(await call('app_menu', { app: FINDER, path: ['File'] }));
    assert.match(submenu.next_step, /^把列出的某一项接到 path 末尾/);
  } finally { setLocale('en-US'); }
});

test('the Dock is not an app_* target (official): every app_* tool answers desktop_shell, granted or not, and points at Finder + display-scope', async () => {
  const { call, body, native, service } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  service.grantsFor('thread-a').grant([{ bundleId: 'com.apple.dock', displayName: 'Dock' }]);
  const before = native.calls.length;
  for (const [name, args] of [['app_list_windows', {}], ['app_screenshot', {}], ['app_click', { coordinate: [10, 10] }], ['app_menu', { list: true }],
    ['app_key', { combo: 'return' }], ['app_scroll', { dy: 1 }], ['app_drag', { coordinate: [1, 1], to_coordinate: [2, 2] }], ['app_focus', {}],
    ['app_batch', { actions: [{ action: 'screenshot' }] }]]) {
    for (const app of ['com.apple.dock', 'com.apple.Spotlight']) {
      const result = await call(name, { app, ...args });
      assert.equal(result.isError, true, `${name} ${app}`);
      const parsed = body(result);
      assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode, parsed.errorKind], [false, 'unsupported', 'desktop_shell', 'app_not_granted'], `${name} ${app}`);
      assert.match(parsed.message, /request_access with "Finder"/);
      assert.match(parsed.next_step, /display-scope/);
    }
  }
  assert.equal(native.calls.length, before, 'nothing reached the native module');
  // The service refuses the same way (a caller that skips the tool layer).
  await assert.rejects(() => service.appClick('thread-a', { bundleId: 'com.apple.dock', coordinate: [1, 1] }), (error) => error.code === 'desktop_shell');
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

test('app_click: a double click with nothing to press or select answers canvas (official) with a next step', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return { outcome: 'unsupported', reasonCode: 'canvas', role: 'AXGroup' }; }
    if (method === 'rawClick') { native.calls.push([method, params]); return { outcome: 'ok' }; }
    return call0(method, params);
  };
  const { call, body } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const parsed = body(await call('app_click', { app: FINDER, coordinate: [20, 20], count: 2 }));
  assert.deepEqual([parsed.ok, parsed.reasonCode, parsed.blocked], [false, 'canvas', true]);
  assert.match(parsed.next_step, /Accessibility/);
  assert.ok(!native.calls.some(([method]) => method === 'rawClick'));
});

test('app_click: no addressing is an error, never a replay of the previous click', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  assert.equal(body(await call('app_click', { app: FINDER, coordinate: [20, 20] })).ok, true);
  const clicks = () => native.calls.filter(([method]) => method === 'axClick').length;
  const empty = await call('app_click', { app: FINDER });
  assert.equal(empty.isError, true);
  assert.equal(body(empty).reasonCode, 'invalid_params');
  assert.match(body(empty).message, /one of coordinate, element_index or target/);
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
  assert.equal(body(await call('app_type', { app: FINDER, text: 'notes', target: 'focused' })).reasonCode, 'screenshot_required');
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
  assert.equal(front.body(await front.call('app_focus', { app: FINDER })).reasonCode, 'app_not_granted');
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

test('save_panel_restricted on an app_* tool: the save-panel next step, not the tool\'s general one', async () => {
  const SAVE_STEP = "Do what the message allows (a save sheet's Cancel always works), or ask the user to do it; don't try to reach the file another way.";
  const refusal = { outcome: 'unsupported', reasonCode: 'save_panel_restricted', errorKind: 'save_panel_restricted', message: 'Typing ".zshrc" into a save sheet is not allowed.' };
  const judged = [];
  const savePanel = { available: true, app: async (request) => { judged.push(request.action.kind); return refusal; } };
  const { call, body, native } = setup({ savePanel });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const before = native.calls.length;
  const answers = {
    app_type: await call('app_type', { app: FINDER, text: '.zshrc', element_index: 1 }),
    app_click: await call('app_click', { app: FINDER, element_index: 0 }),
    app_key: await call('app_key', { app: FINDER, combo: 'return', element_index: 1 }),
    app_menu: await call('app_menu', { app: FINDER, path: ['File', 'New Finder Window'], window_id: 7 }),
    app_focus: await call('app_focus', { app: FINDER, window_id: 7 }),
  };
  for (const [name, result] of Object.entries(answers)) {
    const answer = body(result);
    assert.equal(result.isError, true, name);
    assert.deepEqual([answer.ok, answer.reasonCode], [false, 'save_panel_restricted'], name);
    assert.equal(answer.next_step, SAVE_STEP, `${name} answers the save-panel next step`);
  }
  assert.deepEqual(judged, ['type', 'click', 'key', 'menu', 'focus']);
  assert.ok(native.calls.slice(before).every(([method]) => !['axClick', 'axType', 'axKey', 'rawClick', 'rawKey', 'menu', 'focus', 'drag'].includes(method)), 'nothing reached the app');
});

test('app_menu: list the bar and a menu, a path ending at a menu opens nothing, run a command, disabled and unknown items', async () => {
  const { call, body, axHelper } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const bar = body(await call('app_menu', { app: FINDER, list: true }));
  assert.deepEqual(bar.items.map((item) => item.title), ['Finder', 'File']);
  assert.deepEqual(axHelper.calls.at(-1), ['menuList', { bundleId: FINDER, path: [] }]);
  assert.equal(body(await call('app_menu', { app: FINDER, list: 'file' })).items.length, 2);
  assert.deepEqual(axHelper.calls.at(-1), ['menuList', { bundleId: FINDER, path: ['file'] }]);
  // Official Nn(): a path that stops at a menu title presses nothing (bad_args) and lists the entries to extend it with.
  const atMenu = await call('app_menu', { app: FINDER, path: ['File'] });
  assert.equal(atMenu.isError, true);
  const submenu = body(atMenu);
  assert.deepEqual([submenu.ok, submenu.reasonCode, submenu.errorKind, submenu.opened], [false, 'path_ends_at_submenu', 'bad_args', undefined]);
  assert.equal(submenu.message, 'Menu path ["File"] ends at a submenu, not a pressable item. Nothing was pressed. Extend `path` with one of its entries: ["New Finder Window","New Folder"].');
  assert.deepEqual(submenu.items.map((item) => [item.title, item.enabled]), [['New Finder Window', true], ['New Folder', false]]);
  assert.match(submenu.next_step, /Add one of the listed items/);
  assert.equal(body(await call('app_menu', { app: FINDER, close: true })).reasonCode, 'invalid_params', 'close is gone');
  assert.ok(!axHelper.calls.some(([method]) => method === 'menuClose'));
  const ran = body(await call('app_menu', { app: FINDER, path: ['File', 'New Finder Window…'] }));
  assert.deepEqual([ran.ok, ran.opened], [true, undefined]);
  const disabled = await call('app_menu', { app: FINDER, path: ['File', 'New Folder'] });
  assert.equal(disabled.isError, true);
  assert.equal(body(disabled).reasonCode, 'menu_item_disabled');
  assert.match(body(disabled).next_step, /disabled/);
  // Found but not pressable (no AXPress / AXPick, or the press errored): the official menu_press_failed, never no_press_action.
  const unpressable = await call('app_menu', { app: FINDER, path: ['File', 'Locked Item'] });
  assert.equal(unpressable.isError, true);
  assert.deepEqual([body(unpressable).ok, body(unpressable).reasonCode, body(unpressable).axError], [false, 'menu_press_failed', -25206]);
  assert.match(body(unpressable).next_step, /refused the press/);
  const missing = body(await call('app_menu', { app: FINDER, path: ['Fiel'] }));
  assert.equal(missing.reasonCode, 'menu_item_not_found');
  assert.equal(missing.closestMatch, 'File');
  assert.deepEqual(missing.available, ['Finder', 'File']);
  assert.match(missing.next_step, /closestMatch/);
  for (const args of [{}, { path: ['File'], list: true }, { list: true, close: true }]) {
    assert.equal(body(await call('app_menu', { app: FINDER, ...args })).reasonCode, 'invalid_params', JSON.stringify(args));
  }
  const menu = cu.tools.find((tool) => tool.name === 'app_menu');
  assert.deepEqual(Object.keys(menu.inputSchema.properties).sort(), ['action_summary', 'app', 'list', 'path']);
  assert.match(menu.description, /no menu is opened/);
  assert.match(menu.description, /path_ends_at_submenu/);
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
  assert.equal(body(await call('app_zoom', { app: FINDER, region: [0, 0, 100, 100] })).reasonCode, 'screenshot_required');
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
    assert.equal(body(await call('app_zoom', { app: FINDER, region })).reasonCode, 'invalid_params', JSON.stringify(region));
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
  assert.equal(body(await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 0 }] })).results[0].reasonCode, 'screenshot_required');
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
  for (const [stopper, code] of [[{ action: 'key', combo: 'cmd+c' }, 'state_conflict'], [{ action: 'click' }, 'invalid_params'], [{ action: 'scroll', dy: 3, coordinate: [20, 20] }, 'canvas'], [{ action: 'drag', coordinate: [1, 1], to_coordinate: [5, 5] }, 'drag_ineffective']]) {
    const start = clicks();
    const result = await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 0 }, stopper, { action: 'click', element_index: 2 }] });
    assert.equal(result.isError, true);
    const parsed = body(result);
    assert.deepEqual([parsed.ok, parsed.completed, parsed.stoppedAt], [false, 1, 1], JSON.stringify(stopper));
    assert.equal(parsed.results.length, 2);
    assert.equal(parsed.results[1].reasonCode, code, JSON.stringify(stopper));
    assert.match(parsed.next_step, /actions\[1\]/);
    assert.equal(clicks() - start, 1, 'the click after the stop never ran');
  }
  assert.equal(body(await call('app_batch', { app: 'com.apple.TextEdit', actions: [{ action: 'click', element_index: 0 }] })).reasonCode, 'app_not_granted');
});

test('ax-helper.cjs: the old helper calls go to the native module (focusWindow, menu {mode}, listApps), results and details unchanged', async () => {
  const runs = [];
  const native = { async call(method, params) {
    runs.push([method, params]);
    if (method === 'axProbe') return { axTrusted: true };
    if (method === 'menu' && params.mode === 'press' && params.path[0] === 'Fiel') {
      throw Object.assign(new Error('nope'), { code: 'menu_item_not_found', details: { closestMatch: 'File' } });
    }
    return { method, ...params };
  } };
  const helper = createAxHelper({ native });
  assert.deepEqual(await helper.call('probe'), { axTrusted: true });
  await helper.call('focus', { bundleId: FINDER });
  await helper.call('focus', { bundleId: FINDER, windowId: 9 });
  await helper.call('menu', { bundleId: FINDER, path: ['File', 'New Folder'] });
  await helper.call('menuList', { bundleId: FINDER, path: [] });
  await helper.call('apps', { folders: ['/Applications'] });
  assert.deepEqual(runs, [
    ['axProbe', {}],
    ['focusWindow', { bundleId: FINDER }],
    ['focusWindow', { bundleId: FINDER, windowId: 9 }],
    ['menu', { bundleId: FINDER, mode: 'press', path: ['File', 'New Folder'] }],
    ['menu', { bundleId: FINDER, mode: 'list', path: [] }],
    ['listApps', { folders: ['/Applications'] }],
  ]);
  await assert.rejects(() => helper.call('menu', { bundleId: FINDER, path: ['Fiel'] }), (error) => error.code === 'menu_item_not_found' && error.details.closestMatch === 'File');
  await assert.rejects(() => helper.call('bad'), (error) => error.code === 'unknown_method');
  // No menu is ever closed because none is ever opened: the close route is gone.
  await assert.rejects(() => helper.call('menuClose', { bundleId: FINDER }), (error) => error.code === 'unknown_method');
  // No module: the native loader's own code, like every other computer-use call.
  const { createNative } = require('../electron/computer-use/native.cjs');
  await assert.rejects(() => createAxHelper({ native: createNative({ platform: 'linux' }) }).call('probe'), (error) => error.code === 'native_unavailable');
  // native.cjs keeps an error envelope's details on the thrown error.
  const loaded = createNative({ platform: 'darwin', load: () => ({ call: async () => JSON.stringify({ ok: false, error: { code: 'menu_item_not_found', message: 'm', details: { available: ['File'] } } }) }) });
  await assert.rejects(() => loaded.call('menu', {}), (error) => error.code === 'menu_item_not_found' && error.details.available[0] === 'File');
});

test('the names without the capability yet: a precise reasonCode, a next step, and nothing reaches the native side or the helper', async () => {
  const { call, body, native, axHelper } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const before = [native.calls.length, axHelper.calls.length];
  const args = { app_key: { app: FINDER, combo: 'return' }, app_scroll: { app: FINDER, dy: 3 }, app_drag: { app: FINDER, coordinate: [1, 1], to_coordinate: [9, 9] },
    write_clipboard: { text: 'x' }, request_teach_access: { apps: ['Finder'], reason: 'r' },
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
  // Without the flags the clipboard tools refuse first, in the official words, and touch nothing native.
  for (const [name, flag, args] of [['read_clipboard', 'clipboardRead', {}], ['write_clipboard', 'clipboardWrite', { text: 'x' }]]) {
    const refused = body(await call(name, args));
    assert.deepEqual([refused.ok, refused.reasonCode], [false, 'grant_flag_required'], name);
    assert.equal(refused.message, `Clipboard ${name.slice(0, name.indexOf('_')) === 'read' ? 'read' : 'write'} is not granted. Request \`${flag}\` via request_access.`);
    assert.match(refused.next_step, new RegExp(`request_access with ${flag}: true`), name);
  }
  assert.deepEqual([native.calls.length, axHelper.calls.length], before);
});

test('app_key (official §1.6.1): combo checks before native, AX first, the raw rung for the rest, official wording, batch key steps', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const keyCalls = () => native.calls.filter(([method]) => method === 'axKey' || method === 'rawKey');
  // Refused before anything native: not one key, a system combo without the flag, a clipboard combo.
  for (const [combo, reasonCode, pattern] of [['cmd+shift', 'bad_args', /exactly one key.*separate app_key calls/], ['a+b', 'bad_args', /exactly one key/],
    ['Command+Q', 'grant_flag_required', /"cmd\+q" is a system key combo.*systemKeyCombos/], ['ctrl+up', 'grant_flag_required', /system key combo/],
    ['cmd+v', 'state_conflict', /"cmd\+v" would touch the system clipboard\. Use app_type for text entry\./], ['meta+x', 'state_conflict', /clipboard/]]) {
    const result = await call('app_key', { app: FINDER, combo });
    assert.equal(result.isError, true, combo);
    const parsed = body(result);
    assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode], [false, 'unsupported', reasonCode], combo);
    assert.match(parsed.message, pattern, combo);
    assert.equal(typeof parsed.next_step, 'string', combo);
  }
  assert.equal(keyCalls().length, 0);
  // No point yet: the official bad_args (no default without a prior action or a screenshot).
  assert.match(body(await call('app_key', { app: FINDER, combo: 'tab' })).message, /no prior action on this window to default to/);
  await call('app_screenshot', { app: FINDER });
  assert.match(body(await call('app_key', { app: FINDER, combo: 'tab' })).message, /no prior action on this window to default to/);
  // return at the search field: AXConfirm, worded as the official result line.
  const confirmed = body(await call('app_key', { app: FINDER, combo: 'Return', coordinate: [900, 30] }));
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.path, 'ax');
  assert.equal(confirmed.message, "ok (AXConfirm on AXTextField 'Search' via AXWindow>AXToolbar>AXTextField)");
  assert.deepEqual(native.calls.filter(([m]) => m === 'axKey').at(-1)[1], { bundleId: FINDER, windowId: 7, combo: 'return', winLocalPt: { x: 450, y: 15 } });
  assert.equal(native.calls.filter(([m]) => m === 'rawKey').length, 0, 'no keystroke after an AX action');
  // tab without a coordinate: the point of the last action; no AX action → the raw rung, unverified.
  const tabbed = body(await call('app_key', { app: FINDER, combo: 'shift+tab' }));
  assert.equal(tabbed.ok, true);
  assert.equal(tabbed.path, 'cgevent');
  assert.match(tabbed.message, /^ok \(delivered via raw input on AXButton 'Back' via AXWindow>AXButton; there is no accessibility action for this key so this is unverified — confirm the effect with app_screenshot\)$/);
  const raw = native.calls.filter(([m]) => m === 'rawKey').at(-1)[1];
  assert.deepEqual(raw, { bundleId: FINDER, windowId: 7, combo: 'shift+tab', winLocalPt: { x: 450, y: 15 }, grantedBundleIds: [FINDER] });
  // cmd+a as a keystroke carries the official caveat.
  assert.match(body(await call('app_key', { app: FINDER, combo: 'cmd+a', coordinate: [20, 20] })).message, /this sent cmd\+a as a keystroke\. If the app ignored it/);
  // A key the background set doesn't carry: key_not_mapped with the official list.
  const unmapped = body(await call('app_key', { app: FINDER, combo: 'f', coordinate: [20, 20] }));
  assert.equal(unmapped.reasonCode, 'key_not_mapped');
  assert.match(unmapped.message, /^This element \(AXButton 'Back' at \(20, 20\) via AXWindow>AXButton\) cannot be sent that key while Finder is in the background — neither accessibility nor a background keystroke could deliver it\. Background keystrokes cover return, escape, backspace, tab/);
  // app_batch: a key step runs app_key, and without a point it uses the click before it.
  const batched = body(await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 2 }, { action: 'key', combo: 'down' }] }));
  assert.equal(batched.ok, true, JSON.stringify(batched));
  assert.match(batched.results[1].message, /^ok \(delivered via raw input/);
  assert.deepEqual(native.calls.filter(([m]) => m === 'rawKey').at(-1)[1].winLocalPt, { x: 25, y: 10 }, 'the centre of element 2 (Forward)');
  // [type at a coordinate, key return]: the key lands where the type step typed, not at the earlier click.
  const typedThenReturn = body(await call('app_batch', { app: FINDER, actions: [{ action: 'click', element_index: 2 },
    { action: 'type', text: 'notes', coordinate: [600, 620] }, { action: 'key', combo: 'return' }] }));
  assert.equal(typedThenReturn.ok, true, JSON.stringify(typedThenReturn));
  assert.deepEqual(keyCalls().at(-1)[1].winLocalPt, { x: 300, y: 310 }, 'the type step\'s point');
});

test('app_scroll (official §1.6.2): dx refused, AX scroll bar set and read back, official wording, ineffective does not stop a batch', async () => {
  const { call, body, native } = setup();
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const scrolls = () => native.calls.filter(([method]) => method === 'axScroll');
  // A horizontal amount: the official feature_unavailable sentence, nothing native.
  const sideways = await call('app_scroll', { app: FINDER, dy: 0, dx: 3 });
  assert.equal(sideways.isError, true);
  const side = body(sideways);
  assert.deepEqual([side.ok, side.outcome, side.reasonCode, side.errorKind], [false, 'unsupported', 'horizontal_scroll', 'feature_unavailable']);
  assert.equal(side.message, "app_scroll only supports vertical (dy). Horizontal scroll is not implemented for the background AX path — use display-scope `scroll`, or scroll vertically and rely on the app's auto-scroll.");
  assert.equal(typeof side.next_step, 'string');
  // No point and no screenshot: the official bad_args.
  assert.match(body(await call('app_scroll', { app: FINDER, dy: 3 })).message, /no prior action on this window to default to/);
  assert.equal(scrolls().length, 0);
  await call('app_screenshot', { app: FINDER });
  // dy 3 at a point in the list: one native axScroll with the window-local point; the official ok line.
  const down = await call('app_scroll', { app: FINDER, dy: 3, coordinate: [600, 400] });
  assert.equal(down.isError, undefined);
  const ok = body(down);
  assert.deepEqual([ok.ok, ok.outcome, ok.path, ok.verified, ok.before, ok.after, ok.dy], [true, 'ok', 'ax', true, 0.2, 0.35, 3]);
  assert.equal(ok.message, 'ok (set scrollbar AXValue=0.35 on AXScrollArea via AXWindow>AXSplitGroup>AXScrollArea)');
  assert.deepEqual(scrolls().at(-1)[1], { bundleId: FINDER, windowId: 7, dy: 3, winLocalPt: { x: 300, y: 200 } });
  // Without a coordinate: the point of the last action in this window.
  assert.equal(body(await call('app_scroll', { app: FINDER, dy: -2 })).ok, true);
  assert.deepEqual(scrolls().at(-1)[1].winLocalPt, { x: 300, y: 200 });
  // At the bottom already: ineffective, not an error (official), atLimit says why.
  const end = await call('app_scroll', { app: FINDER, dy: 25 });
  assert.equal(end.isError, undefined);
  const atEnd = body(end);
  assert.deepEqual([atEnd.ok, atEnd.outcome, atEnd.reasonCode, atEnd.atLimit], [false, 'ineffective', 'scrollbar_unchanged', 'bottom']);
  assert.match(atEnd.message, /^ineffective: set scrollbar AXValue=1\.00 on AXScrollArea via .* already at the bottom/);
  // Written but read back unchanged: the official ineffective sentence.
  const still = await call('app_scroll', { app: FINDER, dy: 4 });
  assert.equal(still.isError, undefined);
  assert.equal(body(still).message, 'ineffective: set scrollbar AXValue=0.40 on AXScrollArea via AXWindow>AXSplitGroup>AXScrollArea returned success but the app has not visibly responded yet. Take a fresh app_screenshot to confirm before assuming it failed.');
  // The write errored: an error with the AXError, and the point is not kept.
  const failed = await call('app_scroll', { app: FINDER, dy: -7, coordinate: [700, 500] });
  assert.equal(failed.isError, true);
  assert.equal(body(failed).message, 'set scrollbar AXValue on AXScrollArea via AXWindow>AXSplitGroup>AXScrollArea failed (AXError: cannotComplete). Take a fresh app_screenshot — the element may have moved or been removed since the last capture.');
  await call('app_scroll', { app: FINDER, dy: 1 });
  assert.deepEqual(scrolls().at(-1)[1].winLocalPt, { x: 300, y: 200 }, 'the errored scroll did not move the remembered point');
  // No vertical scroll bar up to the window: the official refusal line with this build's reason text.
  const flat = await call('app_scroll', { app: FINDER, dy: 2, coordinate: [20, 20] });
  assert.equal(flat.isError, true);
  const canvas = body(flat);
  assert.equal(canvas.reasonCode, 'canvas');
  assert.match(canvas.message, /^This element \(AXButton 'Back' at \(20, 20\) via AXWindow>AXButton\) cannot be scrolled while Finder is in the background — nothing at that point/);
  assert.equal(typeof canvas.next_step, 'string');
  // app_batch: a scroll step runs app_scroll; ineffective (at the end) is reported and the batch goes on.
  const clicksBefore = native.calls.filter(([method]) => method === 'axClick').length;
  const batched = await call('app_batch', { app: FINDER, actions: [{ action: 'scroll', dy: 25, coordinate: [600, 400] }, { action: 'click', element_index: 1 }, { action: 'scroll', dy: 2 }] });
  assert.equal(batched.isError, undefined, batched.content[0].text);
  const parsed = body(batched);
  assert.deepEqual([parsed.ok, parsed.completed], [true, 3], JSON.stringify(parsed));
  assert.deepEqual(parsed.results.map((r) => r.outcome), ['ineffective', 'ok', 'ok']);
  assert.equal(native.calls.filter(([method]) => method === 'axClick').length - clicksBefore, 1);
  assert.deepEqual(scrolls().at(-1)[1].winLocalPt, { x: 230, y: 10.5 }, 'the scroll without a point uses the click before it (element 1)');
});

test('list_granted_applications: the session\'s apps, tiers, flags and the coordinate mode; nothing asked', async () => {
  const { call, body, asked } = setup();
  assert.deepEqual(body(await call('list_granted_applications', {})), { apps: [], flags: { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false },
    preferredMode: 'background', fullControlApproved: false, coordinateMode: 'app_window' });
  await call('request_access', { apps: ['Finder'], reason: 'r', clipboardRead: true });
  assert.deepEqual(body(await call('list_granted_applications', {})), { apps: [{ bundleId: FINDER, name: 'Finder', tier: 'full' }],
    flags: { clipboardRead: true, clipboardWrite: false, systemKeyCombos: false }, preferredMode: 'background', fullControlApproved: false, coordinateMode: 'app_window' });
  assert.equal(asked.length, 1, 'only request_access showed a card');
  assert.deepEqual(body(await call('list_granted_applications', {}, 'thread-b')).apps, [], 'per session');
});

test('request_full_control / release_full_control (official §1.4): the take-over card, the approval only (the lock comes with the next screen-wide action), and release', async () => {
  const holders = [];
  const fullControl = createFullControl({ onLockChange: (h) => holders.push(h) });
  const { call, body, takeovers, service } = setup({ fullControl });
  // Background preferred: the card is shown; accept → approved (official Ln(): approveTakeover only), coordinateMode flips;
  // nothing holds the screen yet — no glow / strip / Esc until a screen-wide action takes the lock.
  let result = body(await call('request_full_control', {}));
  assert.equal(takeovers.length, 1);
  assert.deepEqual(takeovers[0], { becausePreferredBackground: true });
  assert.deepEqual([result.ok, result.approved, result.lockHeld], [true, true, undefined]);
  assert.equal(fullControl.isApproved('thread-a'), true);
  assert.equal(fullControl.holder(), null, 'approval does not take the lock');
  assert.deepEqual(holders, []);
  // The next screen-wide action takes it (service.acquireDisplayLock, as every display-scope tool does first).
  assert.equal(service.acquireDisplayLock('thread-a'), null);
  assert.equal(fullControl.holder(), 'thread-a');
  assert.deepEqual(holders, ['thread-a']);
  assert.equal(body(await call('list_granted_applications', {})).coordinateMode, 'display');
  // A second call: already approved, no second card.
  result = body(await call('request_full_control', {}));
  assert.deepEqual([result.ok, result.alreadyApproved, takeovers.length], [true, true, 1]);
  // Release: the lock drops (holder null) and the approval is revoked (coordinateMode back to app_window).
  result = body(await call('release_full_control', {}));
  assert.deepEqual([result.ok, result.wasHolding], [true, true]);
  assert.equal(fullControl.holder(), null);
  assert.equal(fullControl.isApproved('thread-a'), false);
  assert.equal(holders.at(-1), null);
  assert.equal(body(await call('list_granted_applications', {})).coordinateMode, 'app_window');
});

test('request_full_control across two sessions: the display lock held elsewhere is cu_lock_held (no card, no approval); app_* refuse too, app_release still works', async () => {
  const fullControl = createFullControl();
  const { call, body, takeovers, service } = setup({ fullControl });
  await call('request_access', { apps: ['Finder'], reason: 'r' }, 'thread-a');
  // b takes the screen first (approved, then its first screen-wide action takes the lock).
  assert.equal(body(await call('request_full_control', {}, 'thread-b')).ok, true);
  assert.equal(fullControl.holder(), null);
  service.grantsFor('thread-b').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  assert.equal(service.acquireDisplayLock('thread-b'), null);
  assert.equal(fullControl.holder(), 'thread-b');
  // a asks: refused before any card, nothing recorded, b keeps the lock.
  const refused = await call('request_full_control', {}, 'thread-a');
  assert.equal(refused.isError, true);
  const parsed = body(refused);
  assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode], [false, 'unsupported', 'cu_lock_held']);
  assert.match(parsed.message, /Another Claude session is using the computer/);
  assert.ok(parsed.next_step);
  assert.equal(takeovers.length, 1, 'only b saw a card');
  assert.equal(fullControl.isApproved('thread-a'), false);
  assert.equal(fullControl.holder(), 'thread-b');
  // a's app_* tools are refused with cu_lock_held while b holds the screen (official §1.4.3) …
  const shot = await call('app_screenshot', { app: FINDER }, 'thread-a');
  assert.equal(shot.isError, true);
  assert.equal(body(shot).reasonCode, 'cu_lock_held');
  // … except app_release.
  assert.equal((await call('app_release', {}, 'thread-a')).isError, undefined);
  // An already-approved session whose lock was taken by another meanwhile: still cu_lock_held, not ok.
  service.fullControl.approve('thread-a');
  const again = body(await call('request_full_control', {}, 'thread-a'));
  assert.deepEqual([again.ok, again.reasonCode], [false, 'cu_lock_held']);
  // b releases: a's tools work again and a can take the screen without a card (already approved).
  await call('release_full_control', {}, 'thread-b');
  assert.equal((await call('app_screenshot', { app: FINDER }, 'thread-a')).isError, undefined);
  await call('app_release', {}, 'thread-a');
  const ok = body(await call('request_full_control', {}, 'thread-a'));
  assert.deepEqual([ok.ok, ok.alreadyApproved, takeovers.length], [true, true, 1]);
  assert.equal(fullControl.holder(), null);
  assert.equal(service.acquireDisplayLock('thread-a'), null);
  assert.equal(fullControl.holder(), 'thread-a');
});

test('request_full_control while this session holds app locks: approved, but the screen is not taken until app_release', async () => {
  const fullControl = createFullControl();
  const { call, body, service } = setup({ fullControl });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const result = body(await call('request_full_control', {}));
  assert.deepEqual([result.ok, result.appLockHeld], [true, [FINDER]]);
  assert.match(result.message, /app_release first/);
  assert.equal(fullControl.isApproved('thread-a'), true);
  assert.equal(fullControl.holder(), null);
  assert.equal(service.acquireDisplayLock('thread-a')?.reasonCode, 'state_conflict', 'the screen-wide tools wait for app_release');
  await call('app_release', {});
  const again = body(await call('request_full_control', {}));
  assert.deepEqual([again.ok, again.alreadyApproved, again.appLockHeld], [true, true, undefined]);
  assert.match(again.message, /now go ahead/);
  assert.equal(service.acquireDisplayLock('thread-a'), null);
  assert.equal(fullControl.holder(), 'thread-a');
});

test('request_full_control declined (Deny), no card to show (takeover_unavailable, the one refusal shape) and preferred full_control (no card)', async () => {
  const declined = setup({ answer: 'decline' });
  const result = await declined.call('request_full_control', {});
  assert.equal(result.isError, true);
  const parsed = declined.body(result);
  assert.deepEqual([parsed.ok, parsed.outcome, parsed.reasonCode], [false, 'unsupported', 'takeover_declined']);
  assert.equal(declined.service.fullControl.isApproved('thread-a'), false);

  const fullControl = createFullControl();
  fullControl.setPreferredMode('full_control');
  const pref = setup({ fullControl });
  const ok = pref.body(await pref.call('request_full_control', {}));
  assert.deepEqual([ok.ok, ok.mode, pref.takeovers.length], [true, 'full_control', 0], 'no card when the preference is full_control');
  assert.equal(fullControl.holder(), null, 'the lock waits for a screen-wide action');

  const none = setup({ answer: 'unavailable' });
  const unavailable = await none.call('request_full_control', {});
  assert.equal(unavailable.isError, true);
  const refused = none.body(unavailable);
  assert.deepEqual([refused.ok, refused.outcome, refused.reasonCode, refused.error], [false, 'unsupported', 'takeover_unavailable', undefined]);
  assert.match(refused.next_step, /app_\* tools/);
  assert.equal(none.service.fullControl.isApproved('thread-a'), false);
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
  assert.equal(after.reasonCode, 'app_not_granted', 'the agent has to ask again');
  assert.equal((await service.call('computer-use:revoke', {})).error.code, 'invalid_params');
});

test('app_click on a Finder row: the official AX row step comes back as ok with its axOp; a double click that could only select says how to open', async () => {
  const native = fakeNative();
  const call0 = native.call.bind(native);
  const answers = {
    1: { outcome: 'ok', reasonCode: null, axOp: 'set AXSelected=true (row of the text)', role: 'AXTextField', selectedRole: 'AXRow', selected: true },
    2: { outcome: 'ok', reasonCode: null, axOp: 'set AXSelected=true (row of the text)', role: 'AXTextField', selectedRole: 'AXRow', selected: true, openUnavailable: true },
    3: { outcome: 'ok', reasonCode: null, axOp: 'AXOpen', role: 'AXRow', selectedRole: 'AXRow' },
  };
  let next = 1;
  native.call = async (method, params) => {
    if (method === 'axClick') { native.calls.push([method, params]); return answers[next]; }
    if (method === 'rawClick') throw new Error('never raw');
    return call0(method, params);
  };
  const { call, body } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  await call('app_screenshot', { app: FINDER });
  const single = body(await call('app_click', { app: FINDER, coordinate: [300, 200] }));
  assert.deepEqual([single.ok, single.axOp, single.selected, single.note], [true, 'set AXSelected=true (row of the text)', true, undefined]);
  next = 2;
  const double = body(await call('app_click', { app: FINDER, coordinate: [300, 200], count: 2 }));
  assert.equal(double.ok, true);
  assert.match(double.note, /only selected.*app_menu/);
  next = 3;
  const opened = body(await call('app_click', { app: FINDER, coordinate: [300, 200], count: 2 }));
  assert.deepEqual([opened.ok, opened.axOp, opened.note], [true, 'AXOpen', undefined]);
  assert.deepEqual(native.calls.filter(([m]) => m === 'axClick').map(([, p]) => p.count), [1, 2, 2]);
  const click = cu.tools.find((tool) => tool.name === 'app_click');
  assert.match(click.description, /AXSelected/);
  assert.match(click.description, /AXOpen/);
  assert.doesNotMatch(click.description, /com\.apple\.dock|Dock item/);
  assert.match(click.description, /desktop_shell/);
});

test('app_click: select_refused / popup_menu / canvas are official refusals with a next step', async () => {
  for (const reasonCode of ['select_refused', 'popup_menu', 'canvas', 'selection_not_confirmed']) {
    const native = fakeNative();
    const call0 = native.call.bind(native);
    native.call = async (method, params) => (method === 'axClick'
      ? { outcome: reasonCode === 'selection_not_confirmed' ? 'ineffective' : 'unsupported', reasonCode, role: 'AXRow' }
      : call0(method, params));
    const { call, body } = setup({ native });
    await call('request_access', { apps: ['Finder'], reason: 'r' });
    await call('app_screenshot', { app: FINDER });
    const result = await call('app_click', { app: FINDER, coordinate: [300, 200] });
    assert.equal(result.isError, true, reasonCode);
    const parsed = body(result);
    assert.deepEqual([parsed.ok, parsed.reasonCode, parsed.blocked], [false, reasonCode, true]);
    assert.equal(typeof parsed.next_step, 'string');
  }
});

/** A native module for app_bring_to_current_space: listWindows answers from `lists` in turn (the last one repeats). */
function bringNative({ lists, shown = 'shown_behind_the_front_window', dry = { moved: false, alreadyHere: false }, move = { moved: true, alreadyHere: false },
  owner = { pid: 501, bundleId: FINDER }, locked = false } = {}) {
  const base = fakeNative();
  const queue = [...lists];
  const calls = base.calls;
  return {
    calls,
    async call(method, params = {}) {
      if (method === 'probe') { calls.push([method, params]); return { screenLocked: typeof locked === 'function' ? locked() : locked, secureInput: false }; }
      if (method === 'listWindows') { calls.push([method, params]); return { windows: queue.length > 1 ? queue.shift() : queue[0] }; }
      if (method === 'showWindowBehindTheFrontWindow') { calls.push([method, params]); return { code: shown }; }
      if (method === 'bringWindowToActiveSpace') { calls.push([method, params]); return params.dryRun ? dry : move; }
      if (method === 'windowOwner') { calls.push([method, params]); return { owner }; }
      return base.call(method, params);
    },
  };
}
const win = (extra = {}) => ({ window_id: 7, title: 'Recents', is_main: true, is_minimized: false, is_hidden: false, is_off_space: false,
  bounds: { x: 0, y: 0, width: 800, height: 500 }, is_auxiliary: false, ...extra });

test('app_bring_to_current_space (official §1.6.3): lock, arguments, ownership, show behind the front window, the Space move, official wording', async () => {
  const run = async (options, args = { app: FINDER, window_id: 7 }) => {
    const native = bringNative(options);
    const { call, body } = setup({ native });
    await call('request_access', { apps: ['Finder'], reason: 'r' });
    const result = await call('app_bring_to_current_space', args);
    return { result, parsed: body(result), methods: native.calls.map(([method]) => method), native };
  };
  const acting = (methods) => methods.filter((m) => m === 'showWindowBehindTheFrontWindow' || m === 'bringWindowToActiveSpace');

  // Locked: state_conflict in the official words, nothing shown or moved.
  let r = await run({ lists: [[win({ is_minimized: true })]], locked: true });
  assert.equal(r.result.isError, true);
  assert.deepEqual([r.parsed.ok, r.parsed.outcome, r.parsed.reasonCode, r.parsed.errorKind], [false, 'unsupported', 'screen_locked', 'state_conflict']);
  assert.match(r.parsed.message, /^The screen is locked\. app_screenshot continues to work in background mode, but moving a window between Spaces needs the screen unlocked\./);
  assert.equal(typeof r.parsed.next_step, 'string');
  assert.deepEqual(acting(r.methods), []);

  // A window of another app (or gone): app_not_granted in the official words.
  r = await run({ lists: [[win()]] }, { app: FINDER, window_id: 99 });
  assert.deepEqual([r.parsed.reasonCode, r.parsed.errorKind], ['window_not_in_app', 'app_not_granted']);
  assert.equal(r.parsed.message, "Window 99 doesn't belong to Finder (or no longer exists). Take a fresh app_list_windows and pass one of that app's window ids.");
  assert.deepEqual(acting(r.methods), []);

  // Minimized: shown behind the user's window, read back, never moved between Spaces.
  r = await run({ lists: [[win({ is_minimized: true })], [win()]] });
  assert.equal(r.result.isError, undefined);
  assert.deepEqual([r.parsed.ok, r.parsed.how, r.parsed.windowId], [true, 'shown_behind_the_front_window', 7]);
  assert.equal(r.parsed.message, 'Window 7 of Finder is back on screen, behind the window the user is working in (the app did not take focus). Take a fresh app_screenshot next: the one you have may be out of date.');
  assert.deepEqual(r.native.calls.find(([m]) => m === 'showWindowBehindTheFrontWindow')[1], { bundleId: FINDER, windowId: 7 });
  assert.deepEqual(acting(r.methods), ['showWindowBehindTheFrontWindow']);

  // Hidden, and the app came to the front with it: ok, but the user has to be told.
  r = await run({ lists: [[win({ is_hidden: true })], [win()]], shown: 'shown_and_now_in_front' });
  assert.deepEqual([r.parsed.ok, r.parsed.how, r.parsed.tellUser], [true, 'shown_and_now_in_front', true]);
  assert.match(r.parsed.message, /is back on screen, and the app came to the FRONT with it: .*Tell the user, and do not take it for their consent/);

  // Back, but on another Space: call again.
  r = await run({ lists: [[win({ is_minimized: true })], [win({ is_off_space: true })]] });
  assert.equal(r.parsed.ok, true);
  assert.equal(r.parsed.message, 'Window 7 of Finder is no longer put away, but it is on another Space. Call app_bring_to_current_space again to bring it here.');

  // Refused by the native side before anything changed, and "came back" but still parked on read back.
  for (const [shown, lists, reasonCode, pattern] of [
    ['user_is_in_the_app', [[win({ is_minimized: true })]], 'user_is_in_the_app', /^Window 7 of Finder was not brought back \(the window is minimized\)\. The user is working in another window of this app right now/],
    ['front_window_cannot_be_raised', [[win({ is_hidden: true })]], 'front_window_cannot_be_raised', /^Window 7 of Finder was not brought back \(the app is hidden\)\. The window would come back on top/],
    ['unavailable', [[win({ is_minimized: true })]], 'unavailable', /Bringing a minimized or hidden window back isn't available in this build/],
    ['shown_behind_the_front_window', [[win({ is_minimized: true })], [win({ is_minimized: true })]], 'still_parked', /was not brought back \(the window is minimized\)\. The window did not come back within the expected time\./],
  ]) {
    r = await run({ lists, shown });
    assert.equal(r.result.isError, true, shown);
    assert.deepEqual([r.parsed.reasonCode, r.parsed.errorKind], [reasonCode, 'state_conflict'], shown);
    assert.match(r.parsed.message, pattern, shown);
    assert.equal(typeof r.parsed.next_step, 'string', shown);
  }

  // On this Space already: the dry run says so, nothing is moved.
  r = await run({ lists: [[win()]], dry: { moved: false, alreadyHere: true } });
  assert.deepEqual([r.parsed.ok, r.parsed.how], [true, 'already_here']);
  assert.equal(r.parsed.message, 'Window 7 is already on the current Space — no move needed. Take a fresh app_screenshot and act on it directly.');
  assert.deepEqual(r.native.calls.filter(([m]) => m === 'bringWindowToActiveSpace').map(([, p]) => p), [{ bundleId: FINDER, windowId: 7, dryRun: true }]);

  // The dry run's codes, in the official words.
  for (const [code, reasonCode, errorKind, pattern] of [
    ['fullscreen_space', 'fullscreen_space', 'state_conflict', /^The user's current Space is a full-screen app, and a window can't be moved into a full-screen Space\./],
    ['space_unclassifiable', 'space_unclassifiable', 'state_conflict', /^Couldn't determine which Space that window is on right now/],
    ['owner_mismatch', 'owner_mismatch', 'app_not_granted', /^That window no longer belongs to Finder\./],
    ['op_unavailable', 'op_unavailable', 'feature_unavailable', /^Moving windows between Spaces isn't available on this macOS version\./],
  ]) {
    r = await run({ lists: [[win({ is_off_space: true })]], dry: { moved: false, alreadyHere: false, code } });
    assert.deepEqual([r.parsed.ok, r.parsed.reasonCode, r.parsed.errorKind], [false, reasonCode, errorKind], code);
    assert.match(r.parsed.message, pattern, code);
    assert.equal(r.native.calls.filter(([m, p]) => m === 'bringWindowToActiveSpace' && !p.dryRun).length, 0, `${code}: no move`);
  }

  // The window changed owner between the dry run and the move: nothing moved.
  r = await run({ lists: [[win({ is_off_space: true })]], owner: { pid: 9, bundleId: 'com.other.app' } });
  assert.deepEqual([r.parsed.reasonCode, r.parsed.errorKind], ['window_changed', 'state_conflict']);
  assert.equal(r.native.calls.filter(([m, p]) => m === 'bringWindowToActiveSpace' && !p.dryRun).length, 0);

  // The screen locked between the dry run and the move.
  let probes = 0;
  r = await run({ lists: [[win({ is_off_space: true })]], locked: () => (probes += 1) > 1 });
  assert.equal(r.parsed.reasonCode, 'screen_locked');
  assert.match(r.parsed.message, /^The screen locked before the move ran, so the window was not moved\./);

  // WindowServer ignored the move (another process's window, macOS 27.2): op_unavailable, feature_unavailable.
  r = await run({ lists: [[win({ is_off_space: true })]], move: { moved: false, alreadyHere: false, code: 'op_unavailable', windowServerIgnored: true } });
  assert.deepEqual([r.parsed.reasonCode, r.parsed.errorKind], ['op_unavailable', 'feature_unavailable']);

  // Moved and read back on this Space: the official success line.
  r = await run({ lists: [[win({ is_off_space: true })], [win()]] });
  assert.deepEqual([r.parsed.ok, r.parsed.how], [true, 'moved']);
  assert.equal(r.parsed.message, 'Window 7 of Finder is now on the current Space (the app did not take focus). Take a fresh app_screenshot next — the window is here and actionable.');
  assert.deepEqual(r.native.calls.filter(([m]) => m === 'bringWindowToActiveSpace').map(([, p]) => p),
    [{ bundleId: FINDER, windowId: 7, dryRun: true }, { bundleId: FINDER, windowId: 7 }]);
  assert.deepEqual(r.native.calls.find(([m]) => m === 'windowOwner')[1], { windowId: 7 });

  // Said moved, but it doesn't read back here (or nothing moved): state_conflict, may still be settling.
  for (const move of [{ moved: true, alreadyHere: false }, { moved: false, alreadyHere: false }]) {
    r = await run({ lists: [[win({ is_off_space: true })]], move });
    assert.deepEqual([r.parsed.reasonCode, r.parsed.errorKind], ['move_not_confirmed', 'state_conflict']);
    assert.match(r.parsed.message, /^The window did not appear on the current Space within the expected time\./);
  }

  // window_id that isn't an integer: bad_args before any window is looked at (service, past the schema).
  const native = bringNative({ lists: [[win()]] });
  const { service: svc, call } = setup({ native });
  await call('request_access', { apps: ['Finder'], reason: 'r' });
  const bad = await svc.appBringToCurrentSpace('thread-a', { bundleId: FINDER, windowId: 7.5 });
  assert.deepEqual([bad.reasonCode, bad.errorKind, bad.message], ['bad_args', 'bad_args', 'window_id (an integer from app_list_windows) is required.']);
  assert.equal(native.calls.filter(([m]) => m === 'listWindows').length, 0);
  // Without a grant it is app_not_granted (official tier "read": no tier beyond the grant is checked).
  const ungranted = setup({ native: bringNative({ lists: [[win()]] }) });
  assert.equal(ungranted.body(await ungranted.call('app_bring_to_current_space', { app: FINDER, window_id: 7 })).reasonCode, 'app_not_granted');
});
