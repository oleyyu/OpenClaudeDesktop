// settings-pages-v4 (4.16336.0, scripts/extract-settings-pages-v4.mjs): host React SSR of the official General ›
// Appearance group (c0db37792 Hn) over the settings-pages host value, the generated graph's bytes against its manifest,
// D1 (the editorPrefs store and the interface-font state are this graph's own copies; Vt / Dz / mF are not sliced), and
// the adapter's fail-loud contract. Fixture data only (no real account, no user profile, no session titles).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { conciseCopy } from '../electron/i18n/concise.mjs';

const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
// SourceSettings renders through portals (server render: inline), set before any module binds react-dom's exports.
require('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = path.join(app, 'src/generated/settings-pages-v4');
let general, kit, prefs, adapter, core, shell, looks;
before(async () => {
  general = await import('../src/generated/settings-pages-v4/general.mjs');
  // Round 4: the code looks are the Claude Code page's (cda9efc49 R / M roots); c296a7a55 GeneralCodeLooks is gone.
  looks = await import('../src/generated/settings-pages-v4/code-appearance.mjs');
  kit = await import('../src/generated/settings-pages-v4/settings-kit.mjs');
  prefs = await import('../src/generated/settings-pages-v4/editor-prefs.mjs');
  adapter = await import('../src/settings-pages-adapter.mjs');
  core = await import('../src/generated/cds-core/shared-frame.mjs');
  shell = await import('../src/settings-shell-model.mjs');
});

// Fixture preview component (test data): records the mode / theme the FileDiff boundary hands the host preview.
const FixturePreview = ({ mode, theme }) => h('div', { 'data-fixture-preview': `${mode}:${theme}` });
const codeThemeColors = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/code-theme-colors.json'), 'utf8'));
const host = (patch = {}) => ({ account: shell.LOCAL_PROFILE_ACCOUNT, theme: 'system', resolvedTheme: 'light', motion: 'system', interfaceFont: 'anthropic',
  save: () => undefined, codeThemeColors, CodeThemePreview: FixturePreview, ...patch });
const render = (node, value = host()) => renderToStaticMarkup(h(core.CdsRoot, {}, h(adapter.SettingsPagesHostProvider, { value }, node)));
const appearance = value => render(h(general.GeneralAppearance), value);
const rowLabels = html => [...html.matchAll(/<span class="[^"]*inline-block align-top">([^<]+)<\/span>/g)].map(m => m[1]);

test('generated graph: every module equals its manifest hash; 4.16336.0; cds-core shared graph, settings-nav and files-changes-v4 links', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  // files-changes-v4 is linked module-limited (zustand + TanStack Query): this graph keeps shared-25 vd, which
  // session-panels-v4 links from here, so linking files-changes-v4's owner-window module would drop that export.
  assert.deepEqual(manifest.linkedAreas, ['settings-nav', { area: 'files-changes-v4', modules: ['react-store.mjs', 'vanilla-store.mjs', 'file-browser-query.mjs'] }]);
  assert.match(fs.readFileSync(path.join(out, 'shared-25.mjs'), 'utf8'), /^export \{[^}]*\bvd\b[^}]*\};$/m);
  for (const m of manifest.modules) assert.equal(sha(fs.readFileSync(path.join(out, m.target))), m.sha256, m.target);
  const pins = JSON.parse(fs.readFileSync(path.join(app, 'scripts/settings-pages-v4-pins.json'), 'utf8'));
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), pins.cdsCore.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/settings-pages-adapter.mjs'))), pins.hostAdapterSha256);
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  // D1: these are held elsewhere (code-current-v4 Vt, routines-shared-v4 Dz) or answered by the host (mF theme context,
  // shared-92 Y frame store, shared-183 dN motion): never sliced here.
  for (const key of ['vendor-flags-BSWGVdqu.js#Vt', 'shared-25-D-aF0gt9.js#Dz', 'shared-1-D1bGaTaN.js#mF', 'shared-92-BOgyxePb.js#Y', 'shared-183-B2N6Zy4J.js#dN'])
    assert.equal(sliced.has(key), false, key);
  assert.ok(sliced.has('shared-36-fqRFYwOb.js#Om'), 'editorPrefs store is this graph\'s copy');
  const adapters = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const name of ['useThemeMode', 'useReduceMotion', 'interfaceFontStore', 'useCurrentAccount', 'useHybrid3pOrganization', 'useIntl', 'FormattedMessage'])
    assert.ok(adapters.has(name), name);
});

