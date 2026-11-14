// R4e-zoom (menus-14 / layout-16): View › Zoom In / Zoom Out carry ids "zoom-in" / "zoom-out" and are disabled at the
// zoom limits, refreshed together with the two Actual Size items after every reset and step — the original 3.6556.2
// main-process bindings (asar index.chunk-jPKPzV-P.js cTi, oTi, sTi, wTi via x0; 2.42304.0 muI2IV6k yPi, _Pi, vPi, PPi via I$),
// extracted to
// electron/generated/r4e-zoom.cjs by scripts/extract-r4e-zoom.mjs. Controlled menu objects and zoom events only: no
// Electron, no window, no process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import appMenu from '../electron/app-menu.cjs';
import chrome from '../electron/window-chrome.cjs';
import zoom from '../electron/generated/r4e-zoom.cjs';
import mainGlue from '../electron/r4h-main-glue.cjs';

const app = path.resolve(import.meta.dirname, '..');
const { appMenuTemplate, refreshZoomMenu } = appMenu;
const { ZOOM_LEVEL, ZOOM_STEP } = chrome;
const { menuZoomLevel, settleWindowZoom, applyWindowZoom } = mainGlue;
const official = readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const manifest = JSON.parse(readFileSync(path.join(app, 'electron/generated/r4e-zoom-manifest.json'), 'utf8'));
const generated = readFileSync(path.join(app, 'electron/generated/r4e-zoom.cjs'), 'utf8');

test('3.6556.2 feature strings: cTi ids, oTi/sTi limits and the wTi four-item table each occur once', () => {
  for (const [needle, count] of [
    ['T4n=.25,E4n=Math.log(1.2),D4n=Math.log(T4n)/E4n,O4n=Math.log(5)/E4n;', 1],
    ['function k4n(e){return Math.min(O4n,Math.max(D4n,e))}', 1],
    ['rTi=.5,', 1],
    ['aTi=()=>V?.webContents!=null&&!V.webContents.isDestroyed()?V.webContents.getZoomLevel():void 0', 1],
    ['oTi=(e=aTi())=>e===void 0||e<O4n', 1],
    ['sTi=(e=aTi())=>e===void 0||e>D4n', 1],
    ['{id:"zoom-in",label:X().formatMessage({defaultMessage:"Zoom In",id:"Z9g5m/V9Nq"}),accelerator:"CmdOrCtrl+Plus",enabled:oTi(),click:STi}', 1],
    ['{id:"zoom-out",label:X().formatMessage({defaultMessage:"Zoom Out",id:"XZ36+EBE5/"}),accelerator:"CmdOrCtrl+-",enabled:sTi(),click:CTi}', 1],
    ['n=[["actual-size",e!==0],["actual-size-numpad",e!==0],["zoom-in",oTi(e)],["zoom-out",sTi(e)]];for(let[e,r]of n){let n=t?.getMenuItemById(e);n&&(n.enabled=r)}', 1],
    ['function x0(){wTi()}', 1],
    ['V.webContents.setZoomLevel(0),xTi(0),x0(),b0()', 1],
    ['n=k4n(e===0?t:Math.round((t+e)/rTi)*rTi+0);V.webContents.setZoomLevel(n),xTi(n),x0(),b0()', 1],
    // The hidden twins keep neither an id nor enabled.
    ['{label:X().formatMessage({defaultMessage:"Zoom In (indie cooler version)",id:"fEeEFfSz4K"}),accelerator:"CmdOrCtrl+=",visible:!1,acceleratorWorksWhenHidden:!0,click:STi}', 1],
    ['{label:"Zoom In (numpad)",accelerator:"CmdOrCtrl+numadd",visible:!1,acceleratorWorksWhenHidden:!0,click:STi}', 1],
    ['{label:"Zoom Out (numpad)",accelerator:"CmdOrCtrl+numsub",visible:!1,acceleratorWorksWhenHidden:!0,click:CTi}', 1],
  ]) assert.equal(occurrences(official, needle), count, needle);
});

