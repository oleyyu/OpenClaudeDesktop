// R4e-preview (main process): preview-15 the 2.42304.0 C4i check — a point from the agent's screenshot is refused once
// the tab's zoom or size changed (the pane resized, another viewport preset, another device scale factor), until the
// next screenshot — and preview-03's log line on an identity mismatch (a2.start N.warn). Stand-in Electron and process
// world (tests/fixtures/preview-r3b-world.mjs): no real port, process, window or page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fakeElectron, processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';
import { createPreviewCoordinateCheck } from '../electron/generated/r4e-preview-coordinates.mjs';
import { createPreviewCoordinateGuard } from '../electron/r4e-preview-coordinates.mjs';
import { extractR4ePreview } from '../scripts/extract-r4e-preview.mjs';

const require = createRequire(import.meta.url);
const { createPreviewService } = require('../electron/preview-service.cjs');
const app = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

function project(configurations, scripts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r4e-service-'));
  fs.mkdirSync(path.join(dir, '.claude'));
  if (configurations) fs.writeFileSync(path.join(dir, '.claude/launch.json'), JSON.stringify({ version: '0.0.1', configurations }));
  if (scripts) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts }));
  return dir;
}
// A JPEG's headers (SOI, APP0, SOF0 with the frame's size, EOI): what imageSize reads of the screenshot.
const jpeg = (width, height) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);
// The fixture's CDP answers {}; a screenshot here needs bytes (a 1600 × 1200 frame: R4f's mapping is tested in
// tests/preview-r4f-coords.test.mjs).
function electronWithShots() {
  const fake = fakeElectron();
  const Base = fake.electron.WebContentsView;
  fake.electron.WebContentsView = class extends Base {
    constructor(options) {
      super(options);
      const send = this.webContents.debugger.sendCommand;
      this.webContents.debugger.sendCommand = async (method, params) => (method === 'Page.captureScreenshot' ? (fake.cdp.push([method, params]), { data: jpeg(1600, 1200).toString('base64') }) : send(method, params));
    }
  };
  return fake;
}
function make(t, { native = null, logger = { warn() {}, info() {} }, configurations = null, scripts = null } = {}) {
  const cwd = project(configurations, scripts);
  const world = processWorld(), fake = electronWithShots();
  const instance = createPreviewService({ ...worldOptions(world, native ? { processInfo: native(world) } : {}), electron: fake.electron, getSession: (id) => ({ id, cwd }), spawnEnv: async () => ({ PATH: '/usr/bin:/bin' }), logger });
  t.after(async () => { await instance.dispose({ graceMs: 50 }); fs.rmSync(cwd, { recursive: true, force: true }); });
  return { cwd, world, fake, instance, sender: fake.sender() };
}
const pointerEvents = (fake) => fake.cdp.filter(([method]) => method === 'Input.dispatchMouseEvent').length;
const refused = (action) => new RegExp(`^${action}: the page's zoom or size has changed; take a new screenshot \\(screenshot\\) before using \`x\`/\`y\`\\.$`);
const stale = (action) => new RegExp(`^${action}: this tab's page, zoom or size has changed; take a new screenshot \\(screenshot\\) before using \`x\`/\`y\`\\.$`);
const needs = (pattern) => (error) => pattern.test(error.message) && error.code === 'needs_screenshot';

