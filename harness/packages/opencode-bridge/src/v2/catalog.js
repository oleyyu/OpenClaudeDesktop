/**
 * OpenCode 2.x's model catalog → the 1.x catalog shape models.js reads (ModelCatalog: codexModels, defaultId, entry):
 *
 *   GET /api/model           Model.Info[] (chat models of the available providers, enabled ones; location-scoped):
 *                            {id, providerID, name, variants[{id}], capabilities{input: string[]}, limit{context},
 *                            cost[] ([] = free or unknown), status}
 *   GET /api/model/default   the model a session with none runs (the configured one, else the first usable), or
 *                            nothing: defaultId's choice before the bridge's own ranking
 *   GET /api/provider        the providers' names; OpenCode Zen's free tier is settings.apiKey 'public'
 *
 * The wire id stays "<providerID>/<id>" (id is the catalog key, not modelID); efforts are 'default' + the variants' ids.
 * Every list is asked for the home folder, as 1.x's model/list was.
 */
import { ModelCatalog, wireId } from '../models.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const isModel = (value) => isRecord(value) && typeof value.id === 'string' && typeof value.providerID === 'string'

/** A Model.Info → the 1.x catalog model ({variants: {[id]: {}}, capabilities.input {image, pdf}, cost {input}}). */
export function v1Model(model) {
  const input = Array.isArray(model.capabilities?.input) ? model.capabilities.input : []
  const cost = Array.isArray(model.cost) ? model.cost : []
  return {
    id: model.id, name: model.name || model.id, status: model.status,
    variants: Object.fromEntries((Array.isArray(model.variants) ? model.variants : []).filter((variant) => typeof variant?.id === 'string').map((variant) => [variant.id, {}])),
    capabilities: { ...model.capabilities, input: { text: input.includes('text'), image: input.includes('image'), pdf: input.includes('pdf') } },
    limit: isRecord(model.limit) ? model.limit : {},
    // Free, or no price known (cost []): models.js reads cost.input 0 as a free tier.
    cost: { input: cost.length ? cost[0]?.input ?? 0 : 0 },
  }
}

/** Model.Info[] + Provider.Info[] → {providers: [{id, name, settings, models: {[id]: model}}], default: {}}. */
export function v1Providers(models, providers) {
  const byId = new Map()
  for (const provider of Array.isArray(providers) ? providers : []) {
    if (typeof provider?.id === 'string') byId.set(provider.id, { id: provider.id, name: provider.name ?? provider.id, settings: provider.settings, models: {} })
  }
  for (const model of Array.isArray(models) ? models : []) {
    if (!isModel(model) || model.enabled === false) continue
    if (!byId.has(model.providerID)) byId.set(model.providerID, { id: model.providerID, name: model.providerID, models: {} })
    byId.get(model.providerID).models[model.id] = v1Model(model)
  }
  return { providers: [...byId.values()].filter((provider) => Object.keys(provider.models).length), default: {} }
}

/** OpenCode Zen signed out (its key 'public') is a free tier; every other listed provider is usable. */
export const providerRankV2 = (provider) => (provider?.id === 'opencode' && provider.settings?.apiKey === 'public' ? 1 : 0)

export class CatalogV2 extends ModelCatalog {
  /**
   * @param {() => Promise<import('./api.js').V2Api>} api - the started server's V2Api
   * @param {{ location: () => string }} options - the folder the lists are asked for
   */
  constructor(api, { location }) {
    super(() => this.fetchV2(), { rank: providerRankV2 })
    this.api = api
    this.location = location
    this.serverDefault = null
  }

  async fetchV2() {
    const api = await this.api()
    const location = this.location()
    const [models, providers, fallback] = await Promise.all([
      api.get('/api/model', { location }),
      api.get('/api/provider', { location }).catch(() => []),
      api.get('/api/model/default', { location }).catch(() => null),
    ])
    // No default model is {location} alone (data undefined): not a Model.Info.
    this.serverDefault = isModel(fallback) ? wireId(fallback.providerID, fallback.id) : null
    return v1Providers(models, providers)
  }

  /** The configured model when listed, else OpenCode's own default (GET /api/model/default), else models.js's ranking. */
  async defaultId(configured) {
    const { entries } = await this.load()
    if (typeof configured === 'string' && entries.some((entry) => entry.id === configured)) return configured
    if (this.serverDefault && entries.some((entry) => entry.id === this.serverDefault)) return this.serverDefault
    return super.defaultId(configured)
  }
}
