import test from 'node:test'
import assert from 'node:assert/strict'
import { configReadResponse, latestThreadIn, mcpServerStatuses, mcpServerTable, pluginReadResponse, pluginsInstalledResponse, skillScope, skillsListEntry } from '../packages/codex-app-server/src/catalog.js'
import { skillToggleUnsupported } from '../packages/codex-app-server/src/errors.js'
import { METHOD_NOT_FOUND } from '../packages/codex-app-server/src/transport.js'

const summary = (over) => ({ name: 'x', description: 'd', source: 'user-dsh', provider: 'filesystem', invocation: { modelInvocable: true, userInvocable: true }, ...over })
// Loader entry doubles: options as the profile row declares it; fiber.state is Cordis FiberState (2 active, 3 failed).
const mcpEntry = (id, config, { state = 2, disabled = false } = {}) => ({ options: { id, name: '@deepseek-ai/dsh-mcp-client', config }, disabled, fiber: state === null ? undefined : { state, uid: 1 } })

test('skills/list maps SkillSummary to SkillMetadata: scope by source, enabled = model invocation, invocation flags, pathless skipped', () => {
  const entry = skillsListEntry('/w', {
    complete: true,
    skills: [
      summary({ name: 'figma', path: '/x/.agents/skills/figma/SKILL.md', source: 'user-agents', description: 'Figma', whenToUse: 'Use for designs' }),
      summary({ name: 'lint', path: '/w/.dsh/skills/lint/SKILL.md', source: 'project-dsh' }),
      summary({ name: 'virtual', source: 'bundled' }),
      summary({ name: 'quiet', path: '/u/.dsh/skills/quiet/SKILL.md', invocation: { modelInvocable: false, userInvocable: true } }),
      summary({ name: 'hidden', path: '/u/.dsh/skills/hidden/SKILL.md', invocation: { modelInvocable: false, userInvocable: false } }),
      summary({ name: 'office', path: '/core/skills/office/SKILL.md', source: 'bundled' }),
      summary({ name: 'auto', path: '/u/.dsh/skills/auto/SKILL.md', invocation: { modelInvocable: true, userInvocable: false } }),
      summary({ name: 'versioned', path: '/u/.dsh/skills/versioned/SKILL.md', metadata: { version: ' 1.2.0 ', author: 'x' } }),
      summary({ name: 'numbered', path: '/u/.dsh/skills/numbered/SKILL.md', metadata: { version: 2 } }),
    ],
  })
  assert.equal(entry.cwd, '/w')
  assert.deepEqual(entry.errors, [])
  assert.deepEqual(entry.skills.map((skill) => skill.name), ['figma', 'lint', 'quiet', 'office', 'auto', 'versioned', 'numbered'], 'pathless and never-invocable skills are skipped')
  assert.deepEqual(entry.skills[0], { name: 'figma', description: 'Figma', path: '/x/.agents/skills/figma/SKILL.md', scope: 'user', enabled: true, userInvocable: true, modelInvocable: true, pluginId: null })
  assert.equal(entry.skills[1].scope, 'repo')
  assert.equal(entry.skills[2].enabled, false, 'disable-model-invocation reads as disabled')
  // The whole invocation policy travels with the row: 'quiet' is slash-only, 'auto' is model-only.
  assert.deepEqual([entry.skills[2].userInvocable, entry.skills[2].modelInvocable], [true, false], 'model-hidden skills stay user-invocable')
  assert.deepEqual([entry.skills[4].enabled, entry.skills[4].userInvocable, entry.skills[4].modelInvocable], [true, false, true], 'user-invocable: false is model-only')
  assert.equal(entry.skills[3].scope, 'system')
  // SKILL.md metadata.version only when the summary carries one.
  assert.equal(entry.skills[5].version, '1.2.0'); assert.equal(entry.skills[6].version, '2')
  assert.equal(Object.hasOwn(entry.skills[0], 'version'), false)
  assert.deepEqual(['project-agents', 'user-dsh', 'custom', 'runtime', 'bundled', undefined].map(skillScope), ['repo', 'user', 'user', 'system', 'system', 'system'])
  const partial = skillsListEntry('/w', { complete: false, skills: [summary({ path: '/a/SKILL.md' })] })
  assert.equal(partial.skills.length, 1)
  assert.deepEqual(partial.errors, [{ path: '/w', message: 'Some skill sources could not be read.' }])
  assert.deepEqual(skillsListEntry('/w', undefined), { cwd: '/w', skills: [], errors: [] })
})

