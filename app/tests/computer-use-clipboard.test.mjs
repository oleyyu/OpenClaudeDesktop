// The clipboard of official §1.5 (docs/computer-use-official-spec-20261021.md): request_access's clipboardRead /
// clipboardWrite flags (only the ones not granted yet go on the card), read_clipboard / write_clipboard (the flag, the
// session's app windows, the takeover, the clipboard guard, the official result texts), and the screen-wide type's
// paste path (official hi() + DPr(): a new line + clipboardWrite + the clipboardPasteMultiline sub-gate, no length
// threshold; old text read → new text written and read back → ⌘V → 100 ms → old text written back; never with secure
// input; a paste that never reached the app is typed instead). A fake native and a fake clipboard; nothing is posted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { createClipboard, PASTE_SETTLE_MS } = require('../electron/computer-use/clipboard.cjs');
const { BLOCK } = require('../electron/computer-use/reason-policy.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');
const { computerUseAction, computerUseLabel, computerUseIcon, computerUseAccessRequest, computerUseAccessRows } = await import('../src/computer-use-model.mjs');

const TEXTEDIT = 'com.apple.TextEdit';
const TERMINAL = 'com.apple.Terminal';

/** A clipboard that records every read and write, in order. `mangle` makes the read-back differ (a failed round trip). */
function fakeClipboard(text = 'before', { mangle = false, failRead = false } = {}) {
  const log = [];
  return {
    log, get text() { return text; },
    readText() { log.push('read'); if (failRead) throw new Error('no'); return text; },
    writeText(value) { log.push(['write', value]); text = mangle && value.includes('\n') ? value.replace(/\n/g, '\r') : value; },
  };
}
/** front: bundle id (or function); refuse: queued native answers per method; secure: probe's secureInput. */
function fakeNative({ front = TEXTEDIT, refuse = {}, secure = false, clipboard = null } = {}) {
  const calls = [];
  const gate = (method) => (refuse[method]?.length ? refuse[method].shift() : null);
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params, clipboard ? clipboard.text : undefined]);
      switch (method) {
        case 'frontmostApp': { const value = typeof front === 'function' ? front() : front; return typeof value === 'object' ? value : { pid: 42, bundleId: value }; }
        case 'probe': return { secureInput: secure, screenLocked: false };
        case 'hidKey': { const g = gate(method); if (g) return g; return { outcome: 'ok', delivered: true, pressed: params.repeat, times: params.repeat }; }
        case 'hidType': { const g = gate(method); if (g) return g; const n = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(params.text)].length; return { outcome: 'ok', delivered: n > 0, typed: n, total: n }; }
        case 'hidKeyAbort': return { aborted: true };
        case 'listDisplays': return { displays: [{ displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, isMain: true }] };
        case 'captureWindow': return { dataUrl: 'data:image/jpeg;base64,QUJD', width: 1389, height: 868, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7,
          bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
}

