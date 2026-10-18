import test from 'node:test';import assert from 'node:assert/strict';
import {handleTerminalNavigation,terminalEditingKeys} from '../src/terminal-navigation.mjs';
import {terminalKeyAction} from '../src/terminal-pane-model.mjs';
import {installTerminalCommands} from '../src/generated/code-current/terminal-commands.mjs';
const key=(code,props={})=>({type:'keydown',key:code,code,preventDefault(){this.prevented=true;},...props});
test('normal-buffer navigation emits shell-specific sequences and scrolls to the prompt before every shell edit',()=>{
 const calls=[],term={buffer:{active:{type:'normal'}},scrollToTop:()=>calls.push('top'),scrollToBottom:()=>calls.push('bottom')},write=s=>calls.push(s);
 for(const [code,props] of [['Home',{metaKey:true}],['End',{metaKey:true}],['Backspace',{metaKey:true}],['ArrowLeft',{metaKey:true}],['ArrowRight',{altKey:true}]])assert.equal(handleTerminalNavigation(key(code,props),term,write),true);
 assert.deepEqual(calls,['top','bottom','bottom','\x15','bottom','\x01','bottom','\x1bf']);
 assert.equal(terminalEditingKeys('C:\\Windows\\pwsh.exe').lineStart,'\x1b[H');assert.equal(terminalEditingKeys('/bin/zsh').lineStart,'\x01');
 calls.length=0;assert.equal(handleTerminalNavigation(key('Backspace',{metaKey:true}),term,write,{shell:'C:/Windows/powershell.exe'}),true);assert.deepEqual(calls,['bottom','\x1b[1;5H']);
});
test('alternate applications, IME, extra modifiers and absent command markers keep their keys',()=>{
 const term={buffer:{active:{type:'alternate'}}};const write=()=>assert.fail('no input');
 for(const code of ['ArrowLeft','ArrowRight','Backspace','Home','End','ArrowUp'])assert.equal(handleTerminalNavigation(key(code,{metaKey:true}),term,write),false);
 assert.equal(terminalKeyAction(key('ArrowLeft',{metaKey:true}),{bufferType:'alternate'}),null);
 assert.equal(terminalKeyAction(key('ArrowRight',{altKey:true}),{bufferType:'alternate'}),null);
 term.buffer.active.type='normal';
 for(const props of [{metaKey:true,isComposing:true},{metaKey:true,ctrlKey:true},{metaKey:true,shiftKey:true},{metaKey:true,keyCode:229}])assert.equal(handleTerminalNavigation(key('Backspace',props),term,write),false);
 assert.equal(handleTerminalNavigation(key('ArrowUp',{metaKey:true}),term,write),false);
 assert.equal(handleTerminalNavigation({...key('Home',{metaKey:true}),type:'keyup'},term,write),false);
});
function fixture(){
 let osc,reset;const marks=[],nodes=[],calls=[];const active={type:'normal',baseY:0,cursorY:0,viewportY:0,getLine:()=>({isWrapped:false})};
 const term={rows:24,buffer:{active},options:{theme:{foreground:'#111',red:'#f00'}},parser:{registerOscHandler:(code,fn)=>{assert.equal(code,133);osc=fn;},registerEscHandler:(spec,fn)=>{assert.equal(spec.final,"c");reset=fn;}},
 registerMarker:offset=>{const callbacks=[];const m={line:active.baseY+active.cursorY+offset,isDisposed:false,onDispose:fn=>callbacks.push(fn),dispose(){if(this.isDisposed)return;this.isDisposed=true;callbacks.forEach(fn=>fn());}};marks.push(m);return m;},
 registerDecoration:()=>({onRender:fn=>{const node={style:{lineHeight:'16px'}};nodes.push(node);fn(node);}}),scrollToLine:line=>{calls.push(line);active.viewportY=line;},scrollToBottom:()=>calls.push('bottom')};
 const commands=installTerminalCommands(term);return {active,marks,nodes,calls,commands,reset:()=>reset(),emit:(s,y)=>{if(y!==undefined)active.cursorY=y;return osc(s);}};
}
test('original OSC markers show running/success/error states and navigate prompt boundaries',()=>{
 const f=fixture();assert.equal(f.commands.scrollToCommand('previous'),false);
 f.emit('A',2);f.emit('B',3);f.emit('C',4);assert.equal(f.nodes[0].style.border,'1px solid #111');f.emit('D;0');assert.equal(f.nodes[0].style.border,'');assert.equal(f.nodes[0].style.width,'5px');
 f.emit('A',9);f.emit('B',9);f.emit('C',10);f.emit('D;1');assert.equal(f.nodes[1].style.width,'3px');assert.equal(f.nodes[1].style.backgroundColor,'#f00');assert.equal(f.nodes[1].style.opacity,'1');
 f.active.viewportY=20;assert.equal(f.commands.scrollToCommand('previous'),true);assert.equal(f.active.viewportY,9);f.commands.scrollToCommand('previous');assert.equal(f.active.viewportY,2);f.commands.scrollToCommand('next');assert.equal(f.active.viewportY,9);f.commands.scrollToCommand('next');assert.equal(f.calls.at(-1),'bottom');
 for(const marker of f.marks)marker.dispose();assert.equal(f.commands.scrollToCommand('previous'),false);
});
test('original marker parser ignores alternate buffer output and malformed status never creates a failure decoration',()=>{
 const f=fixture();f.active.type='alternate';for(const s of ['A','B','C','D;1'])f.emit(s,1);assert.equal(f.nodes.length,0);
 f.active.type='normal';for(const s of ['A','B','C','D;not-a-code'])f.emit(s,2);assert.equal(f.nodes[0].style.backgroundColor,'#111');
});

test('terminal reset disposes every recorded command marker',()=>{
 const f=fixture();f.emit('A',2);f.emit('B',3);f.emit('C',4);f.emit('D;0');f.emit('A',9);f.emit('B',9);
 assert.equal(f.reset(),false);assert.equal(f.marks.every(mark=>mark.isDisposed),true);assert.equal(f.commands.scrollToCommand('previous'),false);
});
