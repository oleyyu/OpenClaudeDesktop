import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import nodePath from 'node:path';
import { paneOwnsFocus } from '../src/generated/code-current/pane-focus-owner.mjs';
// cc-rest-btw-focus: the 3.6556.2 intent hook (c03935b01 Zr) is React Compiler output over view-tabs' cache helpers, whose
// shared-frame imports the .jsx adapters, so the module loads through Vite SSR (E42: no plain-node path into view-tabs).
let server, captureBtwFocus, rememberBtwFocus, useBtwFocusIntent, focusBtwComposer, armBtwSessionComposer, focusBtwSessionComposer, registry;
before(async () => {
  server = await createServer({ configFile: false, root: nodePath.resolve(import.meta.dirname, '..'), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ captureBtwFocus, rememberBtwFocus, useBtwFocusIntent, focusBtwComposer, armBtwSessionComposer, focusBtwSessionComposer } = await server.ssrLoadModule('/src/generated/code-current/btw-focus-intent.mjs'));
  // The same module instance the generated Xr / Yr import (Rr).
  registry = await server.ssrLoadModule('/src/btw-composer-registry.mjs');
});
after(() => server?.close());

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
  // 3.6556.2 Zr returns the remembered record (qr `{...n, askedAt: t}`), or null once consumed or stale.
  clock+=20000;assert.deepEqual(consume(id),{askedAt:stamp});assert.equal(consume(id),null,'the intent is consumed once');
}));
test('keyboard or pointer activity after the one-second grace prevents a delayed child stealing focus',()=>{
  for(const type of ['keydown','pointerdown'])for(const delta of [999,1000,1001])timing(()=>{
    const doc=documentFixture(),id=`child-${++serial}`;rememberBtwFocus(id,captureBtwFocus(doc));clock+=delta;doc.emit(type);
    assert.equal(consume(id)!==null,delta<=1000);
  });
});
test('opening one child cannot consume another child’s pending intent',()=>timing(()=>{
  const one=`child-${++serial}`,two=`child-${++serial}`;rememberBtwFocus(one,captureBtwFocus());
  assert.equal(consume(two),null);assert.notEqual(consume(one),null);
}));
test('a remembered intent keeps its options, and Jr applies a keyboard one by swallowing the stray Enter before focusing',()=>timing(()=>{
  const id=`child-${++serial}`,stamp=captureBtwFocus(documentFixture());rememberBtwFocus(id,stamp,{afterKeyPress:true,askedAt:-1});
  const record=consume(id);assert.deepEqual(record,{afterKeyPress:true,askedAt:stamp},'askedAt is written after the options');
  const calls=[],composer={ignoreStrayEnter:(...args)=>calls.push(['ignoreStrayEnter',...args]),scheduleFocus:(...args)=>calls.push(['scheduleFocus',...args])};
  focusBtwComposer(composer,record);assert.deepEqual(calls,[['ignoreStrayEnter'],['scheduleFocus']]);
  calls.length=0;focusBtwComposer(composer,{askedAt:stamp});focusBtwComposer(composer,{afterKeyPress:false,askedAt:stamp});
  assert.deepEqual(calls,[['scheduleFocus'],['scheduleFocus']],'a pointer or programmatic intent only focuses');
  assert.doesNotThrow(()=>focusBtwComposer(null,record),'no composer: nothing to focus');
}));
test('source pane ownership follows the active element and permits an unfocused document',()=>{
  const inside={},outside={},doc={body:{},activeElement:null},pane={contains:node=>node===inside};
  const header={ownerDocument:doc,closest:()=>pane};
  assert.equal(paneOwnsFocus(header),true);doc.activeElement=doc.body;assert.equal(paneOwnsFocus(header),true);
  doc.activeElement=inside;assert.equal(paneOwnsFocus(header),true);doc.activeElement=outside;assert.equal(paneOwnsFocus(header),false);
  const detached={ownerDocument:doc,closest:()=>null,contains:node=>node===outside};assert.equal(paneOwnsFocus(detached),true);
});