test('generated r4e-zoom.cjs is the original text, pinned to 3.6556.2, and the host clamp/step are those bindings', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.source, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js');
  assert.deepEqual(manifest.bindings.map(b => [b.name, b.scope]), [['T4n', 'module'], ['E4n', 'module'], ['D4n', 'module'], ['O4n', 'module'], ['k4n', 'module'], ['rTi', 'module'],
    ['aTi', 'bindZoomMenu'], ['oTi', 'bindZoomMenu'], ['sTi', 'bindZoomMenu'], ['wTi', 'bindZoomMenu']]);
  assert.deepEqual(manifest.hostParams, { V: ['webContents'], a: ['Menu'] });
  for (const needle of ['var oTi = (e = aTi()) => e === void 0 || e < O4n;', 'var sTi = (e = aTi()) => e === void 0 || e > D4n;', 'function bindZoomMenu(V, a) {'])
    assert.equal(occurrences(generated, needle), 1, needle);
  assert.equal(zoom.T4n, 0.25);
  assert.equal(zoom.E4n, Math.log(1.2));
  assert.equal(zoom.ZOOM_LEVEL_MIN, Math.log(0.25) / Math.log(1.2));
  assert.equal(zoom.ZOOM_LEVEL_MAX, Math.log(5) / Math.log(1.2));
  assert.equal(zoom.ZOOM_STEP, 0.5);
  assert.equal(zoom.clampZoomLevel(100), zoom.ZOOM_LEVEL_MAX);
  assert.equal(zoom.clampZoomLevel(-100), zoom.ZOOM_LEVEL_MIN);
  assert.equal(zoom.clampZoomLevel(1.5), 1.5);
  // window-chrome.cjs takes the level range, clamp and step from the generated bindings.
  assert.deepEqual([ZOOM_LEVEL.MIN, ZOOM_LEVEL.MAX, ZOOM_STEP, chrome.clampZoomLevel], [zoom.D4n, zoom.O4n, zoom.rTi, zoom.k4n]);
});

test('oTi / sTi: Zoom In below O4n (×5), Zoom Out above D4n (×.25), both enabled without a level', () => {
  const { canZoomIn, canZoomOut } = zoom.bindZoomMenu();
  for (const [level, zoomIn, zoomOut] of [[0, true, true], [8.5, true, true], [zoom.ZOOM_LEVEL_MAX, false, true], [-7.5, true, true], [zoom.ZOOM_LEVEL_MIN, true, false], [undefined, true, true]]) {
    assert.equal(canZoomIn(level), zoomIn, `zoom in at ${level}`);
    assert.equal(canZoomOut(level), zoomOut, `zoom out at ${level}`);
  }
  // Bound to a view, no argument reads the view's level (aTi); a destroyed view reads as none.
  let level = zoom.ZOOM_LEVEL_MAX, destroyed = false;
  const view = { webContents: { getZoomLevel: () => level, isDestroyed: () => destroyed } };
  const bound = zoom.bindZoomMenu(view);
  assert.equal(bound.zoomLevel(), zoom.ZOOM_LEVEL_MAX);
  assert.deepEqual([bound.canZoomIn(), bound.canZoomOut()], [false, true]);
  level = zoom.ZOOM_LEVEL_MIN;
  assert.deepEqual([bound.canZoomIn(), bound.canZoomOut()], [true, false]);
  destroyed = true;
  assert.equal(bound.zoomLevel(), undefined);
  assert.deepEqual([bound.canZoomIn(), bound.canZoomOut()], [true, true]);
});

const viewItems = template => template.find(item => item.label === 'View').submenu;
const zoomRows = items => items.filter(item => /Zoom|Actual Size/.test(item.label || '')).map(item => [item.label, item.id, item.enabled]);

test('cTi template: zoom-in / zoom-out ids and enabled from the level the menu is built at', () => {
  for (const [zoomLevel, zoomed, zoomIn, zoomOut] of [[undefined, false, true, true], [0, false, true, true], [2, true, true, true],
    [zoom.ZOOM_LEVEL_MAX, true, false, true], [zoom.ZOOM_LEVEL_MIN, true, true, false], [Number.NaN, false, true, true]]) {
    assert.deepEqual(zoomRows(viewItems(appMenuTemplate({ sidebarOpen: true, zoomed, zoomLevel, emit: () => {} }))), [
      ['Actual Size', 'actual-size', zoomed],
      ['Zoom In', 'zoom-in', zoomIn],
      ['Zoom In (indie cooler version)', undefined, undefined],
      ['Zoom Out', 'zoom-out', zoomOut],
      ['Zoom In (numpad)', undefined, undefined],
      ['Zoom Out (numpad)', undefined, undefined],
      ['Actual Size (numpad)', 'actual-size-numpad', zoomed]], `level ${zoomLevel}`);
  }
});