test('official Appearance (Hn) renders Theme, Interface font, Chat font and Motion in the official order for the local profile', () => {
  const html = appearance(host());
  assert.match(html, /<section data-settings-section-titled="" class="mb-xl last:mb-0/);
  assert.match(html, /<h3 data-settings-group-title="" class="text-heading-semibold text-primary[^"]*">Appearance<\/h3>/);
  assert.deepEqual(rowLabels(html), ['Theme', 'Interface font', 'Chat font', 'Motion']);
  // Theme: CDS segmented control auto / light / dark, host "system" = official "auto".
  assert.match(html, /aria-label="Theme"/);
  // U-SET-LITE-2: Interface font's official defaultMessage (Dw23igsr+8) goes through t(), which shows its concise line.
  assert.ok(fs.readFileSync(path.join(out, 'general.mjs'), 'utf8').includes('"Font for the whole interface \\u2014 menus, sidebars, and panels."'), 'the official source string');
  assert.equal(conciseCopy('Font for the whole interface — menus, sidebars, and panels.', 'en-US'), 'Font for menus, sidebars and panels.');
  assert.match(html, /data-settings-desc=""[^>]*>Font for menus, sidebars and panels\./);
  assert.doesNotMatch(html, /Font for the whole interface/);
  assert.match(html, /Font licenses/);
  // GrowthBook-gated rows stay off with the host table: no transcript text size / width on General, no Ant only badge.
  assert.doesNotMatch(html, /Transcript text size|Transcript width|Ant only/);
});

test('host values drive the official controls (theme mode, motion, interface font)', () => {
  const dark = appearance(host({ theme: 'dark', resolvedTheme: 'dark' }));
  const system = appearance(host());
  assert.notEqual(dark, system);
  assert.notEqual(appearance(host({ motion: 'reduce' })), system);
  assert.notEqual(appearance(host({ interfaceFont: 'dyslexic' })), system);
  assert.match(appearance(host({ interfaceFont: 'dyslexic' })), /OpenDyslexic/);
});

test('adapter contract: provider required, host value complete, writes go to host save with host names', async () => {
  assert.throws(() => renderToStaticMarkup(h(general.GeneralAppearance)), /SettingsPagesHostProvider/);
  assert.throws(() => render(h('div'), { theme: 'system' }), /does not answer account/);
  const saved = [];
  let mode, motion, font;
  const Probe = () => { mode = adapter.useThemeMode(); motion = adapter.useReduceMotion(); font = adapter.interfaceFontStore(s => s); return null; };
  render(h(Probe), host({ save: patch => saved.push(patch) }));
  assert.equal(mode.mode, 'auto');
  mode.setMode('dark'); motion.setMode('reduce'); font.setInterfaceFont('system');
  assert.deepEqual(saved, [{ theme: 'dark' }, { motion: 'reduce' }, { interfaceFont: 'system' }]);
  assert.throws(() => mode.setMode('sepia'), /no host theme/);
  assert.equal(adapter.interfaceFontStore.getState().interfaceFont, 'anthropic');
  assert.throws(() => adapter.interfaceFontStore.setState({}), /host preference/);
  let accountUpdate;
  render(h(() => { accountUpdate = adapter.useUpdateAccountSettings(); return null; }), host({ save: patch => saved.push(patch) }));
  assert.rejects(accountUpdate.mutateAsync({}), /no claude\.ai account settings service/);
  // Round 4: the one account field with a host home (Default transcript view) saves the host transcriptView; others reject.
  await accountUpdate.mutateAsync({ code_default_transcript_view: 'verbose' });
  assert.deepEqual(saved.at(-1), { transcriptView: 'verbose' });
  await assert.rejects(accountUpdate.mutateAsync({ chat_font: 'sans' }), /no claude\.ai account settings service/);
  // shared-153 LT: no organization → no taint:hybrid_3p capability.
  let hybrid;
  render(h(() => { hybrid = adapter.useHybrid3pOrganization(); return null; }));
  assert.equal(hybrid, false);
});

test('settings primitives (shared-1 II / jI / GI) render the official section, row and stack', () => {
  const html = render(h(kit.SettingsStack, {}, h(kit.SettingsSection, { title: 'Language' }, h(kit.SettingsRow, { label: 'Language', description: 'Fixture', control: h('span', null, 'ctl') }))));
  assert.match(html, /^<div class="cds-root text-primary"[^>]*><div class="flex flex-col "><section data-settings-section-titled=""/);
  assert.match(html, /data-settings-group-title="" class="[^"]*">Language<\/h3>/);
  assert.match(html, /<span>ctl<\/span>/);
});

test('editorPrefs store keeps the official field names and the s / m / l values the host saves', () => {
  const state = prefs.useEditorPrefsStore.getState();
  for (const key of ['chatTextSize', 'transcriptWidthChoice', 'setChatTextSize', 'setTranscriptWidth', 'codeThemeLight', 'codeThemeDark'])
    assert.ok(Object.hasOwn(state, key), key);
  assert.equal(state.chatTextSize, 'm');
});

// SourceSettings › General (tab 'preferences', U-SET-LITE: the Appearance page) through Vite SSR, as settings-shell-render
// does: the official Appearance group replaces the host Theme / Motion rows, Interface font left the Code page, Language
// stays as the OpenClaude local group, and the Claude Code page's official code looks moved here from Code.
let server, Settings;
after(() => server?.close());
test('SourceSettings Appearance shows the official Appearance group, the local Language group and the official code looks; Code page has neither', async () => {
  // W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
  // router store (reads window.location.pathname at load), as in the app.
  globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
    createElement: () => ({ relList: { supports: () => false } }) };
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  const page = (initialSection, config = {}) => renderToStaticMarkup(h(Settings, { open: true, config: { threadIds: [], theme: 'dark', interfaceFont: 'dyslexic', ...config },
    model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [], coworkEnabled: true }, busy: false, initialSection,
    desktopCall: async () => ({}), onSave: async () => ({}), onClose() {} }));
  const html = page('preferences');
  const official = html.indexOf('data-settings-group-title="" class="text-heading-semibold text-primary settings-row-title self-start outline-none">Appearance</h3>');
  assert.ok(official > 0, 'official Appearance section');
  assert.ok(html.indexOf('>Language</h3>') > official, 'local Language group after it');
  assert.deepEqual(rowLabels(html.slice(official)).slice(0, 4), ['Theme', 'Interface font', 'Chat font', 'Motion']);
  assert.match(html, /aria-label="Dark"[^>]*|data-checked=""[^>]*aria-label="Dark"/);
  assert.match(html, /value="dark"\/>|checked="" value="dark"/);
  assert.match(html, /OpenDyslexic/);
  assert.doesNotMatch(html, /data-setting-id="theme"|data-setting-id="motion"/);
  const code = page('code');
  assert.doesNotMatch(code, /data-setting-id="interfaceFont"/);
  // Round 4 (corrects B2): the code looks are the Claude Code page's official groups (Ea `x && !C`: R Code appearance and
  // M Appearance part "all"). The host rows stay unrendered on both pages (no data-setting-id markers); the official rows
  // carry their setting ids.
  for (const shown of [html, code]) {
    assert.doesNotMatch(shown, /data-setting-id="transcriptSize"|data-setting-id="transcriptWidth"|data-setting-id="codeFont"/);
    // was: assert.match(code, /data-setting-id="transcriptView"/) (the host row); now the official Default transcript view row
    assert.doesNotMatch(shown, /data-setting-id="transcriptView"/);
  }
  // U-SET-LITE: the 'Code appearance' group moved from the Code page to Appearance ('preferences'); it still renders the
  // two official sections, after the official General Appearance group (General's own Hn has no code looks: Vd false).
  const looksAt = html.indexOf('<section id="code-appearance"');
  assert.ok(looksAt > official, 'official Code appearance on the Appearance page, after the official Appearance group');
  assert.match(html.slice(looksAt), /Light code theme/);
  assert.ok(html.indexOf('<section id="appearance"', looksAt) > looksAt, 'official Appearance (M part "all") after Code appearance');
  assert.match(html.slice(looksAt), /id="setting-claude-code-transcript-text-size"/);
  assert.match(html.slice(looksAt), /id="setting-claude-code-default-transcript-view"/);
  assert.ok(html.indexOf('>Language</h3>') > official, 'local Language group after Appearance');
  // The Code page keeps the official Sessions group and no code looks.
  assert.match(code, /id="setting-claude-code-worktree-location"/);
  assert.equal(code.indexOf('<section id="code-appearance"'), -1, 'no Code appearance on Code');
  assert.doesNotMatch(code, /Light code theme|id="setting-claude-code-transcript-text-size"|id="setting-claude-code-default-transcript-view"/);
  // The adapter's desktop bridges answer from the provider rendered last (here the Code page's official Sessions group;
  // on Appearance, the code looks provider): it carries the page's desktop preferences, so the official stores'
  // AppPreferences reads keep resolving (the Electron check of the first cut logged "AppPreferences.getPreferences
  // outside a SettingsPagesHostProvider").
  const ssrAdapter = await server.ssrLoadModule('/src/settings-pages-adapter.mjs');
  const desktopPrefs = await ssrAdapter.hostAppPreferences.getPreferences();
  assert.equal(desktopPrefs.chillingSlothLocation, 'default');
  assert.equal(desktopPrefs.bypassPermissionsModeEnabled, false);
  assert.equal(typeof desktopPrefs.notificationLevels, 'object');
});

