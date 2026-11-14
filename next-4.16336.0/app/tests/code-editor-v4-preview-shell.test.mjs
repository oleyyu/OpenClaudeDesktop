// The staged 4.16336.0 code-editor graph, areas preview-shell-a and preview-shell-b (round 2 unit code-editor:d,
// scripts/code-editor-v4-gen/preview-shell-{a,b}.mjs): area records and pins against the frozen snapshot, import
// discipline (React from the host packages, cds-core, the D1-linked graphs and sibling adapters only, never a 3.6556.2
// graph), the D1 links and owned state, behaviour of the pure helpers next to the 3.6556.2 production adapters of the
// same files, and server rendering of the official components inside the cds-core root.
// Byte-for-byte regeneration is `node scripts/extract-code-editor-v4.mjs --check` (verify-gen-code-editor-v4.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource, referenceVersion } from '../scripts/official-4.16336.0.mjs';
import { chunk, declarationSha } from '../scripts/code-editor-v4-gen/common.mjs';
import { OWNED_STATE, REQUIRED_LINKS } from '../scripts/code-editor-v4-gen/preview-shell-common.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/code-editor-v4');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const area = name => JSON.parse(fs.readFileSync(path.join(dir, 'areas', `${name}.json`), 'utf8'));
const AREAS = {
  'preview-shell-a': ['preview-address-field.mjs', 'preview-navigation.mjs', 'preview-menu-items.mjs', 'preview-server-menu.mjs', 'preview-copy-url.mjs', 'preview-tab-strip.mjs', 'preview-log-lines.mjs'],
  'preview-shell-b': ['preview-settings-menu.mjs', 'preview-pane-menu.mjs', 'preview-link-chooser.mjs', 'preview-link-radio.mjs', 'preview-allowed-sites.mjs'],
};
const ALLOWED = [/^react$/, /^react\/jsx-runtime$/, /^react-dom$/, /^\.\.\/cds-core\/[\w.-]+\.mjs$/, /^\.\.\/code-composer-v4\/menu-collision-padding\.mjs$/,
  /^\.\.\/cowork-live-v4\/c25e47851\.mjs$/, /^\.\.\/code-current-v4\/chunk-vendor-flags\.mjs$/, /^\.\.\/routines-shared-v4\/shared-25-D-aF0gt9\.mjs$/, /^\.\/preview-[\w-]+\.mjs$/];
const importsOf = text => [...text.matchAll(/^import\s*\{([^}]*)\}\s*from\s*"([^"]+)";/gm)].map(([, names, from]) => ({ from, names: names.split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) }));
const exportsOf = text => new Set([...text.matchAll(/export\s*\{([^}]*)\}\s*;/g)].flatMap(([, list]) => list.split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean))
  .concat([...text.matchAll(/^export (?:const|function) ([\w$]+)/gm)].map(m => m[1])));

test('area records: 4.16336.0, file and source hashes, pinned roots', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  for (const [name, adapters] of Object.entries(AREAS)) {
    assert.ok(manifest.areas.includes(name), name);
    const rec = area(name);
    assert.equal(rec.referenceVersion, referenceVersion);
    assert.deepEqual(rec.adapters.map(a => a.name), adapters);
    assert.deepEqual(rec.copyTargets, []);
    for (const entry of rec.adapters) {
      assert.equal(sha(fs.readFileSync(path.join(dir, entry.name))), entry.sha256, entry.name);
      assert.equal(entry.realm, 'renderer');
      for (const ref of entry.sources) assert.equal(sha(fs.readFileSync(path.join(ionSource, ref.name))), ref.sha256, `${entry.name} ${ref.name}`);
      for (const b of entry.bindings) assert.equal(declarationSha(chunk(b.file, 'ion'), b.name), b.sha256, `${entry.name} ${b.file}#${b.name}`);
      for (const [root, r] of Object.entries(entry.roots)) {
        if (root === '$links' || !r.sha256) continue;
        assert.equal(declarationSha(chunk(r.file, 'ion'), r.local), r.sha256, `${entry.name} root ${root}`);
      }
      const m = manifest.modules.find(x => x.name === entry.name);
      assert.deepEqual(m.bindings, entry.bindings.map(b => ({ name: b.name, file: b.file, sha256: b.sha256 })));
    }
  }
});

test('imports: host React, cds-core, the D1-linked graphs and sibling adapters only; every imported name is exported', () => {
  for (const adapters of Object.values(AREAS)) for (const name of adapters) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.doesNotMatch(text, /\.\.\/(view-tabs|code-composer|cowork-live|code-editor)\//, `${name} links a 3.6556.2 graph`);
    for (const { from, names } of importsOf(text)) {
      assert.ok(ALLOWED.some(re => re.test(from)), `${name} imports ${from}`);
      if (!from.startsWith('.')) continue;
      const exported = exportsOf(fs.readFileSync(path.resolve(dir, from), 'utf8'));
      for (const n of names) assert.ok(exported.has(n), `${name}: ${from} does not export ${n}`);
    }
  }
});

