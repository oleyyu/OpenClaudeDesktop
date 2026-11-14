// An in-process OpenCode 2.2.5 server for the v2 bridge tests: `fake.fetch` is handed to AgentServerV2 (no listen(),
// no child process). It checks what a real server checks first (Basic auth with the fixed user `opencode`, the route
// contract of v2/openapi-routes.json) and answers like v2 does: {data} / {data, cursor} / {location, data} bodies,
// {_tag, message} errors, an empty 404 for unknown /api paths.
//
// Routes so far: GET /api/info, GET /api/event (a stream the test feeds), GET/POST /api/session, GET
// /api/session/active, GET /api/session/:id, GET /api/session/:id/message, POST /api/session/:id/interrupt, GET/POST
// /api/credential, and the location-scoped GET /api/agent (can be made to answer the plugin 503), /api/model,
// /api/model/default, /api/provider. Session list semantics are copied from v2 (core/src/session.ts list,
// session/store.ts list): newest time.updated first (id breaks ties), parentID=null roots, archived three-state,
// `search` as SQL LIKE '%search%' on the title, a cursor that carries the first page's filters (filters sent with it
// are ignored), and cursor.next on every non-empty page. Message list semantics are server/src/handlers/message.ts +
// SessionStore.messages: seq order (the order addMessages appended them), desc unless asked, limit 1..200 (default
// 50), a cursor {id, order, direction} that carries the order (cursor + order is a 400), cursor.next on every
// non-empty page, an unknown session a 404.
//
// Turn routes (phase 5): POST /api/session/:id/prompt, /compact (an inbox item each, its session.inbox.enqueued event
// sent before the answer, as session/inbox.ts admit publishes it; a repeated id answers the first item, as
// admission.reconcile does), /command (204: what it enqueues is `commands[name]`'s choice — 'prompt' the expanded
// text, 'subtask' a child session and nothing here, 'none' nothing; unknown names 404 CommandNotFoundError), /agent and
// /model (204, session.agent.selected / session.model.selected), PATCH (204), GET / DELETE …/inbox[/:id], …/interrupt,
// …/fork {before}, …/revert/stage (409 while active) and …/revert/commit, …/generate, DELETE /api/session/:id, the
// open permission and form lists (empty), GET /api/config (bare entries), /api/skill, /api/reference, /api/agent/:id.
// `deliver(sessionID, inboxID)` moves a pending item into the transcript and sends session.inbox.delivered.
//
// Approvals and forms (phase 6), as core/src/permission.ts and form.ts keep them (in memory): `ask(request)` and
// `form(info)` open one and publish permission.asked / form.created; the session lists show what is open; a reply needs
// the owning session in the path (404 PermissionNotFoundError otherwise); a reject publishes permission.replied for it
// and then rejects every other open ask of the same session with the same message (a replied each); a form answer must
// be a string for a single field and a list for a multiselect (400 FormInvalidAnswerError); DELETE …/form/:id cancels
// (form.cancelled), sessionID "global" included; an interrupt drops the session's asks with no event (permission.ts
// assert's ensuring) and cancels its forms (form.cancelled). `state.replies` / `state.formReplies` /
// `state.formCancels` record what came in.
//
// Sign-ins (phase 7), as core/src/integration.ts and credential.ts keep them: `state.integrations` [{id, name, methods,
// metadata?, env?: names set in serve's env}] list their connections from `state.credentials` (the active one first, then
// env), with `state.statuses` (credential id → {status:'needs_auth', message, url?}, `setStatus`); connect/key and
// connect/external add an active credential labelled <name>, <name> 2 … (credential.updated, credential.switched, then
// provider.updated per folder asked so far, as core/src/provider.ts does; integration.updated only from `setStatus`;
// `state.onExternal(integrationID, entry)` runs after an external one); connect/oauth checks the answer
// like core/src/form.ts validateAnswer and opens an attempt (a method's `attempt` {url, instructions, mode} or a default),
// settled by `settle(attemptID, status, message?)` (complete adds an OAuth credential first); a cancelled or `forget`
// attempt is a 404; …/complete takes a code attempt's code (`state.onCode(attempt, code)` → true settles it complete);
// DELETE /api/credential/:id promotes the newest left (credential.switched). `state.failIntegrationList` answers the
// list with a 500 that many times.
//
// Extensions (phase 8): GET /api/mcp (`state.mcp`: Mcp.Server[]), POST /api/experimental/mcp/:server/connect (recorded in
// `state.mcpConnects`), GET /api/plugin (`state.plugins`: Plugin.Info[], or a function of the folder), GET /api/skill
// (`state.skills`), GET /api/command (`state.commandList`: Command.Info[]), DELETE /api/debug/location (recorded in
// `state.locationReloads`), GET /api/config (`state.configEntries`, or a function of the folder), and GET
// /api/experimental/session/stats computed as core/src/session/stats.ts does: user and assistant messages only, a fork's
// messages from before its creation left out, prompts of root sessions, tokens and cost of assistant steps. An MCP
// sign-in is an integration in `state.integrations` (mcp_<hex>, one OAuth method of the same id).
//
// Wrap-up (phase 9): POST /api/session/:id/move {directory} as core/src/session/move.ts runs it on an idle session (a
// missing or non-folder destination a 400 InvalidRequestError; otherwise execution.started, inbox.delivered,
// session.moved with the new location, execution.succeeded; `state.moveLater` leaves a 'move' item waiting in the inbox
// instead, as a busy session does: `deliver` hands it over, DELETE …/inbox/:id cancels it — 204 for one already gone).
//
// Live round 1: a location evicted by DELETE /api/debug/location comes back without its plugins run (`state.
// coldLocations`): GET /api/skill and /api/command don't await them (server/src/handlers/skill.ts, command.ts) and
// answer [] until a route that does (GET /api/agent, /api/model, /api/model/default, /api/provider: awaitPlugins) has
// let the activation finish (the first such request waits for all of it: plugin/supervisor.ts holds the latch while the
// location's layer is built, before the activation is forked). configModelsV2, availableSkillsV2 and skillGuidanceV2 port what v2
// makes of a config `providers` overlay, of a session's skill rules and of a skill list change (see each).
//
// Live round 2: every location starts with its plugins not run (`state.activated`: the folders an awaitPlugins route
// has answered for since the serve started; `restart()` empties it, as a new serve process does, and DELETE
// /api/debug/location takes the folder out). GET /api/plugin (the resolved inventory, `state.plugins` null) lists []
// for such a folder, as v2's does before the location's first activation is done; GET /api/skill and /api/command
// still empty only for `state.coldLocations`. Integrations are plugin registrations (claude-agent's in
// plugin/provider/claude-agent/integration.ts, the providers' in theirs), and GET /api/integration is the one
// integration route that waits for the activation (server/src/handlers/integration.ts: integration.list awaits
// Plugin.awaitActivation), so it activates the folder like the awaitPlugins routes; before that, GET
// /api/integration/:id and connect/key / connect/external answer 404 IntegrationNotFoundError, and connect/oauth a 500
// (core/src/integration.ts connectOAuth dies with "OAuth method not found"; that handler checks no integration first).
// An MCP server's integration (mcp_<hex>, metadata.source 'mcp') is exempt: mcp/index.ts registers it with the server
// entry GET /api/mcp lists. The registration itself has one config condition, modelled for claude-agent: a `plugins`
// remove op that selects opencode.provider.claude-agent ("-*", "-opencode.*", the id) in the folder's config entries
// (`state.configEntries`, `state.content`, `state.managedEntries`, as GET /api/plugin resolves them) drops the plugin
// (plugin/supervisor.ts resolve; internal.ts guards only opencode.provider.opencode and opencode.config.policy), so the
// list leaves claude-agent out and GET …/:id and connect answer 404 even once the folder's plugins ran.
import fs from 'node:fs'
import { contractViolations, matchRoute } from './v2-contract.mjs'
import { ClaudeCode } from '../../packages/opencode-bridge/src/v2/claude.js'

/**
 * A Claude Code that is nowhere: no login shell run, no file of this machine looked at. A v2 Bridge's server start
 * looks claude up (index.js startServerV2): `bridge.v2.claude = noClaude()` keeps a test off the real machine.
 */
