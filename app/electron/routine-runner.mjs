import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { threadPermissionParams, turnPermissionParams } from './permission-policy.mjs';
import { surfaceInstructions } from './surface-policy.mjs';
import { tagRoutineLaunchError } from './routine-error-category.mjs';

export function captureRoutineOptions({ config, coreId, models, execution, previous }) {
  if (execution !== undefined && (!execution || typeof execution !== 'object' || Array.isArray(execution))) throw new Error('Choose valid execution settings.');
  if (previous && previous.coreId !== coreId) throw new Error(`Switch to ${previous.coreId} before changing this task’s execution settings.`);
  const chosenModel = execution?.model ?? previous?.model ?? config.model;
  const permission = execution?.permission ?? previous?.permission ?? config.permission ?? 'auto';
  if (!['auto', 'ask', 'acceptEdits', 'plan', 'bypass'].includes(permission)) throw new Error('Choose a valid permission mode.');
  const model = models.find(model => (model.model ?? model.id) === chosenModel)
    ?? (!chosenModel ? models.find(model => model.isDefault) ?? models[0] : null);
  if (!model) throw new Error('Choose an available model before creating a scheduled task.');
  return { coreId, model: model.model ?? model.id,
    effort: previous && previous.model === chosenModel ? previous.effort : model.defaultReasoningEffort ?? config.effort ?? null,
    permission, networkAccess: previous?.networkAccess ?? (config.sandboxNetworkAccess === true) };
}

// R4g-routines RT3 (research/r4-code-routines.md §5, §7, §10 WI-3): a Code task (kind 'code') runs as a Code session:
// mode/surface 'code' and the Code start's instructions (main.jsx sendMessage: none on a core with customization, else
// this line, the same as source-proposal-host.jsx CODE_DEVELOPER_INSTRUCTIONS).
export const CODE_ROUTINE_INSTRUCTIONS = 'You are the assistant in OpenClaude Desktop, a local desktop client. Follow the user language. When asked for a plan, use the plan tool. Do not claim to be Claude.';
export const routineKind = task => task?.kind === 'code' ? 'code' : 'cowork';

/**
 * 2.42304.0 asar index.chunk-BAdej_RQ.js createWorktree `Na(x)` ("Skipping worktree creation - … has no git root and no
 * .git entry"): a folder with no `.git` entry on the way up starts in place, without a worktree. The same walk as
 * main.cjs `workspace-info`'s inRepository.
 */
export function folderInRepository(cwd, { fs = nodeFs, path = nodePath } = {}) {
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return true;
    if (path.dirname(dir) === dir) return false;
  }
}

/** The Code task's folder still exists and is a folder; otherwise a cwd_not_found launch failure. */
async function checkFolder(cwd, fs) {
  let stat;
  try { stat = await fs.promises.stat(cwd); }
  catch (error) {
    // Only a missing folder is "not found"; any other failure (permissions, I/O) keeps its own message.
    throw tagRoutineLaunchError(error?.code === 'ENOENT' || error?.code === 'ENOTDIR'
      ? Object.assign(new Error(`Folder not found: ${cwd}`, { cause: error }), { code: error.code }) : error, { stage: 'folder' });
  }
  if (!stat.isDirectory()) throw tagRoutineLaunchError(Object.assign(new Error(`Folder not found: ${cwd}`), { code: 'ENOTDIR' }), { stage: 'folder' });
}

