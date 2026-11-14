// w10-editor-preview-shell-a: the split dev-server menu is cut from Claude Desktop 3.6556.2 cf580efe9-BFcQCjF9
// (`ai oi si ci li ui di fi pi mi`, React Compiler output). The section builder `li` is compared with the official slice
// evaluated in a vm context (same compiler helpers, same host primitives); the host menu is rendered through Vite SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import React from 'react';
import { c as useMemoCacheRuntime } from 'react/compiler-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { compilerHelpers } from '../scripts/official-3.6556.2.mjs';
import { serverMenuRows } from '../src/preview-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const officialFile = 'cf580efe9-BFcQCjF9.js';
const original = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', officialFile), 'utf8');
const adapterText = fs.readFileSync(path.join(app, 'src/generated/code-editor/preview-server-menu.mjs'), 'utf8');
const nodes = parsers.babel.parse(original, {}).program.body;
const declaration = name => {
  const node = nodes.find(node => node.id?.name === name || node.declarations?.some(d => d.id.name === name));
  assert.ok(node, `${officialFile}: ${name}`);
  const binding = node.declarations?.find(d => d.id.name === name);
  return binding ? `const ${original.slice(binding.start, binding.end)};` : original.slice(node.start, node.end);
};
const officialBody = ['ai', 'oi', 'si', 'ci', 'li', 'ui', 'di', 'fi', 'pi', 'mi'].map(declaration).join('\n');

// The compiler helpers exactly as shared-frame declares them (official-3.6556.2.mjs features), J9 = react/compiler-runtime c.
const helperSource = Object.values(compilerHelpers).filter(({ local }) => local !== 'J9').map(({ local, feature }) => local === 'J8' ? `const ${feature};` : feature).join('\n');
const helpers = vm.runInNewContext(`${helperSource}\n({${Object.values(compilerHelpers).filter(({ local }) => local !== 'J9').map(({ local }) => local).join(',')}})`, { Symbol });
helpers.J9 = useMemoCacheRuntime;

const Button = ({ children, icon, iconOnly, tooltip, ...props }) => jsx('button', { ...props, 'data-icon': icon, children });
const Spinner = () => jsx('i', { 'data-spinner': true });
const stable = value => value;
const react = { f: React.memo, m: React.useState, r: jsx, o: jsxs, s: React.Fragment, c: React.Fragment };
const padding = { top: 48, right: 8, bottom: 8, left: 8 };
// Official slice: every free name bound to the same host primitive the adapter receives.
const source = vm.runInNewContext(`(()=>{${officialBody};return {li,si};})()`, {
  ...helpers, ...react, i: () => 'ltr', g: Button, w: Spinner, R: stable, z: stable, X: () => void 0, Kn: event => event.preventDefault(), Fe: padding,
});
const stripped = adapterText.replace(/^import[\s\S]*?from\s*["'][^"']+["'];\n/gm, '').replace('export function', 'function');
const extracted = vm.runInNewContext(`${stripped}\ncreatePreviewServerMenu`, {
  ...helpers, ...react, i: () => 'ltr', ks: () => false, Fe: padding,
})({ Button, Spinner, useStable: stable, useOptionalStable: stable });

function read(hook, props) {
  let result;
  renderToStaticMarkup(jsx(() => { result = hook(props); return null; }, {}));
  return result;
}
const defaults = { servers: [], onRun() {}, onStop() {} };
const simplify = result => ({ trigger: result.trigger, sections: result.sections.map(section => ({
  key: section.key, header: section.header, noSeparator: section.noSeparator,
  items: section.items.map(({ label, leading, trailing, onSelect, ...rest }) => ({ ...rest,
    label: renderToStaticMarkup(jsx(React.Fragment, { children: label })),
    leading: renderToStaticMarkup(jsx(React.Fragment, { children: leading })),
    trailing: renderToStaticMarkup(jsx(React.Fragment, { children: trailing })),
  })),
})) });

