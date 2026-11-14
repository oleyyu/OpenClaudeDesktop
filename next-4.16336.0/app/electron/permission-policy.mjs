// Codex 0.155.1: thread uses SandboxMode; turn uses the tagged SandboxPolicy.
// acceptEdits (shared-14-BOJVa-jT.js:10259-10273 nE local list) is Manual's
// untrusted policy plus the mode hint on a core with permission hints: the bridge
// lets workspace write/edit calls through and still asks for commands
// (approval.js acceptsEdit).
//
// A core without permission hints speaks the Codex protocol's own policies, so
// each mode maps to what that core can enforce (codex-rs core/src/safety.rs
// assess_patch_safety; verified on the 0.155.1 binary, tests/codex-modes-integration):
//   Accept edits  on-request + workspace-write: patches inside the writable roots
//                 apply without asking (untrusted would ask for every patch), commands
//                 run in the sandbox and ask only to leave it.
//   Plan          the core's native plan collaboration mode (turn/start collaborationMode,
//                 ModeKind "plan"; main.cjs completes its settings for a core that lists
//                 collaboration modes and drops it elsewhere) in a read-only sandbox with
//                 approvalPolicy never: nothing can escalate, every patch is rejected.
//   Chat          read-only with approvalPolicy never as well (nothing can ask to escalate out of the sandbox).
//   others        collaborationMode "default", so a turn after Plan leaves it.
export const PERMISSION_MODES = Object.freeze(['auto', 'ask', 'acceptEdits', 'plan', 'bypass']);
const AFTER_PLAN = Object.freeze(['auto', 'ask', 'acceptEdits', 'bypass']);
// The Codex protocol's collaboration modes (ModeKind).
export const NATIVE_MODES = Object.freeze(['plan', 'default']);
const planning = ({ permission, mode, review }) => permission === 'plan' && mode !== 'chat' && !review;
// hints (cores with capabilities.permissionHints; Codex never receives the field): a read-only
// sandbox alone cannot tell Plan from chat or review, so the bridge also gets
// the mode and the permission an approved plan continues with (afterPlan).
// autoReview (boot.core.capabilities.autoReview: Codex lists guardian_approval): Auto becomes Codex's 'Approve for me'
// (approvalsReviewer auto_review: on-request in workspace-write, a reviewer agent decides each escalation and asks
// only for risky ones), so Auto and Accept edits differ on Codex too. main.cjs keeps it only where the core has it.
export function threadPermissionParams({ permission = 'auto', mode = 'code', review = false, hints = false, afterPlan = 'auto', autoReview = false } = {}) {
  if (!PERMISSION_MODES.includes(permission) || !['code', 'chat', 'cowork'].includes(mode)) throw new Error('Choose a valid permission mode.');
  const readOnly = review || mode === 'chat' || permission === 'plan';
  const bypass = permission === 'bypass' && !readOnly;
  const native = hints !== true;
  const approvalPolicy = bypass ? 'never'
    // Chat on a native core is read-only with nothing to escalate, like Plan: on-request would let Codex ask to leave
    // the read-only sandbox, and an approved escalation would write the file chat promised not to. (A review keeps the
    // Mode's own policy: Manual still asks before each of its commands.)
    : native && (planning({ permission, mode, review }) || (mode === 'chat' && !review)) ? 'never'
    : permission === 'ask' || (permission === 'acceptEdits' && !native) ? 'untrusted' : 'on-request';
  const reviewer = autoReview === true && native && permission === 'auto' && !readOnly && approvalPolicy === 'on-request' ? 'auto_review' : 'user';
  return { approvalsReviewer: reviewer, approvalPolicy,
    sandbox: readOnly ? 'read-only' : bypass ? 'danger-full-access' : 'workspace-write',
    ...(hints === true ? { codeDesktop: { permissionMode: hintedMode({ permission, mode, review }), afterPlan: AFTER_PLAN.includes(afterPlan) ? afterPlan : 'auto' } } : {}) };
}
function hintedMode({ permission, mode, review }) {
  if (permission === 'plan' && mode !== 'chat' && !review) return 'plan';
  return review ? 'review' : mode === 'chat' ? 'chat' : permission;
}
// A hinted core's plan review (the DeepSeek bridge's exit_plan_mode, question id 'plan-review') was
// approved with its 'Approve' option: the request's single answer is exactly that.
export const PLAN_REVIEW_QUESTION = 'plan-review';
export function approvesPlan(request, payload) {
  if (request?.method !== 'item/tool/requestUserInput') return false;
  if (!request.params?.questions?.some?.(question => question?.id === PLAN_REVIEW_QUESTION)) return false;
  const values = payload?.answers?.[PLAN_REVIEW_QUESTION]?.answers;
  return Array.isArray(values) && values.length === 1 && values[0] === 'Approve';
}
// The permission an approved plan continues with: the one used before Plan. Bypass is
// kept only when the caller says it may be (the opt-in is on and the core allows it,
// approval-shared-current.js:8515-8528 pt lists bypassPermissions only then); otherwise
// the remembered default falls back to Auto (as the bridges do).
export const afterPlanPermission = (afterPlan, { bypass = false } = {}) =>
  afterPlan === 'ask' || afterPlan === 'acceptEdits' ? afterPlan : afterPlan === 'bypass' && bypass === true ? 'bypass' : 'auto';