test('D1: the required links are imports, owned state is held by its one adapter with a reason', () => {
  const all = Object.keys(AREAS).flatMap(a => area(a).adapters);
  const copied = new Map();
  for (const entry of all) for (const b of entry.bindings) {
    const key = `${b.file}#${b.name}`;
    assert.ok(!(key in REQUIRED_LINKS), `${entry.name} copies ${key}`);
    if (key in OWNED_STATE) { assert.ok(!copied.has(key), `${key} copied twice`); copied.set(key, entry.name); }
  }
  for (const [key, owner] of Object.entries(OWNED_STATE)) {
    assert.equal(copied.get(key), owner.adapter, key);
    assert.equal(all.find(e => e.name === owner.adapter).ownedState[key], owner.reason);
  }
  const links = all.flatMap(e => e.roots.$links ?? []);
  for (const [key, module] of Object.entries(REQUIRED_LINKS)) if (links.some(l => l.binding === key)) assert.ok(links.filter(l => l.binding === key).every(l => l.module === module), key);
  for (const key of ['shared-18-Cfqwgjc5.js#OJ', 'c25e47851-CDXbwncf.js#a', 'vendor-flags-BSWGVdqu.js#Vt', 'shared-25-D-aF0gt9.js#Dz']) assert.ok(links.some(l => l.binding === key), `${key} is linked`);
});

let server, mod, old, cds, intl, K, CurrentAccount;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  mod = {}; old = {};
  for (const name of Object.values(AREAS).flat()) mod[name] = await server.ssrLoadModule(`/src/generated/code-editor-v4/${name}`);
  for (const name of ['preview-tab-strip.mjs', 'preview-log-lines.mjs', 'preview-address-field.mjs', 'preview-allowed-sites.mjs']) old[name] = await server.ssrLoadModule(`/src/generated/code-editor/${name}`);
  cds = await server.ssrLoadModule('/src/generated/cds-core/shared-frame.mjs');
  ({ K } = await server.ssrLoadModule('/src/generated/cds-core/vendor-intl.mjs'));
  // shared-25 Dz: the official CurrentAccountProvider context (D1 link of the chooser). W8S-T1: cds-core holds it since wave 8s
  // (settings_shared25_Dz, W8S-M3); was ssrLoadModule('/src/generated/routines-shared-v4/shared-25-D-aF0gt9.mjs') (routines-shared-v4's).
  ({ Dz: CurrentAccount } = await server.ssrLoadModule('/src/generated/cds-core/shared-25.mjs'));
  intl = (await server.ssrLoadModule('/src/cds-core-adapter.mjs')).createHostIntl('en');
});
after(async () => { await server?.close(); });

test('pure helpers behave as the 3.6556.2 production adapters (4.16336.0 differences asserted)', () => {
  const v4 = { ...mod['preview-tab-strip.mjs'], ...mod['preview-log-lines.mjs'], ...mod['preview-address-field.mjs'], ...mod['preview-allowed-sites.mjs'] };
  const o = { ...old['preview-tab-strip.mjs'], ...old['preview-log-lines.mjs'], ...old['preview-address-field.mjs'], ...old['preview-allowed-sites.mjs'] };
  for (const line of ['ERROR in src/a.ts', 'npm ERR! code 1', 'warn - slow', 'Found 0 errors. Watching for file changes.', 'ready in 300 ms', 'FATAL', 'Tests FAIL'])
    assert.equal(v4.devServerLogTone(line), o.devServerLogTone(line), line);
  assert.deepEqual(v4.devServerLogToneClasses, o.devServerLogToneClasses);
  for (const url of ['http://localhost:3000/', 'https://example.com', 'file:///tmp/a.html', 'about:blank', 'data:text/html,x', 'nonsense'])
    assert.equal(v4.isWebOrigin(url), o.isWebOrigin(url), url);
  for (const n of [0, 8, 9, 20]) assert.equal(v4.previewTabsAtCap(n), o.previewTabsAtCap(n), String(n));
  assert.equal(v4.previewSeedTabId, o.previewSeedTabId);
  for (const url of ['http://localhost:5173/', 'http://127.0.0.1:8080/x', 'http://[::1]:3000', 'https://example.com/', 'http://app.localhost/', 'file:///Users/me/site/index.html'])
    assert.equal(v4.isLocalOrigin(url), o.isLocalOrigin(url), url);
  for (const url of ['http://localhost:5173/', 'https://example.com/a', 'file:///Users/me/site/index.html', 'http://app.localhost/'])
    assert.equal(v4.originLabel(url), o.originLabel(url), url);
  for (const url of ['http://localhost:5173/', 'https://example.com/', 'http://127.0.0.1:8080/x', 'file:///Users/me/site/index.html'])
    assert.equal(v4.previewTabLabel(url), o.previewTabLabel(url), url);
  for (const url of ['https://example.com/', 'http://localhost:3000/', 'https://example.com/a/b?c', 'http://user@host/', 'about:blank'])
    assert.equal(v4.displayPreviewURL(url), o.displayPreviewURL(url), url);
  for (const origin of ['https://example.com', 'https://%2A.example.com', 'not a url']) assert.equal(v4.allowedSiteHost(origin), o.allowedSiteHost(origin), origin);
  // Tab items: the seed tab when nothing is open, origin tabs labelled by title or origin.
  const items = v4.previewTabItems([], { port: 5173 }, 'New tab');
  assert.deepEqual(items, [{ id: v4.previewSeedTabId, label: 'New tab', closable: false }]);
  const [tab] = v4.previewTabItems([{ tabId: 't1', origin: 'http://localhost:5173/', title: '  App ' }], { port: 5173 }, 'New tab');
  assert.deepEqual({ id: tab.id, label: tab.label, detail: tab.detail, closable: tab.closable }, { id: 't1', label: 'App', detail: 'http://localhost:5173/', closable: true });
  assert.equal(tab.icon.type, v4.PreviewTabFavicon);
});

