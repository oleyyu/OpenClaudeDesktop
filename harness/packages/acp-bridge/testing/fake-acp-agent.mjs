#!/usr/bin/env node
/**
 * A scripted ACP agent for the bridge's server tests (tests/acp-bridge-parity.test.mjs): just enough of the
 * Agent Client Protocol to exercise per-model efforts, model switches, questionnaires (elicitation/create),
 * background compaction, delegation snapshots and session logs, with every request it receives appended to
 * $FAKE_ACP_LOG (JSON lines).
 *
 *   models     m-plain (no thinking), m-toggle (off / on), m-effort (off / low / medium / high);
 *              the first session starts on $FAKE_ACP_MODEL (default m-plain)
 *   prompts    "ask"       elicitation/create with two questions (multi-select first), answer echoed
 *              "/compact"  acknowledges at once, reports the result 300 ms after the prompt returns
 *              "delegate"  a task call plus mcode/session/delegation_update snapshots
 *              "usage"     appends usage.record lines to $FAKE_ACP_WIRE/<session>/agents/main/wire.jsonl
 *              "goal"      ends, then runs a turn of its own (_qwencode/start_turn … _qwencode/end_turn)
 *              "cron"      ends, then a cron run: a user_message_chunk with _meta.source 'cron', a reply and a
 *                          usage frame, with no start or end notice (Qwen's #executeCronPrompt)
 *              "plan-options"  an ExitPlanMode review with two approaches (Kimi's plan_opt_<i>, plan_revise,
 *                          plan_reject_and_exit); the answer's optionId is echoed
 *              "kimi-agent"  Kimi's Agent launch ("Launching coder agent: …") whose sub-agent writes only its own log
 *                          ($FAKE_ACP_WIRE/<session>/agents/agent-0/wire.jsonl: prompt, a Read, a reply, the end, the end
 *                          written after the call returns, as Kimi does)
 *              anything else: "ok:<model>:<effort>"
 *              "kimi-fail"  a Glob call, then end_turn; the main log records a retry (turn.step.retrying) and the turn's
 *                          failure (turn.ended reason 'failed', a 429 quota error), as Kimi Code does
 *              "kimi-bash <command>"  a Bash permission request (Kimi's shape: title = tool name); the outcome is echoed
 *              "enter-plan"  an EnterPlanMode permission request; the outcome is echoed (plan:<optionId>)
 *              "kimi-hook-block"  nothing streamed, end_turn: the main log holds the UserPromptSubmit hook's blocking
 *                          message and prompt.completed {reason: 'blocked'}, as Kimi Code writes them
 *              "kimi-bg-agent"  Kimi's background Agent launch: the turn ends first, then the sub-agent's log appears
 *                          and it asks for a Bash approval ('1:call_bg1'); the answer is logged ('bg-agent-approval')
 *              "gemini-mcp-error"  a failed MCP call whose text is Gemini CLI's "reported tool error …" wrapping
 *              "quota-usage"  usage only in the PromptResponse's _meta.quota (Gemini's shape)
 *              "slow <ms>"  a chunk, then another every 200 ms for <ms>, then end_turn (a long-running model turn)
 *              "kimi-sub-bash <command>" / "kimi-sub-write <path>"  a Kimi sub-agent's permission request (tool name
                          only; its call in the sub-agent's interaction.request record); the outcome is echoed
              "kimi-bg-ask"  a background AskUserQuestion: the turn ends with the question open; the answer is logged
              "qwen-wf-ask"  a permission request from an agent inside a running Qwen workflow; the outcome is echoed
              "qwen-shell <command>"  a run_shell_command permission request (Qwen's shape: rawInput.command); the
 *                          outcome is echoed
 *              "/compact <instructions>"  answers at once as MiniMax Code does: 'Compaction completed. Messages: 2 → 1
 *                          Tokens: 11,151 → 11,050', or 'No compaction is needed …' when the instructions say 'nothing'
 *              "workflow"  Qwen's workflow tool: a live phase-tree update, a registry entry with two dispatches
 *                          (qwen/status/session/tasks), then the final display
 *              qwen/control/session/branch | rewind | cd, qwen/status/session/tasks, qwen/control/session/task/cancel
 *              "qwen-bg"   Qwen background work in its task registry: a running background shell and a background agent
 *                          (qwen/status/session/tasks without workflows; cancelled with qwen/control/session/task/cancel)
 *              qwen/status/session/rewind_snapshots (one checkpoint per prompt so far); rewind answers filesChanged
 *              "kimi-self <ms>"  as Kimi Code: the turn ends, then a background task's completion starts a turn of its
 *                          own that only the main log records (turn.prompt origin 'task', a Bash call, a reply, usage,
 *                          turn.ended after <ms>); a prompt sent meanwhile is refused as busy (Kimi's engine queues it)
 *   reopen     $FAKE_ACP_REOPEN_AUTH=1: session/resume and session/load fail 'Authentication required' (-32000)
 *   modes      $FAKE_ACP_MODES=1: sessions also report ACP modes (currentModeId always 'default', as Kimi does)
 *              and take session/set_mode
 */
import fs from 'node:fs'
import path from 'node:path'
import { LineTransport, RpcError } from '../src/transport.js'

