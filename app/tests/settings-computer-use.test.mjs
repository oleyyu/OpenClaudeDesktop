// Settings › System › Computer use (src/source-settings-computer-use.jsx): the official section's title, badge,
// description and "Enable computer use" switch; the local Allowed apps chips drawn as the official Denied apps block
// (c71860c77 Xr); the Teach mode entry with whether teach mode can run here; the rows below the switch only while it is on, except Denied apps (disabled when off) and the permission rows (tccState).
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
// W14-code r4 shell r4-shared-11: computer use is off unless saved on (c71860c77 `chicagoEnabled ?? !1`), so the helper
// saves it on unless a test passes its own value; the unset default has its own test below.
const group = (config = {}, extra = {}) => mod.computerUseSettingsGroup({ row, config: { agentComputerUse: true, ...config }, shownValue: (key, saved) => saved, save() {}, grants: [], revoke() {}, busy: false, preferredMode: 'background', onPreferredMode() {}, ...extra });

test('the official section: Computer use, a Beta badge, the cloud note, the switch on by default', () => {
  const on = group();
  assert.deepEqual([on.tab, on.title, on.badge], ['general', 'Computer use', 'Beta']);
  assert.equal(on.description, 'Not available in cloud Code sessions, which don’t run on this computer.');
  // W14-code r2-shared-11: Denied apps (c71860c77 Bt) follows the preferred mode.
  assert.deepEqual(on.rows.map((r) => r.id), ['agentComputerUse', 'computerUseAutoUnhide', 'computer-use-preferred-mode', 'computer-use-denied-apps', 'computer-use-allowed-apps', 'computer-use-teach']);
  assert.equal(on.rows[0].label, 'Enable computer use');
  assert.match(render(on.rows[0].control), /data-cds="Switch"[^>]*|aria-checked="true"/);
  const off = group({ agentComputerUse: false });
  // W14-code r2 复核 (c71860c77 Zt): Denied apps renders whenever the section is available (`r(Bt,{…,disabled:c})`, c = !v).
  // W14-code r4 shell r4-shared-9: so do Unhide (`disabled: !v`) and the preferred mode (`disabled: !v || !S`).
  assert.deepEqual(off.rows.map((r) => r.id), ['agentComputerUse', 'computerUseAutoUnhide', 'computer-use-preferred-mode', 'computer-use-denied-apps'], 'off: the switch, the two disabled rows and Denied apps');
  assert.match(render(off.rows[0].control), /aria-checked="false"/);
});

test('preferred mode (official c71860c77 ii): one row, the official sentence as its description, the segmented control in its control slot', () => {
  const preferred = group().rows.find((r) => r.id === 'computer-use-preferred-mode');
  assert.equal(preferred.label, 'How DeepSeek uses the apps you allow');
  assert.equal(preferred.description, 'Background: DeepSeek works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: DeepSeek takes control of your screen, mouse, and keyboard by default whenever DeepSeek uses an app you allow, without asking again.');
  assert.equal(preferred.below, undefined, 'nothing below the row');
  const bg = render(preferred.control);
  assert.match(bg, /^<div[^>]*data-cds="SegmentedControl"[^>]*aria-label="How DeepSeek uses the apps you allow"/);
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
  // W14-code r6 sh6-03: shared-frame CdsButton — ghost (data-cds-ghost), xxs (data-step="1"), flush end (Iu me-outset).
  assert.match(html, /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-step="1" class="[^"]* me-outset[^"]*"[^>]*aria-label="Remove Finder from allowed apps"/);
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
  const unhide = rows[1];
  assert.equal(unhide.id, 'computerUseAutoUnhide');
  assert.equal(unhide.label, 'Unhide apps when DeepSeek finishes');
  assert.equal(unhide.description, 'When DeepSeek has full control of your screen, apps hidden during a task are restored when DeepSeek stops.');
  assert.match(render(unhide.control), /aria-checked="true"/, 'unset reads as on');
  assert.match(render(group({ computerUseAutoUnhide: false }).rows[1].control), /aria-checked="false"/);
  const saved = [];
  const control = group({}, { save: (key, value) => saved.push([key, value]) }).rows[1].control;
  control.props.onChange(false);
  assert.deepEqual(saved, [['computerUseAutoUnhide', false]]);
});

// W14-code r2-shared-10 / r2-shared-11 (3.6556.2 c71860c77-BH7EuJ1o.js Zt / Bt).
test('Enable computer use: the official S-branch sentence (Derf4fJ5+V) and the Learn more link (TdTXXf940t, ce2191564 t)', () => {
  const opened = [];
  const enable = group({}, { onLearnMore: (url) => opened.push(url) }).rows[0];
  const html = render(enable.description);
  assert.match(html, /^Let DeepSeek see and act in the apps you allow, working in the background or with full control of your screen\. <a[^>]*href="https:\/\/support\.claude\.com\/en\/articles\/14128542"[^>]*>Learn more<\/a>$/);
  assert.equal(mod.COMPUTER_USE_LEARN_MORE_URL, 'https://support.claude.com/en/articles/14128542');
});