// Round 4 (settings lane general): the desktop Claude Code page's code looks (c71860c77-puomdTO2 Ea `x && !C`: Wn =
// cda9efc49 R, Un = cda9efc49 M part "all"); was the simple-nav General › Code looks (c296a7a55 GeneralCodeLooks, M part
// "looks" joined under R). Every check of the old test is kept; the join became the official separate Appearance section
// and it carries Default transcript view (the account setting, answered by the host transcriptView).
test('official Claude Code page code looks (cda9efc49 R Code appearance + M Appearance part "all") render with host values', () => {
  const account = { ...shell.LOCAL_PROFILE_ACCOUNT, account: { ...shell.LOCAL_PROFILE_ACCOUNT.account, settings: { code_default_transcript_view: 'thinking' } } };
  const html = render(h(React.Fragment, null, h(looks.CodeAppearanceSection), h(looks.CodeTranscriptAppearanceSection)), host({ account }));
  assert.match(html, /<section id="code-appearance" data-settings-section-titled=""/);
  assert.match(html, /data-settings-group-title="" class="[^"]*">Code appearance<\/h3>/);
  // was ['Code font', 'Code font size', 'Transcript text size', 'Transcript width'] (part "looks")
  assert.deepEqual(rowLabels(html), ['Code font', 'Code font size', 'Transcript text size', 'Transcript width', 'Default transcript view']);
  assert.match(html, /aria-label="Light code theme"[^>]*><span[^>]*>Claude Light</);
  assert.match(html, /aria-label="Dark code theme"[^>]*><span[^>]*>Claude Dark</);
  // FileDiff boundary: each column's official cds scope forces its mode; the host preview gets that mode's theme.
  assert.match(html, /data-mode="light"[^>]*><div data-fixture-preview="light:claude-light">/);
  assert.match(html, /data-mode="dark"[^>]*><div data-fixture-preview="dark:claude-dark">/);
  assert.match(html, /placeholder="e.g. JetBrains Mono" aria-label="Code font family"/);
  assert.match(html, /Default · 12 px/);
  // Second section (M part "all", not joined): its own Appearance title, no border-t join class (was the joined
  // `-mt-xl border-t border-alpha-1` section of part "looks").
  assert.match(html, /<section id="appearance" data-settings-section-titled="" class="mb-xl last:mb-0 ">/);
  assert.doesNotMatch(html, /-mt-xl border-t border-alpha-1/);
  assert.match(html, /data-settings-group-title="" class="[^"]*">Appearance<\/h3>/);
  for (const id of ['code-font', 'code-font-size', 'transcript-text-size', 'transcript-width', 'default-transcript-view'])
    assert.match(html, new RegExp(`id="setting-claude-code-${id}"`), id);
  // Default transcript view reads the account setting (host transcriptView): Thinking is the checked segment.
  assert.match(html, /aria-label="Default transcript view"/);
  assert.match(html, /data-checked="" role="radio"[^>]*aria-checked="true"[^>]*>Thinking/);
  // (Store-driven re-render is checked in the Electron GUI: server rendering reads the store's initial snapshot.)
});

