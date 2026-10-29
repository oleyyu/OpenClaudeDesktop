// w10-shell-auto-open-pref (notdone 43, menus:N1, panes:C5-4): the 3.6556.2 "Auto-open files Claude writes"
// preference — its store (c22d6171c launchAutoOpenFiles over shared-78 MC), the Settings › Code › Browser row
// (c71860c77-C3tXoNVw Or) and the Preview pane menu item (c224804cc-Ct9XIdre ae `G`, cf580efe9-BFcQCjF9 wiring).
// Official chunks are read as text only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AUTO_OPEN_FILES_DESCRIPTION, AUTO_OPEN_FILES_KEY, autoOpenFilesEnabled, autoOpenFilesSettingRow, createAutoOpenFilesStore,
} from '../src/auto-open-files-model.mjs';
import zh from '../electron/i18n/zh-CN/settings.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const ion = name => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
const asar = name => fs.readFileSync(path.join(snapshot, 'asar/.vite/build', name), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const flush = () => new Promise(resolve => setImmediate(resolve));

// ------------------------------------------------------------------------------------------------ official evidence
test('official: the preference key, its default and the readers this lane mirrors', () => {
  assert.equal(count(ion('c22d6171c-C3t7W9JR.js'), 'c=e("launchAutoOpenFiles",!0)'), 1);
  const main = asar('index.chunk-jPKPzV-P.js');
  assert.equal(count(main, 'launchEnabled:!0,launchAutoOpenFiles:!0,'), 1);
  assert.equal(count(main, 'launchAutoOpenFiles:O().optional().meta(s_("security"))'), 1);
  // Settings row: label, both descriptions (r = frontend_preview_external_domains), switch wiring, before Keep cookies.
  const settings = ion('c71860c77-C3tXoNVw.js');
  const label = settings.indexOf('defaultMessage:"Auto-open files Claude writes",id:"3r6quQWFdB"');
  assert.ok(label > 0);
  assert.ok(settings.indexOf('"HTML, images, PDFs, and videos Claude writes open in the built-in browser.",id:"NShGei0Ifc"') > label);
  assert.ok(settings.indexOf('defaultMessage:"HTML, images, PDFs, and videos Claude writes open in the Preview pane.",id:"4uNKbBb+5S"') > label);
  assert.equal(count(settings, 'checked:u,disabled:!d,onCheckedChange:mn'), 1);
  assert.ok(settings.indexOf('defaultMessage:"Keep cookies",id:"e6Cv5Y4QTL"', label) > label);
  // Preview menu: the label, the `G` item shape, the order Open links… → Auto-open → Auto-verify.
  const menu = ion('c224804cc-Ct9XIdre.js');
  assert.equal(count(menu, 'autoOpenFiles:"Auto-open files Claude writes"'), 1);
  assert.equal(count(menu, 'if(G){let e=c===!0,'), 1);
  assert.equal(count(menu, '()=>A?.(c!==!0)'), 1);
  const items = ['openLinksInPreview', 'autoOpenFiles', 'autoVerify'].map(key => menu.indexOf(`{label:q.${key},checked:`));
  assert.ok(items.every(at => at > 0) && items[0] < items[1] && items[1] < items[2], String(items));
  assert.equal(count(menu, '{label:q.autoOpenFiles,checked:e,checkedRole:"checkbox",keepOpen:!0,onSelect:t}'), 1);
  // Pane wiring: the item's write only while the key is known and the session is local.
  const pane = ion('cf580efe9-BFcQCjF9.js');
  assert.equal(count(pane, 'autoOpenFiles:Y,onAutoOpenFilesChange:ki(Ae,oe)'), 1);
  assert.equal(count(pane, 'function ki(e,t){return e&&t?vn:void 0}'), 1);
});

// ------------------------------------------------------------------------------------------------------------ model
test('model: unset reads as on; the settings row follows Or (`p = d || !f`, invisible until loaded, disabled = !hasKey)', () => {
  assert.equal(AUTO_OPEN_FILES_KEY, 'launchAutoOpenFiles');
  assert.equal(autoOpenFilesEnabled(undefined), true);
  assert.equal(autoOpenFilesEnabled({}), true);
  assert.equal(autoOpenFilesEnabled({ launchAutoOpenFiles: true }), true);
  assert.equal(autoOpenFilesEnabled({ launchAutoOpenFiles: false }), false);
  assert.deepEqual(autoOpenFilesSettingRow({ enabled: true, hasKey: false, loadAttempted: false }), { shown: true, invisible: true, checked: true, disabled: true });
  assert.deepEqual(autoOpenFilesSettingRow({ enabled: false, hasKey: true, loadAttempted: true }), { shown: true, invisible: false, checked: false, disabled: false });
  assert.deepEqual(autoOpenFilesSettingRow({ enabled: true, hasKey: false, loadAttempted: true }), { shown: false, invisible: false, checked: true, disabled: true });
});

const noop = () => {};
const all = { onOpenExternal: noop, onCopyUrl: noop, onScreenshot: noop, onShowAnnotationTools: noop,
  onOpenFile: noop, onExport: noop, onColorScheme: noop, onShowSessionLogs: noop,
  onOpenLinksInPreviewChange: noop, onAutoVerifyChange: noop, onAllowedSites: noop,
  onImportChromeLogins: noop, onUseImportedCookies: noop, onClearBrowsingData: noop, onPreviewStorageChange: noop,
  previewStorage: 'none', viewportItems: [{ label: 'Responsive', checked: true }], colorScheme: 'system', autoVerify: true,
};
// The 3.6556.2 slice imports view-tabs (plain node cannot load it): it is loaded through Vite SSR in before().
let useSections, labels;
function sectionsFor(props) {
  let result;
  renderToStaticMarkup(React.createElement(() => { result = useSections(props); return null; }));
  return result.sections;
}

const names = sections => sections.map(section => [section.header ?? null, section.items.map(item => item.label)]);

// V3-w11-sweep-shell-b: the generated menu is the 3.6556.2 slice, which lists the item itself (c224804cc ae `G`); the
// host passes autoOpenFiles / onAutoOpenFilesChange straight through (no host-side insertion any more).
const AUTO_OPEN = 'Auto-open files Claude writes';
const autoOpenItems = sections => sections.flatMap(section => section.items).filter(item => item.label === AUTO_OPEN);
test('menu: the 3.6556.2 slice lists the item where c224804cc ae puts it, once, only with a change handler', () => {
  const calls = [];
  const shown = sectionsFor({ ...all, autoOpenFiles: true, onAutoOpenFilesChange: value => calls.push(value) });
  assert.equal(labels.autoOpenFiles, AUTO_OPEN);
  assert.equal(autoOpenItems(shown).length, 1);
  const group = shown.find(section => section.items.some(item => item.label === AUTO_OPEN));
  assert.equal(group.header, undefined);
  assert.deepEqual(group.items.map(item => item.label), ['Open links in Browser panel', AUTO_OPEN, 'Auto-verify changes', 'Manage allowed sites…']);
  const [item] = autoOpenItems(shown);
  assert.equal(item.checked, true); assert.equal(item.checkedRole, 'checkbox'); assert.equal(item.keepOpen, true);
  item.onSelect();
  // `checked: c === !0`: an unknown preference reads unchecked and selecting it turns it on.
  const [unset] = autoOpenItems(sectionsFor({ ...all, autoOpenFiles: undefined, onAutoOpenFilesChange: value => calls.push(value) }));
  assert.equal(unset.checked, false); unset.onSelect();
  assert.deepEqual(calls, [false, true]);
  // No handler (official `G` false): no item.
  assert.equal(autoOpenItems(sectionsFor({ ...all, autoOpenFiles: true })).length, 0);
});

// ------------------------------------------------------------------------------------------------------------ store
function fakeDesktop({ read = { launchAutoOpenFiles: true }, save = patch => ({ ...patch }) } = {}) {
  const handlers = new Set(), calls = [];
  return {
    calls,
    emit: event => { for (const handler of handlers) handler(event); },
    api: {
      call: async (action, params) => {
        calls.push([action, params]);
        if (action === 'auto-open-files-read') { if (read instanceof Error) throw read; return read; }
        if (action === 'settings') return save(params);
        throw new Error(`unexpected ${action}`);
      },
      onEvent: handler => { handlers.add(handler); return () => handlers.delete(handler); },
    },
  };
}

test('store: hydrates like MC (`t[e] === !0`, `e in t`) on first subscribe and follows config-updated', async () => {
  const desktop = fakeDesktop({ read: { launchAutoOpenFiles: false } });
  const store = createAutoOpenFilesStore({ desktop: () => desktop.api });
  assert.deepEqual(store.getState(), { enabled: true, hasKey: false, loadAttempted: false });
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  await flush();
  assert.deepEqual(store.getState(), { enabled: false, hasKey: true, loadAttempted: true });
  assert.equal(store.getSnapshot(), false);
  assert.deepEqual(desktop.calls, [['auto-open-files-read', undefined]]);
  const stable = store.getState();
  desktop.emit({ kind: 'config-updated', config: { launchAutoOpenFiles: false, theme: 'dark' } });
  assert.equal(store.getState(), stable, 'unchanged state keeps its identity');
  // A broadcast config without the key: never saved, the default on.
  desktop.emit({ kind: 'config-updated', config: { theme: 'dark' } });
  assert.equal(store.getSnapshot(), true);
  desktop.emit({ kind: 'session-list', config: { launchAutoOpenFiles: false } });
  assert.equal(store.getSnapshot(), true);
  assert.ok(notified >= 2);
  // A second subscriber does not read again.
  store.subscribe(noop); await flush();
  assert.equal(desktop.calls.length, 1);
});

test('store: set saves through main settings and rolls back when the save fails', async () => {
  const desktop = fakeDesktop();
  const store = createAutoOpenFilesStore({ desktop: () => desktop.api });
  store.subscribe(noop); await flush();
  store.set(false);
  assert.equal(store.getSnapshot(), false);
  await flush();
  assert.deepEqual(desktop.calls.at(-1), ['settings', { launchAutoOpenFiles: false }]);
  const failing = fakeDesktop({ save: () => { throw new Error('disk full'); } });
  const other = createAutoOpenFilesStore({ desktop: () => failing.api });
  other.subscribe(noop); await flush();
  other.set(false);
  assert.equal(other.getSnapshot(), false);
  await flush();
  assert.equal(other.getSnapshot(), true);
  // A connected writer (a caller holding the profile config) is used instead of the direct call.
  const written = [];
  const connected = createAutoOpenFilesStore({ desktop: () => null });
  connected.connect(false, value => written.push(value));
  assert.deepEqual(connected.getState(), { enabled: false, hasKey: true, loadAttempted: true });
  connected.set(true); await flush();
  assert.deepEqual(written, [true]);
});

test('store: no desktop preference API marks the load attempted with no key (row and item hidden)', async () => {
  const store = createAutoOpenFilesStore({ desktop: () => null });
  store.subscribe(noop);
  assert.deepEqual(store.getState(), { enabled: true, hasKey: false, loadAttempted: true });
  assert.equal(autoOpenFilesSettingRow(store.getState()).shown, false);
  const failed = createAutoOpenFilesStore({ desktop: () => fakeDesktop({ read: new Error('Untrusted renderer.') }).api });
  failed.subscribe(noop); await flush();
  assert.deepEqual(failed.getState(), { enabled: true, hasKey: false, loadAttempted: true });
});

// ----------------------------------------------------------------------------------------------- host wiring (text)
test('host: main.cjs keeps and reads the preference; the pane and menu wire the official props; zh covers the copy', () => {
  const main = local('electron/main.cjs');
  assert.equal(count(main, 'if (typeof p.launchAutoOpenFiles === "boolean") config.launchAutoOpenFiles = p.launchAutoOpenFiles;'), 1);
  assert.equal(count(main, 'case "auto-open-files-read": return { launchAutoOpenFiles: config?.launchAutoOpenFiles !== false };'), 1);
  const pane = local('src/source-preview-pane.jsx');
  assert.equal(count(pane, 'const autoOpenFilesProps = useAutoOpenFilesMenuProps(sessionId);'), 1);
  assert.equal(count(pane, 'onOpenLinksInPreviewChange={value => previewLinksStore.set(value)} {...autoOpenFilesProps}'), 1);
  const menu = local('src/source-preview-settings-menu.jsx');
  assert.match(menu, /createPreviewSettingsMenu\(\{ useOptionalStable, PaneMenu, ConfirmDialog,/);
  assert.doesNotMatch(menu, /withAutoOpenFilesItem|AutoOpenFilesPaneMenu/);
  assert.match(menu, /<source\.Menu paneName=\{t\('Preview'\)\} \{\.\.\.props\} labels=/);
  assert.match(menu, /onAutoOpenFilesChange: state\.hasKey && sessionId \? store\.set : undefined/);
  assert.equal(zh['Auto-open files Claude writes'], '自动打开 Claude 写入的文件');
  assert.equal(zh[AUTO_OPEN_FILES_DESCRIPTION], 'Claude 写入的 HTML、图片、PDF 和视频会在预览面板中打开。');
  for (const value of [zh['Auto-open files Claude writes'], zh[AUTO_OPEN_FILES_DESCRIPTION]]) assert.match(value, /Claude/);
});

// --------------------------------------------------------------------------------------------- SSR: Settings › Browser
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
let server, Settings, store, menuModule;
before(async () => {
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  ({ autoOpenFilesStore: store } = await server.ssrLoadModule('/src/auto-open-files-model.mjs'));
  menuModule = await server.ssrLoadModule('/src/source-preview-settings-menu.jsx');
  const { createPreviewSettingsMenu } = await server.ssrLoadModule('/src/generated/code-editor/preview-settings-menu.mjs');
  ({ useSections, labels } = createPreviewSettingsMenu({ useOptionalStable: value => value }));
});
// A module in the host graph may still be running a dynamic import(): close only once the SSR runner has settled.
after(() => closeWhenSettled(server));
const page = (config = {}) => renderToStaticMarkup(React.createElement(Settings, { open: true, config: { threadIds: [], ...config },
  model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [] }, busy: false, initialSection: 'code',
  desktopCall: async () => ({}), onSave: async () => ({}), onClose() {} }));
const settingIds = html => [...html.matchAll(/data-setting-id="([^"]+)"/g)].map(match => match[1]);
const control = (html, label) => new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`).exec(html)?.[0] ?? '';

test('SSR Settings › Code › Browser: the row sits between Open links and Keep cookies with the Preview pane copy', () => {
  // V3-w11-sweep-shell-b: before the first read the row is Or's `invisible` placeholder (`className: f ? void 0 :
  // "invisible"`): laid out in its place, hidden, its switch disabled (`disabled: !d`, the key not known yet).
  const rowTag = html => /<div class="([^"]*)"[^>]*data-setting-id="launchAutoOpenFiles"/.exec(html)?.[1];
  const loadingHtml = page();
  const loading = settingIds(loadingHtml), from = loading.indexOf('agentPreview');
  assert.deepEqual(loading.slice(from, from + 5), ['agentPreview', 'previewLinks', 'launchAutoOpenFiles', 'previewStorage', 'previewAllowedSites']);
  assert.equal(rowTag(loadingHtml), 'ss-row invisible');
  assert.match(control(loadingHtml, 'Auto-open files Claude writes'), /disabled/);
  assert.equal(count(ion('c71860c77-C3tXoNVw.js'), 'className:f?void 0:"invisible"'), 1);
  store.connect(true);
  const html = page();
  const ids = settingIds(html), at = ids.indexOf('agentPreview');
  assert.deepEqual(ids.slice(at, at + 5), ['agentPreview', 'previewLinks', 'launchAutoOpenFiles', 'previewStorage', 'previewAllowedSites']);
  assert.equal(rowTag(html), 'ss-row');
  assert.match(html, /HTML, images, PDFs, and videos Claude writes open in the Preview pane\./);
  assert.doesNotMatch(html, /open in the built-in browser\./);
  const toggle = control(html, 'Auto-open files Claude writes');
  assert.match(toggle, /aria-checked="true"/);
  assert.doesNotMatch(toggle, /disabled/);
  store.connect(false);
  assert.match(control(page(), 'Auto-open files Claude writes'), /aria-checked="false"/);
  // Browser tools off hides it with the other sub-rows (official `c && …`).
  assert.equal(settingIds(page({ agentPreview: false })).includes('launchAutoOpenFiles'), false);
});

test('SSR Preview menu props: the write exists only with a known key and a session (ki(Ae, oe))', () => {
  const { useAutoOpenFilesMenuProps } = menuModule;
  const read = (sessionId, s) => { let result; renderToStaticMarkup(React.createElement(() => { result = useAutoOpenFilesMenuProps(sessionId, s); return null; })); return result; };
  const known = createAutoOpenFilesStore({ desktop: () => null }); known.connect(true);
  assert.equal(read('s1', known).autoOpenFiles, true);
  assert.equal(read('s1', known).onAutoOpenFilesChange, known.set);
  assert.equal(read(null, known).onAutoOpenFilesChange, undefined);
  const unknown = createAutoOpenFilesStore({ desktop: () => null });
  assert.equal(read('s1', unknown).onAutoOpenFilesChange, undefined);
});
