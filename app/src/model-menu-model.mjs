// Model menu decisions (current 2.2553.1 shared-14 FS → AS/kS), kept pure so
// they can be tested without the portal-based SourceMenu.Popup.

import { t } from "../electron/i18n/index.mjs";

const modelKey = (model) => model?.model || model?.id;

// Effort display name: Codex/Harness report ids (low, high, max…); the menu,
// the composer trigger ('Effort: High', c8e04f916 effortSelectorTrigger) and
// Settings capitalize them. Display-only, so the capitalized name is the dictionary key.
// efforts (optional): the model's own levels. A model whose only levels are none/default is a thinking switch (Qwen's
// toggle-only models: 'Thinking off' / 'Thinking on', model-configuration.ts), not two effort levels.
// Kimi's thinking option is the same switch spelled off/on (acp-server buildThinkingOption: 'off' plus the model's
// efforts, or off/on for a boolean thinking model), so 'off' and 'on' read as Thinking off / Thinking on wherever they
// appear (Kimi labels them so; DeepSeek Harness's 'off' level is its non-thinking mode too), never 'Effort: On'.
const levelId = (level) => typeof level === "string" ? level : level?.reasoningEffort ?? level?.id;
const TOGGLE_PAIRS = [["none", "default"], ["off", "on"]];
export const isThinkingToggle = (efforts) => Array.isArray(efforts) && efforts.length === 2 && new Set(efforts.map(levelId)).size === 2
  && TOGGLE_PAIRS.some((pair) => efforts.every((level) => pair.includes(levelId(level))));
// c74045701 effort labels: xhigh reads 'Extra high' (kDEj60CmLq); other ids capitalise as before.
const EFFORT_NAMES = Object.freeze({ xhigh: "Extra high" });
export const effortName = (value = "", efforts) => (isThinkingToggle(efforts) && (value === "none" || value === "default")) || value === "off" || value === "on"
  ? t(value === "none" || value === "off" ? "Thinking off" : "Thinking on")
  : t(EFFORT_NAMES[value] ?? String(value).charAt(0).toUpperCase() + String(value).slice(1));

// The purple top tier is a named effort, not "whatever is last": c8e04f916 accents the previewed label only when
// its id is Xx 'ultracode' (scratch effort.js:150 `B?.id === v`), and c360a9e1c:5257 mounts the lit slider overlay
// only when effort_options.at(-1) is ultracode (dn). Codex 0.155.1 ships the twin 'ultra' ("Maximum reasoning with
// automatic task delegation") as the last level of gpt-6-astra / gpt-5.6-sol / -terra, so those get the accent
// and the overlay; gpt-5.6-luna (…max), gpt-5.5 (…xhigh) and DeepSeek Harness (off/low/high/max) get neither.
const TOP_TIER_EFFORTS = new Set(["ultra", "ultracode"]);
export const effortId = (level) => typeof level === "string" ? level : level?.id || level?.reasoningEffort;
export const isTopTierEffort = (id) => TOP_TIER_EFFORTS.has(id);
export const hasTopTierEffort = (levels) => Array.isArray(levels) && isTopTierEffort(effortId(levels.at(-1)));
// The purple accent (user decision 2026-10-18): a model's highest level reads purple whatever its id (ultra, ultracode,
// max, xhigh or high), not only the named ultra tier. isTopTierEffort keeps the ultracode semantics (main.jsx).
export const isHighestEffort = (id, levels) => !!id && id !== "off" && (isTopTierEffort(id)
  || (Array.isArray(levels) && levels.length > 1 && effortId(levels.at(-1)) === id));
export const hasHighestEffort = (levels) => Array.isArray(levels) && levels.length > 1 && isHighestEffort(effortId(levels.at(-1)), levels);

