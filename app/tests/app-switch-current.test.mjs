import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSwitchProps, createAppSwitchPress, SIDEBAR_TAB_ACTIVITY_DOTS, surfaceChordMatcher, surfaceChordTarget } from '../src/app-switch-model.mjs';
import { extractAppSwitch } from '../scripts/extract-app-switch.mjs';
import { extractCurrentCodeHelpers } from '../scripts/extract-code-ui-current.mjs';
import { pinSurfaceChordHelper, surfaceChordPins } from '../scripts/code-current-surface-chord-pins.mjs';
import * as Chord from '../src/generated/code-current/surface-chord.mjs';
import { designSnapshot } from '../scripts/current-design-assets.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// R2-appswitch W1 (decision D11): the macOS titlebar's compact Chat/Code switch is the 3.6556.2 (migration
// w2-appswitch-split, TF-C13/C14) shared-21 lT over shared-18 df-app-switch (jC) and the view-tabs CDS SegmentedControl. Source/AST, SSR, a hook-level
// fixture for the controlled press and pure functions only: no browser, no Electron, no network.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/app-switch');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
// The 2.42304.0 originals the code-current surface chord (W3) and the host's older notes still quote.
const previous = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const rawPrevious = file => fs.readFileSync(path.join(previous, file), 'utf8');

let server, Switch, Frame, Host, SourceSidebar, CdsDensityContext, CdsTooltipProvider;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Switch = await server.ssrLoadModule('/src/generated/app-switch/app-switch.mjs');
  Frame = await server.ssrLoadModule('/src/generated/app-switch/app-switch-frame.mjs');
  Host = await server.ssrLoadModule('/src/source-app-switch.jsx');
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
  ({ CdsDensityContext, CdsTooltipProvider } = await server.ssrLoadModule('/src/generated/view-tabs/index.js'));
});
after(async () => { await server?.close(); });

