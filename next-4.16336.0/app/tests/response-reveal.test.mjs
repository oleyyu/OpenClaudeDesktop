import test from 'node:test';
import assert from 'node:assert/strict';
import { createResponseRevealLedger, responseWords, decorateResponseReveal, responseLinkRevealLength, RESPONSE_FADE_MS, RESPONSE_SETTLE_MS } from '../src/response-reveal-model.mjs';
import { createResponseRevealAnimations } from '../src/response-reveal-animation.mjs';
const text=value=>({type:'text',value}),el=(tagName,...children)=>({type:'element',tagName,properties:{},children});
const plain=node=>node.type==='text'?node.value:(node.children||[]).map(plain).join('');
const link=(href,...children)=>({...el('a',...children),properties:{href}});
function fixture(initial='') { let time=0;const ledger=createResponseRevealLedger(initial,()=>time);return {ledger,at:t=>time=t}; }
test('word scheduling groups 16 chars in one render and 48 in later render with source timing',()=>{
 const {ledger,at}=fixture();ledger.begin('Hello world ');
 const first=ledger.reveal('p:0',6),second=ledger.reveal('p:6',6);
 assert.equal(first,second);assert.equal(first.startsAt,15);assert.equal(first.endsAt,215);
 const next=ledger.reveal('p:12',7);assert.notEqual(next,first);assert.equal(next.startsAt,48);
 at(30);ledger.begin('Hello world again text ');assert.equal(ledger.reveal('p:12',7),next);
 assert.equal(ledger.reveal('p:19',20),next);assert.equal(next.endsAt,278);
 assert.equal(RESPONSE_FADE_MS,200);assert.equal(RESPONSE_SETTLE_MS,1000);
});
test('scheduled lag is capped at 600ms, even for large bursts',()=>{
 const {ledger}=fixture();ledger.begin('burst');
 for(let i=0;i<1000;i++)assert.ok(ledger.reveal(String(i),17).startsAt<=600);
 assert.equal(ledger.reveal('tail',1000).startsAt,600);
});
test('100ms whitespace boundary closes a chunk, settles old text only after end time',()=>{
 const {ledger,at}=fixture();ledger.begin('one ');const a=ledger.reveal('a',4);
 at(99);ledger.begin('one two ');assert.equal(ledger.reveal('b',4),a);
 at(120);ledger.begin('one two three ');const b=ledger.reveal('c',6);assert.notEqual(a,b);assert.equal(ledger.settled(a),false);
 at(500);ledger.begin('one two three four');assert.equal(ledger.settled(a),true);assert.equal(ledger.settled(b),true);
});
test('non-prefix replacement settles old keys without restarting old entries',()=>{
 const {ledger,at}=fixture();ledger.begin('original');const old=ledger.reveal('same',8);
 at(30);ledger.begin('edited');assert.equal(ledger.settled(old),true);assert.equal(ledger.reveal('same',6),old);
 const added=ledger.reveal('new',4);assert.equal(added.done,false);ledger.finish();assert.equal(added.done,true);
});
test('only initial streams over 400 characters are primed; subsequent appends reveal',()=>{
 for(const length of [400,401]) {
  const initial='x'.repeat(length),{ledger}=fixture(initial);ledger.begin(initial);assert.equal(ledger.reveal('old',length).done,length>400);
  ledger.begin(initial+' new');assert.equal(ledger.reveal('new',4).done,false);
 }
});
test('word splitting preserves whitespace, CRLF, emoji and CJK without splitting UTF-16 pairs',()=>{
 for(const value of ['  hello world\t\r\n','中文没有空格 👩🏽‍💻 字符','a\u00a0b\u2028c','<script>&"'])assert.equal(responseWords(value).join(''),value);
 assert.deepEqual(responseWords(' \n\t'),[]);
});
test('decoration preserves actual link/code/checkbox nodes, fences and all visible text',()=>{
 const {ledger}=fixture();ledger.begin('sample');const link=el('a',el('code',text('src/app.ts'))),inline=el('code',text('x<y'));
 link.properties.href='file:///fixture/src/app.ts';const pre=el('pre',el('code',text('  const x = "<script>";\n'))),input=el('input');input.properties={type:'checkbox',checked:true,disabled:true};
 const tree={type:'root',children:[el('p',text('Hello '),el('strong',text('world ')),link,text(' '),inline),pre,el('ul',el('li',input,text(' A task')))]};
 const before=plain(tree);decorateResponseReveal(tree,ledger);assert.equal(plain(tree),before);
 const wrapped=tree.children[0].children;assert.equal(wrapped[2].children[0],link);assert.equal(wrapped[4].children[0],inline);
 assert.equal(tree.children[1],pre);assert.equal(pre.children[0].children[0].type,'text');assert.equal(tree.children[2].children[0].children[0],input);
 assert.equal(link.children[0].tagName,'code');assert.equal(link.children[0].children[0].value,'src/app.ts');
});
test('non-prefix Markdown formatting correction becomes visible immediately without flashing',()=>{
 const {ledger}=fixture();ledger.begin('Hello world');const first={type:'root',children:[el('p',text('Hello world'))]};decorateResponseReveal(first,ledger);
 const entry=first.children[0].children[0].data.responseReveal;
 ledger.begin('Hello **world**');const next={type:'root',children:[el('p',text('Hello '),el('strong',text('world')))]};decorateResponseReveal(next,ledger);
 assert.equal(entry.done,true);assert.equal(plain(next),'Hello world');
});
function motionFixture() {
 const root={dataset:{}},listeners=new Map(),animations=[];let mediaHandler,observed,disconnects=0,time=100;
 const media={matches:false,addEventListener:(_,fn)=>mediaHandler=fn,removeEventListener:()=>mediaHandler=null};
 const view={document:{documentElement:root},performance:{now:()=>time},matchMedia:()=>media,
  addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),
  MutationObserver:class{constructor(fn){observed=fn;}observe(){}disconnect(){disconnects++;}}};
 const doc={defaultView:view,timeline:{currentTime:1000}};
 const node=()=>({ownerDocument:doc,animate(frames,options){const animation={frames,options,canceled:false,cancel(){this.canceled=true;}};animations.push(animation);return animation;}});
 return {root,listeners,animations,media,node,at:t=>time=t,change:()=>mediaHandler?.(),mutate:()=>observed?.(),disconnects:()=>disconnects};
}
test('DOM adapter uses absolute original start, exact 200ms linear backwards and owned cancellation',()=>{
 const f=motionFixture(),owner=createResponseRevealAnimations(),entry={startsAt:150,done:false};
 const cleanup=owner.bind(f.node(),entry);assert.deepEqual(f.animations[0].options,{duration:200,easing:'linear',fill:'backwards'});assert.equal(f.animations[0].startTime,1050);
 cleanup();assert.equal(f.animations[0].canceled,true);
 f.at(220);owner.bind(f.node(),entry);assert.equal(f.animations[1].startTime,930);owner.dispose();assert.equal(f.animations[1].canceled,true);assert.equal(f.listeners.size,0);assert.equal(f.disconnects(),1);
});
test('OS/local reduced motion immediately reveals active text without later replay',()=>{
 for(const local of [true,false]) {
  const f=motionFixture(),owner=createResponseRevealAnimations(),entry={startsAt:150,done:false};owner.bind(f.node(),entry);
  if(local){f.root.dataset.localMotion='reduce';f.mutate();}else{f.media.matches=true;f.change();}
  assert.equal(f.animations[0].canceled,true);assert.equal(entry.done,true);f.media.matches=false;f.root.dataset.localMotion='system';owner.bind(f.node(),entry);assert.equal(f.animations.length,1);owner.dispose();
 }
});
test('expired entries never animate; disposed owners can bind safely in StrictMode replay',()=>{
 const f=motionFixture(),owner=createResponseRevealAnimations();owner.bind(f.node(),{startsAt:-200,done:false});assert.equal(f.animations.length,0);owner.dispose();
 owner.bind(f.node(),{startsAt:150,done:false});assert.equal(f.animations.length,1);owner.dispose();assert.equal(f.disconnects(),2);
});

