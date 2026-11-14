/**
 * Newline-delimited JSON-RPC over a byte stream pair. One class serves both
 * sides of the bridge:
 *   - the Codex app-server side on the bridge's own stdio (Codex omits the
 *     "jsonrpc" field, so `jsonrpc: false`);
 *   - the ACP side on the agent's stdio (ACP is strict JSON-RPC 2.0, so
 *     `jsonrpc: true`).
 * Requests carry `id` + `method`, notifications only `method`, responses only `id`.
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

export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603
export const SERVER_ERROR = -32000

export const invalidParams = (message, data) => new RpcError(INVALID_PARAMS, message, data)

export class LineTransport {
  /**
   * @param {NodeJS.ReadableStream} input
   * @param {NodeJS.WritableStream} output
   * @param {{ onRequest: (method: string, params: any, id: string | number) => Promise<unknown>, onNotification?: (method: string, params: any) => void, onClose?: () => void, log?: (message: string) => void, jsonrpc?: boolean, name?: string }} handlers
   */
  constructor(input, output, handlers) {
    this.input = input
    this.output = output
    this.handlers = handlers
    this.jsonrpc = handlers.jsonrpc === true
    this.name = handlers.name ?? 'acp-bridge'
    this.seq = 0
    this.pending = new Map()
    this.closed = false
    this.reader = null
  }

  start() {
    this.reader = readline.createInterface({ input: this.input, crlfDelay: Infinity })
    this.reader.on('line', (line) => this.receive(line))
    this.reader.on('close', () => this.close())
    this.output.on?.('error', () => this.close())
  }

  receive(line) {
    if (!line.trim()) return
    let message
    try {
      message = JSON.parse(line)
    } catch {
      this.handlers.log?.(`${this.name}: ignoring a non-JSON line (${line.length} bytes): ${line.slice(0, 200)}`)
      return
    }
    if (message === null || typeof message !== 'object') return
    if (typeof message.method === 'string' && message.id !== undefined && message.id !== null) {
      void this.dispatch(message)
      return
    }
    if (typeof message.method === 'string') {
      try {
        this.handlers.onNotification?.(message.method, message.params ?? {})
      } catch (error) {
        this.handlers.log?.(`${this.name}: notification ${message.method} failed: ${error?.stack || error}`)
      }
      return
    }
    if (message.id !== undefined) {
      const pending = this.pending.get(String(message.id))
      if (!pending) return
      this.pending.delete(String(message.id))
      clearTimeout(pending.timer)
      if (message.error) pending.reject(new RpcError(message.error.code ?? INTERNAL_ERROR, message.error.message ?? 'Request failed.', message.error.data))
      else pending.resolve(message.result)
    }
  }

  async dispatch(message) {
    try {
      const result = await this.handlers.onRequest(message.method, message.params ?? {}, message.id)
      this.write({ id: message.id, result: result ?? (this.jsonrpc ? null : {}) })
    } catch (error) {
      const code = error instanceof RpcError ? error.code : INTERNAL_ERROR
      if (!(error instanceof RpcError)) this.handlers.log?.(`${this.name}: ${message.method} failed: ${error?.stack || error}`)
      this.write({ id: message.id, error: { code, message: error?.message || String(error), ...(error?.data === undefined ? {} : { data: error.data }) } })
    }
  }

  write(message) {
    if (this.closed) return
    try {
      this.output.write(JSON.stringify(this.jsonrpc ? { jsonrpc: '2.0', ...message } : message) + '\n')
    } catch (error) {
      this.handlers.log?.(`${this.name}: write failed: ${error?.message || error}`)
    }
  }

  notify(method, params) {
    this.write({ method, params })
  }

  /**
   * Outgoing request. Resolves with the peer's result; rejects on its error,
   * on `timeoutMs`, or when the transport closes first.
   * @returns {{ id: number, promise: Promise<any> }}
   */
  request(method, params, timeoutMs = 0) {
    const id = ++this.seq
    const promise = new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new RpcError(INTERNAL_ERROR, `${this.name} is closed.`))
        return
      }
      const pending = { resolve, reject, timer: null }
      if (timeoutMs > 0) {
        pending.timer = setTimeout(() => {
          this.pending.delete(String(id))
          reject(new RpcError(INTERNAL_ERROR, `${method} timed out after ${Math.round(timeoutMs / 1000)}s.`))
        }, timeoutMs)
      }
      this.pending.set(String(id), pending)
    })
    this.write({ id, method, params })
    return { id, promise }
  }

  call(method, params, timeoutMs = 0) {
    return this.request(method, params, timeoutMs).promise
  }

  /** Forget a request the server itself settled (e.g. a turn interrupted). */
  abandon(id, reason = 'cancelled') {
    const pending = this.pending.get(String(id))
    if (!pending) return false
    this.pending.delete(String(id))
    clearTimeout(pending.timer)
    pending.reject(new RpcError(INTERNAL_ERROR, reason))
    return true
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.reader?.close()
    for (const [id, pending] of this.pending) {
      this.pending.delete(id)
      clearTimeout(pending.timer)
      pending.reject(new RpcError(INTERNAL_ERROR, 'Connection closed.'))
    }
    this.handlers.onClose?.()
  }
}
