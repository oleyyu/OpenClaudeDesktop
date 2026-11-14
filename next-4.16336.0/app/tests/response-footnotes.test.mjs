import test from 'node:test';
import assert from 'node:assert/strict';
import {unified} from 'unified';
import parse from 'remark-parse';
import gfm from 'remark-gfm';
import math from 'remark-math';
import {remarkResponseMath} from '../src/remark-response-math.mjs';
import {remarkResponseFootnotes} from '../src/remark-response-footnotes.mjs';
import {remarkStreamingInline} from '../src/streaming-inline.mjs';
const ast=(source,streaming=false)=>{const p=unified().use(parse).use(gfm).use(math,{singleDollarTextMath:false}).use(remarkResponseMath).use(remarkResponseFootnotes).use(remarkStreamingInline,{enabled:streaming});return p.runSync(p.parse(source),{value:source});};
const find=(node,type)=>[...(node.type===type?[node]:[]),...(node.children||[]).flatMap(child=>find(child,type))];
const text=node=>node.value??(node.children||[]).map(text).join('');
const refs=tree=>find(tree,'responseFootnoteReference');
const defs=tree=>find(tree,'responseFootnoteDefinition');

test('Code footnotes retain exact named labels, duplicates and undefined references without GFM identifiers',()=>{
 const tree=ast('First[^Zulu], repeated[^Zulu], lower[^zulu], missing[^unknown].\n\n[^Zulu]: Original **bold** definition.\n\nLater paragraph.\n\n[^Zulu]: Duplicate definition.');
 assert.deepEqual(refs(tree).map(n=>n.value),['[^Zulu]','[^Zulu]','[^zulu]','[^unknown]']);
 assert.deepEqual(tree.children.map(n=>n.type),['paragraph','responseFootnoteDefinition','paragraph','responseFootnoteDefinition']);
 assert.deepEqual(defs(tree).map(n=>n.label),['Zulu','Zulu']);assert.equal(find(tree,'footnoteReference').length,0);assert.equal(find(tree,'footnoteDefinition').length,0);
 assert.equal(find(tree,'strong').length,1);assert.equal(text(defs(tree)[0].children[0]),'[Zulu] ');
});
test('reference limit128 and raw labels distinguish escaped/entity text from real syntax',()=>{
 for(const label of ['x','Case','A&amp;B','\\literal','中'.repeat(128)])assert.equal(refs(ast(`before[^${label}]after`)).length,1,label);
 for(const label of ['','has space','line\nbreak','[bracket','x'.repeat(129)])assert.equal(refs(ast(`before[^${label}]after`)).length,0,label);
 for(const source of [String.raw`escaped \[^note]`,'&#91;^note]','`[^note]`','```text\n[^note]: code\n```','    [^note]: indented']){const t=ast(source);assert.equal(refs(t).length,0,source);assert.equal(defs(t).length,0,source);}
 assert.equal(refs(ast('[^A&amp;B]'))[0].data.hChildren[0].value,'[A&amp;B]');
});
test('single-line definitions stay at their original block positions and cannot interrupt a paragraph',()=>{
 const tree=ast('Before\n[^same]: stays in prose\n\n[^note]: body\n    separate code\n\nAfter');
 assert.equal(defs(tree).length,1);assert.equal(refs(tree).length,1);
 assert.deepEqual(tree.children.map(n=>n.type),['paragraph','responseFootnoteDefinition','code','paragraph']);assert.equal(tree.children[2].value,'separate code');
 assert.equal(defs(ast('[^empty]:\n'))[0].children[1].children.length,0);
 assert.equal(text(defs(ast('[^a]:  two spaces'))[0].children[1]),' two spaces');
 assert.equal(text(defs(ast('[^a]:\tTabbed'))[0].children[1]),'Tabbed');
 assert.equal(defs(ast('   [^a]: allowed')).length,1);assert.equal(defs(ast('    [^a]: code')).length,0);
});
test('nested quotes/list definitions, CRLF, and image alt use their actual syntax ownership',()=>{
 const tree=ast('> [^Quote]: quoted\r\n\r\n- [^List]: listed\r\n\r\n![alt[^Image]](plot.png)\r\n\r\n[link[^Ref]](https://example.test)');
 assert.deepEqual(defs(tree).map(n=>n.label),['Quote','List']);assert.equal(tree.children[0].type,'blockquote');assert.equal(tree.children[1].type,'list');
 assert.equal(find(tree,'image')[0].alt,'alt[^Image]');assert.equal(refs(tree).length,1);assert.equal(refs(tree)[0].value,'[^Ref]');
});
test('streaming incomplete references stay literal until closing bracket; definition body uses settled inline syntax',()=>{
 for(const value of ['[','[^','[^Label']){assert.equal(refs(ast(value,true)).length,0);assert.equal(text(ast(value,true)),value);}
 assert.equal(refs(ast('[^Label]',true)).length,1);
 const tree=ast('[^a]: **unfinished',true);assert.equal(defs(tree).length,1);assert.equal(find(tree,'strong').length,0);assert.equal(text(defs(tree)[0].children[1]),'**unfinished');
 assert.equal(find(ast('**Live [^a]',true),'strong').length,1);assert.equal(refs(ast('**Live [^a]',true)).length,1);
});
test('definition contents preserve existing math, code, links, task and table parsing outside the definition',()=>{
 const tree=ast('[^Formula]: Energy \\(E=mc^2\\), `code`, [docs](https://example.test).\n\n- [x] Done[^Formula]\n\n| Key | Value |\n| --- | --- |\n| note | [^Formula] |');
 assert.equal(find(tree,'responseMath').length,1);assert.equal(find(tree,'inlineCode').length,1);assert.equal(find(tree,'link').length,1);assert.equal(find(tree,'listItem')[0].checked,true);assert.equal(find(tree,'table').length,1);assert.equal(refs(tree).length,2);
});
