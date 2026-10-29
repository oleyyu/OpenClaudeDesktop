import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { linkDispatch, linkConfirmation, linkCapabilities, linkArrival } from '../src/generated/code-editor/preview-link-decisions.mjs';
import { canRoutePreviewLink, createPreviewLinkRouter, createPreviewChooserStore } from '../src/preview-link-routing.mjs';
import { previewLinkOrigin } from '../src/generated/code-editor/preview-link-origin.mjs';
// 3.6556.2 c11959232: If/Lf/Rf/zf (Lf reads paneOffered; Rf releases a cloud session whose infra is not ready).
const text = fs.readFileSync(new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c11959232-TLc_9Vpx.js', import.meta.url), 'utf8');
const nodes = parsers.babel.parse(text, {}).program.body;
const source = vm.runInNewContext(`(()=>{${['If','Lf','Rf','zf'].map(name => {const n=nodes.find(n=>n.id?.name===name);return text.slice(n.start,n.end);}).join('\n')};return {If,Lf,Rf,zf};})()`);
test('routing decisions match original for every boolean gate combination', () => {
  const keys=['hasPendingUrl','explicit','chooserOpen','chooserSeen','alreadyPrompted','settledAtUrlArrival','linksInPreview','infraOk','cloudSession'];
  for(let mask=0;mask<512;mask++){const state=Object.fromEntries(keys.map((key,i)=>[key,!!(mask&(1<<i))]));assert.equal(linkDispatch(state),source.Rf(state));}
  assert.equal(linkDispatch({hasPendingUrl:true,cloudSession:true,infraOk:false}),'release');
  assert.equal(linkDispatch({hasPendingUrl:true,infraOk:false}),'none');
  for(let mask=0;mask<8;mask++){const state={explicit:!!(mask&1),confirmed:!!(mask&2),inPreview:!!(mask&4)};assert.equal(linkConfirmation(state),source.zf(state));}
  for(let mask=0;mask<8;mask++){const state={linksInPreview:!!(mask&1),infraOk:!!(mask&2),paneOffered:!!(mask&4)};assert.equal(JSON.stringify(linkCapabilities(state)),JSON.stringify(source.Lf(state)));}
  assert.deepEqual(linkArrival({url:'a',settled:false,prompted:true},'b',true),{url:'b',settled:true,prompted:false});
});
function fixture(){let enabled=true,seen=false;const calls=[];const router=createPreviewLinkRouter({linksEnabled:()=>enabled,chooserSeen:()=>seen,
 openPreview:async(id,url)=>{calls.push(['preview',id,url]);return {opened:true};},reveal:id=>calls.push(['reveal',id]),openExternal:async url=>calls.push(['external',url])});router.setOwner('a');return {router,calls,choose:(value)=>{enabled=value;seen=true;router.confirm();return router.close();},setSeen:()=>{seen=true;}};}
test('first click cancels without opening or persists choice and routes the pending URL',async()=>{
 const h=fixture();h.router.request('https://example.com/a',null,true);assert.equal(h.router.getSnapshot().url,'https://example.com/a');h.router.close();assert.deepEqual(h.calls,[]);
 h.router.request('https://example.com/a',null,true);await h.choose(true);assert.deepEqual(h.calls,[['preview','a','https://example.com/a'],['reveal','a']]);
 await h.router.request('https://example.com/b',null,true);assert.equal(h.router.getSnapshot(),null);assert.equal(h.calls.length,4);
 const outside=fixture();outside.router.request('https://example.com',null,true);await outside.choose(false);assert.deepEqual(outside.calls,[['external','https://example.com']]);
 await outside.router.request('https://example.com/two',null,true);assert.equal(outside.calls.length,2);
});
test('system browser paths skip the chooser; external-only sites and credentials cannot enter preview',async()=>{
 for(const event of [{button:1},{metaKey:true},{ctrlKey:true},{altKey:true},{shiftKey:true}])assert.equal(canRoutePreviewLink('https://example.com',event),false);
 for(const url of ['https://chromewebstore.google.com/detail/a','https://chrome.google.com/webstore/a','file:///tmp/a.html','https://user:password@example.com','bad'])assert.equal(canRoutePreviewLink(url),false);
 assert.equal(canRoutePreviewLink('https://example.com'),true);const h=fixture();await h.router.request('https://example.com',{metaKey:true},true);assert.equal(h.router.getSnapshot(),null);assert.equal(h.calls[0][0],'external');
});
test('late native completion never reveals or opens external URLs for a departed session',async()=>{
 let resolve;const calls=[];const router=createPreviewLinkRouter({linksEnabled:()=>true,chooserSeen:()=>true,openPreview:()=>new Promise(r=>resolve=r),reveal:id=>calls.push(id),openExternal:url=>calls.push(url)});
 router.setOwner('a');const first=router.request('https://example.com',null,true);router.setOwner('b');resolve({opened:true});await first;assert.deepEqual(calls,[]);
 const second=router.request('https://example.com',null,true);router.dispose();resolve(null);await second;assert.deepEqual(calls,[]);
});
test('native refusal falls back externally, and original origins collapse www and IPv4-mapped IPv6',async()=>{
 const calls=[];const router=createPreviewLinkRouter({linksEnabled:()=>true,chooserSeen:()=>true,openPreview:async()=>({opened:false}),reveal:()=>assert.fail(),openExternal:url=>calls.push(url)});router.setOwner('a');await router.request('https://example.com',null,true);assert.deepEqual(calls,['https://example.com']);
 assert.equal(previewLinkOrigin('https://www.example.com/path'),previewLinkOrigin('https://example.com/other'));assert.equal(previewLinkOrigin('http://[::ffff:127.0.0.1]:123/a'),'http://127.0.0.1:123');
});
test('chooser preference survives reconnect and rolls back a failed save',async()=>{
 const store=createPreviewChooserStore(),saved=[];store.connect(false,async value=>saved.push(value));await store.set(true);assert.equal(store.getSnapshot(),true);assert.deepEqual(saved,[true]);store.connect(true,()=>Promise.reject(Error('save failed')));await assert.rejects(store.set(false));assert.equal(store.getSnapshot(),true);
});
