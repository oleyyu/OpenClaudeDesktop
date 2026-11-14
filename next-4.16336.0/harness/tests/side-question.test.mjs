import test from 'node:test'
import assert from 'node:assert/strict'
import { itemLines, runSideQuestion, sessionTranscript, sideQuestionPrompt, SIDE_QUESTION_SYSTEM } from '../packages/codex-app-server/src/side-question.js'

test('the session becomes a read-only transcript, newest kept when long', () => {
  const turns = [{ items: [
    { type: 'userMessage', content: [{ type: 'text', text: 'Fix the login bug' }, { type: 'image', url: 'x' }] },
    { type: 'reasoning', summary: ['hidden'] },
    { type: 'commandExecution', command: 'npm test', exitCode: 1, aggregatedOutput: 'FAIL auth.test.js' },
    { type: 'fileChange', changes: [{ path: 'src/auth.js' }] },
    { type: 'agentMessage', text: 'Fixed the token check.' },
  ] }]
  const result = sessionTranscript(turns)
  assert.equal(result.messages, 2)
  assert.equal(result.truncated, false)
  assert.equal(result.text, 'User: Fix the login bug\n[image]\n\n[ran: npm test (exit 1)]\nFAIL auth.test.js\n\n[edited: src/auth.js]\n\nAssistant: Fixed the token check.')
  assert.equal(itemLines({ type: 'reasoning' }), '')
  const long = sessionTranscript([{ items: [{ type: 'agentMessage', text: 'a'.repeat(50) }, { type: 'agentMessage', text: 'tail' }] }], 20)
  assert.ok(long.truncated && long.text.endsWith('tail') && long.text.startsWith('[earlier part omitted]'))
})

test('the prompt carries the transcript, earlier side Q&A and the question', () => {
  const prompt = sideQuestionPrompt({ transcript: 'User: hi', history: [{ question: 'q1', answer: 'a1' }, { bad: true }], question: 'what now?' })
  assert.equal(prompt, '<session_transcript>\nUser: hi\n</session_transcript>\n\n<earlier_side_questions>\nQ: q1\nA: a1\n</earlier_side_questions>\n\nSide question: what now?')
  assert.match(sideQuestionPrompt({ transcript: '', question: 'x' }), /no messages yet/)
})

test('runSideQuestion streams text deltas from one tool-less llm call', async () => {
  const calls = [], deltas = []
  const llm = { async *stream(options) { calls.push(options); yield { type: 'block-start', index: 0, blockType: 'text' }; yield { type: 'reasoning-delta', index: 1, text: 'hmm' }; yield { type: 'text-delta', index: 0, text: 'It ' }; yield { type: 'text-delta', index: 0, text: 'works.' }; yield { type: 'finish', reason: { kind: 'stop' } } } }
  const createUserMessage = (input) => ({ role: 'user', ...input })
  const result = await runSideQuestion({ llm, route: { provider: 'p', model: 'm' }, prompt: 'P', createUserMessage, onDelta: (text) => deltas.push(text) })
  assert.deepEqual(result, { text: 'It works.', finish: 'stop' })
  assert.deepEqual(deltas, ['It ', 'works.'])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].system, SIDE_QUESTION_SYSTEM)
  assert.equal(calls[0].tools, undefined, 'no tools are offered')
  assert.deepEqual([calls[0].provider, calls[0].model, calls[0].purpose], ['p', 'm', 'side-question'])
  assert.equal(calls[0].messages[0].content[0].text, 'P')
})
