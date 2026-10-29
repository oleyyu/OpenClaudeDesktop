import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

// Fidelity F14: server-render the Settings shell (portals rendered inline; effects do not run, so the desktop
// snapshot and build-info are still loading) and check the original's rows, options and chrome.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: the Settings graph now reaches view-tabs (source-menu's CdsTooltip, the Developer page's CdsBadge, the plugin
// Overview's compiler helpers), whose preload-helper calls document.createElement while it evaluates.
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
let server, Settings, React, render;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
});
after(() => server?.close());
const page = (initialSection, config = {}, props = {}) => render(React.createElement(Settings, { open: true, config: { threadIds: [], ...config },
  model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [], coworkEnabled: true }, busy: false, initialSection,
  desktopCall: async () => ({}), onSave: async () => ({}), onClose() {}, ...props }));
const settingIds = html => [...html.matchAll(/data-setting-id="([^"]+)"/g)].map(match => match[1]);
const control = (html, label) => new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`).exec(html)?.[0] ?? '';

test('General: no version row before build-info, three skeleton rows while the desktop snapshot loads, no keep-awake rows', () => {
  const html = page('general');
  assert.deepEqual(settingIds(html), []);
  assert.equal((html.match(/data-settings-skeleton=""/g) || []).length, 3);
  const row = html.slice(html.indexOf('data-settings-skeleton'), html.indexOf('data-settings-skeleton', html.indexOf('data-settings-skeleton') + 1));
  for (const size of ['h-5 w-36', 'h-5 w-72', 'h-6 w-10']) assert.ok(row.includes(size), size);
  assert.match(row, /rounded-full h-6 w-10/);
  assert.equal(html.includes('Loading version'), false);
  assert.equal(html.includes('Keep computer awake'), false);
});

test('Code: Banners and keep-awake by default, per-type level options, Draw attention gated on Permission requests and Questions', () => {
  const html = page('code');
  for (const label of ['Permission requests', 'Questions', 'Task complete'])
    assert.match(control(html, `${label} notification level`), /data-value="banner"/, label);
  assert.match(control(html, 'Keep computer awake while DeepSeek works'), /aria-checked="true"/);
  assert.match(control(html, 'Keep awake on battery power'), /aria-checked="true"/);
  assert.doesNotMatch(control(html, 'Draw attention on notifications'), /disabled/);
  const off = page('code', { permissionNotifications: 'off', questionNotifications: 'off', keepAwake: false });
  assert.match(control(off, 'Draw attention on notifications'), /disabled=""/);
  assert.equal(off.includes('Keep awake on battery power'), false, 'the battery row follows keep-awake');
  assert.doesNotMatch(control(page('code', { permissionNotifications: 'off', questionNotifications: 'badge' }), 'Draw attention on notifications'), /disabled/);
  // No row is disabled for a save in flight; only the original's gates remain.
  for (const label of ['Notification sound', 'Archive inactive sessions', 'Worktree location', 'Interface font']) assert.doesNotMatch(control(html, label), /disabled/, label);
  // Copy: c71860c77:2188-2212 with DeepSeek substituted and no link; :2316 typographic apostrophe.
  assert.ok(html.includes('Bypass all permission checks and let DeepSeek work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting DeepSeek run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks).'));
  assert.ok(html.includes('the app isn’t focused.'));
});

test('chrome: General / Usage / This computer › System nav, search field without a clear button, every close button named Close; Usage opened directly is stacked', () => {
  const html = page('preferences');
  const nav = html.slice(html.indexOf('<nav class="ss-nav"'), html.indexOf('</nav>'));
  // B23 shared-19 ZC/BC: Settings (General first, Usage listed), This computer (System, Developer…), Customize.
  // The host's developer-facing pages (Profiles, Harness, Hooks, Core options) sit in an Advanced group, last.
  assert.deepEqual([...nav.matchAll(/<p>([^<]+)<\/p>/g)].map(match => match[1]), ['Settings', 'This computer', 'Customize', 'Advanced']);
  // w13-chatfn-memory: shared-46 lists Memory (id memory) after Usage / Capabilities; the host has no Capabilities page.
  // w13-chatfn-history: shared-46 pushes Privacy (id data-privacy-controls) right after General.
  assert.deepEqual([...nav.matchAll(/<span>([^<]+)<\/span><\/button>/g)].map(match => match[1]).slice(0, 13),
    // w13-coworkui-settings: shared-46 pushes Cowork right after Claude Code.
    ['General', 'Privacy', 'Usage', 'Memory', 'Theme', 'Code', 'Cowork', 'Instructions', 'Commands', 'Models', 'System', 'Developer', 'Cores']);
  assert.match(nav, /<button aria-current="page"><span[^>]*>[^<]*<\/span><span>General<\/span>/);
  assert.match(nav, /<div class="ss-search"><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><input aria-label="Search settings"[^>]*\/><\/div>/, 'icon + input only');
  assert.equal(html.includes('Clear settings search'), false);
  assert.deepEqual([...html.matchAll(/aria-label="(Close[^"]*)"/g)].map(match => match[1]), ['Close']);
  const usage = page('usage');
  assert.match(usage, /<header class="ss-usage-header"><h2 class="text-heading-semibold" aria-hidden="true">Usage<\/h2><button type="button" class="ss-close" aria-label="Close">/);
  assert.equal(usage.includes('ss-nav'), false);
  assert.match(usage, /data-usage="true"/);
  globalThis.innerWidth = 700;
  try {
    const narrow = page('preferences');
    const tabs = [...narrow.matchAll(/role="tab"[^>]*>([^<]+)</g)].map(match => match[1]);
    // Customization pages (C1–C6) join the Settings and This computer groups; Customize stays last.
    // Harness (DeepSeek Harness profile overlays) is listed only on a core with harnessProfile; the fixture is Codex.
    // Hooks (hooks/list) is listed on a core with hooksList: the Codex fixture lists it, the DeepSeek core doesn't.
    assert.deepEqual(tabs, ['General', 'Privacy', 'Usage', 'Memory', 'Theme', 'Code', 'Cowork', 'Instructions', 'Commands', 'Models', 'System', 'Developer', 'Cores', 'Skills', 'Connectors', 'Plugins', 'Hooks', 'Profiles']);
    // w13-coworkui-settings: shared-46 `if(d&&!k)` pushes Cowork only while Cowork is on (CODE_DESKTOP_COWORK=0: boot.coworkEnabled false).
    const noCowork = page('preferences', {}, { boot: { connected: true, models: [], coworkEnabled: false } });
    assert.deepEqual([...noCowork.matchAll(/role="tab"[^>]*>([^<]+)</g)].map(match => match[1]).slice(0, 7), ['General', 'Privacy', 'Usage', 'Memory', 'Theme', 'Code', 'Instructions']);
    const deepseek = page('preferences', {}, { boot: { connected: true, models: [], core: { engine: 'deepseek', capabilities: {} } } });
    assert.ok([...deepseek.matchAll(/role="tab"[^>]*>([^<]+)</g)].map(match => match[1]).includes('Harness'));
    assert.equal([...deepseek.matchAll(/role="tab"[^>]*>([^<]+)</g)].map(match => match[1]).includes('Hooks'), false);
    // A DeepSeek start that failed (no core reported) still lists it; a failed Kimi start does not.
    assert.ok(page('preferences', { core: 'deepseek' }, { boot: { connected: false, models: [] } }).includes('>Harness<'));
    assert.equal(page('preferences', { core: 'kimi' }, { boot: { connected: false, models: [] } }).includes('>Harness<'), false);
    // Opened through search, the page keeps its tab.
    assert.ok(page('harness').includes('aria-selected="true"') && page('harness').includes('>Harness<'));
  } finally { globalThis.innerWidth = 1200; }
});

// Fidelity F14: c71860c77-B72Ova_w ht/X/Z — the storage dialog's rows and kind bars (rendered without the portal).
test('Storage: Disk space used, Code sessions and worktrees, Runtime and App caches and logs rows with Details, no paths', async () => {
  const pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
  const value = { computedAt: Date.now(), bytes: 18 + 13, incomplete: false, areas: [
    { id: 'code', label: 'Code sessions and worktrees', bytes: 18, sessionCount: 3, worktreeCount: 1, kinds: [
      { id: 'history', label: 'Conversation history', bytes: 5 }, { id: 'worktrees', label: 'Worktrees in use or with changes', bytes: 13 },
      { id: 'otherHistory', label: 'Other DeepSeek Harness history', bytes: 18, outside: true }] },
    { id: 'runtime', label: 'Runtime', bytes: 13, name: 'DeepSeek Harness', versionCount: 1, kinds: [{ id: 'core', label: 'DeepSeek Harness', bytes: 13 }] },
    { id: 'app', label: 'App caches and logs', bytes: 0, kinds: [{ id: 'web', label: 'Web cache', bytes: 0 }, { id: 'logs', label: 'Logs', bytes: 0 }, { id: 'other', label: 'Other', bytes: 0 }] }] };
  const html = render(React.createElement(pages.StorageRows, { value }));
  assert.deepEqual([...html.matchAll(/<span class="settings-row-title">([^<]+)<\/span>/g)].map(match => match[1]),
    ['Disk space used', 'Code sessions and worktrees', 'Runtime', 'App caches and logs']);
  assert.match(html, /<div id="[^"]+" data-settings-desc="">Calculated <time data-cds="RelativeTime"[^>]*class="source-timestamp ss-storage-when">just now<\/time>\.<\/div>/);
  assert.ok(html.includes('3 sessions and 1 worktree.')); assert.ok(html.includes('1 installed DeepSeek Harness version.')); assert.ok(html.includes('Web cache, browser panes and logs.'));
  assert.match(html, /class="ss-storage-size ss-storage-total-size">31 B</);
  assert.deepEqual([...html.matchAll(/aria-label="([^"]+ details)"/g)].map(match => match[1]), ['Code session details', 'Runtime details'], 'an empty App area has no Details');
  assert.equal(/\/Users\/|path/.test(html), false);
  const lower = render(React.createElement(pages.StorageRows, { value: { ...value, incomplete: true } }));
  assert.ok(lower.includes('Some folders couldn’t be measured, so this is a lower bound.'));
  const kinds = render(React.createElement(pages.StorageKinds, { label: 'Code storage by kind', color: 'var(--cds-chart-categorical-2)',
    items: value.areas[0].kinds.map(kind => kind.outside ? { ...kind, tip: 'History from DeepSeek Harness outside OpenClaude Desktop. Shown for completeness; not counted above and never removed from here.' } : kind) }));
  assert.match(kinds, /<div role="img" aria-label="Code storage by kind: Conversation history 5 B; Worktrees in use or with changes 13 B" class="ss-storage-kind-bar">/);
  assert.equal((kinds.match(/class="ss-storage-kind-bar">([\s\S]*?)<\/div><ul/)?.[1].match(/<div /g) || []).length, 2, 'the outside kind stays out of the bar');
  assert.deepEqual([...kinds.matchAll(/class="ss-storage-kind-dot" style="background-color:([^;]+);opacity:([\d.]+)"/g)].map(match => [match[1], Number(match[2])]),
    [['var(--cds-chart-categorical-2)', 1], ['var(--cds-chart-categorical-2)', 0.72], ['var(--cds-chart-muted)', 1]]);
  assert.match(kinds, /<button type="button" data-cds="InfoTip" aria-label="More info" class="ss-storage-tip">/);
});

// R03 (c71860c77-CCdfSDER F/I): Developer › Local engine 'Reconnect' is a CDS Button (secondary, sm) like Edit config and
// Developer docs, keeps the name 'Reconnect' while busy, and no bare button is left in a row's control slot.
test('Developer: Reconnect is a CDS Button and no row control is a bare button', () => {
  const html = page('developer');
  const reconnect = /<button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>)[\s\S])*Reconnect(?:(?!<\/button>)[\s\S])*<\/button>/.exec(html)?.[0] ?? '';
  assert.ok(reconnect, 'Reconnect renders as data-cds=Button');
  assert.match(reconnect, /data-variant="secondary"/);
  assert.match(reconnect, /data-size="sm"/);
  assert.doesNotMatch(reconnect, /disabled=""|aria-busy/);
  assert.equal(html.includes('Connecting…'), false);
  const slots = [...html.matchAll(/<div class="ss-control">([\s\S]*?)<\/div><\/div>/g)].map(match => match[1]);
  assert.ok(slots.some(slot => slot.includes('Reconnect')), 'the Reconnect row control slot is scanned');
  for (const slot of slots) for (const tag of slot.match(/<button[^>]*>/g) || []) assert.match(tag, /data-cds="Button"|class="ss-switch|role="(radio|combobox|switch)"/, tag);
  const busy = page('developer', {}, { busy: true });
  assert.match(/<button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>)[\s\S])*Reconnect/.exec(busy)?.[0] ?? '', /disabled=""/);
});

test('Models: capability-driven — the DeepSeek bridge keeps its connection and prices; Codex gets its endpoint and models', () => {
  const gpt = [{ id: 'gpt-6-astra', model: 'gpt-6-astra', displayName: 'GPT-6 Astra', isDefault: true, defaultReasoningEffort: 'low', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'ultra' }] }];
  const codex = page('models', {}, { boot: { connected: true, models: gpt, core: { capabilities: {} } }, onQuickSetup() {} });
  assert.match(codex, /role="radiogroup" aria-label="Codex provider"/);
  assert.match(codex, /<h3[^>]*>Codex models<\/h3>/);
  assert.match(codex, /GPT-6 Astra<span class="msx-badge">Default<\/span>/);
  // The page itself (the nav lists the Advanced group of pages; the Models page has no Advanced disclosure on Codex).
  const codexPage = codex.slice(codex.indexOf('data-page="models"'));
  for (const gone of ['aria-label="API provider"', '>Pricing<', 'Custom providers', 'Quick setup', 'Advanced']) assert.equal(codexPage.includes(gone), false, gone);
  const deepseek = page('models', {}, { boot: { connected: true, models: [], core: { engine: 'deepseek-harness', capabilities: {} } }, onQuickSetup() {} });
  assert.ok(deepseek.includes('aria-label="API provider"') && deepseek.includes('Quick setup') && deepseek.includes('Advanced'));
  assert.equal(deepseek.includes('aria-label="Codex provider"'), false);
});

// B23: c71860c77-C_7Gqn1u Qn — the System page's group is 'System'; c71860c77-DzP8HoeV hr — 'Sessions'; Kr — 'Browser'
// with Browser tools, then (while on) Open links in built-in browser (cdc95db1a f) and the 220px Keep cookies select (Wr).
test('Code › Browser: Browser tools gates Open links and Keep cookies; Sessions heading; System heading', () => {
  const html = page('code', { previewStorage: 'session' });
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(match => match[1]);
  assert.ok(headings.includes('Sessions') && headings.includes('Browser'));
  for (const gone of ['Local sessions', 'Preview']) assert.equal(headings.includes(gone), false, gone);
  const ids = settingIds(html), at = ids.indexOf('agentPreview');
  // B39: then Allowed sites (cdc95db1a m) with its secondary sm Manage button.
  // V3-w11-sweep-shell-b: c71860c77 Or's Auto-open row sits between them, an `invisible` placeholder until its first read.
  assert.deepEqual(ids.slice(at, at + 5), ['agentPreview', 'previewLinks', 'launchAutoOpenFiles', 'previewStorage', 'previewAllowedSites']);
  assert.match(html, /Sites where DeepSeek can use its Browser tools without a permission prompt\./);
  assert.match(html, /without a permission prompt\.[\s\S]*?<button[^>]*data-variant="secondary"[^>]*data-size="sm"[^>]*>(?:(?!<\/button>)[\s\S])*Manage/);
  assert.match(control(html, 'Browser tools'), /aria-checked="true"/);
  assert.match(control(html, 'Open links in built-in browser'), /aria-checked="true"/);
  const cookies = /<div class="sselect[^"]*"[^>]*>(?:(?!<\/div>)[\s\S])*?aria-label="Keep cookies"[\s\S]*?<\/button>/.exec(html)?.[0] ?? '';
  assert.match(cookies, /data-value="session"/);
  assert.match(cookies, /Per session/);
  const off = page('code', { agentPreview: false });
  assert.match(control(off, 'Browser tools'), /aria-checked="false"/);
  assert.equal(['previewLinks', 'previewStorage', 'previewAllowedSites'].some(id => settingIds(off).includes(id)), false);
  // An older saved keep-cookies switch reads as Shared until the preview service answers.
  assert.match(/aria-label="Keep cookies"[\s\S]*?<\/button>/.exec(page('code', { previewKeepCookies: true }))?.[0] ?? '', /data-value="shared"/);
  assert.match(page('general'), /<h3[^>]*>System<\/h3>/);
});

// B23: c71860c77-DzP8HoeV cr — Prompt suggestions follows keep-awake, on a core that sends codeDesktop/promptSuggestion.
test('Code › Sessions › Prompt suggestions: listed after keep-awake only for a promptSuggestion core; unset reads as on', () => {
  const plain = page('code');
  assert.equal(settingIds(plain).includes('promptSuggestions'), false);
  const boot = { connected: true, models: [], core: { engine: 'mimo', capabilities: { promptSuggestion: true } } };
  const html = page('code', {}, { boot });
  const ids = settingIds(html);
  assert.equal(ids[ids.indexOf('promptSuggestions') - 1], 'keepAwakeOnBattery');
  assert.equal(ids[ids.indexOf('promptSuggestions') + 1], 'archiveInactiveDays');
  assert.match(control(html, 'Prompt suggestions'), /aria-checked="true"/);
  assert.ok(html.includes('Show a suggested next prompt in the message box after MiMo replies. Suggestions add a little to your usage.') || html.includes('Show a suggested next prompt in the message box after DeepSeek replies.'));
  assert.match(control(page('code', { promptSuggestions: false }, { boot }), 'Prompt suggestions'), /aria-checked="false"/);
});

// B23: shared-19 BD — zy.Tabs activateOnFocus:false: a narrow tab is chosen by click (Enter/Space on the button), never on focus.
// W12 settings (Xh): 3.6556.2 shared-46 Zh renders the stacked tabs as Xd (shared-10 Qr, view-tabs CdsTabs) with
// List activateOnFocus:!1 and className v=a?Xh:void 0 (kh() = GrowthBook __gb__2598786380, off): Base UI's composite
// owns the roving tab stop and arrow keys, and the list carries only its own shared-10 classes.
test('narrow tabs select on click only', () => {
  const shell = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-46-BIbZBGFq.js'), 'utf8');
  assert.ok(shell.includes('v=a?Xh:void 0') && shell.includes('o(Xd.List,{activateOnFocus:!1,"aria-label":_,className:v,children:y})'));
  assert.ok(shell.includes('o(Xd.Root,{value:f,onValueChange:g,children:b})'));
  assert.ok(shell.includes('className:"shrink-0 pb-md",children:_'));
  const text = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.ok(text.includes("import { CdsLayerProvider, CdsTabs } from './generated/view-tabs/index.js';"));
  const tablist = text.slice(text.indexOf('<CdsTabs.Root'), text.indexOf('</CdsTabs.Root>'));
  assert.ok(tablist.length > 0);
  assert.equal(tablist.includes('onFocus'), false);
  assert.ok(tablist.includes('<CdsTabs.Root value={tab} onValueChange={id=>selectTab(id)}><CdsTabs.List activateOnFocus={false} aria-label={t(\'Settings\')}>'));
  assert.equal(/<CdsTabs\.List[^>]*className/.test(tablist), false, 'kh() off: no Xh className');
  assert.match(tablist, /<CdsTabs\.Tab key=\{t\.id\} value=\{t\.id\} disabledReason=\{null\} disabledReasonSide="bottom"/);
  for (const gone of ['tabHighlight', 'rovingTab', 'settingsTabIndex', '.ss-narrow [role=tab]']) assert.equal(text.includes(gone), false, gone);
  globalThis.innerWidth = 700;
  try {
    const narrow = page('preferences');
    assert.match(narrow, /<\/div><div class="shrink-0 pb-md"><div data-orientation="horizontal"[^>]*data-cds="Tabs">/);
    const list = /<div[^>]*role="tablist"[^>]*>/.exec(narrow)?.[0] ?? '';
    assert.match(list, /aria-label="Settings"/);
    assert.match(list, /class="flex items-center font-sans /, 'shared-10 Kr: Mr Nr Pr, no Xh');
    assert.equal(list.includes('overflow-x-auto'), false);
    assert.match(narrow, /<button type="button" data-active=""[^>]*role="tab" aria-selected="true"[^>]*class="relative isolate inline-flex shrink-0 items-center justify-center gap-1\.5 rounded-none h-control px-md /);
  } finally { globalThis.innerWidth = 1200; }
  assert.equal(fs.readFileSync(path.join(app, 'src/source-settings.css'), 'utf8').includes('.ss-narrow [role=tab]'), false, 'no host copy of the tab paint');
  const css = fs.readFileSync(path.join(app, 'src/source-settings.css'), 'utf8');
  assert.match(css, /\.ss-settings-dialog:not\(\[data-usage\]\) \{ max-width:max\(1024px,min\(1280px,calc\(100vw - 6rem\)\)\); max-height:max\(50rem,min\(60rem,calc\(100dvh - 6rem\)\)\); \}/);
});

// B36 (c71860c77-C_7Gqn1u bn): the Code session details carry the code actions (flex gap-xs under the kinds), and the
// App cache details a secondary sm 'Clear cache and restart…' — shown even with no app bytes measured.
test('Storage: code actions under Code session details and Clear cache and restart under App cache details', async () => {
  const pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
  const value = { computedAt: Date.now(), bytes: 0, incomplete: false, areas: [
    { id: 'code', label: 'Code sessions and worktrees', bytes: 0, sessionCount: 2, worktreeCount: 0, kinds: [] },
    { id: 'app', label: 'App caches and logs', bytes: 0, kinds: [{ id: 'web', label: 'Web cache', bytes: 0 }] }] };
  const actions = React.createElement('button', { type: 'button' }, 'Clean up inactive sessions…');
  const html = render(React.createElement(pages.StorageRows, { value, codeActions: actions, onClearCache() {} }));
  assert.deepEqual([...html.matchAll(/aria-label="([^"]+ details)"/g)].map(match => match[1]), ['Code session details', 'App cache details']);
  const bare = render(React.createElement(pages.StorageRows, { value }));
  assert.deepEqual([...bare.matchAll(/aria-label="([^"]+ details)"/g)].map(match => match[1]), [], 'nothing measured and no actions: no Details');
});

// 3.6556.2 (lane w2-settings). Official text is read from the snapshot (never executed).
const v3 = name => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
test('menus C4 / CI-14: Transcript text size has no description (c0db37792 zt, QmhFCiN99p gone)', () => {
  const official = v3('c0db37792-BYADKWA1.js');
  assert.equal(official.includes('Size of the conversation transcript text.'), false);
  assert.ok(official.includes('Maximum width of the transcript and composer columns.'), 'Transcript width keeps its description');
  const html = page('code');
  const at = html.indexOf('data-setting-id="transcriptSize"'), row = html.slice(at, html.indexOf('data-setting-id="', at + 20));
  assert.ok(at > 0 && row.includes('Transcript text size'));
  assert.equal(row.includes('data-settings-desc'), false, 'no description slot');
  assert.equal(/aria-describedby/.test(row.slice(0, row.indexOf('>'))), false);
  assert.equal(html.includes('Size of the conversation transcript text.'), false);
  assert.ok(html.includes('Maximum width of the transcript and composer columns.'));
});

test('menus C5: the Developer server status is the view-tabs CdsBadge (success / danger / neutral, Starting is neutral)', async () => {
  const official = v3('c8828a060-Co46iXy1.js');
  assert.ok(official.includes('S=y==="running"?"success":y==="failed"||y==="not_responding"?"danger":"neutral"'));
  assert.ok(official.includes('n(c,{variant:S,children:x})'));
  const pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
  const { CdsBadge } = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  const server_ = (name, runtimeStatus, extra = {}) => ({ name, runtimeStatus, tools: {}, ...extra });
  for (const [runtimeStatus, label, variant] of [['connected', 'Running', 'success'], ['failed', 'Failed', 'danger'], ['starting', 'Starting', 'neutral'], [undefined, 'Status unavailable', 'neutral']]) {
    assert.equal(pages.mcpStatusBadgeVariant(label), variant);
    const html = render(React.createElement(pages.DeveloperServers, { desktop: { servers: [server_('alpha', runtimeStatus)], mcpDefinitions: [{ name: 'alpha', command: 'node', args: [] }] }, connected: true, onEditConfig() {} }));
    const badge = render(React.createElement(CdsBadge, { variant }, label));
    assert.ok(html.includes(`<h2>alpha</h2>${badge}`), `${label}: ${badge}`);
    assert.match(badge, /^<span data-cds="Badge" class="inline-flex items-center gap-1 align-middle h-control-nested[^"]*"><span class="pb-\[0\.05em\]">/);
    assert.equal(html.includes('ss-mcp-status'), false);
  }
  const css = fs.readFileSync(path.join(app, 'src/source-settings-pages.css'), 'utf8');
  assert.equal(css.includes('.ss-mcp-status'), false, 'the hand-styled pill is gone');
});

test('menus C10: Disk space used reads "Calculated {when}.", "… Refreshing…" over a shown report, and adds the lower-bound line', async () => {
  const official = v3('c71860c77-BH7EuJ1o.js');
  assert.ok(official.includes('defaultMessage:"Calculated {when}. Refreshing\\u2026",id:"1fxFuk2hWl"'));
  assert.ok(official.includes('defaultMessage:"Calculated {when}.",id:"EE2KwIs/V5"'));
  assert.ok(official.includes('i&&o(s,{children:[" ",r("br",{}),r(Y,{defaultMessage:"Some folders couldn\\u2019t be measured, so this is a lower bound.",id:"AmBpsg2ljY"})]})'));
  const pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
  const value = { computedAt: Date.now(), bytes: 0, incomplete: false, areas: [] };
  const desc = html => /<div id="[^"]+" data-settings-desc="">([\s\S]*?)<\/div>/.exec(html)?.[1];
  assert.match(desc(render(React.createElement(pages.StorageRows, { value }))), /^Calculated <time[^>]*>just now<\/time>\.$/);
  assert.match(desc(render(React.createElement(pages.StorageRows, { value, refreshing: true }))), /^Calculated <time[^>]*>just now<\/time>\. Refreshing…$/);
  assert.match(desc(render(React.createElement(pages.StorageRows, { value: { ...value, incomplete: true } }))),
    /^Calculated <time[^>]*>just now<\/time>\. <br\/>Some folders couldn’t be measured, so this is a lower bound\.$/);
  const I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const zh = I18n.dictionary('zh-CN');
  assert.equal(zh['Calculated {when}.'], '计算于{when}。');
  assert.equal(zh['Calculated {when}. Refreshing…'], '计算于{when}。正在刷新…');
});

test('menus C3: the search popup starts with an empty sr-only status line; "+N more" outside Customize expands in place', async () => {
  const official = v3('cc011544b-Bdta0Cl7.js');
  assert.ok(official.includes('defaultMessage:"Showing {count, plural, one {# more match} other {# more matches}} in {section}",id:"X9YCIEhPuo"'));
  assert.ok(official.includes('i("p",{role:"status",className:"sr-only",children:U})'));
  const Search = await server.ssrLoadModule('/src/source-settings-search.jsx');
  const results = [{ key: 'a', kind: 'hit', tab: 'code', section: 'Code', label: 'Code' }, { key: 'b', kind: 'more', tab: 'code', section: 'Code', count: 2 }];
  const quiet = render(React.createElement(Search.SettingsSearchResults, { results, query: 'x', active: 0, onSelect() {}, onActive() {} }));
  assert.match(quiet, /^<div class="ss-search-results" aria-label="Settings search results"><p role="status" class="sr-only"><\/p><button/);
  const said = render(React.createElement(Search.SettingsSearchResults, { results, query: 'x', active: 0, onSelect() {}, onActive() {}, announcement: 'Showing 2 more matches in Code' }));
  assert.ok(said.includes('<p role="status" class="sr-only">Showing 2 more matches in Code</p>'));
  const text = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.ok(text.includes("if(settingsSearchMoreExpands(result)){"));
  assert.ok(text.includes("tn(result.count,'Showing {count} more match in {section}','Showing {count} more matches in {section}',{section:result.section})"));
  assert.ok(text.includes('settingsSearch(searchTabs,[...groups,...settingsCatalogGroups(catalog,{cwd:customize?.cwd,threadId:customize?.threadId??null})],query,searchExpanded?.sections)'));
  const I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const zh = I18n.dictionary('zh-CN');
  assert.equal(zh['Showing {count} more matches in {section}'], '已在{section}中显示另外 {count} 项匹配');
  assert.equal(zh['Showing {count} more match in {section}'], '已在{section}中显示另外 {count} 项匹配');
});