function setup({ grants = [{ bundleId: TEXTEDIT, displayName: 'TextEdit' }], flags = { clipboardRead: true, clipboardWrite: true }, approve = true, clip = fakeClipboard(),
  subGates, answer = 'accept', cards = [], onWait = null, ...options } = {}) {
  const fullControl = createFullControl();
  const native = fakeNative({ clipboard: clip, ...options });
  const waits = [];
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {}, info() {}, debug() {} }, fullControl,
    wait: async (ms) => { waits.push(ms); await onWait?.(ms, fullControl); }, selfBundleIds: ['com.openclaude.desktop'], clipboard: clip, ...(subGates ? { subGates } : {}) });
  service.grantsFor('a').grant(grants, flags);
  if (approve) service.requestFullControl('a', { approved: true });
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-clip-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service, resolveApps: async (names) => names.map((name) => ({ requested: name, bundleId: name === 'TextEdit' ? TEXTEDIT : name, displayName: name, installed: true })),
    listApps: async () => ({ apps: [] }), ask: async (access) => { cards.push(access); return answer; }, askTakeover: async () => answer }));
  const call = (name, args = {}) => host.call('a', { name, arguments: args });
  return { service, native, fullControl, clip, waits, call, cards };
}
const body = (result) => JSON.parse(result.content.at(-1).text);
const text = (result) => (typeof result === 'string' ? result : result.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n'));
const methods = (native) => native.calls.map(([method]) => method);

test('request_access: clipboardRead / clipboardWrite are rows on the one card, granted with it; a flag already held is not asked again', async () => {
  const { call, cards, service } = setup({ grants: [], flags: {}, approve: false });
  const first = JSON.parse(text(await call('request_access', { apps: ['TextEdit'], reason: 'r', clipboardWrite: true })));
  assert.deepEqual(cards[0].flags, { clipboardRead: false, clipboardWrite: true, systemKeyCombos: false });
  assert.deepEqual(first.flags, { clipboardRead: false, clipboardWrite: true, systemKeyCombos: false });
  // The same app and flag again: nothing to ask, no card.
  await call('request_access', { apps: ['TextEdit'], reason: 'r', clipboardWrite: true });
  assert.equal(cards.length, 1);
  // A new flag next to a held one: only the new one is on the card.
  await call('request_access', { apps: ['TextEdit'], reason: 'r', clipboardRead: true, clipboardWrite: true });
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[1].flags, { clipboardRead: true, clipboardWrite: false, systemKeyCombos: false });
  assert.deepEqual(service.grantsFor('a').flags(), { clipboardRead: true, clipboardWrite: true, systemKeyCombos: false });
  // The card (official Code-tab JEe): the flag rows, Clipboard / Copy icons, title "these capabilities".
  const access = computerUseAccessRequest({ _meta: { codex_approval_kind: 'mcp_tool_call', computer_use_access: { reason: 'r', flags: cards[1].flags, apps: [] } } });
  assert.deepEqual(computerUseAccessRows(access).flags.map((row) => [row.key, row.icon, row.label]), [['clipboardRead', 'Clipboard', 'Read your clipboard']]);
  // Declined: no flag is granted.
  const declined = setup({ grants: [], flags: {}, approve: false, answer: 'decline' });
  await declined.call('request_access', { apps: ['TextEdit'], reason: 'r', clipboardRead: true });
  assert.deepEqual(declined.service.grantsFor('a').flags(), { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false });
});

test('read_clipboard / write_clipboard: the flag first (official words), then app windows, then the takeover; the official results', async () => {
  const none = setup({ flags: {} });
  for (const [name, args, kind, flag] of [['read_clipboard', {}, 'read', 'clipboardRead'], ['write_clipboard', { text: 'x' }, 'write', 'clipboardWrite']]) {
    const result = await none.call(name, args);
    assert.equal(result.isError, true);
    const refused = body(result);
    assert.deepEqual([refused.ok, refused.outcome, refused.reasonCode], [false, 'unsupported', 'grant_flag_required']);
    assert.equal(refused.message, `Clipboard ${kind} is not granted. Request \`${flag}\` via request_access.`);
    assert.match(refused.next_step, new RegExp(`${flag}: true`));
  }
  assert.deepEqual(none.clip.log, [], 'nothing read or written');
  assert.equal(none.fullControl.holder(), null, 'no takeover');

  const { call, clip, fullControl, service } = setup({ clip: fakeClipboard('hello\nworld') });
  assert.equal(text(await call('read_clipboard')), JSON.stringify({ text: 'hello\nworld' }, null, 2));
  assert.equal(fullControl.holder(), 'a', 'it takes the screen like any screen-wide tool');
  assert.equal(text(await call('write_clipboard', { text: '新的 text' })), 'Clipboard written.');
  assert.equal(clip.text, '新的 text');
  assert.ok(Object.hasOwn(BLOCK, 'clipboard_unavailable'));
  // write_clipboard needs its text (official ki(): bad_args).
  assert.equal(service.clipboardPrecheck('a', 'write', {}).reasonCode, 'bad_args');
  assert.match(service.clipboardPrecheck('a', 'write', { text: 1 }).message, /text is required/);
  // No clipboard in this process: clipboard_unavailable (feature_unavailable), after the flag.
  const bare = createComputerUse({ native: fakeNative(), log: { info() {} }, fullControl: createFullControl() });
  bare.grantsFor('a').grant([{ bundleId: TEXTEDIT }], { clipboardRead: true });
  assert.deepEqual([bare.clipboardPrecheck('a', 'read').reasonCode, bare.clipboardPrecheck('a', 'read').errorKind], ['clipboard_unavailable', 'feature_unavailable']);
  assert.equal(bare.pastesText('a', 'a\nb'), false, 'no clipboard: type never pastes');
});

