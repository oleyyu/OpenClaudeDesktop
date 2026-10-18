const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{fork}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const i18n=require('./i18n/index.mjs');
const {coreSupports}=require('./core-registry.mjs');
// Thrown copy reaches the renderer as is: translate it here (the coreError pattern, codex.cjs).
const fail=source=>new Error(i18n.t(source));
// A stop first lets the runner cancel (core stop + release, interrupted turns, worktree cleanup):
// SIGKILL after STOP_KILL_MS, or STOP_GRACE_MS once the runner says a cancel is under way.
const STOP_KILL_MS=1500,STOP_GRACE_MS=8000;
// A model-started run that OpenClaude Desktop's quit (or a crash) ended: <run>/orphaned.json {delivered} until its
// orphaned-workflow <task-notification> reached the model (workflow-tool-service.cjs turnStart; Claude Code 2.1.280
// reports background workflows orphaned by the previous process exit on resume). Written once per run.
const ORPHAN_FILE='orphaned.json';
// Run ids: Claude Code's wf_<12 characters of a UUID> (workflow-tool-model.mjs newRunId); older runs kept a UUID.
const idPattern=/^(?:[a-f0-9-]{36}|wf_[a-z0-9-]{6,})$/;
// Never handed to the runner's own core: one nesting level, so workflow agents never get OpenClaude Desktop's Workflow tool.
const AGENT_TOOLS_ENV=['CODE_DESKTOP_AGENT_TOOLS_SOCKET','CODE_DESKTOP_AGENT_TOOLS_TOKEN','CODE_DESKTOP_AGENT_TOOLS_SERVER','CODE_DESKTOP_AGENT_SESSION'];
// Loaded only for a saved-workflow lookup or a save (it parses scripts), never on the way to starting a run.
let toolModelLoad=null;const toolModel=()=>toolModelLoad??=import(pathToFileURL(path.join(__dirname,'workflow-tool-model.mjs')).href);
// The app-server the workflow runner spawns, from codex.cjs resolveCore(): the
// DeepSeek bridge is a Node script that takes `app-server --stdio` (it drops
// both); a Codex binary keeps the runner's default arguments unless Settings ›
// Models gave it `-c` overrides (then `app-server --stdio` plus those). env: the
// core's own environment (a custom endpoint's key; undefined drops a variable).
// An explicit override binary (CODE_DESKTOP_WORKFLOW_BINARY) wins.
// workflowScripts: whether the core's engine runs launcher scripts (core-registry capability;
// workflow-harness.mjs probes codeDesktop/diagnostics only then). Unknown (an override binary): undefined, probed.
function workflowCoreCommand(core,override){
 if(override)return {command:override};
 const scripts=core?.kind&&core.kind!=='override'?{workflowScripts:coreSupports(core.kind,'workflowScripts')}:{};
 const launch=workflowLaunch(core);return {...launch,...scripts};
}
function workflowLaunch(core){
 // serverArgs: a native Extension Pack agent's own server arguments (codex.cjs nativeCore), else `app-server --stdio`.
 const server=Array.isArray(core?.serverArgs)?core.serverArgs:['app-server','--stdio'];
 if(core?.prefix?.length)return {command:core.command,args:[...core.prefix,...server],...(core.env?{env:core.env}:{})};
 if(core?.args?.length||core?.env||core?.serverArgs)return {command:core.command,args:[...server,...(core.args||[])],...(core.env?{env:core.env}:{})};
 return {command:core?.command};
}
// args: the app-server's own arguments (commandArgs in the child message;
// `args` there are the workflow script's arguments). env: merged into the
// runner child's environment, which its app-server inherits. core: a getter for
// {command,args,env} read at each start, so a core switch or provider change applies.
// enabled(): Dynamic workflows on (prefs/workflow-settings.mjs resolveWorkflowSettings; default: unless turned off).
// runnerEnv(): the variables the runner child reads (workflowRunnerEnv: concurrency, retries, stagger, provenance,
// workflow agents' model). onSettled(run): a run finished (the Workflow tool's notification). home: for saved workflows.
// workflowFolders(): the running core's own saved-workflow folders (descriptor workflowFolders, Qwen's .qwen/workflows),
// read and written beside .claude/workflows.
function createWorkflowService({root,getConfig,emit,command:fixedCommand,args:fixedArgs,env:fixedEnv,core:currentCore,version,spawn=fork,enabled,runnerEnv=()=>({}),onSettled=()=>{},home=require('node:os').homedir(),workflowFolders=()=>[]}){
 const folders=()=>{try{const value=workflowFolders();return Array.isArray(value)?value:[];}catch{return [];}};
 const running=new Map(),runs=new Map();let disposed=false;
 const workflowsOn=()=>typeof enabled==='function'?enabled():getConfig().dynamicWorkflows!==false;
 fs.mkdirSync(root,{recursive:true});
 const model=import(pathToFileURL(path.join(__dirname,'../src/workflow-progress-model.mjs')).href);
 const markOrphan=id=>{try{fs.writeFileSync(path.join(root,id,ORPHAN_FILE),JSON.stringify({delivered:false}),{flag:'wx',mode:0o600});}catch{}};
 const persist=run=>{const dest=path.join(root,run.id,'meta.json');fs.writeFileSync(dest+'.tmp',JSON.stringify(run));fs.renameSync(dest+'.tmp',dest);};
 const ready=(async()=>{const {workflowEvent}=await model;for(const id of fs.readdirSync(root)){if(!idPattern.test(id))continue;try{
   const directory=path.join(root,id),origin=path.join(directory,'origin.json');let run=JSON.parse(fs.readFileSync(fs.existsSync(origin)?origin:path.join(directory,'meta.json'),'utf8'));
   if(run.id!==id||typeof run.threadId!=='string')continue;
   if(fs.existsSync(origin)){try{for(const line of fs.readFileSync(path.join(directory,'events.jsonl'),'utf8').split('\n')){if(!line)continue;let entry;try{entry=JSON.parse(line);}catch{break;}if(entry.sequence!==run.sequence+1||!Number.isFinite(entry.at))break;run=workflowEvent(run,entry.event,entry.at);}}catch{}}
   if(run.status==='running'){run=workflowEvent(run,{type:'settled',status:'failed',recovered:true,error:'The workflow runner is no longer connected. Its exit time is unknown.'},Date.now());persist(run);if(run.origin==='tool')markOrphan(id);}
   runs.set(id,run);
  }catch{}}})();
 async function list(threadId){await ready;return [...runs.values()].filter(r=>r.threadId===threadId).sort((a,b)=>a.startedAt-b.startedAt);}
 function trusted(id){if(!idPattern.test(id)||!runs.has(id))throw fail('Unknown workflow.');const run=runs.get(id);if(!getConfig().threadIds.includes(run.threadId))throw fail('Unknown session.');return run;}
 // source: an inline script (the Workflow tool), persisted at `file` by the caller; else `file` is read. origin 'tool': the
 // model started it (its notification goes back to the model); taskId/toolUseId/scriptPath: what the tool reported.
 // No per-app limit on concurrent runs (as in Claude Code). structuredOutput false: the core has no outputSchema/dynamic tools.
 async function startRun({threadId,file,source:inline,args,plan=false,access='read-only',resumeId,model:chosenModel,effort,cwd:requestedCwd,after,runId,origin='user',taskId,toolUseId,scriptPath,structuredOutput,engine,userRequest,budgetTotal,budgetSpent,budgetPool}){
  await ready;if(disposed)throw fail('Application is closing.');const config=getConfig();
  if(!workflowsOn())throw fail('Dynamic workflows are disabled.');
  if(!config.threadIds.includes(threadId))throw fail('Choose a session before starting a workflow.');
  // args: the script's global, verbatim — undefined when none were given (Claude Code: `args ?? default` works).
  if(args!==undefined&&JSON.stringify(args)===undefined)throw fail('Workflow arguments must be JSON.');
  if(!['read-only','workspace-write','danger-full-access'].includes(access))throw fail('Choose a valid workflow access.');
  const cwd=fs.realpathSync(requestedCwd||config.cwd);
  if(typeof file!== 'string'||!file.trim())throw fail('Choose a workflow file.');
  // A bare name is a saved workflow: its meta.name in ~/.claude/workflows or a project .claude/workflows (nearest
  // wins, Claude Code's lookup), else a file of that name there (older launchers).
  // CLAUDE_WORKFLOW_NAME_ONLY: no saved workflow counts as named (only bundled ones would, and there are none).
  if(typeof inline!=='string'&&!/[\\/]/.test(file)&&! /\.(?:m?js|cjs)$/.test(file)){const {findSavedWorkflow}=await toolModel();const nameOnly=(()=>{try{return runnerEnv()?.CLAUDE_WORKFLOW_NAME_ONLY==='1';}catch{return false;}})();const saved=findSavedWorkflow({cwd,home,name:file,nameOnly,folders:folders()});
   if(saved.workflow)file=saved.workflow.filePath;
   else if(nameOnly)throw new Error(saved.error);
   else{const dirs=[path.join(cwd,'.claude/workflows'),path.join(home,'.claude/workflows')];const match=dirs.flatMap(dir=>[file+'.js',file+'.workflow.js',file+'.mjs'].map(name=>path.join(dir,name))).find(f=>fs.existsSync(f));if(!match)throw new Error(saved.error);file=match;}}
  const script=typeof inline==='string'?path.resolve(cwd,file):fs.realpathSync(path.resolve(cwd,file));
  if(typeof inline!=='string'&&(!/\.(?:m?js|cjs)$/.test(script)||fs.statSync(script).size>1048576))throw fail('Select a JavaScript workflow smaller than 1 MB.');
  const source=typeof inline==='string'?inline:fs.readFileSync(script,'utf8'),hash=crypto.createHash('sha256').update(source).update(args===undefined?'':JSON.stringify(args)).update(cwd).update(chosenModel||'').update(effort||'').update(access==='read-only'?'':access).digest('hex');
  // A resume continues the same run (Claude Code: resumeFromRunId is the run id and its transcript folder): its journal
  // replays unchanged authored agent() calls even when the host model, effort, Mode or folder has changed. Refused only for another session's run, a run still running, or one with no journal — before anything
  // is written.
  if(resumeId){const previous=trusted(resumeId);if(previous.threadId!==threadId)throw fail('Unknown workflow.');
   if(previous.status==='running'||running.has(resumeId))throw new Error(i18n.t('Workflow {id} is still running. Stop it first in the Tasks pane before resuming.',{id:resumeId}));
   if(!fs.existsSync(path.join(root,resumeId,'journal.jsonl')))throw new Error(i18n.t('No journal found for workflow run {id}, so there is nothing to resume. To run the workflow from the start, call Workflow again without resumeFromRunId.',{id:resumeId}));}
  const id=resumeId?resumeId:typeof runId==='string'&&idPattern.test(runId)&&!runs.has(runId)?runId:`wf_${crypto.randomUUID().slice(0,12)}`,directory=path.join(root,id);fs.mkdirSync(directory,{recursive:!!resumeId});
  // The resumed run's event log starts over (its journal, engine state and agent transcripts stay).
  if(resumeId){fs.writeFileSync(path.join(directory,'events.jsonl'),'');fs.rmSync(path.join(directory,ORPHAN_FILE),{force:true});}
  fs.writeFileSync(path.join(directory,'source.workflow.js'),source);
  fs.writeFileSync(path.join(directory,'result.json'),'',{flag:resumeId?'w':'wx',mode:0o600,flush:true});
  const {workflowEvent}=await model;
  let run={id,threadId,after:typeof after==='string'?after:undefined,identity:hash,file:script,cwd,...(args!==undefined?{args}:{}),model:chosenModel,effort,plan:!!plan,access,description:path.basename(script),status:'running',startedAt:Date.now(),sequence:0,workflowProgress:[],
   origin:origin==='tool'?'tool':'user',transcriptDir:directory,...(typeof taskId==='string'?{taskId}:{}),...(typeof toolUseId==='string'?{toolUseId}:{}),...(typeof scriptPath==='string'?{scriptPath}:{}),...(resumeId?{resumedFrom:resumeId}:{})};
  runs.set(id,run);fs.writeFileSync(path.join(directory,'origin.json'),JSON.stringify(run));persist(run);emit({kind:'workflow',run});
  function record(event,at=Date.now()) {run=workflowEvent(run,event,at);runs.set(id,run);fs.appendFileSync(path.join(directory,'events.jsonl'),JSON.stringify({sequence:run.sequence,at,event})+'\n');persist(run);emit({kind:'workflow',run});}
  if(disposed){record({type:'settled',status:'failed',error:'Application is closing.'});return run;}
  // The core getter learns the run's session and access (a Codex core adds that session's sandbox settings).
  const launch=typeof currentCore==='function'?currentCore({threadId,access,cwd})||{}:{command:fixedCommand,args:fixedArgs,env:fixedEnv},command=launch.command,commandArgs=launch.args;
  // The Settings values reach the runner as Claude's variables. They are the resolved values (a valid variable in the
  // app's environment already decided them; an invalid one was ignored), so they replace the inherited ones: Settings
  // and the run always agree, and a stray MAX_STRUCTURED_OUTPUT_RETRIES=abc never fails every schema agent.
  // CODE_DESKTOP_WORKFLOW_RUNNER: the runner's own bridge core shares the app bridge's state folder; it keeps its threads,
  // usage and generated config apart (the bridges' runner role), so neither process overwrites the other's files and
  // workflow agents never become the user's sessions.
  const env={...process.env,...(launch.env||{}),...(runnerEnv()||{}),ELECTRON_RUN_AS_NODE:'1',CODE_DESKTOP_WORKFLOW_RUNNER:'1',...(launch.env?.ELECTRON_RUN_AS_NODE?{CODE_DESKTOP_CORE_RUN_AS_NODE:'1'}:{})};for(const key of AGENT_TOOLS_ENV)delete env[key];
  let child;try{child=spawn(path.join(__dirname,'workflow-child.mjs'),[],{cwd,detached:true,stdio:['ignore','ignore','pipe','ipc'],env});}catch(error){record({type:'settled',status:'failed',error:error.message});settle();return run;}
  let stderr='',outcome=null,stopRequested=false,quitStop=false,killTimer=null;
  const completion=new Promise(resolve=>{
   child.stderr?.on('data',data=>{stderr=(stderr+data).slice(-8000);});
   child.on('message',message=>{if(message?.stopping){grace();return;}if(!message||!message.event)return;const event=message.event;if(event.type==='result'||event.type==='failure')outcome=event;else record(event,Number.isFinite(message.at)?message.at:Date.now());});
   child.once('error',error=>{outcome={type:'failure',error:error.message};});
   child.once('close',(code,signal)=>{clearTimeout(killTimer);if(child.pid){try{process.kill(-child.pid,'SIGKILL');}catch{}}running.delete(id);const status=stopRequested?'stopped':code===0&&outcome?.type==='result'?'completed':'failed';if(quitStop&&run.origin==='tool')markOrphan(id);record({type:'settled',status,result:outcome?.result,error:status==='stopped'?'Stopped':outcome?.error|| (status==='failed'?`Runner exited (${signal||code}). ${stderr}`:undefined)});settle();resolve(run);});
  });
  // SIGTERM the runner only, not its group: its core must stay up to answer the cancel
  // (codeDesktop/workflow/stop, releaseScript, turn/interrupt). The group goes on close or at the deadline.
  const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}};
  let graced=false;const grace=()=>{if(!stopRequested||graced)return;graced=true;clearTimeout(killTimer);killTimer=setTimeout(kill,STOP_GRACE_MS);};
  const stop=()=>{if(stopRequested)return completion;stopRequested=true;try{process.kill(child.pid,'SIGTERM');}catch{}killTimer=setTimeout(kill,STOP_KILL_MS);return completion;};
  // quit: the app is closing (dispose) — unlike the user's Stop, the model hears about it on the next launch.
  const quit=()=>{if(!stopRequested)quitStop=true;return stop();};
  running.set(id,{stop,quit,completion,pid:child.pid,member:(memberId,action)=>{child.send({control:action,memberId});return {accepted:true};},pause:paused=>{if(run.pausable===false)throw fail('This workflow can’t be paused.');child.send({control:'pause',paused});return {accepted:true,paused};}});
  // engine 'codeDesktop': Settings chose OpenClaude Desktop's engine for a core that has its own, so the launcher script is
  // never handed to the core's engine (workflow-harness.mjs); structuredOutput false: schema agents ask for JSON.
  const scripts=engine==='codeDesktop'?{workflowScripts:false}:typeof launch.workflowScripts==='boolean'?{workflowScripts:launch.workflowScripts}:{};
  child.send({directory,source,cwd,...(args!==undefined?{args}:{}),plan:!!plan,access,resume:!!resumeId,model:chosenModel,effort,command,commandArgs,version,runId:id,...scripts,...(structuredOutput===false||structuredOutput==='outputSchema'?{structuredOutput}:{}),...(typeof userRequest==='string'&&userRequest.trim()?{userRequest}:{}),...(Number.isSafeInteger(budgetTotal)&&budgetTotal>0?{budgetTotal,...(Number.isSafeInteger(budgetSpent)&&budgetSpent>0?{budgetSpent}:{})}:{}),...(budgetPool?{budgetPool}:{}),...(folders().length?{workflowFolders:folders()}:{})});return run;
  function settle(){try{onSettled(run);}catch(error){console.warn('Workflow settle hook failed:',error);}}
 }
 async function start(params){return startRun(params);}
 async function stop(id){await ready;trusted(id);const entry=running.get(id);if(!entry)throw fail('This workflow is no longer running.');return entry.stop();}
 async function dispose(){disposed=true;await Promise.all([...running.values()].map(r=>r.quit()));}
 // Model-started runs of a session that a quit or crash ended and whose notification the model hasn't had yet.
 async function orphans(threadId){await ready;return [...runs.values()].filter(run=>run.threadId===threadId&&run.origin==='tool'&&run.status!=='running'&&!running.has(run.id)&&(()=>{
   try{return JSON.parse(fs.readFileSync(path.join(root,run.id,ORPHAN_FILE),'utf8'))?.delivered===false;}catch{return false;}})()).sort((a,b)=>a.startedAt-b.startedAt);}
 function orphanDelivered(id){if(!idPattern.test(id)||!runs.has(id))return;try{fs.writeFileSync(path.join(root,id,ORPHAN_FILE),JSON.stringify({delivered:true}),{mode:0o600});}catch{}}
 // /workflows p: pause (no new agents start; running ones finish) or resume.
 async function pause(id,paused){await ready;trusted(id);const entry=running.get(id);if(!entry)throw fail('This workflow is no longer running.');return entry.pause(paused===true);}
 // /workflows s: the run's script to .claude/workflows (scope project) or ~/.claude/workflows (user), as <slug>.js.
 async function save(id,{scope='project',name,overwrite=false}={}){await ready;const run=trusted(id);const {saveWorkflowTarget}=await toolModel();
  const source=fs.readFileSync(path.join(root,id,'source.workflow.js'),'utf8');const target=saveWorkflowTarget({scope:scope==='user'?'user':'project',cwd:run.cwd,home,name:name||run.name||run.description,folders:folders()});
  fs.mkdirSync(target.dir,{recursive:true,mode:0o700});
  try{fs.writeFileSync(target.file,source,{encoding:'utf8',mode:0o600,flag:overwrite?'w':'wx'});}catch(error){if(error.code==='EEXIST')throw new Error(i18n.t('Dynamic workflow "{name}" already exists at {path}. Use a different name or overwrite.',{name:target.slug,path:target.file}));throw error;}
  return {path:target.file,name:target.slug};}
 async function member(id,memberId,action){await ready;const run=trusted(id);if(!['retry','skip'].includes(action)||!run.workflowProgress.some(p=>p.type==='workflow_agent'&&p.id===memberId&&p.state==='progress'))throw fail('Unknown active workflow member.');return running.get(id)?.member(memberId,action)??{accepted:false};}
 const get=id=>runs.get(id)??null;
 // The core threads every run's agents ran in (the journal's and result.json's agentId): never the user's sessions
 // ('Resume a session'). A settled run's set is read once.
 const agentCache=new Map();
 const runAgentIds=run=>{const cached=agentCache.get(run.id);if(cached&&cached.status===run.status&&run.status!=='running')return cached.ids;const ids=new Set();
  const take=value=>{if(typeof value==='string'&&value&&value.length<=200)ids.add(value);};
  try{for(const line of fs.readFileSync(path.join(root,run.id,'journal.jsonl'),'utf8').split('\n')){if(!line)continue;try{take(JSON.parse(line)?.agentId);}catch{}}}catch{}
  try{const text=fs.readFileSync(path.join(root,run.id,'result.json'),'utf8');if(text){const value=JSON.parse(text);for(const entry of Array.isArray(value?.workflowProgress)?value.workflowProgress:[])if(entry?.type==='workflow_agent')take(entry.agentId);}}catch{}
  for(const entry of run.workflowProgress||[])if(entry?.type==='workflow_agent')take(entry.agentId);
  agentCache.set(run.id,{status:run.status,ids});return ids;};
 const agentIds=()=>{const out=new Set();for(const run of runs.values())for(const id of runAgentIds(run))out.add(id);return out;};
 return {list,start,stop,member,pause,save,get,dispose,ready,agentIds,orphans,orphanDelivered};
}
module.exports={createWorkflowService,workflowCoreCommand};
