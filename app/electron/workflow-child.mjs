// A dedicated Node process owns the vendor runtime and its Codex connection.
import fs from 'node:fs/promises';
import {runHarnessWorkflow} from './workflow-harness.mjs';
import path from 'node:path';
import os from 'node:os';
import {runWorkflowSource,parseClaudeWorkflowScript} from '../third-party/codex-workflows-runner/src/runWorkflow.js';
import {Journal} from '../third-party/codex-workflows-runner/src/journal.js';
import {codexAgent,getClient,shutdownClient} from '../third-party/codex-workflows-runner/src/codexAgent.js';
import {startCodexSession} from '../third-party/codex-workflows-runner/src/codexSession.js';
import {joinSharedBudget} from '../third-party/codex-workflows-runner/src/shared-budget.js';
import {outputSpent,subscribeMeter} from '../third-party/codex-workflows-runner/src/meter.js';
let finishing=false,runtime,scriptFailure,outputText;
// /workflows p: pause stops admitting agents (runtime.js setWorkflowPaused); a hosted engine has no pause.
process.on('message',message=>{if(message?.control==='pause'){try{if(typeof runtime?.pause!=='function'){send({type:'pausable',pausable:false});return;}runtime.pause(message.paused===true);send({type:'paused',paused:message.paused===true});}catch(error){send({type:'log',message:error.message});}return;}if(message?.control)Promise.resolve(runtime?.controlMember(message.memberId,message.control)).catch(error=>send({type:'log',message:error.message}));});
const send=event=>{if(process.connected)process.send({event,at:Date.now()});};
// A stop cancels the run first (interrupts turns, removes clean worktrees, closes sessions), then the app-server goes.
// It tells the service a cancel is under way, so the force-kill waits (bounded) for it to finish.
async function close(code){if(finishing)return;finishing=true;try{if(code!==0&&runtime?.cancel){if(process.connected)process.send({stopping:true});await runtime.cancel();}}catch{}try{await shutdownClient();}finally{process.exit(code);}}
async function publishResult(directory,result,outputFile){
 const encoded=JSON.stringify(result);
 if(outputFile)await fs.copyFile(outputFile,path.join(directory,'result.json'));
 // A hosted engine's outputFile is optional: without one, record the value itself ('' for undefined).
 else await fs.writeFile(path.join(directory,'result.json'),outputText??encoded??'',{mode:0o600,flush:true});
 send({type:'result',...(encoded===undefined?{}:{result:encoded.length<65536?result:null})});
}
process.once('SIGTERM',()=>void close(143));process.once('disconnect',()=>void close(143));
process.once('message',async options=>{
 try{
  process.chdir(options.cwd);
  // Refuse malformed scripts before starting either provider connection.
  const {meta}=parseClaudeWorkflowScript(options.source);send({type:'metadata',name:meta.name,title:meta.title,description:meta.description});
  await fs.writeFile(path.join(options.directory,'result.json'),'',{mode:0o600,flush:true});
  const journal=new Journal(path.join(options.directory,'journal.jsonl'),{reuse:options.resume});await journal.load();
  const sharedBudget=options.budgetPool?joinSharedBudget(options.budgetPool):undefined;
  if(sharedBudget){const baseline=outputSpent();subscribeMeter(()=>sharedBudget.record(Math.max(0,outputSpent()-baseline)));}
  // commandArgs: the core's arguments (the DeepSeek bridge script + app-server --stdio); absent = the runner's Codex default.
  const clientOptions={command:options.command,...(Array.isArray(options.commandArgs)?{args:options.commandArgs}:{}),clientInfo:{name:'code-desktop-workflows',title:'OpenClaude Desktop',version:options.version}};
  if(!options.plan){
   const client=await getClient(clientOptions);send({type:'connection',pid:client.pid});
   const hosted=await runHarnessWorkflow(client,options,send,value=>{runtime=value;if(typeof value?.pause!=='function')send({type:'pausable',pausable:false});});
   if(hosted.supported){await publishResult(options.directory,hosted.value,hosted.outputFile);await close(0);return;}
  }
  // The access comes from the session's Mode at launch (permission-policy.mjs workflowAccess);
  // script options cannot raise it. Agents never ask (approvalPolicy never): the Mode chose already.
  const sandbox=['workspace-write','danger-full-access'].includes(options.access)?options.access:'read-only';
  // The launch model is the default; a per-call opts.model wins (as in Claude Code).
  // Workflow agents' model (Claude Code 2.1.280): opts.model, else CLAUDE_CODE_SUBAGENT_MODEL (unless "inherit"), else
  // the session's. CLAUDE_CODE_SUBAGENT_MODEL_FORCE (on its own too) ignores opts.model: every agent runs on
  // CLAUDE_CODE_SUBAGENT_MODEL when it is set, else on the session's model.
  const subagentModel=typeof process.env.CLAUDE_CODE_SUBAGENT_MODEL==='string'&&process.env.CLAUDE_CODE_SUBAGENT_MODEL.trim()&&process.env.CLAUDE_CODE_SUBAGENT_MODEL.trim()!=='inherit'?process.env.CLAUDE_CODE_SUBAGENT_MODEL.trim():null;
  const forced=['1','true','yes','on'].includes(String(process.env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE??'').trim().toLowerCase());
  const nameOnly=['1','true','yes','on'].includes(String(process.env.CLAUDE_WORKFLOW_NAME_ONLY??'').trim().toLowerCase());
  const {NAME_ONLY_SCRIPT_PATH}=nameOnly?await import('./workflow-tool-model.mjs'):{};
  const pinned=forced?subagentModel??(typeof options.model==='string'&&options.model?options.model:null):null;
  if(forced)send({type:'log',message:`CLAUDE_CODE_SUBAGENT_MODEL_FORCE is set: workflow agents run on ${pinned??'the session’s model'}, whatever model a script names.`});
  // A forced run with no model to pin to drops a script's opts.model, so the agent runs on the core's default.
  // userRelay: the user request that triggered a model-started run (Claude's provenance relay), the host's only: a
  // script's own opts never set it.
  const controlled=opts=>{const out={...opts,cwd:options.cwd,sandbox,clientOptions};if(forced&&!pinned)delete out.model;delete out.userRelay;if(typeof options.userRequest==='string'&&options.userRequest.trim())out.userRelay=options.userRequest;return out;};
  const result=await runWorkflowSource(options.source,{
   onRuntime:value=>{runtime=value;},onOutput:text=>{outputText=text;},
   args:options.args,plan:options.plan,journal,defaultModel:subagentModel??options.model,ignoreRequestedModel:forced,...(pinned?{pinnedModel:pinned}:{}),
   // budget.total: the token target of the user's "+500k" directive in the turn that started the run (model runs only).
   ...(Number.isSafeInteger(options.budgetTotal)&&options.budgetTotal>0?{budgetTotal:options.budgetTotal}:{}),
   // What that turn's main model already spent (Claude's budget.spent() is the turn's output tokens, not only the run's).
   ...(Number.isSafeInteger(options.budgetSpent)&&options.budgetSpent>0?{budgetSpentBefore:options.budgetSpent}:{}),
   ...(sharedBudget?{sharedBudget}:{}),
   // structuredOutput false (a core without outputSchema / dynamic tools): schema agents ask for JSON (runner jsonAgent.js).
   defaults:{cwd:options.cwd,sandbox,effort:options.effort,clientOptions,...(options.structuredOutput===false||options.structuredOutput==='outputSchema'?{structuredOutput:options.structuredOutput}:{}),...(typeof options.runId==='string'?{runId:options.runId}:{})},
   runAgent:Object.assign((prompt,opts)=>codexAgent(prompt,controlled(opts)),{preflight:opts=>codexAgent.preflight(controlled(opts))}),
   startSession:opts=>startCodexSession(controlled(opts)),
   onPhase:(title,phase)=>send({type:'phase',title,...phase}),onEvent:send,
   onProgress:(label,text,id)=>send({type:'progress',id,label}),
   onLog:message=>send({type:'log',message:String(message)}),
   onFailure:message=>{scriptFailure=message;},
   // A parallel/pipeline slot or nested workflow that failed: the run's <failures> (Claude getFailures()).
   onSlotFailure:message=>send({type:'slot-failure',message:String(message).slice(0,2000)}),
   onAgentPlan:agent=>send({type:'plan-agent',...agent}),
   // workflow('name') resolves like the Workflow tool's name (Claude Code): a saved workflow's meta.name in the project's
   // .claude/workflows (up to the git root, nearest wins) or ~/.claude/workflows, with Claude's "Available: …" error.
   // CLAUDE_WORKFLOW_NAME_ONLY: only bundled workflows (none in OpenClaude Desktop) and no workflow({scriptPath}).
   ...(nameOnly?{allowScriptPath:false,scriptPathRefusal:NAME_ONLY_SCRIPT_PATH}:{}),
   resolveWorkflow:async name=>{const {findSavedWorkflow}=await import('./workflow-tool-model.mjs');const found=findSavedWorkflow({cwd:options.cwd,home:os.homedir(),name,nameOnly,folders:Array.isArray(options.workflowFolders)?options.workflowFolders:[]});if(!found.workflow)throw new Error(`workflow('${name}'): no workflow with that name. ${found.error.replace(/^Workflow "[^"]*" not found\. /,'')}`);return found.workflow.filePath;},
  });
  await publishResult(options.directory,result);await close(0);
 }catch(error){send({type:'failure',error:scriptFailure??String(error?.message??error)});await close(1);}
});
