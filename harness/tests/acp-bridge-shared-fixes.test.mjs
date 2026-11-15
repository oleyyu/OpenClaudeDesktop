// Shared display / integration fixes ported from 0.3 (display bug D-09, D-10, D-11; integration bug D5):
//  - D-09 Gemini shell rows: output and exit code read from Gemini's session file (its ACP sends neither), live, after a
//    restart and for a stored history that has them bare; a non-zero exit fails the row;
//  - D-10 Gemini's own model retries (its debug log only) as Codex retry notices while the turn runs;
//  - D-11 results an agent puts only in rawOutput (MiniMax Code's web_search / web_fetch / website_deploy / failed edit);
//  - D5 a stop while the agent is still starting: no prompt reaches the agent, the turn ends at once, the start goes on.
// The bridge runs against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import * as gemini from '../packages/acp-bridge/src/agents/gemini.js'
import * as projection from '../packages/acp-bridge/src/projection.js'

// Read through the module namespaces, so each test fails on its own where a helper is missing (before the fixes).
const geminiShellResult = (...args) => gemini.geminiShellResult(...args)
const geminiRetryEvents = (...args) => gemini.geminiRetryEvents(...args)
const completeToolItem = (...args) => projection.completeToolItem(...args)
const rawOutputText = (...args) => projection.rawOutputText(...args)
const withCommandOutput = (...args) => projection.withCommandOutput(...args)

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-shared-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function bridge({ home = tmp(), env = {} } = {}) {
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter: adapterById('gemini'), log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath,
      CODE_DESKTOP_AGENT_VERSION: '0.64.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), FAKE_ACP_UUID_SESSIONS: '1', FAKE_ACP_NO_RESUME: '1', FAKE_ACP_LOG: path.join(home, 'agent.log'), ...env,
    },
  })
  const notes = []
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({ decision: 'accept' }), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await sleep(20)
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }] })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => { try { return fs.readFileSync(path.join(home, 'agent.log'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) } catch { return [] } }
  return { home, notes, call, turn, waitFor, agentLog, close: () => server.shutdown() }
}
const commands = (turns) => turns.flatMap((turn) => turn.items).filter((item) => item.type === 'commandExecution').map(({ id, command, status, exitCode, aggregatedOutput }) => ({ id, command, status, exitCode, aggregatedOutput }))
const FILLED = [
  { id: 'run_shell_command-1', command: 'echo hi; exit 3', status: 'failed', exitCode: 3, aggregatedOutput: 'hi' },
  { id: 'run_shell_command-2', command: 'mkdir -p out', status: 'completed', exitCode: 0, aggregatedOutput: '' },
]

// ------------------------------------------------------------ D-09

test('Gemini shell rows get their output and exit code from the session file, live and after a restart', async () => {
  const home = tmp()
  let threadId
  const first = bridge({ home })
  try {
    await first.call('initialize', {})
    threadId = (await first.call('thread/start', { cwd: home })).thread.id
    const turn = await first.turn(threadId, 'gemini-shell')
    assert.equal(turn.status, 'completed')
    // The bare completion first (Gemini's update carries nothing), then the row again with what the session file holds.
    const failed = await first.waitFor((method, params) => method === 'item/completed' && params.item.id === 'run_shell_command-1' && params.item.exitCode === 3)
    assert.equal(failed.item.status, 'failed')
    assert.equal(failed.item.aggregatedOutput, 'hi')
    assert.equal('completedAtMs' in failed, false, 'the row keeps the time it first completed')
    const read = await first.call('thread/read', { threadId, includeTurns: true })
    assert.deepEqual(commands(read.thread.turns), FILLED)
  } finally { await first.close() }
  const second = bridge({ home })
  try {
    await second.call('initialize', {})
    const resumed = await second.call('thread/resume', { threadId, cwd: home })
    assert.deepEqual(commands(resumed.thread.turns), FILLED)
  } finally { await second.close() }
  // A history kept before the bridge read Gemini's results (bare rows): filled when the thread opens.
  const file = path.join(home, 'state', 'threads', `${threadId}.json`)
  const kept = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const turn of kept.turns) for (const item of turn.items) if (item.type === 'commandExecution') Object.assign(item, { aggregatedOutput: '', exitCode: 0, status: 'completed' })
  fs.writeFileSync(file, JSON.stringify(kept))
  const third = bridge({ home })
  try {
    await third.call('initialize', {})
    const resumed = await third.call('thread/resume', { threadId, cwd: home })
    assert.deepEqual(commands(resumed.thread.turns), FILLED)
    assert.deepEqual(commands(JSON.parse(fs.readFileSync(file, 'utf8')).turns), FILLED, 'kept filled')
  } finally { await third.close() }
})

