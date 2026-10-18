// R4f-preview-coords (F2, preview-15): the agent's point is in the pixels of its last screenshot — the frame CDP
// returned, 2× the page's CSS pixels on a Retina display — and is checked against that frame (2.42304.0 S4i,
// errorClass coordinate_out_of_bounds) and mapped to the page's CSS pixels (y4i, clamped by b4i) before it is
// dispatched; the screenshot's result names its size (k4i). One emulation rule (emulatedViewport) feeds both
// applyEmulation and the record's geometry. The real createPreviewService over the stand-in Electron and process
// world (tests/fixtures/preview-r3b-world.mjs): no real port, process, window or page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fakeElectron, processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';
import { createPreviewCoordinateCheck } from '../electron/generated/r4e-preview-coordinates.mjs';
import { createPreviewCoordinateGuard, imageSize } from '../electron/r4e-preview-coordinates.mjs';
import { extractR4ePreview } from '../scripts/extract-r4e-preview.mjs';
import { tools } from '../electron/agent-tools/preview.mjs';

const require = createRequire(import.meta.url);
const { createPreviewService } = require('../electron/preview-service.cjs');
const app = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
const serviceSource = fs.readFileSync(path.join(app, 'electron/preview-service.cjs'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const tool = (name) => tools.find((entry) => entry.name === name);

// A JPEG's headers (SOI, APP0, SOF<n> with the frame's size, EOI): what a CDP screenshot starts with.
const jpeg = (width, height, sof = 0xc0) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, // a (truncated) DQT before the frame header
  0xff, sof, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);
const png = (width, height) => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]).copy(bytes);
  bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
  return bytes;
};

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r4f-coords-'));
  fs.mkdirSync(path.join(dir, '.claude'));
  return dir;
}
// The fixture's CDP answers {}: here a screenshot returns the bytes of `fake.frame` (a Retina frame by default), and
// the isolated-world scripts are recorded.
function electronWithFrames() {
  const fake = fakeElectron();
  fake.frame = () => jpeg(1600, 1200);
  fake.scripts = [];
  const Base = fake.electron.WebContentsView;
  fake.electron.WebContentsView = class extends Base {
    constructor(options) {
      super(options);
      const send = this.webContents.debugger.sendCommand;
      this.webContents.debugger.sendCommand = async (method, params) => (method === 'Page.captureScreenshot' ? (fake.cdp.push([method, params]), { data: fake.frame().toString('base64') }) : send(method, params));
      this.webContents.executeJavaScriptInIsolatedWorld = async (_world, [{ code }]) => { fake.scripts.push(code); return { ok: true }; };
    }
  };
  return fake;
}
function make(t) {
  const cwd = project();
  const world = processWorld(), fake = electronWithFrames();
  const instance = createPreviewService({ ...worldOptions(world), electron: fake.electron, getSession: (id) => ({ id, cwd }), spawnEnv: async () => ({ PATH: '/usr/bin:/bin' }), logger: { warn() {}, info() {} } });
  t.after(async () => { await instance.dispose({ graceMs: 50 }); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const agent = instance.forSession({ id: 's1', cwd });
  const attach = (width, height) => instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width, height }, visible: true });
  return { fake, instance, agent, attach };
}
// The points the page received: the native mouse events (on screen) after `from`.
const pointer = (fake, from = 0) => fake.cdp.slice(from).filter(([method]) => method === 'Input.dispatchMouseEvent').map(([, params]) => [params.type, params.x, params.y]);
// The point an isolated-world script was given (domClickScript / domHoverScript: cx, cy; scrollScript: x, y).
const scriptPoint = (code) => {
  const match = /cx = (-?[\d.]+|null), cy = (-?[\d.]+|null)/.exec(code) ?? /x = (-?[\d.]+|null), y = (-?[\d.]+|null);/.exec(code);
  return match ? [JSON.parse(match[1]), JSON.parse(match[2])] : null;
};
const frameMessage = (action, x, y, w, h) => `${action}: coordinate (${x}, ${y}) is outside the coordinate frame (${w}x${h}). Coordinates are pixels in the full-resolution frame — if the page changed, take a new screenshot first.`;
const outOfBounds = (message) => (error) => error.message === message && error.code === 'coordinate_out_of_bounds';

