// R4g-routines RT6 (tasks-code-routines WI-6, research/r4-code-routines.md §10 WI-6, §11 hostGap 7): a Code task's
// "Always allowed" approvals, as the 2.42304.0 scheduler keeps them per task (asar index.chunk-muI2IV6k.js
// addApprovedPermissions / storeApprovedRules, shouldAutoApprovePermission, removeApprovedPermission; the session side in
// index.chunk-CFJssAFf.js accumulateSessionPermissionUpdates: `e.scheduledTaskId && … Js.addApprovedPermissions(…)`).
//
// Officially a rule is the CLI's permission suggestion {toolName, ruleContent} (`l4 = toolName\0ruleContent`), and a later
// run's ask is approved when every allow rule it suggests is stored. The host's cores send no rule suggestions: an
// approval request names one command (item/commandExecution/requestApproval). So the host's rule is narrower than the
// official one and never wider than what the user approved:
//   - only a command approval answered "Allow for this session" (acceptForSession) during a run of the task, on the run's
//     own session (sessionMetadata.scheduledTaskId and the task's running run with that threadId);
//   - the exact command string (no prefix, no wildcard; the official bare-tool rule for Bash is never stored either, bna),
//     in the same folder relative to the run's root (a worktree run has a new root each time), with the same sandbox
//     escalation the request names ("Needs <mode>", the DeepSeek core's reason line);
//   - answered with "accept" (this call only) on a later run of the same task, so the core's own session grant is not
//     widened; anything else (file changes, MCP tool calls, network or permission requests, the app's own agent-tool
//     cards, sampling, terminal input) still shows its card.
// Renderer code can only remove a rule (local-routines 'remove-approval'); adding one is this module's, in main.
import nodePath from 'node:path';

export const COMMAND_APPROVAL = 'item/commandExecution/requestApproval';
export const RULE_CONTENT_LIMIT = 4000;
export const APPROVAL_LIMIT = 100;
// The official display name of a shell rule (cfc18e0f4 Ve: `${toolName} (${ruleContent})`).
export const COMMAND_TOOL = 'Bash';

const plain = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const running = (run) => run?.status === 'starting' || run?.status === 'running';
// harness codex-app-server approval.js reasonFor: "Needs <mode>" or "Needs <mode>: <text>" on a sandbox escalation.
const escalationOf = (reason) => (typeof reason === 'string' ? /^Needs ([A-Za-z][A-Za-z-]*)(?::|$)/.exec(reason.trim())?.[1] ?? null : null);

/** The official key of a rule (muI2IV6k l4): what the page lists and removes by. */
export const ruleKey = (rule) => `${rule.toolName}\0${rule.ruleContent ?? ''}`;

/** Two host rules approve the same thing: tool, exact command, relative folder and escalation. */
export function sameRule(a, b) {
  return !!a && !!b && a.toolName === b.toolName && (a.ruleContent ?? null) === (b.ruleContent ?? null)
    && (a.cwd ?? '') === (b.cwd ?? '') && (a.escalation ?? null) === (b.escalation ?? null);
}

/** A stored rule as the scheduler keeps it, or null when it is not one this module makes. */
export function storedRule(rule) {
  if (!plain(rule) || rule.toolName !== COMMAND_TOOL || typeof rule.ruleContent !== 'string' || !rule.ruleContent.trim()
    || rule.ruleContent.length > RULE_CONTENT_LIMIT || rule.ruleContent.includes('\0')) return null;
  if (typeof rule.cwd !== 'string' || rule.cwd.startsWith('/') || rule.cwd.split('/').includes('..') || rule.cwd.includes('\0')) return null;
  if (rule.escalation !== undefined && (typeof rule.escalation !== 'string' || !/^[A-Za-z][A-Za-z-]*$/.test(rule.escalation))) return null;
  return { toolName: rule.toolName, ruleContent: rule.ruleContent, cwd: rule.cwd, ...(rule.escalation !== undefined && { escalation: rule.escalation }) };
}

/**
 * The host rule a core's approval request asks for, or null when it is not a rememberable command approval.
 * `root` is the session's own folder (main.cjs threadMetadata[threadId].cwd).
 */
