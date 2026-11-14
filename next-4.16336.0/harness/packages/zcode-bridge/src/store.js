/**
 * What the bridge keeps about threads beyond ZCode's own session store (CODE_DESKTOP_BRIDGE_STATE/threads.json):
 * OpenClaude Desktop's archive flag, deleted ids, per-thread customization / tool selection / permission mode, model
 * and effort, developer instructions, the original input parts of user messages (mentions, skills, images),
 * fork origins and the bridge-side queue.
 */

import fs from 'node:fs'
import path from 'node:path'

const MAX_INPUTS_PER_THREAD = 400

export class ThreadStore {
  constructor(dir) {
    this.dir = dir
    this.file = path.join(dir, 'threads.json')
    this.data = { version: 1, threads: {}, deleted: {} }
    this.timer = null
    try {
      const loaded = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      if (loaded && typeof loaded === 'object') this.data = { version: 1, threads: loaded.threads ?? {}, deleted: loaded.deleted ?? {} }
    } catch {}
  }

  get(id) { return this.data.threads[id] ?? null }

  ensure(id) {
    this.data.threads[id] ??= { createdAt: Date.now() }
    return this.data.threads[id]
  }

  update(id, patch) {
    const entry = this.ensure(id)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete entry[key]
      else entry[key] = value
    }
    this.save()
    return entry
  }

  recordInput(id, messageId, input) {
    if (!messageId || !Array.isArray(input)) return
    const entry = this.ensure(id)
    entry.inputs ??= {}
    entry.inputs[messageId] = input
    const keys = Object.keys(entry.inputs)
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_INPUTS_PER_THREAD))) delete entry.inputs[key]
    this.save()
  }

  isDeleted(id) { return !!this.data.deleted[id] }

  markDeleted(id) {
    delete this.data.threads[id]
    this.data.deleted[id] = Date.now()
    this.save()
  }

  all() { return this.data.threads }

  save() {
    if (this.timer) return
    this.timer = setTimeout(() => { this.timer = null; this.flush() }, 50)
    this.timer.unref?.()
  }

  flush() {
    clearTimeout(this.timer)
    this.timer = null
    try {
      fs.mkdirSync(this.dir, { recursive: true })
      const temp = `${this.file}.${process.pid}.tmp`
      fs.writeFileSync(temp, JSON.stringify(this.data))
      fs.renameSync(temp, this.file)
    } catch {}
  }
}
