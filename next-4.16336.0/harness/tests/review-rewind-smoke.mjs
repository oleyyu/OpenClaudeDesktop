// End-to-end smoke of review/start and thread/revert on the real DeepSeek Harness core against a scripted
// Anthropic-Messages model on loopback: no key, no network, a private HOME/DSH_HOME/XDG under the temp root.
//   review/start   a read-only turn (the model's write is refused without a card), Review started / Review result
//   thread/revert  the turns after the cut leave the transcript and the model's next request, also after a reload
//
// Usage: node tests/review-rewind-smoke.mjs   (exit code 0 = all checks passed)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const stderr = []
const childProcess = require('node:child_process')
const spawn = childProcess.spawn
childProcess.spawn = (...args) => {
  const child = spawn(...args)
  child.stderr?.on('data', (chunk) => stderr.push(String(chunk)))
  return child
}
const { CodexClient } = require('../../app/electron/codex.cjs')

const tempRoot = fsSync.existsSync('/private/tmp/claude-501') ? '/private/tmp/claude-501' : os.tmpdir()
const home = await fs.realpath(await fs.mkdtemp(path.join(tempRoot, 'cd-review-rewind-')))
const workspace = path.join(home, 'workspace')
await fs.mkdir(workspace, { recursive: true })
await fs.writeFile(path.join(workspace, 'a.js'), 'export const a = 1\n')
const requests = []

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
const lastUser = (body) => [...body.messages].reverse().find((message) => message.role === 'user')
const answered = (body) => lastUser(body)?.content?.some?.((block) => block.type === 'tool_result')
const everything = (body) => body.messages.map((message) => textOf(message.content)).join('\n')

function reply(body) {
  const all = everything(body)
  if (/Review the uncommitted changes/.test(all) && !/REVIEW_DONE/.test(all)) {
    // The review tries to change a file: the read-only turn must refuse it.
    const write = (body.tools ?? []).find((tool) => /^write$/i.test(tool.name))
    if (write && !answered(body)) return { tool: { name: write.name, input: { file_path: path.join(workspace, 'evil.txt'), content: 'changed' } } }
    return { text: 'REVIEW_DONE - [P2] Missing test — a.js:1' }
  }
  return { text: `reply to: ${textOf(lastUser(body)?.content).slice(-40)}` }
}

let counter = 0
const server = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: `${req.method} ${req.url}` } }))
    return
  }
  const body = JSON.parse(raw)
  requests.push(body)
  const answer = reply(body)
  const id = `msg_${++counter}`
  const usage = { input_tokens: 10, output_tokens: 5 }
  const blocks = [...(answer.text === undefined ? [] : [{ type: 'text', text: answer.text }]), ...(answer.tool ? [{ type: 'tool_use', id: `toolu_${counter}`, name: answer.tool.name, input: answer.tool.input }] : [])]
  const stop = answer.tool ? 'tool_use' : 'end_turn'
  if (body.stream === false) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: stop, stop_sequence: null, usage }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  send('message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } })
  blocks.forEach((block, index) => {
    if (block.type === 'tool_use') {
      send('content_block_start', { type: 'content_block_start', index, content_block: { ...block, input: {} } })
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } })
    } else {
      send('content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } })
    }
    send('content_block_stop', { type: 'content_block_stop', index })
  })
  send('message_delta', { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 5 } })
  send('message_stop', { type: 'message_stop' })
  res.end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

process.env.HOME = home
process.env.DSH_HOME = path.join(home, 'dsh')
process.env.CODE_DESKTOP_CORE_STATE = path.join(home, 'state')
process.env.XDG_CONFIG_HOME = path.join(home, '.config')
process.env.XDG_DATA_HOME = path.join(home, '.local/share')
process.env.XDG_STATE_HOME = path.join(home, '.local/state')
process.env.XDG_CACHE_HOME = path.join(home, '.cache')
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${server.address().port}`
process.env.DEEPSEEK_API_KEY = 'sk-review-rewind-smoke'
const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
const events = []
let waiters = []
client.on('event', (event) => {
  events.push(event)
  // Any card is a failure here (the review must not ask); accept it so the test can see what it did.
  if (event.kind === 'request') client.respond(event.id, { decision: 'accept' }, event.bridgeApproval)
  for (const waiter of waiters) waiter(event)
})
const waitFor = (predicate, ms = 60000) => {
  const seen = events.find(predicate)
  if (seen) return Promise.resolve(seen)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting\n${stderr.join('').slice(-3000)}`)), ms)
    const waiter = (event) => {
      if (!predicate(event)) return
      clearTimeout(timer)
      waiters = waiters.filter((candidate) => candidate !== waiter)
      resolve(event)
    }
    waiters.push(waiter)
  })
}
const turnDone = (threadId, from) => waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/completed' && event.params?.threadId === threadId)
const checks = []
const check = (name, fn) => { fn(); checks.push(name); console.log('PASS', name) }
const permissions = { approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'auto', afterPlan: 'auto' } }

