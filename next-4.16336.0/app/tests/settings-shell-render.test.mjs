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
// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo, which read document.cookie at load (as in the app).
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
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
  // U-SET-LITE (U-SET-HANDWRITE): the System page ('general') is the first host of the Desktop app entry (hosts general,
  // developer; Advanced: advanced, harness, profiles), drawn first right under the entry's page title.
  assert.match(html, /<div class="ss-content sl-content" data-page="general" data-entry="desktop"><span hidden=""><\/span><h2 class="sl-page-title">Desktop app<\/h2><main class="flex flex-col"><section data-settings-section-titled="" class="mb-xl last:mb-0 ">/);
  // The System page itself has no host rows (was: settingIds(html) [] for the whole page); the host rows on the entry are
  // Developer's Local engine after it, then the Advanced Profiles page (Codex fixture: no Core options, no Harness).
  const system = html.slice(html.indexOf('data-entry="desktop"'), html.indexOf('</main>'));
  assert.ok(system.includes('>System</h3>'));
  assert.deepEqual(settingIds(system), []);
  assert.deepEqual(settingIds(html), ['connection', 'engine', 'profiles-new', 'profiles-empty']);
  assert.ok(html.indexOf('data-setting-id="profiles-new"') > html.indexOf('<details class="sl-advanced"><summary>Advanced</summary>'), 'Profiles inside Advanced');
  // round4 settings desktop: the System page is the official desktop page (c71860c77-B4INzBZs Vs › xs, settings-desktop-v4);
  // until AppFeatures settles it draws its own skeleton: the System group (Ee) with Io and three Ms rows (cds-core
  // Skeleton). Was the host skeleton: 3 × data-settings-skeleton="" rows with 'h-5 w-36' / 'h-5 w-72' / 'h-6 w-10' and
  // /rounded-full h-6 w-10/.
  assert.match(html, /<main class="flex flex-col"><section data-settings-section-titled="" class="mb-xl last:mb-0 ">/);
  assert.match(html, /<h3 data-settings-group-title=""[^>]*>System<\/h3>/);
  assert.equal((html.match(/<div class="flex items-center justify-between gap-lg"><div class="flex min-w-0 flex-1 flex-col gap-1"><div data-cds="Skeleton"/g) || []).length, 3);
  const at = html.indexOf('<div class="flex items-center justify-between gap-lg"><div class="flex min-w-0 flex-1 flex-col gap-1"><div data-cds="Skeleton"');
  const row = html.slice(at, html.indexOf('<div class="flex items-center justify-between gap-lg">', at + 1));
  for (const size of ['h-5 w-36', 'h-5 w-72', 'h-6 w-10']) assert.ok(row.includes(size), size);
  assert.match(row, /h-6 w-10 rounded-full/);
  assert.equal(html.includes('Loading version'), false);
  assert.equal(html.includes('Keep computer awake'), false);
});

