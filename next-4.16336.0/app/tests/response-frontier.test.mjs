import test from 'node:test';
import assert from 'node:assert/strict';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {remarkResponseFootnotes} from '../src/remark-response-footnotes.mjs';
import {remarkFrontierDefinitions} from '../src/frontier-definitions.mjs';
import {remarkStreamingInline} from '../src/streaming-inline.mjs';
import {advanceResponseBlocks,remarkPriorDefinitions} from '../src/response-block-model.mjs';
const parser=(enabled=true,definitions='')=>unified().use(remarkParse).use(remarkGfm).use(remarkResponseFootnotes).use(remarkFrontierDefinitions,{enabled}).use(remarkPriorDefinitions,{definitions}).use(remarkStreamingInline,{enabled});
const ast=(source,enabled=true,definitions='')=>{const p=parser(enabled,definitions);return p.runSync(p.parse(source),{value:source});};
const find=(n,type)=>[...(n.type===type?[n]:[]),...(n.children||[]).flatMap(c=>find(c,type))];
const text=n=>n.value??n.alt??(n.children||[]).map(text).join('');
test('unfinished image destinations hide syntax and preserve exact alt and raw received destination',()=>{
 for(const [s,alt,url] of [['![plot](','plot',''],['![**plot** &amp; data](https://example.test/a(b','plot & data','https://example.test/a(b'],['![raw](./plot','raw','./plot']]){
  const nodes=find(ast(s),'image');assert.equal(nodes.length,1);assert.equal(nodes[0].alt,alt);assert.equal(nodes[0].url,url);assert.equal(nodes[0].data.hProperties['data-incomplete'],'');
 }
 assert.equal(find(ast('![**open](https://example.test'),'image')[0].alt,'**open');
 for(const s of ['![plot','![plot]','\\![plot](x','!\\[plot](x','&#33;[plot](x'])assert.equal(find(ast(s),'image').length,0,s);
 assert.equal(find(ast('![plot](https://example.test/image.png)'),'image')[0].data,undefined);
});
test('shortcut references hold only at the live closing bracket; full and collapsed references are immediately resolved',()=>{
 const definitions='[label]: https://example.test\n';
 for(const s of ['[label]','![label]']){assert.equal(find(ast(s,true,definitions),'linkReference').length+find(ast(s,true,definitions),'imageReference').length,0);assert.equal(text(find(ast(s,true,definitions),'paragraph')[0]),s);}
 for(const s of ['[label] ','[label]\n','[label][label]','[label][]'])assert.equal(find(ast(s,true,definitions),'linkReference').length,1,s);
 assert.equal(find(ast('[label]',false,definitions),'linkReference').length,1);
 const formatted=ast('![**label**]',true,'[**label**]: https://example.test');assert.equal(find(formatted,'imageReference').length,0);assert.equal(find(formatted,'strong').length,1);assert.equal(text(find(formatted,'paragraph')[0]),'![label]');
});
test('incomplete definition lines remain actual inline prose until newline or EOF settlement',()=>{
 const link='[ref]: https://example.test';
 assert.equal(find(ast(link),'definition').length,0);assert.equal(find(ast(link),'paragraph').length,1);assert.equal(text(ast(link)),link);
 const note='[^note]: **live';
 assert.equal(find(ast(note),'responseFootnoteDefinition').length,0);assert.equal(find(ast(note),'responseFootnoteReference').length,1);assert.equal(find(ast(note),'strong').length,1);
 for(const s of [note+'\n',note+'\r\n']){assert.equal(find(ast(s),'responseFootnoteDefinition').length,1);assert.equal(find(ast(s),'strong').length,0);}
 assert.equal(find(ast(note,false),'responseFootnoteDefinition').length,1);assert.equal(find(ast(link,false),'definition').length,1);
});
test('definition reparse restores positions and leaves source, escaped syntax, quotes, lists and opaque code intact',()=>{
 for(const prefix of ['', '> ', '- ', '   ']){
  const source=prefix+'[^n]: **bold';const p=parser(),file={value:source};const tree=p.runSync(p.parse(source),file);
  assert.equal(file.value,source);assert.equal(tree.position.end.offset,source.length);assert.equal(find(tree,'responseFootnoteDefinition').length,0);assert.equal(find(tree,'strong').length,1);
  const reference=find(tree,'responseFootnoteReference')[0];assert.equal(source.slice(reference.position.start.offset,reference.position.end.offset),'[^n]');
 }
 for(const source of ['`[ref]: https://example.test`','```\n[ref]: https://example.test','    [ref]: https://example.test','\\[ref]: https://example.test'])assert.equal(find(ast(source),'definition').length,0);
 assert.equal(text(ast('[^n]: \\*literal &amp;')),'[^n]: *literal &');
});
test('prior definition metadata cannot shadow or leak into the live definition parsing copy',()=>{
 const source='[^n]: [label][ref] and **bold',defs='[ref]: https://example.test';const tree=ast(source,true,defs);
 assert.equal(find(tree,'definition').length,1);assert.equal(find(tree,'responseFootnoteDefinition').length,0);assert.equal(find(tree,'linkReference').length,1);assert.equal(find(tree,'strong').length,1);
 const ref=find(tree,'responseFootnoteReference')[0];assert.equal(ref.position.start.offset,0);assert.equal(ref.position.start.line,1);
 assert.equal(find(ast('```\nraw',true,defs),'code')[0].value,'raw');
});
test('incremental scheduler keeps live definitions visible and commits only once their line arrives',()=>{
 let state=advanceResponseBlocks(null,'[ref]: https://example.test',true);assert.equal(state.blocks.length,1);assert.equal(state.blocks[0].frontier,true);assert.equal(state.definitions,'');
 state=advanceResponseBlocks(state,state.text+'\n\nNext [link][ref]',true);assert.equal(state.blocks.length,1);assert.match(state.blocks[0].definitions,/https:\/\/example.test/);assert.equal(state.blocks[0].text,'Next [link][ref]');
 let note=advanceResponseBlocks(null,'[^n]: **unfinished',true);assert.equal(note.blocks[0].type,'paragraph');
 note=advanceResponseBlocks(note,note.text+'\n',true);assert.equal(note.blocks[0].type,'responseFootnoteDefinition');assert.equal(note.blocks[0].frontier,false);
 const done=advanceResponseBlocks(null,'[ref]: https://example.test',false);assert.equal(done.blocks.length,0);
});
