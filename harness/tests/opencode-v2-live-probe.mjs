// Live probe of a real `opencode serve` 2.x for the OpenCode bridge's 2.x path (PLAN §7.3, items 1–11): the things
// the in-process fake (tests/fixtures/v2-fake.mjs) can only assume. It drives serve directly (the bridge's
// AgentServerV2 / V2Api from src/v2, no Bridge), with a scripted Anthropic model server (tests/fixtures/
// anthropic-scripted.mjs) as a custom provider, and prints a readable report: every item says what it saw, and a
// verdict (OK = as the bridge assumes, NOTE = worth a look, FAIL = contradicts the bridge, SKIP).
//
// Run it in a normal terminal (it listens on loopback ports and spawns serve; a sandbox that refuses listen() or spawn
// fails with EPERM):
//
//   cd harness
//   node tests/opencode-v2-live-probe.mjs --binary /path/to/opencode            # items 1–10
//   node tests/opencode-v2-live-probe.mjs --binary /path/to/opencode --only 4,5  # some items
//   node tests/opencode-v2-live-probe.mjs --binary … --claude                    # also item 11 (claude-agent)
//   node tests/opencode-v2-live-probe.mjs … --json report.json                   # the report as JSON too
//
// The binary defaults to $CODE_DESKTOP_OPENCODE_V2_BINARY, then work/agents/opencode-bridge/opencode/bin/opencode, and
// must report 2.x. Items 1–10 run in a temp home (HOME, XDG_*, OPENCODE_DB all temporary; nothing of yours is read or
// written). Item 11 (--claude, or CODE_DESKTOP_PROBE_CLAUDE=1) needs your own Claude Code (`claude` 2.1.248+, signed in
// with `claude auth login`): it keeps your real HOME so Claude Code finds its sign-in, while OpenCode's XDG folders and
// database stay temporary. It sends a few real prompts to Claude on your subscription (small ones), and connects the
// claude-agent integration only in the temporary database.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { AgentServerV2 } from '../packages/opencode-bridge/src/v2/server.js'
import { V2Api } from '../packages/opencode-bridge/src/v2/api.js'
import { providerOverlayV2 } from '../packages/opencode-bridge/src/v2/config.js'
import { newMessageId } from '../packages/opencode-bridge/src/v2/live.js'
import { ClaudeCode } from '../packages/opencode-bridge/src/v2/claude.js'
import { createAnthropicServer, fakeProviders, newestPrompt, resultsSinceLastPrompt, toolNames } from './fixtures/anthropic-scripted.mjs'

const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const argValue = (name) => { const index = process.argv.indexOf(name); return index > 0 ? process.argv[index + 1] : undefined }
const binary = path.resolve(argValue('--binary') ?? process.env.CODE_DESKTOP_OPENCODE_V2_BINARY ?? path.join(repo, 'work/agents/opencode-bridge/opencode/bin/opencode'))
const only = new Set((argValue('--only') ?? '').split(',').map((item) => item.trim()).filter(Boolean))
const withClaude = process.argv.includes('--claude') || process.env.CODE_DESKTOP_PROBE_CLAUDE === '1'
const jsonOut = argValue('--json')
const OC2 = withApi(FLAVORS.opencode, 'v2')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ms = (start) => `${Date.now() - start} ms`
const made = []
const tmp = (label) => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `oc2-probe-${label}-`))); made.push(dir); return dir }

// ------------------------------------------------------------------ report

const report = []
const RANK = { OK: 0, SKIP: 1, NOTE: 2, FAIL: 3 }
async function item(n, title, fn) {
  if (only.size && !only.has(String(n))) return
  const entry = { n, title, verdict: 'OK', lines: [] }
  const say = (line) => { entry.lines.push(line); console.log(`    ${line}`) }
  // The worst verdict wins (FAIL > NOTE > SKIP > OK).
  const verdict = (value, why) => { if (RANK[value] > RANK[entry.verdict]) entry.verdict = value; if (why) say(`${value}: ${why}`) }
  console.log(`\n[${n}] ${title}`)
  const started = Date.now()
  try { await fn(say, verdict) } catch (error) { entry.verdict = 'FAIL'; say(`ERROR ${String(error?.stack ?? error).split('\n').slice(0, 4).join(' | ')}`) }
  entry.ms = Date.now() - started
  console.log(`  → ${entry.verdict} (${entry.ms} ms)`)
  report.push(entry)
}

// ------------------------------------------------------------------ scripted model

const MODEL = { providerID: 'fake', id: 'fake-model' }
const model = createAnthropicServer(async (body) => {
  const tools = toolNames(body)
  if (!tools.length) return { text: 'Probe title' }
  const prompt = newestPrompt(body)
  const done = resultsSinceLastPrompt(body)
  const at = (word) => prompt.includes(word)
  if (/SUBAGENT_CHILD_SHELL/.test(JSON.stringify(body.messages)) && done === 0) return { tool: { name: 'shell', input: { command: 'echo child-shell' } } }
  if (/SUBAGENT_CHILD/.test(JSON.stringify(body.messages.at(-1) ?? ''))) return { text: 'child finished' }
  if (at('HANG_FOREVER')) return { hang: true }
  if (at('RUN_SHELL') && done === 0) return { tool: { name: 'shell', input: { command: 'echo probe-shell' } } }
  if (at('RUN_DENY') && done === 0) return { tool: { name: 'shell', input: { command: 'echo DENY_ME' } } }
  if (at('TWO_SHELL') && done === 0) return { tools: [{ name: 'shell', input: { command: 'echo one' } }, { name: 'shell', input: { command: 'echo two' } }] }
  if (at('ASK_QUESTION') && done === 0) return { tool: { name: 'question', input: { questions: [{ question: 'Which?', header: 'Pick', options: [{ label: 'A', description: 'a' }, { label: 'B', description: 'b' }] }] } } }
  if (at('SPAWN_SHELL_AGENT') && done === 0) return { tool: { name: 'subagent', input: { agent: 'general', description: 'Probe child', prompt: 'SUBAGENT_CHILD_SHELL run one command' } } }
  if (at('SPAWN_AGENT') && done === 0) return { tool: { name: 'subagent', input: { agent: 'general', description: 'Probe child', prompt: 'SUBAGENT_CHILD do it' } } }
  return { text: `probe reply ${done}` }
})

