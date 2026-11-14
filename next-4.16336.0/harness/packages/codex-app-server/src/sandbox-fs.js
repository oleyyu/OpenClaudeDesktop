// OpenClaude Desktop's file boundary. The shared DSH Purge runtime stays untouched;
// this profile owns the enforcement promised by thread/start's sandbox value.
import SandboxedFileSystem from '@deepseek-ai/dsh-fs-sandbox'
import { FsError } from '@deepseek-ai/dsh-fs'
import { writableRoots } from '@deepseek-ai/dsh-sandbox'
import { withinRoots } from './approval.js'

export default class CodeDesktopFileSystem extends SandboxedFileSystem {
  async checkedTarget(target, sandboxPolicy) {
    const policy = sandboxPolicy ?? this.ctx.sandboxPolicy.resolve()
    if (policy.mode === 'danger-full-access') return target
    if (policy.mode === 'workspace-write') {
      // Resolve again at the mutation boundary; an old read or a symlink is
      // not permission to write the path it used to name.
      const fresh = await this.resolve(target.displayPath)
      if (withinRoots(fresh.targetKey, writableRoots(policy))) return fresh
    }
    throw new FsError(`cannot write "${target.displayPath}": file access denied under ${policy.mode} mode`, 'FS_SANDBOX_DENIED')
  }
}
