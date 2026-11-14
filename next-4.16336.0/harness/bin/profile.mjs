/**
 * The core's dsh profile lives in the user's Harness home, like the DeepSeek
 * app's own desktop profile (~/.dsh/profiles/desktop): plugins installed from
 * Customize › Plugins are user data, kept across updates of this checkout and
 * never written into it.
 *
 *   <DSH_HOME>/code-desktop/profile   (CODE_DESKTOP_PROFILE_DIR overrides)
 *     package.json         dsh.profile.bundles + the plugins pnpm installed
 *     cordis.yml           the empty profile root
 *     cordis.patch.yml     local overrides (Settings › Edit config opens it)
 *     pnpm-workspace.yaml  the out-of-tree plugin settings dsh's own profiles use
 *
 * ./profile in this checkout is the template: a missing file is copied from
 * it, an existing one is never replaced. The template's bundles are the
 * core itself, so one missing from the user's list is put back at the front.
 * The bundles themselves resolve from this installation (the install anchor).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// dsh-app-boot PROFILE_PNPM_WORKSPACE: what `dsh plugin` profiles start with.
const PNPM_WORKSPACE = `packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
`

const bundlesOf = (manifest) => (Array.isArray(manifest?.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles.filter((name) => typeof name === 'string') : [])

/**
 * Create or repair the user's profile from the template.
 * @param {string} dir - the user's profile directory
 * @param {string} templateDir - this checkout's ./profile
 * @returns {string} dir
 */
export function prepareProfile(dir, templateDir) {
  mkdirSync(dir, { recursive: true })
  for (const file of ['package.json', 'cordis.yml', 'cordis.patch.yml']) {
    if (!existsSync(join(dir, file))) copyFileSync(join(templateDir, file), join(dir, file))
  }
  if (!existsSync(join(dir, 'pnpm-workspace.yaml'))) writeFileSync(join(dir, 'pnpm-workspace.yaml'), PNPM_WORKSPACE)
  const manifestPath = join(dir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const required = bundlesOf(JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf8')))
  const bundles = bundlesOf(manifest)
  const missing = required.filter((name) => !bundles.includes(name))
  if (missing.length > 0) {
    manifest.dsh = { ...manifest.dsh, profile: { ...manifest.dsh?.profile, bundles: [...missing, ...bundles] } }
    const temp = `${manifestPath}.${process.pid}.tmp`
    writeFileSync(temp, JSON.stringify(manifest, null, 2) + '\n')
    renameSync(temp, manifestPath)
  }
  return dir
}

/**
 * The pnpm plugin installs run: CODE_DESKTOP_PNPM, else the pnpm 11 this
 * installation ships (run by the core's own node), else `pnpm` on PATH.
 * @returns {{command: string, args?: string[], env?: Record<string, string>} | undefined} dsh's launcher packageManager fact
 */
export function packageManager(root, env = process.env) {
  if (env.CODE_DESKTOP_PNPM) return { command: env.CODE_DESKTOP_PNPM }
  const bundled = join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
  // NODE_NO_WARNINGS: Node's experimental-feature notices would land in the refusal and error text the page shows.
  return existsSync(bundled) ? { command: process.execPath, args: [bundled], env: { NODE_NO_WARNINGS: '1' } } : undefined
}
