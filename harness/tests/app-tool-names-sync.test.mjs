// The ACP bridge's APP_TOOL_NAMES (Gemini's Plan Mode policy and Qwen's up-front tools name them one by one) must list
// every tool OpenClaude Desktop's agent-tools server serves (app/electron/agent-tools/*.mjs): a tool missing there still
// works, but Gemini's Plan Mode would hide it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { APP_TOOL_NAMES } from '../packages/acp-bridge/src/app-tools.js'

test('APP_TOOL_NAMES lists every tool of app/electron/agent-tools', async () => {
  const dir = path.resolve(import.meta.dirname, '../../app/electron/agent-tools')
  const names = []
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mjs')).sort()) {
    const module = await import(pathToFileURL(path.join(dir, file)).href)
    for (const tool of module.tools ?? []) names.push(tool.name)
  }
  // A name two groups declare (computer use's screenshot / scroll / type share preview's names; the app's host serves one
  // of them per session) is still one tool name on the server, so it is listed once.
  assert.deepEqual([...new Set(names)].sort(), [...APP_TOOL_NAMES].sort())
})