const MODELS = {
  'm-plain': { name: 'Plain', efforts: null },
  'm-toggle': { name: 'Toggle', efforts: ['off', 'on'] },
  'm-effort': { name: 'Effort', efforts: ['off', 'low', 'medium', 'high'] },
}
const sessions = new Map()
let counter = 0
const log = (method, params) => { if (process.env.FAKE_ACP_LOG) fs.appendFileSync(process.env.FAKE_ACP_LOG, `${JSON.stringify({ method, params })}\n`) }

function configOptions(session) {
  const model = MODELS[session.model]
  const options = [{ id: 'model', name: 'Model', category: 'model', type: 'select', currentValue: session.model, options: Object.entries(MODELS).map(([value, entry]) => ({ value, name: entry.name })) }]
  if (model.efforts) options.push({ id: 'thinking', name: 'Thinking', category: 'thought_level', type: 'select', currentValue: session.effort, options: model.efforts.map((value) => ({ value, name: `Thinking ${value}` })) })
  options.push({ id: 'mode', name: 'Mode', category: 'mode', type: 'select', currentValue: 'default', options: [{ value: 'default', name: 'Default' }, { value: 'plan', name: 'Plan' }] })
  return options
}

const defaultEffort = (model) => (MODELS[model].efforts ? (MODELS[model].efforts.includes('medium') ? 'medium' : 'on') : null)
const chunk = (sessionId, text) => transport.notify('session/update', { sessionId, update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const workflowTasks = []
const backgroundTasks = []
const selfTurn = { running: false }
let promptsSeen = 0
const mainWire = (id) => path.join(process.env.FAKE_ACP_WIRE, id, 'agents', 'main', 'wire.jsonl')
const appendWire = (id, record) => { fs.mkdirSync(path.dirname(mainWire(id)), { recursive: true }); fs.appendFileSync(mainWire(id), `${JSON.stringify(record)}\n`) }
const toolUpdate = (sessionId, update) => transport.notify('session/update', { sessionId, update })

async function prompt(params) {
  const session = sessions.get(params.sessionId)
  const text = (params.prompt ?? []).map((block) => block?.text ?? '').join('\n').trim()
  const id = params.sessionId
  promptsSeen++
  // Kimi's engine queues a prompt that arrives during a turn it started itself: ACP answers end_turn with nothing.
  if (selfTurn.running) return { stopReason: 'end_turn' }
  // A continuation (Qwen's trusted continue meta on an empty prompt): the turn resumes without a new user message.
  if (params._meta?.['qwen.daemon.continueLastTurn'] === true && !text) { chunk(id, 'continued'); return { stopReason: 'end_turn' } }
  if (text === 'qwen-bg') {
    backgroundTasks.push({ kind: 'shell', id: 'bg-shell-1', label: 'npm run dev', description: 'dev server', status: 'running', startTime: Date.now(), runtimeMs: 0, command: 'npm run dev', cwd: '/tmp/proj', pid: 4242 })
    backgroundTasks.push({ kind: 'agent', id: 'bg-agent-1', label: 'explore the repo', description: 'explore the repo', status: 'running', startTime: Date.now(), runtimeMs: 0, isBackgrounded: true, subagentType: 'Explore', toolUseId: 'agent-call-1' })
    backgroundTasks.push({ kind: 'agent', id: 'fg-agent-1', label: 'inline', description: 'inline', status: 'running', startTime: Date.now(), runtimeMs: 0, isBackgrounded: false })
    chunk(id, 'started in background')
    return { stopReason: 'end_turn' }
  }
  if (text.startsWith('kimi-self') && process.env.FAKE_ACP_WIRE) {
    const ms = Number(text.split(/\s+/)[1]) || 600
    const turn = promptsSeen * 10
    appendWire(id, { type: 'turn.prompt', agentId: 'main', input: [{ type: 'text', text }], origin: { kind: 'user' }, turnId: turn, time: Date.now() })
    appendWire(id, { type: 'context.append_loop_event', agentId: 'main', event: { type: 'tool.call', turnId: String(turn), toolCallId: 'c1', name: 'Bash', args: { command: 'sleep 1; echo done', run_in_background: true } } })
    appendWire(id, { type: 'task.started', agentId: 'main', info: { taskId: 'bash-1', description: 'slow job', status: 'running', kind: 'process', command: 'sleep 1; echo done', parentToolCallId: 'c1' } })
    appendWire(id, { type: 'turn.ended', agentId: 'main', turnId: turn, reason: 'completed' })
    setTimeout(async () => {
      selfTurn.running = true
      appendWire(id, { type: 'task.terminated', agentId: 'main', info: { taskId: 'bash-1', description: 'slow job', status: 'completed', kind: 'process' } })
      appendWire(id, { type: 'turn.prompt', agentId: 'main', input: [{ type: 'text', text: '<notification id="task:bash-1:completed" category="task" type="task.completed">\nTitle: Background process completed\nSeverity: info\nslow job completed.\n</notification>' }], origin: { kind: 'task', taskId: 'bash-1', status: 'completed' }, turnId: turn + 1, time: Date.now() })
      appendWire(id, { type: 'context.append_loop_event', agentId: 'main', event: { type: 'tool.call', turnId: String(turn + 1), toolCallId: 'c2', name: 'Read', args: { path: '/tmp/output.log' } } })
      await sleep(ms / 2)
      appendWire(id, { type: 'context.append_loop_event', agentId: 'main', event: { type: 'tool.result', toolCallId: 'c2', result: { output: 'done' } } })
      appendWire(id, { type: 'usage.record', agentId: 'main', model: 'local', usage: { inputOther: 70, output: 7, inputCacheRead: 0, inputCacheCreation: 0 } })
      appendWire(id, { type: 'context.append_loop_event', agentId: 'main', event: { type: 'content.part', turnId: String(turn + 1), part: { type: 'text', text: 'The job finished.' } } })
      await sleep(ms / 2)
      appendWire(id, { type: 'turn.ended', agentId: 'main', turnId: turn + 1, reason: 'completed' })
      selfTurn.running = false
    }, 150)
    chunk(id, 'started')
    return { stopReason: 'end_turn' }
  }
  if (text === 'kimi-fail' && process.env.FAKE_ACP_WIRE) {
    appendWire(id, { type: 'turn.started', agentId: 'main', turnId: 1 })
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'glob-1', title: 'Searching *', kind: 'read', status: 'in_progress', rawInput: { pattern: '*' } })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: 'glob-1', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'a.txt' } }] })
    appendWire(id, { type: 'turn.step.retrying', agentId: 'main', turnId: 1, step: 2, failedAttempt: 1, nextAttempt: 2, maxAttempts: 4, delayMs: 10, errorName: 'APIProviderRateLimitError', errorMessage: '429 slow down', statusCode: 429 })
    await sleep(900)
    appendWire(id, { type: 'turn.ended', agentId: 'main', turnId: 1, reason: 'failed', error: { code: 'provider.api_error', name: 'APIProviderQuotaExhaustedError', message: '429 You exceeded your current token quota, please check your account balance', retryable: false } })
    return { stopReason: 'end_turn' }
  }
  // Gemini's silent stops: a blocked reply (nothing at all, or only thoughts) and a stop after a tool call.
  if (text === 'silent-empty') {
    transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'thinking' } } })
    return { stopReason: 'end_turn' }
  }
  if (text === 'silent-after-tool') {
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'read-1', title: 'Reading a.txt', kind: 'read', status: 'in_progress', rawInput: { path: 'a.txt' } })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: 'read-1', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'a' } }] })
    return { stopReason: 'end_turn' }
  }
  // A request outside any turn (MiniMax's background-task follow-up): the prompt ends, then the agent asks on its own.
  if (text === 'stray-permission') {
    setTimeout(async () => {
      const result = await transport.call('session/request_permission', {
        sessionId: id, toolCall: { toolCallId: 'perm-stray-1', title: 'write', name: 'write', kind: 'edit', rawInput: { path: 'later.txt', content: 'x' } },
        options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
      }).catch(() => null)
      log('stray-answer', result)
    }, 150)
    chunk(id, 'prompt done')
    return { stopReason: 'end_turn' }
  }
  if (text.startsWith('kimi-bash ')) {
    const command = text.slice('kimi-bash '.length)
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'bash-1', title: `Running: ${command}`, kind: 'execute', status: 'pending' })
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall: { toolCallId: 'bash-1', title: 'Bash', content: [{ type: 'content', content: { type: 'text', text: `Requesting approval to run ${command}` } }] },
      options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'approve_always', name: 'Approve for this session', kind: 'allow_always' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
    })
    chunk(id, `bash:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  // Kimi's EnterPlanMode, asked about first; the outcome is echoed.
  if (text === 'enter-plan') {
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'EnterPlanMode-1', title: 'EnterPlanMode', kind: 'other', status: 'pending', rawInput: {} })
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall: { toolCallId: 'EnterPlanMode-1', title: 'EnterPlanMode', kind: 'other', rawInput: {} },
      options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
    })
    chunk(id, `plan:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  // An MCP tool call named as Kimi names one (mcp__<server>__<tool>), asked about first.
  if (text.startsWith('mcp-call ')) {
    const name = text.slice('mcp-call '.length)
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'mcp-1', title: name, kind: 'other', status: 'pending', rawInput: {} })
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall: { toolCallId: 'mcp-1', title: name, kind: 'other', rawInput: {} },
      options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
    })
    chunk(id, `mcp:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  if (text === 'kimi-hook-block' && process.env.FAKE_ACP_WIRE) {
    appendWire(id, { type: 'context.append_message', agentId: 'main', message: { role: 'assistant', content: [{ type: 'text', text: '<hook_result hook_event="UserPromptSubmit">\nPrompts mentioning secrets are blocked by policy\n</hook_result>' }], toolCalls: [], origin: { kind: 'hook_result', event: 'UserPromptSubmit', blocked: true } } })
    appendWire(id, { type: 'context.append_message', agentId: 'main', message: { role: 'user', content: [{ type: 'text', text }], toolCalls: [], origin: { kind: 'user' } } })
    appendWire(id, { type: 'prompt.completed', agentId: 'main', reason: 'blocked' })
    return { stopReason: 'end_turn' }
  }
  // Kimi's sub-agent asking (Agent launch, its agent-0 log with the interaction.request approval record, and a
  // permission request naming only the tool, '0:<call id>', no rawInput): "kimi-sub-bash <command>" / "kimi-sub-write
  // <path>". The outcome is echoed.
  if ((text.startsWith('kimi-sub-bash ') || text.startsWith('kimi-sub-write ')) && process.env.FAKE_ACP_WIRE) {
    const bash = text.startsWith('kimi-sub-bash ')
    const arg = text.slice(bash ? 'kimi-sub-bash '.length : 'kimi-sub-write '.length)
    const dir = path.join(process.env.FAKE_ACP_WIRE, id, 'agents', 'agent-0')
    const file = path.join(dir, 'wire.jsonl')
    const line = (record) => fs.appendFileSync(file, `${JSON.stringify({ ...record, time: Date.now() })}\n`)
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: '0:call-agent', title: 'Launching coder agent: do the task', kind: 'other', status: 'in_progress', rawInput: { description: 'do the task', prompt: 'SUB: do the task' } })
    fs.mkdirSync(dir, { recursive: true })
    line({ type: 'turn.prompt', agentId: 'agent-0', input: [{ type: 'text', text: 'SUB: do the task' }], turnId: 0 })
    const request = bash
      ? { toolCallId: 'call_sub1', toolName: 'Bash', action: `Running: ${arg}`, display: { kind: 'command', command: arg } }
      : { toolCallId: 'call_sub1', toolName: 'Write', action: `Writing ${arg}`, display: { kind: 'file_io', operation: 'write', path: arg, content: 'hello\n' } }
    line({ type: 'interaction.request', agentId: 'agent-0', kind: 'approval', request })
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall: { toolCallId: '0:call_sub1', title: bash ? 'Bash' : 'Write', content: [{ type: 'content', content: { type: 'text', text: `Requesting approval to ${request.action}` } }] },
      options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'approve_always', name: 'Approve for this session', kind: 'allow_always' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
    })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: '0:call-agent', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'agent_id: agent-0\nsub done' } }] })
    line({ type: 'turn.ended', agentId: 'agent-0', turnId: 0, reason: 'completed' })
    chunk(id, `sub:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  // Kimi's AskUserQuestion with background: true: the tool returns at once with its task id and the turn ends while
  // the question (elicitation/create) stays open; its answer is logged (FAKE_ACP_LOG 'background-answer').
  if (text === 'kimi-bg-ask') {
    const input = { questions: [{ question: 'Which color?', header: 'Color', options: [{ label: 'Red', description: 'r' }, { label: 'Blue', description: 'b' }] }], background: true }
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: '0:call-ask', title: 'AskUserQuestion', kind: 'other', status: 'in_progress', rawInput: input })
    transport.call('elicitation/create', {
      sessionId: id, toolCallId: '0:call-ask', mode: 'form', message: 'Which color?',
      requestedSchema: { type: 'object', properties: { q0: { type: 'string', title: 'Color', oneOf: [{ const: 'Red', title: 'Red' }, { const: 'Blue', title: 'Blue' }] } } },
    }).then((answer) => log('background-answer', answer), (error) => log('background-answer', { error: String(error?.message ?? error) }))
    await sleep(30)
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: '0:call-ask', title: 'Starting background question: Which color?', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'task_id: question-abc\nstatus: running' } }] })
    chunk(id, 'asked')
    return { stopReason: 'end_turn' }
  }
  // An agent inside a running Qwen workflow asks (toolCallId workflow:<session>:<run>:<id>, _meta.workflowApproval).
  if (text === 'qwen-wf-ask') {
    const toolCall = { toolCallId: `workflow:${id}:wf_77aa00:wfap_1`, title: 'echo inner', kind: 'execute', rawInput: { command: 'echo inner' }, _meta: { toolName: 'run_shell_command', workflowApproval: true } }
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall,
      options: [{ optionId: 'proceed_once', name: 'Allow once', kind: 'allow_once' }, { optionId: 'cancel', name: 'Reject', kind: 'reject_once' }],
    })
    chunk(id, `wf-shell:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  if (text.startsWith('qwen-shell ')) {
    const command = text.slice('qwen-shell '.length)
    const toolCall = { toolCallId: 'shell-1', title: command, kind: 'execute', rawInput: { command }, _meta: { toolName: 'run_shell_command' } }
    toolUpdate(id, { sessionUpdate: 'tool_call', ...toolCall, status: 'pending' })
    const result = await transport.call('session/request_permission', {
      sessionId: id, toolCall,
      options: [{ optionId: 'proceed_once', name: 'Allow once', kind: 'allow_once' }, { optionId: 'proceed_always', name: 'Always allow', kind: 'allow_always' }, { optionId: 'cancel', name: 'Reject', kind: 'reject_once' }],
    })
    chunk(id, `shell:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  if (text.startsWith('/compact ')) {
    chunk(id, /nothing/.test(text) ? 'No compaction is needed for this conversation yet.' : 'Compaction completed.\nMessages: 2 → 1\nTokens: 11,151 → 11,050')
    return { stopReason: 'end_turn' }
  }
  if (text === 'mm-ask') {
    // MiniMax's ask_user shape (mcode questionnaireElicitation): the field title is the whole question.
    const question = 'Deploy the site in ./dist to the public URL https://foo.minimax.io as a new public release, replacing the current version?'
    const answer = await transport.call('elicitation/create', {
      sessionId: id, mode: 'form', message: 'Confirm deploy',
      requestedSchema: { type: 'object', properties: {
        q1_deploy: { type: 'string', title: question, description: 'This replaces what visitors see now.', oneOf: [{ const: 'yes', title: 'Deploy' }, { const: 'no', title: 'Cancel' }] },
        q1_deploy__other: { type: 'string', title: `${question} — Other` },
      } },
    })
    chunk(id, `mm-answer:${JSON.stringify(answer)}`)
    return { stopReason: 'end_turn' }
  }
  if (text === 'workflow') {
    const meta = { toolName: 'workflow' }
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'wf-call', title: 'Workflow', kind: 'other', status: 'in_progress', rawInput: { script: 'phase("Scan")' }, _meta: meta })
    const live = { runId: 'wf_1234abcd', meta: { name: 'audit', description: 'Audit the repo', phases: [{ title: 'Scan' }, { title: 'Report' }] }, status: 'running', currentPhase: 'Scan', phases: ['Scan'], agentsDispatched: 2, agentsCompleted: 0 }
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: 'wf-call', status: 'in_progress', content: [{ type: 'content', content: { type: 'text', text: '```json\n' + JSON.stringify(live) + '\n```' } }], _meta: meta })
    workflowTasks.push({ kind: 'workflow', id: 'wf_1234abcd', toolUseId: 'wf-call', label: 'audit', description: 'Audit the repo', status: 'running', startTime: Date.now(), runtimeMs: 0, isBackgrounded: false, currentPhase: 'Scan',
      phaseVisits: [{ id: 'v1', index: 0, title: 'Scan', startedAt: Date.now() }],
      dispatches: [{ id: 'd1', phaseVisitId: 'v1', label: 'scan src', prompt: 'p', status: 'completed', dependsOn: [], queuedAt: 1, startedAt: 1000, endedAt: 4000 }, { id: 'd2', phaseVisitId: 'v1', label: 'scan docs', prompt: 'p', status: 'running', dependsOn: [], queuedAt: 1, startedAt: 2000 }],
      agentsDispatched: 2, agentsCompleted: 1, tokensSpent: 1200, tokenBudgetTotal: null, recentLogs: [], pendingApprovalCount: 0 })
    await sleep(2200)
    const done = { runId: 'wf_1234abcd', meta: live.meta, phases: ['Scan', 'Report'], logs: [], result: 'ok' }
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: 'wf-call', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: '```json\n' + JSON.stringify(done) + '\n```' } }], _meta: meta })
    chunk(id, 'workflow done')
    return { stopReason: 'end_turn' }
  }
  // A background workflow start: 'workflow-bg-lost' leaves Qwen's registry without it (a restart reaped it),
  // 'workflow-bg-done' files it as a finished run in the session's history (isHistorical, as a persisted snapshot).
  // 'workflow-bg-pause': a background run that stays live in the registry, paused and resumed by workflow-action.
  if (text === 'workflow-bg-pause') {
    const meta = { toolName: 'workflow' }
    const runId = 'wf_bb30'
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: `${runId}-call`, title: 'Workflow', kind: 'other', status: 'in_progress', rawInput: { script: 'phase("Scan")', run_in_background: true }, _meta: meta })
    workflowTasks.push({ kind: 'workflow', id: runId, toolUseId: `${runId}-call`, label: 'bg', description: 'bg', status: 'running', startTime: Date.now(), runtimeMs: 0, isBackgrounded: true, currentPhase: 'Scan', phaseVisits: [], dispatches: [], agentsDispatched: 0, agentsCompleted: 0, tokensSpent: 5, tokenBudgetTotal: null, recentLogs: [], pendingApprovalCount: 0 })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: `${runId}-call`, status: 'completed', content: [{ type: 'content', content: { type: 'text', text: `Workflow ${runId} started in the background (status: running).` } }], _meta: meta })
    chunk(id, 'started')
    return { stopReason: 'end_turn' }
  }
  if (text === 'workflow-bg-lost' || text === 'workflow-bg-done') {
    const meta = { toolName: 'workflow' }
    const runId = text === 'workflow-bg-lost' ? 'wf_bb10' : 'wf_bb20'
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: `${runId}-call`, title: 'Workflow', kind: 'other', status: 'in_progress', rawInput: { script: 'phase("Scan")', run_in_background: true }, _meta: meta })
    if (text === 'workflow-bg-done') workflowTasks.push({ kind: 'workflow', id: runId, isHistorical: true, toolUseId: `${runId}-call`, label: 'bg', description: 'bg', status: 'completed', startTime: Date.now() - 50, endTime: Date.now(), runtimeMs: 50, isBackgrounded: false, currentPhase: 'Scan', phaseVisits: [], dispatches: [], agentsDispatched: 0, agentsCompleted: 0, tokensSpent: 30, tokenBudgetTotal: null, recentLogs: [], pendingApprovalCount: 0 })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: `${runId}-call`, status: 'completed', content: [{ type: 'content', content: { type: 'text', text: `Workflow ${runId} started in the background (status: running). Use Background Tasks to observe, cooperatively pause/resume, or stop it.` } }], _meta: meta })
    chunk(id, 'started')
    return { stopReason: 'end_turn' }
  }
  if (text === 'ask') {
    const answer = await transport.call('elicitation/create', {
      sessionId: id, toolCallId: 'ask-1', mode: 'form', message: 'Pick a color?\nPick a size?',
      requestedSchema: { type: 'object', required: ['q0', 'q1'], properties: {
        q0: { type: 'array', title: 'Color', minItems: 1, items: { anyOf: [{ const: 'Red', title: 'Red', description: 'warm' }, { const: 'Blue', title: 'Blue', description: 'cool' }] } },
        q1: { type: 'string', title: 'Size', oneOf: [{ const: 'S', title: 'S', description: 'small' }, { const: 'L', title: 'L', description: 'large' }] },
      } },
    })
    chunk(id, `answer:${JSON.stringify(answer)}`)
    return { stopReason: 'end_turn' }
  }
  if (text === '/compact') {
    chunk(id, 'Context compaction started — it runs in the background and the compacted context applies once it finishes.')
    setTimeout(() => chunk(id, 'Compaction completed.\n- Messages compacted: 3\n- Tokens before: 1,000\n- Tokens after: 200'), 300)
    return { stopReason: 'end_turn' }
  }
  if (text === 'delegate') {
    const snapshot = (status) => ({ schemaVersion: 1, rootSessionId: id, members: [{ sessionId: 'child-1', parentSessionId: id, agentName: 'worker', task: 'child helper', status, createdAtMs: 1, updatedAtMs: 2 }] })
    transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'tool_call', toolCallId: 'call-task', title: 'task', kind: 'other', status: 'in_progress', rawInput: { description: 'child helper', prompt: 'say hi' } } })
    transport.notify('mcode/session/delegation_update', { sessionId: id, snapshot: snapshot('running') })
    await sleep(50)
    transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'tool_call_update', toolCallId: 'call-task', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'hi from child' } }] } })
    transport.notify('mcode/session/delegation_update', { sessionId: id, snapshot: snapshot('completed') })
    await sleep(50)
    return { stopReason: 'end_turn' }
  }
  if (text === 'goal') {
    setTimeout(async () => {
      transport.notify('_qwencode/start_turn', { sessionId: id })
      chunk(id, 'goal round')
      await sleep(300)
      transport.notify('_qwencode/end_turn', { sessionId: id })
    }, 100)
    chunk(id, 'goal set')
    return { stopReason: 'end_turn' }
  }
  if (text === 'cron') {
    setTimeout(async () => {
      transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'CRON_TICK' }, _meta: { source: 'cron' } } })
      chunk(id, 'tick reply')
      transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '' }, _meta: { usage: { inputTokens: 40, outputTokens: 4, totalTokens: 44 } } } })
    }, 100)
    chunk(id, 'scheduled')
    return { stopReason: 'end_turn' }
  }
  if (text === 'plan-options') {
    const result = await transport.call('session/request_permission', {
      sessionId: id,
      toolCall: {
        toolCallId: 'turn-1:plan-1', title: 'ExitPlanMode', kind: 'other',
        rawInput: { options: [{ label: 'Approach A', description: 'fast' }, { label: 'Approach B (Recommended)', description: 'safe' }] },
        content: [{ type: 'content', content: { type: 'text', text: 'Plan saved to: /tmp/plans/plan.md\n\n# Plan\nDo it' } }, { type: 'content', content: { type: 'text', text: 'Requesting approval to Presenting plan and exiting plan mode' } }],
      },
      options: [
        { optionId: 'plan_opt_0', name: 'Approach A', kind: 'allow_once' }, { optionId: 'plan_opt_1', name: 'Approach B (Recommended)', kind: 'allow_once' },
        { optionId: 'plan_revise', name: 'Revise', kind: 'reject_once' }, { optionId: 'plan_reject_and_exit', name: 'Reject and Exit', kind: 'reject_once' },
      ],
    })
    chunk(id, `picked:${result?.outcome?.optionId ?? result?.outcome?.outcome}`)
    return { stopReason: 'end_turn' }
  }
  // Kimi's background Agent launch: the call returns at once ('agent_id: agent-0, status: running') and the turn ends;
  // only then does the sub-agent's log appear (its prompt worded otherwise than the launch's), with a Bash approval
  // asked as '1:call_bg1' after the parent turn ended, then the sub-agent's reply and end.
  if (text === 'kimi-bg-agent' && process.env.FAKE_ACP_WIRE) {
    const dir = path.join(process.env.FAKE_ACP_WIRE, id, 'agents', 'agent-0')
    const file = path.join(dir, 'wire.jsonl')
    const line = (record) => fs.appendFileSync(file, `${JSON.stringify({ ...record, time: Date.now() })}\n`)
    const loop = (event) => line({ type: 'context.append_loop_event', agentId: 'agent-0', event })
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: '0:call-bg', title: 'Launching background coder agent: build it', kind: 'other', status: 'in_progress', rawInput: { description: 'build it', prompt: 'SUB_BG: build it', subagent_type: 'coder', run_in_background: true } })
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: '0:call-bg', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'task_id: agent-task-1\nstatus: running\nagent_id: agent-0\nactual_subagent_type: coder' } }] })
    setTimeout(async () => {
      fs.mkdirSync(dir, { recursive: true })
      line({ type: 'metadata', protocol_version: '1.5' })
      line({ type: 'turn.prompt', agentId: 'agent-0', input: [{ type: 'text', text: 'You are a coder.\n\nSUB_BG: build it' }], turnId: 0 })
      const request = { toolCallId: 'call_bg1', toolName: 'Bash', action: 'Running: echo built', display: { kind: 'command', command: 'echo built' } }
      line({ type: 'interaction.request', agentId: 'agent-0', kind: 'approval', request })
      const result = await transport.call('session/request_permission', {
        sessionId: id, toolCall: { toolCallId: '1:call_bg1', title: 'Bash', content: [{ type: 'content', content: { type: 'text', text: `Requesting approval to ${request.action}` } }] },
        options: [{ optionId: 'approve_once', name: 'Approve once', kind: 'allow_once' }, { optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
      }).catch((error) => ({ error: String(error?.message ?? error) }))
      log('bg-agent-approval', result)
      loop({ type: 'tool.call', toolCallId: 'call_bg1', name: 'Bash', args: { command: 'echo built' } })
      loop({ type: 'tool.result', toolCallId: 'call_bg1', result: { output: 'built' } })
      loop({ type: 'content.part', part: { type: 'text', text: 'bg sub done' } })
      line({ type: 'turn.ended', agentId: 'agent-0', turnId: 0, reason: 'completed' })
    }, 400)
    chunk(id, 'launched')
    return { stopReason: 'end_turn' }
  }
  // A failed MCP call worded as Gemini CLI words it (mcp-tool.ts "reported tool error for function call: …").
  if (text === 'gemini-mcp-error') {
    toolUpdate(id, { sessionUpdate: 'tool_call', toolCallId: 'mcp_code_desktop_run_in_terminal-1', title: 'run_in_terminal (code_desktop MCP Server)', kind: 'other', status: 'in_progress', rawInput: { command: 'echo hi' } })
    const call = { name: 'run_in_terminal', args: { command: 'echo hi' } }
    const response = [{ functionResponse: { name: 'run_in_terminal', response: { content: [{ type: 'text', text: 'You declined running this command in the terminal.' }], isError: true } } }]
    toolUpdate(id, { sessionUpdate: 'tool_call_update', toolCallId: 'mcp_code_desktop_run_in_terminal-1', status: 'failed', kind: 'other', content: [{ type: 'content', content: { type: 'text', text: `MCP tool 'run_in_terminal' reported tool error for function call: ${JSON.stringify(call)} with response: ${JSON.stringify(response)}` } }] })
    chunk(id, 'declined')
    return { stopReason: 'end_turn' }
  }
  // Usage only in the PromptResponse (Gemini's _meta.quota), as Gemini CLI reports it.
  if (text.startsWith('slow ')) {
    const until = Date.now() + Number(text.slice(5))
    chunk(id, 'working')
    while (Date.now() < until) { await sleep(200); chunk(id, '.') }
    return { stopReason: 'end_turn' }
  }
  if (text === 'quota-usage') {
    chunk(id, 'counted')
    return { stopReason: 'end_turn', _meta: { quota: { token_count: { input_tokens: 100, output_tokens: 10 }, model_usage: [{ model: session?.model ?? 'm-plain' }] } } }
  }
  if (text === 'kimi-agent' && process.env.FAKE_ACP_WIRE) {
    const dir = path.join(process.env.FAKE_ACP_WIRE, id, 'agents', 'agent-0')
    const file = path.join(dir, 'wire.jsonl')
    const line = (record) => fs.appendFileSync(file, `${JSON.stringify({ ...record, time: Date.now() })}\n`)
    const loop = (event) => line({ type: 'context.append_loop_event', agentId: 'agent-0', event })
    transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'tool_call', toolCallId: '0:call-agent', title: 'Launching coder agent: read the notes', kind: 'other', status: 'in_progress', rawInput: { description: 'read the notes', prompt: 'SUB: read notes.md' } } })
    fs.mkdirSync(dir, { recursive: true })
    line({ type: 'metadata', protocol_version: '1.5' })
    line({ type: 'turn.prompt', agentId: 'agent-0', input: [{ type: 'text', text: 'SUB: read notes.md' }], turnId: 0 })
    loop({ type: 'tool.call', toolCallId: 'c1', name: 'Read', args: { path: '/tmp/notes.md' } })
    loop({ type: 'tool.result', toolCallId: 'c1', result: { output: 'NOTES' } })
    await sleep(50)
    transport.notify('session/update', { sessionId: id, update: { sessionUpdate: 'tool_call_update', toolCallId: '0:call-agent', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'agent_id: agent-0\n[summary]\nsub done' } }] } })
    setTimeout(() => {
      loop({ type: 'content.part', part: { type: 'think', think: 'thinking' } })
      loop({ type: 'content.part', part: { type: 'text', text: 'sub done' } })
      line({ type: 'turn.ended', agentId: 'agent-0', turnId: 0, reason: 'completed' })
    }, 150)
    chunk(id, 'main done')
    return { stopReason: 'end_turn' }
  }
  if (text === 'usage' && process.env.FAKE_ACP_WIRE) {
    const dir = path.join(process.env.FAKE_ACP_WIRE, id, 'agents', 'main')
    fs.mkdirSync(dir, { recursive: true })
    const record = (usage) => `${JSON.stringify({ type: 'usage.record', agentId: 'main', model: session.model, usage, usageScope: 'turn', time: Date.now() })}\n`
    fs.appendFileSync(path.join(dir, 'wire.jsonl'), record({ inputOther: 100, output: 30, inputCacheRead: 20, inputCacheCreation: 0 }) + record({ inputOther: 50, output: 10, inputCacheRead: 0, inputCacheCreation: 5 }))
    // As Kimi does, the turn's end is persisted a moment after the prompt returns.
    setTimeout(() => fs.appendFileSync(path.join(dir, 'wire.jsonl'), `${JSON.stringify({ type: 'turn.ended', time: Date.now() })}\n`), 200)
  }
  chunk(id, `ok:${session.model}:${session.effort}`)
  return { stopReason: 'end_turn' }
}

