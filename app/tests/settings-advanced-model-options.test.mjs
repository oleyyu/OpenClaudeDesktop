import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { modelNameKey, parseModelNameKey, validateModelNames, normalizeModelNames, setModelName, customModelName, withModelNames, MODEL_NAME_MAX } from '../electron/prefs/model-names.mjs';
import { setModelParam, modelParamsFor, modelParamsForCore, withEffortDefaults, withModelOverrides, validate as validateModelSettings } from '../electron/prefs/model-settings.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
import { pickCoreModel } from '../electron/prefs/core-model.mjs';
import { stageFiles, imageRefusedNotice, IMAGE_MODEL_ERROR, IMAGE_OFF_ERROR, modelAcceptsImages } from '../src/composer-attachments-model.mjs';
import { namedModels, bootModelsCoreId, modelNamesCoreId } from '../src/model-names-model.mjs';
import { hasAdvancedRows, ADVANCED_PAGES } from '../src/settings-advanced-model.mjs';
import { settingsSearch } from '../src/settings-model.mjs';
import { PALETTE_SETTINGS_SECTIONS, PALETTE_CUSTOMIZE_SECTIONS } from '../src/sidebar-palette-model.mjs';
import { setLocale, DEFAULT_LOCALE, t } from '../electron/i18n/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');

// ---- Display names (prefs/model-names.mjs)

test('model names: keys carry the core id, so two cores keep their own name for the same model id', () => {
  assert.equal(modelNameKey('deepseek', 'glm-5.3'), 'deepseek:glm-5.3');
  assert.equal(modelNameKey('opencode', 'qwen3:8b'), 'opencode:qwen3:8b', 'a colon in the model id stays in the model part');
  assert.deepEqual(parseModelNameKey('opencode:qwen3:8b'), { coreId: 'opencode', modelId: 'qwen3:8b' });
  for (const bad of [['', 'm'], ['Deep Seek', 'm'], ['deepseek', ''], ['deepseek', '__proto__'], ['deepseek', 'a b']]) assert.equal(modelNameKey(...bad), null, bad.join('|'));
  let names = setModelName(null, 'deepseek', 'glm-5.3', '  My GLM  ');
  names = setModelName(names, 'opencode', 'glm-5.3', 'Router GLM');
  assert.deepEqual(names, { 'deepseek:glm-5.3': 'My GLM', 'opencode:glm-5.3': 'Router GLM' });
  assert.equal(customModelName(names, 'deepseek', 'glm-5.3'), 'My GLM');
  assert.equal(customModelName(names, 'kimi', 'glm-5.3'), null);
  // Clearing goes back to the default name; nothing left is null (the preference is removed).
  assert.deepEqual(setModelName(names, 'opencode', 'glm-5.3', ''), { 'deepseek:glm-5.3': 'My GLM' });
  assert.equal(setModelName({ 'deepseek:glm-5.3': 'x' }, 'deepseek', 'glm-5.3', '   '), null);
  assert.throws(() => setModelName(null, 'deepseek', 'm', 'x'.repeat(MODEL_NAME_MAX + 1)), /60 characters or fewer/);
  assert.throws(() => setModelName(null, 'deepseek', 'm', 'a\nb'), /60 characters or fewer/);
  assert.throws(() => setModelName(null, 'bad id', 'm', 'x'), /Invalid model/);
});

test('model names: strict validate for settingsPatch, lenient normalize, null resets', () => {
  assert.equal(validateModelNames(null), null);
  assert.equal(validateModelNames({}), null);
  assert.deepEqual(validateModelNames({ 'codex:gpt-6': ' Six ' }), { 'codex:gpt-6': 'Six' });
  assert.throws(() => validateModelNames({ 'gpt-6': 'Six' }), /Invalid model/, 'a key without a core id is refused');
  assert.throws(() => validateModelNames([]), /Invalid model names/);
  assert.deepEqual(normalizeModelNames({ 'gpt-6': 'x', 'codex:gpt-6': 'Six', 'codex:m': 7 }), { 'codex:gpt-6': 'Six' });
  const saved = settingsPatch({ theme: 'dark' }, { modelNames: { 'codex:gpt-6': 'Six' } });
  assert.deepEqual(saved.modelNames, { 'codex:gpt-6': 'Six' });
  assert.equal('modelNames' in settingsPatch(saved, { modelNames: null }), false);
  assert.throws(() => settingsPatch({}, { modelNames: { 'codex:gpt-6': 1 } }), /model name/);
});

