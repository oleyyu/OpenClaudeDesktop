// Decode the CLI metadata header as data, then execute only its body with
// provider-backed workflow globals and managed timers. The Electron adapter
// owns a dedicated child process; node:vm itself is not a security boundary.

import { WorkflowOutput, WorkflowPhases } from './workflow-output.js';
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRuntime } from "./runtime.js";
import { parseClaudeWorkflowScript } from './claude-metadata.js';
import { WORKFLOW_BOUNDARY_SOURCE, wrapWorkflowHostCall, wrapWorkflowHostAsync } from './workflow-boundary.js';
import { workflowResultValue, workflowConsoleText, workflowErrorText, truncateWorkflowDiagnostic } from './workflow-result.js';
import { WORKFLOW_INTRINSICS_SOURCE } from './workflow-intrinsics.js';
import { compileWorkflowBody, WORKFLOW_ASYNC_INIT_SOURCE } from './workflow-compiler.js';
export { parseClaudeWorkflowScript } from './claude-metadata.js';

// Local: Intl.DateTimeFormat#format()/formatToParts() with no date format the
// current clock, the same leak as Date.now(). Installed before the shared
// intrinsics setup (generated, not edited here), which then freezes Intl.
const WORKFLOW_CLOCK_GUARD_SOURCE = `(() => {
  'use strict';
  const message = 'Intl.DateTimeFormat format()/formatToParts() without a date read the clock and are unavailable in workflow scripts (breaks resume). Pass an explicit date, or pass timestamps via args.';
  const proto = Intl.DateTimeFormat.prototype;
  const formatGetter = Object.getOwnPropertyDescriptor(proto, 'format').get;
  Object.defineProperty(proto, 'format', { get() { const format = formatGetter.call(this); return function format_(date) { if (date === undefined) throw new Error(message); return format(date); }; }, enumerable: false, configurable: true });
  const formatToParts = proto.formatToParts;
  Object.defineProperty(proto, 'formatToParts', { value: { formatToParts(date) { if (date === undefined) throw new Error(message); return formatToParts.call(this, date); } }.formatToParts, writable: true, enumerable: false, configurable: true });
})()`;

// Discovery may read an otherwise valid header before the body is complete.
// Invocation always validates the complete script before creating a runtime.
export function extractMeta(src) {
  try { return parseClaudeWorkflowScript(src, false).meta; }
  catch { return null; }
}

export async function runWorkflowFile(scriptPath, options = {}) {
  const src = await readFile(scriptPath, "utf8");
  return runWorkflowSource(src, options);
}