test('F2 source: y4i / b4i / S4i and what they read, k4i and c4i around them (2.42304.0 index.chunk-muI2IV6k.js), the generator --check', async () => {
  for (const text of [
    'function y4i(e,t,n){return[Math.round(t*(e.viewportWidth/e.screenshotWidth)),Math.round(n*(e.viewportHeight/e.screenshotHeight))]}',
    'function b4i(e,t,n){let r=v4i(e),i=r?Math.min(e.viewportWidth,r.width):e.viewportWidth,a=r?Math.min(e.viewportHeight,r.height):e.viewportHeight,[o,s]=y4i(e,t,n);return[Math.max(0,Math.min(o,Math.ceil(i)-1)),Math.max(0,Math.min(s,Math.ceil(a)-1))]}',
    'var x4i=2;function S4i(e,t,n){if(!Number.isFinite(t)||!Number.isFinite(n)||t<0||n<0||t>=e.screenshotWidth+x4i||n>=e.screenshotHeight+x4i)return`coordinate (${Math.round(t)}, ${Math.round(n)}) is outside the coordinate frame (${e.screenshotWidth}x${e.screenshotHeight}). Coordinates are pixels in the full-resolution frame \\u2014 if the page changed, take a new screenshot first.`;',
    'function v4i(e){return e.visible&&Osi(e.visible)?e.visible:null}',
    'function Esi(e){return e>1.005}var Dsi=.5;function Osi(e){return e.width<e.layoutWidth-Dsi||e.height<e.layoutHeight-Dsi}',
    'let i=S4i(r.dims,n.coordinate[0],n.coordinate[1]);return i?{error:`${o}: ${i}`,errorClass:"coordinate_out_of_bounds"}:{dispatch:b4i(r.dims,n.coordinate[0],n.coordinate[1]),echo:[Math.round(n.coordinate[0]),Math.round(n.coordinate[1])]}',
    'let a=S4i(i.dims,n.coordinate[0],n.coordinate[1]);if(a)return BN(`scroll: ${a}`,"coordinate_out_of_bounds");let s=b4i(i.dims,n.coordinate[0],n.coordinate[1])',
    'd2.set(o,{viewportWidth:r?.w||1280,viewportHeight:r?.h||800,screenshotWidth:i.frameWidth??i.width,screenshotHeight:i.frameHeight??i.height,visible:r&&r.visible.width>0&&r.visible.height>0?r.visible:null})',
    'a=Math.max(1,i.scale);return{w:r.w/a,h:r.h/a,visible:i}',
    '{type:"text",text:`Screenshot size: ${o.width}x${o.height}${c}${l}`}',
  ]) assert.equal(count(main, text), 1, text);
  for (const name of ['y4i', 'b4i', 'S4i', 'v4i']) assert.equal(count(main, `function ${name}(`), 1, name);
  await extractR4ePreview({ check: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'electron/generated/r4e-preview-manifest.json'), 'utf8'));
  const entry = manifest.targets['r4e-preview-coordinates.mjs'];
  assert.deepEqual(Object.keys(entry.bindings), ['Esi', 'Dsi', 'Osi', 'g4i', '_4i', 'v4i', 'y4i', 'b4i', 'x4i', 'S4i'], 'in the chunk\'s order');
  assert.deepEqual(entry.globals, ['Math', 'Number']);
  assert.deepEqual(entry.hostCalls, { Cvi: 1 });
});

