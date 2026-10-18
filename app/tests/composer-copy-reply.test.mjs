// R3-composer composer-copy-command (research/composer.md §3.18 composer-n02): /copy [N] copies Claude's latest reply or
// an earlier one. The argument parser (QX) and the reply reader (eZ / $X over c227f4d5e's transcript predicates) are the
// original 2.42304.0 bindings in src/generated/code-composer; composer-copy-reply.mjs maps the host items to official
// transcript entries and transcribes cc43287c9's `case "copy-reply"`. Pure functions, a fake clipboard, no window.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCopyReplyCount } from '../src/generated/code-composer/copy-reply-arg.mjs';
import { copyReplyTranscript, copyableReplies } from '../src/generated/code-composer/copy-reply-replies.mjs';
import { isUserTurnEntry, endsFinishedReply } from '../src/generated/code-composer/transcript-replies.mjs';
import { COPY_REPLY_DESCRIPTION, COPY_REPLY_MESSAGES, copyReplyEntries, copyReplyDecision, runCopyReply, writeReplyToClipboard } from '../src/composer-copy-reply.mjs';
import { executeCopyCommand } from '../src/r4h-glue-decisions.mjs';
import { parseAst } from 'rolldown/parseAst';
import { sessionCommands, matchCommands, parseSessionCommand, commandUnavailable } from '../src/session-command-model.mjs';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFile(path.join(reference, file), 'utf8');
// The minified chunks keep U+2019 as a ’ escape inside their string literals.
const literal = text => JSON.stringify(text).replace(/’/g, '\\u2019');

// A host session: two finished turns (the second one with commentary, a tool and the final answer), a user '!' command.
const user = (id, turnId, text) => ({ type: 'userMessage', id, turnId, content: [{ type: 'text', text, text_elements: [] }] });
const agent = (id, turnId, text, phase) => ({ type: 'agentMessage', id, turnId, text, ...(phase ? { phase } : {}) });
const items = [
  user('u1', 't1', 'first question'), { type: 'reasoning', id: 'r1', turnId: 't1', summary: ['thinking'] }, agent('a1', 't1', 'First answer.'),
  user('u2', 't2', 'second question'), agent('a2', 't2', 'Let me look.', 'commentary'),
  { type: 'commandExecution', id: 'c2', turnId: 't2', command: 'ls', aggregatedOutput: 'x' }, agent('a3', 't2', '**Second** answer.', 'final_answer'),
  { type: 'commandExecution', id: 's3', turnId: 't3', source: 'userShell', command: 'pwd', aggregatedOutput: '/tmp' },
];

test('QX (the original copy-reply argument): empty is 1, a positive integer is N, anything else refuses', () => {
  assert.equal(parseCopyReplyCount(''), 1);
  assert.equal(parseCopyReplyCount('2'), 2);
  assert.equal(parseCopyReplyCount('12'), 12);
  for (const bad of ['0', '02', '-1', '1.5', 'x', '2 3', ' 2']) assert.equal(parseCopyReplyCount(bad), null, bad);
});

test('eZ / $X on official entries: a finished reply is every assistant entry back to its user turn, text items joined by a blank line', () => {
  const entries = [
    { id: 'u1', author: 'user', items: [{ kind: 'text', text: 'q' }] },
    { id: 'a1', author: 'assistant', items: [{ kind: 'text', text: 'one' }, { kind: 'tools', tools: [] }] },
    { id: 'a2', author: 'assistant', items: [{ kind: 'narration_summary', text: 'two' }, { kind: 'text', text: '' }] },
    { id: 'b1', author: 'user', items: [{ kind: 'bash', command: 'ls' }] },
    { id: 'o1', author: 'assistant', localOutput: true, items: [{ kind: 'text', text: 'ls output' }] },
    { id: 'u2', author: 'user', items: [{ kind: 'text', text: 'q2' }] },
    { id: 'p', author: 'assistant', provisionalMessageId: 'x', items: [] },
    { id: 'a3', author: 'assistant', items: [{ kind: 'text', text: 'three' }] },
  ];
  // The bash entry is no turn boundary (Ih "bash"), so the localOutput entry follows a2 inside the first turn: a2 is not
  // the turn's last assistant entry, the localOutput one is, and $X skips it; its text would also have been joined in.
  assert.equal(isUserTurnEntry(entries[3]), false);
  assert.equal(endsFinishedReply(entries, 2, false), false);
  assert.deepEqual(copyReplyTranscript({ entries, responding: false }), { replying: false, replies: [{ entryId: 'a3', text: 'three' }] });
  assert.deepEqual(copyableReplies(entries.slice(0, 3), false), [{ entryId: 'a2', text: 'one\n\ntwo' }]);
  // While the session responds the open turn's tail is no finished reply, and eZ says so.
  assert.deepEqual(copyReplyTranscript({ entries, responding: true }), { replying: true, replies: [] });
  assert.deepEqual(copyReplyTranscript(null), { replying: false, replies: [] });
});