test('geminiShellResult reads Gemini CLI shell results as the model got them', () => {
  const record = (output) => ({ name: 'run_shell_command', result: [{ functionResponse: { id: 'c', name: 'run_shell_command', response: { output } } }] })
  const wrap = (body) => `<untrusted_context>\n${body}\n</untrusted_context>`
  assert.deepEqual(geminiShellResult(record(wrap('Output: plain-out-1\nplain-err-1\nProcess Group PGID: 87255'))), { output: 'plain-out-1\nplain-err-1', exitCode: 0, failed: false })
  assert.deepEqual(geminiShellResult(record(wrap('Output: failing-now\nExit Code: 3\nProcess Group PGID: 87264'))), { output: 'failing-now', exitCode: 3, failed: true })
  assert.deepEqual(geminiShellResult(record(wrap('Output: (empty)\nProcess Group PGID: 1'))), { output: '', exitCode: 0, failed: false })
  assert.deepEqual(geminiShellResult(record(wrap('Output: x\nError: spawn ENOENT\nProcess Group PGID: 1'))), { output: 'x\nError: spawn ENOENT', exitCode: 0, failed: true })
  assert.deepEqual(geminiShellResult(record(wrap('Output: (empty)\nSignal: 9\nBackground PIDs: 12, 13\nProcess Group PGID: 1'))), { output: 'Signal: 9', exitCode: null, failed: true })
  // A body that closes the wrapper itself is escaped by Gemini (wrapUntrusted).
  assert.equal(geminiShellResult(record(wrap('Output: a &lt;/untrusted_context&gt; b\nProcess Group PGID: 1'))).output, 'a </untrusted_context> b')
  // Earlier releases: Command / Directory lines first, no wrapper.
  assert.deepEqual(geminiShellResult(record('Command: ls nope\nDirectory: (root)\nOutput: ls: nope: No such file\nExit Code: 1')), { output: 'ls: nope: No such file', exitCode: 1, failed: true })
  assert.equal(geminiShellResult(record(wrap('Command moved to background (PID: 77). Output hidden. Press Ctrl+B to view.'))), null)
  assert.deepEqual(geminiShellResult(record(wrap('Command was cancelled by user before it could complete. Below is the output before it was cancelled:\npartial'))), { output: 'Command was cancelled by user before it could complete. Below is the output before it was cancelled:\npartial', exitCode: null, failed: false })
  assert.equal(geminiShellResult(record(wrap('Command was automatically cancelled because it exceeded the timeout of 5.0 minutes without output. There was no output before it was cancelled.'))).failed, true)
  assert.deepEqual(geminiShellResult(record('The build passed; 3 warnings.')), { output: 'The build passed; 3 warnings.', exitCode: undefined, failed: false })
  assert.deepEqual(geminiShellResult({ result: [{ functionResponse: { response: { error: 'Tool "run_shell_command" was canceled by the user.' } } }] }), { output: 'Tool "run_shell_command" was canceled by the user.', exitCode: undefined, failed: true })
  assert.equal(geminiShellResult({ result: [] }), null)
})

