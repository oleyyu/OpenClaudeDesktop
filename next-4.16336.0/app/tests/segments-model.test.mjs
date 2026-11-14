import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentGeometry,nextSegment,cssDuration} from '../src/segments-model.mjs';

test('segment geometry removes modal scaling while aligning each physical edge independently',()=>{
 assert.deepEqual(segmentGeometry({left:100,width:300},{left:160.2,width:79.6},300,2),{left:60,width:80});
 assert.deepEqual(segmentGeometry({left:100,width:150},{left:130,width:40},300,2),{left:60,width:80});
 assert.equal(segmentGeometry({left:0,width:0},{left:0,width:10},300),null);
 assert.equal(segmentGeometry({left:0,width:300},null,300),null);
 assert.equal(segmentGeometry({left:0,width:300},{left:0,width:0},300),null);
});
test('radio navigation wraps enabled values, reverses horizontal RTL keys, and remains reachable for unknown values',()=>{
 const options=[{value:'s'},{value:'m',disabled:true},{value:'l'}];
 assert.equal(nextSegment(options,'s','ArrowRight'),'l');assert.equal(nextSegment(options,'l','ArrowRight'),'s');
 assert.equal(nextSegment([{value:'s'},{value:'m'},{value:'l'}],'m','ArrowRight',true),'s');
 assert.equal(nextSegment(options,'l','Home'),'s');assert.equal(nextSegment(options,'s','End'),'l');
 assert.equal(nextSegment(options,'unknown','ArrowLeft'),'l');assert.equal(nextSegment(options,'unknown','ArrowDown'),'s');
 assert.equal(nextSegment(options,'s','Enter'),null);assert.equal(nextSegment([{value:0,disabled:true}],0,'Home'),null);
});
test('motion timing consumes only real CSS seconds/milliseconds and never treats unitless values as milliseconds',()=>{
 assert.equal(cssDuration(' 180ms '),180);assert.equal(cssDuration('.2s'),200);assert.equal(cssDuration('0s'),0);
 for(const value of ['auto','180','-2s','Infinityms','NaNs'])assert.equal(cssDuration(value),0);
});
