// Slash commands, ⌘; and Home sign-in gated on what the running core serves (core-registry capabilities and
// descriptors), copy naming the core; reconnect onto another core reloads the session list; onboarding's
// Connect step runs DeepSeek Harness.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseSessionCommand as parse,matchCommands,sessionCommands,commandUnavailable,commandArgumentHint,sideQuestionsSupported,workflowsSupported,workflowEngine,agentWorkflowPrompt,coreWorkflowCommand,slashCoreCommands} from '../src/session-command-model.mjs';
import {accountIdentity,accountMenuLines,coreSignInPrompt} from '../src/account-label-model.mjs';
import zhCN from '../electron/i18n/zh-CN/index.mjs';

const root=path.resolve(import.meta.dirname,'..');
import { sideQuestionUnsupported } from '../src/side-chat-controls.mjs';
const ready={current:'a',connected:true,hasHistory:true};
const btw=sessionCommands.find(c=>c.id==='btw'),workflow=sessionCommands.find(c=>c.id==='workflow');

test('side questions: a reported false wins; bridges serve the extension and a native core (Codex) its own /side fork',()=>{
 assert.equal(sideQuestionsSupported({engine:'deepseek-harness',capabilities:{}}),true,'DeepSeek bridge');
 assert.equal(sideQuestionsSupported({engine:'opencode',capabilities:{}}),true,'OpenCode bridge');
 assert.equal(sideQuestionsSupported({engine:'zcode'}),true,'ZCode bridge');
 assert.equal(sideQuestionsSupported({engine:'gemini',capabilities:{sideQuestion:true}}),true,'ACP reports it');
 // Codex 0.155.1 /side: main.cjs answers codeDesktop/sideQuestion with an ephemeral thread/fork (native-side-chat.cjs).
 assert.equal(sideQuestionsSupported({capabilities:{}}),true,'no engine is Codex');
 assert.equal(sideQuestionsSupported({engine:'codex'}),true);
 assert.equal(sideQuestionsSupported('codex'),true,'config.core id before the first connect');
 assert.equal(sideQuestionsSupported({engine:'codex',capabilities:{unsupportedMethods:['thread/fork']}}),false,'a native core without thread/fork');
 assert.equal(sideQuestionsSupported({engine:'deepseek-harness',capabilities:{sideQuestion:false}}),false,'a reported false wins');
 assert.equal(sideQuestionsSupported({capabilities:{sideQuestion:true}}),true,'a reported true wins on any core');
 assert.equal(sideQuestionsSupported(undefined),true,'no core yet: the other gates speak');
});

test('/btw is hidden and refused where side questions are missing (W14-code composer-04: xme o2F4dsMA6N)',()=>{
 const codex={...ready,coreName:'Codex',sideQuestions:false};
 assert.equal(commandUnavailable(btw,codex),'Side chat isn’t available in this session.');
 assert.equal(commandUnavailable(btw,{...ready,sideQuestions:false}),'Side chat isn’t available in this session.');
 assert.equal(commandUnavailable(btw,{...ready,coreName:'DeepSeek Harness',sideQuestions:true}),'');
 assert.equal(matchCommands('bt',codex).some(r=>r.id==='btw'),false);
 assert.equal(matchCommands('bt',{...ready,sideQuestions:true})[0].id,'btw');
 assert.equal(parse('/btw what is this?',codex).command.id,'btw','still parses, so send() reports the reason');
});

test('the side chat treats Codex’s -32600 unknown variant like -32601 method not found',()=>{
 assert.equal(sideQuestionUnsupported({code:-32601,message:'Method not found'}),true);
 assert.equal(sideQuestionUnsupported({code:-32600,message:'Invalid request: unknown variant `codeDesktop/sideQuestion`, expected one of `initialize`, `server/diagnostics`'}),true);
 assert.equal(sideQuestionUnsupported({code:-32600,message:'threadId is required'}),false,'a real invalid request keeps its message');
 assert.equal(sideQuestionUnsupported({code:-32000,message:'unknown variant'}),false);
 assert.equal(sideQuestionUnsupported(new Error('boom')),false);
});

