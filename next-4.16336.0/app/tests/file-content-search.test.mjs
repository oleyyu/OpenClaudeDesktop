import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import module from '../electron/file-name-search.cjs';
import {contentResults,contentPreview} from '../src/file-content-results.mjs';
let sequence=0;
async function fixture(t,limits){const root=await fs.mkdtemp(path.join(os.tmpdir(),'content-search-'));const api=module.createFileNameSearch({limits});t.after(async()=>{await api.close();await fs.rm(root,{recursive:true,force:true});});return {root,api,file:async(name,text)=>{await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),text);},search:(query,options)=>api.search({root,scope:'content',requestId:`r${++sequence}`,mode:'content',query:'?'+query,options})};}
test('real worker searches unopened file contents, preserves line numbers and Unicode ranges',async t=>{
 const f=await fixture(t);await f.file('src/a.txt','unrelated\r\n  😀 Needle needlework\r\nNEEDLE\n');await f.file('b.txt','needle\n');
 const r=await f.search('needle');assert.equal(r.error,null);assert.equal(r.matches.length,3);
 const hit=r.matches.find(m=>m.path==='src/a.txt'&&m.line===2);assert.equal(hit.column,6);assert.deepEqual(hit.ranges,[[5,11],[12,18]]);
 assert.equal((await f.search('Needle',{matchCase:true})).matches.length,1);
 assert.equal((await f.search('needlework',{wholeWord:true})).matches.length,1);
 assert.equal((await f.search('needle',{matchCase:true,wholeWord:true})).matches.length,1);
 assert.equal((await f.search('^NEEDLE$',{regexp:true,matchCase:true})).matches[0].line,3);
 assert.equal((await f.search('[',{regexp:true})).error.code,'INVALID_PATTERN');
});
test('Git ignores, binaries and symlinks stay excluded from content reads',async t=>{
 const f=await fixture(t);await promisify(execFile)('git',['init','-q',f.root]);await f.file('.gitignore','ignored/\n');
 await f.file('inside.txt','needle');await f.file('ignored/a.txt','needle');await f.file('binary.bin',Buffer.from('needle\0secret'));
 const outside=await fs.mkdtemp(path.join(os.tmpdir(),'content-outside-'));t.after(()=>fs.rm(outside,{recursive:true,force:true}));await fs.writeFile(path.join(outside,'secret.txt'),'needle');await fs.symlink(path.join(outside,'secret.txt'),path.join(f.root,'external.txt'));
 const r=await f.search('needle');assert.equal(r.error,null);assert.deepEqual(r.matches.map(m=>m.path),['inside.txt']);
});
test('content limits report partial results; pathological regex is bounded by worker deadline',async t=>{
 const f=await fixture(t,{maxContentResults:2,maxContentFileBytes:1000});await f.file('a.txt','needle\nneedle\nneedle');await f.file('large.txt','needle'.repeat(200));
 const r=await f.search('needle');assert.equal(r.matches.length,2);assert.equal(r.truncated,true);assert.ok(r.truncationReasons.includes('result-limit'));
 await fs.rm(path.join(f.root,'a.txt'));const large=await f.search('needle');assert.ok(large.truncationReasons.includes('content-file-limit'));
 const slow=await fixture(t,{deadlineMs:500});await slow.file('a.txt','a'.repeat(900)+'!');const timed=await slow.search('(a+)+$',{regexp:true});assert.equal(timed.error.code,'TIMEOUT');
});
test('original grouping shows at most five hits per file and preserves snippet word boundaries',()=>{
 const matches=Array.from({length:8},(_,i)=>({path:'a.txt',line:i+1,column:3,name:'a.txt',preview:'  needle  here',ranges:[[2,8]]}));
 const grouped=contentResults(matches);assert.equal(grouped.shown,5);assert.equal(grouped.rows.length,6);assert.equal(grouped.rows.at(-1).more,true);
 const snippet=contentPreview(matches[0]);assert.equal(snippet.hit,'needle');assert.equal(snippet.tail,' here');assert.deepEqual(snippet.hitMatches,[{start:0,end:6}]);
});
