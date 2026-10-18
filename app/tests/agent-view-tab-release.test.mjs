import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { attachTabFocusRelease } from '../src/generated/code-current/tab-focus-release.mjs';
import { createStickToBottom } from '../src/task-output-follow.mjs';
import { classifyKeyScroll, keyScrollIntentMs } from '../src/generated/code-current/tab-focus-key-scroll.mjs';

// TT-05 / tasks-01: the sub-agent view (Ow, cccc2cf0a; follow hook c7f8992b4 T) never lets go of the tail at a
// keydown — T only records a classified "up" (`n === "up" && (I.current = performance.now())`). Whether the
// Tab moved focus above the viewport is decided by attachTabFocusRelease (c9f414608 i), mounted on the scroller.
// R3-topbar TT-05: the other up keys only record the intent too; the upward scroll within `re` = 1e3 lets go. The
// classifier is c7f8992b4 C itself (cccc2cf0a mO `classifyKeyScroll:$o`, `n as $o`), generated as tab-focus-key-scroll.
const ROOT = path.resolve(import.meta.dirname, '..');
let server, A;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-agent.jsx');
});
after(() => server?.close());

const target = (editable = false) => ({ nodeType: 1, closest: (selector) => (editable && /textarea/.test(selector) ? {} : null) });
const key = (key, options = {}) => ({ key, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, target: target(), ...options });

// A scroller on a document that records its capture-phase keydown listeners (T: `p.addEventListener("keydown",_,{capture:!0})`).
function keyHost() {
  const listeners = new Set();
  const body = { nodeType: 1, closest: () => null };
  const doc = { body, addEventListener: (type, fn, options) => { assert.equal(type, 'keydown'); assert.equal(options?.capture, true); listeners.add(fn); },
    removeEventListener: (type, fn, options) => { assert.equal(options?.capture, true); listeners.delete(fn); } };
  const inside = new Set();
  const scroller = { ownerDocument: doc, contains: (node) => node === scroller || inside.has(node) };
  const own = (node) => { inside.add(node); return node; };
  return { doc, body, scroller, own, listeners, press: (event) => { for (const fn of [...listeners]) fn(event); } };
}

test('c7f8992b4 C (generated): the sub-agent classifier reads up keys as the source does', () => {
  const host = keyHost(), row = host.own(target()), field = host.own(target(true)), outside = target();
  const up = (name, options = {}) => classifyKeyScroll(key(name, { target: row, ...options }), host.scroller);
  for (const name of ['ArrowUp', 'PageUp', 'Home']) assert.equal(up(name), 'up', name);
  assert.equal(up(' ', { shiftKey: true }), 'up', 'Shift+Space reads as up');
  assert.equal(up(' '), 'down');
  for (const name of ['ArrowDown', 'PageDown', 'End']) assert.equal(up(name), 'down', name);
  assert.equal(up('ArrowUp', { metaKey: true }), 'up', 'he: Cmd+ArrowUp still reads as up');
  assert.equal(up('Home', { ctrlKey: true }), 'up');
  assert.equal(up('PageUp', { metaKey: true }), 'none');
  assert.equal(up('ArrowUp', { target: field }), 'none', 'an editable target keeps following');
  assert.equal(up('ArrowUp', { target: outside }), 'none', 'a key aimed elsewhere is not the transcript\'s');
  assert.equal(up('ArrowUp', { target: host.body }), 'up', 'the body counts as the transcript\'s');
  assert.equal(up('Tab', { shiftKey: true, target: outside }), 'up', 'Shift+Tab is read before the target checks');
  assert.equal(up('Tab'), 'none');
  assert.equal(up('Tab', { shiftKey: true, metaKey: true }), 'none');
  assert.equal(keyScrollIntentMs, 1000);
});