export const noClaude = (env = {}) => new ClaudeCode({
  env, executable: () => false,
  exec: (command, args, options, callback) => setImmediate(() => callback(Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }), '', '')),
})

const json = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
const noContent = () => new Response(null, { status: 204 })
const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const unbase64url = (value) => { try { return JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8')) } catch { return null } }

// SQLite's LIKE: % any run, _ any one character, case-insensitive for ASCII letters only (no ESCAPE clause).
const asciiLower = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase())
const sqlLike = (value, pattern) => new RegExp(`^${[...asciiLower(pattern)].map((char) => char === '%' ? '[\\s\\S]*' : char === '_' ? '[\\s\\S]' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}$`, 'u').test(asciiLower(value))

let ids = 0
const nextId = (prefix) => `${prefix}_${String(Date.now()).padStart(13, '0')}${String(++ids).padStart(6, '0')}`

export function createV2Fake({ password = null, version = '2.2.5', cwd = '/tmp', connectedFirst = true } = {}) {
  const state = {
    password,
    sessions: [],
    /** session id → its messages in seq order (addMessages). */
    messages: new Map(),
    agents: [{ id: 'build', name: 'Build', mode: 'primary' }],
    models: [],
    providers: [],
    defaultModel: null,
    credentials: [],
    active: new Set(),
    requests: [],
    violations: [],
    pluginFailures: 0,
    /** session id → its inbox items not yet delivered (Session.Inbox.Info). */
    inbox: new Map(),
    /** command name → 'prompt' | 'subtask' | 'none' (POST …/command). */
    commands: { review: 'prompt' },
    configEntries: [],
    generated: 'The answer.',
    reverts: [],
    moves: [],
    moveLater: false,
    /** permission id → its open Permission.Request; form id → its open Form.Info. */
    asks: new Map(),
    forms: new Map(),
    replies: [],
    formReplies: [],
    formCancels: [],
    streams: new Set(),
    clock: 1_700_000_000_000,
    integrations: [],
    statuses: new Map(),
    attempts: new Map(),
    onExternal: null,
    onCode: null,
    failIntegrationList: 0,
    /** Every folder a request was for: the locations v2 would have loaded (provider.updated goes to each). */
    loaded: new Set(),
    mcp: [],
    mcpConnects: [],
    /** Plugin.Info[] or a function of the folder; null: the inventory v2 resolves (resolvePluginsV2) from the config. */
    plugins: null,
    /** OPENCODE_CONFIG_CONTENT's document (`serve(env)` reads it from serve's environment). */
    content: null,
    /** Managed settings documents (the system folder, MDM): they load after OPENCODE_CONFIG_CONTENT. */
    managedEntries: [],
    /** A directory entry's {plugin,plugins} folder contents: directory path → [{target, id?}] (source.ts discovers them). */
    pluginFolders: {},
    /** What a configured target loads as: target → {id} | {error} (default id: an npm name, a folder's base name). */
    pluginModules: {},
    skills: [],
    commandList: [{ name: 'init', description: 'guided AGENTS.md setup' }, { name: 'review', description: 'review changes [commit|branch|pr], defaults to uncommitted' }],
    locationReloads: [],
    /** folders reloaded by DELETE /api/debug/location whose plugins no awaitPlugins request has run yet */
    coldLocations: new Set(),
    /** folders whose plugins have run since serve started (an awaitPlugins route or GET /api/integration answered) */
    activated: new Set(),
  }
  const tick = () => ++state.clock

  const location = (request) => {
    const query = new URL(request.url).searchParams.get('location[directory]')
    const header = request.headers.get('x-opencode-directory')
    const directory = query || (header ? decodeURIComponent(header) : cwd)
    state.loaded.add(directory)
    return directory
  }

  function makeSession(input = {}) {
    const parent = input.parentID ? state.sessions.find((info) => info.id === input.parentID) : null
    if (input.parentID && !parent) return null
    const now = tick()
    const info = {
      id: input.id ?? nextId('ses'),
      ...(parent ? { parentID: parent.id } : {}),
      projectID: 'prj_fake',
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: now, updated: now, ...(input.archived ? { archived: now } : {}) },
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.agent ? { agent: input.agent } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      // A child session inherits its parent's permissions and metadata (core/src/session.ts create).
      ...(input.permissions ?? parent?.permissions ? { permissions: input.permissions ?? parent.permissions } : {}),
      location: parent ? { ...parent.location } : { directory: input.location?.directory ?? cwd },
    }
    state.sessions.push(info)
    return info
  }

  /** core/src/session.ts Session.list + session/store.ts SessionStore.list. */
  function listSessions(query) {
    let filter
    if (query.has('cursor')) {
      filter = unbase64url(query.get('cursor'))
      if (!filter?.anchor) return json(400, { _tag: 'InvalidCursorError', message: 'Invalid cursor' })
    } else {
      filter = {}
      for (const key of ['order', 'search', 'directory', 'project', 'subpath']) if (query.has(key)) filter[key] = query.get(key)
      if (query.has('parentID')) filter.parentID = query.get('parentID') === 'null' ? null : query.get('parentID')
      if (query.has('archived')) {
        const value = query.get('archived')
        if (value !== 'true' && value !== 'false') return json(400, { _tag: 'InvalidRequestError', message: 'Invalid archived', kind: 'Query' })
        filter.archived = value === 'true'
      }
    }
    const limit = query.has('limit') ? Number(query.get('limit')) : 50
    if (!Number.isInteger(limit) || limit <= 0) return json(400, { _tag: 'InvalidRequestError', message: 'Invalid limit', kind: 'Query' })
    const direction = filter.anchor?.direction ?? 'next'
    const requested = filter.order ?? 'desc'
    const order = direction === 'previous' ? (requested === 'asc' ? 'desc' : 'asc') : requested
    const compare = (a, b) => (a.time.updated - b.time.updated) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    let rows = state.sessions.filter((info) => {
      if ('directory' in filter && info.location.directory !== filter.directory) return false
      if (filter.search && !sqlLike(info.title ?? '', `%${filter.search}%`)) return false
      if (filter.parentID !== undefined && (filter.parentID === null ? info.parentID !== undefined : info.parentID !== filter.parentID)) return false
      if (filter.archived !== undefined && (filter.archived ? info.time.archived === undefined : info.time.archived !== undefined)) return false
      if (filter.anchor) {
        const anchor = { id: filter.anchor.id, time: { updated: filter.anchor.time } }
        return order === 'asc' ? compare(info, anchor) > 0 : compare(info, anchor) < 0
      }
      return true
    }).sort((a, b) => (order === 'asc' ? compare(a, b) : compare(b, a))).slice(0, limit)
    if (direction === 'previous') rows = rows.reverse()
    const { anchor: _anchor, ...kept } = filter
    const first = rows[0]
    const last = rows.at(-1)
    return json(200, {
      data: rows,
      cursor: {
        ...(first ? { previous: base64url({ ...kept, anchor: { id: first.id, time: first.time.updated, direction: 'previous' } }) } : {}),
        ...(last ? { next: base64url({ ...kept, anchor: { id: last.id, time: last.time.updated, direction: 'next' } }) } : {}),
      },
    })
  }

  /** server/src/handlers/message.ts session.messages over SessionStore.messages. */
  function listMessages(sessionID, query) {
    if (!state.sessions.some((info) => info.id === sessionID)) return json(404, { _tag: 'SessionNotFoundError', message: `Session not found: ${sessionID}`, sessionID })
    if (query.has('cursor') && query.has('order')) return json(400, { _tag: 'InvalidCursorError', message: 'Cursor cannot be combined with order' })
    const decoded = query.has('cursor') ? unbase64url(query.get('cursor')) : null
    if (query.has('cursor') && !decoded?.id) return json(400, { _tag: 'InvalidCursorError', message: 'Invalid cursor' })
    const limit = query.has('limit') ? Number(query.get('limit')) : 50
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) return json(400, { _tag: 'InvalidRequestError', message: 'Invalid limit', kind: 'Query' })
    const order = decoded?.order ?? query.get('order') ?? 'desc'
    const direction = decoded?.direction ?? 'next'
    const sorted = direction === 'previous' ? (order === 'asc' ? 'desc' : 'asc') : order
    const all = (state.messages.get(sessionID) ?? []).filter((message) => !query.has('type') || message.type === query.get('type'))
    const seq = new Map(all.map((message, index) => [message.id, index]))
    if (decoded && !seq.has(decoded.id)) return json(200, { data: [], cursor: {} })
    let rows = all.filter((message) => !decoded || (sorted === 'asc' ? seq.get(message.id) > seq.get(decoded.id) : seq.get(message.id) < seq.get(decoded.id)))
    if (sorted === 'desc') rows = rows.reverse()
    rows = rows.slice(0, limit)
    if (direction === 'previous') rows = rows.reverse()
    const encode = (message, dir) => base64url({ id: message.id, order, direction: dir })
    return json(200, { data: rows, cursor: { ...(rows[0] ? { previous: encode(rows[0], 'previous') } : {}), ...(rows.at(-1) ? { next: encode(rows.at(-1), 'next') } : {}) } })
  }

  const session = (id) => state.sessions.find((info) => info.id === id)
  const missing = (id) => json(404, { _tag: 'SessionNotFoundError', message: `Session not found: ${id}`, sessionID: id })
  function emit(type, data = {}, extra = {}) {
    const frame = `data: ${JSON.stringify({ id: nextId('evt'), created: tick(), type, data, ...extra })}\n\n`
    for (const stream of state.streams) stream.push(frame)
  }
  /** session/inbox.ts admit: the item is recorded and session.inbox.enqueued published before the answer. */
  function enqueue(sessionID, item) {
    const list = state.inbox.get(sessionID) ?? []
    const existing = list.find((entry) => entry.id === item.id) ?? (state.messages.get(sessionID) ?? []).find((entry) => entry.id === item.id)
    if (existing) return existing.sessionID ? existing : { ...item, sessionID }
    const record = { id: item.id ?? nextId('msg'), sessionID, time: { created: tick() }, type: item.type, payload: item.payload, delivery: item.delivery ?? 'steer' }
    list.push(record)
    state.inbox.set(sessionID, list)
    emit('session.inbox.enqueued', { sessionID, inboxID: record.id, item: { type: record.type, payload: record.payload, delivery: record.delivery } })
    return record
  }
  /** A delivered move: the new location, message-updater.ts's location-switched message, session.moved. */
  function moveSession(info, directory) {
    const previous = info.location
    info.location = { directory }
    state.messages.set(info.id, [...(state.messages.get(info.id) ?? []), { id: nextId('msg'), type: 'location-switched', location: info.location, projectID: 'prj_fake', subpath: '', previous, time: { created: tick() } }])
    emit('session.moved', { sessionID: info.id, location: info.location, projectID: 'prj_fake', subpath: '' }, { durable: { aggregateID: info.id, seq: tick(), version: 1 } })
  }
  /** The prompt body's keys as v2 stores them (Session.Inbox.UserPayload). */
  const userPayload = (body) => Object.fromEntries(['text', 'files', 'agents', 'skills', 'metadata'].filter((key) => body[key] !== undefined).map((key) => [key, body[key]]))

  /**
   * A folder's plugin inventory as v2 resolves it: GET /api/config's entries (the user's and the project's documents,
   * lowest first, OPENCODE_CONFIG_CONTENT's among them when the test put it there), else those then `state.content`,
   * then `state.managedEntries` (core/src/config.ts load order).
   */
  const inventory = (directory, builtins = BUILTIN_PLUGINS_V2) => {
    const entries = typeof state.configEntries === 'function' ? state.configEntries(directory) : state.configEntries
    const list = Array.isArray(entries) ? entries : []
    const hasContent = list.some((entry) => entry?.type === 'document' && !entry.path)
    return resolvePluginsV2([...list, ...(!hasContent && state.content ? [{ type: 'document', info: state.content }] : []), ...state.managedEntries], { folders: state.pluginFolders, modules: state.pluginModules, builtins })
  }
  /**
   * Whether a folder's config turned the plugin registering this integration off (a `plugins` remove op such as "-*":
   * claude-agent's plugin is a built-in that is not guarded). Only claude-agent is modelled (CLAUDE_PLUGIN_V2).
   */
  const pluginRemoved = (directory, integrationID) => integrationID === 'claude-agent'
    && !inventory(directory, { ...BUILTIN_PLUGINS_V2, pre: [...BUILTIN_PLUGINS_V2.pre, CLAUDE_PLUGIN_V2] }).some((plugin) => plugin.id === CLAUDE_PLUGIN_V2 && plugin.state?.status === 'active')

  /** A route with awaitPlugins (server/src/location.ts) on a location reloaded: it returns once the activation is done. */
  const awaitPlugins = (request) => { const directory = location(request); state.coldLocations.delete(directory); state.activated.add(directory) }
  /** An integration as a route without the wait sees it: a plugin registration only once the folder's plugins ran. */
  const registered = (request, integrationID) => {
    const integration = state.integrations.find((entry) => entry.id === integrationID)
    const mcp = integration?.metadata?.source === 'mcp' || integration?.id.startsWith('mcp_')
    return integration && (mcp || (state.activated.has(location(request)) && !pluginRemoved(location(request), integrationID))) ? integration : null
  }
  /** What a route without awaitPlugins lists: nothing from plugins on a location whose plugins have not run. */
  const fromPlugins = (request, list) => (state.coldLocations.has(location(request)) ? [] : list)
  /**
   * Whether a location's plugin list is still the empty one it starts with (plugin/supervisor.ts: [] until its first
   * activation is done): a folder no awaitPlugins route has answered for since serve started, or one reloaded since.
   */
  const unactivated = (request) => state.coldLocations.has(location(request)) || !state.activated.has(location(request))
  const locationBody = (request, data) => {
    const directory = location(request)
    return json(200, { location: { directory, project: { id: 'prj_fake', directory, canonical: directory } }, ...(data === undefined ? {} : { data }) })
  }

  function eventStream(signal) {
    let controller
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(c) {
        controller = c
        const entry = {
          push: (text) => { try { controller.enqueue(encoder.encode(text)) } catch {} },
          close: () => { try { controller.close() } catch {} state.streams.delete(entry) },
          error: (reason) => { try { controller.error(reason) } catch {} state.streams.delete(entry) },
        }
        state.streams.add(entry)
        signal?.addEventListener('abort', () => entry.error(signal.reason ?? new Error('aborted')), { once: true })
        if (connectedFirst) entry.push(`data: ${JSON.stringify({ id: nextId('evt'), type: 'server.connected', data: {} })}\n\n`)
      },
    })
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' } })
  }

  /** core/src/integration.ts resolveConnections: stored credentials (the active first), then env names set. */
  function integrationInfo(integration) {
    const stored = state.credentials.filter((entry) => entry.integrationID === integration.id)
    const ordered = [...stored.filter((entry) => entry.active), ...stored.filter((entry) => !entry.active).reverse()]
    const connections = [
      ...ordered.map((entry) => ({ type: 'credential', id: entry.id, label: entry.label, method: entry.value.type, ...(state.statuses.has(entry.id) ? { status: state.statuses.get(entry.id) } : {}) })),
      ...(integration.env ?? []).map((name) => ({ type: 'env', name })),
    ]
    return { id: integration.id, name: integration.name ?? integration.id, ...(integration.metadata ? { metadata: integration.metadata } : {}), methods: integration.methods ?? [], connections }
  }
  /** credential.ts create: active unless asked not to (and the integration already has one); labels <name>, <name> 2 … */
  function addCredential(integrationID, value, { label, activate = true } = {}) {
    const integration = state.integrations.find((entry) => entry.id === integrationID)
    const others = state.credentials.filter((entry) => entry.integrationID === integrationID)
    const name = integration?.name ?? integrationID
    const labels = new Set(others.map((entry) => entry.label))
    const chosen = label ?? Array.from({ length: labels.size + 1 }, (_, index) => (index === 0 ? name : `${name} ${index + 1}`)).find((candidate) => !labels.has(candidate)) ?? name
    const active = activate !== false || !others.some((entry) => entry.active)
    if (active) for (const entry of others) entry.active = false
    const entry = { id: nextId('crd'), integrationID, label: chosen, active, value }
    state.credentials.push(entry)
    emit('credential.updated', {})
    if (active) emit('credential.switched', { integrationID, credentialID: entry.id })
    providersUpdated()
    return entry
  }
  /** core/src/provider.ts: each loaded location's Provider follows credential events with its own provider.updated. */
  function providersUpdated() {
    for (const directory of state.loaded) emit('provider.updated', {}, { location: { directory } })
  }
  /** core/src/form.ts validateAnswer. */
  function invalidAnswer(form, answer) {
    const fields = new Map((form ?? []).map((field) => [field.key, field]))
    for (const key of Object.keys(answer)) if (!fields.has(key)) return `Unknown form field: ${key}`
    const active = (field) => !field.when || field.when.every((when) => {
      const value = answer[when.key]
      if (value === undefined) return false
      const hit = Array.isArray(value) ? value.includes(when.value) : value === when.value
      return when.op === 'eq' ? hit : !hit
    })
    for (const field of form ?? []) {
      const value = answer[field.key]
      if (field.type === 'external') { if (value !== true) return `External form field must be acknowledged: ${field.key}`; continue }
      if (value === undefined) { if (field.required && active(field)) return `Missing required form field: ${field.key}`; continue }
      if (!active(field)) return `Form field is not active: ${field.key}`
    }
    return null
  }
  const authorizationError = (message) => json(400, { _tag: 'InvalidRequestError', message, kind: 'integration_authorization' })
  function settle(attemptID, status, message) {
    const attempt = state.attempts.get(attemptID)
    if (!attempt || attempt.status !== 'pending') return false
    if (status === 'complete') addCredential(attempt.integrationID, { type: 'oauth', methodID: attempt.methodID, refresh: 'r', access: 'a', expires: state.clock + 3600000 })
    attempt.status = status
    if (status === 'failed') attempt.message = message ?? 'Authorization failed'
    return true
  }

  /** core/src/session/stats.ts get (no time window: every message; no tool rows). */
  function stats(query) {
    const tokens = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
    const out = { range: { from: 0, to: state.clock }, sessions: 0, subagents: 0, prompts: 0, steps: 0, tokens, cost: 0, tools: { mode: query.get('tools') ?? 'summary', ...(query.get('tools') === 'none' ? {} : { totals: { calls: 0, succeeded: 0, failed: 0, unfinished: 0 } }) }, activeDays: 0, streak: 0, activity: [], models: [] }
    const roots = new Set()
    const subs = new Set()
    for (const info of state.sessions) {
      for (const message of state.messages.get(info.id) ?? []) {
        if (message.type !== 'user' && message.type !== 'assistant') continue
        if (info.fork && message.time.created < info.time.created) continue
        ;(info.parentID ? subs : roots).add(info.id)
        if (message.type === 'user') { if (!info.parentID) out.prompts++; continue }
        out.steps++
        const used = message.tokens ?? {}
        tokens.input += used.input ?? 0
        tokens.output += used.output ?? 0
        tokens.reasoning += used.reasoning ?? 0
        tokens.cache.read += used.cache?.read ?? 0
        tokens.cache.write += used.cache?.write ?? 0
        out.cost += message.cost ?? 0
      }
    }
    out.sessions = roots.size
    out.subagents = subs.size
    return out
  }

  async function handle(request, body) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } })
    const route = matchRoute(request.method, url.pathname)
    if (!route) return new Response(null, { status: 404 })
    const violations = contractViolations(request.method, request.url, body)
    if (violations.length) {
      state.violations.push(...violations)
      return json(400, { _tag: 'InvalidRequestError', message: violations.join('; '), kind: 'Payload' })
    }
    const { key, params } = route
    switch (key) {
      case 'GET /api/info': return json(200, { version, pid: 4242, urls: [url.origin], paths: { tmp: '/tmp/opencode' } })
      case 'GET /api/event': return eventStream(request.signal)
      case 'GET /api/session': return listSessions(url.searchParams)
      case 'POST /api/session': {
        if (body.id && state.sessions.some((info) => info.id === body.id)) return json(409, { _tag: 'ConflictError', message: `Session already exists: ${body.id}`, resource: body.id })
        const info = makeSession(body)
        return info ? json(200, { data: info }) : json(404, { _tag: 'SessionNotFoundError', message: `Session not found: ${body.parentID}`, sessionID: body.parentID })
      }
      case 'GET /api/session/active': return json(200, { data: Object.fromEntries([...state.active].map((id) => [id, { type: 'running' }])) })
      case 'GET /api/session/{sessionID}': {
        const info = state.sessions.find((entry) => entry.id === params.sessionID)
        return info ? json(200, { data: info }) : json(404, { _tag: 'SessionNotFoundError', message: `Session not found: ${params.sessionID}`, sessionID: params.sessionID })
      }
      case 'GET /api/session/{sessionID}/message': return listMessages(params.sessionID, url.searchParams)
      case 'GET /api/model': awaitPlugins(request); return locationBody(request, state.models)
      // No default model: the body has no data at all (Schema.UndefinedOr).
      case 'GET /api/model/default': awaitPlugins(request); return locationBody(request, state.defaultModel ?? undefined)
      case 'GET /api/provider': awaitPlugins(request); return locationBody(request, state.providers)
      case 'POST /api/session/{sessionID}/interrupt': {
        if (!state.sessions.some((entry) => entry.id === params.sessionID)) return json(404, { _tag: 'SessionNotFoundError', message: `Session not found: ${params.sessionID}`, sessionID: params.sessionID })
        const interrupted = state.active.delete(params.sessionID)
        for (const [id, request] of [...state.asks]) if (request.sessionID === params.sessionID) state.asks.delete(id)
        for (const [id, form] of [...state.forms]) if (form.sessionID === params.sessionID) { state.forms.delete(id); emit('form.cancelled', { id, sessionID: form.sessionID }) }
        return json(200, { interrupted })
      }
      case 'POST /api/session/{sessionID}/prompt': {
        if (!session(params.sessionID)) return missing(params.sessionID)
        if (body.id !== undefined && !String(body.id).startsWith('msg_')) return json(400, { _tag: 'InvalidRequestError', message: 'Invalid message id', kind: 'Payload' })
        return json(200, { data: enqueue(params.sessionID, { id: body.id, type: 'user', payload: userPayload(body), delivery: body.delivery }) })
      }
      case 'POST /api/session/{sessionID}/compact': {
        if (!session(params.sessionID)) return missing(params.sessionID)
        return json(200, { data: enqueue(params.sessionID, { id: body?.id, type: 'compaction', payload: {}, delivery: body?.delivery }) })
      }
      case 'POST /api/session/{sessionID}/command': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        const kind = state.commands[body.name]
        if (!kind) return json(404, { _tag: 'CommandNotFoundError', message: `Command not found: ${body.name}`, command: body.name })
        if (kind === 'prompt') enqueue(params.sessionID, { type: 'user', payload: { text: `Run ${body.name}: ${body.text}`, ...(body.files ? { files: body.files } : {}) }, delivery: body.delivery })
        if (kind === 'subtask') {
          const child = makeSession({ parentID: info.id, title: body.name, agent: 'general' })
          emit('session.created', { sessionID: child.id, parentID: info.id, projectID: 'prj_fake', location: child.location, slug: 'child', title: child.title, agent: 'general', version: '2.2.5' })
        }
        return noContent()
      }
      case 'POST /api/session/{sessionID}/agent': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        const previous = info.agent
        info.agent = body.agent
        emit('session.agent.selected', { sessionID: info.id, agent: body.agent, ...(previous ? { previous } : {}) }, { durable: { aggregateID: info.id, seq: tick(), version: 1 } })
        return noContent()
      }
      case 'POST /api/session/{sessionID}/model': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        const previous = info.model
        info.model = body.model
        emit('session.model.selected', { sessionID: info.id, model: body.model, ...(previous ? { previous } : {}) }, { durable: { aggregateID: info.id, seq: tick(), version: 1 } })
        return noContent()
      }
      case 'PATCH /api/session/{sessionID}': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        if (body.title !== undefined) info.title = body.title
        if (body.metadata !== undefined) info.metadata = body.metadata
        if (body.permissions !== undefined) info.permissions = body.permissions
        if (body.archived === true) info.time.archived = tick()
        if (body.archived === false) delete info.time.archived
        return noContent()
      }
      case 'DELETE /api/session/{sessionID}': {
        const index = state.sessions.findIndex((info) => info.id === params.sessionID)
        if (index < 0) return missing(params.sessionID)
        state.sessions.splice(index, 1)
        state.active.delete(params.sessionID)
        return noContent()
      }
      case 'POST /api/session/{sessionID}/move': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        let stat = null
        try { stat = fs.statSync(body.directory) } catch {}
        if (!stat) return json(400, { _tag: 'InvalidRequestError', message: `Directory does not exist: ${body.directory}` })
        if (!stat.isDirectory()) return json(400, { _tag: 'InvalidRequestError', message: `Not a directory: ${body.directory}` })
        state.moves.push({ sessionID: info.id, ...body })
        // move.ts admits a 'move' inbox item; `deliver(sessionID, inboxID)` hands it over later.
        if (state.moveLater) { enqueue(info.id, { type: 'move', payload: { projectID: 'prj_fake', location: { directory: body.directory } }, delivery: body.delivery ?? 'steer' }); return noContent() }
        emit('session.execution.started', { sessionID: info.id }, { durable: { aggregateID: info.id, seq: tick(), version: 1 } })
        emit('session.inbox.delivered', { sessionID: info.id, inboxID: nextId('msg') })
        moveSession(info, body.directory)
        emit('session.execution.succeeded', { sessionID: info.id }, { durable: { aggregateID: info.id, seq: tick(), version: 1 } })
        return noContent()
      }
      case 'GET /api/session/{sessionID}/inbox': return session(params.sessionID) ? json(200, { data: state.inbox.get(params.sessionID) ?? [] }) : missing(params.sessionID)
      case 'DELETE /api/session/{sessionID}/inbox/{inboxID}': {
        if (!session(params.sessionID)) return missing(params.sessionID)
        const list = state.inbox.get(params.sessionID) ?? []
        const index = list.findIndex((item) => item.id === params.inboxID)
        // An item already delivered (or never there): handlers/session.ts swallows the InboxConflictError, 204.
        if (index < 0) return noContent()
        list.splice(index, 1)
        emit('session.inbox.cancelled', { sessionID: params.sessionID, inboxID: params.inboxID })
        return noContent()
      }
      case 'POST /api/session/{sessionID}/fork': {
        const source = session(params.sessionID)
        if (!source) return missing(params.sessionID)
        const messages = state.messages.get(source.id) ?? []
        if (!messages.length) return json(400, { _tag: 'InvalidRequestError', message: 'Session is empty', kind: 'empty_session' })
        const cut = body?.before ? messages.findIndex((message) => message.id === body.before) : messages.length
        if (cut < 0) return json(404, { _tag: 'MessageNotFoundError', message: `Message not found: ${body.before}` })
        const fork = makeSession({ location: source.location, agent: source.agent, model: source.model, metadata: source.metadata, permissions: source.permissions })
        fork.fork = { sessionID: source.id, boundary: { type: body?.before ? 'before' : 'through', messageID: messages[Math.max(0, cut - 1)].id } }
        state.messages.set(fork.id, messages.slice(0, cut).map((message, index) => ({ ...message, id: `msg_fork${index}` })))
        return json(200, { data: fork })
      }
      case 'POST /api/session/{sessionID}/revert/stage': {
        if (!session(params.sessionID)) return missing(params.sessionID)
        if (state.active.has(params.sessionID)) return json(409, { _tag: 'SessionBusyError', message: `Session is busy: ${params.sessionID}`, sessionID: params.sessionID })
        if (!(state.messages.get(params.sessionID) ?? []).some((message) => message.id === body.messageID)) return json(404, { _tag: 'MessageNotFoundError', message: `Message not found: ${body.messageID}` })
        state.reverts.push({ sessionID: params.sessionID, ...body })
        session(params.sessionID).revert = { messageID: body.messageID }
        return json(200, { data: { messageID: body.messageID } })
      }
      case 'POST /api/session/{sessionID}/revert/commit': {
        const info = session(params.sessionID)
        if (!info) return missing(params.sessionID)
        const messages = state.messages.get(info.id) ?? []
        const cut = info.revert ? messages.findIndex((message) => message.id === info.revert.messageID) : -1
        if (cut >= 0) state.messages.set(info.id, messages.slice(0, cut))
        delete info.revert
        return noContent()
      }
      case 'POST /api/session/{sessionID}/generate': return session(params.sessionID) ? json(200, { data: { text: state.generated } }) : missing(params.sessionID)
      case 'GET /api/session/{sessionID}/permission': return session(params.sessionID) ? json(200, { data: [...state.asks.values()].filter((request) => request.sessionID === params.sessionID) }) : missing(params.sessionID)
      case 'GET /api/session/{sessionID}/form': return session(params.sessionID) ? json(200, { data: [...state.forms.values()].filter((form) => form.sessionID === params.sessionID) }) : missing(params.sessionID)
      case 'POST /api/session/{sessionID}/permission/{requestID}/reply': {
        const request = state.asks.get(params.requestID)
        if (!request || request.sessionID !== params.sessionID) return json(404, { _tag: 'PermissionNotFoundError', message: `Permission request not found: ${params.requestID}`, requestID: params.requestID })
        state.replies.push({ sessionID: params.sessionID, requestID: params.requestID, ...body })
        state.asks.delete(request.id)
        emit('permission.replied', { sessionID: request.sessionID, requestID: request.id, reply: body.decision })
        if (body.decision === 'reject') {
          for (const [id, other] of [...state.asks]) {
            if (other.sessionID !== request.sessionID) continue
            state.asks.delete(id)
            emit('permission.replied', { sessionID: other.sessionID, requestID: id, reply: 'reject' })
          }
        }
        return noContent()
      }
      case 'POST /api/session/{sessionID}/form/{formID}/reply': {
        const form = state.forms.get(params.formID)
        if (!form || form.sessionID !== params.sessionID) return json(404, { _tag: 'FormNotFoundError', message: `Form not found: ${params.formID}`, formID: params.formID })
        for (const [key, value] of Object.entries(body.answer ?? {})) {
          const field = form.fields.find((candidate) => candidate.key === key)
          const ok = field && (field.type === 'multiselect' ? Array.isArray(value) && value.every((entry) => typeof entry === 'string') : typeof value === 'string')
          if (!ok) return json(400, { _tag: 'FormInvalidAnswerError', message: `Invalid answer for ${key}`, formID: form.id })
        }
        state.formReplies.push({ sessionID: params.sessionID, formID: form.id, answer: body.answer })
        state.forms.delete(form.id)
        emit('form.replied', { id: form.id, sessionID: form.sessionID, answer: body.answer })
        return noContent()
      }
      case 'DELETE /api/session/{sessionID}/form/{formID}': {
        const form = state.forms.get(params.formID)
        if (!form || form.sessionID !== params.sessionID) return json(404, { _tag: 'FormNotFoundError', message: `Form not found: ${params.formID}`, formID: params.formID })
        state.formCancels.push({ sessionID: params.sessionID, formID: form.id, message: url.searchParams.get('message'), directory: params.sessionID === 'global' ? location(request) : null })
        state.forms.delete(form.id)
        emit('form.cancelled', { id: form.id, sessionID: form.sessionID })
        return noContent()
      }
      case 'GET /api/config': return json(200, typeof state.configEntries === 'function' ? state.configEntries(location(request)) : state.configEntries)
      case 'GET /api/skill': return locationBody(request, fromPlugins(request, state.skills))
      case 'GET /api/reference': return locationBody(request, [])
      case 'GET /api/command': return locationBody(request, fromPlugins(request, state.commandList))
      case 'GET /api/mcp': return locationBody(request, state.mcp)
      case 'POST /api/experimental/mcp/{server}/connect': {
        state.mcpConnects.push({ server: params.server, directory: location(request) })
        return state.mcp.some((entry) => entry.name === params.server) ? noContent() : json(404, { _tag: 'McpNotFoundError', message: `MCP server not found: ${params.server}` })
      }
      case 'GET /api/plugin': {
        // server/src/handlers/plugin.ts: no awaitPlugins, so a location whose plugins have not run lists [] (a new one
        // too: the live probe's "GONE []" on a folder first used by GET /api/plugin).
        const directory = location(request)
        if (state.plugins === null) return locationBody(request, unactivated(request) ? [] : inventory(directory))
        return locationBody(request, typeof state.plugins === 'function' ? state.plugins(directory) : state.plugins)
      }
      case 'DELETE /api/debug/location': {
        const directory = location(request)
        state.locationReloads.push(directory)
        state.coldLocations.add(directory)
        state.activated.delete(directory)
        return noContent()
      }
      case 'GET /api/experimental/session/stats': return json(200, { data: stats(url.searchParams) })
      case 'GET /api/agent/{agentID}': {
        const agent = state.agents.find((entry) => entry.id === params.agentID)
        return agent ? locationBody(request, agent) : json(404, { _tag: 'AgentNotFoundError', message: `Agent not found: ${params.agentID}` })
      }
      case 'GET /api/integration': {
        if (state.failIntegrationList > 0) { state.failIntegrationList--; return json(500, { _tag: 'UnknownError', message: 'fake: integration list failed' }) }
        awaitPlugins(request)
        return locationBody(request, state.integrations.filter((entry) => !pluginRemoved(location(request), entry.id)).map(integrationInfo))
      }
      case 'GET /api/integration/{integrationID}': {
        const integration = registered(request, params.integrationID)
        return integration ? locationBody(request, integrationInfo(integration)) : json(404, { _tag: 'IntegrationNotFoundError', message: `Integration not found: ${params.integrationID}`, integrationID: params.integrationID })
      }
      case 'POST /api/integration/{integrationID}/connect/key':
      case 'POST /api/integration/{integrationID}/connect/external': {
        const integration = registered(request, params.integrationID)
        if (!integration) return json(404, { _tag: 'IntegrationNotFoundError', message: `Integration not found: ${params.integrationID}`, integrationID: params.integrationID })
        const external = key.endsWith('/external')
        const method = (integration.methods ?? []).find((entry) => (external ? entry.type === 'external' && entry.id === body.methodID : entry.type === 'key'))
        if (!method) return authorizationError(external ? `External method not found: ${body.methodID}` : `Key method not found: ${params.integrationID}`)
        const answer = body.answer ?? {}
        if (!method.form && Object.keys(answer).length) return authorizationError('Method does not accept a form answer')
        const entry = addCredential(params.integrationID, external ? { type: 'external', methodID: method.id } : { type: 'key', key: body.key }, { label: body.label ?? undefined })
        if (external) state.onExternal?.(params.integrationID, entry)
        return noContent()
      }
      case 'POST /api/integration/{integrationID}/connect/oauth': {
        if (state.integrations.some((entry) => entry.id === params.integrationID) && !registered(request, params.integrationID)) return json(500, { _tag: 'UnknownError', message: `OAuth method not found: ${params.integrationID}/${body.methodID}` })
        const integration = state.integrations.find((entry) => entry.id === params.integrationID)
        if (!integration) return json(404, { _tag: 'IntegrationNotFoundError', message: `Integration not found: ${params.integrationID}`, integrationID: params.integrationID })
        const method = (integration.methods ?? []).find((entry) => entry.type === 'oauth' && entry.id === body.methodID)
        if (!method) return json(404, { _tag: 'IntegrationMethodNotFoundError', message: `Method not found: ${body.methodID}`, integrationID: params.integrationID, methodID: body.methodID })
        const answer = body.answer ?? {}
        const invalid = method.form ? invalidAnswer(method.form, answer) : Object.keys(answer).length ? 'Method does not accept a form answer' : null
        if (invalid) return authorizationError(invalid)
        const created = tick()
        const attempt = {
          attemptID: nextId('con'), url: method.attempt?.url ?? `https://auth.example/${method.id}`, instructions: method.attempt?.instructions ?? '', mode: method.attempt?.mode ?? 'auto',
          time: { created, expires: created + 600000 },
        }
        state.attempts.set(attempt.attemptID, { ...attempt, integrationID: params.integrationID, methodID: method.id, answer, status: 'pending' })
        return locationBody(request, attempt)
      }
      case 'GET /api/integration/{integrationID}/connect/oauth/{attemptID}': {
        const attempt = state.attempts.get(params.attemptID)
        if (!attempt || attempt.integrationID !== params.integrationID) return json(404, { _tag: 'IntegrationAttemptNotFoundError', message: 'Attempt not found', integrationID: params.integrationID, attemptID: params.attemptID })
        return locationBody(request, { status: attempt.status, ...(attempt.status === 'failed' ? { message: attempt.message } : {}), time: attempt.time })
      }
      case 'DELETE /api/integration/{integrationID}/connect/oauth/{attemptID}': {
        const attempt = state.attempts.get(params.attemptID)
        if (attempt?.status === 'pending' && attempt.integrationID === params.integrationID) { state.attempts.delete(params.attemptID); attempt.cancelled = true; (state.cancelledAttempts ??= []).push(params.attemptID) }
        return noContent()
      }
      case 'POST /api/integration/{integrationID}/connect/oauth/{attemptID}/complete': {
        const attempt = state.attempts.get(params.attemptID)
        if (!attempt || attempt.integrationID !== params.integrationID) return json(404, { _tag: 'IntegrationAttemptNotFoundError', message: 'Attempt not found', integrationID: params.integrationID, attemptID: params.attemptID })
        if (attempt.mode !== 'code') return json(500, { _tag: 'UnknownError', message: 'OAuth attempt already completing' })
        if (typeof body?.code !== 'string') return json(400, { _tag: 'InvalidRequestError', message: 'Code required', kind: 'integration_code_required' })
        if (!state.onCode?.(attempt, body.code)) return authorizationError('Invalid code')
        settle(params.attemptID, 'complete')
        return noContent()
      }
      case 'DELETE /api/credential/{credentialID}': {
        const index = state.credentials.findIndex((entry) => entry.id === params.credentialID)
        if (index < 0) return noContent()
        const [removed] = state.credentials.splice(index, 1)
        state.statuses.delete(removed.id)
        emit('credential.updated', {})
        if (removed.active) {
          const next = state.credentials.filter((entry) => entry.integrationID === removed.integrationID).at(-1) ?? null
          if (next) next.active = true
          emit('credential.switched', { integrationID: removed.integrationID, credentialID: next?.id ?? null })
        }
        providersUpdated()
        return noContent()
      }
      case 'GET /api/credential': return json(200, { data: state.credentials })
      case 'POST /api/credential': {
        if (body.id && state.credentials.some((entry) => entry.id === body.id)) return json(409, { _tag: 'ConflictError', message: `Credential already exists: ${body.id}`, resource: body.id })
        const others = state.credentials.filter((entry) => entry.integrationID === body.integrationID)
        const activate = body.activate !== false || !others.some((entry) => entry.active)
        if (activate) for (const entry of others) entry.active = false
        const entry = { id: body.id ?? nextId('crd'), integrationID: body.integrationID, label: body.label ?? 'Credential', active: activate, value: body.value }
        state.credentials.push(entry)
        return json(200, { data: entry })
      }
      case 'GET /api/agent': {
        if (state.pluginFailures > 0) { state.pluginFailures--; return json(503, { _tag: 'ServiceUnavailableError', message: 'Location plugins did not finish activating', service: 'plugin' }) }
        awaitPlugins(request)
        return locationBody(request, state.agents)
      }
      default: return json(501, { _tag: 'UnknownError', message: `fake: ${key} is not implemented` })
    }
  }

  async function fetch(input, init = {}) {
    const request = new Request(input, init)
    let body
    const text = init.body === undefined || init.body === null ? '' : String(init.body)
    if (text) { try { body = JSON.parse(text) } catch { return json(400, { _tag: 'InvalidRequestError', message: 'Invalid JSON', kind: 'Payload' }) } }
    state.requests.push({ method: request.method, url: request.url, path: new URL(request.url).pathname, headers: Object.fromEntries(request.headers), body })
    const expected = state.password === null ? null : 'Basic ' + Buffer.from(`opencode:${state.password}`).toString('base64')
    if (expected && request.headers.get('authorization') !== expected) return json(401, { _tag: 'UnauthorizedError', message: 'Authentication required' }, { 'www-authenticate': 'Basic realm="Secure Area"' })
    return handle(request, body)
  }

  return {
    state,
    fetch,
    makeSession,
    /** serve spawned with `env`: its password, and the OPENCODE_CONFIG_CONTENT document its config loads. */
    serve(env = {}) {
      state.password = env.OPENCODE_PASSWORD ?? null
      try { state.content = env.OPENCODE_CONFIG_CONTENT ? JSON.parse(env.OPENCODE_CONFIG_CONTENT) : null } catch { state.content = null }
    },
    /** Append messages to a session (seq order); bumps its time.updated. */
    addMessages(sessionID, list) {
      state.messages.set(sessionID, [...(state.messages.get(sessionID) ?? []), ...list])
      const info = state.sessions.find((entry) => entry.id === sessionID)
      if (info) info.time.updated = tick()
    },
    /** Send one event envelope to every open /api/event stream. */
    emit,
    /** session/projector.ts delivery: a pending inbox item enters the transcript (user / synthetic), with its event; a move moves the session. */
    deliver(sessionID, inboxID) {
      const list = state.inbox.get(sessionID) ?? []
      const index = list.findIndex((item) => item.id === inboxID)
      if (index < 0) return null
      const [item] = list.splice(index, 1)
      const time = { created: tick() }
      if (item.type === 'user') this.addMessages(sessionID, [{ id: item.id, type: 'user', time, ...item.payload }])
      if (item.type === 'synthetic') this.addMessages(sessionID, [{ id: item.id, type: 'synthetic', time, ...item.payload }])
      emit('session.inbox.delivered', { sessionID, inboxID })
      if (item.type === 'move') moveSession(session(sessionID), item.payload.location.directory)
      return item
    },
    /** core/src/permission.ts create: an open ask, published as permission.asked (ephemeral). */
    ask(request) {
      const value = { id: request.id ?? nextId('per'), ...request }
      state.asks.set(value.id, value)
      emit('permission.asked', value)
      return value
    },
    /** core/src/form.ts ask: an open form, published as form.created {form}; `directory` puts a location on the envelope. */
    form(info, { directory } = {}) {
      const value = { id: info.id ?? nextId('frm'), title: 'Questions', ...info }
      state.forms.set(value.id, value)
      emit('form.created', { form: value }, directory ? { location: { directory } } : {})
      return value
    },
    /** An OAuth attempt reaches complete (an OAuth credential added first) | failed | expired. */
    settle,
    /** A finished attempt v2 no longer keeps (its status is a 404 a minute after it ended). */
    forget(attemptID) { state.attempts.delete(attemptID) },
    /** A connection's needs_auth status (null clears it), published as integration.updated. */
    setStatus(credentialID, status) {
      if (status) state.statuses.set(credentialID, status)
      else state.statuses.delete(credentialID)
      emit('integration.updated', {})
    },
    /** A new serve process (a start or restart): no location has run its plugins yet. */
    restart() { state.activated.clear() },
    heartbeat() { for (const stream of state.streams) stream.push(': heartbeat\n\n') },
    /** Raw bytes on every open stream (frames split across chunks, CRLF …). */
    raw(text) { for (const stream of state.streams) stream.push(text) },
    /** End every open stream (EOF), as an overflowing subscriber or a restart does. */
    drop() { for (const stream of [...state.streams]) stream.close() },
    get openStreams() { return state.streams.size },
  }
}

