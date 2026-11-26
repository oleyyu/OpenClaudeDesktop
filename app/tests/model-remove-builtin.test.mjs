// Settings › Models › Remove model for a model the core itself lists (OpenCode Zen's free models and every other
// catalog entry): stored as modelSettings params hidden: true per core and model, marked {hidden, removedByUser} by
// withModelOverrides so every model menu drops it, never the core's default while another model is listed, and
// restored under Removed models. Custom-provider models keep their own removal flow.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { setModelParam, modelParamsFor, modelParamsForCore, removedModelCheck, withModelOverrides, normalize, validate } from '../electron/prefs/model-settings.mjs';
import { pickCoreModel, reconcileCoreModel, seedCoreModel } from '../electron/prefs/core-model.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
import { modelMenuSections, pickableModels, shapeModelCatalog } from '../src/model-menu-model.mjs';
import { codeRoutineModels } from '../src/code-routine-model.mjs';
import { namedModels } from '../src/model-names-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const HY4 = 'opencode/hy4-flash-free';
// OpenCode 2.x's catalog as the bridge lists it (description: the provider), trimmed to what the page reads.
const opencode = [
  { id: HY4, model: HY4, displayName: 'Hy4 flash Free', description: 'OpenCode', isDefault: true, supportedReasoningEfforts: [] },
  { id: 'opencode/big-pickle', model: 'opencode/big-pickle', displayName: 'Big Pickle', description: 'OpenCode', supportedReasoningEfforts: [] },
  { id: 'anthropic/claude-sonnet-4-5', model: 'anthropic/claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', description: 'Anthropic', supportedReasoningEfforts: [] },
];
const removedHy4 = setModelParam(null, HY4, 'hidden', true, 'opencode');

test('hidden is stored per core and model, only as true, and never sent to a core', () => {
  assert.deepEqual(removedHy4, { params: { [`opencode:${HY4}`]: { hidden: true } }, prices: null });
  assert.deepEqual(modelParamsFor(removedHy4, 'opencode', HY4), { hidden: true });
  assert.deepEqual(modelParamsFor(removedHy4, 'mimo', HY4), {}, 'another core keeps the model');
  // Restoring (false or undefined) drops it; nothing left is the default (null).
  assert.equal(setModelParam(removedHy4, HY4, 'hidden', false, 'opencode'), null);
  assert.equal(setModelParam(removedHy4, HY4, 'hidden', undefined, 'opencode'), null);
  const both = setModelParam(setModelParam(null, HY4, 'maxTokens', 4096, 'opencode'), HY4, 'hidden', true, 'opencode');
  assert.deepEqual(modelParamsFor(setModelParam(both, HY4, 'hidden', false, 'opencode'), 'opencode', HY4), { maxTokens: 4096 }, 'restoring keeps the other options');
  // modelParamsForCore carries only maxTokens / temperature / contextWindow.
  assert.equal(modelParamsForCore(removedHy4, 'opencode'), null);
  assert.deepEqual(modelParamsForCore(both, 'opencode'), { [HY4]: { maxTokens: 4096 } });
  // Strict (settingsPatch) and lenient reads.
  assert.deepEqual(validate({ params: { [`opencode:${HY4}`]: { hidden: true }, 'opencode:x': { hidden: false } } }), { params: { [`opencode:${HY4}`]: { hidden: true } }, prices: null });
  assert.throws(() => validate({ params: { x: { hidden: 'yes' } } }), /can only be removed here/);
  assert.deepEqual(normalize({ params: { x: { hidden: 1 } } }).params, {});
  assert.throws(() => setModelParam(null, HY4, 'hidden', 'yes', 'opencode'), /can only be removed here/);
  const saved = settingsPatch({}, { modelSettings: removedHy4 });
  assert.deepEqual(saved.modelSettings, removedHy4);
});