// B3 (4.16336.0): the Claude Code page's local-sessions rows are the official groups (c8b630735 ot, settings-pages-v4
// ClaudeCodeSettingsGroups) over the host desktop preferences. Server render reads the official stores' initial state
// (desktop prefs pending), so the rows gated on loaded prefs (bypass, notification levels) are not in the markup; the
// mapping of the host defaults to the official keys and the official defaults they fall back to are asserted here, the
// loaded page in the Electron check (surfaces-prod-3/settings/prestage-r3).
test('Code: official Sessions group on Code, On this computer on Notifications; host defaults reach the official keys (Banners and keep-awake by default)', async () => {
  const html = page('code');
  const sessions = html.indexOf('data-settings-group-title="" class="text-heading-semibold text-primary settings-row-title self-start outline-none">Sessions</h3>');
  assert.ok(sessions > 0, 'official Sessions (part local)');
  assert.ok(sessions > html.indexOf('<h2 class="sl-page-title">Code</h2>'), 'first on the Code page');
  // U-SET-LITE: the official On this computer group (part notifications) is regrouped onto the Notifications page.
  assert.equal(html.includes('>On this computer</h3>'), false, 'On this computer left the Code page');
  const local = html.slice(sessions, html.indexOf('</section>', sessions));
  for (const label of ['Archive inactive sessions', 'Worktree location']) assert.ok(local.includes(label), label);
  const text = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.ok(text.includes("{tab:'code',title:'On this computer',official:'claude-code-notifications',rows:["), 'declared as the official part');
  assert.ok(text.includes("else if(group.tab==='code'&&group.title==='On this computer')group.tab='notifications';"), 'regrouped onto the notifications host page');
  assert.ok(text.includes("{id:'notifications',label:'Notifications',icon:'Notification',hosts:['notifications']},"), 'the Notifications nav entry draws that host page');
  // The Notifications page draws it through renderGroup → SettingsClaudeCodeGroups part "notifications" (a server render
  // cannot open the page itself: 'notifications' has no official section, so hostTabOf falls back before the effect runs).
  const pagesHost = await server.ssrLoadModule('/src/settings-pages-host.jsx');
  const notifications = render(React.createElement(pagesHost.SettingsClaudeCodeGroups, { part: 'notifications', theme: 'system', config: {}, save: async () => {}, pickDirectory: async () => undefined, deepLink: null }));
  assert.match(notifications, /data-settings-group-title=""[^>]*>On this computer<\/h3>/);
  assert.ok(notifications.includes('Draw attention on notifications'));
  assert.equal(notifications.includes('Archive inactive sessions'), false, 'part notifications only');
  // the host rows these replace are gone from the host markup (no data-setting-id for them)
  for (const id of ['bypass', 'permissionNotifications', 'questionNotifications', 'completeNotifications', 'notificationSound', 'drawAttention', 'keepAwake', 'keepAwakeOnBattery', 'archiveInactiveDays', 'worktreeLocation'])
    assert.equal(settingIds(html).includes(id) || settingIds(notifications).includes(id), false, id);
  // host defaults (electron/desktop-settings.cjs: every level banner, keep-awake on, battery on) → official keys
  const defaults = pagesHost.officialDesktopPrefs({ permissionNotifications: 'banner', questionNotifications: 'banner', completeNotifications: 'banner', notificationSound: 'system',
    drawAttention: false, keepAwake: true, keepAwakeOnBattery: true, archiveInactiveDays: 0, worktreeLocation: 'project' });
  assert.deepEqual(defaults.notificationLevels, { permission: 'banner', question: 'banner', idle: 'banner' });
  assert.equal(defaults.ccKeepAwakeWhileWorking, true);
  assert.equal(defaults.ccKeepAwakeOnBattery, true);
  // an unset host value reads as the host rows read it (notificationLevel → Banners, keepAwakeEnabled → on, archive Never),
  // the same as the official defaults (cbc28252c notify* default "banner", x_ ccKeepAwake* default on, archive default 0)
  assert.deepEqual(pagesHost.officialDesktopPrefs({}), { notificationLevels: { permission: 'banner', question: 'banner', idle: 'banner' }, notificationSound: 'system',
    dockBounceEnabled: false, ccKeepAwakeWhileWorking: true, ccKeepAwakeOnBattery: true, ccAutoArchiveInactiveDays: 0, chillingSlothLocation: 'default', bypassPermissionsModeEnabled: false });
  const registry = fs.readFileSync(path.join(app, 'src/generated/settings-pages-v4/settings-registry.mjs'), 'utf8');
  assert.equal((registry.match(/default: "banner",\s*storage: \{ kind: "desktopPref", key: "notificationLevels" \}/g) || []).length, 3);
  // Copy: the official row text (4.16336.0 YlYBASRBOt / HOH5mdam48 family) with the assistant named per E83, as the host
  // rows said it (settings-pages-adapter SETTINGS_PAGES_PERSONA, applied by id while the official text is unchanged).
  // (the description follows the platform: c8b630735 darwin HOH5mdam48 / win32 3SBJtWgrE1 / other KgSix/c4Nx)
  // U-SET-LITE short copy (electron/i18n/concise.mjs): the darwin line reads 'Bounce the Dock icon when input is needed.'.
  assert.match(notifications, /Bounce the Dock icon when input is needed\.|(Bounce the Dock icon|Flash the taskbar button|Flash the app icon) when DeepSeek needs your attention and the app isn’t focused\./, 'Draw attention copy (E83)');
  const { conciseCopy } = await import('../electron/i18n/concise.mjs');
  assert.equal(conciseCopy('Bounce the Dock icon when DeepSeek needs your attention and the app isn’t focused.', 'en'), 'Bounce the Dock icon when input is needed.');
  for (const markup of [html, notifications]) assert.equal(/\bClaude (needs|is asking|finished|works)\b|let Claude work/.test(markup), false, 'no official Claude-as-assistant copy left unnamed');
  const adapterModule = await server.ssrLoadModule('/src/settings-pages-adapter.mjs');
  const generatedCopy = ['settings-registry.mjs', 'claude-code.mjs'].map(f => fs.readFileSync(path.join(app, 'src/generated/settings-pages-v4', f), 'utf8')).join('\n')
    .replace(/\\u2019/g, '’');
  for (const [id, { original, text }] of Object.entries(adapterModule.SETTINGS_PAGES_PERSONA)) {
    assert.ok(generatedCopy.includes(`"${original}"`) && generatedCopy.includes(`id: "${id}"`), `${id}: official text still the sliced one`);
    assert.equal(text, original.replace(/\bClaude\b/g, 'DeepSeek'), id);
  }
  assert.ok(adapterModule.SETTINGS_PAGES_PERSONA['YlYBASRBOt'].text.startsWith('Bypass all permission checks and let DeepSeek work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting DeepSeek run arbitrary commands is risky'));
});

