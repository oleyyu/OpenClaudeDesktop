import test from 'node:test';
import assert from 'node:assert/strict';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {remarkStreamingInline,frontierTextUnits} from '../src/streaming-inline.mjs';
function parse(source,enabled=true){const p=unified().use(remarkParse).use(remarkGfm).use(remarkStreamingInline,{enabled});return p.runSync(p.parse(source),{value:source});}
const text=node=>node.value??(node.children||[]).map(text).join('');
const find=(node,type)=>[...(node.type===type?[node]:[]),...(node.children||[]).flatMap(child=>find(child,type))];
const open=node=>node.data?.hProperties?.['data-incomplete']==='';

test('live emphasis, strong, deletion and mixed nesting hide opening syntax but retain semantic content',()=>{
 for(const [source,type,expected] of [['hello **bold','strong','bold'],['hello _italic','emphasis','italic'],['hello ~~deleted','delete','deleted'],['***triple','strong','triple']]){
  const nodes=find(parse(source),type);assert.equal(nodes.length,1);assert.equal(open(nodes[0]),true);assert.equal(text(nodes[0]),expected);
 }
 const mixed=parse('**bold _nested');assert.equal(text(mixed),'bold nested');assert.equal(find(mixed,'strong').length,1);assert.equal(find(mixed,'emphasis').length,1);
});
test('complete atomic inline nodes remain the original parsed objects inside open emphasis',()=>{
 const source='**bold `code` and [link](https://example.com)',p=unified().use(remarkParse).use(remarkGfm),tree=p.parse(source),code=find(tree,'inlineCode')[0],link=find(tree,'link')[0];
 remarkStreamingInline({enabled:true})(tree,{value:source});assert.equal(find(tree,'inlineCode')[0],code);assert.equal(find(tree,'link')[0],link);assert.equal(open(find(tree,'strong')[0]),true);
 assert.equal(find(parse('**`code`'),'strong')[0].children[0].type,'inlineCode');
});
test('unfinished code captures raw syntax and entities rather than interpreting them',()=>{
 for(const source of ['``inline *not emphasis* &amp; \\*literal','`<img src=x onerror=alert(1)>']) {
  const tree=parse(source),code=find(tree,'inlineCode')[0];assert.equal(code.value,source.replace(/^`+/,''));assert.equal(open(code),true);assert.equal(find(tree,'emphasis').length,0);
 }
 assert.equal(find(parse('``code`'),'inlineCode')[0].value,'code');
 assert.equal(find(parse('``code` more'),'inlineCode')[0].value,'code` more');
});
test('escape/entity provenance protects literal delimiters and ASCII intraword underscores',()=>{
 for(const source of ['literal \\*star and &#42;entity','a_b_c','one &#95;two','\\`literal'])assert.equal(find(parse(source),'emphasis').length+find(parse(source),'inlineCode').length,0);
 assert.equal(text(parse('\\*literal **bold &amp; more')),'*literal bold & more');
 assert.equal(text(parse('**emoji 👩🏽‍💻 &copy;')),'emoji 👩🏽‍💻 ©');
 const source='Text &amp; &#42; \\*';const node=unified().use(remarkParse).parse(source).children[0].children[0];assert.equal(frontierTextUnits(node,source).map(x=>x.value).join(''),node.value);
});
test('only the final growing paragraph/heading/list item is completed',()=>{
 const source='first **literal\n\nsecond _open';const tree=parse(source);assert.equal(text(tree.children[0]),'first **literal');assert.equal(find(tree.children[1],'emphasis').length,1);
 const list=parse('- **old\n- **new');assert.equal(find(list,'strong').length,1);assert.equal(text(find(list,'strong')[0]),'new');
 assert.equal(find(parse('## **head'),'strong').length,1);assert.equal(find(parse('## **head\n'),'strong').length,0);assert.equal(find(parse('**paragraph\n\n'),'strong').length,0);
});
test('blockquote/list continuation removes only actual container prefixes',()=>{
 for(const [source,expected] of [['> **bold\n> more','bold\nmore'],['- **bold\n  more','bold\nmore'],['> ``a\n> *b*','a\n*b*']])assert.equal(text(parse(source)),expected);
});
test('table frontier affects only its last unfinished cell; terminated row stays literal',()=>{
 const source='| A | B |\n|---|---|\n| **old | **new';const tree=parse(source);assert.equal(find(tree,'strong').length,1);assert.equal(text(find(tree,'strong')[0]),'new');
 assert.equal(find(parse(source+' |'),'strong').length,0);
});
test('partial link uses precisely received URL and unresolved labels remain literal',()=>{
 const tree=parse('See [label](https://example.com/a(b');const link=find(tree,'link')[0];assert.equal(link.url,'https://example.com/a(b');assert.equal(text(link),'label');assert.equal(open(link),true);
 for(const source of ['[unclosed','[label]','[label](some invalid url)'])assert.equal(text(parse(source)),source);
 // markdown-current Y:965–1019 emits open images exactly like open links.
 const image=find(parse('![image](https://partial'),'image')[0];assert.equal(image.alt,'image');assert.equal(image.url,'https://partial');assert.equal(open(image),true);
});
test('settled content and complete fences remain unmodified',()=>{
 for(const source of ['**unfinished','`raw','[label](https://part','> **bold\n> more'])assert.deepEqual(parse(source,false),unified().use(remarkParse).use(remarkGfm).parse(source));
 const source='```js\nconst value = "**literal";\n```';assert.deepEqual(parse(source),parse(source,false));
});
test('long plain prose is kept as a single text unit and excessive delimiter nesting stays bounded',()=>{
 const source='**'+ 'word '.repeat(20000)+'end',tree=parse(source);assert.equal(text(tree).length,source.length-2);assert.equal(text(tree),source.slice(2));assert.equal(find(tree,'text').length,1);
 const nested=parse('*a _b '.repeat(300));assert.ok(find(nested,'strong').length+find(nested,'emphasis').length<=256);assert.ok(text(nested).length>0);
});

test('growing prose preserves CommonMark trailing-space normalization',()=>{assert.equal(text(parse('**word ')),'word');});
