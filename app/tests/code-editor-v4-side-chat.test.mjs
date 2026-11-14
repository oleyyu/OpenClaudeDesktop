// The staged 4.16336.0 code-editor graph, side-chat area (round 2 unit code-editor:b; scripts/code-editor-v4-gen/side-chat.mjs):
// area record and manifest shape, the D1 links (no copy of the shared-212 module state turn-plan-v4 holds, the label hold
// hook from working-line-v4, cds-core public names), and each adapter's behaviour compared with the 3.6556.2 production
// adapter of the same name (same export names; every difference asserted here is a 4.16336.0 change).
// Byte-for-byte regeneration is `node scripts/extract-code-editor-v4.mjs --check` (verify-gen-code-editor-v4.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ionSource, referenceVersion } from '../scripts/official-4.16336.0.mjs';
import * as v4context from '../src/generated/code-editor-v4/side-chat-context.mjs';
import * as oldContext from '../src/generated/code-editor/side-chat-context.mjs';
import * as v4scroll from '../src/generated/code-editor-v4/side-chat-scroll.mjs';
import * as oldScroll from '../src/generated/code-editor/side-chat-scroll.mjs';
import * as v4segments from '../src/generated/code-editor-v4/side-chat-user-segments.mjs';
import * as oldSegments from '../src/generated/code-editor/side-chat-user-segments.mjs';
import * as v4render from '../src/generated/code-editor-v4/side-chat-user-render.mjs';
import * as oldRender from '../src/generated/code-editor/side-chat-user-render.mjs';
import * as v4secrets from '../src/generated/code-editor-v4/side-chat-secrets.mjs';
import * as oldSecrets from '../src/generated/code-editor/side-chat-secrets.mjs';
import * as v4activity from '../src/generated/code-editor-v4/side-chat-activity.mjs';
import * as oldActivity from '../src/generated/code-editor/side-chat-activity.mjs';
import * as v4chrome from '../src/generated/code-editor-v4/side-chat-chrome.mjs';
import * as oldChrome from '../src/generated/code-editor/side-chat-chrome.mjs';
import * as v4attachments from '../src/generated/code-editor-v4/side-chat-attachments.mjs';
import * as v4pane from '../src/generated/code-editor-v4/side-chat-pane-events.mjs';
import * as v4selection from '../src/generated/code-editor-v4/transcript-selection.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/code-editor-v4');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(read('src/generated/code-editor-v4/manifest.json'));
const area = JSON.parse(read('src/generated/code-editor-v4/areas/side-chat.json'));
const SIDE_CHAT = ['side-chat-context.mjs', 'transcript-selection.mjs', 'side-chat-scroll.mjs', 'side-chat-status.mjs', 'side-chat-user-segments.mjs',
  'side-chat-user-render.mjs', 'side-chat-secrets.mjs', 'side-chat-activity.mjs', 'side-chat-chrome.mjs', 'side-chat-attachments.mjs', 'side-chat-pane-events.mjs'];
const exportsOf = mod => Object.keys(mod).sort();
// Modules whose closures reach a host .jsx adapter (the 3.6556.2 view-tabs frame; working-line-v4's host adapters behind the
// linked hold hook) load through Vite SSR (middleware mode, no listening socket), as tests/side-chat-markup.test.mjs does.
let server, oldAttachments, oldPane, v4status, oldStatus, oldSelection;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  [oldAttachments, oldPane, v4status, oldStatus, oldSelection] = await Promise.all(['code-editor/side-chat-attachments.mjs', 'code-editor/side-chat-pane-events.mjs',
    'code-editor-v4/side-chat-status.mjs', 'code-editor/side-chat-status.mjs', 'code-editor/transcript-selection.mjs'].map(f => server.ssrLoadModule(`/src/generated/${f}`)));
});
after(() => server?.close());

