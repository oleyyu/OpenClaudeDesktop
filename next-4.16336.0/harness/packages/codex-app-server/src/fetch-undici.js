// One undici for fetch and its dispatcher. The Harness's own packages import the undici package (dsh-http-proxy installs
// its ProxyAgent / Agent as the global dispatcher, ^8.10), and loading it registers that dispatcher for Node's built-in
// fetch too. When Node bundles a different undici (Node 26.0: 8.0.2), the built-in fetch reads that dispatcher's
// responses with no headers: no content-encoding, so a compressed event stream reaches the Messages parser undecoded,
// and the events it can't find (content_block_start, the tool's name) become `unknown` tool calls. The package's own
// fetch, Headers, Request, Response and FormData always match its dispatcher. Imported first by bin/codex-app-server.mjs.
import * as undici from 'undici'

if (typeof undici.fetch === 'function') {
  globalThis.fetch = undici.fetch
  for (const name of ['Headers', 'Request', 'Response', 'FormData']) if (undici[name]) globalThis[name] = undici[name]
}
