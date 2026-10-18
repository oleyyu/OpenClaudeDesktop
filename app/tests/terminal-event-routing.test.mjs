import test from 'node:test';
import assert from 'node:assert/strict';
import {terminalOwnsContextMenu as owns} from '../src/generated/code-current/terminal-mouse.mjs';
import {routeTerminalKey,installTerminalCopyEvent} from '../src/terminal-event-routing.mjs';
// 2.42304.0 c6bf19e8f Ur (R3-terminal FT-03) reads the platform itself: ae = shared-78 kw (Wa, the macOS user-agent
// test, generated as surface-chord-platform.mjs). The cases below pin the platform through window.navigator.userAgent.
const terminalOwnsContextMenu=(term,event,mac)=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:{navigator:{userAgent:mac?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Claude':'Mozilla/5.0 (X11; Linux x86_64) Claude'}},configurable:true,writable:true});
 try{return owns(term,event);}finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
};
const key=(props={})=>({type:'keydown',key:'c',code:'KeyC',preventDefault(){this.prevented=true;},...props});
test('mouse tracking owns right-click only inside terminal; mac Ctrl-click follows the same rule',()=>{
 const target={},term={element:{contains:node=>node===target},modes:{mouseTrackingMode:'vt200'},options:{macOptionClickForcesSelection:false}};
 assert.equal(terminalOwnsContextMenu(term,{button:2,target},true),true);
 assert.equal(terminalOwnsContextMenu(term,{button:0,ctrlKey:true,target},true),true);
 assert.equal(terminalOwnsContextMenu(term,{button:0,ctrlKey:true,target},false),false);
 assert.equal(terminalOwnsContextMenu(term,{button:0,target},true),false);
 assert.equal(terminalOwnsContextMenu(term,{button:2,target:{}},true),false);
 term.modes.mouseTrackingMode='none';assert.equal(terminalOwnsContextMenu(term,{button:2,target},true),false);
});
test('forced selection modifiers follow the original platform/options rules',()=>{
 const target={},term={element:{contains:()=>true},modes:{mouseTrackingMode:'any'},options:{macOptionClickForcesSelection:false}};
 assert.equal(terminalOwnsContextMenu(term,{button:2,target,shiftKey:true},false),false);
 assert.equal(terminalOwnsContextMenu(term,{button:2,target,shiftKey:true},true),true);
 assert.equal(terminalOwnsContextMenu(term,{button:2,target,altKey:true},true),true);
 term.options.macOptionClickForcesSelection=true;
 assert.equal(terminalOwnsContextMenu(term,{button:2,target,altKey:true},true),false);
});
test('Ctrl+Tab/Shift+Tab bubble to the app; modifiers, keyup and IME retain terminal handling',()=>{
 for(const shiftKey of [false,true]){const event=key({key:'Tab',code:'Tab',ctrlKey:true,shiftKey});assert.equal(routeTerminalKey(event,{},()=>{}),'window');assert.equal(event.prevented,undefined);}
 for(const extra of [{metaKey:true},{altKey:true},{isComposing:true},{keyCode:229},{type:'keyup'}])assert.equal(routeTerminalKey(key({key:'Tab',code:'Tab',ctrlKey:true,...extra}),{},()=>{}),null);
});
test('copy captures normalized selection immediately, never sends Ctrl+C, and leaves no-selection shortcuts to xterm',async()=>{
 let text='[shell reconnected — replaying buffered output]\r\n  chosen\r\n\r\n';const copies=[],term={hasSelection:()=>!!text,getSelection:()=>text};
 for(const modifiers of [{metaKey:true},{ctrlKey:true,shiftKey:true}]){const event=key(modifiers);assert.equal(routeTerminalKey(event,term,value=>copies.push(value)),'copy');assert.equal(event.prevented,true);}
 text='later selection';await Promise.resolve();assert.deepEqual(copies,['  chosen','  chosen']);
 assert.equal(routeTerminalKey(key({ctrlKey:true}),term,()=>assert.fail()),null);
 text='';assert.equal(routeTerminalKey(key({ctrlKey:true,shiftKey:true}),term,()=>assert.fail()),null);
 text='x';routeTerminalKey(key({metaKey:true}),term,()=>Promise.reject(Error('clipboard unavailable')));await new Promise(resolve=>setImmediate(resolve));
});
test('native copy events use normalized output, leave empty selection alone and remove listener on dispose',()=>{
 let text='chosen\n\n';const term={hasSelection:()=>!!text,getSelection:()=>text},element=new EventTarget(),copies=[];
 const event=()=>{const e=new Event('copy');e.clipboardData={setData:(...args)=>copies.push(args)};return e;};
 const dispose=installTerminalCopyEvent(term,element);element.dispatchEvent(event());assert.deepEqual(copies,[['text/plain','chosen']]);
 text='';element.dispatchEvent(event());text='later';dispose();element.dispatchEvent(event());assert.equal(copies.length,1);
});
test('without a window (no user agent) Ur reads as not macOS',()=>{
 const target={},term={element:{contains:()=>true},modes:{mouseTrackingMode:'vt200'},options:{}};
 assert.equal(typeof globalThis.window,'undefined');
 assert.equal(owns(term,{button:0,ctrlKey:true,target}),false);
 assert.equal(owns(term,{button:2,target}),true);
});