// ---------------------------------------------------------------- v2 semantics ported for the live round 1 tests

/** A share of 2.2.5's internal plugins (core/src/plugin/internal.ts pre / post), the two `guarded` ones included. */
export const BUILTIN_PLUGINS_V2 = Object.freeze({
  pre: ['opencode.provider.opencode', 'opencode.config.shell', 'opencode.config.mcp', 'opencode.tool.shell'],
  post: ['opencode.config.instruction', 'opencode.config.policy'],
})
/** plugin/provider/claude-agent/index.ts ID: a built-in (provider.ts ProviderPlugins), not guarded. */
export const CLAUDE_PLUGIN_V2 = 'opencode.provider.claude-agent'
/** core/src/plugin/internal.ts `guarded`: repository config must not switch them off. */
export const GUARDED_V2 = new Set(['opencode.provider.opencode', 'opencode.config.policy'])

/**
 * The Plugin.Info[] GET /api/plugin lists once a location's plugins have run, ported from config/plugin/source.ts scan
 * and plugin/supervisor.ts resolve: the operations are every directory entry's {plugin,plugins} folder contents first,
 * then each document's `plugins` in entry order (a string `-x` removes, anything else adds; `./x` resolved against the
 * document's folder). A remove turns off every plugin loaded so far whose *id* it selects (`*`, `x.*`, an id), the
 * guarded built-ins excepted; an add selecting loaded ids (or `*`, `x.*`, `opencode.…`) turns them back on; any other
 * add loads its target (`modules[target]`: {id} or {error}), a later add of the same target replacing the earlier.
 * Listed: built-ins (pre), loaded plugins in first-load order, built-ins (post); a second plugin with an id already
 * listed is a failure "Duplicate plugin ID" (the first in boot order wins); load failures last.
 */