test('host items map to official entries: user turns, a user shell command as a bash entry, agent text, everything else non-text', () => {
  assert.deepEqual(copyReplyEntries(items).map(entry => `${entry.author}:${entry.items.map(item => item.kind).join('+')}`),
    ['user:text', 'assistant:reasoning', 'assistant:text', 'user:text', 'assistant:text', 'assistant:commandExecution', 'assistant:text', 'user:bash']);
  assert.deepEqual(copyReplyEntries([{ type: 'userMessage', id: 'u', content: [{ type: 'localImage', path: '/a.png' }] }])[0].items, [{ kind: 'image' }]);
  assert.deepEqual(copyReplyEntries([null, 'x', undefined]), []);
});

test('/copy and /copy N pick the latest and the earlier reply; the four refusals carry the official copy', () => {
  assert.deepEqual(copyReplyDecision({ arg: '', items }), { kind: 'copy', text: 'Let me look.\n\n**Second** answer.', entryId: 'a3' });
  assert.deepEqual(copyReplyDecision({ arg: '2', items }), { kind: 'copy', text: 'First answer.', entryId: 'a1' });
  const refusal = (args) => { const decision = copyReplyDecision(args); assert.equal(decision.kind, 'refused'); return [decision.reason, decision.message]; };
  assert.deepEqual(refusal({ arg: 'x', items }), ['bad-argument', 'That isn’t a reply number. Use /copy for Claude’s latest reply, or /copy 2 or higher for an earlier one.']);
  // QX runs first: a bad argument is refused even while a reply streams.
  assert.equal(refusal({ arg: '0', items, responding: true })[0], 'bad-argument');
  assert.deepEqual(refusal({ arg: '', items, responding: true }), ['replying', 'Claude is still replying. Send /copy when the reply is done.']);
  assert.deepEqual(refusal({ arg: '', items: [user('u', 't', 'hi')] }), ['none', 'There’s no reply to copy yet.']);
  assert.deepEqual(refusal({ arg: '', items: [] }), ['none', 'There’s no reply to copy yet.']);
  assert.deepEqual(refusal({ arg: '3', items }), ['exceeds', 'Only 2 replies are available to copy. Use a number up to 2.']);
  assert.deepEqual(refusal({ arg: '2', items: items.slice(0, 3) }), ['exceeds', 'Only 1 reply is available to copy. Use /copy without a number.']);
});

test('runCopyReply: a refusal is a danger toast without a write; a copy writes the reply, then the success toast', async () => {
  const notices = [], writes = [], restores = [];
  const refused = runCopyReply({ arg: 'abc', items, notify: (...args) => notices.push(args), write: text => { writes.push(text); return true; }, restore: text => restores.push(text) });
  assert.equal(refused.status, 'refused');
  assert.equal(await refused.settled, false);
  assert.deepEqual(notices, [[COPY_REPLY_MESSAGES.badArgument, { variant: 'danger' }]]);
  assert.deepEqual(writes, []);
  notices.length = 0;
  const node = {};
  const ran = runCopyReply({ arg: '2', items, node, notify: (...args) => notices.push(args), write: (text, owner) => { writes.push([text, owner === node]); return Promise.resolve(true); }, restore: text => restores.push(text) });
  assert.equal(ran.status, 'ran');
  assert.deepEqual(writes, [['First answer.', true]], 'the write starts synchronously, in the gesture that ran the command');
  assert.equal(await ran.settled, true);
  assert.deepEqual(notices, [['Reply copied to clipboard.', { variant: 'neutral' }]]);
  assert.deepEqual(restores, []);
});

test("runCopyReply: a failed clipboard write restores '/copy N' and says so; a throwing writer counts as failed", async () => {
  for (const [arg, write, restored] of [['2', () => false, '/copy 2'], ['', () => { throw new Error('denied'); }, '/copy'], ['', () => Promise.reject(new Error('x')), '/copy']]) {
    const notices = [], restores = [];
    const run = runCopyReply({ arg, items, notify: (...args) => notices.push(args), write, restore: text => restores.push(text) });
    assert.equal(run.status, 'ran');
    assert.equal(await run.settled, false);
    assert.deepEqual(restores, [restored]);
    assert.deepEqual(notices, [['Couldn’t copy the reply to the clipboard. Try again.', { variant: 'danger' }]]);
  }
});

