// Shared by the renderer and main process; contains no platform or account IO.
import { DEFAULT_CODE_THEMES, isTheme } from './code-theme-catalog.mjs';
import { DEFAULT_TRANSCRIPT_VIEW, TRANSCRIPT_VIEWS } from './transcript-view-model.mjs';
import { validateTheme } from './prefs/theme.mjs';
import { validateHarnessProfile } from './prefs/harness-profile.mjs';
import { validateInstructions } from './prefs/instructions.mjs';
import { validateModelSettings } from './prefs/model-settings.mjs';
import { validateModelNames } from './prefs/model-names.mjs';
import { validateCustomCommands } from './prefs/custom-commands.mjs';
import { validatePersona } from './prefs/persona.mjs';
import { LOCALE_CODES } from './i18n/index.mjs';
import { validateProfileChoice } from './codex-permissions.mjs';
import { applyWorkflowPatch } from './prefs/workflow-settings.mjs';
export const appearanceDefaults = Object.freeze({ motion: 'system', interfaceFont: 'anthropic', codeFont: '', transcriptSize: 'm', transcriptWidth: 's',
  codeThemeLight: DEFAULT_CODE_THEMES.light, codeThemeDark: DEFAULT_CODE_THEMES.dark, transcriptView: DEFAULT_TRANSCRIPT_VIEW });
// Code theme ids are validated against the catalog and their column's mode (a dark theme is not a light theme).
const codeThemeKeys = { codeThemeLight: 'light', codeThemeDark: 'dark' };
const choices = { theme:['light','dark','system'], mode:['code','chat','cowork'], permission:['auto','ask','acceptEdits','plan','bypass'],
  motion:['system','reduce'], interfaceFont:['anthropic','system','dyslexic'], transcriptSize:['s','m','l'], transcriptWidth:['s','m','l'],
  transcriptView:[...TRANSCRIPT_VIEWS], locale:[...LOCALE_CODES],
  // Codex-only (main.cjs decorates thread/turn requests for the Codex core): its web_search mode and its personality
  // (Codex /personality). 'default' leaves Codex's own configuration in charge.
  codexWebSearch:['default','disabled','cached','live'], codexPersonality:['default','none','friendly','pragmatic'] };
