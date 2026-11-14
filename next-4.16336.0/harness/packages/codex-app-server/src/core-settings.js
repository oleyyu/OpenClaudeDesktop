// DeepSeek's own settings pages (the official client's Plugins › Official Shell, Agent loop, Subagent and Web search
// pages) for OpenClaude Desktop's Settings › Code: codeDesktop/settings/read|write over dsh-settings (ctx.settings), which edits
// the live volatile fields of those profile entries and persists them in the active profile's patch.
//
// Only these fields are offered, each read from the redacted descriptor (its effective value, the schema default, and
// whether the profile overrides it) and written one at a time with a revision check (settings.mutate: set, or unset to go
// back to the default). The web search key is left out: the official page writes it to the credential reference
// DEEPSEEK_API_KEY, which is also the DeepSeek key Settings › Models manages.
import { RpcError } from './transport.js'

const INT = 'integer'
export const CORE_SETTING_FIELDS = Object.freeze([
  // The core's sandboxed shell (bash-sandbox: dsh shell executor): a command's default timeout, the longest one it may
  // ask for, and the output kept per stream.
  { ns: 'bash-sandbox', key: 'timeoutMs', type: INT, min: 1000, max: 86_400_000, unit: 'ms' },
  { ns: 'bash-sandbox', key: 'maxTimeoutMs', type: INT, min: 1000, max: 86_400_000, unit: 'ms' },
  { ns: 'bash-sandbox', key: 'maxOutputBytes', type: INT, min: 1024, max: 64 * 1024 * 1024, unit: 'bytes' },
  // How many parallel-safe tool calls one step may run (agent-loop).
  { ns: 'agent-loop', key: 'maxParallelToolCalls', type: INT, min: 1, max: 64 },
  // Sub-agents: how deep they may nest, and how many run at once (dsh-subagent).
  { ns: 'subagent', key: 'maxDepth', type: INT, min: 0, max: 8 },
  { ns: 'subagent', key: 'maxActiveSubagents', type: INT, min: 1, max: 64 },
  // Web search: searches per request, and the endpoint (empty: the default).
  { ns: 'web-search-deepseek', key: 'maxUses', type: INT, min: 1, max: 50 },
  { ns: 'web-search-deepseek', key: 'baseURL', type: 'url' },
])

function schemaDefault(schema, key) {
  // A Schemastery-style dump: {uid, refs: {id: {type, meta, dict}}}; the root's dict maps field → ref id.
  const refs = schema && typeof schema === 'object' ? schema.refs ?? {} : {}
  const root = refs[schema?.uid]
  const ref = root?.dict ? refs[root.dict[key]] : null
  return ref?.meta && Object.hasOwn(ref.meta, 'default') ? ref.meta.default : null
}

/** {writable, settings: [{ns, key, type, unit?, min?, max?, value, default, overridden}]}: the fields the profile serves. */
export function coreSettingsRead(settings) {
  const forms = settings.describe({ redactSecrets: true })
  const out = []
  for (const field of CORE_SETTING_FIELDS) {
    const form = forms.find((entry) => entry.ns === field.ns)
    if (!form) continue
    const value = form.value && typeof form.value === 'object' ? form.value[field.key] : undefined
    const user = form.user && typeof form.user === 'object' ? form.user[field.key] : undefined
    // The default a reset returns to: the value beneath the profile override (OpenClaude Desktop's own profile may set one),
    // else the schema's.
    const base = form.base && typeof form.base === 'object' && form.base[field.key] !== undefined ? form.base[field.key] : schemaDefault(form.schema, field.key)
    out.push({ ns: field.ns, key: field.key, type: field.type, ...(field.unit ? { unit: field.unit } : {}), ...(field.min !== undefined ? { min: field.min, max: field.max } : {}),
      value: value ?? null, default: base ?? null, overridden: user !== undefined, revision: form.revision })
  }
  return { writable: settings.writable === true, settings: out }
}

/** One field set ({ns, key, value}) or reset to its default ({ns, key, value: null}); returns the fresh read. */
export async function coreSettingsWrite(settings, params = {}) {
  const field = CORE_SETTING_FIELDS.find((entry) => entry.ns === params.ns && entry.key === params.key)
  if (!field) throw new RpcError(-32602, 'Unknown setting.')
  if (settings.writable !== true) throw new RpcError(-32600, 'The DeepSeek profile can’t be changed from here.')
  let value = params.value ?? null
  if (value !== null && field.type === INT) {
    if (!Number.isSafeInteger(value) || value < field.min || value > field.max) throw new RpcError(-32602, `Enter a whole number from ${field.min} to ${field.max}.`)
  }
  if (value !== null && field.type === 'url') {
    const text = typeof value === 'string' ? value.trim() : ''
    let url = null
    try { url = new URL(text) } catch {}
    if (!url || !/^https?:$/.test(url.protocol) || url.username || url.password) throw new RpcError(-32602, 'Enter an http(s) URL.')
    value = text || null
  }
  const form = settings.describe({ redactSecrets: true }).find((entry) => entry.ns === field.ns)
  if (!form) throw new RpcError(-32602, 'Unknown setting.')
  try {
    await settings.mutate(field.ns, [value === null ? { op: 'unset', path: [field.key] } : { op: 'set', path: [field.key], value }], form.revision)
  } catch (error) {
    if (error?.code === 'SETTINGS_CONFLICT') throw new RpcError(-32600, 'The setting changed meanwhile. Try again.')
    throw new RpcError(-32000, String(error?.message ?? error))
  }
  return coreSettingsRead(settings)
}
