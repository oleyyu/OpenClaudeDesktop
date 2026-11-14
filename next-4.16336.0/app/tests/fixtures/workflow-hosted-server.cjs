#!/usr/bin/env node
// Model-server fixture for the real Workflow child process's hosted execution route.
const readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const outputFile=path.join(process.cwd(),'engine.output');
const value={text:'x'.repeat(120000)};
const meta={name:'hosted',description:'Hosted fixture'};
const reply=(id,result)=>process.stdout.write(JSON.stringify({id,result})+'\n');
readline.createInterface({input:process.stdin}).on('line',line=>{
 const request=JSON.parse(line);if(request.id===undefined)return;
 fs.appendFileSync(path.join(process.cwd(),'hosted-rpc.jsonl'),JSON.stringify(request)+'\n');
 switch(request.method){
  case 'initialize':return reply(request.id,{userAgent:'fixture/0.155.1',codexHome:process.env.CODEX_HOME});
  case 'codeDesktop/diagnostics':return reply(request.id,{workflowExecute:true});
  case 'thread/start':return reply(request.id,{thread:{id:'hosted-thread'},model:'fixture'});
  case 'codeDesktop/workflow/startScript':return reply(request.id,{runId:'wf_hosted',attemptId:'hosted-attempt',meta});
  case 'codeDesktop/workflow/scriptResult':
   fs.writeFileSync(outputFile,JSON.stringify({summary:meta.description,agentCount:0,logs:['engine log'],result:value,workflowProgress:[],totalTokens:0,totalToolCalls:0},null,2));
   return reply(request.id,{value,stopReason:'completed',agentsStarted:0,outputFile});
  case 'codeDesktop/workflow/releaseScript':return reply(request.id,{});
  default:process.stdout.write(JSON.stringify({id:request.id,error:{code:-32601,message:'Unexpected hosted fixture method'}})+'\n');
 }
});