test('F2 generated: y4i maps a Retina frame to CSS pixels, b4i clamps to the viewport, S4i refuses outside the frame (x4i slack)', () => {
  const policy = createPreviewCoordinateCheck({ Cvi: async () => { throw new Error('not read'); } });
  const retina = { viewportWidth: 800, viewportHeight: 600, screenshotWidth: 1600, screenshotHeight: 1200, visible: { width: 800, height: 600, scale: 1, layoutWidth: 800, layoutHeight: 600 } };
  assert.deepEqual(policy.frameToViewport(retina, 400, 300), [200, 150]);
  assert.deepEqual(policy.frameToViewport(retina, 3, 3), [2, 2], 'rounded (1.5 → 2)');
  assert.deepEqual(policy.dispatchPoint(retina, 1601, 1199), [799, 599], 'inside the slack, clamped to the last CSS pixel');
  assert.equal(policy.visiblePart(retina), null, 'nothing hidden: the layout is the visible size');
  assert.equal(policy.coordinateProblem(retina, 0, 0), null);
  assert.equal(policy.coordinateProblem(retina, 1601, 1201), null, 'x4i: 2 px of slack');
  assert.equal(policy.coordinateProblem(retina, 1602, 10), frameMessage('x', 1602, 10, 1600, 1200).slice(3));
  assert.equal(policy.coordinateProblem(retina, -1, 10), frameMessage('x', -1, 10, 1600, 1200).slice(3));
  assert.equal(policy.coordinateProblem(retina, 10, Number.NaN), 'coordinate (10, NaN) is outside the coordinate frame (1600x1200). Coordinates are pixels in the full-resolution frame — if the page changed, take a new screenshot first.');
  // The original's visible-part branch (a pinch-zoomed page; the host preview never has one), verbatim.
  const zoomed = { ...retina, visible: { width: 400, height: 300, scale: 2, layoutWidth: 800, layoutHeight: 600 } };
  assert.equal(policy.visiblePart(zoomed), zoomed.visible);
  assert.deepEqual(policy.dispatchPoint(zoomed, 1000, 100), [399, 50], 'clamped to the visible part');
  assert.match(policy.coordinateProblem(zoomed, 1000, 100), /^coordinate \(1000, 100\) maps past the visible part of the zoomed-in page, so `coordinate` cannot reach it; act on the element by `ref`/);
  const clipped = { ...retina, visible: { width: 400, height: 600, scale: 1, layoutWidth: 800, layoutHeight: 600 } };
  assert.match(policy.coordinateProblem(clipped, 1000, 100), /^coordinate \(1000, 100\) maps outside the part of the page the pane shows/);
  assert.equal(policy.coordinateProblem(clipped, 830, 100), null, 'within g4i(1) = 20 px past the visible part');
});

test('F2 imageSize: a JPEG\'s frame header (baseline or progressive, after other segments), a PNG\'s IHDR, else null', () => {
  assert.deepEqual(imageSize(jpeg(1600, 1200)), { width: 1600, height: 1200 });
  assert.deepEqual(imageSize(jpeg(750, 1624, 0xc2)), { width: 750, height: 1624 }, 'SOF2');
  const padded = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xff]), jpeg(10, 20).subarray(2)]);
  assert.deepEqual(imageSize(padded), { width: 10, height: 20 }, 'a fill byte before a marker');
  assert.deepEqual(imageSize(png(2560, 1600)), { width: 2560, height: 1600 });
  assert.equal(imageSize(Buffer.from('jpg')), null);
  assert.equal(imageSize(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), null, 'scan data before any frame header');
  assert.equal(imageSize(jpeg(0, 10)), null);
  assert.equal(imageSize('not bytes'), null);
});

test('F2 guard: point() is C4i, then S4i, then b4i; without a record, or for a frame it can\'t size, the point is the page\'s as it is', async () => {
  let geometry = { width: 800, height: 600, scale: 1, deviceScaleFactor: 0, layoutWidth: 800, layoutHeight: 600 };
  const guard = createPreviewCoordinateGuard({ geometry: () => ({ ...geometry }) });
  const tab = {};
  assert.deepEqual(await guard.point(tab, 'click', 1000, 900), { x: 1000, y: 900 }, 'no screenshot yet');
  guard.remember(tab, null);
  assert.deepEqual(await guard.point(tab, 'click', 1000, 900), { x: 1000, y: 900 }, 'a frame without a size is no record (C4i i())');
  const shot = guard.remember(tab, { width: 1600, height: 1200 });
  assert.deepEqual(shot, { viewportWidth: 800, viewportHeight: 600, screenshotWidth: 1600, screenshotHeight: 1200, visible: geometry });
  assert.deepEqual(await guard.point(tab, 'click', 400, 300), { x: 200, y: 150 });
  await assert.rejects(guard.point(tab, 'hover', 1700, 10), outOfBounds(frameMessage('hover', 1700, 10, 1600, 1200)));
  assert.deepEqual(await guard.point(tab, 'hover', 10, 10), { x: 5, y: 5 }, 'an out-of-bounds point keeps the record');
  geometry = { ...geometry, width: 1000, layoutWidth: 1000 };
  await assert.rejects(guard.point(tab, 'click', 1700, 10), (error) => error.code === 'needs_screenshot', 'C4i comes first');
});

