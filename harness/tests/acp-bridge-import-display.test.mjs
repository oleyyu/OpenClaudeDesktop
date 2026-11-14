// ACP bridge: how an imported conversation shows (packages/acp-bridge/src/import-display.js, server.js importThread).
// The agent holds each imported reply as one text with its tool calls folded in, and session/load replays it as one
// agent message; the request's parts cut it back into prose and tool rows.
//  - importReplyBlocks: a reply's blocks from the request (parts only while they spell the text; replies joined);
//  - matchReplyBlocks: the text matched from its end, so a note or a cut beginning stays in front;
//  - splitImportedReplies: agentMessage → prose + settled dynamicToolCall rows, ids, failures, what is left alone;
//  - the handler with the real Gemini / Kimi / Qwen writers and the scripted agent replaying the session: the answer,
//    thread/read and the stored history all hold the rows, and the agent's own session still holds the text.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { importReplyBlocks, importedToolItem, matchReplyBlocks, splitImportedReplies } from '../packages/acp-bridge/src/import-display.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-import-display-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

// As chat-import convert.mjs toolBlock writes them; the first one's output ends with a line break, as command output does.
const SHELL = '[Tool: shell]\nnpm test\n[Result (exit 1)]\n1 failing\n\nAssertionError\n'
const READ = '[Tool: Read]\n/w/parser.js\n[Result]\nexport function parse() {}'
const reply = (...parts) => ({ role: 'assistant', text: parts.map((part) => part.text).join('\n\n'), parts })
const MESSAGES = [
  { role: 'user', text: 'Fix the parser' },
  reply({ text: 'Looking.' }, { text: SHELL, tool: true }, { text: READ, tool: true }, { text: 'Fixed: the loop was off by one.' }),
  { role: 'user', text: 'Thanks, now the docs' },
  { role: 'assistant', text: 'The docs are updated.' },
]
const ids = () => { let n = 0; return (prefix) => `${prefix}-${++n}` }
const message = (id, text) => ({ type: 'agentMessage', id, text, phase: null, memoryCitation: null, delivery: null, questions: null })
const turnsOf = (...replies) => replies.map((text, index) => ({ id: `turn-${index + 1}`, status: 'completed', items: [{ type: 'userMessage', id: `user-${index + 1}`, content: [{ type: 'text', text: 'q' }] }, message(`msg-${index + 1}`, text)] }))

test('importReplyBlocks: the replies that hold a tool call, block by block', () => {
  const replies = importReplyBlocks(MESSAGES)
  assert.equal(replies.length, 1, 'a reply without a tool call needs no cut')
  assert.deepEqual(replies[0], [{ text: 'Looking.', tool: false }, { text: SHELL.trim(), tool: true }, { text: READ, tool: true }, { text: 'Fixed: the loop was off by one.', tool: false }])
  // Consecutive assistant messages are one reply; parts that do not spell the text make the message one prose block.
  const joined = importReplyBlocks([{ role: 'user', text: 'q' }, { role: 'assistant', text: 'First.' }, reply({ text: READ, tool: true }), { role: 'system', text: 'x' },
    { role: 'assistant', text: `Not the parts.\n\n${READ}`, parts: [{ text: 'Other.' }, { text: READ, tool: true }] }])
  assert.deepEqual(joined, [[{ text: 'First.', tool: false }, { text: READ, tool: true }, { text: `Not the parts.\n\n${READ}`, tool: false }]])
  assert.deepEqual(importReplyBlocks(null), [])
  assert.deepEqual(importReplyBlocks([{ role: 'assistant', text: '  ' }, { role: 'assistant', text: 'x', parts: [{ text: 'x', tool: true }, { nope: 1 }] }]), [])
})

test('matchReplyBlocks: from the end of the text, a block on a line of its own', () => {
  const [blocks] = importReplyBlocks(MESSAGES)
  const text = MESSAGES[1].text
  assert.deepEqual(matchReplyBlocks(text, blocks), { matched: 4, head: '' })
  assert.deepEqual(matchReplyBlocks(`${text}\n`, blocks), { matched: 4, head: '' })
  assert.deepEqual(matchReplyBlocks(`[A note.]\n\n${text}`, blocks), { matched: 4, head: '[A note.]\n\n' })
  // The beginning cut inside the first tool call: the blocks after it still match.
  assert.equal(matchReplyBlocks(`[…]\n${text.slice(40)}`, blocks).matched, 2)
  // A block's text in the middle of a line is not that block.
  assert.equal(matchReplyBlocks(`As I said: ${blocks[3].text}`, blocks).matched, 0)
  assert.equal(matchReplyBlocks('Something else.', blocks).matched, 0)
  assert.deepEqual(matchReplyBlocks('', blocks), { matched: 0, head: '' })
})

