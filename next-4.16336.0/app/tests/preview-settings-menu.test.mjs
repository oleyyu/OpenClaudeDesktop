// w10-editor-preview-shell-b: the Preview settings menu, pane menu, link destination chooser and radio card are cut from
// Claude Desktop 3.6556.2 (c224804cc-Ct9XIdre `B V H ae oe U W`, ca5db7aaf-qq5selW3 `P F H U W G K q J Y X Z Q ee`,
// cf700d36e-BRuz1Q_U `p` + cebf5596d-q9cCbs9l `n r`, shared-frame-6jtSkIit `Mt kS sV cV`; React Compiler output).
// Each adapter is compared with the official declarations evaluated in a vm context (same compiler helpers, same host
// stubs); the host modules are rendered through Vite SSR (the adapters import view-tabs, which plain node cannot load).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { c as useMemoCacheRuntime } from 'react/compiler-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { compilerHelpers } from '../scripts/official-3.6556.2.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ionDir = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const generated = name => fs.readFileSync(path.join(app, 'src/generated/code-editor', name), 'utf8');
const parsed = new Map();
// Official top-level declarations, verbatim (a `var` declarator becomes `const`).
function declarations(file, names) {
  if (!parsed.has(file)) {
    const text = fs.readFileSync(path.join(ionDir, file), 'utf8');
    parsed.set(file, { text, body: parsers.babel.parse(text, {}).program.body });
  }
  const { text, body } = parsed.get(file);
  return names.map(name => {
    const node = body.find(node => node.id?.name === name || node.declarations?.some(d => d.id.name === name));
    assert.ok(node, `${file}: ${name}`);
    const binding = node.declarations?.find(d => d.id.name === name);
    return binding ? `const ${text.slice(binding.start, binding.end)};` : text.slice(node.start, node.end);
  }).join('\n');
}
// The adapter with its import lines removed, evaluated with the same names the imports bind.
const stripped = name => generated(name).replace(/^import[\s\S]*?from\s*["'][^"']+["'];\n/gm, '').replace('export function', 'function');

// The compiler helpers exactly as shared-frame declares them (official-3.6556.2.mjs features), J9 = react/compiler-runtime c.
const helperLocals = Object.values(compilerHelpers).filter(({ local }) => local !== 'J9');
const helpers = vm.runInNewContext(`${helperLocals.map(({ local, feature }) => local === 'J8' ? `const ${feature};` : feature).join('\n')}\n({${helperLocals.map(({ local }) => local).join(',')}})`, { Symbol });
helpers.J9 = useMemoCacheRuntime;

const noop = () => {};
const stable = value => value;
const intl = { formatMessage: (descriptor, values) => descriptor.defaultMessage.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? '') };
const useIntl = () => intl;
const padding = { top: 48, right: 8, bottom: 8, left: 8 };
// Values built inside a vm context carry that realm's prototypes; compare their structure.
const plain = value => JSON.parse(JSON.stringify(value));
const html = node => renderToStaticMarkup(jsx(React.Fragment, { children: node }));
// Primitive props only (functions, elements and objects are left to the children / dedicated assertions).
const attrs = props => Object.fromEntries(Object.entries(props).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
  .map(([key, value]) => [`data-${key.toLowerCase()}`, String(value)]));

// ------------------------------------------------------------------------------------------------ settings menu
const PaneStub = ({ sections, ...props }) => jsx('div', { ...attrs(props), 'data-sections': JSON.stringify(sections) });
const ConfirmStub = ({ title, description, confirmLabel, open, ...props }) => open ? jsxs('div', { ...attrs(props), 'data-confirm': confirmLabel, children: [title, '|', description] }) : null;
const settingsOfficial = vm.runInNewContext(`(()=>{${declarations('c224804cc-Ct9XIdre.js', ['B', 'V', 'H', 'ae', 'oe', 'U', 'W'])};return {ae,U,W,B};})()`,
  { ...helpers, o: React.memo, t: jsx, _: stable, k: PaneStub, u: ConfirmStub, w: useIntl });