test('/workflow runs on every core: structured output or the JSON fallback (runner jsonAgent.js); a core with its own engine runs it unless Settings chose OpenClaude Desktop',()=>{
 // OpenClaude Desktop's runner asks for JSON in the prompt where the core has no structured output, so no core is excluded.
 assert.equal(workflowsSupported({engine:'zcode',capabilities:{structuredOutput:false,modelWorkflows:false}}),true,'a ZCode that reports no workflows of its own: OpenClaude Desktop\'s engine');
 // ZCode's own engine (CreateWorkflow): never hidden, and it runs /workflow itself.
 assert.equal(workflowsSupported({engine:'zcode',capabilities:{structuredOutput:false}}),true);
 assert.equal(workflowsSupported('zcode'),true,'before it connects');
 assert.equal(workflowEngine({engine:'zcode',capabilities:{structuredOutput:false}}),'agent');
 assert.equal(workflowsSupported({engine:'gemini',capabilities:{structuredOutput:false,modelWorkflows:false}}),true);
 // Settings › Code › Dynamic workflows › Workflow engine: OpenClaude Desktop's engine for a core that has its own.
 assert.equal(workflowEngine({engine:'zcode',capabilities:{structuredOutput:false}},{zcode:'codeDesktop'}),'runner');
 assert.equal(workflowsSupported({engine:'opencode',capabilities:{structuredOutput:true}}),true);
 assert.equal(workflowsSupported({engine:'deepseek-harness',capabilities:{structuredOutput:true}}),true);
 assert.equal(workflowsSupported({capabilities:{}}),true,'Codex honors outputSchema natively');
 assert.equal(workflowsSupported(undefined),true);
 // A core with its own workflow engine (Qwen Code: modelWorkflows, no outputSchema) runs /workflow itself.
 const qwen={engine:'qwen',capabilities:{structuredOutput:false,modelWorkflows:true}};
 assert.equal(workflowsSupported(qwen),true);
 assert.equal(workflowEngine(qwen),'agent');
 // Every core with its own engine runs it itself (the runner is only for a core without one).
 // The DeepSeek Harness runs the launcher's script on its own engine (workflowScripts → workflow-harness.mjs startScript).
 assert.equal(workflowEngine({engine:'deepseek-harness',capabilities:{structuredOutput:true,modelWorkflows:true}}),'runner');
 assert.equal(workflowEngine({engine:'deepseek-harness',capabilities:{structuredOutput:true,modelWorkflows:true,workflowScripts:false}}),'agent');
 assert.equal(workflowEngine({engine:'mimo',capabilities:{structuredOutput:true,modelWorkflows:true}}),'agent');
 assert.equal(workflowEngine({engine:'opencode',capabilities:{structuredOutput:true,modelWorkflows:false}}),'runner');
 assert.equal(workflowEngine({capabilities:{}}),'runner','Codex has no engine of its own');
 assert.equal(workflowEngine(undefined),'runner');
 assert.equal(commandArgumentHint('/workflow ',{workflowEngine:'agent'}),'[name|path] [--args JSON]');
 // ZCode lists its own /workflow (path command:workflow): that command runs as typed, with ZCode's hint.
 const zcodeSkills=[{name:'workflow',description:'Design and run a dynamic workflow',path:'command:workflow',argumentHint:'[what the workflow should accomplish]'}];
 assert.deepEqual(coreWorkflowCommand(zcodeSkills),{name:'workflow',path:'command:workflow',argumentHint:'[what the workflow should accomplish]'});
 assert.equal(commandArgumentHint('/workflow ',{workflowEngine:'agent',skills:zcodeSkills}),'[what the workflow should accomplish]');
 assert.equal(commandArgumentHint('/workflow ',{workflowEngine:'agent',skills:[{...zcodeSkills[0],argumentHint:''}]}),'[what the workflow should accomplish]');
 assert.equal(commandArgumentHint('/workflow ',{workflowEngine:'runner',skills:zcodeSkills}),commandArgumentHint('/workflow ',{workflowEngine:'runner'}));
 assert.equal(coreWorkflowCommand([{name:'workflow',path:'/x/SKILL.md'}]),null);
 assert.equal(commandArgumentHint('/workflow ',{workflowEngine:'runner'}),'[path] [--plan] [--resume run-id] [--args JSON]');
 assert.match(agentWorkflowPrompt('review --args {"a":1}'),/^Use a dynamic workflow: run review --args \{"a":1\} with your dynamic workflow tool\.$/);
 assert.match(agentWorkflowPrompt(''),/saved workflows/);
 const zcode={...ready,coreName:'ZCode',workflows:false,dynamicWorkflows:true};
 assert.equal(commandUnavailable(workflow,zcode),'Not available with ZCode yet','checked before the Dynamic workflows setting');
 assert.equal(commandUnavailable(workflow,{...zcode,dynamicWorkflows:false}),'Not available with ZCode yet');
 assert.equal(commandUnavailable(workflow,{...ready,workflows:true,dynamicWorkflows:false}),'Enable Dynamic workflows in Code settings first');
 assert.equal(matchCommands('workfl',zcode).some(r=>r.id==='workflow'),false);
 assert.equal(commandUnavailable(sessionCommands.find(c=>c.id==='workflows'),zcode),'','the run list stays');
});

