// R3-home: the start page's environment picker (home-env-05: cc43287c9 h2 with k0/A0/j0/e2 and the c227f4d5e row
// actions), the dialog's "+ Add" folder Select (cd8823d73 ge, ca690a791 fn), the Clawd position (home-env-07: O7) and
// the field controls' clear button (shared-frame tx over $l). Source-only: official chunks, SSR markup and controlled
// events through a hook dispatcher; no browser, pixels or desktop app.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const source = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const glyphs = JSON.parse(source('src/generated/icons.json'));
const glyph = name => String.fromCodePoint(glyphs[name]);
let server, Menu, Rows, Keys, Adapters, Folder, Dialog, Select, Fields, Pet, PetClasses, LocalDialog, Revision, StartView;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Menu = await server.ssrLoadModule('/src/source-environment-menu.jsx');
  Rows = await server.ssrLoadModule('/src/generated/code-current/environment-menu-rows.mjs');
  Keys = await server.ssrLoadModule('/src/generated/code-current/environment-picker-keys.mjs');
  Adapters = await server.ssrLoadModule('/src/source-environment-menu-adapters.jsx');
  Folder = await server.ssrLoadModule('/src/source-environment-folder-adapters.jsx');
  ({ SourceSavedEnvironmentDialog: Dialog } = await server.ssrLoadModule('/src/source-saved-environment-dialog.jsx'));
  Select = await server.ssrLoadModule('/src/generated/code-current/environment-select-parts.mjs');
  Fields = await server.ssrLoadModule('/src/generated/code-current/environment-field-controls.mjs');
  ({ SourcePet: Pet } = await server.ssrLoadModule('/src/source-pet.jsx'));
  PetClasses = await server.ssrLoadModule('/src/generated/code-start/pet.mjs');
  LocalDialog = await server.ssrLoadModule('/src/source-local-environment-dialog.jsx');
  ({ localEnvironmentRevision: Revision } = Adapters);
  StartView = await server.ssrLoadModule('/src/generated/code-start/view.mjs');
});
after(() => server?.close());
const noop = () => {};
const tick = () => new Promise(resolve => setImmediate(resolve));

function elements(tree) {
  const result = [];
  for (const node of React.Children.toArray(tree)) if (React.isValidElement(node)) {
    result.push(node);
    for (const slot of ['children', 'trailing', 'header', 'footer', 'add', 'end', 'star']) result.push(...elements(node.props[slot]));
  }
  return result;
}
const find = (tree, predicate, what = 'element') => { const found = elements(tree).find(predicate); assert.ok(found, `Expected ${what}`); return found; };