test('F2 service: on a Retina display the agent\'s point from its screenshot reaches the page in CSS pixels; outside the frame it is refused', async (t) => {
  const { fake, agent, attach } = make(t);
  await agent.navigate('http://localhost:3000/');
  await attach(800, 600);
  // Without a screenshot the point is the page's own (as before F2).
  let from = fake.cdp.length;
  await agent.click({ x: 10, y: 20 });
  assert.deepEqual(pointer(fake, from)[0], ['mouseMoved', 10, 20]);
  // The screenshot: an 800 × 600 page at 2× is a 1600 × 1200 frame.
  const shot = await agent.screenshot();
  assert.deepEqual({ width: shot.width, height: shot.height, mimeType: shot.mimeType }, { width: 1600, height: 1200, mimeType: 'image/jpeg' });
  from = fake.cdp.length;
  const clicked = await agent.click({ x: 400, y: 300 });
  assert.equal(clicked.clicked, '(400, 300)', 'the echo is the agent\'s own point');
  assert.deepEqual(pointer(fake, from), [['mouseMoved', 200, 150], ['mousePressed', 200, 150], ['mouseReleased', 200, 150]]);
  from = fake.cdp.length;
  await agent.click({ x: 1601, y: 1201, doubleClick: true });
  assert.deepEqual(pointer(fake, from).map(([, x, y]) => [x, y]), Array(5).fill([799, 599]), 'inside the slack, clamped to the last pixel');
  from = fake.cdp.length;
  await agent.hover({ x: 1598, y: 2 });
  assert.deepEqual(pointer(fake, from), [['mouseMoved', 799, 1]]);
  const scripts = fake.scripts.length;
  await agent.scroll({ x: 1200, y: 900, direction: 'down' });
  assert.deepEqual(scriptPoint(fake.scripts.at(-1)), [600, 450], 'the scroll script gets the CSS point');
  assert.ok(fake.scripts.length > scripts);
  // Outside the frame: refused with the original's message after the action's name, and nothing reaches the page.
  from = fake.cdp.length;
  await assert.rejects(agent.click({ x: 1602, y: 10 }), outOfBounds(frameMessage('click', 1602, 10, 1600, 1200)));
  await assert.rejects(agent.hover({ x: 5, y: -3 }), outOfBounds(frameMessage('hover', 5, -3, 1600, 1200)));
  await assert.rejects(agent.scroll({ x: 2000, y: 2000, direction: 'up' }), outOfBounds(frameMessage('scroll', 2000, 2000, 1600, 1200)));
  assert.deepEqual(pointer(fake, from), []);
  // An element by ref or selector is not a point.
  await agent.click({ selector: 'a' });
  // The pane changed: C4i's needs_screenshot comes before the bounds check.
  await attach(1000, 600);
  await assert.rejects(agent.click({ x: 5000, y: 5000 }), (error) => error.code === 'needs_screenshot');
  // A 1× display: the frame is the page's own size, and the point maps 1:1.
  fake.frame = () => jpeg(1000, 600);
  await agent.screenshot();
  from = fake.cdp.length;
  await agent.click({ x: 999, y: 599 });
  assert.deepEqual(pointer(fake, from)[0], ['mouseMoved', 999, 599]);
});

test('F2 service: a phone preset (deviceScaleFactor 2, fit to the pane) maps to the size the emulation set, from one emulation rule', async (t) => {
  const { fake, agent, attach } = make(t);
  await agent.navigate('http://localhost:3000/');
  await attach(800, 600);
  await agent.resize({ preset: 'mobile' });
  const override = fake.cdp.filter(([method]) => method === 'Emulation.setDeviceMetricsOverride').at(-1)[1];
  assert.deepEqual({ ...override, scale: Number(override.scale.toFixed(4)) }, { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, scale: 0.7389 });
  fake.frame = () => jpeg(750, 1624);
  assert.deepEqual(await agent.screenshot().then(({ width, height }) => [width, height]), [750, 1624]);
  let from = fake.cdp.length;
  await agent.click({ x: 749, y: 1623 });
  assert.deepEqual(pointer(fake, from)[0], ['mouseMoved', override.width - 1, override.height - 1], 'the record\'s viewport is the emulated one');
  from = fake.cdp.length;
  await agent.click({ x: 375, y: 812 });
  assert.deepEqual(pointer(fake, from)[0], ['mouseMoved', 188, 406]);
  await assert.rejects(agent.click({ x: 760, y: 10 }), outOfBounds(frameMessage('click', 760, 10, 750, 1624)));
  // One rule for both: applyEmulation and the record's geometry read emulatedViewport, and the phone rule is written once.
  assert.equal(count(serviceSource, '= emulatedViewport(entry);'), 2);
  assert.equal(count(serviceSource, 'width < 768'), 1);
  assert.equal(count(serviceSource, 'const mobile = width < 768;'), 1);
});

