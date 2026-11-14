import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const cases=JSON.parse(await readFile(new URL('./fixtures/workflow-structured-native.json',import.meta.url),'utf8'));
const native=cases.map(item=>item.expected);
const sandbox=await mkdtemp(join(tmpdir(),'workflow-structured-agent-'));
for(const key of ['HOME','CODEX_HOME','XDG_CONFIG_HOME','TMPDIR']){process.env[key]=join(sandbox,key.toLowerCase());await mkdir(process.env[key]);}
const {codexAgent,shutdownClient}=await import('../third-party/codex-workflows-runner/src/codexAgent.js');
test.after(()=>rm(sandbox,{recursive:true,force:true}));
const fixture=resolve(import.meta.dirname,'fixtures/workflow-structured-server.cjs');
for(const item of cases)test(`native structured agent: ${item.name}`,async()=>{
  const directory=await mkdtemp(join(sandbox,'case-')),before=process.env.MAX_STRUCTURED_OUTPUT_RETRIES;
  if(item.cap)process.env.MAX_STRUCTURED_OUTPUT_RETRIES=String(item.cap);else delete process.env.MAX_STRUCTURED_OUTPUT_RETRIES;
  const expected=native.find(r=>r.name===item.name);
  let outcome;
  try{
    try{outcome={ok:true,value:await codexAgent('SCHEMA_CASE:'+JSON.stringify(item.replies),{schema:item.schema,cwd:directory,retries:0,clientOptions:{command:process.execPath,args:[fixture],cwd:directory}})};}
    catch(error){outcome={ok:false,error:error.message};}
    assert.equal(outcome.ok,expected.value.ok,outcome.error);
    if(outcome.ok)assert.deepEqual(outcome.value,expected.value.value);
    else if(item.name.startsWith('invalid-cap'))assert.match(outcome.error,new RegExp(`retry cap \\(${item.cap??5}\\)`));
    else if(item.name.includes('text'))assert.match(outcome.error,/without calling StructuredOutput/);
    else assert.match(outcome.error,/invalid outputSchema/);
    let frames=[];try{frames=(await readFile(join(directory,'structured-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);}catch(error){if(error.code!=='ENOENT')throw error;}
    assert.equal(frames.filter(f=>f.providerRequest).length,expected.modelCalls);
    const starts=frames.filter(f=>f.method==='thread/start');
    assert.equal(starts.length,expected.modelCalls?1:0);
    if(starts.length){
      const tool=starts[0].params.dynamicTools[0];
      assert.deepEqual(JSON.parse(tool.description.split('\n')[1]),item.schema);
      assert.deepEqual(tool.inputSchema,{type:'object',additionalProperties:true});
    }
    assert.ok(frames.filter(f=>f.method==='turn/start').every(f=>!Object.hasOwn(f.params,'outputSchema')),'author schema must not be narrowed by strict output conversion');
  }finally{
    await shutdownClient();if(before===undefined)delete process.env.MAX_STRUCTURED_OUTPUT_RETRIES;else process.env.MAX_STRUCTURED_OUTPUT_RETRIES=before;
  }
});

const settings=directory=>({cwd:directory,retries:0,clientOptions:{command:process.execPath,args:[fixture],cwd:directory}});
const schema={type:'object',properties:{value:{type:'string'}},required:['value']};
test('concurrent structured agents isolate even identical server call IDs',async()=>{
  const directory=await mkdtemp(join(sandbox,'concurrent-'));
  try{
    const values=await Promise.all(['first','second','third'].map(value=>codexAgent('SCHEMA_CASE:'+JSON.stringify({reuseCallId:true,replies:[{value}]}),{...settings(directory),schema})));
    assert.deepEqual(values,[{value:'first'},{value:'second'},{value:'third'}]);
  }finally{await shutdownClient();}
});
test('a tool reply only commits after the server reports a successful item',async()=>{
  const directory=await mkdtemp(join(sandbox,'commit-'));
  try{
    const value=await codexAgent('SCHEMA_CASE:'+JSON.stringify({rejectFirstCommit:true,replies:[{value:'discarded'},{value:'committed'}]}),{...settings(directory),schema});
    assert.deepEqual(value,{value:'committed'});
  }finally{await shutdownClient();}
});
test('cancelling a structured run interrupts the thread without accepting a later tool',async()=>{
  const directory=await mkdtemp(join(sandbox,'cancel-')),abort=new AbortController();
  const pending=codexAgent('SCHEMA_CASE:'+JSON.stringify({delay:1000,replies:[{value:'late'}]}),{...settings(directory),schema,signal:abort.signal});
  pending.catch(()=>{});
  try{
    for(let i=0;;i++){
      const text=await readFile(join(directory,'structured-wire.jsonl'),'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
      if(text.includes('turn/start'))break;
      assert.ok(i<100,'turn should start');await new Promise(resolve=>setTimeout(resolve,10));
    }
    abort.abort(Error('Cancelled by fixture'));
    await assert.rejects(pending,/Cancelled by fixture/);
    const frames=(await readFile(join(directory,'structured-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(frames.filter(f=>f.method==='turn/interrupt').length,1);
    assert.equal(frames.filter(f=>f.providerRequest).length,0);
  }finally{await shutdownClient();}
});