test('skills/config/write is an explicit unsupported error naming the frontmatter key', () => {
  const error = skillToggleUnsupported()
  assert.equal(error.code, METHOD_NOT_FOUND)
  assert.match(error.message, /disable-model-invocation: true/)
})

test('config/read reports the permission and MCP transport facts without any secret value', () => {
  const entries = [
    mcpEntry('mcp-gh', { serverName: 'gh', transport: 'stdio', command: 'npx', args: ['-y', 'x'], env: { TOKEN: 'secret' } }),
    mcpEntry('mcp-web', { serverName: 'web', transport: 'streamable-http', url: 'https://example.test/mcp', headers: { Authorization: 'Bearer secret' } }, { disabled: true }),
    { options: { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', config: { env: { KEY: 'secret' } } } },
    mcpEntry('mcp-anon', { transport: 'stdio', command: 'x' }),
  ]
  const response = configReadResponse({ mcpEntries: entries })
  assert.equal(JSON.stringify(response).includes('secret'), false)
  assert.deepEqual(response, {
    config: {
      sandbox_mode: 'workspace-write',
      approval_policy: 'on-request',
      mcp_servers: {
        gh: { command: 'npx', args: ['-y', 'x'], env: { TOKEN: '' }, enabled: true },
        web: { url: 'https://example.test/mcp', http_headers: { Authorization: '' }, enabled: false },
      },
    },
    origins: {},
    layers: null,
  })
  assert.deepEqual(configReadResponse({ permission: { approvalPolicy: 'untrusted', sandbox: 'read-only', mode: 'plan', extraRoots: ['/x'] } }).config,
    { sandbox_mode: 'read-only', approval_policy: 'untrusted', mcp_servers: {} })
  assert.deepEqual(mcpServerTable({ options: { config: { command: 'n', args: ['a', 3], cwd: '' } } }), { command: 'n', args: ['a'], enabled: true })
})

test('config/read follows the most recently active live thread in that working directory', () => {
  const threads = [
    { id: 'old', cwd: '/w', lastActivityMs: 1, permission: { sandbox: 'workspace-write' } },
    { id: 'new', cwd: '/w', lastActivityMs: 5, permission: { sandbox: 'read-only' } },
    { id: 'closing', cwd: '/w', lastActivityMs: 9, closing: Promise.resolve() },
    { id: 'other', cwd: '/elsewhere', lastActivityMs: 10 },
  ]
  assert.equal(latestThreadIn(threads, ['/link', '/w']).id, 'new')
  assert.equal(latestThreadIn(threads, ['/none', undefined]), undefined)
})

test('mcpServerStatus/list: one row per MCP client entry, status from its fiber, tools by raw name', () => {
  const entries = [
    mcpEntry('mcp-web', { serverName: 'web', transport: 'streamable-http', url: 'https://w' }, { state: 3 }),
    mcpEntry('mcp-gh', { serverName: 'gh', transport: 'stdio', command: 'gh-mcp' }),
    { options: { id: 'tools', name: '@deepseek-ai/dsh-tool-fs' }, fiber: { state: 2 } },
  ]
  const tools = ['mcp__gh__search', { name: 'mcp__gh__issue', description: 'Open an issue', parameters: { type: 'object', properties: { title: { type: 'string' } } } }, 'read', 'mcp__gh__', 'mcp__web2__x']
  const [gh, web] = mcpServerStatuses(entries, tools)
  assert.deepEqual(gh, {
    name: 'gh', runtimeStatus: 'connected', pluginId: null, serverInfo: null,
    tools: {
      search: { name: 'search', inputSchema: { type: 'object' } },
      issue: { name: 'issue', description: 'Open an issue', inputSchema: { type: 'object', properties: { title: { type: 'string' } } } },
    },
    resources: [], resourceTemplates: [], authStatus: 'unsupported',
  })
  assert.equal(web.name, 'web')
  assert.equal(web.runtimeStatus, 'failed')
  assert.deepEqual(web.tools, {})
  const status = (options) => mcpServerStatuses([mcpEntry('m', { serverName: 'm' }, options)])[0].runtimeStatus
  assert.deepEqual([status({ state: 0 }), status({ state: 1 }), status({ state: 4 }), status({ state: 5 }), status({ state: null }), status({ disabled: true })],
    ['starting', 'starting', null, null, null, 'disabled'])
})

test('plugin/installed lists the profile bundles as one local marketplace; no plugin manager is an empty catalog', () => {
  const bundles = [
    { name: '@deepseek-ai/dsh-base', enabled: true, installed: false, optional: false, rows: [] },
    { name: '@code-desktop/dsh-code-desktop-app', version: '0.1.0', enabled: true, installed: true, description: 'x', rows: [] },
    { name: '@deepseek-ai/dsh-extra', enabled: false, installed: false, optional: true, meta: { title: { en: 'Extra', zh: '额外' }, description: 'Extra things' }, rows: [] },
  ]
  const response = pluginsInstalledResponse(bundles, '/p')
  assert.deepEqual(response.marketplaceLoadErrors, [])
  assert.equal(response.marketplaces.length, 1)
  const [marketplace] = response.marketplaces
  assert.deepEqual({ name: marketplace.name, path: marketplace.path, interface: marketplace.interface }, { name: 'deepseek-harness', path: '/p', interface: { displayName: 'DeepSeek Harness profile' } })
  assert.deepEqual(marketplace.plugins.map((plugin) => [plugin.id, plugin.installed, plugin.enabled, plugin.interface.displayName, plugin.interface.shortDescription, plugin.installPolicy]), [
    ['@deepseek-ai/dsh-base', true, true, '@deepseek-ai/dsh-base', '', 'INSTALLED_BY_DEFAULT'],
    ['@code-desktop/dsh-code-desktop-app', true, true, '@code-desktop/dsh-code-desktop-app', 'x', 'INSTALLED_BY_DEFAULT'],
    ['@deepseek-ai/dsh-extra', true, false, 'Extra', 'Extra things', 'AVAILABLE'],
  ])
  assert.deepEqual(marketplace.plugins[1].source, { type: 'local', path: '/p' })
  assert.equal(marketplace.plugins[1].version, '0.1.0')
  assert.deepEqual(pluginsInstalledResponse(undefined, '/p'), { marketplaces: [], marketplaceLoadErrors: [] })
})

test('plugin/read describes a bundle and names the MCP servers its patch inserts', () => {
  const bundle = { name: 'b', description: 'Bundle', enabled: true, rows: [{ rowId: 'mcp-gh', moduleName: '@deepseek-ai/dsh-mcp-client' }, { rowId: 'gone', moduleName: '@deepseek-ai/dsh-mcp-client' }, { rowId: 'tool', moduleName: '@deepseek-ai/dsh-tool-web' }] }
  const { plugin } = pluginReadResponse(bundle, { dir: '/p', mcpEntries: [mcpEntry('mcp-gh', { serverName: 'gh' })] })
  assert.equal(plugin.marketplaceName, 'deepseek-harness')
  assert.equal(plugin.marketplacePath, '/p')
  assert.equal(plugin.summary.id, 'b')
  assert.equal(plugin.description, 'Bundle')
  assert.deepEqual(plugin.mcpServers, ['gh'])
  assert.deepEqual([plugin.skills, plugin.hooks, plugin.apps, plugin.appTemplates, plugin.scheduledTasks, plugin.shareUrl], [[], [], [], [], null, null])
  assert.equal(pluginReadResponse({ name: 'bare', enabled: false }).plugin.description, null)
})
