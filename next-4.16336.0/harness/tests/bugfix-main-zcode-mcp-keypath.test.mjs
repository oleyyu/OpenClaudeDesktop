import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { applyConfigEdits, readConfig } from '../packages/zcode-bridge/src/catalog.js'

test('zcode config/batchWrite: a dotted connector name is added, toggled (quoted) and removed by its real name', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcode-keypath-')), file = path.join(dir, 'config.json')
  applyConfigEdits(file, [{ keyPath: 'mcp_servers.my.server', value: { command: 'node', args: ['x.js'] } }])
  assert.ok(readConfig(file).mcp.servers['my.server'])
  applyConfigEdits(file, [{ keyPath: 'mcp_servers."my.server".enabled', value: false }])
  assert.equal(readConfig(file).mcp.servers['my.server'].enabled, false)
  applyConfigEdits(file, [{ keyPath: 'mcp_servers.plain.enabled', value: true }].slice(0, 0))
  applyConfigEdits(file, [{ keyPath: 'mcp_servers."my.server"', value: null }])
  assert.equal(readConfig(file).mcp.servers['my.server'], undefined)
  assert.equal(readConfig(file).mcp.servers['"my'], undefined)
})