test('chrome: Account / Usage | Appearance … | Desktop app nav with separators and an API keys footer, search field without a clear button, every close button named Close; Usage opened directly has no nav', () => {
  const html = page('preferences');
  // U-SET-LITE (U-SET-HANDWRITE): the hand-written simple shell replaced the official rail (shared-55 z_) and the
  // OpenClaude local extension groups: header (title + Close), then nav.sl-nav (search field, the SETTINGS_NAV items with
  // hr separators, the API keys footer) beside the pane.
  assert.match(html, /^<div class="ss-backdrop ss-settings-backdrop"[^>]*><section class="ss-dialog ss-settings-dialog sl-dialog"[^>]*role="dialog" aria-modal="true" aria-labelledby="([^"]+)"[^>]*><header class="sl-header"><h2 id="\1">Settings<\/h2><button type="button" class="ss-close" aria-label="Close">/);
  assert.equal(/data-usage=/.test(html.slice(0, html.indexOf('>', html.indexOf('<section')))), false, 'no data-usage in the Settings shell');
  const nav = html.slice(html.indexOf('<nav class="sl-nav" aria-label="Settings">'), html.indexOf('</nav>'));
  assert.ok(nav.length > 0 && html.indexOf('<div class="sl-body"><nav class="sl-nav"') > 0, 'the nav opens the body');
  // Items and separators in order ('|' = hr.sl-sep); no Privacy item (its Export data row sits on Account).
  const items = [...nav.matchAll(/<hr class="sl-sep"\/>|<button type="button" class="sl-nav-item" data-testid="settings-nav-([\w-]+)"[^>]*><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><span>([^<]+)<\/span><\/button>/g)]
    .map(match => match[0].startsWith('<hr') ? '|' : `${match[1]}:${match[2]}`);
  assert.deepEqual(items, ['account:Account', 'usage:Usage', '|', 'appearance:Appearance', 'your-claude:Your Claude', 'models:Models', 'notifications:Notifications', '|',
    'customize:Customize', 'code:Code', '|', 'desktop:Desktop app']);
  assert.equal(nav.includes('>Privacy<'), false, 'no Privacy nav item');
  assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
  assert.match(nav, /<button type="button" class="sl-nav-item" data-testid="settings-nav-appearance" aria-current="page">/);
  assert.match(nav, /<\/div><button type="button" class="sl-nav-footer"><span>API keys<\/span><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><\/button>$/, 'API keys footer after the list');
  // The page: the entry's title over the host page; 'preferences' is drawn on the Appearance entry.
  assert.match(html, /<\/nav><div class="ss-pane sl-pane" data-customize="false"><div class="ss-content sl-content" data-page="preferences" data-entry="appearance"><span hidden=""><\/span><h2 class="sl-page-title">Appearance<\/h2>/);
  // The official rail and the local groups are gone.
  for (const gone of ['data-perf-region="settings_nav"', 'data-testid="openclaude-', 'data-testid="general-settings"', 'class="px-sm pt-md text-caption text-muted-as-secondary"'])
    assert.equal(html.includes(gone), false, gone);
  assert.match(nav, /^<nav class="sl-nav" aria-label="Settings"><div class="ss-search" style="margin:0"><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><input aria-label="Search settings"[^>]*\/><\/div><div class="sl-nav-list scroll-fade-x scroll-fade-size-16">/, 'icon + input only, first in the nav');
  assert.equal(html.includes('Clear settings search'), false);
  assert.deepEqual([...html.matchAll(/aria-label="(Close[^"]*)"/g)].map(match => match[1]), ['Close']);
  const usage = page('usage');
  assert.match(usage, /<header class="sl-header"><h2 id="[^"]+">Usage<\/h2><button type="button" class="ss-close" aria-label="Close">/);
  assert.equal(usage.includes('<nav'), false, 'no nav');
  assert.equal(usage.includes('sl-page-title'), false, 'only Usage, no page title');
  assert.match(usage, /data-usage="true"/);
  assert.match(usage, /data-page="usage" data-entry="usage"><span hidden=""><\/span><section class="source-usage"/);
  // Usage picked in the nav stays in the Settings shell: Usage is a nav entry, not only the stacked dialog.
  assert.match(html, /data-testid="settings-nav-usage"><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><span>Usage<\/span>/);
  globalThis.innerWidth = 700;
  try {
    // One shell at every width: no stacked tabs (ev → rv), no ss-narrow header, the same nav.
    const narrow = page('preferences');
    assert.equal(narrow.slice(narrow.indexOf('<nav'), narrow.indexOf('</nav>')), nav);
    for (const gone of ['role="tab"', 'ss-narrow', 'ss-stacked-body', 'scroll-fade-y', 'data-cds="Tabs"']) assert.equal(narrow.includes(gone), false, gone);
  } finally { globalThis.innerWidth = 1200; }
  // Core-gated host pages now sit inside entries; they are drawn only where the old nav listed them.
  const deepseekBoot = { boot: { connected: true, models: [], core: { engine: 'deepseek', capabilities: {} } } };
  const harnessTitle = '<h3 class="sl-advanced-title">Harness</h3>';
  // Harness (DeepSeek Harness profile overlays) is in Desktop app › Advanced only on a core with harnessProfile; the fixture is Codex.
  assert.equal(page('general').includes(harnessTitle), false);
  assert.ok(page('general', {}, deepseekBoot).includes(harnessTitle));
  // A DeepSeek start that failed (no core reported) still lists it; a failed Kimi start does not.
  assert.ok(page('general', { core: 'deepseek' }, { boot: { connected: false, models: [] } }).includes(harnessTitle));
  assert.equal(page('general', { core: 'kimi' }, { boot: { connected: false, models: [] } }).includes(harnessTitle), false);
  // Hooks (hooks/list) is a Customize sub-tab on a core with hooksList: the Codex fixture lists it, the DeepSeek core doesn't.
  const subtabs = markup => [...markup.matchAll(/<button type="button" role="tab" aria-selected="(true|false)">([^<]+)</g)].map(match => `${match[2]}${match[1] === 'true' ? '*' : ''}`);
  const commands = page('commands');
  assert.match(commands, /data-page="commands" data-entry="customize"><span hidden=""><\/span><h2 class="sl-page-title">Customize<\/h2><div class="sl-subtabs" role="tablist" aria-label="Customize">/);
  assert.deepEqual(subtabs(commands), ['Commands*', 'Hooks']);
  assert.equal(page('commands', {}, deepseekBoot).includes('>Hooks<'), false);
  // w13-coworkui-settings: Cowork (drawn on the Code entry) only while Cowork is on (CODE_DESKTOP_COWORK=0: boot.coworkEnabled false).
  assert.ok(page('code').includes('Trusted Cowork folders'));
  assert.equal(page('code', {}, { boot: { connected: true, models: [], coworkEnabled: false } }).includes('Trusted Cowork folders'), false);
  // Import from Claude Code (the official Import & export page's host row) is the Codex core's: not offered on DeepSeek.
  assert.ok(settingIds(page('code')).includes('codexImport'));
  assert.equal(settingIds(page('code', {}, deepseekBoot)).includes('codexImport'), false);
  // Opened through search, an Advanced page keeps its entry and opens the Advanced section.
  const harness = page('harness');
  assert.match(harness, /data-testid="settings-nav-desktop" aria-current="page"/);
  assert.match(harness, /data-page="harness" data-entry="desktop"/);
  assert.ok(harness.indexOf(harnessTitle) > harness.indexOf('<details class="sl-advanced" open=""><summary>Advanced</summary>'));
  assert.equal(page('general').includes('<details class="sl-advanced" open=""'), false, 'closed unless an Advanced page is opened');
});

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
  // U-SET-LITE: Browser is one of the rarer Code groups folded into Code › Advanced (closed by default), after Sessions.
  const advanced = html.indexOf('<details class="sl-advanced"><summary>Advanced</summary>');
  assert.ok(advanced > html.indexOf('>Sessions</h3>') && html.indexOf('>Browser</h3>', advanced) > advanced && html.indexOf('</details>', advanced) > html.indexOf('data-setting-id="previewAllowedSites"'), 'Browser inside Advanced');
  // U-SET-LITE short copy (electron/i18n/concise.mjs) for 'Sites where {assistant} can use its Browser tools without a permission prompt.'
  assert.match(html, /<div id="[^"]+" data-settings-desc="">Sites allowed without asking\.<\/div>/);
  assert.equal(html.includes('without a permission prompt.'), false);
  assert.match(html, /data-setting-id="previewAllowedSites"[^>]*>(?:(?!data-setting-id=)[\s\S])*?data-settings-desc="">Sites allowed without asking\.<\/div><\/div><div class="ss-control"><button[^>]*data-variant="secondary"[^>]*data-size="sm"[^>]*>(?:(?!<\/button>)[\s\S])*Manage/);
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
test('Code › Sessions › Prompt suggestions: listed after the workflow rows only for a promptSuggestion core; unset reads as on', () => {
  const plain = page('code');
  assert.equal(settingIds(plain).includes('promptSuggestions'), false);
  const boot = { connected: true, models: [], core: { engine: 'mimo', capabilities: { promptSuggestion: true } } };
  const html = page('code', {}, { boot });
  const ids = settingIds(html);
  // B3: keep-awake / archive are official rows now (part local); Prompt suggestions stays a host row in the host Sessions
  // group, after the workflow rows, as the official behavior part orders dynamic workflows → prompt suggestions ($e).
  assert.equal(ids[ids.indexOf('promptSuggestions') - 1], 'workflowAdvanced');
  assert.equal(ids[ids.indexOf('promptSuggestions') + 1], 'sandbox');
  assert.match(control(html, 'Prompt suggestions'), /aria-checked="true"/);
  assert.ok(html.includes('Show a suggested next prompt in the message box after MiMo Code replies. Suggestions add a little to your usage.') || html.includes('Show a suggested next prompt in the message box after DeepSeek replies.'));
  assert.match(control(page('code', { promptSuggestions: false }, { boot }), 'Prompt suggestions'), /aria-checked="false"/);
});

