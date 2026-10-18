// /copy [N] (2.42304.0, research/composer.md §3.18 composer-n02, work item composer-copy-command): copy Claude's latest
// reply, or the Nth latest one. The official pieces are generated from the 2.42304.0 sources by
// scripts/extract-code-composer.mjs: the argument parser QX (copy-reply-arg.mjs) and the replies reader eZ / $X over the
// transcript predicates of c227f4d5e (copy-reply-replies.mjs, transcript-replies.mjs). This module is the host side:
//   - the open session's protocol items (state.items[id]) mapped to the official transcript entries eZ reads;
//   - cc43287c9 `case "copy-reply"` (readable :14378-14449) transcribed over them: the four refusals (addError), the
//     plain + HTML clipboard write (Yb = c227f4d5e rE: markdown -> HTML with breaks, then copyToClipboard({text, html}))
//     with 'Reply copied to clipboard.' (addSuccess), and on a failed write restoreComposer('/copy N') plus the failure
//     toast. 'refused' keeps the draft (the official submit path clears the composer only on 'ran').
// The registration (cc183b3ab: {name: "copy", argumentHint: "[N]", terminalAction: "copy-reply", hideIfCliHas: !0,
// gate: hostInterceptSurface && hasSession}) is the 'copy' row of session-command-model.mjs.
import { parseCopyReplyCount } from './generated/code-composer/copy-reply-arg.mjs';
import { copyReplyTranscript } from './generated/code-composer/copy-reply-replies.mjs';
import { clipboardEnvironment, writeClipboardPayload } from './clipboard-payload.mjs';
import { markdownToClipboardHtml } from './rich-copy-html.mjs';
import { t, tn } from '../electron/i18n/index.mjs';

// cc183b3ab E.copy (X7oz/QBPDV) and the copy-reply case's messages, in the official English (D23 keeps "Claude").
export const COPY_REPLY_DESCRIPTION = 'Copy Claude’s latest reply, or /copy 2 or higher for an earlier one';
export const COPY_REPLY_MESSAGES = Object.freeze({
  badArgument: 'That isn’t a reply number. Use /copy for Claude’s latest reply, or /copy 2 or higher for an earlier one.', // d6GVin8ZgF
  replying: 'Claude is still replying. Send /copy when the reply is done.', // iAkUwGZZtY
  none: 'There’s no reply to copy yet.', // iZ+iUUQvSB
  // kT+SiiA0vq "{count, plural, one {Only # reply is available to copy. Use /copy without a number.} other {Only # replies
  // are available to copy. Use a number up to #.}}": the host catalog keeps the two plural forms as keys (tn).
  exceedsOne: 'Only {count} reply is available to copy. Use /copy without a number.',
  exceedsOther: 'Only {count} replies are available to copy. Use a number up to {count}.',
  copied: 'Reply copied to clipboard.', // wSG94kLy28
  failed: 'Couldn’t copy the reply to the clipboard. Try again.', // z7U1VhFXoU
});

// Host adapter: the official transcript entries eZ / $X read, from the session's protocol items in order.
//   - userMessage -> a user entry with its content as text / image items: a turn boundary (c227f4d5e _E);
//   - the user's own '!' command (commandExecution, source userShell: Codex thread/shellCommand) -> a user bash entry,
//     which the official predicates neither treat as a boundary nor as a reply (Ih === "bash");
//   - every other item -> an assistant entry; an agentMessage carries its text as a text item, anything else (reasoning,
//     tools, file changes, compaction, …) a non-text item. A reply is then every assistant entry back to its turn
//     boundary, its text items joined by a blank line (cE), as the official transcript reads one.
// Host differences: there are no synthetic / derived / held / channel / localOutput / provisional entries here (local
// command rows such as /status never enter state.items), and a turn the agent starts without a user message (a goal
// continuation) belongs to the previous reply, as an official entry without a user boundary does.
export function copyReplyEntries(items = []) {
  const entries = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'userMessage') {
      const content = Array.isArray(item.content) ? item.content : [];
      entries.push({ id: item.id, author: 'user', items: content.map(part => (part?.type === 'image' || part?.type === 'localImage'
        ? { kind: 'image' } : { kind: 'text', text: typeof part?.text === 'string' ? part.text : '' })) });
    } else if (item.type === 'commandExecution' && item.source === 'userShell') {
      entries.push({ id: item.id, author: 'user', items: [{ kind: 'bash', command: typeof item.command === 'string' ? item.command : '' }] });
    } else {
      entries.push({ id: item.id, author: 'assistant', items: [item.type === 'agentMessage'
        ? { kind: 'text', text: typeof item.text === 'string' ? item.text : '' } : { kind: item.type ?? 'unknown' }] });
    }
  }
  return entries;
}