test('a core’s own commands (codeDesktop/commands/list rows) parse and list instead of “isn’t a command here”',()=>{
 const coreCommands=[{name:'goal',description:'Create, pause, resume or clear a long-running goal',inputHint:'[objective|pause|resume|clear]'},
  {name:'review',description:'shadowed by the built-in'},{name:'feedback',description:'Send feedback'},{name:'bad name'},{name:'/plan2'},{name:'goal',description:'dup'}];
 assert.deepEqual(slashCoreCommands(coreCommands).map(r=>r.name),['goal','feedback','plan2']);
 assert.equal(parse('/goal ship it').error,'/goal isn’t a command here.','no core commands: unchanged');
 const context={...ready,coreCommands};
 const parsed=parse('/goal ship the migration',context);
 assert.equal(parsed.error,null);assert.equal(parsed.coreCommand.name,'goal');assert.equal(parsed.args,'ship the migration');assert.equal(parsed.command,null);
 assert.match(parse('/goal a\nb',context).error,/single line/);
 assert.deepEqual(matchCommands('go',context).find(r=>r.id==='goal'),{id:'goal',description:'Create, pause, resume or clear a long-running goal',argumentHint:'[objective|pause|resume|clear]',kind:'core',matchedAlias:null});
 assert.deepEqual(matchCommands('goal x',context),[],'an argument closes the menu');
 assert.equal(commandArgumentHint('/goal ',context),'[objective|pause|resume|clear]');
 assert.equal(parse('/review',context).command.id,'review','built-ins win');
 // A custom command or skill of the same name wins over the core's.
 assert.equal(parse('/feedback',{...context,customCommands:[{name:'feedback',body:'x'}]}).custom.name,'feedback');
 assert.equal(parse('/feedback',{...context,skills:[{name:'feedback',path:'/s/f/SKILL.md'}]}).skill.name,'feedback');
});

test('account label keeps the chosen core while disconnected and shows a ChatGPT sign-in’s email',()=>{
 assert.deepEqual(accountMenuLines({account:null},{engine:undefined}),{orgPrimary:'Codex',orgSecondary:null});
 assert.deepEqual(accountMenuLines(null,'codex'),{orgPrimary:'Codex',orgSecondary:null},'config.core id');
 assert.deepEqual(accountMenuLines(null,'zcode').orgPrimary,'ZCode');
 assert.deepEqual(accountMenuLines(null,'deepseek').orgPrimary,'DeepSeek API');
 assert.deepEqual(accountMenuLines({account:{type:'chatgpt',email:'ada@example.com',planType:'plus'}},{}),{orgPrimary:'Codex',orgSecondary:'ada@example.com'});
 assert.deepEqual(accountIdentity('',{account:{type:'chatgpt',email:'ada@example.com'}},'codex'),{identity:'Codex',orgPrimary:'ada@example.com',orgSecondary:null});
});

test('Home sign-in prompt follows the running core: Codex’s ChatGPT card only on Codex, a bridge names itself',()=>{
 const codex={capabilities:{}};
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:true},codex),{name:'Codex',action:'login'});
 assert.equal(coreSignInPrompt({account:null,requiresOpenaiAuth:false},codex),null,'Codex on a custom endpoint');
 assert.equal(coreSignInPrompt({account:{type:'chatgpt'},requiresOpenaiAuth:true},codex),null);
 // OpenCode/MiMo report requiresOpenaiAuth when nothing is usable: their own card, never "Sign in to Codex".
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:true,mimo:{freeTier:null}},{engine:'mimo'}),{name:'MiMo Code',action:'settings'});
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:true},{engine:'opencode'}),{name:'OpenCode',action:'settings'});
 assert.equal(coreSignInPrompt({account:null,requiresOpenaiAuth:false,opencode:{freeTier:{provider:'opencode'}}},{engine:'opencode'}),null,'the free tier works signed out');
 // ZCode and the ACP agents always report requiresOpenaiAuth false: the missing account decides.
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:false,zcode:{codingPlan:[]}},{engine:'zcode'}),{name:'ZCode',action:'settings'});
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:false},{engine:'gemini'}),{name:'Gemini CLI',action:'settings'});
 // Qwen Code takes its providers' API keys in Settings › Account (qwen/providers/connect).
 assert.deepEqual(coreSignInPrompt({account:null,requiresOpenaiAuth:false},{engine:'qwen'}),{name:'Qwen Code',action:'settings'});
 // The DeepSeek core has its own key card.
 assert.equal(coreSignInPrompt({account:null,requiresOpenaiAuth:true,deepseek:{apiKey:{configured:false}}},{engine:'deepseek-harness'}),null);
 assert.equal(coreSignInPrompt({account:null,requiresOpenaiAuth:true},{engine:'deepseek-harness'}),null,'no login options');
 assert.equal(coreSignInPrompt(null,codex),null);
});

