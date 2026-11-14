import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pluginRequest, installLogParams, specParam } from '../packages/codex-app-server/src/plugins.js'
import { packageManager, prepareProfile } from '../bin/profile.mjs'
import { pluginSummary } from '../packages/codex-app-server/src/catalog.js'

const fakeManager = () => {
  const calls = []
  const record = (name) => async (...args) => { calls.push([name, ...args]); return { changed: true, application: 'restart-required', stage: 'install', target: args[0] } }
  return { calls, inspect: record('inspect'), installBundle: record('installBundle'), cancelInstall: record('cancelInstall'), setBundleEnabled: record('setBundleEnabled'), removeBundle: record('removeBundle') }
}

test('management methods validate their parameters before the manager runs', async () => {
  const manager = fakeManager()
  const installed = await pluginRequest('codeDesktop/plugin/install', { spec: ' dsh-plugin-x ', requestId: 'r1', approvedBuilds: ['esbuild', 'esbuild'] }, manager)
  assert.deepEqual(manager.calls.at(-1), ['installBundle', 'dsh-plugin-x', { requestId: 'r1', approvedBuilds: ['esbuild'] }])
  assert.equal(installed.requestId, 'r1')
  const generated = await pluginRequest('codeDesktop/plugin/install', { spec: '/abs/plugin' }, manager)
  assert.match(generated.requestId, /^[0-9a-f-]{36}$/)
  await pluginRequest('codeDesktop/plugin/setEnabled', { pluginName: 'p', enabled: false }, manager)
  assert.deepEqual(manager.calls.at(-1), ['setBundleEnabled', 'p', false])
  await pluginRequest('codeDesktop/plugin/remove', { pluginName: 'p' }, manager)
  assert.deepEqual(manager.calls.at(-1), ['removeBundle', 'p'])
  for (const [method, params] of [
    ['codeDesktop/plugin/install', { spec: '--registry=https://evil' }],
    ['codeDesktop/plugin/install', { spec: '' }],
    ['codeDesktop/plugin/install', { spec: 'p', requestId: '../../x' }],
    ['codeDesktop/plugin/install', { spec: 'p', approvedBuilds: 'esbuild' }],
    ['codeDesktop/plugin/install', { spec: 'p', registry: 'file:///x' }],
    ['codeDesktop/plugin/setEnabled', { pluginName: 'p', enabled: 'no' }],
    ['codeDesktop/plugin/remove', {}],
    ['codeDesktop/plugin/cancelInstall', { requestId: 'a b' }],
  ]) await assert.rejects(pluginRequest(method, params, manager), (error) => error.code === -32602, `${method} ${JSON.stringify(params)}`)
  await assert.rejects(pluginRequest('codeDesktop/plugin/inspect', { spec: 'p' }, undefined), (error) => error.code === -32601)
  assert.equal(specParam('  @scope/p@1  '), '@scope/p@1')
})

test('install output is forwarded per request and bounded', () => {
  assert.equal(installLogParams({ jobId: 'j', stream: 'stdout', text: 'x' }), null)
  const long = installLogParams({ requestId: 'r', stream: 'stderr', text: 'y'.repeat(20000), exitCode: 1 })
  assert.equal(long.text.length, 16384)
  assert.deepEqual([long.requestId, long.stream, long.exitCode], ['r', 'stderr', 1])
})

test('the user profile is seeded from the template once and keeps the core bundles', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-profile-'))
  const template = path.join(root, 'template'), dir = path.join(root, 'home', 'code-desktop', 'profile')
  fs.mkdirSync(template)
  fs.writeFileSync(path.join(template, 'package.json'), JSON.stringify({ name: 't', private: true, dependencies: {}, dsh: { profile: { bundles: ['base', 'core'] } } }))
  fs.writeFileSync(path.join(template, 'cordis.yml'), '[]\n')
  fs.writeFileSync(path.join(template, 'cordis.patch.yml'), '# local\n[]\n')
  prepareProfile(dir, template)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dsh.profile.bundles, ['base', 'core'])
  assert.match(fs.readFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'utf8'), /nodeLinker: hoisted/)
  // The user's own edits and plugins stay; a core bundle that went missing comes back first.
  fs.writeFileSync(path.join(dir, 'cordis.patch.yml'), '# mine\n[]\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 't', private: true, dependencies: { plug: '1.0.0' }, dsh: { profile: { bundles: ['core', 'plug'] } } }))
  prepareProfile(dir, template)
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  assert.deepEqual(manifest.dsh.profile.bundles, ['base', 'core', 'plug'])
  assert.deepEqual(manifest.dependencies, { plug: '1.0.0' })
  assert.equal(fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8'), '# mine\n[]\n')
  fs.rmSync(root, { recursive: true, force: true })
})

