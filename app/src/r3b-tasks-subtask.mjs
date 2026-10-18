// R3b-tasks (tasks-05 / composer-06): /subtask <task>, the 2.42304.0 "fork this session to work on a task while you
// stay here" over the host's fork.
//
// Official flow (cc43287c9 send handler + cs/ls, caec4a2d4 yn and the fork mutation):
//   - parse: /^\/subtask(?:\s+(.*))?$/is; an empty task is refused with "Add a task after /subtask, then send it
//     again." (MbpoOYe8Db) and the draft stays;
//   - cs: a fork of this session still starting (hR) → 2veOTDyV4r; a task that starts with a command (c8f38bf1f i, `$j`:
//     `/` or `!` after leading invisible characters) → vYLcZuUvrF; anything attached or a session mention → fIPp4d6ViY.
//     Every refusal is addError (a danger toast) and sends nothing;
//   - otherwise the composer clears (Ro) and the fork starts with sendInBackground {text, generateTitle}: yn titles the
//     new session with cef1e6037 Sn(task) (its first six words, ≤ 60 characters), asks for a generated title that
//     replaces it unless the user renamed it meanwhile (vn), and sends the task to the fork (kt) without switching to
//     it (onSuccess skips the navigation when sendInBackground is set);
//   - the send resolved → addInfo "Started the subtask in a new session." (CAp88u+zH7);
//     the send failed → the task goes into the fork's message box (hn prefill, autoSubmit false) and addError
//     "The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box." (YlU3KKWvMl);
//   - the fork failed → onFailed hands the typed command back to this composer and addError reports the fork error.
//
// Host adapter: the fork is the host's session-operations fork (thread/fork + thread/name/set with the Sn name), the
// send a turn/start on the fork, the generated title codeDesktop/threadTitle on a core that answers titleRequest, the
// message boxes the host's per-session drafts. The caller (main.jsx executeCommand) passes those as functions, so this
// module only orders them; it never navigates.
import { t } from '../electron/i18n/index.mjs';
import { subtaskTitle } from './generated/r3b-tasks/subtask-title.mjs';
import { startsWithCommand } from './generated/r3b-tasks/command-prefix.mjs';

// The official defaultMessages (cc43287c9 / caec4a2d4), the i18n keys.
export const SUBTASK_MESSAGES = Object.freeze({
  empty: 'Add a task after /subtask, then send it again.',
  forkStarting: 'A fork of this session is still starting. Send this again in a moment.',
  command: 'A subtask can’t start with a command, so nothing was sent. Describe the task in words.',
  attachments: 'A subtask takes text only, so nothing was sent. Remove what’s attached and any session mentions, or use /fork.',
  forkFailed: 'Couldn’t fork this session.',
  started: 'Started the subtask in a new session.',
  sendFailed: 'The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box.',
});

// Why /subtask refuses this task (in the official order), or null. `mentions`: the composer's mentions; a literal one
// ('@mcp:github') is plain text and goes with the task, a file or session mention would be dropped, so it refuses as an
// attachment does.
export function subtaskRefusal({ task = '', attachments = [], mentions = [], forkStarting = false } = {}) {
  const text = String(task ?? '').trim();
  if (!text) return 'empty';
  if (forkStarting) return 'forkStarting';
  if (startsWithCommand(text)) return 'command';
  if ((Array.isArray(attachments) && attachments.length > 0) || (Array.isArray(mentions) && mentions.some(entry => entry && !entry.literal))) return 'attachments';
  return null;
}

// Runs /subtask. deps:
//   fork({name}) → {thread, warning?}   the host fork of the open session, staying on it (no navigation);
//   send(thread, text)                  the task as the fork's first message (a turn/start on the fork);
//   requestTitle?(thread, name, text)   a generated title for the fork while it still has `name` (best effort);
//   clear()                             empty this composer if it still holds the command;
//   restore()                           put the command back into this composer (the fork failed);
//   prefill(thread, text)               the task into the fork's message box (the send failed);
//   notify(message, {variant})          a toast (danger = addError, neutral = addInfo, warning).
// Returns {status: 'refused' | 'fork-failed' | 'send-failed' | 'sent', reason?, thread?, error?}.
export async function runSubtask({ task, attachments, mentions, forkStarting, fork, send, requestTitle, clear, restore, prefill, notify }) {
  const reason = subtaskRefusal({ task, attachments, mentions, forkStarting });
  if (reason) { notify(t(SUBTASK_MESSAGES[reason]), { variant: 'danger' }); return { status: 'refused', reason }; }
  const text = String(task).trim(), name = subtaskTitle(text);
  clear();
  let result;
  try { result = await fork({ name }); }
  catch (error) {
    restore();
    // The host's fork errors name the real cause (a running session, a changed connection, the core's refusal).
    notify(typeof error?.message === 'string' && error.message ? error.message : t(SUBTASK_MESSAGES.forkFailed), { variant: 'danger' });
    return { status: 'fork-failed', error };
  }
  const thread = result?.thread;
  if (!thread?.id) { restore(); notify(t(SUBTASK_MESSAGES.forkFailed), { variant: 'danger' }); return { status: 'fork-failed' }; }
  // The fork exists but kept a default title (session-operations: "The fork was created, but its title could not be updated.").
  if (typeof result.warning === 'string' && result.warning) notify(result.warning, { variant: 'warning' });
  try { requestTitle?.(thread, name, text); } catch {}
  try { await send(thread, text); }
  catch (error) {
    prefill(thread, text);
    notify(t(SUBTASK_MESSAGES.sendFailed), { variant: 'danger' });
    return { status: 'send-failed', thread, error };
  }
  notify(t(SUBTASK_MESSAGES.started), { variant: 'neutral' });
  return { status: 'sent', thread };
}
