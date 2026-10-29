// w13-coworkfn-approvals (research/w13-coworkfn.md §1.5 O-37~O-41, cwf-31/32/33): what a Cowork approval means, for
// both Cowork engines (the connected core, main.cjs; the Cowork VM, session-service.mjs handleApproval).
//
// Official sources (3.6556.2 asar, read only):
//   index.chunk-jPKPzV-P.js  V7t "This tool requires explicit approval regardless of permission mode." (the PreToolUse
//                            hook's permissionDecisionReason for every tool in G9t, whatever the mode), B7t, G9t =
//                            [allow_cowork_file_delete, request_cowork_directory, launch_code_session, save_skill] +
//                            create/update/delete_scheduled_task, start/stop_watching (`W9t=[S7t,Cw,E7t,O7t,...Q7t]`,
//                            `G9t=new Set([...W9t,mw,hw,x5t,T5t,E5t])`); IQe (exported C5), the deny-with-feedback prefix;
//                            kOi / AOi (exported Jh / qh), the deny sentence's verb and input.
//   index.chunk-Dl8NPgw7.js  respondToToolPermission: deny → `${C5}${feedback}` or `User rejected ${Jh(tool)} ${qh(input)}.
//                            Please acknowledge this and suggest alternative approaches.`; once → allow (user_temporary);
//                            always / scheduled → allow + updatedPermissions (user_permanent), never for a G9t tool
//                            (`!t.WZ(i.toolName)`); persistAlwaysAllowDecision: request_cowork_directory answered always /
//                            scheduled in a scheduled task's run → `_s.addUserSelectedFolder(r.scheduledTaskId, n)` (O-38).
//                            syncPermissionModeFromCliInit: a CLI that started in "default" while bypassPermissions was
//                            asked downgrades the host side and emits `{type:"permission_mode_clamped", sessionId,
//                            permissionMode: <the mode asked>}` (O-41).
//
// Local mapping (E59): the Cowork card's once / always / deny are the core protocol's accept / acceptForSession /
// decline. A deny with what to do instead reaches the model as the official C5 sentence: the tool's result for the app's
// own tools (main.cjs agentToolCard), the SDK's deny message on the Cowork VM, and on a core that offers no feedback of
// its own (Codex) the text is steered into the running turn after the decline.
import nodeOs from 'node:os';
import nodePath from 'node:path';

// jPKPzV-P, word for word.
export const MANAGED_ASK_REASON = 'This tool requires explicit approval regardless of permission mode.';
export const ORG_POLICY_REASON = 'Organization policy requires approval for this tool.';
export const REJECT_FEEDBACK_PREFIX = "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). To tell you how to proceed, the user said:\n";
// G9t's tools by their bare names (the official ones are mcp__cowork__… and mcp__scheduled-tasks__…).
export const MANAGED_ASK_TOOLS = Object.freeze(['allow_cowork_file_delete', 'request_cowork_directory', 'launch_code_session', 'save_skill',
  'create_scheduled_task', 'update_scheduled_task', 'delete_scheduled_task', 'start_watching', 'stop_watching']);
export const DIRECTORY_TOOL = 'request_cowork_directory';

const bareName = name => typeof name === 'string' ? (/^mcp__[^_].*?__(.+)$/.exec(name)?.[1] ?? name) : null;
/** Whether a tool always asks, in every permission mode (Bypass included): G9t, bare or mcp__<server>__ named. */
export const isManagedAskTool = name => MANAGED_ASK_TOOLS.includes(bareName(name));
/** An app-tool approval request that names a G9t tool (request.tool) or says it always asks (request.managedAsk). */
export const managedAsk = request => !!request && typeof request === 'object' && (request.managedAsk === true || isManagedAskTool(request.tool));