test('Denied apps (Bt): after the preferred mode, the official copy, Add app over the installed apps not denied, chips with the deny-list X', () => {
  const saved = [];
  const installed = [{ bundleId: 'com.apple.Notes', displayName: 'Notes' }, { bundleId: 'com.apple.finder', displayName: 'Finder' }];
  const rows = group({ computerUseDeniedBundleIds: ['com.apple.Notes'] }, { installedApps: installed, save: (key, value) => saved.push([key, value]) }).rows;
  assert.deepEqual(rows.map((r) => r.id), ['agentComputerUse', 'computerUseAutoUnhide', 'computer-use-preferred-mode', 'computer-use-denied-apps', 'computer-use-allowed-apps', 'computer-use-teach']);
  const denied = rows[3];
  assert.equal(denied.label, 'Denied apps');
  assert.equal(denied.description, 'Any request DeepSeek makes to access these apps is automatically rejected. DeepSeek may still affect them indirectly through actions in allowed apps.');
  const control = mod.ComputerUseDeniedAppsControl(denied.control.props);
  assert.equal(control.props.label, 'Add app');
  assert.deepEqual(control.props.items.map((item) => item.label), ['Finder']);
  control.props.items[0].onSelect();
  assert.deepEqual(saved.at(-1), ['computerUseDeniedBundleIds', ['com.apple.Notes', 'com.apple.finder']]);
  const chips = render(denied.below);
  assert.match(chips, /<span class="text-primary">Notes<\/span>/);
  assert.match(chips, /aria-label="Remove Notes from deny list"/);
  const empty = render(group({}, {}).rows[3].below);
  assert.equal(empty, '<p class="text-footnote text-secondary">No apps denied. Add an app to automatically reject DeepSeek’s requests for it.</p>');
});

test('Accessibility / Screen recording (`d && R`): only once the probe answered; a Badge and Open System Settings unless granted', () => {
  assert.ok(!group().rows.some((r) => r.id === 'computer-use-accessibility'), 'no probe: no rows');
  const asked = [];
  const rows = group({}, { permissions: { accessibility: true, screenRecording: false }, onOpenSystemSettings: (kind) => asked.push(kind) }).rows;
  const [ax, screen] = rows.slice(-2);
  assert.deepEqual([ax.id, ax.label, screen.id, screen.label], ['computer-use-accessibility', 'Accessibility', 'computer-use-screen-recording', 'Screen recording']);
  const axHtml = render(ax.control), screenHtml = render(screen.control);
  assert.match(axHtml, /^<div class="flex items-center gap-2"><span[^>]*data-cds="Badge"[^>]*>.*Granted.*<\/span><\/div>$/);
  assert.doesNotMatch(axHtml, /Open System Settings/);
  assert.match(screenHtml, /Not requested/);
  // W14-code r6 sh6-03: c71860c77 `r(_,{variant:"secondary",size:"sm",…"Open System Settings"})` as shared-frame CdsButton.
  assert.match(screenHtml, /<button type="button" data-cds="Button" data-size="sm" class="[^"]*">(?:(?!<\/button>).)*bg-fill-secondary (?:(?!<\/button>).)*Open System Settings<\/span><\/button>/);
  screen.control.props.onOpen();
  assert.deepEqual(asked, ['screenRecording']);
});

// W14-code r2 复核 (3.6556.2 c71860c77-BH7EuJ1o.js Zt): with computer use off, Denied apps still renders but disabled
// (`c=!v,u=…r(Bt,{deniedBundleIds:i,disabled:c})`), and the permission rows follow tccState (`d&&R`), not the switch.
test('computer use off: Denied apps disabled, Accessibility / Screen recording still shown once the probe answered', () => {
  const installed = [{ bundleId: 'com.apple.Notes', displayName: 'Notes' }, { bundleId: 'com.apple.finder', displayName: 'Finder' }];
  const off = group({ agentComputerUse: false, computerUseDeniedBundleIds: ['com.apple.Notes'] },
    { installedApps: installed, permissions: { accessibility: false, screenRecording: true } });
  assert.deepEqual(off.rows.map((r) => r.id), ['agentComputerUse', 'computerUseAutoUnhide', 'computer-use-preferred-mode', 'computer-use-denied-apps', 'computer-use-accessibility', 'computer-use-screen-recording']);
  const denied = off.rows[3];
  assert.equal(denied.control.props.disabled, true);
  assert.equal(mod.ComputerUseDeniedAppsControl(denied.control.props).props.disabled, true);
  assert.match(render(denied.below), /<button[^>]*aria-label="Remove Notes from deny list"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-label="Remove Notes from deny list"/);
  assert.match(render(off.rows[4].control), /Open System Settings/);
  const on = group({ computerUseDeniedBundleIds: ['com.apple.Notes'] }, { installedApps: installed });
  assert.equal(on.rows.find((r) => r.id === 'computer-use-denied-apps').control.props.disabled, false);
  assert.equal(group({}, { busy: true }).rows.find((r) => r.id === 'computer-use-denied-apps').control.props.disabled, true);
});