// R2-btw NBS-1: the /btw, focus, owner-document and side-session prompt helpers read their pinned snapshot (2.42304.0,
// or 3.6556.2 per entry; renderer chunks and the asar main-process build), and the shipped files still hash to what the manifest records.
test('NBS-1: /btw helpers are generated from their pinned snapshot (2.42304.0 / 3.6556.2) under their new minified names', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const path = (await import('node:path')).default;
  const app = path.resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const snapshot = path.resolve(app, '../reference/installed-2.42304.0-20261017');
  const expected = {
    // cc-rest-btw-focus (3.6556.2): c03935b01 Vr/Hr/Ur/Wr/Gr/Kr/qr/Jr/Zr (2.42304.0 c5259f582 H/de/U/W/G/fe/K/me).
    // w10-ccres-e31-btw: plus Yr / Xr (On / Mn) over the host's Rr adapter (btw-composer-registry.mjs).
    'btw-focus-intent.mjs': ['ion-dist/assets/v1/c03935b01-yhcY34vt.js', ['Vr','Hr','Ur','Wr','Gr','Kr','qr','Jr','Yr','Xr','Zr'], '3.6556.2'],
    // w10-ccres-e31-btw: c9bc99274 b (P_ in cccc2cf0a) and the selectors / predicates it reads.
    'pane-focus-target.mjs': ['ion-dist/assets/v1/c9bc99274-DTZfHMJt.js', ['a','c','l','u','f','_','v','y','b'], '3.6556.2'],
    // w2-btw-approval (3.6556.2): owner-document shared-25 df/ff/hf, pane-focus-owner cccc2cf0a ux, btw-title c73f45bc3 Mf/Nf/Ff/Lf.
    'owner-document.mjs': ['ion-dist/assets/v1/shared-25-DOWZRSlq.js', ['df','ff','hf'], '3.6556.2'],
    'pane-focus-owner.mjs': ['ion-dist/assets/v1/cccc2cf0a-DhZC33Gc.js', ['ux'], '3.6556.2'],
    '../../../electron/generated/btw-title.mjs': ['ion-dist/assets/v1/c73f45bc3-B7hbL7H9.js', ['Mf','Nf','Ff','Lf'], '3.6556.2'],
    // w2-tr-turn: 3.6556.2 index.chunk-DBIg6EBr Ey (same text as 2.42304.0 B5tintml Sy).
    '../../../electron/generated/side-session-prompt.mjs': ['asar/.vite/build/index.chunk-DBIg6EBr.js', ['cy','Ty','wy','Cy','xy','Sy','Ey'], '3.6556.2'],
  };
  const snapshots = { '2.42304.0': snapshot, '3.6556.2': path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807') };
  for (const [target, [file, bindings, version = '2.42304.0']] of Object.entries(expected)) {
    const entry = manifest.modules.find(module => module.target === target);
    const base = snapshots[version];
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, version, target);
    assert.equal(path.resolve(app, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1', entry.source), path.join(base, file), target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(base, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const output = path.resolve(app, 'src/generated/code-current', target), text = readFileSync(output, 'utf8');
    assert.equal(entry.sha256, sha(text), target);
    assert.ok(text.startsWith(`// Original Claude Desktop ${version} bindings`), target);
  }
  // The 3.6556.2 chunks import the helpers under new aliases: ts as vn (btw title), ap (= shared-25 hf) as ke (pane owner);
  // btw-focus-intent reads vendor-frame wo as p (useState) and view-tabs' compiler helpers from the concrete shared-frame (R6).
  assert.match(readFileSync(path.join(app, 'electron/generated/btw-title.mjs'), 'utf8'), /import \{ graphemeSafeLimit as vn \} from "\.\/string-grapheme-limit\.mjs"/);
  assert.match(readFileSync(path.join(app, 'src/generated/code-current/pane-focus-owner.mjs'), 'utf8'), /import \{ ownerDocument as ke \} from "\.\/owner-document\.mjs"/);
  assert.match(readFileSync(path.join(app, 'src/generated/code-current/btw-focus-intent.mjs'), 'utf8'), /import \{ useState as p \} from "react";\nimport \{\n  reactMemoCache as J9,\n  memoChanged1 as J1,\n  memoStore1 as K1,\n\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  const { extractCurrentCodeHelpers } = await import('../scripts/extract-code-ui-current.mjs');
  await extractCurrentCodeHelpers({ check: true, only: new Set(Object.keys(expected)) });
});

// w10-ccres-e31-btw (w10-trans-btw-focus): Xr / Yr over the composer registry, and P_ over a fake pane.
const official = nodePath.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
test('the 3.6556.2 originals: Xr / Yr read ni\'s registry Rr, cccc2cf0a calls them as ou / cu, and onReselect focuses P_(pane root)', async () => {
  const { readFileSync } = await import('node:fs');
  const intent = readFileSync(nodePath.join(official, 'c03935b01-yhcY34vt.js'), 'utf8'), pane = readFileSync(nodePath.join(official, 'cccc2cf0a-DhZC33Gc.js'), 'utf8');
  const tile = readFileSync(nodePath.join(official, 'c9bc99274-DTZfHMJt.js'), 'utf8');
  const count = (text, part) => text.split(part).length - 1;
  assert.equal(count(intent, 'function Yr(e){Rr.get(e)?.composerRef.current?.ignoreStrayEnter()}function Xr(e,t,n){let r=Rr.get(e)?.composerRef.current;r?Jr(r,n):qr(e,t,n)}'), 1);
  assert.equal(count(intent, 'let e={composerRef:n,keptFor:i,setInitialDraft:d};return Rr.set(t,e),Br(t,e),()=>{Rr.get(t)===e&&Rr.delete(t)}'), 1);
  assert.match(intent, /Xr as Mn,/); assert.match(intent, /Yr as On,/);
  assert.match(pane, /import\{[^}]*Mn as ou,[^}]*On as cu,[^}]*\}from"\.\/c03935b01-yhcY34vt\.js"/);
  assert.match(pane, /import\{i as P_,t as F_\}from"\.\/c9bc99274-DTZfHMJt\.js"/);
  assert.equal(count(pane, 'let t=N.current?.closest("[data-pane-root]");t&&(cu(e),P_(t)?.focus())'), 1);
  assert.equal(count(pane, 'ou(t.id,performance.now(),{afterKeyPress:!0})'), 1);
  assert.equal(count(tile, 'function b(e){return y(e)??v(e,u)}'), 1);
  assert.match(tile, /export\{b as i,p as n,d as r,a as t\}/);
  // c227f4d5e marks the composer textbox as the tile's focus target (pb = c9bc99274 a).
  assert.match(readFileSync(nodePath.join(official, 'c227f4d5e-B-FYKrwT.js'), 'utf8'), /import\{t as pb\}from"\.\/c9bc99274-DTZfHMJt\.js"[^]*"aria-multiline":"true"[^]{0,120}\[pb\]:""/);
  // The host Xr / Yr / P_ are those originals (generated; --check in NBS-1).
  const generated = readFileSync(nodePath.resolve(import.meta.dirname, '../src/generated/code-current/btw-focus-intent.mjs'), 'utf8');
  assert.match(generated, /import \{ btwComposerRegistry as Rr \} from "\.\.\/\.\.\/btw-composer-registry\.mjs";/);
  assert.doesNotMatch(generated, /var Rr\b/, 'Rr is the host adapter, not a second Map');
});
test('Xr focuses the registered composer (swallowing a keyboard Enter first) or remembers the intent; Yr only arms it', () => timing(() => {
  const id = `registered-${++serial}`, calls = [];
  const composer = { ignoreStrayEnter: () => calls.push('ignoreStrayEnter'), scheduleFocus: () => calls.push('scheduleFocus') };
  const ref = { current: composer }, unregister = registry.registerBtwComposer(id, ref);
  focusBtwSessionComposer(id, clock, { afterKeyPress: true }); assert.deepEqual(calls, ['ignoreStrayEnter', 'scheduleFocus']);
  assert.equal(consume(id), null, 'a mounted composer leaves no intent behind');
  calls.length = 0; armBtwSessionComposer(id); assert.deepEqual(calls, ['ignoreStrayEnter'], 'Yr arms without focusing');
  // ni's cleanup removes only its own entry: a newer registration for the same session survives the older cleanup.
  const newer = registry.registerBtwComposer(id, { current: null }); unregister();
  assert.equal(registry.btwComposerRegistry.has(id), true); newer(); assert.equal(registry.btwComposerRegistry.has(id), false);
  // No composer (unregistered, or its ref empty): Xr is qr, the keyboard intent waits for the next mount.
  focusBtwSessionComposer(id, clock, { afterKeyPress: true }); assert.deepEqual(consume(id), { afterKeyPress: true, askedAt: clock });
  const empty = `empty-${++serial}`, done = registry.registerBtwComposer(empty, { current: null });
  focusBtwSessionComposer(empty, clock); assert.deepEqual(consume(empty), { askedAt: clock }); done();
  assert.doesNotThrow(() => armBtwSessionComposer(`missing-${++serial}`), 'Yr with no entry does nothing');
}));
test('P_ picks the pane\'s [data-tile-focus-target] when focusable, else its first focusable text field', async () => {
  const { paneFocusTarget, tileFocusTargetAttribute } = await import('../src/generated/code-current/pane-focus-target.mjs');
  assert.equal(tileFocusTargetAttribute, 'data-tile-focus-target');
  const element = ({ tag = 'div', editable = false, tabIndex = editable ? 0 : -1, attrs = {}, hidden = false, visible = true, disabled, children = [], classes = [] } = {}) => {
    const node = { tag, tabIndex, attrs, children, focus() {}, hasAttribute: name => name in attrs, classList: { contains: name => classes.includes(name) },
      matches: selector => editable && selector.includes('[contenteditable="true"]'), closest: selector => hidden && selector.includes('[hidden]') ? node : null,
      checkVisibility: () => visible, querySelector: selector => all(node).find(child => selector === `[${tileFocusTargetAttribute}]` && tileFocusTargetAttribute in child.attrs) ?? null,
      querySelectorAll: selector => all(node).filter(child => (selector.startsWith('textarea,') ? child.tag === 'textarea' || child.editable : child.tag === 'textarea' || child.tag === 'button' || child.editable)) };
    if (disabled !== undefined) node.disabled = disabled;
    node.editable = editable; return node;
  };
  const all = node => node.children.flatMap(child => [child, ...all(child)]);
  const composer = element({ editable: true, attrs: { [tileFocusTargetAttribute]: '' } }), field = element({ tag: 'textarea', tabIndex: 0 });
  assert.equal(paneFocusTarget(element({ children: [field, composer] })), composer, 'the marked target wins over an earlier field');
  assert.equal(paneFocusTarget(element({ children: [field, element({ editable: true })] })), field, 'unmarked: the first text field in order');
  const hiddenComposer = element({ editable: true, visible: false, attrs: { [tileFocusTargetAttribute]: '' } });
  assert.equal(paneFocusTarget(element({ children: [hiddenComposer, field] })), field, 'a hidden target falls back to the visible field');
  assert.equal(paneFocusTarget(element({ children: [element({ tag: 'textarea', tabIndex: 0, disabled: true }), element({ tag: 'textarea', tabIndex: 0, hidden: true })] })), null, 'disabled or [hidden] fields are skipped');
  assert.equal(paneFocusTarget(element({ children: [element({ tag: 'button', tabIndex: 0 })] })), null, 'a button is no text field');
});
