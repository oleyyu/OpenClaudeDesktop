// w10-shell-frame-root: the frame root's style variables follow 3.6556.2 shared-22-Bwn3sJTG.js oR (notdone 78);
// w11-frame-root-cont: the root writes oR's data-collapsed / data-sidebar-density and the collapsed frame is the official one.
// Source-text checks only (main.jsx is not rendered here); the official chunks are read as text, never executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ionSource, sharedFrame } from '../scripts/official-3.6556.2.mjs';
import { effectiveSidebarWidth, trafficLightSpacerWidth } from '../src/sidebar-width-model.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = fs.readFileSync(path.join(appRoot, 'src/main.jsx'), 'utf8');
const official = (file) => fs.readFileSync(path.join(ionSource, file), 'utf8');

// The frame root: the <div> whose className builds "desktop-app dframe-root draggable-none", up to its opening tag's end.
function frameRoot() {
  const start = main.indexOf('"desktop-app dframe-root draggable-none"');
  assert.ok(start > 0, 'frame root className');
  const open = main.lastIndexOf('<div', start);
  const end = main.indexOf('\n    >\n', start);
  assert.ok(open > 0 && end > start, 'frame root opening tag');
  return main.slice(open, end);
}
function rootStyle() {
  const block = frameRoot();
  const at = block.indexOf('style={{');
  assert.ok(at > 0, 'frame root style');
  return block.slice(at + 'style={'.length, block.lastIndexOf('}}') + 1);
}

test('official oR writes the five frame variables and the root attributes', () => {
  const t = official('shared-22-Bwn3sJTG.js');
  assert.ok(t.includes('{"--df-sidebar-width":ne,"--df-sidebar-floor":V,"--df-traffic-light-spacer":re,"--df-window-border":ie,"--df-drag-ghost-z":Wi}'));
  assert.ok(t.includes('className:"dframe-root draggable-none","data-collapsed":F,"data-experiment":I,"data-wco":L,"data-web":ee,"data-fullscreen":R,'));
  assert.ok(t.includes('s=zn(),c=En(lR)'));
  assert.ok(t.includes('function lR(e){return e.sidebarFloor}'));
  assert.ok(t.includes('isFullscreen:h,needsTrafficLightPadding:g,trafficLightSpacerWidth:_,zoomFactor:v}=Mf()'));
  assert.ok(t.includes('(0px, calc(${_}px - 1000 * max(0px, var(--app-top-offset, 0px) - 48px)))`,ie=J2($,11,g,v)?K2($,11,g,v,XL({macAppInWindow:g,zoomFactor:v})):$[13]'));
  assert.ok(t.includes('function XL({macAppInWindow:e,zoomFactor:t}){return e?`${1/t}px`:"0px"}'));
  // Bindings: zn = shared-52 x_ (max(sidebarWidth, sidebarFloor)), Mf = shared-10 Gn, Wi = shared-46 kj = au + 1, au = 9e3.
  assert.ok(t.includes('lh as zn') && t.includes('wa as Mf') && t.includes('yr as Wi'));
  const s52 = official('shared-52-uHFNjl7C.js');
  assert.ok(s52.includes('x_ as lh') && s52.includes('function x_(){return q(S_)}function S_(e){return Math.max(e.sidebarWidth,e.sidebarFloor)}'));
  const s10 = official('shared-10-D6FXWZph.js');
  assert.ok(s10.includes('Gn as wa') && s10.includes('Wn=74') && s10.includes('let u=t&&!n') && s10.includes('u?Math.round(Wn/Math.min(i,1)):0'));
  const s46 = official('shared-46-BIbZBGFq.js');
  assert.ok(s46.includes('kj as yr') && s46.includes('Oj=T("popover"),kj=U+1;') && s46.includes('au as U'));
  const frame = official(sharedFrame);
  assert.ok(frame.includes('Pf=100,Ff=9e3,') && frame.includes('Ff as au'));
});

test('main.jsx frame root writes each official variable once', () => {
  const block = frameRoot();
  for (const name of ['--df-sidebar-width', '--df-sidebar-floor', '--df-traffic-light-spacer', '--df-window-border', '--df-drag-ghost-z']) {
    assert.equal(block.split(`"${name}"`).length - 1, 1, name);
  }
  assert.match(block, /"--df-sidebar-floor": sidebarFloor \+ "px"/);
  assert.match(block, /"--df-drag-ghost-z": 9001/);
});