// A hook dispatcher over one component call (as tests/sessions-page-current.test.mjs), so a controlled event can
// drive the real host container and the original frame without a DOM renderer.
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: c => contexts.has(c) ? contexts.get(c) : c._currentValue,
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    useSyncExternalStore(subscribe, snapshot, server) { return (server ?? snapshot)(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
    try { return tree = component(props); } finally { internal.H = old; }
  };
  render();
  return { get tree() { return tree; }, props, render, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach(c => c?.cleanup?.()); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const radios = html => [...html.matchAll(/<span[^>]*role="radio"[^>]*>/g)].map(m => m[0]);
const hiddenInputs = html => [...html.matchAll(/<input type="radio"[^>]*>/g)].map(m => m[0]);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

test('manifest pins the 3.6556.2 originals, the shared view-tabs names (compiler helpers included), two adapters and the asset rewrite', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  // owner-window.mjs (shared-25 ownerWindow) and cds-density.mjs (shared-frame useCdsDensity) are published by the
  // 3.6556.2 view-tabs graph, so they are imported from it rather than emitted (D1).
  const expected = {
    'define-messages.mjs': ['vendor-intl-DYfox5Co.js', ['tn']],
    'dot-kind.mjs': ['shared-4-DUB1Oi0O.js', ['jS']],
    'boot-fade.mjs': ['shared-5-Bg6ZMqvt.js', ['pS']],
    'hub-look.mjs': ['shared-78-D5Fw2h0a.js', ['$f', 'tp', 'cp']],
    'app-switch-frame.mjs': ['shared-18-D3y8YMFN.js', ['Gv', 'Kv', 'jC', 'MC', 'NC', 'PC', 'FC', 'WC', 'GC', 'KC']],
    'app-switch.mjs': ['shared-21-R7LldJ05.js', ['kw', 'Aw', 'Uw', 'Ww', 'nT', 'lT', 'uT', 'dT', 'mT']],
  };
  assert.deepEqual(manifest.modules.map(m => m.target), Object.keys(expected));
  assert.deepEqual(fs.readdirSync(directory).sort(), [...Object.keys(expected), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    const [source, bindings] = expected[module.target];
    assert.equal(module.source, source, module.target);
    assert.equal(module.referenceVersion, '3.6556.2');
    assert.equal(sha(fs.readFileSync(path.join(reference, source))), module.sourceSha256, module.target);
    const text = fs.readFileSync(path.join(directory, module.target), 'utf8');
    assert.equal(sha(text), module.sha256, module.target);
    assert.ok(text.startsWith(`// Original Claude Desktop 3.6556.2 bindings from ${source}; generated by extract-app-switch.mjs.\n`), module.target);
    assert.deepEqual(module.bindings.map(b => b.name), bindings, module.target);
  }
  const imports = manifest.modules.flatMap(m => m.imports.map(i => ({ ...i, target: m.target })));
  // D1: everything the shared graph owns is imported by its semantic public name, from the file that publishes it.
  const shared = imports.filter(i => i.kind === 'view-tabs');
  const helpers = new Set(['reactMemoCache', 'memoSentinel', 'memoIsEmpty', ...[1, 2, 3, 4, 5].flatMap(n => [`memoChanged${n}`, `memoStoreValueFirst${n}`, `memoStoreDeps${n}`]), ...[0, 1, 2, 3, 4, 5].map(n => `memoStore${n}`)]);
  assert.deepEqual([...new Set(shared.filter(i => !helpers.has(i.name)).map(i => `${i.target}:${i.name}`))].sort(), [
    'app-switch-frame.mjs:clsx', 'app-switch-frame.mjs:ownerWindow', 'app-switch-frame.mjs:useMergedRefs', 'app-switch.mjs:CdsPulse',
    'app-switch.mjs:CdsSegmentedControl', 'app-switch.mjs:useCdsDensity'].sort());
  // E3: the React Compiler memo cache and slot helpers come from view-tabs too; both compiled modules read J9.
  assert.deepEqual(shared.filter(i => i.name === 'reactMemoCache').map(i => i.target).sort(), ['app-switch-frame.mjs', 'app-switch.mjs']);
  for (const entry of shared) {
    const published = viewTabs.publicNames[entry.name];
    assert.ok(published, entry.name);
    assert.equal(entry.from, `../view-tabs/${published.file}`, entry.name);
    assert.equal(entry.original, published.local, entry.name);
  }
  assert.deepEqual([viewTabs.publicNames.CdsSegmentedControl.local, viewTabs.publicNames.CdsPulse.local, viewTabs.publicNames.useCdsDensity.local, viewTabs.publicNames.reactMemoCache.local], ['Vj', 'mL', 'Ha', 'J9']);
  // R3: React comes only from the 3.6556.2 vendor-frame aliases (Co useRef, bo useLayoutEffect, fo useContext, Ha jsx, to createContext).
  assert.deepEqual([...new Set(imports.filter(i => i.kind === 'react').map(i => `${i.name}<${i.via}`))].sort(), [
    'createContext<vendor-frame-CnSY1sxv.js:to', 'jsx<vendor-frame-CnSY1sxv.js:Ha', 'useContext<vendor-frame-CnSY1sxv.js:fo',
    'useLayoutEffect<vendor-frame-CnSY1sxv.js:bo', 'useRef<vendor-frame-CnSY1sxv.js:Co']);
  // Host adapters: react-intl useIntl and the fizzy-lake part check (E12: Qm = [], always off).
  assert.deepEqual(imports.filter(i => i.kind === 'adapter').map(i => [i.target, i.name, i.via]), [
    ['app-switch-frame.mjs', 'isFizzyLakePart', 'shared-52-uHFNjl7C.js:og'], ['app-switch.mjs', 'useIntl', 'vendor-intl-DYfox5Co.js:p']]);
  assert.ok(imports.every(i => ['react', 'view-tabs', 'adapter', 'generated'].includes(i.kind)));
  // The clay sprite: original `/assets/v1/` path addressed relative to the page; the file is the public copy.
  const frame = manifest.modules.find(m => m.target === 'app-switch-frame.mjs');
  assert.deepEqual(frame.rewrites, [{ binding: 'MC', from: '"/assets/v1/', to: '"./assets/v1/', asset: 'assets/v1/c25011d97-Dg-b7-mk.png' }]);
  assert.ok(fs.existsSync(path.join(app, 'public/assets/v1/c25011d97-Dg-b7-mk.png')));
  assert.ok(fs.existsSync(path.join(reference, 'c25011d97-Dg-b7-mk.png')), 'the 3.6556.2 snapshot ships the same sprite name');
  const frameText = fs.readFileSync(path.join(directory, 'app-switch-frame.mjs'), 'utf8');
  assert.match(frameText, /var MC = "\.\/assets\/v1\/c25011d97-Dg-b7-mk\.png";/);
  // R6: generated output imports view-tabs from its concrete 3.6556.2 files, never a legacy 2.42304.0 shim.
  for (const name of fs.readdirSync(directory).filter(f => f.endsWith('.mjs')))
    assert.doesNotMatch(fs.readFileSync(path.join(directory, name), 'utf8'), /BfjMqbuN|DfPJ1QmD|CTKbbUUg|DP8p7i1Z/, name);
  assert.doesNotMatch(frameText, /"\/assets\/v1\//);
});

test('the extractor reproduces the committed output and pins the container, home name, press and titlebar call site', async () => {
  const checked = await extractAppSwitch({ check: true });
  assert.deepEqual(checked, manifest);
  assert.deepEqual(manifest.callSites.map(s => `${s.source}:${s.binding}`), [
    'shared-21-R7LldJ05.js:fT', 'shared-21-R7LldJ05.js:Vw', 'shared-78-D5Fw2h0a.js:$Y', 'shared-6-sd9jbJqs.js:uM', 'shared-22-Bwn3sJTG.js:GI']);
  // The container reads the current mode through $Y (pressed first) and presses through uM, as the host replica does.
  assert.deepEqual(manifest.callSites[0].imports, { lc: 'shared-78-D5Fw2h0a.js:_a ($Y)', ju: 'shared-6-sd9jbJqs.js:Fa (uM)' });
  const gi = manifest.callSites.at(-1);
  assert.deepEqual(gi.imports, { j_: 'shared-21-R7LldJ05.js:Sc (fT)', R: 'shared-frame-6jtSkIit.js:ql (xh)', Ys: 'shared-5-Bg6ZMqvt.js:oo (pS)' });
  assert.equal(viewTabs.publicNames.CdsTooltipProvider.export, 'ql');
  // R2: minified statements are pinned through looseFeature (recorded as {loose}), stable strings literally.
  assert.ok(manifest.callSites[0].features.some(f => f.loose === 'F = r === "code" || S !== null ? "code" : l'));
  assert.ok(manifest.callSites[0].features.includes('sidebar_surface: "desktop_frame"'));
});

test('official strings: the raw 3.6556.2 chunks still carry what the generated modules and the host follow', () => {
  const s21 = raw('shared-21-R7LldJ05.js'), s18 = raw('shared-18-D3y8YMFN.js'), s22 = raw('shared-22-Bwn3sJTG.js');
  for (const needle of ['"data-compact-mode-switcher":!0', '"data-chorus-callout":"pills"', 'icon:"Chats"', 'tooltipSide:"bottom"',
    '"cmd+alt+left"', '"cmd+alt+right"', 'defaultMessage:"Claude",id:"4PjoX4rZSt"', 'defaultMessage:"Mode",id:"mrOnjMzgC4"',
    'claudeai.desktop.sidebar.mode_pill_selected', 'sidebar_surface:"desktop_frame"']) assert.ok(s21.includes(needle), needle);
  assert.doesNotMatch(s21, /[{,]surface:"desktop_frame"/, 'the telemetry field is renamed sidebar_surface (the host sends none)');
  assert.match(rawPrevious('shared-21-IP-SVetq.js'), /[{,]surface:"desktop_frame"/);
  // TF-C13: the activity dot asks the needs-you colour (WC, fizzy-lake `type` part) before the hub-look mapping.
  assert.ok(s18.includes('function WC(e){return GC()?"blue":e}') && s18.includes('function GC(){return aa("type")}'));
  for (const needle of ['"df-app-switch"', `querySelectorAll("[role='radio']")`, '"/assets/v1/c25011d97-Dg-b7-mk.png"']) assert.ok(s18.includes(needle), needle);
  for (const needle of ['"df-titlebar draggable h-11 shrink-0 flex items-center px-2"', '"flex items-center"', '"df-titlebar-switch"']) assert.ok(s22.includes(needle), needle);
  assert.ok(raw('shared-5-Bg6ZMqvt.js').includes('"static-composer-boot-fade"'));
  assert.ok(raw('shared-frame-6jtSkIit.js').includes('"SegmentedControl")'));
  assert.ok(raw('shared-52-uHFNjl7C.js').includes('Qm=[]'), 'E12: the fizzy-lake allow-list is empty');
  const generated = fs.readFileSync(path.join(directory, 'app-switch.mjs'), 'utf8');
  for (const needle of ['icon: "Chats"', 'tooltipSide: "bottom"', 'className: "df-tab-dot-running"', '"{tab}, working"']) assert.ok(generated.includes(needle), needle);
});

test('CSS: the df-app-switch rules come from the loaded official stylesheet, every rendered class exists there, no local mode-switch rule', () => {
  const sharedStyles = fs.readFileSync(path.join(app, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8');
  assert.equal(sharedStyles, fs.readFileSync(path.resolve(app, '../reference', designSnapshot, 'ion-dist/assets/v1/shared-styles-D_GJawPO.css'), 'utf8'));
  assert.match(fs.readFileSync(path.join(app, 'index.html'), 'utf8'), /href="\/assets\/v1\/shared-styles-D_GJawPO\.css"/);
  for (const rule of ['.df-app-switch{--cds-radius:999px}', 'span[role=radio][data-mode=code][data-checked] [data-cds=Icon]{font-weight:var(--df-app-switch-code-weight,700)!important}'])
    assert.ok(sharedStyles.replace(/"/g, '').includes(rule.replace(/"/g, '')), rule);
  const style = fs.readFileSync(path.join(app, 'src/style.css'), 'utf8');
  assert.doesNotMatch(style, /\.mode-switch\b/);
  // Every class the switch renders is defined by one of the five loaded official stylesheets (no legacy utility).
  const css = ['c6a992d55-Che1orl5.css', 'shared-styles-D_GJawPO.css', 'shared-frame-CegduNQ2.css', 'c3fde7009-BszyXGym.css', 'c8e31bf58-C7gq8dUF.css']
    .map(f => fs.readFileSync(path.join(app, 'public/assets/v1', f), 'utf8')).join('\n');
  const html = renderToStaticMarkup(React.createElement(Host.SourceAppSwitch, { mode: 'code', homeMode: 'cowork', onMode() {} }));
  const classes = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].replace(/&amp;/g, '&').split(/\s+/)).filter(Boolean));
  assert.ok(classes.size > 30);
  const esc = c => '.' + c.replace(/[^a-zA-Z0-9_-]/g, ch => '\\' + ch);
  const missing = [...classes].filter(c => !['{', ':', ',', ' ', '[', '>', '.', ')'].some(after => css.includes(esc(c) + after)));
  assert.deepEqual(missing, []);
});

test('bC (appSwitchShortcutHint): cmd+alt toward the other segment, mirrored in RTL, none for the current, disabled, discovery or a non-desktop host', () => {
  const hint = Switch.appSwitchShortcutHint, modes = ['cowork', 'code'];
  assert.equal(hint({ mode: 'cowork' }, 0, 1, true, modes), 'cmd+alt+left');
  assert.equal(hint({ mode: 'code' }, 1, 0, true, modes), 'cmd+alt+right');
  assert.equal(hint({ mode: 'cowork' }, 0, 1, true, modes, true), 'cmd+alt+right');
  assert.equal(hint({ mode: 'code' }, 1, 0, true, modes, true), 'cmd+alt+left');
  assert.equal(hint({ mode: 'code' }, 1, 1, true, modes), undefined);
  assert.equal(hint({ mode: 'code' }, 1, -1, true, modes), undefined);
  assert.equal(hint({ mode: 'code' }, 1, 0, false, modes), undefined);
  assert.equal(hint({ mode: 'code', disabled: true }, 1, 0, true, modes), undefined);
  assert.equal(hint({ mode: 'code', discoveryUpsell: {} }, 1, 0, true, modes), undefined);
  assert.equal(hint({ mode: 'chat' }, 0, 1, true, modes), undefined);
});

test('appSwitchProps follows vC: pressed wins, home/code dots by the current mode, hints only with the chord, dots off by default', () => {
  const base = { homeMode: 'cowork', homeName: 'Claude', shortcutHint: Switch.appSwitchShortcutHint };
  assert.equal(SIDEBAR_TAB_ACTIVITY_DOTS, false);
  assert.deepEqual(appSwitchProps({ ...base, mode: 'code' }), {
    homeMode: 'cowork', selected: 'code',
    home: { name: 'Claude', dot: undefined, shortcut: undefined }, code: { name: 'Code', dot: undefined, shortcut: undefined } });
  assert.equal(appSwitchProps({ ...base, mode: 'cowork' }).selected, 'cowork');
  assert.equal(appSwitchProps({ ...base, mode: 'chat', homeMode: 'chat' }).selected, 'chat');
  assert.equal(appSwitchProps({ ...base, mode: 'code', pressed: 'cowork' }).selected, 'cowork');
  assert.equal(appSwitchProps({ ...base, mode: 'cowork', pressed: 'code' }).selected, 'code');
  // Activity is ignored while the GrowthBook flag is off (the default), as the original does.
  const attention = { cowork: 'running', code: 'awaiting' };
  assert.equal(appSwitchProps({ ...base, mode: 'code', attention }).home.dot, undefined);
  assert.equal(appSwitchProps({ ...base, mode: 'code', attention, dots: true }).home.dot, 'running');
  assert.equal(appSwitchProps({ ...base, mode: 'code', attention, dots: true }).code.dot, undefined);
  assert.equal(appSwitchProps({ ...base, mode: 'cowork', attention, dots: true }).code.dot, 'awaiting');
  assert.equal(appSwitchProps({ ...base, mode: 'cowork', attention, dots: true }).home.dot, undefined);
  // The shortcut names the cmd+alt chord, offered only when the host binds it (W3); it follows the pressed mode (R).
  const chord = appSwitchProps({ ...base, mode: 'code', chord: true });
  assert.deepEqual([chord.home.shortcut, chord.code.shortcut], ['cmd+alt+left', undefined]);
  const pressed = appSwitchProps({ ...base, mode: 'code', pressed: 'cowork', chord: true, rtl: true });
  assert.deepEqual([pressed.home.shortcut, pressed.code.shortcut], [undefined, 'cmd+alt+left']);
});

test('SSR: the titlebar wrapper, df-app-switch frame and Base UI radio group of the original SegmentedControl', () => {
  const html = renderToStaticMarkup(React.createElement(Host.SourceAppSwitch, { mode: 'code', homeMode: 'cowork', onMode() {} }));
  assert.ok(html.startsWith('<div class="draggable-none static-composer-boot-fade flex ms-auto flex items-center">'
    + '<div data-compact-mode-switcher="true" data-chorus-callout="pills" class="df-app-switch flex">'), html.slice(0, 300));
  assert.equal(Host.appSwitchTitlebarClassName, 'draggable-none static-composer-boot-fade flex ms-auto flex items-center');
  const group = html.match(/<div role="radiogroup"[^>]*>/)[0];
  assert.equal(attr(group, 'data-cds'), 'SegmentedControl');
  assert.equal(attr(group, 'aria-label'), 'Mode');
  assert.equal(attr(group, 'data-size'), 'lg');
  assert.match(attr(group, 'class'), /bg-\[var\(--cds-segmented-control-track\)\] p-px/);
  const [home, code] = radios(html);
  assert.deepEqual([attr(home, 'aria-label'), attr(code, 'aria-label')], ['Claude', 'Code']);
  assert.deepEqual([attr(home, 'aria-checked'), attr(code, 'aria-checked')], ['false', 'true']);
  assert.deepEqual([attr(home, 'tabindex'), attr(code, 'tabindex')], ['-1', '0']);
  assert.ok(/\sdata-checked=""/.test(code) && /\sdata-unchecked=""/.test(home));
  const inputs = hiddenInputs(html);
  assert.equal(inputs.length, 2);
  for (const input of inputs) { assert.equal(attr(input, 'tabindex'), '-1'); assert.equal(attr(input, 'aria-hidden'), 'true'); }
  assert.deepEqual(inputs.map(i => attr(i, 'value')), ['cowork', 'code']);
  assert.match(inputs[1], /\schecked=""/);
  // Icons are CDS Icon glyphs; no aria-keyshortcuts without the chord; no disabled state; data-mode comes from yx's layout effect.
  assert.equal((html.match(/data-cds="Icon"/g) || []).length, 2);
  assert.doesNotMatch(html, /\s(?:aria-keyshortcuts|disabled|data-disabled|aria-disabled|data-mode|title)="/);
  // The thumb uses the 2.42304.0 shadow variable, not the 2.37337.1 utility missing from the current CSS.
  assert.match(html, /\[box-shadow:var\(--cds-segmented-control-thumb-shadow,/);
});

test('SSR: home segment returns to the local chat/cowork surface; comfortable density is "sm"; RTL mirrors the chord hint', () => {
  const render = props => renderToStaticMarkup(React.createElement(Host.SourceAppSwitch, { onMode() {}, ...props }));
  const cowork = render({ mode: 'cowork', homeMode: 'cowork' });
  assert.deepEqual(radios(cowork).map(r => attr(r, 'aria-checked')), ['true', 'false']);
  const chat = render({ mode: 'chat', homeMode: 'chat' });
  assert.deepEqual(hiddenInputs(chat).map(i => attr(i, 'value')), ['chat', 'code']);
  // w13-close-main-jsx-tests (cross-red-02): shared-21 cT names the home segment "Chat" (WTrOy36sdu) while rT is "chat".
  assert.equal(attr(radios(chat)[0], 'aria-label'), 'Chat');
  assert.equal(attr(chat.match(/<div role="radiogroup"[^>]*>/)[0], 'data-size'), 'lg');
  assert.equal(attr(render({ mode: 'code', density: 'comfortable' }).match(/<div role="radiogroup"[^>]*>/)[0], 'data-size'), 'sm');
  const ltr = render({ mode: 'code', homeMode: 'cowork', chord: true });
  const rtl = render({ mode: 'code', homeMode: 'cowork', chord: true, direction: 'rtl' });
  assert.match(attr(radios(ltr)[0], 'aria-keyshortcuts'), /^(Meta|Control)\+Alt\+ArrowLeft$/);
  assert.match(attr(radios(rtl)[0], 'aria-keyshortcuts'), /^(Meta|Control)\+Alt\+ArrowRight$/);
  assert.equal(attr(radios(ltr)[1], 'aria-keyshortcuts'), undefined);
});

test('SSR: the sidebar titlebar ends with the original switch; the hand-written mode-switch and its sending-disabled look are gone', () => {
  const thread = { id: 's1', name: 'Session s1', cwd: '/fixture/work', createdAt: 1, updatedAt: 1 };
  for (const mode of ['code', 'cowork', 'chat']) {
    const html = renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread], knownFolders: ['/fixture/work'], mode, onMode() {}, modeBusy: true }));
    const toolbar = html.slice(html.indexOf('<div class="sidebar-toolbar df-titlebar window-drag">'));
    assert.ok(toolbar.length > 0, mode);
    assert.ok(toolbar.indexOf('aria-label="Back"') > 0 && toolbar.indexOf('aria-label="Back"') < toolbar.indexOf(`class="${Host.appSwitchTitlebarClassName}"`), mode);
    const switchHtml = toolbar.slice(toolbar.indexOf(`class="${Host.appSwitchTitlebarClassName}"`));
    const [home, code] = radios(switchHtml);
    assert.equal(attr(mode === 'code' ? code : home, 'aria-checked'), 'true', mode);
    // No homeMode prop: SourceAppSwitch falls back to homeModeFor() = shared-21 rT's "chat" (Cowork not reported on).
    assert.equal(attr(hiddenInputs(switchHtml)[0], 'value'), 'chat', mode);
    assert.doesNotMatch(html, /class="mode-switch"|<button role="radio"/);
    assert.doesNotMatch(switchHtml.slice(0, switchHtml.indexOf('</div></div></div>')), /\s(?:disabled|data-disabled|aria-disabled)="/);
  }
  const source = fs.readFileSync(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  // W2/W3: the titlebar instance while open, the peek instance while collapsed; both bind the chord.
  assert.match(source, /\{!collapsed && <SourceAppSwitch mode=\{mode\} homeMode=\{homeMode\} onMode=\{onMode\} chord \/>\}/);
  assert.match(source, /\{collapsed && <SourceAppSwitch placement="peek" mode=\{mode\} homeMode=\{homeMode\} onMode=\{onMode\} chord \/>\}/);
  assert.equal((source.match(/<SourceAppSwitch /g) || []).length, 2);
  assert.doesNotMatch(source, /modeBusy|className="mode-switch"/);
  // main.jsx keeps the sending guard in switchMode and no longer passes a busy flag to the switch.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /async function switchMode\(next\) \{\n\s+if \(!validSurface\(next\) \|\| next === modeRef\.current \|\| sending\) return;/);
  assert.doesNotMatch(main, /modeBusy/);
});

test('press (Fk): shown at once, navigated after a 0ms tick, a refused switch springs back, a later press supersedes', async () => {
  const queue = [];
  let pressed = null;
  const press = createAppSwitchPress({ setPressed: value => { pressed = value; }, schedule: run => queue.push(run) });
  let mode = 'code', sending = false;
  const calls = [];
  const onMode = async next => { calls.push(next); if (sending || next === mode) return; mode = next; };
  const first = press('cowork', onMode);
  assert.equal(pressed, 'cowork');
  assert.deepEqual(calls, [], 'navigation waits for the timeout');
  queue.shift()();
  assert.equal(await first, true);
  assert.deepEqual([calls, mode, pressed], [['cowork'], 'cowork', null]);
  // switchMode's sending guard returns without switching: the pressed value is dropped, the real mode shows again.
  sending = true;
  const refused = press('code', onMode);
  assert.equal(appSwitchProps({ mode, pressed, homeMode: 'cowork', homeName: 'Claude' }).selected, 'code');
  queue.shift()();
  await refused;
  assert.equal(pressed, null);
  assert.equal(appSwitchProps({ mode, pressed, homeMode: 'cowork', homeName: 'Claude' }).selected, 'cowork');
  sending = false;
  // Two presses before the timeout: only the latest navigates and only it clears.
  const a = press('code', onMode), b = press('cowork', onMode);
  assert.equal(pressed, 'cowork');
  queue.shift()();
  assert.equal(await a, false);
  assert.equal(pressed, 'cowork');
  queue.shift()();
  assert.equal(await b, true);
  assert.deepEqual(calls, ['cowork', 'code', 'cowork']);
  assert.equal(pressed, null);
  // A failing host call still clears the pressed value and surfaces the error.
  const failing = press('code', () => { throw new Error('boom'); });
  queue.shift()();
  await assert.rejects(failing, /boom/);
  assert.equal(pressed, null);
});

test('controlled events through the real host container: optimistic selection, sending guard springs back, then a real switch', async () => {
  const props = { mode: 'code', homeMode: 'cowork', onMode() {} };
  const outer = fixture(Host.SourceAppSwitch, props);
  const element = nodes(outer.tree, n => typeof n.type === 'function' && n.props?.homeMode === 'cowork' && 'chord' in n.props)[0];
  assert.ok(element, 'container element');
  let sending = true;
  const calls = [];
  const containerProps = { ...element.props, onMode: async next => { calls.push(next); if (sending) return; containerProps.mode = next; } };
  const container = fixture(element.type, containerProps, new Map([[CdsDensityContext, 'compact']]));
  const view = () => container.tree.props;
  assert.equal(container.tree.type, Switch.AppSwitch);
  assert.equal(view()['data-compact-mode-switcher'], true);
  assert.equal(view()['data-chorus-callout'], 'pills');
  assert.equal(view().className, 'flex');
  assert.equal(view().size, 'lg');
  assert.deepEqual([view().selected, view().home.name, view().code.name, view().code.disabledReason], ['code', 'Claude', 'Code', undefined]);
  view().onChange('cowork');
  container.render();
  assert.equal(view().selected, 'cowork', 'the thumb moves before the host navigates');
  assert.deepEqual(calls, []);
  await tick();
  container.render();
  assert.deepEqual(calls, ['cowork']);
  assert.equal(view().selected, 'code', 'refused while sending: back to the real mode');
  sending = false;
  view().onChange('cowork');
  await tick();
  container.render();
  assert.deepEqual(calls, ['cowork', 'cowork']);
  assert.equal(view().selected, 'cowork');
  outer.close(); container.close();
});

test('AppSwitchFrame (yx) tags each radio with its mode in a layout effect and keeps it in sync through a MutationObserver', () => {
  const observers = [];
  const previous = globalThis.MutationObserver;
  globalThis.MutationObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe(target, options) { this.target = target; this.options = options; } disconnect() { this.disconnected = true; } };
  try {
    let list = [{ dataset: {} }, { dataset: {} }];
    const element = { querySelectorAll: selector => { assert.equal(selector, "[role='radio']"); return list; } };
    const outerRef = { current: null };
    const f = fixture(Frame.AppSwitchFrame, { modes: ['cowork', 'code'], ref: outerRef, className: 'flex', 'data-chorus-callout': 'pills' });
    assert.equal(f.tree.type, 'div');
    assert.equal(f.tree.props.className, 'df-app-switch flex');
    assert.equal(f.tree.props['data-chorus-callout'], 'pills');
    f.tree.props.ref(element);
    assert.equal(outerRef.current, element, 'merged ref reaches the caller');
    f.flush();
    assert.deepEqual(list.map(r => r.dataset.mode), ['cowork', 'code']);
    assert.equal(observers.length, 1);
    assert.deepEqual(observers[0].options, { childList: true, subtree: true });
    list = [{ dataset: {} }, { dataset: { mode: 'code' } }, { dataset: {} }];
    observers[0].callback();
    assert.deepEqual(list.map(r => r.dataset.mode), ['cowork', 'code', undefined]);
    f.close();
    assert.equal(observers[0].disconnected, true);
  } finally { globalThis.MutationObserver = previous; }
});

test('syncInfiniteAnimations (G_) aligns infinite animations to the owner window time origin and leaves finite ones', () => {
  const infinite = { startTime: null, effect: { getTiming: () => ({ iterations: Infinity, duration: 300 }) } };
  const finite = { startTime: null, effect: { getTiming: () => ({ iterations: 1, duration: 300 }) } };
  const target = { nodeType: 1, ownerDocument: { defaultView: { performance: { timeOrigin: 1000 } } }, getAnimations: () => [infinite, finite] };
  Frame.syncInfiniteAnimations({ target });
  assert.equal(infinite.startTime, -100);
  assert.equal(finite.startTime, null);
  Frame.syncInfiniteAnimations({ target: {} });
});

test('AppSwitchDot (kw): with fizzy-lake off the needs-you colour stays amber, so attention maps as in 2.42304.0', () => {
  assert.equal(Frame.needsYouColor('amber'), 'amber');
  assert.equal(Frame.needsYouColor('blue'), 'blue');
  assert.equal(Frame.hubAttention('awaiting'), 'ready');
  const dot = attention => renderToStaticMarkup(React.createElement(Switch.AppSwitchDot, { mode: 'cowork', attention }));
  // No hub look here: awaiting stays awaiting (warning pulse), ready the accent pulse, running the muted pulse.
  assert.match(dot('awaiting'), /--cds-fill-warning/);
  assert.match(dot('ready'), /--cds-fill-accent/);
  assert.match(dot('running'), /df-tab-dot-running/);
  assert.doesNotMatch(dot('running'), /data-kind="clay"/);
});

test('zh-CN carries the activity-dot copy the original segment builder formats', async () => {
  const { default: surfaces } = await import('../electron/i18n/zh-CN/surfaces.mjs');
  for (const key of ['{tab}, awaiting your input', '{tab}, unread activity', '{tab}, working']) assert.match(surfaces[key], /\{tab\}/, key);
  const messages = Switch.appSwitchDotMessages;
  assert.deepEqual(Object.values(messages).map(m => m.defaultMessage).sort(), ['{tab}, awaiting your input', '{tab}, unread activity', '{tab}, working']);
  assert.deepEqual(Switch.appSwitchMessages.label, { defaultMessage: 'Mode', id: 'mrOnjMzgC4' });
});

// ---- R2-appswitch W2: the collapsed sidebar's peek card carries the switch (shared-22 DN `ae`).

test('W2 SSR: collapsed, the switch opens the peek card body (df-peek-mode-switch) and leaves the titlebar; open, only the titlebar has it', () => {
  const thread = { id: 's1', name: 'Session s1', cwd: '/fixture/work', createdAt: 1, updatedAt: 1 };
  const render = props => renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread], knownFolders: ['/fixture/work'], mode: 'code', onMode() {}, ...props }));
  const bodyTag = /<div class="dframe-sidebar-body" data-testid="sidebar" id="frame-peek-popover"[^>]*>/;
  for (const peekOpen of [true, false]) {
    // w11-frame-root-cont (3.6556.2 shared-22 GI `l ? I ? null : o(Sy, …)`, children [pt, Ge, …, Ut]): collapsed, the
    // aside holds the peek bridge, then main.jsx's collapsed chrome in place of the titlebar, then the drawer body.
    const html = render({ collapsed: true, peekOpen, collapsedChrome: React.createElement('div', { className: 'df-collapsed-chrome flex items-center' }) });
    assert.doesNotMatch(html, /sidebar-toolbar|aria-label="Hide sidebar"/, 'no titlebar while collapsed');
    const aside = html.slice(html.indexOf('>') + 1);
    assert.ok(aside.startsWith('<div class="dframe-peek-bridge" aria-hidden="true"></div><div class="df-collapsed-chrome flex items-center"></div><div class="dframe-sidebar-body"'), aside.slice(0, 200));
    const toolbar = html.slice(0, html.search(bodyTag));
    assert.doesNotMatch(toolbar, /df-app-switch|role="radiogroup"/, 'no titlebar switch while collapsed');
    const body = html.slice(html.search(bodyTag));
    const open = body.match(bodyTag)[0];
    assert.equal(/\sinert=""/.test(open), !peekOpen, 'the hidden card stays inert');
    // DN: p("div", {className: "df-peek-mode-switch mb-2 flex shrink-0", children: p(bg)}) first in the body.
    assert.ok(body.slice(open.length).startsWith(`<div class="${Host.appSwitchPeekClassName}">`
      + '<div data-compact-mode-switcher="true" data-chorus-callout="pills" class="df-app-switch flex">'), body.slice(open.length, open.length + 200));
    assert.equal(Host.appSwitchPeekClassName, 'df-peek-mode-switch mb-2 flex shrink-0');
    assert.ok(body.indexOf('df-peek-mode-switch') < body.indexOf('class="source-sidebar-header"'));
    const [home, code] = radios(body);
    assert.deepEqual([attr(home, 'aria-checked'), attr(code, 'aria-checked')], ['false', 'true']);
    // The same container (vC) with the chord bound: the home segment advertises ⌥⌘← (server snapshot: not a Mac).
    assert.match(attr(home, 'aria-keyshortcuts'), /^(Meta|Control)\+Alt\+ArrowLeft$/);
    assert.equal(attr(code, 'aria-keyshortcuts'), undefined);
    assert.equal((html.match(/role="radiogroup"/g) || []).length, 1, 'one switch in the whole sidebar');
  }
  const open = render({ collapsed: false });
  assert.doesNotMatch(open, /df-peek-mode-switch/);
  assert.equal((open.match(/role="radiogroup"/g) || []).length, 1);
  const titlebar = open.slice(open.indexOf(`class="${Host.appSwitchTitlebarClassName}"`));
  assert.match(attr(radios(titlebar)[0], 'aria-keyshortcuts'), /^(Meta|Control)\+Alt\+ArrowLeft$/);
  // Cowork mode: the chord hint points at Code (⌥⌘→) instead.
  const cowork = render({ collapsed: true, peekOpen: true, mode: 'cowork' });
  const [home, code] = radios(cowork.slice(cowork.indexOf('df-peek-mode-switch')));
  assert.deepEqual([attr(home, 'aria-checked'), attr(home, 'aria-keyshortcuts')], ['true', undefined]);
  assert.match(attr(code, 'aria-keyshortcuts'), /^(Meta|Control)\+Alt\+ArrowRight$/);
});