test('read_clipboard / write_clipboard refuse while the session holds app windows (official Di()), with the clipboard wording, and take nothing', async () => {
  const { call, service, clip, fullControl } = setup({ approve: false });
  await service.appScreenshot('a', { bundleId: TEXTEDIT }); // an app lock on TextEdit's window 7
  assert.deepEqual(service.appLockBundles('a'), [TEXTEDIT]);
  for (const [name, args, kind] of [['read_clipboard', {}, 'read'], ['write_clipboard', { text: 'x' }, 'write']]) {
    const result = await call(name, args);
    assert.equal(result.isError, true);
    const refused = body(result);
    assert.deepEqual([refused.reasonCode, refused.appLockHeld], ['state_conflict', [TEXTEDIT]]);
    assert.match(refused.message, new RegExp(`^Clipboard ${kind} is unavailable while you hold background app windows \\(TextEdit\\).*app_release`));
    assert.match(refused.next_step, /app_release/);
  }
  assert.deepEqual(clip.log, []);
  assert.equal(fullControl.holder(), null);
});

test('the clipboard guard (official ot()): a terminal in front empties the clipboard once, the text comes back with another app in front or at the turn end', async () => {
  let front = TERMINAL;
  const { call, clip, service } = setup({ grants: [{ bundleId: TEXTEDIT, displayName: 'TextEdit' }, { bundleId: TERMINAL, displayName: 'Terminal' }], clip: fakeClipboard('secret'), front: () => front });
  assert.equal(JSON.parse(text(await call('read_clipboard'))).text, '', 'emptied before the read');
  assert.equal(clip.text, '');
  const written = await call('write_clipboard', { text: 'inject' });
  assert.equal(written.isError, true);
  assert.deepEqual([body(written).reasonCode, body(written).tier], ['tier_insufficient', 'click']);
  assert.match(body(written).message, /tier-"click" app and is in front/);
  assert.equal(clip.text, '', 'not written');
  // Another app in front: the guard puts the text back before anything else.
  front = TEXTEDIT;
  assert.equal(JSON.parse(text(await call('read_clipboard'))).text, 'secret');
  // The display gates run the guard too; the turn end restores what is still put aside.
  front = TERMINAL;
  await service.frontmostTierGate('a', 'left_click');
  assert.equal(clip.text, '');
  await service.restoreClipboardStash('a');
  assert.equal(clip.text, 'secret');
  // The sub-gate off: no guard.
  const off = setup({ grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }], clip: fakeClipboard('keep'), front: TERMINAL, subGates: { clipboardGuard: false } });
  assert.equal(JSON.parse(text(await off.call('read_clipboard'))).text, 'keep');
});