test('withModelOverrides marks a removed model {hidden, removedByUser}; other entries keep their identity', () => {
  const out = withModelOverrides(opencode, removedHy4, 'opencode');
  assert.deepEqual(out[0], { ...opencode[0], hidden: true, removedByUser: true });
  assert.equal(out[1], opencode[1]);
  assert.equal(out[2], opencode[2]);
  assert.ok(withModelOverrides(opencode, removedHy4, 'mimo').every((model, index) => model === opencode[index]), 'another core’s removal changes nothing');
  // With images off too, both overrides apply.
  const imagesOff = setModelParam(removedHy4, HY4, 'images', false, 'opencode');
  const entry = withModelOverrides([{ ...opencode[0], inputModalities: ['text', 'image'] }], imagesOff, 'opencode')[0];
  assert.deepEqual([entry.hidden, entry.removedByUser, entry.imagesOff, entry.inputModalities], [true, true, true, ['text']]);
  // namedModels (main.jsx and Settings hand this list to every menu) carries the mark.
  assert.equal(namedModels(opencode, { modelSettings: removedHy4 }, 'opencode')[0].removedByUser, true);
  assert.equal(removedModelCheck(removedHy4, 'opencode')(HY4), true);
  assert.equal(removedModelCheck(removedHy4, 'opencode')('opencode/big-pickle'), false);
});

test('the default model is never a removed one while the catalog lists another', () => {
  // The saved model was removed: the catalog default is removed too, so the first kept model.
  assert.deepEqual(reconcileCoreModel({ model: HY4, effort: 'medium', modelSettings: removedHy4 }, 'opencode', opencode), { model: 'opencode/big-pickle' });
  // The remembered choice for the core is the removed model: same, and coreModels is left alone (restoring brings it back).
  const remembered = { model: 'opencode/big-pickle', effort: 'medium', coreModels: { opencode: { model: HY4, effort: 'medium' } }, modelSettings: removedHy4 };
  assert.equal(reconcileCoreModel(remembered, 'opencode', opencode), null);
  assert.deepEqual(reconcileCoreModel({ ...remembered, modelSettings: null }, 'opencode', opencode), { model: HY4 });
  // A kept model stays chosen; the default is skipped only when removed.
  assert.equal(reconcileCoreModel({ model: 'anthropic/claude-sonnet-4-5', effort: 'medium', modelSettings: removedHy4 }, 'opencode', opencode), null);
  assert.equal(pickCoreModel(opencode, { model: '' }, removedHy4, 'opencode').model, 'opencode/big-pickle');
  assert.equal(pickCoreModel(opencode, { model: '' }, null, 'opencode').model, HY4);
  // Every listed model removed: the catalog decides as before (a core always has a model).
  let all = removedHy4;
  for (const model of opencode.slice(1)) all = setModelParam(all, model.model, 'hidden', true, 'opencode');
  assert.equal(reconcileCoreModel({ model: HY4, effort: 'medium', modelSettings: all }, 'opencode', opencode), null);
  // Removals are per core: on MiMo the same id is still the default.
  assert.equal(reconcileCoreModel({ model: HY4, effort: 'medium', modelSettings: removedHy4 }, 'mimo', opencode), null);
  // seedCoreModel doesn't record a removed model as the core's choice while another is listed.
  assert.equal(seedCoreModel({ model: HY4, effort: 'medium', modelSettings: removedHy4 }, 'opencode', opencode), null);
  assert.deepEqual(seedCoreModel({ model: HY4, effort: 'medium' }, 'opencode', opencode), { opencode: { model: HY4, effort: 'medium' } });
  assert.deepEqual(seedCoreModel({ model: HY4, effort: 'medium', modelSettings: all }, 'opencode', opencode), { opencode: { model: HY4, effort: 'medium' } });
});

