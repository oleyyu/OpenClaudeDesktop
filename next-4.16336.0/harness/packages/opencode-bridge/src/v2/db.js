/**
 * Where OpenCode 2.x keeps this app's sessions: a database of its own, OPENCODE_DB=<state>/opencode-v2/opencode.db.
 * It starts empty: nothing is copied or migrated from 1.x (~/.local/share/opencode/opencode.db stays the user's), and
 * it is never shared with the user's own v2 background service. Removing the core removes it.
 *
 *   first start   v2 migrates a new database in process only, so the app's bridge and a workflow runner's bridge on
 *                 the same state must not start it together: an O_EXCL lock file (<dir>/first-start.lock) serializes
 *                 the starts until <dir>/ready.json says it was set up once and the API key import is recorded (two
 *                 bridges importing together would both create a credential for one provider)
 *   API keys      a new database imports no auth.json (v2 skips the legacy import there), so the bridge copies its
 *                 `api` entries into v2 credentials once (POST /api/credential), recorded in <state>/v2-import.json;
 *                 OAuth sign-ins are not carried over (signing in again replaces them)
 */
import fs from 'node:fs'
import path from 'node:path'
import { writeAtomic } from '../config.js'

const LOCK_WAIT_MS = 120000
const LOCK_STALE_MS = 10 * 60000
const LOCK_POLL_MS = 250
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The v2 storage files of a bridge state folder. */
export function v2Paths(stateDir) {
  const dir = path.join(stateDir, 'opencode-v2')
  return {
    dir,
    db: path.join(dir, 'opencode.db'),
    lock: path.join(dir, 'first-start.lock'),
    ready: path.join(dir, 'ready.json'),
    importRecord: path.join(stateDir, 'v2-import.json'),
  }
}

const readJson = (file) => { try { const value = JSON.parse(fs.readFileSync(file, 'utf8')); return isRecord(value) ? value : null } catch { return null } }

/** Whether a process id names a live process (EPERM: alive, someone else's). */
export function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  if (pid === process.pid) return true
  try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
}

/**
 * Wait for, then take, the first-start lock. Once ready.json and the import record exist no lock is needed (the release
 * is a no-op). A lock whose process is gone, or older than 10 min, is taken over; after 2 min of waiting the start goes
 * ahead unlocked. `cancelled()` (the bridge stopped) ends the wait at once, unlocked.
 * @returns {Promise<() => void>} release
 */
export async function acquireFirstStart(stateDir, { waitMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS, pollMs = LOCK_POLL_MS, alive = processAlive, cancelled = () => false, log = () => {} } = {}) {
  const paths = v2Paths(stateDir)
  fs.mkdirSync(paths.dir, { recursive: true, mode: 0o700 })
  const none = () => {}
  const deadline = Date.now() + waitMs
  let logged = false
  for (;;) {
    if (fs.existsSync(paths.ready) && fs.existsSync(paths.importRecord)) return none
    if (cancelled()) return none
    let fd = null
    try { fd = fs.openSync(paths.lock, 'wx', 0o600) } catch (error) {
      if (error?.code !== 'EEXIST') { log(`v2 first-start lock: ${error?.message || error}`); return none }
    }
    if (fd !== null) {
      const stamp = `${process.pid}:${Date.now()}`
      try { fs.writeSync(fd, JSON.stringify({ pid: process.pid, stamp }) + '\n') } finally { fs.closeSync(fd) }
      return () => { if (readJson(paths.lock)?.stamp === stamp) fs.rmSync(paths.lock, { force: true }) }
    }
    const holder = readJson(paths.lock)
    let age = 0
    try { age = Date.now() - fs.statSync(paths.lock).mtimeMs } catch { continue }
    if ((holder && !alive(holder.pid)) || age > staleMs) {
      // Taken over atomically: two waiters may both have read the stale lock. Only the one whose rename wins removes it,
      // and only when what it moved aside is still the lock it judged stale (else another waiter's fresh lock: put back).
      const aside = `${paths.lock}.stale.${process.pid}.${Date.now()}`
      try { fs.renameSync(paths.lock, aside) } catch { continue }
      if (readJson(aside)?.stamp !== holder?.stamp) {
        try { fs.linkSync(aside, paths.lock) } catch {}
        fs.rmSync(aside, { force: true })
        continue
      }
      log(`v2 first-start lock of ${holder?.pid ?? 'an unknown process'} is stale: taking it over`)
      fs.rmSync(aside, { force: true })
      continue
    }
    if (Date.now() > deadline) { log(`v2 first start: still locked by ${holder?.pid ?? '?'} after ${Math.round(waitMs / 1000)} s, starting anyway`); return none }
    if (!logged) { log(`v2 first start: waiting for ${holder?.pid ?? 'another bridge'}`); logged = true }
    await wait(pollMs)
  }
}

