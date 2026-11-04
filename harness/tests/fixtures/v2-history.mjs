// OpenCode 2.2.5 session messages for the v2 history tests, in the shapes GET /api/session/:id/message returns
// (schema/src/session-message.ts: times are epoch ms, assistant content has no part ids, tool state streaming | running
// | completed | error with content[] and SessionError {type, message}). Each builder returns one message; `at` is its
// time.created. The scenarios are lists in seq order, as the server lists them.

let counter = 0
export const msgId = (label) => `msg_${String(++counter).padStart(4, '0')}${label}`

export const user = (id, at, text, extra = {}) => ({ id, type: 'user', time: { created: at }, text, ...extra })
export const synthetic = (id, at, text, extra = {}) => ({ id, type: 'synthetic', time: { created: at }, text, ...extra })
export const agentSwitched = (id, at, agent, previous) => ({ id, type: 'agent-switched', time: { created: at }, agent, ...(previous ? { previous } : {}) })
export const modelSwitched = (id, at, model) => ({ id, type: 'model-switched', time: { created: at }, model })
export const system = (id, at, text) => ({ id, type: 'system', time: { created: at }, text })
export const idle = (id, at, outcome = 'succeeded', error) => ({ id, type: 'idle', time: { created: at }, outcome, ...(error ? { error } : {}) })
export const compaction = (id, at, { status = 'completed', reason = 'manual', summary = 'What happened so far.', error } = {}) =>
  ({ id, type: 'compaction', time: { created: at }, status, reason, ...(status === 'failed' ? { error } : { summary }) })
export const shell = (id, at, command, { status = 'exited', exit = 0, output = '', completed = at + 5 } = {}) =>
  ({ id, type: 'shell', shellID: `shl_${id}`, command, status, ...(exit === undefined ? {} : { exit }), output: { output, cursor: output.length, size: output.length, truncated: false }, time: { created: at, ...(completed ? { completed } : {}) } })

export const text = (value) => ({ type: 'text', text: value })
export const reasoning = (value, at) => ({ type: 'reasoning', text: value, time: { created: at, completed: at + 1 } })
export const tool = (id, name, input, { status = 'completed', output = 'ok', metadata, error, files = [], at = 0 } = {}) => ({
  type: 'tool', id, name,
  state: status === 'streaming' ? { status, input: JSON.stringify(input).slice(0, 5) }
    : status === 'running' ? { status, input, metadata: metadata ?? {} }
      : status === 'error' ? { status, input, error, ...(metadata ? { metadata } : {}) }
        : { status, input, content: [text(output), ...files], ...(metadata ? { metadata } : {}) },
  time: { created: at, ...(status === 'streaming' ? {} : { ran: at + 1 }), ...(status === 'completed' || status === 'error' ? { completed: at + 2 } : {}) },
})

const TOKENS = { input: 100, output: 20, reasoning: 5, cache: { read: 50, write: 0 } }
export const assistant = (id, at, content, { finish = 'stop', error, completed = at + 10, tokens = TOKENS, cost = 0.001, agent = 'build', model = { id: 'claude-x', providerID: 'anthropic' } } = {}) => ({
  id, type: 'assistant', agent, model, content,
  ...(finish && completed ? { finish } : {}), ...(error ? { error } : {}), ...(completed && tokens ? { tokens, cost } : {}),
  time: { created: at, ...(completed ? { completed } : {}) },
})