let exitCode = 0
try {
  const init = await client.start()
  check('review/start and thread/revert are served, the review runs without edits', () => {
    assert.ok(!init.capabilities.unsupportedMethods.includes('review/start'))
    assert.ok(!init.capabilities.unsupportedMethods.includes('thread/revert'))
    assert.equal(init.capabilities.reviewReadOnly, 'noEdits')
  })
  const started = await client.request('thread/start', { cwd: workspace, ...permissions })
  const threadId = started.thread.id
  for (const text of ['FIRST_PROMPT', 'SECOND_PROMPT']) {
    const from = events.length
    await client.request('turn/start', { threadId, input: [{ type: 'text', text }], ...permissions })
    await turnDone(threadId, from)
  }

  // review/start
  let from = events.length
  const review = await client.request('review/start', { threadId, target: { type: 'uncommittedChanges' }, delivery: 'inline' })
  await turnDone(threadId, from)
  const reviewEvents = events.slice(from)
  const reviewRequests = requests.filter((body) => /Review the uncommitted changes/.test(everything(body)))
  check('review/start answers with the review turn and the same thread', () => {
    assert.equal(review.reviewThreadId, threadId)
    assert.match(review.turn.id, /^turn-/)
    assert.equal(review.turn.status, 'inProgress')
  })
  check('the review turn shows Review started and Review result', () => {
    const entered = reviewEvents.find((event) => event.method === 'item/started' && event.params.item?.type === 'enteredReviewMode')
    const exited = reviewEvents.find((event) => event.method === 'item/completed' && event.params.item?.type === 'exitedReviewMode')
    assert.ok(entered, 'no enteredReviewMode')
    assert.equal(entered.params.turnId, review.turn.id)
    assert.equal(entered.params.item.review, 'uncommitted changes')
    assert.match(exited?.params.item.review ?? '', /REVIEW_DONE/)
  })
  check('the review is read-only: the model\'s write is refused without a card', () => {
    // The write was attempted (its result came back to the model) and changed nothing.
    const result = reviewRequests.map((body) => lastUser(body)?.content).find((content) => Array.isArray(content) && content.some((block) => block.type === 'tool_result'))
    assert.ok(result, 'the review never tried the write')
    assert.ok(result.find((block) => block.type === 'tool_result').is_error === true || /denied|refus|reject|read-only|not allowed|permission/i.test(textOf(result)), textOf(result).slice(0, 400))
    assert.equal(fsSync.existsSync(path.join(workspace, 'evil.txt')), false)
    assert.equal(reviewEvents.some((event) => event.kind === 'request'), false, 'an approval card was raised')
  })
  const busy = await client.request('review/start', { threadId, target: { type: 'custom', instructions: ' ' } }).then(() => null, (error) => error)
  check('an incomplete review target is INVALID_PARAMS', () => assert.equal(busy?.code, -32602))

  // thread/revert
  const turns = (await client.request('thread/turns/list', { threadId, limit: 50, sortDirection: 'asc' })).data
  check('three turns before the rewind', () => assert.equal(turns.length, 3))
  const reverted = await client.request('thread/revert', { threadId, beforeTurnId: turns[1].id })
  check('thread/revert answers with the turns before the cut', () => {
    assert.equal(reverted.thread.id, threadId)
    assert.deepEqual(reverted.thread.turns.map((turn) => turn.id), [turns[0].id])
    assert.equal(reverted.thread.historyMode, 'paginated')
  })
  const afterList = (await client.request('thread/turns/list', { threadId, limit: 50, sortDirection: 'asc' })).data
  check('thread/turns/list agrees', () => assert.deepEqual(afterList.map((turn) => turn.id), [turns[0].id]))
  const before = requests.length
  from = events.length
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'THIRD_PROMPT' }], ...permissions })
  await turnDone(threadId, from)
  const next = requests.slice(before).find((body) => /THIRD_PROMPT/.test(everything(body)))
  check('the model\'s next request has the first turn and none of the rewound ones', () => {
    assert.ok(next, 'no request for the next prompt')
    const seen = everything(next)
    assert.match(seen, /FIRST_PROMPT/)
    assert.doesNotMatch(seen, /SECOND_PROMPT/)
    assert.doesNotMatch(seen, /REVIEW_DONE|Review the uncommitted/)
  })
  const unknown = await client.request('thread/revert', { threadId, beforeTurnId: 'turn-missing' }).then(() => null, (error) => error)
  check('an unknown turn is INVALID_PARAMS', () => assert.equal(unknown?.code, -32602))

  // Unloaded and read back from the log: the rewind replays.
  await client.request('thread/unsubscribe', { threadId })
  await new Promise((resolve) => setTimeout(resolve, 500))
  const cold = await client.request('thread/read', { threadId, includeTurns: true })
  check('a replay of the log keeps the rewind', () => {
    assert.equal(cold.thread.turns.length, 2)
    assert.equal(cold.thread.turns[0].id, turns[0].id)
    assert.match(JSON.stringify(cold.thread.turns[1].items), /THIRD_PROMPT/)
    assert.doesNotMatch(JSON.stringify(cold.thread.turns), /SECOND_PROMPT/)
  })
  // Rewound again, to before the first turn, after a reopen.
  await client.request('thread/resume', { threadId, ...permissions })
  const empty = await client.request('thread/revert', { threadId, beforeTurnId: turns[0].id })
  check('a rewind to before the first turn leaves an empty conversation', () => assert.deepEqual(empty.thread.turns, []))
  const fresh = requests.length
  from = events.length
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'FOURTH_PROMPT' }], ...permissions })
  await turnDone(threadId, from)
  const last = requests.slice(fresh).find((body) => /FOURTH_PROMPT/.test(everything(body)))
  check('and the model starts over from it', () => {
    assert.ok(last)
    assert.doesNotMatch(everything(last), /FIRST_PROMPT|THIRD_PROMPT/)
  })
  console.log(`\n${checks.length} checks passed`)
} catch (error) {
  exitCode = 1
  console.error('FAIL', error?.stack ?? error)
  console.error(stderr.join('').slice(-4000))
} finally {
  try { client.stop() } catch {}
  server.close()
  await fs.rm(home, { recursive: true, force: true }).catch(() => {})
  process.exit(exitCode)
}