const settings = vm.runInNewContext(`${stripped('preview-settings-menu.mjs')}\ncreatePreviewSettingsMenu`, { ...helpers, o: React.memo, t: jsx })(
  { useOptionalStable: stable, PaneMenu: PaneStub, ConfirmDialog: ConfirmStub, useIntl });
function read(hook, props) {
  let result;
  renderToStaticMarkup(jsx(() => { result = hook(props); return null; }, {}));
  return result.sections;
}
const all = { onOpenExternal: noop, onCopyUrl: noop, onScreenshot: noop, onShowAnnotationTools: noop,
  onOpenFile: noop, onShowSessionLogs: noop, onOpenLinksInPreviewChange: noop, onAutoOpenFilesChange: noop, onAutoVerifyChange: noop,
  onAllowedSites: noop, onImportChromeLogins: noop, onUseImportedCookies: noop, onClearBrowsingData: noop, onPreviewStorageChange: noop,
  previewStorage: 'none', viewportItems: [{ label: 'Responsive', checked: true }], autoVerify: true, autoOpenFiles: true,
  // 3.6556.2 dropped these two rows; a host that still passes them gets nothing.
  onExport: noop, onColorScheme: noop, colorScheme: 'system',
};

test('preview-shell-b adapters are the 3.6556.2 slices (version, sources, root features)', () => {
  const area = JSON.parse(generated('areas/preview-shell-b.json'));
  assert.equal(area.referenceVersion, '3.6556.2');
  assert.deepEqual(area.adapters.map(entry => entry.name), ['preview-settings-menu.mjs', 'preview-pane-menu.mjs', 'preview-link-chooser.mjs', 'preview-link-radio.mjs',
    'preview-allowed-sites.mjs']);
  for (const entry of area.adapters) {
    assert.equal(entry.referenceVersion, '3.6556.2', entry.name);
    for (const ref of entry.sources) assert.equal(ref.base, 'ion', `${entry.name}: ${ref.name}`);
    const text = generated(entry.name);
    assert.match(text.split('\n')[0], /Claude Desktop 3\.6556\.2/, entry.name);
    // Compiler helpers by semantic name from the concrete view-tabs file (R3/E41), never by minified name.
    assert.ok(text.includes('reactMemoCache as J9,'), entry.name);
    assert.doesNotMatch(text, /from "\.\.\/view-tabs\/index\.js"/, entry.name);
  }
  assert.deepEqual(area.adapters.map(entry => entry.sources.map(ref => ref.name)), [['c224804cc-Ct9XIdre.js'], ['ca5db7aaf-qq5selW3.js'],
    ['cf700d36e-BRuz1Q_U.js', 'cebf5596d-q9cCbs9l.js'], ['shared-frame-6jtSkIit.js', 'shared-frame-6jtSkIit.js'],
    ['c36734a81-CAUg1TAj.js', 'c4e7cbfa9-DST98yAi.js']]);
  const menu = generated('preview-settings-menu.mjs');
  for (const feature of ['let $ = J9(149)', 'autoOpenFiles: "Auto-open files Claude writes"', 'return { Menu: U, useSections: ae, ClearDataDialog: W, labels: B };'])
    assert.ok(menu.includes(feature), feature);
  for (const gone of ['onExport', 'colorScheme', 'export: "Export"']) assert.ok(!menu.includes(gone), gone);
  const pane = generated('preview-pane-menu.mjs');
  for (const feature of ['let $ = J9(31)', 'onContextMenu: P,', 'import { menuCollisionPadding as _ } from "../code-composer/menu-collision-padding.mjs";', 'return { Menu: H, Sections: U };'])
    assert.ok(pane.includes(feature), feature);
  for (const gone of ['Provider:', 'collisionPadding: u', 'className: c']) assert.ok(!pane.includes(gone), gone);
  const chooser = generated('preview-link-chooser.mjs');
  for (const feature of ['let $ = J9(57)', 'let $ = J9(10)', '"text-caption text-muted-as-secondary"', 'return p;']) assert.ok(chooser.includes(feature), feature);
  const radio = generated('preview-link-radio.mjs');
  for (const feature of ['let $ = J9(35)', 'className: kS', 'cdsClassNames as Q,', 'const kS = `text-footnote leading-snug ${Mt}`;',
    'const Mt = "text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]";']) assert.ok(radio.includes(feature), feature);
  assert.ok(!radio.includes('"text-footnote leading-snug text-muted"'));
});

