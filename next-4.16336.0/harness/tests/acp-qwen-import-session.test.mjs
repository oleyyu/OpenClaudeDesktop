// Qwen Code importSession (agents/qwen.js qwenImportSession): a new native session written in a temp HOME, read back
// with an equivalent of Qwen Code's own loading logic (QwenLM/qwen-code core, not executed): sessionService.ts
// listSessions / loadSessionFromState (SESSION_FILE_PATTERN, first-record cwd hashed against the project root, first
// prompt from the first 10 lines), utils/transcript-records.ts prepareTranscriptRecords (identity validation, one
// session id, leaf = last conversation record, parentUuid walk with gap detection, fragment aggregation),
// session-api-history.ts (the model-facing Content[]), sessionStorageUtils.ts readSessionTitleInfoFromFileSync (the last
// custom_title line in the 64 KB tail).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import adapter, { qwenImportSession, qwenImportMessages, qwenRuntimeDir, qwenSanitizeCwd, QWEN_IMPORT_OPENING } from '../packages/acp-bridge/src/agents/qwen.js'

// ---- the reader (an equivalent of upstream's, see the header) ------------------------------------------------------
const SESSION_FILE_PATTERN = /^[0-9a-fA-F-]{32,36}\.jsonl$/
const RECORD_TYPES = new Set(['user', 'assistant', 'tool_result', 'system'])
const NON_CONVERSATION = new Set(['session_sources_snapshot', 'session_artifact_event', 'session_artifact_snapshot', 'managed_session_header_v1', 'managed_session_event_v1', 'managed_session_commit_v1', 'managed_session_snapshot_base_v1'])
const KNOWN_SUBTYPES = new Set(['chat_compression', 'custom_title', 'slash_command', 'notification', 'cron', 'mid_turn_user_message', 'session_source', 'session_model'])
const projectHash = (cwd) => createHash('sha256').update(cwd).digest('hex')
const readJsonl = (file) => fs.readFileSync(file, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line))

function prepareTranscriptRecords(values) {
  const diagnostics = []
  const records = []
  for (const value of values) {
    const ok = value && typeof value.uuid === 'string' && value.uuid && (typeof value.parentUuid === 'string' || value.parentUuid === null) && typeof value.sessionId === 'string' && value.sessionId && RECORD_TYPES.has(value.type)
    if (!ok) { diagnostics.push('invalid_record'); continue }
    if (value.timestamp !== undefined && !Number.isFinite(new Date(value.timestamp).getTime())) diagnostics.push('invalid_timestamp')
    if (value.subtype !== undefined && !KNOWN_SUBTYPES.has(value.subtype)) diagnostics.push('unknown_subtype')
    if (value.message !== undefined && value.message.parts !== undefined && !Array.isArray(value.message.parts)) diagnostics.push('malformed_part')
    records.push(value)
  }
  if (new Set(records.map((record) => record.sessionId)).size > 1) throw new Error('mixed_session_ids')
  const conversation = records.filter((record) => !(record.type === 'system' && NON_CONVERSATION.has(record.subtype)))
  const leaf = conversation.at(-1)
  if (!leaf) return { records: [], gaps: [], diagnostics }
  const byUuid = new Map()
  for (const record of conversation) { if (byUuid.has(record.uuid)) byUuid.get(record.uuid).push(record); else byUuid.set(record.uuid, [record]) }
  const uuids = [], gaps = [], seen = new Set()
  let current = leaf.uuid
  while (current) {
    if (seen.has(current)) { diagnostics.push('parent_cycle'); break }
    seen.add(current)
    const record = byUuid.get(current)?.[0]
    if (!record) break
    uuids.push(current)
    if (!record.parentUuid) break
    if (!byUuid.has(record.parentUuid)) { gaps.push({ childUuid: current, missingParentUuid: record.parentUuid }); break }
    current = record.parentUuid
  }
  uuids.reverse()
  return { records: uuids.map((uuid) => byUuid.get(uuid)[0]), gaps, diagnostics }
}

function apiHistory(messages) {
  const history = []
  for (const record of messages) {
    if (record.type === 'system') { if (record.subtype === 'chat_compression') throw new Error('not expected'); continue }
    if (!record.message) continue
    history.push(record.message)
  }
  return history
}

function titleOf(file) {
  const text = fs.readFileSync(file, 'utf8')
  const tail = text.slice(Math.max(0, text.length - 64 * 1024))
  const line = tail.split('\n').filter((entry) => entry.includes('"subtype":"custom_title"')).at(-1)
  if (!line) return {}
  const { systemPayload } = JSON.parse(line)
  return { title: systemPayload.customTitle, source: systemPayload.titleSource }
}

