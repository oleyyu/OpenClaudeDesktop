import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {advanceResponseBlocks,remarkPriorDefinitions,remarkResponseBlockQuotes} from '../src/response-block-model.mjs';
import {createResponseRevealLedger,decorateResponseReveal} from '../src/response-reveal-model.mjs';
const feed=(text,step=1)=>{let state=null;for(let end=step;end<text.length;end+=step)state=advanceResponseBlocks(state,text.slice(0,end));return advanceResponseBlocks(state,text);};
const render=state=>state.blocks.map(block=>renderToStaticMarkup(React.createElement(Markdown,{remarkPlugins:[remarkGfm,[remarkPriorDefinitions,{definitions:block.definitions}],remarkResponseBlockQuotes],children:block.text}))).join('');
const semantic=state=>state.blocks.map(({text,type,start,definitions})=>({text:text.trimEnd(),type,start,definitions}));
test('incremental block state agrees across character, uneven and batched input for nested/ambiguous source',()=>{
 const samples=[
  'One\n\nTwo\n\nThree', 'One\n#word\n\n## Header\n\nText', 'One\n---\n\nTwo',
  '- one\n\n  continued\n  - nested\n\n- two\n\nDone\n', '> first\n>\n> last\n\nNext\n', '> first\n\n> second\n\nNext\n',
  '```ts\nconst n = 42;\n```\n\nTail', '    code\n\n    more\n\nText\n',
  '| A | B |\n| --- | --- |\n| 1 | 2 |\n\nEnd', '$$\nx^2\n$$\n\nEnd',
  '[x]: https://example.test\n\n[x]\n\n[^a]: note\n\nEnd',
  'Heading\r\n\r\nParagraph\r\n\r\n```js\r\nlet x;\r\n```\r\nTail',
 ];
 for(const text of samples)for(const step of [1,2,7,23])assert.deepEqual(semantic(feed(text,step)),semantic(advanceResponseBlocks(null,text)),JSON.stringify({text,step}));
});
test('committed blocks retain object identity and parse work excludes their source across long later growth',()=>{
 const history=Array.from({length:100},(_,i)=>`Paragraph ${i} with immutable content.\n\n`).join('');
 let state=advanceResponseBlocks(null,history),first=state.committed,objects=[...first];assert.equal(first.length,100);
 const before=state.totalParsedChars;
 for(let i=1;i<=80;i++){state=advanceResponseBlocks(state,history+'Tail '.repeat(i));assert.equal(state.committed,first);assert.deepEqual(state.blocks.slice(0,100),objects);assert.equal(state.parsedChars,'Tail '.repeat(i).length);}
 assert.equal(state.totalParsedChars-before,5*80*81/2);assert.equal(state.blocks.length,101);
});
test('partial following markers never prematurely freeze text that can remain a paragraph',()=>{
 let s=advanceResponseBlocks(null,'First\n#');assert.equal(s.committed.length,0);s=advanceResponseBlocks(s,'First\n#word');assert.equal(s.blocks.length,1);assert.equal(s.blocks[0].text,'First\n#word');
 s=advanceResponseBlocks(null,'Title\n-');assert.equal(s.committed.length,0);s=advanceResponseBlocks(s,'Title\n--');assert.equal(s.blocks[0].type,'heading');
 s=advanceResponseBlocks(null,'- one\n\n');assert.equal(s.committed.length,0);s=advanceResponseBlocks(s,'- one\n\n- two');assert.equal(s.blocks.length,1);assert.match(s.blocks[0].text,/- two/);
});
test('prior link definitions resolve without rendering metadata; later definitions never rewrite earlier blocks and first definition wins',()=>{
 const input='[first][x]\n\n[x]: https://example.test/one\n\n[second][x]\n\n[x]: https://example.test/two\n\n[third][x]';
 const batch=advanceResponseBlocks(null,input),stream=feed(input);assert.equal(render(batch),render(stream));const html=render(batch);assert.match(html,/<p>\[first\]\[x\]<\/p>/);assert.equal((html.match(/href="https:\/\/example.test\/one"/g)||[]).length,2);assert.doesNotMatch(html,/two|\[x\]:/);
});
test('rewrites reset stale committed content and definitions while stream completion finalizes only the visible frontier',()=>{
 let s=advanceResponseBlocks(null,'[x]: https://old.test\n\nFirst\n\nTail');const first=s.committed[0];s=advanceResponseBlocks(s,s.text,false);assert.equal(s.committed[0],first);assert.equal(s.blocks.at(-1).frontier,false);
 s=advanceResponseBlocks(s,'Replacement [x]',true);assert.equal(s.committed.length,0);assert.equal(s.definitions,'');assert.equal(s.blocks[0].frontier,true);assert.doesNotMatch(render(s),/old.test|First/);
 s=advanceResponseBlocks(s,'');assert.deepEqual(s.blocks,[]);
});
test('fence, table and duplicate block offsets remain distinct while closed lines are stable',()=>{
 const s=advanceResponseBlocks(null,'```js\nx\n```\n\n```js\nx\n```\n\n| a |\n|---|\n| b |\n\nlast');assert.deepEqual(s.blocks.map(x=>x.type),['code','code','table','paragraph']);assert.notEqual(s.blocks[0].start,s.blocks[1].start);assert.equal(s.committed.length,3);assert.ok(s.blocks.slice(0,3).every(x=>!x.frontier));
});
test('block reveal namespaces remain distinct for both normal paragraphs and footnote div roots',()=>{
 const ledger=createResponseRevealLedger('',()=>0),keys=[];const record={...ledger,reveal(key,length){keys.push(key);return ledger.reveal(key,length);}};
 for(let index=0;index<3;index++){const tree={type:'root',children:[{type:'element',tagName:index===0?'p':'div',children:[{type:'text',value:'Same words'}]}]};decorateResponseReveal(tree,record,index);}
 assert.equal(new Set(keys).size,6);assert.ok(keys.some(key=>key.startsWith('message.r2')));
});

test('source quotes separated by blank lines share one open container until following prose establishes its end',()=>{
 let s=feed('> one\n\n> two\n\n');assert.equal(s.blocks.length,1);assert.equal(s.committed.length,0);assert.equal((render(s).match(/<blockquote>/g)||[]).length,1);s=advanceResponseBlocks(s,s.text+'Done\n');assert.equal(s.committed.length,1);assert.equal(s.blocks.length,2);
});

test('prior definitions never leak into open fences, indented code or HTML and actual source offsets remain local',()=>{
 const prefix='[x]: https://example.test\n\n';
 for(const tail of ['```js\nconst x=1;', '    code', '<!-- unfinished']){const html=render(advanceResponseBlocks(null,prefix+tail));assert.doesNotMatch(html,/https:\/\/example.test|\[x\]:/);}
 const source='```js\nconst x=1;';let position;
 renderToStaticMarkup(React.createElement(Markdown,{remarkPlugins:[[remarkPriorDefinitions,{definitions:'[x]: https://example.test'}]],children:source,components:{pre({node,children}){position=node.position;return React.createElement('pre',null,children);}}}));
 assert.deepEqual(position,{start:{line:1,column:1,offset:0},end:{line:2,column:11,offset:source.length}});
});
