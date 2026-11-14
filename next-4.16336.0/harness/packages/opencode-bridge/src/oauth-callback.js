/**
 * The browser redirect of an MCP server's OAuth sign-in, received by the bridge.
 *
 * The agent's own flow cannot serve a client that opens the page itself: POST /mcp/:name/auth
 * only starts it (the authorization URL and its state), and the agent's callback server
 * (127.0.0.1:19876/mcp/oauth/callback, or the server's oauth.redirectUri / callbackPort)
 * rejects every state its blocking /auth/authenticate route did not register. So the bridge
 * listens on that callback address first (the agent then leaves it alone: it skips a port in
 * use), checks the state the start returned, and completes the sign-in with
 * POST /mcp/:name/auth/callback {code}.
 */
import http from 'node:http'

export const DEFAULT_CALLBACK = Object.freeze({ port: 19876, path: '/mcp/oauth/callback' })
const TIMEOUT_MS = 10 * 60000

/** The callback address the agent puts in a server's authorization URL (its config `oauth`). */
export function callbackOf(config) {
  const oauth = config && typeof config.oauth === 'object' && config.oauth ? config.oauth : {}
  if (typeof oauth.redirectUri === 'string' && oauth.redirectUri) {
    try {
      const url = new URL(oauth.redirectUri)
      const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80
      return { port, path: url.pathname || DEFAULT_CALLBACK.path, host: url.hostname === '[::1]' || url.hostname === '::1' ? '::1' : '127.0.0.1' }
    } catch { return { ...DEFAULT_CALLBACK, host: '127.0.0.1' } }
  }
  const port = Number.isInteger(oauth.callbackPort) && oauth.callbackPort > 0 ? oauth.callbackPort : DEFAULT_CALLBACK.port
  return { port, path: DEFAULT_CALLBACK.path, host: '127.0.0.1' }
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The small page the browser shows after the redirect (light and dark). */
export function resultPage(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
<style>:root{color-scheme:light dark;--bg:#faf9f7;--fg:#1f1e1d;--muted:#6b6966}@media (prefers-color-scheme:dark){:root{--bg:#1f1e1d;--fg:#f0eee9;--muted:#a5a29c}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:28rem;padding:2rem 1rem;text-align:center}h1{font-size:1.25rem;font-weight:600;margin:0 0 .5rem}p{margin:0;color:var(--muted)}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body></html>`
}

export class OAuthCallbacks {
  /** @param {{ log?: (line: string) => void, timeoutMs?: number }} [options] */
  constructor({ log = () => {}, timeoutMs = TIMEOUT_MS } = {}) {
    this.log = log
    this.timeoutMs = timeoutMs
    /** @type {Map<number, {server: http.Server, ready: Promise<void>}>} */
    this.listeners = new Map()
    /** @type {Map<string, object>} state → pending sign-in */
    this.pending = new Map()
  }

  /**
   * Listen on a callback address before the agent starts the flow there.
   * Rejects with code EADDRINUSE when another program holds the port.
   */
  async listen({ port, host = '127.0.0.1' }) {
    const existing = this.listeners.get(port)
    if (existing) return existing.ready
    const server = http.createServer((req, res) => void this.onRequest(port, req, res))
    const ready = new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, () => { server.off('error', reject); resolve() })
    })
    const entry = { server, ready }
    this.listeners.set(port, entry)
    ready.catch(() => { if (this.listeners.get(port) === entry) this.listeners.delete(port) })
    return ready
  }

  /**
   * Wait for the redirect of one started sign-in.
   * @param {{ port: number, path: string, state: string | null, name: string, complete: (code: string) => Promise<{ success: boolean, error?: string | null }>, done: (result: { success: boolean, error: string | null }) => void }} entry
   */
  expect(entry) {
    // A new sign-in for the same server replaces the earlier one (the agent keeps one flow per server).
    const replaced = new Set()
    for (const [state, other] of this.pending) if (other.name === entry.name) { this.drop(state, { release: false }); replaced.add(other.port) }
    const key = entry.state ?? `server:${entry.name}`
    const timer = setTimeout(() => {
      if (this.pending.get(key) !== pending) return
      this.drop(key)
      entry.done({ success: false, error: 'Sign-in timed out.' })
    }, this.timeoutMs)
    timer.unref?.()
    const pending = { ...entry, key, timer }
    this.pending.set(key, pending)
    for (const port of replaced) this.release(port)
  }

  /** Forget a pending sign-in; close a listener nobody waits on (unless it is still answering). */
  drop(key, { release = true } = {}) {
    const pending = this.pending.get(key)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending.delete(key)
    if (release) this.release(pending.port)
  }

  /** Close the listener on a port when no sign-in waits there. */
  release(port) {
    if ([...this.pending.values()].some((entry) => entry.port === port)) return
    const listener = this.listeners.get(port)
    if (!listener) return
    this.listeners.delete(port)
    listener.server.close()
    listener.server.closeAllConnections?.()
  }

  find(port, path, state) {
    if (state && this.pending.has(state)) {
      const entry = this.pending.get(state)
      return entry.port === port && entry.path === path ? entry : null
    }
    // A flow whose start did not report its state: the only one waiting on this address.
    const loose = [...this.pending.values()].filter((entry) => entry.state === null && entry.port === port && entry.path === path)
    return loose.length === 1 ? loose[0] : null
  }

  async onRequest(port, req, res) {
    let answered = false
    const send = (status, title, body) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', connection: 'close' })
      // The listener closes once the page is out and nothing else waits on it.
      res.end(resultPage(title, body), () => { if (answered) this.release(port) })
    }
    let url
    try { url = new URL(req.url ?? '/', 'http://127.0.0.1') } catch { return send(400, 'Sign-in failed', 'The sign-in answer could not be read.') }
    const known = [...this.pending.values()].some((entry) => entry.port === port && entry.path === url.pathname)
    if (req.method !== 'GET' || !known) return send(404, 'Not found', 'Nothing is waiting for a sign-in here.')
    const state = url.searchParams.get('state')
    const entry = this.find(port, url.pathname, state)
    if (!entry) return send(400, 'Sign-in expired', 'This sign-in link has expired. Start the sign-in again from OpenClaude Desktop.')
    const failure = url.searchParams.get('error_description') || url.searchParams.get('error')
    const code = url.searchParams.get('code')
    if (!failure && !code) return send(400, 'Sign-in failed', 'The sign-in page did not return an authorization code.')
    this.drop(entry.key, { release: false })
    answered = true
    if (failure) {
      entry.done({ success: false, error: failure })
      return send(200, 'Sign-in failed', failure)
    }
    let result
    try { result = await entry.complete(code) } catch (error) { result = { success: false, error: error?.message || String(error) } }
    entry.done({ success: result.success === true, error: result.success ? null : result.error || 'The sign-in did not complete.' })
    if (result.success) send(200, `Signed in to ${entry.name}`, 'You can close this tab and return to OpenClaude Desktop.')
    else send(200, 'Sign-in failed', result.error || 'The sign-in did not complete.')
  }

  close() {
    for (const pending of this.pending.values()) clearTimeout(pending.timer)
    this.pending.clear()
    for (const { server } of this.listeners.values()) { server.close(); server.closeAllConnections?.() }
    this.listeners.clear()
  }
}