// kOi / AOi (jPKPzV-P), word for word.
const VERBS = { Bash: 'running', Read: 'reading', Write: 'writing to', Edit: 'editing', Glob: 'searching', Grep: 'searching', Task: 'running task', ExitPlanMode: 'the plan' };
export const toolVerb = name => VERBS[name] || (name ? `using ${name}` : 'using');
export function toolInputDetail(input) {
  const value = input && typeof input === 'object' ? input : {};
  return value.command ? `command: ${value.command}` : value.file_path ? `file: ${value.file_path}` : value.path ? `path: ${value.path}`
    : value.pattern ? `pattern: ${value.pattern}` : value.url ? `url: ${value.url}` : '';
}
/** What the model is told when the user denies a tool call (Dl8 respondToToolPermission "deny"). */
export function rejectionMessage(toolName, input, feedback) {
  const text = typeof feedback === 'string' ? feedback.trim() : '';
  if (text) return `${REJECT_FEEDBACK_PREFIX}${text}`;
  return `User rejected ${[toolVerb(toolName), toolInputDetail(input)].filter(Boolean).join(' ')}. Please acknowledge this and suggest alternative approaches.`;
}

/**
 * jPKPzV-P SEr (`t.oO`), word for word: the tools an "always" answer's suggestions allow whole (an allow addRules rule
 * with no ruleContent). Dl8 persistAlwaysAllowDecision adds exactly these to the session's approvedToolNames.
 */
export function suggestionToolNames(suggestions) {
  const names = [];
  for (const suggestion of Array.isArray(suggestions) ? suggestions : []) {
    if (suggestion?.type !== 'addRules' || suggestion.behavior !== 'allow' || !Array.isArray(suggestion.rules)) continue;
    for (const rule of suggestion.rules) if (rule?.ruleContent == null && typeof rule?.toolName === 'string' && rule.toolName) names.push(rule.toolName);
  }
  return names;
}

// The decisions a Cowork card offers, as the core protocol names them.
export const COWORK_DECISIONS = Object.freeze(['accept', 'acceptForSession', 'decline']);
const OFFICIAL_DECISIONS = Object.freeze({ once: 'accept', always: 'acceptForSession', scheduled: 'acceptForSession', deny: 'decline' });
/**
 * A Cowork card's answer for the core: once → accept, always (and a scheduled task's "all runs") → acceptForSession,
 * deny → decline with the feedback, if any. The core's own names pass as they are. null for anything else.
 */
export function decisionToCore(decision, { feedback } = {}) {
  const core = OFFICIAL_DECISIONS[decision] ?? (COWORK_DECISIONS.includes(decision) || decision === 'cancel' ? decision : null);
  if (!core) return null;
  const text = core === 'decline' && typeof feedback === 'string' ? feedback.trim() : '';
  return { decision: core, ...(text ? { feedback: text } : {}) };
}

/**
 * main.cjs case "respond": a Cowork card's answer in the official vocabulary (decision once / always / scheduled / deny)
 * becomes the core's (decisionToCore); anything else passes unchanged. A deny with feedback on a core request that offers
 * no feedback of its own (Codex: no codeDesktop.declineFeedback) is sent as a plain decline, and the feedback follows as
 * the user's next words in the same turn (steer, once the decline left). The app's own cards and the Cowork VM's offer
 * feedback (declineFeedback), so theirs goes with the decline. Returns the payload to answer with.
 */
export function coworkRespondPayload(owner, p, { cowork = () => false, steer = null, later = setImmediate } = {}) {
  if (!p || typeof p !== 'object' || p.decisionIndex !== undefined || p.elicitation !== undefined || p.answers !== undefined) return p;
  const official = Object.hasOwn(OFFICIAL_DECISIONS, p.decision);
  if (!official && p.feedback === undefined) return p;
  let request = null;
  try { request = owner.getApproval(p.id, p.expected); } catch { return p; }
  const threadId = request?.params?.threadId;
  if (!['item/commandExecution/requestApproval', 'item/fileChange/requestApproval'].includes(request?.method) || typeof threadId !== 'string' || !cowork(threadId)) return p;
  // Feedback goes with a decline only (respond-approval.cjs refuses it on anything else).
  if (!official && p.decision !== 'decline') return p;
  const mapped = official ? decisionToCore(p.decision, { feedback: p.feedback }) : { decision: 'decline', ...(typeof p.feedback === 'string' && p.feedback.trim() ? { feedback: p.feedback.trim() } : {}) };
  const { feedback: _feedback, ...rest } = p;
  void _feedback;
  const next = { ...rest, decision: mapped.decision };
  if (!mapped.feedback) return next;
  if (request.params?.codeDesktop?.declineFeedback === true) return { ...next, feedback: mapped.feedback };
  // The core takes no feedback with its decline: the user's words follow in the running turn, once the decline was sent
  // (the request is no longer pending). A turn that ended meanwhile keeps the decline only.
  if (typeof steer === 'function' && typeof request.params?.turnId === 'string' && request.params.turnId) {
    later(() => {
      let pending = true;
      try { owner.getApproval(p.id, p.expected); } catch { pending = false; }
      if (!pending) Promise.resolve(steer({ threadId, expectedTurnId: request.params.turnId, input: [{ type: 'text', text: mapped.feedback, text_elements: [] }] })).catch(() => {});
    });
  }
  return next;
}

