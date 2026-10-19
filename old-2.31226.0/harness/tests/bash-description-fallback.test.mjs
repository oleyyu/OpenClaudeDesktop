// A bash call without its required UI `description` (deepseek-flash leaves it out) gets the command's first line as one
// in tools/prepare-input, before Harness validates the arguments. Run against the hook's own source: no core, no process.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.join(import.meta.dirname, '../packages/codex-app-server/src/index.js'), 'utf8')
const start = source.indexOf("ctx.on('tools/prepare-input'")
const body = source.slice(start, source.indexOf('\n  })\n', start) + 5)
const handlers = []
new Function('ctx', body)({ on: (name, fn) => handlers.push([name, fn]) })
const [[name, hook]] = handlers
const run = (toolName, args) => {
  let replaced
  hook({ name: toolName, arguments: args, replaceArguments: (value) => { replaced = value } })
  return replaced
}

test('the hook is registered on tools/prepare-input', () => assert.equal(name, 'tools/prepare-input'))
test('a missing or empty description becomes the command, shortened', () => {
  assert.deepEqual(run('bash', { command: 'pwd && ls -la | head -40' }), { command: 'pwd && ls -la | head -40', description: 'pwd && ls -la | head -40' })
  assert.equal(run('bash', { command: 'x'.repeat(80), description: ' ' }).description, `${'x'.repeat(59)}…`)
  assert.equal(run('bash', { command: 'echo a\necho b' }).description, 'echo a')
})
test('a call that has a description, no command or another tool is left alone', () => {
  assert.equal(run('bash', { command: 'ls', description: 'List files' }), undefined)
  assert.equal(run('bash', { description: 'x' }), undefined)
  assert.equal(run('read_file', { command: 'ls' }), undefined)
})
