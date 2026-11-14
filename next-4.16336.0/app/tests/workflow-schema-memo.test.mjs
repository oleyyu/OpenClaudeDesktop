import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runWorkflowSource} from '../third-party/codex-workflows-runner/src/runWorkflow.js';
const fixtures=JSON.parse(await readFile(new URL('../../vendor/deepseek-harness/packages/workflow/workflow-ptc/tests/fixtures/schema-memo-native.json',import.meta.url),'utf8'));
const header='export const meta={name:"schema",description:"Schema fixture"};\n';
for(const fixture of fixtures)test(`native schema reference: ${fixture.name}`,async()=>{
  const directory=await mkdtemp(join(tmpdir(),'alternate-schema-memo-'));
  try{
    const file=join(directory,'child.js');
    if(fixture.child)await writeFile(file,header+fixture.child);
    const schemas=[];
    const value=await runWorkflowSource(header+fixture.script.replaceAll('workflow("child"','workflow('+JSON.stringify({scriptPath:file})),{
      runAgent:async(_prompt,opts)=>{schemas.push(structuredClone(opts.schema));const value={value:opts.schema.properties.value.enum[0]};if(opts.schema.required?.some(key=>!Object.hasOwn(value,key)))throw Error('Fixture provider rejected invalid output');return value;},
    });
    assert.deepEqual(structuredClone(value),fixture.value);
    // The reference fixture's missing-output nudge makes three native model
    // requests; this provider stub rejects after its one invalid output.
    if(fixture.name!=='invalid-then-repaired')assert.deepEqual(schemas,fixture.schemas);
  }finally{await rm(directory,{recursive:true,force:true});}
});