test('settings sections match the 3.6556.2 ae across capability gates, disabled states, auto-open and storage modes', () => {
  for (const props of [{}, all, { ...all, previewStorage: 'shared' }, { ...all, previewStorage: 'session' }, { ...all, autoOpenFiles: false },
    { ...all, autoOpenFiles: undefined }, { ...all, onAutoOpenFilesChange: undefined }, { ...all, onOpenLinksInPreviewChange: undefined },
    { onOpenFile: noop }, { onAutoOpenFilesChange: noop }, { ...all, labels: { openLinksInPreview: 'Open links in built-in browser' } },
    { ...all, viewportDisabled: true, openExternalDisabled: true, copyUrlDisabled: true, screenshotDisabled: true }]) {
    assert.equal(JSON.stringify(read(settings.useSections, props)), JSON.stringify(read(settingsOfficial.ae, props)));
  }
  assert.equal(JSON.stringify(settings.labels), JSON.stringify(settingsOfficial.B));
});

test('3.6556.2 action order: no Export / Color scheme, Auto-open after Open links, callbacks and cookie modes', () => {
  const calls = [];
  const sections = read(settings.useSections, { ...all, onAutoVerifyChange: value => calls.push(['verify', value]),
    onAutoOpenFilesChange: value => calls.push(['autoOpen', value]), onPreviewStorageChange: value => calls.push(['storage', value]) });
  assert.deepEqual(plain(sections.map(section => [section.header ?? null, section.items.map(item => item.label)])), [
    [null, ['Open in default browser', 'Copy URL', 'Save screenshot', 'Show annotation tools', 'Open HTML file…']],
    [null, ['Viewport', 'Show dev server logs']],
    [null, ['Open links in Browser panel', 'Auto-open files Claude writes', 'Auto-verify changes', 'Manage allowed sites…']],
    ['Cookies', ['Import cookies…', 'Use cookies you already imported', 'Keep cookies', 'Clear browsing data']],
  ]);
  const [, autoOpen, verify] = sections[2].items;
  assert.equal(autoOpen.checked, true); assert.equal(autoOpen.checkedRole, 'checkbox'); assert.equal(autoOpen.keepOpen, true);
  autoOpen.onSelect(); verify.onSelect();
  const cookies = sections[3].items.find(item => item.label === 'Keep cookies');
  assert.deepEqual(plain(cookies.items.map(item => item.label)), ['Until quit', 'Shared', 'Per session']);
  assert.equal(cookies.hint, 'Until quit'); assert.equal(cookies.items[0].checked, true);
  cookies.items[2].onSelect();
  assert.deepEqual(calls, [['autoOpen', false], ['verify', false], ['storage', 'session']]);
  // `c === !0`: an unknown preference reads unchecked and selecting it turns it on.
  const unknown = read(settings.useSections, { onAutoOpenFilesChange: value => calls.push(['unknown', value]) })[0].items[0];
  assert.equal(unknown.checked, false); unknown.onSelect();
  assert.deepEqual(plain(calls.at(-1)), ['unknown', true]);
  // V3-w11-sweep-shell-b: the slice's item is the only one — the host wrapper passes the props straight through.
  assert.equal(sections.flatMap(section => section.items).filter(item => item.label === settings.labels.autoOpenFiles).length, 1);
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/source-preview-settings-menu.jsx'), 'utf8'), /withAutoOpenFilesItem/);
});