// Dl8 handleToolPermission: a new browser: / computer: / webfetch: request of a session while the same one (tool name and
// JSON input) still waits dismisses the older card (tool_permission_resolved) and answers it with this deny.
export const SUPERSEDED_MESSAGE = 'Superseded by new permission request';
const SUPERSEDE_PREFIXES = Object.freeze(['browser:', 'computer:', 'webfetch:']);
/** The key two waiting requests share when the newer one supersedes the older, or null (other tools never do). */
export function supersedeKey(owner, toolName, input) {
  if (typeof owner !== 'string' || !owner || typeof toolName !== 'string' || !SUPERSEDE_PREFIXES.some(prefix => toolName.startsWith(prefix))) return null;
  let json;
  try { json = JSON.stringify(input); } catch { return null; }
  return `${owner}\u0000${toolName}\u0000${json}`;
}
/**
 * The waiting requests by supersedeKey. claim(key, dismiss) registers one and dismisses the one it supersedes (its
 * dismiss() runs once); returns release() for when it is answered. A null key claims nothing.
 */
export function createSupersede() {
  const waiting = new Map();
  return {
    claim(key, dismiss) {
      if (!key) return () => {};
      const before = waiting.get(key), entry = { dismiss };
      waiting.set(key, entry);
      if (before) { try { before.dismiss(); } catch { /* already answered */ } }
      return () => { if (waiting.get(key) === entry) waiting.delete(key); };
    },
    get size() { return waiting.size; },
  };
}
// The app's own cards (main.cjs agentToolCard): one per main process.
const cardSupersede = createSupersede();

/**
 * main.cjs agentToolCard, for one app-tool card of a Cowork session:
 *   declineFeedback  the card's Deny may say what to do instead (respond-approval.cjs passes it back);
 *   task             a scheduled task's run asking for a folder (request_cowork_directory): "always" keeps the folder
 *                    on the task (O-38), so the card offers it (sessionGrantable);
 *   signal(signal)   the signal to show the card with: a WebFetch site card (official `webfetch:${domain}` with
 *                    {domain, url}) is dismissed when the same session asks for the same page again (supersedeKey);
 *   settle(result)   after the answer: a dismissed card throws SUPERSEDED_MESSAGE, a deny with feedback the official C5
 *                    sentence (the tool's result); an always on the run's folder request adds the folder to the task
 *                    (grantFolders addOnly).
 * folderTitle: the folder card's title as the tool words it (agent-tools/cowork.mjs CARDS.folderTitle, translated), for a
 * request that doesn't name its tool.
 */
export function coworkCardOptions(request, { cowork = false, task = () => null, folderTitle = null, session = null, supersede = cardSupersede } = {}) {
  if (!cowork) return { cowork: false, declineFeedback: false, task: null, signal: signal => signal, settle: async () => {} };
  const directory = !!request && request.kind === 'other' && typeof request.cwd === 'string' && nodePath.isAbsolute(request.cwd)
    && (request.tool === DIRECTORY_TOOL || (typeof folderTitle === 'string' && folderTitle && request.title === folderTitle && request.detail === request.cwd));
  let scheduled = null;
  if (directory) { try { scheduled = task() ?? null; } catch { scheduled = null; } }
  if (scheduled && (typeof scheduled.id !== 'string' || (scheduled.kind !== undefined && scheduled.kind !== 'cowork'))) scheduled = null;
  const site = request?.kind === 'web-fetch' && typeof request.host === 'string' && request.host
    ? supersedeKey(session, `webfetch:${request.host}`, { domain: request.host, url: request.url }) : null;
  let superseded = false, release = () => {};
  return {
    cowork: true, declineFeedback: true, task: scheduled,
    signal(signal) {
      if (!site) return signal;
      const local = new AbortController();
      if (signal?.aborted) local.abort(); else signal?.addEventListener?.('abort', () => local.abort(), { once: true });
      release = supersede.claim(site, () => { superseded = true; local.abort(); });
      return local.signal;
    },
    async settle({ result, approved, grantFolders } = {}) {
      release();
      if (superseded) throw new Error(SUPERSEDED_MESSAGE);
      const feedback = typeof result?.codeDesktop?.feedback === 'string' ? result.codeDesktop.feedback.trim() : '';
      if (!approved && result?.decision === 'decline' && feedback) throw new Error(rejectionMessage(null, null, feedback));
      if (approved && scheduled && result?.decision === 'acceptForSession' && typeof grantFolders === 'function') {
        try { await grantFolders(scheduled.id, [request.cwd], { addOnly: true }); } catch { /* the task is gone or full */ }
      }
    },
  };
}

