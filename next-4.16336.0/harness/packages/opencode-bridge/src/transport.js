// Copied from harness/packages/codex-app-server/src/transport.js so this bridge stays self-contained (Extension Pack).
/**
 * Newline-delimited JSON-RPC over a byte stream pair, the framing the Codex
 * app-server uses on `--stdio`. Each line is one message; requests carry
 * `id` + `method`, notifications only `method`, responses only `id`.
 * Codex omits the `"jsonrpc"` field, and so does this transport.
 */

import readline from 'node:readline'

export class RpcError extends Error {
  /**
   * @param {number} code - JSON-RPC error code.
   * @param {string} message - human-readable message shown by the client.
   * @param {unknown} [data] - optional structured payload.
   */
  constructor(code, message, data) {
    super(message)
    this.code = code
    this.data = data
  }
}

export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603

export const invalidParams = (message) => new RpcError(INVALID_PARAMS, message)

export class LineTransport {
  /**
   * @param {NodeJS.ReadableStream} input
   * @param {NodeJS.WritableStream} output
   * @param {{ onRequest: (method: string, params: any, id: string | number) => Promise<unknown>, onNotification?: (method: string, params: any) => void, onClose?: () => void, log?: (message: string) => void }} handlers
   */
  constructor(input, output, handlers) {
    this.input = input
    this.output = output
    this.handlers = handlers
    this.seq = 0
    this.pending = new Map()
    this.closed = false
    this.reader = null
  }

  start() {
    this.reader = readline.createInterface({ input: this.input, crlfDelay: Infinity })
    this.reader.on('line', (line) => this.receive(line))
    this.reader.on('close', () => this.close())
  }

  receive(line) {
    if (!line.trim()) return
    let message
    try {
      message = JSON.parse(line)
    } catch {
      this.handlers.log?.(`opencode-bridge: ignoring malformed line (${line.length} bytes)`)
      return
    }
    if (message === null || typeof message !== 'object') return
    if (typeof message.method === 'string' && message.id !== undefined) {
      void this.dispatch(message)
      return
    }
    if (typeof message.method === 'string') {
      try {
        this.handlers.onNotification?.(message.method, message.params ?? {})
      } catch (error) {
        this.handlers.log?.(`opencode-bridge: notification ${message.method} failed: ${error?.stack || error}`)
      }
      return
    }
    if (message.id !== undefined) {
      const pending = this.pending.get(String(message.id))
      if (!pending) return
      this.pending.delete(String(message.id))
      if (message.error) pending.reject(new RpcError(message.error.code ?? INTERNAL_ERROR, message.error.message ?? 'Request failed.', message.error.data))
      else pending.resolve(message.result)
    }
  }

  async dispatch(message) {
    try {
      const result = await this.handlers.onRequest(message.method, message.params ?? {}, message.id)
      this.write({ id: message.id, result: result ?? {} })
    } catch (error) {
      const code = error instanceof RpcError ? error.code : INTERNAL_ERROR
      if (!(error instanceof RpcError)) this.handlers.log?.(`opencode-bridge: ${message.method} failed: ${error?.stack || error}`)
      this.write({ id: message.id, error: { code, message: error?.message || String(error), ...(error?.data === undefined ? {} : { data: error.data }) } })
    }
  }

  write(message) {
    if (this.closed) return
    try {
      this.output.write(JSON.stringify(message) + '\n')
    } catch (error) {
      this.handlers.log?.(`opencode-bridge: write failed: ${error?.message || error}`)
    }
  }

  notify(method, params) {
    this.write({ method, params })
  }

  /**
   * Server → client request (approvals, user input). Resolves with the
   * client's result; rejects when the transport closes first.
   * @returns {{ id: number, promise: Promise<any> }}
   */
  request(method, params) {
    const id = ++this.seq
    const promise = new Promise((resolve, reject) => {
      this.pending.set(String(id), { resolve, reject })
    })
    this.write({ id, method, params })
    return { id, promise }
  }

  /** Forget a server request the server itself settled (e.g. turn interrupted). */
  abandon(id, reason = 'cancelled') {
    const pending = this.pending.get(String(id))
    if (!pending) return false
    this.pending.delete(String(id))
    pending.reject(new RpcError(INTERNAL_ERROR, reason))
    return true
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.reader?.close()
    for (const [id, pending] of this.pending) {
      this.pending.delete(id)
      pending.reject(new RpcError(INTERNAL_ERROR, 'Client disconnected.'))
    }
    this.handlers.onClose?.()
  }
}