test('the reply goes to the owning window clipboard as text/plain plus the markdown as text/html (Yb plain_html)', async () => {
  const written = [];
  class FakeItem { constructor(parts) { this.parts = parts; } }
  class FakeBlob { constructor(parts, { type }) { this.text = parts.join(''); this.type = type; } }
  const clipboard = { write: async ([item]) => { written.push(Object.fromEntries(Object.entries(item.parts).map(([type, blob]) => [type, blob.text]))); }, writeText: async () => { throw new Error('unused'); } };
  const node = { ownerDocument: { defaultView: { navigator: { clipboard }, ClipboardItem: FakeItem, Blob: FakeBlob } } };
  assert.equal(await writeReplyToClipboard('**Second** answer.', node), true);
  assert.equal(written[0]['text/plain'], '**Second** answer.');
  assert.match(written[0]['text/html'], /<strong>Second<\/strong> answer\./);
  // No rich clipboard: the plain write still lands; a failing plain write reports false.
  const plainOnly = { ownerDocument: { defaultView: { navigator: { clipboard: { writeText: async () => {} } } } } };
  assert.equal(await writeReplyToClipboard('x', plainOnly), true);
  assert.equal(await writeReplyToClipboard('x', { ownerDocument: { defaultView: { navigator: { clipboard: { writeText: async () => { throw new Error('no'); } } } } } }), false);
});

test('the copy messages are the official cc43287c9 / cc183b3ab ones, the plural in the host catalog form', async () => {
  const handler = await raw('cc43287c9-DAfOi8yP.js'), registry = await raw('cc183b3ab-BlACljsv.js');
  for (const [key, id] of [['badArgument', 'd6GVin8ZgF'], ['replying', 'iAkUwGZZtY'], ['none', 'iZ+iUUQvSB'], ['copied', 'wSG94kLy28'], ['failed', 'z7U1VhFXoU']])
    assert.ok(handler.includes(`defaultMessage:${literal(COPY_REPLY_MESSAGES[key])},id:${JSON.stringify(id)}`), key);
  const plural = '{count, plural, one {Only # reply is available to copy. Use /copy without a number.} other {Only # replies are available to copy. Use a number up to #.}}';
  assert.ok(handler.includes(`defaultMessage:${JSON.stringify(plural)},id:"kT+SiiA0vq"`));
  assert.equal(COPY_REPLY_MESSAGES.exceedsOne, 'Only {count} reply is available to copy. Use /copy without a number.');
  assert.equal(COPY_REPLY_MESSAGES.exceedsOther, 'Only {count} replies are available to copy. Use a number up to {count}.');
  assert.ok(registry.includes('{name:"copy",description:E.copy,argumentHint:"[N]",terminalAction:"copy-reply",hideIfCliHas:!0,gate:e=>e.hostInterceptSurface&&e.hasSession}'));
  assert.ok(registry.includes(`copy:{defaultMessage:${literal(COPY_REPLY_DESCRIPTION)},id:"X7oz/QBPDV"}`));
});

test("session commands: '/copy [N]' needs only an open session (offline and mid-turn too) and parses N as its argument", () => {
  const copy = sessionCommands.find(command => command.id === 'copy');
  assert.equal(copy.argumentHint, '[N]');
  assert.equal(copy.description, COPY_REPLY_DESCRIPTION);
  assert.equal(commandUnavailable(copy, {}), 'Open a session first');
  for (const context of [{ current: 't' }, { current: 't', connected: false }, { current: 't', running: true, connected: true }, { current: 't', loading: true }])
    assert.equal(commandUnavailable(copy, context), '', JSON.stringify(context));
  const row = matchCommands('cop', { current: 't' }).find(command => command.id === 'copy');
  assert.equal(row?.argumentHint, '[N]');
  assert.ok(!matchCommands('cop', {}).some(command => command.id === 'copy'), 'no /copy without a session');
  assert.deepEqual([parseSessionCommand('/copy 2').id, parseSessionCommand('/copy 2').args, parseSessionCommand('/copy 2').error], ['copy', '2', null]);
  assert.equal(parseSessionCommand('/copy').args, '');
});