// Official mode names for the local ones (permission-policy.mjs PERMISSION_MODES).
const OFFICIAL_MODE = Object.freeze({ ask: 'default', auto: 'auto', acceptEdits: 'acceptEdits', plan: 'plan', bypass: 'bypassPermissions' });
const LOCAL_MODE = Object.freeze(Object.fromEntries(Object.entries(OFFICIAL_MODE).map(([local, official]) => [official, local])));
/**
 * The mode a session may run in (O-41). surface 'chat' → default (Chat asks, or has nothing to ask about); 'cowork' on a
 * core with no command sandbox (coreCaps.sandbox false: core-registry.mjs coreSandboxed) → default, so every command
 * and edit is approved (plan stays: it is read-only); anything else as asked. mode: an official or a local name.
 * Returns { permissionMode (official name), clamped: null | { type: 'permission_mode_clamped', permissionMode: <asked> } };
 * clamped is only for the two modes the official notice words (bypassPermissions, auto).
 */
export function clampMode(surface, mode, coreCaps = {}) {
  const asked = OFFICIAL_MODE[mode] ?? (LOCAL_MODE[mode] ? mode : 'default');
  const limited = surface === 'chat' || (surface === 'cowork' && coreCaps?.sandbox === false && asked !== 'plan');
  const permissionMode = limited ? 'default' : asked;
  const clamped = permissionMode !== asked && (asked === 'bypassPermissions' || asked === 'auto') ? { type: 'permission_mode_clamped', permissionMode: asked } : null;
  return { permissionMode, clamped };
}

/** The local mode a core request runs in (permission-policy.mjs threadPermissionParams / turnPermissionParams). */
export function requestMode(params) {
  const hinted = params?.codeDesktop?.permissionMode;
  if (typeof hinted === 'string' && OFFICIAL_MODE[hinted]) return hinted;
  if (params?.sandbox === 'danger-full-access' || params?.sandboxPolicy?.type === 'dangerFullAccess') return 'bypass';
  if (params?.sandbox === 'read-only' || params?.sandboxPolicy?.type === 'readOnly' || params?.collaborationMode?.mode === 'plan') return 'plan';
  return params?.approvalPolicy === 'untrusted' ? 'ask' : 'auto';
}

/**
 * main.cjs requestRpc, thread/start and turn/start of a Cowork session on the connected core: on a core with no command
 * sandbox (sandboxed === false) the request becomes Ask permissions (approvalPolicy untrusted in a workspace-write
 * sandbox, whose writable roots core-cowork.mjs decorateCoworkTurn sets), so nothing runs or writes unasked. Changes
 * params; returns the official name of the mode a turn asked for when the notice applies (clampMode), else null.
 */