test('Code looks adapter: highlight stack resolves themes from the host table; stock bindings and FileDiff fail loud', async () => {
  let stack;
  render(h(() => { stack = adapter.loadCodeHighlightStack(); return null; }));
  const theme = await (await stack).resolveTheme('github-dark');
  assert.equal(theme.bg, codeThemeColors['github-dark'].bg);
  assert.equal(theme.colors['editor.background'], codeThemeColors['github-dark'].editor.colors['editor.background']);
  await assert.rejects((await stack).resolveTheme('no-such-theme'), /not in the host code theme table/);
  // B3: the desktopPref / claudeCodeSetting stock bindings (c51ac4bf6 U / W) are official code now (the Claude Code
  // groups call them); only the accountSetting binding stays a boundary, and it still fails loud.
  assert.equal('useDesktopPrefBinding' in adapter, false);
  assert.equal('useClaudeCodeSettingBinding' in adapter, false);
  assert.throws(() => adapter.useAccountSettingBinding({ id: 'fixture' }), /not answered on this page/);
  assert.throws(() => render(h('div'), host({ CodeThemePreview: null })), /CodeThemePreview must be a component/);
  assert.equal(adapter.useGrowthBookFeatureValue('__gb__4076713163'), undefined);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  // Boundaries never sliced here: FileDiff (pierre-changes), the highlight stack loader, the routine-preview context.
  for (const key of ['ca7ba268c-BbXZXSeA.js#Va', 'c34e6410a-BLtdknyP.js#s', 'shared-36-fqRFYwOb.js#fm', 'c51ac4bf6-BiJ5KnQb.js#ae'])
    assert.equal(sliced.has(key), false, key);
  // B3 moved the desktopPref boundary down to the official bridge: U / W and the desktop prefs store are sliced, the
  // AppPreferences / FilePickers bridges and the managed-settings query are host answers.
  for (const key of ['c51ac4bf6-BiJ5KnQb.js#U', 'c51ac4bf6-BiJ5KnQb.js#W', 'c6673aecb-B-t_VQzj.js#i', 'c8b630735-Bbdb359j.js#ot'])
    assert.ok(sliced.has(key), key);
  for (const key of ['shared-25-D-aF0gt9.js#Bi', 'shared-25-D-aF0gt9.js#zi', 'shared-8-BqfCbkJd.js#hx', 'shared-92-BOgyxePb.js#_O', 'shared-25-D-aF0gt9.js#Dz', 'vendor-datadog-BVEJ_UMz.js#h'])
    assert.equal(sliced.has(key), false, key);
});