test('attachSubagentKeyIntent: a classified up key only records the intent while pinned, and never releases', () => {
  const host = keyHost(), row = host.own(target());
  const calls = { intent: 0, release: 0 };
  const follow = { pinned: true, intent: () => { calls.intent += 1; }, release: () => { calls.release += 1; } };
  const detach = A.attachSubagentKeyIntent(host.scroller, follow);
  assert.equal(host.listeners.size, 1);
  for (const name of ['ArrowUp', 'PageUp', 'Home']) host.press(key(name, { target: row }));
  host.press(key(' ', { shiftKey: true, target: row }));
  host.press(key('Tab', { shiftKey: true, target: target() }));
  assert.equal(calls.intent, 5);
  host.press(key('ArrowDown', { target: row }));
  host.press(key('ArrowUp', { target: host.own(target(true)) }));
  host.press(key('Tab', { target: row }));
  assert.equal(calls.intent, 5, 'down keys, editable targets and Tab record nothing');
  follow.pinned = false;
  host.press(key('ArrowUp', { target: row }));
  assert.equal(calls.intent, 5, 'T reads the intent only while pinned');
  assert.equal(calls.release, 0, 'no key releases at keydown');
  detach();
  assert.equal(host.listeners.size, 0);
});

test('controlled: within keyScrollIntentMs an upward scroll past 2px lets go; later the 16px threshold holds again', () => {
  let clock = 5000;
  const host = keyHost(), row = host.own(target());
  const node = Object.assign(host.scroller, { scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });
  node.ownerDocument.defaultView = { getSelection: () => null };
  const follow = createStickToBottom({ intentMs: keyScrollIntentMs, now: () => clock });
  follow.snap(node);
  const detach = A.attachSubagentKeyIntent(node, follow);
  // An ArrowUp that scrolls nothing keeps following: new output still lands at the bottom.
  host.press(key('ArrowUp', { target: row }));
  node.scrollHeight = 1100; follow.follow(node);
  assert.equal(follow.pinned, true); assert.equal(node.scrollTop, 900);
  // The browser's arrow scroll (smooth: its first frame moves 8px) right after the key: the reader's, unpins.
  host.press(key('ArrowUp', { target: row }));
  clock += 120; node.scrollTop = 892;
  assert.equal(follow.scrolled(node), false, 'gap 8 > 2 inside the intent window');
  node.scrollHeight = 1300; follow.follow(node);
  assert.equal(node.scrollTop, 892, 'unpinned: streaming output no longer pulls it back');
  // Pinned again at the bottom: the intent is gone (Y(!0) resets I).
  node.scrollTop = 1100; assert.equal(follow.scrolled(node), true);
  node.scrollTop = 1092; assert.equal(follow.scrolled(node), true, 'no intent: within 16px stays pinned');
  follow.follow(node); assert.equal(node.scrollTop, 1100);
  // Past the window the old threshold applies again.
  host.press(key('PageUp', { target: row }));
  clock += keyScrollIntentMs; node.scrollTop = 1092;
  assert.equal(follow.scrolled(node), true, 'an intent older than re no longer counts');
  // An upward scroll whose event has not arrived before the next resnap, inside the window, keeps its place.
  follow.follow(node); assert.equal(node.scrollTop, 1100);
  host.press(key('Home', { target: row }));
  clock += 10; node.scrollTop = 1090; node.scrollHeight = 1500; follow.follow(node);
  assert.equal(follow.pinned, false); assert.equal(node.scrollTop, 1090);
  detach();
});

// The same wiring as useSubagentFollow: attachSubagentKeyIntent + attachTabFocusRelease on the scroller, both on one
// createStickToBottom follow.
function fixture() {
  const document = new EventTarget(), view = new EventTarget(), scroller = new EventTarget();
  document.defaultView = view;
  view.AbortController = AbortController;
  view.getComputedStyle = () => ({ scrollPaddingTop: '0px' });
  Object.assign(scroller, { ownerDocument: document, scrollTop: 600, scrollHeight: 1000, clientHeight: 400,
    getBoundingClientRect: () => ({ top: 100, bottom: 500 }) });
  const follow = createStickToBottom();
  follow.snap(scroller);
  let releases = 0;
  const release = follow.release.bind(follow);
  follow.release = () => { releases += 1; release(); };
  const detachKeys = A.attachSubagentKeyIntent(scroller, follow);
  const detachTab = attachTabFocusRelease(scroller, { isPinned: () => follow.pinned, setPinned: (value) => { if (!value) follow.release(); } });
  const dispose = () => { detachKeys(); detachTab(); };
  const press = (options) => {
    const event = new Event('keydown', { cancelable: true });
    const { target: _target, ...fields } = key('Tab', { shiftKey: true, ...options });
    Object.assign(event, fields); // the dispatched event's own target (the document) stands in for the focused row
    document.dispatchEvent(event); // attachSubagentKeyIntent and the helper's keydown both listen on the document
  };
  const focus = (top) => {
    const element = { nodeType: 1, closest: () => null, getBoundingClientRect: () => ({ top, bottom: top + 20, height: 20 }) };
    document.activeElement = element;
    const event = new Event('focusin');
    Object.defineProperty(event, 'target', { value: element });
    document.dispatchEvent(event);
    scroller.dispatchEvent(event);
  };
  return { follow, press, focus, dispose, releases: () => releases };
}

