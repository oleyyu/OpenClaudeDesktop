/**
 * The agent's real model catalog (GET /config/providers: the providers it can
 * use with their models, and its default per provider) → Codex model/list.
 *
 *   model id        "<providerID>/<modelID>" (OpenCode's own spelling)
 *   efforts         the model's OpenCode variants (low/medium/high/max …), sent back as
 *                   the prompt's `variant`; "default" is OpenCode's no-variant request
 *   inputModalities from capabilities.input (image)
 *   contextWindow   limit.context (the context ring); MiMo: its working window (workingWindow)
 */

const DEFAULT_EFFORT = 'default'
// Fast tiers are vendor variants named like this (e.g. MiMo's ultraspeed models are separate ids).
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

export const wireId = (providerID, modelID) => `${providerID}/${modelID}`

/** "<provider>/<model>" → {providerID, modelID} (the model id may contain slashes). */
export function splitModel(id) {
  if (typeof id !== 'string' || !id.includes('/')) return null
  const index = id.indexOf('/')
  return { providerID: id.slice(0, index), modelID: id.slice(index + 1) }
}

export class ModelCatalog {
  /**
   * @param {() => Promise<object>} fetchProviders - GET /config/providers
   * @param {{ rank?: (provider: object) => number }} [options] - credentials.js providerRank
   *   (0 has a credential, 1 a free tier, 2 missing its key); without it OpenCode Zen ranks free.
   */
  constructor(fetchProviders, { rank } = {}) {
    this.fetchProviders = fetchProviders
    this.rank = rank ?? ((provider) => (provider?.id === 'opencode' ? 1 : 0))
    this.cached = null
    this.at = 0
  }

  invalidate() { this.cached = null }

  async load() {
    if (this.cached && Date.now() - this.at < 30000) return this.cached
    const value = await this.fetchProviders()
    const providers = Array.isArray(value?.providers) ? value.providers : []
    const defaults = isRecord(value?.default) ? value.default : {}
    const entries = []
    for (const provider of providers) {
      for (const model of Object.values(isRecord(provider.models) ? provider.models : {})) {
        if (!model?.id || model.status === 'deprecated') continue
        entries.push({ provider, model, id: wireId(provider.id, model.id) })
      }
    }
    const ranks = new Map(providers.map((provider) => [provider.id, this.rank(provider)]))
    this.cached = { entries, defaults, providers, ranks }
    this.at = Date.now()
    return this.cached
  }

  /** The entry for a wire id, or null. */
  async entry(id) {
    const { entries } = await this.load()
    return entries.find((entry) => entry.id === id) ?? null
  }

  /**
   * The default model: the configured `model` (opencode.json), else the default of the first
   * provider that holds a credential, then of a free tier (OpenCode Zen, MiMo Auto), and only
   * then of a provider still missing its key; else the first usable entry.
   */
  async defaultId(configured) {
    const { entries, defaults, providers, ranks } = await this.load()
    if (typeof configured === 'string' && entries.some((entry) => entry.id === configured)) return configured
    const rankOf = (id) => ranks.get(id) ?? 2
    const ordered = [...providers].sort((a, b) => rankOf(a.id) - rankOf(b.id))
    for (const provider of ordered) {
      const modelID = defaults[provider.id]
      if (modelID && entries.some((entry) => entry.id === wireId(provider.id, modelID))) return wireId(provider.id, modelID)
    }
    return [...entries].sort((a, b) => rankOf(a.provider.id) - rankOf(b.provider.id))[0]?.id ?? null
  }

  /**
   * The model menu section: models that work now stay in the main list; free-tier models move to
   * "More models" only when a provider with a credential offers models, and models of a provider
   * still missing its key only when something usable exists. The default always stays main.
   */
  sectionOf(entry, { preferred, best }) {
    if (entry.id === preferred) return 'main'
    const rank = this.cached?.ranks.get(entry.provider.id) ?? 2
    if (rank === 1) return best === 0 && entry.model.cost?.input === 0 ? 'overflow' : 'main'
    if (rank === 2) return best < 2 ? 'overflow' : 'main'
    // An ended free tier never works: always under More models (unless it is the configured model).
    if (rank === 3) return 'overflow'
    return 'main'
  }

