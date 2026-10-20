// Settings › System › Computer use (src/source-settings-computer-use.jsx): the official section's title, badge,
// description and "Enable computer use" switch; the local Allowed apps chips drawn as the official Denied apps block
// (c71860c77 Xr); the Teach mode entry; the rows below the switch only while it is on.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
let server, mod, React, render;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  mod = await server.ssrLoadModule('/src/source-settings-computer-use.jsx');
});
after(() => server?.close());

const row = (id, label, description, control) => ({ id, label, description, control });
const group = (config = {}, extra = {}) => mod.computerUseSettingsGroup({ row, config, shownValue: (key, saved) => saved, save() {}, grants: [], revoke() {}, busy: false, ...extra });

test('the official section: Computer use, a Beta badge, the cloud note, the switch on by default', () => {
  const on = group();
  assert.deepEqual([on.tab, on.title, on.badge], ['general', 'Computer use', 'Beta']);
  assert.equal(on.description, 'Not available in cloud Code sessions, which don’t run on this computer.');
  assert.deepEqual(on.rows.map((r) => r.id), ['agentComputerUse', 'computer-use-allowed-apps', 'computer-use-teach']);
  assert.equal(on.rows[0].label, 'Enable computer use');
  assert.match(render(on.rows[0].control), /data-cds="Switch"[^>]*|aria-checked="true"/);
  const off = group({ agentComputerUse: false });
  assert.deepEqual(off.rows.map((r) => r.id), ['agentComputerUse'], 'off: only the switch');
  assert.match(render(off.rows[0].control), /aria-checked="false"/);
});

test('Allowed apps: the Denied apps chips with a ghost xxs X per app, and the empty text', () => {
  const removed = [];
  const html = render(React.createElement(mod.ComputerUseAllowedApps, { apps: [{ bundleId: 'com.apple.finder', displayName: 'Finder' }, { bundleId: 'com.example.x' }], onRemove: (id) => removed.push(id) }));
  assert.match(html, /^<div class="flex flex-wrap gap-1\.5" data-computer-use-allowed="">/);
  assert.equal((html.match(/class="bg-surface-0 border-border-300 flex items-center gap-1\.5 rounded-md border px-2 py-1 text-sm"/g) || []).length, 2);
  assert.match(html, /<span class="text-primary">Finder<\/span>/);
  assert.match(html, /<span class="text-primary">com\.example\.x<\/span>/, 'no name: the bundle id');
  assert.match(html, /<button[^>]*aria-label="Remove Finder from allowed apps"[^>]*data-variant="ghost"[^>]*data-flush="end"[^>]*data-size="xxs"[^>]*data-cds-icon-only=""/);
  const empty = render(React.createElement(mod.ComputerUseAllowedApps, { apps: [], onRemove() {} }));
  assert.equal(empty, '<p class="text-footnote text-secondary">No apps allowed right now. DeepSeek asks before it uses an app, and what you allow lasts until the app quits.</p>');
  const below = render(group({}, { grants: null }).rows[1].below);
  assert.match(below, /No apps allowed right now/, 'still loading reads as none');
});

test('Teach mode: an entry with its empty state only', () => {
  const teach = group().rows[2];
  assert.equal(teach.label, 'Teach mode');
  assert.match(teach.description, /Not available in this build yet/);
  assert.equal(teach.control, null);
});