test('zh-CN: the /copy row and messages are translated, "Claude" kept (D23)', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  assert.equal(copyReplyDecision({ arg: 'x', items }).message, '这不是回复编号。用 /copy 复制 Claude 的最新回复，或用 /copy 2 及以上复制更早的回复。');
  assert.equal(copyReplyDecision({ arg: '', items, responding: true }).message, 'Claude 仍在回复。回复完成后再发送 /copy。');
  assert.equal(copyReplyDecision({ arg: '', items: [] }).message, '还没有可复制的回复。');
  assert.equal(copyReplyDecision({ arg: '5', items }).message, '只有 2 条回复可复制。请使用不超过 2 的数字。');
  assert.equal(copyReplyDecision({ arg: '5', items: items.slice(0, 3) }).message, '只有 1 条回复可复制。请使用不带数字的 /copy。');
});

test('executeCopyCommand & main.jsx /copy wiring: a refusal returns false before clearing the draft; a failed write restores only into the origin session when empty', async () => {
  // 1) Refusal: returns false, does not call clearCommand, and leaves the draft untouched.
  {
    const notices = [];
    let cleared = 0, draft = '/copy nope';
    const currentRef = { current: 's1' };
    const ok = executeCopyCommand({
      args: 'nope',
      items,
      running: false,
      notice: (...a) => notices.push(a),
      current: 's1',
      currentRef,
      setDraft: updater => { draft = typeof updater === 'function' ? updater(draft) : updater; },
      clearCommand: () => { cleared += 1; draft = ''; },
    });
    assert.equal(ok, false, 'refusal returns false so executeCommand returns early');
    assert.equal(cleared, 0, 'clearCommand is not called on refusal');
    assert.equal(draft, '/copy nope', 'draft is preserved on refusal');
    assert.deepEqual(notices, [[COPY_REPLY_MESSAGES.badArgument, { variant: 'danger' }]]);
  }

  // 2) Failed write in the same session: clears the command synchronously, then restores into the empty draft (and never overwrites non-empty text or another session).
  {
    let restoreFn = null;
    let draft = '/copy 2', cleared = 0;
    const currentRef = { current: 's1' };
    const ok = executeCopyCommand({
      args: '2',
      items,
      running: false,
      current: 's1',
      currentRef,
      setDraft: updater => { draft = typeof updater === 'function' ? updater(draft) : updater; },
      clearCommand: () => { cleared += 1; draft = ''; },
      run: opts => { restoreFn = opts.restore; return { status: 'ran' }; },
    });
    assert.equal(ok, true);
    assert.equal(cleared, 1);
    assert.equal(draft, '');
    restoreFn('/copy 2');
    assert.equal(draft, '/copy 2', 'restored when still on the origin session with an empty draft');

    // Non-empty draft in the same session is not overwritten.
    draft = 'new typing';
    restoreFn('/copy 2');
    assert.equal(draft, 'new typing');

    // Navigating to another session before the async failure settles skips restoring.
    draft = '';
    currentRef.current = 's2';
    restoreFn('/copy 2');
    assert.equal(draft, '', 'never restores into a different session');
  }

  // 3) AST evaluation of main.jsx executeCommand case "copy": refusal returns before clearCommand(); a ran copy reaches clearCommand().
  const main = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /import \{[^}]*\bexecuteCopyCommand\b[^}]*\} from "\.\/r4h-glue-decisions\.mjs";/);
  const ast = parseAst(main, { lang: 'jsx' }, 'src/main.jsx');
  let copySwitch = null;
  const walk = node => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'SwitchStatement' && node.cases?.some(c => c.test?.value === 'copy')) copySwitch = node;
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v.type === 'string') walk(v);
    }
  };
  walk(ast);
  assert.ok(copySwitch, 'found switch (id) with case "copy" in main.jsx');
  const copyCase = copySwitch.cases.find(c => c.test?.value === 'copy');
  const caseCode = main.slice(copyCase.start, copyCase.end);
  // Evaluate the exact case clause inside a minimal switch followed by clearCommand(), as executeCommand does.
  const runCase = new Function('{ id, args, items, running, textarea, notice, current, currentRef, setDraft, clearCommand, executeCopyCommand }',
    `switch (id) { ${caseCode} } clearCommand();`);
  let cleared = 0, draft = '/copy 0';
  runCase({
    id: 'copy', args: '0', items, running: false, textarea: { current: null }, notice: () => {},
    current: 's1', currentRef: { current: 's1' },
    setDraft: updater => { draft = typeof updater === 'function' ? updater(draft) : updater; },
    clearCommand: () => { cleared += 1; draft = ''; },
    executeCopyCommand,
  });
  assert.equal(cleared, 0, 'refused /copy returns before clearCommand()');
  assert.equal(draft, '/copy 0');
});
