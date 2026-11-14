/**
 * OpenCode 2.x's sign-ins, as Bridge methods (installed on its prototype by index.js; every name ends in V2 and runs only
 * where `this.v2` is set). Credentials are rows of v2's database (here the bridge's own, v2/db.js), never auth.json:
 *
 *   account/read     GET /api/integration (methods, connections — connections[0] is the one in use — and its
 *                    needs_auth status) + GET /api/provider (OpenCode Zen's free tier: settings.apiKey 'public'; keys in
 *                    the user's config). A connection with a needs_auth status is listed but is no account. When the
 *                    integration list fails, GET /api/credential (global, no plugin wait; secrets dropped at once) says
 *                    what is stored, and account/updated follows once the list answers
 *   API key          POST …/:id/connect/key {key} (204: a new active credential, never validated), then the integration's
 *                    older key credentials are deleted (1.x replaced the key)
 *   browser / device POST …/:id/connect/oauth {methodID, answer?} → an attempt {attemptID, url, instructions, mode},
 *                    polled every second (GET …/oauth/:attemptID: pending → complete | failed | expired; a finished
 *                    attempt is gone a minute later: 404). Methods by id (OAUTH_METHODS): ChatGPT is token sharing only
 *                    (the user's choice: no legacy Codex login, which holds port 1455); GitHub Copilot's form needs
 *                    deploymentType. Cancel: DELETE …/oauth/:attemptID. A `code` attempt takes the pasted code (…/complete)
 *   Claude           claude-agent's one method is external (claude-login): connecting only records that Claude Code is
 *                    used; `claude` itself holds the sign-in (v2/claude.js). Checked first here (installed, 2.1.248+,
 *                    `claude auth status` not signed out, serve started with it or restarted now: else an error with
 *                    the steps, at once); then the answer comes back at once (openedByAgent: the app waits, Reopen
 *                    shows the setup page) while connect/external runs, the older credentials are deleted (a new
 *                    connection is the only way to make v2 check again) and the outcome is watched for up to 120 s
 *                    (v2's probe: 30 s to start claude, 30 s more for the context windows): a needs_auth status fails
 *                    it, claude-agent models in GET /api/model with still no status succeed after v2's check had
 *                    35 s, at once when `claude auth status` said signed in (a signed-out claude lists models too)
 *   account/logout   DELETE /api/credential/:id of every credential but connectors' (mcp_*), or of one integration;
 *                    signing out of Claude leaves Claude Code itself signed in (`claude auth logout`)
 *   account/updated  credential.updated / credential.switched / integration.updated / provider.updated, debounced: a
 *                    sign-in made in the TUI, or Claude Code's status changing, reaches the app too
 *
 * Every sign-in starts from GET /api/integration, never GET …/:id: integrations are what a location's plugins register
 * (claude-agent's in plugin/provider/claude-agent/integration.ts, the others' in their provider plugins and the config's
 * providers), the activation runs in its own fiber once the location is loaded (plugin/supervisor.ts), and the list is
 * the one integration route that waits for it (server/src/handlers/integration.ts: integration.list awaits
 * Plugin.awaitActivation; integration.get and connect/key / external / oauth don't). On a location not activated yet —
 * a serve just started or restarted, a location reloaded — …/:id and connect/* answer 404 IntegrationNotFoundError (and
 * connect/oauth a 500 "OAuth method not found") for an integration that is there a moment later (live round 2: the
 * probe's first connect/external). Once the list answered, the location keeps its registrations (location-services.ts:
 * no idle eviction), so the polls after it may ask …/:id.
 */
import { randomUUID } from 'node:crypto'
import { RpcError, INVALID_PARAMS } from '../transport.js'
import { CLAUDE_MIN_VERSION, CLAUDE_SETUP_URL } from './claude.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const route = (id, tail = '') => `/api/integration/${encodeURIComponent(id)}${tail}`
const DEVICE_CODE = /code[:\s]+([A-Z0-9-]{4,})/i

export const CLAUDE_ID = 'claude-agent'
export const CLAUDE_METHOD = 'claude-login'
export const CLAUDE_LABEL = 'Claude (Claude Code login)'
export const CLAUDE_INSTRUCTIONS = 'Run `claude auth login` in a terminal, then wait here.'
export const CLAUDE_TIMEOUT = 'Couldn’t confirm that Claude Code is ready: it may still be checking. Make sure it’s installed and signed in (`claude auth login`), then choose Claude again in a moment.'
export const CLAUDE_LOGOUT_NOTICE = 'Claude Code itself stays signed in: run `claude auth logout` in a terminal to sign out of your Claude account.'
export const ACCOUNT_TIMING = Object.freeze({ claudeWaitMs: 120000, claudeSettleMs: 35000, pollMs: 1000, debounceMs: 250, oauthGraceMs: 30000 })