test('preview-15 source: C4i / _4i / g4i and the generated module (extract-r4e-preview.mjs --check)', async () => {
  for (const text of [
    'function g4i(e){return Math.max(1,20/e)}',
    'async function _4i(e,t,n){if(!n.visible)return!1;let r=await Cvi(e,t),i=g4i(n.visible.scale);return Math.abs(r.scale-n.visible.scale)>n.visible.scale*.005||Math.abs(r.width-n.visible.width)>i||Math.abs(r.height-n.visible.height)>i}',
    'if(a&&await _4i(e,t,a))return m2(e,t,!0),{error:`${n}: the page\'s zoom or size has changed; take a new screenshot (computer{action:"screenshot"}) before using \\`coordinate\\`.`,errorClass:"needs_screenshot"}',
    '{error:f2.get(r)===!0?`${n}: this tab\'s page, zoom or size has changed; take a new screenshot (computer{action:"screenshot"}) before using \\`coordinate\\`.`',
    'let s=await h4i(e,t,a);c4i(e,t,i,s,o);',
    'if(n.coordinate){let r=await C4i(e,t,o);if("error"in r)return r;',
  ]) assert.equal(count(main, text), 1, text);
  await extractR4ePreview({ check: true });
  const policy = createPreviewCoordinateCheck({ Cvi: async () => ({ scale: 1, width: 800, height: 600 }) });
  assert.equal(policy.sizeTolerance(1), 20);
  assert.equal(policy.sizeTolerance(4), 5);
  assert.equal(policy.sizeTolerance(40), 1);
  assert.equal(await policy.zoomOrSizeChanged(null, null, { visible: { scale: 1, width: 815, height: 600 } }), false, 'within 20 px at 1×');
  assert.equal(await policy.zoomOrSizeChanged(null, null, { visible: { scale: 1, width: 821, height: 600 } }), true);
  assert.equal(await policy.zoomOrSizeChanged(null, null, { visible: { scale: 1.006, width: 800, height: 600 } }), true, 'scale beyond 0.5 %');
  assert.equal(await policy.zoomOrSizeChanged(null, null, { visible: null }), false, 'a record without geometry never fails');
});

test('preview-15 guard: the record, m2(e,t,!0) on a change, the second message until the next screenshot, per tab', async () => {
  const sizes = new Map();
  const guard = createPreviewCoordinateGuard({ geometry: (tab) => ({ ...sizes.get(tab) }) });
  const a = {}, b = {};
  sizes.set(a, { width: 800, height: 600, scale: 1, deviceScaleFactor: 0 });
  sizes.set(b, { width: 375, height: 812, scale: 0.5, deviceScaleFactor: 2 });
  const frame = { width: 1600, height: 1200 };
  assert.equal(await guard.check(a, 'click'), null, 'no screenshot yet: the point is used (page pixels)');
  guard.remember(a, frame);
  assert.deepEqual(await guard.check(a, 'click'), { viewportWidth: 800, viewportHeight: 600, screenshotWidth: 1600, screenshotHeight: 1200, visible: { width: 800, height: 600, scale: 1, deviceScaleFactor: 0 } });
  sizes.set(a, { width: 1000, height: 600, scale: 1, deviceScaleFactor: 0 });
  await assert.rejects(guard.check(a, 'click'), needs(refused('click')));
  await assert.rejects(guard.check(a, 'hover'), needs(stale('hover')), 'the record went (m2): the changed tab keeps failing');
  sizes.set(a, { width: 800, height: 600, scale: 1, deviceScaleFactor: 0 });
  await assert.rejects(guard.check(a, 'click'), needs(stale('click')), 'even back at the old size, until a screenshot');
  assert.equal(await guard.check(b, 'click'), null, 'another tab is its own');
  guard.remember(a, frame);
  assert.ok(await guard.check(a, 'click'));
  // deviceScaleFactor alone (the local addition): same size and scale, another density.
  sizes.set(a, { width: 800, height: 600, scale: 1, deviceScaleFactor: 2 });
  await assert.rejects(guard.check(a, 'scroll'), needs(refused('scroll')));
});

