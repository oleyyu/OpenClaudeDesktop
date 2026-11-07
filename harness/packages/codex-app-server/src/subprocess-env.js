// ELECTRON_RUN_AS_NODE stays out of the user's commands. On Windows without an installed Node the app runs this core on
// its own Electron as Node (app/electron/setup-requirements.cjs bundledNode, codex.cjs sets ELECTRON_RUN_AS_NODE=1), so
// the variable is in this process's environment, and every child the Harness subprocess service spawns inherits it
// (dsh-subprocess scrubbedParentEnv keeps it): a user's `electron .` (or any Electron app the agent starts) would run
// as plain Node.
//
// The Harness has no per-spawn environment hook, but its spawn spec does: an explicit `undefined` entry in spec.env
// removes an inherited variable from the target (dsh-subprocess-local childEnv / targetEnvironment). So the
// subprocess service's spawn and spawnTerminal get that tombstone for every program that is not this same Electron
// executable. What keeps the variable:
//   - a spawn of process.execPath itself (dsh-ptc-runtime-node's runner, which keeps it on purpose, any node runner);
//   - the subprocess service's own Windows runner (launchWindowsJob): it is spawned with runnerEnvironment(), not the
//     spec's env, and only the target it starts gets the tombstoned env;
//   - a spec that names ELECTRON_RUN_AS_NODE itself.
// Not covered (the spawn is not the subprocess service's): stdio MCP servers (dsh-mcp-client hands
// scrubbedParentEnv() to the MCP SDK's own spawn). Those would need dsh-mcp-client's buildChildEnv to drop it; OpenClaude
// Desktop's own code_desktop server names the variable in its config env, so it would keep working.
// Nothing happens when this process is not Electron (every macOS core, a Windows core on a real node.exe).
import { symbols } from '@deepseek-ai/cordis'

const NAME = 'ELECTRON_RUN_AS_NODE'

const sameFile = (a, b, platform) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  return platform === 'win32' ? a.replaceAll('/', '\\').toLowerCase() === b.replaceAll('/', '\\').toLowerCase() : a === b
}

/** Whether a spawn spec should lose ELECTRON_RUN_AS_NODE: it runs some other program and does not set the name itself. */
export function dropsRunAsNode(spec, { execPath = process.execPath, platform = process.platform } = {}) {
  const program = Array.isArray(spec?.argv) ? spec.argv[0] : undefined
  if (sameFile(program, execPath, platform)) return false
  return !Object.keys(spec?.env ?? {}).some((key) => key.toUpperCase() === NAME)
}

/** The spec with the tombstone, or the spec itself when it keeps the variable. */
export function userCommandSpec(spec, deps = {}) {
  if (!spec || typeof spec !== 'object' || !dropsRunAsNode(spec, deps)) return spec
  return { ...spec, env: { ...(spec.env ?? {}), [NAME]: undefined } }
}

/** Whether this process runs on Electron as Node, with the variable set (the only case anything changes). */
export const runsOnElectron = (env = process.env, versions = process.versions) => Boolean(versions.electron) && Object.keys(env).some((key) => key.toUpperCase() === NAME && env[key])

/**
 * Wrap one subprocess service instance's spawn / spawnTerminal; returns the undo. The instance is the raw service (the
 * cordis proxy's target), so every caller in this process, whatever context it holds, gets the wrapped methods.
 */
export function wrapSubprocessService(service, deps = {}) {
  const raw = service?.[symbols.original] ?? service
  if (!raw || typeof raw.spawn !== 'function') return () => {}
  const owned = []
  for (const method of ['spawn', 'spawnTerminal']) {
    const original = raw[method]
    if (typeof original !== 'function') continue
    const hadOwn = Object.hasOwn(raw, method)
    raw[method] = function (spec, ...rest) { return original.call(this, userCommandSpec(spec, deps), ...rest) }
    owned.push(() => { if (hadOwn) raw[method] = original; else delete raw[method] })
  }
  return () => { for (const undo of owned.reverse()) undo() }
}

/** Install on the context's subprocess service while this process runs on Electron as Node. */
export function installUserCommandEnv(ctx, { env = process.env, versions = process.versions } = {}) {
  if (!runsOnElectron(env, versions)) return
  ctx.inject(['subprocess'], (inner) => {
    const undo = wrapSubprocessService(inner.get('subprocess'))
    inner.effect?.(() => undo)
  })
}
