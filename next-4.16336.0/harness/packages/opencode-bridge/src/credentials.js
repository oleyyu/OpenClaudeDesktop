/**
 * Which of the agent's providers actually hold a credential. GET /provider lists a provider
 * as `connected` whenever the agent can build it, which includes providers its built-in
 * config ships without a key (MiMo's `xiaomi`) and the free public ones (OpenCode Zen,
 * MiMo Auto: flavor.freeProviders). Neither is an account:
 *
 *   oauth | api | wellknown  stored in the agent's own auth store (<data>/<agent>/auth.json),
 *                            what account/login/start writes and account/logout removes
 *   env                      a key from the provider's environment variable
 *   settings                 a Settings › Models custom provider (CODE_DESKTOP_PROVIDERS_FILE)
 *   config                   a key in the user's own config
 *   none                     a provider that needs no key (no key variable, e.g. a local server)
 *   null                     no credential: a free tier, or a provider still missing its key
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// The placeholder keys the agents give their free providers.
const PUBLIC_KEYS = new Set(['public', 'anonymous'])
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/** The agent's auth store file (Global.Path.data/auth.json). */
export function authFile(flavor, env = process.env) {
  const data = env.XDG_DATA_HOME || path.join(env.HOME || os.homedir(), '.local', 'share')
  return path.join(data, flavor.dataDir, 'auth.json')
}

/** {providerID: 'oauth' | 'api' | 'wellknown' | …} from the agent's auth store. */
export function storedCredentials(file) {
  let value = null
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => isRecord(entry)).map(([id, entry]) => [id, typeof entry.type === 'string' ? entry.type : 'api']))
}

/**
 * The kind of credential a provider (a GET /provider or /config/providers entry) holds, or null.
 * @param {{ id: string, source?: string, key?: string, env?: string[], options?: object }} provider
 * @param {{ stored?: Record<string, string>, free?: string[], settings?: string[] }} context
 */
export function credentialOf(provider, { stored = {}, free = [], settings = [] } = {}) {
  const id = provider?.id
  if (typeof id !== 'string' || !id) return null
  if (Object.hasOwn(stored, id)) return stored[id]
  if (provider.source === 'env') return 'env'
  if (free.includes(id)) return null
  if (settings.includes(id)) return 'settings'
  const key = [provider.key, provider.options?.apiKey].find((value) => typeof value === 'string' && value.trim())
  if (key && !PUBLIC_KEYS.has(key)) return 'config'
  return Array.isArray(provider.env) && provider.env.length ? null : 'none'
}

/**
 * How usable a provider is for the default model: 0 has a credential (or needs none),
 * 1 a free tier, 2 still missing its key, 3 a free tier that has ended (context.ended: MiMo Auto
 * after its sunset), which the agent refuses outright.
 */
export function providerRank(provider, context = {}) {
  if (credentialOf(provider, context)) return 0
  if ((context.ended ?? []).includes(provider?.id)) return 3
  return (context.free ?? []).includes(provider?.id) ? 1 : 2
}
