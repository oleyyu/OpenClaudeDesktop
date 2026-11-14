// R3-composer composer-env-bar (research/composer.md §3.4, decisions D13): on the presets Home draft the composer hangs
// the official cc43287c9 environment bar under the card instead of a chin. surfaces-prod-2 composer-env: the bar is the
// 4.16336.0 one (code-composer-v4/environment-bar.mjs: vge, chips d8 (no caret), groups u8, the iconOnly fit _ge with the
// gge hysteresis) and its model slot the 4.16336.0 Exe (composer-env-v4/model-effort.mjs). SSR of the composer, the
// original hooks under a minimal hook dispatcher with fake ResizeObserver / MutationObserver / layout boxes, and the
// stylesheet; nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { designEntryStylesheets, legacyGlobalStylesheets } from '../scripts/current-design-assets.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
let server, C, Bar, Env, Tokens;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Bar = await server.ssrLoadModule('/src/source-composer-environment-bar.jsx');
  Env = await server.ssrLoadModule('/src/generated/code-composer-v4/environment-bar.mjs');
  Tokens = await server.ssrLoadModule('/src/generated/code-composer-v4/composer-tokens.mjs');
});
after(() => server?.close());
const noop = () => {};
const home = props => renderToStaticMarkup(h(C.SourceComposer, {
  draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto',
  model: { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] },
  effort: 'high', workdir: '/tmp/fixture/project', showContext: true, environmentMenu: true, ...props }));