/** Qwen's view of the sessions of `cwd` under `runtime`: listSessions + loadSession. */
function qwenView(runtime, cwd) {
  const projectRoot = path.resolve(cwd)
  const chats = path.join(runtime, 'projects', qwenSanitizeCwd(projectRoot), 'chats')
  const out = []
  for (const name of fs.readdirSync(chats)) {
    if (!SESSION_FILE_PATTERN.test(name)) continue
    const file = path.join(chats, name)
    const records = readJsonl(file)
    const first = records[0]
    if (projectHash(first.cwd) !== projectHash(projectRoot)) continue
    const head = records.slice(0, 10)
    const prompt = head.find((record) => record.type === 'user' && record.subtype === undefined && record.message?.parts?.some((part) => typeof part.text === 'string'))?.message.parts.find((part) => typeof part.text === 'string').text ?? ''
    const prepared = prepareTranscriptRecords(records)
    out.push({ sessionId: first.sessionId, file, name, prompt, startTime: first.timestamp, records, prepared, history: apiHistory(prepared.records), lastCompletedUuid: prepared.records.at(-1)?.uuid, ...titleOf(file) })
  }
  return out
}

// ---- helpers -------------------------------------------------------------------------------------------------------
function tempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-import-'))
  return { home, env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json') }, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) }
}
const T0 = Date.UTC(2026, 9, 1, 12, 0, 0)

test('qwen importSession: a new session Qwen lists and loads as one chain with alternating user/model history', () => {
  const { home, env, cleanup } = tempHome()
  try {
    const cwd = path.join(home, 'work', 'my project.v2')
    fs.mkdirSync(cwd, { recursive: true })
    const { sessionId, file } = qwenImportSession({
      cwd, title: 'Imported  from\nCodex', home, env, version: '0.24.7', model: 'qwen3-coder-plus', now: T0 + 10_000,
      messages: [
        { role: 'user', text: 'Fix the build', ts: T0 },
        { role: 'assistant', text: 'Looking.', ts: T0 + 1000 },
        { role: 'assistant', text: '[tool: run_shell_command]\nnpm test\n→ ok', ts: T0 + 2000 },
        { role: 'user', text: '  ', ts: T0 + 3000 },
        { role: 'system', text: 'dropped' },
        { role: 'user', text: 'Thanks', ts: T0 + 4000 },
        { role: 'assistant', text: 'Done.', ts: T0 + 99_000 },
      ],
    })
    assert.match(sessionId, /^[0-9a-f-]{36}$/)
    assert.equal(file, path.join(home, '.qwen', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'), 'chats', `${sessionId}.jsonl`))
    const [view, ...more] = qwenView(path.join(home, '.qwen'), cwd)
    assert.equal(more.length, 0)
    assert.equal(view.sessionId, sessionId)
    assert.equal(view.prompt, 'Fix the build')
    assert.deepEqual(view.prepared.diagnostics, [])
    assert.deepEqual(view.prepared.gaps, [])
    assert.equal(view.prepared.records.length, view.records.length, 'every record is on the chain')
    assert.deepEqual(view.history.map((content) => content.role), ['user', 'model', 'user', 'model'])
    assert.deepEqual(view.history.map((content) => content.parts.map((part) => part.text).join('')), ['Fix the build', 'Looking.\n\n[tool: run_shell_command]\nnpm test\n→ ok', 'Thanks', 'Done.'])
    assert.deepEqual([view.title, view.source], ['Imported from Codex', 'manual'])
    assert.equal(view.lastCompletedUuid, view.records.at(-1).uuid, 'the title record is the tail Qwen appends after')
    for (const record of view.records) {
      assert.equal(record.cwd, path.resolve(cwd))
      assert.equal(record.version, '0.24.7')
      assert.equal(record.sessionId, sessionId)
    }
    assert.deepEqual(view.records.map((record) => record.provenance), ['real_user', 'assistant_output', 'real_user', 'assistant_output', 'system'])
    assert.equal(view.records[1].model, 'qwen3-coder-plus')
    const times = view.records.map((record) => Date.parse(record.timestamp))
    assert.ok(times.every((time, index) => index === 0 || time >= times[index - 1]), 'times never go backwards')
    assert.ok(times.every((time) => time <= T0 + 10_000), 'nor past now')
    assert.equal(fs.readFileSync(file, 'utf8').split('\n').at(-1), '', 'one JSON line per record, newline-terminated')
  } finally { cleanup() }
})

test('qwen importSession: an opening reply gets a prompt first; a trailing prompt keeps no reply', () => {
  const messages = qwenImportMessages([{ role: 'assistant', text: 'Hello' }, { role: 'user', text: 'Go on' }])
  assert.deepEqual(messages.map((message) => [message.role, message.text]), [['user', QWEN_IMPORT_OPENING], ['assistant', 'Hello'], ['user', 'Go on']])
  assert.throws(() => qwenImportMessages([{ role: 'user', text: ' ' }]), /no messages/)
  assert.throws(() => qwenImportMessages('x'), /array/)
})

test('qwen importSession: never overwrites, never touches other sessions', () => {
  const { home, env, cleanup } = tempHome()
  try {
    const cwd = path.join(home, 'repo')
    const first = qwenImportSession({ cwd, title: '', messages: [{ role: 'user', text: 'one' }], home, env })
    const before = fs.readFileSync(first.file, 'utf8')
    assert.throws(() => qwenImportSession({ cwd, messages: [{ role: 'user', text: 'two' }], home, env, sessionId: first.sessionId }), /EEXIST/)
    assert.equal(fs.readFileSync(first.file, 'utf8'), before)
    const archived = '0b9d3a6e-1111-4222-8333-944455556666'
    const chats = path.dirname(first.file)
    fs.mkdirSync(path.join(chats, 'archive'), { recursive: true })
    fs.writeFileSync(path.join(chats, 'archive', `${archived}.jsonl`), '')
    assert.throws(() => qwenImportSession({ cwd, messages: [{ role: 'user', text: 'x' }], home, env, sessionId: archived }), /already exists/)
    assert.equal(fs.existsSync(path.join(chats, `${archived}.jsonl`)), false)
    assert.throws(() => qwenImportSession({ cwd: 'relative', messages: [{ role: 'user', text: 'x' }], home, env }), /absolute/)
    assert.throws(() => qwenImportSession({ cwd, messages: [{ role: 'user', text: 'x' }], home, env, sessionId: '../x' }), /UUID/)
    const second = qwenImportSession({ cwd, messages: [{ role: 'user', text: 'two' }], home, env })
    assert.notEqual(second.sessionId, first.sessionId)
    assert.equal(fs.readFileSync(first.file, 'utf8'), before)
    assert.equal(qwenView(path.join(home, '.qwen'), cwd).length, 2)
    assert.equal(titleOf(first.file).title, undefined, 'no title without one')
  } finally { cleanup() }
})

test('qwen importSession: the runtime folder Qwen would use (QWEN_RUNTIME_DIR, runtimeOutputDir, QWEN_HOME)', () => {
  const { home, env, cleanup } = tempHome()
  try {
    const cwd = path.join(home, 'p')
    fs.mkdirSync(cwd, { recursive: true })
    assert.equal(qwenRuntimeDir(env, cwd), path.join(home, '.qwen'))
    assert.equal(qwenRuntimeDir({ ...env, QWEN_HOME: path.join(home, 'qh') }, cwd), path.join(home, 'qh'))
    fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
    fs.writeFileSync(path.join(home, '.qwen', 'settings.json'), JSON.stringify({ advanced: { runtimeOutputDir: '~/qwen-runtime' } }))
    assert.equal(qwenRuntimeDir(env, cwd), path.join(home, 'qwen-runtime'))
    fs.mkdirSync(path.join(cwd, '.qwen'))
    fs.writeFileSync(path.join(cwd, '.qwen', 'settings.json'), JSON.stringify({ advanced: { runtimeOutputDir: '.qwen-out' } }))
    assert.equal(qwenRuntimeDir(env, cwd), path.join(cwd, '.qwen-out'), 'the project setting wins and resolves against the cwd')
    const runtime = path.join(home, 'rt')
    const { sessionId } = qwenImportSession({ cwd, messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'yo' }], home, env: { ...env, QWEN_RUNTIME_DIR: runtime } })
    assert.equal(qwenView(runtime, cwd)[0].sessionId, sessionId)
    assert.equal(fs.existsSync(path.join(home, '.qwen', 'projects')), false, 'nothing written elsewhere')
  } finally { cleanup() }
})