test('settled text keeps its existing inline shell during further appends to preserve native selections',()=>{
 const {ledger,at}=fixture();ledger.begin('First words ');const first={type:'root',children:[el('p',text('First words '))]};decorateResponseReveal(first,ledger);
 const original=first.children[0].children[0].data.responseReveal;
 at(500);ledger.begin('First words and more');const second={type:'root',children:[el('p',text('First words and more'))]};decorateResponseReveal(second,ledger);
 assert.equal(original.done,true);assert.equal(second.children[0].children[0].data.responseReveal,original);assert.equal(plain(second),'First words and more');
});

test('plain descriptive links remain atomic while formatted descriptions recurse',()=>{
 assert.equal(responseLinkRevealLength(link('https://example.test',text('Read the documentation'))),22);
 assert.equal(responseLinkRevealLength(link('https://example.test',el('strong',text('Read')),text(' the documentation'))),null);
 assert.equal(responseLinkRevealLength(link('./app.ts',text('Read the '),el('em',text('source file')))),null);
 assert.equal(responseLinkRevealLength(link('https://example.test',el('code',text('app.ts')))),null);
});

test('simple formatted file labels schedule their destination, excluding nested or unsupported formatting',()=>{
 const href='file:///fixture/long%20folder/app.ts#L12-L16';
 for(const tag of ['strong','em','code'])assert.equal(responseLinkRevealLength(link(href,el(tag,text('app.ts')))),decodeURI(href).length);
 assert.equal(responseLinkRevealLength(link(href,text('app.ts'))),6);
 assert.equal(responseLinkRevealLength(link(href,el('strong',el('em',text('app.ts'))))),null);
 assert.equal(responseLinkRevealLength(link(href,el('del',text('app.ts')))),null);
 assert.equal(responseLinkRevealLength(link(href,el('strong',text('two words')))),null);
 assert.equal(responseLinkRevealLength(link('file:///fixture/%xx.ts',el('code',text('a.ts')))),22);
 for(const unsafe of ['javascript:alert(1)','data:text/html,x','//server/share','#fragment'])assert.equal(responseLinkRevealLength(link(unsafe,el('strong',text('label')))),null);
});