test('preview-15: a pane resize, a preset, a device scale factor refuse the agent\'s point until it takes a new screenshot', async (t) => {
  const { cwd, fake, instance, sender } = make(t);
  const agent = instance.forSession({ id: 's1', cwd });
  await agent.navigate('http://localhost:3000/');
  const attach = (width, height) => instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width, height }, visible: true });
  await attach(800, 600);
  await agent.screenshot();
  assert.match((await agent.click({ x: 10, y: 20 })).clicked, /\(10, 20\)/);
  let sent = pointerEvents(fake);
  assert.ok(sent >= 3, 'moved, pressed, released');
  // Within g4i's 20 px at 1×: still the same page.
  await attach(812, 600);
  await agent.click({ x: 10, y: 20 });
  assert.ok(pointerEvents(fake) > sent);
  sent = pointerEvents(fake);
  // The pane got wider (responsive: the page with it).
  await attach(1000, 600);
  await assert.rejects(agent.click({ x: 10, y: 20 }), needs(refused('click')));
  await assert.rejects(agent.hover({ x: 10, y: 20 }), needs(stale('hover')));
  await assert.rejects(agent.scroll({ x: 10, y: 20, direction: 'down' }), needs(stale('scroll')));
  assert.equal(pointerEvents(fake), sent, 'nothing reached the page');
  // An element by selector, or a scroll into view, needs no point.
  await agent.click({ selector: 'a' });
  await agent.hover({ selector: 'a' });
  await agent.scroll({ selector: 'main' });
  await agent.screenshot();
  await agent.click({ x: 10, y: 20 });
  await agent.hover({ x: 10, y: 20 });
  // Another viewport preset (the agent's resize_window): another size and scale.
  await agent.resize({ preset: 'tablet' });
  await assert.rejects(agent.click({ x: 10, y: 20 }), needs(refused('click')));
  await agent.screenshot();
  await agent.click({ x: 10, y: 20 });
  // Only the device scale factor: custom 760 → 770 wide (10 px, inside the tolerance) in a pane big enough for 1×,
  // but under 768 a preset is a phone at 2×.
  await attach(2000, 2000);
  await agent.resize({ width: 760, height: 1000 });
  await agent.screenshot();
  await agent.click({ x: 10, y: 20 });
  await agent.resize({ width: 770, height: 1000 });
  await assert.rejects(agent.click({ x: 10, y: 20 }), needs(refused('click')));
  await agent.screenshot();
  await agent.click({ x: 10, y: 20 });
  // The user's own capture (Save screenshot, Annotate) is not the agent's record.
  await attach(1200, 900);
  await agent.resize({ preset: 'desktop' });
  await instance.call(sender, 'preview-capture', { sessionId: 's1' });
  await assert.rejects(agent.click({ x: 10, y: 20 }), needs(refused('click')));
});

test('preview-15: the record is per tab — a new tab has none, and the old one is still changed when it comes back', async (t) => {
  const { cwd, instance, sender } = make(t);
  const agent = instance.forSession({ id: 's1', cwd });
  await agent.navigate('http://localhost:3000/');
  const attach = (width) => instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width, height: 600 }, visible: true });
  await attach(800);
  await agent.screenshot();
  const first = instance.snapshot('s1').activeTabId;
  await attach(1100);
  await assert.rejects(agent.click({ x: 1, y: 1 }), needs(refused('click')));
  await instance.call(sender, 'preview-tab-new', { sessionId: 's1' });
  await agent.navigate('http://localhost:3000/other');
  assert.notEqual(instance.snapshot('s1').activeTabId, first);
  await agent.click({ x: 1, y: 1 });
  await instance.call(sender, 'preview-tab-activate', { sessionId: 's1', tabId: first });
  assert.equal(instance.snapshot('s1').activeTabId, first);
  await assert.rejects(agent.click({ x: 1, y: 1 }), needs(stale('click')));
});

test('preview-03: an identity mismatch logs the original\'s warning with {serverId, port}, keeps the guidance in the output, and names the port', async (t) => {
  const warnings = [];
  const npm = (name, port, extra = {}) => ({ name, runtimeExecutable: 'npm', runtimeArgs: ['run', name], port, ...extra });
  const { world, instance, sender } = make(t, { native: (w) => w.native(), logger: { warn: (...args) => warnings.push(args), info() {} },
    configurations: [npm('api', 3000), npm('web', 3001, { autoPort: false })], scripts: { api: 'node api.js', web: 'vite' } });
  let api = null;
  world.behave = (child) => {
    if (child.args[1] === 'api') { api = child; child.listen(); return true; }
    if (child.args[1] === 'web') { api.listen(3001); child.listen(5173); return true; }
    return false;
  };
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'api' })).ok, true);
  const web = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
  assert.deepEqual({ ok: web.ok, code: web.code }, { ok: false, code: 'identity' });
  const identity = warnings.filter(([format]) => format === '[Preview] Server identity check failed %o');
  assert.deepEqual(identity, [['[Preview] Server identity check failed %o', { serverId: 'web', port: 3001 }]]);
  const failed = instance.snapshot('s1').servers.find((server) => server.name === 'web');
  assert.deepEqual({ status: failed.status, code: failed.error.code, port: failed.error.port }, { status: 'failed', code: 'identity', port: 3001 });
  assert.match(failed.error.message, /^This server is listening on port 5173, not on its assigned port 3001\./);
  assert.ok((await instance.call(sender, 'preview-server-logs', { sessionId: 's1', name: 'web' })).lines.includes(failed.error.message), 'the guidance is in the output (a2.start: stderr)');
});