test('model menus drop hidden entries, keeping only the checked one', () => {
  const marked = withModelOverrides(opencode, removedHy4, 'opencode');
  assert.deepEqual(pickableModels(marked, 'opencode/big-pickle').map(model => model.model), ['opencode/big-pickle', 'anthropic/claude-sonnet-4-5']);
  assert.deepEqual(pickableModels(marked, HY4).map(model => model.model), opencode.map(model => model.model), 'the selected model stays named and checked');
  assert.equal(pickableModels(opencode, null), opencode, 'nothing hidden: the same list');
  // The Code model menu (source-model-menu.jsx: shapeModelCatalog → modelMenuSections).
  const sections = modelMenuSections({ models: shapeModelCatalog({ models: marked, selected: 'opencode/big-pickle' }), selected: 'opencode/big-pickle' });
  assert.deepEqual([...sections.primary, ...sections.overflow].map(model => model.model), ['opencode/big-pickle', 'anthropic/claude-sonnet-4-5']);
  const current = modelMenuSections({ models: shapeModelCatalog({ models: marked, selected: HY4 }), selected: HY4 });
  assert.equal(current.primary.some(model => model.model === HY4 && model.section !== 'deprecated'), true, 'no Unsupported model row for it');
  // Code routines' model picker.
  assert.deepEqual(codeRoutineModels(marked).map(model => model.id), ['opencode/big-pickle', 'anthropic/claude-sonnet-4-5']);
});

// The renderer modules load through one vite SSR server, made by the first test that needs it (the pure tests above
// don't depend on it).
let server, Models, i18n, loading = null;
const ssr = () => loading ??= (async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  Models = await server.ssrLoadModule('/src/source-settings-models.jsx');
})();
after(async () => { i18n?.setLocale('en-US'); await server?.close(); });

// boot.core as the OpenCode 2.x bridge reports it (its per-model options are kept under that core's id).
const OPENCODE_CORE = { engine: 'opencode', engineVersion: '2.2.5', capabilities: {} };
const page = (config, extra = {}) => render(React.createElement(Models.SourceModelsSettings, { config, boot: { connected: true, models: opencode, core: OPENCODE_CORE }, engine: 'opencode',
  desktopCall: async () => ({ unsupported: true }), onSave: async () => {}, onOpenSetting() {}, ...extra }));
// An entry renders its rows when something in it was changed: renaming opens it.
const renamed = (names) => Object.fromEntries(names.map(([id, name]) => [`opencode:${id}`, name]));
// One row's markup: from its data-setting-id to the next one.
const rowOf = (html, id) => new RegExp(`data-setting-id="${id.replace(/[./]/g, '\\$&')}"(?:(?!data-setting-id=).)*`, 's').exec(html)?.[0] ?? '';

