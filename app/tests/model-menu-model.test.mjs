import test from "node:test";
import assert from "node:assert/strict";
import { effortName, effortId, hasTopTierEffort, isThinkingToggle, isTopTierEffort, modelMenuSections } from "../src/model-menu-model.mjs";
import { setLocale } from "../electron/i18n/index.mjs";

const model = (id, extra = {}) => ({ id, model: id, displayName: id, ...extra });
const ids = (list) => list.map((entry) => entry.model);

test("the Fast section exists only for a model with a Fast tier (shared-14 ES)", () => {
  const models = [model("deepseek-flash"), model("deepseek-v4-pro")];
  assert.equal(modelMenuSections({ models, fastTier: null }).showFast, false);
  assert.equal(modelMenuSections({ models }).showFast, false);
  assert.equal(modelMenuSections({ models, fastTier: { id: "priority", name: "Fast" } }).showFast, true);
});

test("the primary/overflow split keeps the first four; explicit catalog sections win", () => {
  const two = modelMenuSections({ models: [model("deepseek-flash"), model("deepseek-v4-pro")] });
  assert.deepEqual([ids(two.primary), ids(two.overflow)], [["deepseek-flash", "deepseek-v4-pro"], []]);
  const six = modelMenuSections({ models: ["a", "b", "c", "d", "e", "f"].map((id) => model(id)) });
  assert.deepEqual([ids(six.primary), ids(six.overflow)], [["a", "b", "c", "d"], ["e", "f"]]);
  const sectioned = modelMenuSections({ models: [model("a", { section: "overflow" }), model("b", { section: "main" }), model("c")] });
  assert.deepEqual([ids(sectioned.primary), ids(sectioned.overflow)], [["b", "c"], ["a"]]);
  const keyless = modelMenuSections({ models: [{ displayName: "no id" }, model("x")] });
  assert.deepEqual(ids(keyless.primary), ["x"], "a row without a model id is not offered");
  assert.deepEqual(modelMenuSections({ models: null }), { primary: [], overflow: [], showFast: false });
});

test("effort names are the capitalized ids", () => {
  assert.deepEqual(["low", "high", "max", "xhigh", "ultra", ""].map((id) => effortName(id)), ["Low", "High", "Max", "Extra high", "Ultra", ""]);
  setLocale("zh-CN");
  try { assert.deepEqual(["max", "ultra"].map((id) => effortName(id)), ["最高", "极致"]); } finally { setLocale("en-US"); }
});

// Kimi's thinking option: off/on on a boolean thinking model, or off plus the model's efforts (acp-server
// buildThinkingOption). Never 'Effort: On', and translated in zh-CN.
test("off and on are the thinking switch, not effort levels", () => {
  assert.equal(isThinkingToggle(["off", "on"]), true);
  assert.equal(isThinkingToggle([{ reasoningEffort: "on" }, { reasoningEffort: "off" }]), true);
  assert.equal(isThinkingToggle(["none", "default"]), true);
  assert.equal(isThinkingToggle(["off", "low", "high"]), false);
  assert.deepEqual(["off", "on"].map((id) => effortName(id, ["off", "on"])), ["Thinking off", "Thinking on"]);
  assert.equal(effortName("off", ["off", "low", "high", "max"]), "Thinking off", "the first level of an effort-capable Kimi model");
  assert.equal(effortName("off"), "Thinking off");
  setLocale("zh-CN");
  try { assert.deepEqual(["off", "on"].map((id) => effortName(id, ["off", "on"])), ["关闭思考", "开启思考"]); } finally { setLocale("en-US"); }
});

// c8e04f916 effort.js:150 (accent iff the previewed id is ultracode) and c360a9e1c:5257 (overlay iff the LAST option
// is ultracode); Codex 0.155.1 names the same tier 'ultra'. The highest level alone is not the tier.
test("the purple top tier is the ultra/ultracode id, never just the last level", () => {
  assert.deepEqual(["ultra", "ultracode", "max", "xhigh", "off", undefined, ""].map(isTopTierEffort), [true, true, false, false, false, false, false]);
  assert.deepEqual([effortId("ultra"), effortId({ reasoningEffort: "max" }), effortId({ id: "low", reasoningEffort: "x" }), effortId(null)], ["ultra", "max", "low", undefined]);
  const astra = ["low", "medium", "high", "xhigh", "max", "ultra"];
  assert.equal(hasTopTierEffort(astra), true, "gpt-6-astra / sol / terra end in ultra");
  assert.equal(hasTopTierEffort(astra.map((reasoningEffort) => ({ reasoningEffort }))), true);
  assert.equal(hasTopTierEffort([{ id: "low" }, { id: "ultracode" }]), true);
  assert.equal(hasTopTierEffort(["low", "medium", "high", "xhigh", "max"]), false, "gpt-5.6-luna stops at max");
  assert.equal(hasTopTierEffort(["low", "medium", "high", "xhigh"]), false, "gpt-5.5 stops at xhigh");
  assert.equal(hasTopTierEffort([{ reasoningEffort: "off" }, { reasoningEffort: "low" }, { reasoningEffort: "high" }, { reasoningEffort: "max" }]), false, "DeepSeek off/low/high/max is unchanged");
  assert.equal(hasTopTierEffort(["ultra", "low"]), false, "only the last option counts");
  assert.equal(hasTopTierEffort([]), false); assert.equal(hasTopTierEffort(undefined), false);
});

