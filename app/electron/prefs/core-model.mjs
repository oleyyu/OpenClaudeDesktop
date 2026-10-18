// The default model per core. preferences.json keeps the model the next session uses
// (config.model / effort / fastMode) and, in config.coreModels, the user's explicit choice
// on each core: {[coreId]: {model, effort, fastMode?}}. Pure: main.cjs reconciles on
// connect() and records on the settings case; the renderer can share pickCoreModel.
//
// Ids are the catalog's `model` field (`id` only when `model` is missing), the field every
// renderer lookup matches. coreModels records only explicit choices (the settings case),
// never a reconciled fallback, so a catalog that shrinks for a while (a relay outage, a key
// that failed) brings the remembered choice back on the next full connect.
import { withEffortDefaults } from './model-settings.mjs';
import { STANDARD_SPEED, savedSpeed, tierForSpeed } from '../preferences.mjs';

const MAX_CORES = 32;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** The id a catalog entry is chosen and saved by. */
export const catalogId = model => model?.model || model?.id || '';
const effortsOf = model => (model?.supportedReasoningEfforts || []).map(item => item?.reasoningEffort ?? item).filter(effort => typeof effort === 'string');

/**
 * The catalog model and effort for a wanted {model, effort}: the wanted model when listed
 * (else the default, else the first), and the wanted effort when that model supports it
 * (else its default, with the user's per-model override from modelSettings). null for an
 * empty catalog.
 */
export function pickCoreModel(models, wanted, modelSettings, coreId = null) {
  const list = withEffortDefaults(models, modelSettings, coreId).filter(model => isRecord(model) && catalogId(model));
  if (!list.length) return null;
  const id = typeof wanted?.model === 'string' ? wanted.model : '';
  const chosen = (id && (list.find(model => catalogId(model) === id) || list.find(model => model.id === id)))
    || list.find(model => model.isDefault) || list[0];
  const efforts = effortsOf(chosen), effort = typeof wanted?.effort === 'string' ? wanted.effort : '';
  // A model listing no efforts leaves the saved one alone.
  const keep = efforts.length ? efforts.includes(effort) : !!effort;
  return { model: catalogId(chosen), effort: keep ? effort : chosen.defaultReasoningEffort || 'medium', entry: chosen };
}

/**
 * The catalog for a Codex custom endpoint launched without model_catalog_json: model/list then
 * returns the bundled OpenAI models, which the endpoint doesn't serve. One entry per id, first
 * is the default; a bundled id keeps its own metadata, any other takes the template's efforts
 * (buildCodexCatalog clones the same template). No Fast tier, as in the built catalog.
 */
export function customCatalogModels(ids, listed = [], { template } = {}) {
  const bundled = (Array.isArray(listed) ? listed : []).filter(isRecord);
  const base = bundled.find(model => catalogId(model) === template) ?? {};
  return (Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id).map((id, index) => {
    const own = bundled.find(model => catalogId(model) === id);
    return { ...(own ?? {}), id, model: id, displayName: own?.displayName || id, description: own?.description ?? '', hidden: false, isDefault: index === 0,
      supportedReasoningEfforts: (own ?? base).supportedReasoningEfforts ?? [], defaultReasoningEffort: (own ?? base).defaultReasoningEffort ?? null, serviceTiers: [] };
  });
}

/**
 * Codex's catalog with the model the user's own config.toml names (config/read: model, model_provider). model/list
 * lists only the bundled OpenAI models whatever the provider, so a relay or other provider's model (model =
 * "gpt-5.4-relay", model_provider = "myrelay") would be missing and replaced by a catalog default the provider
 * doesn't serve. The configured model leads the list as its default, marked with `label` (and source 'config'),
 * keeping a bundled entry's own metadata; the bundled models stay listed for providers that serve them. Code
 * Desktop's own endpoint (`appProvider`) has its catalog already. null when nothing changes.
 */
export function configuredCatalogModels(listed = [], codexConfig, { appProvider, label = '' } = {}) {
  const models = (Array.isArray(listed) ? listed : []).filter(isRecord);
  const model = typeof codexConfig?.model === 'string' ? codexConfig.model.trim() : '';
  if (!model || model.length > 200 || CONTROL.test(model)) return null;
  const provider = typeof codexConfig?.model_provider === 'string' && codexConfig.model_provider.trim() ? codexConfig.model_provider.trim() : 'openai';
  if (appProvider && provider === appProvider) return null;
  const own = models.find(entry => catalogId(entry) === model);
  if (own && provider === 'openai') return null;
  const effort = typeof codexConfig?.model_reasoning_effort === 'string' ? codexConfig.model_reasoning_effort : null;
  const entry = own
    ? { ...own, isDefault: true, hidden: false, source: 'config', description: label || own.description || '' }
    : { id: model, model, displayName: model, description: label, hidden: false, isDefault: true, source: 'config',
      supportedReasoningEfforts: [], defaultReasoningEffort: effort, serviceTiers: [] };
  return [entry, ...models.filter(item => item !== own).map(item => (item.isDefault ? { ...item, isDefault: false } : item))];
}

