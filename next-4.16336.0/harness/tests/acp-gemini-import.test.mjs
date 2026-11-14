// Gemini CLI importSession (packages/acp-bridge/src/agents/gemini.js importGeminiSession): an imported conversation is
// written as a new native session in a temp HOME, then read back the way Gemini CLI's session/load would find and read
// it — re-implemented here from upstream (github.com/google-gemini/gemini-cli; same in the installed 0.64.0 bundle),
// never executed: ProjectRegistry.getShortId (core/src/config/projectRegistry.ts:163-302) for the project folder,
// SessionSelector.resolveSessionById (cli/src/utils/sessionUtils.ts:513-580) for the file,
// createJsonlRecordAccumulator (core/src/services/chatRecordingService.ts:256-603) for its records, and
// convertSessionToClientHistory (core/src/utils/sessionUtils.ts:121-319) for the model history. No spawn, no listen.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import gemini, { importGeminiSession, geminiImportMessages, geminiProject, GEMINI_IMPORT_OPENING } from '../packages/acp-bridge/src/agents/gemini.js'

const tempHome = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gem-import-'))

// ---- upstream's reading side, re-implemented ----------------------------------------------------------------------
/** getShortId's lookup half: the registry entry (unless a marker contradicts it), else a marker naming the path. */
function upstreamShortId(runtime, projectPath) {
  const normalized = path.resolve(projectPath)
  const bases = [path.join(runtime, 'tmp'), path.join(runtime, 'history')]
  let projects = {}
  try { projects = JSON.parse(fs.readFileSync(path.join(runtime, 'projects.json'), 'utf8')).projects ?? {} } catch {}
  const owner = (base, slug) => { try { return fs.readFileSync(path.join(base, slug, '.project_root'), 'utf8').trim() } catch { return null } }
  const registered = projects[normalized]
  if (registered && bases.every((base) => { const found = owner(base, registered); return found === null || path.resolve(found) === normalized })) return registered
  for (const base of bases) {
    let names = []
    try { names = fs.readdirSync(base) } catch { continue }
    for (const name of names) { const found = owner(base, name); if (found !== null && path.resolve(found) === normalized) return name }
  }
  return null
}
/** loadConversationRecord: replay every line; null without sessionId + projectHash. */
function upstreamLoad(file) {
  let metadata = {}
  const messages = new Map()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (typeof record?.$rewindTo === 'string' || (record?.$patch && typeof record.$patch === 'object')) continue // none written here
    if (typeof record?.id === 'string') messages.set(record.id, record)
    else if (record?.$set && typeof record.$set === 'object') metadata = { ...metadata, ...record.$set }
    else if (typeof record?.sessionId === 'string' && typeof record?.projectHash === 'string') metadata = { ...metadata, ...record }
  }
  if (!metadata.sessionId || !metadata.projectHash) return null
  return { ...metadata, messages: [...messages.values()] }
}
/** resolveSessionById: session-* files ending -<id8>.json[l] in chats/, the id's non-subagent record, latest first. */
function upstreamResolve(runtime, cwd, sessionId) {
  const slug = upstreamShortId(runtime, cwd)
  assert.ok(slug, 'Gemini finds a project folder for the cwd')
  const chats = path.join(runtime, 'tmp', slug, 'chats')
  const short = sessionId.slice(0, 8)
  const matches = fs.readdirSync(chats).filter((name) => name.startsWith('session-') && (name.endsWith(`-${short}.json`) || name.endsWith(`-${short}.jsonl`)))
    .map((name) => ({ file: path.join(chats, name), data: upstreamLoad(path.join(chats, name)) }))
    .filter((entry) => entry.data && entry.data.sessionId === sessionId && entry.data.kind !== 'subagent')
    .sort((a, b) => Date.parse(b.data.lastUpdated || b.data.startTime) - Date.parse(a.data.lastUpdated || a.data.startTime))
  assert.ok(matches.length, 'resolveSessionById finds the session')
  return { slug, ...matches[0] }
}
const partString = (content) => (typeof content === 'string' ? content : Array.isArray(content) ? content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('') : content?.text ?? '')
const ignoredUser = (trimmed) => trimmed.length === 0 || trimmed.startsWith('/') || trimmed.startsWith('?') || trimmed.startsWith('<session_context>') || trimmed.startsWith('<hook_context>')
/** convertSessionToClientHistory, for text-only records (no tool calls written by an import). */
function upstreamHistory(messages) {
  const history = []
  for (const message of messages) {
    if (message.type === 'info' || message.type === 'error' || message.type === 'warning') continue
    if (message.type === 'user') {
      if (!message.content || ignoredUser(partString(message.content).trim())) continue
      history.push({ role: 'user', text: partString(message.content) })
    } else if (message.type === 'gemini') {
      const text = partString(message.content)
      if (text || message.thoughts?.length) history.push({ role: 'model', text })
    }
  }
  return history
}