/**
 * What /copy [arg] does now: {kind: 'refused', reason, message} or {kind: 'copy', text, entryId}. `responding` is the
 * session's live turn (the transcript's `responding`); `items` its protocol items.
 */
export function copyReplyDecision({ arg = '', items = [], responding = false } = {}) {
  const count = parseCopyReplyCount(arg);
  if (count === null) return { kind: 'refused', reason: 'bad-argument', message: t(COPY_REPLY_MESSAGES.badArgument) };
  const { replying, replies } = copyReplyTranscript({ entries: copyReplyEntries(items), responding: !!responding });
  if (replying) return { kind: 'refused', reason: 'replying', message: t(COPY_REPLY_MESSAGES.replying) };
  if (replies.length === 0) return { kind: 'refused', reason: 'none', message: t(COPY_REPLY_MESSAGES.none) };
  const reply = replies[replies.length - count];
  if (reply === undefined) return { kind: 'refused', reason: 'exceeds',
    message: tn(replies.length, COPY_REPLY_MESSAGES.exceedsOne, COPY_REPLY_MESSAGES.exceedsOther, { count: replies.length }) };
  return { kind: 'copy', text: reply.text, entryId: reply.entryId };
}

// Yb (c227f4d5e rE): text/plain plus the reply's markdown as text/html (breaks on), the HTML dropped when it can't be
// built; the host clipboard path every message Copy takes (clipboard-payload.mjs, the owning window's clipboard).
export function writeReplyToClipboard(text, node) {
  let html = '';
  try { html = markdownToClipboardHtml(text, { breaks: true }); } catch { html = ''; }
  return writeClipboardPayload(clipboardEnvironment(node), { text, html });
}

/**
 * Run /copy [arg] (`name` is the command as typed, lower-cased). notify(message, {variant}) shows the toast (danger for
 * the official addError, neutral for addSuccess); restore(text) puts '/copy N' back into an empty composer of the same
 * session (restoreComposer). Returns {status: 'refused' | 'ran', settled}: settled resolves once the clipboard answered.
 */
export function runCopyReply({ name = 'copy', arg = '', items = [], responding = false, node = null, notify = () => {}, restore = () => {},
  write = writeReplyToClipboard } = {}) {
  const decision = copyReplyDecision({ arg, items, responding });
  if (decision.kind === 'refused') {
    notify(decision.message, { variant: 'danger' });
    return { status: 'refused', reason: decision.reason, settled: Promise.resolve(false) };
  }
  // The write starts now, inside the Enter / click that ran the command (as Yb(u.text, …) does), not a tick later.
  let written;
  try { written = Promise.resolve(write(decision.text, node)); } catch { written = Promise.resolve(false); }
  const settled = written.catch(() => false).then((ok) => {
    if (ok) notify(t(COPY_REPLY_MESSAGES.copied), { variant: 'neutral' });
    else {
      restore(arg === '' ? `/${name}` : `/${name} ${arg}`);
      notify(t(COPY_REPLY_MESSAGES.failed), { variant: 'danger' });
    }
    return !!ok;
  });
  return { status: 'ran', entryId: decision.entryId, settled };
}