test('the root style evaluates to the official values (window, full screen, zoom)', () => {
  const expr = rootStyle();
  const evaluate = new Function('effectiveSidebarWidth', 'sidebarWidth', 'sidebarFloor', 'fullScreen', 'trafficLightSpacer', 'zoomFactor', `return (${expr});`);
  const at = ({ width = 288, floor = 200, fullScreen = false, zoom = 1 } = {}) =>
    evaluate(effectiveSidebarWidth, width, floor, fullScreen, trafficLightSpacerWidth(zoom), zoom);
  const plain = at();
  // Exactly oR's five variables: the F08 --df-peek-top / -left / -bridge-top placement is gone with the F08 card.
  assert.deepEqual(Object.keys(plain), ['--df-sidebar-width', '--df-sidebar-floor', '--df-traffic-light-spacer', '--df-window-border', '--df-drag-ghost-z']);
  assert.equal(plain['--df-sidebar-width'], '288px');
  assert.equal(plain['--df-sidebar-floor'], '200px');
  assert.equal(plain['--df-traffic-light-spacer'], 'max(0px, calc(74px - 1000 * max(0px, var(--app-top-offset, 0px) - 48px)))');
  assert.equal(plain['--df-window-border'], '1px');
  assert.equal(plain['--df-drag-ghost-z'], 9001);
  // x_: a floor wider than the stored width wins.
  assert.equal(at({ width: 220, floor: 260 })['--df-sidebar-width'], '260px');
  assert.equal(at({ width: 220, floor: 260 })['--df-sidebar-floor'], '260px');
  // Gn: zoomed out the spacer is round(74 / zoom); XL: 1 / zoom.
  const zoomed = at({ zoom: 0.8 });
  assert.equal(zoomed['--df-traffic-light-spacer'], 'max(0px, calc(93px - 1000 * max(0px, var(--app-top-offset, 0px) - 48px)))');
  assert.equal(zoomed['--df-window-border'], '1.25px');
  // Full screen: needsTrafficLightPadding is false, so the spacer is 0 and the window border 0px.
  const full = at({ fullScreen: true, zoom: 0.8 });
  assert.equal(full['--df-traffic-light-spacer'], 'max(0px, calc(0px - 1000 * max(0px, var(--app-top-offset, 0px) - 48px)))');
  assert.equal(full['--df-window-border'], '0px');
});

