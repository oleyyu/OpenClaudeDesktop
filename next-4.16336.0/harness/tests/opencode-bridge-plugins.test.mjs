// OpenCode / MiMo bridge: Customize › Plugins origins (global and project, config files and plugins folders), plugin
// contents read from source, and the plan card's "Keep planning" feedback per flavor.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, LiveThread, pluginContents } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-plug-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

function bridgeFor(flavor, api) {
  const home = tmp()
  const env = { HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_CACHE_HOME: path.join(home, '.cache'), XDG_DATA_HOME: path.join(home, 'data') }
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env, input: new PassThrough(), output: new PassThrough() })
  bridge.notify = () => {}
  const calls = []
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route, ...options }); return api(method, route, options, home) }
  return { bridge, calls, home }
}

const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); return pathToFileURL(file).href }

test('plugin/installed lists the project\'s plugins too, each tagged with where it comes from', async () => {
  let urls
  const { bridge, calls, home } = bridgeFor('opencode', async (method, route, options) => {
    if (route !== '/config') return {}
    const global = [[urls.tup, { level: 2 }], urls.foo, 'npm-global@1.2.0', urls.overlay]
    return { plugin: options.directory === urls.project ? [...global, urls.pj, urls.bar, 'proj-npm'] : global }
  })
  const project = path.join(home, 'repo')
  urls = {
    project,
    tup: write(path.join(home, '.config/opencode/tup.js'), 'export const T = async () => ({})'),
    foo: write(path.join(home, '.config/opencode/plugins/foo.js'), 'export const F = async () => ({})'),
    pj: write(path.join(project, 'pj.js'), 'export const P = async () => ({})'),
    bar: write(path.join(project, '.opencode/plugins/bar.ts'), 'export const B = async () => ({})'),
    overlay: pathToFileURL(path.join(bridge.config.configDir, 'plugin', 'code-desktop.js')).href,
  }
  bridge.saveSettings({ plugins: { installed: ['mine@3'], disabled: [] } })
  const rows = (await bridge.handle('plugin/installed', { cwds: [project] })).marketplaces[0].plugins
  assert.deepEqual(calls.filter((call) => call.route === '/config').map((call) => call.directory).sort(), [home, project].sort())
  const by = Object.fromEntries(rows.map((row) => [row.id, row]))
  assert.equal(by[urls.overlay], undefined, 'the bridge\'s own session plugin is never listed')
  assert.equal(by[urls.tup].codeDesktop.origin, 'globalConfig')
  assert.deepEqual(by[urls.tup].codeDesktop.options, { level: 2 }, 'tuple options are kept')
  assert.match(by[urls.tup].codeDesktop.description.en, /global OpenCode config.*Options: \{"level":2\}$/)
  assert.match(by[urls.tup].codeDesktop.description['zh-CN'], /全局 OpenCode 配置.*选项：\{"level":2\}$/)
  assert.equal(by[urls.foo].codeDesktop.origin, 'globalFolder')
  assert.match(by[urls.foo].codeDesktop.description.en, /plugins folder: ~\/\.config\/opencode\/plugins\/foo\.js$/)
  assert.doesNotMatch(by[urls.foo].codeDesktop.readOnlyReason, /opencode\.json/, 'a plugins-folder file is not "configured in opencode.json"')
  assert.equal(by['npm-global@1.2.0'].codeDesktop.origin, 'globalConfig')
  assert.equal(by['npm-global@1.2.0'].version, '1.2.0')
  assert.equal(by[urls.pj].codeDesktop.origin, 'projectConfig')
  assert.equal(by[urls.pj].codeDesktop.project, project)
  assert.equal(by[urls.bar].codeDesktop.origin, 'projectFolder')
  assert.equal(by[urls.bar].name, 'bar')
  assert.equal(by['proj-npm'].codeDesktop.origin, 'projectConfig')
  for (const id of [urls.tup, urls.foo, urls.pj, urls.bar, 'proj-npm']) {
    assert.equal(by[id].codeDesktop.removable, false)
    assert.ok(by[id].codeDesktop.readOnlyReason, `${id} is managed in its own file`)
  }
  assert.equal(by['mine@3'].codeDesktop.origin, 'codeDesktop')
  assert.equal(by['mine@3'].codeDesktop.removable, true)
  assert.equal(by['mine@3'].codeDesktop.readOnlyReason, null)
  // plugin/read names no folder: it covers the folders the last list did, so the project plugin is found.
  const read = await bridge.handle('plugin/read', { pluginName: 'bar' })
  assert.equal(read.plugin.id, urls.bar)
})

test('a project plugin\'s load error reaches its row', async () => {
  const { bridge, home } = bridgeFor('opencode', async (method, route, options) => (route === '/config' ? { plugin: options.directory === home ? [] : [pathToFileURL(path.join(options.directory, '.opencode/plugins/lint-guard.ts')).href] } : {}))
  const project = path.join(home, 'repo')
  const url = pathToFileURL(path.join(project, '.opencode/plugins/lint-guard.ts')).href
  bridge.onEvent({ type: 'session.error', properties: { error: { data: { message: `Failed to load plugin ${url}: SyntaxError` } } } })
  const [row] = (await bridge.handle('plugin/installed', { cwds: [project] })).marketplaces[0].plugins
  assert.equal(row.codeDesktop.origin, 'projectFolder')
  assert.equal(row.codeDesktop.loadError, `Failed to load plugin ${url}: SyntaxError`)
})

