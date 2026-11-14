import test from 'node:test';
import assert from 'node:assert/strict';
import {createFileTreeSelection,selectFileRange,selectAllFiles} from '../src/file-tree-selection.mjs';
import {stageFiles} from '../src/composer-attachments-model.mjs';
import {multiFileContextMenu} from '../src/file-context-menu-model.mjs';
test('original selection store handles ranges, anchor toggles, visual reorder and retaining only visible rows',()=>{
 const store=createFileTreeSelection(),entries=['folder','folder/a.txt','folder/b.txt','last.txt'].map(absPath=>({absPath}));
 const nav={count:entries.length,entryAt:i=>entries[i],indexOfKey:key=>entries.findIndex(e=>e.absPath===key)};
 let calls=0;const off=store.subscribe(()=>calls++);
 store.getState().selectOnly(entries[1]);selectFileRange(store,nav,3,1);assert.deepEqual([...store.getState().selected.keys()],entries.slice(1).map(e=>e.absPath));
 store.getState().toggle(entries[2]);assert.equal(store.getState().anchor,'folder/b.txt');
 selectFileRange(store,nav,0,0);assert.deepEqual([...store.getState().selected.keys()],entries.slice(0,3).map(e=>e.absPath));
 store.getState().clear();store.getState().toggle(entries[3]);store.getState().toggle(entries[0]);store.getState().reorder(nav.indexOfKey);
 assert.deepEqual([...store.getState().selected.keys()],['folder','last.txt']);
 selectAllFiles(store,nav);assert.equal(store.getState().selected.size,4);
 store.getState().retain(key=>!key.startsWith('folder/'));assert.deepEqual([...store.getState().selected.keys()],['folder','last.txt']);
 const before=calls;store.getState().retain(()=>true);assert.equal(calls,before);off();store.getState().clear();assert.equal(calls,before);
});
test('directories retain folder identity in batch attachments and stay eligible for external editors',()=>{
 const staged=stageFiles([],[{name:'folder.png',path:'/repo/folder.png',isDirectory:true},{name:'a.txt',path:'/repo/a.txt'}]);
 assert.equal(staged.entries.length,2);assert.equal(staged.entries[0].kind,'file');assert.equal(staged.entries[0].isDirectory,true);
 const menu=multiFileContextMenu({root:'/repo',paths:['folder.png','a.txt'],directories:['folder.png'],canAttach:true,editors:[{type:'vscode',name:'VS Code'}]});
 assert.deepEqual(menu[0].directories,['/repo/folder.png']);assert.deepEqual(menu.at(-1).items[0].paths,['/repo/folder.png','/repo/a.txt']);
});
