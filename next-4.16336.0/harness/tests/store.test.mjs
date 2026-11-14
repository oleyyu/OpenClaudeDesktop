import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ThreadStore } from '../packages/codex-app-server/src/store.js'

test('two cores sharing threads.json: an update patches its own entry over the other core\'s latest file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-desktop-store-'))
  try {
    const main = new ThreadStore(dir)
    main.update('a', { name: 'First' })
    // The workflow runner's core starts with a copy of the file.
    const workflow = new ThreadStore(dir)
    // The main core renames, archives and removes after that.
    main.update('a', { name: 'Renamed', archived: true })
    main.update('b', { deleted: true })
    // A workflow turn records its prompt time without rewriting the older copy.
    workflow.update('w', { lastPromptAt: 5 })
    const reread = new ThreadStore(dir)
    assert.equal(reread.get('a').name, 'Renamed')
    assert.equal(reread.get('a').archived, true)
    assert.equal(reread.get('b').deleted, true)
    assert.equal(reread.get('w').lastPromptAt, 5)
    // false and null still remove a field.
    main.update('a', { archived: false, name: null })
    assert.deepEqual(Object.keys(new ThreadStore(dir).get('a')), ['updatedAt'])
    // An unreadable file keeps the in-memory copy.
    fs.writeFileSync(path.join(dir, 'threads.json'), '{not json')
    assert.equal(main.update('c', { name: 'C' }).name, 'C')
    assert.equal(new ThreadStore(dir).get('w').lastPromptAt, 5)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