// A controlled application menu built from the real template, a main window whose webContents keeps a zoom level, and
// the real main-process applyWindowZoom / settleWindowZoom / menuZoomLevel helpers (no duplicated glue in the test).
function harness() {
  let level = 0;
  const webContents = { getZoomLevel: () => level, setZoomLevel: next => { level = next; }, isDestroyed: () => false };
  const win = { isDestroyed: () => false, webContents };
  const events = [];
  const template = appMenuTemplate({ sidebarOpen: true, zoomed: false, zoomLevel: menuZoomLevel(win), emit: event => events.push(event) });
  const byId = new Map();
  const walk = items => { for (const item of items) { if (item.id) byId.set(item.id, item); if (Array.isArray(item.submenu)) walk(item.submenu); } };
  walk(template);
  const menu = { getMenuItemById: id => byId.get(id) ?? null };
  const Menu = { getApplicationMenu: () => menu };
  const items = viewItems(template);
  const click = label => {
    items.find(item => item.label === label).click();
    for (const event of events.splice(0)) if (event.kind === 'zoom') applyWindowZoom({ win, Menu, request: event });
  };
  const state = () => Object.fromEntries(['actual-size', 'actual-size-numpad', 'zoom-in', 'zoom-out'].map(id => [id, byId.get(id).enabled]));
  return { click, state, level: () => level, items, win, Menu, menu, byId };
}

test('wTi after each step and reset: Zoom In greys out at ×5, Zoom Out at ×.25, Actual Size while zoomed', () => {
  const h = harness();
  assert.deepEqual(h.state(), { 'actual-size': false, 'actual-size-numpad': false, 'zoom-in': true, 'zoom-out': true });
  h.click('Zoom In');
  assert.equal(h.level(), 0.5);
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': true, 'zoom-out': true });
  for (let i = 0; i < 16; i++) h.click('Zoom In');
  assert.equal(h.level(), 8.5);
  assert.equal(h.state()['zoom-in'], true, 'one step below the limit');
  h.click('Zoom In');
  assert.equal(h.level(), zoom.ZOOM_LEVEL_MAX, 'the step past 9 clamps to O4n');
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': false, 'zoom-out': true });
  // The hidden ⌘= twin still fires (no id, no enabled) and stays clamped.
  h.click('Zoom In (indie cooler version)');
  assert.equal(h.level(), zoom.ZOOM_LEVEL_MAX);
  assert.equal(h.state()['zoom-in'], false);
  h.click('Zoom Out');
  assert.equal(h.level(), 8.5);
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': true, 'zoom-out': true });
  h.click('Actual Size');
  assert.equal(h.level(), 0);
  assert.deepEqual(h.state(), { 'actual-size': false, 'actual-size-numpad': false, 'zoom-in': true, 'zoom-out': true });
  for (let i = 0; i < 15; i++) h.click('Zoom Out');
  assert.equal(h.level(), -7.5);
  assert.equal(h.state()['zoom-out'], true);
  h.click('Zoom Out (numpad)');
  assert.equal(h.level(), zoom.ZOOM_LEVEL_MIN, 'the step past -8 clamps to D4n');
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': true, 'zoom-out': false });
  h.click('Actual Size (numpad)');
  assert.deepEqual(h.state(), { 'actual-size': false, 'actual-size-numpad': false, 'zoom-in': true, 'zoom-out': true });
  // wTi touches only its four ids.
  for (const label of ['Zoom In (indie cooler version)', 'Zoom In (numpad)', 'Zoom Out (numpad)']) assert.equal(h.items.find(item => item.label === label).enabled, undefined, label);
});

test('wTi guards: no live view or no application menu leaves the items alone', () => {
  const h = harness();
  h.byId.get('zoom-in').enabled = 'untouched';
  refreshZoomMenu(undefined, h.Menu);
  refreshZoomMenu({ webContents: { isDestroyed: () => true, getZoomLevel: () => zoom.ZOOM_LEVEL_MAX } }, h.Menu);
  assert.equal(h.byId.get('zoom-in').enabled, 'untouched');
  assert.doesNotThrow(() => refreshZoomMenu(h.win, { getApplicationMenu: () => null }));
  // An item missing from the menu is skipped (n&&(n.enabled=r)).
  const seen = [];
  refreshZoomMenu(h.win, { getApplicationMenu: () => ({ getMenuItemById: id => { seen.push(id); return null; } }) });
  assert.deepEqual(seen, ['actual-size', 'actual-size-numpad', 'zoom-in', 'zoom-out']);
});

