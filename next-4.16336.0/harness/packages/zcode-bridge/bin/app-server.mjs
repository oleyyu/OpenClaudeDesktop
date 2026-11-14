#!/usr/bin/env node
/**
 * OpenClaude Desktop core entry for ZCode: `node app-server.mjs app-server --stdio` serves the Codex app-server
 * protocol on stdio and drives the official ZCode agent (`zcode app-server --stdio`) behind it.
 * `--version` prints the bridge version.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2).filter((arg) => arg !== 'app-server' && arg !== '--stdio')
if (args.includes('--version') || args.includes('-V')) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  process.stdout.write(`code-desktop-zcode-bridge ${pkg.version}\n`)
  process.exit(0)
}
const { main } = await import('../src/server.js')
await main()