test('pluginContents reads the hooks and tools a plugin source registers, ignoring comments', () => {
  const source = `import { tool } from '@opencode-ai/plugin'
// "tool.execute.after": only mentioned
/* event: async () => {} */
export const Lint = async ({ client }) => ({
  event: async ({ event }) => {},
  'tool.execute.before': async (input, output) => {},
  "shell.env"(input, output) {},
  auth: { provider: 'acme', methods: [] },
  tool: {
    lint_check: tool({ description: 'x', args: {}, async execute() { return 'ok' } }),
    'fmt-run': tool({ description: 'y', args: {}, execute: async () => '' }),
  },
})`
  assert.deepEqual(pluginContents(source), { hooks: ['tool.execute.before', 'shell.env', 'event', 'auth', 'tool'], tools: ['lint_check', 'fmt-run'] })
  assert.deepEqual(pluginContents('const config = load(); if (config) {} x.tool(1)'), { hooks: [], tools: [] })
  assert.deepEqual(pluginContents(''), { hooks: [], tools: [] })
})

test('plugin/read shows the hooks and the tools the agent lists for a plugin (local file and cached npm package)', async () => {
  let live = [{ id: 'bash', description: 'Run' }, { id: 'lint_check', description: 'Check the lint rules\nmore' }]
  const { bridge, home } = bridgeFor('opencode', async (method, route) => {
    if (route === '/config') return { plugin: [pathToFileURL(path.join(home, '.config/opencode/plugins/guard.js')).href, 'acme-plugin@2.0.0'] }
    if (route === '/experimental/tool') return live
    return {}
  })
  write(path.join(home, '.config/opencode/plugins/guard.js'), `export const G = async () => ({ 'tool.execute.before': async () => {}, tool: { lint_check: tool({}), stale_tool: tool({}) } })`)
  const pkg = path.join(home, '.cache/opencode/packages/acme-plugin@2.0.0/node_modules/acme-plugin')
  write(path.join(pkg, 'package.json'), JSON.stringify({ name: 'acme-plugin', main: 'dist/index.js' }))
  write(path.join(pkg, 'dist/index.js'), `module.exports = async () => ({ "chat.params": async () => {}, event: async () => {} })`)
  const guard = (await bridge.handle('plugin/read', { pluginName: 'guard' })).plugin
  assert.deepEqual(guard.hooks.map((hook) => hook.key), ['tool.execute.before', 'tool'])
  assert.deepEqual(guard.tools, [{ name: 'lint_check', description: 'Check the lint rules' }], 'only tools the agent lists, with its description')
  assert.match(guard.description, /plugins folder/)
  const acme = (await bridge.handle('plugin/read', { pluginName: 'acme-plugin' })).plugin
  assert.deepEqual(acme.hooks.map((hook) => hook.key), ['chat.params', 'event'])
  // Without the agent's tool list, every tool the source defines is shown.
  live = []
  assert.deepEqual((await bridge.handle('plugin/read', { pluginName: 'guard' })).plugin.tools.map((tool) => tool.name), ['lint_check', 'stale_tool'])
})

// ------------------------------------------------------------------ plan review feedback

function planThread(flavor) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const replies = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => { if (method === 'POST' && /\/(reply|reject)$/.test(route)) replies.push({ route, ...options?.body }); return {} }
  const thread = new LiveThread(bridge, { info: { id: 'ses_plan', directory: home } })
  thread.emit = () => {}
  let answers = []
  thread.clientRequest = async () => ({ answers: { 'plan-review': { answers } } })
  return { thread, replies, answer: (value) => { answers = value } }
}

const PLAN_QUESTIONS = {
  mimo: [{ key: 'plan_exit', header: 'Plan', question: 'Plan at plan.md is complete. Would you like to switch to the build agent and start implementing?', options: [{ label: 'Yes' }, { label: 'No' }] }],
  opencode: [{ header: 'Build Agent', custom: false, question: 'Plan at plan.md is complete. Would you like to switch to the build agent and start implementing?', options: [{ label: 'Yes' }, { label: 'No' }] }],
}

test('MiMo: "Keep planning" feedback is the plan_exit answer, so MiMo refines the plan in the same turn', async () => {
  const { thread, replies, answer } = planThread('mimo')
  answer(['Keep planning', 'also add tests for the parser'])
  await thread.onQuestion({ id: 'que_1', sessionID: 'ses_plan', questions: PLAN_QUESTIONS.mimo })
  assert.deepEqual(replies.map((reply) => reply.answers), [[['also add tests for the parser']]])
  assert.equal(thread.queue.length, 0, 'nothing is held back for a later message')
  // A bare "Keep planning" is MiMo's No (it asks what to refine).
  answer(['Keep planning'])
  await thread.onQuestion({ id: 'que_2', sessionID: 'ses_plan', questions: PLAN_QUESTIONS.mimo })
  assert.deepEqual(replies.at(-1).answers, [['No']])
  assert.equal(thread.queue.length, 0)
  // Feedback that reads as MiMo's own Yes is never sent as an approval.
  answer(['Yes'])
  await thread.onQuestion({ id: 'que_3', sessionID: 'ses_plan', questions: PLAN_QUESTIONS.mimo })
  assert.deepEqual(replies.at(-1).answers, [['No']])
  assert.equal(thread.queue.length, 1)
})

test('OpenCode: "Keep planning" answers No (the turn ends) and the feedback runs as the next message', async () => {
  const { thread, replies, answer } = planThread('opencode')
  answer(['Keep planning', 'also add tests for the parser'])
  await thread.onQuestion({ id: 'que_1', sessionID: 'ses_plan', questions: PLAN_QUESTIONS.opencode })
  assert.deepEqual(replies.map((reply) => reply.answers), [[['No']]])
  assert.equal(thread.queue.length, 1)
  assert.equal(thread.queue[0].input[0].text, 'also add tests for the parser')
})