test('formatted link words share semantic offsets with surrounding text without wrapping the anchor',()=>{
 const calls=[],ledger={reveal:(key,length)=>{calls.push([key,length]);return {};},settled:()=>false};
 const anchor=link('https://example.test',text('Read '),el('strong',text('the detailed ')),el('em',text('guide now')));
 const tree={type:'root',children:[el('p',text('See '),anchor,text(' next'))]};const before=plain(tree);
 decorateResponseReveal(tree,ledger,3);
 assert.equal(tree.children[0].children[1],anchor);assert.equal(anchor.children[1].tagName,'strong');assert.equal(anchor.children[2].tagName,'em');
 assert.deepEqual(calls,[['message.r3.b0:0',4],['message.r3.b0:4',5],['message.r3.b0:9',4],['message.r3.b0:13',9],['message.r3.b0:22',6],['message.r3.b0:28',3],['message.r3.b0:31',5]]);
 assert.equal(plain(tree),before);
});

test('replacement file-label scheduling length never shifts the next semantic key',()=>{
 const calls=[],ledger={reveal:(key,length)=>{calls.push([key,length]);return {};},settled:()=>false};
 const href='file:///fixture/very-long-directory/app.ts',anchor=link(href,el('code',text('app.ts')));
 const tree={type:'root',children:[el('p',anchor,text(' after'))]};decorateResponseReveal(tree,ledger);
 assert.deepEqual(calls,[['message.b0:0',href.length],['message.b0:6',6]]);
 assert.equal(tree.children[0].children[0].children[0],anchor);assert.equal(anchor.children[0].children[0].type,'text');
});
