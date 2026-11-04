#!/usr/bin/env node
// A stand-in for `opencode` 2.x's `serve --stdio` (for opencode-bridge-v2-live.test.mjs, run under node): prints
// `opencode v2.2.5` for --version; for serve, records its argv and the env the bridge sets (FAKE_OPENCODE_V2_RECORD),
// prints the {"url"} ready line and lives until stdin ends, as v2's lease does. FAKE_OPENCODE_V2_FAIL=1: dies with a
// message on stderr before the ready line. It listens on nothing: the test's fetch is the in-process v2 fake.
import fs from 'node:fs'

const args = process.argv.slice(2)
if (args.includes('--version')) { process.stdout.write('opencode v2.2.5\n'); process.exit(0) }
if (process.env.FAKE_OPENCODE_V2_RECORD) {
  const keys = ['OPENCODE_PASSWORD', 'OPENCODE_SERVER_PASSWORD', 'OPENCODE_DB', 'OPENCODE_DISABLE_AUTOUPDATE', 'OPENCODE_CLIENT', 'OPENCODE_SERVER_USERNAME', 'OPENCODE_CONFIG_DIR']
  fs.writeFileSync(process.env.FAKE_OPENCODE_V2_RECORD, JSON.stringify({ args, cwd: process.cwd(), env: Object.fromEntries(keys.filter((key) => key in process.env).map((key) => [key, process.env[key]])) }))
}
if (process.env.FAKE_OPENCODE_V2_FAIL === '1') { process.stderr.write('Error: fake serve failed to boot\n'); process.exit(3) }
process.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n')
process.stdin.on('end', () => process.exit(0))
process.stdin.on('close', () => process.exit(0))
process.stdin.resume()
