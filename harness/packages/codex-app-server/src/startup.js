/**
 * OpenClaude Desktop core command line and stdin lifetime. A successful parse
 * publishes `codeDesktopStartup`; the app-server row waits for that service,
 * so `--help` never claims stdio.
 */
import { Command } from 'commander'
import { exitOnStdinEnd, parseCmdline } from '@deepseek-ai/dsh-cmdline'
import { installUserCommandEnv } from './subprocess-env.js'

export const name = 'code-desktop-startup'
export const inject = ['cmdlineArgs']
export const STARTUP_SERVICE = 'codeDesktopStartup'

export function apply(ctx) {
  // A core on Electron as Node (Windows without Node): user commands don't inherit ELECTRON_RUN_AS_NODE (subprocess-env.js).
  installUserCommandEnv(ctx)
  const program = new Command()
    .name('codex-app-server')
    .description('Serve OpenClaude Desktop over the Codex app-server protocol (stdio), backed by DeepSeek Harness.')
    .helpOption('-h, --help', 'show this help')
    .allowUnknownOption()
    .allowExcessArguments()
  program.action(() => {
    exitOnStdinEnd(ctx, 'code-desktop.stdin')
    ctx.provide(STARTUP_SERVICE, { accepted: true })
  })
  parseCmdline(ctx, program)
}