test('withCommandOutput fills a finished row and leaves a declined or unchanged one', () => {
  const row = { type: 'commandExecution', id: 'c', command: 'Shell', commandActions: [{ type: 'unknown', command: 'Shell' }], status: 'completed', exitCode: 0, aggregatedOutput: '' }
  const filled = withCommandOutput(row, { command: 'npm test', output: 'FAIL', exitCode: 1, failed: true })
  assert.deepEqual({ ...filled }, { ...row, command: 'npm test', commandActions: [{ type: 'unknown', command: 'npm test' }], status: 'failed', exitCode: 1, aggregatedOutput: 'FAIL' })
  // A live row's title holds the command: kept.
  assert.equal(withCommandOutput({ ...row, command: 'npm test [in app]' }, { command: 'npm test', output: 'ok', exitCode: 0, failed: false }).command, 'npm test [in app]')
  assert.equal(withCommandOutput({ ...row, status: 'declined' }, { output: 'x', exitCode: 1, failed: true }), null)
  assert.equal(withCommandOutput({ ...row, command: 'ls' }, { command: 'ls', output: '', exitCode: 0, failed: false }), null)
  // Text that says nothing of the run (a summary) fills only a row without output.
  assert.equal(withCommandOutput({ ...row, aggregatedOutput: 'Command exited with code: 3' }, { output: 'summary', exitCode: undefined, failed: false }), null)
})

// ------------------------------------------------------------ D-10

test('Gemini model retries in its debug log show as Retrying while the turn runs', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const turn = await b.turn(thread.id, 'gemini-retry')
    assert.equal(turn.status, 'completed')
    const retries = b.notes.filter((note) => note.method === 'error' && note.params.willRetry === true).map((note) => ({ retry: note.params.retry, error: note.params.error }))
    assert.deepEqual(retries, [
      { retry: { attempt: 1, maxRetries: 9, delayMs: null }, error: { message: 'Gemini CLI: The model is overloaded. Please try again later.', codexErrorInfo: 'serverOverloaded', additionalDetails: null } },
      { retry: { attempt: 2, maxRetries: 9, delayMs: 2150 }, error: { message: 'Gemini CLI: You exceeded your current quota, please check your plan and billing details.', codexErrorInfo: 'rateLimitExceeded', additionalDetails: null } },
    ])
    // The log is the thread's own, in its launch folder (a new thread's: the draft folder it started in).
    const logs = fs.readdirSync(path.join(b.home, 'state'), { recursive: true }).filter((name) => path.basename(String(name)) === 'gemini-debug.log')
    assert.equal(logs.length, 1)
  } finally { await b.close() }
})

test('geminiRetryEvents reads every retry line Gemini CLI writes and skips its last attempt', () => {
  const at = (n) => `[2026-11-14T12:2${n}:00.000Z]`
  const log = [
    `${at(1)} [DEBUG] Experiments loaded {\n  experimentIds: [],\n  flags: []\n}`,
    `${at(2)} [WARN] Attempt 1 failed with status 503. Retrying with backoff... _ApiError: {"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}\n    at throwErrorIfNotOK (file:///x.js:1:1)`,
    `${at(3)} [WARN] Attempt 2 failed with 429 error (no Retry-After header). Retrying with backoff... Error: got status: 429 Too Many Requests. {"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}`,
    `${at(4)} [WARN] Attempt 3 failed with 5xx error. Retrying with backoff... Error: got status: 502 Bad Gateway.`,
    `${at(5)} [WARN] Attempt 4 failed. Retrying with backoff... TypeError: fetch failed\n    at node:internal/deps/undici:1:1`,
    `${at(6)} [WARN] Attempt 5 failed: Quota exceeded for metric x.\nPlease retry in 9s.. Retrying after 9650ms...`,
    `${at(7)} [WARN] Attempt 10 failed: The model is overloaded. Please try again later.. Max attempts reached`,
  ].join('\n') + '\n'
  const events = geminiRetryEvents(log, { maxAttempts: 10 })
  assert.deepEqual(events.map((event) => event.retry), [
    { attempt: 1, maxRetries: 9, delayMs: null }, { attempt: 2, maxRetries: 9, delayMs: null }, { attempt: 3, maxRetries: 9, delayMs: null },
    { attempt: 4, maxRetries: 9, delayMs: null }, { attempt: 5, maxRetries: 9, delayMs: 9650 },
  ])
  assert.deepEqual(events.map((event) => event.error.codexErrorInfo), ['serverOverloaded', 'rateLimitExceeded', 'internalServerError', { responseStreamConnectionFailed: { httpStatusCode: null } }, 'rateLimitExceeded'])
  assert.deepEqual(events.map((event) => event.error.message), ['The model is overloaded. Please try again later.', 'Resource has been exhausted (e.g. check quota).', 'got status: 502 Bad Gateway.', 'fetch failed', 'Quota exceeded for metric x.'])
  // A count past the known limit (a fallback model's own attempts): no total.
  assert.equal(geminiRetryEvents(`${at(1)} [WARN] Attempt 3 failed with status 503. Retrying with backoff... x\n`, { maxAttempts: 3 })[0].retry.maxRetries, null)
})