test('controlled events: Shift+Tab to a visible row keeps following; to a row above the viewport releases once via the helper', () => {
  const visible = fixture();
  visible.press();
  assert.equal(visible.releases(), 0, 'nothing released at keydown');
  visible.focus(300);
  assert.equal(visible.follow.pinned, true);
  assert.equal(visible.releases(), 0);
  visible.dispose();

  const above = fixture();
  above.press();
  assert.equal(above.follow.pinned, true, 'still pinned after the keydown');
  above.focus(40);
  assert.equal(above.follow.pinned, false, 'attachTabFocusRelease let go of the tail');
  assert.equal(above.releases(), 1);
  above.dispose();
});

test('source: keys go through attachSubagentKeyIntent (generated C) on the document, no keydown release, helper mounted', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/source-agent.jsx'), 'utf8');
  assert.match(source, /import \{classifyKeyScroll,keyScrollIntentMs\} from '\.\/generated\/code-current\/tab-focus-key-scroll\.mjs';/);
  assert.match(source, /if\(follow\.pinned&&classifyKeyScroll\(event,scroller\)==='up'\)follow\.intent\(\);/);
  assert.match(source, /doc\.addEventListener\('keydown',keydown,\{capture:true\}\)/);
  assert.match(source, /createStickToBottom\(\{intentMs:keyScrollIntentMs\}\)/);
  assert.match(source, /const detachKeys=attachSubagentKeyIntent\(scroller\.current,follow\.current\);/);
  assert.doesNotMatch(source, /onKeyDown:event=>\{if\(subagentKeyReleases/, 'the keydown release is gone');
  assert.doesNotMatch(source, /subagentKeyReleases|UP_KEYS/);
  assert.match(source, /attachTabFocusRelease\(scroller\.current,\{isPinned:\(\)=>follow\.current\.pinned,setPinned:value=>\{if\(!value\)follow\.current\.release\(\);\}\}\)/);
});

test('manifest: tab-focus-key-scroll is c7f8992b4 C / g / v / he / re from 2.42304.0', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/code-current/manifest.json'), 'utf8'));
  const entry = manifest.modules.find((module) => module.target === 'tab-focus-key-scroll.mjs');
  assert.equal(entry.referenceVersion, '2.42304.0');
  assert.match(entry.source, /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\/c7f8992b4-BX_ywd4_\.js$/);
  assert.deepEqual(entry.bindings, ['g', 'v', 'he', 'C', 're']);
  const reference = path.resolve(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const raw = fs.readFileSync(path.join(reference, path.basename(entry.source)));
  assert.equal(createHash('sha256').update(raw).digest('hex'), entry.sourceSha256);
  const generated = fs.readFileSync(path.join(ROOT, 'src/generated/code-current/tab-focus-key-scroll.mjs'));
  assert.equal(createHash('sha256').update(generated).digest('hex'), entry.sha256);
  const text = raw.toString();
  // C and its intent consumers in the shipped chunk; the sub-agent view hands C to the follow hook.
  for (const needle of ['var he=new Set(["ArrowUp","Home"]);function C(e,t){if((e.ctrlKey||e.altKey||e.metaKey)&&!he.has(e.key))return"none";if(e.key==="Tab")return e.shiftKey?"up":"none";',
    're=1e3,', 'n==="up"&&(I.current=performance.now())', 'ae=u-I.current<re']) assert.ok(text.includes(needle), needle);
  const subagent = fs.readFileSync(path.join(reference, 'cccc2cf0a-B0D--VZp.js'), 'utf8');
  assert.ok(subagent.includes('import{n as $o,r as es}from"./c7f8992b4-BX_ywd4_.js"'));
  assert.ok(subagent.includes('es({initialPinned:!1,getScrollElement:n,adjustmentAtRef:r,classifyKeyScroll:$o,'));
});