test('type pastes text with a new line (official hi() + DPr()): old text read, new text written and read back, ⌘V aimed at the app, 100 ms, old text back', async () => {
  const { call, clip, native, waits } = setup({ clip: fakeClipboard('the user\'s text') });
  const long = `${'第一行 line one, '.repeat(300)}\n${'second 第二行 '.repeat(300)}`;
  const result = await call('type', { text: long });
  assert.equal(text(result), 'Typed (via clipboard).');
  assert.deepEqual(clip.log, ['read', ['write', long], 'read', ['write', 'the user\'s text']]);
  const key = native.calls.find(([method]) => method === 'hidKey');
  assert.deepEqual(key[1], { modifiers: ['cmd'], keys: ['v'], repeat: 1, frontPid: 42 });
  assert.equal(key[2], long, '⌘V is pressed while the new text is on the clipboard');
  assert.ok(!methods(native).includes('hidType'), 'nothing typed');
  assert.ok(waits.includes(PASTE_SETTLE_MS));
  assert.equal(clip.text, 'the user\'s text');
  // The frontmost app is checked once more before anything is written, and secure input asked.
  const order = methods(native);
  assert.ok(order.indexOf('probe') < order.indexOf('hidKey'));
  assert.equal(order.filter((m) => m === 'frontmostApp').length >= 2, true);
});

test('type does not paste: no new line, no clipboardWrite, the sub-gate off, secure input on — typed grapheme by grapheme, the clipboard untouched', async () => {
  for (const [what, options, input] of [
    ['one line', {}, 'no newline here'],
    ['no clipboardWrite', { flags: { clipboardRead: true } }, 'a\nb'],
    ['sub-gate off', { subGates: { clipboardPasteMultiline: false } }, 'a\nb'],
    ['secure input', { secure: true }, 'a\nb'],
  ]) {
    const { call, clip, native } = setup(options);
    const result = await call('type', { text: input });
    assert.match(text(result), /^Typed \d+ grapheme\(s\)\.$/, what);
    assert.deepEqual(clip.log, [], `${what}: the clipboard is never read or written`);
    assert.ok(methods(native).includes('hidType'), what);
    assert.ok(!native.calls.some(([method, params]) => method === 'hidKey' && params.keys?.includes('v')), what);
  }
});

test('a paste that never reached the app is typed instead; the clipboard is put back either way', async () => {
  // The text did not read back (official "Clipboard write did not round-trip."): ⌘V never pressed.
  const mangled = setup({ clip: fakeClipboard('old', { mangle: true }) });
  assert.match(text(await mangled.call('type', { text: 'x\ny' })), /^Typed 3 grapheme\(s\)\.$/);
  assert.ok(!methods(mangled.native).includes('hidKey'));
  assert.equal(mangled.clip.text, 'old');
  // ⌘V refused by the native gate (the user typing, after the 3 × 200 ms back-off): typed instead, clipboard back.
  const busy = { outcome: 'unsupported', delivered: false, reasonCode: 'user_actively_typing' };
  const refused = setup({ clip: fakeClipboard('old'), refuse: { hidKey: [busy, busy, busy, busy] } });
  assert.match(text(await refused.call('type', { text: 'x\ny' })), /^Typed 3 grapheme\(s\)\.$/);
  assert.equal(refused.native.calls.filter(([m]) => m === 'hidKey').length, 4);
  assert.equal(refused.clip.text, 'old');
});

test('a Stop during the ⌘V back-off sends no late paste and types nothing; the clipboard is put back', async () => {
  const busy = { outcome: 'unsupported', delivered: false, reasonCode: 'user_actively_typing' };
  // The user's Esc releases the display lock while ⌘V waits to retry (200 ms back-off).
  const stopped = setup({ clip: fakeClipboard('old'), refuse: { hidKey: [busy, busy, busy, busy] },
    onWait: async (ms, fullControl) => { if (ms === 200) fullControl.releaseAll(); } });
  const result = await stopped.call('type', { text: 'x\ny' });
  assert.equal(result.isError, true);
  assert.equal(body(result).reasonCode, 'aborted');
  assert.equal(stopped.native.calls.filter(([m]) => m === 'hidKey').length, 1, 'only the refused first ⌘V');
  assert.ok(!methods(stopped.native).includes('hidType'), 'not typed instead');
  assert.equal(stopped.clip.text, 'old');
});

