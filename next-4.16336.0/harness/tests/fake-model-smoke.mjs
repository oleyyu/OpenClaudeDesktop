// End-to-end smoke of the real DeepSeek Harness core against a scripted model:
// a local Anthropic-Messages server (DEEPSEEK_BASE_URL) answers every request,
// so no key or network is needed. Covers what unit tests cannot: the bridge's
// scoped prompt sections and tools on a live agent, and the Harness `workflow`
// tool's run as item.workflowRun, background terminals (a bash job), thread/fork
// and the core's own slash commands.
//
// Usage: node tests/fake-model-smoke.mjs   (exit code 0 = all checks passed)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
// The client drops the core's stderr; keep it for failure reports.
const stderr = []
const childProcess = require('node:child_process')
const spawn = childProcess.spawn
childProcess.spawn = (...args) => {
  const child = spawn(...args)
  child.stderr?.on('data', (chunk) => stderr.push(String(chunk)))
  return child
}
const { CodexClient } = require('../../app/electron/codex.cjs')

const cleanup = []
const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cd-fake-model-')))
const workspace = path.join(home, 'workspace')
await fs.mkdir(workspace, { recursive: true })
const pluginRoot = path.join(workspace, 'fixture-plugin')
for (const directory of ['.claude/agents', '.claude/skills/review', 'fixture-plugin/.claude-plugin', 'fixture-plugin/agents/security', 'fixture-plugin/skills/review']) await fs.mkdir(path.join(workspace, directory), { recursive: true })
await fs.mkdir(path.join(home, '.claude/plugins'), { recursive: true })
await fs.writeFile(path.join(home, '.claude/settings.json'), JSON.stringify({ enabledPlugins: { 'fixture-kit@local': true } }))
await fs.writeFile(path.join(home, '.claude/plugins/installed_plugins.json'), JSON.stringify({ plugins: { 'fixture-kit@local': [{ scope: 'user', installPath: pluginRoot }] } }))
await fs.writeFile(path.join(pluginRoot, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture-kit' }))
await fs.writeFile(path.join(workspace, '.claude/agents/different-filename.md'), '---\nname: reviewer\ndescription: Review code\ntools: [Read, NotInstalled]\nskills: [review]\n---\nPROJECT_AGENT_PERSONA')
await fs.writeFile(path.join(workspace, '.claude/skills/review/SKILL.md'), '---\nname: review\ndescription: Review code\n---\nPROJECT_REVIEW_SKILL: check lifecycle state.')
await fs.writeFile(path.join(pluginRoot, 'agents/security/check.md'), '---\nname: reviewer\ntools: [Read, Bash]\npermissionMode: plan\nskills: ["fixture-kit:review"]\n---\nPLUGIN_AGENT_PERSONA: ${CLAUDE_PLUGIN_ROOT}')
await fs.writeFile(path.join(pluginRoot, 'skills/review/SKILL.md'), '---\nname: review\ndescription: Plugin review\n---\nPLUGIN_REVIEW_SKILL: inspect ${CLAUDE_PLUGIN_ROOT}/rules.')
await fs.writeFile(path.join(home, '.claude.json'), JSON.stringify({ projects: { [workspace]: { hasTrustDialogAccepted: true } } }))
await fs.writeFile(path.join(workspace, '.claude/agents/guarded.md'), '---\nname: guarded\ndescription: Hook integration fixture\ntools: [Bash]\nhooks: ' + JSON.stringify({
  PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node agent-pre.cjs' }] }],
  Stop: [{ hooks: [{ type: 'command', command: 'node agent-stop.cjs' }] }],
}) + '\n---\nGUARDED_AGENT_PERSONA')
await fs.writeFile(path.join(workspace, 'agent-pre.cjs'), `let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const p=JSON.parse(s);if(p.tool_input.command.includes('hook-denied.txt')){process.stderr.write('AGENT_HOOK_DENIED');process.exitCode=2}else console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',additionalContext:'AGENT_HOOK_CONTEXT',updatedInput:{...p.tool_input,command:p.tool_input.command.replace('printf allowed','printf rewritten')}}}))})`)
await fs.writeFile(path.join(workspace, '.claude/agents/bash-exits.md'), '---\nname: bash-exits\ndescription: Classify shell exits\ntools: [Bash]\nhooks: ' + JSON.stringify({
  PostToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node bash-exits.cjs' }] }],
  PostToolUseFailure: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node bash-exits.cjs' }] }],
}) + '\n---\nBASH_EXITS_PERSONA\n')
await fs.writeFile(path.join(workspace, 'bash-exits.cjs'), `let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const p=JSON.parse(s);require('fs').appendFileSync('bash-exits.jsonl',JSON.stringify({event:p.hook_event_name,command:p.tool_input.command})+'\\n');console.log(JSON.stringify({hookSpecificOutput:{hookEventName:p.hook_event_name,additionalContext:p.hook_event_name+'_EXIT_FEEDBACK'}}))})`)
await fs.writeFile(path.join(workspace, 'agent-stop.cjs'), `let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const p=JSON.parse(s);require('fs').appendFileSync('agent-stop-input.jsonl',JSON.stringify({event:p.hook_event_name,type:p.agent_type,active:p.stop_hook_active,answer:p.last_assistant_message})+'\\n');console.log(JSON.stringify(p.stop_hook_active?{}:{decision:'block',reason:'AGENT_HOOK_CONTINUE'}))})`)
await fs.writeFile(path.join(workspace, '.claude/agents/bounded.md'), '---\nname: bounded\ndescription: Iteration limit fixture\ntools: [Bash]\neffort: low\nmaxTurns: 1\n---\nBOUNDED_AGENT_PERSONA')
for (const point of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Stop']) {
  await fs.writeFile(path.join(workspace, `.claude/agents/halt-${point}.md`), '---\nname: halt-' + point + '\ndescription: Hook stop fixture\ntools: [Bash, Read]\nhooks: ' + JSON.stringify({
    [point]: [{ hooks: [{ type: 'command', command: 'node agent-halt.cjs' }] }],
  }) + '\n---\nHALT_AGENT_PERSONA_' + point)
}
await fs.writeFile(path.join(workspace, 'agent-halt.cjs'), `console.log(JSON.stringify({continue:false,stopReason:'AGENT_HOOK_HALT',decision:'block',reason:'This must not force continuation'}))`)
const mcpFixture = path.resolve('..', 'vendor/deepseek-harness/packages/subagent/subagent-spawn-in-process/tests/fixtures/agent-mcp.mjs')
await fs.copyFile(mcpFixture, path.join(workspace, 'agent-mcp.mjs'))
await fs.writeFile(path.join(workspace, 'agent-mcp.jsonl'), '')
await fs.writeFile(path.join(workspace, '.claude/agents/mcp-worker.md'), '---\nname: mcp-worker\ndescription: MCP integration fixture\ntools: [Bash]\ndisallowedTools: [mcp__fixture__blocked, mcp__fixture__late]\nmcpServers: [fixture]\n---\nMCP_AGENT_PERSONA')
await fs.writeFile(path.join(workspace, '.claude/settings.json'), JSON.stringify({ enabledMcpjsonServers: ['fixture'] }))
await fs.writeFile(path.join(workspace, '.mcp.json'), JSON.stringify({ mcpServers: { fixture: { command: process.execPath, args: ['${DSH_AGENT_MCP_SCRIPT:-agent-mcp.mjs}'], env: { AGENT_MCP_LOG: path.join(workspace, 'agent-mcp.jsonl') } } } }))
await fs.writeFile(path.join(workspace, '.claude/agents/resource-worker.md'), '---\nname: resource-worker\ndescription: MCP resource integration fixture\ntools: [ReadMcpResource]\ndisallowedTools: [mcp__fixture__*]\nmcpServers: [fixture]\n---\nRESOURCE_AGENT_PERSONA')
await fs.writeFile(path.join(workspace, '.claude/agents/resource-catalog.md'), '---\nname: resource-catalog\ndescription: Aggregate resource discovery fixture\ntools: [ListMcpResourcesTool]\ndisallowedTools: [mcp__fixture__*]\nmcpServers: [fixture]\n---\nRESOURCE_CATALOG_PERSONA')
const requests = []

// ------------------------------------------------------------ scripted model

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
const systemOf = (body) => textOf(Array.isArray(body.system) ? body.system : body.system ?? '')
const lastUser = (body) => [...body.messages].reverse().find((message) => message.role === 'user')
const hasToolResult = (body, name) => body.messages.some((message) => message.role === 'assistant' && Array.isArray(message.content) && message.content.some((block) => block.type === 'tool_use' && block.name === name))
  && lastUser(body)?.content?.some?.((block) => block.type === 'tool_result')

const WORKFLOW_SCRIPT = `
export const meta = {name:"fake-audit",description:"Fake audit workflow",phases:[{title:"Scan"},{title:"Write"},{title:"Unused"}]}
phase('Scan')
const [a, b] = await parallel([
  () => agent('CHILD one: say hi', { label: 'child-one', phase: 'Scan' }),
  () => agent('CHILD two: report', { label: 'child-two', phase: 'Scan', schema: { type: 'object', properties: { verdict: { type: 'string' } }, required: ['verdict'], additionalProperties: false } }),
])
phase('Write')
const c = await agent('CHILD write: done', { label: 'child-write' })
return { a, b, c }
`

const SLOW_SCRIPT = `
phase('Wait')
const slow = await agent('CHILD slow: never answers', { label: 'slow' })
return { slow }
`

const memberAttempts = new Map()
function reply(body) {
  const tools = (body.tools ?? []).map((tool) => tool.name)
  const user = textOf(lastUser(body)?.content)
  // A child's own prompt is its first user message (the parent's history only quotes it in the script).
  const framedUser = textOf(body.messages.find((message) => message.role === 'user')?.content)
  const firstUser = framedUser.startsWith('[Workflow harness') ? framedUser.match(/^    (CHILD[^\n]*)/m)?.[1] ?? framedUser : framedUser
  const researchCapture = body.tools?.find(tool => tool.name === 'structured_output')
  if (framedUser.includes('INSTALLED_RESEARCH_QUESTION') && researchCapture) {
    if (hasToolResult(body, 'structured_output')) return { text: 'Research child completed' }
    const keys = Object.keys(researchCapture.input_schema?.properties ?? {})
    const input = keys.includes('angles') ? { angles: ['primary', 'recent', 'counter'].map(label => ({ label, query: label })) }
      : keys.includes('results') ? { results: [{ url: 'https://example.com/research', title: 'Research source', relevance: 'high' }] }
        : keys.includes('claims') ? { sourceQuality: 'primary', claims: [{ claim: 'A supported fact', quote: 'A source quote', importance: 'central' }] }
          : keys.includes('refuted') ? { refuted: false, confidence: 'high', evidence: 'Independent evidence' }
            : { summary: 'INSTALLED_RESEARCH_REPORT', findings: [{ claim: 'A supported fact', confidence: 'high', sources: ['https://example.com/research'], evidence: 'Independent evidence' }], caveats: 'Single source' }
    return { tool: { name: 'structured_output', input } }
  }
  const nativeCase = /\bRUN_NATIVE_(RESULT|STOP|OFF)\b/.exec(firstUser)?.[1]
  if (nativeCase) {
    const history = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : [])
    const settled = name => history.some(call => call.type === 'tool_use' && call.name === name && history.some(result => result.type === 'tool_result' && result.tool_use_id === call.id))
    if (!settled('RunWorkflow')) return { tool: { name: 'RunWorkflow', input: { script: 'export const meta={name:"native-protocol",description:"Native protocol fixture"}; ' + (nativeCase === 'STOP' ? 'await new Promise(() => {});' : '') + 'return {answer:42};' } } }
    if (nativeCase === 'STOP' && !settled('TaskStop')) {
      const id = /Task ID: (workflow-[0-9]+)/.exec(user)?.[1]
      if (id) return { tool: { name: 'TaskStop', input: { task_id: id } } }
    }
    const notice = body.messages.map(message => textOf(message.content)).find(text => text.includes('<task-notification>'))
    if (nativeCase === 'RESULT' && notice) {
      if (!settled('read')) return { tool: { name: 'read', input: { file_path: /<output-file>(.+)<\/output-file>/.exec(notice)?.[1] } } }
      return { text: 'NATIVE_NOTICE_RECEIVED' }
    }
    return { text: 'NATIVE_TOOL_RETURNED' }
  }
  if (/^CHILD retry-control/.test(firstUser)) { const attempt = (memberAttempts.get(firstUser) ?? 0) + 1; memberAttempts.set(firstUser, attempt); return attempt === 1 ? { hang: true } : { text: 'retried ok' } }
  if (/^CHILD (slow|skip-control)/.test(firstUser)) return { hang: true }
  if (/RUN_SLOW_BACKGROUND/.test(user) && !hasToolResult(body, 'Workflow'))
    return { tool: { name: 'Workflow', input: { script: 'export const meta={name:"slow-background",description:"Waits forever"};' + SLOW_SCRIPT } } }
  if (/RUN_SLOW_FOREGROUND/.test(user) && !hasToolResult(body, 'Workflow')) return { tool: { name: 'Workflow', input: { script: 'export const meta={name:"slow-foreground",description:"Rejected foreground flag"};' + SLOW_SCRIPT, run_in_background: false } } }
  if (user === 'RUN_DEFAULT_BACKGROUND') return { tool: { name: 'Workflow', input: { script: 'export const meta={name:"default-background",description:"Default execution mode"}; return 42' } } }
  if (user.startsWith('WORKFLOW_INPUT ')) return { tool: { name: 'Workflow', input: JSON.parse(user.slice('WORKFLOW_INPUT '.length).split('\n')[0]) } }
  const launchedJob = /Workflow launched in background\. Task ID: (\S+)/.exec(user)
  if (launchedJob && !/Waits forever/.test(user)) return { tool: { name: 'job_output', input: { job_id: launchedJob[1], wait: true } } }
  if (firstUser === 'CHILD lifecycle-batch') return { tools: [
    { name: 'structured_output', input: { value: 'first' } },
    { name: 'write', input: { file_path: 'lifecycle-batch.txt', content: 'LIFECYCLE_INSTALLED_MARKER' } },
    { name: 'structured_output', input: { value: 'second' } },
  ] }
  if (firstUser === 'CHILD lifecycle-cap') return { tools: [
    ...Array.from({ length: 5 }, () => ({ name: 'structured_output', input: { value: 1 } })),
    { name: 'write', input: { file_path: 'lifecycle-cap.txt', content: 'must not execute' } },
  ] }
  if (firstUser === 'CHILD schema-memo') {
    if (hasToolResult(body, 'structured_output')) return { text: 'SCHEMA_MEMO_DONE' }
    const schema = body.tools.find(tool => tool.name === 'structured_output').input_schema
    return { tool: { name: 'structured_output', input: { value: schema.properties.value.enum[0] } } }
  }
  if (/^CHILD schema-/.test(firstUser)) {
    const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use' && block.name === 'structured_output').length
    if (firstUser === 'CHILD schema-nudge' && !user.includes('[structured-output-enforce]')) return { text: 'I forgot to call the tool' }
    if (firstUser === 'CHILD schema-ignore') return { text: 'still prose' }
    const invalid = firstUser === 'CHILD schema-cap' || (firstUser === 'CHILD schema-repair' && calls === 0)
    return { tool: { name: 'structured_output', input: { answer: invalid ? -1 : 12, label: 'valid' } } }
  }
  if (/^CHILD clamp-/.test(firstUser)) {
    if (!hasToolResult(body, 'bash')) return { tool: { name: 'bash', input: { command: firstUser === 'CHILD clamp-allowed' ? "printf '%s\\n' good | cat > clamp-allowed.txt && printf '%s\\n' complete" : "printf '%s\\n' good > clamp-rejected.txt; touch clamp-bypass.txt", description: 'Workflow command-clamp fixture' } } }
    const result = lastUser(body).content.find(block => block.type === 'tool_result')
    return { text: result.is_error ? 'clamp denied' : 'clamp executed: ' + textOf(result.content) }
  }
  if (systemOf(body).includes('RESOURCE_CATALOG_PERSONA')) {
    if (!hasToolResult(body, 'list_mcp_resources')) return { tool: { name: 'list_mcp_resources', input: {} } }
    return { text: 'resource discovery complete' }
  }
  if (systemOf(body).includes('RESOURCE_AGENT_PERSONA')) {
    if (!hasToolResult(body, 'read_mcp_resource')) return { tool: { name: 'read_mcp_resource', input: { server: 'fixture', uri: 'fixture://guide' } } }
    return { text: 'agent resource complete' }
  }
  if (systemOf(body).includes('MCP_AGENT_PERSONA')) {
    if (!hasToolResult(body, 'mcp__fixture__echo')) return { tool: { name: 'mcp__fixture__echo', input: {} } }
    return { text: 'agent mcp complete' }
  }
  if (systemOf(body).includes('BOUNDED_AGENT_PERSONA')) {
    return { text: 'BOUNDED_PARTIAL', tool: { name: 'bash', input: { command: 'printf finished > bounded-tool.txt', description: 'Complete the last admitted tool' } } }
  }
  const haltPoint = /HALT_AGENT_PERSONA_(\w+)/.exec(systemOf(body))?.[1]
  if (haltPoint) {
    const text = 'HOOK_RETAINED_' + haltPoint
    if (tools.includes('structured_output')) return { text, tool: { name: 'structured_output', input: { answer: 42 } } }
    if (haltPoint === 'Stop') return { text }
    if (haltPoint === 'PostToolUseFailure') return { text, tool: { name: 'read', input: { file_path: 'halt-missing-file.txt' } } }
    return { text, tool: { name: 'bash', input: { command: `printf finished > halt-${haltPoint}.txt`, description: 'Hook stop fixture' } } }
  }
  if (systemOf(body).includes('BASH_EXITS_PERSONA')) {
    const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use' && block.name === 'bash').length
    const commands = ['printf failed; exit 3', 'printf haystack | grep needle', "printf haystack | grep '['"]
    if (calls < commands.length) return { tool: { name: 'bash', input: { command: commands[calls], description: 'Classify shell exit' } } }
    return { text: 'BASH_EXITS_COMPLETE' }
  }
  if (systemOf(body).includes('GUARDED_AGENT_PERSONA')) {
    const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use' && block.name === 'bash').length
    if (calls < 2) return { tool: { name: 'bash', input: { command: calls === 0 ? 'printf denied > hook-denied.txt' : 'printf allowed > hook-allowed.txt', description: 'Agent hook integration' } } }
    return { text: JSON.stringify(body.messages).includes('AGENT_HOOK_CONTINUE') ? 'agent hooks complete' : 'agent hooks first answer' }
  }
  if (JSON.stringify(body.messages).includes('CHILD agent-type-')) return { text: 'agent type ok' }
  // A workflow child (its prompt starts with CHILD).
  if (/^CHILD/.test(firstUser)) {
    if (tools.includes('structured_output') && !hasToolResult(body, 'structured_output')) return { tool: { name: 'structured_output', input: { verdict: 'fine' } } }
    return { text: 'child ok' }
  }
  if (tools.includes('structured_output') && !hasToolResult(body, 'structured_output')) return { tool: { name: 'structured_output', input: { answer: 'forty-two', count: 42 } } }
  const write = /WRITE_FILE (\S+)/.exec(user)
  if (write && !hasToolResult(body, 'write')) return { tool: { name: 'write', input: { file_path: write[1], content: 'written by an agent\n' } } }
  const sandboxCall = /^SANDBOX_(write|edit|bash)(_ESCALATE)? (\S+)/.exec(firstUser)
  if (sandboxCall) {
    const [, name, escalate, target] = sandboxCall
    if (name === 'edit' && !hasToolResult(body, 'read')) return { tool: { name: 'read', input: { file_path: target } } }
    const input = name === 'bash' ? { command: `printf 'after\\n' > '${target.replace(/'/g, "'\\''")}'`, description: 'Test sandbox write' }
      : name === 'edit' ? { file_path: target, old_string: 'before', new_string: 'after' } : { file_path: target, content: 'after\n' }
    if (escalate) Object.assign(input, { sandbox_permissions: 'danger-full-access', justification: 'Exercise the never-approval sandbox boundary.' })
    if (!hasToolResult(body, name)) return { tool: { name, input } }
  }
  if (/RUN_BG_JOB/.test(user) && !hasToolResult(body, 'bash'))
    return { tool: { name: 'bash', input: { command: "printf 'bg-ready\\n'; sleep 60", description: 'Start a background job', run_in_background: true } } }
  const resumeId = /RESUME_WORKFLOW (wf_[a-z0-9-]+)/.exec(user)?.[1]
  const savedPath = /^RUN_SAVED_WORKFLOW (.+)$/m.exec(user)?.[1]
  if (savedPath && !lastUser(body)?.content?.some?.(block => block.type === 'tool_result')) return { tool: { name: 'Workflow', input: { scriptPath: savedPath, script: 'export const meta={name:"inline-ignored",description:"Valid ignored inline"}; return 1' } } }
  if (user === 'RUN_NAMED_WORKFLOW') return { tool: { name: 'Workflow', input: { name: 'named-parity', args: ['array', null, 42] } } }
  if (resumeId && !lastUser(body)?.content?.some?.(block => block.type === 'tool_result')) return { tool: { name: 'Workflow', input: { script: WORKFLOW_SCRIPT, resumeFromRunId: resumeId } } }
  if (/RUN_WORKFLOW/.test(user) && !hasToolResult(body, 'Workflow')) {
    return { tool: { name: 'Workflow', input: { script: WORKFLOW_SCRIPT } } }
  }
  return { text: `plain reply to: ${user.slice(0, 40)}` }
}

function sse(res, events) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
}

