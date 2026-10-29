// w13-close-chat-messages (plan-w13-closeout G4b): the Chat message area's closeout — a prompt's Edit and its versions
// (chatfn-branches-03), versions placed by the core's turn order (chatfn-branches-04), the Chat thought always shown and a
// search run labelled over its count (chatui-thinking-search-01/03), the message testids (chatui-message-actions-01), the
// reply's Timestamp (chatui-message-actions-02), kM's selection check and Retry with the turn's files
// (chatui-message-actions-03), the incognito disclaimer, and the "lastMessage" focus region (jump_to_last_message).
// Source only: SSR through Vite, pure models, a fake core for the version service, the 3.6556.2 originals read as text.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { addVariant, humanNodeAt, normalizeGroups, turnIndexIn, versionsAt } from '../src/chat-branches-model.mjs';
import { createChatBranches } from '../electron/chat-branches.mjs';
import { LAST_MESSAGE_SELECTOR, REGION_ORDER, JUMP_COMMANDS, lastFeedArticle } from '../src/focus-region-model.mjs';
import { chatRowState, chatSearchRun, chatThinkingRow } from '../src/chat-thinking-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, actions, userActions, thinking, edit;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  actions = await server.ssrLoadModule('/src/source-chat-message-actions.jsx');
  userActions = await server.ssrLoadModule('/src/source-user-actions.jsx');
  thinking = await server.ssrLoadModule('/src/source-chat-thinking.jsx');
  edit = await server.ssrLoadModule('/src/source-user-message-edit.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

// ---------------------------------------------------------------- chatfn-branches-03 / -04: the model

test('model: an edit is a new sibling of the prompt, a Retry a new sibling of the reply under the same prompt', () => {
  // r: t0 t1 t2. v1 = Retry of t1 (reply sibling), v2 = edit of t1 (prompt sibling), v3 = Retry of v2's t1.
  let groups = addVariant({}, { parent: 'r', id: 'v1', anchor: 1 });
  groups = addVariant(groups, { parent: 'r', id: 'v2', anchor: 1, kind: 'edit' });
  groups = addVariant(groups, { parent: 'v2', id: 'v3', anchor: 1 });
  groups = normalizeGroups(JSON.parse(JSON.stringify(groups)));
  assert.deepEqual(groups.r.members.map((m) => m.kind ?? 'retry'), ['retry', 'retry', 'edit', 'retry']);
  const group = groups.r;
  assert.equal(humanNodeAt(group, 'v1', 1), 'r');
  assert.equal(humanNodeAt(group, 'v3', 1), 'v2');
  assert.equal(humanNodeAt(group, 'v1', 0), 'r');
  // Prompt versions (lI with sender "human"): r's prompt and v2's, whichever reply each shows.
  assert.deepEqual(versionsAt(groups, 'r', 1, { sender: 'human' }), { selectedOption: 0, nOptions: 2, previous: null, next: 'v2' });
  assert.deepEqual(versionsAt(groups, 'v1', 1, { sender: 'human' }), { selectedOption: 0, nOptions: 2, previous: null, next: 'v2' });
  assert.deepEqual(versionsAt(groups, 'v3', 1, { sender: 'human' }), { selectedOption: 1, nOptions: 2, previous: 'r', next: null });
  // Reply versions: under r's prompt r and v1; under v2's prompt v2 and v3.
  assert.deepEqual(versionsAt(groups, 'v1', 1), { selectedOption: 1, nOptions: 2, previous: 'r', next: null });
  assert.deepEqual(versionsAt(groups, 'v2', 1), { selectedOption: 0, nOptions: 2, previous: null, next: 'v3' });
  // Other turns have one version; a group without edits keeps the earlier reply-only reading.
  assert.equal(versionsAt(groups, 'r', 0), null);
  assert.equal(versionsAt(groups, 'r', 2, { sender: 'human' }), null);
  const retries = addVariant(addVariant({}, { parent: 'r', id: 'a', anchor: 2 }), { parent: 'a', id: 'b', anchor: 2 });
  assert.deepEqual(versionsAt(retries, 'b', 2), { selectedOption: 2, nOptions: 3, previous: 'a', next: null });
  assert.equal(versionsAt(retries, 'b', 2, { sender: 'human' }), null);
});

test('model: a version is placed by the core’s turn order, not by how much history the transcript loaded', () => {
  const items = [{ turnId: 'T5', type: 'userMessage' }, { turnId: 'T5' }, { turnId: 'T6', type: 'userMessage' }, { turnId: 'T7' }];
  const listed = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
  assert.equal(turnIndexIn(listed, items, 'T5'), 4);
  assert.equal(turnIndexIn(listed, items, 'T6'), 5);
  assert.equal(turnIndexIn(listed, items, 'T7'), 6, 'a turn sent since the list counts on from the last listed one');
  assert.equal(turnIndexIn(null, items, 'T6'), 1, 'without the list, the loaded order');
  assert.equal(turnIndexIn(listed, items, 'T9'), -1);
});

test('service: create-variant keeps an edit’s kind; list hands the core’s turn order of a branched chat', async () => {
  const config = { threadIds: ['r'], archivedThreadIds: [], threadMetadata: { r: { name: 'Plan' } }, sessionMetadata: { r: { surface: 'chat' } } };
  const turns = { r: ['t0', 't1'] };
  let n = 0;
  const fork = async (payload) => {
    const id = `v${++n}`;
    turns[id] = turns[payload.threadId].slice(0, turns[payload.threadId].indexOf(payload.lastTurnId) + 1);
    config.threadIds = [id, ...config.threadIds];
    config.sessionMetadata[id] = { surface: 'chat', forkedFrom: payload.threadId };
    return { thread: { id }, sessionMetadata: config.sessionMetadata[id] };
  };
  const request = async (method, params) => {
    if (method === 'thread/read') return { thread: { turns: (turns[params.threadId] ?? []).map((id) => ({ id })) } };
    throw new Error(method);
  };
  const service = createChatBranches({ getConfig: () => config, save() {}, fork, request });
  assert.deepEqual(await service.run({ operation: 'list', threadId: 'r' }), { group: null, turnIds: null }, 'no thread/read for a chat with one version');
  const made = await service.run({ operation: 'create-variant', threadId: 'r', turnId: 't1', kind: 'edit', permission: 'default' });
  assert.deepEqual(made.group.members.at(-1), { id: 'v1', parent: 'r', anchor: 1, kind: 'edit' });
  assert.deepEqual(config.chatBranches.r.members.at(-1).kind, 'edit');
  turns.v1.push('t1b');
  const listed = await service.run({ operation: 'list', threadId: 'v1' });
  assert.equal(listed.group.root, 'r');
  assert.deepEqual(listed.turnIds, ['t0', 't1b']);
  const retry = await service.run({ operation: 'create-variant', threadId: 'r', turnId: 't1', permission: 'default' });
  assert.equal(retry.group.members.at(-1).kind, undefined, 'a Retry has no kind');
});

// ---------------------------------------------------------------- chatfn-branches-03 / message-actions-01: the prompt's row

test('SSR: a Chat prompt’s actions are s4’s — user-message-actions, Edit before Copy, lI with the user-message testids', () => {
  const s4 = official('cc1aae219-');
  for (const s of ['"data-testid":"user-message-actions"', '"data-testid":"user-message-edit"', '"data-testid":"user-message"',
    'defaultMessage:"You said: {prompt}",id:"I2YdkpRcBT"', 'je.showEdit&&ne&&h(Ic.EditAction,{...s1,"data-testid":"user-message-edit"'])
    assert.ok(s4.replace(/\s+/g, '').includes(s.replace(/\s+/g, '')) || s4.includes(s), s);
  // s4 Sn = [pn retry, mn rewind, hn edit, gn copy, Xt, _n failed send, vn, yn lI, bn]: Edit, then Copy, then the versions.
  assert.ok(s4.includes('y(b,{children:[pn,mn,hn,gn,Xt,_n,vn,yn,bn]})'));
  assert.ok(s4.includes('"data-testid":"user-message-retry"') && s4.includes('je.onRetry("human_message_hover",k.uuid)'));
  const chat = { onRetry: () => {}, onEdit: () => {}, versions: { selectedOption: 1, nOptions: 2, previous: 'r', next: null }, onVersion: () => {} };
  const html = renderToStaticMarkup(h(userActions.SourceUserActions, { sessionKey: 'v1', itemId: 'u1', text: 'Hi', interacted: true, chat }));
  assert.match(html, /^<div class="sua-row" data-user-actions-id="u1" data-testid="user-message-actions">/);
  const ids = [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['user-message-actions', 'user-message-retry', 'user-message-edit', 'user-message-previous-version', 'user-message-next-version']);
  assert.match(html, /data-testid="user-message-retry" aria-label="Retry"/);
  assert.ok(html.indexOf('user-message-edit') < html.indexOf('aria-label="Copy"'));
  assert.ok(html.indexOf('aria-label="Copy"') < html.indexOf('user-message-previous-version'));
  assert.match(html, /aria-label="Edit"/);
  assert.match(html, />2 \/ 2</);
  // One version: no switcher; no onEdit (the core cannot fork at that turn): no Edit; off Chat: the Code row as before.
  const one = renderToStaticMarkup(h(userActions.SourceUserActions, { sessionKey: 'r', itemId: 'u1', text: 'Hi', interacted: true, chat: { onRetry: null, onEdit: null, versions: null, onVersion: () => {} } }));
  assert.doesNotMatch(one, /user-message-edit|user-message-retry|version/);
  const code = renderToStaticMarkup(h(userActions.SourceUserActions, { sessionKey: 'r', itemId: 'u1', text: 'Hi', interacted: true }));
  assert.doesNotMatch(code, /data-testid="user-message-actions"/);
});

test('editor: a Chat prompt’s edit takes UY’s branch note (its tooltip), a Cowork one keeps restart', () => {
  assert.equal(edit.editNote(edit.editNoteKind({ isCoworkSession: false })), 'Making changes creates a new branch in the conversation.');
  assert.equal(edit.editNote(edit.editNoteKind({ isCoworkSession: true })), 'Saving sends this as your latest message and restarts from here.');
  // HY: a Chat edit is not held by the streaming term.
  assert.equal(edit.editSaveDisabled({ currentEdit: 'b', originalText: 'a', isCoworkSession: false, isStreaming: true }), false);
  const source = local('src/source-user-message-edit.jsx');
  assert.match(source, /saveOnPlainEnter = true, isCoworkSession = true \}\) \{/);
  assert.match(source, /const note = editNote\(editNoteKind\(\{ isCoworkSession \}\)\);/);
  // Both render (the note sits in the Info tooltip, which SSR leaves closed).
  for (const props of [{ isCoworkSession: false }, {}])
    assert.match(renderToStaticMarkup(h(edit.SourceUserMessageEdit, { originalText: 'Hi', onSave() {}, onClose() {}, ...props })), /aria-label="Edit message"/);
});

