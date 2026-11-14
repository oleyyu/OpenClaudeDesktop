import test from 'node:test';
import assert from 'node:assert/strict';
import { previewTabKeyCommand, previewDOMTabKey } from '../electron/preview-tab-shortcuts.mjs';
import { beginSyntheticInput, endSyntheticInput } from '../electron/generated/preview-tab-shortcuts.mjs';
const input=(key,extra={})=>({type:'keyDown',key,code:'',meta:true,control:false,shift:false,alt:false,...extra});
test('original preview reopen/select/cycle matchers preserve platform modifiers, layout-independent digits and repeat claims',()=>{
  assert.deepEqual(previewTabKeyCommand(input('T',{shift:true}),true),{action:'reopen-tab'});
  assert.deepEqual(previewTabKeyCommand(input('T',{shift:true,isAutoRepeat:true}),true),{action:'claim'});
  assert.deepEqual(previewTabKeyCommand(input('é',{code:'Digit2'}),true),{action:'select-tab',index:1});
  assert.deepEqual(previewTabKeyCommand(input('9',{code:'Digit9'}),true),{action:'select-tab',index:-1});
  assert.deepEqual(previewTabKeyCommand(input('9',{code:'Digit9',isAutoRepeat:true}),true),{action:'claim'});
  for(const extra of [{alt:true},{shift:true},{control:true},{type:'keyUp'},{isComposing:true}])assert.equal(previewTabKeyCommand(input('2',{code:'Digit2',...extra}),true),null);
  assert.equal(previewTabKeyCommand(input('t',{shift:true}),false),null);
  assert.deepEqual(previewTabKeyCommand(input('t',{meta:false,control:true,shift:true}),false),{action:'reopen-tab'});
  assert.deepEqual(previewTabKeyCommand(input('Tab',{meta:false,control:true}),true),{action:'cycle-tab',direction:1});
  assert.deepEqual(previewTabKeyCommand(input('Tab',{meta:false,control:true,shift:true}),true),{action:'cycle-tab',direction:-1});
  assert.equal(previewTabKeyCommand(input('PageDown',{meta:false,control:true}),true),null);
  assert.deepEqual(previewDOMTabKey({key:'t',code:'KeyT',metaKey:true,shiftKey:true},true),{action:'reopen-tab'});
  assert.equal(previewDOMTabKey({key:'t',metaKey:true,shiftKey:true,nativeEvent:{isComposing:true}},true),null);
});
test('original synthetic-input tokens claim host tab chords through overlapping dispatches and the tail window',()=>{
  const pending=new Map(),a=Symbol(),b=Symbol();let until=beginSyntheticInput(pending,a);until=beginSyntheticInput(pending,b);
  until=endSyntheticInput(pending,a,until);assert.equal(pending.size,1);assert.ok(until>Date.now());
  until=endSyntheticInput(pending,b,until);assert.equal(pending.size,0);assert.ok(until>=Date.now()+190);
  for(const event of [input('t',{shift:true}),input('1',{code:'Digit1'}),input('Tab',{meta:false,control:true})])assert.equal(previewTabKeyCommand({...event,syntheticSuppressed:true},true).action,'claim');
});
