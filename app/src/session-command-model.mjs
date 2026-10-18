import {t} from '../electron/i18n/index.mjs';
import {coreCapabilities,coreForEngine} from '../electron/core-registry.mjs';
// Host actions mapped to real Codex 0.155.1 capabilities. Claude 2.2553.1
// cc183b3ab supplies names/aliases; there is no app-server CLI command catalog.
export const sessionCommands = [
  {id:'compact',label:t('Compact conversation'),description:t('Summarize earlier context in this session'),argumentHint:'[instructions]',session:true,idle:true,icon:'Archive'},
  {id:'clear',aliases:['reset','new'],label:t('New session'),description:t('Clear conversation history and free up context')},
  // /btw (cc183b3ab btw, 4Iu0xDY9v4): not idle-only, a side question never interrupts the running turn.
  // Codex /recap (tui app/recap.rs): a short catch-up, asked on the side (side questions) so nothing joins the session.
  {id:'recap',label:t('Recap'),description:t('Get a short catch-up on this session'),session:true,icon:'Chat'},
  {id:'btw',label:t('Side question'),description:t('Ask a quick side question without adding to the session'),argumentHint:'[question]',session:true,icon:'Chat'},
  {id:'review',label:t('Review code'),description:t('Review changes, a branch, commit, or instructions'),argumentHint:'[instructions]',session:true,idle:true,icon:'Search'},
  {id:'fork',label:t('Fork session'),description:t('Fork this session into a new one'),argumentHint:'[prompt]',session:true,idle:true,icon:'GitBranch'},
  // R3b-tasks /subtask <task> (2.42304.0 cc183b3ab: description 5B10ybRftQ, argumentHint "<task>", neverReachesCli,
  // enableGate "subtaskCommand", gate O(e) && canForkSession && subtaskCommand; cc43287c9 parses /^\/subtask(?:\s+(.*))?$/is,
  // so the task may span lines). r3b-tasks-subtask.mjs runs it: a fork that gets the task in the background while the
  // composer stays here. Idle only, as /fork: the host's fork (session-operations) refuses a running session.
  // context.subtaskCommand false (the official appFeatures.sideSessions gate closed) takes it out.
  {id:'subtask',label:t('Subtask'),description:t('Fork this session to work on a task while you stay here'),argumentHint:'<task>',session:true,idle:true,multiline:true},
  // Codex /cd (tui app/working_directory.rs): the session continues in another folder, as a fork that keeps its history.
  {id:'cd',label:t('Change directory'),description:t('Continue this session in another folder'),argumentHint:'[path]',session:true,idle:true,icon:'Folder'},
  {id:'rename',aliases:['name'],label:t('Rename session'),description:t('Rename this session'),argumentHint:'[new title]',session:true},
  {id:'model',label:t('Choose model'),description:t('Set the model for this session'),argumentHint:'[model-id]',connected:true,idle:true},
  {id:'effort',label:t('Reasoning effort'),description:t('Set the effort level for this session'),argumentHint:'[level]',connected:true,idle:true},
  {id:'fast',label:t('Fast mode'),description:t('Turn fast mode on or off'),argumentHint:'[on|off]',connected:true,idle:true},
  {id:'plan',label:t('Plan mode'),description:t('Switch to plan mode or view this session’s plan'),argumentHint:'[open|<description>]',idle:true},
  {id:'permissions',aliases:['allowed-tools'],label:t('Permission mode'),description:t('Change the permission mode'),idle:true},
  {id:'resume',aliases:['continue'],label:t('Resume a session'),description:t('Continue a DeepSeek session from this computer, including ones started outside OpenClaude Desktop'),argumentHint:'[search]'},
  {id:'status',label:t('Session status'),description:t('Show this session’s version, model, environment, and account'),session:true,idle:true,icon:'UsageGaugeMiddle'},
  // usage-credits / extra-usage: Claude Code's credit commands open the same page, which shows the core's credits.
  {id:'usage',aliases:['stats','cost','usage-credits','extra-usage','credits'],label:t('Usage'),description:t('Show plan usage, credits and rate limits')},
  {id:'diff',label:t('Show changes'),description:t('Show or hide this session’s changes'),session:true},
  {id:'workflow',label:t('Run workflow'),description:t('Run a local dynamic workflow'),argumentHint:'[path] [--plan] [--resume run-id] [--args JSON]',session:true},
  {id:'workflows',label:t('Workflows'),description:t('Browse workflow history (running and completed)'),session:true},
  {id:'tasks',aliases:['bashes'],label:t('Background tasks'),description:t('Show this session’s background tasks'),session:true},
  {id:'config',aliases:['settings'],label:t('Settings'),description:t('Open Code settings')},
  {id:'theme',label:t('Appearance'),description:t('Set the appearance (system, light, or dark)'),argumentHint:'[system|light|dark]'},
  {id:'sandbox',label:t('Sandbox'),description:t('Open Code sandbox settings')},
  {id:'add-dir',label:t('Add directory'),description:t('Add another folder to this session'),argumentHint:'[path]'},
  {id:'export',label:t('Export conversation'),description:t('Export this session’s transcript'),session:true,idle:true},
  {id:'rewind',label:t('Rewind conversation'),description:t('Rewind the session to an earlier message'),session:true,idle:true},
  {id:'skills',label:t('Skills'),description:t('Browse and manage your skills')},
  {id:'mcp',label:t('Connectors'),description:t('Manage MCP connectors')},
  // Existing local plugin management is real; unsupported /plugin install is not advertised.
  {id:'plugin',aliases:['plugins','marketplace'],label:t('Plugins'),description:t('Manage plugins')},
  {id:'help',label:t('Help'),description:t('Get help and support')},
  // R3-composer /copy [N] (2.42304.0 cc183b3ab: description X7oz/QBPDV, argumentHint "[N]", terminalAction "copy-reply",
  // gate hostInterceptSurface && hasSession): an open session's reply to the clipboard, offline and mid-turn included
  // (the command itself refuses while a reply streams). composer-copy-reply.mjs runs it.
  {id:'copy',label:t('Copy reply'),description:t('Copy Claude’s latest reply, or /copy 2 or higher for an earlier one'),argumentHint:'[N]',hasSession:true},
  // Sign-in and core updates belong to the frame (Settings › Preferences account, Settings › Cores): an agent's own
  // /auth, /login, /connect or /update would send a beginner to a terminal or npm (Qwen Code's ACP mode does).
  {id:'login',aliases:['auth','connect'],label:t('Sign in'),description:t('Sign in or add an API key in account settings')},
  {id:'update',label:t('Update core'),description:t('Check for core updates in Settings › Cores')},
  // Codex's /import (slash_command.rs Import): bring the Claude Code setup over (main.cjs codex-import).
  {id:'import',label:t('Import from Claude Code'),description:t('Bring your Claude Code setup and recent sessions into Codex'),connected:true},
];
const findCommand = name => sessionCommands.find(c => c.id === name || c.aliases?.includes(name));
// A built-in command's argument hint for the running core. '/compact [instructions]' only reaches a core with
// capabilities.compactInstructions (context.compactInstructions, from coreSupports): elsewhere the instructions are
// refused, so the menu row, chip and inline hint offer none and Enter runs it as is.
export function sessionCommandHint(command, context={}) {
  if(!command?.argumentHint)return '';
  if(command.id==='compact'&&context?.compactInstructions!==true)return '';
  if(command.id==='workflow'&&context?.workflowEngine==='agent'){
    // A core with its own /workflow command (ZCode: '/workflow [what the workflow should accomplish]') takes a task.
    const own=coreWorkflowCommand(context.skills);
    if(own)return own.argumentHint||t('[what the workflow should accomplish]');
    // A core whose model starts the run takes a saved workflow's name or a script path; --plan/--resume are the launcher's.
    return '[name|path] [--args JSON]';
  }
  return command.argumentHint;
}
// A built-in command's description for the running core. /usage promises plan usage, credits and rate limits only
// where the account reports them: a core billed per token (context.perTokenBilling: capabilities.perTokenBilling —
// DeepSeek Harness, OpenCode, MiMo, Codex on a custom endpoint) has none, and its Usage page shows the tokens used.
export function sessionCommandDescription(command, context={}) {
  if(command?.id==='usage'&&context?.perTokenBilling===true)return t('Show the tokens used on this Mac');
  // The list is built when the module loads, before the running core's assistant name is known: /resume names it now.
  if(command?.id==='resume')return t('Continue a DeepSeek session from this computer, including ones started outside OpenClaude Desktop');
  return command?.description??'';
}
export function commandSuggestion(name) {
  const distance = (a,b) => { let row=Array.from({length:b.length+1},(_,i)=>i); for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length]; };
  const ranked=sessionCommands.map(c=>({id:c.id,d:Math.min(...[c.id,...c.aliases||[]].map(n=>distance(name,n)))})).sort((a,b)=>a.d-b.d);
  return ranked[0]?.d <= (name.length<=4?1:2) && ranked[0].d !== ranked[1]?.d ? ranked[0].id : null;
}
// Skills in '/' (cc183b3ab-BNeMUZS1.js:619-700: the slash list is the session's supported commands, which
// include its user-invocable skills; c099c328d-CbkcmYSW.js:10637-10690 maps each name to its entry). Only
// enabled skills whose name is one slash token (plugin-qualified names keep their ':' or '.') reach the list;
// a built-in command keeps its own name.
const SLASH_NAME=/^[a-z0-9][a-z0-9_:.-]*$/i;
export function slashSkills(skills=[],customCommands=[]) {
  const seen=new Set(slashCustomCommands(customCommands).map(command=>command.name.toLowerCase())),out=[];
  for(const skill of Array.isArray(skills)?skills:[]){
    const name=typeof skill?.name==='string'?skill.name:'',key=name.toLowerCase();
    if(!SLASH_NAME.test(name)||findCommand(key)||seen.has(key)||typeof skill.path!=='string'||!skill.path)continue;
    seen.add(key);out.push({name,description:skill.description||'',argumentHint:skill.argumentHint||'',path:skill.path});
  }
  return out;
}
const findSkill=(name,context)=>slashSkills(context?.skills,context?.customCommands).find(skill=>skill.name.toLowerCase()===name);
// Custom commands (C3; custom-commands-model.mjs mergeCommands rows): user prompt templates from
// <userData>/commands and <project>/.code-desktop/commands. Built-in commands win; a shadowed row is not offered.
const CUSTOM_NAME=/^[a-z0-9][a-z0-9_-]{0,63}$/i;
export function slashCustomCommands(customCommands=[]) {
  const seen=new Set(),out=[];
  for(const row of Array.isArray(customCommands)?customCommands:[]){
    const name=typeof row?.name==='string'?row.name:'',key=name.toLowerCase();
    if(!CUSTOM_NAME.test(name)||row.shadowedBy||findCommand(key)||seen.has(key))continue;
    seen.add(key);out.push({name,description:row.description||'',argumentHint:row.argumentHint||'',body:typeof row.body==='string'?row.body:'',scope:row.scope==='project'?'project':'global',path:row.path||'',overrides:row.hidesSkill===true});
  }
  return out;
}
const findCustom=(name,context)=>slashCustomCommands(context?.customCommands).find(command=>command.name.toLowerCase()===name);
// The running core's own slash commands (context.coreCommands: a core with capabilities.coreCommands answers
// codeDesktop/commands/list with {name, description, inputHint}; the DeepSeek Harness command registry: /goal, /feedback).
// They run on the core (codeDesktop/commands/execute), never as a model message. Built-in, custom and skill names win.
// Cores that serve their commands as skills/list rows (path "command:<name>": OpenCode, MiMo, the ACP agents) reach
// the slash list through slashSkills instead.
// The DeepSeek core's own commands (codeDesktop/commands/list definitionId) in the UI language; any other command
// keeps the core's text.
const KNOWN_CORE_COMMANDS={
  '@deepseek-ai/dsh-command-goal':()=>({description:t('Set or view the goal for a long-running task')}),
  '@deepseek-ai/dsh-command-feedback':()=>({description:t('Record feedback about this session')}),
};
export function slashCoreCommands(coreCommands=[],context={}) {
  const taken=new Set([...slashCustomCommands(context.customCommands),...slashSkills(context.skills,context.customCommands)].map(row=>row.name.toLowerCase())),seen=new Set(),out=[];
  for(const row of Array.isArray(coreCommands)?coreCommands:[]){
    const name=typeof row?.name==='string'?row.name.trim().replace(/^\//,''):'',key=name.toLowerCase();
    if(!CUSTOM_NAME.test(name)||findCommand(key)||taken.has(key)||seen.has(key))continue;
    const definitionId=typeof row.definitionId==='string'?row.definitionId:null,known=definitionId&&Object.hasOwn(KNOWN_CORE_COMMANDS,definitionId)?KNOWN_CORE_COMMANDS[definitionId]():{};
    seen.add(key);out.push({name,description:known.description??(typeof row.description==='string'?row.description:''),argumentHint:typeof row.inputHint==='string'?row.inputHint:typeof row.argumentHint==='string'?row.argumentHint:'',...(definitionId?{definitionId}:{})});
  }
  return out;
}
const findCore=(name,context)=>slashCoreCommands(context?.coreCommands,context).find(command=>command.name.toLowerCase()===name);
// A known skill parses as {skill, args} with no error: send() treats it as a message, whose leading
// '/name' becomes the {type:'skill'} input item.
export function parseSessionCommand(text, context={}) {
  const value=String(text).trim(),named=/^\/([a-z0-9][a-z0-9_:.-]*)(?=\s|$)/i.exec(value);
  const custom=named&&!findCommand(named[1].toLowerCase())?findCustom(named[1].toLowerCase(),context):null;
  if(custom)return {id:custom.name,args:value.slice(named[0].length).trim(),requested:named[1].toLowerCase(),command:null,skill:null,custom,suggestion:null,error:null};
  const skill=named&&!findCommand(named[1].toLowerCase())?findSkill(named[1].toLowerCase(),context):null;
  if(skill)return {id:skill.name,args:value.slice(named[0].length).trim(),requested:named[1].toLowerCase(),command:null,skill,suggestion:null,error:null};
  const core=named&&!findCommand(named[1].toLowerCase())?findCore(named[1].toLowerCase(),context):null;
  if(core)return {id:core.name,args:value.slice(named[0].length).trim(),requested:named[1].toLowerCase(),command:null,skill:null,custom:null,coreCommand:core,suggestion:null,error:/[\r\n]/.test(value)?t('/{command} only works on a single line. Remove the extra lines and try again.',{command:named[1].toLowerCase()}):null};
  const match=/^\/([a-z0-9][a-z0-9_-]*)\b/i.exec(value);
  if(!match || value[match[0].length]==='/')return null;
  const requested=match[1].toLowerCase(),command=findCommand(requested),id=command?.id||requested,args=value.slice(match[0].length).trim();
  const suggestion=command?null:commandSuggestion(requested);
  let error=null;
  if(!command)error=['feedback','bug','share','login','logout','ultrareview'].includes(requested)?t('/{command} isn’t available in the app.',{command:requested}):t('/{command} isn’t a command here.',{command:requested});
  else if(/[\r\n]/.test(value)&&!command.multiline)error=t('/{command} only works on a single line. Remove the extra lines and try again.',{command:requested});
  else if(args&&!command.argumentHint)error=t('/{command} doesn’t take arguments here. Remove the text after the command and try again.',{command:requested});
  return {id,args,requested,command,suggestion,error};
}
// /btw asks codeDesktop/sideQuestion. The OpenClaude Desktop cores (the built-in one and the bridges) serve the extension; on a
// native core (Codex) main.cjs answers it with Codex's own side conversation, an ephemeral thread/fork
// (native-side-chat.cjs, as tui/src/app/side.rs), so it needs thread/fork. A core that reports
// capabilities.sideQuestion false decides. No core yet (still connecting): the other gates speak.
export function sideQuestionsSupported(core) {
  if(!core)return true;
  const reported=coreCapabilities(core).sideQuestion;
  if(reported===false)return false;
  if(typeof core==='object'&&coreForEngine(core.engine).kind==='native'&&core.capabilities?.unsupportedMethods?.includes?.('thread/fork'))return false;
  return true;
}
// /workflow runs local agents on the core (third-party/codex-workflows-runner) every agent with approvalPolicy "never".
// Every core can run them: schema agents use outputSchema / a StructuredOutput tool where the core has structured
// output, and ask for JSON in the prompt where it reports structuredOutput false (ZCode, the ACP agents; runner
// jsonAgent.js). A core with its own engine (capabilities.modelWorkflows) can run its own instead.
export function workflowsSupported(core) {
  void core;
  return true;
}
/** Whether a core has its own dynamic-workflow engine (Settings › Code › Dynamic workflows offers the choice). */
export const hasNativeWorkflowEngine = core => !!core && coreCapabilities(core).modelWorkflows===true;
/**
 * Which engine runs a core's dynamic workflows (Settings › Code › Dynamic workflows › Workflow engine, saved per core in
 * config.workflowEngines): "native" — the core's own, the default for a core that has one — or "codeDesktop".
 */
export function workflowEngineChoice(core, engines) {
  if(!hasNativeWorkflowEngine(core))return 'codeDesktop';
  const id=coreForEngine(typeof core==='string'?core:core.engine).id;
  return engines&&typeof engines==='object'&&engines[id]==='codeDesktop'?'codeDesktop':'native';
}
// Who runs /workflow: OpenClaude Desktop's runner ('runner') — its own engine, or, for a core whose launcher script can go
// straight to its engine (capabilities.workflowScripts: the DeepSeek Harness, codeDesktop/workflow/startScript through
// workflow-harness.mjs), that engine — or the core's model with its own workflow tool ('agent': MiMo, Qwen Code,
// ZCode's CreateWorkflow) while that core's own engine is chosen. Either way the run shows in the same WorkflowCard.
export function workflowEngine(core, engines) {
  if(!core)return 'runner';
  const caps=coreCapabilities(core);
  if(workflowEngineChoice(core,engines)==='codeDesktop')return 'runner';
  return caps.modelWorkflows===true&&caps.workflowScripts!==true?'agent':'runner';
}
// The core's own /workflow command, when its catalog lists one (a skills/list row with path "command:workflow": ZCode's
// built-in, which preloads its dynamic-workflows skill and asks for a topology plan before CreateWorkflow). On the agent's
// own engine /workflow runs that command as typed instead of agentWorkflowPrompt. Null otherwise.
export function coreWorkflowCommand(skills=[]) {
  const row=(Array.isArray(skills)?skills:[]).find(skill=>typeof skill?.path==='string'&&skill.path.toLowerCase()==='command:workflow'&&skill.enabled!==false);
  return row?{name:typeof row.name==='string'&&row.name?row.name:'workflow',path:row.path,argumentHint:typeof row.argumentHint==='string'?row.argumentHint.trim():''}:null;
}
// The turn that asks such a core to run a workflow with its own tool (/workflow [name|path] [--args JSON]).
export function agentWorkflowPrompt(args='') {
  const value=String(args??'').trim();
  // Says "dynamic workflow" (not "Workflow tool"): ZCode's legacy Workflow tool is a different feature from CreateWorkflow.
  return value?`Use a dynamic workflow: run ${value} with your dynamic workflow tool.`:'List the saved workflows you can run in this project, then ask me which one to run.';
}
// The core request behind each session action. A core lists the ones it
// cannot serve in initialize capabilities.unsupportedMethods (boot.core);
// context.sideQuestions / context.workflows false: the core can't serve /btw or /workflow.
const COMMAND_METHODS={fork:'thread/fork',subtask:'thread/fork',cd:'thread/fork',review:'review/start',rewind:'thread/revert',compact:'thread/compact/start'};
export function unsupportedCommand(id, context={}) {
  const unsupported=context.unsupportedMethods?.includes(COMMAND_METHODS[id])||((id==='btw'||id==='recap')&&context.sideQuestions===false)||(id==='workflow'&&context.workflows===false)||(id==='import'&&context.claudeImport!==true)||(id==='cd'&&context.forkCwd===false&&context.moveCwd!==true);
  if(!unsupported)return '';
  // context.coreName: the running core's display name (core-registry coreName).
  return typeof context.coreName==='string'&&context.coreName?t('Not available with {core} yet',{core:context.coreName}):t('Not available with this core yet');
}
export function commandUnavailable(command, context={}) {
  const unsupported=unsupportedCommand(command.id,context);
  if(unsupported)return unsupported;
  if(command.id==='workflow'&&context.dynamicWorkflows!==true)return t('Enable Dynamic workflows in Code settings first');
  // R3b-tasks: cc43287c9 Enaro/mK/n, the official refusal of /subtask where subtasks don't run.
  if(command.id==='subtask'&&context.subtaskCommand===false)return t('Subtasks aren’t available for this session.');
  if(command.id==='status'&&context.running)return t('Session info is available when DeepSeek finishes this turn.');
  if(command.id==='fast'&&context.fastAvailable===false)return t('Fast mode is not available for this model');
  if(command.id==='effort'&&context.effortAvailable===false)return t('Reasoning effort is not available for this model');
  if((command.session||command.hasSession)&&!context.current)return t('Open a session first');
  if(command.session&&context.archived)return t('Restore this archived session first');
  if((command.session||command.connected)&&!context.connected)return t('Reconnect to DeepSeek first');
  if((command.session||command.idle)&&context.loading)return t('Wait for the session to load');
  if(command.idle&&(context.running||context.sending||context.pending))return t('Wait for the current task to finish or stop it');
  if(['compact','fork','subtask','cd','review','rewind','recap'].includes(command.id)&&!context.hasHistory)return t('Send a message first');
  return '';
}
export function slashQuery(text) {
  const value=String(text);
  return value.startsWith('/')&&!/^\/\s/.test(value)&&value.length<=51&&!/[\r\n]/.test(value)?value.slice(1):null;
}
// The '/' suggestion under the caret, anywhere in the draft (2.31226.0 shared-5 mS/yS 'slash-command-suggestion', the
// tiptap Suggestion with char '/', allowSpaces, allowedPrefixes [' '], startOfLine false; ca80fca8d :15416-15424 the
// Code composer sets midMessageNeedsName). The text run is the text before the caret back to `boundary` (the start of
// its line, or the end of the chip/mention atom before it — PM's nodeBefore text). Of the '/…' matches in it
// (/\/.*?(?=\s\/|$)/g) the last one is taken; the char before its '/' must be a space or the run start, the caret must
// sit inside it, and after the caret comes whitespace or the end. yS allow(): at most 51 chars, the query does not
// start with a space, mid-message the query starts with a letter, digit or '_' (a bare '/' opens only at the very
// start), and a trigger dismissed with Escape (dismissedAt) stays closed. {start,end,query} in text offsets, or null.
export function slashToken(text, caret, {boundary=null,dismissedAt=null,midMessageNeedsName=true}={}) {
  const value=String(text??'');
  if(!Number.isInteger(caret)||caret<0||caret>value.length)return null;
  const lineStart=value.lastIndexOf('\n',caret-1)+1;
  const from=Number.isInteger(boundary)&&boundary>=lineStart&&boundary<=caret?boundary:lineStart;
  const run=value.slice(from,caret);
  if(!run)return null;
  const match=[...run.matchAll(/\/.*?(?=\s\/|$)/g)].pop();
  if(!match)return null;
  if(match.index>0&&run[match.index-1]!==' ')return null;
  // The last match runs to the caret (a later ' /' would have started another one).
  const start=from+match.index,end=start+match[0].length;
  if(!(start<caret&&end>=caret))return null;
  const query=match[0].slice(1);
  if(end-start>51||query.startsWith(' ')||dismissedAt===start)return null;
  if(midMessageNeedsName&&start>0&&!/^[\p{L}\p{N}_]/u.test(query))return null;
  if(caret<value.length&&value[caret].trim()!=='')return null;
  return {start,end:caret,query};
}
// c5cd1b4dc :3661-3666 subtitle on an overriding row ('Custom command', 66djAf//ud).
export const CUSTOM_COMMAND_SUBTITLE='Custom command';
// The '/' list's states (c5cd1b4dc :3586-3600, :3609-3625; ccc334009 z/L): a skeleton row while a command list it shows
// still loads, and the 'Some commands didn't load. Type / again to retry.' header when one failed. The menu draws
// headers first, then the rows, then the skeleton (the source's rankingPending branch appends it after the rows).
export const SLASH_RETRY_HEADER='Some commands didn\u2019t load. Type / again to retry.';
export const SLASH_PRESESSION_HEADER='More commands available once the session is running';
export function slashMenuEntries(commands=[],{preSession=false,loading=false,failed=false}={}){
  const entries=[];
  if(preSession)entries.push({type:'header',label:SLASH_PRESESSION_HEADER});
  if(failed)entries.push({type:'header',label:SLASH_RETRY_HEADER});
  commands.forEach((command,index)=>entries.push({type:'row',command,index}));
  if(loading)entries.push({type:'loading'});
  return entries;
}
// Whether a '/' list is still loading or failed: the skills (customize-store skills: idle|loading|ready|error) and the
// custom commands (custom-commands-store entry: loading|ready|error). Rows already shown keep showing while a list
// reloads; only a first load counts as loading, and only a list with nothing to show counts as failed.
export function slashListState({skills=null,customCommands=null}={}){
  const pending=entry=>!!entry&&(entry.status==='loading'||entry.loading===true)&&entry.status!=='ready';
  const failed=entry=>!!entry&&entry.status==='error';
  return {loading:pending(skills)||pending(customCommands),failed:failed(skills)||failed(customCommands)};
}
export function matchCommands(query, context={}) {
  const value=String(query).replace(/^\//,'').toLowerCase();
  if(value.length>50)return [];
  const spaced=/^(\S+)\s+(\S)?/.exec(value);
  if(spaced&&(spaced[2]||findCommand(spaced[1])||findCustom(spaced[1],context)||findCore(spaced[1],context)||findSkill(spaced[1],context)))return [];
  const q=value.trim();
  const rank=c=>c.id===q?0:c.aliases?.includes(q)?1:c.id.startsWith(q)?2:c.aliases?.some(a=>a.startsWith(q))?3:4;
  const commands=sessionCommands.filter(c=>!commandUnavailable(c,context)&&(!q||[c.id,...c.aliases||[]].some(n=>n.includes(q))))
    .sort((a,b)=>rank(a)-rank(b)).map(c=>({...c,description:sessionCommandDescription(c,context),argumentHint:sessionCommandHint(c,context),matchedAlias:q&&!c.id.includes(q)?c.aliases?.find(n=>n.includes(q)):null}));
  // Skill rows follow the host commands: {id: name, description, argumentHint, kind:'skill', path}.
  // Custom rows sit between them: kind 'custom'. c5cd1b4dc :3640-3680: no group header; a row that takes the name of
  // another command (here: a custom command hiding a same-name skill, custom-commands-model hidesSkill) carries the
  // right-hand 'Custom command' subtitle.
  const custom=slashCustomCommands(context.customCommands).map(command=>({id:command.name,description:command.description,argumentHint:command.argumentHint,kind:'custom',scope:command.scope,matchedAlias:null,...(command.overrides?{subtitle:CUSTOM_COMMAND_SUBTITLE}:{})}))
    .filter(command=>!q||command.id.toLowerCase().includes(q)).sort((a,b)=>rank({id:a.id.toLowerCase()})-rank({id:b.id.toLowerCase()}));
  const skills=slashSkills(context.skills,context.customCommands).map(skill=>({id:skill.name,description:skill.description,argumentHint:skill.argumentHint,kind:'skill',path:skill.path,matchedAlias:null}))
    .filter(skill=>!q||skill.id.toLowerCase().includes(q)).sort((a,b)=>rank({id:a.id.toLowerCase()})-rank({id:b.id.toLowerCase()}));
  // The core's own commands (kind 'core') follow the custom rows; the chip they insert is a plain command chip.
  const core=slashCoreCommands(context.coreCommands,context).map(command=>({id:command.name,description:command.description,argumentHint:command.argumentHint,kind:'core',matchedAlias:null}))
    .filter(command=>!q||command.id.toLowerCase().includes(q)).sort((a,b)=>rank({id:a.id.toLowerCase()})-rank({id:b.id.toLowerCase()}));
  return [...commands,...custom,...core,...skills];
}
export function commandArgumentHint(text, context={}) {
  if(text.length>128||!/^\/\S+[ \t]+$/.test(text))return '';
  const name=text.trim().slice(1).toLowerCase();
  const command=findCommand(name);
  if(command)return sessionCommandHint(command,context);
  return findCustom(name,context)?.argumentHint||findCore(name,context)?.argumentHint||'';
}
// '/plan [open|share|<description>]' (cc43287c9-BMbiZYzF.js:28880-28916 vG). Not yet planning: switch to Plan, open the
// pane when a plan exists (bare/open) or leave the description in the draft. Already planning: open the pane when it
// can, otherwise the 'already_in_plan' / 'already_in_plan_no_plan' notice; a description still goes to the draft
// with 'already_in_plan'. Plan not selectable: only a bare '/plan' over a written plan opens the pane.
export function planCommandAction({arg='',currentMode,planSelectable=true,hasPlan=false,canOpenPane=false,paneAlreadyOpen=false}={}){
  const planning=currentMode==='plan',lower=arg.toLowerCase(),described=arg!==''&&lower!=='open'&&lower!=='share',openable=hasPlan&&canOpenPane&&!paneAlreadyOpen;
  if(!planning&&!planSelectable)return described||!openable?{kind:'unavailable'}:{kind:'run',switchToPlan:false,openPane:true,notice:null,composerText:null};
  if(described)return {kind:'run',switchToPlan:!planning,openPane:planning&&openable,notice:planning?'already_in_plan':null,composerText:arg};
  return {kind:'run',switchToPlan:!planning,openPane:openable,notice:planning?(hasPlan?(openable?null:'already_in_plan'):'already_in_plan_no_plan'):null,composerText:null};
}
export const operationPending=operation=>['starting','running','unknown'].includes(operation?.phase);
export function rateLimitRows(result) {
  const entries=result?.rateLimitsByLimitId&&Object.keys(result.rateLimitsByLimitId).length?Object.entries(result.rateLimitsByLimitId):result?.rateLimits?[['codex',result.rateLimits]]:[];
  return entries.flatMap(([key,limits])=>['primary','secondary'].flatMap(window=>{
    const data=limits?.[window];if(!data||!Number.isFinite(data.usedPercent))return [];
    const minutes=data.windowDurationMins;
    return [{key:`${key}:${window}`,label:`${limits.limitName||key} · ${Number.isFinite(minutes)&&minutes>0?minutes%1440===0?t('{count} days',{count:minutes/1440}):minutes%60===0?t('{count} hours',{count:minutes/60}):t('{count} minutes',{count:minutes}):window}`,remaining:Math.max(0,Math.min(100,100-data.usedPercent)),resetsAt:Number.isFinite(data.resetsAt)?data.resetsAt:null}];
  }));
}
