/** Manual workflow runs use the same engine and filesystem resolver as the model tool. */
import { resolveWorkflowSource } from '@deepseek-ai/dsh-tool-workflow';

// dsh-workflow-ptc ends a member the user skipped as 'failed' with the
// 'skipped by user' diagnostic, and members still live when the run settles as
// 'cancelled' (its own output marks both 'skipped'); the app shows them as Skipped.
export const agentEndStatus = info => info.outcome === 'completed' ? 'completed' : info.outcome === 'cancelled' || info.error === 'skipped by user' ? 'skipped' : 'failed';

export function createWorkflowExecutions(ctx, notify) {
  const runs = new Map();
  const latest = new Map();
  const sourceConfig = { inputMode: 'claude-code', maxScriptBytes: 524288, workflowDirectories: [] };
  const owned = (thread, id, attemptId) => {
    const entry = runs.get(attemptId ?? latest.get(id));
    if (!entry || entry.thread !== thread || entry.run.id !== id) throw new Error('Unknown workflow run for this session.');
    return entry;
  };
  return {
    async start(thread, params) {
      const controller = new AbortController();
      const engine = ctx.get('workflowEngine');
      if (!engine) throw new Error('Workflow execution is unavailable in this core.');
      if (params.resumeFromRunId !== undefined) engine.prepareResume(thread.agent, params.resumeFromRunId, params.scriptPath);
      const load = async (source, signal) => {
        const parsed = await resolveWorkflowSource(ctx.get('fs'), source, sourceConfig, signal, thread.agent.session.header.cwd);
        if (!parsed.meta) throw new Error('Workflow requires a literal metadata header.');
        return parsed;
      };
      const parsed = await load({ script: params.script, scriptPath: params.scriptPath, name: params.name }, controller.signal);
      const run = engine.start({ ...parsed, parent: thread.agent, signal: controller.signal, args: params.args, budgetTotal: params.budgetTotal, resumeFromRunId: params.resumeFromRunId, resolveWorkflow: load, origin: { automatedTrigger: 'Workflow explicitly started by the user in Lab.' } });
      const disposers = [];
      const emit = event => notify('codeDesktop/workflow/event', { threadId: thread.id, runId: run.id, attemptId: run.attemptId, event });
      const listen = (name, project) => disposers.push(ctx.on(name, (info, ...data) => { if (info.id === run.id && info.attemptId === run.attemptId) emit(project(...data)); }));
      listen('workflow/phase', (title, phase) => ({ type: 'phase', title, ...phase }));
      listen('workflow/log', message => ({ type: 'log', message }));
      listen('workflow/agent-admission', info => ({ type: 'admission', ...info, id: String(info.seq) }));
      listen('workflow/agent-start', info => ({ type: info.cached ? 'cached' : 'start', ...info, id: String(info.seq) }));
      listen('workflow/agent-progress', info => ({ type: 'progress', ...info, id: String(info.seq) }));
      listen('workflow/agent-end', info => ({ type: 'end', ...info, id: String(info.seq), status: agentEndStatus(info), ms: info.durationMs }));
      // Manual runs can close their core immediately after this response. Persist
      // Session mirror entries before acknowledging completion, including cache hits.
      const result = run.result.then(async value => { await run.dispose(); await ctx.sessions.flush(thread.agent.session); return { ...value, ...run.outputFile ? { outputFile: run.outputFile } : {} }; }).finally(() => { for (const dispose of disposers) dispose(); });
      void result.catch(() => {});
      const key = run.attemptId ?? run.id;
      runs.set(key, { thread, run, result });
      latest.set(run.id, key);
      return { runId: run.id, attemptId: run.attemptId, scriptPath: run.scriptPath, meta: run.meta };
    },
    has(thread, id) { return runs.get(latest.get(id))?.thread === thread; },
    member(thread, id, seq, action, attemptId) { return owned(thread, id, attemptId).run.controlMember?.(seq, action) === true; },
    stop(thread, id, attemptId) { owned(thread, id, attemptId).run.cancel('Stopped from Lab'); return { status: 'stopping' }; },
    result(thread, id, attemptId) { return owned(thread, id, attemptId).result; },
    async release(thread, id, attemptId) {
      const entry = owned(thread, id, attemptId), key = entry.run.attemptId ?? id;
      try { await entry.run.dispose(); await entry.result; }
      finally { if (runs.get(key) === entry) runs.delete(key); if (latest.get(id) === key) latest.delete(id); }
      return {};
    },
    async dispose() { const entries = [...runs.values()]; runs.clear(); latest.clear(); await Promise.allSettled(entries.map(async entry => { await entry.run.dispose(); await entry.result; })); },
  };
}