export function routineApprovalRule(request, root, { path = nodePath } = {}) {
  if (!plain(request) || request.method !== COMMAND_APPROVAL) return null;
  // The app's own agent-tool cards (CodexClient.localApproval ids) are answered by their own services.
  if (typeof request.id === 'string' && request.id.startsWith('code-desktop-')) return null;
  const params = request.params;
  if (!plain(params) || typeof params.threadId !== 'string' || !params.threadId) return null;
  // writeStdin and other non-command kinds; a grant the core itself would not remember; network / permission asks.
  if (params.kind !== undefined && params.kind !== 'command') return null;
  if (params.sessionGrantable === false) return null;
  if (params.networkApprovalContext != null || params.additionalPermissions != null) return null;
  // codeDesktop extensions other than Deny feedback (agent tools, sampling) are not shell commands.
  if (params.codeDesktop != null && (!plain(params.codeDesktop) || Object.keys(params.codeDesktop).some((key) => key !== 'declineFeedback'))) return null;
  if (Array.isArray(params.availableDecisions) && !params.availableDecisions.includes('acceptForSession')) return null;
  const command = params.command;
  if (typeof command !== 'string' || !command.trim() || command.length > RULE_CONTENT_LIMIT || command.includes('\0')) return null;
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof params.cwd !== 'string' || !path.isAbsolute(params.cwd)) return null;
  const relative = path.relative(path.resolve(root), path.resolve(params.cwd));
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  const escalation = escalationOf(params.reason);
  return { toolName: COMMAND_TOOL, ruleContent: command, cwd: relative.split(path.sep).join('/'), ...(escalation && { escalation }) };
}

/** The Code task and its running run that a session is, or null (a continued or finished run, a fork, any other session). */
export function routineRunFor(rows, threadId, scheduledTaskId) {
  if (typeof threadId !== 'string' || typeof scheduledTaskId !== 'string' || !Array.isArray(rows)) return null;
  const task = rows.find((row) => row?.id === scheduledTaskId);
  if (!task || task.kind !== 'code') return null;
  const run = (task.runs ?? []).find((value) => value?.threadId === threadId && running(value));
  return run ? { task, run } : null;
}

/** The rules the page lists: the official {toolName, ruleContent} shape, one per official key. */
export function listedApprovals(task) {
  const seen = new Set(), listed = [];
  for (const rule of Array.isArray(task?.approvedPermissions) ? task.approvedPermissions : []) {
    const stored = storedRule(rule);
    if (!stored || seen.has(ruleKey(stored))) continue;
    seen.add(ruleKey(stored));
    listed.push({ toolName: stored.toolName, ruleContent: stored.ruleContent });
  }
  return listed;
}

/**
 * routines: the local-routines service (list, rememberApproval); metadata(threadId): the session's sessionMetadata;
 * root(threadId): the session's folder. respond(owner, p) is respond-approval.cjs respondToApproval.
 */
export function createRoutineApprovals({ routines, metadata, root, path = nodePath }) {
  const context = (request) => {
    const threadId = request?.params?.threadId;
    if (typeof threadId !== 'string') return null;
    let found;
    try { found = routineRunFor(routines.list('code'), threadId, metadata(threadId)?.scheduledTaskId); } catch { return null; }
    if (!found) return null;
    // Once the run's turn is known, only that turn's requests are the run's.
    if (found.run.turnId && request.params.turnId !== found.run.turnId) return null;
    const rule = routineApprovalRule(request, root(threadId), { path });
    return rule && { ...found, rule };
  };
  return {
    /** A run's request its task's rule covers: answered "accept" for this call before any card shows. True when answered. */
    receive(event, owner, respond) {
      if (event?.kind !== 'request' || !event.bridgeApproval) return false;
      const hit = context(event);
      if (!hit || !(hit.task.approvedPermissions ?? []).some((rule) => sameRule(storedRule(rule), hit.rule))) return false;
      let result;
      try { result = respond(owner, { id: event.id, expected: event.bridgeApproval, decision: 'accept' }); } catch { return false; }
      return result?.ok === true;
    },
    /** A card's answer; "Allow for this session" on a run's command approval stores the rule on its task once sent. */
    respond(owner, p, respond) {
      let request = null;
      if (p?.decision === 'acceptForSession' && p.decisionIndex === undefined && p.feedback === undefined) {
        try { request = owner.getApproval(p.id, p.expected); } catch { request = null; }
      }
      const result = respond(owner, p);
      if (result?.ok === true && request) {
        const hit = context(request);
        if (hit) { try { routines.rememberApproval(hit.task.id, hit.rule); } catch { /* the task is gone */ } }
      }
      return result;
    },
  };
}