test('installs use CODE_DESKTOP_PNPM, else the bundled pnpm 11 under this node', () => {
  assert.deepEqual(packageManager('/nowhere', { CODE_DESKTOP_PNPM: '/opt/pnpm' }), { command: '/opt/pnpm' })
  assert.equal(packageManager('/nowhere', {}), undefined)
  const root = path.resolve(import.meta.dirname, '..')
  const bundled = packageManager(root, {})
  assert.equal(bundled.command, process.execPath)
  assert.ok(bundled.args[0].endsWith(path.join('pnpm', 'bin', 'pnpm.mjs')))
})

test('plugin rows tell the client what it may change', () => {
  const summary = pluginSummary({ name: 'p', version: '1.0.0', enabled: true, removable: true, optional: false, error: { code: 'operation-error', diagnostic: 'Cannot find module' }, rows: [] }, '/profile')
  assert.deepEqual(summary.codeDesktop, { removable: true, optional: false, held: false, experimental: false, title: null, description: null, icon: null, components: 0, readOnlyReason: null, loadError: 'Cannot find module', unavailable: null })
  assert.equal(pluginSummary({ name: 'core', readOnlyReason: 'management-required', rows: [] }, '/profile').codeDesktop.readOnlyReason, 'management-required')
})

test('an official optional bundle keeps its localized meta, icon and experimental tag for the client', () => {
  const icon = 'data:image/svg+xml;base64,PHN2Zy8+'
  const summary = pluginSummary({ name: '@deepseek-ai/dsh-experimental-auto-review', version: '0.2.0', enabled: false, installed: false, optional: true, removable: false,
    meta: { title: { en: 'Auto review', zh: '自动审查' }, description: { en: 'Reviews tools', zh: '审查工具', 'bad key!': 'x' }, icon }, rows: [{ rowId: 'a' }, { rowId: 'b' }] }, '/profile')
  assert.equal(summary.interface.displayName, 'Auto review')
  assert.equal(summary.interface.logo, icon)
  assert.deepEqual(summary.codeDesktop, { removable: false, optional: true, held: false, experimental: true, title: { en: 'Auto review', zh: '自动审查' }, description: { en: 'Reviews tools', zh: '审查工具' }, icon, components: 2, readOnlyReason: null, loadError: null, unavailable: 'notSupported' })
  assert.equal(pluginSummary({ name: 'x', meta: { icon: 'javascript:alert(1)' }, rows: [] }).codeDesktop.icon, null, 'only image data URLs pass')
})

test('codeDesktop/plugin/registries reads the plugin manager registry configuration', async () => {
  const registries = { registry: undefined, fallbackRegistries: ['https://registry.npmmirror.com/'], resolved: ['https://registry.npmjs.org/', 'https://registry.npmmirror.com/'] }
  assert.deepEqual(await pluginRequest('codeDesktop/plugin/registries', {}, { registries: async () => registries }), registries)
  await assert.rejects(pluginRequest('codeDesktop/plugin/registries', {}, undefined))
})

test('Official bundles that can\'t run in OpenClaude Desktop are marked unavailable and are never turned on here', async () => {
  const { bundleUnavailable, pluginsInstalledResponse } = await import('../packages/codex-app-server/src/catalog.js')
  for (const name of ['@deepseek-ai/dsh-experimental-schedule-bundle', '@deepseek-ai/dsh-experimental-agent-team-profile', '@deepseek-ai/dsh-experimental-auto-review'])
    assert.ok(pluginSummary({ name, optional: true, rows: [] }).codeDesktop.unavailable, name)
  assert.equal(pluginSummary({ name: '@deepseek-ai/dsh-experimental-schedule-bundle', rows: [] }).codeDesktop.unavailable, 'needsHost')
  // Any enabled bundle whose row the loader still holds pending can't run here either.
  const phases = new Map([['r1', 'active'], ['r2', 'pending']])
  assert.equal(bundleUnavailable({ name: 'x', enabled: true, rows: [{ rowId: 'r1' }, { rowId: 'r2' }] }, phases), 'needsHost')
  assert.equal(bundleUnavailable({ name: 'x', enabled: false, rows: [{ rowId: 'r2' }] }, phases), null)
  assert.equal(bundleUnavailable({ name: 'x', enabled: true, rows: [{ rowId: 'r1' }] }, phases), null)
  assert.equal(pluginsInstalledResponse([{ name: 'x', enabled: true, rows: [{ rowId: 'r2' }] }], '/p', { phases }).marketplaces[0].plugins[0].codeDesktop.unavailable, 'needsHost')
  const manager = fakeManager()
  await assert.rejects(pluginRequest('codeDesktop/plugin/setEnabled', { pluginName: '@deepseek-ai/dsh-experimental-agent-team-profile', enabled: true }, manager), /can’t run in OpenClaude Desktop/)
  assert.equal(manager.calls.length, 0)
  await pluginRequest('codeDesktop/plugin/setEnabled', { pluginName: '@deepseek-ai/dsh-experimental-agent-team-profile', enabled: false }, manager)
  assert.deepEqual(manager.calls.at(-1), ['setBundleEnabled', '@deepseek-ai/dsh-experimental-agent-team-profile', false])
})
