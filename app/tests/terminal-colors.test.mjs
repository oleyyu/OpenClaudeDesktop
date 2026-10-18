import test from 'node:test';
import assert from 'node:assert/strict';
// 2.42304.0 c6bf19e8f Mn..Fn (generated/code-current, R3-terminal FT-03; identical to the 2.31226.0 Tn..On).
import {installTerminalColorPolicy} from '../src/generated/code-current/terminal-colors.mjs';
const fixture=()=>{const handlers=new Map(),disposed=[];const policy=installTerminalColorPolicy({parser:{registerOscHandler:(code,fn)=>{handlers.set(code,fn);return{dispose:()=>disposed.push(code)};}}});return {handlers,disposed,policy};};
test('original policy protects palette, foreground/background/cursor and their reset codes',()=>{
 const {handlers}=fixture();assert.deepEqual([...handlers.keys()],[4,10,11,12,104,110,111,112]);
 for(const code of [10,11,12])for(const value of ['#ff0000','rgb:ffff/0000/0000','?;#ffffff',''])assert.equal(handlers.get(code)(value),true);
 assert.equal(handlers.get(4)('1;#ff0000'),true);assert.equal(handlers.get(4)('1;?;2;#ffffff'),true);
 for(const code of [104,110,111,112]){assert.equal(handlers.get(code)(''),true);assert.equal(handlers.get(code)('1'),true);}
});
test('queries pass through to xterm, mixed or malformed color writes remain consumed',()=>{
 const {handlers}=fixture();
 for(const value of ['1;?','1;?;2;?'])assert.equal(handlers.get(4)(value),false);
 for(const value of ['1','1;?;2','1;?;2;rgb:ffff/0000/0000'])assert.equal(handlers.get(4)(value),true);
 for(const code of [10,11,12])for(const value of ['?','?;?'])assert.equal(handlers.get(code)(value),false);
});
test('disposing the view removes every OSC policy handler',()=>{const {handlers,disposed,policy}=fixture();policy.dispose();assert.deepEqual(disposed,[...handlers.keys()]);});