export function clampCoworkRequest(method, params, { sandboxed = null, networkAccess = false } = {}) {
  if (!params || typeof params !== 'object' || !['thread/start', 'turn/start'].includes(method)) return null;
  const local = requestMode(params);
  const { permissionMode, clamped } = clampMode('cowork', local, { sandbox: sandboxed === false ? false : undefined });
  if (permissionMode === OFFICIAL_MODE[local]) return null;
  params.approvalPolicy = 'untrusted';
  if (params.approvalsReviewer !== undefined) params.approvalsReviewer = 'user';
  if (method === 'thread/start') { if (params.sandbox !== undefined) params.sandbox = 'workspace-write'; }
  else if (params.sandboxPolicy?.type !== 'workspaceWrite') params.sandboxPolicy = { type: 'workspaceWrite', writableRoots: [], networkAccess: networkAccess === true, excludeTmpdirEnvVar: false, excludeSlashTmp: false };
  if (params.codeDesktop && typeof params.codeDesktop === 'object' && params.codeDesktop.permissionMode !== undefined) params.codeDesktop = { ...params.codeDesktop, permissionMode: 'ask' };
  return method === 'turn/start' && clamped ? clamped.permissionMode : null;
}

// ── The delete guard (O-24: deleting in a connected folder needs allow_cowork_file_delete; the outputs folder never) ──
// Where the core asks before a delete (a command or a file change that leaves the sandbox, every command and edit in Ask
// permissions), a delete in a connected folder whose deletes the user did not allow is declined before any card shows;
// the model then asks with allow_cowork_file_delete (its description says to). Deletes the core runs without asking (in
// a writable root of a workspace-write sandbox) never reach the app: see the report.
const insidePath = (file, root) => file === root || file.startsWith(root.endsWith(nodePath.sep) ? root : root + nodePath.sep);