// B30 c593f7513 lp I (:6011-6111): 'Default' on the model new sessions use; a current model the catalog no longer
// lists becomes a disabled 'deprecated' row after the main rows (shared-8 Hk T = [...main, deprecated]).
test("shapeModelCatalog badges the default model and appends the unsupported current model", async () => {
  const { shapeModelCatalog } = await import("../src/model-menu-model.mjs");
  const models = [model("a"), model("b", { badge: { message: "New" } }), model("c")];
  const shaped = shapeModelCatalog({ models, selected: "a", defaultModel: "c" });
  assert.deepEqual(shaped.map((entry) => entry.badge?.message ?? null), [null, "New", "Default"]);
  assert.equal(shapeModelCatalog({ models, selected: "a", defaultModel: "b" })[1].badge.message, "New", "a catalog badge wins");
  assert.equal(shapeModelCatalog({ models, selected: "a" }).length, 3, "no unsupported row while the current model is listed");
  const gone = shapeModelCatalog({ models, selected: "retired", defaultModel: "a" });
  assert.deepEqual(gone.at(-1), { id: "retired", model: "retired", displayName: "Unsupported model", section: "deprecated", disabled: true, unsupported: true });
  assert.deepEqual(shapeModelCatalog({ models: [], selected: "retired" }), [], "an empty catalog adds nothing (N.models.length > 0)");
  const sections = modelMenuSections({ models: [...["a", "b", "c", "d", "e"].map((id) => model(id)), gone.at(-1)], selected: "retired" });
  assert.deepEqual([ids(sections.primary), ids(sections.overflow)], [["a", "b", "c", "d", "retired"], ["e"]]);
  assert.deepEqual(ids(modelMenuSections({ models: [model("a"), { ...gone.at(-1) }], selected: "a" }).primary), ["a"], "a deprecated row shows only as the current model");
});

// B30 c8e04f916 C q/J/ve/Q + c2d9b9a76 mark: the first non-warning badge marks its stop; '{name} ({badge})'.
test("effort slider badges: the default level is marked, value text names the badge, warning badges add the note", async () => {
  const { markDefaultEffort, effortMark, effortValueText, effortWarning } = await import("../src/model-menu-model.mjs");
  const levels = [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }, { reasoningEffort: "high" }];
  const marked = markDefaultEffort(levels, "medium");
  assert.deepEqual(marked[1].badge, { message: "Default", variant: "neutral" });
  assert.equal(marked[0], levels[0], "other levels are untouched");
  assert.deepEqual(markDefaultEffort(["low", "high"], "high")[1], { reasoningEffort: "high", badge: { message: "Default", variant: "neutral" } });
  assert.equal(markDefaultEffort(levels, ""), levels);
  const options = marked.map((level) => ({ ...level, id: level.reasoningEffort, name: effortName(level.reasoningEffort) }));
  assert.deepEqual(effortMark(options), { index: 1, label: "Default" });
  assert.equal(effortValueText(options, 1), "Medium (Default)");
  assert.equal(effortValueText(options, 2), "High");
  assert.equal(effortValueText([{ id: "x" }, { id: "y" }], 1), "Level 2 of 2");
  const warned = [{ id: "high", name: "High" }, { id: "max", name: "Max", badge: { message: "High usage", variant: "warning" } }];
  assert.equal(effortMark(warned), null, "a warning badge is no mark");
  assert.equal(effortWarning(warned[1]), "DeepSeek thinks longer with Max effort and uses your limits faster than High.");
  assert.equal(effortWarning({ ...warned[1], tooltip: { content: "Own note" } }), "Own note");
  assert.equal(effortWarning(warned[0]), undefined);
});