test('splitImportedReplies: prose stays prose, a tool call becomes a settled tool row', () => {
  const replies = importReplyBlocks(MESSAGES)
  const turns = turnsOf(MESSAGES[1].text, MESSAGES[3].text)
  assert.equal(splitImportedReplies(turns, replies, ids()), 2)
  assert.deepEqual(turns[0].items.map((item) => [item.type, item.id]), [['userMessage', 'user-1'], ['agentMessage', 'msg-1'], ['dynamicToolCall', 'imported-tool-1'], ['dynamicToolCall', 'imported-tool-2'], ['agentMessage', 'imported-msg-3']])
  const [, first, shell, read, last] = turns[0].items
  assert.deepEqual([first.text, last.text, last.phase], ['Looking.', 'Fixed: the loop was off by one.', null])
  assert.deepEqual([shell.tool, shell.arguments, shell.status, shell.success, shell.contentItems], ['shell', { input: 'npm test' }, 'failed', false, [{ type: 'inputText', text: '1 failing\n\nAssertionError' }]])
  assert.deepEqual([read.tool, read.arguments, read.status, read.success], ['Read', { input: '/w/parser.js' }, 'completed', true])
  assert.deepEqual(turns[1].items.map((item) => [item.type, item.text ?? null]), [['userMessage', null], ['agentMessage', 'The docs are updated.']], 'a reply without tool calls is untouched')
  assert.deepEqual(turns.map((turn) => turn.id), ['turn-1', 'turn-2'], 'the turns keep their ids')
  // A second pass finds nothing left to cut.
  assert.equal(splitImportedReplies(turns, replies, ids()), 0)
})

test('splitImportedReplies: a reply that opens with a tool call keeps the item id on that row; a note in front stays prose', () => {
  const messages = [{ role: 'user', text: 'q' }, reply({ text: READ, tool: true }, { text: 'Read it.' })]
  const replies = importReplyBlocks(messages)
  const turns = turnsOf(messages[1].text)
  assert.equal(splitImportedReplies(turns, replies, ids()), 1)
  assert.deepEqual(turns[0].items.slice(1).map((item) => [item.type, item.id]), [['dynamicToolCall', 'msg-1'], ['agentMessage', 'imported-msg-1']])
  // Kimi's note that earlier turns were left out heads the first kept message.
  const noted = turnsOf(`[Earlier turns of this imported conversation were left out to fit the context window: 1 of 3 turns kept.]\n\n${messages[1].text}`)
  assert.equal(splitImportedReplies(noted, replies, ids()), 1)
  assert.deepEqual(noted[0].items.slice(1).map((item) => item.type), ['agentMessage', 'dynamicToolCall', 'agentMessage'])
  assert.match(noted[0].items[1].text, /^\[Earlier turns .* 1 of 3 turns kept\.\]$/)
})

test('splitImportedReplies: the cut end of a reply keeps its whole tool calls; text that matches nothing is left alone', () => {
  const replies = importReplyBlocks(MESSAGES)
  const full = MESSAGES[1].text
  // Kimi cuts a turn that alone is over the budget to its end: here inside the first tool call's output.
  const cut = turnsOf(`[…]\n${full.slice(40)}`)
  assert.equal(splitImportedReplies(cut, replies, ids()), 1)
  assert.deepEqual(cut[0].items.slice(1).map((item) => item.type), ['agentMessage', 'dynamicToolCall', 'agentMessage'])
  assert.ok(cut[0].items[1].text.startsWith('[…]') && cut[0].items[1].text.endsWith('AssertionError'), 'what is left of the first call stays text')
  assert.equal(cut[0].items[2].tool, 'Read')
  // Only the closing prose matches: nothing to gain, the item stays whole.
  const tail = turnsOf('Something else entirely.\n\nFixed: the loop was off by one.')
  const before = JSON.stringify(tail)
  assert.equal(splitImportedReplies(tail, replies, ids()), 0)
  assert.equal(JSON.stringify(tail), before)
  // Other item kinds, live tool rows and replies of the session's own are never touched.
  const own = [{ id: 't', status: 'completed', items: [{ type: 'reasoning', id: 'r', summary: ['x'], content: [] }, { type: 'dynamicToolCall', id: 'd', tool: 'x' }, message('m', 'An answer of its own.')] }]
  assert.equal(splitImportedReplies(own, replies, ids()), 0)
  assert.deepEqual(own[0].items.map((item) => item.id), ['r', 'd', 'm'])
  assert.equal(splitImportedReplies(turnsOf(full), [], ids()), 0)
  assert.equal(splitImportedReplies(null, replies, ids()), 0)
})

