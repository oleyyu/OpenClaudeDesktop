import test from 'node:test';
import assert from 'node:assert/strict';
import { selectOptions, selectHighlight } from '../src/select-model.mjs';
const items=[{value:'rose-dawn',label:'Rosé Pine Dawn'},{value:'github',label:'GitHub'},{value:'disabled',label:'Unavailable',disabled:true},{value:0,label:'Never'}];
test('source select filters real label/value substrings without case or diacritic differences',()=>{
  assert.deepEqual(selectOptions(items,'ROSE'),[items[0]]);assert.deepEqual(selectOptions(items,'dawn'),[items[0]]);
  assert.deepEqual(selectOptions(items,'hub'),[items[1]]);assert.deepEqual(selectOptions(items,'0'),[items[3]]);
  assert.deepEqual(selectOptions(items,'missing'),[]);assert.equal(selectOptions(items,'   '),items);
  assert.deepEqual(selectOptions(items,'Unavailable'),[items[2]],'disabled rows remain discoverable but unselectable');
});
test('list navigation skips disabled rows and wraps with exact first/last boundaries',()=>{
  assert.equal(selectHighlight(items,1,'ArrowDown'),3);assert.equal(selectHighlight(items,3,'ArrowDown'),0);
  assert.equal(selectHighlight(items,0,'ArrowUp'),3);assert.equal(selectHighlight(items,-1,'ArrowUp'),3);
  assert.equal(selectHighlight(items,2,'Home'),0);assert.equal(selectHighlight(items,0,'End'),3);
  assert.equal(selectHighlight(items,1,'Escape'),1);
});
test('empty and disabled-only filtered lists never yield an actionable index',()=>{
  for(const list of [[],[items[2]]])for(const key of ['Home','End','ArrowDown','ArrowUp'])assert.equal(selectHighlight(list,0,key),-1);
});
