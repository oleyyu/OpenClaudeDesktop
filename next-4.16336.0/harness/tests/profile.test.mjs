import test from 'node:test'
import assert from 'node:assert/strict'
import { entryKind, profileEntry, profileReadResponse } from '../packages/codex-app-server/src/profile.js'

// Loader entry doubles: options as the profile row declares it; fiber.state is Cordis FiberState (2 active, 3 failed).
const entry = (id, name, { config, disabled = false, state = 2 } = {}) => ({ options: { id, name, ...(config ? { config } : {}) }, disabled, fiber: state === null ? undefined : { state, uid: 1 } })

test('entryKind groups rows for Settings › Harness', () => {
  assert.deepEqual([
    '@deepseek-ai/dsh-mcp-client', '@deepseek-ai/dsh-skill-filesystem', '@deepseek-ai/dsh-tool-skill', '@deepseek-ai/dsh-hooks-claude-code',
    '@deepseek-ai/dsh-llm-deepseek-api-key', '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-tool-web', '@deepseek-ai/dsh-system-prompt', 'file:///p/my-plugin.js',
  ].map(entryKind), ['mcp', 'skill', 'skill', 'hook', 'llm', 'llm', 'tool', 'core', 'core'])
})

test('profile/read: entries with phase, kind and bundle; secrets never leave the core', () => {
  const response = profileReadResponse({
    entries: [
      entry('tool-web', '@deepseek-ai/dsh-tool-web', { disabled: true, state: null }),
      entry('gh', '@deepseek-ai/dsh-mcp-client', { config: { transport: 'stdio', serverName: 'gh', command: 'npx', env: { GITHUB_TOKEN: 'secret' } }, state: 3 }),
      entry('skill-filesystem', '@deepseek-ai/dsh-skill-filesystem', { config: { customSkillDirs: ['/a', 3] } }),
      entry('cd-hooks-codex', '@deepseek-ai/dsh-hooks-codex', { config: { configPath: '/u/hooks.json' } }),
      entry('tool-web', '@deepseek-ai/dsh-tool-web'),
      { options: { id: '', name: 'x' } },
      null,
    ],
    bundles: [
      { name: '@deepseek-ai/dsh-base', version: '0.2.0', enabled: true, rows: [{ rowId: 'tool-web', moduleName: '@deepseek-ai/dsh-tool-web' }, { rowId: 'skill-filesystem' }] },
      { name: '@code-desktop/dsh-code-desktop-app', enabled: false, rows: [{ rowId: 'tool-web' }] },
      { rows: [] },
    ],
    patchPath: '/p/cordis.patch.yml',
    dir: '/p',
  })
  assert.equal(response.patchPath, '/p/cordis.patch.yml')
  assert.equal(response.profileDir, '/p')
  assert.deepEqual(response.bundles, [
    { name: '@deepseek-ai/dsh-base', rowIds: ['tool-web', 'skill-filesystem'], version: '0.2.0' },
    { name: '@code-desktop/dsh-code-desktop-app', rowIds: ['tool-web'], enabled: false },
  ])
  assert.deepEqual(response.entries.map((row) => row.id), ['tool-web', 'gh', 'skill-filesystem', 'cd-hooks-codex'], 'duplicates and malformed rows are skipped')
  assert.deepEqual(response.entries[0], { id: 'tool-web', module: '@deepseek-ai/dsh-tool-web', disabled: true, phase: null, kind: 'tool', bundle: '@deepseek-ai/dsh-base' })
  assert.deepEqual(response.entries[1], { id: 'gh', module: '@deepseek-ai/dsh-mcp-client', disabled: false, phase: 'failed', kind: 'mcp', serverName: 'gh', transport: 'stdio' })
  assert.equal(JSON.stringify(response).includes('secret'), false)
  assert.deepEqual(response.entries[2].customSkillDirs, ['/a'])
  assert.equal(response.entries[3].configPath, '/u/hooks.json')
})

test('profile/read without services is empty, not an error', () => {
  assert.deepEqual(profileReadResponse(), { patchPath: null, profileDir: null, entries: [], bundles: [] })
  assert.equal(profileEntry({ options: { id: 'x', name: 'y', disabled: true } }).disabled, true)
})
