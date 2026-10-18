import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

// R4i-graph GR2 (Y1-R3-graph-1): the host gives CDS controls their labels the way 2.42304.0's app root does
// (shared-23 UG: CdsRoot `labels: Ev()`, Ev = shared-104 Bl → zl → Rl), with the host catalog in place of react-intl.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
let server, i18n, labelsModule, frame, chatFrame, currentChatFrame;
before(async () => {
  server = await createServer({configFile:false, root:app, plugins:[react()], server:{middlewareMode:true, hmr:false, ws:false, watch:null}, appType:'custom', logLevel:'error'});
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  labelsModule = await server.ssrLoadModule('/src/cds-labels.mjs');
  frame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  chatFrame = await server.ssrLoadModule('/src/generated/chat/shared-frame-C_2npUJq.js');
  currentChatFrame = await server.ssrLoadModule('/src/generated/current-chat/shared-frame-DVFSKIcx.js');
});
after(async () => { i18n?.setLocale('en-US'); await server?.close(); });

// shared-104's label table: key → defaultMessage.
const officialTable = () => {
  const source = fs.readFileSync(path.join(reference, 'shared-104-Cqo2-vQh.js'), 'utf8');
  const start = source.indexOf('Fl=Pl({');
  const body = source.slice(start + 7, source.indexOf('});function Il(', start) + 1);
  return Object.fromEntries([...body.matchAll(/([A-Za-z]+):\{defaultMessage:"((?:[^"\\]|\\.)*)",id:"[^"]+"\}/g)].map(m => [m[1], JSON.parse(`"${m[2]}"`)]));
};

test('2.42304.0 pins: the root passes Ev() as CdsRoot labels, Ev is Bl → zl → Rl, Z reads vn with the English fallback', () => {
  const root = fs.readFileSync(path.join(reference, 'shared-23-Bu_lvvVo.js'), 'utf8');
  assert.equal(count(root, 'a=Ev(),o=AG(),[s]=f(Up),c=_g();return y(cb.Provider,{value:s,children:y(pb,{mode:t==="auto"?"system":t,font:c,router:n,labels:a,locale:o,'), 1);
  assert.equal(count(root, 'zp as Ev'), 1);
  const labels = fs.readFileSync(path.join(reference, 'shared-104-Cqo2-vQh.js'), 'utf8');
  for (const pin of ['function Bl(){let e=Ci();return w(()=>zl(e),[e])}', 'function zl(e){let t=new Map;return(n,r,i)=>{if(i!==void 0)return Rl(e,n,r,i);let a=`${n}\\0${r}`', 'let i={...Fl[t]??{id:`cds.${t}`},defaultMessage:n};return e.formatMessage(i,r)', 'if(t==="oneMessageQueuedStatus")return Il(e,1);', 'Bl as zp'])
    assert.equal(count(labels, pin), 1, pin);
  const shared = fs.readFileSync(path.join(reference, 'shared-frame-BfjMqbuN.js'), 'utf8');
  for (const pin of ['function Z(e,t,n){return bn(W(vn),e,t,n)}', 'function bn(e,t,n,r){return e?.(t,n,r)||yn(n,r)}', 'E=U(()=>c&&b?(e,t,n)=>c(e,t,n)||b(e,t,n):c??b,[c,b])'])
    assert.equal(count(shared, pin), 1, pin);
  assert.equal(Object.keys(officialTable()).length, 189);
});

test('cdsLabels answers the call site\'s English default through t(), and the counted keys through tn()', () => {
  i18n.setLocale('en-US');
  const en = labelsModule.createCdsLabels();
  assert.equal(en('clear', 'Clear'), 'Clear');
  assert.equal(en('removeItem', 'Remove {item}', {item: 'a.png'}), 'Remove a.png');
  assert.equal(en('nMessagesQueuedStatus', '{count} messages queued. Will send after the current response.', {count: 1}), '1 message queued. Will send after the current response.');
  i18n.setLocale('zh-CN');
  const zh = labelsModule.createCdsLabels();
  assert.equal(zh('clear', 'Clear'), '清除');
  assert.equal(zh('close', 'Close'), '关闭');
  assert.equal(zh('cancel', 'Cancel'), '取消');
  assert.equal(zh('moreOptions', 'More options'), '更多选项');
  assert.equal(zh('removeItem', 'Remove {item}', {item: 'a.png'}), '移除 a.png');
  assert.equal(zh('pageOfTotal', 'Page {page} of {total}', {page: 2, total: 5}), '第 2 页，共 5 页');
  assert.equal(zh('oneMessageQueuedStatus', '1 message queued. Will send after the current response.'), '已排队 1 条消息，将在当前回复结束后发送。');
  assert.equal(zh('nLanguagesFound', '{count} languages found', {count: 3}), '找到 3 种语言');
  // Rl's non-numeric count falls through to the default; a parameterless answer is cached like zl's.
  assert.equal(zh('nLanguagesFound', '{count} languages found', {count: 'x'}), '找到 x 种语言');
  let calls = 0;
  const counted = labelsModule.createCdsLabels(source => { calls += 1; return source; });
  counted('close', 'Close'); counted('close', 'Close');
  assert.equal(calls, 1);
});

