// Map a model id requested by a workflow (often a Claude id, or a bare
// opus/sonnet/haiku alias from a Claude-authored script or an agentType
// definition) onto a model the local Codex app-server actually exposes.

export function modelId(m) {
  if (typeof m === "string") return m;
  if (m && typeof m === "object") return m.id ?? m.slug ?? m.model ?? m.name ?? null;
  return null;
}

// Claude tier -> ordered Codex preferences (first available wins).
const FAMILY_PREFERENCES = {
  opus: ["gpt-5.6-sol", "gpt-5.5", "gpt-5.4", "gpt-5.3-codex", "gpt-5.2"],
  sonnet: ["gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.4", "gpt-5.5", "gpt-5.3-codex", "gpt-5.4-mini"],
  haiku: ["gpt-5.6-luna", "gpt-5.4-mini", "gpt-5.6-terra", "gpt-5.4", "gpt-5.2"],
};

// The API's family alias is not necessarily listed by Codex model/list. Resolve
// it to the explicit catalog id so `--model gpt-5.6` works with the App Server.
const MODEL_ALIASES = {
  "gpt-5.6": "gpt-5.6-sol",
};

// Local: a small or fast variant ("gpt-5.4-mini", "gpt-5.3-codex-spark") is "mini" or "spark" as a whole word of the
// id, never inside another word: a MiniMax id ("m:minimax:MiniMax-M3:v:") is a full model.
const LITE_VARIANT = /(?:^|[-_./:\s])(?:mini|spark)(?=$|[-_./:\s])/i;
export const isLiteVariant = (id) => LITE_VARIANT.test(String(id));

// Local: a core's own Claude tier map (context.tiers, from the core descriptor's workflowModelTiers via
// CODE_DESKTOP_WORKFLOW_MODEL_TIERS): per tier, case-insensitive patterns tried in order against the listed ids.
function tierPick(patterns, available) {
  if (!Array.isArray(patterns)) return undefined;
  for (const pattern of patterns) {
    let rule;
    try { rule = new RegExp(String(pattern), "i"); } catch { continue; }
    const hit = available.find((m) => rule.test(m));
    if (hit) return hit;
  }
  return undefined;
}

// Local: a catalog that lists Claude models itself (OpenCode, MiMo: "anthropic/claude-opus-4-5",
// "openrouter/anthropic/claude-opus-4.5"): a tier alias takes the newest listed model of that tier, the session's own
// model first when it is one, then one from the session's provider.
function familyPick(family, available, session) {
  const listed = available.filter((m) => claudeFamily(m) === family);
  if (!listed.length) return undefined;
  if (session && listed.includes(session)) return session;
  const provider = (m) => (String(m).includes("/") ? String(m).slice(0, String(m).lastIndexOf("/")) : "");
  const version = (m) => (String(m).match(/\d+(?:[.-]\d+)*/g) ?? []).join(".").split(/[.-]/).filter(Boolean).map(Number);
  const newer = (a, b) => {
    const x = version(a), y = version(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (y[i] ?? -1) - (x[i] ?? -1); if (d) return d; }
    return a.length - b.length;
  };
  const own = session ? listed.filter((m) => provider(m) === provider(session)) : [];
  return [...(own.length ? own : listed)].sort(newer)[0];
}

// Matches Claude full ids ("claude-opus-4-8") and bare aliases ("opus").
function claudeFamily(id) {
  const s = String(id).toLowerCase();
  if (/opus/.test(s)) return "opus";
  if (/sonnet/.test(s)) return "sonnet";
  if (/haiku/.test(s)) return "haiku";
  return null;
}

/**
 * Resolve `requested` to a Codex model id (or undefined to use Codex's config
 * default).
 *   undefined / "inherit" / "default" -> undefined
 *   Claude id or alias                -> mapped family preference (best available)
 *   already-available id              -> as-is
 *   unknown but unavailable           -> undefined (config default) + warn
 * If `available` is empty (model/list unavailable), Claude ids still map to their
 * top preference and other ids pass through unchanged.
 * Local: `context` ({customProvider, sessionModel}, codexAgent.js modelResolution) says whether the endpoint serves
 * the catalog. On a custom endpoint (Codex with its own model_provider, or a session model the catalog doesn't
 * list) a Claude alias inherits the session's model instead of becoming a catalog id the endpoint doesn't serve,
 * and with a custom model_provider any other id is passed through for the endpoint to decide.
 */