test('importedToolItem: exactly one tool block, in the app\'s text form', () => {
  assert.equal(importedToolItem('x', 'Prose that mentions [Tool: shell]\nls\n[Result]\nok'), null)
  assert.equal(importedToolItem('x', '[Tool: a]\n\n[Result]').tool, 'a')
  assert.deepEqual(importedToolItem('x', '[Tool: a]\n\n[Result]').contentItems, [])
  assert.equal(importedToolItem('x', '[Tool: gh.search]\n{"q":"x"}\n[Result (error)]\nboom').status, 'failed')
  assert.equal(importedToolItem('x', null), null)
})

function bridge(adapter, { home, env = {} }) {
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const state = path.join(home, 'state')
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath,
      CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: state, CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      QWEN_HOME: path.join(home, '.qwen'), QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-qwen-system.json'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'),
      FAKE_ACP_LOG: path.join(home, 'agent.log'), ...env,
    },
  })
  const notes = []
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({}), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  return { state, notes, call: (method, params) => client.call(method, params, 30000), close: () => server.shutdown() }
}

test('the handler: the replayed session shows prose and tool rows, in the answer, on thread/read and in the stored history', async (t) => {
  for (const id of ['gemini', 'kimi', 'qwen']) {
    const home = tmp()
    const work = path.join(home, 'work')
    fs.mkdirSync(work)
    // What the agent replays on session/load: the prompts and the replies as its session file holds them (one text each).
    const replay = path.join(home, 'replay.json')
    fs.writeFileSync(replay, JSON.stringify(MESSAGES.map(({ role, text }) => ({ role, text: text.trim() }))))
    const b = bridge(adapterById(id), { home, env: { FAKE_ACP_REPLAY: replay, ...(id === 'kimi' ? { KIMI_CODE_HOME: path.join(home, '.kimi-code') } : {}) } })
    try {
      await b.call('initialize', {})
      let answer
      try { answer = await b.call('codeDesktop/thread/import', { cwd: work, title: `${id} import`, messages: MESSAGES, importedFrom: { source: 'codex', sourceId: 'rollout-1' } }) }
      catch (error) {
        // The netjail forbids starting the agent process: nothing to replay there.
        if (/EPERM|ENOENT|spawn/.test(String(error?.message))) { t.diagnostic(`${id}: skipped, the agent process could not start (${error.message})`); continue }
        throw error
      }
      const shape = (turns) => turns.map((turn) => turn.items.map((item) => item.type === 'dynamicToolCall' ? `${item.tool}:${item.status}` : item.type === 'agentMessage' ? item.text : item.type))
      const expected = [['userMessage', 'Looking.', 'shell:failed', 'Read:completed', 'Fixed: the loop was off by one.'], ['userMessage', 'The docs are updated.']]
      assert.deepEqual(shape(answer.thread.turns), expected, `${id}: the answer`)
      const read = await b.call('thread/read', { threadId: answer.thread.id, includeTurns: true })
      assert.deepEqual(shape(read.thread.turns), expected, `${id}: thread/read`)
      const stored = JSON.parse(fs.readFileSync(path.join(b.state, 'threads', `${answer.thread.id}.json`), 'utf8'))
      assert.deepEqual(shape(stored.turns), expected, `${id}: the stored history`)
      assert.equal(new Set(stored.turns.flatMap((turn) => turn.items.map((item) => item.id))).size, 7, `${id}: every item has an id of its own`)
      // The agent's own session still holds the reply as text (what the model reads).
      const files = []
      const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else files.push(file) } }
      walk(home)
      const native = files.filter((file) => !file.startsWith(b.state) && file !== replay && !file.endsWith('agent.log')).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
      assert.ok(native.includes('[Tool: shell]') && native.includes('[Result (exit 1)]'), `${id}: the session file keeps the text form`)
    } finally { b.close() }
  }
})
