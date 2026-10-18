import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const abortError = () => Object.assign(new Error('Cowork SDK request cancelled.'), { name: 'AbortError' });

// Contract: index.chunk-CC1Xit3_.js ProcessTransport / Query / R9.
// Only explicit options cross this boundary; no shell, host environment or
// credential discovery. The VM process transport owns the command and mounts.
// R4i-cowork CW2: a rewind fork (2.42304.0 CB6cNSrW `X.resume=K.cliSessionId,X.resumeSessionAt=lt,X.forkSession=!0`)
// adds the SDK ProcessTransport's `--fork-session` and `--resume-session-at=${…}` in its order; CLI 2.1.280 allows
// --session-id with --resume only beside --fork-session ("--session-id can only be used with --continue or --resume if
// --fork-session is also specified") and needs --resume for --resume-session-at.
export function sdkArguments({ model, effort, resume, sessionId, resumeSessionAt, forkSession = false, permissionMode = 'default' } = {}) {
  if (!['default', 'acceptEdits', 'plan'].includes(permissionMode)) throw new Error('Unsupported Cowork permission mode.');
  if (typeof forkSession !== 'boolean') throw new Error('Invalid Cowork SDK forkSession.');
  if (resume && sessionId && !forkSession) throw new Error('Specify either a resumed or a new Cowork session.');
  if ((forkSession || resumeSessionAt !== undefined) && !resume) throw new Error('A Cowork fork needs the session it resumes.');
  const args = ['--output-format', 'stream-json', '--verbose', '--input-format', 'stream-json',
    '--permission-prompt-tool', 'stdio', '--include-partial-messages', '--permission-mode', permissionMode,
    '--setting-sources='];
  for (const [key, value] of Object.entries({ model, effort, resume, sessionId, resumeSessionAt })) {
    if (value !== undefined && (typeof value !== 'string' || !value || value.includes('\0'))) throw new Error(`Invalid Cowork SDK ${key}.`);
  }
  if (model) args.push('--model', model);
  if (effort) args.push('--effort', effort);
  if (resume) args.push(`--resume=${resume}`);
  if (forkSession) args.push('--fork-session');
  if (resumeSessionAt) args.push(`--resume-session-at=${resumeSessionAt}`);
  if (sessionId) args.push(`--session-id=${sessionId}`);
  return args;
}

// coworkd's sandbox supplies proxy variables and starts in the session home.
// Select the mounted work directory after sandbox entry, and keep API traffic
// on its enforcing proxy (NO_PROXY CIDRs otherwise cause ENETUNREACH).
// GNU env executes the SDK directly; no shell or interpolated command is used.
export function sdkLaunch({ cwd, ...options }) {
  if (!/^\/sessions\/[\w-]{1,100}\/mnt\/work$/.test(cwd)) throw new Error('Invalid Cowork SDK working directory.');
  return { command: '/usr/bin/env', args: ['-u', 'NO_PROXY', '-u', 'no_proxy', `--chdir=${cwd}`, '--', '/usr/local/bin/claude', ...sdkArguments(options)] };
}