// ------------------------------------------------------------------ one serve

const WRAPPER = (log, shell) => `#!/bin/sh
# The probe's shell wrapper (the bridge's runtime/shell-v2/<shell> stand-in): what serve hands a shell command.
printf '%s\\t%s\\t%s\\n' "$(date +%s%3N 2>/dev/null || date +%s)" "\${OPENCODE_SESSION_ID:-<unset>}" "$*" >> ${JSON.stringify(log)}
exec ${JSON.stringify(shell)} "$@"
`
const PLUGIN = (log) => `import fs from "node:fs"
const note = (line) => { try { fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ at: Date.now(), ...line }) + "\\n") } catch {} }
export default {
  id: "oc2-probe",
  setup: async (ctx) => {
    note({ hook: "setup", location: ctx.location && ctx.location.directory })
    await ctx.session.hook("context", async (event) => {
      note({ hook: "context", sessionID: event.sessionID, tools: Object.keys(event.tools || {}) })
      if (fs.existsSync(${JSON.stringify(log + '.delay')})) { note({ hook: "context-wait" }); await new Promise((r) => setTimeout(r, 10000)); note({ hook: "context-waited" }) }
    })
    await ctx.permission.hook("evaluate", async (event) => {
      note({ hook: "evaluate", action: event.action, resources: event.resources, effect: event.effect })
      if ((event.resources || []).some((resource) => String(resource).includes("DENY_ME"))) { event.effect = "deny"; event.message = "Denied by the probe plugin." }
    })
    await ctx.mcp.transform((editor) => {
      if (editor.get("probe_off")) editor.update("probe_off", (server) => { server.disabled = true })
    })
  },
}
`

/** A temp home with config, plugin and wrapper; returns what serve needs. */
function makeHome(label, { realHome = false } = {}) {
  const dir = tmp(label)
  const home = realHome ? os.homedir() : path.join(dir, 'home')
  fs.mkdirSync(path.join(dir, 'home'), { recursive: true })
  const workspace = path.join(dir, 'workspace')
  fs.mkdirSync(workspace, { recursive: true })
  spawnSync('git', ['init', '-q'], { cwd: workspace })
  const userShell = process.env.SHELL && path.isAbsolute(process.env.SHELL) ? process.env.SHELL : '/bin/zsh'
  const shellLog = path.join(dir, 'shell.log')
  const wrapper = path.join(dir, 'shell-v2', path.basename(userShell))
  fs.mkdirSync(path.dirname(wrapper), { recursive: true })
  fs.writeFileSync(wrapper, WRAPPER(shellLog, userShell), { mode: 0o755 })
  const pluginLog = path.join(dir, 'plugin.log')
  const pluginDir = path.join(dir, 'plugin')
  fs.mkdirSync(pluginDir, { recursive: true })
  fs.writeFileSync(path.join(pluginDir, 'index.js'), PLUGIN(pluginLog))
  const configFile = path.join(dir, 'config-v2', 'opencode.json')
  fs.mkdirSync(path.dirname(configFile), { recursive: true })
  // serve opens OPENCODE_DB but does not create its folder (ENOENT otherwise; AgentServerV2 also makes sure of it).
  const db = path.join(dir, 'opencode-v2', 'opencode.db')
  fs.mkdirSync(path.dirname(db), { recursive: true, mode: 0o700 })
  return { dir, home, workspace, shellLog, wrapper, pluginLog, pluginDir, configFile, db }
}

async function startServe(where, { config = {}, content = {}, env = {} } = {}) {
  const baseURL = await modelURL
  const keyEnv = { CODE_DESKTOP_PROVIDER_KEY_FAKE: 'sk-probe' }
  const overlay = { share: 'manual', model: 'fake/fake-model', providers: providerOverlayV2(fakeProviders(baseURL).providers, keyEnv), ...config }
  fs.writeFileSync(where.configFile, JSON.stringify(overlay, null, 2))
  const logs = []
  const server = new AgentServerV2({
    flavor: OC2, binary, db: where.db, log: (line) => logs.push(line),
    env: {
      HOME: where.home, XDG_CONFIG_HOME: path.join(where.dir, 'xdg-config'), XDG_DATA_HOME: path.join(where.dir, 'xdg-data'), XDG_STATE_HOME: path.join(where.dir, 'xdg-state'), XDG_CACHE_HOME: path.join(where.dir, 'xdg-cache'),
      OPENCODE_DISABLE_MODELS_FETCH: '1', ...keyEnv,
      OPENCODE_CONFIG: where.configFile,
      OPENCODE_CONFIG_CONTENT: JSON.stringify({ shell: where.wrapper, plugins: [{ package: where.pluginDir, options: {} }], experimental: { todo: true }, ...content }),
      ...env,
    },
  })
  const started = Date.now()
  await server.start()
  const readyMs = Date.now() - started
  const api = new V2Api(server, { log: (line) => logs.push(line) })
  const events = []
  let waiters = []
  let open = null
  const opened = new Promise((resolve) => { open = resolve })
  const stopEvents = server.events((event) => { events.push(event); for (const waiter of [...waiters]) waiter(event) }, { onOpen: () => open() })
  await Promise.race([opened, sleep(15000)])
  const waitEvent = (predicate, timeout = 60000, from = 0) => {
    const seen = events.slice(from).find(predicate)
    if (seen) return Promise.resolve(seen)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters = waiters.filter((other) => other !== waiter); reject(new Error(`timeout waiting for an event (${timeout} ms)`)) }, timeout)
      const waiter = (event) => { if (!predicate(event)) return; clearTimeout(timer); waiters = waiters.filter((other) => other !== waiter); resolve(event) }
      waiters.push(waiter)
    })
  }
  const session = async (input = {}) => api.post('/api/session', { location: { directory: where.workspace }, model: MODEL, ...input })
  const ended = (sessionID) => (event) => /^session\.execution\.(succeeded|failed|interrupted)$/.test(event.type) && event.data?.sessionID === sessionID
  const prompt = async (sessionID, text, extra = {}) => {
    const from = events.length
    const id = extra.id ?? newMessageId()
    await api.post(`/api/session/${encodeURIComponent(sessionID)}/prompt`, { id, text, ...extra })
    return { id, from, end: (timeout = 90000) => waitEvent(ended(sessionID), timeout, from) }
  }
  const messages = (sessionID) => api.all(`/api/session/${encodeURIComponent(sessionID)}/message`, { query: { order: 'asc' } })
  const stop = async () => { stopEvents(); await server.stop() }
  return { server, api, events, waitEvent, session, prompt, messages, stop, readyMs, logs, ended }
}
const ASK_ALL = [{ action: '*', resource: '*', effect: 'ask' }, { action: 'read', resource: '*', effect: 'allow' }]
const typesSince = (events, from, sessionID) => events.slice(from).filter((event) => !sessionID || event.data?.sessionID === sessionID || event.data?.form?.sessionID === sessionID).map((event) => event.type)
/** core/src/plugin/internal.ts `guarded`: built-ins no `plugins` remove operation turns off, listed after every activation. */
const GUARDED_PLUGINS = new Set(['opencode.provider.opencode', 'opencode.config.policy'])
const readLines = (file) => { try { return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) } catch { return [] } }

