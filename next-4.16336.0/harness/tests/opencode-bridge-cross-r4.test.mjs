// Cross-cutting fixes, round 4: Customize › Agents' Create agent on OpenCode / MiMo (codeDesktop/agents/write|remove).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-agents-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

function bridgeFor(flavor) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  bridge.api = async (method, route, options = {}) => {
    calls.push({ method, route, body: options.body ?? null, directory: options.directory ?? null })
    if (method === 'GET' && route === '/agent') return [{ name: 'build', mode: 'primary', native: true }, { name: 'reviewer', mode: 'subagent', description: 'Reviews code' }]
    return {}
  }
  bridge.mergedConfig = async () => ({})
  bridge.primaryAgent = async () => 'build'
  return { bridge, calls, home }
}

test('Create agent writes OpenCode\'s agent file (frontmatter + prompt), never over another; the list names its file; remove deletes it', async () => {
  assert.equal(capabilitiesFor(FLAVORS.opencode).agentsWrite, true)
  const { bridge, calls, home } = bridgeFor('opencode')
  const project = path.join(home, 'proj')
  fs.mkdirSync(project)
  const written = await bridge.agentWrite({ cwd: project, scope: 'project', name: 'reviewer', description: 'Reviews code\nfor bugs', mode: 'subagent', model: 'anthropic/claude-sonnet-4-5', prompt: 'You review code.', deny: ['edit', 'bash', 'nope'] })
  assert.equal(written.path, path.join(project, '.opencode', 'agents', 'reviewer.md'))
  assert.equal(fs.readFileSync(written.path, 'utf8'), '---\ndescription: "Reviews code for bugs"\nmode: subagent\nmodel: "anthropic/claude-sonnet-4-5"\npermission:\n  edit: deny\n  bash: deny\n---\n\nYou review code.\n')
  assert.ok(calls.some((call) => call.route === '/instance/dispose' && call.directory === project), 'the folder reloads its agents')
  await assert.rejects(bridge.agentWrite({ cwd: project, scope: 'project', name: 'reviewer', description: 'x', prompt: 'y' }), /already exists/)
  await assert.rejects(bridge.agentWrite({ cwd: project, name: 'Bad Name', description: 'x', prompt: 'y' }), /lowercase/)
  await assert.rejects(bridge.agentWrite({ scope: 'project', name: 'ok', description: 'x', prompt: 'y' }), /Open a project/)
  const global = await bridge.agentWrite({ cwd: project, scope: 'user', name: 'helper', description: 'Helps', mode: 'all', prompt: 'Help.' })
  assert.equal(global.path, path.join(home, '.config', 'opencode', 'agents', 'helper.md'))
  const listed = await bridge.agentsList({ cwd: project })
  const reviewer = listed.agents.find((agent) => agent.name === 'reviewer')
  assert.deepEqual([reviewer.scope, reviewer.path, reviewer.removable], ['project', written.path, true])
  assert.equal(listed.agents.find((agent) => agent.name === 'build').removable, undefined, 'a built-in has no file to remove')
  assert.deepEqual(await bridge.agentRemove({ cwd: project, name: 'reviewer' }), { path: written.path })
  assert.equal(fs.existsSync(written.path), false)
  await assert.rejects(bridge.agentRemove({ cwd: project, name: 'build' }), /no file of its own/)
})

test('MiMo writes into its own folders', async () => {
  const { bridge, home } = bridgeFor('mimo')
  const project = path.join(home, 'p')
  fs.mkdirSync(project)
  const written = await bridge.agentWrite({ cwd: project, name: 'scout', description: 'Explores', prompt: 'Explore.' })
  assert.equal(written.path, path.join(project, '.mimocode', 'agents', 'scout.md'))
})