// W14-code r4 shell r4-shared-9 / r4-shared-11 (E95): c71860c77 Zt and ce2191564 _.
test('r4 shell: unset reads as off; off shows Unhide and the preferred mode disabled; main.cjs agrees', async () => {
  const unset = mod.computerUseSettingsGroup({ row, config: {}, shownValue: (key, saved) => saved, save() {}, grants: [], revoke() {}, busy: false, preferredMode: 'background', onPreferredMode() {} });
  assert.match(render(unset.rows[0].control), /aria-checked="false"/);
  const unhide = unset.rows.find((r) => r.id === 'computerUseAutoUnhide'), mode = unset.rows.find((r) => r.id === 'computer-use-preferred-mode');
  assert.equal(unhide.control.props.disabled, true);
  assert.equal(mode.control.props.disabled, true);
  assert.match(render(mode.control), /data-cds="SegmentedControl"[^>]*(aria-disabled="true"|data-disabled)|disabled/);
  const on = group({ agentComputerUse: true });
  assert.equal(on.rows.find((r) => r.id === 'computerUseAutoUnhide').control.props.disabled, false);
  assert.equal(on.rows.find((r) => r.id === 'computer-use-preferred-mode').control.props.disabled, false);
  // main.cjs agentToolGroupEnabled("computer-use"): only an explicit true.
  const fs = await import('node:fs');
  const line = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8').split('\n').find((l) => l.startsWith('const agentToolGroupEnabled = '));
  const make = (config) => new Function('config', 'workflowSettings', 'currentWorkflowEngine', `return (${line.slice('const agentToolGroupEnabled = '.length).replace(/;$/, '')});`)(config, () => ({ enabled: true }), () => 'codeDesktop');
  assert.equal(make(undefined)('computer-use'), false);
  assert.equal(make({})('computer-use'), false);
  assert.equal(make({ agentComputerUse: true })('computer-use'), true);
  assert.equal(make({ agentComputerUse: false })('computer-use'), false);
});

test('r4 shell: turning on asks first (ce2191564 "Turn on computer use?"); off turns off at once', async () => {
  const saved = [];
  const off = group({ agentComputerUse: false }, { save: (key, value) => saved.push([key, value]) });
  const sw = off.rows[0].control;
  assert.equal(sw.type, mod.ComputerUseEnableSwitch);
  const on = group({}, { save: (key, value) => saved.push([key, value]) });
  // The dialog's two steps (SSR of the open dialog).
  // (Base UI's dialog portal draws nothing on the server, so the body under the header is rendered on its own.)
  const warning = render(React.createElement(mod.ComputerUseTurnOnBody, { step: 'warning', onClose() {}, onConfirm() {} }));
  for (const text of ['Keep in mind:', 'Some actions can’t be undone.', 'Apps you approve could open other apps that you haven’t approved.',
    'Websites and docs could contain malicious instructions that misdirect DeepSeek.', 'This is a research preview. Start with tasks where mistakes are easy to fix. ',
    'Read safe use tips', '>Cancel<', '>Turn on<', 'data-testid="confirmation-modal-confirm"', 'class="list-disc ps-5 flex flex-col gap-1"', 'class="font-semibold mb-1.5"'])
    assert.ok(warning.includes(text), text);
  // Every sentence is the chunk's own (ce2191564-5vDiWeB3.js).
  const fs = await import('node:fs');
  const chunk = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/ce2191564-5vDiWeB3.js'), 'utf8').replace(/\\u2019/g, '’').replace(/\\u2192/g, '→');
  for (const text of ['Turn on computer use?', 'Grant macOS permissions', 'Keep in mind:', 'Computer use is on. To finish setup, grant the macOS permissions below.',
    'Claude will see the apps you approve and click and type in them, working in the background while you keep using your computer or taking full control of your screen. Which of those Claude does by default is set under Settings → This computer → Computer use. You’ll approve each app, but not confirm each step Claude performs.',
    'Close anything sensitive. Claude can see what’s on screen in the apps you approve, and your whole screen when Claude has full control.'])
    assert.ok(chunk.includes(text), text);
  // E83: the copy names the assistant where the chunk says Claude (the source keys say DeepSeek).
  assert.ok(warning.includes('Close anything sensitive. DeepSeek can see what’s on screen in the apps you approve, and your whole screen when DeepSeek has full control.'));
  assert.ok(warning.includes('DeepSeek will see the apps you approve and click and type in them, working in the background while you keep using your computer or taking full control of your screen. Which of those DeepSeek does by default is set under Settings → This computer → Computer use. You’ll approve each app, but not confirm each step DeepSeek performs.'));
  const perms = render(React.createElement(mod.ComputerUseTurnOnBody, { step: 'permissions', permissions: { accessibility: true, screenRecording: false }, onClose() {} }));
  for (const text of ['Computer use is on. To finish setup, grant the macOS permissions below.', 'class="border border-border-300 rounded-lg divide-y divide-border-300 "',
    'Required for mouse and keyboard tracking and control.', 'Required for screen visibility. macOS may ask you to restart OpenClaude Desktop.', 'Not yet granted', '>Request<', '>Done<'])
    assert.ok(perms.includes(text), text);
  assert.equal((perms.match(/>Request</g) || []).length, 1, 'Request only for the missing permission');
  assert.ok(on.rows[0].control.props.checked);
});