test('area record: 11 adapters, 4.16336.0 sources, renderer realm; geometry and persistence have no 4.16336.0 declaration', () => {
  assert.ok(manifest.areas.includes('side-chat'));
  assert.equal(area.referenceVersion, referenceVersion);
  assert.deepEqual(area.adapters.map(entry => entry.name), SIDE_CHAT);
  for (const entry of area.adapters) {
    assert.equal(sha(fs.readFileSync(path.join(dir, entry.name))), entry.sha256, entry.name);
    assert.equal(entry.realm, 'renderer');
    for (const ref of entry.sources) { assert.equal(ref.base, 'ion'); assert.equal(sha(fs.readFileSync(path.join(ionSource, ref.name))), ref.sha256, `${entry.name} ${ref.name}`); }
    assert.ok(entry.bindings.length > 0, entry.name);
    const m = manifest.modules.find(x => x.name === entry.name);
    assert.deepEqual(m.bindings, entry.bindings.map(b => ({ name: b.name, file: b.file, sha256: b.sha256 })));
    assert.equal(m.electron, undefined);
  }
  for (const gone of ['side-chat-geometry.mjs', 'side-chat-persistence.mjs']) assert.equal(fs.existsSync(path.join(dir, gone)), false, gone);
  // The snippet chip item waits for the Pierre diff renderer (its chip popup's diff branch).
  const attachments = area.adapters.find(e => e.name === 'side-chat-attachments.mjs');
  assert.match(attachments.roots['@pending'].messageContextChipItem.blockedOn, /pierre-changes-v4/);
  assert.deepEqual(exportsOf(v4attachments), ['messageAttachmentsClass']);
});