// One component's hooks over a deterministic store (render-phase setState re-renders like React does).
function fixture(component, props, { effects = false } = {}) {
  const cells = [], pending = []; let cursor = 0, tree, dirty = false;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const dispatcher = {
    useContext(context) { return context._currentValue; },
    useState(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: typeof value === 'function' ? value() : value };
      return [cells[index].value, next => { const value = typeof next === 'function' ? next(cells[index].value) : next; if (!Object.is(value, cells[index].value)) { cells[index].value = value; dirty = true; } }]; },
    useReducer(reducer, initial) { const [state, set] = dispatcher.useState(initial); return [state, action => set(previous => reducer(previous, action))]; },
    useRef(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: { current: value } }; return cells[index].value; },
    useMemo(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) cells[index] = { value: fn(), deps }; return cells[index].value; },
    useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
    useId() { const index = cursor++; if (!cells[index]) cells[index] = { value: `id-${index}` }; return cells[index].value; },
    useEffect(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) { const previous = cells[index]; cells[index] = { deps }; if (effects) pending.push(() => { previous?.cleanup?.(); cells[index].cleanup = fn(); }); } },
    useLayoutEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
    useInsertionEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
    useEffectEvent(fn) { const cell = dispatcher.useRef(null); cell.current = fn; return dispatcher.useMemo(() => (...args) => cell.current(...args), []); },
  };
  function render(next = props) {
    props = next;
    for (let pass = 0; pass < 5; pass++) {
      cursor = 0; dirty = false;
      const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
      internals.H = dispatcher;
      try { tree = component(props); } finally { internals.H = previous; }
      if (!dirty) break;
    }
    return tree;
  }
  render();
  return { render, get tree() { return tree; }, async flush() { for (const effect of pending.splice(0)) effect(); await tick(); await tick(); return render(); }, close() { for (const cell of cells) cell?.cleanup?.(); } };
}
function withGlobal(name, value, run) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const restore = () => { if (saved) Object.defineProperty(globalThis, name, saved); else delete globalThis[name]; };
  try { const result = run(); if (result?.then) return result.finally(restore); restore(); return result; } catch (error) { restore(); throw error; }
}
const item = (id, name, lastUsedAt = 0) => ({ id, name, lastUsedAt, createdAt: 1, target: { kind: 'local', cwd: `/work/${id}` }, settings: {} });
const pickerItems = rows => rows.map(row => ({ id: row.id, icon: 'Laptop', name: row.name, target: row.target }));
const body = props => ({ query: '', items: [], starred: [], selectedId: undefined, onSelect: noop, onEdit: noop, onCreate: noop, onLocal: noop, onVariables: noop, ...props });
// Row order in the markup: data-testid of each menu row, the More trigger and New environment.
// Tailwind's class selector escaping: every character outside [A-Za-z0-9_-] takes a backslash.
const cssEscape = name => name.replace(/[^A-Za-z0-9_-]/g, match => `\\${match}`);
const rowsOf = html => [...html.matchAll(/data-testid="(env-picker-[a-z-]+)"[^>]*>(?:<span class="smenu-icon">.*?<\/span><\/span>)?<span class="smenu-label[^"]*">(?:<span dir="auto" class="rtl:text-right">)?([^<]*)/g)].map(m => `${m[1]}:${m[2]}`);
const unescape = html => html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
// A group's own rows: its children (fragments flattened), not the rows inside its More submenu.
const ownRows = group => React.Children.toArray(group.props.children).flatMap(function walk(node) {
  if (!React.isValidElement(node)) return [];
  if (node.type === React.Fragment) return React.Children.toArray(node.props.children).flatMap(walk);
  return [node];
}).filter(node => node.type === Rows.EnvironmentPickerRow).map(node => node.props.item.id);

test('official 2.42304.0 h2: Starred then Local (This computer, first unstarred, More), MRU order, header search', () => {
  const start = official('cc43287c9-DAfOi8yP.js');
  assert.match(start, /tn=jt\.filter\(e=>!en\(a2\(e\)\)\)\.slice\(0,1\),nn=jt\.filter\(e=>!tn\.includes\(e\)\)/);
  assert.match(start, /defaultMessage:"Starred",id:"V7cUPvWFo3"/);
  assert.match(start, /Z0=Xf\(\{more:\{defaultMessage:"More",id:"Lm50vatbmX"\}\}\)/);
  assert.match(start, /s2="min-w-\[220px\]"/);
  assert.match(start, /hint:t>0\?B\.formatNumber\(t\):void 0,"data-testid":"env-picker-more"/);
  assert.match(start, /X\.SearchablePopup,\{side:P,align:F,anchor:L\?\.anchor,finalFocus:R,className:"min-w-\[260px\]"/);
  assert.match(start, /defaultMessage:"\{name\} selected",id:"quKofZWERy"/);
  // T2: named local/SSH environments, newest lastUsedAt first, p0-stable while the card is active.
  assert.match(start, /\.filter\(e=>e\.target\.kind==="local"\|\|e\.target\.kind==="ssh"\)\.sort\(\(e,t\)=>t\.lastUsedAt-e\.lastUsedAt\)/);
  // k0: labelDir auto, settings (qy) before the star (Yv).
  assert.match(start, /labelDir:"auto",icon:v\(Zu,\{name:e\.icon,size:"sm"\}\)/);
  assert.match(start, /children:\[l&&v\(qy,\{onOpen:l\}\),r!==void 0&&v\(Yv,\{starred:r,onToggle:\(\)=>Zr\(Dr\(e\),ti\(e\)\)\}\)\]/);
  // yC puts its search field in the popup header.
  assert.match(official('shared-frame-BfjMqbuN.js'), /function yC\(\{[\s\S]{0,4000}?header:T\(l,\{children:\[o!==void 0&&H\("div"/);
  // The generated rows are those originals, not host rewrites.
  const rows = source('src/generated/code-current/environment-menu-rows.mjs');
  assert.match(rows, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  assert.match(rows, /labelDir: "auto"/); assert.match(rows, /"env-picker-this-computer"/); assert.match(rows, /x = LR\(h\)/);
  const manifest = JSON.parse(source('src/generated/code-current/manifest.json'));
  const entry = target => manifest.modules.find(module => module.target === target);
  assert.deepEqual(entry('environment-menu-rows.mjs').bindings, ['k0', 'A0', 'j0', 'e2', 'a2', 'l2', 'p2']);
  assert.equal(entry('environment-menu-rows.mjs').referenceVersion, '2.42304.0');
  assert.deepEqual(entry('environment-picker-keys.mjs').bindings, ['YB', 'ZB', 'QB', '$B', 'sV', 'j7', 'A7']);
  assert.deepEqual(entry('environment-machine-variables.mjs').bindings, ['I', 'Me']);
});

test('h2 SSR: Starred group in starring order, Local group with This computer, the first unstarred environment and More (count)', () => {
  // MRU order a (30), c (20), b (10); b and This computer starred; c selected.
  const items = pickerItems([item('a', 'Alpha', 30), item('c', 'Gamma', 20), item('b', 'Beta', 10)]);
  const html = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, body({ items, starred: ['preset:b', 'local:this-computer'], selectedId: 'c' })));
  const starred = html.indexOf('>Starred<'), local = html.indexOf('>Local<');
  assert.ok(starred > 0 && local > starred, 'Starred before Local');
  assert.match(html, /<div role="group"><div id="[^"]+" class="smenu-group-label">Starred<\/div>/);
  assert.deepEqual(rowsOf(html), [
    'env-picker-environment:Beta', 'env-picker-this-computer:This computer',
    'env-picker-this-computer:This computer', 'env-picker-environment:Alpha', 'env-picker-more:More', 'env-picker-new-environment:New environment',
  ]);
  assert.match(html, /<div role="separator" class="smenu-separator"><\/div><div role="group"><div id="[^"]+" class="smenu-group-label">Local<\/div>/);
  // More's hint is how many environments it holds (c and the starred b); the submenu opens on demand.
  assert.match(html, /data-testid="env-picker-more"[^>]*>.*?<span class="smenu-hint" data-numeric="">2<\/span>/);
  // Unselected rows are unchecked radios; This computer is not the place (c is).
  assert.match(html, /<div aria-checked="false" data-testid="env-picker-environment" role="menuitemradio" tabindex="-1" data-cds-icon-row="" class="smenu-item">/);
  assert.match(html, /<div data-testid="env-picker-this-computer" aria-checked="false" role="menuitemradio"/);
  assert.doesNotMatch(html, /aria-checked="true"/, 'c (selected) is inside the closed More');
  // Each environment row: Settings before the star (k0), the unstar for a starred row; LTR labels carry no dir.
  const beta = html.slice(html.indexOf('>Beta<'), html.indexOf('env-picker-this-computer'));
  assert.ok(beta.indexOf(glyph('Settings')) >= 0 && beta.indexOf(glyph('Settings')) < beta.indexOf(glyph('StarSlash')), 'settings, then unstar');
  assert.match(beta, /data-testid="env-picker-unstar"/);
  const alpha = html.slice(html.indexOf('>Alpha<'), html.indexOf('env-picker-more'));
  assert.ok(alpha.indexOf(glyph('Settings')) < alpha.indexOf(glyph('Star')), 'settings, then star');
  assert.match(alpha, /<span class="sr-only">, edit environment, right arrow<\/span>/);
  assert.doesNotMatch(html, /dir="auto"/);
  // This computer without the desktop bridge: no settings action, the size-icon placeholder before its star.
  assert.match(html, /<span aria-hidden="true" class="size-icon shrink-0"><\/span><button type="button" tabindex="-1" aria-hidden="true" data-testid="env-picker-unstar"/);
  // No remote groups, no Run in, no chord shortcuts.
  assert.doesNotMatch(html, /Run in|Remote Control|SSH|Cloud|aria-keyshortcuts|smenu-shortcut/);
});

test('h2 SSR: a right-to-left root gives k0 its labelDir span and the left-arrow hint; no starred places means no Starred group', () => {
  const items = pickerItems([item('a', 'Alpha', 1)]);
  const html = withGlobal('document', { documentElement: { dir: 'rtl' } }, () => renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, body({ items }))));
  assert.match(html, /<span dir="auto" class="rtl:text-right">Alpha<span class="sr-only">, edit environment, left arrow<\/span><\/span>/);
  assert.doesNotMatch(html, />Starred</);
  assert.deepEqual(rowsOf(html), ['env-picker-this-computer:This computer', 'env-picker-environment:Alpha', 'env-picker-new-environment:New environment'],
    'one environment: it stays in the group, no More');
});

test('h2 More: the rest in MRU order (starred ones too), then D14 recent folders; More shows for folders alone', () => {
  const items = pickerItems([item('a', 'Alpha', 30), item('c', 'Gamma', 20), item('b', 'Beta', 10)]);
  const folders = React.createElement('div', { 'data-folders': '' });
  const f = fixture(Menu.EnvironmentPickerBody, body({ items, starred: ['preset:b'], folders }));
  const more = find(f.tree, node => node.props.className === 'environment-picker-more min-w-[220px]', 'More popup');
  const inside = elements(more.props.children);
  assert.deepEqual(inside.filter(node => node.props.item).map(node => node.props.item.id), ['c', 'b']);
  const folderAt = inside.findIndex(node => node.props['data-folders'] !== undefined), separatorAt = inside.findIndex(node => node.type === Adapters.EnvironmentPickerMenu.Separator);
  assert.ok(separatorAt > inside.findIndex(node => node.props.item?.id === 'b') && folderAt > separatorAt, 'a separator, then the recent folders');
  const trigger = find(f.tree, node => node.props['data-testid'] === 'env-picker-more');
  assert.deepEqual([trigger.props.icon, trigger.props.hint], ['Laptop', '2']);
  // The first unstarred environment (a) is in the group; the Starred group holds b.
  const groups = elements(f.tree).filter(node => node.type === Adapters.EnvironmentPickerMenu.Group);
  assert.equal(groups.length, 2);
  assert.deepEqual([ownRows(groups[0]), ownRows(groups[1])], [['b'], ['a']]);
  // Only folders: More still opens them, without a count.
  const lone = fixture(Menu.EnvironmentPickerBody, body({ items: pickerItems([item('a', 'Alpha')]), folders }));
  const loneTrigger = find(lone.tree, node => node.props['data-testid'] === 'env-picker-more');
  assert.equal(loneTrigger.props.hint, undefined);
  assert.deepEqual(elements(find(lone.tree, node => node.props.className === 'environment-picker-more min-w-[220px]').props.children).filter(node => node.props.item), []);
});

test('h2 search: matching environments (A0, no separator), This computer by its label, else No matches', () => {
  const items = pickerItems([item('a', 'Alpha'), item('p', 'Production'), item('s', 'Staging')]);
  const matches = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, body({ items, query: 'pr' })));
  assert.deepEqual(rowsOf(matches), ['env-picker-environment:Production']);
  assert.doesNotMatch(matches, /smenu-separator|Starred|>Local<|New environment/);
  const computer = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, body({ items, query: 'this' })));
  assert.deepEqual(rowsOf(computer), ['env-picker-this-computer:This computer']);
  const none = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, body({ items, query: 'zzz' })));
  assert.equal(none, '<div class="px-md py-sm text-footnote text-muted-as-secondary">No matches</div>');
});