test('menuZoomLevel / applyWindowZoom / settleWindowZoom: reads the live main level, syncs every live window before settling, and re-applies on focus ({delta:0})', () => {
  const trace = [];
  const makeWindow = (name, initialLevel = 0, { windowDestroyed = false, contentsDestroyed = false } = {}) => {
    let level = initialLevel;
    return {
      name,
      isDestroyed: () => windowDestroyed,
      webContents: {
        isDestroyed: () => contentsDestroyed,
        getZoomLevel: () => level,
        setZoomLevel: next => { level = next; trace.push("set:" + name + ":" + next); },
        getZoomFactor: () => 1.2 ** level,
      },
    };
  };
  const win = makeWindow('main', 0);
  const secondMain = makeWindow('main-2', -1);
  const popout = makeWindow('popout', 1);
  const deadWin = makeWindow('dead-win', 0, { windowDestroyed: true });
  const deadContents = makeWindow('dead-contents', 0, { contentsDestroyed: true });

  assert.equal(menuZoomLevel(null), undefined);
  assert.equal(menuZoomLevel(deadWin), undefined);
  assert.equal(menuZoomLevel(deadContents), undefined);
  assert.equal(menuZoomLevel(win), 0);

  const h = harness();
  const hints = [], emitted = [];
  const windows = [win, secondMain, deadWin, popout, deadContents];
  const runZoom = request => applyWindowZoom({
    win,
    windows,
    request,
    Menu: h.Menu,
    placeTrafficLights: w => trace.push("lights:" + w.name + ":" + w.webContents.getZoomLevel()),
    zoomSettled: () => {
      trace.push("settled:" + win.webContents.getZoomLevel());
      settleWindowZoom({
        win,
        Menu: h.Menu,
        rememberZoomHint: factor => hints.push(factor),
        emit: event => emitted.push(event),
      });
    },
  });

  runZoom({ delta: ZOOM_STEP });
  assert.equal(menuZoomLevel(win), 0.5);
  assert.equal(secondMain.webContents.getZoomLevel(), 0.5);
  assert.equal(popout.webContents.getZoomLevel(), 0.5);
  assert.deepEqual(trace, [
    'set:main:0.5',
    'lights:main:0.5',
    'set:main-2:0.5',
    'lights:main-2:0.5',
    'set:popout:0.5',
    'lights:popout:0.5',
    'settled:0.5',
  ], 'every live window gets setZoomLevel + placeTrafficLights before zoomSettled runs');
  assert.equal(hints.length, 1);
  assert.equal(emitted.at(-1)?.kind, 'zoom-factor');
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': true, 'zoom-out': true });

  // Focus re-apply ({delta:0}) clamps an out-of-range level without stepping and refreshes the menu at O4n.
  trace.length = 0;
  win.webContents.setZoomLevel(40);
  trace.length = 0;
  runZoom({ delta: 0 });
  assert.equal(win.webContents.getZoomLevel(), zoom.ZOOM_LEVEL_MAX);
  assert.equal(secondMain.webContents.getZoomLevel(), zoom.ZOOM_LEVEL_MAX);
  assert.equal(popout.webContents.getZoomLevel(), zoom.ZOOM_LEVEL_MAX);
  assert.deepEqual(h.state(), { 'actual-size': true, 'actual-size-numpad': true, 'zoom-in': false, 'zoom-out': true });

  // A destroyed main window is a no-op.
  trace.length = 0;
  assert.equal(applyWindowZoom({ win: deadWin, windows, request: { reset: true }, Menu: h.Menu }), undefined);
  assert.equal(settleWindowZoom({ win: deadWin, Menu: h.Menu }), undefined);
  assert.deepEqual(trace, []);
});

test('main.cjs wiring: installAppMenu, applyZoom and zoomSettled delegate to r4h-main-glue.cjs', () => {
  const main = readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(main, /const \{ menuZoomLevel, settleWindowZoom, applyWindowZoom, archiveParentCascade \} = require\("\.\/r4h-main-glue\.cjs"\);/);
  assert.equal(occurrences(main, 'zoomLevel: menuZoomLevel(win, liveContents),'), 1);
  assert.equal(occurrences(main, 'settleWindowZoom({ win, Menu, isLive: liveContents, zoomFactorOf, rememberZoomHint, emit });'), 1);
  assert.ok(main.includes('applyWindowZoom({'), 'applyZoom delegates to applyWindowZoom');
});
