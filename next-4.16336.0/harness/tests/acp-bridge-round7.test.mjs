// ACP bridge (harness/packages/acp-bridge), round 7: Kimi's kimi.com / kimi.ai device-code regions and Kimi Platform API
// keys written to config.toml as its own /login does; Gemini API keys saved in the bridge state and handed to Gemini at
// launch; Qwen's memory and follow-up-suggestion settings.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { KIMI_PLATFORMS, kimiLoginRegion, kimiPlatformModels, kimiTomlWithPlatform, readKimiConfig } from '../packages/acp-bridge/src/agents/kimi.js'
import { savedGeminiKey } from '../packages/acp-bridge/src/agents/gemini.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r7-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const platformModels = { data: [
  { id: 'kimi-k2.5', context_length: 262144, supports_thinking_type: 'both', supports_image_in: true, display_name: 'Kimi K2.5', think_efforts: { valid_efforts: ['low', 'high'], default_effort: 'high' } },
  { id: 'kimi-k2-0905-preview', context_length: 262144 },
  { id: 'moonshot-v1-8k', context_length: 8192 },
  { id: 'kimi-k3', context_length: 0 },
] }

test('Kimi device code: kimi.com and kimi.ai regions', () => {
  assert.equal(kimiLoginRegion('kimi-cn'), 'mainland-cn')
  assert.equal(kimiLoginRegion('kimi-global'), 'global')
  assert.equal(kimiLoginRegion(undefined), null)
})

test('Kimi Platform: models as aliases, config.toml tables replaced and default_model set', () => {
  const models = kimiPlatformModels(platformModels, KIMI_PLATFORMS['moonshot-cn'])
  assert.deepEqual(models.map((model) => model.id), ['kimi-k2.5', 'kimi-k2-0905-preview'], 'kimi-k only, a context length required')
  assert.deepEqual(models[0].capabilities, ['thinking', 'image_in', 'tool_use'])
  const original = [
    '# my config', 'default_model = "kimi-code/k3"', 'telemetry = false', '',
    '[providers."managed:kimi-code"]', 'type = "kimi"', '',
    '[providers.moonshot-cn]', 'api_key = "old"', '',
    '[models."moonshot-cn/old-model"]', 'provider = "moonshot-cn"', 'model = "old-model"', 'max_context_size = 1', '',
    '[thinking]', 'enabled = true', '',
  ].join('\n')
  const next = kimiTomlWithPlatform(original, { platform: KIMI_PLATFORMS['moonshot-cn'], apiKey: 'sk-new', models, defaultModel: 'moonshot-cn/kimi-k2.5' })
  assert.match(next, /^# my config\ndefault_model = "moonshot-cn\/kimi-k2\.5"\ntelemetry = false/)
  assert.doesNotMatch(next, /old-model|"old"/)
  assert.match(next, /\[providers\."managed:kimi-code"\]/)
  assert.match(next, /\[thinking\]\nenabled = true/)
  const home = tmp()
  fs.writeFileSync(path.join(home, 'config.toml'), next)
  const parsed = readKimiConfig(path.join(home, 'config.toml'))
  assert.equal(parsed.defaultModel, 'moonshot-cn/kimi-k2.5')
  assert.deepEqual({ ...parsed.providers['moonshot-cn'] }, { type: 'kimi', base_url: 'https://api.moonshot.cn/v1', api_key: 'sk-new' })
  assert.equal(parsed.models['moonshot-cn/kimi-k2.5'].max_context_size, 262144)
  assert.deepEqual(parsed.models['moonshot-cn/kimi-k2.5'].support_efforts, ['low', 'high'])
  // A file without top-level keys gets default_model first.
  assert.match(kimiTomlWithPlatform('', { platform: KIMI_PLATFORMS['moonshot-ai'], apiKey: 'k', models, defaultModel: 'moonshot-ai/kimi-k2.5' }), /^default_model = "moonshot-ai\/kimi-k2\.5"\n\n\[providers\."moonshot-ai"\]/)
})

test('Kimi connectProvider: a refused key changes nothing; an accepted one writes config.toml', async () => {
  const kimi = adapterById('kimi')
  const home = tmp()
  const ctx = (status, body) => ({ env: { HOME: home, KIMI_CODE_HOME: home }, fetch: async (url, options) => { assert.equal(url, 'https://api.moonshot.ai/v1/models'); assert.equal(options.headers.authorization, 'Bearer sk-x'); return { ok: status === 200, status, json: async () => body } } })
  await assert.rejects(kimi.connectProvider(ctx(401, {}), { template: 'moonshot-ai', apiKey: 'sk-x' }), /rejected this API key/)
  assert.equal(fs.existsSync(path.join(home, 'config.toml')), false)
  await assert.rejects(kimi.connectProvider(ctx(200, {}), { template: 'nope', apiKey: 'sk-x' }), /Choose which Kimi Platform/)
  const result = await kimi.connectProvider(ctx(200, platformModels), { template: 'moonshot-ai', apiKey: 'sk-x' })
  assert.equal(result.defaultModel, 'moonshot-ai/kimi-k2.5')
  const account = kimi.account({ env: { HOME: home, KIMI_CODE_HOME: home } })
  assert.equal(account.kind, 'apiKey')
})

test('Gemini API key: checked, saved in the bridge state, given to Gemini at launch, gone on sign-out', async () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const state = path.join(home, 'state')
  const env = { HOME: home, GEMINI_CLI_HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'), PATH: process.env.PATH }
  const ctx = (status) => ({ env, stateDir: state, fetch: async (url, options) => { assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models/); assert.equal(options.headers['x-goog-api-key'], 'AIza-test'); return { ok: status === 200, status, json: async () => ({}) } } })
  assert.match(gemini.account(ctx(200)).hint, /add a Gemini API key/)
  await assert.rejects(gemini.connectProvider(ctx(400), { template: 'gemini-api-key', apiKey: 'AIza-test' }), /rejected this key/)
  assert.equal(savedGeminiKey(ctx(200)), null)
  await gemini.connectProvider(ctx(200), { template: 'gemini-api-key', apiKey: 'AIza-test' })
  assert.equal(savedGeminiKey(ctx(200)), 'AIza-test')
  assert.equal(fs.statSync(path.join(state, 'gemini-api-key.json')).mode & 0o777, 0o600)
  assert.deepEqual({ kind: gemini.account(ctx(200)).kind, detail: gemini.account(ctx(200)).detail }, { kind: 'apiKey', detail: 'Saved in OpenClaude Desktop' })
  const launch = gemini.launch(ctx(200), { threadDir: path.join(home, 'thread'), cwd: home, writable: [home] })
  assert.equal(launch.env.GEMINI_API_KEY, 'AIza-test')
  const overlayHome = launch.env.GEMINI_CLI_HOME
  assert.ok(overlayHome, 'the thread runs on an overlay home')
  assert.equal(JSON.parse(fs.readFileSync(path.join(overlayHome, '.gemini', 'settings.json'), 'utf8')).security.auth.selectedType, 'gemini-api-key')
  gemini.logout(ctx(200))
  assert.equal(savedGeminiKey(ctx(200)), null)
})

