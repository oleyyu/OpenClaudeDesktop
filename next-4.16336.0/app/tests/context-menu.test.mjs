import test from 'node:test';import assert from 'node:assert/strict';
import contextMenu from '../electron/context-menu.cjs';
const {contextMenuTemplate,externalLink}=contextMenu;
// _W (reference/current-2.2553.1/readable/electron-context-menu-excerpt.js:1) over Electron context-menu params.
const flags=(over={})=>({canUndo:false,canRedo:false,canCut:false,canCopy:false,canPaste:false,canDelete:false,canSelectAll:false,...over});
const params=(over={})=>({x:40,y:60,linkURL:'',srcURL:'',mediaType:'none',hasImageContents:false,isEditable:false,selectionText:'',misspelledWord:'',dictionarySuggestions:[],editFlags:flags(),...over});
const shape=items=>items.map(item=>item.type==='separator'?'---':item.label);

test('an editable field with a misspelling: suggestions, Learn Spelling, Undo/Redo, Cut/Copy/Paste from editFlags, Select All',()=>{
 const items=contextMenuTemplate(params({isEditable:true,misspelledWord:'teh',dictionarySuggestions:['the','tea'],selectionText:'teh',
  editFlags:flags({canUndo:true,canCut:true,canCopy:true,canPaste:true,canSelectAll:true})}));
 assert.deepEqual(shape(items),['the','tea','---','Learn Spelling','---','Look Up','---','Undo','Redo','---','Cut','Copy','Paste','---','Select All']);
 assert.deepEqual(items.slice(0,2).map(item=>[item.action,item.value]),[['replace','the'],['replace','tea']]);
 assert.deepEqual([items[3].action,items[3].value],['learn-spelling','teh']);
 assert.deepEqual(items.filter(item=>item.role).map(item=>[item.label,item.role,item.accelerator,item.enabled]),[
  ['Undo','undo','CmdOrCtrl+Z',true],['Redo','redo','CmdOrCtrl+Shift+Z',false],['Cut','cut','CmdOrCtrl+X',true],['Copy','copy','CmdOrCtrl+C',true],
  ['Paste','paste','CmdOrCtrl+V',true],['Select All','selectAll','CmdOrCtrl+A',undefined]]);
 assert.equal(items.some(item=>item.label==='Inspect Element'),false,'no Inspect Element without allowDevTools');
});

test('an editable field with nothing to undo skips Undo/Redo; Cut/Copy/Paste follow canCut/canCopy/canPaste',()=>{
 const items=contextMenuTemplate(params({isEditable:true,editFlags:flags({canPaste:true,canSelectAll:true})}));
 assert.deepEqual(shape(items),['Cut','Copy','Paste','---','Select All']);
 assert.deepEqual(items.slice(0,3).map(item=>item.enabled),[false,false,true]);
});

test('a read-only selection gives Look Up, Copy, Select All',()=>{
 const items=contextMenuTemplate(params({selectionText:'transcript words',editFlags:flags({canCopy:true,canSelectAll:true})}));
 assert.deepEqual(shape(items),['Look Up','---','Copy','---','Select All']);
 assert.deepEqual([items[0].action,items[2].role,items[2].enabled],['look-up','copy',true]);
});

test('_W always offers Copy outside a field (disabled without a selection)',()=>{
 assert.deepEqual(contextMenuTemplate(params()).map(item=>[item.label,item.role,item.enabled]),[['Copy','copy',false]]);
});

test('links: Open Link in Default Browser only for http(s) without credentials; Copy Link Address for any link',()=>{
 const https=contextMenuTemplate(params({linkURL:'https://example.invalid/docs',editFlags:flags({canSelectAll:true})}));
 assert.deepEqual(shape(https),['Open Link in Default Browser','Copy Link Address','---','Copy','---','Select All']);
 assert.deepEqual(https.slice(0,2).map(item=>[item.action,item.value]),[['open-link','https://example.invalid/docs'],['copy-text','https://example.invalid/docs']]);
 for(const url of ['javascript:alert(1)','file:///etc/hosts','https://user:pass@example.invalid/','not a url'])
  assert.deepEqual(shape(contextMenuTemplate(params({linkURL:url}))),['Copy Link Address','---','Copy'],url);
 assert.equal(externalLink('http://example.invalid'),true);
 assert.equal(externalLink('https://user@example.invalid'),false);
});

test('an image: Copy Image, and Copy Image Address with a srcURL',()=>{
 const items=contextMenuTemplate(params({hasImageContents:true,mediaType:'image',srcURL:'file:///tmp/fixture.png'}));
 assert.deepEqual(shape(items),['Copy Image','Copy Image Address','---','Copy']);
 assert.deepEqual(items.slice(0,2).map(item=>[item.action,item.value]),[['copy-image',undefined],['copy-text','file:///tmp/fixture.png']]);
 assert.deepEqual(shape(contextMenuTemplate(params({hasImageContents:true,mediaType:'image'}))),['Copy Image','---','Copy']);
});

test('Inspect Element comes last and only when dev tools are allowed',()=>{
 const items=contextMenuTemplate(params({editFlags:flags({canSelectAll:true})}),{allowDevTools:true});
 assert.deepEqual(shape(items),['Copy','---','Select All','---','Inspect Element']);
 assert.equal(items.at(-1).action,'inspect');
});

test('params without editFlags (no context) build no menu, so nothing pops up',()=>{
 for(const value of [undefined,null,{},{x:1,y:2},'params'])assert.deepEqual(contextMenuTemplate(value),[]);
});
