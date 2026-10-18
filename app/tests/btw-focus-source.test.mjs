import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { captureBtwFocus, rememberBtwFocus, useBtwFocusIntent } from '../src/generated/code-current/btw-focus-intent.mjs';
import { paneOwnsFocus } from '../src/generated/code-current/pane-focus-owner.mjs';

let clock=10000, serial=0;
function timing(fn) {
  const original=Object.getOwnPropertyDescriptor(globalThis,'performance');
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
  try {return fn();} finally {Object.defineProperty(globalThis,'performance',original);clock+=10000;}
}
function documentFixture(){
  const handlers=new Map(),added=[];
  return {added,addEventListener:(name,handler,capture)=>{handlers.set(name,handler);added.push({name,capture});},emit:name=>handlers.get(name)?.()};
}
function consume(id){let value;function Check(){value=useBtwFocusIntent(id);return null;}renderToStaticMarkup(React.createElement(Check));return value;}
test('original focus capture installs one capture listener per input type and per document',()=>timing(()=>{
  const doc=documentFixture();assert.equal(captureBtwFocus(doc),clock);captureBtwFocus(doc);
  assert.deepEqual(doc.added,[{name:'keydown',capture:true},{name:'pointerdown',capture:true}]);
  const second=documentFixture();captureBtwFocus(second);assert.equal(second.added.length,2);
}));
test('waiting for creation alone does not expire the original focus intent',()=>timing(()=>{
  const id=`child-${++serial}`,stamp=captureBtwFocus(documentFixture());rememberBtwFocus(id,stamp);
  clock+=20000;assert.equal(consume(id),true);assert.equal(consume(id),false,'the intent is consumed once');
}));
test('keyboard or pointer activity after the one-second grace prevents a delayed child stealing focus',()=>{
  for(const type of ['keydown','pointerdown'])for(const delta of [999,1000,1001])timing(()=>{
    const doc=documentFixture(),id=`child-${++serial}`;rememberBtwFocus(id,captureBtwFocus(doc));clock+=delta;doc.emit(type);
    assert.equal(consume(id),delta<=1000);
  });
});
test('opening one child cannot consume another child’s pending intent',()=>timing(()=>{
  const one=`child-${++serial}`,two=`child-${++serial}`;rememberBtwFocus(one,captureBtwFocus());
  assert.equal(consume(two),false);assert.equal(consume(one),true);
}));
test('source pane ownership follows the active element and permits an unfocused document',()=>{
  const inside={},outside={},doc={body:{},activeElement:null},pane={contains:node=>node===inside};
  const header={ownerDocument:doc,closest:()=>pane};
  assert.equal(paneOwnsFocus(header),true);doc.activeElement=doc.body;assert.equal(paneOwnsFocus(header),true);
  doc.activeElement=inside;assert.equal(paneOwnsFocus(header),true);doc.activeElement=outside;assert.equal(paneOwnsFocus(header),false);
  const detached={ownerDocument:doc,closest:()=>null,contains:node=>node===outside};assert.equal(paneOwnsFocus(detached),true);
});

// R2-btw NBS-1: the /btw, focus, owner-document and side-session prompt helpers read 2.42304.0 (renderer chunks and
// the asar main-process build), and the shipped files still hash to what the manifest records.
test('NBS-1: /btw helpers are generated from the 2.42304.0 snapshot under their new minified names', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const path = (await import('node:path')).default;
  const app = path.resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const snapshot = path.resolve(app, '../reference/installed-2.42304.0-20261017');
  const expected = {
    'btw-focus-intent.mjs': ['ion-dist/assets/v1/c5259f582-CEcxfnw9.js', ['H','de','U','W','G','fe','K','me']],
    'owner-document.mjs': ['ion-dist/assets/v1/shared-25-DP8p7i1Z.js', ['cp','lp','fp']],
    'pane-focus-owner.mjs': ['ion-dist/assets/v1/cccc2cf0a-B0D--VZp.js', ['ey']],
    '../../../electron/generated/btw-title.mjs': ['ion-dist/assets/v1/c73f45bc3-CFrHin0p.js', ['Su','Cu','Tu','Du']],
    '../../../electron/generated/side-session-prompt.mjs': ['asar/.vite/build/index.chunk-B5tintml.js', ['cy','xy','by','yy','_y','vy','Sy']],
  };
  for (const [target, [file, bindings]] of Object.entries(expected)) {
    const entry = manifest.modules.find(module => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.resolve(app, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1', entry.source), path.join(snapshot, file), target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(snapshot, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const output = path.resolve(app, 'src/generated/code-current', target), text = readFileSync(output, 'utf8');
    assert.equal(entry.sha256, sha(text), target);
    assert.match(text, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/, target);
  }
  // The new chunks import the helpers under new aliases: AI as qt (btw title), fp as M (pane owner), useState as e.
  assert.match(readFileSync(path.join(app, 'electron/generated/btw-title.mjs'), 'utf8'), /import \{ graphemeSafeLimit as qt \} from "\.\/string-grapheme-limit\.mjs"/);
  assert.match(readFileSync(path.join(app, 'src/generated/code-current/pane-focus-owner.mjs'), 'utf8'), /import \{ ownerDocument as M \} from "\.\/owner-document\.mjs"/);
  assert.match(readFileSync(path.join(app, 'src/generated/code-current/btw-focus-intent.mjs'), 'utf8'), /import \{ useState as e \} from "react"/);
  const { extractCurrentCodeHelpers } = await import('../scripts/extract-code-ui-current.mjs');
  await extractCurrentCodeHelpers({ check: true, only: new Set(Object.keys(expected)) });
});