test('Qwen settings: auto memory, memory consolidation and follow-up suggestions are switchable', () => {
  const qwen = adapterById('qwen')
  const keys = qwen.coreSettings.defs.map((def) => def.key)
  for (const key of ['memory.enableManagedAutoMemory', 'memory.enableManagedAutoDream', 'ui.enableFollowupSuggestions']) assert.ok(keys.includes(key), key)
  assert.equal(qwen.coreSettings.defs.find((def) => def.key === 'ui.enableFollowupSuggestions').default, false)
  assert.equal(qwen.coreSettings.defs.find((def) => def.key === 'memory.enableManagedAutoMemory').default, true)
})

test('Kimi: a broken config.toml behind "Authentication required" is named, with kimi doctor\'s words', async () => {
  const { kimiDoctorIssue } = await import('../packages/acp-bridge/src/agents/kimi.js')
  const validation = 'Kimi doctor found 1 issue.\n\nERROR config.toml  /h/.kimi-code/config.toml\n  Invalid configuration in /h/.kimi-code/config.toml.\n  Validation issues:\n    models.orphan.max_context_size: Invalid input: expected number, received string\n'
  assert.equal(kimiDoctorIssue(validation), 'models.orphan.max_context_size: Invalid input: expected number, received string')
  const toml = 'Kimi doctor found 1 issue.\n\nERROR config.toml  /h/.kimi-code/config.toml\n  Invalid TOML in /h/.kimi-code/config.toml: Invalid TOML document: only letter (line 2, column 7)\n'
  assert.equal(kimiDoctorIssue(toml), 'Invalid TOML document: only letter (line 2, column 7)')
  assert.equal(kimiDoctorIssue('Kimi doctor found no issues.'), null)
  // Through the adapter: signed in with a key, a doctor that reports the issue.
  const kimi = adapterById('kimi')
  const home = tmp()
  fs.writeFileSync(path.join(home, 'config.toml'), '[providers.p]\ntype = "kimi"\napi_key = "x"\n')
  const doctor = path.join(home, 'doctor.sh')
  fs.writeFileSync(path.join(home, 'doctor.out'), validation)
  fs.writeFileSync(doctor, `#!/bin/sh\ncat '${path.join(home, 'doctor.out')}'\nexit 1\n`, { mode: 0o755 })
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: home, PATH: process.env.PATH }, commandLine: (args) => ({ command: doctor, args }) }
  const hint = kimi.authHint(ctx, 'Authentication required')
  assert.equal(hint.codexErrorInfo, 'badRequest')
  assert.match(hint.message, /config\.toml has a problem, so it can’t start: models\.orphan\.max_context_size: Invalid input: expected number, received string\. Fix/)
  assert.equal(kimi.authHint(ctx, 'Model overloaded'), null)
  fs.rmSync(path.join(home, 'config.toml'))
  assert.equal(kimi.authHint(ctx, 'Authentication required'), null, 'not signed in: the sign-in remedy stays')
})
