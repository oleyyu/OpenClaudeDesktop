// cov0-04 (lane R3b-settings): the 2.42304.0 low-disk toast. cf615570b DesktopLowDiskToast, the byte label (shared-3 ZC
// + shared-130 eF), the `LSS-persisted.desktop-low-disk-warned-at` record (shared-25 JH/GH/KH) and the main-process
// free-space reading (index.chunk-muI2IV6k YAr) are extracted verbatim by scripts/extract-r3b-settings.mjs. Nothing here
// opens a window or reads a real profile: the generator contract, the original statfs walk against a scratch folder and
// injected statfs answers, and the toast under a controlled fake window whose desktop bridge answers injected byte counts
// into the host's real toast store (toast-store.mjs) with a scheduler that never fires.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractR3bSettings } from '../scripts/extract-r3b-settings.mjs';
import { createToastStore } from '../src/toast-store.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/r3b-settings');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url);
const GB = 1000 ** 3, DAY = 864e5, RECORD = 'LSS-persisted.desktop-low-disk-warned-at';

// ---------------------------------------------------------------- controlled environment (no layout, no painting)
function createEnvironment() {
  const events = {
    addEventListener(type, fn) { ((this.__listeners ??= new Map()).get(type) ?? this.__listeners.set(type, []).get(type)).push(fn); },
    removeEventListener(type, fn) { const list = this.__listeners?.get(type); const i = list?.indexOf(fn) ?? -1; if (i >= 0) list.splice(i, 1); },
    dispatchEvent(event) { for (const fn of [...(this.__listeners?.get(event.type) ?? [])]) fn.call(this, event); return true; },
    listenerCount(type) { return this.__listeners?.get(type)?.length ?? 0; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), dataset: {}, style: {} }); }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(child) { this.childNodes.push(child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: tag => new Element(tag), createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, ownerDocument: document }) });
  document.documentElement = new Element('html');
  document.documentElement.dir = 'ltr';
  document.body = document.documentElement.appendChild(new Element('body'));
  const storage = new Map();
  const localStorage = { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
  const calls = [];
  let answer = () => Promise.resolve(null);
  const window = Object.assign(Object.create(events), { document, localStorage, navigator: { userAgent: 'node' }, HTMLIFrameElement: class {},
    desktop: { call: (action, params) => { calls.push(action); return answer(action, params); } } });
  document.defaultView = window;
  return { window, document, storage, calls, answer: fn => { answer = typeof fn === 'function' ? fn : () => Promise.resolve(fn); },
    focus: () => window.dispatchEvent({ type: 'focus' }) };
}
const env = createEnvironment();
const flush = () => new Promise(resolve => setImmediate(resolve));
const settle = () => act(async () => { await flush(); await flush(); });
let server, Mount, Toast, Persisted, Adapters, FormatBytes, I18n, saved;
before(async () => {
  // Module evaluation already needs the window: view-tabs' preload-helper calls document.createElement (D21).
  saved = ['window', 'document', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  for (const [name, value] of [['window', env.window], ['document', env.document], ['localStorage', env.window.localStorage]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ DesktopLowDiskToastMount: Mount } = await server.ssrLoadModule('/src/source-r3b-settings-low-disk.jsx'));
  Toast = await server.ssrLoadModule('/src/generated/r3b-settings/low-disk-toast.mjs');
  Persisted = await server.ssrLoadModule('/src/generated/r3b-settings/persisted-store.mjs');
  FormatBytes = await server.ssrLoadModule('/src/generated/r3b-settings/format-bytes.mjs');
  Adapters = await server.ssrLoadModule('/src/source-r3b-settings-adapters.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => {
  await server?.close();
  for (const [name, descriptor] of saved ?? []) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
});

const quietStore = () => createToastStore({ now: () => 0, schedule: () => 0, cancel: () => {} });
async function mount(props) {
  const container = env.document.body.appendChild(env.document.createElement('div'));
  const root = createRoot(container);
  const render = next => act(async () => root.render(React.createElement(Mount, next)));
  await render(props);
  await settle();
  return { render, unmount: () => act(async () => root.unmount()) };
}
const live = store => store.getSnapshot().filter(entry => entry.phase !== 'ending');
function reset(free) { env.storage.clear(); env.calls.length = 0; env.answer(free); }

// ---------------------------------------------------------------- generator contract
test('generator: check mode passes, sources are pinned, the toast chunk is whole and its imports resolve to adapters, view-tabs and generated modules', async () => {
  await extractR3bSettings({ check: true });
  const manifest = JSON.parse(await fs.readFile(path.join(generated, 'manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(await fs.readFile(path.join(reference, 'ion-dist/assets/v1', module.source))), module.source);
    assert.equal(module.sha256, sha(await fs.readFile(path.join(generated, module.target), 'utf8')), module.target);
  }
  const toast = manifest.modules.find(module => module.target === 'low-disk-toast.mjs');
  assert.equal(toast.source, 'cf615570b-CMSKc5h8.js');
  assert.deepEqual(toast.bindings.map(binding => binding.name).sort(), ['g', 'h', 'm', 'p']);
  assert.deepEqual(Object.fromEntries(toast.imports.map(entry => [entry.name, entry.kind])), {
    useRef: 'react', useEffectEvent: 'react', useEffect: 'react', jsx: 'react', readPersisted: 'generated', removePersisted: 'generated',
    writePersisted: 'generated', DeviceStorage: 'adapter', useErrors: 'adapter', CdsButton: 'view-tabs', formatBytes: 'generated',
    FormattedMessage: 'adapter', useIntl: 'adapter',
  });
  const cds = toast.imports.find(entry => entry.name === 'CdsButton');
  assert.equal(cds.from, '../view-tabs/shared-frame-BfjMqbuN.js');
  const viewTabs = JSON.parse(await fs.readFile(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.deepEqual(viewTabs.publicNames.CdsButton, { file: 'shared-frame-BfjMqbuN.js', local: '$l', export: 'cl' });
  // The official chunk text and its export table.
  const original = await fs.readFile(path.join(reference, 'ion-dist/assets/v1/cf615570b-CMSKc5h8.js'), 'utf8');
  assert.ok(original.endsWith('export{g as DesktopLowDiskToast,p as LOW_DISK_SPACE_BYTES};'));
  assert.equal(Toast.LOW_DISK_SPACE_BYTES, 10 * GB);
  assert.equal(Toast.lowDiskRemindAfterMs, 7 * DAY);
  assert.equal(Toast.lowDiskWarnedAtKey, 'persisted.desktop-low-disk-warned-at');
  assert.equal(Persisted.persistedStorageKey(Toast.lowDiskWarnedAtKey), RECORD);
  // Main process.
  const mainManifest = JSON.parse(await fs.readFile(path.join(app, 'electron/generated/r3b-settings-free-disk-manifest.json'), 'utf8'));
  assert.equal(mainManifest.sourceSha256, sha(await fs.readFile(path.join(reference, 'asar/.vite/build/index.chunk-muI2IV6k.js'))));
  assert.equal(mainManifest.sha256, sha(await fs.readFile(path.join(app, 'electron/generated/r3b-settings-free-disk.cjs'), 'utf8')));
  assert.equal(mainManifest.binding, 'YAr');
});

// ---------------------------------------------------------------- main process
test('main: the original YAr returns statfs bavail × bsize of the folder or its nearest existing parent, undefined when nothing is readable; main.cjs answers desktop-free-disk-space with it on userData', async () => {
  const { freeDiskSpace } = require('../electron/generated/r3b-settings-free-disk.cjs');
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'r3b-free-disk-'));
  try {
    const stats = await fsp.statfs(scratch);
    const expected = stats.bavail * stats.bsize;
    const own = await freeDiskSpace(scratch);
    assert.equal(typeof own, 'number');
    // Free space can move between two reads on a live disk; same filesystem, same block size.
    assert.ok(Math.abs(own - expected) <= 64 * stats.bsize * 1024, `${own} vs ${expected}`);
    const missing = await freeDiskSpace(path.join(scratch, 'not', 'there', 'yet'));
    assert.ok(Math.abs(missing - expected) <= 64 * stats.bsize * 1024, 'walks up to the existing parent');
    const original = fsp.statfs;
    try {
      const seen = [];
      fsp.statfs = async folder => { seen.push(folder); if (folder !== path.dirname(scratch)) throw Object.assign(Error('ENOENT'), { code: 'ENOENT' }); return { bavail: 5, bsize: GB }; };
      assert.equal(await freeDiskSpace(scratch), 5 * GB);
      assert.deepEqual(seen, [scratch, path.dirname(scratch)]);
      fsp.statfs = async () => { throw Error('EACCES'); };
      assert.equal(await freeDiskSpace(scratch), undefined, 'unreadable up to the root: undefined (BOa turns it into null)');
    } finally { fsp.statfs = original; }
  } finally { await fs.rm(scratch, { recursive: true, force: true }); }
  const main = await fs.readFile(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.ok(main.includes('const { freeDiskSpace } = require("./generated/r3b-settings-free-disk.cjs");'));
  assert.ok(main.includes('case "desktop-free-disk-space": return (await freeDiskSpace(app.getPath("userData"))) ?? null;'));
});

// ---------------------------------------------------------------- renderer
test('below 10 GB: one warning "Low disk space: 5 GB free" with Manage storage; the time is recorded and a focus within 7 days does not warn again', async () => {
  reset(5 * GB);
  const store = quietStore(), opened = [];
  const view = await mount({ ready: true, toasts: store, onManageStorage: () => opened.push('storage') });
  try {
    assert.deepEqual(env.calls, ['desktop-free-disk-space'], 'asked once on mount');
    const [entry, ...rest] = live(store);
    assert.equal(rest.length, 0);
    assert.equal(entry.message, 'Low disk space: 5 GB free');
    assert.equal(entry.variant, 'warning');
    assert.equal(entry.key, 'desktop-low-disk');
    assert.equal(entry.action.label, 'Manage storage');
    const record = JSON.parse(env.storage.get(RECORD));
    assert.ok(Math.abs(record.value - Date.now()) < 5000, 'records when it warned');
    assert.equal(env.window.listenerCount('focus'), 1);
    await act(async () => env.focus());
    await settle();
    assert.deepEqual(env.calls, ['desktop-free-disk-space', 'desktop-free-disk-space'], 'asked again on focus');
    assert.equal(live(store).length, 1);
    assert.equal(live(store)[0].count, 1, 'not re-added within 7 days');
    // Manage storage: clears the toast, then opens storage.
    await act(async () => entry.action.onClick());
    assert.equal(live(store).length, 0);
    assert.deepEqual(opened, ['storage']);
  } finally { await view.unmount(); }
  assert.equal(env.window.listenerCount('focus'), 0, 'unmount stops listening');
});

test('back above 10 GB clears the toast and keeps the record; above 20 GB forgets it', async () => {
  reset(2 * GB);
  const store = quietStore();
  const view = await mount({ ready: true, toasts: store, onManageStorage() {} });
  try {
    assert.equal(live(store).length, 1);
    env.answer(15 * GB);
    await act(async () => env.focus());
    await settle();
    assert.equal(live(store).length, 0, 'closed at ≥ 10 GB');
    assert.ok(env.storage.has(RECORD), 'the record stays below 20 GB');
    env.answer(25 * GB);
    await act(async () => env.focus());
    await settle();
    assert.equal(env.storage.has(RECORD), false, 'forgotten at ≥ 20 GB');
    env.answer(3 * GB);
    await act(async () => env.focus());
    await settle();
    assert.equal(live(store).length, 1, 'with the record gone, low space warns again');
    assert.equal(live(store)[0].message, 'Low disk space: 3 GB free');
  } finally { await view.unmount(); }
});

test('a record older than 7 days (or dated in the future) warns again; one from yesterday does not; null and rejected answers do nothing', async () => {
  for (const [age, warns] of [[8 * DAY, true], [-DAY, true], [DAY, false]]) {
    reset(4.2 * GB);
    Persisted.writePersisted(Toast.lowDiskWarnedAtKey, Date.now() - age);
    const store = quietStore();
    const view = await mount({ ready: true, toasts: store, onManageStorage() {} });
    try { assert.equal(live(store).length, warns ? 1 : 0, `age ${age}`); } finally { await view.unmount(); }
  }
  for (const answer of [() => Promise.resolve(null), () => Promise.reject(Error('Untrusted renderer.')), () => Promise.resolve('5000000000'), () => Promise.resolve(Number.NaN)]) {
    reset(null);
    env.answer(answer);
    const store = quietStore();
    const view = await mount({ ready: true, toasts: store, onManageStorage() {} });
    try { assert.equal(live(store).length, 0); assert.equal(env.storage.has(RECORD), false); } finally { await view.unmount(); }
  }
});

test('only the newest answer counts: an older reading that arrives after a newer one is dropped, and so is one after unmount', async () => {
  reset(null);
  const pending = [];
  env.answer(() => new Promise(resolve => pending.push(resolve)));
  const store = quietStore();
  const view = await mount({ ready: true, toasts: store, onManageStorage() {} });
  await act(async () => env.focus());
  assert.equal(pending.length, 2);
  await act(async () => { pending[1](30 * GB); await flush(); });
  await act(async () => { pending[0](1 * GB); await flush(); });
  assert.equal(live(store).length, 0, 'the mount-time low reading lost to the focus-time one');
  await act(async () => env.focus());
  await view.unmount();
  await act(async () => { pending[2](1 * GB); await flush(); });
  assert.equal(live(store).length, 0, 'nothing after unmount');
});

test('mount gate: nothing without the desktop bridge, before boot, or without the toast store; SSR renders no markup', async () => {
  reset(1 * GB);
  const bridge = env.window.desktop;
  try {
    env.window.desktop = undefined;
    assert.equal(Adapters.DeviceStorage.getFreeDiskSpace, undefined);
    const store = quietStore();
    const none = await mount({ ready: true, toasts: store, onManageStorage() {} });
    await none.unmount();
    env.window.desktop = bridge;
    const early = await mount({ ready: false, toasts: store, onManageStorage() {} });
    await early.unmount();
    const bare = await mount({ ready: true, toasts: null, onManageStorage() {} });
    await bare.unmount();
    assert.deepEqual(env.calls, []);
    assert.equal(live(store).length, 0);
    assert.equal(typeof Adapters.DeviceStorage.getFreeDiskSpace, 'function');
    assert.equal(renderToStaticMarkup(React.createElement(Mount, { ready: true, toasts: store, onManageStorage() {} })), '');
    assert.deepEqual(env.calls, [], 'SSR runs no effect');
  } finally { env.window.desktop = bridge; }
});

test('zh-CN: the message and the button label come from the catalog; the byte label is the original ZC with the UI locale', async () => {
  const intl = { locale: 'en-US', formatNumber: (value, options) => new Intl.NumberFormat('en-US', options).format(value) };
  assert.deepEqual([5 * GB, 999, 1500, 12.34 * GB].map(bytes => FormatBytes.formatBytes(intl, bytes, 'short')), ['5 GB', '999 bytes', '1.5 kB', '12.3 GB']);
  I18n.setLocale('zh-CN');
  try {
    reset(5 * GB);
    const store = quietStore();
    const view = await mount({ ready: true, toasts: store, onManageStorage() {} });
    try {
      const [entry] = live(store);
      assert.equal(entry.message, '磁盘空间不足：剩余 5 GB');
      assert.equal(entry.action.label, '管理存储空间');
    } finally { await view.unmount(); }
  } finally { I18n.setLocale('en-US'); }
});