test('withModelNames renames the running core’s entries only and keeps the catalog name as defaultDisplayName', () => {
  const list = [{ model: 'glm-5.3', displayName: 'GLM 5.3' }, { model: 'deepseek-flash', displayName: '4.1 Flash' }];
  assert.equal(withModelNames(list, null, 'deepseek'), list, 'no names: the same list');
  assert.equal(withModelNames(list, { 'opencode:glm-5.3': 'Router' }, 'deepseek'), list, 'another core’s names leave this list alone');
  const named = withModelNames(list, { 'deepseek:glm-5.3': 'My GLM' }, 'deepseek');
  assert.deepEqual(named[0], { model: 'glm-5.3', displayName: 'My GLM', defaultDisplayName: 'GLM 5.3', customDisplayName: true });
  assert.equal(named[1], list[1], 'unchanged entries keep their identity');
});

// ---- Per-model options (prefs/model-settings.mjs params keyed '<coreId>:<modelId>')

test('per-model params: saved under the core’s key, an entry saved before core ids moves with the first edit', () => {
  const legacy = { params: { 'glm-5.3': { maxTokens: 4096, effort: 'high' } }, prices: null };
  assert.deepEqual(modelParamsFor(legacy, 'deepseek', 'glm-5.3'), { maxTokens: 4096, effort: 'high' }, 'a bare entry reads for every core');
  const next = setModelParam(legacy, 'glm-5.3', 'contextWindow', 131072, 'deepseek');
  assert.deepEqual(next.params, { 'deepseek:glm-5.3': { maxTokens: 4096, effort: 'high', contextWindow: 131072 } });
  assert.deepEqual(modelParamsFor(next, 'opencode', 'glm-5.3'), {}, 'another core keeps its own (empty) options');
  const both = setModelParam(next, 'glm-5.3', 'maxTokens', 2048, 'opencode');
  assert.deepEqual(modelParamsForCore(both, 'deepseek')['glm-5.3'], { maxTokens: 4096, contextWindow: 131072 });
  assert.deepEqual(modelParamsForCore(both, 'opencode')['glm-5.3'], { maxTokens: 2048 });
  // Without a core id the old behavior stays: bare keys.
  assert.deepEqual(setModelParam(null, 'm', 'maxTokens', 1024).params, { m: { maxTokens: 1024 } });
  assert.deepEqual(validateModelSettings({ params: { 'kimi:kimi-k3': { contextWindow: 262144, images: false } } }).params, { 'kimi:kimi-k3': { contextWindow: 262144, images: false } });
  assert.throws(() => validateModelSettings({ params: { m: { images: 'no' } } }), /Image input can only be turned off/);
});

test('per-model params: image input off and the default effort reach the model list for that core only', () => {
  const catalog = [
    { model: 'kimi-k3', displayName: 'Kimi K3', inputModalities: ['text', 'image'], defaultReasoningEffort: 'medium', supportedReasoningEfforts: [{ reasoningEffort: 'medium' }, { reasoningEffort: 'high' }] },
    { model: 'other', displayName: 'Other' },
  ];
  let settings = setModelParam(null, 'kimi-k3', 'images', false, 'kimi');
  settings = setModelParam(settings, 'kimi-k3', 'effort', 'high', 'kimi');
  const kimi = withModelOverrides(catalog, settings, 'kimi');
  assert.deepEqual(kimi[0].inputModalities, ['text']);
  assert.equal(kimi[0].imagesOff, true);
  assert.equal(kimi[0].defaultReasoningEffort, 'high');
  assert.equal(modelAcceptsImages(kimi[0]), false, 'the composer refuses images for it');
  assert.equal(kimi[1], catalog[1]);
  assert.deepEqual(withModelOverrides(catalog, settings, 'opencode').map((entry, index) => entry === catalog[index]), [true, true], 'another core: unchanged entries');
  assert.equal(withEffortDefaults(catalog, settings, 'opencode')[0], catalog[0]);
  // Turning image input back on clears the override (the catalog decides).
  assert.equal(modelParamsFor(setModelParam(settings, 'kimi-k3', 'images', true, 'kimi'), 'kimi', 'kimi-k3').images, undefined);
  // The connect-time reconcile picks the core's own default effort.
  assert.equal(pickCoreModel(catalog, { model: 'kimi-k3', effort: 'low' }, settings, 'kimi').effort, 'high');
  assert.equal(pickCoreModel(catalog, { model: 'kimi-k3', effort: 'low' }, settings, 'opencode').effort, 'medium');
});