test('a paste whose app lost the front is not typed: delivery_focus_check_failed ("Paste aborted before delivery"), nothing written', async () => {
  let n = 0;
  const { call, clip, native } = setup({ front: () => ({ pid: n++ === 0 ? 42 : 99, bundleId: n === 1 ? TEXTEDIT : 'com.apple.Notes' }) });
  const result = await call('type', { text: 'a\nb' });
  assert.equal(result.isError, true);
  assert.equal(body(result).reasonCode, 'delivery_focus_check_failed');
  assert.match(body(result).message, /^Paste aborted before delivery: "com\.apple\.Notes" came to the front/);
  assert.deepEqual(clip.log, []);
  assert.ok(!methods(native).includes('hidType') && !methods(native).includes('hidKey'));
  // The native per-keystroke check catching it at ⌘V: refused, clipboard put back, not typed.
  const late = setup({ clip: fakeClipboard('old'), refuse: { hidKey: [{ outcome: 'unsupported', delivered: false, reasonCode: 'delivery_focus_check_failed', frontmostBundleId: 'com.apple.Notes' }] } });
  const lateResult = await late.call('type', { text: 'a\nb' });
  assert.equal(body(lateResult).reasonCode, 'delivery_focus_check_failed');
  assert.match(body(lateResult).message, /^Paste aborted before delivery/);
  assert.equal(late.clip.text, 'old');
  assert.ok(!methods(late.native).includes('hidType'));
});

test('clipboard.cjs: the paste order, the guard stash, and the failure-to-read case', async () => {
  const clip = fakeClipboard('old', { failRead: false });
  const waits = [];
  const paste = createClipboard({ clipboard: clip, wait: async (ms) => { waits.push(ms); }, log: {} });
  const pressed = await paste.paste('a\nb', async () => { assert.equal(clip.text, 'a\nb'); return { outcome: 'ok', delivered: true }; });
  assert.equal(pressed.outcome, 'ok');
  assert.deepEqual(waits, [100]);
  assert.equal(clip.text, 'old');
  // Pressing throws: the old text still goes back.
  await assert.rejects(() => paste.paste('c\nd', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(clip.text, 'old');
  // Unreadable before: nothing to put back (official: logged, no restore).
  const blind = fakeClipboard('old', { failRead: true });
  const blindPaste = createClipboard({ clipboard: blind, wait: async () => {}, log: {} });
  const r = await blindPaste.paste('e\nf', async () => ({ outcome: 'ok', delivered: true }));
  assert.equal(r.reasonCode, 'clipboard_round_trip_failed', 'the read-back fails too, so nothing is pressed');
  assert.equal(blind.text, 'e\nf');
  // No clipboard at all.
  assert.equal(createClipboard({}).available(), false);
});

test('step rows (official Code-tab tables): Reading / Read / Failed to read clipboard, Copying / Copied / Failed to copy to clipboard, the Clipboard icon', () => {
  const item = (tool) => ({ type: 'mcpToolCall', server: 'code_desktop', tool, arguments: tool === 'write_clipboard' ? { text: 'x' } : {} });
  const read = computerUseAction(item('read_clipboard')), write = computerUseAction(item('write_clipboard'));
  assert.deepEqual(['busy', 'done', 'failed'].map((state) => computerUseLabel(read, state).label), ['Reading clipboard', 'Read clipboard', 'Failed to read clipboard']);
  assert.deepEqual(['busy', 'done', 'failed'].map((state) => computerUseLabel(write, state).label), ['Copying to clipboard', 'Copied to clipboard', 'Failed to copy to clipboard']);
  assert.equal(computerUseIcon(read).name, 'Clipboard');
  assert.equal(computerUseIcon(write).name, 'Clipboard');
});