const transport = new LineTransport(process.stdin, process.stdout, {
  onNotification: (method, params) => log(method, params),
  onClose: () => process.exit(0),
  log: () => {},
  onRequest: async (method, params) => {
    log(method, params)
    switch (method) {
      case 'initialize':
        // $FAKE_ACP_NO_RESUME=1: no session/resume (Gemini CLI): a reopen goes through session/load.
        return { protocolVersion: 1, agentCapabilities: { loadSession: true, promptCapabilities: { image: false, embeddedContext: false }, sessionCapabilities: { ...(process.env.FAKE_ACP_NO_RESUME === '1' ? {} : { resume: {} }), close: {} } } }
      case 'session/new':
      case 'session/resume':
      case 'session/load': {
        // $FAKE_ACP_REOPEN_AUTH=1: reopening a session fails as Gemini CLI's session/load does without a selected sign-in.
        if (method !== 'session/new' && process.env.FAKE_ACP_REOPEN_AUTH === '1') throw new RpcError(-32000, 'Authentication required')
        const sessionId = method === 'session/new' ? `fake-${process.pid}-${++counter}` : params.sessionId
        const model = sessions.get(sessionId)?.model ?? process.env.FAKE_ACP_MODEL ?? 'm-plain'
        const session = sessions.get(sessionId) ?? { model, effort: defaultEffort(model) }
        sessions.set(sessionId, session)
        if (method === 'session/load' && sessionId === 'child-1') transport.notify('session/update', { sessionId, update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'say hi' } } })
        if (method === 'session/load' && sessionId === 'child-1') chunk(sessionId, 'hi from child')
        // $FAKE_ACP_LATE_REPLAY=1: the history replay goes on after session/load answered (Gemini's unawaited streamHistory).
        if (method === 'session/load' && process.env.FAKE_ACP_LATE_REPLAY === '1') {
          setTimeout(() => {
            transport.notify('session/update', { sessionId, update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'earlier question' } } })
            chunk(sessionId, 'OLD-REPLY')
            toolUpdate(sessionId, { sessionUpdate: 'tool_call', toolCallId: 'old-call-1', title: 'Old call', kind: 'other', status: 'completed', rawInput: {} })
          }, 150)
        }
        return { sessionId, configOptions: configOptions(session), ...(process.env.FAKE_ACP_MODES ? { modes: { currentModeId: 'default', availableModes: [{ id: 'default', name: 'Default' }, { id: 'plan', name: 'Plan' }] } } : {}) }
      }
      case 'session/set_mode':
        return {}
      case 'session/set_config_option': {
        const session = sessions.get(params.sessionId)
        if (params.configId === 'model') {
          if (!MODELS[params.value]) throw new RpcError(-32602, 'unknown model')
          session.model = params.value
          session.effort = defaultEffort(params.value)
        } else if (params.configId === 'thinking') {
          if (!MODELS[session.model].efforts?.includes(params.value)) throw new RpcError(-32602, `Unknown thinking value: ${params.value}`)
          session.effort = params.value
        }
        return { configOptions: configOptions(session) }
      }
      case 'session/set_model':
        sessions.get(params.sessionId).model = params.modelId
        return {}
      case 'session/prompt':
        return prompt(params)
      case 'session/close':
        return {}
      case 'mcode/session/delegation/stop':
        return { receipt: { stopped: 1 } }
      case 'qwen/control/session/branch': {
        const newSessionId = `fork-${process.pid}-${++counter}`
        sessions.set(newSessionId, { ...sessions.get(params.sessionId) })
        return { newSessionId, title: 'fork' }
      }
      case 'qwen/control/session/rewind':
        return params.rewindFiles && params.promptId ? { success: true, filesChanged: ['/tmp/proj/a.txt'], filesFailed: [] } : { success: true, filesChanged: [], filesFailed: [] }
      case 'qwen/status/session/rewind_snapshots':
        return { snapshots: Array.from({ length: promptsSeen }, (_, index) => ({ promptId: `${params.sessionId}########${index + 1}`, turnIndex: index, timestamp: new Date().toISOString() })) }
      // Qwen's recovery pre-check (Session.ts continueLastTurn): accepted when FAKE_ACP_CONTINUE says so.
      case 'qwen/control/session/continue':
        return { accepted: process.env.FAKE_ACP_CONTINUE === 'accept', interruption: process.env.FAKE_ACP_CONTINUE === 'accept' ? 'interrupted_turn' : 'none' }
      case 'qwen/control/session/cd':
        return { previousCwd: '/before', newCwd: params.path, warnings: [] }
      case 'qwen/status/session/tasks':
        return { v: 1, sessionId: params.sessionId, now: Date.now(), tasks: [...(params.includeWorkflows ? workflowTasks : []), ...backgroundTasks] }
      // Qwen's cooperative pause / resume of a live run (acpAgent sessionWorkflowTaskAction).
      case 'qwen/control/session/task/workflow-action': {
        const task = workflowTasks.find((entry) => entry.id === params.taskId)
        if (!task || !['pause', 'resume'].includes(params.action)) return { changed: false }
        const want = params.action === 'pause' ? 'paused' : 'running'
        if (task.status === want || !['running', 'paused'].includes(task.status)) return { changed: false, status: task.status }
        task.status = want
        return { changed: true, status: want }
      }
      case 'qwen/control/session/task/cancel': {
        const task = workflowTasks.find((entry) => entry.id === params.taskId)
        if (task) task.status = 'cancelled'
        const background = backgroundTasks.find((entry) => entry.id === params.taskId && entry.kind === params.taskKind)
        if (background) { background.status = 'cancelled'; return { cancelled: true, status: 'running' } }
        return {}
      }
      default:
        throw new RpcError(-32601, `${method} is not supported`)
    }
  },
})
transport.start()