/**
 * The OAuth method of each sign-in the core descriptor offers (account/login/start codeDesktop.provider), by id: v2 lists
 * an integration's methods in registration order, which says nothing about which is which.
 */
export const OAUTH_METHODS = Object.freeze({
  // Token sharing only: chatgpt-browser (Codex, port 1455) and chatgpt-headless are v2's legacy methods.
  openai: Object.freeze({ browser: 'chatgpt-token-sharing' }),
  poe: Object.freeze({ browser: 'browser' }),
  'github-copilot': Object.freeze({ headless: 'device', answer: Object.freeze({ deploymentType: 'github.com' }) }),
  xai: Object.freeze({ headless: 'device' }),
  opencode: Object.freeze({ headless: 'device' }),
})

/** A connection → 1.x's account/read `auth`: oauth | api | external (new: Claude Code, an AWS profile, gcloud …) | env. */
export function authOfConnection(connection) {
  if (connection?.type === 'env') return 'env'
  if (connection?.type !== 'credential') return null
  return connection.method === 'key' ? 'api' : connection.method === 'oauth' ? 'oauth' : connection.method === 'external' ? 'external' : null
}

/** Whether a form field is asked, given the answers so far (core/src/form.ts isActive: an unanswered reference is false). */
function fieldActive(field, answer) {
  if (!Array.isArray(field?.when)) return true
  return field.when.every((when) => {
    const value = answer[when?.key]
    if (value === undefined) return false
    const hit = Array.isArray(value) ? value.includes(when.value) : value === when.value
    return when.op === 'eq' ? hit : !hit
  })
}

/**
 * A method's Form.Answer from the client's inputs: only its own, active fields (v2 refuses unknown and inactive ones),
 * and a required choice with no default answered with its first option (1.x's select kept its default: Copilot's
 * github.com). `preset` (OAUTH_METHODS answer) goes under the inputs.
 */
export function oauthAnswer(form, inputs = {}, preset = {}) {
  const fields = (Array.isArray(form) ? form : []).filter((field) => isRecord(field) && typeof field.key === 'string' && field.type !== 'external')
  const given = { ...preset, ...inputs }
  const answer = {}
  for (const field of fields) {
    if (given[field.key] !== undefined) answer[field.key] = field.type === 'multiselect' && !Array.isArray(given[field.key]) ? [given[field.key]] : given[field.key]
    else if (field.required && field.default === undefined && Array.isArray(field.options) && field.options.length && fieldActive(field, answer)) {
      answer[field.key] = field.type === 'multiselect' ? [field.options[0].value] : field.options[0].value
    }
  }
  for (const field of fields) if (answer[field.key] !== undefined && !fieldActive(field, answer)) delete answer[field.key]
  return answer
}

/** The OAuth method a sign-in uses: OAUTH_METHODS' id, else (another provider) one named device/headless or not. */
export function oauthMethodFor(integration, headless) {
  const methods = (Array.isArray(integration?.methods) ? integration.methods : []).filter((method) => method?.type === 'oauth' && typeof method.id === 'string')
  const known = OAUTH_METHODS[integration?.id]
  if (known) {
    const id = headless ? known.headless : known.browser
    return id ? methods.find((method) => method.id === id) ?? null : null
  }
  const device = (method) => /headless|device/i.test(`${method.id} ${method.label ?? ''}`)
  return methods.find((method) => device(method) === headless) ?? (headless && methods.length === 1 ? methods[0] : null)
}

/**
 * Wait for a sign-in's outcome: `check()` → {done: true, success, error?} or {done: false}, every pollMs (or sooner,
 * when wake() is called) until timeoutMs. `clock` {now, wait(ms, onWake)} is injectable (tests run it on fake time).
 * @returns {Promise<{ success: boolean, error?: string | null, cancelled?: true, timedOut?: true }>}
 */
export async function watchLogin({ check, timeoutMs, pollMs, signal, clock = realClock, wakes = null }) {
  const start = clock.now()
  for (;;) {
    if (signal?.aborted) return { success: false, cancelled: true }
    let outcome = { done: false }
    try { outcome = await check({ elapsed: clock.now() - start }) } catch (error) { outcome = { done: false, error } }
    if (signal?.aborted) return { success: false, cancelled: true }
    if (outcome.done) return { success: outcome.success === true, error: outcome.error ?? null }
    if (clock.now() - start >= timeoutMs) return { success: false, timedOut: true, error: null }
    await clock.wait(Math.min(pollMs, Math.max(1, timeoutMs - (clock.now() - start))), wakes, signal)
  }
}

