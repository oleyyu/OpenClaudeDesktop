#!/usr/bin/env node
/**
 * OpenClaude Desktop core entry: a Codex app-server compatible JSON-RPC endpoint on
 * stdio, backed by a DeepSeek Harness runtime. OpenClaude Desktop spawns this as
 * `<binary> app-server --stdio`, exactly as it spawned the Codex CLI.
 *
 * Credentials, sessions and settings come from the user's Harness home
 * ($DSH_HOME, default ~/.dsh), so a DeepSeek API key configured in DeepSeek
 * Harness works here unchanged. The profile lives there too
 * (<DSH_HOME>/code-desktop/profile, seeded from ./profile: profile.mjs), so the
 * plugins a user installs are theirs, not this checkout's.
 */
// First: fetch from the same undici as the global dispatcher (fetch-undici.js).
import '../packages/codex-app-server/src/fetch-undici.js'
// Diagnostic only, first so it wraps fetch before any client captures it: OPENCLAUDE_SSE_TRACE=<file> records the
// event skeleton of each streamed Messages response (sse-trace.js).
import '../packages/codex-app-server/src/sse-trace.js'
import { existsSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLayeredEnv, loadProfileDirectory, StartupError } from '@deepseek-ai/dsh-app-boot'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { packageManager, prepareProfile } from './profile.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const installAnchor = join(root, 'package.json')
const templateDir = join(root, 'profile')

// Codex CLI compatibility: `app-server` selects the server and `--stdio` its
// transport; both are implied here. Remaining arguments reach the app plugin.
const args = process.argv.slice(2).filter((arg) => arg !== 'app-server' && arg !== '--stdio')
if (args.includes('--version') || args.includes('-V')) {
  const { default: pkg } = await import('../package.json', { with: { type: 'json' } })
  process.stdout.write(`code-desktop-deepseek-core ${pkg.version ?? '0.0.0'}\n`)
  process.exit(0)
}

// Overlays after the app-owned profile (Settings › Harness): OpenClaude Desktop sets
// CODE_DESKTOP_CORE_PATCHES to <userData>/harness/overlay.patch.yml and
// user.patch.yml, joined with the path delimiter. CODE_DESKTOP_CORE_SAFE_MODE=1
// skips them all, so a broken overlay can never lock the core out.
const listedPatches = (process.env.CODE_DESKTOP_CORE_PATCHES || '').split(delimiter).filter(Boolean)
const patchFiles = process.env.CODE_DESKTOP_CORE_SAFE_MODE === '1'
  ? []
  : [...new Set(listedPatches.filter((file) => isAbsolute(file) && existsSync(file)))]
if (listedPatches.length > 0)
  process.stderr.write(process.env.CODE_DESKTOP_CORE_SAFE_MODE === '1'
    ? `code-desktop-core: safe mode, profile overlays skipped: ${listedPatches.join(', ')}\n`
    : `code-desktop-core: profile overlays applied: ${patchFiles.length ? patchFiles.join(', ') : '(none found)'}\n`)

try {
  const profileDir = prepareProfile(process.env.CODE_DESKTOP_PROFILE_DIR || join(resolveDshHome(), 'code-desktop', 'profile'), templateDir)
  const profile = loadProfileDirectory('code-desktop-core', profileDir, installAnchor)
  if (profile.skippedBundles.length > 0)
    throw new Error(`code-desktop-core: profile bundles failed to load: ${profile.skippedBundles.map((b) => `${b.packageName}: ${b.reason}`).join('; ')}`)
  await runProfile({
    environment: loadLayeredEnv('dsh'),
    profile: 'code-desktop',
    patchFiles,
    args,
    resolvedProfile: { profile, installAnchor },
    // Customize › Plugins installs run this pnpm (dsh-plugin-manager reads the launcher fact).
    ...(packageManager(root) ? { packageManager: packageManager(root) } : {}),
  })
} catch (error) {
  process.stderr.write(`${error instanceof StartupError ? error.message : error?.stack || error}\n`)
  process.exit(1)
}