/**
 * The patch {model?, effort?, fastMode?, speed?} that makes config valid for this core's catalog,
 * restoring the core's remembered choice; null when the catalog is empty or nothing changes.
 * Never touches coreModels.
 */
export function reconcileCoreModel(config, coreId, models) {
  if (!Array.isArray(models) || !models.length) return null;
  const remembered = coreId ? validateCoreModels(config?.coreModels)?.[coreId] : undefined;
  const wanted = remembered ?? { model: config?.model, effort: config?.effort };
  const picked = pickCoreModel(models, wanted, config?.modelSettings, coreId);
  if (!picked) return null;
  const patch = {};
  if (picked.model !== config?.model) patch.model = picked.model;
  if (picked.effort !== config?.effort) patch.effort = picked.effort;
  // The remembered speed (an older record has only fastMode), Standard when this model lacks that tier.
  const wantedSpeed = remembered ? (typeof remembered.speed === 'string' ? remembered.speed : remembered.fastMode === true ? 'fast' : STANDARD_SPEED) : savedSpeed(config);
  const speed = wantedSpeed !== STANDARD_SPEED && tierForSpeed(picked.entry, wantedSpeed) ? wantedSpeed : STANDARD_SPEED;
  const fastMode = speed !== STANDARD_SPEED;
  if (fastMode !== (config?.fastMode === true)) patch.fastMode = fastMode;
  // config.speed is written only when fastMode alone can't say it (a saved speed, or a tier other than Fast).
  const derived = fastMode ? 'fast' : STANDARD_SPEED;
  if (typeof config?.speed === 'string' && config.speed ? speed !== config.speed : speed !== derived) patch.speed = speed;
  return Object.keys(patch).length ? patch : null;
}

/** config.coreModels with this core's current choice recorded, or the old value when there is none. */
export function recordCoreModel(config, coreId) {
  const current = validateCoreModels(config?.coreModels) ?? {};
  if (typeof coreId !== 'string' || !coreId || typeof config?.model !== 'string' || !config.model) return Object.keys(current).length ? current : undefined;
  const entry = { model: config.model, effort: typeof config.effort === 'string' ? config.effort : '', ...(typeof config.fastMode === 'boolean' ? { fastMode: config.fastMode } : {}),
    ...(typeof config.speed === 'string' && config.speed ? { speed: config.speed } : {}) };
  return validateCoreModels({ ...current, [coreId]: entry }) ?? undefined;
}

/**
 * A first record for a core without one, when config.model is already listed by its catalog
 * (a profile from before coreModels): so switching cores and back keeps it. null otherwise.
 */
export function seedCoreModel(config, coreId, models) {
  if (typeof coreId !== 'string' || !coreId || validateCoreModels(config?.coreModels)?.[coreId]) return null;
  if (!Array.isArray(models) || !config?.model || !models.some(model => catalogId(model) === config.model)) return null;
  return recordCoreModel(config, coreId) ?? null;
}

/** Lenient read of config.coreModels: invalid keys and entries are dropped; null when nothing is left. */
export function validateCoreModels(value) {
  if (!isRecord(value)) return null;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (Object.keys(out).length >= MAX_CORES) break;
    if (!key || key.length > 64 || key === '__proto__' || CONTROL.test(key) || !isRecord(entry)) continue;
    const { model, effort, fastMode, speed } = entry;
    if (typeof model !== 'string' || !model || model.length > 200 || CONTROL.test(model)) continue;
    if (typeof effort !== 'string' || effort.length > 32 || CONTROL.test(effort)) continue;
    if (fastMode !== undefined && typeof fastMode !== 'boolean') continue;
    if (speed !== undefined && (typeof speed !== 'string' || !/^[a-z0-9][a-z0-9 _-]{0,39}$/.test(speed))) continue;
    out[key] = { model, effort, ...(fastMode === undefined ? {} : { fastMode }), ...(speed === undefined ? {} : { speed }) };
  }
  return Object.keys(out).length ? out : null;
}
