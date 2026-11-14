import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import gemini from '../packages/acp-bridge/src/agents/gemini.js'

test('Gemini rewind with code: edits after the dropped prompt go back newest first; files changed since stay', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gem-rewind-'))
  const work = path.join(base, 'work'); fs.mkdirSync(work)
  const env = { HOME: base, GEMINI_CLI_HOME: base }
  const chats = path.join(base, '.gemini', 'tmp', 'proj', 'chats'); fs.mkdirSync(chats, { recursive: true })
  const sessionId = 'abcdef12-0000-0000-0000-000000000000'
  const a = path.join(work, 'a.txt'), b = path.join(work, 'b.txt'), c = path.join(work, 'c.txt')
  fs.writeFileSync(a, 'v2'); fs.writeFileSync(b, 'new file'); fs.writeFileSync(c, 'edited later by the user')
  const edit = (file, originalContent, newContent, isNewFile = false) => ({ resultDisplay: { diffStat: { model_added_lines: 1 }, fileDiff: '', filePath: file, fileName: path.basename(file), originalContent, newContent, isNewFile } })
  const lines = [
    { sessionId, projectHash: 'h', startTime: '2026-10-01T00:00:00Z', lastUpdated: '2026-10-01T00:00:00Z' },
    { id: 'u1', type: 'user', content: [{ text: 'first' }] },
    { id: 'g1', type: 'gemini', content: 'ok', toolCalls: [] },
    { id: 'u2', type: 'user', content: [{ text: 'second' }] },
    { id: 'g2', type: 'gemini', content: 'done', toolCalls: [edit(a, 'v1', 'v2'), edit(b, null, 'new file', true), edit(c, 'c0', 'c1')] },
  ]
  fs.writeFileSync(path.join(chats, `session-2026-10-01T00-00-${sessionId.slice(0, 8)}.jsonl`), lines.map((line) => JSON.stringify(line)).join('\n') + '\n')
  const result = gemini.revertFiles({ env }, sessionId, 1, 'second')
  assert.deepEqual(result, { restored: ['b.txt', 'a.txt'], skipped: ['c.txt'] })
  assert.equal(fs.readFileSync(a, 'utf8'), 'v1')
  assert.equal(fs.existsSync(b), false)
  assert.equal(fs.readFileSync(c, 'utf8'), 'edited later by the user')
  fs.rmSync(base, { recursive: true, force: true })
})