test('host wiring: Chat prompts get Edit / versions (not Code Rewind / Fork); the edit saves as a new version', () => {
  const main = local('src/main.jsx');
  assert.match(main, /userActions=\{item\.type === "userMessage" \? mode === "chat" \? \{ rewind: null, fork: null, chat: chatBranches\.forUserTurn\(items, item\.turnId, \(\) => coworkMessageEdits\.start\(current, item\.id\), \(row\) => messageItemText\(shownUserItem\(row\)\), turnAttachments\) \} : userMessageActions\(/);
  assert.match(main, /coworkEdit && \(coworkActions\?\.onEditMessage \|\| mode === "chat"\) && item\.type === "userMessage" && coworkEdit\.uuid === item\.id/);
  assert.match(main, /isCoworkSession=\{mode !== "chat"\}/);
  assert.match(main, /mode === "chat" \? chatBranches\.edit\(item\.turnId, text, turnAttachments\(items, item\.turnId\)\) : coworkActions\.onEditMessage\(\{ uuid: item\.id \}, text\)/);
  const session = local('src/source-session.jsx');
  assert.match(session, /chat=\{userActions\?\.chat \?\? null\} \/>/);
  assert.match(session, /data-testid=\{chatSurface \? "user-message" : undefined\}/);
  assert.match(session, /data-testid=\{chatSurface \? "assistant-message" : undefined\} data-is-streaming=\{chatSurface \? String\(!!isStreaming\) : undefined\}/);
  const hook = local('src/source-chat-message-actions.jsx');
  assert.match(hook, /const edit = useCallback\(\(turnId, text, attachments = null\) => retry\(turnId, text, \{ kind: 'edit', attachments \}\), \[retry\]\);/);
  assert.match(hook, /return \{ versions: versionsFor\(index, 'human'\), onEdit: branchable && typeof onEdit === 'function' \? onEdit : null, onVersion: select,/);
  assert.match(hook, /const answered = branchable && Array\.isArray\(items\) && items\.some\(\(item\) => item\?\.turnId === turnId && item\.type === 'agentMessage'\);/);
  assert.match(hook, /const index = turnIndexIn\(turnIds, items, turnId\);/);
});

// ---------------------------------------------------------------- message-actions-02 / -03

test('SSR: the reply toolbar ends with r1’s Ic.Timestamp (revealOnHover) when the reply has a time', () => {
  const r1 = official('cc1aae219-');
  assert.ok(r1.includes('h(Ic.Timestamp,{date:x.created_at,locale:Le.locale,revealOnHover:!0})'));
  assert.ok(official('shared-2-').includes('i8=Object.assign(r8,{Attachments:th,Actions:R6,Timestamp:R6.Timestamp,'));
  const at = Date.UTC(2026, 9, 1, 12, 0, 0);
  const html = renderToStaticMarkup(h(actions.SourceChatMessageActions, { conversationUuid: 't1', itemId: 'i1', text: 'Hi', onRetry: () => {}, createdAt: at }));
  assert.match(html, /<time [^>]*data-cds-reveal-on-hover=""[^>]*data-cds="RelativeTime" datetime="2026-10-01T12:00:00.000Z"/i);
  assert.ok(html.indexOf('action-bar-retry') < html.indexOf('<time'));
  assert.doesNotMatch(renderToStaticMarkup(h(actions.SourceChatMessageActions, { conversationUuid: 't1', itemId: 'i1', text: 'Hi' })), /<time/);
});

test('kM: a selection counts for a message only when it intersects it and starts or ends inside it (trimmed)', () => {
  const r1 = official('cc1aae219-');
  assert.ok(r1.includes('return n.intersectsNode(e)&&a?t.toString().trim():""'));
  const TEXT = 3;
  const message = { contains: (node) => node?.inside === true, ownerDocument: null };
  const doc = (range, text) => ({ defaultView: { getSelection: () => (range ? { rangeCount: 1, getRangeAt: () => range, toString: () => text } : { rangeCount: 0 }) } });
  const inside = { nodeType: TEXT, parentNode: { inside: true } }, outside = { nodeType: 1, inside: false };
  message.ownerDocument = doc({ startContainer: inside, endContainer: outside, intersectsNode: () => true }, '  picked text ');
  assert.equal(actions.messageSelectionText(message), 'picked text');
  message.ownerDocument = doc({ startContainer: outside, endContainer: outside, intersectsNode: () => true }, 'elsewhere');
  assert.equal(actions.messageSelectionText(message), '', 'a selection around the message, starting and ending outside');
  message.ownerDocument = doc({ startContainer: inside, endContainer: inside, intersectsNode: () => false }, 'x');
  assert.equal(actions.messageSelectionText(message), '');
  message.ownerDocument = doc(null, '');
  assert.equal(actions.messageSelectionText(message), '');
  assert.match(local('src/source-transcript.jsx'), /chatMessageMenuAttach\(target, text, messageSelectionText\(row\)\)/);
});

test('Retry and an edited prompt resend the turn’s files and images (ready composer entries)', () => {
  const items = [{ id: 'u1', turnId: 'T1', type: 'userMessage', content: [{ type: 'text', text: 'Look' }, { type: 'localImage', path: '/a/shot.png' },
    { type: 'mention', name: 'notes.md', path: '/a/notes.md' }, { type: 'image', url: 'data:image/png;base64,AA' }] }, { id: 'a1', turnId: 'T1', type: 'agentMessage' }];
  assert.deepEqual(actions.turnAttachments(items, 'T1'), [
    { id: 'resend:T1:0', kind: 'image', status: 'ready', path: '/a/shot.png', name: 'shot.png' },
    { id: 'resend:T1:1', kind: 'file', status: 'ready', path: '/a/notes.md', name: 'notes.md' }]);
  assert.deepEqual(actions.turnAttachments(items, 'T9'), []);
  const main = local('src/main.jsx');
  assert.match(main, /void sendMessage\(next\.text, next\.attachments \?\? \[\], \[\], \{ resend: true \}\);/);
});

test('feedback details: OF’s form is shared-6 iT (generated), opened by the thumbs; Submit stores the type and details', async () => {
  // OF outside the early-access model: `h(rs,{...i,initialFeedbackInput:e,onKeepFeedbackInput:v,onSubmit:l},t)`, rs = shared-6 Hs = iT.
  const cc1 = official('cc1aae219-');
  assert.ok(cc1.includes('h(rs,{...i,initialFeedbackInput:e,onKeepFeedbackInput:v,onSubmit:l},t)'));
  assert.ok(official('shared-6-').includes('iT as Hs'));
  const dir = path.join(app, 'src/generated/chat-messages');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const form = manifest.modules.find((m) => m.target === 'feedback-form.mjs');
  assert.equal(form.source, 'shared-6-sd9jbJqs.js');
  assert.deepEqual(form.exports, { iT: 'ChatFeedbackDialog' });
  assert.ok(form.imports.some((i) => i.kind === 'linked' && i.name === 'useDialogPresence'), 'shared-5 $L from sidebar-sections (D1)');
  const generated = fs.readFileSync(path.join(dir, 'feedback-form.mjs'), 'utf8');
  for (const s of ['defaultMessage: "Give negative feedback"', 'defaultMessage: "Please provide details: (optional)"',
    '"What type of issue do you wish to report? (optional)"', 'C(ne.Popup, { size: "md", initialFocus: Ge, children: [Ke, qe, q] })',
    '? ae(n, r, e || void 0)']) assert.ok(generated.includes(s), s);
  // The adapter hands iT the host's onMessageFeedback and OF's kept text, through the Dialog the toolbar provides.
  const adapters = await server.ssrLoadModule('/src/source-chat-messages-adapters.jsx');
  const seen = [], submitted = [];
  const Dialog = (props) => { seen.push(props); return null; };
  const texts = new Map([['i1:down', 'kept words']]);
  renderToStaticMarkup(h(adapters.ChatFeedbackContext.Provider, { value: { Dialog, onSubmit: (entry) => submitted.push(entry) } },
    h(adapters.ChatFeedbackForm, { isOpen: true, requestedFeedbackType: 'flag', message: { uuid: 'i1' }, conversationUuid: 't1', onClose() {}, onSubmit() {},
      formKey: 'i1:down', formTexts: { texts, keep() {} }, byConversationModel: true, ratingSurface: 'row' })));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].initialFeedbackInput, 'kept words');
  assert.equal(seen[0].isOpen, true);
  assert.equal('byConversationModel' in seen[0] || 'ratingSurface' in seen[0], false);
  seen[0].onMessageFeedback({ uuid: 'i1' }, 'flag/facts', 'It was wrong');
  assert.deepEqual(submitted, [{ conversationUuid: 't1', message: { uuid: 'i1' }, type: 'flag/facts', reason: 'It was wrong' }]);
  assert.equal(adapters.isChatWebTool('web_search_fast'), true);
  assert.deepEqual(adapters.useChatConversationQuery(), { data: undefined });
  // The store keeps the details on this computer with the rating; list still answers { type } for the pressed thumb.
  const { createChatFeedbackStore } = await import('../electron/chat-feedback.mjs');
  const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-feedback-reason-'));
  try {
    const store = createChatFeedbackStore({ dataDir: tmp, now: () => 7 });
    assert.deepEqual(await store.run({ operation: 'put', threadId: 't', itemId: 'a', type: 'flag/facts', reason: 'It was wrong' }), { data: { a: { type: 'flag/facts' } } });
    await store.run({ operation: 'put', threadId: 't', itemId: 'b', type: 'upvote', reason: '   ' });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'chat-feedback.json'), 'utf8')).threads.t,
      { a: { type: 'flag/facts', at: 7, reason: 'It was wrong' }, b: { type: 'upvote', at: 7 } });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.match(local('src/source-chat-message-actions.jsx'), /Dialog: ChatFeedbackDialog,/);
});