test('Settings › Models: a listed model offers Remove model; removed ones move to Removed models with Restore', async () => {
  await ssr();
  const html = page({ modelSettings: removedHy4, modelNames: renamed([['opencode/big-pickle', 'Pickle'], ['anthropic/claude-sonnet-4-5', 'Sonnet']]) });
  assert.equal(html.includes(`data-model-options="${HY4}"`), false, 'the removed model has no entry');
  assert.match(html, /<h3[^>]*>Removed models<\/h3>/);
  const restore = rowOf(html, `model-${HY4}-restore`);
  assert.ok(restore.includes('Hy4 flash Free') && restore.includes(`<code class="msx-name-id">${HY4}</code>`), restore);
  assert.match(restore, /<button[^>]*aria-label="Restore Hy4 flash Free"[^>]*>(?:(?!<\/button>).)*Restore/s);
  assert.ok(html.indexOf('Removed models') > html.indexOf('data-model-options="anthropic/claude-sonnet-4-5"'), 'after the model entries');
  // A Zen model's row names OpenCode's own switch for all of them (Settings › Core options › OpenCode Zen models).
  const pickle = rowOf(html, 'model-opencode/big-pickle-remove');
  assert.ok(pickle.includes('Listed by OpenCode. Removing it takes it out of every model menu; you can restore it below.'), pickle);
  assert.ok(pickle.includes('To remove every OpenCode Zen model at once, turn off “OpenCode Zen models” in Settings › Core options.'), pickle);
  assert.match(pickle, /<button type="button" class="msx-link">Open Core options<\/button>/);
  assert.match(pickle, /<button[^>]*aria-label="Remove Pickle"[^>]*>/);
  assert.doesNotMatch(/<button[^>]*aria-label="Remove Pickle"[^>]*>/.exec(pickle)[0], /disabled/);
  // Another provider's model through OpenCode: no Zen line.
  const sonnet = rowOf(html, 'model-anthropic/claude-sonnet-4-5-remove');
  assert.ok(sonnet.includes('Listed by OpenCode.') && !sonnet.includes('OpenCode Zen'), sonnet);
  // Nothing removed: no Removed models group.
  assert.equal(page({ modelNames: renamed([['opencode/big-pickle', 'Pickle']]) }).includes('Removed models'), false);
  // OpenCode 1.x has no OpenCode Zen switch.
  const v1 = page({ modelNames: renamed([['opencode/big-pickle', 'Pickle']]) }, { boot: { connected: true, models: opencode, core: { engine: 'opencode', engineVersion: '1.18.34', capabilities: {} } } });
  assert.ok(rowOf(v1, 'model-opencode/big-pickle-remove').includes('Listed by OpenCode.') && !v1.includes('OpenCode Zen'));
});

test('Settings › Models refuses removing the last model left in the menu', async () => {
  await ssr();
  const one = setModelParam(removedHy4, 'opencode/big-pickle', 'hidden', true, 'opencode');
  const html = page({ modelSettings: one, modelNames: renamed([['anthropic/claude-sonnet-4-5', 'Sonnet']]) });
  const row = rowOf(html, 'model-anthropic/claude-sonnet-4-5-remove');
  assert.ok(row.includes('It’s the only model left in the model menu, so it can’t be removed.'), row);
  assert.match(/<button[^>]*aria-label="Remove Sonnet"[^>]*>/.exec(row)[0], /disabled=""/);
  assert.equal((html.match(/aria-label="Restore /g) || []).length, 2, 'both removed models can be restored');
});

test('Settings › Models in zh-CN', async () => {
  await ssr();
  i18n.setLocale('zh-CN');
  try {
    const html = page({ modelSettings: removedHy4, modelNames: renamed([['opencode/big-pickle', 'Pickle']]) });
    assert.ok(html.includes('已删除的模型') && html.includes('恢复 Hy4 flash Free') && html.includes('由 OpenCode 提供。删除后它会从所有模型菜单中移除，可在下方恢复。'), html.slice(0, 300));
    assert.ok(html.includes('要一次删除全部 OpenCode Zen 模型，请在“设置 › 内核选项”中关闭“OpenCode 自带模型”。') && html.includes('打开内核选项'));
  } finally { i18n.setLocale('en-US'); }
});

test('the Chat / Cowork model menu drops removed models', async () => {
  await ssr();
  const ChatMenu = await server.ssrLoadModule('/src/source-chat-model-menu.jsx');
  const marked = withModelOverrides(opencode, removedHy4, 'opencode');
  const fresh = ChatMenu.chatModelMenuGroups({ models: marked, selected: 'opencode/big-pickle', isNewConversation: true });
  assert.deepEqual([...fresh.main, ...fresh.more.flat()].map(model => model.model), ['opencode/big-pickle', 'anthropic/claude-sonnet-4-5']);
  // A conversation on a model the catalog no longer lists falls back to a kept model, not the removed default.
  const legacy = ChatMenu.chatModelMenuGroups({ models: marked, selected: 'gone', defaultModel: HY4, isNewConversation: false });
  assert.equal(legacy.current.model, 'opencode/big-pickle');
});
