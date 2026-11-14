/**
 * Bridge-owned thread metadata the Harness session log does not model:
 * OpenClaude Desktop names, archive flags and soft deletion. One small JSON file,
 * written atomically.
 *
 * Several cores can share the file (the workflow runner spawns its own core
 * with the same state dir), so an update re-reads it and patches only its
 * own entry: a core never writes back another core's older copy.
 */
import fs from 'node:fs'
import path from 'node:path'

export class ThreadStore {
  constructor(dir) {
    this.file = path.join(dir, 'threads.json')
    this.data = this.read() ?? {}
  }

  /** The file's threads, or undefined when it is missing or unreadable. */
  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      if (parsed && typeof parsed === 'object' && parsed.threads && typeof parsed.threads === 'object') return parsed.threads
    } catch {}
    return undefined
  }

  get(id) {
    return this.data[id] ?? {}
  }

  update(id, patch) {
    // Other cores' entries as they are on disk now; this one patched on top.
    // An unreadable file keeps the in-memory copy.
    this.data = this.read() ?? this.data
    const next = { ...this.data[id], ...patch, updatedAt: Date.now() }
    for (const key of Object.keys(next)) if (next[key] === null || next[key] === false) delete next[key]
    this.data[id] = next
    this.flush()
    return next
  }

  flush() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      const temp = `${this.file}.${process.pid}.tmp`
      fs.writeFileSync(temp, JSON.stringify({ version: 1, threads: this.data }, null, 2))
      fs.renameSync(temp, this.file)
    } catch (error) {
      process.stderr.write(`codex-app-server: could not save ${this.file}: ${error.message}\n`)
    }
  }
}