test('renderer model list: names and per-model options keyed on the running core (model-names-model.mjs)', () => {
  const catalog = [{ model: 'glm-5.3', displayName: 'GLM 5.3', inputModalities: ['text', 'image'] }];
  const config = { modelNames: { 'deepseek:glm-5.3': 'My GLM', 'opencode:glm-5.3': 'Router GLM' }, modelSettings: { params: { 'opencode:glm-5.3': { images: false } } } };
  assert.equal(modelNamesCoreId({ engine: 'deepseek-harness' }), modelNamesCoreId('deepseek'));
  assert.equal(bootModelsCoreId({ connected: false }, { core: 'opencode' }), 'opencode');
  const deepseek = namedModels(catalog, config, 'deepseek')[0], opencode = namedModels(catalog, config, 'opencode')[0];
  assert.deepEqual([deepseek.displayName, modelAcceptsImages(deepseek)], ['My GLM', true]);
  assert.deepEqual([opencode.displayName, modelAcceptsImages(opencode)], ['Router GLM', false]);
  // main.jsx builds its model list (model menu, composer and environment-bar buttons, Home, sessions) this way.
  assert.match(read('src/main.jsx'), /const models = useMemo\(\(\) => namedModels\(boot\?\.models \|\| \[\], boot\?\.config, modelNamesCore\)/);
});

test('composer: an image refused because image input is off names the switch, and no file fallback applies', () => {
  assert.equal(imageRefusedNotice({ imagesOff: true }), IMAGE_OFF_ERROR);
  assert.equal(imageRefusedNotice({ inputModalities: ['text'] }), IMAGE_MODEL_ERROR);
  const staged = stageFiles([], [{ name: 'a.png', type: 'image/png', size: 10 }], { imagesAllowed: false, imageNotice: IMAGE_OFF_ERROR });
  assert.deepEqual([staged.added.length, staged.notices], [0, [IMAGE_OFF_ERROR]]);
  assert.match(read('src/main.jsx'), /const imageFallback = !imagesAllowed && chosen\?\.imagesOff !== true && /);
});

// ---- Settings › Advanced

test('Advanced: the host’s developer pages form the last nav group; official pages keep their places', () => {
  const text = read('src/source-settings.jsx');
  assert.match(text, /const navGroups = \['Settings','This computer','Customize','Advanced'\];/);
  for (const id of ADVANCED_PAGES) assert.match(text, new RegExp(`\\{id:'${id}',label:'[^']+',icon:'[^']+',group:'Advanced'`), id);
  for (const [id, group] of [['preferences', 'Settings'], ['code', 'Settings'], ['general', 'This computer'], ['developer', 'This computer'], ['customize-skills', 'Customize']])
    assert.match(text, new RegExp(`\\{id:'${id}',label:'[^']+',icon:'[^']+',group:'${group}'`), id);
  // The core-tuning rows left Code for Core options.
  for (const title of ["title:t('{core} settings'", "title:'DeepSeek settings'", "title:'Beta features'", "title:'Codex permissions'"])
    assert.ok(text.includes(`{tab:'advanced',${title}`), title);
  assert.equal(text.includes("{tab:'code',title:'DeepSeek settings'"), false);
  assert.equal(hasAdvancedRows({}), false);
  assert.equal(hasAdvancedRows({ harnessSettings: { settings: [{ ns: 'a', key: 'b' }] } }), true);
  assert.equal(hasAdvancedRows({ codexPermissions: { profiles: [] } }), true);
  // The palette lists them under Settings → …, not Customize → Hooks.
  assert.deepEqual(PALETTE_SETTINGS_SECTIONS.slice(-4).map(([id]) => id), ['advanced', 'harness', 'customize-hooks', 'profiles']);
  assert.equal(PALETTE_CUSTOMIZE_SECTIONS.some(([id]) => id === 'customize-hooks'), false);
});

test('Advanced: search finds the moved rows and lands on Core options; zh-CN reads 高级', () => {
  const sections = [{ id: 'code', label: 'Code' }, { id: 'advanced', label: 'Core options', keywords: ['advanced', 'beta features'] }, { id: 'harness', label: 'Harness', keywords: ['advanced'] }];
  const groups = [{ tab: 'advanced', title: 'DeepSeek settings', rows: [{ id: 'dsh-bash-sandbox-timeoutMs', label: 'Command timeout' }] }];
  const hit = settingsSearch(sections, groups, 'command timeout').find(entry => entry.id === 'dsh-bash-sandbox-timeoutMs');
  assert.deepEqual([hit.tab, hit.section], ['advanced', 'Core options']);
  assert.deepEqual(settingsSearch(sections, groups, 'advanced').map(entry => entry.tab), ['advanced', 'harness']);
  try {
    setLocale('zh-CN');
    assert.equal(t('Advanced'), '高级');
    assert.equal(t('Core options'), '内核选项');
    assert.deepEqual(settingsSearch(sections, groups, '高级').map(entry => entry.tab), ['advanced', 'harness']);
    assert.equal(settingsSearch(sections, groups, '内核选项')[0].tab, 'advanced');
    assert.equal(t('Image input'), '图片输入');
    assert.equal(t('Display name'), '显示名称');
  } finally { setLocale(DEFAULT_LOCALE); }
});

// ---- Server-rendered pages

createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {} } };
let server, React, render, Settings, Models;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  ({ SourceModelsSettings: Models } = await server.ssrLoadModule('/src/source-settings-models.jsx'));
});
after(() => server?.close());