test('D1: shared-212 module state is linked from turn-plan-v4, the hold hook from working-line-v4, owner window / mac / element from cds-core', () => {
  const copied = new Set(area.adapters.flatMap(e => e.bindings.map(b => `${b.file}#${b.name}`)));
  for (const local of ['Fd', 'Id', 'Bd', 'Vd']) assert.equal(copied.has(`shared-212-BHMAi0oa.js#${local}`), false, local);
  const links = area.adapters.flatMap(e => (e.roots['@links'] ?? []).map(l => [e.name, l]));
  const has = (name, binding, module) => links.some(([n, l]) => n === name && l.binding === binding && l.module === module);
  assert.ok(has('side-chat-status.mjs', 'c96d752d0-D9VB6ArX.js#pP', '../working-line-v4/working-line.mjs'));
  assert.ok(has('side-chat-user-segments.mjs', 'shared-212-BHMAi0oa.js#ff', '../turn-plan-v4/shared-212.mjs'));
  assert.ok(has('transcript-selection.mjs', 'shared-25-D-aF0gt9.js#_d', '../cds-core/shared-25.mjs'));
  assert.ok(has('side-chat-pane-events.mjs', 'shared-62-DoCqVpIq.js#Za', '../cds-core/shared-62.mjs'));
  for (const name of SIDE_CHAT) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    // W8-RT (cds-integrate/wave8: r3b-tasks is the single owner of shared-212 j_ / M_ / yv / Cv / Dv / kv; side-chat.mjs
    // linkedGraphs r3b-tasks invisible-character.mjs): the 4.16336.0 r3b-tasks graph joins the linked graphs
    // (was: cds-core / turn-plan-v4 / working-line-v4 / routines-shared-v4).
    assert.doesNotMatch(text, /from ["']\.\.\/(?!cds-core\/|turn-plan-v4\/|working-line-v4\/|routines-shared-v4\/|r3b-tasks\/)/, `${name} imports only cds-core and the linked 4.16336.0 graphs`);
    assert.doesNotMatch(text, /\.\.\/(view-tabs|code-editor|working-line|r4e-findings|mcp-app-host|routines-shared)\//, `${name} links no 3.6556.2 graph`);
  }
});

test('context: same wire question / parser / limit as 3.6556.2', () => {
  assert.deepEqual(exportsOf(v4context), exportsOf(oldContext));
  assert.equal(v4context.sideChatContextLimit, 1500);
  for (const [question, selection] of [['Why?', 'const a = 1;\nconst b = 2;'], ['ask @claude', 'line with --> and | pipes\r\nnext'], ['', 'x']]) {
    const wire = v4context.sideChatContextQuestion(question, selection);
    assert.equal(wire, oldContext.sideChatContextQuestion(question, selection));
    assert.deepEqual(v4context.parseSideChatQuestion(wire), oldContext.parseSideChatQuestion(wire));
  }
  const long = 'a'.repeat(1499) + '\u{1F600}tail';
  assert.equal(v4context.truncateSideChatContext(long, 1500), oldContext.truncateSideChatContext(long, 1500));
  assert.equal(v4context.truncateSideChatContext(long, 1500).at(-1), '…');
});

function scrollFixture(mod, queued = {}) {
  const state = { current: mod.emptySideChatScroll }, calls = [];
  const node = { scrollTop: 0, scrollHeight: 800, clientHeight: 200, questionTops: [20, 300], getBoundingClientRect: () => ({ top: 50 }),
    querySelectorAll() { const q = this.questionTops.map(top => ({ getBoundingClientRect: () => ({ top: 50 + top - this.scrollTop }) })); return { length: q.length, item: i => q[i] ?? null }; },
    scrollTo(options) { calls.push(options); this.scrollTop = Math.max(0, Math.min(options.top, this.scrollHeight - this.clientHeight)); } };
  const messages = { a: [{ role: 'user' }, { role: 'assistant' }, { role: 'user' }, { role: 'assistant' }] };
  const store = { getState: () => ({ messagesBySession: messages, queuedBySession: queued }) };
  return { node, calls, sync: () => mod.syncSideChatScroll({ current: node }, 'a', store, state) };
}
test('scroll: same anchoring as 3.6556.2; 4.16336.0 anchors the turn before a queued question', () => {
  assert.deepEqual(exportsOf(v4scroll), exportsOf(oldScroll));
  assert.deepEqual(v4scroll.emptySideChatScroll, oldScroll.emptySideChatScroll);
  const a = scrollFixture(v4scroll), b = scrollFixture(oldScroll);
  a.sync(); b.sync();
  assert.equal(a.node.scrollTop, 292); assert.equal(a.node.scrollTop, b.node.scrollTop);
  a.node.scrollHeight += 400; b.node.scrollHeight += 400; a.sync(); b.sync();
  assert.equal(a.node.scrollTop, b.node.scrollTop);
  const q = scrollFixture(v4scroll, { a: 'queued text' });
  q.sync();
  assert.equal(q.node.scrollTop, 12, 'the question before the queued one sits 8px below the top');
});

test('user segments and renderer: same segments as 3.6556.2; markup differs only by the shipped text-prose typography', () => {
  for (const text of ['hello', '* one\n* two\n   * nested\nafter', '1. a\n2. b', 'line1\nline2', '']) {
    assert.deepEqual(v4segments.parseSideChatUserText(text), oldSegments.parseSideChatUserText(text), JSON.stringify(text));
    const segments = v4segments.parseSideChatUserText(text);
    const v4html = renderToStaticMarkup(React.createElement(React.Fragment, null, segments.map((s, i) => v4render.renderSideChatUserSegment(s, i, t => v4render.sideChatTextBreaks(t)))));
    const oldHtml = renderToStaticMarkup(React.createElement(React.Fragment, null, segments.map((s, i) => oldRender.renderSideChatUserSegment(s, i, t => oldRender.sideChatTextBreaks(t)))));
    // 4.16336.0 ships the user-text typography (c96d752d0 yO: text-body -> text-prose unconditionally; 3.6556.2 read the
    // fizzy-lake "type" part, off locally).
    assert.equal(v4html, oldHtml.replaceAll('class="text-body whitespace-pre-wrap', 'class="text-prose whitespace-pre-wrap').replaceAll('epitaxy-user-list text-body ', 'epitaxy-user-list text-prose '), JSON.stringify(text));
  }
});

test('secrets: detector and masks agree with 3.6556.2 on keys and plain text', () => {
  assert.deepEqual(exportsOf(v4secrets), exportsOf(oldSecrets));
  const key = 'sk-ant-api03-' + 'A1b2C3d4E5f6G7h8I9j0'.repeat(4) + 'AA';
  for (const text of [`token ${key} end`, 'nothing secret here', `ghp_${'a1B2'.repeat(9)}`]) {
    assert.deepEqual(v4secrets.detectSideChatSecrets(text), oldSecrets.detectSideChatSecrets(text), text);
    assert.equal(v4secrets.maskSideChatSecrets(text), oldSecrets.maskSideChatSecrets(text), text);
  }
  assert.equal(v4secrets.maskSideChatSecret(key), oldSecrets.maskSideChatSecret(key));
  assert.ok(v4secrets.detectSideChatSecrets(`x ${key}`).length === 1);
});

test('activity / chrome / pane events / attachments class: same values as 3.6556.2', () => {
  const intl = { formatMessage: (m, v) => m.defaultMessage.replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? '') };
  for (const tool of [{ tool: 'Read', detail: 'a.js' }, { tool: 'Read' }, { tool: 'Grep', detail: 'x' }, { tool: 'Glob' }, { tool: 'Bash', detail: 'ls' }, { tool: 'Other' }])
    assert.equal(v4activity.sideChatToolAnnouncement(tool, intl), oldActivity.sideChatToolAnnouncement(tool, intl), tool.tool);
  assert.deepEqual(exportsOf(v4chrome), exportsOf(oldChrome));
  for (const name of exportsOf(oldChrome)) assert.equal(v4chrome[name], oldChrome[name], name);
  assert.equal(v4attachments.messageAttachmentsClass, oldAttachments.messageAttachmentsClass);
  assert.deepEqual(exportsOf(v4pane), exportsOf(oldPane));
  const event = ({ button, ctrlKey = false, inButton = true, focusInHeader = false }) => {
    const header = { contains: n => n === buttonEl || (focusInHeader && n === active), ownerDocument: {} };
    const buttonEl = {};
    const active = { nodeType: 1, tagName: 'DIV', isContentEditable: false, closest: () => null, getAttribute: () => null };
    header.ownerDocument.activeElement = active;
    const target = { nodeType: 1, closest: sel => (sel === 'button' && inButton ? buttonEl : null) };
    let prevented = false;
    return { e: { currentTarget: header, target, button, ctrlKey, defaultPrevented: false, preventDefault() { prevented = true; } }, prevented: () => prevented };
  };
  for (const spec of [{ button: 2 }, { button: 0 }, { button: 2, inButton: false }]) {
    const a = event(spec), b = event(spec);
    v4pane.paneHeaderMouseDown(a.e); oldPane.paneHeaderMouseDown(b.e);
    assert.equal(a.prevented(), b.prevented(), JSON.stringify(spec));
  }
});

test('status and selection hooks render through React (compiled hooks, React from its real module)', () => {
  const Status = ({ mod, label, working }) => React.createElement('span', null, String(mod.useSideChatStatusLabel(label, true, working)));
  for (const [label, working] of [['Reading a.js', true], [null, false]]) {
    assert.equal(renderToStaticMarkup(React.createElement(Status, { mod: v4status, label, working })), renderToStaticMarkup(React.createElement(Status, { mod: oldStatus, label, working })));
  }
  const Sel = ({ mod }) => { const r = mod.useTranscriptSelection({ current: null }, {}); return React.createElement('i', null, `${r.text}|${r.range}|${typeof r.clearSelection}|${typeof r.hideTooltip}`); };
  assert.equal(renderToStaticMarkup(React.createElement(Sel, { mod: v4selection })), renderToStaticMarkup(React.createElement(Sel, { mod: oldSelection })));
});
