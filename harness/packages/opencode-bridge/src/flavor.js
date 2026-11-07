/**
 * The two agents this bridge drives. MiMo Code is an OpenCode fork with the
 * same `serve` HTTP API + SSE events; it renames its environment
 * (MIMOCODE_*), config files (mimocode.json) and data folders (mimocode).
 *
 * Which one runs is read from (first match wins):
 *   1. CODE_DESKTOP_OPENCODE_FLAVOR ("opencode" | "mimo"), for tests, or CODE_DESKTOP_CORE_ID
 *      (the core id, when the app passes it);
 *   2. the agent binary's name: `mimo`, `mimocode` → mimo; `opencode` → opencode;
 *   3. a `cores/<id>/` segment of its path (this app's downloads);
 *   4. the bridge state folder (<userData>/cores/<id>/state);
 *   5. `<binary> --help` naming mimocode.
 */
import { execFile } from 'node:child_process'
import { basename } from 'node:path'
import { execFilePlatform } from './win-process.js'

export const FLAVORS = Object.freeze({
  opencode: Object.freeze({
    id: 'opencode',
    name: 'OpenCode',
    engine: 'opencode',
    binary: 'opencode',
    envPrefix: 'OPENCODE',
    configFile: 'opencode.json',
    dataDir: 'opencode',
    // The provider account/login/start signs in to (ChatGPT Pro/Plus OAuth: browser, headless).
    login: Object.freeze({ provider: 'openai', browser: 0, headless: 1, label: 'ChatGPT Pro/Plus' }),
    // Providers the agent ships with a public key (OpenCode Zen's free models): usable without
    // a sign-in, so they are a free tier, never an account (credentials.js).
    freeProviders: Object.freeze(['opencode']),
    // How a prompt is posted: prompt_async (returns at once).
    promptRoute: 'prompt_async',
    // Read-only tools (Ask mode lets them run without a card).
    readTools: Object.freeze(['read', 'glob', 'grep', 'list', 'lsp', 'todowrite', 'todoread', 'question', 'skill', 'webfetch', 'websearch', 'codesearch', 'task', 'invalid']),
    // Sub-agents are child sessions whose asks reach the bridge: the ruleset never encodes the mode (policy.js).
    modeRules: false,
    hiddenSkills: Object.freeze([]),
    // Tool selection (tools.js): Permission.disabled checks edit, write and apply_patch against one
    // `edit` permission, so they are listed and turned off together as `edit`.
    editSwitches: 'shared',
  }),
  mimo: Object.freeze({
    id: 'mimo',
    name: 'MiMo Code',
    engine: 'mimo',
    binary: 'mimo',
    envPrefix: 'MIMOCODE',
    configFile: 'mimocode.json',
    dataDir: 'mimocode',
    login: Object.freeze({ provider: 'xiaomi', browser: 0, headless: null, label: 'Xiaomi MiMo' }),
    // The anonymous MiMo Auto provider; `xiaomi` is listed from the built-in config even without a key.
    freeProviders: Object.freeze(['mimo']),
    // MiMo 0.1.15 ended its free API (util/free-api-sunset.ts FREE_API_SUNSET_AT; provider.ts refuses mimo/mimo-auto
    // with 'MiMo free API service has ended. Sign in or configure a third-party API.'): from then on MiMo Auto is
    // neither a free tier nor a default, and a fresh install asks for a sign-in (freeTierActive).
    freeSunsetAt: '2026-07-26T10:00:00Z',
    // MiMo rate-limits prompt_async to 20 a minute; POST /message (held open until the loop ends) is not.
    promptRoute: 'message',
    readTools: Object.freeze(['read', 'view_image', 'glob', 'grep', 'list', 'lsp', 'todowrite', 'todoread', 'question', 'skill', 'skill_search', 'webfetch', 'websearch', 'codesearch', 'mcp_tool_search', 'task', 'history', 'actor', 'session', 'invalid']),
    // Background actors (the actor tool's default `spawn`) never ask a person: they read the session
    // ruleset, so it also grants what the mode allows (policy.js modeGrantRules).
    modeRules: true,
    // Skills MiMo keeps to its deprecated compose agent (agent.ts denies `skill compose:*` elsewhere);
    // they live under <data>/mimocode/compose/<version>/skills.
    hiddenSkills: Object.freeze(['compose:*']),
    hiddenSkillDir: 'compose',
    // Tool selection (tools.js): Permission.disabled matches a tool by its own name as well as the `edit`
    // alias, so write, multiedit, apply_patch and notebook_edit each have a switch; turning `edit` off
    // also stops them, since every file change asks the `edit` permission.
    editSwitches: 'perTool',
    // The context ring counts against MiMo's working window: limit.input || limit.context, lowered by
    // compaction.max_context (session/overflow.ts), where it compacts (at 90%) and what its footer shows.
    workingWindow: true,
  }),
})

/** Whether the flavor's free providers still work (before freeSunsetAt, when it has one). */
export function freeTierActive(flavor, now = Date.now()) {
  const sunset = typeof flavor?.freeSunsetAt === 'string' ? Date.parse(flavor.freeSunsetAt) : NaN
  return !Number.isFinite(sunset) || now < sunset
}

/** The flavor named by a binary path or state folder, or null. */
export function flavorFromPath(file) {
  if (typeof file !== 'string' || !file) return null
  const name = basename(file).toLowerCase().replace(/\.(exe|cmd|js|mjs)$/, '')
  if (name === 'mimo' || name === 'mimocode' || name.startsWith('mimo-') || name.startsWith('mimocode-')) return 'mimo'
  if (name === 'opencode' || name.startsWith('opencode-')) return 'opencode'
  const segment = /[\\/]cores[\\/](opencode|mimo)(?:[\\/]|$)/.exec(file)
  return segment ? segment[1] : null
}

/** Which agent this bridge process drives. */
export async function detectFlavor({ env = process.env, binary } = {}) {
  for (const forced of [env.CODE_DESKTOP_OPENCODE_FLAVOR, env.CODE_DESKTOP_CORE_ID]) if (forced === 'opencode' || forced === 'mimo') return FLAVORS[forced]
  const id = flavorFromPath(binary ?? env.CODE_DESKTOP_AGENT_BINARY) ?? flavorFromPath(env.CODE_DESKTOP_BRIDGE_STATE)
  if (id) return FLAVORS[id]
  if (binary) {
    const help = await new Promise((resolve) => execFilePlatform(binary, ['--help'], { timeout: 15000 }, (error, stdout, stderr) => resolve(`${stdout ?? ''}${stderr ?? ''}`)))
    if (/mimocode|\bmimo\b/i.test(help)) return FLAVORS.mimo
  }
  return FLAVORS.opencode
}

/** The env var name of `suffix` for a flavor (OPENCODE_CONFIG_DIR, MIMOCODE_CONFIG_DIR …). */
export const envName = (flavor, suffix) => `${flavor.envPrefix}_${suffix}`