test('W2 SSR: the peek placement has no titlebar wrapper or tooltip provider of its own; classes all come from the loaded CSS', () => {
  const html = renderToStaticMarkup(React.createElement(Host.SourceAppSwitch, { mode: 'code', homeMode: 'cowork', onMode() {}, placement: 'peek' }));
  assert.ok(html.startsWith('<div class="df-peek-mode-switch mb-2 flex shrink-0"><div data-compact-mode-switcher="true"'), html.slice(0, 200));
  assert.doesNotMatch(html, /draggable-none|static-composer-boot-fade|ms-auto/);
  const providers = props => nodes(fixture(Host.SourceAppSwitch, props).tree, n => n.type === CdsTooltipProvider).length;
  assert.equal(providers({ mode: 'code', homeMode: 'cowork', onMode() {}, placement: 'peek' }), 0, 'DN renders bg in the peek card without Zs');
  assert.equal(providers({ mode: 'code', homeMode: 'cowork', onMode() {} }), 1, 'the titlebar keeps its Zs');
  const css = ['c6a992d55-Che1orl5.css', 'shared-styles-D_GJawPO.css', 'shared-frame-CegduNQ2.css', 'c3fde7009-BszyXGym.css', 'c8e31bf58-C7gq8dUF.css']
    .map(f => fs.readFileSync(path.join(app, 'public/assets/v1', f), 'utf8')).join('\n');
  for (const c of ['df-peek-mode-switch', 'mb-2', 'shrink-0']) assert.ok(css.includes('.' + c), c);
});

