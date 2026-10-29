import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../src/slash-menu-layout.mjs';
const {slashMenuLayout,slashFilterFits}=layout;
test('slash floating menu uses actual width, no flip and the source size middleware budget',()=>{
 assert.deepEqual(slashMenuLayout({caret:{left:500,top:700},width:320,height:384,viewport:{width:800,height:800}}),{left:472,top:306,maxHeight:384});
 assert.deepEqual(slashMenuLayout({caret:{left:12,top:200},width:240,height:384,viewport:{width:390,height:800}}),{left:8,top:24,maxHeight:166});
});
test('3.6556.2: the description is the CDS Tooltip, so only the list geometry is computed here (c17e03edc d, W1)',()=>{
 // Base UI places the tooltip (side inline-end, align start, sideOffset 8, fallbackAxisSide "none") and its
 // data-[anchor-hidden]:invisible hides it with a clipped row; source-menu-r3.test.mjs checks those props.
 assert.deepEqual(Object.keys(layout).sort(),['slashFilterFits','slashMenuLayout']);
});
test('filter hint requires an end caret and the measured width plus the source8px breathing room',()=>{
 const p={start:1,end:1,length:1,caretLeft:20,parentRight:130,width:100};assert.equal(slashFilterFits(p),true);
 assert.equal(slashFilterFits({...p,parentRight:129}),false);assert.equal(slashFilterFits({...p,start:0}),false);assert.equal(slashFilterFits({...p,end:0}),false);
});
