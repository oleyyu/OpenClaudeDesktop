import test from 'node:test';
import assert from 'node:assert/strict';
import {unified} from 'unified';
import parse from 'remark-parse';
import gfm from 'remark-gfm';
import math from 'remark-math';
import katex from 'katex';
import {remarkResponseMath} from '../src/remark-response-math.mjs';
import {acceptsBackslashMath,mathFallback,renderMath,MATH_SOURCE_LIMIT} from '../src/response-math-model.mjs';
function ast(source){const p=unified().use(parse).use(gfm).use(math,{singleDollarTextMath:false}).use(remarkResponseMath);return p.runSync(p.parse(source),{value:source});}
function formulas(node){return [ ...(node.data?.hName==='response-math'?[node]:[]), ...(node.children||[]).flatMap(formulas) ];}
test('display dollars parse multiline, CRLF, quotes, and standalone expressions; inline dollars/currency stay literal',()=>{
 for(const s of ['$$\nx^2\n$$','$$\r\nx^2\r\n$$','$$x^2$$','> $$\n> x^2\n> $$','- $$\n  x^2\n  $$']){const f=formulas(ast(s));assert.equal(f.length,1,s);assert.equal(f[0].open,false,s);assert.equal(f[0].display,true,s);}
 for(const s of ['$5 and $10','$x^2$','cost $$x^2$$ today','$$hello$$'])assert.equal(formulas(ast(s)).length,0,s);
});
test('unterminated display math remains explicitly open, including longer dollar fences',()=>{
 for(const s of ['$$','$$\nx^2','$$$$\nx^2\n$$'])assert.equal(formulas(ast(s))[0].open,true,s);
 assert.equal(formulas(ast('$$$$\nx^2\n$$$$'))[0].open,false);
 assert.equal(mathFallback('x^2',true,true),'$$\nx^2');assert.equal(mathFallback('',true,true),'$$');
});
test('guarded backslash formulas respect inline/display boundaries, emphasis, code, escapes and link destinations',()=>{
 for(const s of [String.raw`Value \(x^2\) here`,String.raw`**\(x^2\)**`,String.raw`_\(x^2\)_`,String.raw`\[x^2\]`])assert.equal(formulas(ast(s)).length,1,s);
 for(const s of [String.raw`word\(x^2\)`,String.raw`]\(x^2\)`,String.raw`\(ordinary text\)`,String.raw`\(x*2\)`,String.raw`\(x^2`,String.raw`escaped \\(x^2\\)`,String.raw`inline \[x^2\]`,String.raw`\(command --flag\)`,String.raw`\(\1+x\)`,'`\\(x^2\\)`','```js\n\\(x^2\\)\n```','[text](https://example.test/\\(x^2\\))'])assert.equal(formulas(ast(s)).length,0,s);
 const tree=ast(String.raw`\[x^2\]`);assert.equal(tree.children[0].type,'responseMath');assert.equal(tree.children[0].display,true);
});
test('source guards use exact limits and mathematical indicators without accepting CLI regex text',()=>{
 assert.equal(acceptsBackslashMath('x^'+'1'.repeat(58)),true);assert.equal(acceptsBackslashMath('x^'+'1'.repeat(59)),false);
 assert.equal(acceptsBackslashMath('x^2','*'.repeat(65)),false);
 assert.equal(acceptsBackslashMath('x^2','hello **'),true);assert.equal(acceptsBackslashMath('x^2','hello**'),false);
 assert.equal(acceptsBackslashMath('x^'+'1'.repeat(1022),'',true),true);assert.equal(acceptsBackslashMath('x^'+'1'.repeat(1023),'',true),false);
});
test('pinned KaTeX produces display/inline math accessibility and real fraction/superscript geometry',()=>{
 assert.equal(katex.version,'0.16.47');
 const block=renderMath(katex,String.raw`\frac{a}{b}+x^2`,true);assert.match(block,/class="mfrac"/);assert.match(block,/class="katex can-focus" role="math" tabindex="0"/);assert.match(block,/application\/x-tex/);assert.match(block,/<math /);
 const inline=renderMath(katex,'x^2',false);assert.match(inline,/class="katex" role="math"/);assert.doesNotMatch(inline,/tabindex/);
});
test('open, unloaded, ambiguous and oversized inputs retain fallback; explicit math fences bypass symbol gate',()=>{
 assert.equal(renderMath(null,'x^2',true),null);assert.equal(renderMath(katex,'x^2',true,{open:true}),null);assert.equal(renderMath(katex,'abc',true),null);
 assert.match(renderMath(katex,'abc',true,{fenced:true}),/role="math"/);
 assert.equal(renderMath(katex,'x^'+'1'.repeat(MATH_SOURCE_LIMIT),true),null);
});
test('formula HTML only comes from KaTeX: hostile input, trust commands, loops and malformed TeX do not execute or fetch',()=>{
 for(const value of [String.raw`\href{javascript:alert(1)}{x}`,String.raw`\includegraphics{https://example.test/tracker}`,String.raw`\htmlClass{injected}{x}`,String.raw`\gdef\loop{\loop}\loop`,'<script>alert(1)</script>',String.raw`\frac{`,String.raw`\badcommand`]){
  const html=renderMath(katex,value,true,{fenced:true});assert.ok(html,value);assert.doesNotMatch(html,/<script|<img|href="javascript:|class="injected/);
 }
 const first=renderMath(katex,String.raw`\gdef\custom{1}\custom`,true,{fenced:true});const second=renderMath(katex,String.raw`\custom`,true,{fenced:true});assert.notEqual(first,second);assert.match(second,/\\custom/);
});