// rpc is the same validated main-process pipeline used by the interactive composer.
// Never switch cores or silently substitute a different model for a saved routine.
// Code tasks only (Cowork runs are unchanged): prepareWorktree is main.cjs's prepare-worktree (worktree-prepare.mjs
// with main's dependencies), setSessionMetadata(threadId, patch) writes the session's sessionMetadata, and
// turnErrorCategory (src/turn-error-model.mjs) classifies a core RPC failure; launch failures carry the official
// `[ccdErrorCategory:<cat>]` suffix (routine-error-category.mjs) when a host category fits.
export function createRoutineRunner({ context, rpc, prepareWorktree, setSessionMetadata, turnErrorCategory,
  fs = nodeFs, path = nodePath, inRepository = cwd => folderInRepository(cwd, { fs, path }) }) {
  return async (task, { attach, assertActive = () => {} }) => {
    const code = routineKind(task) === 'code';
    const before = await context(task.options.coreId);
    const check = async () => {
      const current = await context(task.options.coreId);
      if (current.owner !== before.owner || current.coreId !== task.options.coreId)
        throw new Error(`Switch to ${task.options.coreId} to run this scheduled task.`);
      if (!current.models.some(model => (model.model ?? model.id) === task.options.model))
        throw new Error('The saved model is unavailable. Restore it before running this task.');
      return current;
    };
    const host = await check();
    const invoke = async (method, params) => {
      let result;
      try {
        await check();
        assertActive();
        result = await rpc({ method, params }, before.owner);
      } catch (error) { throw code ? tagRoutineLaunchError(error, { stage: 'rpc', turnErrorCategory }) : error; }
      const rpcError = result?.__codeDesktopRpcError;
      if (rpcError) {
        if (!code) throw new Error(rpcError.message);
        // The core's JSON-RPC error keeps its code and data (CodexErrorInfo) for the category.
        throw tagRoutineLaunchError(Object.assign(new Error(rpcError.message), { code: rpcError.code, data: rpcError.data ?? null }),
          { stage: 'rpc', rpcError, turnErrorCategory });
      }
      return result;
    };
    let cwd = task.cwd;
    if (code) {
      // Before anything is created: the folder (cwd_not_found), then the worktree it asks for.
      assertActive();
      await checkFolder(task.cwd, fs);
      if (task.useWorktree === true && inRepository(task.cwd)) {
        if (typeof prepareWorktree !== 'function') throw new Error('Worktrees aren’t available for scheduled tasks.');
        assertActive();
        // R4i-routines RI2: the official createWorktree's start checks (skipWithoutCommits): a repository with no
        // commits yet answers null and the task starts in its folder, like a folder outside any repository.
        let prepared;
        try { prepared = await prepareWorktree({ cwd: task.cwd, branch: typeof task.sourceBranch === 'string' ? task.sourceBranch : '', skipWithoutCommits: true }); }
        catch (error) { throw tagRoutineLaunchError(error, { stage: 'worktree' }); }
        if (prepared !== null && (typeof prepared !== 'string' || !prepared)) throw new Error('The worktree could not be prepared.');
        if (prepared !== null) cwd = prepared;
      }
    }
    const mode = code ? 'code' : 'cowork';
    const permission = { mode, permission: task.options.permission,
      hints: host.hints, autoReview: host.autoReview };
    const start = await invoke('thread/start', {
      cwd, model: task.options.model,
      ...threadPermissionParams(permission),
      ...(code ? host.customization === true ? {} : { developerInstructions: CODE_ROUTINE_INSTRUCTIONS } : { developerInstructions: surfaceInstructions('cowork') }),
      codeDesktop: { ...threadPermissionParams(permission).codeDesktop, surface: mode },
    });
    const threadId = start?.thread?.id;
    if (!threadId) throw new Error('The core did not create a session.');
    // The session belongs to its task (the official LocalSession scheduledTaskId the Routines page lists).
    if (code) setSessionMetadata?.(threadId, { scheduledTaskId: task.id });
    attach(threadId);
    await invoke('thread/name/set', { threadId, name: task.name });
    const permissions = turnPermissionParams({ ...permission, cwd, networkAccess: task.options.networkAccess });
    const result = await invoke('turn/start', { threadId, cwd,
      model: task.options.model, effort: task.options.effort,
      input: [{ type: 'text', text: task.prompt }], ...permissions,
      codeDesktop: { ...permissions.codeDesktop, workflowTurn: { mode, permission: task.options.permission } },
    });
    return { threadId, turnId: result?.turn?.id };
  };
}