test('settings menu wrapper and clear-data dialog render like the 3.6556.2 U / W', () => {
  for (const props of [{ paneName: 'Preview', ...all }, { paneName: 'Preview', disabled: true, onOpenFile: noop }])
    assert.equal(html(jsx(settings.Menu, props)), html(jsx(settingsOfficial.U, props)));
  assert.match(html(jsx(settings.Menu, { paneName: 'Preview', onOpenFile: noop })), /^<span data-preview-settings-menu="true" class="contents"><div data-onopenchange|^<span data-preview-settings-menu="true" class="contents"><div data-panename="Preview" data-unroll="false"/);
  for (const props of [{ isOpen: true, previewStorage: 'shared', onClose: noop, onConfirm: noop }, { isOpen: true, previewStorage: 'none', onClose: noop, onConfirm: noop }, { isOpen: false, onClose: noop }])
    assert.equal(html(jsx(settings.ClearDataDialog, props)), html(jsx(settingsOfficial.W, props)));
  assert.match(html(jsx(settings.ClearDataDialog, { isOpen: true, previewStorage: 'shared', onClose: noop })), /data-confirmvariant="danger" data-confirm="Clear data">Clear browsing data\?\|This deletes the cookies, sign-ins, and site data the browser saves for every Code session and Cowork\./);
});

// ------------------------------------------------------------------------------------------------------- pane menu
const part = name => ({ children, render, ...props }) => jsxs('div', { 'data-part': name, ...attrs(props),
  children: [render, typeof children === 'function' ? children('') : children] });
const Menu = Object.fromEntries(['Root', 'Trigger', 'Popup', 'Separator', 'Group', 'GroupLabel', 'Item', 'Submenu', 'SubmenuTrigger', 'SearchablePopup'].map(name => [name, part(name)]));
const Button = ({ icon, children, ...props }) => jsx('button', { 'data-icon': icon, ...attrs(props), children });
const Tooltip = ({ content, children, side }) => jsx('span', { 'data-tooltip': String(content), 'data-side': side, children });
const asElement = node => node?.nodeType === 1 ? node : null;
const paneOfficial = vm.runInNewContext(`(()=>{${declarations('ca5db7aaf-qq5selW3.js', ['P', 'F', 'H', 'U', 'W', 'G', 'K', 'q', 'J', 'Y', 'X', 'Z', 'Q', 'ee'])};return {H,U};})()`, {
  ...helpers, Symbol, t: jsx, n: jsxs, r: React.Fragment, i: React.Fragment, o: React.memo, s: React.useState,
  c: Button, d: Menu, f: Tooltip, g: useIntl, l: () => undefined, p: () => null, u: asElement, y: () => false, _: padding });
const pane = vm.runInNewContext(`${stripped('preview-pane-menu.mjs')}\ncreatePreviewPaneMenu`, {
  ...helpers, Symbol, t: jsx, n: jsxs, r: React.Fragment, i: React.Fragment, o: React.memo, s: React.useState, _: padding,
})({ Menu, Button, Tooltip, useIntl, usePortal: () => undefined, isTextInput: () => false, asElement, useOwnerWindow: () => null });