// ---- tests --------------------------------------------------------------------------------------------------------
test('Gemini import: a fresh home gets a claimed project folder and a session session/load resolves and reads back', () => {
  const home = tempHome()
  try {
    const cwd = path.join(home, 'My Project')
    const now = Date.parse('2026-11-02T10:30:00.000Z')
    const result = importGeminiSession({ cwd, title: 'Fix the  build', home, env: {}, now, messages: [
      { role: 'assistant', text: 'Earlier reply first' },
      { role: 'user', text: '/Users/me/app fails to build', ts: now - 60_000 },
      { role: 'user', text: 'see the log' },
      { role: 'tool', text: 'ignored role' },
      { role: 'assistant', text: 'Looking.', ts: now + 3_600_000 },
      { role: 'assistant', text: '' },
      { role: 'user', text: 'thanks' },
    ] })
    const runtime = path.join(home, '.gemini')
    assert.equal(result.slug, 'my-project', 'slugify of the folder name (projectRegistry.ts:414-422)')
    for (const base of ['tmp', 'history']) assert.equal(fs.readFileSync(path.join(runtime, base, 'my-project', '.project_root'), 'utf8'), cwd)
    assert.equal(fs.existsSync(path.join(runtime, 'projects.json')), false, "projects.json is left to Gemini's own locked write")
    assert.match(path.basename(result.file), new RegExp(`^session-2026-11-02T10-20-${result.sessionId.slice(0, 8)}\\.jsonl$`), 'named for ten minutes back')
    assert.deepEqual(fs.readdirSync(path.dirname(result.file)), [path.basename(result.file)], 'no temp file left behind')

    const found = upstreamResolve(runtime, cwd, result.sessionId)
    assert.equal(found.file, result.file)
    const { data } = found
    assert.equal(data.projectHash, crypto.createHash('sha256').update(cwd).digest('hex'))
    assert.deepEqual([data.kind, data.summary, data.lastUpdated], ['main', 'Fix the build', new Date(now).toISOString()])
    assert.deepEqual(upstreamHistory(data.messages), [
      { role: 'user', text: GEMINI_IMPORT_OPENING },
      { role: 'model', text: 'Earlier reply first' },
      { role: 'user', text: '\u200b/Users/me/app fails to build\n\nsee the log' },
      { role: 'model', text: 'Looking.' },
      { role: 'user', text: 'thanks' },
    ], 'alternating turns; a prompt starting with "/" is not dropped as a command')
    const times = data.messages.map((message) => Date.parse(message.timestamp))
    assert.ok(times.every((time, index) => time <= now && (index === 0 || time >= times[index - 1])), 'times never pass now nor go back')
    assert.deepEqual(data.messages.map((message) => message.type), ['user', 'gemini', 'user', 'gemini', 'user'])
    assert.ok(data.messages.every((message) => /^[0-9a-f-]{36}$/.test(message.id)))

    // The bridge's own readers see it as a saved session of that folder, and beforeLoad leaves the file alone.
    const ctx = { env: { HOME: home } }
    assert.equal(gemini.hasSavedSession(ctx, result.sessionId), true)
    const listed = gemini.listSessions(ctx).find((row) => row.sessionId === result.sessionId)
    assert.deepEqual([listed.cwd, listed.title], [cwd, 'Fix the build'])
    assert.equal(gemini.beforeLoad(ctx, result.sessionId, { cwd, turns: [] }), undefined)
    assert.equal(fs.existsSync(result.file), true)
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Gemini import: an existing project folder is reused and nothing already there changes', async () => {
  const home = tempHome()
  try {
    const runtime = path.join(home, '.gemini')
    const cwd = path.join(home, 'work')
    fs.mkdirSync(path.join(runtime, 'tmp', 'work', 'chats'), { recursive: true })
    fs.writeFileSync(path.join(runtime, 'tmp', 'work', '.project_root'), cwd)
    const registry = JSON.stringify({ projects: { [cwd]: 'work' } }, null, 2)
    fs.writeFileSync(path.join(runtime, 'projects.json'), registry)
    const existing = path.join(runtime, 'tmp', 'work', 'chats', 'session-2026-11-02T10-20-aaaaaaaa.jsonl')
    const before = `${JSON.stringify({ sessionId: 'aaaaaaaa-0000-4000-8000-000000000000', projectHash: 'h' })}\n`
    fs.writeFileSync(existing, before)
    const first = await gemini.importSession({ cwd, title: '', messages: [{ role: 'user', text: 'one' }], env: { HOME: home } })
    const second = await gemini.importSession({ cwd, title: 'Two', messages: [{ role: 'user', text: 'two' }, { role: 'assistant', text: 'ok' }], env: { HOME: home } })
    assert.notEqual(first.sessionId, second.sessionId)
    assert.deepEqual([first.slug, second.slug], ['work', 'work'])
    assert.equal(fs.readFileSync(existing, 'utf8'), before)
    assert.equal(fs.readFileSync(path.join(runtime, 'projects.json'), 'utf8'), registry)
    assert.equal(fs.readdirSync(path.join(runtime, 'tmp', 'work', 'chats')).length, 3)
    assert.equal(upstreamLoad(first.file).summary, undefined, 'no title, no summary')
    assert.deepEqual(upstreamHistory(upstreamResolve(runtime, cwd, second.sessionId).data.messages).map((turn) => turn.text), ['two', 'ok'])
    // GEMINI_CLI_HOME wins over HOME, as Gemini's homedir() does.
    const other = tempHome()
    try {
      const moved = await gemini.importSession({ cwd, messages: [{ role: 'user', text: 'x' }], env: { HOME: home, GEMINI_CLI_HOME: other } })
      assert.ok(moved.file.startsWith(path.join(other, '.gemini', 'tmp')))
    } finally { fs.rmSync(other, { recursive: true, force: true }) }
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Gemini import: slugs another project owns or the registry holds are skipped; a registry entry wins over a marker scan', () => {
  const home = tempHome()
  try {
    const runtime = path.join(home, '.gemini')
    fs.mkdirSync(path.join(runtime, 'tmp', 'app'), { recursive: true })
    fs.writeFileSync(path.join(runtime, 'tmp', 'app', '.project_root'), '/elsewhere/app')
    fs.writeFileSync(path.join(runtime, 'projects.json'), JSON.stringify({ projects: { '/other/app': 'app-1', '/mine/app': 'mine' } }))
    assert.deepEqual(geminiProject({ HOME: home }, '/new/app', { claim: true }), { slug: 'app-2', root: '/new/app' })
    assert.equal(upstreamShortId(runtime, '/new/app'), 'app-2', 'Gemini resolves the claimed folder by its marker')
    assert.deepEqual(geminiProject({ HOME: home }, '/mine/app'), { slug: 'mine', root: '/mine/app' }, 'a registry entry without markers is still Gemini’s')
    assert.equal(geminiProject({ HOME: home }, '/unknown'), null, 'no claim: nothing created')
    assert.equal(fs.existsSync(path.join(runtime, 'tmp', 'unknown')), false)
    assert.equal(geminiProject({ HOME: home }, 'relative/dir', { claim: true }), null)
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Gemini import: bad requests are refused before anything is written', async () => {
  const home = tempHome()
  try {
    await assert.rejects(gemini.importSession({ cwd: 'relative', messages: [{ role: 'user', text: 'x' }], env: { HOME: home } }), /absolute/)
    await assert.rejects(gemini.importSession({ cwd: path.join(home, 'w'), messages: [{ role: 'assistant', text: '  ' }], env: { HOME: home } }), /no messages/)
    await assert.rejects(gemini.importSession({ cwd: path.join(home, 'w'), messages: 'nope', env: { HOME: home } }), /array/)
    assert.equal(fs.existsSync(path.join(home, '.gemini')), false)
    assert.deepEqual(geminiImportMessages([{ role: 'user', text: 'a', ts: 5 }, { role: 'user', text: 'b' }]), [{ role: 'user', text: 'a\n\nb', ts: 5 }])
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Gemini restoreSession still writes a missing session back, now without replacing an existing file name', () => {
  const home = tempHome()
  try {
    const cwd = path.join(home, 'ws')
    fs.mkdirSync(path.join(home, '.gemini', 'tmp', 'ws'), { recursive: true })
    fs.writeFileSync(path.join(home, '.gemini', 'tmp', 'ws', '.project_root'), cwd)
    const turns = [{ id: 't1', startedAtMs: 1000, completedAtMs: 2000, items: [{ type: 'userMessage', content: [{ type: 'text', text: 'hello' }] }, { type: 'agentMessage', text: 'hi' }] }]
    const sessionId = '590d2884-c80c-43c3-887e-e0d5a0d072f6'
    assert.equal(gemini.beforeLoad({ env: { HOME: home } }, sessionId, { cwd, turns }), true)
    const found = upstreamResolve(path.join(home, '.gemini'), cwd, sessionId)
    assert.deepEqual(upstreamHistory(found.data.messages), [{ role: 'user', text: 'hello' }, { role: 'model', text: 'hi' }])
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Gemini session files on a filesystem without hard links (exFAT / SMB: link EPERM, ENOTSUP, EXDEV): written in place, never over a file', async () => {
  const realLink = fs.linkSync
  for (const code of ['EPERM', 'ENOTSUP', 'EXDEV']) {
    const home = tempHome()
    let refused = 0
    fs.linkSync = () => { refused += 1; throw Object.assign(new Error(`link: ${code}`), { code }) }
    try {
      // restoreSession (the regression: it threw before the fallback) ...
      const cwd = path.join(home, 'ws')
      fs.mkdirSync(path.join(home, '.gemini', 'tmp', 'ws', 'chats'), { recursive: true })
      fs.writeFileSync(path.join(home, '.gemini', 'tmp', 'ws', '.project_root'), cwd)
      const turns = [{ id: 't1', startedAtMs: 1000, completedAtMs: 2000, items: [{ type: 'userMessage', content: [{ type: 'text', text: 'hello' }] }, { type: 'agentMessage', text: 'hi' }] }]
      const sessionId = '590d2884-c80c-43c3-887e-e0d5a0d072f6'
      // A file already holding the first name the writer would pick: kept as it was.
      const stamp = new Date(Date.now() - 10 * 60000).toISOString().slice(0, 16).replace(/:/g, '-')
      const occupied = path.join(home, '.gemini', 'tmp', 'ws', 'chats', `session-${stamp}-590d2884.jsonl`)
      fs.writeFileSync(occupied, 'OTHER\n')
      assert.equal(gemini.beforeLoad({ env: { HOME: home } }, sessionId, { cwd, turns }), true, code)
      assert.equal(fs.readFileSync(occupied, 'utf8'), 'OTHER\n', `${code}: the existing file is untouched`)
      const chats = fs.readdirSync(path.join(home, '.gemini', 'tmp', 'ws', 'chats'))
      assert.ok(!chats.some((name) => name.startsWith('.import-')), `${code}: no temp file left`)
      // ... and the import writer.
      const work = path.join(home, 'w')
      fs.mkdirSync(work)
      const written = await gemini.importSession({ cwd: work, title: 'T', messages: [{ role: 'user', text: 'q' }, { role: 'assistant', text: 'a' }], env: { HOME: home } })
      assert.ok(fs.readFileSync(written.file, 'utf8').includes('"q"'), code)
      assert.ok(refused >= 2, `${code}: link was tried first`)
    } finally { fs.linkSync = realLink; fs.rmSync(home, { recursive: true, force: true }) }
  }
  // Any other link error is still an error.
  const home = tempHome()
  fs.linkSync = () => { throw Object.assign(new Error('link: EIO'), { code: 'EIO' }) }
  try {
    fs.mkdirSync(path.join(home, 'w'))
    await assert.rejects(gemini.importSession({ cwd: path.join(home, 'w'), messages: [{ role: 'user', text: 'q' }], env: { HOME: home } }), /EIO/)
  } finally { fs.linkSync = realLink; fs.rmSync(home, { recursive: true, force: true }) }
})
