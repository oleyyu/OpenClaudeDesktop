/**
 * The bridge's own data in CODE_DESKTOP_BRIDGE_STATE (one folder per core):
 *
 *   index.json            thread id (= ACP session id) → metadata: cwd, name,
 *                         archived, deleted, created/updated, model, effort,
 *                         lineage, the thread's OpenClaude Desktop settings
 *                         (permission, tools, customization)
 *   threads/<id>.json     the thread's Codex turns as the bridge projected them
 *                         (history after a restart without replaying the agent)
 *   usage.json            token ledger by local day and model (usage.js)
 *   cache.json            agent facts worth keeping between runs (models)
 *   threads/<id>/         per-thread launch files (system prompt, settings overlay)
 *
 * Every write is a temp file + rename, so a crash never leaves half a file.
 */

import fs from 'node:fs'
import path from 'node:path'

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 1) + '\n')
  fs.renameSync(temp, file)
}

const safeId = (id) => String(id).replace(/[^A-Za-z0-9._-]/g, (ch) => `~${ch.charCodeAt(0).toString(16)}`)

export class ThreadStore {
  constructor(dir) {
    this.dir = dir
    fs.mkdirSync(path.join(dir, 'threads'), { recursive: true })
    const index = readJson(path.join(dir, 'index.json'), null)
    this.threads = index?.threads && typeof index.threads === 'object' ? index.threads : {}
    this.cache = readJson(path.join(dir, 'cache.json'), {})
    this.timer = null
  }

  get(id) {
    return this.threads[id] ?? {}
  }

  has(id) {
    return Object.hasOwn(this.threads, id)
  }

  update(id, patch) {
    const next = { ...this.threads[id], ...patch }
    for (const [key, value] of Object.entries(patch)) if (value === undefined) delete next[key]
    this.threads[id] = next
    this.schedule()
    return next
  }

  remove(id) {
    delete this.threads[id]
    this.schedule()
    try { fs.rmSync(this.historyFile(id), { force: true }) } catch {}
    try { fs.rmSync(this.threadDir(id), { recursive: true, force: true }) } catch {}
  }

  ids() {
    return Object.keys(this.threads)
  }

  schedule() {
    if (this.timer) return
    this.timer = setTimeout(() => this.flush(), 50)
    this.timer.unref?.()
  }

  flush() {
    clearTimeout(this.timer)
    this.timer = null
    writeJson(path.join(this.dir, 'index.json'), { version: 1, threads: this.threads })
  }

  historyFile(id) {
    return path.join(this.dir, 'threads', `${safeId(id)}.json`)
  }

  threadDir(id) {
    return path.join(this.dir, 'threads', safeId(id))
  }

  readHistory(id) {
    return readJson(this.historyFile(id), null)
  }

  writeHistory(id, history) {
    writeJson(this.historyFile(id), history)
  }

  setCache(key, value) {
    this.cache[key] = value
    writeJson(path.join(this.dir, 'cache.json'), this.cache)
  }
}
