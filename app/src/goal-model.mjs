// Codex goals (0.155.1 thread/goal/set|get|clear, thread/goal/updated|cleared; the TUI's /goal
// '[<objective>|clear|edit|pause|resume]', goal_display.rs): the /goal command for a core that reports
// capabilities.nativeGoals, and its result copy. ThreadGoal {objective, status, tokenBudget, tokensUsed,
// timeUsedSeconds}; status active | paused | blocked | usageLimited | budgetLimited | complete.
import { getAssistantName, t } from '../electron/i18n/index.mjs';

export const nativeGoalCommand = () => ({ name: 'goal', description: t('Keep working toward a goal until it’s done'), inputHint: '[objective|edit objective|pause|resume|clear]' });
// The most a goal objective may hold (Codex 0.155.1 refuses more: 'goal objective must be at most 4000 characters').
export const GOAL_OBJECTIVE_LIMIT = 4000;
// The request /goal <args> sends for a session. `edit <objective>` (Codex's TUI /goal edit, DeepSeek's dsh-command-goal
// edit) changes the current goal's objective in place: it keeps the goal's status (current, the goal the strip shows)
// and, on DeepSeek, its rounds (codeDesktop.edit). A refused request is {error}.
export function goalCommandRequest(args, threadId, current = null) {
  const text = String(args ?? '').trim(), word = text.toLowerCase();
  if (!text) return { method: 'thread/goal/get', params: { threadId } };
  if (word === 'clear') return { method: 'thread/goal/clear', params: { threadId } };
  if (word === 'pause') return { method: 'thread/goal/set', params: { threadId, status: 'paused' } };
  if (word === 'resume') return { method: 'thread/goal/set', params: { threadId, status: 'active' } };
  if (word === 'edit') return { error: t('Add the new objective after /goal edit, for example /goal edit make all tests pass.') };
  const edit = /^edit\s/i.test(text), objective = edit ? text.slice(4).trim() : text;
  if (objective.length > GOAL_OBJECTIVE_LIMIT) return { error: t('A goal can be at most {limit} characters. Shorten it, or put the details in a file and name the file in the goal.', { limit: GOAL_OBJECTIVE_LIMIT.toLocaleString('en-US') }) };
  if (edit) {
    const status = ['active', 'paused'].includes(current?.status) ? current.status : undefined;
    return { method: 'thread/goal/set', params: { threadId, objective, ...(status ? { status } : {}), codeDesktop: { edit: true } }, edit: true };
  }
  return { method: 'thread/goal/set', params: { threadId, objective: text, status: 'active' } };
}
// Setting a new objective while this goal is unfinished asks first (Codex's TUI 'Replace goal?',
// thread_goal_actions.rs should_confirm_before_replacing_goal: any status but complete).
export const goalNeedsReplaceConfirmation = (goal) => !!goal && typeof goal.objective === 'string' && goal.status !== 'complete';
const STATUS = { active: 'Working on it', paused: 'Paused', blocked: 'Blocked', usageLimited: 'Paused by usage limits', budgetLimited: 'Token budget reached', complete: 'Complete' };
// goal (optional): a DeepSeek goal paused only because the session restarted (codeDesktop.disarmed) says so.
export const goalStatusLabel = (status, goal = null) => goal?.codeDesktop?.disarmed === true ? t('Paused after a restart') : t(STATUS[status] || 'Working on it');
// W14-code r4 shell fr4-12a (E95): the goal strip's time / tokens / rounds line and blocked reason went with the strip;
// the rail's Goal card (railGoal, source-session-rail-adapters.jsx) shows the official fields.
// The toast after a /goal request: the goal it answered with, or that none is set.
export function goalCommandResult(request, result) {
  const goal = result?.goal ?? null;
  if (request.method === 'thread/goal/clear') return t('Goal cleared');
  if (!goal) return t('No goal is set for this session.');
  if (request.method === 'thread/goal/get') return t('Goal: {objective} ({status})', { objective: goal.objective, status: goalStatusLabel(goal.status) });
  if (request.edit) return t('Goal updated');
  return goal.status === 'paused' ? t('Goal paused') : request.params.objective ? t('Goal set. {name} keeps working until it’s done.', { name: getAssistantName() }) : t('Goal resumed');
}

// Codex's /init (TUI slash_dispatch.rs: submits its init prompt as a user message): a normal turn that writes AGENTS.md,
// the project instructions file Codex reads. OpenClaude Desktop's own wording of that request.
export const nativeInitCommand = () => ({ name: 'init', description: t('Create an AGENTS.md file with instructions for {name}', { name: getAssistantName() }), inputHint: '' });
export const INIT_PROMPT = 'Create a file named AGENTS.md in the repository root that guides an agent working on this project: how the code is organized, how to build, test and run it, the coding conventions to follow, and anything to know before changing code. Base every statement on what you find in the repository, keep it concise (about 200 to 400 words) with Markdown headings, and if an AGENTS.md already exists, improve it instead of replacing it.';
