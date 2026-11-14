import test from 'node:test';import assert from 'node:assert/strict';
import {TERMINAL_VIEW_KEYS,normalizeTerminalView,createTerminalViewSettings,terminalViewMenu,terminalViewOptions} from '../src/terminal-view-settings.mjs';
import {terminalSelectionText,installTerminalCopyOnSelect} from '../src/terminal-copy-selection.mjs';
// W14-code r4 closeout R4DC-N7: the test-only DEFAULT_TERMINAL_VIEW export is gone; the source defaults.
const DEFAULT_TERMINAL_VIEW={cursorStyle:'block',cursorBlink:true,copyOnSelect:false,scrollback:10000};
test('source defaults, allowed values and boolean normalization',()=>{
 assert.deepEqual(normalizeTerminalView(),DEFAULT_TERMINAL_VIEW);
 assert.deepEqual(normalizeTerminalView({cursorStyle:'beam',cursorBlink:0,copyOnSelect:1,scrollback:50000}),DEFAULT_TERMINAL_VIEW);
 assert.deepEqual(normalizeTerminalView({cursorStyle:'bar',cursorBlink:false,copyOnSelect:true,scrollback:1000}),{cursorStyle:'bar',cursorBlink:false,copyOnSelect:true,scrollback:1000});
 assert.equal(terminalViewOptions(DEFAULT_TERMINAL_VIEW,true).cursorBlink,false);
 assert.equal(terminalViewOptions({...DEFAULT_TERMINAL_VIEW,cursorBlink:false},false).cursorBlink,false);
});
test('preferences persist, broadcast external changes and use the exact original menu order',()=>{
 const map=new Map();let external;const storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
 const store=createTerminalViewSettings({storage,subscribeStorage:fn=>{external=fn;return()=>{};}});let updates=0;store.subscribe(()=>updates++);
 store.set('cursorStyle','underline');store.set('scrollback',5000);store.set('scrollback',5000);assert.equal(updates,2);
 assert.deepEqual(createTerminalViewSettings({storage}).getSnapshot(),store.getSnapshot());
 map.set(TERMINAL_VIEW_KEYS.copyOnSelect,'true');external({key:TERMINAL_VIEW_KEYS.copyOnSelect,storageArea:storage});assert.equal(store.getSnapshot().copyOnSelect,true);
 const menu=terminalViewMenu(store.getSnapshot(),store.set)[0].items;
 assert.deepEqual(menu.map(x=>x.label),['Cursor style','Blink cursor','Copy on select','Scrollback']);
 assert.deepEqual(menu[0].items.map(x=>x.label),['Block','Bar','Underline']);
 assert.deepEqual(menu[3].items.map(x=>x.label),['1,000 lines','5,000 lines','10,000 lines']);
 assert.ok(menu[1].keepOpen&&menu[2].keepOpen);menu[1].onSelect();assert.equal(store.getSnapshot().cursorBlink,false);
 // 3.6556.2 cccc2cf0a QP: Blink cursor is disabled with its reason under reduced motion (its checked state is the setting).
 assert.equal(menu[1].disabled,false);
 const reduced=terminalViewMenu(store.getSnapshot(),store.set,true)[0].items[1];
 assert.equal(reduced.disabled,true);assert.equal(reduced.checked,false);
 assert.equal(reduced.disabledReason,'This isn’t available while reduced motion is on. To use it, turn off reduced motion in your system settings and set Motion to System in Settings → General.');
 map.set(TERMINAL_VIEW_KEYS.cursorStyle,'{');external({key:null});assert.equal(store.getSnapshot().cursorStyle,'block');store.dispose();
});
test('selection normalization removes only trailing empty rows and the replay banner',()=>{
 assert.equal(terminalSelectionText('hello  \r\n\r\n'),'hello  ');
 assert.equal(terminalSelectionText('  '),'  ');
 assert.equal(terminalSelectionText('[shell reconnected — replaying buffered output]\r\nhello\r\n'),'hello');
});
test('copy requires a live primary mouseup selection event; programmatic selection, right-click and disabled preference do not copy',async()=>{
 const doc=new EventTarget(),element=new EventTarget();element.ownerDocument=doc;let selectionChange,enabled=true,copies=[];
 const term={hasSelection:()=>true,getSelection:()=> 'selected\n',onSelectionChange:fn=>{selectionChange=fn;return{dispose(){selectionChange=null;}};}};
 const off=installTerminalCopyOnSelect(term,element,{enabled:()=>enabled,writeText:text=>copies.push(text),mac:true});
 const down=(button=0,ctrlKey=false)=>{const e=new Event('mousedown');Object.assign(e,{button,ctrlKey});element.dispatchEvent(e);};
 const up=()=>{const fire=()=>selectionChange();doc.addEventListener('mouseup',fire);const event=new Event('mouseup');Object.defineProperty(event,'eventPhase',{value:2,configurable:true});doc.dispatchEvent(event);Object.defineProperty(event,'eventPhase',{value:0});doc.removeEventListener('mouseup',fire);};
 selectionChange();down();up();await Promise.resolve();await Promise.resolve();assert.deepEqual(copies,['selected']);
 selectionChange();down(2);up();down(0,true);up();enabled=false;down();up();await Promise.resolve();assert.equal(copies.length,1);
 off();assert.equal(selectionChange,null);
});