// ---- B3 Settings › Claude Code (c8b630735 ot) ---------------------------------------------------------------------------
// Fixture desktop preferences (test data): what electron/desktop-settings.cjs desktopPreferences hands SourceSettings.
// settings-pages-host.jsx is JSX: loaded through the same Vite SSR server as SourceSettings above (created here when this
// test runs alone).
async function ssrPagesHost() {
  if (!server) {
    const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
    server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  }
  return server.ssrLoadModule('/src/settings-pages-host.jsx');
}
const fixtureConfig = { permissionNotifications: 'banner', questionNotifications: 'off', completeNotifications: 'banner', notificationSound: 'system',
  drawAttention: false, keepAwake: true, keepAwakeOnBattery: false, archiveInactiveDays: 7, worktreeLocation: 'project', allowBypassPermissions: false };

test('host desktop preferences map to the official desktopPref keys and back', async () => {
  const pagesHost = await ssrPagesHost();
  const prefsOut = pagesHost.officialDesktopPrefs(fixtureConfig);
  assert.deepEqual(prefsOut, { notificationLevels: { permission: 'banner', question: 'off', idle: 'banner' }, notificationSound: 'system', dockBounceEnabled: false,
    ccKeepAwakeWhileWorking: true, ccKeepAwakeOnBattery: false, ccAutoArchiveInactiveDays: 7, chillingSlothLocation: 'default', bypassPermissionsModeEnabled: false });
  // keys without a host fact stay absent (official whenMissing / `!== void 0` hide the rows)
  for (const key of ['ccNextActions', 'ccNewTaskPrompt', 'ccRemoteControlDefaultEnabled', 'bypassPermissionsOptInByAccount']) assert.equal(key in prefsOut, false, key);
  assert.deepEqual(pagesHost.officialDesktopPrefs({ ...fixtureConfig, worktreeLocation: 'custom', worktreeDirectory: '/fixture/wt' }).chillingSlothLocation, { customPath: '/fixture/wt' });
  const back = (key, value, picked) => pagesHost.hostPatchForPreference(key, value, fixtureConfig, picked);
  assert.deepEqual(back('notificationLevels', { permission: 'banner', question: 'badge', idle: 'banner' }), { questionNotifications: 'badge' });
  assert.deepEqual(back('dockBounceEnabled', true), { drawAttention: true });
  assert.deepEqual(back('ccKeepAwakeWhileWorking', false), { keepAwake: false });
  assert.deepEqual(back('ccAutoArchiveInactiveDays', 30), { archiveInactiveDays: 30 });
  assert.deepEqual(back('chillingSlothLocation', 'default'), { worktreeLocation: 'project' });
  assert.deepEqual(back('chillingSlothLocation', { customPath: '/fixture/picked' }, '/fixture/picked'), {});
  assert.throws(() => back('chillingSlothLocation', { customPath: '/elsewhere' }, '/fixture/picked'), /host folder picker/);
  assert.deepEqual(back('bypassPermissionsModeEnabled', true), { allowBypassPermissions: true });
  assert.throws(() => back('ccNextActions', true), /keeps no desktop preference/);
});