export function resolvePluginsV2(entries, { folders = {}, modules = {}, builtins = BUILTIN_PLUGINS_V2 } = {}) {
  const matches = (selector, id) => selector === '*' || (selector.endsWith('.*') ? id.startsWith(selector.slice(0, -1)) : selector === id)
  const isPath = (target) => target.startsWith('/')
  const list = Array.isArray(entries) ? entries : []
  const operations = [
    ...list.filter((entry) => entry?.type === 'directory').flatMap((entry) => (folders[entry.path] ?? []).map((item) => ({ type: 'add', target: item.target, id: item.id }))),
    ...list.filter((entry) => entry?.type === 'document').flatMap((entry) => (Array.isArray(entry.info?.plugins) ? entry.info.plugins : []).flatMap((op) => {
      if (typeof op === 'string' && op.startsWith('-')) return op.length > 1 ? [{ type: 'remove', target: op.slice(1) }] : []
      let target = typeof op === 'string' ? op : op && typeof op.package === 'string' ? op.package : null
      if (!target) return []
      if (/^\.\.?\//.test(target)) target = `${entry.path ? entry.path.replace(/\/[^/]*$/, '') : '/'}/${target}`.replace(/\/\.\//g, '/')
      return [{ type: 'add', target, options: op?.options ?? {} }]
    })),
  ]
  const definitions = [...builtins.pre, ...builtins.post].map((id) => ({ id, source: { type: 'builtin' } }))
  const enabled = new Set(definitions.map((plugin) => plugin.id))
  const packages = new Map()
  const failures = new Map()
  const plugins = () => [...definitions, ...packages.values()]
  for (const operation of operations) {
    if (operation.type === 'remove') {
      if (operation.target === '*') failures.clear()
      for (const plugin of plugins()) if (matches(operation.target, plugin.id) && !GUARDED_V2.has(plugin.id)) enabled.delete(plugin.id)
      continue
    }
    const matched = plugins().filter((plugin) => matches(operation.target, plugin.id))
    if (matched.length || operation.target === '*' || operation.target.endsWith('.*') || operation.target.startsWith('opencode.')) { for (const plugin of matched) enabled.add(plugin.id); continue }
    const module = modules[operation.target] ?? {}
    const source = isPath(operation.target) ? { type: 'local', path: operation.target } : { type: 'package', target: operation.target }
    if (module.error) { failures.set(operation.target, { source, state: { status: 'failed', error: module.error }, features: { server: true } }); continue }
    failures.delete(operation.target)
    const id = module.id ?? operation.id ?? (isPath(operation.target) ? operation.target.replace(/\/+$/, '').split('/').pop().replace(/\.(m?js|ts)$/, '') : /^(@[^/@]+\/[^@]+|[^@]+)/.exec(operation.target)[1])
    const previous = packages.get(operation.target)
    if (previous) enabled.delete(previous.id)
    packages.set(operation.target, { id, source, options: operation.options ?? {} })
    enabled.add(id)
  }
  const on = (plugin) => enabled.has(plugin.id)
  const ordered = [
    ...definitions.filter((plugin) => builtins.pre.includes(plugin.id) && on(plugin)),
    ...[...packages.values()].filter(on),
    ...definitions.filter((plugin) => builtins.post.includes(plugin.id) && on(plugin)),
  ]
  const seen = new Set()
  const listed = []
  for (const plugin of ordered) {
    const duplicate = seen.has(plugin.id)
    seen.add(plugin.id)
    listed.push({ id: plugin.id, source: plugin.source, state: duplicate ? { status: 'failed', error: `Duplicate plugin ID: ${plugin.id}` } : { status: 'active' }, features: { server: true } })
  }
  return [...listed, ...failures.values()]
}

/**
 * The Model.Info list v2 makes of a config `providers` overlay (core/src/config/plugin/provider.ts with variant.ts), for
 * the packages the bridge writes. A custom model (no catalog base) gets its variants from `capabilities.reasoning`:
 * left out, Variant.resolve with the default `[{type:'effort'}]` support (the package's default efforts); otherwise
 * Variant.supports — `{supported:false}` nothing, `{supported:true}` only the controls it names (toggle, effort, budget).
 */
export function configModelsV2(providers) {
  const EFFORTS = ['low', 'medium', 'high']
  const claude = (id) => {
    const familyFirst = /(?:claude-)?(opus|sonnet|haiku|fable|mythos)-(\d+)(?:[.-](\d+))?/i.exec(id)
    const versionFirst = /claude-(\d+)(?:[.-](\d+))?-(opus|sonnet|haiku|fable|mythos)/i.exec(id)
    const major = Number(familyFirst?.[2] ?? versionFirst?.[1])
    const minor = Number(familyFirst?.[3] ?? versionFirst?.[2] ?? 0)
    return { major, minor, manual: (major === 3 && minor === 7) || (major === 4 && minor < 6) }
  }
  const budgets = (model, support, ceiling = model.limit.output) => {
    const maximum = Math.min(support.max ?? ceiling - 1, model.limit.output - 1, ceiling - 1)
    return maximum > 0 ? ['high', 'max'] : []
  }
  const PROTOCOLS = {
    // anthropicMessages (opus 4.5's manual thinking left out)
    'aisdk:@ai-sdk/anthropic': (model, support) => {
      const info = claude(model.modelID ?? model.id)
      if (support.type === 'effort') {
        if (info.manual) return budgets(model, { min: 1024 }, 32000)
        return support.values ?? (info.major === 4 && info.minor === 6 ? [...EFFORTS, 'max'] : [...EFFORTS, 'xhigh', 'max'])
      }
      if (support.type === 'toggle') return ['none', 'thinking']
      return budgets(model, support, 32000)
    },
    // openaiResponses
    'aisdk:@ai-sdk/openai': (model, support) => (support.type === 'effort' ? support.values ?? ['none', 'minimal', ...EFFORTS, 'xhigh'] : []),
    // openaiCompatible → openaiChat
    'aisdk:@ai-sdk/openai-compatible': (model, support) => (support.type === 'effort' ? support.values ?? EFFORTS : []),
  }
  const supports = (reasoning) => {
    if (!reasoning.supported) return []
    return [
      ...(reasoning.toggle ? [{ type: 'toggle' }] : []),
      ...(reasoning.effort ? [{ type: 'effort', values: reasoning.effort.filter((value) => value !== 'default') }] : []),
      ...(reasoning.budget ? [{ type: 'budget_tokens', ...reasoning.budget }] : []),
    ]
  }
  const resolve = (model, list = [{ type: 'effort' }]) => {
    const protocol = PROTOCOLS[model.package]
    if (!protocol) return []
    const toggle = list.some((support) => support.type === 'toggle') ? protocol(model, { type: 'toggle' }) : []
    const effort = list.find((support) => support.type === 'effort')
    const budget = list.find((support) => support.type === 'budget_tokens')
    const main = effort ? protocol(model, effort) : budget ? protocol(model, budget) : toggle
    return [...new Set([...toggle.filter((id) => id === 'none'), ...main])].map((id) => ({ id }))
  }
  const models = []
  for (const [providerID, provider] of Object.entries(providers ?? {})) {
    for (const [id, config] of Object.entries(provider.models ?? {})) {
      const caps = config.capabilities ?? {}
      const model = {
        id, modelID: config.modelID ?? id, providerID, name: config.name || id, package: config.package ?? provider.package,
        capabilities: { tools: caps.tools ?? true, input: [...(caps.input ?? ['text', 'image'])], output: [...(caps.output ?? ['text'])], ...(caps.temperature === undefined ? {} : { temperature: caps.temperature }) },
        limit: { context: 0, output: 0, ...(config.limit ?? {}) }, cost: [], time: { released: 1 }, status: 'active', enabled: true,
      }
      model.variants = caps.reasoning === undefined ? resolve(model) : resolve(model, supports(caps.reasoning))
      delete model.package
      models.push(model)
    }
  }
  return models
}

/** core/src/util/wildcard.ts match: * any run, ? one character, a trailing " *" also matching nothing. */
const wildcard = (input, pattern) => {
  let escaped = String(pattern).replaceAll('\\', '/').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  if (escaped.endsWith(' .*')) escaped = escaped.slice(0, -3) + '( .*)?'
  return new RegExp('^' + escaped + '$', 's').test(String(input).replaceAll('\\', '/'))
}

/**
 * The skills a session's model request offers (core/src/skill.ts available, permission.ts evaluate: the last matching
 * rule of the agent's then the session's rules; none is an ask), checked by the skill's id, not its name.
 */
export function availableSkillsV2(skills, ...rulesets) {
  const rules = rulesets.flat()
  return skills.filter((skill) => rules.findLast((rule) => wildcard('skill', rule.action) && wildcard(skill.id, rule.resource))?.effect !== 'deny')
}

/**
 * core/src/skill/instructions.ts: the skill guidance of a session. `previous` null: the initial list (the system
 * prompt); otherwise the update a later request appends to the history (instructions are frozen into the session's
 * history, session/instruction-state.ts commit: an earlier update stays in every later request). Skills without a
 * description or with autoinvoke false are left out, sorted by id; null when nothing changed.
 */
export function skillGuidanceV2(previous, current) {
  const summary = (list) => list.filter((skill) => skill.description !== undefined && skill.autoinvoke !== false).map(({ id, name, description }) => ({ id, name, description })).sort((a, b) => a.id.localeCompare(b.id))
  const entries = (list) => list.flatMap((skill) => ['  <skill>', `    <id>${skill.id}</id>`, `    <name>${skill.name}</name>`, `    <description>${skill.description}</description>`, '  </skill>'])
  const render = (list) => [
    'Skills provide specialized instructions and workflows for specific tasks.',
    'Use the skill tool to load a skill when a task matches its description.',
    'The user may also invoke a skill directly. When that happens, its instructions appear in the conversation as a <skill_content> block, the same shape the skill tool returns. A skill that is already present this way does not need to be invoked again.',
    ...(list.length === 0 ? ['No skills are currently available.'] : ['<available_skills>', ...entries(list), '</available_skills>']),
  ].join('\n')
  const now = summary(current)
  if (previous === null) return render(now)
  const before = summary(previous)
  if (JSON.stringify(before) === JSON.stringify(now)) return null
  if (!now.length) return 'Skill guidance is no longer available. Do not use any previously listed skill.'
  if (!before.length) return render(now)
  const byId = new Map(before.map((skill) => [skill.id, skill]))
  const ids = new Set(now.map((skill) => skill.id))
  const added = now.filter((skill) => !byId.has(skill.id))
  const changed = now.filter((skill) => byId.has(skill.id) && (byId.get(skill.id).name !== skill.name || byId.get(skill.id).description !== skill.description))
  const removed = before.filter((skill) => !ids.has(skill.id))
  if (!added.length && !changed.length && !removed.length) return ['The available skills have changed. This list supersedes the previous available skills list.', render(now)].join('\n')
  return [
    ...(added.length ? ['New skills are available in addition to those previously listed:', ...entries(added)] : []),
    ...(changed.length ? ['The following skills have changed. Each entry replaces the previously listed skill with the same ID:', ...entries(changed)] : []),
    ...(removed.length ? [`The following skill IDs are no longer available and must not be used: ${removed.map((skill) => skill.id).join(', ')}.`] : []),
  ].join('\n')
}