test('zh-CN covers every CDS label default the generated graphs that read view-tabs vn actually call', async () => {
  const table = officialTable();
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  const generated = path.join(app, 'src/generated');
  const used = new Set();
  for (const graph of ['view-tabs', 'code-composer', 'code-routines', 'cowork-scheduled', 'routines-shared']) {
    const directory = path.join(generated, graph);
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory).filter(name => /\.m?js$/.test(name))) {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      for (const m of text.matchAll(/\(\s*"([A-Za-z]+)"\s*,\s*"((?:[^"\\]|\\.)*)"/g)) if (table[m[1]] === JSON.parse(`"${m[2]}"`)) used.add(table[m[1]]);
    }
  }
  assert.ok(used.has('Clear') && used.has('More options') && used.has('Close'));
  assert.deepEqual([...used].filter(source => !Object.hasOwn(zh, source)), []);
});

test('SSR: under the host labels, CdsTextInput clearable\'s clear button is 清除 in zh-CN and Clear without a provider', () => {
  i18n.setLocale('zh-CN');
  const input = () => h(frame.CdsTextInput, {value: 'abc', onChange() {}, placeholder: 'Filter', clearable: true});
  const zhLabels = labelsModule.createCdsLabels();
  const provided = renderToStaticMarkup(h(frame.CdsLabelsContext.Provider, {value: zhLabels}, input()));
  assert.match(provided, /aria-label="清除"/);
  assert.doesNotMatch(provided, /aria-label="Clear"/);
  // A nested CdsRoot without labels (the Code composer's) chains to the outer provider (Za's c??b).
  const nested = renderToStaticMarkup(h(frame.CdsLabelsContext.Provider, {value: zhLabels}, h(frame.CdsRoot, {density: 'compact', className: 'contents'}, input())));
  assert.match(nested, /aria-label="清除"/);
  assert.match(renderToStaticMarkup(input()), /aria-label="Clear"/);
});

test('main.jsx provides the host labels at the app root, around every window, and the Code composer\'s CdsRoot passes none', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'import { CdsLabelsContext } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";'), 1);
  assert.equal(count(main, 'import { cdsLabels } from "./cds-labels.mjs";'), 1);
  const render = main.slice(main.indexOf('createRoot(document.getElementById("root")).render('));
  // R4i-graph fix: the chat / current-chat graphs' own labels contexts (Ft / mn) are provided at the same root.
  assert.equal(count(main, 'import { Ft as ChatCdsLabelsContext } from "./generated/chat/shared-frame-C_2npUJq.js";'), 1);
  assert.equal(count(main, 'import { mn as CurrentChatCdsLabelsContext } from "./generated/current-chat/shared-frame-DVFSKIcx.js";'), 1);
  assert.match(render, /^createRoot\(document\.getElementById\("root"\)\)\.render\(\n(?:\s*\/\/[^\n]*\n)*\s*<CdsLabelsContext\.Provider value=\{cdsLabels\}><ChatCdsLabelsContext\.Provider value=\{cdsLabels\}><CurrentChatCdsLabelsContext\.Provider value=\{cdsLabels\}><SourceToastProvider>/);
  assert.match(render, /<\/SourceToastProvider><\/CurrentChatCdsLabelsContext\.Provider><\/ChatCdsLabelsContext\.Provider><\/CdsLabelsContext\.Provider>,\n\);/);
  assert.equal(count(main, '<CdsLabelsContext.Provider value='), 1);
  assert.equal(count(main, '<ChatCdsLabelsContext.Provider value='), 1);
  assert.equal(count(main, '<CurrentChatCdsLabelsContext.Provider value='), 1);
  assert.equal(count(main, 'labels={'), 0);
});