test('official Claude Code groups render the local and notifications parts from the host preferences; writes reach the host save', async () => {
  const cc = await import('../src/generated/settings-pages-v4/claude-code.mjs');
  const { QueryClient, QueryClientProvider } = await import('../src/generated/files-changes-v4/file-browser-query.mjs');
  const pagesHost = await ssrPagesHost();
  const saved = [];
  const value = part => host({ appPreferences: { prefs: pagesHost.officialDesktopPrefs(fixtureConfig), set: async (key, next) => saved.push(pagesHost.hostPatchForPreference(key, next, fixtureConfig)) },
    pickDirectory: async () => undefined, deepLink: null });
  const client = new QueryClient();
  const draw = part => render(h(QueryClientProvider, { client }, h(cc.ClaudeCodeSettingsGroups, { part })), value(part));
  // Server render reads the official stores' initial state (zustand getServerSnapshot): the desktop prefs are still
  // pending, so the stock-binding rows show their official loading control and the rows gated on loaded prefs (bypass,
  // notification levels: ot `F?.x !== void 0`) are not there yet; the Electron check covers the loaded page.
  const local = draw('local'), notifications = draw('notifications');
  if (process.env.SETTINGS_DEBUG_HTML) fs.writeFileSync(process.env.SETTINGS_DEBUG_HTML, local + '\n<!-- notifications -->\n' + notifications);
  assert.match(local, /data-settings-group-title="[^"]*"[^>]*>Sessions</);
  assert.match(notifications, />On this computer</);
  for (const label of ['Archive inactive sessions', 'Worktree location']) assert.ok(local.includes(label), label);
  for (const label of ['Draw attention on notifications']) assert.ok(notifications.includes(label), label);
  assert.equal(local.includes('Draw attention on notifications'), false, 'notification rows are part "notifications" only');
  assert.equal(notifications.includes('Worktree location'), false, 'local rows are part "local" only');
  assert.ok(local.includes('Loading'), 'stock desktopPref rows wait for the AppPreferences answer');
  // the bridge hands the official stores the host preferences under the official keys
  assert.deepEqual(await adapter.hostAppPreferences.getPreferences(), pagesHost.officialDesktopPrefs(fixtureConfig));
  // AppPreferences bridge: setPreference goes to the host save under host names
  await adapter.hostAppPreferences.setPreference('dockBounceEnabled', true);
  assert.deepEqual(saved.at(-1), { drawAttention: true });
  await assert.rejects(adapter.hostAppPreferences.setPreference('ccNextActions', true), /keeps no desktop preference/);
});