// The subtree of the element opening at `start`, cut at its matching close tag.
const subtree = (html, start) => { let depth = 0; for (const tag of html.slice(start).matchAll(/<div\b|<\/div>/g)) { depth += tag[0] === '</div>' ? -1 : 1; if (!depth) return html.slice(start, start + tag.index + 6); } return ''; };
const slot = (html, id) => { const at = html.indexOf(`data-testid="${id}"`); assert.ok(at >= 0, `${id} rendered`); return subtree(html, html.lastIndexOf('<div', at)); };
const tag = (html, id) => new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`).exec(html)?.[0] ?? '';

test('the presets Home draft shows the environment bar under the card and no chin; a session keeps its chin', () => {
  const html = home({});
  const bar = html.indexOf('data-testid="epitaxy-environment-bar"');
  assert.ok(bar > html.indexOf('</form>'), 'the bar follows the card');
  assert.match(html, /<div class="sc-chin sc-env-bar-scope" data-env-bar-host=""><div data-testid="epitaxy-environment-bar" class="@container flex w-full min-w-0 flex-col /);
  assert.ok(html.includes(`class="@container flex w-full min-w-0 flex-col ${Tokens.environmentBarClass}"`));
  assert.doesNotMatch(html, /data-cds="ChatComposerChin"|sc-folder-chip/, 'no chin and no chin folder chip on Home');
  const session = home({ showContext: false });
  assert.match(session, /data-cds="ChatComposerChin"/);
  assert.doesNotMatch(session, /epitaxy-environment-bar/);
  // Not presets (the side session, the classic layout): no bar either.
  assert.doesNotMatch(home({ codeLayout: 'side-session', embedded: true }), /epitaxy-environment-bar/);
  assert.doesNotMatch(home({ codeLayout: 'classic' }), /epitaxy-environment-bar/);
});

test('place: the Laptop environment chip names the place ("This computer" or the saved environment) and opens its menu', () => {
  const place = slot(home({}), 'environment-bar-place');
  assert.match(place, /^<div data-testid="environment-bar-place" class="flex shrink rounded /);
  const trigger = tag(place, 'environment-bar-trigger');
  assert.match(trigger, /aria-label="Environment: This computer"/);
  assert.match(trigger, /aria-haspopup="menu"/); assert.match(trigger, /aria-expanded="false"/);
  assert.match(trigger, /data-cds="Button" data-cds-ghost=""/);
  assert.match(place, />This computer<\/span>/);
  assert.equal([...place.matchAll(/data-cds="Icon"/g)].length, 1, 'u0 draws only its leading icon: no caret');
  const named = slot(home({ environmentName: 'API server' }), 'environment-bar-place');
  assert.match(tag(named, 'environment-bar-trigger'), /aria-label="Environment: API server"/);
  assert.match(tag(slot(home({ menuKind: 'home-environment' }), 'environment-bar-place'), 'environment-bar-trigger'), /aria-expanded="true"/);
  assert.equal(slot(home({ environmentMenu: false }), 'environment-bar-place'), `<div data-testid="environment-bar-place" class="flex shrink ${Env.environmentChipClass.replaceAll("&", "&amp;")}"></div>`);
});

test("second: the folder chip shows the basename or 'Choose…', the path as its title, and opens the folder menu or browses", () => {
  const second = slot(home({ additionalFolders: ['/tmp/other/lib'] }), 'environment-bar-second');
  assert.match(second, /^<div data-testid="environment-bar-second" class="flex shrink-\[3\] rounded /);
  const folder = tag(second, 'environment-bar-folder');
  assert.match(folder, /title="\/tmp\/fixture\/project, \/tmp\/other\/lib"/);
  // W14-code composer-02: an extra folder folds into the chip (hse Ce "+{count}", Te kIIspeB92o).
  assert.match(folder, /aria-label="project \+1, folder: \/tmp\/fixture\/project, \/tmp\/other\/lib"/);
  assert.match(second, /<span class="shrink-0 text-secondary">\+1<\/span>/);
  assert.match(folder, /aria-haspopup="menu"/);
  assert.doesNotMatch(folder, /data-placeholder/);
  assert.match(second, />project<\/span>/);
  assert.equal([...second.matchAll(/data-cds="Icon"/g)].length, 1);
  const empty = slot(home({ workdir: '' }), 'environment-bar-second');
  assert.match(empty, />Choose…<\/span>/);
  assert.match(tag(empty, 'environment-bar-folder'), /aria-label="Folder: Choose folder…"/);
  assert.doesNotMatch(tag(empty, 'environment-bar-folder'), /title=/);
  // 4.16336.0 Jge folder slot `shown && !starting && (activeStored === null || cloud without repos)`: a chosen saved (local)
  // environment hides the folder chip (official 01: "BIHZCoding" alone on the left).
  const saved = home({ environmentName: 'API server' });
  assert.match(saved, /data-testid="environment-bar-place"/);
  assert.doesNotMatch(saved, /environment-bar-second|environment-bar-folder/);
  // Nothing recent (the host's folderMenu=false): the chip browses directly, no menu semantics.
  assert.doesNotMatch(tag(slot(home({ folderMenu: false }), 'environment-bar-second'), 'environment-bar-folder'), /aria-haspopup/);
  // 4.16336.0 (cc43287c9 Yg = shared-3 VM under cd8a7d7c0's {home} label context): a folder under the home reads
  // ~-relative; with no home known the full path stays.
  assert.deepEqual(Bar.environmentBarChips({ workdir: '/Users/me/code/app', labelContext: { home: '/Users/me' } }).folder,
    { label: 'app', tail: undefined, title: '~/code/app', tooltipText: '~/code/app', ariaLabel: 'Folder: ~/code/app' });
  assert.deepEqual(Bar.environmentBarChips({ workdir: '/Users/me/code/app', labelContext: { home: undefined } }).folder,
    { label: 'app', tail: undefined, title: '/Users/me/code/app', tooltipText: '/Users/me/code/app', ariaLabel: 'Folder: /Users/me/code/app' });
});

test('model, mode and ring: vge’s right group holds the Exe model slot, then the composer’s Mode trigger in the empty:hidden mode slot, then the ring in a u8 group', () => {
  const html = home({ fastAvailable: true });
  // vge: the chips line, then `flex grow items-center justify-end gap-x-1` holding model, mode, ring in that order
  // (4.16336.0 moved the permission control after the model, official 01: "Opus 5.5 Extra  Bypass permissions  ring").
  const right = subtree(html, html.indexOf('<div class="flex grow items-center justify-end gap-x-1">'));
  assert.ok(right.length > 0, 'the right group rendered');
  const order = ['data-testid="environment-bar-model"', 'data-testid="environment-bar-mode"', 'sc-usage-trigger'].map((needle) => right.indexOf(needle));
  assert.ok(order.every((at) => at >= 0) && order[0] < order[1] && order[1] < order[2], `model < mode < ring: ${order}`);
  assert.doesNotMatch(html, /environment-bar-trailing/, 'no 3.6556.2 trailing slot');
  const mode = slot(html, 'environment-bar-mode');
  assert.match(mode, /^<div data-testid="environment-bar-mode" class="flex shrink-0 empty:hidden rounded /);
  // Hye: in the bar the permission trigger's class is Y5(inBar) = "min-w-0 shrink text-secondary".
  assert.equal(Env.environmentTriggerClass(true), 'min-w-0 shrink text-secondary');
  assert.equal(Bar.ENVIRONMENT_BAR_TRIGGER_TONE, 'text-secondary');
  assert.match(mode, /<span class="inline-flex min-w-0"><button type="button" data-cds="Button" data-cds-ghost=""[^>]*class="[^"]* min-w-0 shrink text-secondary sc-permission"/);
  // Exe: the model and the effort each in a u8 group; the bar's effort rides the model trigger's tail (Uye renderTrigger,
  // `o = bar && !loading`), so the effort group stays empty (empty:hidden). The model trigger is Uye's ghost U with
  // Y5(t, t) "shrink text-secondary" holding X5 (givesWay name, then the tail words).
  const model = slot(html, 'environment-bar-model');
  assert.match(model, /^<div data-testid="environment-bar-model" class="flex items-center gap-1">/);
  const groups = [...model.matchAll(/<div class="flex empty:hidden rounded [^"]*">/g)];
  assert.equal(groups.length, 2, 'Exe: model and effort u8 groups');
  assert.match(model, /<button type="button" data-cds="Button" data-cds-ghost=""[^>]*class="[^"]* shrink text-secondary sc-model-trigger" aria-label="Model: Fixture High" data-testid="environment-row-model"/);
  assert.equal(Env.environmentTriggerClass(true, true), 'shrink text-secondary');
  assert.ok(model.includes(`<span class="flex min-w-0 items-center gap-1 "><span class="${Tokens.environmentTriggerGivesWayClass}">Fixture</span><span class="shrink-0 whitespace-pre text-pro font-medium" data-top-tier=""> High</span></span>`), 'X5: the name, then the effort tail (High is the fixture model\'s highest level: purple, user decision 2026-10-18)');
  // cc43287c9 (4.16336.0) Uye: a plain tail word is text-muted-as-secondary (3.6556.2 x6 had text-muted-control).
  assert.ok(slot(home({ effort: 'low' }), 'environment-bar-model').includes('<span class="shrink-0 whitespace-pre text-muted-as-secondary"> Low</span>'), 'a lower level reads text-muted-as-secondary');
  assert.doesNotMatch(html, /text-muted-control/);
  assert.doesNotMatch(model, /sc-effort-trigger|ModelSelectorEffort|environment-row-effort/);
  // The bar ring (inComposerRow): the `flex shrink-0 ms-px` slot and the 14px ring on the alpha-3 track, in its own u8 group
  // after the mode slot.
  const ring = right.slice(right.indexOf('data-testid="environment-bar-mode"'));
  assert.match(ring, /<div class="flex empty:hidden rounded [^"]*"><span class="flex shrink-0 ms-px"><button type="button" data-cds="Button" data-cds-icon-only=""[^>]*sc-usage-trigger"[^>]*>[\s\S]*?<svg width="14" height="14" viewBox="0 0 14 14" class="-rotate-90" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="none" stroke-width="2" stroke="var\(--cds-alpha-3\)" data-ring-track="">/);
  // The fast tier rides before the effort, in text-muted-as-secondary (Uye: fastMode then effort).
  assert.ok(slot(home({ fastAvailable: true, fastMode: true, speedLabel: 'Fast' }), 'environment-bar-model')
    .includes('<span class="shrink-0 whitespace-pre text-muted-as-secondary"> Fast</span><span class="shrink-0 whitespace-pre text-pro font-medium" data-top-tier=""> High</span>'));
  // The Fast status (the bare chin's sr-only live region) follows the bar inside the host scope.
  assert.match(html, /<\/div><span role="status" aria-live="polite" class="sr-only">Fast mode off<\/span><\/div>/);
  // No effort: no tail word.
  assert.doesNotMatch(slot(home({ effort: '' }), 'environment-bar-model'), /whitespace-pre/);
  // An empty group collapses by its own empty:hidden (chat mode has no permission control; the bar is Code only).
  // u8 is React Compiler output (it reads its memo cache), so it is rendered, not called.
  assert.equal(renderToStaticMarkup(h(Env.EnvironmentChipGroup, { children: null })), `<div class="flex empty:hidden ${Env.environmentChipClass}"></div>`);
});

// A minimal hook dispatcher: one component's hooks across re-renders, with explicit context values.
function hookFixture(hook, contexts = new Map()) {
  let cursor = 0, result, dirty = false;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: initial }; return [cells[i].value, (v) => { const next = typeof v === 'function' ? v(cells[i].value) : v; if (!Object.is(next, cells[i].value)) { cells[i].value = next; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useCallback(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn, deps }; return cells[i].value; },
    useContext(context) { return contexts.has(context) ? contexts.get(context) : context._currentValue; },
  };
  const render = (...args) => {
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    for (let pass = 0; pass < 5; pass++) {
      dirty = false; cursor = 0; internal.H = withMemoCache(hooks);
      try { result = hook(...args); } finally { internal.H = old; }
      if (!dirty) break;
    }
    return result;
  };
  return { render, get dirty() { return dirty; } };
}

// Fake layout: the row's box and padding, the chips / pickers boxes and offsets, the mode's width; observers recorded.
function fakeBar() {
  const observers = { resize: [], mutation: [] };
  class FakeResizeObserver { constructor(callback) { this.callback = callback; this.nodes = []; observers.resize.push(this); } observe(node) { this.nodes.push(node); } disconnect() { this.disconnected = true; } }
  class FakeMutationObserver { constructor(callback) { this.callback = callback; observers.mutation.push(this); } observe(node, options) { this.node = node; this.options = options; } disconnect() { this.disconnected = true; } }
  const view = { ResizeObserver: FakeResizeObserver, MutationObserver: FakeMutationObserver, getComputedStyle: () => ({ paddingLeft: '10px', paddingRight: '10px' }) };
  const doc = { nodeType: 9, defaultView: view };
  const box = (state) => ({ getBoundingClientRect: () => ({ left: state.left, right: state.left + state.width, width: state.width }) });
  const layout = { row: { left: 0, width: 400 }, chips: { left: 10, width: 180, offsetTop: 0, offsetHeight: 24, text: 'This computerproject' },
    pickers: { left: 194, width: 196, offsetTop: 0, text: 'AutoFixtureHigh' }, mode: { width: 52 } };
  const row = { nodeType: 1, ownerDocument: doc, ...box(layout.row) };
  const chips = { nodeType: 1, ownerDocument: doc, ...box(layout.chips), get offsetTop() { return layout.chips.offsetTop; }, get offsetHeight() { return layout.chips.offsetHeight; }, get textContent() { return layout.chips.text; } };
  const pickers = { nodeType: 1, ownerDocument: doc, ...box(layout.pickers), get offsetTop() { return layout.pickers.offsetTop; }, get textContent() { return layout.pickers.text; } };
  const mode = { nodeType: 1, ownerDocument: doc, getBoundingClientRect: () => ({ width: layout.mode.width }) };
  return { observers, layout, row, chips, pickers, mode, fire: () => observers.resize[0].callback() };
}

test('a0 (the original fit): observes the row and the mode slot, goes iconOnly when the pickers overflow, and holds it within r0', () => {
  const f = hookFixture(() => Env.useEnvironmentBarFit());
  const bar = fakeBar();
  let fit = f.render();
  assert.equal(fit.iconOnly, false);
  fit.chipsRef.current = bar.chips; fit.pickersRef.current = bar.pickers; fit.modeRef.current = bar.mode;
  const cleanup = fit.rowRef(bar.row);
  assert.equal(bar.observers.resize.length, 1);
  assert.deepEqual(bar.observers.resize[0].nodes, [bar.row, bar.mode], 'the row and the mode slot (the mode label changes width)');
  assert.equal(bar.observers.mutation[0].node, bar.row);
  assert.deepEqual(bar.observers.mutation[0].options, { subtree: true, childList: true, characterData: true });
  // Wide: the pickers end inside the row's padding box — nothing changes.
  bar.fire(); fit = f.render();
  assert.equal(fit.iconOnly, false);
  // Narrow: the row shrinks to 300px, the pickers still end at 390px: 100px over the 290px content edge.
  bar.layout.row.width = 300;
  bar.fire(); fit = f.render();
  assert.equal(fit.iconOnly, true);
  assert.equal(Env.environmentBarHysteresis, 2);
  // need = 300 + 100 = 400. Below need + r0 with the same content, the chips stay icons (the second pass returns).
  for (const width of [350, 401]) { bar.layout.row.width = width; bar.fire(); assert.equal(f.render().iconOnly, true, `${width}px`); }
  // At need + r0 the chips get their text back; the pickers fit again.
  bar.layout.row.width = 402; bar.layout.pickers.left = 160;
  bar.fire(); fit = f.render();
  assert.equal(fit.iconOnly, false);
  // A zero-width row (hidden) is ignored.
  bar.layout.row.width = 0; bar.fire(); assert.equal(f.render().iconOnly, false);
  cleanup();
  assert.equal(bar.observers.resize[0].disconnected, true);
  assert.equal(bar.observers.mutation[0].disconnected, true);
});

test('a0: a content change (signature i0) re-measures while iconOnly; a wrapped row measures the chips line', () => {
  const f = hookFixture(() => Env.useEnvironmentBarFit());
  const bar = fakeBar();
  let fit = f.render();
  fit.chipsRef.current = bar.chips; fit.pickersRef.current = bar.pickers; fit.modeRef.current = bar.mode;
  fit.rowRef(bar.row);
  bar.layout.row.width = 300; bar.fire(); assert.equal(f.render().iconOnly, true);
  assert.equal(Env.environmentBarSignature(bar.chips, bar.pickers, bar.mode, false), 'This computerproject|AutoFixtureHigh|52|false');
  // Same width, but the folder changed (MutationObserver): the bar expands, measures again and, still overflowing, collapses
  // with the new need — one state change per pass, ending iconOnly.
  bar.layout.chips.text = 'This computerother';
  bar.observers.mutation[0].callback(); fit = f.render();
  assert.equal(fit.iconOnly, true);
  // Wrapped (the pickers line sits under the chips line, @max-[28.75rem]): the chips line is what must fit.
  const g = hookFixture(() => Env.useEnvironmentBarFit());
  const wrapped = fakeBar();
  fit = g.render();
  fit.chipsRef.current = wrapped.chips; fit.pickersRef.current = wrapped.pickers; fit.modeRef.current = wrapped.mode;
  fit.rowRef(wrapped.row);
  wrapped.layout.pickers.offsetTop = 30; wrapped.layout.row.width = 400; wrapped.layout.pickers.left = 600;
  wrapped.fire(); assert.equal(g.render().iconOnly, false, 'the far pickers line does not count once wrapped');
  wrapped.layout.chips.width = 420; wrapped.fire(); assert.equal(g.render().iconOnly, true, 'the chips line overflowing does');
});

test('iconOnly chips (the n0 context): u0 hides its text for sr-only and its tooltip takes over; the place tooltip names the place', () => {
  const contexts = (value) => new Map([[Env.EnvironmentIconOnlyContext, value]]);
  // u0 as a function of its props under the dispatcher: the element it returns.
  const chip = (iconOnly, props) => hookFixture(() => Env.EnvironmentChip(props), contexts(iconOnly)).render();
  const folderProps = { icon: 'Folder', label: 'project', title: '~/project', tooltip: 'TIP', 'aria-label': 'Folder: ~/project' };
  const wide = chip(false, folderProps), narrow = chip(true, folderProps);
  assert.equal(wide.props.content, undefined, 'u0 shows its tooltip only while iconOnly');
  assert.equal(wide.props.children.props.title, '~/project');
  assert.equal(narrow.props.content, 'TIP');
  assert.equal(narrow.props.children.props.title, undefined, 'the native title gives way to the tooltip');
  assert.equal(narrow.props.children.props['data-icon-only'], '');
  assert.equal(narrow.props.children.props.children.props.className, 'sr-only');
  assert.equal(narrow.props.hoverable, false);
  // 4.16336.0 Kge / $3: the place chip's tooltip is "Environment" (K7kuIZkkhY; D40's "Where … runs" is superseded), its
  // detail the saved environment's name, and while iconOnly the place text when there is no name.
  const copy = Bar.environmentBarChips({ workdir: '/tmp/p', environmentName: 'API server' }).place;
  const placeOf = (placeCopy) => (iconOnly) => hookFixture(() => Bar.EnvironmentPlaceChip({ copy: placeCopy, menuKind: null, onMenu: noop }), contexts(iconOnly)).render();
  const place = placeOf(copy);
  assert.equal(place(false).props.content, 'Environment');
  assert.equal(place(false).props.detail, 'API server');
  assert.equal(place(true).props.detail, 'API server');
  const local = placeOf(Bar.environmentBarChips({ workdir: '/tmp/p' }).place);
  assert.equal(local(false).props.detail, undefined);
  assert.equal(local(true).props.detail, 'This computer');
  assert.equal(place(true).props.hoverable, false);
  assert.deepEqual(place(true).props.collisionPadding, { top: 48, right: 8, bottom: 8, left: 8 });
  // The folder chip passes ik(pe) (c0fbbe82d hn): an ltr span breaking after each separator.
  const folder = Bar.EnvironmentFolderChip({ copy: Bar.environmentBarChips({ workdir: '/tmp/fixture/project' }).folder, folderMenu: true, open: false, onMenu: noop });
  assert.equal(renderToStaticMarkup(folder.props.tooltip), '<span dir="ltr"><span class="inline-block max-w-full whitespace-pre-wrap">/</span><span class="inline-block max-w-full whitespace-pre-wrap">tmp/</span><span class="inline-block max-w-full whitespace-pre-wrap">fixture/</span><span class="inline-block max-w-full whitespace-pre-wrap">project</span></span>');
  // SSR of the official chip under iconOnly (n0 true): sr-only label and data-icon-only, no title.
  const html = renderToStaticMarkup(h(Env.EnvironmentIconOnlyContext.Provider, { value: true }, folder));
  assert.match(html, /data-icon-only=""/); assert.match(html, /<span class="sr-only">/); assert.doesNotMatch(html, /title=/);
});

test('the chips open the host menus through onMenu with the trigger as anchor; Arrow keys open at the first or last item', () => {
  const calls = [];
  const onMenu = (...args) => calls.push(args);
  const chips = Bar.environmentBarChips({ workdir: '/tmp/p' });
  const place = hookFixture(() => Bar.EnvironmentPlaceChip({ copy: chips.place, menuKind: null, onMenu }), new Map()).render().props.children;
  const target = { id: 'anchor' };
  place.props.onClick({ currentTarget: target });
  place.props.onKeyDown({ key: 'ArrowDown', preventDefault: noop, nativeEvent: {}, currentTarget: target });
  const folder = Bar.EnvironmentFolderChip({ copy: chips.folder, folderMenu: true, open: false, onMenu });
  folder.props.onClick({ currentTarget: target });
  assert.deepEqual(calls, [['home-environment', target], ['home-environment', target, undefined, 'first'], ['home-folder', target]]);
  let browsed = 0;
  Bar.EnvironmentFolderChip({ copy: chips.folder, folderMenu: false, onMenu, onBrowse: () => browsed++ }).props.onClick({ currentTarget: target });
  assert.equal(browsed, 1);
  assert.deepEqual(Bar.ENVIRONMENT_BAR_MENUS, { place: 'home-environment', folder: 'home-folder' });
});

// 4.16336.0 design assets (current-design-assets): index.html links the 4.16336.0 entry sheets, the legacy global sheet the
// 3.6556.2 regions still need, then the generated compatibility layer. A class the 4.16336.0 sheets dropped is styled only
// through legacy-utilities.css, and only as a registered legacy-region dependency (style-compatibility.json keeps its
// 3.6556.2 rule and names the generated region that draws it).
function loadedStyles(appRoot) {
  const read = (file) => readFileSync(path.join(appRoot, file), 'utf8');
  const names = [...designEntryStylesheets, ...legacyGlobalStylesheets];
  assert.deepEqual([...read('index.html').matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map((m) => m[1]),
    [...names.map((name) => `/assets/v1/${name}`), '/assets/legacy-utilities.css'], 'index.html stylesheet links');
  const registry = JSON.parse(read('public/style-compatibility.json'));
  return {
    official: names.map((name) => read(`public/assets/v1/${name}`)).join('\n'),
    compat: read('public/assets/legacy-utilities.css'),
    legacyRegions: (token) => (registry.rules.some((rule) => rule.baselineVersion === '3.6556.2' && rule.references.some((ref) => ref.className === token))
      ? registry.legacyDebt.owners.filter((owner) => owner.kind === 'region' && owner.classes.includes(token)).map((owner) => owner.area) : []),
  };
}

// TT-04 / D26: the bar's DOM is the official utility classes; every one is compiled in the loaded sheet, the host's
// unlayered native-button reset is released for the chips, and no local rule styles l0's DOM.
test("l0 / u0 / c0 classes are all in the official sheet; the host scope has no box; the chips' button reset is released", async () => {
  // w2-composer-gen: the bar is 3.6556.2 output, so only the official sheets the app loads count; 4.16336.0 (design
  // assets): a class those sheets dropped counts only as a registered legacy-region dependency of the bar's region.
  const { official: sheet, compat, legacyRegions } = loadedStyles(app);
  const html = renderToStaticMarkup(h(Bar.SourceComposerEnvironmentBar, { workdir: '/tmp/p', additionalFolders: [], onMenu: noop,
    mode: h('span', null, 'Auto'), model: h('span', null, 'Fixture'), effort: h('span', null, 'High'), ring: h('span', null, 'ring') }));
  const tokens = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/))
    .filter(t => t && !t.startsWith('stacks:') && !t.startsWith('sc-')).map(t => t.replaceAll('&amp;', '&')));
  assert.ok(tokens.size > 40, String(tokens.size));
  const escape = token => '.' + token.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
  const styled = (text, token) => ['{', ':', ',', '[', ' ', '>', ')'].some(next => text.includes(escape(token) + next));
  const missing = [...tokens].filter(token => !styled(sheet, token));
  assert.deepEqual(missing.filter(token => !(styled(compat, token) && legacyRegions(token).includes('code-composer'))), []);
  const css = await fs.readFile(path.join(app, 'src/source-composer.css'), 'utf8');
  assert.match(css, /\.sc-zone \.sc-chin\.sc-env-bar-scope \{ display: contents; font: inherit; color: inherit; \}/);
  // D26 (R3-style): the native-button reset is layered, so the chips need no revert-layer release
  // (tests/style-control-reset-layer.test.mjs resolves the cascade).
  assert.doesNotMatch(css, /\.sc-env-bar-scope button\[data-cds="Button"\]/, 'no release of the layered button reset');
  assert.doesNotMatch(css, /data-testid="?(?:epitaxy-)?environment-bar/, 'no local rule on l0');
});

test('main.jsx: the Home environment and folder menus open below the bar (A2 / H6 popupSide bottom, align start)', async () => {
  const main = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /"home-folder": \{ side: "bottom", align: "start", label: "Working directory" \},/);
  assert.match(main, /"home-environment": \{ side: "bottom", align: "start", label: "Choose environment", className: "min-w-\[260px\]" \},/);
  const readable = await fs.readFile(path.resolve(app, '../analysis/code-ui-unpack-20261017/readable/cc43287c9-DAfOi8yP.js'), 'utf8');
  const j2 = readable.slice(readable.indexOf('function j2({'), readable.indexOf('var M2 = '));
  assert.match(j2, /popupSide: "bottom",\n\s*popupAlign: "start",/);
  assert.match(j2, /defaultMessage: "Choose\\u2026", id: "8tJfYE1sr\+"/);
  assert.match(j2, /"data-testid": "environment-bar-trigger"/);
  assert.match(j2, /"data-testid": "environment-bar-folder"/);
  assert.match(readable, /function H6\(|H6 = /);
});
