// Custom model display names (preferences.json key `modelNames`), set in Settings › Models.
// Shared by the main process (preferences.mjs settingsPatch) and the renderer (the model list main.jsx hands the
// model menu, the composer and environment-bar model buttons, Home, the sidebar and session rows).
//
//   modelNames  {['<coreId>:<modelId>']: name}
//               The key carries the core id (electron/cores/<id>.mjs: deepseek, codex, kimi…) so the same model id
//               served by two cores (glm-5.3 on DeepSeek Harness and on OpenCode) keeps its own name. The model id is
//               the catalog entry's `model` (as model/list reports it), everything after the first ':'.
//               An empty name removes the entry: the catalog's own name shows again.
// i18n is loaded lazily, as in model-settings.mjs, so a require() of a module that imports this one never waits on it.
let translate = null;
import('../i18n/index.mjs').then(module => { translate = module.t; }, () => {});
const t = (source, values) => translate ? translate(source, values)
  : values ? source.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match) : source;
export const MODEL_NAME_MAX = 60;
export const MODEL_NAMES_MAX_ENTRIES = 200;
const CORE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
// prefs/model-settings.mjs MODEL_ID: the ids cores really list.
const MODEL_ID = /^[A-Za-z0-9_.:/()@+-]{1,128}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** '<coreId>:<modelId>', or null when either part isn't a valid id. */
export function modelNameKey(coreId, modelId) {
  if (typeof coreId !== 'string' || !CORE_ID.test(coreId)) return null;
  if (typeof modelId !== 'string' || modelId === '__proto__' || !MODEL_ID.test(modelId)) return null;
  return `${coreId}:${modelId}`;
}
/** {coreId, modelId} of a stored key, or null. */
export function parseModelNameKey(key) {
  if (typeof key !== 'string') return null;
  const at = key.indexOf(':');
  if (at < 1) return null;
  const coreId = key.slice(0, at), modelId = key.slice(at + 1);
  return modelNameKey(coreId, modelId) === key ? { coreId, modelId } : null;
}
/** A name's user-facing error, or null when it can be saved (an empty name clears). */
export function modelNameError(name) {
  if (typeof name !== 'string') return t('Enter a model name.');
  const text = name.trim();
  if (text.length > MODEL_NAME_MAX || CONTROL.test(text)) return t('Model names must be {max} characters or fewer.', { max: MODEL_NAME_MAX });
  return null;
}

function entries(value, strict) {
  const out = {};
  if (!isRecord(value)) { if (strict) throw new Error(t('Invalid model names.')); return out; }
  const keys = Object.keys(value);
  if (strict && keys.length > MODEL_NAMES_MAX_ENTRIES) throw new Error(t('Rename {max} models or fewer.', { max: MODEL_NAMES_MAX_ENTRIES }));
  for (const key of keys) {
    if (Object.keys(out).length >= MODEL_NAMES_MAX_ENTRIES) break;
    if (!parseModelNameKey(key)) { if (strict) throw new Error(t('Invalid model.')); continue; }
    const error = modelNameError(value[key]);
    if (error) { if (strict) throw new Error(error); continue; }
    const name = value[key].trim();
    if (name) out[key] = name;
  }
  return out;
}

/** Lenient read: always a plain {key: name} record (possibly empty). */
export function normalizeModelNames(value) {
  return entries(value, false);
}
/** Strict write check for settingsPatch: throws a user-facing Error; null (or nothing left) resets to the default. */
export function validateModelNames(value) {
  if (value === null || value === undefined) return null;
  const out = entries(value, true);
  return Object.keys(out).length ? out : null;
}

/** The user's name for a core's model, or null. */
export function customModelName(names, coreId, modelId) {
  const key = modelNameKey(coreId, modelId);
  if (!key || !isRecord(names) || !Object.hasOwn(names, key)) return null;
  const name = typeof names[key] === 'string' ? names[key].trim() : '';
  return name && !modelNameError(name) ? name : null;
}

/** The next modelNames with one model's name set, or cleared (empty name); null when nothing is left. */
export function setModelName(names, coreId, modelId, name) {
  const key = modelNameKey(coreId, modelId);
  if (!key) throw new Error(t('Invalid model.'));
  const error = modelNameError(name ?? '');
  if (error) throw new Error(error);
  const next = normalizeModelNames(names), text = String(name ?? '').trim();
  if (text) next[key] = text; else delete next[key];
  if (Object.keys(next).length > MODEL_NAMES_MAX_ENTRIES) throw new Error(t('Rename {max} models or fewer.', { max: MODEL_NAMES_MAX_ENTRIES }));
  return Object.keys(next).length ? next : null;
}

/**
 * Catalog models (model/list entries) with the user's names for this core: a renamed entry's displayName becomes the
 * custom name and the catalog's own name moves to defaultDisplayName (Settings › Models shows it as the placeholder).
 * Unchanged entries, and the whole list when nothing applies, keep their identity.
 */
export function withModelNames(models, names, coreId) {
  const list = Array.isArray(models) ? models : [];
  if (!isRecord(names) || !Object.keys(names).length) return list;
  let changed = false;
  const out = list.map(model => {
    const id = model && typeof model === 'object' ? (model.model ?? model.id) : null;
    const name = typeof id === 'string' ? customModelName(names, coreId, id) : null;
    if (!name || name === model.displayName) return model;
    changed = true;
    return { ...model, displayName: name, defaultDisplayName: model.displayName ?? null, customDisplayName: true };
  });
  return changed ? out : list;
}