/** Record that the v2 database was set up (later starts skip the lock). */
export function markReady(stateDir, info = {}) {
  writeAtomic(v2Paths(stateDir).ready, JSON.stringify({ ...info, readyAt: new Date().toISOString() }, null, 2) + '\n', 0o600)
}

/**
 * The API keys of a 1.x auth store (<data>/opencode/auth.json): its `api` entries, under v2's integration id (the
 * provider id without trailing slashes, as v2's own legacy import names them). Never logged or written elsewhere.
 * @returns {{ integrationID: string, key: string, metadata?: Record<string, string> }[]}
 */
export function legacyApiKeys(file) {
  const value = readJson(file)
  if (!value) return []
  const out = []
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry) || entry.type !== 'api' || typeof entry.key !== 'string' || !entry.key) continue
    const integrationID = id.replace(/\/+$/, '')
    if (!integrationID) continue
    const metadata = isRecord(entry.metadata) ? Object.fromEntries(Object.entries(entry.metadata).filter(([, item]) => typeof item === 'string')) : null
    out.push({ integrationID, key: entry.key, ...(metadata && Object.keys(metadata).length ? { metadata } : {}) })
  }
  return out
}

/**
 * Copy auth.json's API keys into v2 once (record: <state>/v2-import.json, ids only). A provider that already has a v2
 * credential keeps it. A key v2 refuses (a 4xx other than 409, e.g. 400 integration_policy: managed policy denies that
 * provider) is recorded as rejected, with the status and error tag, never retried. When a key fails otherwise (5xx, the
 * network), nothing is recorded, so the next start tries again (the ones that made it are skipped then as existing).
 * @param {{ api: import('./api.js').V2Api, stateDir: string, authFile: string, log?: (line: string) => void }} options
 * @returns {Promise<{ skipped?: true, imported?: string[], kept?: string[], rejected?: { integrationID: string, status: number, error: string | null, kind?: string }[], failed?: string[] }>}
 */
export async function importAuthKeys({ api, stateDir, authFile, log = () => {} }) {
  const record = v2Paths(stateDir).importRecord
  if (readJson(record)?.importedAt) return { skipped: true }
  const keys = legacyApiKeys(authFile)
  const imported = []
  const kept = []
  const rejected = []
  const failed = []
  if (keys.length) {
    const existing = new Set((await api.credentials()).map((entry) => entry?.integrationID).filter((id) => typeof id === 'string'))
    for (const { integrationID, key, metadata } of keys) {
      if (existing.has(integrationID)) { kept.push(integrationID); continue }
      try {
        await api.createCredential({ integrationID, label: 'API key', value: { type: 'key', key, ...(metadata ? { metadata } : {}) } })
        imported.push(integrationID)
        existing.add(integrationID)
      } catch (error) {
        if (error?.status === 409) { kept.push(integrationID); continue }
        // The error's message is neither logged nor recorded: a validation error may quote the request (the key).
        log(`v2 import of the ${integrationID} API key failed (${error?.status ?? 'network'}${error?._tag ? ` ${error._tag}` : ''})`)
        const status = error?.status
        if (Number.isInteger(status) && status >= 400 && status < 500) rejected.push({ integrationID, status, error: error?._tag ?? null, ...(typeof error?.body?.kind === 'string' ? { kind: error.body.kind } : {}) })
        else failed.push(integrationID)
      }
    }
  }
  if (failed.length) return { imported, kept, rejected, failed }
  writeAtomic(record, JSON.stringify({ importedAt: new Date().toISOString(), source: authFile, imported, kept, ...(rejected.length ? { rejected } : {}) }, null, 2) + '\n', 0o600)
  if (imported.length) log(`v2: imported the API keys of ${imported.join(', ')} from ${authFile}`)
  return { imported, kept, rejected, failed }
}
