import test from 'node:test';
import assert from 'node:assert/strict';
import { createImmediateTextSave } from '../src/immediate-text-save.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
function fixture() {
  const calls = [], states = [];
  const owner = createImmediateTextSave({ validate: value => settingsPatch({}, { codeFont: value }),
    save(value) { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); calls.push({value,resolve,reject}); return promise; },
    onState: state => states.push(state) });
  return {owner,calls,states};
}
test('every valid edit dispatches immediately; late errors cannot replace latest success', async () => {
  const {owner,calls,states}=fixture();
  const a=owner.submit('M',''), b=owner.submit('Me',''), c=owner.submit('Menlo','');
  assert.deepEqual(calls.map(x=>x.value),['M','Me','Menlo']);
  calls[2].resolve(); assert.equal(await c,true);
  calls[0].reject(Error('old failure')); calls[1].resolve(); await Promise.all([a,b]);
  assert.deepEqual(states.at(-1),{saving:false,error:''});
  assert.equal(states.filter(x=>!x.saving).length,1);
});
test('invalid draft never calls persistence, and old success does not clear its error', async () => {
  const {owner,calls,states}=fixture(); const good=owner.submit('Menlo','');
  assert.equal(await owner.submit('bad; font',''),false); assert.equal(calls.length,1);
  calls[0].resolve(); await good;
  assert.deepEqual(states.at(-1),{saving:false,error:'Enter a font family name.'});
});
test('revert dispatches corrective write after invalid or composing draft hides in-flight feedback', async () => {
  for(const invalid of [true,false]) {
    const {owner,calls}=fixture(); const a=owner.submit('Menlo','');
    if(invalid) await owner.submit('bad; font',''); else owner.invalidate();
    const b=owner.submit('',''); assert.deepEqual(calls.map(x=>x.value),['Menlo','']);
    calls[0].resolve(); calls[1].resolve(); await Promise.all([a,b]);
  }
});
test('revert still writes when successful promise has resolved before React confirms the prop', async () => {
  const {owner,calls}=fixture(); const a=owner.submit('Menlo','');calls[0].resolve();await a;
  const b=owner.submit('','');assert.equal(calls.length,2);calls[1].resolve();await b;
});
test('compositionend/input duplicates share a write and restored valid draft observes pending feedback', async () => {
  const {owner,calls,states}=fixture();const a=owner.submit('Menlo','');owner.invalidate();
  const b=owner.submit('Menlo','');assert.equal(calls.length,1);assert.equal(states.at(-1).saving,true);
  calls[0].reject(Error('disk unavailable'));await Promise.all([a,b]);
  assert.deepEqual(states.at(-1),{saving:false,error:'disk unavailable'});
  const retry=owner.submit('Menlo','');assert.equal(calls.length,2);calls[1].resolve();await retry;
});
test('pristine/confirmed no-op, raw whitespace and empty reset are preserved', async () => {
  const {owner,calls}=fixture();assert.equal(await owner.submit('',''),true);assert.equal(calls.length,0);
  const a=owner.submit(' Menlo ','');assert.equal(calls[0].value,' Menlo ');calls[0].resolve();await a;
  await owner.submit(' Menlo ',' Menlo ');assert.equal(calls.length,1);
  const b=owner.submit('',' Menlo ');assert.equal(calls[1].value,'');calls[1].resolve();await b;
});
test('synchronous save errors are handled and Enter-equivalent retry succeeds', async () => {
  let count=0;const states=[];const owner=createImmediateTextSave({validate(){},save(){if(!count++)throw Error('write failed');},onState:s=>states.push(s)});
  assert.equal(await owner.submit('Mono',''),false);assert.equal(states.at(-1).error,'write failed');
  assert.equal(await owner.submit('Mono',''),true);assert.equal(count,2);assert.equal(states.at(-1).error,'');
});
test('disposal fences feedback and new writes while consuming rejected outstanding promises', async () => {
  const {owner,calls,states}=fixture();const a=owner.submit('Menlo','');owner.dispose();const length=states.length;
  calls[0].reject(Error('late'));assert.equal(await a,false);assert.equal(await owner.submit('Mono',''),false);
  assert.equal(states.length,length);assert.equal(calls.length,1);
});