// B4 Developer page (c71860c77-Cuocl2LF i: c8828a060 F > B > oe). Fixture: two synthetic local MCP servers.
const fixtureDesktop = {
  mcpDefinitions: [{ name: 'fixture-files', command: 'node', args: ['server.js', '--root', '/fixture'], environmentNames: ['FIXTURE_TOKEN'] },
    { name: 'fixture-web', url: 'http://127.0.0.1:9/mcp', args: [], environmentNames: [] }],
  servers: [{ name: 'fixture-files', runtimeStatus: { status: 'connected' }, tools: { read: {} } }, { name: 'fixture-web', toolsError: 'Fixture handshake failed.' }],
};
test('Developer page graph: official route component root, MCP / errors / desktop-app cuts, gW / _W / SW linked from cds-core, shared-55 DR / mL not reached', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const pins = JSON.parse(fs.readFileSync(path.join(app, 'scripts/settings-pages-v4-pins.json'), 'utf8'));
  assert.deepEqual([pins.roots.DeveloperSettingsPage.file, pins.roots.DeveloperSettingsPage.local], ['c71860c77-Cuocl2LF.js', 'i']);
  const official = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/c71860c77-Cuocl2LF.js'), 'utf8');
  assert.ok(official.includes('import{n as t,r as n,t as r}from"./c8828a060-CcxioRoe.js";function i(){let $=J9(1);return J0($,0)?K0($,0,e(n,{children:e(t,{children:e(r,{})})})):$[0]}export{i as default};'));
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const key of ['c71860c77-Cuocl2LF.js#i', 'c8828a060-CcxioRoe.js#F', 'c8828a060-CcxioRoe.js#B', 'c8828a060-CcxioRoe.js#oe', 'c8828a060-CcxioRoe.js#L', 'shared-55-BRv2XBP7.js#tg'])
    assert.ok(sliced.has(key), key);
  // W8S-T10: shared-55 gO is a cds-core wave-8s publicName (settings_shared55_gO), linked, not cut (was: in the sliced list above).
  assert.equal(sliced.has('shared-55-BRv2XBP7.js#gO'), false);
  assert.ok(manifest.modules.flatMap(m => m.imports).some(i => i.via === 'shared-55-BRv2XBP7.js#gO' && i.kind === 'shared-graph' && i.from === '../cds-core/shared-55.mjs'), 'gO from cds-core');
  // the MCP bridge (shared-25 Li = W_), the errors context reader and the desktop-version check are host boundaries; the
  // shared-1 wW state (gW / _W / SW, cds-core wave 7) is cds-core's; shared-55 DR / mL (frame-sidebar, wave 8) are not reached.
  for (const key of ['shared-25-D-aF0gt9.js#Li', 'shared-62-DoCqVpIq.js#rP', 'shared-0-CnnWnVrT.js#FH', 'shared-1-D1bGaTaN.js#gW', 'shared-1-D1bGaTaN.js#_W', 'shared-1-D1bGaTaN.js#SW', 'shared-55-BRv2XBP7.js#DR', 'shared-55-BRv2XBP7.js#mL'])
    assert.equal(sliced.has(key), false, key);
  const imports = manifest.modules.flatMap(m => m.imports);
  for (const name of ['_W', 'SW']) assert.ok(imports.some(i => i.name === name && i.kind === 'shared-graph' && i.from === '../cds-core/shared-1.mjs'), name);
  for (const [via, original, name] of [['shared-25-D-aF0gt9.js:W_', 'Li', 'hostMcpBridge'], ['shared-62-DoCqVpIq.js:zl', 'rP', 'useErrors'], ['shared-0-CnnWnVrT.js:Yu', 'FH', 'useIsDesktopApp']])
    assert.ok(imports.some(i => i.via === via && i.original === original && i.kind === 'adapter' && i.name === name), via);
  // both readers of the MCP bridge (B and shared-55 tg) get the one host object
  assert.deepEqual(imports.filter(i => i.name === 'hostMcpBridge').map(i => i.local).sort(), ['It', '_']);
  assert.ok(Object.hasOwn(pins.cuts, 'hostMcpBridge') && Object.hasOwn(pins.cuts, 'useErrors') && Object.hasOwn(pins.cuts, 'useIsDesktopApp'));
});