export class CoworkSdkChannel extends EventEmitter {
  constructor({ process, handlers = {}, requestTimeoutMs = 30_000, maxRecordBytes = 16 * 1024 * 1024 }) {
    super();
    if (!Number.isSafeInteger(maxRecordBytes) || maxRecordBytes < 1 || !Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new Error('Invalid Cowork SDK limits.');
    this.process = process;
    this.handlers = handlers;
    this.requestTimeoutMs = requestTimeoutMs;
    this.maxRecordBytes = maxRecordBytes;
    this.pending = new Map();
    this.incoming = new Map();
    this.answered = new Map();
    this.closed = false;
    this.initialization = null;
    this.writeTail = Promise.resolve();
    // Start draining both pipes immediately; a diagnostic can never be parsed
    // as model output. Read stdout through EOF before publishing process exit.
    this.finished = this.readProcess();
  }

  initialize({ systemPrompt, appendSystemPrompt } = {}) {
    if (!this.initialization) {
      if (systemPrompt !== undefined && typeof systemPrompt !== 'string') throw new Error('Cowork system prompt must be text.');
      if (appendSystemPrompt !== undefined && typeof appendSystemPrompt !== 'string') throw new Error('Cowork appended prompt must be text.');
      this.initialization = this.request({ subtype: 'initialize',
        ...(systemPrompt !== undefined ? { systemPrompt: [systemPrompt] } : {}),
        ...(appendSystemPrompt !== undefined ? { appendSystemPrompt } : {}),
      }).then(response => response.response);
      this.initialization.catch(error => this.fail(error));
    }
    return this.initialization;
  }

  async sendUser(content, { uuid = randomUUID(), sessionId = '' } = {}) {
    if (!this.initialization) throw new Error('Initialize the Cowork SDK before sending a message.');
    if (typeof content !== 'string' || !content.trim()) throw new Error('Cowork message must contain text.');
    await this.initialization;
    await this.write({ type: 'user', session_id: sessionId, uuid,
      message: { role: 'user', content: [{ type: 'text', text: content }] }, parent_tool_use_id: null });
    return uuid;
  }

  async interrupt(options) {
    if (!this.initialization) throw new Error('Cowork SDK is not initialized.');
    await this.initialization;
    return (await this.request({ subtype: 'interrupt' }, options)).response;
  }

  request(request, { signal, timeoutMs = this.requestTimeoutMs } = {}) {
    if (this.closed) return Promise.reject(new Error('Cowork SDK channel is closed.'));
    if (signal?.aborted) return Promise.reject(abortError());
    if (!object(request) || typeof request.subtype !== 'string' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new Error('Invalid Cowork control request.'));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      let dispatched = false;
      const finish = (error, value) => {
        if (!this.pending.delete(id)) return;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error); else resolve(value);
      };
      const cancelWith = error => {
        finish(error);
        if (dispatched && !this.closed) void this.write({ type: 'control_cancel_request', request_id: id }).catch(error => this.fail(error));
      };
      const cancel = () => cancelWith(abortError());
      const timer = setTimeout(() => cancelWith(new Error(`Cowork ${request.subtype} request timed out.`)), timeoutMs);
      this.pending.set(id, { finish, subtype: request.subtype });
      signal?.addEventListener('abort', cancel, { once: true });
      void this.write({ type: 'control_request', request_id: id, request }, () => {
        if (!this.pending.has(id)) return false;
        dispatched = true;
        return true;
      }).catch(error => finish(error));
    });
  }

  write(record, beforeWrite = () => true) {
    const text = JSON.stringify(record) + '\n';
    if (Buffer.byteLength(text) > this.maxRecordBytes) return Promise.reject(new Error('Cowork SDK input record is too large.'));
    const operation = this.writeTail.then(async () => {
      if (this.closed) throw new Error('Cowork SDK channel is closed.');
      await this.process.ready;
      if (this.closed) throw new Error('Cowork SDK channel is closed.');
      if (!beforeWrite()) return;
      await new Promise((resolve, reject) => this.process.stdin.write(text, error => error ? reject(error) : resolve()));
    });
    this.writeTail = operation.catch(() => {});
    return operation;
  }

  async readProcess() {
    const diagnostics = (async () => {
      try { for await (const chunk of this.process.stderr) this.emit('diagnostic', chunk.toString('utf8')); }
      catch (error) { if (!this.closed) this.fail(error); }
    })();
    try {
      let parts = [], size = 0;
      const append = part => {
        size += part.length;
        if (size > this.maxRecordBytes) throw new Error('Cowork SDK output record is too large.');
        parts.push(part);
      };
      const consume = () => {
        const line = Buffer.concat(parts, size).toString('utf8').trim();
        parts = []; size = 0;
        if (!line) return;
        let record;
        try { record = JSON.parse(line); } catch { throw new Error('Cowork SDK emitted invalid stream-json.'); }
        if (!object(record) || typeof record.type !== 'string') throw new Error('Cowork SDK emitted an invalid record.');
        this.receive(record);
      };
      for await (const value of this.process.stdout) {
        if (this.closed) break;
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        let start = 0, newline;
        while ((newline = chunk.indexOf(10, start)) !== -1) {
          append(chunk.subarray(start, newline)); consume(); start = newline + 1;
        }
        if (start < chunk.length) append(chunk.subarray(start));
      }
      if (!this.closed && size) consume();
      const result = await this.process.completion;
      await diagnostics;
      const error = result.error || (result.code !== 0 || result.signal
        ? new Error(`Cowork SDK exited (code ${result.code ?? 'unknown'}, signal ${result.signal || 'none'}).`) : null);
      if (error && !this.closed) this.fail(error);
      else this.terminate(new Error('Cowork SDK process ended.'));
      this.emit('exit', result);
      return result;
    } catch (error) {
      this.fail(error);
      return { code: null, signal: null, error };
    }
  }

  receive(record) {
    if (this.closed) return;
    if (record.type === 'control_response') {
      const response = record.response;
      if (!object(response) || typeof response.request_id !== 'string' || !['success', 'error'].includes(response.subtype)) throw new Error('Cowork SDK emitted an invalid control response.');
      const pending = this.pending.get(response.request_id);
      if (!pending) return; // Late timeout/abort responses do not resolve another request.
      pending.finish(response.subtype === 'error' ? new Error(typeof response.error === 'string' ? response.error : 'Cowork control request failed.') : null, response);
      if (pending.subtype === 'initialize' && response.subtype === 'success') {
        for (const key of ['pending_permission_requests', 'pending_user_dialog_requests']) {
          for (const request of Array.isArray(response[key]) ? response[key] : []) this.receive(request);
        }
      }
    } else if (record.type === 'control_request') {
      if (typeof record.request_id !== 'string' || !record.request_id || !object(record.request) || typeof record.request.subtype !== 'string') throw new Error('Cowork SDK emitted an invalid control request.');
      void this.handleControl(record).catch(error => this.fail(error));
    } else if (record.type === 'control_cancel_request') {
      const controller = this.incoming.get(record.request_id);
      controller?.abort();
      this.incoming.delete(record.request_id);
    } else if (record.type !== 'keep_alive') this.emit('message', record);
  }

  async handleControl({ request_id: id, request }) {
    if (this.incoming.has(id)) return;
    if (this.answered.has(id)) { await this.write(this.answered.get(id)); return; }
    const controller = new AbortController();
    this.incoming.set(id, controller);
    let response;
    try {
      let value;
      const handler = Object.hasOwn(this.handlers, request.subtype) && this.handlers[request.subtype];
      if (typeof handler === 'function') value = await handler(request, { signal: controller.signal, requestId: id });
      else if (request.subtype === 'can_use_tool') value = { behavior: 'deny', message: 'Tool approval is not connected.' };
      else throw new Error(`Unsupported Cowork control request: ${request.subtype}.`);
      if (!object(value)) throw new Error('Invalid Cowork control response from host.');
      if (request.subtype === 'can_use_tool') {
        if (!['allow', 'deny'].includes(value.behavior) || (value.behavior === 'allow' && !object(value.updatedInput))) throw new Error('Invalid Cowork tool permission decision.');
        value = { ...value, toolUseID: request.tool_use_id };
      }
      response = { type: 'control_response', response: { subtype: 'success', request_id: id, response: value } };
    } catch (error) {
      response = { type: 'control_response', response: { subtype: 'error', request_id: id, error: error.message || 'Cowork host request failed.' } };
    }
    try {
      if (this.closed || controller.signal.aborted || this.incoming.get(id) !== controller) return;
      this.answered.set(id, response);
      while (this.answered.size > 256) this.answered.delete(this.answered.keys().next().value);
      await this.write(response);
    } finally {
      if (this.incoming.get(id) === controller) this.incoming.delete(id);
    }
  }

  terminate(error) {
    if (this.closed) return false;
    this.closed = true;
    for (const { finish } of this.pending.values()) finish(error);
    for (const controller of this.incoming.values()) controller.abort();
    this.incoming.clear(); this.answered.clear();
    return true;
  }

  fail(error) {
    error = error instanceof Error ? error : new Error(error?.message || String(error));
    if (!this.terminate(error)) return;
    // Failure is separate from Node's special unhandled 'error' event.
    this.emit('failure', error);
    void this.process.kill('SIGKILL').catch(() => {});
  }

  close() {
    if (this.terminate(new Error('Cowork SDK channel closed.'))) void this.process.kill('SIGTERM').catch(() => {});
    return this.finished;
  }
}