export function resolveModel(requested, available = [], log = () => {}, context = {}) {
  if (!requested || /^(inherit|default)$/i.test(requested)) return undefined;

  // Local: an exact catalog id stays as it is, a Claude one too (OpenCode lists "anthropic/claude-opus-4-5"), and a
  // session model the catalog lists is the session's even when it is a Claude model.
  if (available.includes(requested)) return requested;
  const session = typeof context.sessionModel === "string" && context.sessionModel && (!claudeFamily(context.sessionModel) || available.includes(context.sessionModel)) ? context.sessionModel : undefined;
  const offCatalog = !!context.customProvider || (session !== undefined && available.length > 0 && !available.includes(session) && !available.includes(MODEL_ALIASES[session.toLowerCase()]));
  const family = claudeFamily(requested);
  if (family && offCatalog) {
    log(`model: '${requested}' (Claude) → the session's model${session ? ` '${session}'` : ""} (this endpoint serves its own models, not the catalog Codex lists)`);
    return session === undefined ? undefined : resolveModel(session, available, () => {}, { customProvider: context.customProvider });
  }
  if (family) {
    const prefs = FAMILY_PREFERENCES[family] || [];
    const pick = available.length
      ? (tierPick(context.tiers?.[family], available) ??
         familyPick(family, available, session) ??
         prefs.find((m) => available.includes(m)) ??
         available.find((m) => !isLiteVariant(m)) ??
         available[0])
      : prefs[0];
    if (pick) {
      log(`model: '${requested}' (Claude) → '${pick}'`);
      return pick;
    }
    return undefined;
  }

  // Preserve an exact catalog id before expanding API aliases. This also keeps
  // the resolver compatible if a future catalog exposes the bare family alias.
  if (available.includes(requested)) return requested;

  const alias = MODEL_ALIASES[String(requested).toLowerCase()];
  if (alias && (!available.length || available.includes(alias))) {
    log(`model: '${requested}' → '${alias}'`);
    return alias;
  }

  if (!available.length) return requested; // non-Claude id, can't validate — trust it
  if (context.customProvider) return requested; // Local: the custom endpoint, not Codex's catalog, knows its models

  log(`model: '${requested}' not exposed by Codex → using config default (have: ${available.join(", ")})`);
  return undefined;
}

// Pick the latest frontier model from a `model/list` result: the newest,
// strongest general model. Excludes -mini/-spark variants and hidden models;
// ranks by version number, then GPT-5.6 family tier (Sol > Terra > Luna), then
// the catalog's default flag and the shorter (base) id.
export function pickFrontier(models = []) {
  const id = (m) => (typeof m === "string" ? m : m?.id ?? m?.model ?? m?.slug ?? m?.name);
  const versionParts = (s) => {
    const mt = String(s).match(/(\d+(?:\.\d+)?)/);
    return mt ? mt[1].split(".").map(Number) : [-1];
  };
  const compareVersionDesc = (left, right) => {
    const a = versionParts(left);
    const b = versionParts(right);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const delta = (b[i] ?? 0) - (a[i] ?? 0);
      if (delta) return delta;
    }
    return 0;
  };
  const strength = (s) => {
    const value = String(s).toLowerCase();
    if (/-sol$/.test(value)) return 3;
    if (/-terra$/.test(value)) return 2;
    if (/-luna$/.test(value)) return 1;
    return 3; // unsuffixed models and aliases are flagship/general models
  };
  const eligible = models
    .map((m) => ({
      id: id(m),
      isDefault: typeof m === "object" && !!m?.isDefault,
      hidden: typeof m === "object" && !!m?.hidden,
    }))
    .filter((m) => m.id && !m.hidden && !isLiteVariant(m.id));
  if (!eligible.length) return undefined;
  eligible.sort(
    (a, b) =>
      compareVersionDesc(a.id, b.id) ||
      strength(b.id) - strength(a.id) ||
      Number(b.isDefault) - Number(a.isDefault) ||
      a.id.length - b.id.length,
  );
  return eligible[0].id;
}
