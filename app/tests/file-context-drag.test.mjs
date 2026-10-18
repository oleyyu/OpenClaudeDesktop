import test, { before, after } from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import { createServer } from 'vite';
// R3-files FT-18: the drag wrapper runs on the 2.42304.0 cd06fb298 originals (generated/files-changes), whose gate reads
// the GrowthBook adapter in source-files-changes-adapters.jsx, so the modules load through Vite SSR (one module graph:
// the wrapper and the generated module share one drag state, as in the app).
let server, Drag, Original, Pointer, Legacy;
before(async () => {
 server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
 Drag = await server.ssrLoadModule('/src/file-context-drag.mjs');
 Original = await server.ssrLoadModule('/src/generated/files-changes/file-context-drag.mjs');
 Pointer = await server.ssrLoadModule('/src/generated/files-changes/file-tree-pointer.mjs');
 Legacy = await server.ssrLoadModule('/src/generated/code-editor/file-context-drag.mjs');
});
after(() => server?.close());
const read = file => fs.readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8');
function drag(){const values=new Map(),handlers=new Map();return {dataTransfer:{get types(){return [...values.keys()]},setData:(key,value)=>values.set(key,value),getData:key=>values.get(key)},currentTarget:{addEventListener:(type,fn,options)=>handlers.set(type,{fn,options})},preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},handlers};}
test('original drag protocol uses an owner-scoped marker and consumes one attachment snapshot',()=>{
 const {startFileContextDrag,acceptsFileContextDrag,dropFileContextDrag,draggedFilePaths}=Drag;
 Original.clearFileContextDrag();const owner={},other={},event=drag();let attached=0;
 assert.equal(startFileContextDrag(event,owner,['/repo/a','/repo/b'],()=>attached++),true);
 assert.deepEqual(event.dataTransfer.types,['application/x-claude-file-context']);assert.equal(event.dataTransfer.getData(event.dataTransfer.types[0]),'1');assert.equal(event.dataTransfer.effectAllowed,'copy');
 assert.deepEqual(event.handlers.get('dragend').options,{once:true});
 assert.equal(acceptsFileContextDrag(event,other),false);assert.equal(dropFileContextDrag(event,other),false);assert.equal(attached,0);
 // The wrapper's draggedFilePaths is the generated module's (one state), which the terminal pane reads.
 assert.equal(draggedFilePaths,Original.draggedFilePaths);
 assert.deepEqual(Original.draggedFilePaths(owner),['/repo/a','/repo/b']);assert.equal(dropFileContextDrag(event,owner),true);assert.equal(attached,1);assert.equal(event.stopped,true);assert.equal(dropFileContextDrag(event,owner),false);
 const cancelled=drag();startFileContextDrag(cancelled,owner,['/repo/c'],()=>attached++);cancelled.handlers.get('dragend').fn();assert.equal(acceptsFileContextDrag(cancelled,owner),false);
 const forged=drag();forged.dataTransfer.setData('application/x-claude-file-context','1');assert.equal(acceptsFileContextDrag(forged,owner),false);
 for(const paths of [[],Array(101).fill('/repo/a')]){const refused=drag();assert.equal(startFileContextDrag(refused,owner,paths,()=>attached++),false);assert.equal(refused.prevented,true);}
 // The old 2.31226.0 instance holds nothing: no consumer begins a drag there any more.
 assert.equal(Legacy.draggedFilePaths(owner),undefined);
});
test('2.42304.0 gate d: a coarse pointer (touch, no hover) refuses the drag; the rollout keeps its default without GrowthBook',()=>{
 const saved=globalThis.window;
 try{
  globalThis.window={matchMedia:query=>({matches:query==='(pointer: coarse), (hover: none)'})};
  assert.equal(Original.fileContextDragEnabled(),false);
  const refused=drag();assert.equal(Drag.startFileContextDrag(refused,{},['/repo/a'],()=>{}),false);assert.equal(refused.prevented,true);assert.deepEqual(refused.dataTransfer.types,[]);
  globalThis.window={matchMedia:()=>({matches:false})};assert.equal(Original.fileContextDragEnabled(),true);
 }finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 assert.equal(Original.fileContextDragEnabled(),true,'no window: not coarse; growthBookValue undefined !== false');
});
test('original blank click rule excludes rows, nonprimary buttons and scrollbars, on the left in RTL (cccc2cf0a Ux/Wx/Gx)',()=>{
 const {isBlankTreePress,isBlankTreeTarget}=Pointer;
 let direction='ltr';
 const view={getComputedStyle:()=>({direction})};
 const tree={contains:()=>true,ownerDocument:{defaultView:view},getBoundingClientRect:()=>({left:10,top:20}),offsetWidth:115,clientWidth:100,offsetHeight:215,clientHeight:200,clientLeft:0,clientTop:0};
 const event={currentTarget:tree,target:{closest:()=>null},button:0,clientX:50,clientY:50};assert.equal(isBlankTreePress(event),true);assert.equal(isBlankTreeTarget(event),true);
 assert.equal(isBlankTreePress({...event,button:2}),false);assert.equal(isBlankTreePress({...event,clientX:112}),false);assert.equal(isBlankTreePress({...event,clientY:225}),false);
 assert.equal(isBlankTreePress({...event,target:{closest:()=>({})}}),false);
 direction='rtl';
 assert.equal(isBlankTreePress({...event,clientX:112}),true,'RTL: the scrollbar is on the left');assert.equal(isBlankTreePress({...event,clientX:9}),false);
});
test('every consumer reaches the drag through the wrapper; the Files tree reads the 2.42304.0 pointer rule',()=>{
 assert.match(read('src/file-context-drag.mjs'),/from '\.\/generated\/files-changes\/file-context-drag\.mjs';/);
 for(const file of fs.readdirSync(path.resolve(import.meta.dirname,'../src')).filter(name=>/\.(jsx?|mjs)$/.test(name)))
  assert.doesNotMatch(read(`src/${file}`),/generated\/code-editor\/(file-context-drag|file-tree-pointer|file-selection|file-content-results|file-editor-path)\.mjs/,file);
 assert.match(read('src/source-terminal-pane.jsx'),/import \{ acceptsFileContextDrag, draggedFilePaths \} from "\.\/file-context-drag\.mjs";/);
 assert.match(read('src/source-composer.jsx'),/from "\.\/file-context-drag\.mjs";/);
 assert.match(read('src/main.jsx'),/import \{startFileContextDrag\} from "\.\/file-context-drag\.mjs";/);
 assert.match(read('src/use-blank-tree-selection.jsx'),/from '\.\/generated\/files-changes\/file-tree-pointer\.mjs';/);
});
