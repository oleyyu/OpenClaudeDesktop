/**
 * Plugin management: the profile's dsh-plugin-manager service (what the
 * DeepSeek app's Plugins page and `dsh plugin` use) behind OpenClaude Desktop
 * bridge methods. Codex's plugin/install installs from a marketplace by
 * name; a Harness plugin is an npm bundle named by a package spec, so these
 * are their own methods:
 *
 *   codeDesktop/plugin/inspect        {spec}                       → PluginSpecInspection
 *   codeDesktop/plugin/install        {spec, requestId?, approvedBuilds?, registry?} → ChangeResult
 *   codeDesktop/plugin/cancelInstall  {requestId}                  → {status}
 *   codeDesktop/plugin/setEnabled     {pluginName, enabled}        → ChangeResult
 *   codeDesktop/plugin/remove         {pluginName}                 → ChangeResult
 *
 * Notifications: codeDesktop/plugin/installProgress (plugin-manager/install-state),
 * codeDesktop/plugin/installLog (install-log chunks of a request) and
 * codeDesktop/plugin/changed (plugin-manager/changed). A ChangeResult's
 * `application` says whether the running core already uses the change
 * ('applied') or needs a restart ('restart-required': this profile runs
 * without HMR). OpenClaude Desktop restarts the core before the next new
 * session once nothing runs on it (app/electron/core-restart.cjs), so a
 * restart-required change is ready in a new session.
 */
import { randomUUID } from 'node:crypto'
import { RpcError, invalidParams } from './transport.js'
import { UNAVAILABLE_BUNDLES } from './catalog.js'

const REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/u
const MAX_SPEC = 2048
const MAX_LOG_CHUNK = 16384

/** The service, or a request error naming why it is missing. */
export function requireManager(manager) {
  if (!manager) throw new RpcError(-32601, 'Plugin management is not available in this Harness profile.')
  return manager
}

export function specParam(value) {
  const spec = typeof value === 'string' ? value.trim() : ''
  if (!spec || spec.length > MAX_SPEC || spec.includes('\0') || /^-/u.test(spec)) throw invalidParams('Enter a package name, absolute path, git URL or tarball URL.')
  return spec
}

export function nameParam(value) {
  if (typeof value !== 'string' || !value || value.length > 214 || value.includes('\0')) throw invalidParams('pluginName is required')
  return value
}

export function requestIdParam(value) {
  if (value === undefined || value === null) return randomUUID()
  if (typeof value !== 'string' || !REQUEST_ID.test(value)) throw invalidParams('requestId must be 1–64 letters, digits, dashes or underscores')
  return value
}

/** Package names the user approved to run build scripts (the "allow and retry" answer to pendingBuilds). */
export function approvedBuildsParam(value) {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.length > 200 || value.some((name) => typeof name !== 'string' || !name || name.length > 214)) throw invalidParams('approvedBuilds must be package names')
  return [...new Set(value)]
}

export function registryParam(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string' || !/^https?:\/\//u.test(value)) throw invalidParams('registry must be an http(s) URL')
  return value
}

/** install-log chunk → its notification params (bounded; only chunks of a request). */
export function installLogParams(chunk) {
  if (typeof chunk?.requestId !== 'string' || typeof chunk.text !== 'string') return null
  return {
    requestId: chunk.requestId,
    stream: chunk.stream === 'stderr' ? 'stderr' : 'stdout',
    text: chunk.text.length > MAX_LOG_CHUNK ? chunk.text.slice(-MAX_LOG_CHUNK) : chunk.text,
    ...(chunk.exitCode !== undefined ? { exitCode: chunk.exitCode } : {}),
  }
}

/**
 * Serve one management method. `manager` is ctx.get('pluginManager') at call time.
 * @returns {Promise<object>}
 */
export async function pluginRequest(method, params, manager) {
  switch (method) {
    case 'codeDesktop/plugin/inspect':
      return requireManager(manager).inspect(specParam(params?.spec), { ...(params?.registry !== undefined ? { registry: registryParam(params.registry) } : {}) })
    case 'codeDesktop/plugin/install': {
      const spec = specParam(params?.spec)
      const requestId = requestIdParam(params?.requestId)
      const approvedBuilds = approvedBuildsParam(params?.approvedBuilds)
      const registry = registryParam(params?.registry)
      const result = await requireManager(manager).installBundle(spec, {
        requestId, ...(approvedBuilds ? { approvedBuilds } : {}), ...(registry !== undefined ? { registry } : {}),
      })
      return { ...result, requestId }
    }
    case 'codeDesktop/plugin/cancelInstall': {
      const requestId = params?.requestId
      if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw invalidParams('requestId is required')
      return requireManager(manager).cancelInstall(requestId)
    }
    case 'codeDesktop/plugin/setEnabled': {
      if (typeof params?.enabled !== 'boolean') throw invalidParams('enabled must be true or false')
      const name = nameParam(params?.pluginName)
      // A bundle that can't work in OpenClaude Desktop (catalog.js UNAVAILABLE_BUNDLES) is never turned on from here: Agent
      // Team would take the sub-agents away, Schedule would never start. Turning one off still works.
      if (params.enabled && Object.hasOwn(UNAVAILABLE_BUNDLES, name)) throw new RpcError(-32600, 'This plugin can’t run in OpenClaude Desktop, so it stays off.')
      return requireManager(manager).setBundleEnabled(name, params.enabled)
    }
    case 'codeDesktop/plugin/remove':
      return requireManager(manager).removeBundle(nameParam(params?.pluginName))
    case 'codeDesktop/plugin/registries':
      // The install form's source picker: {registry, fallbackRegistries, resolved}.
      return requireManager(manager).registries()
    default:
      return undefined
  }
}

export const PLUGIN_METHODS = new Set(['codeDesktop/plugin/inspect', 'codeDesktop/plugin/install', 'codeDesktop/plugin/cancelInstall', 'codeDesktop/plugin/setEnabled', 'codeDesktop/plugin/remove', 'codeDesktop/plugin/registries'])