test('pane menu trigger, unrolled single action, sections, submenus and searchable submenus match the 3.6556.2 H', () => {
  const sectionsList = [
    [{ items: [] }],
    [{ items: [{ label: 'Copy', icon: 'Copy', onSelect: noop }] }],
    [{ items: [{ label: 'Copy', icon: 'Copy', onSelect: noop, variant: 'danger' }] }],
    [{ items: [{ label: 'Word wrap', checked: true, checkedRole: 'checkbox', keepOpen: true, onSelect: noop, tooltip: 'Wraps', tooltipSide: 'left' }] },
      { header: 'Cookies', items: [{ label: 'Keep cookies', hint: 'Shared', items: [{ label: 'Until quit', checked: false, checkedRole: 'radio', onSelect: noop }] }] },
      { noSeparator: true, items: [{ label: 'Branch', searchLabel: 'Search', searchEmptyLabel: 'None', items: [{ label: 'main', onSelect: noop }, { label: 'dev', disabled: true }] }] },
      { items: [] }, { items: [{ label: 'Clear', variant: 'danger', separatorBefore: true, disabled: true, disabledReason: 'Nothing to clear', onSelect: noop }] }],
  ];
  for (const sections of sectionsList) for (const extra of [{}, { unroll: false }, { disabled: true }]) {
    const props = { sections, paneName: 'Preview', onOpenChange: noop, ...extra };
    assert.equal(html(jsx(pane.Menu, props)), html(jsx(paneOfficial.H, props)), JSON.stringify(props));
  }
  assert.equal(html(jsx(pane.Menu, { sections: sectionsList[0] })), '');
  assert.match(html(jsx(pane.Menu, { sections: sectionsList[1], paneName: 'Preview' })), /^<button data-icon="Copy" data-variant="ghost" data-icononly="true" data-aria-label="Copy"/);
  const menu = html(jsx(pane.Menu, { sections: sectionsList[3], paneName: 'Preview', unroll: false }));
  assert.match(menu, /<span data-tooltip="Preview settings"><div data-part="Trigger"><button data-icon="DotsVertical"/);
  assert.match(menu, /<div data-part="Popup" data-side="bottom" data-align="end">/);
  assert.match(menu, /data-part="SearchablePopup" data-searchlabel="Search" data-query="" data-maxvisibleitems="10.5"/);
});

// ------------------------------------------------------------------------------------------- link chooser + radio
const RadioGroup = { Root: ({ children, ...props }) => jsx('div', { 'data-part': 'RadioRoot', ...attrs(props), children }),
  Card: ({ leading, label, description, ...props }) => jsxs('div', { 'data-part': 'Card', ...attrs(props), children: [leading, label, '|', description] }) };
const Icon = ({ name }) => jsx('i', { 'data-icon': name });
const Dialog = ({ children, open, title, description, confirmLabel, ...props }) => open ? jsxs('div', { 'data-part': 'Dialog', ...attrs(props), children: [title, '|', description, '|', confirmLabel, children] }) : null;
const hosts = { useShortcut: () => ['⌘'], platform: () => 'MacIntel', useChooserSeen: () => [false, noop], useLinksPreference: () => [true, noop],
  useModalPresence: noop, useBrowserLabel: () => 'Open in default browser' };
const armOfficial = vm.runInNewContext(`(()=>{${declarations('cebf5596d-q9cCbs9l.js', ['n', 'r'])};return n;})()`, { ...helpers, e: React.useEffect, t: React.useState });
const chooserOfficial = vm.runInNewContext(`(()=>{${declarations('cf700d36e-BRuz1Q_U.js', ['p'])};return p;})()`, {
  ...helpers, t: jsx, n: jsxs, r: React.memo, i: React.useState, ee: React.useId, ie: armOfficial, te: Dialog, o: Icon, s: RadioGroup, re: useIntl,
  a: hosts.useShortcut, ne: hosts.platform, c: hosts.useChooserSeen, l: hosts.useLinksPreference, u: hosts.useModalPresence, d: hosts.useBrowserLabel });
const chooser = vm.runInNewContext(`${stripped('preview-link-chooser.mjs')}\ncreatePreviewLinkChooser`, {
  ...helpers, t: jsx, n: jsxs, r: React.memo, i: React.useState, ee: React.useId, armState: React.useState, armEffect: React.useEffect,
})({ RadioGroup, Icon, ConfirmationDialog: Dialog, useIntl, ...hosts });