test('generated server menu is the 3.6556.2 cf580efe9 slice (version, sources, verbatim declarations)', () => {
  assert.match(adapterText.split('\n')[0], /Claude Desktop 3\.6556\.2/);
  const area = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/code-editor/areas/preview-shell-a.json'), 'utf8'));
  assert.equal(area.referenceVersion, '3.6556.2');
  for (const entry of area.adapters) {
    assert.equal(entry.referenceVersion, '3.6556.2', entry.name);
    for (const ref of entry.sources) assert.equal(ref.base, 'ion', `${entry.name}: ${ref.name}`);
  }
  const server = area.adapters.find(entry => entry.name === 'preview-server-menu.mjs');
  assert.ok(server.sources.some(ref => ref.name === officialFile));
  // Root features (R2/E5): compiled builder and menu, the official popup context-menu guard and the empty-state copy.
  for (const feature of ['let $ = J9(64)', 'let $ = J9(39)', 'onContextMenu: ai,', 'empty: "No dev server configured"', 'icon: e.running ? (t ?? "Stop") : "Play"',
    'return { Menu: mi, useSections: li, isEmpty: si };', 'import { menuCollisionPadding as Fe } from "../code-composer/menu-collision-padding.mjs";',
    'from "../view-tabs/shared-frame-6jtSkIit.js";', 'import { useDirection as i } from "../view-tabs/vendor-frame-CnSY1sxv.js";'])
    assert.ok(adapterText.includes(feature), feature);
  // The 2.31226.0 shape is gone: no side/className props on the menu, no host Provider for the row label.
  for (const gone of ['side: f = "bottom"', 'Provider: c', 'onContextMenu: Mr', 'collisionPadding: w']) assert.ok(!adapterText.includes(gone), gone);
});

test('current server section structure matches the 3.6556.2 original across loading, empty, starting and multi-server states', () => {
  for (const state of [
    {}, { loading: true }, { loading: true, onAddServer() {} }, { onAddServer() {} },
    { servers: [{ id: 'a', label: 'Web', running: false }] },
    { servers: [{ id: 'a', label: 'Web', running: true, starting: true }] },
    { servers: [{ id: 'a', label: 'Web', running: true }, { id: 'b', label: 'API', running: false }], onStopAll() {}, onAddServer() {} },
    { loading: true, extraSections: [{ header: 'Other', items: [{ label: 'Extra' }] }] },
  ]) assert.equal(JSON.stringify(simplify(read(extracted.useSections, { ...defaults, ...state }))), JSON.stringify(simplify(read(source.li, { ...defaults, ...state }))));
  for (const state of [{ servers: [], loading: true }, { servers: [], loading: true, extraSections: [{ items: [{}] }] }, { servers: [{}] }])
    assert.equal(extracted.isEmpty(state), source.si(state));
});

test('source server row and its pointer-only button dispatch once and close; starting servers can stop', () => {
  const calls = [];
  const sections = read(extracted.useSections, { servers: [
    { id: 'web', label: 'Web', running: false },
    { id: 'api', label: 'API', running: true, starting: true },
  ], onRun: id => calls.push(['run', id]), onStop: id => calls.push(['stop', id]), onAction: () => calls.push(['close']) }).sections;
  sections[0].items[0].onSelect();
  const button = sections[0].items[1].trailing;
  button.props.onClick({ stopPropagation: () => calls.push(['stopPropagation']) });
  assert.deepEqual(calls, [['run', 'web'], ['close'], ['stopPropagation'], ['stop', 'api'], ['close']]);
  assert.equal(button.props.tabIndex, -1);
  assert.equal(button.props['aria-hidden'], true);
  assert.equal(button.props.className, 'min-w-8 shrink-0');
  assert.equal(button.props.variant, 'danger');
  // fizzy-lake "icons" is off (E12): shared-8 HF yields no override, so the running icon stays "Stop".
  assert.equal(button.props.icon, 'Stop');
  assert.ok(sections[0].items[1].leading);
});

test('Stop all follows original multiple-server rule; empty add-server menu suppresses placeholder', () => {
  const onStopAll = () => {};
  const running = { id: 'a', label: 'A', running: true };
  assert.equal(read(extracted.useSections, { ...defaults, servers: [running], onStopAll }).sections.length, 1);
  const two = read(extracted.useSections, { ...defaults, servers: [running, { id: 'b', label: 'B' }], onStopAll }).sections;
  assert.equal(two.at(-1).items[0].onSelect, onStopAll);
  assert.equal(two.at(-1).noSeparator, true);
  const add = () => {};
  const empty = read(extracted.useSections, { ...defaults, onAddServer: add }).sections;
  assert.equal(empty.length, 1); assert.equal(empty[0].key, 'add-server'); assert.equal(empty[0].items[0].onSelect, add);
});

