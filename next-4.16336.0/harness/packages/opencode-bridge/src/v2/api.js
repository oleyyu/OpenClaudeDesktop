/**
 * OpenCode 2.x's HTTP API over AgentServerV2.request (packages/protocol/openapi.json is the contract):
 *
 *   bodies     most answers are {data}; lists {data, cursor:{previous?, next?}}; location-scoped routes
 *              {location, data}; a few are bare (GET /api/info, POST …/interrupt {interrupted}, GET /api/config's
 *              array); many writes are 204 (null here)
 *   location   location-scoped routes (agent, model, provider, integration, config, mcp, plugin, skill, command, …)
 *              name their folder in x-opencode-directory (encodeURIComponent) or ?location[directory]=;
 *              /api/session/:id/* resolve it from the session; POST /api/session takes body.location
 *   errors     {_tag, message, …} (AgentHttpError.status/_tag/body); 503 ServiceUnavailableError{service:"plugin"}
 *              (a location's plugins took over 5 s to activate) is retried after 250 ms, 500 ms, 1 s, 2 s
 *   paging     a non-empty page always has cursor.next: the list ends at a page shorter than the limit. A cursor
 *              carries the first page's filters and order, so later pages send only cursor and limit (message lists
 *              answer 400 to cursor + order)
 *
 * Never sends ?types= (a type this version doesn't know fails the whole request) or a body key the route's schema
 * lacks (additionalProperties: false).
 */

const RETRY_DELAYS_MS = [250, 500, 1000, 2000]
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const ENVELOPE_KEYS = new Set(['data', 'cursor', 'location'])

/** The payload of a v2 answer: {data} / {data, cursor} / {location, data} → data; bare bodies and arrays as they are; 204 → null. */
export function unwrap(body) {
  if (body === null || body === undefined || body === '') return null
  if (Array.isArray(body) || !isRecord(body)) return body
  if (Object.hasOwn(body, 'data') && Object.keys(body).every((key) => ENVELOPE_KEYS.has(key))) return body.data
  return body
}

/** Whether a failed request is v2's "plugins still activating" 503, worth a retry. */
export function pluginUnavailable(error) {
  return error?.status === 503 && (error?._tag ?? error?.body?._tag) === 'ServiceUnavailableError' && error?.body?.service === 'plugin'
}

export class V2Api {
  /**
   * @param {{ request: (method: string, path: string, options?: object) => Promise<any> }} server - an AgentServerV2
   * @param {{ log?: (line: string) => void, sleep?: (ms: number) => Promise<void>, retryDelays?: number[] }} [options]
   */
  constructor(server, { log = () => {}, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), retryDelays = RETRY_DELAYS_MS } = {}) {
    this.server = server
    this.log = log
    this.sleep = sleep
    this.retryDelays = retryDelays
  }

  /**
   * One request. `location` scopes a location route to a folder (in the header, or with locationIn:'query' the
   * deepObject query); `raw` returns the whole body (cursor, location) instead of its data.
   */
  async request(method, path, { location, locationIn = 'header', query, body, signal, timeout, raw = false } = {}) {
    const headers = {}
    const params = { ...(query ?? {}) }
    if (location) {
      if (locationIn === 'query') params.location = { directory: location }
      else headers['x-opencode-directory'] = encodeURIComponent(location)
    }
    for (let attempt = 0; ; attempt++) {
      try {
        const answer = await this.server.request(method, path, { query: params, headers, body, signal, ...(timeout ? { timeout } : {}) })
        return raw ? answer : unwrap(answer)
      } catch (error) {
        if (!pluginUnavailable(error) || attempt >= this.retryDelays.length || signal?.aborted) throw error
        this.log(`${method} ${path}: plugins still activating, retry ${attempt + 1}`)
        await this.sleep(this.retryDelays[attempt])
      }
    }
  }

  get(path, options) { return this.request('GET', path, options) }
  post(path, body, options = {}) { return this.request('POST', path, { ...options, body }) }
  patch(path, body, options = {}) { return this.request('PATCH', path, { ...options, body }) }
  put(path, body, options = {}) { return this.request('PUT', path, { ...options, body }) }
  delete(path, options) { return this.request('DELETE', path, options) }

  /**
   * One page of a cursor list: the first with the filters (and order), a later one with only its cursor.
   * @returns {Promise<{ data: any[], next: string | null }>}
   */
  async page(path, { query = {}, limit, cursor = null, location, signal } = {}) {
    const params = cursor ? { cursor, ...(limit ? { limit } : {}) } : { ...query, ...(limit ? { limit } : {}) }
    const body = await this.request('GET', path, { query: params, location, signal, raw: true })
    const data = Array.isArray(body?.data) ? body.data : []
    const next = typeof body?.cursor?.next === 'string' && body.cursor.next ? body.cursor.next : null
    return { data, next }
  }

  /** Every item of a cursor list, page by page, until a short page (or maxPages). */
  async all(path, { query = {}, limit = 200, maxPages = 1000, location, signal } = {}) {
    const out = []
    let cursor = null
    for (let pages = 0; pages < maxPages; pages++) {
      const page = await this.page(path, { query, limit, cursor, location, signal })
      out.push(...page.data)
      if (page.data.length < limit || !page.next || page.next === cursor) break
      cursor = page.next
    }
    return out
  }

  // ---------------------------------------------------------------- server

  /** GET /api/info: {version, pid, hostname?, urls, paths:{tmp}, capabilities?} (bare). */
  info() { return this.get('/api/info') }

  // ---------------------------------------------------------------- sessions

  /**
   * Sessions newest first. parentID null lists root sessions; `archived` is three-state in v2 (true: only archived,
   * false: none, undefined: both), so it is left out unless asked for.
   */
  sessions({ directory, parentID, search, archived, limit = 200, maxPages } = {}) {
    return this.all('/api/session', { query: { directory, parentID, search, ...(archived === undefined ? {} : { archived: archived ? 'true' : 'false' }) }, limit, maxPages })
  }

  /** POST /api/session: one request with everything (location, agent, model, permissions, metadata). */
  createSession({ directory, ...input } = {}) {
    return this.post('/api/session', { ...input, ...(directory ? { location: { directory } } : {}) })
  }

  session(id) { return this.get(`/api/session/${encodeURIComponent(id)}`) }

  /** GET /api/session/active: {[sessionID]: {type:'running'}} for the sessions this server process drains. */
  async active() {
    const data = await this.get('/api/session/active')
    return isRecord(data) ? data : {}
  }

  /** POST /api/session/:id/interrupt → whether something was running. */
  async interrupt(id, { resume = false } = {}) {
    const body = await this.post(`/api/session/${encodeURIComponent(id)}/interrupt`, undefined, { query: { resume: resume ? 'true' : 'false' } })
    return body?.interrupted === true
  }

  // ---------------------------------------------------------------- credentials (global, no location)

  /** Every stored credential, secrets included: read what is needed and drop the rest. */
  async credentials() {
    const data = await this.get('/api/credential')
    return Array.isArray(data) ? data : []
  }

  /** POST /api/credential {integrationID, value, label?, activate?, id?} → the Credential.Entry. */
  createCredential({ integrationID, value, label, activate, id }) {
    return this.post('/api/credential', { integrationID, value, ...(label ? { label } : {}), ...(activate === undefined ? {} : { activate }), ...(id ? { id } : {}) })
  }
}
