// Per-model options in the renderer: the user's display names (prefs/model-names.mjs) and per-model values
// (prefs/model-settings.mjs: default effort, image input off), both keyed on the running core's id, applied to the
// catalog a core lists. main.jsx hands the result to every model menu, model button and session row.
import { coreForEngine } from '../electron/core-registry.mjs';
import { withModelNames } from '../electron/prefs/model-names.mjs';
import { withModelOverrides } from '../electron/prefs/model-settings.mjs';
import { settingsCore } from './settings-core-copy.mjs';

/** The core id a core's per-model options are stored under: boot.core (or an engine / id string). */
export function modelNamesCoreId(core) {
  return coreForEngine(typeof core === 'string' ? core : core?.engine).id;
}
/** The core whose models a boot lists: the running core, else the chosen one (settings-core-copy settingsCore). */
export function bootModelsCoreId(boot, config = boot?.config) {
  return modelNamesCoreId(settingsCore(boot, config));
}
/** boot.models (or any catalog list) with the user's per-model options and names for that core applied. */
export function namedModels(models, config, coreId) {
  return withModelNames(withModelOverrides(models, config?.modelSettings, coreId), config?.modelNames, coreId);
}