test('DesktopInfo (shared-25 Hi = z_): a host boundary read by shared-26 DF; the platform reaches ot\'s Draw attention branch', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const pins = JSON.parse(fs.readFileSync(path.join(app, 'scripts/settings-pages-v4-pins.json'), 'utf8'));
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  assert.equal(sliced.has('shared-25-D-aF0gt9.js#Hi'), false, 'the claude.settings DesktopInfo preload read is not sliced');
  assert.ok(sliced.has('shared-26-B-POtn5S.js#DF'), 'DF (getSystemInfo once per window) is the official code');
  const imports = manifest.modules.flatMap(m => m.imports);
  assert.ok(imports.some(i => i.via === 'shared-25-D-aF0gt9.js:z_' && i.original === 'Hi' && i.kind === 'adapter' && i.name === 'hostDesktopInfo' && i.local === 'tn'));
  assert.deepEqual([pins.cuts.hostDesktopInfo.importer, pins.cuts.hostDesktopInfo.file, pins.cuts.hostDesktopInfo.local, pins.cuts.hostDesktopInfo.export],
    ['shared-26-B-POtn5S.js#tn', 'shared-25-D-aF0gt9.js', 'Hi', 'z_']);
  // ot: `O = DF()?.platform` picks the Draw attention description (official darwin / win32 / other branches)
  const ot = fs.readFileSync(path.join(out, 'claude-code.mjs'), 'utf8');
  assert.match(ot, /O = te\(\)\?\.platform,/);
  assert.match(ot, /O === "darwin"\s*\? t\(G, \{\s*defaultMessage:\s*"Bounce the Dock icon when Claude needs your attention and the app isn\\u2019t focused\.",\s*id: "HOH5mdam48"/);
  // the bridge answers from the host value's desktopInfo, and fails loud outside it
  assert.throws(() => adapter.hostDesktopInfo.getSystemInfo(), /DesktopInfo\.getSystemInfo outside a SettingsPagesHostProvider/);
  const pagesHost = await ssrPagesHost();
  const transcriptAdapters = await server.ssrLoadModule('/src/source-code-transcript-adapters.jsx');
  assert.equal(pagesHost.settingsPagesHostValue({ theme: 'system', motion: 'system', interfaceFont: 'default', save: async () => {} }).desktopInfo,
    transcriptAdapters.desktopInfo, 'the one host DesktopInfo instance (the Session info card\'s)');
});

test('Developer page: host MCP snapshot in the official record shape; the bridge answers B and deletes through the host', async () => {
  const pagesHost = await ssrPagesHost();
  const servers = pagesHost.officialMcpServers(fixtureDesktop);
  assert.deepEqual(servers, {
    'fixture-files': { command: 'node', args: ['server.js', '--root', '/fixture'], env: { FIXTURE_TOKEN: '' }, status: 'running' },
    'fixture-web': { status: 'failed', error: 'Fixture handshake failed.' },
  });
  assert.deepEqual(pagesHost.officialMcpServers({ mcpDefinitions: [{ name: 'p', command: 'x', args: [] }], servers: [{ name: 'p', pluginId: 'plug', runtimeStatus: 'starting' }] }),
    { p: { command: 'x', extensionId: 'plug', status: 'initializing' } });
  const page = await import('../src/generated/settings-pages-v4/developer-page.mjs');
  const removed = [], revealed = [];
  const errors = { addError: () => {} };
  const value = host({ errors, mcp: { servers, setServerConfigs: async next => removed.push(Object.keys(servers).filter(k => !Object.hasOwn(next, k))), revealConfig: () => revealed.push(true) } });
  const html = render(h(page.DeveloperSettingsPage), value);
  // Server render: B's effects have not run, so it shows the official loading state inside the Local MCP servers section.
  assert.match(html, /^<div[^>]*><main class="flex flex-col h-full">/);
  // U-SET-LITE-2: the section's official description (h2kOgf50w3) goes through t(), which shows its concise line.
  assert.ok(fs.readFileSync(path.join(out, 'developer.mjs'), 'utf8').includes('"Add and manage MCP servers that you\\u2019re working on. "'), 'the official source string');
  assert.equal(conciseCopy('Add and manage MCP servers that you’re working on. ', 'en-US'), 'MCP servers you’re developing. ', 'the trailing space stays');
  assert.ok(html.includes('Local MCP servers') && html.includes('>MCP servers you’re developing. </span>'));
  assert.equal(html.includes('Add and manage MCP servers'), false);
  // c8828a060 V: the SkeletonGroup (label "Loading MCP servers", announced once the hold passes) with the Edit config chip
  // and the list rows [112, 88, 128].
  assert.match(html, /<div data-cds="SkeletonGroup"[^>]*role="status" class="flex min-h-0 flex-1 flex-col">/);
  assert.match(html, /style="width:104px"[\s\S]*width:112px;height:14px[\s\S]*width:88px;height:14px[\s\S]*width:128px;height:14px/);
  assert.equal(html.includes('Want an API key?'), false, 'oe: claudeai_settings_platform_row is not on (official gate closed)');
  assert.deepEqual(await adapter.hostMcpBridge.getMcpServersConfigWithStatus(), servers);
  await adapter.hostMcpBridge.setMcpServerConfigs({ 'fixture-web': servers['fixture-web'] });
  assert.deepEqual(removed, [['fixture-files']]);
  adapter.hostMcpBridge.revealConfig();
  assert.deepEqual(revealed, [true]);
  assert.equal('revealServerLog' in adapter.hostMcpBridge, false, 'no per-server log on the host: official no-method branch');
  assert.equal('isLocalDevMcpEnabled' in adapter.hostMcpBridge, false);
  assert.equal(adapter.useIsDesktopApp(), true);
});