// The plan card (R07, approval-current.js Rse) names its target on the response
// (codeDesktop.afterPlan: Accept → 'ask', the primary or a 'More accept options' row →
// that mode), which wins over the remembered mode; null when the response did not approve.
// An explicit 'bypass' ('Accept and bypass permissions', Mk bypassPermissions) is the
// user's choice on the card; main.cjs validates it (validateBypassRequest) before answering.
export const PLAN_RESPONSE_TARGETS = Object.freeze(['auto', 'ask', 'acceptEdits', 'bypass']);
export function approvedPlanPermission(request, payload, afterPlan) {
  if (!approvesPlan(request, payload)) return null;
  const chosen = payload?.codeDesktop?.afterPlan;
  if (chosen === 'bypass') return 'bypass';
  return afterPlanPermission(PLAN_RESPONSE_TARGETS.includes(chosen) ? chosen : afterPlan);
}
/** True when a plan-review response asks to continue in Bypass (main validates it first). */
export const planResponseRequestsBypass = (payload) => payload?.codeDesktop?.afterPlan === 'bypass';
// /workflow runner agents follow the session's Mode at launch. They never ask (approvalPolicy never:
// the runner's own core has no approval card), so each Mode becomes an access level:
//   Auto, Accept edits   workspace-write: create and edit files in the working directory
//   Bypass permissions   danger-full-access (validated like any bypass request)
//   Plan, Ask, chat      read-only: Plan never edits, and Ask's per-edit approval has no card here
export const WORKFLOW_ACCESS = Object.freeze(['read-only', 'workspace-write', 'danger-full-access']);
export function workflowAccess({ permission = 'auto', mode = 'code' } = {}) {
  if (!PERMISSION_MODES.includes(permission) || !['code', 'cowork'].includes(mode) || permission === 'plan' || permission === 'ask') return 'read-only';
  return permission === 'bypass' ? 'danger-full-access' : 'workspace-write';
}
// networkAccess (Settings › Code › Sandbox network access, config.sandboxNetworkAccess): whether commands in the
// workspace-write sandbox (Auto, Manual, Accept edits) may use the network. Each core decides what its sandbox
// does with it (verified on the binaries): Codex and the OpenCode/MiMo bridges block every connection, loopback
// proxies included, unless it is true; the ACP bridges leave network on and ZCode has no sandbox; the DeepSeek
// seatbelt (harness sandbox-shell.js) does not read it yet. Read-only (Plan, chat, review) stays offline.
export function turnPermissionParams({ cwd, additionalFolders = [], networkAccess = false, ...options } = {}) {
  const { sandbox, ...base } = threadPermissionParams(options);
  return { ...base, sandboxPolicy: sandbox === 'danger-full-access' ? { type: 'dangerFullAccess' }
    : sandbox === 'read-only' ? { type: 'readOnly', networkAccess: false }
    : { type: 'workspaceWrite', writableRoots: [cwd, ...additionalFolders], networkAccess: networkAccess === true, excludeTmpdirEnvVar: false, excludeSlashTmp: false },
    // Without permission hints, the core's own collaboration mode (main.cjs completes or drops it).
    ...(options.hints === true ? {} : { collaborationMode: { mode: planning({ permission: options.permission ?? 'auto', mode: options.mode ?? 'code', review: options.review === true }) ? 'plan' : 'default' } }) };
}
/**
 * turn/start's collaborationMode for a core that has collaboration modes (CollaborationMode {mode, settings}):
 * settings take precedence over the turn's model and effort, so they are the turn's own (else the saved
 * default); developer_instructions null keeps the mode's built-in instructions. null when the mode or a model
 * is missing: the caller then drops the field (the turn still runs read-only in Plan).
 */
