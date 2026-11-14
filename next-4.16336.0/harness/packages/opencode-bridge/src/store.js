/**
 * The bridge's own facts per thread, in CODE_DESKTOP_BRIDGE_STATE/threads.json
 * (the agent keeps the history itself): the cwd a session belongs to, steer
 * message ids, the Codex input of each user message, review turns, the
 * permission/tool/customization state last applied, queued submissions,
 * hidden helper sessions (side questions) and forks.
 *
 * Several bridges can share one state folder (a /workflow run starts its own
 * core process on the same folder), so a flush never writes its memory over
 * the file: under a lock file it re-reads threads.json and applies only the
 * fields this process changed since its last flush. Reads pick up the other
 * processes' flushes when the file changes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { writeAtomic } from './config.js'

const MAX_INPUTS = 400
const REFRESH_MS = 1000
const LOCK_WAIT_MS = 2000
const LOCK_STALE_MS = 10000
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const pause = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) } catch {} }

/**
 * Apply one process's changes to the file's current contents.
 * @param {object} disk - threads.json as read now
 * @param {object} memory - this process's view
 * @param {Map<string, 'all' | Set<string>>} dirty - per thread: every field ('all': the whole entry, or its removal) or the fields changed
 */
export function mergeThreads(disk, memory, dirty) {
  const out = { ...disk }
  for (const [id, mark] of dirty) {
    if (mark === 'all') {
      if (Object.hasOwn(memory, id)) out[id] = memory[id]
      else delete out[id]
      continue
    }
    if (!Object.hasOwn(memory, id)) { delete out[id]; continue }
    const next = { ...(isRecord(out[id]) ? out[id] : {}) }
    for (const field of mark) {
      if (Object.hasOwn(memory[id], field)) next[field] = memory[id][field]
      else delete next[field]
    }
    out[id] = next
  }
  return out
}

export class ThreadStore {
  constructor(stateDir) {
    this.file = path.join(stateDir, 'threads.json')
    this.lockFile = `${this.file}.lock`
    /** @type {Map<string, 'all' | Set<string>>} fields changed here since the last flush */
    this.dirty = new Map()
    this.data = this.readDisk()
    this.stamp = this.diskStamp()
    this.checked = Date.now()
    this.timer = null
  }

  readDisk() {
    let value = {}
    try { value = JSON.parse(fs.readFileSync(this.file, 'utf8')) ?? {} } catch {}
    return isRecord(value) ? value : {}
  }

  diskStamp() {
    try { const stat = fs.statSync(this.file); return `${stat.ino}:${stat.mtimeMs}:${stat.size}` } catch { return null }
  }

  /** Take in another process's flush (this process's unflushed changes win). */
  refresh(force = false) {
    const now = Date.now()
    if (!force && now - this.checked < REFRESH_MS) return
    this.checked = now
    const stamp = this.diskStamp()
    if (stamp === this.stamp) return
    this.stamp = stamp
    this.data = mergeThreads(this.readDisk(), this.data, this.dirty)
  }

  get(id) {
    this.refresh()
    return this.data[id] ?? {}
  }

  ids() {
    this.refresh()
    return Object.keys(this.data)
  }

  mark(id, fields) {
    const current = this.dirty.get(id)
    if (current === 'all') return
    if (fields === 'all') { this.dirty.set(id, 'all'); return }
    const set = current ?? new Set()
    for (const field of fields) set.add(field)
    this.dirty.set(id, set)
  }

  update(id, patch) {
    const next = { ...this.get(id), ...patch }
    for (const [key, value] of Object.entries(next)) if (value === undefined) delete next[key]
    this.data[id] = next
    this.mark(id, Object.keys(patch))
    this.schedule()
    return next
  }

  /** Remember one user message's Codex input (bounded per thread). */
  rememberInput(id, messageId, input) {
    const inputs = { ...(this.get(id).inputs ?? {}), [messageId]: input }
    const keys = Object.keys(inputs)
    if (keys.length > MAX_INPUTS) for (const key of keys.slice(0, keys.length - MAX_INPUTS)) delete inputs[key]
    this.update(id, { inputs })
  }

  addTo(id, key, value) {
    const list = [...new Set([...(this.get(id)[key] ?? []), value])]
    this.update(id, { [key]: list })
  }

  delete(id) {
    delete this.data[id]
    this.mark(id, 'all')
    this.schedule()
  }

  schedule() {
    if (this.timer) return
    this.timer = setTimeout(() => this.flush(), 50)
  }

  /** A short-lived lock file around read-merge-write (a stale one is taken over). */
  lock() {
    const deadline = Date.now() + LOCK_WAIT_MS
    for (;;) {
      try { fs.closeSync(fs.openSync(this.lockFile, 'wx', 0o600)); return true } catch (error) {
        if (error?.code !== 'EEXIST') return false
        try { if (Date.now() - fs.statSync(this.lockFile).mtimeMs > LOCK_STALE_MS) { fs.rmSync(this.lockFile, { force: true }); continue } } catch { continue }
        if (Date.now() > deadline) return false
        pause(10)
      }
    }
  }

  flush() {
    clearTimeout(this.timer)
    this.timer = null
    if (!this.dirty.size) return
    const locked = this.lock()
    try {
      const merged = mergeThreads(this.readDisk(), this.data, this.dirty)
      writeAtomic(this.file, JSON.stringify(merged) + '\n', 0o600)
      this.data = merged
      this.dirty.clear()
      this.stamp = this.diskStamp()
      this.checked = Date.now()
    } catch {} finally {
      if (locked) try { fs.rmSync(this.lockFile, { force: true }) } catch {}
    }
  }
}