/** Timers: wait(ms) ends early on a wake (wakes: a Set the caller's events call) or an abort. */
export const realClock = Object.freeze({
  now: () => Date.now(),
  wait: (ms, wakes, signal) => new Promise((resolve) => {
    let timer = null
    const done = () => { clearTimeout(timer); wakes?.delete(done); signal?.removeEventListener?.('abort', done); resolve() }
    timer = setTimeout(done, ms)
    timer.unref?.()
    wakes?.add(done)
    signal?.addEventListener?.('abort', done, { once: true })
  }),
})

export const ACCOUNT_V2 = {
  accountTimingV2() { return { ...ACCOUNT_TIMING, ...(this.v2.accountTiming ?? {}) } },

  /** The integration list and providers asked for the home folder (account/read, as 1.x's GET /provider). */
  async integrationsV2(api) {
    const home = this.homeDir()
    const [integrations, providers] = await Promise.all([
      api.get('/api/integration', { location: home, locationIn: 'query', timeout: 30000 }),
      api.get('/api/provider', { location: home, locationIn: 'query' }).catch(() => []),
    ])
    if (!Array.isArray(integrations)) throw new Error('GET /api/integration gave no list')
    return { integrations: integrations.filter((entry) => isRecord(entry) && typeof entry.id === 'string'), providers: Array.isArray(providers) ? providers : [] }
  },

  async readAccountV2() {
    let lists = null
    let api = null
    // As on 1.x: a list that fails (the server starting, a config error) says nothing about the sign-in.
    for (let attempt = 0; attempt < 2 && !lists; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 500))
      try { api = await this.v2Api(); lists = await this.integrationsV2(api) } catch (error) { if (attempt) this.log(`account: integration list failed: ${error?.message || error}`) }
    }
    if (!lists) return this.unknownAccountV2(api)
    this.accountRetry = null
    const login = this.flavor.login
    const { integrations, providers } = lists
    const settings = this.config.providers().map((provider) => provider?.route).filter((id) => typeof id === 'string')
    const listed = []
    const integrationIds = new Set(integrations.map((entry) => entry.id))
    for (const integration of integrations) {
      // A connector's own sign-in (MCP OAuth) is no account.
      if (integration.metadata?.source === 'mcp' || integration.id.startsWith('mcp_')) continue
      const connections = Array.isArray(integration.connections) ? integration.connections : []
      const auth = authOfConnection(connections[0])
      if (!auth) continue
      const credentials = connections.filter((connection) => connection?.type === 'credential').length
      const status = connections[0]?.status?.status === 'needs_auth' ? connections[0].status : null
      listed.push({
        id: integration.id, name: integration.name || integration.id, auth, removable: credentials > 0,
        ...(credentials > 1 ? { accounts: credentials } : {}),
        ...(status ? { needsAuth: true, statusMessage: String(status.message ?? ''), statusUrl: typeof status.url === 'string' ? status.url : null } : {}),
      })
    }
    // Providers no connection explains: a Settings › Models one, a key in the user's config, one that needs no key.
    for (const provider of providers) {
      const id = provider?.id
      if (typeof id !== 'string' || listed.some((entry) => entry.id === (provider.integrationID ?? id))) continue
      const key = provider.settings?.apiKey
      const auth = settings.includes(id) ? 'settings'
        : typeof key === 'string' && key.trim() && key !== 'public' ? 'config'
          : !integrationIds.has(provider.integrationID ?? id) ? 'none' : null
      if (auth) listed.push({ id, name: provider.name || id, auth, removable: false })
    }
    const claude = listed.find((entry) => entry.id === CLAUDE_ID)
    if (claude) Object.assign(claude, await this.claudeStateV2(api, claude))
    const zen = providers.find((provider) => provider?.id === 'opencode' && provider.settings?.apiKey === 'public')
    const free = zen && !listed.some((entry) => entry.id === 'opencode') ? zen : null
    const signed = listed.filter((entry) => !entry.needsAuth)
    return {
      account: this.accountOfV2(signed),
      requiresOpenaiAuth: !signed.length && !free,
      [this.flavor.id]: {
        // auth: oauth | api | external (v2's credentials; account/logout removes these), env, settings, config, none.
        // needsAuth: listed, not signed in (Claude Code missing, signed out, too old: statusMessage says which).
        providers: listed,
        canSignOut: listed.some((entry) => entry.removable),
        login: { provider: login.provider, label: login.label, signedIn: signed.some((entry) => entry.id === login.provider) },
        freeTier: free ? { provider: free.id, name: free.name ?? free.id } : null,
        unknown: false,
        engine: this.engineInfoV2(),
      },
    }
  },

  /** Which agent account/read describes: 2.x, its program and version (1.x's has no such field). */
  engineInfoV2() { return { api: 'v2', binary: this.binary, version: this.agentVersion() } },

  /**
   * What the bridge knows of Claude Code beyond v2's status: too old for chats, signed out per `claude auth status`
   * (v2 says nothing while it checks: after a restart until the first chat), still checking (no models yet), billed
   * by an ANTHROPIC_* key, and the account's email and plan.
   */
  async claudeStateV2(api, entry) {
    const claude = this.v2.claude
    const out = {}
    const found = await claude.locate().catch(() => null)
    const [version, status, models] = await Promise.all([
      found ? claude.version(found).catch(() => ({ version: null, tooOld: false })) : { version: null, tooOld: false },
      found ? claude.authStatus({ found }).catch(() => ({ loggedIn: null })) : { loggedIn: null },
      api.get('/api/model', { location: this.homeDir(), locationIn: 'query' }).catch(() => null),
    ])
    if (version.version) out.claudeVersion = version.version
    if (status.email) out.email = status.email
    if (status.subscriptionType) out.plan = status.subscriptionType
    if (!entry.needsAuth) {
      if (version.tooOld) Object.assign(out, { needsAuth: true, statusMessage: `Claude Code ${version.version} is too old; ${CLAUDE_MIN_VERSION} or later is required. Run \`claude update\`.`, statusUrl: null })
      else if (status.loggedIn === false) Object.assign(out, { needsAuth: true, statusMessage: 'Claude Code is not logged in. Run `claude auth login` in a terminal.', statusUrl: null })
      else if (Array.isArray(models) && !models.some((model) => model?.providerID === CLAUDE_ID)) out.checking = true
    }
    const keys = claude.anthropicEnv()
    if (keys.length) {
      out.anthropicEnv = keys
      if (!entry.needsAuth && !out.needsAuth) out.statusMessage = `${keys.join(', ')} ${keys.length > 1 ? 'are' : 'is'} set: Claude Code uses ${keys.includes('ANTHROPIC_BASE_URL') && keys.length === 1 ? 'that gateway' : 'that key'}, billed per token, not your Claude plan.`
    }
    return out
  },

  /**
   * The Codex account for the connections in use: a subscription sign-in (OAuth, or an external one such as Claude
   * Code) is 'chatgpt' with what it signed in to in planType; otherwise a key.
   */
  accountOfV2(signed) {
    if (!signed.length) return null
    const subscriptions = signed.filter((entry) => entry.auth === 'oauth' || entry.auth === 'external')
    if (!subscriptions.length) return { type: 'apiKey' }
    const login = this.flavor.login
    const names = [...new Set(subscriptions.map((entry) => (entry.id === login.provider ? login.label : entry.id === CLAUDE_ID ? CLAUDE_LABEL : entry.name)))]
    return { type: 'chatgpt', email: subscriptions.length === 1 ? subscriptions[0].email ?? null : null, planType: names.join(', ') }
  },

  /**
   * account/read while the integration list fails: GET /api/credential (global, answers before plugins settle) says what
   * is stored; its secrets are dropped at once. Rechecked in the background (account/updated once the list answers).
   */
  async unknownAccountV2(api) {
    let stored = []
    try {
      const entries = await (api ?? this.v2.api)?.credentials() ?? []
      stored = entries.map((entry) => ({ integrationID: entry?.integrationID, type: entry?.value?.type, active: entry?.active === true }))
        .filter((entry) => typeof entry.integrationID === 'string' && !entry.integrationID.startsWith('mcp_'))
    } catch {}
    const login = this.flavor.login
    const byId = new Map()
    for (const entry of stored) if (!byId.has(entry.integrationID) || entry.active) byId.set(entry.integrationID, entry)
    const listed = [...byId.values()].map((entry) => ({
      id: entry.integrationID, name: entry.integrationID === login.provider ? login.label : entry.integrationID,
      auth: entry.type === 'key' ? 'api' : entry.type === 'oauth' ? 'oauth' : 'external', removable: true,
    }))
    if (!this.accountRetry) {
      const retry = this.accountRetry = {}
      void (async () => {
        for (let attempt = 0; attempt < 10 && !this.closed && this.accountRetry === retry; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 15000)).unref?.())
          if (this.closed || this.accountRetry !== retry) return
          try {
            await this.integrationsV2(await this.v2Api())
            if (this.accountRetry === retry) { this.accountRetry = null; this.notify('account/updated', { authMode: null }) }
            return
          } catch {}
        }
        if (this.accountRetry === retry) this.accountRetry = null
      })()
    }
    return {
      account: this.accountOfV2(listed),
      requiresOpenaiAuth: false,
      [this.flavor.id]: {
        providers: listed,
        canSignOut: listed.length > 0,
        login: { provider: login.provider, label: login.label, signedIn: listed.some((entry) => entry.id === login.provider) },
        freeTier: null,
        unknown: true,
        engine: this.engineInfoV2(),
      },
    }
  },

  /**
   * One integration as a sign-in starts, from GET /api/integration (it waits for the home folder's plugins: see the
   * header); null when not listed: not registered here (a config's "plugins" remove op such as "-*" drops every unguarded
   * plugin, claude-agent included: plugin/supervisor.ts resolve, internal.ts guarded), or hidden by a managed policy's
   * integration.connect deny, which would refuse connecting it too.
   */
  async listedIntegrationV2(api, id) {
    const list = await api.get('/api/integration', { location: this.homeDir(), locationIn: 'query', timeout: 30000 })
    return (Array.isArray(list) ? list : []).find((entry) => isRecord(entry) && entry.id === id) ?? null
  },

  /** One integration (404 → null): only after listedIntegrationV2 has let the home folder's plugins run. */
  async integrationV2(api, id) {
    try { return await api.get(route(id), { location: this.homeDir(), locationIn: 'query' }) } catch (error) {
      if (error?.status === 404) return null
      throw error
    }
  },

  /** The credential ids of an integration's connections (optionally of one method). */
  credentialIdsV2(integration, method = null) {
    return (Array.isArray(integration?.connections) ? integration.connections : [])
      .filter((connection) => connection?.type === 'credential' && typeof connection.id === 'string' && (!method || connection.method === method)).map((connection) => connection.id)
  },

  /** Delete credentials, each on its own (204 also for one already gone); failures logged. */
  async deleteCredentialsV2(api, ids) {
    for (const id of ids) await api.delete(`/api/credential/${encodeURIComponent(id)}`).catch((error) => this.log(`delete credential ${id}: ${error?.status ?? ''} ${error?._tag ?? error?.message ?? error}`))
  },

  /** A sign-in finished: what the app reads next is new. */
  signedInV2() {
    this.catalog.invalidate()
    this.notify('account/updated', { authMode: null })
  },

  /** account/login/start on 2.x (`inputs`: codeDesktop.inputs, index.js loginInputs). */
  async loginStartV2(params, inputs = {}) {
    if (params.type === 'apiKey') return this.apiKeyLoginV2(params)
    if (params.type !== 'chatgpt' && params.type !== 'chatgptDeviceCode') throw new RpcError(INVALID_PARAMS, `${this.flavor.name} signs in with a provider's browser sign-in or an API key.`)
    const providerId = typeof params.codeDesktop?.provider === 'string' && params.codeDesktop.provider ? params.codeDesktop.provider : this.flavor.login.provider
    if (providerId === CLAUDE_ID) return this.claudeLoginV2()
    return this.oauthLoginV2(providerId, params.type === 'chatgptDeviceCode', inputs)
  },

  async apiKeyLoginV2(params) {
    const provider = typeof params.codeDesktop?.template === 'string' && params.codeDesktop.template ? params.codeDesktop.template : null
    const key = typeof params.apiKey === 'string' ? params.apiKey.trim() : ''
    if (!provider || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(provider)) throw new RpcError(INVALID_PARAMS, 'Choose which provider the key is for.')
    if (!key) throw new RpcError(INVALID_PARAMS, 'Enter a valid API key.')
    const api = await this.v2Api()
    const integration = await this.listedIntegrationV2(api, provider)
    if (!integration || !integration.methods?.some((method) => method?.type === 'key')) throw new RpcError(INVALID_PARAMS, `${this.flavor.name} has no API key sign-in for ${provider}.`)
    const old = this.credentialIdsV2(integration, 'key')
    try {
      await api.post(route(provider, '/connect/key'), { key }, { location: this.homeDir(), locationIn: 'query' })
    } catch (error) {
      // Never the error's text: a validation error may quote the request, the key with it.
      throw new RpcError(-32000, `${this.flavor.name} didn’t save the key (${error?.status ?? 'no answer'}${error?._tag ? ` ${error._tag}` : ''}).`)
    }
    await this.deleteCredentialsV2(api, old)
    this.signedInV2()
    return { type: 'apiKey' }
  },

  async oauthLoginV2(providerId, headless, inputs) {
    const api = await this.v2Api()
    const integration = await this.listedIntegrationV2(api, providerId)
    if (!integration) throw new RpcError(INVALID_PARAMS, `${this.flavor.name} has no sign-in for ${providerId}.`)
    const method = oauthMethodFor(integration, headless)
    if (!method) {
      throw new RpcError(INVALID_PARAMS, headless
        ? `${integration.name || providerId} has no device-code sign-in in ${this.flavor.name} ${this.agentVersion()}${providerId === 'openai' ? ' (2.x signs in to ChatGPT in the browser only)' : ''}; use the browser sign-in.`
        : `${integration.name || providerId} has no browser sign-in in ${this.flavor.name} ${this.agentVersion()}.`)
    }
    const answer = oauthAnswer(method.form, inputs, OAUTH_METHODS[providerId]?.answer)
    const before = new Set(this.credentialIdsV2(integration))
    const oldOauth = this.credentialIdsV2(integration, 'oauth')
    const attempt = await api.post(route(providerId, '/connect/oauth'), { methodID: method.id, ...(Object.keys(answer).length ? { answer } : {}) }, { location: this.homeDir(), locationIn: 'query' })
    const label = method.label || integration.name || providerId
    const cancelAttempt = () => api.delete(route(providerId, `/connect/oauth/${encodeURIComponent(attempt?.attemptID ?? '')}`), { location: this.homeDir(), locationIn: 'query' }).catch(() => {})
    const url = attempt?.url
    const code = DEVICE_CODE.exec(attempt?.instructions ?? '')?.[1] ?? null
    if (typeof attempt?.attemptID !== 'string' || typeof url !== 'string' || !/^https:/.test(url)) { if (attempt?.attemptID) await cancelAttempt(); throw new RpcError(-32000, `${label} sign-in did not return a sign-in page.`) }
    if (headless && !code) { await cancelAttempt(); throw new RpcError(-32000, `${label} didn’t return a sign-in code.`) }
    const loginId = randomUUID()
    const controller = new AbortController()
    const entry = { controller, provider: providerId, v2: { integrationID: providerId, attemptID: attempt.attemptID, mode: attempt.mode, oldOauth }, done: false }
    this.logins.set(loginId, entry)
    const timing = this.accountTimingV2()
    const expires = Number.isFinite(attempt.time?.expires) && Number.isFinite(attempt.time?.created) ? attempt.time.expires - attempt.time.created : 10 * 60000
    void (async () => {
      const result = await watchLogin({
        signal: controller.signal, pollMs: timing.pollMs, timeoutMs: expires + timing.oauthGraceMs, clock: this.v2.clock ?? realClock,
        check: async () => {
          let status
          try { status = await api.get(route(providerId, `/connect/oauth/${encodeURIComponent(attempt.attemptID)}`), { location: this.homeDir(), locationIn: 'query' }) } catch (error) {
            if (error?.status !== 404) throw error
            // A finished attempt is kept a minute: past it, a new credential is the only trace of a success.
            const now = await this.integrationV2(api, providerId).catch(() => null)
            const added = this.credentialIdsV2(now).some((id) => !before.has(id))
            return { done: true, success: added, error: added ? null : 'The sign-in ended before it finished. Try again.' }
          }
          if (status?.status === 'complete') return { done: true, success: true }
          if (status?.status === 'failed') return { done: true, success: false, error: status.message || 'Sign-in failed.' }
          if (status?.status === 'expired') return { done: true, success: false, error: 'Sign-in timed out.' }
          return { done: false }
        },
      })
      if (result.cancelled) { await cancelAttempt(); return }
      if (entry.done) return
      entry.done = true
      this.logins.delete(loginId)
      // 1.x replaced the provider's sign-in: the new one is active, the older OAuth ones of the integration go.
      if (result.success) await this.deleteCredentialsV2(api, oldOauth)
      this.catalog.invalidate()
      this.notify('account/login/completed', { loginId, success: result.success, error: result.success ? null : result.error ?? 'Sign-in timed out.' })
      if (result.success) this.notify('account/updated', { authMode: null })
    })()
    if (headless) return { type: 'chatgptDeviceCode', loginId, verificationUrl: url, userCode: code }
    return { type: 'chatgpt', loginId, authUrl: url, ...(attempt.mode === 'code' ? { codeDesktop: { acceptsCode: true } } : {}) }
  },

  /** codeDesktop/login/code on 2.x: a `code` attempt's pasted code (POST …/oauth/:attemptID/complete {code}). */
  async loginCodeV2(entry, loginId, code) {
    if (entry.v2?.mode !== 'code') throw new RpcError(INVALID_PARAMS, 'This sign-in finishes in the browser; there is no code to paste.')
    const api = await this.v2Api()
    try {
      await api.post(route(entry.v2.integrationID, `/connect/oauth/${encodeURIComponent(entry.v2.attemptID)}/complete`), { code }, { location: this.homeDir(), locationIn: 'query', timeout: 60000 })
    } catch (failure) {
      throw new RpcError(-32000, 'That code didn’t work. Copy it again from the browser page and paste it here.', { codexErrorInfo: 'loginCodeRejected', detail: `${failure?.status ?? ''} ${failure?._tag ?? ''}`.trim() })
    }
    if (entry.done) return { status: 'completed' }
    entry.done = true
    entry.controller.abort()
    this.logins.delete(loginId)
    // As the watch's own success: the older OAuth sign-ins of the integration go (its abort skips that).
    await this.deleteCredentialsV2(api, entry.v2.oldOauth ?? [])
    this.catalog.invalidate()
    this.notify('account/login/completed', { loginId, success: true, error: null })
    this.notify('account/updated', { authMode: null })
    return { status: 'completed' }
  },

  /**
   * Claude (claude-agent): checked here first, so what can be known now is an error with the steps rather than two
   * minutes of waiting; then connected in the background (see the header).
   */
  async claudeLoginV2() {
    const claude = this.v2.claude
    // It may have been installed since serve started: look again, and hand serve the new path (a restart, when idle;
    // otherwise once the running turns end, and this sign-in is refused: v2 would only say "not installed").
    const found = await claude.locate({ fresh: true })
    if (!found) throw new RpcError(-32000, `Install Claude Code first (${CLAUDE_SETUP_URL}), then run \`claude auth login\` in a terminal.`)
    const version = await claude.version(found)
    if (version.tooOld) throw new RpcError(-32000, `Claude Code ${version.version} is too old; ${CLAUDE_MIN_VERSION} or later is required. Run \`claude update\`.`)
    const status = await claude.authStatus({ fresh: true, found })
    if (status.loggedIn === false) throw new RpcError(-32000, 'Claude Code is not signed in. Run `claude auth login` in a terminal, then choose Claude again.')
    const keys = claude.anthropicEnv()
    if (keys.length) this.log(`claude-agent: ${keys.join(', ')} set: Claude Code bills that, not the Claude plan`)
    let api = await this.v2Api()
    if (this.v2.claudeServed !== found.path) {
      // restartServer's answer can't tell: busy, it reloads the config instead (true when only asks are pending).
      await this.restartServer().catch((error) => this.log(`restart for claude: ${error?.message ?? error}`))
      if (this.v2.claudeServed !== found.path) {
        this.pendingRestart = true
        this.log(`claude-agent: serve runs without ${found.path}; it restarts with it once nothing runs`)
        throw new RpcError(-32000, `Claude Code was installed after ${this.flavor.name} started, and ${this.flavor.name} restarts to use it once no chat is running. Finish or stop the running chats, then choose Claude again.`)
      }
      api = await this.v2Api()
    }
    const integration = await this.listedIntegrationV2(api, CLAUDE_ID)
    if (!integration || !integration.methods?.some((method) => method?.id === CLAUDE_METHOD)) {
      throw new RpcError(-32000, `${this.flavor.name} ${this.agentVersion()} can’t use Claude Code here: its claude-agent provider is missing or turned off (removed by a "plugins" entry such as "-*" or "-opencode.provider.claude-agent" in an OpenCode config, or denied by an integration.connect policy).`)
    }
    const old = this.credentialIdsV2(integration)
    const loginId = randomUUID()
    const controller = new AbortController()
    const entry = { controller, provider: CLAUDE_ID, done: false }
    this.logins.set(loginId, entry)
    void this.claudeConnectV2(api, { loginId, entry, old, signedIn: status.loggedIn === true })
    return {
      type: 'chatgpt', loginId, authUrl: CLAUDE_SETUP_URL,
      codeDesktop: { openedByAgent: true, instructions: keys.length ? `${CLAUDE_INSTRUCTIONS} (${keys.join(', ')} is set: Claude Code bills that, not your Claude plan.)` : CLAUDE_INSTRUCTIONS },
    }
  },

  /** connect/external, the old credentials deleted, then the outcome watched (claudeCheckV2). */
  async claudeConnectV2(api, { loginId, entry, old, signedIn }) {
    const timing = this.accountTimingV2()
    const home = this.homeDir()
    const finish = (success, error) => {
      if (entry.done || entry.controller.signal.aborted) return
      entry.done = true
      this.logins.delete(loginId)
      this.catalog.invalidate()
      this.notify('account/login/completed', { loginId, success, error: success ? null : error })
      // A failure keeps the new connection (as v2's desktop does): account/read shows it signed out, with why.
      this.notify('account/updated', { authMode: null })
    }
    try {
      await api.post(route(CLAUDE_ID, '/connect/external'), { methodID: CLAUDE_METHOD }, { location: home, locationIn: 'query' })
      await this.deleteCredentialsV2(api, old)
    } catch (error) {
      return finish(false, `${this.flavor.name} couldn’t connect Claude Code (${error?.status ?? 'no answer'}${error?._tag ? ` ${error._tag}` : ''}${error?.body?.message ? `: ${String(error.body.message).slice(0, 200)}` : ''}).`)
    }
    const wakes = (this.v2.accountWakes ??= new Set())
    const result = await watchLogin({
      signal: entry.controller.signal, pollMs: timing.pollMs, timeoutMs: timing.claudeWaitMs, clock: this.v2.clock ?? realClock, wakes,
      check: ({ elapsed }) => this.claudeCheckV2(api, { signedIn, elapsed, settleMs: timing.claudeSettleMs }),
    })
    if (result.cancelled) return
    finish(result.success, result.timedOut ? CLAUDE_TIMEOUT : result.error)
  },

  /**
   * One look at a Claude connection: a needs_auth status fails it; claude-agent models with still no status succeed.
   * Models alone prove nothing yet: v2 lists the catalog it saved last as soon as there is a connection, before its probe
   * ran (30–60 s). Unless `claude auth status` said signed in, v2's own check gets settleMs to report a problem first.
   */
  async claudeCheckV2(api, { signedIn, elapsed, settleMs }) {
    const home = this.homeDir()
    const problem = (integration) => {
      const connection = integration?.connections?.[0]
      if (!connection || connection.type !== 'credential') return 'The Claude Code connection was removed.'
      return connection.status?.status === 'needs_auth' ? String(connection.status.message || 'Claude Code needs a sign-in.') : null
    }
    const first = problem(await this.integrationV2(api, CLAUDE_ID))
    if (first) return { done: true, success: false, error: first }
    const models = await api.get('/api/model', { location: home, locationIn: 'query' })
    if (!Array.isArray(models) || !models.some((model) => model?.providerID === CLAUDE_ID)) return { done: false }
    if (!signedIn && elapsed < settleMs) return { done: false }
    // A signed-out claude lists its models too, and its status comes in a separate event: read it once more.
    const again = problem(await this.integrationV2(api, CLAUDE_ID))
    return again ? { done: true, success: false, error: again } : { done: true, success: true }
  },

  /**
   * account/logout on 2.x: the credentials of one integration (codeDesktop.provider) or all of them but connectors'.
   * Nothing to remove: where the credential lives instead (signOutElsewhere, by the caller).
   * @returns {Promise<{ removed: string[], notice?: string }>}
   */
  async logoutV2(provider) {
    const api = await this.v2Api()
    const credentials = (await api.credentials()).map((entry) => ({ id: entry?.id, integrationID: entry?.integrationID }))
      .filter((entry) => typeof entry.id === 'string' && typeof entry.integrationID === 'string' && !entry.integrationID.startsWith('mcp_'))
      .filter((entry) => !provider || entry.integrationID === provider)
    if (!credentials.length) return { removed: [] }
    await this.deleteCredentialsV2(api, credentials.map((entry) => entry.id))
    this.catalog.invalidate()
    this.notify('account/updated', { authMode: null })
    const removed = [...new Set(credentials.map((entry) => entry.integrationID))]
    if (removed.includes(CLAUDE_ID)) this.log(`claude-agent signed out here; ${CLAUDE_LOGOUT_NOTICE}`)
    return { removed, ...(removed.includes(CLAUDE_ID) ? { notice: CLAUDE_LOGOUT_NOTICE } : {}) }
  },

  /** A sign-in event (credential.*, integration.updated, provider.updated, model.updated): one account/updated a burst. */
  accountEventV2(event) {
    for (const wake of [...(this.v2.accountWakes ?? [])]) wake()
    if (event.type === 'model.updated' || event.type === 'models-dev.refreshed') return
    // integration.updated and provider.updated are per folder: only the home folder's describe the account.
    if (event.directory && event.directory !== this.homeDir() && event.type !== 'credential.updated' && event.type !== 'credential.switched') return
    clearTimeout(this.v2.accountTimer)
    this.v2.accountTimer = setTimeout(() => { this.v2.accountTimer = null; if (!this.closed) this.notify('account/updated', { authMode: null }) }, this.accountTimingV2().debounceMs)
    this.v2.accountTimer.unref?.()
  },
}