test('W2 CSS: the [data-collapsed] band rules of the loaded shared-styles place the peek switch; style.css ports none of them', () => {
  // The loaded 3.6556.2 sheet keeps the 2.42304.0 band rules verbatim.
  const official = raw('shared-styles-D_GJawPO.css');
  assert.equal(official, fs.readFileSync(path.join(app, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8'));
  for (const rule of ['.df-peek-mode-switch{padding-top:2px}', '--df-peek-band:46px;']) assert.ok(rawPrevious('shared-styles-Bl9zqrv-.css').includes(rule), rule);
  for (const rule of [
    '.dframe-root[data-variant=web][data-collapsed]:not([data-wco]) .df-peek-mode-switch{top:0;height:var(--df-peek-band);align-items:center;margin:0;position:absolute;inset-inline-end:8px}',
    '.dframe-root[data-variant=web]:not([data-web]):not([data-wco])[data-collapsed] .dframe-sidebar-body{--df-peek-band:46px;',
    '.dframe-root[data-variant=web]:not([data-web]):not([data-wco])[data-collapsed] .df-peek-mode-switch{padding-top:2px}',
    'padding:calc(var(--df-peek-band) + 4px) 8px 6px;',
  ]) assert.ok(official.includes(rule), rule);
  // DN on the macOS desktop: data-web is only set off the desktop (2.42304.0 VN `"data-web": !o`; 3.6556.2 oR
  // `ee=!u||void 0`, u = isClaudeApp), data-wco only on Windows/Linux.
  assert.ok(rawPrevious('shared-22-HztmyUTM.js').includes('"data-web":!o||void 0'));
  const s22 = raw('shared-22-Bwn3sJTG.js');
  assert.ok(s22.includes('ee=!u||void 0') && s22.includes('"data-web":ee,'));
  // w11-frame-root-cont: the root writes oR's data-collapsed (main.jsx), so these rules apply as loaded and the
  // .sidebar-collapsed port of them is gone.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  // w13-close-chat-surface (E77): no collapsed frame while the window is incognito either (shared-78 vK unmounts the
  // frame shell, source-incognito-shell.jsx frameShellMounted).
  assert.match(main, /data-collapsed=\{effectiveCollapsed && !NO_SIDEBAR && frameShellMounted\(\{ isIncognito: incognitoShell \}\) \|\| undefined\}/);
  const style = fs.readFileSync(path.join(app, 'src/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(style, /\.df-peek-mode-switch|--df-peek-band|sidebar-collapsed/);
});

// ---- R2-appswitch W3: the ⌥⌘←/→ surface chord (shared-22 AM over shared-1 qL/$L/RL and jL).

const chordTargets = {
  'surface-chord-layers.mjs': ['shared-156-Bikz018e.js', ['YB', 'ZB', '$B']],
  'surface-chord-platform.mjs': ['shared-78-D6VXYXaQ.js', ['Ua', 'Wa']],
  'surface-chord.mjs': ['shared-1-CAAiD7E3.js', ['vj', 'xj', 'Sj', 'Tj', 'BL', 'VL', 'HL', 'WL', 'GL', 'JL', 'RL', 'qL', '$L']],
};

test('W3 manifest: the code-current surface-chord targets are 2.42304.0 originals pinned by closure, features, aliases and imports', async (context) => {
  const current = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  // The surface-chord targets belong to the code-current titlebar lane (w2-titlebar-current); once it moves them to
  // 3.6556.2 its own tests pin them and this one only checks they still come from the same official chunk prefixes.
  const versions = new Set(Object.keys(chordTargets).map(target => current.modules.find(m => m.target === target)?.referenceVersion));
  if (!versions.has('2.42304.0')) {
    for (const [target, [source]] of Object.entries(chordTargets)) {
      const entry = current.modules.find(m => m.target === target);
      assert.equal(entry.referenceVersion, '3.6556.2', target);
      assert.ok(path.basename(entry.source).startsWith(source.slice(0, -'-xxxxxxxx.js'.length) + '-'), target);
      assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, path.basename(entry.source)))), target);
    }
    context.diagnostic('surface chord is 3.6556.2: pinned by the titlebar lane');
    return;
  }
  for (const [target, [source, bindings]] of Object.entries(chordTargets)) {
    const entry = current.modules.find(m => m.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '2.42304.0');
    assert.equal(path.basename(entry.source), source);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(previous, source))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = fs.readFileSync(path.join(app, 'src/generated/code-current', target), 'utf8');
    assert.equal(sha(text), entry.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 2.42304.0 bindings; generated by extract-code-ui-current.mjs.\n'));
    const pinned = await pinSurfaceChordHelper(target, previous);
    assert.deepEqual(pinned.bindings, bindings);
  }
  const chordText = fs.readFileSync(path.join(app, 'src/generated/code-current/surface-chord.mjs'), 'utf8');
  assert.match(chordText, /import \{ surfaceChordLayerSelector as ci \} from "\.\/surface-chord-layers\.mjs";/);
  assert.match(chordText, /import \{ isMacUserAgent as Da \} from "\.\/surface-chord-platform\.mjs";/);
  // The binding tables are sliced from shared-1 jL, not restated.
  assert.deepEqual(Chord.surfaceChordShortcuts, {
    chorus_surface_prev: [{ key: 'arrowleft', modifiers: ['cmd', 'alt'], platform: 'mac', app: 'desktop' }, { key: 'arrowleft', modifiers: ['ctrl', 'alt'], platform: 'non-mac', app: 'desktop' }],
    chorus_surface_next: [{ key: 'arrowright', modifiers: ['cmd', 'alt'], platform: 'mac', app: 'desktop' }, { key: 'arrowright', modifiers: ['ctrl', 'alt'], platform: 'non-mac', app: 'desktop' }],
  });
  // The generator reproduces the committed files (check mode, these targets only).
  await extractCurrentCodeHelpers({ check: true, only: new Set(Object.keys(chordTargets)) });
  // A binding list that is not the closure is refused (the pin is what keeps a renamed minified binding out).
  const pin = surfaceChordPins['surface-chord.mjs'];
  const saved = pin.bindings;
  pin.bindings = saved.filter(name => name !== 'Tj');
  try { await assert.rejects(pinSurfaceChordHelper('surface-chord.mjs', previous), /closure of qL,\$L,RL/); }
  finally { pin.bindings = saved; }
});

test('W3 official strings: AM binds the chord on the desktop, the extra-panes guard is off-Mac only, no main-process menu sends it', () => {
  const s22 = rawPrevious('shared-22-HztmyUTM.js'), s1 = rawPrevious('shared-1-CAAiD7E3.js'), s78 = rawPrevious('shared-78-D6VXYXaQ.js');
  for (const needle of ['it("chorus_surface_prev")', 'it("chorus_surface_next")', '"arrow_chord"', 'extraPanesByMode', 'Ue?.onSwitchSurface', 'kw as Si', 'jn as bt', 'Mn as at'])
    assert.ok(s22.replace(/\s+/g, '').includes(needle.replace(/\s+/g, '')), needle);
  for (const needle of ['chorus_surface_prev:{description:hM.description', 'hiddenFromCommandPalette:!0', 'qL as jn', '$L as Mn', 'kw as Da', '_r as ci'])
    assert.ok(s1.includes(needle), needle);
  assert.ok(s78.includes('var Ua=/(macintosh|macintel|macppc|mac68k|macos)/i;function Wa()'));
  assert.ok(s78.includes('Wa as kw'));
  // 2.42304.0 main process: switchSurface is only declared in the IPC event table; no menu item dispatches it.
  const main = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  assert.equal((main.match(/switchSurface/g) || []).length, 1);
  assert.equal((main.match(/dispatchSwitchSurface/g) || []).length, 0);
});

// Browser globals the original qL / GL / Tj / Wa read; restored after each use.
function withBrowser({ mac = true, active = null, dialogs = [] } = {}, run) {
  const saved = { window: globalThis.window, document: globalThis.document, Element: globalThis.Element };
  class Element {}
  const listeners = new Map();
  globalThis.Element = Element;
  globalThis.window = {
    navigator: { userAgent: mac ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Claude/2.42304.0' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Claude/2.42304.0' },
    addEventListener(type, fn) { listeners.set(fn, type); }, removeEventListener(type, fn) { listeners.delete(fn); },
  };
  const activeElement = typeof active === 'function' ? active(Element) : active;
  globalThis.document = { activeElement, querySelector: () => null, querySelectorAll: () => dialogs };
  const restore = () => { for (const [key, value] of Object.entries(saved)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; };
  let result;
  try { result = run({ listeners, Element }); }
  catch (error) { restore(); throw error; }
  if (typeof result?.then === 'function') return result.finally(restore);
  restore();
  return result;
}
const keydown = (key, modifiers = {}) => ({
  key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false,
  getModifierState: name => !!modifiers.altGraph && name === 'AltGraph', ...modifiers,
  prevented: 0, preventDefault() { this.prevented++; this.defaultPrevented = true; },
});

test('W3 surfaceChordMatcher (LL + RL): ⌥⌘←/→ on a Mac, ⌃⌥←/→ elsewhere, exact modifiers, AltGraph refused off a Mac', () => {
  const macPrev = surfaceChordMatcher('chorus_surface_prev', { mac: true }), macNext = surfaceChordMatcher('chorus_surface_next', { mac: true });
  assert.equal(macPrev(keydown('ArrowLeft', { metaKey: true, altKey: true })), true);
  assert.equal(macNext(keydown('ArrowRight', { metaKey: true, altKey: true })), true);
  assert.equal(macPrev(keydown('ArrowRight', { metaKey: true, altKey: true })), false);
  for (const extra of [{ ctrlKey: true }, { shiftKey: true }, { altKey: false }, { metaKey: false, ctrlKey: true }])
    assert.equal(macPrev(keydown('ArrowLeft', { metaKey: true, altKey: true, ...extra })), false, JSON.stringify(extra));
  // An IME composition reports key "Process", so it never matches (the original has no isComposing check of its own).
  assert.equal(macPrev(keydown('Process', { metaKey: true, altKey: true, isComposing: true })), false);
  const pcPrev = surfaceChordMatcher('chorus_surface_prev', { mac: false });
  assert.equal(pcPrev(keydown('ArrowLeft', { ctrlKey: true, altKey: true })), true);
  assert.equal(pcPrev(keydown('ArrowLeft', { metaKey: true, altKey: true })), false);
  assert.equal(pcPrev(keydown('ArrowLeft', { ctrlKey: true, altKey: true, altGraph: true })), false);
  // The default platform comes from the original Wa user-agent test.
  withBrowser({ mac: true }, () => assert.equal(surfaceChordMatcher('chorus_surface_prev')(keydown('ArrowLeft', { metaKey: true, altKey: true })), true));
  withBrowser({ mac: false }, () => assert.equal(surfaceChordMatcher('chorus_surface_prev')(keydown('ArrowLeft', { metaKey: true, altKey: true })), false));
});

test('W3 surfaceChordTarget (AM over qL/$L): neighbour without wrap, RTL swap, repeat / handled / non-desktop / modal layer refused', () => {
  const matchPrev = surfaceChordMatcher('chorus_surface_prev', { mac: true }), matchNext = surfaceChordMatcher('chorus_surface_next', { mac: true });
  const target = (event, options = {}) => surfaceChordTarget(event, { modes: ['cowork', 'code'], current: 'code', matchPrev, matchNext, mac: true, ...options });
  const left = () => keydown('ArrowLeft', { metaKey: true, altKey: true }), right = () => keydown('ArrowRight', { metaKey: true, altKey: true });
  withBrowser({ mac: true }, () => {
    assert.equal(target(left()), 'cowork');
    assert.equal(target(right()), null, 'no wrap past Code');
    assert.equal(target(right(), { current: 'cowork' }), 'code');
    assert.equal(target(left(), { current: 'cowork' }), null, 'no wrap before home');
    assert.equal(target(left(), { modes: ['chat', 'code'] }), 'chat');
    // RTL: ← is "next" (qL r), so from home it reaches Code.
    assert.equal(target(left(), { current: 'cowork', rtl: true }), 'code');
    assert.equal(target(right(), { rtl: true }), 'cowork');
    assert.equal(target({ ...left(), repeat: true }), null);
    assert.equal(target({ ...left(), defaultPrevented: true }), null);
    assert.equal(target(left(), { desktop: false }), null);
    assert.equal(target(keydown('ArrowLeft', { metaKey: true, altKey: true, shiftKey: true })), null);
    // Si (Wa): the extra-panes guard exists only off a Mac.
    assert.equal(target(left(), { extraPanes: true }), 'cowork');
    assert.equal(target(left(), { extraPanes: true, mac: false, matchPrev: () => true }), null);
    // $L: fewer than two modes, or an unknown current mode (index 0).
    assert.equal(target(left(), { modes: ['code'] }), null);
    assert.equal(target(right(), { current: 'chat' }), 'code');
  });
  // JL: focus inside an open menu (passive layers count), or a modal dialog in the document, keeps the chord off.
  withBrowser({ mac: true, active: Element => Object.assign(new Element(), { closest: selector => selector.includes('[role="menu"]') ? { getAttribute: () => null, closest: () => null } : null }) },
    () => assert.equal(target(left()), null));
  const dialog = { closest: () => null, getAttribute: () => null, hasAttribute: () => false, matches: selector => selector.includes('[aria-modal="true"]') };
  withBrowser({ mac: true, dialogs: [dialog] }, () => assert.equal(target(left()), null));
  // A dialog that is closing (data-closed) or hidden from the tree no longer counts.
  withBrowser({ mac: true, dialogs: [{ ...dialog, hasAttribute: name => name === 'data-closed' }] }, () => assert.equal(target(left()), 'cowork'));
  // AltGraph only blocks off a Mac (qL: !Da() && AltGraph).
  withBrowser({ mac: false }, () => assert.equal(target(keydown('ArrowLeft', { altGraph: true }), { mac: false, matchPrev: () => true }), null));
  withBrowser({ mac: true }, () => assert.equal(target(keydown('ArrowLeft', { altGraph: true }), { matchPrev: () => true }), 'cowork'));
});

test('W3 controlled events: the container binds ⌥⌘←/→ only with the chord, presses through Fk (thumb first), springs back when refused', async () => {
  const props = { mode: 'code', homeMode: 'cowork', onMode() {}, chord: true };
  const outer = fixture(Host.SourceAppSwitch, props);
  const element = nodes(outer.tree, n => typeof n.type === 'function' && n.props?.homeMode === 'cowork' && 'chord' in n.props)[0];
  assert.equal(element.props.chord, true);
  await withBrowser({ mac: true }, async ({ listeners }) => {
    let sending = true;
    const calls = [];
    const containerProps = { ...element.props, onMode: async next => { calls.push(next); if (sending) return; containerProps.mode = next; } };
    const container = fixture(element.type, containerProps, new Map([[CdsDensityContext, 'compact']]));
    container.flush();
    assert.deepEqual([...listeners.values()], ['keydown'], 'one window keydown listener');
    const [handler] = listeners.keys();
    const view = () => container.tree.props;
    // Not the chord: untouched.
    const plain = keydown('ArrowLeft');
    handler(plain);
    assert.equal(plain.prevented, 0);
    // ⌥⌘← from Code: the home segment is pressed at once and the event is consumed.
    const press = keydown('ArrowLeft', { metaKey: true, altKey: true });
    handler(press);
    assert.equal(press.prevented, 1);
    container.render();
    assert.equal(view().selected, 'cowork');
    assert.deepEqual(calls, []);
    await tick();
    container.render();
    assert.deepEqual(calls, ['cowork']);
    assert.equal(view().selected, 'code', 'switchMode refused while sending: back to the real mode');
    // ⌥⌘→ from Code leads nowhere: not consumed.
    const nowhere = keydown('ArrowRight', { metaKey: true, altKey: true });
    handler(nowhere);
    assert.equal(nowhere.prevented, 0);
    sending = false;
    handler(keydown('ArrowLeft', { metaKey: true, altKey: true }));
    await tick();
    container.render();
    assert.deepEqual(calls, ['cowork', 'cowork']);
    assert.equal(view().selected, 'cowork');
    // From the home mode the hint and the chord both point at Code.
    assert.deepEqual([view().home.shortcut, view().code.shortcut], [undefined, 'cmd+alt+right']);
    container.close();
    assert.equal(listeners.size, 0, 'the listener goes with the container');
    // Without the chord (a host that does not bind it) there is neither a listener nor a hint.
    const unbound = fixture(element.type, { ...element.props, chord: false }, new Map([[CdsDensityContext, 'compact']]));
    unbound.flush();
    assert.equal(listeners.size, 0);
    assert.deepEqual([unbound.tree.props.home.shortcut, unbound.tree.props.code.shortcut], [undefined, undefined]);
    unbound.close();
  });
  outer.close();
});
