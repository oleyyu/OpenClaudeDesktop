import test from 'node:test';
import assert from 'node:assert/strict';
import {FILE_TAB_LABELS,tabDetail,tabRelativePath,insertFileTab,fileTabsToRight} from '../src/file-tab-menu-model.mjs';
// W14-code r4 closeout R4DC-N7: the test-only tabMenuItems / tabTooltip / moveFileTab exports are gone (the Files tab strip
// is the generated panes-tabs-current he / te / lt).
test('file tab labels',()=>{
 assert.equal(FILE_TAB_LABELS.closeTab,'Close file');assert.equal(FILE_TAB_LABELS.previewTabHint,'preview');
});
test('tab detail is the workspace-relative directory (panes-tile-current.js:6656-6668 ce)',()=>{
 assert.equal(tabDetail('src/a/b.ts'),'src/a');
 assert.equal(tabDetail('README.md'),undefined);
 assert.equal(tabDetail('/work/space/src/a/b.ts','/work/space'),'src/a');
 assert.equal(tabDetail('/work/space/README.md','/work/space/'),undefined);
 assert.equal(tabDetail('./nested/deep.txt','/work/space'),'nested');
 assert.equal(tabDetail('/a.txt','/elsewhere'),'/');
 assert.equal(tabDetail('/other/x/y.txt','/work/space'),'/other/x');
 assert.equal(tabRelativePath('/work/spacey/a.txt','/work/space'),'/work/spacey/a.txt');
});
test('overflow and reorder labels (panes-tile-current.js:6669-6710 le)',()=>{
 assert.equal(FILE_TAB_LABELS.moreTabs,'More files');
 assert.equal(FILE_TAB_LABELS.closeTabHint,'press right arrow to close');
 assert.equal(FILE_TAB_LABELS.moveTabHint,'Press Control+Shift+Left Arrow or Right Arrow to move the file');
});
test('insertFileTab follows F (panes-state-current.js:1596-1616)',()=>{
 const a={path:'a',preview:false,openSequence:1},P={path:'p',preview:true,openSequence:2},b={path:'b',preview:false,openSequence:3};
 const c={path:'c',preview:true,openSequence:4};
 assert.deepEqual(insertFileTab([a,P,b],c).map(t=>t.path),['a','c','b'],'a preview replaces the preview tab in its slot');
 const pinned={path:'c',preview:false,openSequence:4};
 assert.deepEqual(insertFileTab([a,P,b],pinned).map(t=>t.path),['a','p','b','c'],'a pinned open appends');
 const again={...b,preview:false,text:'x'};
 const same=insertFileTab([a,P,b],again);assert.deepEqual(same.map(t=>t.path),['a','p','b']);assert.equal(same[2],again,'the same path is replaced in place');
 const list=[a,P,b];assert.equal(insertFileTab(list,P),list,'the identical tab keeps the list');
 const eight=Array.from({length:8},(_,i)=>({path:`f${i}`,preview:false,openSequence:[5,3,9,1,7,2,8,6][i]}));
 const ninth={path:'n',preview:false,openSequence:10};
 assert.deepEqual(insertFileTab(eight,ninth).map(t=>t.path),['f0','f1','f2','f4','f5','f6','f7','n'],'the 9th open evicts the lowest openSequence (f3)');
 assert.deepEqual(insertFileTab(eight,ninth,'f3').map(t=>t.path),['f0','f1','f2','f3','f4','f6','f7','n'],'keepPath is never evicted (f5 next)');
 const restored=[{path:'r',preview:false},...eight.slice(1)];
 assert.deepEqual(insertFileTab(restored,ninth).map(t=>t.path)[0],'f1','a tab without openSequence (restored) goes first');
});
test('close-right follows the current tab order, hides at the last tab and ignores missing tabs',()=>{
 const tabs=['a','b','c'].map(path=>({path}));
 assert.deepEqual(fileTabsToRight(tabs,'b'),['c']);
 assert.deepEqual(fileTabsToRight([tabs[0],tabs[2],tabs[1]],'c'),['b']);
 assert.deepEqual(fileTabsToRight(tabs,'c'),[]);
 assert.deepEqual(fileTabsToRight(tabs,'missing'),[]);
});
