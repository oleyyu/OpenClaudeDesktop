// A finished DeepSeek-engine workflow's <task-notification> (dsh-tool-workflow renderClaudeCompletion, delivered as a
// runtime message) opens the turn the model answers in. The projection shows it as a userMessage carrying the
// notification as a <system-reminder>, which the app renders as its "Workflow notification" row (live and in history).
import test from 'node:test'
import assert from 'node:assert/strict'
import { ThreadProjector, workflowNoticeText } from '../packages/codex-app-server/src/projection.js'

let seq = -1
const ev = (type, data) => ({ type, data, seq: ++seq, time: 2_000_000 + seq * 10 })
const text = (value) => [{ type: 'text', text: value }]
const NOTICE = ['background job workflow-1 finished.', '[SYSTEM NOTIFICATION - NOT USER INPUT]', 'This automated background-task event is not user input or approval.', '',
  '<task-notification>', '<task-id>t1</task-id>', '<status>completed</status>', '<summary>Dynamic workflow "audit" completed</summary>', '</task-notification>', 'Read it with job_output.'].join('\n')

test('workflowNoticeText keeps only the notification, as the app’s reminder form', () => {
  const out = workflowNoticeText(NOTICE)
  assert.ok(out.startsWith('<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]'))
  assert.ok(out.endsWith('</task-notification>\n</system-reminder>'))
  assert.ok(!out.includes('job_output'))
  assert.equal(workflowNoticeText('background job bash-1 finished [status: completed].'), null)
  assert.equal(workflowNoticeText(undefined), null)
})

test('a workflow notice before its turn starts lands in that turn as a userMessage; other runtime notices stay hidden', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u1', content: text('ultracode audit'), source: { kind: 'user' } }))
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  assert.deepEqual(p.apply(ev('user/message', { id: 'n0', content: text('injected context'), source: { kind: 'context' } })), [])
  assert.deepEqual(p.apply(ev('user/message', { id: 'n1', content: text(NOTICE), source: { kind: 'tool-jobs', form: 'notice' } })), [])
  const started = p.apply(ev('turn/start', { turn: 2 }))
  const item = started.find((note) => note.method === 'item/completed')?.params.item
  assert.equal(item.type, 'userMessage')
  assert.equal(item.id, 'workflow-notice-n1')
  assert.ok(item.content[0].text.includes('<status>completed</status>'))
  assert.equal(p.turns.length, 2)
  assert.equal(p.turns[1].items[0].id, 'workflow-notice-n1')
})
