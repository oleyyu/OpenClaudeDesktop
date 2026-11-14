/**
 * Test setup for the four ACP agents: where the real agent programs are (the
 * official releases unpacked under work/agents/acp-bridge, or ACP_BRIDGE_<ID>_BINARY),
 * an isolated home configured for a local scripted model server, and the
 * agent-specific tool names and argument shapes the scripted model uses.
 */
import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '../../../..')
const work = path.join(repo, 'work/agents/acp-bridge')

export const AGENTS = {
  gemini: { binary: path.join(work, 'gemini/package/bundle/gemini.js'), runner: 'node', version: '0.62.0', protocol: 'gemini' },
  qwen: { binary: path.join(work, 'qwen/package/cli-entry.js'), runner: 'node', version: '0.24.7', protocol: 'openai' },
  kimi: { binary: path.join(work, 'kimi-bin/kimi'), runner: '', version: '2.1.1', protocol: 'openai' },
  minimax: { binary: path.join(work, 'minimax/package/cli.js'), runner: 'node', version: '0.6.2', protocol: 'openai' },
}

export const MODEL = { gemini: 'gemini-2.5-pro', qwen: 'fake-model', kimi: 'local', minimax: 'fake-model' }

export function agentBinary(id) {
  return process.env[`ACP_BRIDGE_${id.toUpperCase()}_BINARY`] || AGENTS[id].binary
}

/** Writes the agent's config into `home` and returns the env for the bridge (and so the agent). */
export function setupAgentHome(id, { home, baseURL, stateDir, nativeDir }) {
  const env = { HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), CODE_DESKTOP_AGENT_BINARY: agentBinary(id), CODE_DESKTOP_AGENT_RUNNER: AGENTS[id].runner, CODE_DESKTOP_AGENT_VERSION: AGENTS[id].version, CODE_DESKTOP_BRIDGE_STATE: stateDir, CODE_DESKTOP_NODE_BINARY: process.execPath, NO_COLOR: '1' }
  if (id === 'gemini') {
    fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
    fs.writeFileSync(path.join(home, '.gemini/settings.json'), JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } }, model: { name: MODEL.gemini }, general: { disableAutoUpdate: true }, privacy: { usageStatisticsEnabled: false } }, null, 2))
    Object.assign(env, { GEMINI_API_KEY: 'sk-fake-gemini', GOOGLE_GEMINI_BASE_URL: baseURL, GEMINI_CLI_TRUST_WORKSPACE: 'true', GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), GEMINI_FORCE_FILE_STORAGE: 'true' })
  } else if (id === 'qwen') {
    fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
    fs.writeFileSync(path.join(home, '.qwen/settings.json'), JSON.stringify({ security: { auth: { selectedType: 'openai' } }, model: { name: MODEL.qwen, generationConfig: { modalities: { image: true } } }, tools: { todoWrite: { enabled: true } } }, null, 2))
    Object.assign(env, { OPENAI_API_KEY: 'sk-fake-qwen', OPENAI_BASE_URL: `${baseURL}/v1`, OPENAI_MODEL: MODEL.qwen, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), QWEN_DISABLE_AUTO_TITLE: '1' })
  } else if (id === 'kimi') {
    fs.mkdirSync(path.join(home, '.kimi-code'), { recursive: true })
    fs.writeFileSync(path.join(home, '.kimi-code/config.toml'), `default_model = "local"\ntelemetry = false\n\n[providers.local]\ntype = "openai"\nbase_url = "${baseURL}/v1"\napi_key = "sk-fake-kimi"\n\n[models.local]\nprovider = "local"\nmodel = "fake-model"\nmax_context_size = 131072\ncapabilities = ["tool_use", "thinking", "image_in"]\n\n[models.plain]\nprovider = "local"\nmodel = "fake-model-2"\nmax_context_size = 65536\ncapabilities = ["tool_use"]\n`)
    Object.assign(env, { KIMI_DISABLE_TELEMETRY: '1', KIMI_CODE_NO_AUTO_UPDATE: '1' })
  } else if (id === 'minimax') {
    const data = path.join(home, '.minimax')
    fs.mkdirSync(data, { recursive: true })
    fs.writeFileSync(path.join(data, 'config.yaml'), [
      'defaultModel: custom_provider:local/fake-model',
      'permissionMode: default',
      'custom_provider:',
      '  local:',
      '    name: local',
      '    kind: custom',
      '    enabled: true',
      '    api: openai-completions',
      '    options:',
      '      apiKey: sk-fake-minimax',
      `      baseURL: ${baseURL}/v1`,
      '      authMode: api-key',
      '    models:',
      '      fake-model:',
      '        limit:',
      '          context: 131072',
      '          output: 8192',
      '        reasoning: true',
      '      fake-model-2:',
      '        limit:',
      '          context: 65536',
      '          output: 4096',
      '',
    ].join('\n'))
    Object.assign(env, { MINIMAX_DATA_DIR: data, MCODE_DISABLE_TELEMETRY: '1' })
    if (nativeDir) env.MAVIS_SQLITE3_MODULE_PATH = nativeDir
  }
  return env
}

const PATH_KEYS = ['file_path', 'path', 'absolute_path', 'filePath', 'filename']

/** Arguments for one of the agent's tools from its JSON schema (path/content/command keys as it names them). */
export function toolInput(schema, values) {
  const props = schema?.properties ?? {}
  const out = {}
  const pathKey = PATH_KEYS.find((key) => key in props)
  if (values.path && pathKey) out[pathKey] = values.path
  if (values.content !== undefined) out[['content', 'contents', 'text'].find((key) => key in props) ?? 'content'] = values.content
  if (values.command) out[['command', 'cmd'].find((key) => key in props) ?? 'command'] = values.command
  if (values.old !== undefined) out[['old_string', 'oldString', 'old_str', 'search'].find((key) => key in props) ?? 'old_string'] = values.old
  if (values.new !== undefined) out[['new_string', 'newString', 'new_str', 'replace'].find((key) => key in props) ?? 'new_string'] = values.new
  if ('description' in props && values.command) out.description = 'scripted test step'
  if ('is_background' in props) out.is_background = false
  if (values.todos && 'todos' in props) out.todos = values.todos
  if (values.query && 'query' in props) out.query = values.query
  return out
}

/** The agent's tool for a role ('write' | 'edit' | 'shell' | 'read' | 'todo'). */
export function toolFor(tools, role) {
  const candidates = {
    write: ['write_file', 'Write', 'write'],
    edit: ['replace', 'edit', 'Edit'],
    shell: ['run_shell_command', 'Bash', 'bash'],
    read: ['read_file', 'Read', 'read'],
    todo: ['write_todos', 'todo_write', 'TodoList', 'todowrite'],
  }[role]
  return candidates.find((name) => tools.includes(name)) ?? null
}