// B23: shared-19 BD — zy.Tabs activateOnFocus:false: a narrow tab is chosen by click (Enter/Space on the button), never on focus.
// W12 settings (Xh): 3.6556.2 shared-46 Zh renders the stacked tabs as Xd (shared-10 Qr, view-tabs CdsTabs) with
// List activateOnFocus:!1 and className v=a?Xh:void 0 (kh() = GrowthBook __gb__2598786380, off): Base UI's composite
// owns the roving tab stop and arrow keys, and the list carries only its own shared-10 classes.
test('settings tabs select on click only (Customize sub-tabs and nav items; no stacked tabs at any width)', () => {
  const shell = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-46-BIbZBGFq.js'), 'utf8');
  assert.ok(shell.includes('v=a?Xh:void 0') && shell.includes('o(Xd.List,{activateOnFocus:!1,"aria-label":_,className:v,children:y})'));
  assert.ok(shell.includes('o(Xd.Root,{value:f,onValueChange:g,children:b})'));
  assert.ok(shell.includes('className:"shrink-0 pb-md",children:_'));
  const text = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  // 4.16336.0 settings-nav: the stacked nav is the official ev → rv (generated/settings-nav), whose Tabs are cds-core's
  // CdsTabs (shared-11 Nr): `Pd.List {activateOnFocus:!1, "aria-label", className}`, `Pd.Root {value, onValueChange}`.
  const v4shell = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/shared-55-BRv2XBP7.js'), 'utf8');
  assert.ok(v4shell.includes('a(Pd.List,{activateOnFocus:!1,"aria-label":_,className:v,children:y})') && v4shell.includes('import{Nr as Pd,Ur as Fd}from"./shared-11-CNsu0Zu8.js"'));
  const generated = fs.readFileSync(path.join(app, 'src/generated/settings-nav/settings-nav.mjs'), 'utf8');
  assert.ok(generated.includes('import { CdsTabs as Pd } from "../cds-core/shared-11.mjs";'));
  assert.match(generated, /a\(Pd\.List, \{\s*activateOnFocus: !1,\s*"aria-label": _,\s*className: v,\s*children: y,\s*\}\)/);
  // U-SET-LITE (U-SET-HANDWRITE): the hand-written shell renders neither the official stacked tabs (ev → rv) nor the
  // OpenClaude local CdsTabs at any width; its one tab strip is Customize's pill sub-tabs (div.sl-subtabs[role=tablist]).
  // Like the nav items, a sub-tab is chosen by click (Enter/Space on the button), never on focus.
  for (const gone of ['<SettingsNavStacked', '<SettingsRailWithLocalGroups', '<CdsTabs.', 'className="ss-narrow"']) assert.equal(text.includes(gone), false, gone);
  assert.ok(text.includes("import { CdsLayerProvider, CdsTabs } from './cds-core.mjs';"));
  assert.equal(/import \{[^}]*\bCds(?:LayerProvider|Tabs)\b[^}]*\} from '\.\/generated\/view-tabs/.test(text), false);
  const strip = text.slice(text.indexOf('<div className="sl-subtabs"'), text.indexOf('</div>}', text.indexOf('<div className="sl-subtabs"')));
  assert.ok(strip.length > 0);
  assert.ok(strip.startsWith("<div className=\"sl-subtabs\" role=\"tablist\" aria-label={t(shownEntry.label)}>"));
  assert.match(strip, /<button key=\{id\} type="button" role="tab" aria-selected=\{pageHosts\.includes\(id\)\} onClick=\{\(\)=>\{[^}]*selectTab\(id\);setFocus\(refocus\);\}\}>\{navLabel\[id\]\}<\/button>/);
  const navList = text.slice(text.indexOf('<div className="sl-nav-list'), text.indexOf('</nav>}'));
  assert.match(navList, /<button key=\{entry\.id\} type="button" className="sl-nav-item" data-testid=\{`settings-nav-\$\{entry\.id\}`\} aria-current=\{entry\.id===shownEntry\.id\?'page':undefined\} onClick=\{\(\)=>openEntry\(entry\)\}>/);
  for (const handler of ['onFocus', 'onKeyDown', 'tabIndex']) assert.equal(strip.includes(handler) || navList.includes(handler), false, handler);
  for (const gone of ['tabHighlight', 'rovingTab', 'settingsTabIndex', '.ss-narrow [role=tab]']) assert.equal(text.includes(gone), false, gone);
  globalThis.innerWidth = 700;
  try {
    const narrow = page('preferences');
    for (const gone of ['data-cds="Tabs"', 'role="tablist"', 'role="tab"', 'class="shrink-0 pb-md"', 'ss-stacked-body']) assert.equal(narrow.includes(gone), false, gone);
    assert.match(narrow, /<nav class="sl-nav" aria-label="Settings">/);
    const customize = page('commands');
    const list = /<div[^>]*role="tablist"[^>]*>/.exec(customize)?.[0] ?? '';
    assert.equal(list, '<div class="sl-subtabs" role="tablist" aria-label="Customize">');
    assert.deepEqual([...customize.matchAll(/<button type="button" role="tab" aria-selected="(true|false)">([^<]+)<\/button>/g)].map(match => [match[2], match[1]]), [['Commands', 'true'], ['Hooks', 'false']]);
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
  // 4.16336.0 (settings-pages-v4 B2): the row is the official one (cda9efc49 M, row id setting-claude-code-transcript-text-size).
  // Round 4 general lane: desktop Vd is false (shared-183 Ch `or("__gb__2503656110")&&mh`, mh = !1), so General zn never
  // draws xn Code looks; the official Claude Code page Ea draws `x&&!C&&n(Un,{})` (cda9efc49 M export n, part "all"). The
  // row moved from page('preferences') to page('code') (was: html = page('preferences')); the host row stays absent.
  // U-SET-LITE: the Code appearance group (the official Code looks) is regrouped onto the Appearance page ('preferences'),
  // after the official General Appearance group, which still draws no Code looks of its own: the row is drawn once.
  assert.equal(page('code').includes('data-setting-id="transcriptSize"'), false);
  assert.equal(page('code').includes('id="setting-claude-code-transcript-text-size"'), false, 'Code no longer draws the Code looks');
  const html = page('preferences');
  assert.equal(html.includes('data-setting-id="transcriptSize"'), false);
  assert.equal(html.split('id="setting-claude-code-transcript-text-size"').length, 2, 'Appearance draws the row once');
  assert.ok(html.indexOf('>Code appearance</h3>') > html.indexOf('>Appearance</h3>'), 'Code appearance after the General Appearance group');
  const at = html.indexOf('id="setting-claude-code-transcript-text-size"'), row = html.slice(at, html.indexOf('id="setting-', at + 10));
  assert.ok(at > html.indexOf('>Code appearance</h3>') && row.includes('Transcript text size'));
  assert.equal(row.slice(0, row.indexOf('data-settings-control')).includes('data-settings-desc'), false, 'no description slot');
  assert.equal(/aria-describedby/.test(row.slice(0, row.indexOf('>'))), false);
  assert.equal(html.includes('Size of the conversation transcript text.'), false);
  // Transcript width keeps its description, in the U-SET-LITE short copy (electron/i18n/concise.mjs).
  assert.ok(html.includes('Max width of the chat column.'));
  assert.equal(html.includes('Maximum width of the transcript and composer columns.'), false);
});

