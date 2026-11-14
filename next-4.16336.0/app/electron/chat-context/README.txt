Chat context contributors (electron/chat-context.mjs reads every *.mjs file here, in file-name order).

The official Chat gets memory, project knowledge and the conversation's tool switches from claude.ai when it
completes a message. OpenClaude Desktop adds the local equivalents here, when main decorates a Chat or Cowork
session's thread/start or thread/resume (main.cjs requestRpc / requestCowork, right after applyProjectContext).
A Code session is never decorated.

A contributor file exports:

  export const id = "memory";            // unique, lowercase letters, digits and "-"; blocks are joined in id order
  export const surfaces = ["chat"];      // "chat" and/or "cowork"
  export async function apply({ config, method, params, surface, project, threadId, dataDir }) {
    // method: "thread/start" | "thread/resume"; params: a copy of the request (changing it has no effect);
    // project: the local project the session belongs to, or null; threadId: null on thread/start.
    return "Developer instructions to add";                          // or
    return { instructions: "…", config: { "some.key": "value" } };   // or null for nothing
  }

Only additions: the instructions are appended to params.developerInstructions (MAX_BLOCK_CHARS per contributor,
MAX_TOTAL_CHARS for all of them, longer text is cut), and config keys are added to params.config without replacing a
key the request (or an earlier contributor) already has. A contributor that throws is skipped; the message still goes.

Agent tools for one surface only: a module in electron/agent-tools may export `surfaces = ["chat"]`
(agent-tools-host.cjs); a session on another surface is neither listed nor allowed to call its tools.
