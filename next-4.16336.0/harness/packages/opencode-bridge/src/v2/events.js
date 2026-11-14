/**
 * OpenCode 2.x's /api/event envelopes → the bridge's internal events (pure; no state but SeqFilter's):
 *
 *   envelope   {id, created, metadata?, type, location?: {directory, workspaceID?}, durable?: {aggregateID, seq,
 *              version}, data}
 *   internal   {id, type, created, metadata?, sessionID, directory, durable, data, kind}
 *
 * Session events are routed by data.sessionID: v2 resolves their location through a side table and does not write it
 * back, so `location` may be missing. Forms carry theirs in data.form.sessionID (or data.sessionID), where "global"
 * means none. `kind` sorts events for Bridge.onEventV2: 'session' (a session's own stream), 'ask' (permission.* /
 * form.*), 'catalog' (refetch a list), 'connected', 'ignored'.
 */

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/** Catalog events: refetch the matching list (for event.location, or everywhere when it has none). */
export const CATALOG_EVENTS = Object.freeze({
  'credential.updated': 'account',
  'credential.switched': 'account',
  'integration.updated': 'account',
  'provider.updated': 'account',
  'model.updated': 'models',
  'models-dev.refreshed': 'models',
  'agent.updated': 'agents',
  'plugin.updated': 'plugins',
  'command.updated': 'commands',
  'config.updated': 'config',
  'skill.updated': 'skills',
  'reference.updated': 'references',
  'websearch.updated': 'config',
  'mcp.status.changed': 'mcp',
  'mcp.resources.changed': 'mcp',
  'location.shutdown': 'location',
})

// Nothing here reads them: the TUI's, terminals', the installer's, plugin RPC events, and the two session events v2
// defines but never publishes (session.status, session.idle).
const IGNORED_PREFIXES = ['installation.', 'tui.', 'rpc.', 'pty.', 'persistent-pty.', 'shell.']
const IGNORED_TYPES = new Set(['filesystem.changed', 'vcs.branch.updated', 'project.updated', 'worktree.updated', 'worktree.resolved', 'artifact.updated', 'session.status', 'session.idle'])

/** The session an event belongs to, or null ("global" forms belong to none). */
export function eventSessionID(type, data) {
  if (!isRecord(data)) return null
  const id = type === 'form.created' ? data.form?.sessionID ?? data.sessionID : data.sessionID
  return typeof id === 'string' && id && id !== 'global' ? id : null
}

/** One envelope → an internal event, or null for anything that is not an event. */
export function normalizeEvent(envelope) {
  if (!isRecord(envelope) || typeof envelope.type !== 'string' || !envelope.type) return null
  const type = envelope.type
  const data = isRecord(envelope.data) ? envelope.data : {}
  const durable = isRecord(envelope.durable) && typeof envelope.durable.aggregateID === 'string' && Number.isInteger(envelope.durable.seq)
    ? { aggregateID: envelope.durable.aggregateID, seq: envelope.durable.seq, version: envelope.durable.version ?? 1 }
    : null
  const directory = typeof envelope.location?.directory === 'string' ? envelope.location.directory
    : type === 'session.created' && typeof data.location?.directory === 'string' ? data.location.directory : null
  const sessionID = eventSessionID(type, data)
  const kind = type === 'server.connected' ? 'connected'
    : IGNORED_TYPES.has(type) || IGNORED_PREFIXES.some((prefix) => type.startsWith(prefix)) ? 'ignored'
      : Object.hasOwn(CATALOG_EVENTS, type) ? 'catalog'
        : type.startsWith('permission.') || type.startsWith('form.') ? 'ask'
          : type.startsWith('session.') && sessionID ? 'session'
            : 'ignored'
  return {
    id: typeof envelope.id === 'string' ? envelope.id : null,
    type,
    created: Number.isFinite(envelope.created) ? envelope.created : null,
    // What v2 stores on the messages it projects from the event (LiveAdapterV2 does the same).
    ...(isRecord(envelope.metadata) ? { metadata: envelope.metadata } : {}),
    sessionID,
    directory,
    durable,
    data,
    kind,
  }
}

/**
 * Drops durable events already applied: per aggregate (a session), the highest seq seen. Used when events buffered
 * during a REST resync are replayed over what the resync loaded; ephemeral events always pass.
 */
export class SeqFilter {
  constructor() { this.seen = new Map() }

  accept(event) {
    if (!event?.durable) return true
    const last = this.seen.get(event.durable.aggregateID)
    if (last !== undefined && event.durable.seq <= last) return false
    this.seen.set(event.durable.aggregateID, event.durable.seq)
    return true
  }

  /** Mark an aggregate as loaded up to seq (a resync read it). */
  advance(aggregateID, seq) {
    if (!Number.isInteger(seq)) return
    const last = this.seen.get(aggregateID)
    if (last === undefined || seq > last) this.seen.set(aggregateID, seq)
  }

  forget(aggregateID) { this.seen.delete(aggregateID) }
}