// shared-7-DsClUbcz.js xh bi("userThemeMode","auto"): the theme follows the
// system until the user picks Light or Dark. Profiles without (or with an
// unknown) saved theme resolve to it; main.cjs applies the result to
// nativeTheme.themeSource.
export const DEFAULT_THEME = 'system';
export function themePreference(value) {
  return choices.theme.includes(value) ? value : DEFAULT_THEME;
}
export function appearancePreferences(config = {}) {
  return Object.fromEntries(Object.entries(appearanceDefaults).map(([key, fallback]) => [key,
    key === 'codeFont' ? (typeof config[key] === 'string' ? config[key].slice(0,120) : fallback)
      : key in codeThemeKeys ? (isTheme(config[key], codeThemeKeys[key]) ? config[key] : fallback)
      : choices[key].includes(config[key]) ? config[key] : fallback]));
}
// The saved permission mode as the renderer may use it: a remembered Bypass without the opt-in is Auto.
export function savedPermission(config = {}) {
  const value = choices.permission.includes(config?.permission) ? config.permission : 'auto';
  return value === 'bypass' && config?.allowBypassPermissions !== true ? 'auto' : value;
}
export function fastTierForModel(model) {
  // Match the Codex TUI's current_model_fast_service_tier: catalog name, not a
  // hardcoded model allowlist or the deprecated additionalSpeedTiers field.
  return tierForSpeed(model, 'fast');
}
// Speed: Standard, or one of the faster service tiers a model's catalog entry lists (Codex: "Fast", "Ultrafast").
// A speed is the tier's name in lower case ('fast', 'ultrafast'), so a choice carries across models whose tier ids
// differ; the turn sends that model's tier id. 'standard' is the catalog's default tier.
export const STANDARD_SPEED = 'standard';
const speedKey = tier => (typeof tier?.id === 'string' && tier.id && typeof tier.name === 'string' && tier.name.trim() ? tier.name.trim().toLowerCase() : null);
/** The faster tiers a model offers, in catalog order: [{key, id, name, description}]. */
export function speedTiersForModel(model) {
  const seen = new Set(), out = [];
  for (const tier of Array.isArray(model?.serviceTiers) ? model.serviceTiers : []) {
    const key = speedKey(tier);
    if (!key || key === STANDARD_SPEED || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, id: tier.id, name: tier.name.trim(), description: typeof tier.description === 'string' ? tier.description : '' });
  }
  return out;
}
/** The model's tier for a speed, or null (Standard, or a tier this model doesn't list). */
export function tierForSpeed(model, speed) {
  return speedTiersForModel(model).find(tier => tier.key === speed) || null;
}
/** The saved speed: config.speed, else a Fast mode saved before speeds existed. */
export function savedSpeed(config = {}) {
  if (typeof config?.speed === 'string' && config.speed) return config.speed;
  return config?.fastMode === true ? 'fast' : STANDARD_SPEED;
}
export function selectedCatalogModel(models, id) {
  return models.find(model => (model.model || model.id) === id) || (!id ? models.find(model => model.isDefault) || models[0] : undefined);
}
export function validateServiceTier(models, modelId, tier) {
  if (tier === 'default' || tier === null) return tier;
  const model = selectedCatalogModel(models, modelId);
  if (typeof tier !== 'string' || !model?.serviceTiers?.some(value => value.id === tier))
    throw new Error('This service tier is not available for the selected model.');
  return tier;
}
export function settingsPatch(config, patch, models = []) {
  const next = { ...config };
  for (const [key, values] of Object.entries(choices)) {
    if (!(key in patch)) continue;
    if (!values.includes(patch[key])) throw new Error(`Invalid ${key} setting.`);
    next[key] = patch[key];
  }
  for (const [key, mode] of Object.entries(codeThemeKeys)) {
    if (!(key in patch)) continue;
    if (!isTheme(patch[key], mode)) throw new Error(`Invalid ${key} setting.`);
    next[key] = patch[key];
  }
  // A model without reasoning levels (GLM, Kimi… through DeepSeek Harness) has no default effort: null clears the
  // saved one, which every reader already treats as "model default".
  if ('effort' in patch && (patch.effort === null || patch.effort === undefined || patch.effort === '')) {
    delete next.effort;
    patch = { ...patch };
    delete patch.effort;
  }
  for (const key of ['model','effort','displayName','codeFont']) {
    if (!(key in patch)) continue;
    if (typeof patch[key] !== 'string' || patch[key].length > (key === 'codeFont' ? 120 : 200) || /[\x00-\x1f]/.test(patch[key]))
      throw new Error(`Invalid ${key} setting.`);
    next[key] = patch[key];
  }
  if ('codeFont' in patch && /[;{}<>]/.test(patch.codeFont)) throw new Error('Enter a font family name.');
  // DeepSeek core privacy (Settings › Code › Privacy; main.cjs passes them to the core as CODE_DESKTOP_SHARE_*).
  for (const key of ['deepseekSessionLog', 'deepseekFeedbackSharing']) {
    if (!(key in patch)) continue;
    if (typeof patch[key] !== 'boolean') throw new Error(`Invalid ${key} setting.`);
    next[key] = patch[key];
  }
  // Settings › Code › Sessions › Prompt suggestions (c71860c77-DzP8HoeV cr, ccPromptSuggestions; unset reads as on):
  // false hides the core's suggested next prompt in the composer (main.jsx reads config.promptSuggestions !== false).
  if ('promptSuggestions' in patch) {
    if (typeof patch.promptSuggestions !== 'boolean') throw new Error('Invalid promptSuggestions setting.');
    next.promptSuggestions = patch.promptSuggestions;
  }
  if ('allowBypassPermissions' in patch) {
    if (typeof patch.allowBypassPermissions !== 'boolean') throw new Error('Invalid bypass permissions setting.');
    next.allowBypassPermissions = patch.allowBypassPermissions;
  }
  // Bypass can be the remembered mode only while the opt-in is on (main also checks the core's requirements before
  // saving it, and validates every Bypass turn); turning the opt-in off drops a remembered Bypass back to Auto.
  if (patch.permission === 'bypass' && next.allowBypassPermissions !== true) throw new Error('Turn on Allow bypass permissions mode in Settings first.');
  if (next.permission === 'bypass' && next.allowBypassPermissions !== true) next.permission = 'auto';
  // Speed (config.speed, with config.fastMode kept as "a faster tier is on"). fastMode is the on/off alias: on keeps a
  // faster speed already chosen, else Fast.
  if ('fastMode' in patch && typeof patch.fastMode !== 'boolean') throw new Error('Invalid Fast mode setting.');
  if ('speed' in patch && (typeof patch.speed !== 'string' || !/^[a-z0-9][a-z0-9 _-]{0,39}$/.test(patch.speed))) throw new Error('Invalid speed setting.');
  const catalogModel = selectedCatalogModel(models, next.model);
  let speed = savedSpeed(next);
  if ('fastMode' in patch) speed = patch.fastMode ? (speed !== STANDARD_SPEED && tierForSpeed(catalogModel, speed) ? speed : 'fast') : STANDARD_SPEED;
  if ('speed' in patch) speed = patch.speed;
  if (speed !== STANDARD_SPEED && !tierForSpeed(catalogModel, speed)) {
    if ('speed' in patch || patch.fastMode === true) throw new Error(speed === 'fast' ? 'Fast mode is not available for this model.' : 'This speed is not available for this model.');
    // A model change, or a speed saved for another catalog: back to Standard.
    if ('model' in patch) speed = STANDARD_SPEED;
  }
  if ('speed' in patch || 'fastMode' in patch || 'model' in patch) {
    next.speed = speed;
    next.fastMode = speed !== STANDARD_SPEED;
  }
  if ('persona' in patch) { const v = validatePersona(patch.persona); if (v === null) delete next.persona; else next.persona = v; }
  if ('customCommands' in patch) { const v = validateCustomCommands(patch.customCommands); if (v === null) delete next.customCommands; else next.customCommands = v; }
  if ('modelSettings' in patch) { const v = validateModelSettings(patch.modelSettings); if (v === null) delete next.modelSettings; else next.modelSettings = v; }
  // Settings › Models › Display names (prefs/model-names.mjs): {'<coreId>:<modelId>': name}; null clears them all.
  if ('modelNames' in patch) { const v = validateModelNames(patch.modelNames); if (v === null) delete next.modelNames; else next.modelNames = v; }
  if ('customInstructions' in patch) { const v = validateInstructions(patch.customInstructions); if (v === null) delete next.customInstructions; else next.customInstructions = v; }
  if ('harnessProfile' in patch) { const v = validateHarnessProfile(patch.harnessProfile); if (v === null) delete next.harnessProfile; else next.harnessProfile = v; }
  if ('customTheme' in patch) { const v = validateTheme(patch.customTheme); if (v === null) delete next.customTheme; else next.customTheme = v; }
  // Codex-only: the permission profile its workspace-write turns use (codex-permissions.mjs); null follows config.toml.
  if ('codexPermissionProfile' in patch) { const v = validateProfileChoice(patch.codexPermissionProfile); if (v === null) delete next.codexPermissionProfile; else next.codexPermissionProfile = v; }
  // Settings › Code › Dynamic workflows (prefs/workflow-settings.mjs).
  applyWorkflowPatch(next, patch);
  return next;
}
