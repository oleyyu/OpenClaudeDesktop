import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '../src/code-editor-core.mjs';
import {codeFoldingState as codeFolding,foldEffect} from '../src/code-editor-core.mjs';
import {lineRangeSelection,lineSelectionAnchor,selectionTooltipAnchor,selectionTooltipCoords} from '../src/generated/code-editor-current/wrapper.mjs';
test('original gutter selects whole lines in either direction and expands hidden folded lines',()=>{
 let state=EditorState.create({doc:'a\nb\nc\nd'});assert.deepEqual(lineRangeSelection(state,2,3).toJSON(),EditorSelection.single(2,6).toJSON());assert.deepEqual(lineRangeSelection(state,3,2).toJSON(),EditorSelection.single(6,2).toJSON());
 state=state.update({selection:lineRangeSelection(state,3,2)}).state;assert.equal(lineSelectionAnchor(state),3);
 state=EditorState.create({doc:'a {\n  b\n}\nx',extensions:[codeFolding()]});state=state.update({effects:foldEffect.of({from:3,to:9})}).state;
 assert.equal(lineRangeSelection(state,1,1).main.to,10);
});
test('selection chip chooses caret side and excludes a trailing newline',()=>{
 const forward=EditorState.create({doc:'first\nsecond\nthird',selection:{anchor:0,head:13}});assert.deepEqual(selectionTooltipAnchor(forward),{pos:12,above:false,far:0});
 const reverse=forward.update({selection:{anchor:13,head:0}}).state;assert.deepEqual(selectionTooltipAnchor(reverse),{pos:0,above:true,far:12});
});
test('selection chip uses the opposite selection edge when its preferred side is clipped',()=>{
 const space={top:0,bottom:100,left:0,right:200},head={left:20,right:21,top:80,bottom:95},far={left:0,right:1,top:40,bottom:55};
 assert.deepEqual(selectionTooltipCoords({head,far,space,chipHeight:20,above:false}),{left:20,right:21,top:40,bottom:100});
 assert.deepEqual(selectionTooltipCoords({head,far:null,space,chipHeight:20,above:false}),head);
});
