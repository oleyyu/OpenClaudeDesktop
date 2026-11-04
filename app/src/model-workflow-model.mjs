// Dynamic workflows the model starts itself: the DeepSeek core reports each run of its
// `workflow` tool on the tool item (item.workflowRun, harness workflows.js), already in
// this app's run shape (workflow-progress-model.mjs), so the transcript row and the
// Tasks card are the ones /workflow runs use. They live in the session's items, not in
// the local runner's store, and stop through the core (codeDesktop/workflow/stop).
export const isModelWorkflow = run => run?.source === 'model';

// The session's model-started runs, as Tasks pane workflow tasks.
export function modelWorkflowRuns(items, threadId) {
  return (items || []).filter(item => item?.workflowRun && typeof item.workflowRun.id === 'string')
    .map(item => ({ ...item.workflowRun, threadId, itemId: item.id }));
}

// A workflow tool item renders as its run's row (WorkflowRow), outside tool groups.
export function withModelWorkflowRows(items) {
  return (items || []).map(item => item?.workflowRun && typeof item.workflowRun.id === 'string'
    ? { id: item.id, turnId: item.turnId, workflowRun: item.workflowRun } : item);
}

// A model run is addressed by its call id until the core names it (call-… → run or
// attempt id); its tool item's id stays the same, so the task keeps one identity
// (React key, Tasks pane focus, dismissal) across the rename.
export const workflowKey = run => isModelWorkflow(run) && typeof run.itemId === 'string' ? 'item:' + run.itemId : run.id;

export const workflowTask = run => ({ id: 'workflow:' + workflowKey(run), kind: 'workflow', status: run.status, description: run.description,
  startedAt: run.startedAt, completedAt: run.completedAt, run });

// (W14-code r4 R4T-08b, E95: the host card's member Retry / Skip and their workflowMemberControls gate are gone.)
