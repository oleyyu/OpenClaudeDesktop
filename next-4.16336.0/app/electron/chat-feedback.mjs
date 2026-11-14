// w13-chatui-message-actions: Chat message feedback kept on this computer (plan-w13 E59; electron/chat-feedback-model.mjs).
// The official thumbs send the rating to claude.ai; OpenClaude writes it to <userData>/chat-feedback.json and uploads
// nothing. Writes go through a temporary file and a rename so a crash never leaves half a file.
import fs from 'node:fs/promises';
import path from 'node:path';
import { CHAT_FEEDBACK_FILE, emptyFeedbackStore, feedbackRequest, normalizeFeedbackStore, putFeedback, threadFeedback } from './chat-feedback-model.mjs';

export function createChatFeedbackStore({ dataDir, now = () => Date.now() }) {
  const file = () => path.join(typeof dataDir === 'function' ? dataDir() : dataDir, CHAT_FEEDBACK_FILE);
  let queue = Promise.resolve();
  async function read() {
    try { return normalizeFeedbackStore(JSON.parse(await fs.readFile(file(), 'utf8'))); }
    catch (error) { if (error?.code === 'ENOENT' || error instanceof SyntaxError) return emptyFeedbackStore(); throw error; }
  }
  async function write(store) {
    const target = file(), temp = `${target}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(temp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
    await fs.rename(temp, target);
  }
  // One request at a time, so two quick ratings never race the read-modify-write.
  function run(p) {
    let request;
    try { request = feedbackRequest(p); } catch (error) { return Promise.reject(error); }
    const job = queue.then(async () => {
      const store = await read();
      if (request.operation === 'list') return { data: threadFeedback(store, request.threadId) };
      const next = putFeedback(store, { ...request, at: now() });
      await write(next);
      return { data: threadFeedback(next, request.threadId) };
    });
    queue = job.catch(() => {});
    return job;
  }
  // w13-chatfn-history: a deleted chat's ratings go with it (thread/delete cascade, chat-history.mjs), on the same queue.
  function forget(threadId) {
    const job = queue.then(async () => {
      const store = await read();
      if (typeof threadId !== 'string' || !Object.hasOwn(store.threads, threadId)) return false;
      const threads = { ...store.threads };
      delete threads[threadId];
      await write({ ...store, threads });
      return true;
    });
    queue = job.catch(() => {});
    return job;
  }
  return { run, forget, file };
}