test('a process remains in the menu after its launch configuration is removed', () => {
  const rows = serverMenuRows({ launch: { configs: [{ name: 'web', port: 3000 }, { name: 'api', port: 4000 }] },
    servers: [{ name: 'web', status: 'starting', port: 3001 }, { name: 'removed', status: 'running', port: 5000 }] });
  assert.deepEqual(rows.map(row => [row.name, row.status, row.port]), [['web', 'starting', 3001], ['api', 'stopped', 4000], ['removed', 'running', 5000]]);
  assert.equal(rows.at(-1).running, true);
});

// Host wiring through Vite SSR (real view-tabs helpers, host primitives).
let server, menu, address, items;
before(async () => {
  server = await createServer({ configFile: false, root: app, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  menu = await server.ssrLoadModule('/src/source-preview-server-menu.jsx');
  address = await server.ssrLoadModule('/src/source-preview-address.jsx');
  items = await server.ssrLoadModule('/src/generated/code-editor/preview-menu-items.mjs');
});
after(async () => { await server?.close(); });

test('SSR: the host dev-server menu trigger renders the official Cache icon button with the Dev servers label', () => {
  const html = renderToStaticMarkup(React.createElement(menu.SourcePreviewServerMenu, {
    rows: [{ name: 'web', port: 3000, running: true, status: 'running' }], loading: false, onStart() {}, onStop() {},
  }));
  assert.match(html, /aria-label="Dev servers"/);
  const empty = renderToStaticMarkup(React.createElement(menu.SourcePreviewServerMenu, { rows: [], loading: true, onStart() {}, onStop() {} }));
  // li: loading with no servers and no extra sections has no sections, so mi disables the trigger.
  assert.match(empty, /disabled=""/);
});

test('SSR: navigation row wraps the 3.6556.2 address field; reload is a navigation button, not a field button', () => {
  const html = renderToStaticMarkup(React.createElement(address.SourcePreviewNavigation, {
    canGoBack: true, canGoForward: false, canReload: true, onBack() {}, onForward() {}, onReload() {},
    children: React.createElement(address.SourcePreviewAddress, { state: { url: 'http://localhost:3000/' }, sessionId: 's1', onNavigate: () => true, onOpenExternal() {} }),
  }));
  assert.match(html, /role="group" aria-label="Navigation"/);
  assert.equal(html.split('aria-label="Reload"').length - 1, 1);
  assert.match(html, /aria-label="Open in default browser"/);
  // cf550b864 pe: the field input is ltr, and the display shows the host with the scheme spacers (data-scheme).
  assert.match(html, /<input dir="ltr"/);
  assert.match(html, /data-scheme="http:\/\/"/);
  assert.match(html, /group\/field relative h-full min-w-0 flex-1/);
  // c224804cc Y: "http://localhost:3000/" is shown as "localhost:3000".
  assert.match(html, />localhost:3000</);
});

test('menu items renderer: S(container, intl, onClose, rtl) uses the logical tooltip side and the RTL trailing-action key', () => {
  const Tooltip = ({ children, ...props }) => jsx('span', { 'data-tooltip': props.content, 'data-side': props.side, children });
  const Menu = new Proxy({}, { get: (_, part) => ({ children, ...props }) => jsx('div', { 'data-part': String(part), 'data-label': props.label ?? undefined, children }) });
  const intl = { formatMessage: ({ defaultMessage }) => defaultMessage };
  const render = items.createPreviewMenuItems({ Menu, Tooltip, Spinner });
  const ltr = renderToStaticMarkup(jsx(React.Fragment, { children: render(undefined, intl, undefined, false)({ label: 'Go', tooltip: 'Tip', trailingAction() {} }, 0) }));
  assert.match(ltr, /data-side="right"/);
  assert.match(ltr, /press right arrow to activate/);
  const rtl = renderToStaticMarkup(jsx(React.Fragment, { children: render(undefined, intl, undefined, true)({ label: 'Go', tooltip: 'Tip', trailingAction() {} }, 0) }));
  assert.match(rtl, /data-side="left"/);
  assert.match(rtl, /press left arrow to activate/);
});