  /**
   * @param {string} [configured] - the config's `model`
   * @param {{ windowOf?: (entry: object) => number | null }} [options] - the context window per entry (MiMo: workingWindow)
   */
  async codexModels(configured, { windowOf } = {}) {
    const { entries, ranks } = await this.load()
    const preferred = await this.defaultId(configured)
    const best = Math.min(2, ...entries.map((entry) => ranks.get(entry.provider.id) ?? 2))
    const names = new Map()
    for (const entry of entries) names.set(entry.model.name, (names.get(entry.model.name) ?? 0) + 1)
    return entries.map((entry) => {
      const variants = Object.keys(isRecord(entry.model.variants) ? entry.model.variants : {})
      const efforts = variants.length ? [DEFAULT_EFFORT, ...variants] : []
      const input = entry.model.capabilities?.input ?? {}
      const modalities = ['text', ...(input.image ? ['image'] : []), ...(input.pdf ? ['pdf'] : [])]
      const name = entry.model.name || entry.model.id
      return {
        id: entry.id,
        model: entry.id,
        upgrade: null,
        upgradeInfo: null,
        availabilityNux: null,
        displayName: (names.get(entry.model.name) ?? 0) > 1 ? `${name} (${entry.provider.name ?? entry.provider.id})` : name,
        description: entry.provider.name ?? entry.provider.id,
        modelSpecialty: null,
        hidden: false,
        supportedReasoningEfforts: efforts.map((effort) => ({ reasoningEffort: effort, description: effort === DEFAULT_EFFORT ? 'The provider default' : effort })),
        defaultReasoningEffort: efforts.length ? DEFAULT_EFFORT : null,
        inputModalities: modalities,
        supportsPersonality: false,
        multiAgentVersion: null,
        additionalSpeedTiers: [],
        serviceTiers: [],
        defaultServiceTier: null,
        isDefault: entry.id === preferred,
        provider: entry.provider.id,
        contextWindow: windowOf ? windowOf(entry) : entry.model.limit?.context ?? null,
        section: this.sectionOf(entry, { preferred, best }),
      }
    })
  }
}

/** A Codex effort → the OpenCode variant (undefined for the provider default). */
export function variantOf(effort, entry) {
  if (typeof effort !== 'string' || !effort || effort === DEFAULT_EFFORT) return undefined
  const variants = isRecord(entry?.model?.variants) ? entry.model.variants : null
  return variants && Object.hasOwn(variants, effort) ? effort : undefined
}

/** A token quantity as MiMo reads it (util/token.ts parseQuantity): 300000, "300K", "1.5M", "50%" of `relativeTo`. */
export function parseQuantity(input, relativeTo) {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? Math.floor(input) : undefined
  if (typeof input !== 'string') return undefined
  const trimmed = input.trim()
  if (trimmed.endsWith('%')) {
    if (relativeTo === undefined) return undefined
    const pct = Number.parseFloat(trimmed.slice(0, -1))
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return undefined
    return Math.floor((relativeTo * pct) / 100)
  }
  const match = /^(\d+(?:\.\d+)?)([KkMm]?)$/.exec(trimmed)
  if (!match) return undefined
  const scale = match[2] === '' ? 1 : match[2].toLowerCase() === 'k' ? 1_000 : 1_000_000
  return Math.floor(Number.parseFloat(match[1]) * scale)
}

const globMatch = (value, pattern) => new RegExp(`^${String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 's').test(value)

/** MiMo's Wildcard.all: of the patterns matching `value`, the longest (then the last by name) wins. */
export function wildcardValue(value, patterns) {
  const sorted = Object.entries(patterns).sort(([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
  let result
  for (const [pattern, candidate] of sorted) if (globMatch(value, pattern)) result = candidate
  return result
}

const LARGE_OUTPUT_MAX = 128_000
const usesLargeOutput = (entry) => ['mimo', 'xiaomi'].includes(String(entry.provider?.id ?? '').toLowerCase())
  || [entry.model?.id, entry.model?.api?.id].some((id) => typeof id === 'string' && ['claude', 'gpt', 'mimo'].some((name) => id.toLowerCase().includes(name)))

/**
 * MiMo's working context window for a model (session/overflow.ts contextWindow): the provider cap
 * (limit.input, else limit.context), lowered by the user's compaction.max_context budget (a quantity, or a
 * map keyed by "<providerID>/<modelID>" with wildcards; MIMOCODE_COMPACTION_MAX_CONTEXT when the config has
 * none). MiMo compacts at 90% of it, and its footer and /status count against it. null: unknown window.
 * @param {{ provider: object, model: object, id: string }} entry
 * @param {{ maxContext?: unknown, reserved?: number, outputMax?: number }} [compaction]
 */
export function workingWindow(entry, { maxContext, reserved, outputMax = 32_000 } = {}) {
  const limit = isRecord(entry?.model?.limit) ? entry.model.limit : {}
  if (!Number.isFinite(limit.context) || limit.context <= 0) return null
  const hard = (Number.isFinite(limit.input) && limit.input > 0) ? limit.input : limit.context
  if (maxContext === undefined || maxContext === null) return hard
  const raw = isRecord(maxContext) ? wildcardValue(entry.id, maxContext) : maxContext
  if (raw === undefined || raw === null || raw === '') return hard
  const parsed = parseQuantity(raw, hard)
  if (!parsed) return hard
  const maxOutput = usesLargeOutput(entry) ? LARGE_OUTPUT_MAX : (Math.min(limit.output || 0, outputMax) || outputMax)
  const reserve = (Number.isFinite(reserved) ? reserved : Math.min(33_000, maxOutput)) + (limit.input ? 0 : Math.min(maxOutput, 20_000))
  // MiMo ignores a budget at or under its reserve, and one at or above the cap changes nothing.
  if (parsed <= reserve || parsed >= hard) return hard
  return parsed
}
