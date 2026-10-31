// Settings › System › Computer use (src/source-settings-computer-use.jsx): the official section's title, badge,
// description and "Enable computer use" switch; the local Allowed apps chips drawn as the official Denied apps block
// (c71860c77 Xr); the Teach mode entry with whether teach mode can run here; the rows below the switch only while it is on.
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
const group = (config = {}, extra = {}) => mod.computerUseSettingsGroup({ row, config, shownValue: (key, saved) => saved, save() {}, grants: [], revoke() {}, busy: false, preferredMode: 'background', onPreferredMode() {}, ...extra });

test('the official section: Computer use, a Beta badge, the cloud note, the switch on by default', () => {
  const on = group();
  assert.deepEqual([on.tab, on.title, on.badge], ['general', 'Computer use', 'Beta']);
  assert.equal(on.description, 'Not available in cloud Code sessions, which don’t run on this computer.');
  assert.deepEqual(on.rows.map((r) => r.id), ['agentComputerUse', 'computerUseProvider', 'computerUseAutoUnhide', 'computer-use-preferred-mode', 'computer-use-allowed-apps', 'computer-use-teach']);
  assert.equal(on.rows[0].label, 'Enable computer use');
  assert.match(render(on.rows[0].control), /data-cds="Switch"[^>]*|aria-checked="true"/);
  const off = group({ agentComputerUse: false });
  assert.deepEqual(off.rows.map((r) => r.id), ['agentComputerUse'], 'off: only the switch');
  assert.match(render(off.rows[0].control), /aria-checked="false"/);
});

test('preferred mode (official c71860c77 ii): one row, the official sentence as its description, the segmented control in its control slot', () => {
  const preferred = group().rows.find((r) => r.id === 'computer-use-preferred-mode');
  assert.equal(preferred.label, 'How Claude uses the apps you allow');
  assert.equal(preferred.description, 'Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again.');
  assert.equal(preferred.below, undefined, 'nothing below the row');
  const bg = render(preferred.control);
  assert.match(bg, /^<div[^>]*data-cds="SegmentedControl"[^>]*aria-label="How Claude uses the apps you allow"/);
  assert.match(bg, /aria-label="Background"[^>]*aria-checked="true"/);
  assert.match(bg, /aria-label="Full control"/);
  assert.doesNotMatch(bg, /<p/, 'no per-mode paragraph');
  const full = render(React.createElement(mod.ComputerUsePreferredMode, { mode: 'full_control', onChange() {} }));
  assert.match(full, /aria-label="Full control"[^>]*aria-checked="true"/);
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
  const below = render(group({}, { grants: null }).rows.find((r) => r.id === 'computer-use-allowed-apps').below);
  assert.match(below, /No apps allowed right now/, 'still loading reads as none');
});

test('Teach mode: no control (the official Settings has no teach entry); the text says whether it can run here', () => {
  const teach = group().rows.find((r) => r.id === 'computer-use-teach');
  assert.equal(teach.label, 'Teach mode');
  assert.equal(teach.control, null);
  assert.doesNotMatch(teach.description, /Not available in this build/);
  assert.match(teach.description, /guide you step by step.*ask it to teach you or show you how/, 'still reading: available');
  assert.match(group({}, { teachStatus: 'available' }).rows.at(-1).description, /A card asks before the walkthrough starts/);
  assert.match(group({}, { teachStatus: 'permissions' }).rows.at(-1).description, /Accessibility and Screen Recording permission/);
  assert.match(group({}, { teachStatus: 'unavailable' }).rows.at(-1).description, /can’t run on this computer/);
});

test('Unhide apps when Claude finishes (official chicagoAutoUnhide, c71860c77 ii): before the preferred mode, the official label and sentence, a switch on unless turned off', () => {
  const rows = group().rows;
  const unhide = rows[2];
  assert.equal(unhide.id, 'computerUseAutoUnhide');
  assert.equal(unhide.label, 'Unhide apps when Claude finishes');
  assert.equal(unhide.description, 'When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.');
  assert.match(render(unhide.control), /aria-checked="true"/, 'unset reads as on');
  assert.match(render(group({ computerUseAutoUnhide: false }).rows[2].control), /aria-checked="false"/);
  const saved = [];
  const control = group({}, { save: (key, value) => saved.push([key, value]) }).rows[2].control;
  control.props.onChange(false);
  assert.deepEqual(saved, [['computerUseAutoUnhide', false]]);
});

test('Computer use provider (local): right under the switch, a Select of the two choices, the agent’s own first unless saved otherwise', () => {
  const saved = [];
  const rowOf = (config) => group(config, { save: (key, value) => saved.push([key, value]) }).rows.find((r) => r.id === 'computerUseProvider');
  const provider = rowOf({});
  assert.equal(provider.label, 'Computer use provider');
  assert.match(provider.description, /^Agent’s own first: .* Always OpenClaude Desktop’s: .* Applies to sessions you start from now on\.$/);
  assert.deepEqual(mod.COMPUTER_USE_PROVIDER_ITEMS.map((item) => item.value), ['core', 'openclaude']);
  const html = render(provider.control);
  assert.match(html, /^<div class="sselect sselect-width-160" data-cds="Combobox"><button[^>]*role="combobox"[^>]*aria-label="Computer use provider"[^>]*data-value="core"/);
  assert.match(html, /<span class="sselect-value">Agent’s own first<\/span>/, 'unset: the agent’s own first');
  assert.match(render(rowOf({ computerUseProvider: 'openclaude' }).control), /data-value="openclaude"[^>]*><span class="sselect-value">Always OpenClaude Desktop’s<\/span>/);
  assert.match(render(rowOf({ computerUseProvider: 'bogus' }).control), /data-value="core"/, 'unknown reads as the default');
  provider.control.props.onChange('openclaude');
  assert.deepEqual(saved, [['computerUseProvider', 'openclaude']]);
  assert.ok(!group({ agentComputerUse: false }).rows.some((r) => r.id === 'computerUseProvider'), 'off: hidden with the other rows');
});
