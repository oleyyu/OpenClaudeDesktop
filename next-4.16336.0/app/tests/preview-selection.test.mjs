import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewSelection } from '../electron/preview-selection.mjs';
import { createPreviewElementInspector } from '../electron/generated/preview-element-inspector.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(capture=async id=>({tagName:'button',id})) {
 const states=[],selected=[],operations=[],errors=[];let current=true;
 const inspector={inspectModeCallback:null,async enableInspectMode(callback){operations.push('enable');this.inspectModeCallback=callback;},async disableInspectMode(){operations.push('disable');this.inspectModeCallback=null;},captureElementContext:capture};
 const selection=createPreviewSelection({inspector,isCurrent:()=>current,onState:state=>states.push(state),onSelected:item=>selected.push(item),onError:error=>errors.push(error)});
 return {inspector,selection,states,selected,operations,errors,invalidate:()=>{current=false;}};
}
test('selection delivers one captured element and leaves inspect mode',async()=>{
 const h=harness();await h.selection.setEnabled(true);const callback=h.inspector.inspectModeCallback;callback(3);callback(4);await h.selection.whenIdle();
 assert.deepEqual(h.selected,[{tagName:'button',id:3}]);assert.deepEqual(h.states.at(-1),{enabled:false,busy:false});assert.deepEqual(h.operations,['enable','disable']);
});
test('cancel during capture discards stale context and a later enable remains armed',async()=>{
 const capture=deferred(),h=harness(()=>capture.promise);await h.selection.setEnabled(true);h.inspector.inspectModeCallback(3);await Promise.resolve();await Promise.resolve();
 const cancel=h.selection.setEnabled(false),enable=h.selection.setEnabled(true);capture.resolve({tagName:'stale'});await cancel;await enable;await h.selection.whenIdle();
 assert.deepEqual(h.selected,[]);assert.deepEqual(h.states.at(-1),{enabled:true,busy:false});assert.equal(typeof h.inspector.inspectModeCallback,'function');
});
test('lost ownership/disposal invalidates in-flight capture; null context rearms',async()=>{
 for(const mode of ['ownership','dispose']){const capture=deferred(),h=harness(()=>capture.promise);await h.selection.setEnabled(true);h.inspector.inspectModeCallback(3);await Promise.resolve();await Promise.resolve();if(mode==='ownership')h.invalidate();else void h.selection.dispose();capture.resolve({tagName:'stale'});await h.selection.whenIdle();assert.deepEqual(h.selected,[]);}
 const h=harness(async()=>null);await h.selection.setEnabled(true);h.inspector.inspectModeCallback(3);await h.selection.whenIdle();assert.deepEqual(h.operations,['enable','disable','enable']);assert.equal(h.states.at(-1).busy,false);
});
test('original inspector uses native Overlay colors and clears all inspection domains',async()=>{
 const calls=[];const inspector=createPreviewElementInspector({webContents:{isDestroyed:()=>false,debugger:{isAttached:()=>true}},ensureAttached(){},sendCommand:async(method,params)=>{calls.push([method,params]);return{};}});
 await inspector.enableInspectMode(()=>{});assert.deepEqual(calls.map(c=>c[0]),['DOM.enable','Overlay.enable','Overlay.setInspectMode']);assert.equal(calls[2][1].mode,'searchForNode');assert.deepEqual(calls[2][1].highlightConfig.contentColor,{r:111,g:168,b:220,a:.66});
 await inspector.disableInspectMode();assert.equal(inspector.inspectModeCallback,null);assert.deepEqual(calls.slice(3).map(c=>c[0]),['Overlay.hideHighlight','Overlay.setInspectMode','Overlay.disable','DOM.disable']);
});
test('original context capture gathers DOM/styles, bounds and padded screenshot and releases its object group',async()=>{
 const calls=[];let screenshotBox;const image={getSize:()=>({width:300,height:200}),toPNG:()=>Buffer.from('png')};
 const inspector=createPreviewElementInspector({webContents:{isDestroyed:()=>false,debugger:{isAttached:()=>true},capturePage:async box=>{screenshotBox=box;return image;}},ensureAttached(){},sendCommand:async(method,params)=>{
  calls.push([method,params]);
  if(method==='DOM.describeNode')return{node:{nodeName:'BUTTON',attributes:['id','save','class','primary wide','aria-label','Save']}};
  if(method==='DOM.pushNodesByBackendIdsToFrontend')return{nodeIds:[1]};
  if(method==='CSS.getComputedStyleForNode')return{computedStyle:[{name:'color',value:'rgb(1, 2, 3)'},...['top','right','bottom','left'].map(side=>({name:`padding-${side}`,value:'8px'}))]};
  if(method==='DOM.getBoxModel')return{model:{content:[10,20,110,20,110,60,10,60]}};
  if(method==='DOM.resolveNode')return{object:{objectId:'node'}};
  if(method==='Runtime.evaluate')return{result:{value:JSON.stringify({x:0,y:0,width:800,height:600})}};
  if(method==='Runtime.callFunctionOn'){
   new Function('return ('+params.functionDeclaration+')');
   if(params.arguments)return{result:{value:null}};
   return{result:{value:params.functionDeclaration.includes('this.innerText')?'Save':params.functionDeclaration.includes('const parts')?'main > form':{outer:'<button>Save</button>',sibling:'<button>Save</button>'}}};
  }
  return{};
 }});
 const context=await inspector.captureElementContext(42);assert.equal(context.tagName,'button');assert.equal(context.id,'save');assert.deepEqual(context.classes,['primary','wide']);assert.equal(context.computedStyles.padding,'8px');assert.equal(context.innerText,'Save');assert.equal(context.parentPath,'main > form');assert.equal(context.outerHTML,'<button>Save</button>');assert.equal(context.screenshot,Buffer.from('png').toString('base64'));assert.deepEqual(screenshotBox,{x:0,y:0,width:260,height:200});
 assert.ok(calls.some(c=>c[0]==='Runtime.releaseObjectGroup'));assert.deepEqual(calls.slice(-2).map(c=>c[0]),['CSS.disable','DOM.disable']);
});
