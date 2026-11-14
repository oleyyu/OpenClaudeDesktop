/**
 * The DeepSeek Harness model catalog as Codex `model/list` entries.
 *
 * Codex identifies a model by one string; Harness by (provider, model). The
 * wire id is the bare model id when it is unique across providers, otherwise
 * `provider/model`. Reasoning efforts pass through verbatim (Harness ids such
 * as off/low/high/max); OpenClaude Desktop labels them by capitalizing the id.
 * A description comes from the catalog only: a model without one has none
 * (the menu hides the empty line).
 */

/**
 * A catalog entry's input modalities: the resolved route info (what the
 * adapter dispatch checks), else the listing. Absent means text only.
 */
export function modalitiesOf(entry) {
  return entry?.info?.inputModalities ?? entry?.model?.inputModalities ?? ['text']
}

// Claude-style short names ("Opus 5.5" → "4.1 Flash") for the DeepSeek catalog ids.
export const DISPLAY_NAMES = { 'deepseek-flash': '4.1 Flash', 'deepseek-v4-flash': '4.1 Flash', 'deepseek-v4-pro': '4 Pro' }

export class ModelCatalog {
  constructor(llm, fallback) {
    this.llm = llm
    this.fallback = fallback
    this.entries = []
    this.byWireId = new Map()
    this.loaded = null
  }

  invalidate() {
    this.loaded = null
  }

  async load(signal) {
    if (this.loaded) return this.loaded
    this.loaded = (async () => {
      const entries = []
      for (const provider of this.llm.listProviders()) {
        let models = []
        try {
          models = await this.llm.listModels(provider.id)
        } catch {
          continue
        }
        for (const model of models) {
          let info
          try {
            info = await this.llm.resolveModelInfo(provider.id, model.id, signal)
          } catch {
            info = undefined
          }
          entries.push({ provider, model, info })
        }
      }
      const counts = new Map()
      for (const entry of entries) counts.set(entry.model.id, (counts.get(entry.model.id) ?? 0) + 1)
      this.byWireId = new Map()
      this.entries = entries.map((entry) => {
        const wireId = counts.get(entry.model.id) > 1 ? `${entry.provider.id}/${entry.model.id}` : entry.model.id
        const value = { ...entry, wireId }
        this.byWireId.set(wireId, value)
        this.byWireId.set(`${entry.provider.id}/${entry.model.id}`, value)
        return value
      })
      return this.entries
    })().catch((error) => {
      this.loaded = null
      throw error
    })
    return this.loaded
  }

  /** The catalog entry of a (provider, model) route, when listed. */
  entryFor(route) {
    return route ? this.entries.find((candidate) => candidate.provider.id === route.provider && candidate.model.id === route.model) : undefined
  }

  /** Wire id for a (provider, model) route, even if the catalog no longer lists it. */
  wireId(provider, model) {
    const entry = this.entries.find((candidate) => candidate.provider.id === provider && candidate.model.id === model)
    return entry?.wireId ?? model
  }

  /**
   * Resolve a Codex model string (and optional effort) to a Harness selection.
   * Unknown models fall back to the current selection so a stale preference
   * never fails a turn.
   */
  async selection(wireModel, effort, current) {
    await this.load().catch(() => undefined)
    const base = current ?? this.defaultRoute()
    const entry = typeof wireModel === 'string' && wireModel ? this.byWireId.get(wireModel) : undefined
    const provider = entry?.provider.id ?? base?.provider
    const model = entry?.model.id ?? base?.model
    if (provider === undefined || model === undefined) return undefined
    const sameRoute = provider === base?.provider && model === base?.model
    const info = entry?.info ?? this.entries.find((candidate) => candidate.provider.id === provider && candidate.model.id === model)?.info
    const efforts = info?.reasoning?.efforts?.map((option) => option.id) ?? []
    let reasoningEffort
    if (typeof effort === 'string' && efforts.includes(effort)) reasoningEffort = effort
    else if (sameRoute && base?.reasoningEffort !== undefined && (efforts.length === 0 || efforts.includes(base.reasoningEffort))) reasoningEffort = base.reasoningEffort
    return { provider, model, ...(reasoningEffort === undefined ? {} : { reasoningEffort }) }
  }

  /** Configured route when the catalog lists it, else the catalog's first model. */
  defaultRoute() {
    const entry = this.defaultEntry()
    return entry ? { provider: entry.provider.id, model: entry.model.id } : this.fallback
  }

  defaultEntry() {
    const fallback = this.fallback
    return this.entries.find((entry) => entry.provider.id === fallback?.provider && entry.model.id === fallback?.model) ?? this.entries[0]
  }

  /** Codex v2 `Model` objects. */
  async codexModels(signal) {
    const entries = await this.load(signal)
    const preferred = this.defaultEntry()
    return entries.map((entry) => {
      const efforts = entry.info?.reasoning?.efforts ?? []
      const defaultEffort = entry.info?.reasoning?.defaultEffort ?? efforts.find((option) => option.id === 'high')?.id ?? efforts[0]?.id ?? null
      const modalities = modalitiesOf(entry)
      return {
        id: entry.wireId,
        model: entry.wireId,
        upgrade: null,
        upgradeInfo: null,
        availabilityNux: null,
        displayName: DISPLAY_NAMES[entry.model.id] ?? entry.model.name ?? entry.model.id,
        // Claude's model menu shows names only (no description, no 'Default' badge).
        description: '',
        modelSpecialty: null,
        hidden: false,
        supportedReasoningEfforts: efforts.map((option) => ({ reasoningEffort: option.id, description: option.description ?? option.name ?? option.id })),
        defaultReasoningEffort: defaultEffort,
        inputModalities: modalities.includes('text') ? modalities : ['text', ...modalities],
        supportsPersonality: false,
        multiAgentVersion: null,
        additionalSpeedTiers: [],
        serviceTiers: [],
        defaultServiceTier: null,
        isDefault: entry === preferred,
        // Not part of the Codex shape; lets diagnostics show the Harness route.
        provider: entry.provider.id,
        contextWindow: entry.info?.context?.contextWindow ?? null,
      }
    })
  }
}