test('link destination chooser matches the 3.6556.2 p (pull request copy, armed input, muted-as-secondary hint)', () => {
  for (const props of [{ isOpen: true, onClose: noop }, { isOpen: true, onClose: noop, opensPullRequest: true }, { isOpen: true, onClose: noop, protectInput: true, armKey: 'a' }, { isOpen: false, onClose: noop }])
    assert.equal(html(jsx(chooser, props)), html(jsx(chooserOfficial, props)), JSON.stringify(props));
  const open = html(jsx(chooser, { isOpen: true, onClose: noop, opensPullRequest: true }));
  assert.match(open, /data-initialfocus="cancel" data-classname="epitaxy-root break-words"/);
  assert.match(open, /Opens this pull request beside the chat\. Other links open there too, where Claude can see and act on the page\./);
  assert.match(open, /<p id="[^"]+" aria-live="polite" class="text-caption text-muted-as-secondary">⌘-click a link to open it in your default browser\.<\/p>/);
  // protectInput arms after 500 ms: the first render keeps the confirm disabled.
  assert.match(html(jsx(chooser, { isOpen: true, onClose: noop, protectInput: true, armKey: 'a' })), /data-disabled="true"/);
});

const Radio = React.forwardRef(({ children, value, ...props }, ref) => jsx('button', { ref, 'data-value': value, ...attrs(props), children }));
const Indicator = ({ topAlign }) => jsx('span', { 'data-indicator': String(topAlign) });
const join = (...parts) => parts.filter(Boolean).join(' ');
const radioContext = { ...helpers, X: React.forwardRef, be: React.useId, b: jsx, G: jsxs, _: React.Fragment, Q: join, Qe: Radio, iV: Indicator, qS: () => false, qs: () => undefined };
const radioOfficial = vm.runInNewContext(`(()=>{${declarations('shared-frame-6jtSkIit.js', ['Mt', 'kS', 'sV', 'cV'])};return cV;})()`, radioContext);
const radio = vm.runInNewContext(`${stripped('preview-link-radio.mjs')}\ncreatePreviewLinkRadio`, radioContext)(
  { Radio, Indicator, useWrap: () => false, onMouseDown: () => undefined });

test('radio card matches the 3.6556.2 cV (official description class kS)', () => {
  for (const props of [{ value: 'preview', label: 'Open in app' }, { value: 'browser', label: 'Browser', description: 'Outside', leading: jsx('i', {}), trailing: 'x', className: 'extra', disabled: true }])
    assert.equal(html(jsx(radio, props)), html(jsx(radioOfficial, props)));
  assert.match(html(jsx(radio, { value: 'b', label: 'B', description: 'Outside' })),
    /<span id="[^"]+" class="text-footnote leading-snug text-\[color:var\(--cds-text-stays-secondary,var\(--cds-text-muted\)\)\]">Outside<\/span>/);
});

// ----------------------------------------------------------------------------------------------- host (Vite SSR)
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
let server, settingsHost, chooserHost;
before(async () => {
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  settingsHost = await server.ssrLoadModule('/src/source-preview-settings-menu.jsx');
  chooserHost = await server.ssrLoadModule('/src/source-preview-link-chooser.jsx');
});
// A module in the host graph may still be running a dynamic import(): close only once the SSR runner has settled.
after(() => closeWhenSettled(server));

test('host: the Preview settings menu renders its trigger through the 3.6556.2 slice; the factory drops Provider / collisionPadding', () => {
  const menu = renderToStaticMarkup(React.createElement(settingsHost.SourcePreviewSettingsMenu, { onOpenFile: noop, onScreenshot: noop }));
  assert.match(menu, /^<span data-preview-settings-menu="true" class="contents">/);
  assert.match(menu, /<button[^>]*aria-label="[^"]+"/);
  const host = fs.readFileSync(path.join(app, 'src/source-preview-settings-menu.jsx'), 'utf8');
  assert.match(host, /createPreviewPaneMenu\(\{ Menu: MenuHost, Button, Tooltip: SourceTooltip,\n  useIntl: useRoutineIntl, usePortal: \(\) => undefined,\n/);
  assert.doesNotMatch(host, /Provider: React\.Fragment|collisionPadding: 8/);
  assert.equal(typeof chooserHost.SourcePreviewLinkChooser, 'object');
});
