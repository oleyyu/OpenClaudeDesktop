import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSeparators } from '../src/diff-separator-model.mjs';

const hunk = (oldStart, oldCount, newStart = oldStart, newCount = oldCount) => ({ oldStart, oldCount, newStart, newCount, header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@` });

test('partial patch gaps use exact old/new coordinates and never claim a tail length', () => {
  assert.deepEqual(diffSeparators([hunk(7,7),hunk(47,7)]), [
    {kind:'line-info',count:6,text:'6 unmodified lines',first:true},
    {kind:'line-info',count:33,text:'33 unmodified lines',first:false},
  ]);
});
test('adjacent hunks and files starting at line one have no metadata header', () => {
  assert.deepEqual(diffSeparators([hunk(1,3),hunk(4,2)]), [null,null]);
  assert.deepEqual(diffSeparators([hunk(0,0,1,8)]), [null]);
  assert.deepEqual(diffSeparators([hunk(1,8,0,0)]), [null]);
});
test('insertions/deletions account for anchor lines and accumulated side offsets', () => {
  assert.deepEqual(diffSeparators([hunk(5,0,6,2),hunk(10,2,12,2)]).map(value=>value.count), [5,4]);
  assert.deepEqual(diffSeparators([hunk(6,2,5,0),hunk(12,2,10,2)]).map(value=>value.count), [5,4]);
  assert.equal(diffSeparators([hunk(2,1)])[0].text, '1 unmodified line');
});
test('inconsistent ranges keep the original metadata instead of inventing unchanged lines', () => {
  for(const value of [hunk(10,3,20,3),hunk(-1,2),hunk(NaN,2)]) {
    assert.deepEqual(diffSeparators([value]), [{kind:'metadata',text:value.header,first:true}]);
  }
});