let messageCounter = 0
const server = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: `${req.method} ${req.url}` } }))
    return
  }
  const body = JSON.parse(raw)
  requests.push(body)
  const answer = reply(body)
  // A child that never answers: held until the core aborts the request.
  if (answer.hang) {
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    res.write(`event: ping\ndata: {"type":"ping"}\n\n`)
    req.on('close', () => res.end())
    return
  }
  const id = `msg_${++messageCounter}`
  const usage = { input_tokens: 10, output_tokens: 5 }
  const start = ['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } }]
  const events = [start]
  const blocks = [
    ...(answer.text === undefined ? [] : [{ type: 'text', text: answer.text }]),
    ...(answer.tools ?? (answer.tool ? [answer.tool] : [])).map((tool, index) => ({ type: 'tool_use', id: `toolu_${messageCounter}_${index}`, name: tool.name, input: tool.input })),
  ]
  blocks.forEach((block, index) => {
    if (block.type === 'tool_use') {
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { ...block, input: {} } }])
      events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } }])
    } else {
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }])
      events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }])
    }
    events.push(['content_block_stop', { type: 'content_block_stop', index }])
  })
  events.push(['message_delta', { type: 'message_delta', delta: { stop_reason: answer.tool || answer.tools ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }])
  events.push(['message_stop', { type: 'message_stop' }])
  if (body.stream === false) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: answer.tool || answer.tools ? 'tool_use' : 'end_turn', stop_sequence: null, usage }))
    return
  }
  sse(res, events)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const baseURL = `http://127.0.0.1:${server.address().port}`

// ------------------------------------------------------------------- client

