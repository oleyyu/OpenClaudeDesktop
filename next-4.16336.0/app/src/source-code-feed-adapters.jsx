// The Code transcript feed's host side (W14-code r4 ct-feed): what the desktop's feed slices of the code transcript area
// (scripts/extract-code-transcript.mjs: the Workflow tool row F$, the workflow card N$) read from the desktop and the host
// answers instead. Re-exported by src/source-code-transcript-adapters.jsx (the area's adapter module), so the generated
// code imports these by name like every other adapter of the area.
//
//   localSessionClient    cef1e6037 Z: the desktop's local session client (its IPC bridge: queued messages, worktrees,
//                         session files). N$'s detailed card (k1e → D1e) reads a finished workflow's output file through
//                         it (`await ple.readFile?.(e.id, s, {automatic: !0})`); the host has no such client, so readFile
//                         is absent and D1e keeps the task's own workflowProgress (its "workflow-output-unavailable" branch).
//   workflowTask(run)     a host workflow run (workflow-progress-model.mjs: the CLI's workflowProgress — workflow_phase /
//                         workflow_agent entries, agent states start / progress / done / error / skipped) as the desktop's
//                         background task record (cea7057eb X, the session's tasks, read by F$ `Wx(t.id)` through Se's
//                         `toolUseId` and by N$): `taskType: "local_workflow"`, the run's status, progress and times.
//   workflowTasks(rows)   the session's workflow runs (its transcript rows' `workflowRun`) as that task list.
//
// W14-code r4 ct-feed R4T-09 (E95: E90's whole-block replacement, GUI acceptance): the desktop's Code feed draws its rows
// through c4a9ee384 ba (src/source-code-feed.jsx) inside its scroller; here that scroller is the host's
// (source-transcript.jsx, use-transcript-scroll.js), which hands the list what Aat's scroller hands it:
//   TranscriptFeedHostContext   {viewportRef (the scroll element), api (the host scroller's handle: isPinned, release,
//                               jumpToLatest), claim() (the list owns the feed's keyboard rows while mounted: the host's
//                               own feed navigation stands down; returns the release), holdAll (a store: true once the
//                               find bar searches the transcript, every row stays mounted as for printing, ba's `ji`),
//                               reveal (a store of the list's row reveal, for a chapter whose heading is not mounted),
//                               onEscape (W14-code r5 R5T-REG-01: Aat's `onEscape: o`, Escape on a message focuses the composer),
//                               scrollerApi (W14-code r6 review fix R6T-01: in Aat's scroller ooe, its api — the list's
//                               `scrollerApi: Je.api`, Cat's pinRef its follow; undefined in the host's scroller)}.
//   feedFollow(api)             Aat's `pinRef` (the scroller's follow: isPinned / setPinned / scrollToBottom /
//                               settledBottom / resnap) over the host scroller's handle.
export const TranscriptFeedHostContext = React.createContext(null);

/** A tiny value store (subscribe / get / set) for TranscriptFeedHostContext's holdAll and reveal. */
export function createFeedStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return false;
      value = next;
      for (const listener of [...listeners]) listener();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Aat's pinRef value (the official scroller's follow) over the host scroller's handle (use-transcript-scroll api). */
export function feedFollow(api) {
  return {
    isPinned: () => api?.isPinned?.() ?? true,
    setPinned: (pinned) => { if (pinned) api?.jumpToLatest?.(); else api?.release?.(); },
    scrollToBottom: () => { api?.jumpToLatest?.(); },
    settledBottom: () => 0,
    resnap: () => {},
  };
}

import React from "react";

/** cef1e6037 Z, the local session client (`capabilities: {cancelQueued: …, fetchTail: !1, …}`): none here. */
export const localSessionClient = Object.freeze({ capabilities: Object.freeze({}) });

const STATUSES = new Set(["running", "completed", "failed", "stopped"]);
const finite = (value) => (Number.isFinite(value) ? value : undefined);
const text = (value) => (typeof value === "string" && value ? value : undefined);

/**
 * A host workflow run as the desktop's background task (the fields N$ / F$ read: taskId, toolUseId, taskType,
 * description, name, status, workflowProgress, startedAt, completedAt, summary, usage). `toolUseId`: the transcript
 * row's id (the Workflow call the entries make of it, transcript-sdk-tools.mjs workflowRunTool).
 */
export function workflowTask(run, toolUseId = null) {
  if (!run || typeof run !== "object") return null;
  const status = STATUSES.has(run.status) ? run.status : "running";
  const progress = Array.isArray(run.workflowProgress) ? run.workflowProgress.filter((entry) => entry && typeof entry === "object" && typeof entry.type === "string") : [];
  return {
    taskId: text(run.runId) ?? text(run.id) ?? text(toolUseId) ?? "",
    toolUseId: text(toolUseId) ?? text(run.itemId) ?? text(run.id),
    taskType: "local_workflow",
    name: text(run.title) ?? text(run.name),
    description: text(run.description) ?? text(run.title) ?? text(run.name) ?? "",
    status,
    workflowProgress: progress.length ? progress : undefined,
    startedAt: finite(run.startedAt),
    completedAt: finite(run.completedAt),
    summary: text(run.summary),
    usage: Number.isFinite(run.usage?.totalTokens) ? { totalTokens: run.usage.totalTokens } : undefined,
    lastToolName: undefined,
    prompt: undefined,
    result: undefined,
    outputFile: undefined,
  };
}

/** The workflow runs of a session's rows (each `{id, workflowRun}`), as cea7057eb X's task list. */
export function workflowTasks(rows) {
  const out = [];
  for (const row of rows ?? []) {
    const task = row?.workflowRun ? workflowTask(row.workflowRun, row.id) : null;
    if (task) out.push(task);
  }
  return out;
}