export async function runWorkflowSource(src, options = {}) {
  const { meta, script: body } = parseClaudeWorkflowScript(src);
  const script = new vm.Script(compileWorkflowBody(body), { filename: 'workflow.js' });
  const timerOwner=options.timerOwner??{timers:new Map(),nextId:0};
  const sharedGlobals=options.sharedGlobals??{};
  const output=options.workflowOutput??new WorkflowOutput(meta.description);
  const workflowPhases=options.workflowPhases??new WorkflowPhases();
  const onPhase=options.nested?options.onPhase:(title,phase)=>{output.phase(title,undefined,phase);options.onPhase?.(title,phase);};
  if(!options.nested)for(const phase of meta.phases??[])workflowPhases.announce(phase.title,({index,kind})=>onPhase(phase.title,{index,...kind?{kind}:{}}));
  const runtime = createRuntime({...options,timerOwner,sharedGlobals,workflowOutput:output,workflowPhases,
    onLog:options.nested?options.onLog:message=>{output.log(message);options.onLog?.(message);},
    onPhase,
  });
  options.onRuntime?.(runtime);

  if (!options.nested && meta?.name) {
    options.onLog?.(`▶ ${meta.name}${meta.description ? " — " + meta.description : ""}`);
  }

  // The isolated global: only the injected workflow API. JS intrinsics are
  // provided automatically by vm.createContext; Node host globals are not.
  let boundary;
  const sandbox = {
    __proto__: null,
    agent: runtime.agent,
    parallel: runtime.parallel,
    pipeline: runtime.pipeline,
    phase: runtime.phase,
    log: runtime.log,
    budget: Object.freeze({ __proto__: null, total: runtime.budget.total, spent: wrapWorkflowHostCall(runtime.budget.spent), remaining: wrapWorkflowHostCall(runtime.budget.remaining) }),
    workflow: runtime.workflow,
    human: runtime.human,
    console: Object.assign(Object.create(null), Object.fromEntries(["log", "info", "debug", "warn", "error"].map(level => [level, wrapWorkflowHostCall((...values) => runtime.log((level === "warn" || level === "error" ? `[${level}] ` : "") + workflowConsoleText(values, boundary)))]))),
    setTimeout(callback, delay=0){if(typeof callback!=='function')throw new TypeError('setTimeout requires a function');const id=++timerOwner.nextId;timerOwner.timers.set(id,setTimeout(()=>{timerOwner.timers.delete(id);try{timerOwner.call(callback);}catch{/* Native timers discard callback failures. */}},Number(delay)));return id;},
    clearTimeout(id){clearTimeout(timerOwner.timers.get(id));timerOwner.timers.delete(id);},
  };
  const context = vm.createContext(sandbox, {
    name: "workflow",
    codeGeneration: { strings: false, wasm: false }, // no eval/Function/wasm escape
  });
  vm.runInContext(WORKFLOW_CLOCK_GUARD_SOURCE, context);
  vm.runInContext(WORKFLOW_INTRINSICS_SOURCE, context);
  vm.runInContext(WORKFLOW_ASYNC_INIT_SOURCE, context);
  boundary = vm.runInContext(WORKFLOW_BOUNDARY_SOURCE, context);
  if(!timerOwner.call)timerOwner.call=boundary.call;
  runtime.bindVM(boundary);
  for (const name of ['agent', 'parallel', 'pipeline', 'workflow', 'human']) {
    const host = sandbox[name];
    sandbox[name] = boundary.asyncWrap(wrapWorkflowHostAsync(host));
    // Retain the adapter's sessionful extensions while wrapping their asynchronous entry points.
    for (const key of Object.keys(host)) if (typeof host[key] === 'function') sandbox[name][key] = boundary.asyncWrap(wrapWorkflowHostAsync(host[key]));
  }
  for (const name of ['phase', 'log', 'setTimeout', 'clearTimeout']) sandbox[name] = wrapWorkflowHostCall(sandbox[name]);
  // Preserve original objects even when a script rebinds its own globals.
  if(options.sharedGlobals)Object.assign(sandbox,sharedGlobals);
  else for(const name of ['budget','setTimeout','clearTimeout'])sharedGlobals[name]=sandbox[name];
  try {
    context.args = runtime.args === undefined ? undefined : options.nested ? boundary.clone(runtime.args) : vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(runtime.args))})`, context);
    // The metadata export is absent from the CLI execution scope.
    // Local: Claude Code 2.1.280's synchronous VM slice is 30s.
    const result = await boundary.settle(script.runInContext(context, { timeout: 30_000 }));
    const value=options.nested ? boundary.clone(result.value) : workflowResultValue(result.value, boundary);
    if(!options.nested)options.onOutput?.(output.render({stopReason:'completed',value,agentsStarted:runtime.agentCount()}));
    return value;
  } catch (error) {
    const info=boundary.errorInfo(error),diagnostic=workflowErrorText(info);
    options.onFailure?.(diagnostic);
    if(options.nested){const failure=new Error(truncateWorkflowDiagnostic(info.message));failure.name=info.name;failure.stack=diagnostic;throw failure;}
    throw error;
  } finally {
    if(!options.timerOwner){for(const timer of timerOwner.timers.values())clearTimeout(timer);timerOwner.timers.clear();}
    // Close any sessionful workers the script left open — cancels their active turn
    // and removes any worktrees — whether the workflow returned or threw.
    try { await runtime.finalize?.(); } catch {}
  }
}
