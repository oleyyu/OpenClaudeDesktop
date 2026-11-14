// Settings › Code › '{core} settings' (codeDesktop/coreSettings/read|write) for OpenCode and MiMo Code. Values live in
// the bridge's own settings.json (`coreSettings`), never in the user's opencode.json / mimocode.jsonc: config keys go
// into the overlay (config.js overlay, the highest config layer), env switches into the agent server's environment
// (index.js serverEnv), which a change restarts once nothing runs.

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * The settings a flavor offers. kind 'config': a key of the agent's config (dotted path); kind 'env': an environment
 * switch of the agent server. default: what the agent does when OpenClaude Desktop sets nothing.
 */
export function coreSettingDefs(flavor) {
  if (flavor?.id === 'mimo') return [
    // MiMo posts model_call / tool_call / agent_request metrics, tagged with the session id, to Xiaomi's tracking
    // endpoint unless MIMOCODE_ENABLE_ANALYSIS=false (flag/flag.ts, metrics/subscriber.ts); on by default.
    { key: 'privacy.usageStatisticsEnabled', type: 'boolean', default: true, kind: 'env' },
    // config.ts compaction.auto (default true) and compaction.max_context (its /context-limit: compact earlier than the
    // model's window; 0 means no budget).
    { key: 'compaction.auto', type: 'boolean', default: true, kind: 'config' },
    { key: 'compaction.max_context', type: 'integer', min: 0, max: 10_000_000, default: null, kind: 'config' },
    // memory.disable_write: stop writing new memory (checkpoints, MEMORY.md, notes) and skip automatic dream/distill runs.
    { key: 'memory.disable_write', type: 'boolean', default: false, kind: 'config' },
    // Automatic memory consolidation (dream) and workflow packaging (distill) on new sessions; both off by default.
    { key: 'dream.auto', type: 'boolean', default: false, kind: 'config' },
    { key: 'distill.auto', type: 'boolean', default: false, kind: 'config' },
  ]
  // OpenCode 2.x: web search is its config `websearch` (false turns it off; Exa needs no key there, so it is on unless
  // set), written to the overlay (v2/config.js) and reloaded without a restart; it no longer reads
  // OPENCODE_ENABLE_EXA. Background sub-agents are always available there (the subagent tool's `background`), so that
  // switch is not offered.
  if (flavor?.api === 'v2') return [
    { key: 'websearch.enabled', type: 'boolean', default: true, kind: 'config' },
  ]
  return [
    // OpenCode's websearch tool exists only on OpenCode Zen / Go unless OPENCODE_ENABLE_EXA is set (tool/registry.ts);
    // with it, searches go to Exa's public endpoint. Off by default, as in OpenCode.
    { key: 'websearch.enabled', type: 'boolean', default: false, kind: 'env' },
    // Background sub-agents (task tool background: true, "You will be notified when it completes"): experimental in
    // OpenCode, behind OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS (effect/runtime-flags.ts); off by default, as there.
    { key: 'subagents.background', type: 'boolean', default: false, kind: 'env' },
  ]
}

function settingAt(object, key) {
  let node = object
  for (const part of String(key).split('.')) {
    if (!isRecord(node) || !Object.hasOwn(node, part)) return undefined
    node = node[part]
  }
  return node
}

/** A definition's value check: the value to store, or throws; null resets to the agent's default. */
export function coreSettingValue(def, value) {
  if (value === null) return null
  switch (def.type) {
    case 'boolean': if (typeof value === 'boolean') return value; break
    case 'integer':
      if (typeof value === 'number' && Number.isInteger(value) && (def.min === undefined || value >= def.min) && (def.max === undefined || value <= def.max)) return value
      break
  }
  throw new Error(`Invalid value for ${def.key}.`)
}

/** The stored values (flat by key) as the app's rows. */
export function coreSettingsView(defs, stored) {
  return defs.map((def) => {
    let value = null
    try { value = Object.hasOwn(stored ?? {}, def.key) ? coreSettingValue(def, stored[def.key]) : null } catch { value = null }
    return { key: def.key, type: def.type, value, default: def.default ?? null, ...(def.min !== undefined ? { min: def.min } : {}), ...(def.max !== undefined ? { max: def.max } : {}) }
  })
}

/** The stored values a flavor knows ({key: value}, flat), from settings.json `coreSettings`. */
export function storedCoreSettings(settings, flavor) {
  const raw = isRecord(settings?.coreSettings) ? settings.coreSettings : {}
  const out = {}
  for (const def of coreSettingDefs(flavor)) {
    if (!Object.hasOwn(raw, def.key)) continue
    try { const value = coreSettingValue(def, raw[def.key]); if (value !== null) out[def.key] = value } catch {}
  }
  return out
}

/** The overlay config the stored 'config' settings add (nested by key). */
export function coreSettingsConfig(settings, flavor) {
  const stored = storedCoreSettings(settings, flavor)
  const config = {}
  for (const def of coreSettingDefs(flavor)) {
    if (def.kind !== 'config' || !Object.hasOwn(stored, def.key)) continue
    const parts = def.key.split('.')
    let node = config
    for (const part of parts.slice(0, -1)) node = node[part] = isRecord(node[part]) ? node[part] : {}
    node[parts.at(-1)] = stored[def.key]
  }
  return config
}

/** The agent server environment the stored 'env' settings add. */
export function coreSettingsEnv(settings, flavor) {
  const stored = storedCoreSettings(settings, flavor)
  const env = {}
  // OpenCode 2.x reads neither OPENCODE_ENABLE_EXA nor OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS.
  if (flavor?.api === 'v2') return env
  if (flavor?.id === 'mimo' && stored['privacy.usageStatisticsEnabled'] === false) env.MIMOCODE_ENABLE_ANALYSIS = 'false'
  if (flavor?.id !== 'mimo' && stored['websearch.enabled'] === true) env.OPENCODE_ENABLE_EXA = '1'
  if (flavor?.id !== 'mimo' && stored['subagents.background'] === true) env.OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS = 'true'
  return env
}

export { settingAt }