test('feedback details: iT’s "Submitting this report will send…" note stays verbatim (no official gate; R0 / E63 / E68 precedent)', () => {
  // shared-6 iT renders the <small> note under every non-report form, choosing only between the safety-systems and the
  // models wording (`we=r===Ht.SC_FALSE_POSITIVE&&Ce`); there is no branch that drops it. OF's only other form is the
  // early-access modal SF (`Zo(u??d)`, an early-access model), which a local chat never selects. The host therefore keeps
  // the original copy (no invented gate), as E68 does for the Global instructions account sentence; the store itself is
  // local only (electron/chat-feedback.mjs: fs + path, no network).
  const iT = official('shared-6-');
  assert.ok(iT.includes('t=J2($,77,Ue,we)?K2($,77,Ue,we,b("small",{children:we?b(X,{defaultMessage:"Submitting this report will send the entire current conversation to Anthropic for future improvements to our safety systems. <link>Learn More</link>",id:"84km2YxyC+",values:{link:Ue}}):b(X,{defaultMessage:"Submitting this report will send the entire current conversation to Anthropic for future improvements to our models. <link>Learn More</link>",id:"+Se4qNVajJ",values:{link:Ue}})})):$[79]'));
  assert.ok(official('cc1aae219-').includes('p=Zo(u??d)&&s&&i.onMessageFeedback===void 0&&f===void 0,m=_s(SF.handle,p),[g]=F(p&&m)'));
  const generated = fs.readFileSync(path.join(app, 'src/generated/chat-messages/feedback-form.mjs'), 'utf8');
  for (const id of ['84km2YxyC+', '+Se4qNVajJ']) assert.ok(generated.includes(`id: "${id}"`), id);
  assert.match(generated, /t = J2\(\$, 77, Ue, we\)\s+\? K2\(\s+\$,\s+77,\s+Ue,\s+we,\s+b\("small", \{\s+children: we/);
  const zh = local('electron/i18n/zh-CN/surfaces.mjs');
  assert.ok(zh.includes('"Submitting this report will send the entire current conversation to Anthropic for future improvements to our models. <link>Learn More</link>": "提交此报告会将当前整段对话发送给 Anthropic，用于今后改进我们的模型。<link>了解更多</link>"'));
  const service = local('electron/chat-feedback.mjs');
  assert.deepEqual([...service.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]), ['node:fs/promises', 'node:path', './chat-feedback-model.mjs']);
  assert.doesNotMatch(service + local('electron/chat-feedback-model.mjs'), /\bfetch\(|node:https?|node:net|electron'/);
});

// ---------------------------------------------------------------- thinking-search-01 / -03

test('thinking: a Chat conversation reads as the Thinking view (no ctrl+o view, no toggle)', () => {
  const main = local('src/main.jsx');
  assert.match(main, /const transcriptView = mode === "chat" \? "thinking" : effectiveView\(sessionViews\[current\], prefs\.transcriptView, \{ hasThinking \}\);/);
  assert.match(main, /onToggleThinking=\{current && mode !== "chat" /);
});

test('thinking: a host tool group of one search kind is one step over its count; a step runs only while its own block does', async () => {
  const search = (id, status = 'completed', action = { type: 'openPage' }) => ({ id, type: 'webSearch', turnId: 'T', status, action });
  const group = { id: 's1', type: 'fileToolGroup', turnId: 'T', toolGroup: [search('s1'), search('s2'), search('s3')] };
  assert.deepEqual(chatSearchRun(group).map((m) => m.id), ['s1', 's2', 's3']);
  assert.equal(chatThinkingRow(group), true);
  assert.equal(chatSearchRun({ ...group, toolGroup: [search('s1'), { id: 'c', type: 'commandExecution' }] }), null, 'a mixed group stays a Code group');
  const html = renderToStaticMarkup(h(thinking.SourceChatThinking, { item: group }));
  assert.match(html, /data-chat-row="search"/);
  assert.match(html, /Read 3 pages/);
  const web = renderToStaticMarkup(h(thinking.SourceChatThinking, { item: { ...group, toolGroup: [search('s1', 'completed', { type: 'search' }), search('s2', 'completed', { type: 'search' })] } }));
  assert.match(web, /Searched the web/);
  // State: a finished thought is done while the turn still streams; a search runs while its call is in progress.
  assert.equal(chatRowState({ type: 'reasoning', completedAtMs: 5 }, true), 'done');
  assert.equal(chatRowState({ type: 'reasoning' }, true), 'busy');
  assert.equal(chatRowState({ type: 'reasoning' }, false), 'done');
  assert.equal(chatRowState(search('s', 'inProgress'), false), 'busy');
  assert.equal(chatRowState({ ...group, toolGroup: [search('a'), search('b', 'inProgress')] }), 'busy');
  assert.equal(chatRowState(group, true), 'done');
});

// ---------------------------------------------------------------- incognito disclaimer

test('SSR: an incognito Chat ends with U9’s temporary branch — the incognito notice instead of the support link', () => {
  const ca2 = official('ca2ef848d-');
  assert.ok(ca2.includes('isTemporary:Ce,incognitoString:Et,hasWebSearchResponse:!!Va'));
  assert.ok(official('shared-78-').includes('incognitoNotice:{defaultMessage:"Incognito chats stay out of your history, memory, and search, and aren\\u2019t used to train Claude.",id:"S6ScX5d4QF"}'));
  const html = renderToStaticMarkup(h(actions.SourceChatDisclaimer, { conversationUuid: 't1', incognito: true }));
  assert.match(html, /^<div role="note" data-disclaimer="true" class="pointer-events-auto relative z-0 -mt-10 bg-surface-1 pb-2 pt-12 text-center text-xs text-muted-as-secondary">Incognito chats stay out of your history, memory, and search, and aren’t used to train Claude\.<\/div>$/);
  assert.match(renderToStaticMarkup(h(actions.SourceChatDisclaimer, { conversationUuid: 't1' })), /href="https:\/\/support\.anthropic\.com\/en\/articles\/8525154/);
  i18n.setLocale('zh-CN');
  try { assert.match(renderToStaticMarkup(h(actions.SourceChatDisclaimer, { conversationUuid: 't1', incognito: true })), /无痕聊天不会出现在你的历史记录、记忆和搜索中/); }
  finally { i18n.setLocale('en-US'); }
  assert.match(local('src/source-transcript.jsx'), /incognito=\{!!messageActions\.incognito\}/);
  assert.match(local('src/source-chat-messages-adapters.jsx'), /export function useIncognitoChat\(\) \{ return useContext\(ChatIncognitoContext\); \}/);
});

// ---------------------------------------------------------------- jump_to_last_message

test('focus regions: "lastMessage" after "conversation" (xe), jump_to_last_message, the feed’s last article (c1f21cfe3)', () => {
  const regions = official('ca1d33d05-');
  assert.ok(regions.includes('xe=["navigation","discoveryScreen","header","conversation","lastMessage","main","question","composer","sidePanel","artifact","overview","activity","sessionDetails","preview","terminal","tile","projectKnowledge"]'));
  assert.ok(regions.includes('jump_to_last_message:Z("lastMessage")'));
  assert.ok(regions.includes('N("lastMessage",'));
  assert.ok(regions.includes('focus:e=>{V(e,{ring:!1}),i.current?.setPinToBottom(!0),i.current?.scrollToBottom("auto",{onlyIfPinned:!0})}'));
  assert.ok(official('c1f21cfe3-').includes(`var e='[role="feed"]',t='[role="article"][aria-posinset]',n=\`\${e} \${t}\``));
  assert.ok(official('shared-1-').includes('jump_to_last_message:{description:vF.description,group:"general",bang:"!jlm",icon:Q("ChatSimple")}'));
  assert.equal(LAST_MESSAGE_SELECTOR, '[role="feed"] [role="article"][aria-posinset]');
  assert.deepEqual(REGION_ORDER.slice(3, 6), ['conversation', 'lastMessage', 'main']);
  assert.deepEqual(JUMP_COMMANDS.find((c) => c.id === 'jump_to_last_message'), { id: 'jump_to_last_message', regions: ['lastMessage'], icon: 'ChatSimple' });
  const article = (n) => ({ getAttribute: () => String(n) });
  const [a, b, c] = [article(2), article(7), article(5)];
  assert.equal(lastFeedArticle([a, b, c]), b);
  assert.equal(lastFeedArticle([]), null);
  assert.match(local('src/source-transcript.jsx'), /data-focus-region-last-message=\{messageActions\?\.surface === "chat" \? "" : undefined\}/);
  const hook = local('src/use-focus-regions.js');
  assert.match(hook, /doc\.querySelectorAll\("\[data-focus-region-last-message\]"\)/);
  assert.match(hook, /if \(stop\.region === "lastMessage"\) \{\n\s+focusRegionLanding\(element, \{ ring: "none" \}\);/);
  assert.match(local('src/sidebar-palette-model.mjs'), /jump_to_last_message: \(\) => t\("Jump to last message"\)/);
});