const wrap = el => h(cds.CdsRoot, { density: 'compact' }, h(K.Provider, { value: intl }, el));
const html = el => renderToStaticMarkup(wrap(el));
test('official components render inside the cds-core root', () => {
  const { PreviewAddressField } = mod['preview-address-field.mjs'];
  const nav = html(h(mod['preview-navigation.mjs'].PreviewNavigation, { canGoBack: true, canGoForward: false, canReload: true, onBack() {}, onForward() {}, onReload() {} },
    h(PreviewAddressField, { value: 'localhost:3000', url: 'http://localhost:3000/', onNavigate() {} })));
  assert.match(nav, /role="group" aria-label="Navigation"/);
  assert.match(nav, /aria-label="Back"/);
  assert.match(nav, /group\/field relative h-full min-w-0 flex-1/);
  const servers = html(h(mod['preview-server-menu.mjs'].PreviewServerMenu, { servers: [{ id: 'a', label: 'web', running: true }], onRun() {}, onStop() {} }));
  assert.match(servers, /data-cds="Button"/);
  assert.equal(mod['preview-server-menu.mjs'].previewServerMenuLabels.empty, 'No dev server configured');
  const pane = html(h(mod['preview-pane-menu.mjs'].PreviewPaneMenu, { sections: [{ key: 's', items: [{ label: 'Reload', onSelect() {} }] }], paneName: 'Preview' }));
  assert.match(pane, /aria-label="Preview settings"/);
  const settings = html(h(mod['preview-settings-menu.mjs'].PreviewSettingsMenu, { paneName: 'Preview', onShowSessionLogs() {} }));
  assert.match(settings, /data-preview-settings-menu="true"/);
  assert.equal(mod['preview-settings-menu.mjs'].previewSettingsLabels.showSessionLogs, 'Show dev server logs');
  assert.equal(html(h(mod['preview-allowed-sites.mjs'].PreviewAllowedSitesDialog, { isOpen: false, onClose() {}, entries: [], pendingOrigin: null, draft: '', onDraftChange() {} })).includes('Allowed sites'), false);
  assert.equal(mod['preview-link-radio.mjs'].PreviewLinkRadioCard, cds.CdsRadioGroup.Card);
  // The chooser is a factory over the host's modal presence hook; closed, it renders nothing and registers its presence.
  const seen = [];
  const { PreviewLinkChooser, useInputArming } = mod['preview-link-chooser.mjs'].createPreviewLinkChooser({ useModalPresence: open => { seen.push(open); } });
  assert.equal(typeof useInputArming, 'function');
  // The chooser's persisted destination preferences are keyed by the current account (shared-25 Z throws outside a
  // CurrentAccountProvider): a local profile, the value shape the host's other v4 adapters provide.
  const account = { account: { uuid: 'local-profile' }, activeOrganization: { uuid: 'local-profile' }, isLoading: false };
  html(h(CurrentAccount.Provider, { value: account }, h(PreviewLinkChooser, { isOpen: false, onClose() {}, onConfirmed() {} })));
  assert.deepEqual(seen, [false]);
});