test('Settings shell: the Advanced group heads Core options while it is open, with a notice when the core has none of its rows', () => {
  const html = render(React.createElement(Settings, { open: true, config: { threadIds: [] }, model: 'm', effort: 'medium', permission: 'ask',
    boot: { connected: true, models: [], core: { engine: 'codex', capabilities: { hooksList: true } } }, busy: false, initialSection: 'advanced',
    desktopCall: async () => ({}), onSave: async () => ({}), onClose() {} }));
  const nav = html.slice(html.indexOf('<nav class="ss-nav"'), html.indexOf('</nav>'));
  assert.deepEqual([...nav.matchAll(/<p>([^<]+)<\/p>/g)].map(match => match[1]), ['Settings', 'This computer', 'Customize', 'Advanced']);
  const advanced = nav.slice(nav.indexOf('<p>Advanced</p>'));
  assert.deepEqual([...advanced.matchAll(/<span>([^<]+)<\/span><\/button>/g)].map(match => match[1]), ['Core options', 'Hooks', 'Profiles']);
  assert.match(html, /aria-current="page"><span[^>]*>[^<]*<\/span><span>Core options<\/span>/);
  assert.ok(html.includes('Codex has no advanced options to change here.'));
});

test('Settings › Models: each model’s everyday options sit on the page under the running core’s keys', () => {
  const list = [
    { model: 'glm-5.3', displayName: 'GLM 5.3', isDefault: true, inputModalities: ['text', 'image'], defaultReasoningEffort: 'high', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] },
    { model: 'text-only', displayName: 'Text Only', inputModalities: ['text'] },
  ];
  const config = { modelNames: { 'kimi:glm-5.3': 'My GLM', 'opencode:text-only': 'Elsewhere' }, modelSettings: { params: { 'kimi:glm-5.3': { images: false, contextWindow: 131072 } } } };
  const page = (core, extra = {}) => render(React.createElement(Models, { config, boot: { connected: true, models: list, core }, desktopCall: async () => ({ unsupported: true }), onSave: async () => {}, ...extra }));
  const kimi = page({ engine: 'kimi', capabilities: { customization: true } });
  assert.match(kimi, /<h3[^>]*>Kimi Code models<\/h3>/);
  assert.match(kimi, /data-model-options="glm-5\.3"/);
  assert.match(kimi, /My GLM<span class="msx-badge">Default<\/span><span class="msx-badge">Renamed<\/span>/);
  assert.match(kimi, /aria-label="GLM 5\.3 display name" placeholder="GLM 5\.3"[^>]*value="My GLM"/);
  assert.match(kimi, /aria-label="Text Only display name" placeholder="Text Only"[^>]*value=""/, 'another core’s name is not this core’s');
  assert.match(kimi, /role="switch" aria-label="My GLM image input" aria-checked="false"/, 'image input switched off for this core');
  assert.match(kimi, /<button[^>]*disabled=""[^>]*role="switch" aria-label="Text Only image input"|role="switch" aria-label="Text Only image input"[^>]*disabled=""/, 'a text-only catalog model can’t be switched on');
  assert.ok(kimi.includes('Kimi Code lists this model as text only, so images can’t be sent to it.'));
  assert.match(kimi, /aria-label="My GLM context window"[^>]*value="131K"|aria-label="My GLM context window"[^>]*value="131072"/);
  assert.match(kimi, /aria-label="My GLM default reasoning effort"/);
  // A core that keeps its own limits: no context window or output rows, and the list says so.
  const codex = page({ engine: 'codex', capabilities: {} });
  assert.equal(codex.includes('context window"'), false);
  assert.ok(codex.includes('Codex keeps its own context window and output limits, so they aren’t set here.'));
  assert.match(codex, /aria-label="GLM 5\.3 display name"[^>]*value=""/, 'Codex has no names saved');
  // DeepSeek: the options are outside Advanced (which keeps pricing and custom providers).
  const deepseek = page({ engine: 'deepseek-harness', capabilities: {} });
  assert.ok(deepseek.indexOf('data-model-options="glm-5.3"') < deepseek.indexOf('Pricing and custom providers'));
});