test('qwen adapter.importSession answers {sessionId, written} (the one file it created)', async () => {
  const { home, env, cleanup } = tempHome()
  try {
    const result = await adapter.importSession({ cwd: path.join(home, 'a'), title: 'T', messages: [{ role: 'user', text: 'q' }], home, env })
    assert.deepEqual(Object.keys(result), ['sessionId', 'written'])
    assert.equal(path.basename(result.written[0]), `${result.sessionId}.jsonl`)
    assert.equal(qwenView(path.join(home, '.qwen'), path.join(home, 'a'))[0].title, 'T')
  } finally { cleanup() }
})

test('qwen importSession: a large conversation is written whole (writeFileSync on the descriptor, no partial write)', () => {
  const { home, env, cleanup } = tempHome()
  try {
    const cwd = path.join(home, 'big')
    fs.mkdirSync(cwd)
    const chunk = '漢字 and ascii '.repeat(15000)
    const messages = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: `${index} ${chunk}` }))
    const { file } = qwenImportSession({ cwd, title: 'Big', messages, home, env, now: T0 })
    const text = fs.readFileSync(file, 'utf8')
    assert.ok(Buffer.byteLength(text) > 2 * 1024 * 1024, 'megabytes')
    assert.ok(text.endsWith('\n'))
    const records = readJsonl(file)
    for (let index = 0; index < 12; index++) assert.ok(records.some((record) => JSON.stringify(record).includes(`"${index} 漢字`)), `message ${index}`)
    const source = fs.readFileSync(new URL('../packages/acp-bridge/src/agents/qwen.js', import.meta.url), 'utf8')
    const writer = source.slice(source.indexOf('export function qwenImportSession('), source.indexOf('export default {'))
    assert.ok(!/fs\.writeSync\(/.test(writer), 'no single writeSync')
  } finally { cleanup() }
})