test('h2 events: a More row selects only itself; starring moves it to Starred and the next unstarred joins the group; ArrowRight edits', () => {
  const selected = [], edited = [], stars = [], created = [];
  const environments = [item('a', 'Alpha', 30), item('c', 'Gamma', 20), item('b', 'Beta', 10)];
  const props = body({ items: pickerItems(environments), onSelect: id => selected.push(id), onEdit: id => edited.push(id), onCreate: () => created.push('new') });
  Adapters.bindEnvironmentStars(id => stars.push(id));
  const f = fixture(Menu.EnvironmentPickerBody, props);
  const rendered = node => elements(f.render(node)).flatMap(row => row.type === Rows.EnvironmentPickerRow ? [row] : []);
  // Rows render through k0: call it to reach the generated X.Item props.
  const k0 = row => fixture(Rows.EnvironmentPickerRow, row.props).tree;
  const gamma = rendered(props).find(row => row.props.item.id === 'c');
  const gammaItem = k0(gamma);
  gammaItem.props.onClick(); assert.deepEqual(selected, ['c']);
  gammaItem.props.onKeyDown({ key: 'ArrowRight', preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(edited, ['c']); assert.deepEqual(selected, ['c']);
  const star = find(gammaItem.props.trailing, node => node.props.onToggle, 'star action');
  star.props.onToggle(); assert.deepEqual(stars, ['c'], 'Zr(machine-preset:c) toggles the host preset');
  assert.equal(Keys.environmentStarKey({ id: 'c', target: { kind: 'local' } }), 'machine-preset:c');
  // The host reports c starred (preset:c): c leads Starred; a stays first in Local, More holds c and b.
  const next = { ...props, starred: ['preset:c'] };
  const tree = f.render(next);
  const groups = elements(tree).filter(node => node.type === Adapters.EnvironmentPickerMenu.Group);
  assert.deepEqual([ownRows(groups[0]), ownRows(groups[1])], [['c'], ['a']]);
  const more = find(tree, node => node.props.className === 'environment-picker-more min-w-[220px]');
  assert.deepEqual(elements(more.props.children).filter(node => node.props.item).map(node => node.props.item.id), ['c', 'b']);
  // Starring a: a joins Starred and c (next by use) takes the group's single row.
  const both = f.render({ ...props, starred: ['preset:c', 'preset:a'] });
  const [stars2, local] = elements(both).filter(node => node.type === Adapters.EnvironmentPickerMenu.Group);
  assert.deepEqual([ownRows(stars2), ownRows(local)], [['c', 'a'], ['b']]);
  // This computer's star, New environment.
  const computer = find(both, node => node.type === Rows.EnvironmentPickerComputer);
  computer.props.star.props.onToggle(); assert.deepEqual(stars, ['c', 'local:this-computer']);
  const create = fixture(Rows.EnvironmentPickerNew, find(both, node => node.type === Rows.EnvironmentPickerNew).props).tree;
  find(create, node => node.props['data-testid'] === 'env-picker-new-environment').props.onClick(); assert.deepEqual(created, ['new']);
  Adapters.bindEnvironmentStars(null);
});

test('T2/p0: the picker lists environments by last use and keeps that order while it is open', () => {
  const popup = { anchor: null, side: 'bottom', align: 'start', label: 'Choose environment', onClose: noop };
  const environments = [item('a', 'Alpha', 10), item('b', 'Beta', 30), item('c', 'Gamma', 20)];
  const order = tree => {
    const searchable = find(tree, node => node.type === Folder.EnvironmentSearchablePopup, 'searchable popup');
    return searchable.props.children('').props.items.map(entry => entry.id);
  };
  const f = fixture(Menu.SourceSavedEnvironmentMenu, { popup, environments, onStar: noop });
  assert.deepEqual(order(f.tree), ['b', 'c', 'a']);
  // a is used meanwhile: the open picker keeps its order; a new opening lists a first.
  const used = environments.map(row => row.id === 'a' ? { ...row, lastUsedAt: 99 } : row);
  assert.deepEqual(order(f.render({ popup, environments: used, onStar: noop })), ['b', 'c', 'a']);
  assert.deepEqual(order(fixture(Menu.SourceSavedEnvironmentMenu, { popup, environments: used, onStar: noop }).tree), ['a', 'b', 'c']);
  // A new environment joins by its last use without moving the rest.
  const added = [...used, item('d', 'Delta', 50)];
  assert.deepEqual(order(f.render({ popup, environments: added, onStar: noop })), ['d', 'b', 'c', 'a']);
  assert.equal(StartView.useStableEnvironmentOrder.name, 'p0');
});

test('h2 popup: the SearchablePopup (min-w-[260px]) with the search field fixed in the header; the sr-only status', () => {
  const closes = [];
  const popup = { anchor: null, side: 'bottom', align: 'start', label: 'Choose environment', onClose: reason => closes.push(reason) };
  const tree = fixture(Menu.SourceSavedEnvironmentMenu, { popup, environments: [], onStar: noop }).tree;
  const searchable = find(tree, node => node.type === Folder.EnvironmentSearchablePopup);
  assert.deepEqual([searchable.props.className, searchable.props.searchLabel, searchable.props.side, searchable.props.align, searchable.props.label],
    ['environment-picker-popup min-w-[260px]', 'Search environments…', 'bottom', 'start', 'Choose environment']);
  const status = find(tree, node => node.props.role === 'status');
  assert.deepEqual([status.type, status.props.className, status.props.children], ['span', 'sr-only', false]);
  // EnvironmentSearchablePopup: SourceMenu.Popup with yC's header (tx + rule), nothing highlighted, the rows below.
  const rendered = fixture(Folder.EnvironmentSearchablePopup, { ...searchable.props }).tree;
  assert.equal(rendered.props.initialHighlight, null); assert.equal(rendered.props.label, 'Choose environment');
  const header = rendered.props.header;
  assert.equal(header.type, Folder.SearchField); assert.equal(header.props.searchLabel, 'Search environments…');
  assert.equal(rendered.props.children.type, Menu.EnvironmentPickerBody);
  rendered.props.onClose('escape-key'); assert.deepEqual(closes, ['escape-key']);
  // The popup classes are official utilities released from source-menu.css's unlayered min-width.
  const css = source('src/source-environment-menu.css');
  assert.match(css, /\.smenu-popup\.environment-picker-popup,\s*\.smenu-popup\.environment-picker-more \{ min-width: revert-layer; \}/);
  const sheet = fs.readFileSync(path.join(ROOT, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  for (const name of ['min-w-[260px]', 'min-w-[220px]', 'w-max', 'min-w-48', 'max-w-96']) assert.ok(sheet.includes(`.${cssEscape(name)}{`), name);
});

test('main.jsx: the home environment menu opens the picker with its popup props instead of wrapping it', () => {
  const main = source('src/main.jsx');
  assert.match(main, /case "home-environment":\n\s*\/\/ R3-home[^\n]*\n\s*return <SourceSavedEnvironmentMenu popup=\{\{ anchor: menu\.anchor, side: ENV_MENUS\[menu\.kind\]\.side, align: ENV_MENUS\[menu\.kind\]\.align, label: t\(ENV_MENUS\[menu\.kind\]\.label\), onClose: closeMenu \}\}/);
  assert.match(main, /: menu\?\.kind === "home-environment" \? <React\.Fragment key=\{menu\.token \?\? menu\.kind\}>\{menuContent\(\)\}<\/React\.Fragment>\n\s*: ENV_MENUS\[menu\?\.kind\] \?/);
  assert.match(main, /onStar=\{id => savedEnvironments\.run\(\{ op: 'star', id \}\)/);
});

test('c3f9f1667 Me (LR): This computer offers its settings once the machine has variables of its own', async () => {
  const props = { grouped: true, inStartPage: true, checked: true, available: true, desktopOnlyHint: false, locked: false, downloadCta: false,
    onDownload: noop, onPick: noop, settingsOffered: true, machineVarsQueried: true, onOpenSettings: noop, star: null };
  const calls = [];
  const desktop = variables => ({ call: (action, request) => { calls.push([action, request]); return Promise.resolve({ variables }); } });
  const settings = tree => elements(tree.props.trailing).some(node => node.type?.name === 'BK');
  await withGlobal('desktop', desktop({ CLAUDE_CONFIG_DIR: '/x' }), async () => {
    const f = fixture(Rows.EnvironmentPickerComputer, props, { effects: true });
    assert.equal(settings(f.tree), false, 'not until the query answers');
    assert.equal(settings(await f.flush()), false, 'CLAUDE_CONFIG_DIR is not the machine’s own');
    f.close();
  });
  await withGlobal('desktop', desktop({ NODE_ENV: 'production' }), async () => {
    const f = fixture(Rows.EnvironmentPickerComputer, props, { effects: true });
    const tree = await f.flush();
    assert.equal(settings(tree), true);
    assert.equal(typeof tree.props.onKeyDown, 'function', 'ArrowRight opens the settings too');
    // A save bumps je's revision: the answer is stale until it is read again.
    Revision.getState().bump();
    assert.equal(settings(f.render()), false);
    f.close();
  });
  assert.deepEqual(calls[0], ['local-environment', { op: 'get' }]);
  // No desktop bridge: no query, no settings action.
  assert.equal(Adapters.localSessionEnvironment.get, undefined);
  assert.equal(Adapters.localEnvironmentAvailable(), false);
});

test('"Edit local environment" bumps the revision after a save, before it reports and closes', async () => {
  const before = Revision.getState().revision, order = [];
  const f = fixture(LocalDialog.EnvironmentForm, { loadedText: 'A=1', onDirtyChange: noop, pending: false, setPending: noop,
    save: async () => { order.push(['save', Revision.getState().revision]); return { changed: true }; },
    onSaved: () => order.push(['saved', Revision.getState().revision]), onClose: () => order.push(['close']) });
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick(); await tick();
  assert.deepEqual(order, [['save', before], ['saved', before + 1], ['close']]);
});

test('cd8823d73 ge "+ Add": the official Select trigger, recent folders with collision descriptions, No recent folders, Choose… footer', async () => {
  const calls = [];
  const call = async (action, params) => { calls.push([action, params]); return params?.path ?? '/picked/new'; };
  const recentFolders = [{ path: '/work/app' }, { path: '/one/shared' }, { path: '/two/shared' }];
  const f = fixture(Dialog, { initialTarget: { kind: 'local', cwd: '' }, recentFolders, onClose: noop, onSave: noop, call });
  const form = f.tree.props.children[0];
  const html = renderToStaticMarkup(React.createElement('section', null, form.props.children));
  // H with no text: the empty, aria-hidden box (fn `a(tt, {})`).
  assert.match(html, /<div aria-hidden="true" class="box-content min-h-11 rounded border-b border-transparent outline-dashed[^"]*"><span class="px-1"><\/span><\/div>/);
  assert.doesNotMatch(html, />Choose a folder</);
  // Ak select-mode trigger: data-cds Combobox, size sm, HO + outline + select + pe-sm, twMerged with ge's min-w-0 shrink; no caret.
  const trigger = html.match(/<div data-cds="Combobox" data-size="sm" class="([^"]+)"><button type="button" aria-label="Add" aria-haspopup="menu" aria-expanded="false" class="([^"]+)"><span id="[^"]+" class="min-w-0 flex-1 truncate"><span class="flex items-center gap-xs text-primary">(.*?)<\/span><\/span><\/button><\/div>/);
  assert.ok(trigger, html);
  assert.equal(unescape(trigger[1]), (await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js')).cdsClassNames(`${Select.selectTriggerClassName} ${Select.selectTriggerVariantClassNames.outline} ${Select.selectTriggerModeClassNames.select} pe-sm shrink-0`, 'min-w-0 shrink'));
  assert.match(trigger[1], /\bshrink\b/); assert.doesNotMatch(trigger[1], /shrink-0/);
  assert.equal(trigger[2], Select.selectTriggerButtonClassName);
  assert.match(trigger[3], new RegExp(`data-cds="Icon"[^>]*>${glyph('Add')}</span>Add`));
  assert.doesNotMatch(trigger[0], new RegExp(glyph('CaretDown')));
  // Open it: the host menu popup, raised over the dialog, end-aligned with ge's popup classes and fn's footer.
  const select = find(form, node => node.type === Folder.EnvironmentSelect);
  const s = fixture(Folder.EnvironmentSelect, select.props);
  find(s.tree, node => node.type === 'button').props.onClick(); s.render();
  const popup = find(s.tree, node => node.props.popupClassName !== undefined && node.props.items);
  const opened = fixture(popup.type, popup.props).tree;
  assert.deepEqual([opened.props.align, opened.props.side, opened.props.sideOffset, opened.props.layerBase, opened.props.className, opened.props.header],
    ['end', 'bottom', 6, 140, 'environment-select-popup w-max min-w-48 max-w-96', undefined]);
  const options = elements(opened.props.children).filter(node => node.props.onClick);
  assert.deepEqual(options.map(node => [node.props.children, node.props.description]), [['app', undefined], ['shared', '/one'], ['shared', '/two']]);
  options[1].props.onClick(); await tick();
  assert.deepEqual(calls, [['folder', { additional: true, path: '/one/shared' }]]);
  // The footer: fk rule, pk slot, the FooterAction (tA) as a menu row: Folder icon, "Choose a folder", "Choose…".
  const footer = fixture(opened.props.footer.type, opened.props.footer.props).tree;
  const [rule, slot] = React.Children.toArray(footer.props.children);
  assert.deepEqual([rule.props['aria-hidden'], rule.props.className, slot.props.className], ['true', Select.selectFooterDividerClassName, Select.selectFooterClassName]);
  const action = slot.props.children;
  assert.equal(action.type, Folder.EnvironmentSelect.FooterAction);
  const markup = renderToStaticMarkup(action);
  assert.match(markup, /^<button type="button" role="menuitem" tabindex="-1" aria-label="Choose a folder" class="cds-reset flex w-full items-center gap-2 min-h-control px-md rounded text-body[^"]*hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover">/);
  assert.match(markup, new RegExp(`<span class="flex size-icon shrink-0 items-center justify-center"><span[^>]*data-cds="Icon"[^>]*>${glyph('Folder')}</span></span>Choose…</button>$`));
  action.props.onClick(); await tick();
  assert.deepEqual(calls.at(-1), ['folder', { additional: true }]);
  // Every recent folder listed already: "No recent folders" in Ak's Empty (dk).
  const empty = fixture(popup.type, { ...popup.props, items: [] }).tree;
  assert.equal(renderToStaticMarkup(elements(empty.props.children)[0]), `<div class="${Select.selectEmptyClassName}">No recent folders</div>`);
  assert.equal(Select.selectEmptyClassName, 'empty:hidden px-md py-1.5 text-body text-muted select-none');
});

test('Ak past five options: the popup search (rk) filters by label or path (Sk) and Enter takes the first match', () => {
  const picked = [];
  const items = Array.from({ length: 6 }, (_, index) => ({ value: `/w/f${index}`, label: index === 4 ? 'Café' : `f${index}` }));
  const s = fixture(Folder.EnvironmentSelect, { items, onChange: value => picked.push(value), 'aria-label': 'Add', hideCaret: true });
  find(s.tree, node => node.type === 'button').props.onClick(); s.render();
  const popup = find(s.tree, node => node.props.items && node.props.searchable !== undefined);
  assert.equal(popup.props.searchable, true);
  const p = fixture(popup.type, popup.props);
  const header = p.tree.props.header;
  const search = fixture(header.type, header.props).tree;
  assert.equal(search.props.className, Select.selectPopupSearchClassName);
  search.props.onChange({ target: { value: 'cafe' } });
  assert.equal(Select.selectItemMatches(items[4], 'cafe'), true, 'xk strips diacritics');
  const filtered = p.render();
  assert.deepEqual(elements(filtered.props.children).filter(node => node.props.onClick).map(node => node.props.children), ['Café']);
  const field = fixture(filtered.props.header.type, filtered.props.header.props).tree;
  field.props.onKeyDown({ key: 'Enter', nativeEvent: {}, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(picked, ['/w/f4']);
});

test('shared-frame tx clear button: the CDS tooltip prop stays off the DOM (no React warning)', () => {
  const errors = [], original = console.error;
  console.error = (...args) => errors.push(args.join(' '));
  let html;
  try { html = renderToStaticMarkup(React.createElement(Fields.EnvironmentTextInput, { clearable: true, value: 'x', onChange: noop, 'aria-label': 'Name' })); }
  finally { console.error = original; }
  assert.match(html, /aria-label="Clear"|aria-label="[^"]+"[^>]*data-cds="Button"/);
  assert.doesNotMatch(html, /tooltip=/);
  assert.deepEqual(errors.filter(line => /tooltip/.test(line)), []);
  assert.match(source('src/generated/code-current/environment-field-controls.mjs'), /import \{ NativeFieldButton as \$l \} from "\.\.\/\.\.\/source-field-adapters\.jsx";/);
  assert.match(source('src/generated/code-current/environment-field-controls.mjs'), /tooltip: !1,/, 'the generated tx is unchanged');
});

test('home-env-07: the Clawd button carries O7 and ClawdLaptopInner’s classes; no host position rule reaches it', () => {
  const start = official('cc43287c9-DAfOi8yP.js');
  assert.match(start, /O7="absolute right-\[-13px\] bottom-\[calc\(var\(--cds-ring-outer,0px\)-144px\/11\)\] w-\[80px\] h-\[80px\] -scale-x-100"/);
  assert.match(start, /v\(LB,\{replayToken:e,listeningLoop:n,className:O7,replayOnClick:!0\}\)/);
  assert.match(official('cc13f8cc7--_rF5jpy.js'), /className:`\$\{r\?\?""\} border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-none \[&_path:not\(\[fill-opacity='0'\]\)\]:pointer-events-auto`,children:S/);
  assert.equal(PetClasses.clawdClassName, 'absolute right-[-13px] bottom-[calc(var(--cds-ring-outer,0px)-144px/11)] w-[80px] h-[80px] -scale-x-100');
  const stubs = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), document: { documentElement: { dataset: {} } } };
  const html = withGlobal('matchMedia', stubs.matchMedia, () => withGlobal('document', stubs.document, () => renderToStaticMarkup(React.createElement(Pet))));
  assert.equal(unescape(html), `<div class="sc-pet-slot " aria-hidden="true" style="z-index:2"><button type="button" tabindex="-1" aria-hidden="true" data-clawd="" class="${PetClasses.clawdClassName} ${PetClasses.clawdReplayButtonClassName}"><span class="sc-pet-animation w-full h-full"></span></button></div>`);
  // Every class is in the loaded official sheet; no local stylesheet targets the button any more.
  const sheet = fs.readFileSync(path.join(ROOT, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  for (const name of [...PetClasses.clawdClassName.split(' '), ...PetClasses.clawdReplayButtonClassName.split(' ')])
    assert.ok(sheet.includes(`.${cssEscape(name)}`), `${name} in c6a992d55`);
  const local = fs.readdirSync(path.join(ROOT, 'src')).filter(name => name.endsWith('.css')).map(name => source(`src/${name}`)).join('\n');
  assert.doesNotMatch(local, /\[data-clawd\]|\.sc-pet-slot\s*>\s*button/);
  assert.doesNotMatch(source('src/source-pet.jsx'), /className="sc-pet"/);
});

test('generators: the R3-home environment targets and the code-start outputs match their committed modules', async () => {
  const { extractCurrentCodeHelpers } = await import('../scripts/extract-code-ui-current.mjs');
  await extractCurrentCodeHelpers({ check: true, only: new Set(['environment-picker-keys.mjs', 'environment-machine-variables.mjs', 'environment-menu-rows.mjs',
    'environment-select-parts.mjs', 'environment-folder-view.mjs', 'environment-field-controls.mjs', 'environment-menu-controls.mjs']) });
  const { extractCodeStart } = await import('../scripts/extract-code-start.mjs');
  await extractCodeStart({ check: true });
  const start = JSON.parse(source('src/generated/code-start/manifest.json'));
  const pet = start.outputs.find(output => output.target === 'pet.mjs');
  assert.deepEqual(pet.bindings.map(binding => binding.name), ['O7']);
  assert.deepEqual(pet.fragments.map(fragment => [fragment.name, fragment.source]), [['clawdReplayButtonClassName', 'cc13f8cc7--_rF5jpy.js']]);
});