test('the root carries the official draggable-none class (oR className "dframe-root draggable-none")', () => {
  const block = frameRoot();
  assert.equal(block.split('"desktop-app dframe-root draggable-none"').length - 1, 1);
  // The collapsed state is the data-collapsed attribute (below), not the old local .sidebar-collapsed class.
  assert.doesNotMatch(main, /sidebar-collapsed/);
  // The loaded c6a992d55 sheet supplies the rule; the titlebars' own drag regions are descendants and still win.
  const loaded = fs.readFileSync(path.join(appRoot, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8');
  assert.ok(loaded.includes('.draggable-none{-webkit-app-region:no-drag;app-region:no-drag}'));
});

// Collapsed layout (w11-frame-root-cont). 3.6556.2 keys it on the root's data-collapsed (oR `"data-collapsed":F`):
// .dframe-sidebar becomes the trigger pill holding the collapsed chrome (shared-22 GI renders shared-21 CI there in place
// of its titlebar) and .dframe-sidebar-body the full-height drawer of width --df-peek-width (shared-styles-D_GJawPO.css).
const sharedStyles = fs.readFileSync(path.join(appRoot, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8');
const style = fs.readFileSync(path.join(appRoot, 'src/style.css'), 'utf8');
const uncommented = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('official: oR writes data-collapsed / data-sidebar-density; GI puts CI (Sy) in the aside; main ends with the no-drag strip', () => {
  const s22 = official('shared-22-Bwn3sJTG.js');
  assert.ok(s22.includes('"data-variant":z,"data-lights-follow":B,"data-sidebar-density":m,style:H'));
  assert.ok(s22.includes('l?I?null:o(Sy,{withNavButtons:X,onPointerEnter:ve,onClusterPointerEnter:ge})'));
  assert.ok(s22.includes('children:[pt,Ge,mt,ht,gt,Ut,Wt]'), 'aside: bridge, titlebar-or-pill, …, body');
  assert.ok(s22.includes('ho as Sy') && s22.includes('o("div",{className:"dframe-peek-nodrag","aria-hidden":!0})'));
  const s21 = official('shared-21-R7LldJ05.js');
  assert.ok(s21.includes('CI as ho'));
  for (const feature of ['className:"df-collapsed-chrome flex items-center",onPointerEnter:r,children:[f,p]',
    'className:"df-collapsed-nav draggable-none relative flex items-center",children:u(xI,{})',
    '"data-testid":"sidebar-compact-trigger"', '"df-compact-trigger draggable-none"',
    '"--df-trigger-right"', '"--df-nav-extent"', '"--df-trigger-right-derived"']) assert.ok(s21.includes(feature), feature);
  // cc43287c9 Vh: the session header is the frame's top-left pane header.
  const titlebar = official('cc43287c9-Me-M2ucD.js');
  assert.ok(titlebar.includes('Dt=c||void 0') && titlebar.includes('"data-top-left":Dt'));
  for (const rule of ['.dframe-root[data-collapsed] .dframe-sidebar{width:auto;bottom:auto;top:calc(10px + var(--df-chrome-bar-height));',
    'inset-inline-start:var(--df-collapsed-left);overflow:visible}',
    '.dframe-root[data-collapsed]{--df-peek-width:min(var(--df-sidebar-width), max(100vw, var(--df-sidebar-floor,0px)))}',
    'width:var(--df-peek-width);height:var(--app-content-height,100dvh);max-height:none;padding:calc(var(--df-peek-band) + 4px) 8px 6px;',
    '.dframe-root[data-variant=web][data-collapsed]:not([data-wco]) .df-compact-trigger,.dframe-root[data-variant=web][data-collapsed]:not([data-wco]) .df-collapsed-nav{z-index:1}',
    '.dframe-root[data-collapsed] .dframe-pane-primary .epitaxy-root [data-top-left]{margin-left:calc(var(--df-traffic-light-spacer,74px) + 38px + var(--df-nav-extent,0px))',
    '.dframe-peek-nodrag{display:none}', '.dframe-root[data-collapsed][data-hovering]:not([data-web]) .dframe-peek-nodrag{',
    '.dframe-root[data-collapsed] .dframe-resize-handle{display:none}',
    '.dframe-root[data-variant=web][data-collapsed]:not([data-wco]) .df-peek-mode-switch{top:0;height:var(--df-peek-band);align-items:center;margin:0;position:absolute;inset-inline-end:8px}',
    '.dframe-sidebar{top:calc(8px + var(--df-chrome-bar-height));']) assert.ok(sharedStyles.includes(rule), rule);
});

test('main.jsx: the root writes data-collapsed and data-sidebar-density; the aside gets the chrome, the titlebar and viewer none', () => {
  const block = frameRoot();
  assert.equal(block.split('data-collapsed=').length - 1, 1);
  // w13-close-chat-surface (E77): no collapsed frame while the window is incognito either (shared-78 vK unmounts the
  // frame shell, source-incognito-shell.jsx frameShellMounted).
  assert.match(block, /data-collapsed=\{effectiveCollapsed && !NO_SIDEBAR && frameShellMounted\(\{ isIncognito: incognitoShell \}\) \|\| undefined\}/);
  assert.match(block, /data-sidebar-density="compact"/);
  // The aside writes the same density (oR m and GI be are both Ha()).
  assert.match(fs.readFileSync(path.join(appRoot, 'src/source-sidebar.jsx'), 'utf8'), /className="app-sidebar dframe-sidebar source-sidebar cds-root" aria-label=\{t\("Sidebar"\)\} data-variant="web" data-density="compact"/);
  // SourceCollapsedChrome is rendered once, for SourceSidebar's collapsedChrome.
  assert.equal(main.split('<SourceCollapsedChrome').length - 1, 1);
  assert.match(main, /collapsedChrome=\{effectiveCollapsed \? <SourceCollapsedChrome onExpand=\{expandSidebar\} peekOpen=\{peek\.hovering\} onPeekEnter=\{peekEnter\} onPeekLeave=\{peekLeave\}/);
  const titlebar = main.slice(main.indexOf('<SourceTitlebar surface={mode}'), main.indexOf('/>', main.indexOf('<SourceTitlebar surface={mode}')));
  assert.doesNotMatch(titlebar, /peekOpen|onPeekEnter|onPeekLeave/);
  assert.match(main, /viewerNavigation=\{null\}/);
  // oR: main.dframe-content ends with the no-drag strip.
  assert.match(main, /<div className="dframe-peek-nodrag" aria-hidden="true" \/>\n      <\/main>\n      <\/SourceSplitHost>/);
});

test('style.css: the F08 port is gone; one rule returns the host aside to the official pill box', () => {
  const css = uncommented(style);
  assert.doesNotMatch(css, /sidebar-collapsed/);
  assert.doesNotMatch(css, /280px/);
  assert.doesNotMatch(css, /--df-peek-(top|left|bridge-top)/);
  assert.doesNotMatch(css, /\.dframe-peek-bridge|\.df-peek-mode-switch|\.dframe-resize-handle|\.df-collapsed-chrome/, 'the official rules lay these out');
  // Every remaining [data-collapsed] rule is this one: the expanded .app-sidebar.dframe-sidebar (in-flow, relative,
  // 100% high, 0.5px border) back to base .dframe-sidebar position:absolute with no height or border.
  assert.deepEqual(css.match(/[^}]*\[data-collapsed\][^{]*\{[^}]*\}/g).map((rule) => rule.trim()),
    ['.dframe-root[data-collapsed] .app-sidebar.dframe-sidebar {\n  position: absolute;\n  height: auto;\n  border-right: 0;\n}']);
  assert.match(css, /\.app-sidebar\.dframe-sidebar \{\n  position: relative;[\s\S]*?height: 100%;[\s\S]*?border-right: 0\.5px solid var\(--app-line\);/);
  // A popout or pane window has no sidebar; its titlebar keeps the traffic-light clearance.
  assert.match(css, /\[data-session-popout\]:not\(\[data-fullscreen\]\) \.workspace-toolbar,\n\[data-pane-window\]:not\(\[data-fullscreen\]\) \.workspace-toolbar \{\n  padding-left: calc\(var\(--df-traffic-light-spacer, 74px\) \+ 14px\);\n\}/);
});
