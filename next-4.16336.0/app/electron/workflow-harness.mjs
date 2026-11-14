/** The manual launcher delegates to the core's workflow engine when available. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildThreadParams } from '../third-party/codex-workflows-runner/src/codexAgent.js';

// A core that has no such method: JSON-RPC -32601, or what a real Codex app-server
// (0.155.1) answers instead, -32600 "unknown variant `codeDesktop/diagnostics`".
export const unsupportedMethod = error => error?.code === -32601 || (error?.code === -32600 && /\bunknown (?:variant|method)\b/i.test(String(error.message)));

export async function runHarnessWorkflow(client, options, send, onRuntime) {
  // options.workflowScripts: whether the core's engine runs launcher scripts
  // (core-registry capability, workflow-service.cjs). A known core without it
  // (Codex) is never probed; an unknown one (override binary) is.
  if (options.workflowScripts === false) return { supported: false };
  let capabilities;
  try { capabilities = await client.request('codeDesktop/diagnostics', {}); }
  catch (error) { if (unsupportedMethod(error)) return { supported: false }; throw error; }
  if (!capabilities?.workflowExecute) return { supported: false };
  const statePath = join(options.directory, 'engine.json');
  let previous;
  if (options.resume) {
    try { previous = JSON.parse(await readFile(statePath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const threadParams = { ...buildThreadParams({ cwd: options.cwd, sandbox: options.access, model: options.model }), ...(options.effort ? { effort: options.effort } : {}) };
  const response = previous?.threadId ? await client.resumeThread({ ...threadParams, threadId: previous.threadId }) : await client.startThread(threadParams);
  const threadId = response.thread.id;
  let runId, attemptId, released;
  // Once per run: after a stop (cancel) as well as when the result is in.
  const release = () => released ??= client.request('codeDesktop/workflow/releaseScript', { threadId, runId, attemptId });
  const buffered = [];
  const receive = notification => {
    if (notification.method !== 'codeDesktop/workflow/event' || notification.params?.threadId !== threadId) return;
    if (!runId) buffered.push(notification.params);
    else if (notification.params.runId === runId && notification.params.attemptId === attemptId) send(notification.params.event);
  };
  client.on('notification', receive);
  try {
    const started = await client.request('codeDesktop/workflow/startScript', { threadId, script: options.source, args: options.args, ...(previous?.runId ? { resumeFromRunId: previous.runId } : {}) });
    // Replay what arrived before the ids were known before anything awaits: a live
    // event must never overtake a buffered one (an agent's end before its start).
    // workflow-child.mjs already sent the script's metadata when it parsed it.
    runId = started.runId;
    attemptId = started.attemptId;
    for (const entry of buffered.splice(0)) if (entry.runId === runId && entry.attemptId === attemptId) send(entry.event);
    await writeFile(statePath, JSON.stringify({ threadId, runId, attemptId }), { mode: 0o600, flush: true });
    onRuntime({
      // A stop releases the run too: the child exits right after (workflow-child.mjs close).
      cancel: async () => { try { await client.request('codeDesktop/workflow/stop', { threadId, runId, attemptId }); } finally { await release(); } },
    });
    const result = await client.request('codeDesktop/workflow/scriptResult', { threadId, runId, attemptId }, 2_147_483_647);
    if (result.stopReason !== 'completed') throw new Error(result.error ?? `Workflow ${result.stopReason}`);
    return { supported: true, value: result.value, outputFile: result.outputFile };
  } finally {
    client.off('notification', receive);
    if (runId) await release();
  }
}
