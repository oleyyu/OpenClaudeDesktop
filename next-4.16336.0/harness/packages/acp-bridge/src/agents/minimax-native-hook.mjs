// Preloaded into MiniMax Code's Node process (NODE_OPTIONS=--import) when its release has no
// node_modules: the native modules npm would have installed (better-sqlite3, @vscode/ripgrep)
// resolve from the bridge's own copy in CODE_DESKTOP_MCODE_NATIVE instead. Nothing else changes.
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = process.env.CODE_DESKTOP_MCODE_NATIVE
if (dir && typeof registerHooks === 'function') {
  const parentURL = pathToFileURL(path.join(dir, 'package.json')).href
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'better-sqlite3' || specifier.startsWith('better-sqlite3/') || specifier === '@vscode/ripgrep' || specifier.startsWith('@vscode/ripgrep/')) {
        return next(specifier, { ...context, parentURL })
      }
      return next(specifier, context)
    },
  })
}