let modelURL

// ------------------------------------------------------------------ items

async function main() {
  if (!fs.existsSync(binary)) throw new Error(`missing ${binary} (pass --binary <opencode 2.x> or set CODE_DESKTOP_OPENCODE_V2_BINARY)`)
  const reported = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 30000 })
  const version = /(\d+\.\d+\.\d+)/.exec(reported.stdout ?? '')?.[1]
  if (!version || Number(version.split('.')[0]) < 2) throw new Error(`${binary} reports ${JSON.stringify((reported.stdout || reported.stderr || '').trim())}: the probe needs OpenCode 2.x`)
  console.log(`OpenCode ${version} (${binary})${version !== '2.2.5' ? ' — the bridge was built against 2.2.5' : ''}`)
  modelURL = model.listen()
  await modelURL

  const where = makeHome('main')
  // A 1.x auth.json in the temp data folder: does a fresh OPENCODE_DB take it in by itself (item 2)?
  fs.mkdirSync(path.join(where.dir, 'xdg-data', 'opencode'), { recursive: true })
  fs.writeFileSync(path.join(where.dir, 'xdg-data', 'opencode', 'auth.json'), JSON.stringify({ deepseek: { type: 'api', key: 'sk-probe-auth-json' } }))
  let serve = null
  const ensure = async () => (serve ??= await startServe(where))

  await item(1, 'start: --stdio first line to ready, /api/info, the event stream compressed or not', async (say, verdict) => {
    const s = await ensure()
    say(`spawn → {"url"} line: ${s.readyMs} ms (${s.server.url})`)
    const info = await s.api.info()
    say(`/api/info: version ${info?.version}, pid ${info?.pid}, paths ${JSON.stringify(info?.paths ?? {}).slice(0, 200)}`)
    for (const encoding of ['identity', 'gzip, deflate, br']) {
      const controller = new AbortController()
      const started = Date.now()
      const response = await fetch(`${s.server.url}/api/event`, { headers: { authorization: s.server.auth, accept: 'text/event-stream', 'accept-encoding': encoding }, signal: controller.signal })
      const reader = response.body.getReader()
      const first = await Promise.race([reader.read(), sleep(10000).then(() => null)])
      say(`accept-encoding "${encoding}": ${response.status}, content-encoding ${response.headers.get('content-encoding') ?? 'none'}, first chunk ${first ? `${Date.now() - started} ms` : 'none in 10 s'}`)
      if (!first && encoding !== 'identity') verdict('NOTE', 'a compressed stream held its first frame back: identity (what the bridge sends) is needed')
      controller.abort()
    }
    const connected = s.events.length ? s.events[0]?.type : null
    say(`first frame after server.connected: ${connected ?? '(none yet)'}`)
  })

  await item(2, 'database: a fresh OPENCODE_DB, a 1.x auth.json, POST /api/credential', async (say, verdict) => {
    const s = await ensure()
    say(`OPENCODE_DB file: ${fs.existsSync(where.db) ? 'created' : 'MISSING'}; default database in XDG_DATA: ${fs.existsSync(path.join(where.dir, 'xdg-data', 'opencode', 'opencode.db')) ? 'created too' : 'not created'}`)
    if (!fs.existsSync(where.db)) verdict('FAIL', 'serve did not use OPENCODE_DB')
    const before = await s.api.credentials()
    const fromAuthJson = before.filter((entry) => entry.integrationID === 'deepseek')
    say(`credentials at start: ${before.length} (deepseek from auth.json: ${fromAuthJson.length})`)
    if (fromAuthJson.length) verdict('NOTE', 'a fresh OPENCODE_DB imported auth.json by itself: the bridge\'s one-time import (v2/db.js) then keeps it (409/kept) — check it does not duplicate')
    const started = Date.now()
    try {
      await s.api.createCredential({ integrationID: 'openrouter', label: 'API key', value: { type: 'key', key: 'sk-or-probe' } })
      const after = await s.api.credentials()
      say(`POST /api/credential (openrouter key): ok in ${ms(started)}; listed ${after.filter((entry) => entry.integrationID === 'openrouter').length}`)
      const listed = JSON.stringify(after)
      if (listed.includes('sk-or-probe')) verdict('NOTE', 'GET /api/credential returns the key itself (the bridge reads it only to compare, never logs it)')
    } catch (error) { verdict('FAIL', `POST /api/credential: ${error.status} ${error._tag} ${error.message}`) }
    try {
      await s.api.createCredential({ integrationID: 'no-such-integration', label: 'API key', value: { type: 'key', key: 'sk-secret-echo-check' } })
      say('an unknown integration id was accepted')
    } catch (error) {
      say(`unknown integration: ${error.status} ${error._tag}`)
      if (String(error.message).includes('sk-secret-echo-check') || JSON.stringify(error.body ?? {}).includes('sk-secret-echo-check')) verdict('NOTE', 'the error echoes the key: never log credential errors\' bodies (db.js logs status and _tag only)')
    }
  })

  await item(3, 'POST …/prompt {id}: client message ids, their order, extra fields', async (say, verdict) => {
    const s = await ensure()
    const info = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }] })
    say(`POST /api/session → ${info.id}`)
    const a = await s.prompt(info.id, 'first PLAIN_A')
    await a.end()
    // An id that sorts before the first one (the bridge's ids are time-ordered, but two bridges' clocks may differ).
    const early = 'msg_000000000000aaaaaaaaaaaaaa'
    const b = await s.prompt(info.id, 'second PLAIN_B', { id: early })
    await b.end()
    const list = await s.messages(info.id)
    const users = list.filter((message) => message.type === 'user').map((message) => message.id)
    say(`user messages in list order: ${users.join(', ')}`)
    if (!users.includes(a.id) || !users.includes(early)) verdict('FAIL', 'a client id was not kept')
    else if (users.indexOf(early) < users.indexOf(a.id)) verdict('NOTE', 'messages are ordered by id, not by arrival: a lower client id lands earlier in the transcript')
    else say('messages keep arrival order (seq), whatever the id')
    try { await s.api.post(`/api/session/${info.id}/prompt`, { id: 'not-a-message-id', text: 'bad id' }); verdict('NOTE', 'an id without msg_ was accepted') } catch (error) { say(`id without msg_: ${error.status} ${error._tag}`) }
    try { await s.api.post(`/api/session/${info.id}/prompt`, { text: 'extra field PLAIN_C', parts: [] }); verdict('NOTE', 'an unknown body field (1.x\'s parts) was accepted: Effect ignores extra fields') } catch (error) { say(`unknown body field: ${error.status} ${error._tag} (the bridge never sends one)`) }
    await sleep(1500)
  })

  await item(4, 'a reject / form cancel without a message vs an interrupt first: how the execution ends', async (say, verdict) => {
    const s = await ensure()
    // A form case allows every tool (the question tool's own ask would come first); the others ask for everything.
    const runCase = async (label, text, onAsk, { form = false } = {}) => {
      const info = await s.session({ permissions: form ? [{ action: '*', resource: '*', effect: 'allow' }] : ASK_ALL })
      const turn = await s.prompt(info.id, text)
      const asked = await s.waitEvent((event) => (form ? event.type === 'form.created' && event.data?.form?.sessionID === info.id : event.type === 'permission.asked' && event.data?.sessionID === info.id), 60000, turn.from)
      await onAsk(asked, info)
      const end = await turn.end(60000)
      const list = await s.messages(info.id)
      const last = list.at(-1)
      say(`${label}: ${end.type}${end.data?.reason ? ` reason ${end.data.reason}` : ''}; last message ${last?.type}${last?.type === 'idle' || last?.outcome ? ` ${JSON.stringify(last.outcome ?? last.status ?? '')}` : ''}`)
      // A claim left behind would block the next prompt.
      const next = await s.prompt(info.id, 'then PLAIN_NEXT')
      const nextEnd = await next.end(60000).catch(() => null)
      say(`  next prompt on that session: ${nextEnd ? nextEnd.type : 'did not run within 60 s (claim left behind?)'}`)
      return { end, nextEnd }
    }
    const reject = await runCase('reject, no message', 'reject RUN_SHELL', (asked, info) => s.api.post(`/api/session/${info.id}/permission/${asked.data.id}/reply`, { decision: 'reject' }))
    if (reject.end.data?.reason === 'shutdown') say('as the plan says: a reject without a message ends the execution as a shutdown (the bridge interrupts instead)')
    await runCase('form cancel, no message', 'cancel ASK_QUESTION', (asked, info) => s.api.delete(`/api/session/${info.id}/form/${asked.data.form.id}`), { form: true })
    const interrupt = await runCase('interrupt first (resume=false)', 'interrupt RUN_SHELL', (asked, info) => s.api.interrupt(info.id))
    if (interrupt.end.type !== 'session.execution.interrupted' || interrupt.end.data?.reason !== 'user') verdict('FAIL', 'an interrupt did not end with reason user')
    if (!interrupt.nextEnd) verdict('FAIL', 'the session did not run again after an interrupt')
    const withMessage = await runCase('reject with a message', 'reject note RUN_SHELL', (asked, info) => s.api.post(`/api/session/${info.id}/permission/${asked.data.id}/reply`, { decision: 'reject', message: 'Not now.' }))
    if (withMessage.end.type !== 'session.execution.succeeded') verdict('NOTE', 'a reject with a message did not let the execution go on')
  })

  await item(5, 'two parallel asks: a reject with a message rejects both; permission.asked vs tool.called order', async (say, verdict) => {
    const s = await ensure()
    const info = await s.session({ permissions: ASK_ALL })
    const turn = await s.prompt(info.id, 'parallel TWO_SHELL')
    const first = await s.waitEvent((event) => event.type === 'permission.asked' && event.data?.sessionID === info.id, 60000, turn.from)
    await sleep(1500)
    const asks = s.events.slice(turn.from).filter((event) => event.type === 'permission.asked' && event.data?.sessionID === info.id)
    say(`asks open together: ${asks.length}`)
    await s.api.post(`/api/session/${info.id}/permission/${first.data.id}/reply`, { decision: 'reject', message: 'Neither.' })
    await turn.end(60000)
    const replied = s.events.slice(turn.from).filter((event) => event.type === 'permission.replied' && event.data?.sessionID === info.id)
    say(`permission.replied events: ${replied.length} (${replied.map((event) => event.data.reply).join(', ')})`)
    if (asks.length === 2 && replied.length !== 2) verdict('FAIL', 'the second ask was not rejected with the first (the bridge withdraws cards on permission.replied)')
    const order = typesSince(s.events, turn.from, info.id).filter((type) => /permission\.asked|tool\.(called|input|success|failed|error)/.test(type))
    say(`order: ${order.join(' → ')}`)
  })

  await item(6, 'sub-agents: the child session, its rules, its tools (question)', async (say, verdict) => {
    const s = await ensure()
    const info = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }, { action: 'question', resource: '*', effect: 'deny' }] })
    const turn = await s.prompt(info.id, 'go SPAWN_AGENT')
    const created = await s.waitEvent((event) => event.type === 'session.created' && event.data?.parentID === info.id, 60000, turn.from)
    say(`session.created for the child ${created.data.sessionID} (agent ${created.data.agent}) ${JSON.stringify(created.location ?? {})}`)
    const child = await s.api.session(created.data.sessionID)
    say(`child permissions: ${JSON.stringify(child.permissions ?? null).slice(0, 400)}`)
    say(`child metadata: ${JSON.stringify(child.metadata ?? null).slice(0, 200)}`)
    await turn.end(90000)
    const childRequest = model.requests.find((body) => JSON.stringify(body.messages).includes('SUBAGENT_CHILD do it'))
    const tools = childRequest ? toolNames(childRequest) : []
    say(`the child's model request tools: ${tools.join(', ')}`)
    if (tools.includes('question')) verdict('NOTE', 'the general sub-agent still has `question` although its parent denies it: the bridge PATCHes child rules (childRulesV2) after session.created')
  })

  await item(7, 'the plugin: {id, setup} loads, session.context may wait 10 s, permission.evaluate deny, mcp.transform, "-*"', async (say, verdict) => {
    const s = await ensure()
    const plugins = await s.api.get('/api/plugin', { location: where.workspace })
    const mine = (Array.isArray(plugins) ? plugins : []).find((plugin) => plugin.id === 'oc2-probe')
    say(`GET /api/plugin: oc2-probe ${mine ? JSON.stringify({ state: mine.state, source: mine.source?.type }) : 'NOT LISTED'}`)
    if (!mine) verdict('FAIL', 'the {id, setup} plugin from OPENCODE_CONFIG_CONTENT is not loaded')
    const info = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }] })
    fs.writeFileSync(`${where.pluginLog}.delay`, '1')
    const started = Date.now()
    const turn = await s.prompt(info.id, 'wait PLAIN_WAIT')
    const end = await turn.end(60000)
    fs.rmSync(`${where.pluginLog}.delay`, { force: true })
    const log = readLines(where.pluginLog).map((line) => JSON.parse(line))
    say(`a 10 s wait in session.context: the turn ${end.type} after ${ms(started)}; waited: ${log.some((entry) => entry.hook === 'context-waited')}`)
    if (end.type !== 'session.execution.succeeded') verdict('FAIL', 'a 10 s session.context hook broke the step (the bridge waits up to 10 s for the runtime file)')
    const denied = await s.session({ permissions: ASK_ALL })
    const deny = await s.prompt(denied.id, 'deny RUN_DENY')
    const asked = await Promise.race([s.waitEvent((event) => event.type === 'permission.asked' && event.data?.sessionID === denied.id, 15000, deny.from).then(() => true, () => false), deny.end(60000).then(() => false)])
    await deny.end(60000)
    const messages = JSON.stringify(await s.messages(denied.id))
    say(`permission.evaluate deny: a card was ${asked ? 'STILL ASKED' : 'not asked'}; the tool error carries the message: ${messages.includes('Denied by the probe plugin.')}`)
    if (asked) verdict('FAIL', 'an evaluate hook\'s deny did not stop the ask')
    // mcp.transform: a server the config enables, the plugin turns off.
    fs.writeFileSync(where.configFile, JSON.stringify({ ...JSON.parse(fs.readFileSync(where.configFile, 'utf8')), mcp: { servers: { probe_off: { type: 'local', command: [process.execPath, '-e', 'setInterval(()=>{},1e6)'] } } } }, null, 2))
    let status = null
    for (let attempt = 0; attempt < 40; attempt++) {
      const list = await s.api.get('/api/mcp', { location: where.workspace }).catch(() => [])
      status = (Array.isArray(list) ? list : []).find((server) => server.name === 'probe_off' || server.id === 'probe_off')
      if (status) break
      await sleep(500)
    }
    say(`mcp.transform disabled: ${JSON.stringify(status ?? 'not listed').slice(0, 300)}`)
    // A project that removes every plugin ("-*"): v2 loads OPENCODE_CONFIG_CONTENT after the project's documents
    // (core/src/config.ts load; only managed settings come later) and folds every document's `plugins` in that order
    // (plugin/supervisor.ts resolve), so the CONTENT plugin is added back. GET /api/plugin doesn't await a location's
    // activation (server/src/handlers/plugin.ts): live round 2 read the new location's list before it ran ("GONE []",
    // not even the guarded built-ins). So GET /api/agent (awaitPlugins) first, as the bridge's guard does
    // (bridgePluginGuardV2), and a list that is a finished activation's: it holds the built-ins no "-…" removes.
    const listedAfterActivation = async (directory) => {
      await s.api.get('/api/agent', { location: directory, timeout: 15000 }).catch((error) => say(`GET /api/agent ${path.basename(directory)}: ${error.message}`))
      const list = await s.api.get('/api/plugin', { location: directory }).catch((error) => ({ error: error.message }))
      const plugins = Array.isArray(list) ? list : []
      return { list, activated: plugins.some((plugin) => GUARDED_PLUGINS.has(plugin.id)), mine: plugins.find((plugin) => plugin.source?.type === 'local' && path.resolve(plugin.source.path ?? '') === path.resolve(where.pluginDir)), builtins: plugins.filter((plugin) => plugin.source?.type === 'builtin').map((plugin) => plugin.id) }
    }
    const project = path.join(where.dir, 'minus-star')
    fs.mkdirSync(path.join(project, '.opencode'), { recursive: true })
    fs.writeFileSync(path.join(project, '.opencode', 'opencode.json'), JSON.stringify({ plugins: ['-*'] }))
    const there = await listedAfterActivation(project)
    say(`a project with plugins ["-*"]: activated ${there.activated} (built-ins left: ${there.builtins.join(', ') || 'none'}); oc2-probe ${there.mine ? JSON.stringify({ id: there.mine.id, state: there.mine.state }) : `GONE ${JSON.stringify(there.list).slice(0, 200)}`}`)
    const setups = readLines(where.pluginLog).map((line) => JSON.parse(line)).filter((entry) => entry.hook === 'setup').map((entry) => entry.location)
    say(`  its setup ran for that location: ${setups.some((location) => typeof location === 'string' && path.basename(location) === 'minus-star')}`)
    if (!there.activated) verdict('FAIL', 'after GET /api/agent the location\'s plugin list still has no guarded built-in: GET /api/agent no longer awaits the activation (the bridge\'s guard relies on it)')
    else if (there.mine?.state?.status !== 'active') verdict('FAIL', 'a project\'s "-*" removed the plugin from OPENCODE_CONFIG_CONTENT (the bridge refuses turns there: bridgePluginGuardV2)')
    // A project plugins folder whose plugin claims the same id: discovered before any document, it loads first. The
    // bridge's guard then refuses that folder (its own plugin is not the active one); this shows what serve lists.
    const twin = path.join(where.dir, 'same-id')
    fs.mkdirSync(path.join(twin, '.opencode', 'plugins'), { recursive: true })
    fs.writeFileSync(path.join(twin, '.opencode', 'plugins', 'twin.js'), 'export default { id: "oc2-probe", setup: async () => {} }\n')
    const twinned = await listedAfterActivation(twin)
    say(`a project plugin with the id oc2-probe: the CONTENT plugin ${twinned.mine ? JSON.stringify(twinned.mine.state) : 'NOT LISTED'}; others with the id: ${JSON.stringify((Array.isArray(twinned.list) ? twinned.list : []).filter((plugin) => plugin.id === 'oc2-probe' && plugin !== twinned.mine).map((plugin) => ({ source: plugin.source, state: plugin.state }))).slice(0, 300)}`)
    if (twinned.mine?.state?.status === 'active') verdict('NOTE', 'a same-id project plugin did not take the id (no harm: the bridge\'s plugin is the active one)')
    else if (!/^Duplicate plugin ID/.test(String(twinned.mine?.state?.error ?? ''))) verdict('NOTE', 'a same-id project plugin: the CONTENT plugin is not active, but not as "Duplicate plugin ID" (the guard refuses either way)')
  })

  await item(8, 'the overlay: hot reload delay of OPENCODE_CONFIG; experimental.todo → todowrite', async (say, verdict) => {
    const s = await ensure()
    const started = Date.now()
    const current = JSON.parse(fs.readFileSync(where.configFile, 'utf8'))
    fs.writeFileSync(where.configFile, JSON.stringify({ ...current, commands: { 'probe-cmd': { template: 'PROBE_TEMPLATE $ARGUMENTS', description: 'Probe command' } } }, null, 2))
    let seen = false
    for (let attempt = 0; attempt < 60 && !seen; attempt++) {
      const list = await s.api.get('/api/command', { location: where.workspace }).catch(() => [])
      seen = (Array.isArray(list) ? list : []).some((command) => command.name === 'probe-cmd')
      if (!seen) await sleep(250)
    }
    say(`a command added to the OPENCODE_CONFIG file: ${seen ? `listed after ${ms(started)}` : 'NOT listed within 15 s'}`)
    if (!seen) verdict('FAIL', 'the overlay file is not hot-reloaded')
    const withTools = model.requests.filter((body) => toolNames(body).length > 1).at(-1)
    const tools = withTools ? toolNames(withTools) : []
    say(`tools of the latest model request: ${tools.join(', ')}`)
    if (!tools.includes('todowrite')) verdict('FAIL', 'experimental.todo in OPENCODE_CONFIG_CONTENT did not bring todowrite')
    if (tools.includes('execute')) say('Code Mode `execute` is offered (the bridge denies it per session)')
  })

  await item(9, 'the shell wrapper: $OPENCODE_SESSION_ID, a sub-agent\'s first command', async (say, verdict) => {
    const s = await ensure()
    const info = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }] })
    const before = readLines(where.shellLog).length
    const turn = await s.prompt(info.id, 'go RUN_SHELL')
    await turn.end(60000)
    const lines = readLines(where.shellLog).slice(before)
    say(`wrapper calls: ${lines.length}; session ids seen: ${[...new Set(lines.map((line) => line.split('\t')[1]))].join(', ')}`)
    if (!lines.some((line) => line.split('\t')[1] === info.id)) verdict('FAIL', 'the wrapper does not see $OPENCODE_SESSION_ID (its sandbox would be read-only)')
    const parent = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }] })
    const spawn = await s.prompt(parent.id, 'go SPAWN_SHELL_AGENT')
    const created = await s.waitEvent((event) => event.type === 'session.created' && event.data?.parentID === parent.id, 60000, spawn.from)
    const createdAt = Date.now()
    await spawn.end(90000)
    const child = readLines(where.shellLog).find((line) => line.split('\t')[1] === created.data.sessionID)
    say(`the child's first command: ${child ? `ran with its own id, about ${Number(child.split('\t')[0]) - createdAt} ms after session.created reached here` : 'not seen'}`)
    if (!child) verdict('NOTE', 'no command of the sub-agent reached the wrapper')
  })

  await item(10, 'stop: interrupt then stdin EOF; what a stop without the interrupt leaves', async (say, verdict) => {
    // A dedicated serve: this item restarts it.
    const local = makeHome('stop')
    let s = await startServe(local)
    const runHanging = async () => {
      const info = await s.session({ permissions: [{ action: '*', resource: '*', effect: 'allow' }] })
      const turn = await s.prompt(info.id, 'forever HANG_FOREVER')
      await s.waitEvent((event) => event.type === 'session.execution.started' && event.data?.sessionID === info.id, 30000, turn.from)
      await sleep(800)
      return info
    }
    let info = await runHanging()
    let started = Date.now()
    await s.stop()
    say(`stop with interrupt: serve exited in ${ms(started)}`)
    model.releaseHangers()
    s = await startServe(local)
    let active = await s.api.active()
    say(`after restart: active ${JSON.stringify(active)}; next prompt on that session:`)
    let next = await s.prompt(info.id, 'again PLAIN_AGAIN')
    let end = await next.end(60000).catch(() => null)
    say(`  ${end ? end.type : 'did not run within 60 s'}`)
    if (!end) verdict('FAIL', 'a session interrupted before the stop does not run again')
    info = await runHanging()
    started = Date.now()
    // The lease alone (what a crash of the bridge leaves): stdin EOF, no interrupt.
    s.server.stopped = true
    await new Promise((resolve) => { s.server.child.once('exit', resolve); s.server.child.stdin.end() })
    say(`stop by stdin EOF only: serve exited in ${ms(started)}`)
    model.releaseHangers()
    s = await startServe(local)
    active = await s.api.active()
    const list = await s.messages(info.id)
    say(`after restart: active ${JSON.stringify(active)}; last message ${list.at(-1)?.type}`)
    next = await s.prompt(info.id, 'again PLAIN_AGAIN')
    end = await next.end(60000).catch(() => null)
    say(`  next prompt: ${end ? end.type : 'did not run within 60 s (a claim was left: the bridge must interrupt before closing stdin)'}`)
    if (!end) verdict('NOTE', 'EOF alone leaves the session unusable: the bridge\'s interrupt-first stop is needed')
    await s.stop()
  })

  if (serve) await serve.stop()

  await item(11, 'claude-agent (opt-in): connect, status, models, a shell turn through the wrapper, agent switch, generate, effort', async (say, verdict) => {
    if (!withClaude) { verdict('SKIP', 'pass --claude (or CODE_DESKTOP_PROBE_CLAUDE=1) to run it; it uses your Claude Code sign-in'); return }
    const finder = new ClaudeCode({ env: process.env })
    const found = await finder.locate({ fresh: true })
    if (!found) { verdict('FAIL', 'no claude found (login shell, then the installers\' places)'); return }
    const claudeVersion = await finder.version(found)
    const status = await finder.authStatus({ fresh: true, found })
    say(`claude ${found.path} (${found.source}) ${JSON.stringify(claudeVersion)}; auth status ${JSON.stringify(status).slice(0, 300)}`)
    const anthropic = finder.anthropicEnv()
    if (anthropic?.length) say(`NOTE ${anthropic.join(', ')} set: Claude Code bills that instead of the subscription`)
    const local = makeHome('claude', { realHome: true })
    const s = await startServe(local, { env: finder.serveEnv(found) })
    try {
      // One location for every call: integrations, their statuses and the claude-agent check are per location (the
      // Integration service and the plugin run per location; credentials are global). The bridge uses the home folder.
      const at = { location: local.workspace }
      // GET …/:id and connect/* don't wait for the location's plugins (server/src/handlers/integration.ts: only
      // integration.list awaits Plugin.awaitActivation), and claude-agent is a plugin's registration: on a fresh
      // location they may answer 404 "Integration not found" (live round 2). What a fresh folder answers first:
      const cold = path.join(local.dir, 'cold')
      fs.mkdirSync(cold, { recursive: true })
      const early = await s.api.get('/api/integration/claude-agent', { location: cold }).then(() => '200', (error) => `${error.status} ${error._tag}`)
      say(`GET …/claude-agent on a folder whose plugins may not have run: ${early} (404 = the race; the list waits)`)
      const listedAt = Date.now()
      const listed = await s.api.get('/api/integration', { ...at, timeout: 30000 })
      const entry = (Array.isArray(listed) ? listed : []).find((item) => item?.id === 'claude-agent')
      say(`GET /api/integration: ${ms(listedAt)}, claude-agent ${entry ? JSON.stringify({ name: entry.name, methods: entry.methods, connections: entry.connections }).slice(0, 300) : `not listed (ids: ${(listed ?? []).map((item) => item?.id).join(', ')})`}`)
      if (!entry) {
        // Not registered: a config "plugins" remove op ("-*", "-opencode.provider.claude-agent") drops the unguarded
        // built-in (plugin/supervisor.ts resolve, internal.ts guarded); an integration.connect deny hides it from the list.
        // The list just awaited the activation, so GET /api/plugin (which doesn't) is complete here.
        const plugins = await s.api.get('/api/plugin', at).catch((error) => ({ error: error.message }))
        const mine = Array.isArray(plugins) ? plugins.find((plugin) => plugin?.id === 'opencode.provider.claude-agent') : null
        say(`GET /api/plugin: opencode.provider.claude-agent ${mine ? JSON.stringify(mine.state) : Array.isArray(plugins) ? `not listed (ids: ${plugins.map((plugin) => plugin?.id).join(', ')})` : JSON.stringify(plugins)}`)
        verdict('FAIL', `claude-agent is not in the integration list (${mine ? 'its plugin is loaded: an integration.connect policy?' : 'its plugin is off: a "plugins" remove op in a config?'})`)
        return
      }
      if (!entry.methods?.some((method) => method?.id === 'claude-login' && method?.type === 'external')) verdict('FAIL', 'no external claude-login method')
      const started = Date.now()
      await s.api.post('/api/integration/claude-agent/connect/external', { methodID: 'claude-login' }, at)
      let models = []
      let integration = null
      for (let attempt = 0; attempt < 120; attempt++) {
        integration = await s.api.get('/api/integration/claude-agent', at).catch(() => null)
        const list = await s.api.get('/api/model', at).catch(() => [])
        models = (Array.isArray(list) ? list : []).filter((entry) => (entry.providerID ?? entry.provider?.id) === 'claude-agent')
        const connection = integration?.connections?.[0]
        if (connection?.status || models.length) say(`  ${Math.round((Date.now() - started) / 1000)} s: status ${JSON.stringify(connection?.status ?? null).slice(0, 200)}, ${models.length} models`)
        if (models.length && !connection?.status) break
        if (connection?.status?.status === 'needs_auth' && attempt > 35) break
        await sleep(1000)
      }
      say(`connect/external → models listed after ${ms(started)}: ${models.map((entry) => entry.id).join(', ') || 'none'}`)
      if (!models.length) { verdict('FAIL', 'no claude-agent model within 120 s'); return }
      const chosen = models.find((entry) => /sonnet/i.test(entry.id)) ?? models[0]
      const ref = { providerID: 'claude-agent', id: chosen.id }
      const info = await s.session({ model: ref, permissions: ASK_ALL })
      const before = readLines(local.shellLog).length
      const turn = await s.prompt(info.id, 'Use your shell tool to run exactly this command: echo probe-claude-shell — then reply with its output and nothing else.')
      const asked = await s.waitEvent((event) => event.type === 'permission.asked' && event.data?.sessionID === info.id, 180000, turn.from).catch(() => null)
      say(`permission.asked: ${asked ? `${asked.data.action} ${JSON.stringify(asked.data.resources).slice(0, 120)} (source ${JSON.stringify(asked.data.source ?? null)})` : 'none within 180 s'}`)
      if (asked) await s.api.post(`/api/session/${info.id}/permission/${asked.data.id}/reply`, { decision: 'once' })
      else verdict('FAIL', 'Claude\'s shell call did not ask (mcp__opencode__* tools should route through permission.asked)')
      const end = await turn.end(240000).catch(() => null)
      say(`turn: ${end?.type ?? 'no end in 240 s'}; wrapper calls with this session: ${readLines(local.shellLog).slice(before).filter((line) => line.includes(info.id)).length}`)
      if (asked && !readLines(local.shellLog).slice(before).some((line) => line.includes(info.id))) verdict('NOTE', 'the command did not go through the shell wrapper (no sandbox for Claude\'s commands)')
      for (const agent of ['plan', 'build']) {
        const t = Date.now()
        await s.api.post(`/api/session/${info.id}/agent`, { agent })
        const next = await s.prompt(info.id, `Reply with the single word ${agent.toUpperCase()}.`)
        const done = await next.end(180000).catch(() => null)
        say(`switch to ${agent} + one prompt: ${done?.type ?? 'no end'} in ${ms(t)} (a switch restarts the Claude process)`)
      }
      const t = Date.now()
      const generated = await s.api.post(`/api/session/${info.id}/generate`, { prompt: 'In one short sentence: what did we just do?' }, { timeout: 180000 }).catch((error) => ({ error: error.message }))
      say(`generate (side question): ${ms(t)}: ${JSON.stringify(generated).slice(0, 200)}`)
      // Model.Info.variants is a list of Model.Variant {id, …} (openapi.json); a keyed object only as a fallback.
      const variants = Array.isArray(chosen.variants) ? chosen.variants.map((entry) => entry?.id).filter((id) => typeof id === 'string' && id) : Object.keys(chosen.variants ?? {})
      say(`efforts (variants): ${variants.join(', ') || 'none'}`)
      if (variants.length) {
        const e = Date.now()
        await s.api.post(`/api/session/${info.id}/model`, { model: { ...ref, variant: String(variants[0]) } })
        const next = await s.prompt(info.id, 'Reply with the single word EFFORT.')
        const done = await next.end(180000).catch(() => null)
        say(`effort ${variants[0]} + one prompt: ${done?.type ?? 'no end'} in ${ms(e)}`)
      }
    } finally { await s.stop() }
  })
}

let fatal = null
try { await main() } catch (error) { fatal = error }
model.close()
if (!process.env.KEEP_PROBE_HOME) for (const dir of made) fs.rmSync(dir, { recursive: true, force: true })
else console.log(`temp folders kept: ${made.join(', ')}`)
console.log('\n================ OpenCode 2.x live probe report ================')
for (const entry of report) {
  console.log(`[${entry.n}] ${entry.verdict.padEnd(4)} ${entry.title}`)
  for (const line of entry.lines) console.log(`         ${line}`)
}
if (fatal) console.log(`\nSETUP FAILED: ${fatal?.stack ?? fatal}`)
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ binary, at: new Date().toISOString(), report, fatal: fatal ? String(fatal?.stack ?? fatal) : null }, null, 2))
const failed = report.filter((entry) => entry.verdict === 'FAIL').length
console.log(`\n${report.length} items: ${report.filter((entry) => entry.verdict === 'OK').length} OK, ${report.filter((entry) => entry.verdict === 'NOTE').length} NOTE, ${failed} FAIL, ${report.filter((entry) => entry.verdict === 'SKIP').length} SKIP`)
process.exit(fatal || failed ? 1 : 0)