test('main.jsx wires the gates: ⌘; and the side chat, the sign-in card, account label, reconnect and onboarding',async()=>{
 const main=await fs.readFile(path.join(root,'src/main.jsx'),'utf8');
 assert.match(main,/commandContext\.sideQuestions = sideQuestionsSupported\(runningCore\);/);
 assert.match(main,/commandContext\.workflows = workflowsSupported\(runningCore\);/);
 assert.match(main,/commandContext\.coreName = runningCore \? coreName\(runningCore\) : "";/);
 assert.match(main,/if \(!sideQuestionsRef\.current\) \{/,'⌘; checks the capability');
 assert.match(main,/coreSupports\(boot\?\.core, "coreCommands"\)/);
 // The core refuses an execute without the session's turn/start permission (a command can start a turn: /goal).
 assert.match(main,/rpc\("codeDesktop\/commands\/execute", \{ \.\.\.turn, threadId: origin, command: entry\.name, args \}\)/);
 assert.doesNotMatch(main,/t\("Sign in to Codex"\)/,'no hardcoded Codex card');
 assert.match(main,/coreSignInPrompt\(boot\.account, boot\.core\)/);
 assert.match(main,/accountIdentity\(displayName, boot\?\.account, boot\?\.core \|\| boot\?\.config\?\.core \|\| undefined\)/);
 assert.match(main,/sessionsCoreRef\.current !== coreEngine\(b\.core\)/,'a reconnect onto another core reloads the list');
 assert.match(main,/await openSession\(stillListed \? target : null\)/);
 assert.match(main,/if \(reselect\) await call\("cores", \{ op: "select", id: "deepseek" \}\);/,'Connect a model runs DeepSeek Harness');
 const sessionModel=await fs.readFile(path.join(root,'src/session-command-model.mjs'),'utf8');
 assert.doesNotMatch(sessionModel,/the DeepSeek core yet/);
});

test('zh-CN covers the new copy with the same placeholders',()=>{
 for(const key of ['Not available with {core} yet','Not available with this core yet','/{command} didn’t finish.','Sign in or add an API key in Settings › General › Account so {name} can answer.','Open Settings','Sign in to {name} to start a session.','Sign in to {name}']){
  assert.equal(typeof zhCN[key],'string',key);
  assert.deepEqual(zhCN[key].match(/\{\w+\}/g)||[],key.match(/\{\w+\}/g)||[],key);
 }
});

test('/compact offers [instructions] only on a core that takes them (capabilities.compactInstructions)',async()=>{
 const {sessionCommandHint}=await import('../src/session-command-model.mjs');
 const compact=sessionCommands.find(command=>command.id==='compact');
 const base={current:'t',connected:true,hasHistory:true};
 assert.equal(sessionCommandHint(compact,base),'');
 assert.equal(sessionCommandHint(compact,{...base,compactInstructions:true}),'[instructions]');
 assert.equal(matchCommands('compact',base).find(row=>row.id==='compact').argumentHint,'');
 assert.equal(matchCommands('compact',{...base,compactInstructions:true}).find(row=>row.id==='compact').argumentHint,'[instructions]');
 assert.equal(commandArgumentHint('/compact ',base),'');
 assert.equal(commandArgumentHint('/compact ',{compactInstructions:true}),'[instructions]');
 // Other commands keep their hints on every core.
 assert.equal(matchCommands('fork',base).find(row=>row.id==='fork').argumentHint,'[prompt]');
 const main=await fs.readFile(path.resolve(import.meta.dirname,'../src/main.jsx'),'utf8');
 assert.match(main,/compactInstructions: coreSupports\(boot\?\.core, "compactInstructions"\)/);
});

test('/cd is unavailable on a core that reports forkCwd false (Bhe 12XmfjC9XR); undeclared it stays',()=>{
 const cd=sessionCommands.find(c=>c.id==='cd');
 assert.equal(commandUnavailable(cd,{...ready,coreName:'Gemini CLI',forkCwd:false}),'Changing the directory isn’t available for this session.');
 assert.equal(commandUnavailable(cd,{...ready,forkCwd:true}),'');
 assert.equal(commandUnavailable(cd,{...ready}),'');
});