test('F2 service: off screen (no pane) the DOM click and hover scripts get the CSS point of a 1280 × 800 page\'s 2× frame', async (t) => {
  const { fake, agent } = make(t);
  await agent.navigate('http://localhost:3000/');
  fake.frame = () => jpeg(2560, 1600);
  await agent.screenshot();
  await agent.click({ x: 200, y: 100 });
  assert.deepEqual(scriptPoint(fake.scripts.at(-1)), [100, 50]);
  await agent.hover({ x: 2559, y: 1599 });
  assert.deepEqual(scriptPoint(fake.scripts.at(-1)), [1279, 799]);
  await assert.rejects(agent.click({ x: 2562, y: 0 }), outOfBounds(frameMessage('click', 2562, 0, 2560, 1600)));
  // A screenshot whose size can't be read leaves no record: the point is the page's as it is.
  fake.frame = () => Buffer.from('not a jpeg');
  const shot = await agent.screenshot();
  assert.equal(shot.width, undefined);
  await agent.click({ x: 200, y: 100 });
  assert.deepEqual(scriptPoint(fake.scripts.at(-1)), [200, 100]);
});

test('F2 tools: the screenshot names its size after the image (k4i), and preview_batch maps a later step\'s point from it', async (t) => {
  const { fake, agent, attach } = make(t);
  await agent.navigate('http://localhost:3000/');
  await attach(800, 600);
  const ctx = { preview: agent };
  const shot = await tool('screenshot').handler({}, ctx);
  assert.deepEqual(shot.content.map((part) => part.type), ['image', 'text']);
  assert.equal(shot.content[0].mimeType, 'image/jpeg');
  assert.deepEqual(imageSize(Buffer.from(shot.content[0].data, 'base64')), { width: 1600, height: 1200 });
  assert.equal(shot.content[1].text, 'Screenshot size: 1600x1200');
  // A batch's points refer to the screenshot taken before it (preview_batch's description, as browser_batch's).
  const from = fake.cdp.length;
  const batch = await tool('preview_batch').handler({ actions: [{ name: 'click', input: { x: 800, y: 600 } }, { name: 'click', input: { x: 1700, y: 600 } }, { name: 'press', input: { keys: 'Enter' } }] }, ctx);
  assert.equal(batch.isError, true);
  const text = batch.content.filter((part) => part.type === 'text').map((part) => part.text);
  assert.match(text[0], /^1\. click: Clicked \(800, 600\)\./);
  assert.equal(text[1], `2. click failed: ${frameMessage('click', 1700, 600, 1600, 1200)}`);
  assert.equal(text[2], 'Stopped: the remaining step was not run.');
  assert.deepEqual(pointer(fake, from)[0], ['mouseMoved', 400, 300]);
  assert.equal(fake.cdp.slice(from).filter(([method]) => method === 'Input.dispatchKeyEvent').length, 0, 'the press never ran');
  // A screenshot step names its size in the step's line, with the image after it.
  const shots = await tool('preview_batch').handler({ actions: [{ name: 'screenshot', input: {} }] }, ctx);
  assert.deepEqual(shots.content.map((part) => part.type === 'text' ? part.text : part.type), ['1. screenshot: Screenshot size: 1600x1200', 'image']);
  // A screenshot without a size (a stand-in service) keeps the image-only result.
  assert.deepEqual(await tool('screenshot').handler({}, { preview: { screenshot: async () => ({ data: 'AAAA', mimeType: 'image/jpeg' }) } }), { image: { data: 'AAAA', mimeType: 'image/jpeg' } });
  for (const name of ['click', 'hover', 'scroll']) assert.match(tool(name).description, /x, y in the pixels of your last screenshot/, name);
});