// Ultracode (Claude Code 2.1.280: xhigh effort + standing dynamic-workflow orchestration, this session only). With
// Dynamic workflows on, the purple top tier IS ultracode: a model's own top tier (Codex's 'ultra') keeps its id and
// gains ultracode's standing instruction; a model that reaches xhigh without one gets an 'ultracode' level that runs
// at xhigh (coreEffort). Without xhigh, or with workflows off, the levels are the model's own.
export const ULTRACODE_EFFORT = "ultracode";
export const ultracodeDescription = () => t("ultracode · xhigh effort + dynamic workflows for maximum thoroughness");
export function withUltracodeLevel(levels, workflowsEnabled) {
  if (!workflowsEnabled || !Array.isArray(levels) || !levels.length) return levels;
  // A model's own top tier keeps its id, so its label names the effort the core really runs (Codex's 'ultra': "Maximum
  // reasoning with automatic task delegation"), not xhigh.
  if (hasTopTierEffort(levels)) return levels.map((level, index) => index === levels.length - 1 && typeof level === "object"
    ? { ...level, description: effortId(level) === ULTRACODE_EFFORT ? ultracodeDescription() : t("ultracode · {effort} effort + dynamic workflows for maximum thoroughness", { effort: effortName(effortId(level)) }) } : level);
  if (!levels.some((level) => effortId(level) === "xhigh")) return levels;
  return [...levels, { reasoningEffort: ULTRACODE_EFFORT, description: ultracodeDescription() }];
}
// Effort slider badges (c8e04f916 C :150-187, :384-391; slider c2d9b9a76 b :160-170, :424-440). A catalog level may
// carry badge {message, variant}: the first non-warning badge marks its stop (a 9px tall stop and the label under
// the track) and its value text reads '{name} ({badge})'; a warning badge (Max on Claude: 'High usage') puts the
// warning note under the slider for the committed level. Locally the model's default effort (Codex
// defaultReasoningEffort, or the Settings › Models default) is the 'Default' badge, as Claude's catalog marks it.
export function markDefaultEffort(levels, defaultEffort) {
  if (!Array.isArray(levels) || !defaultEffort) return levels;
  return levels.map((level) => {
    if (effortId(level) !== defaultEffort) return level;
    const entry = typeof level === "string" ? { reasoningEffort: level } : level;
    return entry.badge ? entry : { ...entry, badge: { message: t("Default"), variant: "neutral" } };
  });
}
/** The marked stop: the first level whose badge is not a warning (q/J), or null. */
export function effortMark(options) {
  const index = Array.isArray(options) ? options.findIndex((option) => option?.badge?.message && option.badge.variant !== "warning") : -1;
  return index >= 0 ? { index, label: options[index].badge.message } : null;
}
/** K/ve: the stop's name ('Level {position} of {total}' for a nameless one), '{name} ({badge})' on the marked stop. */
export function effortValueText(options, index, mark = effortMark(options)) {
  const list = Array.isArray(options) ? options : [];
  const name = list[index]?.name || t("Level {position} of {total}", { position: index + 1, total: list.length });
  return mark && index === mark.index ? t("{name} ({badge})", { name, badge: mark.label }) : name;
}
/** Q/Ee: a warning-badged level's note (its tooltip, else the High usage copy); undefined otherwise. */
export function effortWarning(option) {
  if (option?.badge?.variant !== "warning") return undefined;
  return option.tooltip?.content || t("DeepSeek thinks longer with Max effort and uses your limits faster than High.");
}

/** The effort a core receives: ultracode runs at xhigh; every other level is the core's own. */
export const coreEffort = (value) => value === ULTRACODE_EFFORT ? "xhigh" : value;
/** The effort a session keeps on disk for a picked level. Ultracode is this app run only (Claude Code: interactive
 * toggles never persist it), so with workflows on the top tier is saved as the level under it: xhigh when the model
 * lists it, else its next-highest level. `levels` are the model's own (without the added ultracode level). */
export function durableEffort(value, levels, workflowsEnabled) {
  if (!workflowsEnabled || !isTopTierEffort(value)) return value;
  const own = (Array.isArray(levels) ? levels : []).map(effortId).filter((id) => id && !isTopTierEffort(id));
  return own.includes("xhigh") ? "xhigh" : own.at(-1) ?? coreEffort(value);
}

