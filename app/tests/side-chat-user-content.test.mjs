import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import { parseAst } from 'rolldown/parseAst';
import { parseSideChatUserText as parse } from '../src/generated/code-editor/side-chat-user-segments.mjs';
import { renderSideChatUserSegment as renderSegment, sideChatTextBreaks } from '../src/generated/code-editor/side-chat-user-render.mjs';
const render = text => renderToStaticMarkup(React.createElement('div', null, parse(text).map((s,i)=>renderSegment(s,i,sideChatTextBreaks))));

test('source list parser keeps ordered starts and three-space nested lists', () => {
  const [intro,list]=parse('Intro\n\n3. third\n4. fourth\n   * child');
  assert.deepEqual(intro,{kind:'text',text:'Intro'});assert.equal(list.list.start,3);assert.equal(list.list.ordered,true);
  assert.deepEqual(list.list.items.map(i=>i.text),['third','fourth']);assert.equal(list.list.items[1].children[0].items[0].text,'child');
  const html=render('3. third\n4. fourth\n   * child');assert.match(html,/<ol dir="ltr" start="3"/);assert.match(html,/<li>fourth<ul/);
});

test('ordinary text, unsupported bullets and non-canonical numbering stay literal', () => {
  for(const text of ['- one\n- two','01. first\n02. next','Intro\n* no separator','inline `code` https://example.com'])assert.deepEqual(parse(text),[{kind:'text',text}]);
  const html=render('inline `code` https://example.com');assert.doesNotMatch(html,/<a |<code/);assert.match(html,/`code` https:\/\/example.com/);
  assert.equal(parse('2. second\n4. fourth')[0].list.items[0].text,'second\n4. fourth','out-of-sequence numbering is a literal continuation');
});

test('fenced content remains literal while following ordinary lists are rendered', () => {
  const text='```js\n* literal\n```\n\n* real';const segments=parse(text);
  assert.equal(segments[0].text,'```js\n* literal\n```');assert.equal(segments[1].list.items[0].text,'real');
  const html=render(text);assert.doesNotMatch(html,/<pre|<code/);assert.match(html,/```js<br\/>\* literal<br\/>```/);assert.equal((html.match(/<ul/g)||[]).length,1);
});

test('source rendering retains trailing empty lines and escapes user HTML', () => {
  assert.match(render('one\n'),/one<br\/><br\/>/);assert.match(render('<script>example</script>'),/&lt;script&gt;example&lt;\/script&gt;/);
  assert.deepEqual(parse(''),[]);
});

test('source nesting limit flattens deeper levels without dropping their text', () => {
  const text=Array.from({length:12},(_,i)=>'   '.repeat(i)+'* level'+i).join('\n');
  const html=render(text);assert.equal((html.match(/<ul/g)||[]).length,8);
  for(let i=0;i<12;i++)assert.ok(html.includes('level'+i));
});

const { detectSideChatSecrets: detect, maskSideChatSecrets: mask } = await import('../src/generated/code-editor/side-chat-secrets.mjs');
test('current detector covers a fixed-length key suffix and keeps independent match boundaries', () => {
  const aws='AKIA'+'A'.repeat(24),github='ghp_'+'y'.repeat(32),text=aws+' '+github;
  assert.deepEqual(detect(text).map(s=>[s.patternId,s.start,s.end]),[['aws',0,aws.length],['github',aws.length+1,text.length]]);
  assert.equal(mask(text),aws.slice(0,8)+'•'.repeat(aws.length-8)+' '+github.slice(0,8)+'•'.repeat(github.length-8));
});
test('current detector masks invisible-character obfuscation and preserves PEM structure', () => {
  const token='sk-ant-'+'x'.repeat(10)+'\u200B'+'x'.repeat(22);assert.equal(detect(token)[0].value,token);assert.ok(!mask(token).includes('x'.repeat(10)));
  const pem='-----BEGIN PRIVATE KEY-----\nABCDEFGHIJKLMNOPQRSTUV0123456789\n-----END PRIVATE KEY-----';
  assert.equal(detect(pem)[0].patternId,'private_key');assert.equal(mask(pem),'-----BEGIN PRIVATE KEY-----\n'+'•'.repeat(32)+'\n-----END PRIVATE KEY-----');
});
test('current secret scan retains ordinary text and the original size boundary', () => {
  assert.equal(mask('normal question'), 'normal question');assert.deepEqual(detect('a'.repeat(262145)),[]);
});

// w10-editor-side-chat: 3.6556.2 c96d752d0 xP/SP add the list direction (shared-5 eP over the first item, URL and
// mention prefixes and bidi controls ignored) and the [unicode-bidi:plaintext] paragraph class (c8187a2dc).
test('3.6556.2 lists carry their first item direction and paragraphs isolate bidi text', () => {
  assert.match(render('1. \u05e9\u05dc\u05d5\u05dd\n2. two'),/<ol dir="rtl" class="epitaxy-user-list /);
  assert.match(render('* https://example.com \u05e9\u05dc\u05d5\u05dd'),/<ul dir="rtl"/,'a leading URL does not decide the direction');
  assert.match(render('* 123'),/<ul class="epitaxy-user-list /,'neutral text leaves dir unset');
  assert.match(render('plain'),/<p class="text-body whitespace-pre-wrap \[overflow-wrap:anywhere\] text-pretty \[unicode-bidi:plaintext\]">plain<\/p>/);
});

// The generated segmentation/render/secret code is the official 3.6556.2 code: each named top-level declaration of the
// snapshot has the same AST (positions and literal spelling aside) in the generated adapter.
const snapshot = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
const generated = new URL('../src/generated/code-editor/', import.meta.url);
const shape = node => JSON.stringify(node, (key, value) => key === 'start' || key === 'end' || key === 'raw' ? undefined : typeof value === 'bigint' ? `${value}n` : value);
function declarations(code, file) {
  const found = new Map(), visit = list => { for (const node of list) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration) { visit([node.declaration]); continue; }
    if (node.type === 'FunctionDeclaration' && node.id) found.set(node.id.name, shape(node));
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') found.set(d.id.name, shape(d));
  } };
  visit(parseAst(code, { lang: 'js' }, file).body);
  return found;
}
for (const [target, file, names] of [
  ['side-chat-user-segments.mjs', 'c4d199b75-D3cQB-UP.js', ['G','K','Le','Re','ze','Be','Ve','He','q','Ue','We','Ge','Ke','qe','Je','Ye']],
  ['side-chat-user-segments.mjs', 'shared-7-DBAgAi5H.js', ['bP','TP','AP']],
  ['side-chat-user-segments.mjs', 'shared-182-BI1KJccu.js', ['ny','Yv','Lv']],
  ['side-chat-user-render.mjs', 'c96d752d0-CWv_7-n9.js', ['gP','bP','xP','SP']],
  ['side-chat-user-render.mjs', 'shared-10-D6FXWZph.js', ['Ns']],
  ['side-chat-secrets.mjs', 'shared-104-CTONUSaz.js', ['jc','al','ol','fl','ml']],
]) test(`${target} carries 3.6556.2 ${file} ${names.join(' ')} verbatim`, () => {
  const official = declarations(fs.readFileSync(new URL(file, snapshot), 'utf8'), file);
  const ours = declarations(fs.readFileSync(new URL(target, generated), 'utf8'), target);
  for (const name of names) { assert.ok(official.has(name), `${file} declares ${name}`); assert.equal(ours.get(name), official.get(name), `${name} matches ${file}`); }
});