// W14-code r5-shared-03 (E83): c71860c77-BH7EuJ1o.js Zt / Bt / ii write "Claude" for the assistant acting; the page's keys
// say DeepSeek so i18n named() shows the running core's assistant, as the turn-on dialog's keys already do. shared-6 UN's
// "restart Claude" names the app, so the permission row says OpenClaude Desktop (the key Record a skill's row uses).
test('r5-shared-03: the page copy names the assistant through the persona, the app by its own name', async () => {
  const fs = await import('node:fs');
  const v1 = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const official = fs.readFileSync(path.join(v1, 'c71860c77-BH7EuJ1o.js'), 'utf8').replace(/\\u2019/g, '’');
  const pairs = [
    ['Let Claude see and act in the apps you allow, working in the background or with full control of your screen.', 'Let DeepSeek see and act in the apps you allow, working in the background or with full control of your screen.'],
    ['How Claude uses the apps you allow', 'How DeepSeek uses the apps you allow'],
    ['Unhide apps when Claude finishes', 'Unhide apps when DeepSeek finishes'],
    ['When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.', 'When DeepSeek has full control of your screen, apps hidden during a task are restored when DeepSeek stops.'],
    ['Any request Claude makes to access these apps is automatically rejected. Claude may still affect them indirectly through actions in allowed apps.', 'Any request DeepSeek makes to access these apps is automatically rejected. DeepSeek may still affect them indirectly through actions in allowed apps.'],
    ['No apps denied. Add an app to automatically reject Claude’s requests for it.', 'No apps denied. Add an app to automatically reject DeepSeek’s requests for it.'],
  ];
  const source = fs.readFileSync(path.join(app, 'src/source-settings-computer-use.jsx'), 'utf8');
  const zh = (await import('../electron/i18n/zh-CN/computer-use.mjs')).default;
  for (const [claude, deepseek] of pairs) {
    assert.ok(official.includes(claude), claude);
    assert.ok(source.includes(`t('${deepseek}')`), deepseek);
    assert.ok(!source.includes(`t('${claude}')`), claude);
    assert.ok(zh[deepseek]?.includes('DeepSeek'), deepseek);
    assert.equal(Object.hasOwn(zh, claude), false, claude);
  }
  assert.ok(fs.readFileSync(path.join(v1, 'shared-6-sd9jbJqs.js'), 'utf8').replace(/\\u2019/g, '’').includes('Required for screen visibility. macOS may ask you to restart Claude.'));
  assert.equal(zh['Required for screen visibility. macOS may ask you to restart OpenClaude Desktop.'], '用于查看屏幕。macOS 可能会要求你重新启动 OpenClaude Desktop。');
  assert.equal(Object.hasOwn(zh, 'Required for screen visibility. macOS may ask you to restart Claude.'), false);
  // named() swaps the persona into the English and zh-CN copy alike.
  const i18n = await import('../electron/i18n/index.mjs');
  const previous = i18n.getAssistantName();
  try {
    i18n.setAssistantName('Codex');
    assert.equal(i18n.t('How DeepSeek uses the apps you allow'), 'How Codex uses the apps you allow');
    assert.equal(i18n.t('No apps denied. Add an app to automatically reject DeepSeek’s requests for it.'), 'No apps denied. Add an app to automatically reject Codex’s requests for it.');
  } finally { i18n.setAssistantName(previous); }
});