// planEffort (Plan mode only): the core's own Plan reasoning (Codex: config plan_mode_reasoning_effort, else the Plan
// preset's reasoning_effort from collaborationMode/list; null = the model's default). Codex's TUI takes Plan reasoning
// "exclusively" from these (chatwidget/settings.rs), never from the everyday effort, so the app's effort applies only
// to the default mode; undefined (not known) falls back to it.
export function nativeCollaborationMode(params, { model: fallbackModel = null, effort: fallbackEffort = null, planEffort = undefined } = {}) {
  const mode = params?.collaborationMode?.mode;
  if (!NATIVE_MODES.includes(mode)) return null;
  const model = typeof params.model === 'string' && params.model ? params.model : typeof fallbackModel === 'string' && fallbackModel ? fallbackModel : null;
  if (!model) return null;
  const effort = mode === 'plan' && planEffort !== undefined ? (typeof planEffort === 'string' && planEffort ? planEffort : null)
    : typeof params.effort === 'string' && params.effort ? params.effort : typeof fallbackEffort === 'string' && fallbackEffort ? fallbackEffort : null;
  return { mode, settings: { model, reasoning_effort: effort, developer_instructions: null } };
}
// After a native plan turn, the core waits for the client: Codex's own client asks "Implement this plan?" and
// starts the next turn in the default mode with this message (codex-rs tui chatwidget/plan_implementation.rs).
// The renderer's handoff sends it with the permission an approved plan continues with (afterPlanPermission).
export const PLAN_IMPLEMENTATION_MESSAGE = 'Implement the plan.';
export function planImplementationTurn(afterPlan, { bypass = false } = {}) {
  return { text: PLAN_IMPLEMENTATION_MESSAGE, permission: afterPlanPermission(afterPlan, { bypass }) };
}
export function requestsBypass(params) {
  return params?.sandbox === 'danger-full-access' || params?.sandboxPolicy?.type === 'dangerFullAccess';
}
export function bypassAvailability(response) {
  if (!response || !Object.hasOwn(response, 'requirements')) return { allowed: false, reason: 'Permission requirements are unavailable. Reconnect and try again.' };
  const requirements = response.requirements;
  if (requirements !== null && (typeof requirements !== 'object' || Array.isArray(requirements))) return { allowed: false, reason: 'Permission requirements are unavailable. Reconnect and try again.' };
  for (const [key, value] of [['allowedSandboxModes', 'danger-full-access'], ['allowedApprovalPolicies', 'never']]) {
    const allowed = requirements?.[key];
    if (allowed != null && (!Array.isArray(allowed) || !allowed.includes(value))) return { allowed: false, reason: 'Bypass permissions is disabled by your organization.' };
  }
  return { allowed: true, reason: '' };
}
/**
 * A background turn (a workflow's or Monitor's <task-notification>, a fired scheduled prompt) starts with the session's
 * last turn options, recorded when that turn ran. A recorded Bypass is kept only while Bypass is still the Mode and its
 * opt-in is on (bypassAllowed); otherwise the turn runs as Auto would: workspace-write in the session's folder (its
 * recorded writable roots), approvals on request, the user deciding. Other recorded modes are unchanged (they never
 * widen anything). Returns new params; the input is not changed.
 */
export function backgroundTurnPermission(params, { bypassAllowed = false, networkAccess = false } = {}) {
  if (!params || typeof params !== 'object' || !requestsBypass(params) || bypassAllowed === true) return params;
  const next = { ...params, approvalPolicy: 'on-request', approvalsReviewer: 'user' };
  delete next.sandbox;
  const cwd = typeof params.cwd === 'string' && params.cwd ? params.cwd : null;
  const roots = Array.isArray(params.sandboxPolicy?.writableRoots) ? params.sandboxPolicy.writableRoots.filter((root) => typeof root === 'string' && root) : [];
  next.sandboxPolicy = { type: 'workspaceWrite', writableRoots: [...new Set([...(cwd ? [cwd] : []), ...roots])], networkAccess: networkAccess === true, excludeTmpdirEnvVar: false, excludeSlashTmp: false };
  if (params.codeDesktop && typeof params.codeDesktop === 'object' && params.codeDesktop.permissionMode === 'bypass') next.codeDesktop = { ...params.codeDesktop, permissionMode: 'auto' };
  return next;
}
export async function validateBypassRequest(params, config, readRequirements) {
  if (!requestsBypass(params)) return;
  const checkOptIn = () => { if ((typeof config === 'function' ? config() : config)?.allowBypassPermissions !== true) throw new Error('Turn on Allow bypass permissions mode in Settings first.'); };
  checkOptIn();
  const availability = bypassAvailability(await readRequirements());
  checkOptIn();
  if (!availability.allowed) throw new Error(availability.reason);
}