function targetOf(word, cwd, home) {
  if (!word || /[$`]/.test(word)) return null;
  let value = word === '~' ? home : word.startsWith('~/') ? nodePath.join(home, word.slice(2)) : word;
  // A glob deletes inside its fixed part.
  const glob = value.search(/[*?[{]/);
  if (glob >= 0) value = value.slice(0, glob).replace(/[^/]*$/, '') || '.';
  if (!nodePath.isAbsolute(value)) { if (typeof cwd !== 'string' || !nodePath.isAbsolute(cwd)) return null; value = nodePath.resolve(cwd, value); }
  return nodePath.normalize(value).replace(/(.)\/+$/, '$1');
}

// The shell words of a command and where its commands start (a delete is a command, never an argument or a quoted
// string): each segment is the words between ; && || | & ( ) and newlines; quotes and backslashes are taken off;
// $(…) and `…` bodies are commands of their own (subs); redirect targets are left out; a here-document's body is kept on
// its segment (a shell reading it runs it). dynamic: the word holds $ or ` outside single quotes (its value is unknown).
const SPACE = /[ \t\r\f\v]/;
function closeParen(text, from) {
  let depth = 1;
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (c === '\\') { j++; continue; }
    if (c === "'") { const k = text.indexOf("'", j + 1); j = k < 0 ? text.length : k; continue; }
    if (c === '"') { for (j++; j < text.length && text[j] !== '"'; j++) if (text[j] === '\\') j++; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return j;
  }
  return text.length;
}
function shellSegments(text) {
  const segments = [], subs = [];
  let words = [], word = null, redirect = null, heredocs = [];
  const part = () => (word ??= { value: '', dynamic: false });
  const end = () => {
    if (!word) return;
    if (redirect === 'heredoc') heredocs.push({ delimiter: word.value, segment: words });
    else if (!redirect) words.push(word);
    word = null; redirect = null;
  };
  const cut = () => { end(); redirect = null; if (words.length) segments.push(words); words = []; };
  const substitution = (from, close) => { subs.push(text.slice(from, close)); const w = part(); w.dynamic = true; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') { if (text[i + 1] === '\n') { i++; continue; } part().value += text[i + 1] ?? ''; i++; continue; }
    if (c === "'") { const k = text.indexOf("'", i + 1), stop = k < 0 ? text.length : k; part().value += text.slice(i + 1, stop); i = stop; continue; }
    if (c === '"') {
      const w = part();
      let j = i + 1;
      for (; j < text.length && text[j] !== '"'; j++) {
        if (text[j] === '\\' && j + 1 < text.length && '"\\$`\n'.includes(text[j + 1])) { w.value += text[++j]; continue; }
        if (text[j] === '$' && text[j + 1] === '(') { const k = closeParen(text, j + 2); substitution(j + 2, k); w.value += text.slice(j, k + 1); j = k; continue; }
        if (text[j] === '`') { const k = text.indexOf('`', j + 1), stop = k < 0 ? text.length : k; substitution(j + 1, stop); w.value += text.slice(j, stop + 1); j = stop; continue; }
        if (text[j] === '$') w.dynamic = true;
        w.value += text[j];
      }
      i = j; continue;
    }
    if (c === '$' && text[i + 1] === '(') { const k = closeParen(text, i + 2); substitution(i + 2, k); part().value += text.slice(i, k + 1); i = k; continue; }
    if (c === '`') { const k = text.indexOf('`', i + 1), stop = k < 0 ? text.length : k; substitution(i + 1, stop); part().value += text.slice(i, stop + 1); i = stop; continue; }
    if (c === '$') { const w = part(); w.dynamic = true; w.value += c; continue; }
    if (c === '#' && !word) { const k = text.indexOf('\n', i); i = (k < 0 ? text.length : k) - 1; continue; }
    if (c === '\n') {
      cut();
      // Here-documents start on the next line and run to their delimiter's line.
      let j = i + 1;
      for (const { delimiter, segment } of heredocs) {
        const body = [];
        while (j < text.length) {
          const k = text.indexOf('\n', j), line = text.slice(j, k < 0 ? text.length : k);
          j = k < 0 ? text.length : k + 1;
          if (line.replace(/^\t+/, '') === delimiter) break;
          body.push(line);
        }
        (segment.heredocs ??= []).push(body.join('\n'));
      }
      if (heredocs.length) { heredocs = []; i = j - 1; }
      continue;
    }
    if (SPACE.test(c)) { end(); continue; }
    if (c === '&' && text[i + 1] === '>') { end(); i += text[i + 2] === '>' ? 2 : 1; redirect = 'file'; continue; }
    if (';&|()'.includes(c)) { cut(); if ((c === '&' || c === '|' || c === ';') && (text[i + 1] === c || (c === '|' && text[i + 1] === '&'))) i++; continue; }
    if (c === '<' || c === '>') {
      if (word && !word.dynamic && /^\d+$/.test(word.value)) word = null; else end();
      if (c === '<' && text[i + 1] === '<') {
        if (text[i + 2] === '<') { i += 2; redirect = 'file'; continue; }
        i += text[i + 2] === '-' ? 2 : 1; redirect = 'heredoc'; continue;
      }
      if (text[i + 1] === '>' || text[i + 1] === '&' || text[i + 1] === '|') i++;
      redirect = 'file'; continue;
    }
    part().value += c;
  }
  cut();
  return { segments, subs };
}

const DELETERS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'srm', 'trash']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish']);
// Commands that run the command after their own options; the options listed take a value.
const WRAPPERS = {
  sudo: ['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-T', '-U'], doas: ['-u', '-C'], env: ['-u', '-C', '-P'],
  command: [], exec: ['-a'], builtin: [], nohup: [], time: ['-f', '-o'], nice: ['-n'], caffeinate: ['-t', '-w'],
  timeout: ['-k', '-s', '--kill-after', '--signal'], stdbuf: ['-i', '-o', '-e'], xargs: ['-I', '-L', '-n', '-P', '-s', '-d', '-E', '-J', '-R', '-S', '-a'],
};
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const commandName = word => !word || word.dynamic ? null : nodePath.basename(word.value);

/** shell -c SCRIPT (any option cluster with c: -c, -lc, -ic …): the script, or undefined. */
function shellScript(args) {
  for (let i = 0; i < args.length; i++) {
    const value = args[i].value;
    if (!value.startsWith('-') || value === '-' || value === '--') return undefined;
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(value)) return args[i + 1];
  }
  return undefined;
}

function scanCommand(text, cwd, home, found, depth) {
  if (depth > 4) { found.unknown = true; return; }
  const { segments, subs } = shellSegments(text);
  let here = cwd;
  for (const segment of segments) here = scanSegment(segment, here, home, found, depth);
  for (const sub of subs) scanCommand(sub, here, home, found, depth + 1);
}

// One simple command (its words): the deletes it makes, and the folder the next one runs in (cd).
function scanSegment(words, cwd, home, found, depth) {
  let i = 0, fromInput = false;
  for (;;) {
    while (i < words.length && !words[i].dynamic && ASSIGNMENT.test(words[i].value)) i++;
    const name = commandName(words[i]);
    if (!name || !Object.hasOwn(WRAPPERS, name)) break;
    if (name === 'xargs') fromInput = true;
    i++;
    while (i < words.length && words[i].value.startsWith('-') && words[i].value !== '-') {
      if (words[i].value === '--') { i++; break; }
      i += WRAPPERS[name].includes(words[i].value) ? 2 : 1;
    }
    if (name === 'env') while (i < words.length && ASSIGNMENT.test(words[i].value)) i++;
    if (name === 'timeout' || (name === 'nice' && /^\d+$/.test(words[i]?.value ?? ''))) i++;
  }
  const name = commandName(words[i]);
  const args = words.slice(i + 1);
  if (words.heredocs && name && SHELLS.has(name)) for (const body of words.heredocs) scanCommand(body, cwd, home, found, depth + 1);
  if (!name) return cwd;
  if (SHELLS.has(name)) { const script = shellScript(args); if (script) { if (script.dynamic) found.unknown = true; else scanCommand(script.value, cwd, home, found, depth + 1); } return cwd; }
  if (name === 'eval') { if (args.some(word => word.dynamic)) found.unknown = true; scanCommand(args.map(word => word.value).join(' '), cwd, home, found, depth + 1); return cwd; }
  if (name === 'cd' || name === 'pushd') {
    const target = args.find(word => !word.value.startsWith('-') || word.value === '-');
    if (!target) return home;
    if (target.value === '-') return null;
    return target.dynamic ? null : targetOf(target.value, cwd, home);
  }
  if (DELETERS.has(name)) { deleteArguments(args, cwd, home, found, fromInput); return cwd; }
  if (name === 'git') {
    let j = 0, at = cwd;
    while (j < args.length && args[j].value.startsWith('-')) {
      const option = args[j].value;
      if (option === '-C') { at = args[j + 1] && !args[j + 1].dynamic ? targetOf(args[j + 1].value, at, home) : null; j += 2; continue; }
      j += option === '-c' || option === '--git-dir' || option === '--work-tree' || option === '--namespace' ? 2 : 1;
    }
    if (args[j]?.value === 'rm' && !args.slice(j + 1).some(word => word.value === '--cached')) deleteArguments(args.slice(j + 1), at, home, found, fromInput);
    return cwd;
  }
  if (name === 'find') {
    const roots = [];
    for (const word of args) { if (word.value.startsWith('-') || word.value === '!' || word.value === '(') break; roots.push(word); }
    const deletes = args.some((word, index) => word.value === '-delete'
      || (['-exec', '-execdir', '-ok', '-okdir'].includes(word.value) && DELETERS.has(commandName(args[index + 1]) ?? '')));
    if (deletes) { if (roots.length) for (const root of roots) addTarget(root, cwd, home, found); else addTarget({ value: '.', dynamic: false }, cwd, home, found); }
    return cwd;
  }
  return cwd;
}

function addTarget(word, cwd, home, found) {
  const target = word.dynamic ? null : targetOf(word.value, cwd, home);
  if (!target) found.unknown = true;
  else if (!found.targets.includes(target)) found.targets.push(target);
}
// rm-like arguments: the options before -- are left out; xargs adds targets no one can see.
function deleteArguments(args, cwd, home, found, fromInput) {
  let options = true, any = false;
  for (const word of args) {
    if (options && word.value === '--') { options = false; continue; }
    if (options && word.value.startsWith('-') && word.value !== '-') continue;
    addTarget(word, cwd, home, found); any = true;
  }
  if (!any || fromInput) found.unknown = true;
}

/**
 * The paths a shell command deletes: rm / rmdir / unlink / shred / srm / trash where a command starts (after sudo, env,
 * xargs …; git rm; find … -delete or -exec rm; a shell's -c script, eval, $(…) and here-documents read by a shell), never
 * a word of another command or a quoted string; resolved against cwd and the folders cd moves to. unknown: a delete whose
 * target can't be told ($VAR, `…`, xargs input, a relative path without cwd).
 */
export function commandDeleteTargets(command, cwd, { home = nodeOs.homedir() } = {}) {
  const found = { targets: [], unknown: false };
  const start = typeof cwd === 'string' && nodePath.isAbsolute(cwd) ? cwd : null;
  if (Array.isArray(command)) {
    // An argv: its words as they are.
    const words = command.filter(value => typeof value === 'string').map(value => ({ value, dynamic: false }));
    scanSegment(words, start, home, found, 0);
  } else if (typeof command === 'string') scanCommand(command, start, home, found, 0);
  return found;
}

/** The paths a file change deletes (Codex FileUpdateChange {path, kind: {type: 'delete'}}; a bridge's kind string). */
export function changeDeleteTargets(changes, cwd) {
  const targets = [];
  let unknown = false;
  for (const change of Array.isArray(changes) ? changes : []) {
    const kind = typeof change?.kind === 'string' ? change.kind : change?.kind?.type;
    if (kind !== 'delete') continue;
    const target = typeof change.path === 'string' && change.path ? targetOf(change.path, cwd, nodeOs.homedir()) : null;
    if (target) { if (!targets.includes(target)) targets.push(target); } else unknown = true;
  }
  return { targets, unknown };
}

/**
 * The first delete the session may not make, or null. grants: its connected folders (folder-policy.mjs sessionGrants);
 * allowed(file): agent-tools/cowork.mjs deleteAllowed. A target inside a connected folder (or holding one) needs that
 * folder's permission; an unknown target is refused while any connected folder lacks it. Other places (the outputs
 * folder, host-cwd, outside every folder) are the sandbox's to decide.
 */
export function deniedDelete({ targets = [], unknown = false }, { grants = [], allowed = () => false } = {}) {
  for (const target of targets) {
    for (const grant of grants) {
      if (insidePath(target, grant) && !allowed(target)) return { target, folder: grant };
      if (insidePath(grant, target) && grant !== target) return { target, folder: grant };
    }
  }
  if (unknown) { const folder = grants.find(grant => !allowed(grant)); if (folder) return { target: null, folder }; }
  return null;
}

/**
 * main.cjs receive: the Cowork delete guard. meta(threadId): the session's metadata when it is a Cowork session on the
 * connected core, else null; grants(meta) / allowed(meta, file): as deniedDelete. receive(event, owner, respond) keeps the
 * file changes it saw and declines a delete request (true when it answered). respond is respond-approval.cjs
 * respondToApproval.
 */
export function createCoworkDeleteGuard({ meta, grants, allowed, limit = 500 }) {
  const changes = new Map(); // `${threadId}\0${itemId}` → { changes, cwd }
  const keyOf = (threadId, itemId) => `${threadId}\u0000${itemId}`;
  const sessionOf = threadId => { if (typeof threadId !== 'string' || !threadId) return null; try { return meta(threadId) ?? null; } catch { return null; } };
  return {
    receive(event, owner, respond) {
      const p = event?.params;
      if (event?.kind === 'notification' && (event.method === 'item/started' || event.method === 'item/completed') && p?.item?.type === 'fileChange' && sessionOf(p.threadId)) {
        changes.set(keyOf(p.threadId, p.item.id), { changes: p.item.changes, cwd: p.item.cwd ?? null });
        while (changes.size > limit) changes.delete(changes.keys().next().value);
        return false;
      }
      if (event?.kind === 'notification' && event.method === 'turn/completed' && typeof p?.threadId === 'string') {
        for (const key of [...changes.keys()]) if (key.startsWith(`${p.threadId}\u0000`)) changes.delete(key);
        return false;
      }
      if (event?.kind !== 'request' || !event.bridgeApproval || typeof event.id === 'string' && event.id.startsWith('code-desktop-')) return false;
      const session = sessionOf(p?.threadId);
      if (!session) return false;
      let found;
      if (event.method === 'item/commandExecution/requestApproval') found = commandDeleteTargets(p.command, p.cwd);
      else if (event.method === 'item/fileChange/requestApproval') {
        const seen = changes.get(keyOf(p.threadId, p.itemId));
        found = changeDeleteTargets(seen?.changes, seen?.cwd ?? p.cwd ?? null);
      } else return false;
      let folders;
      try { folders = grants(session) ?? []; } catch { folders = []; }
      if (!deniedDelete(found, { grants: folders, allowed: file => { try { return allowed(session, file) === true; } catch { return false; } } })) return false;
      let result;
      try { result = respond(owner, { id: event.id, expected: event.bridgeApproval, decision: 'decline' }); } catch { return false; }
      return result?.ok === true;
    },
  };
}