// ---- 3.6556.2 (w2-menus-host, menus:C6): the Fast row's `unavailable` forms (shared-7-DBAgAi5H yw → _w), host default
// available. Loaded through Vite (the row is JSX over view-tabs); nothing opens a window.
test("menus:C6 — the Fast row keeps official _w's unavailable forms: accent xxs CTA badge, or greyed with its reason", async (t) => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const React = (await import("react")).default;
  const { createServer } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const { withMemoCache } = await import("./support/react-memo-cache.mjs");
  const root = path.resolve(import.meta.dirname, "..");
  const official = fs.readFileSync(path.join(root, "../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-7-DBAgAi5H.js"), "utf8");
  for (const feature of ["c=s?.cta,l=s?.greyed??!1", 'c?h(ge,{variant:"accent",size:"xxs",truncate:!0,children:c.copy})',
    'c?void 0:{role:"menuitemcheckbox","aria-checked":a}', "h(q.Item,{keepOpen:p,onClick:f,disabled:l,", "greyed:m&&!g,cta:g?{copy:g.copy,onActivate:()=>a?.({cta:g,model:n,source:\"fast_mode\"})}",
    "function nw(e){return e.disabled?e.selection_notice?.cta??void 0:void 0}"])
    assert.ok(official.includes(feature), feature);
  const server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", logLevel: "error" });
  t.after(() => server.close());
  const { SourceModelMenu, fastRowUnavailable } = await server.ssrLoadModule("/src/source-model-menu.jsx");
  const { CdsBadge } = await server.ssrLoadModule("/src/generated/view-tabs/index.js");

  // The derivation (yw): an available tier has none; a disabled tier that is off is greyed, or carries the CTA when there
  // is an intent handler and a selection notice; the tier that is on is never greyed.
  assert.equal(fastRowUnavailable({ key: "fast", name: "Fast" }), undefined);
  const blocked = { key: "fast", name: "Fast", disabled: true, disabled_reason: { message: "Not on this plan" }, selection_notice: { cta: { copy: "Upgrade" } } };
  assert.deepEqual(fastRowUnavailable(blocked), { reason: "Not on this plan", greyed: true, cta: undefined });
  assert.deepEqual(fastRowUnavailable(blocked, { on: true }), { reason: "Not on this plan", greyed: false, cta: undefined });
  const intents = [];
  const withCta = fastRowUnavailable(blocked, { model: "m", onIntent: (intent) => intents.push(intent) });
  assert.equal(withCta.greyed, false);
  assert.equal(withCta.cta.copy, "Upgrade");
  withCta.cta.onActivate();
  assert.deepEqual(intents, [{ cta: { copy: "Upgrade" }, model: "m", source: "fast_mode" }]);

  const fastRow = (props) => {
    const hooks = { useContext: (c) => c._currentValue, useState: (i) => [typeof i === "function" ? i() : i, () => {}], useRef: (i) => ({ current: i }),
      useMemo: (f) => f(), useCallback: (f) => f, useEffect() {}, useLayoutEffect() {}, useId: () => ":m:", useSyncExternalStore: (s, g, gs) => (gs ?? g)() };
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
    const walk = (node, hit) => {
      if (!node || typeof node !== "object") return null;
      if (Array.isArray(node)) { for (const child of node) { const found = walk(child, hit); if (found) return found; } return null; }
      if (hit(node)) return node;
      return walk(node.props?.children, hit);
    };
    try {
      const tree = SourceModelMenu({ anchor: null, models: [{ id: "m", displayName: "M" }], selected: "m", onSelect() {}, onClose() {}, onFastModeChange() {}, ...props });
      // w10-shell-model-menu: the row is its own component (_w); render it once to reach the item.
      const row = walk(tree, (node) => node.type?.name === "FastRow");
      return walk(row.type(row.props), (node) => node.props?.["data-speed"]);
    } finally { internal.H = old; }
  };
  const available = fastRow({ fastTier: { key: "fast", name: "Fast" } });
  assert.equal(available.props.role, "menuitemcheckbox");
  assert.equal(available.props.keepOpen, true);
  assert.equal(available.props.disabled, false);
  assert.equal(available.props["data-fast-unavailable"], undefined, "host default: available");
  const greyed = fastRow({ fastTier: blocked });
  // _w hands no disabledReason to q.Item: the reason is aw's mirror span (w10-model-menu-fast-row.test.mjs).
  assert.deepEqual([greyed.props.disabled, greyed.props.disabledReason, greyed.props["data-fast-unavailable"], greyed.props["aria-describedby"]], [true, undefined, "greyed", ":m:"]);
  const cta = fastRow({ fastTier: blocked, onFastIntent() {} });
  assert.equal(cta.props.role, undefined, "a CTA row is a plain menu item");
  assert.equal(cta.props.keepOpen, false);
  assert.equal(cta.props.disabled, false);
  assert.equal(cta.props.trailing.type, CdsBadge);
  assert.deepEqual([cta.props.trailing.props.variant, cta.props.trailing.props.size, cta.props.trailing.props.truncate, cta.props.trailing.props.children], ["accent", "xxs", true, "Upgrade"]);
});