// R4i-graph fix (review finding: CDS labels reached only view-tabs vn): the two Chat graphs are older chunks with their own
// labels context and the same reader shape; nothing in them provides it, so the host root provides each.
test('chat / current-chat: their labels context is the one their Z reads, nothing in the graph provides it, and the host labels answer in zh-CN', () => {
  for (const [dir, file, context, reader] of [
    ['chat', 'shared-frame-C_2npUJq.js', 'Ft', 'function Z(e,t,n){return Lt(A(Ft),e,t,n)}'],
    ['current-chat', 'shared-frame-DVFSKIcx.js', 'mn', 'function Z(e,t,n){return gn(r(mn),e,t,n)}'],
  ]) {
    const directory = path.join(app, 'src/generated', dir);
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    assert.equal(count(text, `var ${context}=`), 1, dir);
    assert.equal(count(text, reader), 1, dir);
    for (const other of fs.readdirSync(directory).filter(name => /\.m?js$/.test(name)))
      assert.equal(count(fs.readFileSync(path.join(directory, other), 'utf8'), `${context}.Provider`), 0, `${dir}/${other}`);
  }
  i18n.setLocale('zh-CN');
  const zhLabels = labelsModule.createCdsLabels();
  for (const graph of [chatFrame, currentChatFrame]) {
    const context = graph === chatFrame ? graph.Ft : graph.mn;
    const Probe = () => h('span', null, graph.Z('clear', 'Clear'), '|', graph.Z('removeItem', 'Remove {item}', {item: 'a.txt'}));
    assert.equal(renderToStaticMarkup(h(context.Provider, {value: zhLabels}, h(Probe))), `<span>${i18n.t('Clear')}|${i18n.t('Remove {item}', {item: 'a.txt'})}</span>`);
    assert.match(renderToStaticMarkup(h(context.Provider, {value: zhLabels}, h(Probe))), /清除/);
    assert.equal(renderToStaticMarkup(h(Probe)), '<span>Clear|Remove a.txt</span>');
  }
  i18n.setLocale('en-US');
});

test('zh-CN covers every CDS label key the chat / current-chat graphs call with a literal or table default', () => {
  const table = officialTable();
  return import('../electron/i18n/zh-CN/index.mjs').then(({default: zh}) => {
    const used = new Set();
    for (const dir of ['chat', 'current-chat']) {
      const directory = path.join(app, 'src/generated', dir);
      for (const file of fs.readdirSync(directory).filter(name => /\.m?js$/.test(name))) {
        const text = fs.readFileSync(path.join(directory, file), 'utf8');
        for (const m of text.matchAll(/\(\s*"([A-Za-z]+)"\s*,\s*"((?:[^"\\]|\\.)*)"/g)) if (Object.hasOwn(table, m[1])) used.add(JSON.parse(`"${m[2]}"`));
      }
    }
    // current-chat shared-5's drop overlay reads oo("dropFilesHere", Nf.dropFilesHere) with Nf.dropFilesHere "Drop files here".
    const shared5 = fs.readFileSync(path.join(app, 'src/generated/current-chat/shared-5-DXmEIvP_.js'), 'utf8');
    assert.equal(count(shared5, 'oo("dropFilesHere",Nf.dropFilesHere)'), 1);
    assert.equal(count(shared5, 'Nf={dropFilesHere:"Drop files here"'), 1);
    used.add('Drop files here');
    assert.ok(used.has('Clear') && used.has('Loading') && used.has('Previous month'));
    assert.deepEqual([...used].filter(source => !Object.hasOwn(zh, source)), []);
  });
});

// R4i-graph fix (GR3 followUp 2): the attachment tiles read two labels through a table default (G("key", Mf.key)), which
// the literal-only scan above cannot see; both are the official Fl defaults and have zh-CN text.
test('zh-CN covers the Code composer attachment tiles\' table-default labels (uploadFailed, playVideo)', async () => {
  const table = officialTable();
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  const tiles = fs.readFileSync(path.join(app, 'src/generated/code-composer/chat-composer-attachments.mjs'), 'utf8');
  assert.equal(count(tiles, 'G("uploadFailed", Mf.uploadFailed)'), 1);
  assert.equal(count(tiles, 'G("playVideo", Mf.playVideo, { item: m })'), 1);
  for (const key of ['uploadFailed', 'playVideo']) {
    assert.equal(count(tiles, `${key}: ${JSON.stringify(table[key])}`), 1, key);
    assert.ok(Object.hasOwn(zh, table[key]), table[key]);
  }
});