// Codex has no main/overflow catalog section, so the returned order is kept
// with the first-four convention; explicit catalog sections take precedence.
// showFast: shared-14 ES returns null when the model has no 'fast' option
// (:6634-6636, rendered `te && a ? F(ES, …) : null` :6949), so the separator,
// header and row exist only for a model with a Fast service tier.
// A catalog this long (OpenCode with OpenRouter: 400+ models) gets a search field, and its main list is capped: the
// default and the selected model first, then the first others, the rest under More models.
export const MODEL_SEARCH_THRESHOLD = 12;
export const MODEL_PRIMARY_CAP = 8;
export const MODEL_SEARCH_LIMIT = 60;
// A 'deprecated' row (shapeModelCatalog's unsupported current model) follows the main rows, as shared-8 Hk
// T = [...main, deprecated row of the current model] (:13830-13833), never in More models and never searched.
export function modelMenuSections({ models = [], fastTier = null, selected = null } = {}) {
  const listed = (Array.isArray(models) ? models : []).filter((model) => typeof modelKey(model) === "string");
  const deprecated = listed.filter((model) => model.section === "deprecated" && modelKey(model) === selected);
  const result = catalogSections({ models: listed.filter((model) => model.section !== "deprecated"), fastTier, selected });
  return deprecated.length ? { ...result, primary: [...result.primary, ...deprecated] } : result;
}
function catalogSections({ models: available, fastTier, selected }) {
  const showFast = !!fastTier;
  if (available.some((model) => model.section === "main" || model.section === "overflow")) {
    let primary = available.filter((model) => model.section !== "overflow");
    let overflow = available.filter((model) => model.section === "overflow");
    if (available.length > MODEL_SEARCH_THRESHOLD && primary.length > MODEL_PRIMARY_CAP) {
      const first = [...primary.filter((model) => model.isDefault), ...primary.filter((model) => modelKey(model) === selected && !model.isDefault)];
      const kept = [...first, ...primary.filter((model) => !first.includes(model))].slice(0, MODEL_PRIMARY_CAP);
      overflow = [...primary.filter((model) => !kept.includes(model)), ...overflow];
      primary = kept;
    }
    return { primary, overflow, showFast, ...(available.length > MODEL_SEARCH_THRESHOLD ? { searchable: true } : {}) };
  }
  return { primary: available.slice(0, 4), overflow: available.slice(4), showFast, ...(available.length > MODEL_SEARCH_THRESHOLD ? { searchable: true } : {}) };
}

/** c593f7513 lp I (:6011-6111): the catalog the Code model menu shows.
 * - defaultModel (lp hostDefaultModel: the model new sessions use, Settings' saved model) gets a neutral 'Default'
 *   badge unless the catalog already badges that row;
 * - a selected model the catalog no longer lists (c: `a && e?.unsupported && N.models.length > 0`) is appended as a
 *   disabled 'deprecated' row named 'Unsupported model' (ap: a known display name, else that label).
 * The 'Preset' badge (environmentModelId) has no local source: no environment pins a model. */
export function shapeModelCatalog({ models = [], selected = null, defaultModel = null } = {}) {
  const list = Array.isArray(models) ? models : [];
  const shaped = list.map((model) => defaultModel && modelKey(model) === defaultModel && !model.badge
    ? { ...model, badge: { message: t("Default"), variant: "neutral" } } : model);
  if (!selected || !list.length || list.some((model) => modelKey(model) === selected)) return shaped;
  return [...shaped, { id: selected, model: selected, displayName: t("Unsupported model"), section: "deprecated", disabled: true, unsupported: true }];
}

/** The models whose name, description (OpenCode: the provider) or id hold every word of the query, best first. */
export function filterModels(models = [], query = "") {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const model of Array.isArray(models) ? models : []) {
    const id = modelKey(model);
    if (typeof id !== "string") continue;
    const name = String(model.displayName || model.name || id).toLowerCase(), haystack = `${name} ${String(model.description ?? "").toLowerCase()} ${id.toLowerCase()}`;
    if (!words.every((word) => haystack.includes(word))) continue;
    scored.push({ model, score: name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2 });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, MODEL_SEARCH_LIMIT).map((entry) => entry.model);
}