test('menus C5: the Developer server status is the cds-core CdsBadge (success / danger / neutral, Starting is neutral)', async () => {
  const official = v3('c8828a060-Co46iXy1.js');
  assert.ok(official.includes('S=y==="running"?"success":y==="failed"||y==="not_responding"?"danger":"neutral"'));
  assert.ok(official.includes('n(c,{variant:S,children:x})'));
  const pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
  // 4.16336.0 host wiring (frame): the badge is the cds-core CdsBadge (4.16336.0 c8828a060 keeps `t(u,{variant:S,children:x})`
  // with u = shared-frame Pu, the same S mapping).
  const v4 = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/c8828a060-CcxioRoe.js'), 'utf8');
  assert.ok(v4.includes('S=y==="running"?"success":y==="failed"||y==="not_responding"?"danger":"neutral"') && v4.includes('t(u,{variant:S,children:x})') && v4.includes('Pu as u'));
  assert.match(fs.readFileSync(path.join(app, 'src/source-settings-pages.jsx'), 'utf8'), /import \{ CdsBadge, CdsCheckbox \} from '\.\/cds-core\.mjs';/);
  const { CdsBadge } = await server.ssrLoadModule('/src/cds-core.mjs');
  const server_ = (name, runtimeStatus, extra = {}) => ({ name, runtimeStatus, tools: {}, ...extra });
  for (const [runtimeStatus, label, variant] of [['connected', 'Running', 'success'], ['failed', 'Failed', 'danger'], ['starting', 'Starting', 'neutral'], [undefined, 'Status unavailable', 'neutral']]) {
    assert.equal(pages.mcpStatusBadgeVariant(label), variant);
    const html = render(React.createElement(pages.DeveloperServers, { desktop: { servers: [server_('alpha', runtimeStatus)], mcpDefinitions: [{ name: 'alpha', command: 'node', args: [] }] }, connected: true, onEditConfig() {} }));
    const badge = render(React.createElement(CdsBadge, { variant }, label));
    assert.ok(html.includes(`<h2>alpha</h2>${badge}`), `${label}: ${badge}`);
    // 4.16336.0 vh: the label span adds the inert fizzy-lake `stacks:pb-0`.
    assert.match(badge, /^<span data-cds="Badge" class="inline-flex items-center gap-1 align-middle h-control-nested[^"]*"><span class="pb-\[0\.05em\] stacks:pb-0">/);
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

// settings-nav review P1: Cmd+, the user menu's Settings and the palette's Settings open with setSettings(true), which the
// mount passes as initialSection undefined: the official untargeted open (General), never an error. An unknown id is a
// wiring error that is reported and opens General as well.
// U-SET-LITE: the official General ('preferences') is drawn on the Appearance nav entry.
test('initialSection undefined / "" opens Settings on General (official untargeted open)', () => {
  for (const initialSection of [undefined, '']) {
    const html = page(initialSection);
    assert.match(html, /<button type="button" class="sl-nav-item" data-testid="settings-nav-appearance" aria-current="page">/, String(initialSection));
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, /data-page="preferences" data-entry="appearance"><span hidden=""><\/span><h2 class="sl-page-title">Appearance<\/h2>/);
  }
  const errors = [], error = console.error;
  console.error = value => errors.push(String(value?.message ?? value));
  try {
    const unknown = page('no-such-page');
    assert.match(unknown, /data-page="preferences" data-entry="appearance"/);
    assert.match(unknown, /data-testid="settings-nav-appearance" aria-current="page"/);
  } finally { console.error = error; }
  assert.ok(errors.some(message => message.includes('unknown host tab id "no-such-page"')));
});