// ------------------------------------------------------------ D-11

test('Results an agent puts only in rawOutput reach their rows (MiniMax Code)', () => {
  const done = (item, raw, failed = false) => completeToolItem(item, { toolCallId: item.id, content: [], rawOutput: raw }, { failed, declined: false, durationMs: 5, cwd: '/w' })
  const search = done({ type: 'webSearch', id: 'ws', query: 'acp', status: 'inProgress' }, { text: '1. ACP spec — https://agentclientprotocol.com', details: {} })
  assert.equal(search.results, '1. ACP spec — https://agentclientprotocol.com')
  const fetchFailed = done({ type: 'webSearch', id: 'wf', query: 'x', status: 'inProgress' }, { error: 'HTTP 404 fetching https://x.test' }, true)
  assert.deepEqual(fetchFailed.error, { message: 'HTTP 404 fetching https://x.test' })
  const deployed = done({ type: 'dynamicToolCall', id: 'wd', tool: 'website_deploy', status: 'inProgress' }, { content: [{ type: 'text', text: 'Website deployed: https://site.test' }] })
  assert.deepEqual(deployed.contentItems, [{ type: 'inputText', text: 'Website deployed: https://site.test' }])
  const edit = done({ type: 'fileChange', id: 'ed', changes: [], status: 'inProgress' }, { text: 'old_string not found in a.txt' }, true)
  assert.equal(edit.status, 'failed')
  assert.deepEqual(edit.error, { message: 'old_string not found in a.txt' })
  assert.equal(rawOutputText({ details: {} }), '')
  assert.equal(rawOutputText({ message: 'boom' }, { failed: true }), 'boom')
})

// ------------------------------------------------------------ D5

test('D5: a stop while the agent is still starting sends no prompt and ends the turn at once; the next turn reuses the start', async () => {
  const home = tmp()
  let threadId
  const first = bridge({ home })
  try {
    await first.call('initialize', {})
    threadId = (await first.call('thread/start', { cwd: home })).thread.id
    assert.equal((await first.turn(threadId, 'hello')).status, 'completed')
  } finally { await first.close() }
  // A reopened app's first message: the new process takes 2 s to answer initialize.
  const b = bridge({ home, env: { FAKE_ACP_INIT_DELAY: '2000' } })
  try {
    await b.call('initialize', {})
    await b.call('thread/resume', { threadId, cwd: home })
    const before = b.agentLog().length
    const { turn: started } = await b.call('turn/start', { threadId, input: [{ type: 'text', text: 'hello', text_elements: [] }] })
    await sleep(300)
    const stoppedAt = Date.now()
    await b.call('turn/interrupt', { threadId, turnId: started.id })
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)
    const tookMs = Date.now() - stoppedAt
    assert.equal(done.turn.status, 'interrupted')
    assert.ok(tookMs < 1000, `the turn ended ${tookMs} ms after the stop, not once the start finished`)
    // The start finishes (and the session opens) on its own; the stopped prompt never reaches the agent.
    await sleep(2500)
    const seen = b.agentLog().slice(before).map((entry) => entry.method)
    assert.equal(seen.includes('session/prompt'), false, `the agent saw: ${seen.join(', ')}`)
    assert.equal(seen.includes('session/cancel'), false, 'no session/cancel to an agent that has no prompt')
    // The next message goes to the process that was starting: one start, one prompt.
    const next = await b.turn(threadId, 'hello')
    assert.equal(next.status, 'completed')
    const after = b.agentLog().slice(before).map((entry) => entry.method)
    assert.equal(after.filter((method) => method === 'initialize').length, 1, `the agent saw: ${after.join(', ')}`)
    assert.equal(after.filter((method) => method === 'session/prompt').length, 1)
  } finally { await b.close() }
})
