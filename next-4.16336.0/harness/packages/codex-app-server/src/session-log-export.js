// The whole session log for /export (codeDesktop/sessionLog/export): the official client's ZIP of the session, its
// sub-agent sessions and their attachments (dsh-session-log-export streamSessionLogZip), written to a path the app's
// save dialog chose. Written to a temporary file beside it first, so a failed export never leaves a partial .zip.
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { RpcError } from './transport.js'

let exporter = null
async function loadExporter() {
  exporter ??= import('@deepseek-ai/dsh-session-log-export').catch(() => null)
  return exporter
}

/** Whether the runtime has the services the export reads (session query, persistence, attachments). */
export function sessionLogExportReady(ctx) {
  return Boolean(ctx.get('sessionQuery') && ctx.get('sessionPersistence') && ctx.get('attachments'))
}

export async function exportSessionLog(ctx, sessionId, target) {
  const module = await loadExporter()
  if (!module || !sessionLogExportReady(ctx)) throw new RpcError(-32601, 'This core can’t export session logs.')
  const deps = module.sessionLogExportDeps(ctx)
  const controller = new AbortController()
  await module.flushLiveSessionLog(deps, sessionId, controller.signal)
  const root = await module.readSessionLogText(deps.sessionPersistence, sessionId, controller.signal)
  if (root === undefined) throw new RpcError(-32600, 'This session has no stored log yet.')
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.partial`)
  try {
    const stream = module.streamSessionLogZip({ sessionQuery: deps.sessionQuery, sessionPersistence: deps.sessionPersistence, attachments: deps.attachments, sessions: deps.sessions },
      root, sessionId, true, module.DEFAULT_SESSION_LOG_COMPRESSION_LEVEL ?? 6, controller.signal)
    await pipeline(Readable.fromWeb(stream), fs.createWriteStream(temp, { mode: 0o600 }))
    fs.renameSync(temp, target)
  } catch (error) {
    controller.abort()
    try { fs.rmSync(temp, { force: true }) } catch {}
    throw error instanceof RpcError ? error : new RpcError(-32000, `The session log couldn’t be exported: ${error?.message ?? error}`)
  }
  return { path: target, bytes: fs.statSync(target).size, filename: module.sessionLogZipFilename(sessionId) }
}
