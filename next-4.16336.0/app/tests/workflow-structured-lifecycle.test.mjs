import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const cases=JSON.parse(await readFile(new URL('./fixtures/workflow-structured-lifecycle-native.json',import.meta.url),'utf8'));
const sandbox=await mkdtemp(join(tmpdir(),'workflow-structured-lifecycle-'));
for(const key of ['HOME','CODEX_HOME','XDG_CONFIG_HOME','TMPDIR']){process.env[key]=join(sandbox,key);await mkdir(process.env[key]);}
const {codexAgent,shutdownClient}=await import('../third-party/codex-workflows-runner/src/codexAgent.js');
const {runWorkflowSource}=await import('../third-party/codex-workflows-runner/src/runWorkflow.js');
test.after(()=>rm(sandbox,{recursive:true,force:true}));
for(const fixture of cases)test(`native structured lifecycle: ${fixture.name}`,async()=>{
 const directory=await mkdtemp(join(sandbox,'case-')),previous=process.env.MAX_STRUCTURED_OUTPUT_RETRIES;
 if(fixture.cap)process.env.MAX_STRUCTURED_OUTPUT_RETRIES=String(fixture.cap);else delete process.env.MAX_STRUCTURED_OUTPUT_RETRIES;
 let output;const events=[];
 try{
  const value=structuredClone(await runWorkflowSource('export const meta={name:"lifecycle",description:"Native lifecycle"};'+`try{return {ok:true,value:await agent(${JSON.stringify('SCHEMA_CASE:'+JSON.stringify(fixture.replies))},{schema:${JSON.stringify(fixture.schema)}})}}catch(error){return {ok:false,error:error.message}}`,{
   onOutput:text=>{output=JSON.parse(text);},onEvent:event=>events.push(event),
   runAgent:(prompt,options)=>codexAgent(prompt,{...options,cwd:directory,retries:0,clientOptions:{command:process.execPath,args:[resolve(import.meta.dirname,'fixtures/workflow-structured-batch-server.cjs')],cwd:directory}}),
  }));
  assert.equal(value.ok,fixture.expected.value.ok);
  if(value.ok)assert.deepEqual(value.value,fixture.expected.value.value);
  const member=output.workflowProgress.find(row=>row.type==='workflow_agent');
  assert.equal(member.state,fixture.expected.progress[0].state);
  assert.equal(member.toolCalls,fixture.expected.toolCalls);
  if(member.state==='done')assert.equal(member.error,undefined);
  assert.equal(events.filter(event=>event.type==='end').length,1);
  const frames=(await readFile(join(directory,'batch-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(frames.filter(frame=>frame.providerRequest).length,fixture.expected.modelCalls);
  assert.equal(frames.filter(frame=>frame.effect==='Read').length,fixture.name.includes('read')?1:0);
  assert.equal(frames.filter(frame=>frame.effect==='Bash').length,fixture.expected.marker?1:0);
  assert.equal(frames.find(frame=>frame.method==='thread/start').params.experimentalRawEvents,true);
 }finally{await shutdownClient();if(previous===undefined)delete process.env.MAX_STRUCTURED_OUTPUT_RETRIES;else process.env.MAX_STRUCTURED_OUTPUT_RETRIES=previous;}
});
