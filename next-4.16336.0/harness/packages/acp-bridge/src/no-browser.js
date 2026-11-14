// A folder holding a no-op `open` (and `xdg-open`), for agent CLI commands that open the default browser on their own
// (`kimi login` opens the device page; `mcode logout` opens MiniMax's sign-out page): put first on PATH, it keeps
// OpenClaude Desktop the only opener, so the user sees one tab or none instead of a surprise window. Made once per process;
// null if it can't be made (the command then opens the browser as it would anyway).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let shim
export function noBrowserShim() {
  if (shim !== undefined) return shim
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-desktop-no-browser-'))
    for (const name of ['open', 'xdg-open']) fs.writeFileSync(path.join(dir, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    shim = dir
  } catch { shim = null }
  return shim
}

/** env with the no-op opener first on PATH (unchanged when the shim can't be made). */
export function withoutBrowser(env) {
  const dir = noBrowserShim()
  return dir ? { ...env, PATH: [dir, env.PATH || process.env.PATH || ''].filter(Boolean).join(path.delimiter) } : env
}