// All Claude plugin and user-agent fixtures belong to this test's private home.
process.env.HOME = home
process.env.DSH_HOME = path.join(home, 'dsh')
process.env.CODE_DESKTOP_CORE_STATE = path.join(home, 'state')
process.env.DEEPSEEK_BASE_URL = baseURL
process.env.DEEPSEEK_API_KEY = 'sk-fake-model-smoke'
const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
const events = []
let waiters = []
client.on('event', (event) => {
  events.push(event)
  if (event.kind === 'request') client.respond(event.id, { decision: 'accept' }, event.bridgeApproval)
  for (const waiter of waiters) waiter(event)
})
const waitFor = (predicate, ms = 60000) => {
  const seen = events.find(predicate)
  if (seen) return Promise.resolve(seen)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting\n${stderr.join('').slice(-3000)}\nRecent model messages: ${JSON.stringify(requests.slice(-2).map(body => body.messages)).slice(-8000)}`)), ms)
    const waiter = (event) => {
      if (!predicate(event)) return
      clearTimeout(timer)
      waiters = waiters.filter((candidate) => candidate !== waiter)
      resolve(event)
    }
    waiters.push(waiter)
  })
}
const turnDone = (threadId, from) => waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/completed' && event.params?.threadId === threadId)
const checks = []
const check = (name, fn) => { fn(); checks.push(name); console.log('PASS', name) }

let exitCode = 0
try {
  const init = await client.start()
  check('capabilities advertise structured output and model workflows', () => {
    assert.equal(init.capabilities?.structuredOutput, true)
    assert.equal(init.capabilities?.modelWorkflows, true)
  })
  const models = await client.request('model/list', { limit: 100 })
  const model = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id

  // 1. developerInstructions + outputSchema (the workflow runner's one-shot agent).
  const started = await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'read-only', developerInstructions: 'DEV_INSTRUCTIONS_MARKER: answer tersely.' })
  const threadId = started.thread.id
  let from = events.length
  const schema = { type: 'object', properties: { answer: { type: 'string' }, count: { type: 'number' } }, required: ['answer', 'count'], additionalProperties: false }
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'What is the answer?' }], outputSchema: schema })
  await turnDone(threadId, from)
  const structuredRequest = requests.findLast((body) => (body.tools ?? []).some((tool) => tool.name === 'structured_output'))
  check('developer instructions reach the system prompt', () => assert.match(systemOf(requests.at(0)), /DEV_INSTRUCTIONS_MARKER/))
  check('a thread nobody enabled workflows for has no workflow tool', () => {
    assert.ok(requests.every((body) => !(body.tools ?? []).some((tool) => tool.name === 'Workflow')))
    assert.doesNotMatch(systemOf(requests.at(0)), /Use the (?:Workflow|workflow) tool ONLY/)
  })
  check('outputSchema registers the structured_output tool with the schema', () => {
    assert.ok(structuredRequest, 'no request carried structured_output')
    assert.deepEqual(structuredRequest.tools.find((tool) => tool.name === 'structured_output').input_schema.required, ['answer', 'count'])
  })
  const answers = events.slice(from).filter((event) => event.method === 'item/completed' && event.params?.item?.type === 'agentMessage')
  check('the accepted capture is the turn answer as JSON text', () => {
    assert.deepEqual(JSON.parse(answers.at(-1).params.item.text), { answer: 'forty-two', count: 42 })
    assert.ok(!events.slice(from).some((event) => event.params?.item?.tool === 'structured_output'), 'capture shown as a tool row')
  })
  // Next turn without a schema: the capture is gone, the instructions stay.
  from = events.length
  const before = requests.length
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'plain follow-up' }] })
  await turnDone(threadId, from)
  check('the capture applies to its turn only', () => {
    const next = requests.slice(before)
    assert.ok(next.length > 0)
    assert.ok(next.every((body) => !(body.tools ?? []).some((tool) => tool.name === 'structured_output')))
    assert.match(systemOf(next[0]), /DEV_INSTRUCTIONS_MARKER/)
  })
  const rejected = await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'x' }], outputSchema: { type: 'array', items: { type: 'string' } } }).then(() => null, (error) => error)
  check('a non-object output schema fails with INVALID_PARAMS', () => assert.equal(rejected?.code, -32602))

  // thread/delete also deletes the Harness history (<DSH_HOME>/sessions/<project>/<id>/).
  const sessionDirs = async (id) => {
    const sessionsRoot = path.join(process.env.DSH_HOME, 'sessions'), found = []
    for (const project of await fs.readdir(sessionsRoot).catch(() => [])) {
      const dir = path.join(sessionsRoot, project, id)
      if (await fs.stat(dir).then((info) => info.isDirectory(), () => false)) found.push(dir)
    }
    return found
  }
  const doomed = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'read-only' })).thread.id
  from = events.length
  await client.request('turn/start', { threadId: doomed, input: [{ type: 'text', text: 'plain follow-up' }] })
  await turnDone(doomed, from)
  const beforeDelete = await sessionDirs(doomed)
  await client.request('thread/delete', { threadId: doomed })
  const afterDelete = await sessionDirs(doomed)
  const reread = await client.request('thread/read', { threadId: doomed, includeTurns: false }).then(() => null, (error) => error)
  check('thread/delete removes the session directory from the Harness sessions root', () => {
    assert.equal(beforeDelete.length, 1, 'the session was persisted before the delete')
    assert.deepEqual(afterDelete, [])
    assert.ok(reread, 'the deleted session can no longer be read')
    assert.ok(fsSync.existsSync(path.join(process.env.DSH_HOME, 'sessions')), 'the sessions root itself stays')
  })
  const survivor = await sessionDirs(threadId)
  check('other sessions are untouched by a delete', () => assert.equal(survivor.length, 1))

  // The /workflow runner's agents (codexAgent.js buildThreadParams): approvalPolicy never and the
  // launch's sandbox on thread/start, nothing on turn/start; read-only, or workspace-write with --write.
  // Mode → access (app permission-policy.mjs workflowAccess): Plan/Ask read-only, Auto/Accept edits
  // workspace-write, Bypass danger-full-access (which also reaches outside the workspace).
  // Not under the temp dir: workspace-write also allows platform temporary areas.
  const outside = await fs.mkdtemp(path.join(root, '..', 'work', '.cd-fake-model-outside-'))
  cleanup.push(outside)
  for (const [sandbox, target, expected] of [['read-only', path.join(workspace, 'ro.txt'), false], ['workspace-write', path.join(workspace, 'rw.txt'), true],
    ['workspace-write', path.join(outside, 'ww-outside.txt'), false], ['danger-full-access', path.join(outside, 'bypass.txt'), true]]) {
    const agent = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox })).thread.id
    from = events.length
    await client.request('turn/start', { threadId: agent, input: [{ type: 'text', text: `WRITE_FILE ${target}` }] })
    await turnDone(agent, from)
    const exists = await fs.access(target).then(() => true, () => false)
    const where = target.startsWith(workspace) ? 'in' : 'outside'
    check(`a runner agent with ${sandbox} access ${expected ? 'writes' : 'cannot write'} ${where} the workspace without asking`, () => {
      assert.equal(exists, expected)
      assert.ok(!events.slice(from).some((event) => event.kind === 'request'), 'an approval was asked')
    })
  }

  // Exercise both enforcement seams, existing-file edits and explicit escalations.
  // The test client accepts every card, so an accidental ask under never also fails.
  for (const tool of ['write', 'edit', 'bash']) {
    for (const [sandbox, dir, expected, escalate = false] of [
      ['read-only', workspace, false], ['workspace-write', workspace, true],
      ['workspace-write', outside, false], ['danger-full-access', outside, true],
      ['read-only', workspace, false, true], ['workspace-write', outside, false, true],
    ]) {
      const target = path.join(dir, `${tool}-${sandbox}-${escalate}.txt`)
      if (tool === 'edit') await fs.writeFile(target, 'before\n')
      const agent = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox })).thread.id
      from = events.length
      await client.request('turn/start', { threadId: agent, input: [{ type: 'text', text: `SANDBOX_${tool}${escalate ? '_ESCALATE' : ''} ${target}` }] })
      await turnDone(agent, from)
      const contents = await fs.readFile(target, 'utf8').catch((error) => { if (error.code === 'ENOENT') return null; throw error })
      check(`${tool}: ${sandbox} ${dir === workspace ? 'inside' : 'outside'}${escalate ? ' escalation' : ''} honors never approval`, () => {
        assert.equal(contents, expected ? 'after\n' : tool === 'edit' ? 'before\n' : null, JSON.stringify(events.slice(from).filter((event) => event.method === 'item/completed').map((event) => event.params.item)))
        assert.ok(events.slice(from).some((event) => event.method === 'item/completed' && ['fileChange', 'commandExecution'].includes(event.params?.item?.type)), 'the tool was actually attempted')
        assert.ok(!events.slice(from).some((event) => event.kind === 'request'), 'an approval was asked')
      })
    }
  }

  // Native alias, automatic final result, exact task cancellation and disabled-state admission.
  for (const kind of ['RESULT', 'STOP', 'OFF']) {
    const enabled = kind !== 'OFF'
    // on-request: a model workflow asks once per run outside Bypass ("Run a dynamic workflow?", which this client accepts);
    // with approvals off ('never') it is refused before anything starts.
    const thread = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: enabled } })).thread.id
    const start = events.length
    const requestStart = requests.length
    await client.request('turn/start', { threadId: thread, input: [{ type: 'text', text: `RUN_NATIVE_${kind}` }] })
    await turnDone(thread, start)
    if (kind === 'RESULT') {
      await waitFor(event => events.indexOf(event) >= start && event.params?.threadId === thread && event.params?.item?.text === 'NATIVE_NOTICE_RECEIVED')
      check('native completion: the notification turn shows the app’s workflow notification row (a userMessage carrying it)', () => {
        const notice = events.slice(start).find(event => event.method === 'item/completed' && event.params?.threadId === thread && event.params?.item?.type === 'userMessage' && String(event.params.item.id).startsWith('workflow-notice-'))
        assert.ok(notice, 'a workflow-notice userMessage')
        assert.match(notice.params.item.content[0].text, /^<system-reminder>\n\[SYSTEM NOTIFICATION - NOT USER INPUT\][\s\S]*<status>completed<\/status>/)
      })
    }
    const calls = events.slice(start).filter(event => event.params?.threadId === thread && event.params?.item?.workflowRun).map(event => event.params.item)
    const latest = calls.at(-1)
    check(`native ${kind}: alias resolves through the normal projected workflow call`, () => {
      assert.ok(latest)
      assert.equal(latest.tool, 'RunWorkflow')
      assert.equal(latest.workflowRun.status, kind === 'RESULT' ? 'completed' : kind === 'STOP' ? 'stopped' : 'failed')
      if (!enabled) assert.equal(latest.workflowRun.runId, null)
    })
    const bodies = requests.slice(requestStart)
    check(`native ${kind}: only canonical names are advertised`, () => {
      assert.ok(bodies.every(body => !(body.tools ?? []).some(tool => tool.name === 'RunWorkflow')))
      assert.equal((bodies[0].tools ?? []).some(tool => tool.name === 'Workflow'), enabled)
      assert.ok(bodies.every(body => !(body.messages ?? []).some(message => Array.isArray(message.content) && message.content.some(block => block.type === 'tool_use' && block.name === 'job_output'))))
    })
    if (kind === 'RESULT') {
      const notice = bodies.flatMap(body => body.messages).map(message => textOf(message.content)).find(text => text.includes('<task-notification>') && text.includes('<result>{"answer":42}</result>'))
      assert.ok(notice)
      const file = /<output-file>(.+)<\/output-file>/.exec(notice)?.[1]
      check('native completion delivers the value automatically and saves its complete output', () => {
        const output = JSON.parse(fsSync.readFileSync(file, 'utf8'))
        assert.deepEqual(output.result, { answer: 42 })
        assert.equal(output.agentCount, 0)
        assert.deepEqual(output.workflowProgress, [])
        assert.equal(output.totalTokens, 0)
        assert.equal(output.totalToolCalls, 0)
        const blocks = bodies.at(-1).messages.flatMap(message => Array.isArray(message.content) ? message.content : [])
        const readCall = blocks.find(block => block.type === 'tool_use' && block.name === 'read')
        const readResult = blocks.find(block => block.type === 'tool_result' && block.tool_use_id === readCall?.id)
        assert.ok(readResult && !readResult.is_error)
        assert.match(textOf(readResult.content), /"answer"\s*:\s*42/)
        assert.match(notice, /<tool-use-id>/)
        assert.match(notice, /resumeFromRunId/)
      })
    }
    if (kind === 'STOP') check('native TaskStop returns the stopped workflow identity after cleanup', () => {
      assert.ok(bodies.some(body => textOf(lastUser(body)?.content).includes('Successfully stopped task:')))
      assert.ok(bodies.some(body => textOf(lastUser(body)?.content).includes('local_workflow')))
    })
  }

  // 2. The model's `workflow` tool → item.workflowRun. Workflow sessions ask before each run outside Bypass (on-request:
  // this client accepts every card); approvals off ('never') refuses a run unless the session is in Bypass.
  const wf = await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } })
  const wfId = wf.thread.id
  from = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: 'RUN_WORKFLOW please' }] })
  await turnDone(wfId, from)
  check('Dynamic workflows on: the model gets the workflow tool', () => {
    const body = requests.find((candidate) => /RUN_WORKFLOW/.test(JSON.stringify(candidate.messages)))
    const schema = body.tools.find(tool => tool.name === 'Workflow').input_schema
    assert.deepEqual(Object.keys(schema.properties), ['script', 'name', 'description', 'title', 'args', 'scriptPath', 'resumeFromRunId'])
    assert.equal(schema.additionalProperties, false)
    assert.match(systemOf(body), /Use the (?:Workflow|workflow) tool ONLY/)
  })
  const runs = events.slice(from).filter((event) => event.params?.threadId === wfId && event.params?.item?.workflowRun).map((event) => event.params.item)
  const final = runs.at(-1)
  if (process.env.SMOKE_DEBUG) console.log(JSON.stringify(final, null, 1))
  check('the workflow call carries a run from its first notification', () => {
    assert.equal(runs[0].workflowRun.status, 'running')
    assert.equal(runs[0].workflowRun.name, 'fake-audit')
    assert.deepEqual(runs[0].workflowRun.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map((entry) => entry.title), ['Scan', 'Write', 'Unused'])
  })
  check('the engine run id replaces the call id and accepts the CLI resume format', () => { assert.equal(final.workflowRun.id, final.workflowRun.attemptId); assert.notEqual(final.workflowRun.id, final.workflowRun.runId); assert.match(final.workflowRun.runId, /^wf_[a-z0-9-]{6,}$/) })
  check('the run completes with three agents in their phases', () => {
    assert.equal(final.workflowRun.status, 'completed')
    const agents = final.workflowRun.workflowProgress.filter((entry) => entry.type === 'workflow_agent')
    // parallel() members may start in either order.
    assert.deepEqual(agents.map((agent) => [agent.label, agent.state, agent.phaseTitle]).sort(), [['child-one', 'done', 'Scan'], ['child-two', 'done', 'Scan'], ['child-write', 'done', 'Write']])
    assert.ok(agents.every((agent) => typeof agent.childId === 'string'))
  })
  check('installed admission records show pending rows before actual child publication and survive replay', () => {
    const pending = runs.flatMap(item => item.workflowRun.workflowProgress).filter(entry => entry.type === 'workflow_agent' && entry.state === 'start')
    assert.ok(pending.length >= 3)
    assert.ok(pending.every(entry => !entry.childId && Number.isFinite(entry.queuedAt)))
    const members = final.workflowRun.workflowProgress.filter(entry => entry.type === 'workflow_agent')
    assert.equal(members.length, 3)
    assert.ok(members.every(entry => entry.queuedAt <= entry.startedAt))
  })
  check('child agent({schema}) got the structured capture', () => {
    assert.ok(requests.some((body) => /CHILD two/.test(JSON.stringify(body.messages)) && (body.tools ?? []).some((tool) => tool.name === 'structured_output')))
  })
  check('the launch returns immediately and job_output carries the script return value', () => {
    assert.equal(final.status, 'completed')
    const text = final.contentItems.map((part) => part.text).join('')
    assert.match(text, /fake-audit/)
    assert.match(text, /launched in background/);
    assert.ok(requests.some(body => textOf(lastUser(body)?.content).includes('\"verdict\": \"fine\"')))
  })
  // Replay: thread/read rebuilds the same run from the durable records.
  const read = await client.request('thread/read', { threadId: wfId, includeTurns: true })
  const replayed = read.thread.turns.flatMap((turn) => turn.items).find((item) => item.workflowRun)
  check('history replays the run from durable records', () => {
    assert.equal(replayed.workflowRun.status, 'completed')
    assert.equal(replayed.workflowRun.id, final.workflowRun.id)
    assert.equal(replayed.workflowRun.workflowProgress.filter((entry) => entry.type === 'workflow_agent').length, 3)
  })
  const stop = await client.request('codeDesktop/workflow/stop', { threadId: wfId, runId: final.workflowRun.runId, attemptId: final.workflowRun.attemptId })
  check('stopping a finished run is a no-op', () => assert.equal(stop.status, 'alreadyFinished'))

  check('saved script and measured local child output are present', () => {
    assert.ok(fsSync.existsSync(final.workflowRun.scriptPath))
    assert.ok(final.workflowRun.workflowProgress.filter(entry => entry.type === 'workflow_agent').every(entry => entry.tokens > 0))
    assert.ok(requests.some(body => textOf(body.messages.find(m => m.role === 'user')?.content).startsWith('[Workflow harness')))
    assert.match(fsSync.readFileSync(final.workflowRun.scriptPath, 'utf8'), /^export const meta = /)
    const agents = final.workflowRun.workflowProgress.filter(entry => entry.type === 'workflow_agent')
    assert.ok(agents.every(entry => entry.tokens > entry.outputTokens && entry.outputTokens > 0))
    assert.ok(runs.some(item => item.workflowRun.workflowProgress.some(entry => entry.type === 'workflow_agent' && Number.isFinite(entry.activeTools) && entry.progressSupported === true)))
  })
  check('complete output retains real local agent diagnostics and aggregate usage', () => {
    const artifact = JSON.parse(fsSync.readFileSync(path.join(path.dirname(final.workflowRun.scriptPath), `${final.workflowRun.attemptId}.output`), 'utf8'))
    const agents = artifact.workflowProgress.filter(row => row.type === 'workflow_agent')
    assert.equal(artifact.agentCount, 3)
    assert.equal(agents.length, 3)
    assert.ok(agents.every(row => row.state === 'done' && row.agentId && row.promptFramed && row.promptPreview && row.resultPreview && row.tokens > 0 && row.attempt === 1 && Number.isFinite(row.toolCalls)))
    assert.equal(artifact.totalTokens, agents.reduce((total, row) => total + row.tokens, 0))
    assert.equal(artifact.totalToolCalls, agents.reduce((total, row) => total + row.toolCalls, 0))
    assert.deepEqual(artifact.workflowProgress.filter(row => row.type === 'workflow_phase').map(row => [row.index, row.title]), [[1, 'Scan'], [2, 'Write'], [3, 'Unused']])
  })
  const resumeFrom = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: `RESUME_WORKFLOW ${final.workflowRun.runId}` }] })
  await turnDone(wfId, resumeFrom)
  const resumed = events.slice(resumeFrom).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item.workflowRun
  check('real composition resumes all three agents from the durable journal', () => {
    assert.equal(resumed?.status, 'completed')
    assert.equal(resumed.runId, final.workflowRun.runId)
    assert.notEqual(resumed.attemptId, final.workflowRun.attemptId)
    const cached = resumed.workflowProgress.filter(entry => entry.type === 'workflow_agent')
    assert.equal(cached.length, 3)
    assert.ok(cached.every(entry => entry.cached === true && entry.tokens === 0))
  })

  const cacheOrderScript = 'export const meta={name:"cache-order",description:"Cached invocation order"};phase("Before");const child=agent("CHILD one: say hi",{label:"cache-order"});phase("After");return await child'
  const cacheOrderFirst = await client.request('codeDesktop/workflow/startScript', { threadId: wfId, script: cacheOrderScript })
  const cacheOrderResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: wfId, runId: cacheOrderFirst.runId })
  const cacheOrderSecond = await client.request('codeDesktop/workflow/startScript', { threadId: wfId, script: cacheOrderScript, resumeFromRunId: cacheOrderFirst.runId })
  const cacheOrderCached = await client.request('codeDesktop/workflow/scriptResult', { threadId: wfId, runId: cacheOrderSecond.runId })
  const firstCacheOrderOutput = JSON.parse(await fs.readFile(cacheOrderResult.outputFile, 'utf8'))
  const nextCacheOrderOutput = JSON.parse(await fs.readFile(cacheOrderCached.outputFile, 'utf8'))
  check('installed manual resume publishes cached members before following phases with the original child identity', () => {
    assert.deepEqual(nextCacheOrderOutput.workflowProgress.map(row => row.type === 'workflow_phase' ? row.title : row.cached), ['Before', true, 'After'])
    const member = nextCacheOrderOutput.workflowProgress[1]
    assert.equal(member.agentId, firstCacheOrderOutput.workflowProgress[1].agentId)
    assert.equal(cacheOrderCached.value, cacheOrderResult.value)
    for (const key of ['queuedAt', 'attempt', 'durationMs', 'tokens', 'toolCalls']) assert.equal(Object.hasOwn(member, key), false)
  })

  const pathFrom = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: `RUN_SAVED_WORKFLOW ${final.workflowRun.scriptPath}` }] })
  await turnDone(wfId, pathFrom)
  const pathRun = events.slice(pathFrom).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item.workflowRun
  check('saved complete script reruns through scriptPath, taking precedence over inline code', () => {
    assert.equal(pathRun?.status, 'completed')
    assert.equal(pathRun.name, 'fake-audit')
    assert.equal(pathRun.scriptPath, final.workflowRun.scriptPath)
    assert.notEqual(pathRun.runId, final.workflowRun.runId)
    assert.equal(pathRun.workflowProgress.filter(entry => entry.type === 'workflow_agent').length, 3)
  })
  await fs.rm(final.workflowRun.scriptPath)
  await client.request('codeDesktop/thread/permissions', { threadId: wfId, codeDesktop: { dynamicWorkflows: true, tools: { disabled: ['read'] } } })
  let mirrorFrom = events.length
  const mirrorInput = 'WORKFLOW_INPUT ' + JSON.stringify({ scriptPath: final.workflowRun.scriptPath, resumeFromRunId: final.workflowRun.runId })
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: mirrorInput }] })
  await turnDone(wfId, mirrorFrom)
  check('installed recovery refuses unavailable Read before recreating a missing private script', () => {
    assert.equal(fsSync.existsSync(final.workflowRun.scriptPath), false)
    const item = events.slice(mirrorFrom).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item
    assert.equal(item?.workflowRun.status, 'failed')
    assert.ok(item.contentItems.some(part => part.text?.includes('file you can already read')))
  })
  await client.request('codeDesktop/thread/permissions', { threadId: wfId, codeDesktop: { dynamicWorkflows: true, tools: { disabled: [] } } })
  mirrorFrom = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: mirrorInput }] })
  await turnDone(wfId, mirrorFrom)
  check('installed model tool restores its missing script and reuses all three children after Read is enabled', () => {
    const item = events.slice(mirrorFrom).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item.workflowRun
    assert.equal(item?.status, 'completed')
    assert.equal(item.runId, final.workflowRun.runId)
    assert.ok(fsSync.existsSync(final.workflowRun.scriptPath))
    const members = item.workflowProgress.filter(entry => entry.type === 'workflow_agent')
    assert.equal(members.length, 3)
    assert.ok(members.every(entry => entry.cached === true))
  })
  await fs.mkdir(path.join(workspace, '.claude/workflows'), { recursive: true })
  await fs.writeFile(path.join(workspace, '.claude/workflows/different-filename.js'), 'export const meta = {name:"named-parity",description:"Registry and JSON arguments"}; return args;')
  const namedFrom = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: 'RUN_NAMED_WORKFLOW' }] })
  await turnDone(wfId, namedFrom)
  const namedItem = events.slice(namedFrom).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item
  check('registry name and bare JSON arrays cross the real tool schema and filesystem', () => {
    assert.equal(namedItem?.workflowRun.status, 'completed')
    assert.equal(namedItem.workflowRun.name, 'named-parity')
    assert.ok(requests.some(body => textOf(lastUser(body)?.content).includes('"array"') && textOf(lastUser(body)?.content).includes('42')))
  })

  const registry = path.join(workspace, '.claude/workflows')
  await fs.writeFile(path.join(registry, '000-large.js'), ' '.repeat(524289))
  const unreadable = path.join(registry, '001-unreadable.js')
  await fs.writeFile(unreadable, 'export const meta={name:"unreadable",description:"Unreadable"}; return 0;')
  await fs.chmod(unreadable, 0)
  await fs.writeFile(path.join(registry, 'zz-invalid-override.js'), 'export const meta={name:"named-parity",description:"Invalid override"}; const = ;')
  await fs.writeFile(path.join(registry, 'sole-broken.js'), 'export const meta={name:"sole-broken",description:"Broken body"}; const = ;')
  const bytePath = path.join(workspace, 'invalid-utf8.js')
  await fs.writeFile(bytePath, Buffer.concat([Buffer.from('export const meta={name:"decoded-bytes",description:"Nonfatal decoding"}; return "'), Buffer.from([255]), Buffer.from('";')]))
  const symbolicPath = path.join(workspace, 'symbolic-workflow.js')
  await fs.symlink(bytePath, symbolicPath)
  const hardPath = path.join(workspace, 'hard-workflow.js')
  await fs.copyFile(bytePath, hardPath)
  await fs.link(hardPath, path.join(workspace, 'hard-workflow-alias.js'))
  for (const [label, input, expected] of [
    ['registry skips unreadable and oversized entries and rejects a broken override', { name: 'named-parity', args: { discovery: 'kept-earlier' } }, 'kept-earlier'],
    ['file decoding replaces invalid UTF-8 bytes', { scriptPath: bytePath }, '\ufffd'],
    ['scriptPath follows a single-link symbolic target', { scriptPath: symbolicPath }, '\ufffd'],
  ]) {
    const thread = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } })).thread.id
    const start = events.length, requestStart = requests.length
    await client.request('turn/start', { threadId: thread, input: [{ type: 'text', text: 'WORKFLOW_INPUT ' + JSON.stringify(input) }] })
    await turnDone(thread, start)
    const item = events.slice(start).filter(event => event.params?.threadId === thread && event.params?.item?.workflowRun).at(-1)?.params.item
    check(`installed CLI ${label}`, () => {
      assert.equal(item?.workflowRun.status, 'completed')
      assert.ok(requests.slice(requestStart).some(body => textOf(lastUser(body)?.content).includes(expected)))
    })
  }
  await fs.chmod(unreadable, 0o600)

  const outsideSource = path.join(home, 'outside-workflow.js')
  await fs.writeFile(outsideSource, 'export const meta={name:"read-admission",description:"Read admission"}; return "READ_ADMISSION_OK";')
  const outsideAlias = path.join(workspace, 'outside-workflow-alias.js')
  await fs.symlink(outsideSource, outsideAlias)
  const localSettingsPath = path.join(workspace, '.claude/settings.local.json')
  const priorLocalSettings = await fs.readFile(localSettingsPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return undefined; throw error })
  try {
    for (const spec of [
      { label: 'outside cwd is refused', input: { scriptPath: outsideSource }, allowed: false },
      { label: 'outside symlink target is refused', input: { scriptPath: outsideAlias }, allowed: false },
      { label: 'bypass permits outside cwd', input: { scriptPath: outsideSource }, bypass: true, allowed: true },
      { label: 'added UI directory permits outside cwd', input: { scriptPath: outsideSource }, extra: true, allowed: true },
      { label: 'settings directory permits outside cwd', input: { scriptPath: outsideSource }, permissions: { additionalDirectories: [home] }, allowed: true },
      { label: 'absolute Read allow permits outside cwd', input: { scriptPath: outsideSource }, permissions: { allow: [`Read(/${outsideSource})`] }, allowed: true },
      { label: 'absolute Edit allow permits reading its source', input: { scriptPath: outsideSource }, permissions: { allow: [`Edit(/${outsideSource})`] }, allowed: true },
      { label: 'bare Read allow does not permit outside cwd', input: { scriptPath: outsideSource }, permissions: { allow: ['Read'] }, allowed: false },
      { label: 'Read deny defeats bypass', input: { scriptPath: bytePath }, bypass: true, permissions: { deny: ['Read(./invalid-utf8.js)'] }, allowed: false },
      { label: 'Read ask defeats bypass', input: { scriptPath: bytePath }, bypass: true, permissions: { ask: ['Read(./invalid-utf8.js)'] }, allowed: false },
      { label: 'outside fence defeats bypass', input: { scriptPath: outsideSource }, bypass: true, permissions: { blockReadsOutsideWorkingDirectories: true }, allowed: false },
      { label: 'disabled Read defeats bypass', input: { scriptPath: bytePath }, bypass: true, disableRead: true, allowed: false },
      { label: 'inline script works without Read', input: { script: 'export const meta={name:"inline-no-read",description:"Inline"}; return 1;' }, disableRead: true, allowed: true },
      { label: 'network namespace is refused before lookup', input: { scriptPath: '//fixture.invalid/share/script.js' }, bypass: true, allowed: false, error: 'Network (UNC, NT-namespace, or automount)' },
    ]) {
      await fs.writeFile(localSettingsPath, JSON.stringify({ permissions: spec.permissions ?? {} }))
      const thread = (await client.request('thread/start', {
        cwd: workspace, model, approvalPolicy: spec.bypass ? 'never' : 'on-request', sandbox: spec.bypass ? 'danger-full-access' : 'workspace-write',
        ...spec.extra ? { sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace, home], networkAccess: false } } : {},
        codeDesktop: { dynamicWorkflows: true, ...spec.disableRead ? { tools: { disabled: ['read'] } } : {} },
      })).thread.id
      const start = events.length
      await client.request('turn/start', { threadId: thread, input: [{ type: 'text', text: 'WORKFLOW_INPUT ' + JSON.stringify(spec.input) }] })
      await turnDone(thread, start)
      const item = events.slice(start).filter(event => event.params?.threadId === thread && event.params?.item?.workflowRun).at(-1)?.params.item
      check(`installed Workflow Read: ${spec.label}`, () => {
        assert.equal(item?.workflowRun.status, spec.allowed ? 'completed' : 'failed', JSON.stringify(item))
        if (!spec.allowed) {
          assert.equal(item.workflowRun.runId, null)
          assert.ok(item.contentItems.some(part => part.text?.includes(spec.error ?? 'file you can already read')), JSON.stringify(item.contentItems))
        }
      })
    }
  } finally {
    if (priorLocalSettings === undefined) await fs.rm(localSettingsPath, { force: true })
    else await fs.writeFile(localSettingsPath, priorLocalSettings)
  }

  const defaultFrom = events.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: 'RUN_DEFAULT_BACKGROUND' }] })
  await turnDone(wfId, defaultFrom)
  check('omitting run_in_background starts a real owned job', () => {
    const item = events.slice(defaultFrom).filter(event => event.params?.item?.workflowRun?.name === 'default-background').at(-1)?.params.item
    assert.equal(item?.workflowRun.background, true)
    assert.equal(typeof item.workflowRun.jobId, 'string')
  })

  for (const [label, input, expectedError] of [
    ['separate meta', { script: 'return 1', meta: { name: 'bad', description: 'bad' } }, 'unexpected parameter meta'],
    ['budget field', { script: WORKFLOW_SCRIPT, budgetTotal: 10 }, 'unexpected parameter budgetTotal'],
    ['child definitions', { script: WORKFLOW_SCRIPT, workflows: {} }, 'unexpected parameter workflows'],
    ['resume without source', { resumeFromRunId: final.workflowRun.runId }, 'must provide'],
    ['invalid resume id', { script: WORKFLOW_SCRIPT, resumeFromRunId: 'run-123' }, 'must match'],
    ['missing metadata', { script: 'return 1' }, 'FIRST statement'],
    ['invisible name', { name: 'bad\u200bname' }, 'invisible'],
    ['invalid inline with file', { scriptPath: final.workflowRun.scriptPath, script: 'invalid (' }, 'Unexpected token'],
    ['missing name with inline', { name: 'missing-workflow', script: WORKFLOW_SCRIPT }, 'not found'],
    ['discovered broken body', { name: 'sole-broken' }, 'Unexpected token'],
    ['multiply linked scriptPath', { scriptPath: hardPath }, 'exactly one hard link'],
  ]) {
    const start = events.length
    await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: 'WORKFLOW_INPUT ' + JSON.stringify(input) }] })
    await turnDone(wfId, start)
    const item = events.slice(start).filter(event => event.params?.threadId === wfId && event.params?.item?.workflowRun).at(-1)?.params.item
    check(`installed CLI inputs reject ${label} before engine startup`, () => {
      assert.ok(item.contentItems.some(part => part.text?.includes(expectedError)), JSON.stringify(item.contentItems))
      assert.equal(item.workflowRun.runId, null)
      assert.equal(item.workflowRun.status, 'failed')
    })
  }

  for (const [label, input, expected] of [
    ['metadata templates and display title', { script: 'export const meta={name:`metadata-identity`,description:`Inspect`,title:`Readable title`,whenToUse:9,unknown:/ignored/,phases:[null,{title:""},{title:3}]}; return {answer:42}' }, { name: 'metadata-identity', title: 'Readable title' }],
    ['built-in research missing question', { name: 'deep-research' }, { name: 'deep-research' }],
    ['built-in research pipeline', { name: 'deep-research', args: 'INSTALLED_RESEARCH_QUESTION' }, { name: 'deep-research' }],
  ]) {
    const thread = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } })).thread.id
    const start = events.length
    await client.request('turn/start', { threadId: thread, input: [{ type: 'text', text: 'WORKFLOW_INPUT ' + JSON.stringify(input) }] })
    await turnDone(thread, start)
    const item = events.slice(start).filter(event => event.params?.threadId === thread && event.params?.item?.workflowRun).at(-1)?.params.item
    check('installed CLI ' + label, () => {
      assert.equal(item?.workflowRun.status, 'completed', JSON.stringify(item))
      for (const [key, value] of Object.entries(expected)) assert.equal(item.workflowRun[key], value)
      if (input.args === 'INSTALLED_RESEARCH_QUESTION') {
        assert.ok(JSON.stringify(events.slice(start)).includes('INSTALLED_RESEARCH_REPORT'))
        assert.equal(item.workflowRun.workflowProgress.filter(entry => entry.type === 'workflow_agent').length, 9)
      } else if (input.name === 'deep-research') assert.ok(JSON.stringify(events.slice(start)).includes('No research question provided'))
      else assert.ok(item.workflowRun.workflowProgress.some(entry => entry.type === 'workflow_phase' && entry.title === ''))
    })
  }

  const direct = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'workspace-write' })).thread.id
  const directFrom = events.length
  const directRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:`member-controls`,title:`Manual controls`,description:`Live controls`,phases:[{title:""},null]}; return await parallel([()=>agent("CHILD retry-control",{label:"retry",stallMs:0}),()=>agent("CHILD skip-control",{label:"skip",stallMs:0})])' })
  const deadline = Date.now() + 15000
  while (![...memberAttempts.keys()].some(key => key.startsWith('CHILD retry-control'))) { if (Date.now() > deadline) throw new Error('retry child never reached the model'); await new Promise(resolve => setTimeout(resolve,20)) }
  const retried = await client.request('codeDesktop/workflow/member', { threadId: direct, runId: directRun.runId, seq: 1, action: 'retry' })
  await waitFor(event => events.indexOf(event) >= directFrom && event.method === 'codeDesktop/workflow/event' && event.params?.runId === directRun.runId && event.params.event.type === 'start' && event.params.event.seq === 2)
  const skipped = await client.request('codeDesktop/workflow/member', { threadId: direct, runId: directRun.runId, seq: 2, action: 'skip' })
  const directResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: directRun.runId })
  check('actual installed engine retries and skips individual members over the Lab bridge', () => {
    assert.equal(directRun.meta.title, 'Manual controls')
    assert.deepEqual(directRun.meta.phases, [{ title: '' }])
    assert.equal(retried.accepted, true)
    assert.equal(skipped.accepted, true)
    assert.equal(directResult.stopReason, 'completed')
    assert.deepEqual(directResult.value, ['retried ok', null])
    assert.equal(directResult.agentsStarted, 2)
    assert.ok(events.slice(directFrom).some(event => event.params?.runId === directRun.runId && event.params.event?.attempt === 2))
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: directRun.runId })

  for (const scenario of ['allowed', 'rejected']) {
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"clamp-${scenario}",description:"Bash clamp parity"}; return await agent("CHILD clamp-${scenario}",{bashCommandClamp:["Bash(printf:*)","Bash(cat)"]})` })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    check(`installed workflow Bash clamp: ${scenario}`, () => {
      assert.equal(result.stopReason, 'completed')
      assert.match(result.value, scenario === 'allowed' ? /clamp executed:[\s\S]*complete/ : /clamp denied/)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
  }
  check('the whole denied composite command is blocked before any shell side effect', () => {
    assert.equal(fsSync.readFileSync(path.join(workspace, 'clamp-allowed.txt'), 'utf8').trim(), 'good')
    assert.equal(fsSync.existsSync(path.join(workspace, 'clamp-rejected.txt')), false)
    assert.equal(fsSync.existsSync(path.join(workspace, 'clamp-bypass.txt')), false)
  })

  for (const [scenario, agentType, persona, skill] of [
    ['project', 'reviewer', 'PROJECT_AGENT_PERSONA', 'PROJECT_REVIEW_SKILL'],
    ['plugin', 'fixture-kit:security:reviewer', 'PLUGIN_AGENT_PERSONA', 'PLUGIN_REVIEW_SKILL'],
  ]) {
    const from = requests.length
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"agent-type-${scenario}",description:"Agent definitions and preloaded skills"}; return await agent("CHILD agent-type-${scenario}",{agentType:${JSON.stringify(agentType)}})` })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    check(`installed workflow agentType: ${scenario} lookup, aliases, persona and skills`, () => {
      assert.equal(result.stopReason, 'completed')
      assert.equal(result.value, 'agent type ok')
      const child = requests.slice(from).find(body => systemOf(body).includes(persona))
      assert.ok(child, 'definition persona reaches the model')
      assert.ok(JSON.stringify(child.messages).includes(skill), 'skill preload reaches the first request')
      assert.ok(child.tools.some(tool => tool.name === 'read'))
      assert.equal(child.tools.some(tool => tool.name === 'bash'), scenario === 'plugin', 'plugin permissionMode is ignored and project tool selection remains narrow')
      assert.equal(child.tools.some(tool => tool.name === 'write'), false)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
  }

  const exitsFrom = requests.length
  const exitsRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"bash-exits",description:"Classify shell exits"}; return await agent("CHILD shell exits",{agentType:"bash-exits"})' })
  const exitsResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: exitsRun.runId })
  check('installed workflow Bash errors and no-match exits dispatch the matching hook', () => {
    assert.equal(exitsResult.value, 'BASH_EXITS_COMPLETE')
    assert.deepEqual(fsSync.readFileSync(path.join(workspace, 'bash-exits.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)), [
      { event: 'PostToolUseFailure', command: 'printf failed; exit 3' },
      { event: 'PostToolUse', command: 'printf haystack | grep needle' },
      { event: 'PostToolUseFailure', command: "printf haystack | grep '['" },
    ])
    const messages = JSON.stringify(requests.slice(exitsFrom).at(-1).messages)
    assert.ok(messages.includes('PostToolUseFailure_EXIT_FEEDBACK'))
    assert.ok(messages.includes('PostToolUse_EXIT_FEEDBACK'))
    assert.ok(messages.includes('failed\\n[exit code: 3]'))
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: exitsRun.runId })

  const hooksFrom = requests.length
  const hooksRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"agent-hooks",description:"Local agent command hooks"}; return await agent("CHILD guarded hooks",{agentType:"guarded"})' })
  const hooksResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: hooksRun.runId })
  check('installed project agent hooks deny Bash and rewrite the accepted call before dispatch', () => {
    assert.equal(hooksResult.stopReason, 'completed')
    assert.equal(hooksResult.value, 'agent hooks complete')
    assert.equal(fsSync.existsSync(path.join(workspace, 'hook-denied.txt')), false)
    assert.equal(fsSync.readFileSync(path.join(workspace, 'hook-allowed.txt'), 'utf8'), 'rewritten')
    assert.ok(requests.slice(hooksFrom).some(body => JSON.stringify(body.messages).includes('AGENT_HOOK_DENIED')))
    assert.ok(requests.slice(hooksFrom).some(body => JSON.stringify(body.messages).includes('AGENT_HOOK_CONTEXT')))
    assert.ok(requests.slice(hooksFrom).some(body => JSON.stringify(body.messages).includes('Accepted arguments:')))
    assert.ok(requests.slice(hooksFrom).some(body => JSON.stringify(body.messages).includes('printf rewritten > hook-allowed.txt')))
  })
  check('installed agent Stop converts to SubagentStop and forces one continuation', () => {
    assert.deepEqual(fsSync.readFileSync(path.join(workspace, 'agent-stop-input.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)), [
      { event: 'SubagentStop', type: 'guarded', active: false, answer: 'agent hooks first answer' },
      { event: 'SubagentStop', type: 'guarded', active: true, answer: 'agent hooks complete' },
    ])
    assert.equal(requests.length - hooksFrom, 4)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: hooksRun.runId })

  for (const point of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Stop']) {
    const from = requests.length
    const script = `export const meta={name:"hook-halt-${point}",description:"Hook stops this child"}; return await agent("CHILD hook halt",{agentType:"halt-${point}"})`
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    check(`installed ${point} hook stops model work and preserves the child's output`, () => {
      assert.equal(result.stopReason, 'completed')
      assert.equal(result.value, 'HOOK_RETAINED_' + point)
      assert.equal(requests.length - from, 1)
      const effect = path.join(workspace, `halt-${point}.txt`)
      if (point === 'PostToolUse') assert.equal(fsSync.readFileSync(effect, 'utf8'), 'finished')
      else assert.equal(fsSync.existsSync(effect), false)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
    const replay = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script, resumeFromRunId: run.runId })
    const cached = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: replay.runId })
    check(`installed workflow resume reuses ${point} hook-stopped output`, () => {
      assert.equal(cached.value, result.value)
      assert.equal(requests.length - from, 1)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: replay.runId })
  }

  for (const point of ['PreToolUse', 'PostToolUse']) {
    const from = requests.length
    const script = `export const meta={name:"hook-structured-${point}",description:"Hook and structured output"}; return await agent("CHILD hook structured",{agentType:"halt-${point}",schema:{type:"object",properties:{answer:{type:"number"}},required:["answer"]}})`
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    check(`installed ${point} hook preserves only a committed structured value`, () => {
      assert.equal(result.stopReason, point === 'PostToolUse' ? 'completed' : 'error')
      assert.deepEqual(result.value, point === 'PostToolUse' ? { answer: 42 } : null)
      if (point === 'PreToolUse') assert.match(result.error, /structured/i)
      assert.equal(requests.length - from, 1)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
  }

  const mcpFrom = requests.length
  const mcpRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"agent-mcp",description:"Child MCP connection"}; return await agent("CHILD mcp",{agentType:"mcp-worker"})' })
  const mcpResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: mcpRun.runId })
  check('installed workflow agent MCP: scoped connection and denied tools', () => {
    assert.equal(mcpResult.value, 'agent mcp complete')
    const names = requests[mcpFrom].tools.map(tool => tool.name)
    assert.ok(names.includes('mcp__fixture__echo'))
    assert.ok(!names.includes('mcp__fixture__blocked'))
    assert.ok(!names.includes('mcp__fixture__late'))
    assert.ok(!names.some(name => ['list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource'].includes(name)))
    assert.doesNotMatch(systemOf(requests[mcpFrom]), /MCP resource servers/)
    assert.match(JSON.stringify(requests[mcpFrom + 1].messages), /MCP_RESULT:echo/)
    assert.match(systemOf(requests[mcpFrom]), /AGENT_MCP_INSTRUCTIONS/)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: mcpRun.runId })
  check('installed workflow agent MCP: disposal reaps each negotiated process', () => {
    const events = fsSync.readFileSync(path.join(workspace, 'agent-mcp.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line))
    assert.ok(events.some(event => event.event === 'tools/call' && event.name === 'echo'))
    for (const event of events.filter(event => event.event === 'start')) assert.throws(() => process.kill(event.pid, 0))
  })
  const resourceFrom = requests.length
  const resourceRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"agent-resource",description:"Selected MCP resource read"}; return await agent("CHILD resource",{agentType:"resource-worker"})' })
  const resourceResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: resourceRun.runId })
  check('installed workflow resource alias selects only the admitted helper and records its result', () => {
    assert.equal(resourceResult.value, 'agent resource complete')
    assert.deepEqual(requests[resourceFrom].tools.map(tool => tool.name), ['read_mcp_resource'])
    assert.match(systemOf(requests[resourceFrom]), /"fixture": read_mcp_resource/)
    assert.match(JSON.stringify(requests[resourceFrom + 1].messages), /MCP_RESOURCE_CONTENT/)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: resourceRun.runId })
  check('installed workflow resource-only child drains its connection', () => {
    const events = fsSync.readFileSync(path.join(workspace, 'agent-mcp.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line))
    assert.ok(events.some(event => event.event === 'resources/read'))
    for (const event of events.filter(event => event.event === 'start')) assert.throws(() => process.kill(event.pid, 0))
  })
  const catalogFrom = requests.length
  const catalogRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"resource-discovery",description:"Discover admitted resource servers"}; return await agent("CHILD catalog",{agentType:"resource-catalog"})' })
  const catalogResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: catalogRun.runId })
  check('installed workflow discovers admitted resources without a server argument', () => {
    assert.equal(catalogResult.value, 'resource discovery complete')
    assert.deepEqual(requests[catalogFrom].tools.map(tool => tool.name), ['list_mcp_resources'])
    const schema = requests[catalogFrom].tools[0].input_schema
    assert.ok(!schema.required?.includes('server'))
    const result = requests[catalogFrom + 1].messages.flatMap(message => Array.isArray(message.content) ? message.content : []).find(block => block.type === 'tool_result')
    assert.deepEqual(JSON.parse(textOf(result.content)), [{ uri: 'fixture://guide', name: 'Fixture guide', mimeType: 'text/plain', server: 'fixture' }])
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: catalogRun.runId })
  check('installed workflow discovery drains its MCP process', () => {
    const events = fsSync.readFileSync(path.join(workspace, 'agent-mcp.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line))
    assert.ok(events.some(event => event.event === 'resources/list'))
    for (const event of events.filter(event => event.event === 'start')) assert.throws(() => process.kill(event.pid, 0))
  })
  const boundedSource = 'export const meta={name:"bounded-agent",description:"Agent effort and iteration cap"}; return await agent("CHILD bounded",{agentType:"bounded"})'
  const boundedFrom = requests.length
  const boundedRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: boundedSource })
  const boundedResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: boundedRun.runId })
  check('installed agent maxTurns stops model iteration while retaining text and completing tools', () => {
    assert.equal(boundedResult.stopReason, 'completed')
    assert.equal(boundedResult.value, 'BOUNDED_PARTIAL')
    assert.equal(requests.length - boundedFrom, 1)
    assert.equal(requests[boundedFrom].output_config.effort, 'low')
    assert.equal(fsSync.readFileSync(path.join(workspace, 'bounded-tool.txt'), 'utf8'), 'finished')
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: boundedRun.runId })
  const boundedReplay = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: boundedSource, resumeFromRunId: boundedRun.runId })
  const boundedCached = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: boundedReplay.runId })
  check('installed workflow resume preserves capped output without another child request', () => {
    assert.equal(boundedCached.value, 'BOUNDED_PARTIAL')
    assert.equal(requests.length - boundedFrom, 1)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: boundedReplay.runId })
  const overrideFrom = requests.length
  const overrideRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: boundedSource.replace('agentType:"bounded"', 'agentType:"bounded",effort:"high"') })
  await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: overrideRun.runId })
  check('installed workflow caller effort overrides the definition effort', () => assert.equal(requests[overrideFrom].output_config.effort, 'high'))
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: overrideRun.runId })

  const richSchema = { type: 'object', $defs: { score: { type: 'integer', minimum: 10, maximum: 20 } }, properties: { answer: { $ref: '#/$defs/score' }, label: { type: 'string', pattern: '^[a-z]+$', minLength: 3 } }, required: ['answer', 'label'], additionalProperties: false }
  for (const [scenario, expected, expectedCalls] of [
    ['nudge', { answer: 12, label: 'valid' }, 2], ['repair', { answer: 12, label: 'valid' }, 2], ['cap', null, 5], ['ignore', null, 2],
  ]) {
    const from = requests.length
    const eventFrom = events.length
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"schema-${scenario}",description:"Structured parity"}; return await agent("CHILD schema-${scenario}",{schema:${JSON.stringify(richSchema)}})` })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    check(`installed workflow structured output: ${scenario}`, () => {
      assert.equal(result.stopReason, expected === null ? 'error' : 'completed')
      assert.deepEqual(result.value, expected)
      if (scenario === 'cap') assert.match(result.error, /retry cap.*5/i)
      if (scenario === 'ignore') assert.match(result.error, /structured/i)
      assert.equal(requests.length - from, expectedCalls)
      if (scenario === 'nudge') assert.ok(requests.slice(from).some(request => JSON.stringify(request.messages).includes('[structured-output-enforce]')))
      if (scenario === 'cap') assert.ok(events.slice(eventFrom).some(event => /retry cap.*5/.test(event.params?.event?.error ?? '')))
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
  }

  for (const scenario of ['batch', 'cap']) {
    const from = requests.length
    const run = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"lifecycle-${scenario}",description:"Whole response semantics"}; return await agent("CHILD lifecycle-${scenario}",{schema:{type:"object",properties:{value:{type:"string"}},required:["value"]}})` })
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: run.runId })
    const marker = await fs.readFile(path.join(workspace, `lifecycle-${scenario}.txt`), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error })
    check(`installed workflow lifecycle ${scenario}: response result and actual write`, () => {
      assert.equal(requests.length - from, 1)
      assert.equal(result.stopReason, scenario === 'batch' ? 'completed' : 'error')
      assert.deepEqual(result.value, scenario === 'batch' ? { value: 'second' } : null)
      assert.equal(marker, scenario === 'batch' ? 'LIFECYCLE_INSTALLED_MARKER' : null)
      if (scenario === 'cap') assert.match(result.error, /retry cap.*5/i)
    })
    await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: run.runId })
  }

  const caughtSchemaFrom = requests.length
  const caughtSchemaRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"schema-catch",description:"Structured failure propagation"}; let caught=false; try { await agent("CHILD schema-ignore",{schema:${JSON.stringify(richSchema)}}) } catch(error) { caught=/structured/i.test(error.message) } return {caught,items:await parallel([()=>agent("CHILD schema-ignore",{schema:${JSON.stringify(richSchema)}})])}` })
  const caughtSchemaResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: caughtSchemaRun.runId })
  check('installed workflow catches structured failures and contains failed parallel items', () => {
    assert.equal(caughtSchemaResult.stopReason, 'completed')
    assert.deepEqual(caughtSchemaResult.value, { caught: true, items: [null] })
    assert.equal(requests.length - caughtSchemaFrom, 4)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: caughtSchemaRun.runId })

  const impossibleFrom = requests.length
  const impossibleRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"impossible-schema",description:"Reject before spawn"}; return await agent("CHILD schema-impossible",{schema:{type:"object",properties:{value:{type:"string",minLength:5,maxLength:1}}}})' })
  const impossibleResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: impossibleRun.runId })
  check('installed workflow rejects impossible schemas without a model call', () => {
    assert.equal(impossibleResult.stopReason, 'error')
    assert.match(impossibleResult.error, /unusable schema/)
    assert.equal(requests.length, impossibleFrom)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: impossibleRun.runId })

  const memoFile = path.join(workspace, 'schema-memo-child.js')
  const memoBody = 'let schema={type:"object",properties:{value:{type:"string",enum:["first"]}},required:["value"]};const first=await agent("CHILD schema-memo",{schema});schema.properties.value.enum=["second"];const second=await agent("CHILD schema-memo",{schema});schema=JSON.parse(JSON.stringify(schema));return [first,second,await agent("CHILD schema-memo",{schema})]'
  await fs.writeFile(memoFile,'export const meta={name:"schema-child",description:"Schema references"};'+memoBody)
  for (const nested of [false,true]) {
    const from=requests.length
    const run=await client.request('codeDesktop/workflow/startScript',{threadId:direct,script:'export const meta={name:"schema-memo",description:"Schema reference identity"};'+(nested?'return await workflow({scriptPath:args})':memoBody),args:memoFile})
    try {
      const result=await client.request('codeDesktop/workflow/scriptResult',{threadId:direct,runId:run.runId})
      check(`installed ${nested?'child':'root'} schema reference copies`,()=>{
        assert.equal(result.stopReason,'completed',result.error)
        assert.deepEqual(result.value,[{value:'first'},{value:'first'},{value:'second'}])
        assert.deepEqual(requests.slice(from).map(request=>request.tools.find(tool=>tool.name==='structured_output').input_schema.properties.value.enum),[['first'],['first'],['second']])
      })
    } finally { await client.request('codeDesktop/workflow/releaseScript',{threadId:direct,runId:run.runId}) }
  }

  const nestedFile = path.join(workspace, 'nested-child.js')
  const nestedRoot = 'export const meta={name:"nested-check",description:"Nested execution"};'
  for (const [name,child,body,expected] of [
    ['realms', 'const p=parallel([()=>({n:1})]);const v=await p;return {local:args instanceof Object,cycle:args.self===args,bigint:String(args.n),promise:p instanceof Promise,foreign:!(v instanceof Array)&&!(v[0] instanceof Object)}', 'const input={n:42n};input.self=input;const v=await workflow({scriptPath:args},input);return {childForeign:!(v instanceof Object),...v}', {childForeign:true,local:true,cycle:true,bigint:'42',promise:true,foreign:true}],
    ['timers', 'phase("ignored");setTimeout(()=>log("later"),5);throw "failed"', 'try{await workflow({scriptPath:args})}catch{}await new Promise(r=>setTimeout(r,30));return 42', 42],
    ['shared hooks', 'const previous=[setTimeout.marker??null,budget.spent.marker??null];setTimeout.marker="child";budget.spent.marker="child";return previous', 'setTimeout.marker="root";budget.spent.marker="root";const first=await workflow({scriptPath:args});const second=await workflow({scriptPath:args});return {first,second,parent:[setTimeout.marker,budget.spent.marker]}', {first:['root','root'],second:['child','child'],parent:['child','child']}],
    ['errors', 'throw {name:"ChildFailure",message:"retained",stack:"header\\n  at child"}', 'try{await workflow({scriptPath:args})}catch(e){return {name:e.name,message:e.message,stack:e.stack,frozen:Object.isFrozen(e),nullPrototype:Object.getPrototypeOf(e)===null}}', {name:'ChildFailure',message:'retained',stack:'ChildFailure: retained\n  at child',frozen:true,nullPrototype:true}],
  ]) {
    await fs.writeFile(nestedFile,'export const meta={name:"child",description:"Child"};'+child)
    const eventFrom=events.length,requestFrom=requests.length
    const run=await client.request('codeDesktop/workflow/startScript',{threadId:direct,script:nestedRoot+body,args:nestedFile})
    const result=await client.request('codeDesktop/workflow/scriptResult',{threadId:direct,runId:run.runId})
    check(`installed nested workflow ${name}`,()=>{
      assert.equal(result.stopReason,'completed',result.error)
      assert.deepEqual(result.value,expected)
      assert.equal(requests.length,requestFrom)
      const progress=events.slice(eventFrom).filter(e=>e.method==='codeDesktop/workflow/event'&&e.params?.runId===run.runId).map(e=>e.params.event)
      assert.equal(progress.filter(e=>e.type==='phase').length,0)
      if(name==='timers')assert.deepEqual(progress.filter(e=>e.type==='log').map(e=>e.message),['▸ running dynamic workflow child','▸ child failed: Error: failed','[child] later'])
    })
    await client.request('codeDesktop/workflow/releaseScript',{threadId:direct,runId:run.runId})
  }
  const nestedAgentSource='export const meta={name:"child",description:"Child"};phase("ignored");return await agent("CHILD nested-reuse",{phase:"override"})'
  await fs.writeFile(nestedFile,nestedAgentSource)
  const nestedRequestFrom=requests.length,nestedEventFrom=events.length
  const nestedCalls=nestedRoot+'await workflow({scriptPath:args.path},args.unused);return await workflow({scriptPath:args.path},args.unused)'
  const nestedRun=await client.request('codeDesktop/workflow/startScript',{threadId:direct,script:nestedCalls,args:{path:nestedFile,unused:1}})
  const nestedResult=await client.request('codeDesktop/workflow/scriptResult',{threadId:direct,runId:nestedRun.runId})
  check('installed nested agents use repeated child phase groups',()=>{
    assert.equal(nestedResult.stopReason,'completed',nestedResult.error)
    assert.equal(requests.length-nestedRequestFrom,2)
    assert.deepEqual(events.slice(nestedEventFrom).filter(e=>e.method==='codeDesktop/workflow/event'&&e.params?.runId===nestedRun.runId&&e.params?.event?.type==='phase').map(e=>e.params.event.title),['▸ child','▸ child #2'])
  })
  await client.request('codeDesktop/workflow/releaseScript',{threadId:direct,runId:nestedRun.runId})
  await fs.writeFile(nestedFile,nestedAgentSource+'\n// An unused source edit preserves the actual agent prefix.\n')
  const nestedResumed=await client.request('codeDesktop/workflow/startScript',{threadId:direct,script:nestedCalls,args:{path:nestedFile,unused:2},resumeFromRunId:nestedRun.runId})
  const nestedCached=await client.request('codeDesktop/workflow/scriptResult',{threadId:direct,runId:nestedResumed.runId})
  check('installed nested resume ignores unused child source and arguments',()=>{
    assert.equal(nestedCached.stopReason,'completed',nestedCached.error)
    assert.deepEqual(nestedCached.value,nestedResult.value)
    assert.equal(requests.length-nestedRequestFrom,2)
  })
  await client.request('codeDesktop/workflow/releaseScript',{threadId:direct,runId:nestedResumed.runId})

  const intrinsicFrom = requests.length
  for (const [name,body,expected] of [
    ['absent','return undefined',undefined],
    ['null','return null',null],
    ['sanitized','console.warn({x:1,toJSON(){throw 1}});return {drop:undefined,method(){},values:[,()=>1,NaN],data:{x:1,toJSON(){throw 1}}}',{values:[null,null,null],data:{x:1}}],
    ['failure','throw {name:"Failure",message:"retained",stack:"  at first\\n  at second"}',undefined],
  ]) {
    const eventStart=events.length;
    const run=await client.request('codeDesktop/workflow/startScript',{threadId:direct,script:`export const meta={name:"result-${name}",description:"Completion semantics"};`+body});
    const result=await client.request('codeDesktop/workflow/scriptResult',{threadId:direct,runId:run.runId});
    check(`installed engine preserves ${name} completion semantics`,()=>{
      assert.equal(result.stopReason,name==='failure'?'error':'completed');
      if(name==='failure')assert.equal(result.error,'Failure: retained\n  at first\n  at second');
      else {assert.deepEqual(result.value,expected);assert.equal(Object.hasOwn(result,'value'),expected!==undefined)}
      if(name==='sanitized')assert.ok(events.slice(eventStart).some(e=>e.method==='codeDesktop/workflow/event'&&e.params?.runId===run.runId&&e.params?.event?.type==='log'&&e.params.event.message==='[warn] {"x":1}'));
      assert.equal(requests.length,intrinsicFrom);
    });
    await client.request('codeDesktop/workflow/releaseScript',{threadId:direct,runId:run.runId});
  }
  const intrinsicRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct,
    script: 'export const meta={name:"intrinsic-check",description:"Strict script and input semantics"};let clockBlocked=false,strictBlocked=false,sparseRejected=false;try{new (new Date(0)).constructor()}catch{clockBlocked=true}try{workflowUndeclared=1}catch{strictBlocked=true}try{await parallel([,()=>1])}catch{sparseRejected=true}class E extends Error{constructor(){super("x");this.name="FixtureError"}}return {clockBlocked,strictBlocked,sparseRejected,frozen:Object.isFrozen(Array.prototype),name:new E().name,argsRealm:args instanceof Object&&args.nested instanceof Array,empty:await pipeline([],1),sparse:await pipeline([,1],value=>typeof value)}', args: { nested: [1] } })
  const intrinsicResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: intrinsicRun.runId })
  check('installed engine enforces strict intrinsics, dense combinators and guest argument prototypes', () => {
    assert.equal(intrinsicResult.stopReason, 'completed')
    assert.deepEqual(intrinsicResult.value, { clockBlocked: true, strictBlocked: true, sparseRejected: true, frozen: true, name: 'FixtureError', argsRealm: true, empty: [], sparse: ['undefined', 'number'] })
    assert.equal(requests.length, intrinsicFrom, 'guest-only validation must not call a model')
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: intrinsicRun.runId })

  const boundaryRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: "export const meta={name:\"boundary-check\",description:\"Guest helper values\"};\nparallel(0);pipeline(0);\nconst source={n:1};source.self=source;\nconst promise=parallel([()=>source,()=>source]);const values=await promise;\nlet error;try{await pipeline([1],0)}catch(e){error={name:e.name,frozen:Object.isFrozen(e),nullPrototype:Object.getPrototypeOf(e)===null,code:typeof e.code}}\nawait new Promise(r=>setTimeout(r,10));\nreturn {promise:promise instanceof Promise,array:values instanceof Array,object:values[0] instanceof Object,copy:values[0]!==source,alias:values[0]===values[1],cycle:values[0].self===values[0],error};" })
  const boundaryResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: boundaryRun.runId })
  check('installed helper promises, copied identities and frozen failures use the guest realm', () => {
    assert.equal(boundaryResult.stopReason, 'completed')
    assert.deepEqual(boundaryResult.value, {"promise": true, "array": true, "object": true, "copy": true, "alias": true, "cycle": true, "error": {"name": "TypeError", "frozen": true, "nullPrototype": true, "code": "undefined"}})
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: boundaryRun.runId })

  const asyncRun = await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: `export const meta={name:"async-check",description:"Resolve iterator values"};
    let n=0,closed=0;
    const source={ [Symbol.asyncIterator](){return {next(){return {done:false,value:Promise.resolve(++n)}},return(){return {done:true,value:{then(resolve){closed++;resolve(2)}}}}}} };
    const values=[];for await(const value of source){values.push([value,typeof value]);break}
    async function* generated(){yield await Promise.resolve(3);yield* [Promise.resolve(4)];return 5}
    const it=generated();return {values,closed,generated:[await it.next(),await it.next(),await it.next()]};` })
  const asyncResult = await client.request('codeDesktop/workflow/scriptResult', { threadId: direct, runId: asyncRun.runId })
  check('installed compiler resolves async iterator and generator values before publication', () => {
    assert.equal(asyncResult.stopReason, 'completed')
    assert.deepEqual(asyncResult.value, { values: [[1, 'number']], closed: 1, generated: [{ value: 3, done: false }, { value: 4, done: false }, { value: 5, done: true }] })
    assert.equal(requests.length, intrinsicFrom)
  })
  await client.request('codeDesktop/workflow/releaseScript', { threadId: direct, runId: asyncRun.runId })
  const refusedScripts = []
  for (const body of ['const __wRg$hidden=1;return 1', 'if(false)import("node:fs");return 1', 'await using resource=null;return 1']) {
    try { await client.request('codeDesktop/workflow/startScript', { threadId: direct, script: 'export const meta={name:"compiler-refusal",description:"Reject before launch"};'+body }); refusedScripts.push(null) }
    catch (error) { refusedScripts.push(error.message) }
  }
  check('installed compiler rejects reserved bindings, imports and await using before starting model work', () => {
    assert.equal(refusedScripts.length, 3)
    for (const message of refusedScripts) assert.match(message, /does not parse/)
    assert.equal(requests.length, intrinsicFrom)
  })

  const manualDirectory = path.join(home, 'manual-run')
  await fs.mkdir(manualDirectory)
  const manualSource = 'export const meta={name:"manual-hosted",description:"Manual entry parity"}; phase("Child"); return await agent("CHILD manual");'
  const launchManual = async resume => {
    const observed = [], errors = []
    const child = childProcess.fork(path.resolve(root, '../app/electron/workflow-child.mjs'), [], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] })
    child.stderr.on('data', chunk => errors.push(String(chunk)))
    child.on('message', message => { if (message.event) observed.push(message.event) })
    const finished = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('manual workflow timed out')) },60000)
      child.once('error', reject)
      child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(observed) : reject(new Error(JSON.stringify(observed)+errors.join(''))) })
    })
    child.send({ source: manualSource, directory: manualDirectory, cwd: workspace, args: null, access: 'workspace-write', model, effort: 'high', resume, command: path.join(root, 'bin/codex-app-server.mjs'), commandArgs: ['app-server','--stdio'], version: 'test' })
    return finished
  }
  const manual = await launchManual(false)
  const originalState = JSON.parse(await fs.readFile(path.join(manualDirectory, 'engine.json'), 'utf8'))
  const manualResumed = await launchManual(true)
  check('actual /workflow child process uses the shared engine and resumes after a core restart', () => {
    assert.equal(manual.find(event => event.type === 'result')?.result, 'child ok')
    assert.equal(manualResumed.find(event => event.type === 'result')?.result, 'child ok')
    assert.ok(manualResumed.some(event => event.type === 'cached'))
    const resumedState = JSON.parse(fsSync.readFileSync(path.join(manualDirectory, 'engine.json'), 'utf8'))
    assert.equal(resumedState.threadId, originalState.threadId)
    assert.equal(resumedState.runId, originalState.runId)
    assert.notEqual(resumedState.attemptId, originalState.attemptId)
  })
  const privateManual = path.join(process.env.DSH_HOME, 'workflows', createHash('sha256').update(JSON.stringify(originalState.threadId)).digest('hex'), originalState.runId)
  assert.ok(fsSync.existsSync(privateManual), 'the private fixture directory must exist before removal')
  await fs.rm(privateManual, { recursive: true })
  const beforeRecovery = requests.length
  const manualRecovered = await launchManual(true)
  check('installed cold core restores a removed run directory from the retained Session without rerunning its child', () => {
    assert.equal(manualRecovered.find(event => event.type === 'result')?.result, 'child ok')
    assert.ok(manualRecovered.some(event => event.type === 'cached'), JSON.stringify({ events: manualRecovered, requestsBefore: beforeRecovery, requestsAfter: requests.length, state: JSON.parse(fsSync.readFileSync(path.join(manualDirectory, 'engine.json'), 'utf8')) }))
    assert.equal(requests.length, beforeRecovery)
    assert.ok(fsSync.existsSync(path.join(privateManual, 'current.json')))
  })

  // The setting turned off for a live thread: the next turn has no workflow tool.
  await client.request('codeDesktop/thread/permissions', { threadId: wfId, codeDesktop: { dynamicWorkflows: false } })
  from = events.length
  const offFrom = requests.length
  await client.request('turn/start', { threadId: wfId, input: [{ type: 'text', text: 'after the setting went off' }] })
  await turnDone(wfId, from)
  check('Dynamic workflows off: the tool is hidden again', () => {
    assert.ok(requests.slice(offFrom).length > 0)
    assert.ok(requests.slice(offFrom).every((body) => !(body.tools ?? []).some((tool) => tool.name === 'Workflow')))
  })

  if (!process.env.WORKFLOW_SMOKE_ONLY) {
  // Per-session tool selection (tool-gate.js): a turned-off tool is not sent, a call to it writes nothing,
  // other tools stay, and clearing the selection brings it back.
  const toolList = await client.request('codeDesktop/tools/list', {})
  check('codeDesktop/tools/list lists the builtin tools', () => {
    assert.ok(toolList.tools.some((tool) => tool.name === 'write' && tool.kind === 'builtin'))
    assert.ok(toolList.tools.some((tool) => tool.name === 'bash'))
    assert.ok(Array.isArray(toolList.servers))
  })
  const gatedFile = path.join(workspace, 'gated.txt')
  const gated = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'workspace-write', codeDesktop: { tools: { disabled: ['write'] } } })).thread.id
  from = events.length
  const gatedFrom = requests.length
  await client.request('turn/start', { threadId: gated, input: [{ type: 'text', text: `WRITE_FILE ${gatedFile}` }] })
  await turnDone(gated, from)
  check('a turned-off tool is not offered and its call writes nothing', () => {
    // The agent's own requests: the session-title request (no tools) can land in between.
    const sent = requests.slice(gatedFrom).filter((body) => !textOf(body.messages?.find((message) => message.role === 'user')?.content).startsWith('Generate the session title'))
    assert.ok(sent.length > 0)
    assert.ok(sent.every((body) => !(body.tools ?? []).some((tool) => tool.name === 'write')))
    assert.ok(sent.every((body) => (body.tools ?? []).some((tool) => tool.name === 'bash')), 'other tools stay')
    assert.equal(fsSync.existsSync(gatedFile), false)
  })
  from = events.length
  const clearedFrom = requests.length
  await client.request('turn/start', { threadId: gated, input: [{ type: 'text', text: 'tools back' }], codeDesktop: { tools: null } })
  await turnDone(gated, from)
  check('clearing the selection offers the tool again', () => {
    assert.ok(requests.slice(clearedFrom).some((body) => (body.tools ?? []).some((tool) => tool.name === 'write')))
  })

  }

  // 3. CLI model calls reject foreground flags; live jobs remain independently stoppable.
  const runningAgent = (threadId, name, start) => waitFor((event) => events.indexOf(event) >= start && event.params?.threadId === threadId
    && event.params?.item?.workflowRun?.name === name && event.params.item.workflowRun.workflowProgress.some((entry) => entry.type === 'workflow_agent' && entry.state === 'progress'))
  const fg = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } })).thread.id
  from = events.length
  await client.request('turn/start', { threadId: fg, input: [{ type: 'text', text: 'RUN_SLOW_FOREGROUND' }] })
  const fgTurn = await turnDone(fg, from)
  const fgRejected = events.slice(from).filter(event => event.params?.threadId === fg && event.params?.item?.workflowRun).at(-1)?.params.item
  check('foreground extension is rejected by the installed tool', () => {
    assert.match(fgRejected.contentItems.map(part => part.text ?? '').join(''), /unexpected parameter run_in_background/)
    assert.equal(fgRejected.workflowRun.status, 'failed')
  })
  check('rejected input starts no engine or child', () => {
    assert.equal(fgRejected.workflowRun.runId, null)
    assert.deepEqual(fgRejected.workflowRun.workflowProgress, [])
    assert.equal(fgTurn.params.turn.status, 'completed')
  })

  const bg = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } })).thread.id
  from = events.length
  await client.request('turn/start', { threadId: bg, input: [{ type: 'text', text: 'RUN_SLOW_BACKGROUND' }] })
  await turnDone(bg, from)
  const bgLive = (await runningAgent(bg, 'slow-background', from)).params.item.workflowRun
  const bgItem = events.slice(from).filter((event) => event.params?.threadId === bg && event.params?.item?.workflowRun).at(-1).params.item
  check('a background run keeps running after its tool call returns', () => {
    assert.equal(bgItem.status, 'completed')
    assert.equal(bgItem.workflowRun.background, true)
    assert.equal(typeof bgItem.workflowRun.jobId, 'string')
    assert.equal(bgLive.status, 'running')
  })
  const bgFrom = events.length
  const bgStop = await client.request('codeDesktop/workflow/stop', { threadId: bg, runId: bgLive.runId, attemptId: bgLive.attemptId })
  const bgEnd = await waitFor((event) => events.indexOf(event) >= bgFrom && event.params?.threadId === bg && event.params?.item?.workflowRun?.status && event.params.item.workflowRun.status !== 'running')
  check('stopping a background run kills its job', () => {
    assert.equal(bgStop.status, 'stopping')
    assert.equal(bgEnd.params.item.workflowRun.status, 'stopped')
  })
  // 4. Background terminals: a bash job keeps its command running, listed and stoppable.
  const term = (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'workspace-write' })).thread.id
  from = events.length
  await client.request('turn/start', { threadId: term, input: [{ type: 'text', text: 'RUN_BG_JOB now' }] })
  const bgCommand = (await waitFor((event) => events.indexOf(event) >= from && event.method === 'item/started' && event.params?.threadId === term && event.params.item?.type === 'commandExecution' && event.params.item.processId)).params.item
  await turnDone(term, from)
  const reannounced = await waitFor((event) => events.indexOf(event) >= from && event.method === 'item/started' && event.params?.item?.id === bgCommand.id
    && events.slice(from, events.indexOf(event)).some((earlier) => earlier.method === 'turn/completed' && earlier.params?.threadId === term))
  await waitFor((event) => events.indexOf(event) >= from && event.method === 'item/commandExecution/outputDelta' && event.params?.itemId === bgCommand.id && /bg-ready/.test(event.params.delta), 10000)
    .catch(() => null)
  const terminals = await client.request('thread/backgroundTerminals/list', { threadId: term, limit: 100 })
  check('a background bash job is a running command with the job as its processId', () => {
    assert.match(bgCommand.processId, /^bash-\d+$/)
    assert.equal(bgCommand.status, 'inProgress')
    assert.equal(reannounced.params.item.status, 'inProgress', 'announced again as running after its turn completed')
    assert.deepEqual(terminals.data.map((row) => [row.itemId, row.processId]), [[bgCommand.id, bgCommand.processId]])
    assert.equal(terminals.nextCursor, null)
  })
  const streamed = events.slice(from).filter((event) => event.method === 'item/commandExecution/outputDelta' && event.params?.itemId === bgCommand.id).map((event) => event.params.delta).join('')
  const resumedRow = (await client.request('thread/read', { threadId: term, includeTurns: true })).thread.turns.flatMap((turn) => turn.items).find((item) => item.id === bgCommand.id)
  if (process.env.SMOKE_DEBUG) console.log('streamed:', JSON.stringify(streamed), 'row:', JSON.stringify(resumedRow?.aggregatedOutput))
  check('its live output streams into the command row', () => {
    assert.match(streamed + (resumedRow?.aggregatedOutput ?? ''), /bg-ready/)
    assert.equal(resumedRow.status, 'inProgress')
  })
  const stopFrom = events.length
  const stopped = await client.request('thread/backgroundTerminals/terminate', { threadId: term, processId: bgCommand.processId })
  const settledRow = await waitFor((event) => events.indexOf(event) >= stopFrom && event.method === 'item/completed' && event.params?.item?.id === bgCommand.id)
  const afterStop = await client.request('thread/backgroundTerminals/list', { threadId: term })
  const unknownStop = await client.request('thread/backgroundTerminals/terminate', { threadId: term, processId: 'bash-999' })
  check('terminate stops the job and settles its command as stopped', () => {
    assert.equal(stopped.terminated, true)
    assert.equal(settledRow.params.item.status, 'interrupted')
    assert.deepEqual(afterStop.data, [])
    assert.equal(unknownStop.terminated, false)
  })

  // 5. thread/fork: a new session seeded with the source's history through a turn.
  check('fork is no longer an unsupported method', () => assert.ok(!init.capabilities.unsupportedMethods.includes('thread/fork')))
  const sourceTurns = (await client.request('thread/turns/list', { threadId, limit: 50, sortDirection: 'asc' })).data
  const forkFrom = events.length
  const forked = await client.request('thread/fork', { threadId, lastTurnId: sourceTurns[0].id, approvalPolicy: 'never', sandbox: 'read-only' })
  check('thread/fork returns a new thread that copied the history through the turn', () => {
    assert.notEqual(forked.thread.id, threadId)
    assert.equal(forked.thread.forkedFromId, threadId)
    assert.deepEqual(forked.thread.turns.map((turn) => turn.id), [sourceTurns[0].id])
    assert.ok(events.slice(forkFrom).some((event) => event.method === 'thread/started' && event.params?.thread?.id === forked.thread.id))
  })
  const forkedLean = await client.request('thread/fork', { threadId, excludeTurns: true })
  check('excludeTurns leaves the turns to thread/turns/list', () => assert.deepEqual(forkedLean.thread.turns, []))
  from = events.length
  const forkRequests = requests.length
  await client.request('turn/start', { threadId: forked.thread.id, input: [{ type: 'text', text: 'FORK_FOLLOWUP' }] })
  await turnDone(forked.thread.id, from)
  const forkBody = requests.slice(forkRequests).find((body) => /FORK_FOLLOWUP/.test(JSON.stringify(body.messages)))
  const forkedTurns = (await client.request('thread/turns/list', { threadId: forked.thread.id, limit: 50, sortDirection: 'asc' })).data
  check('the fork continues with the copied conversation and keeps the source\'s instructions', () => {
    assert.ok(forkBody, 'no request for the fork follow-up')
    assert.match(JSON.stringify(forkBody.messages), /What is the answer\?/)
    assert.doesNotMatch(JSON.stringify(forkBody.messages), /plain follow-up/, 'a turn after the cut leaked into the fork')
    assert.match(systemOf(forkBody), /DEV_INSTRUCTIONS_MARKER/)
    assert.equal(forkedTurns.length, 2)
  })
  const badFork = await client.request('thread/fork', { threadId, lastTurnId: 'turn-missing' }).then(() => null, (error) => error)
  check('a fork at an unknown turn fails with INVALID_PARAMS', () => assert.equal(badFork?.code, -32602))

  // 6. The core's own slash commands (dsh-commands).
  const commandList = await client.request('codeDesktop/commands/list', { threadId: forked.thread.id })
  check('the core lists its own slash commands, not the ones the app drives', () => {
    assert.equal(init.capabilities.coreCommands, true)
    assert.ok(commandList.data.some((command) => command.name === 'goal'), JSON.stringify(commandList.data))
    assert.ok(!commandList.data.some((command) => ['compact', 'plan', 'permission'].includes(command.name)))
  })
  // turn/start's permission params: a command can start a model turn (commands.js).
  const commandPermission = { approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [], networkAccess: false }, codeDesktop: { permissionMode: 'ask', afterPlan: 'auto' } }
  const goal = await client.request('codeDesktop/commands/execute', { threadId: forked.thread.id, command: 'goal', args: '', ...commandPermission })
  const unknownCommand = await client.request('codeDesktop/commands/execute', { threadId: forked.thread.id, command: 'nope', ...commandPermission }).then(() => null, (error) => error)
  const unpermittedCommand = await client.request('codeDesktop/commands/execute', { threadId: forked.thread.id, command: 'goal', args: 'x' }).then(() => null, (error) => error)
  if (process.env.SMOKE_DEBUG) console.log('goal:', JSON.stringify(goal), 'commands:', commandList.data.map((command) => command.name).join(' '))
  check('a core command runs against the thread', () => {
    assert.ok(['success', 'error'].includes(goal.kind))
    assert.equal(typeof goal.commandId, 'string')
    assert.equal(unknownCommand?.code, -32602)
  })
  check('a core command without the session\'s permission is refused', () => {
    assert.equal(unpermittedCommand?.code, -32602)
    assert.match(unpermittedCommand.message, /permission/)
  })

  // 7. Plugins: a local bundle installed, disabled and removed through dsh-plugin-manager.
  check('the core runs its profile from the Harness home and can manage plugins', () => {
    assert.equal(init.capabilities?.pluginManage, true)
    assert.equal(init.configPath, path.join(process.env.DSH_HOME, 'code-desktop', 'profile', 'cordis.patch.yml'))
  })
  const plugin = path.join(home, 'cd-smoke-plugin')
  await fs.mkdir(plugin, { recursive: true })
  await fs.writeFile(path.join(plugin, 'package.json'), JSON.stringify({ name: 'cd-smoke-plugin', version: '1.2.3', description: 'Smoke test plugin', dsh: { bundle: { patch: './cordis.patch.yml' } } }, null, 2))
  await fs.writeFile(path.join(plugin, 'cordis.patch.yml'), '[]\n')
  const notPlugin = path.join(home, 'not-a-plugin')
  await fs.mkdir(notPlugin, { recursive: true })
  await fs.writeFile(path.join(notPlugin, 'package.json'), JSON.stringify({ name: 'plain-package', version: '1.0.0' }))
  const inspected = await client.request('codeDesktop/plugin/inspect', { spec: plugin })
  const refused = await client.request('codeDesktop/plugin/inspect', { spec: notPlugin })
  check('inspect reads a spec before anything installs', () => {
    assert.equal(inspected.status, 'accepted')
    assert.equal(inspected.name, 'cd-smoke-plugin')
    assert.equal(inspected.bundle, true)
    assert.equal(refused.status, 'refused')
    assert.equal(refused.problem, 'not-a-bundle')
  })
  from = events.length
  const installed = await client.request('codeDesktop/plugin/install', { spec: plugin, requestId: 'smoke-install' }, 300000)
  const listed = await client.request('plugin/installed', {})
  const row = listed.marketplaces[0].plugins.find((candidate) => candidate.id === 'cd-smoke-plugin')
  check('install adds and enables the bundle, reporting progress and output', () => {
    assert.equal(installed.changed, true, JSON.stringify(installed).slice(0, 800))
    assert.equal(installed.requestId, 'smoke-install')
    assert.ok(['applied', 'restart-required'].includes(installed.application))
    assert.ok(events.slice(from).some((event) => event.method === 'codeDesktop/plugin/installProgress' && event.params.requestId === 'smoke-install' && event.params.phase === 'installing'))
    assert.ok(events.slice(from).some((event) => event.method === 'codeDesktop/plugin/installLog' && event.params.requestId === 'smoke-install'))
    assert.ok(events.slice(from).some((event) => event.method === 'codeDesktop/plugin/changed'))
    assert.ok(row, 'not listed')
    assert.equal(row.enabled, true)
    assert.equal(row.codeDesktop.removable, true)
  })
  const profileManifest = JSON.parse(await fs.readFile(path.join(process.env.DSH_HOME, 'code-desktop', 'profile', 'package.json'), 'utf8'))
  check('the plugin lives in the user profile, not in this checkout', () => {
    assert.ok(profileManifest.dsh.profile.bundles.includes('cd-smoke-plugin'))
    assert.ok(profileManifest.dsh.profile.bundles.includes('@code-desktop/dsh-code-desktop-app'))
  })
  const checkout = JSON.parse(await fs.readFile(path.join(root, 'profile', 'package.json'), 'utf8'))
  check('the checkout template is untouched', () => assert.ok(!JSON.stringify(checkout).includes('cd-smoke-plugin')))
  const disabled = await client.request('codeDesktop/plugin/setEnabled', { pluginName: 'cd-smoke-plugin', enabled: false })
  const afterDisable = (await client.request('plugin/installed', {})).marketplaces[0].plugins.find((candidate) => candidate.id === 'cd-smoke-plugin')
  check('a plugin can be turned off', () => {
    assert.equal(disabled.changed, true)
    assert.equal(afterDisable.enabled, false)
  })
  const core = (await client.request('plugin/installed', {})).marketplaces[0].plugins.find((candidate) => candidate.id === '@code-desktop/dsh-code-desktop-app')
  const protectedRemove = await client.request('codeDesktop/plugin/remove', { pluginName: '@code-desktop/dsh-code-desktop-app' }, 120000).then((result) => result, (error) => ({ thrown: error.message }))
  check('the core\'s own bundle cannot be removed', () => {
    assert.equal(core.codeDesktop.removable, false)
    assert.ok(protectedRemove.thrown || protectedRemove.changed === false, JSON.stringify(protectedRemove).slice(0, 400))
  })
  const removed = await client.request('codeDesktop/plugin/remove', { pluginName: 'cd-smoke-plugin' }, 300000)
  const afterRemove = (await client.request('plugin/installed', {})).marketplaces[0].plugins.find((candidate) => candidate.id === 'cd-smoke-plugin')
  check('remove uninstalls it', () => {
    assert.equal(removed.changed, true, JSON.stringify(removed).slice(0, 800))
    assert.equal(afterRemove, undefined)
  })
  const badSpec = await client.request('codeDesktop/plugin/install', { spec: '--registry=evil' }).then(() => null, (error) => error)
  check('an option-looking spec is refused before pnpm runs', () => assert.equal(badSpec?.code, -32602))

  console.log(`\n${checks.length} checks passed`)
} catch (error) {
  exitCode = 1
  console.error('FAIL', error?.stack ?? error)
  console.error(stderr.join('').slice(-4000))
} finally {
  try { client.stop() } catch {}
  server.close()
  await fs.rm(home, { recursive: true, force: true }).catch(() => {})
  for (const dir of cleanup) await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  process.exit(exitCode)
}
