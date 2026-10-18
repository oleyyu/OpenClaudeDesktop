import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { guestWorkdir } from './session-paths.mjs';
import { outputSnapshot, changedOutputs } from './deliverables.mjs';
import { readRewindTranscript, sessionConfigDir, decideRewind, assistantMidTurn, isToolResultUser, isForkRefusal, validCliSessionId,
  REWIND_SEND_RACE, REWIND_START_RACE } from './rewind-chain.mjs';

const clone = value => structuredClone(value);
const now = () => Math.floor(Date.now() / 1000);
export const COWORK_ENGINE = 'cowork-vm';

// Main-owned thread/turn facade. The renderer never chooses executable paths,
// mount sources, environment variables or native process IDs.
/** CB6cNSrW tg over a host userMessage item: its text parts, joined. */
const promptText = item => Array.isArray(item?.content) ? item.content.filter(part => part.type === 'text').map(part => part.text).join('\n') : null;
/** The host message buffer for ag: each turn's prompt (uuid = the item id the host sends to the CLI) and its CLI records. */
const rewindBuffer = row => row.thread.turns.flatMap(turn => {
  const prompt = turn.items[0];
  return [...(prompt?.type === 'userMessage' ? [{ type: 'user', uuid: prompt.id, message: { content: prompt.content } }] : []), ...(row.cliRecords?.[turn.id] || [])];
});

export class CoworkSessions {
  constructor({ dataDir, host, provider, approveFolder, approval, emit, onThread = () => {}, runtime = {} }) {
    Object.assign(this, { dataDir, host, provider, approveFolder, approval, emit, onThread, runtime });
    this.root = path.join(dataDir, 'cowork-runtime', 'threads');
    this.rows = new Map(); this.live = new Map(); this.approvals = new Map();
    // R4i-cowork CW2: 2.42304.0 CB6cNSrW `_sendCommitGen` — a send committed while a rewind reads aborts the rewind.
    this.sendGen = new Map();
    host.on('event', event => this.observe(event));
  }
  owns(id) { return typeof id === 'string' && /^cw-[a-f0-9-]{36}$/.test(id); }
  file(id) { if (!this.owns(id)) throw new Error('Invalid Cowork session.'); return path.join(this.root, `${id}.json`); }
  save(row) {
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const file = this.file(row.thread.id), temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(row), { mode: 0o600 }); fs.renameSync(temp, file);
    this.onThread(this.view(row, false));
  }
  load(id) {
    if (this.rows.has(id)) return this.rows.get(id);
    let row;
    try { row = JSON.parse(fs.readFileSync(this.file(id), 'utf8')); } catch { throw new Error('Cowork session could not be read.'); }
    if (row.engine !== COWORK_ENGINE || row.thread.id !== id) throw new Error('Cowork session ownership does not match.');
    this.rows.set(id, row);
    for (const turn of row.thread.turns) if (turn.status === 'inProgress') {
      turn.status = 'interrupted'; turn.completedAt = now(); turn.error = { message: 'The app stopped before this task finished.' };
      for (const item of turn.items) if (item.status === 'inProgress') item.status = 'failed';
    }
    this.save(row); return row;
  }
  view(row, turns = true) { return clone({ ...row.thread, turns: turns ? row.thread.turns : [], status: { type: this.live.has(row.thread.id) ? 'active' : 'idle' } }); }
  async request(method, params = {}) {
    if (method === 'thread/start') {
      const cwd = await this.approveFolder(params.cwd);
      const chosen = await this.provider(params.model); // Validate config before creating an empty session.
      const id = `cw-${randomUUID()}`;
      const row = { engine: COWORK_ENGINE, sdkSessionId: randomUUID(), sdkStarted: false, archived: false,
        model: params.model || chosen.model, instructions: params.developerInstructions || '',
        thread: { id, name: '', preview: '', cwd, createdAt: now(), updatedAt: now(), cliVersion: 'cowork-vm 1',
          source: 'appServer', modelProvider: COWORK_ENGINE, historyMode: 'legacy', path: null, turns: [] } };
      this.rows.set(id, row); this.save(row);
      return { thread: this.view(row), model: row.model, modelProvider: COWORK_ENGINE, cwd, approvalPolicy: 'on-request', sandbox: { type: 'workspaceWrite', writableRoots: [cwd] } };
    }
    const row = this.load(params.threadId), id = row.thread.id;
    if (['thread/read', 'thread/resume'].includes(method)) return { thread: this.view(row, params.includeTurns !== false), model: row.model, modelProvider: COWORK_ENGINE, cwd: row.thread.cwd };
    if (method === 'thread/name/set') {
      if (typeof params.name !== 'string' || !params.name.trim()) throw new Error('Cowork session name cannot be empty.');
      row.thread.name = params.name.trim().slice(0, 200); this.save(row); return {};
    }
    if (method === 'thread/unsubscribe') return {};
    if (method === 'thread/queue/list' || method === 'thread/backgroundTerminals/list') return { data: [], nextCursor: null };
    if (method === 'thread/goal/get') return { goal: null };
    if (method === 'thread/archive' || method === 'thread/unarchive' || method === 'thread/delete') {
      if (this.live.has(id)) throw new Error('Stop the Cowork task before archiving or deleting it.');
      if (method === 'thread/delete') { fs.unlinkSync(this.file(id)); this.rows.delete(id); }
      else { row.archived = method === 'thread/archive'; this.save(row); }
      return {};
    }
    if (method === 'turn/interrupt') {
      const live = this.live.get(id);
      if (!live) return {};
      if (params.turnId && params.turnId !== live.turn.id) throw new Error('The Cowork turn changed.');
      live.cancelled = true;
      try { await this.host.request('close', { sessionId: id, turnId: live.turn.id }, 5000); }
      finally { this.finish(id, 'interrupted'); }
      return {};
    }
    if (method === 'cowork/rewind') return this.rewind(row, params.targetMessageUuid);
    if (method !== 'turn/start') throw new Error(`Cowork does not support ${method}.`);
    if (this.live.has(id)) throw new Error('A Cowork task is already running in this session.');
    if (params.cwd && params.cwd !== row.thread.cwd) throw new Error('Open a new Cowork session to change its folder.');
    if (!Array.isArray(params.input) || !params.input.length || params.input.some(item => item.type !== 'text' || typeof item.text !== 'string'))
      throw new Error('Cowork currently accepts text and files in its selected folder. Put attachments in that folder and reference them in your message.');
    const text = params.input.map(item => item.text).join('\n');
    if (!text.trim()) throw new Error('Enter a Cowork task.');
    const chosen = await this.provider(params.model || row.model);
    const permission = params.codeDesktop?.permissionMode || params.codeDesktop?.workflowTurn?.permission;
    if (permission === 'bypass' || params.sandboxPolicy?.type === 'dangerFullAccess') throw new Error('Cowork VM requires tool approvals; bypass mode is not enabled.');
    const permissionMode = permission === 'plan' || params.collaborationMode?.mode === 'plan' || params.sandboxPolicy?.type === 'readOnly' ? 'plan' : permission === 'acceptEdits' ? 'acceptEdits' : 'default';
    const turn = { id: randomUUID(), items: [], status: 'inProgress', error: null, startedAt: now(), completedAt: null };
    this.sendGen.set(id, (this.sendGen.get(id) ?? 0) + 1);
    row.thread.turns.push(turn); row.thread.updatedAt = now(); row.thread.preview ||= text.slice(0, 160); row.model = params.model || row.model;
    const live = { row, turn, streams: new Map(), cancelled: false, permissionMode, outputs: outputSnapshot(row.thread.cwd), launch: this.launchFor(row) };
    this.live.set(id, live); this.save(row);
    this.note('turn/started', id, { turn });
    this.item(live, { id: randomUUID(), type: 'userMessage', content: clone(params.input) }, true);
    setImmediate(() => void this.run(live, chosen, text).catch(error => { if (this.live.get(id) === live) this.finish(id, live.cancelled ? 'interrupted' : 'failed', error.message); }));
    return { turn: clone(turn) };
  }
  note(method, threadId, params) { this.emit({ kind: 'notification', method, params: clone({ threadId, ...params }) }); }
  item(live, item, completed = false) {
    const index = live.turn.items.findIndex(entry => entry.id === item.id);
    if (index < 0) live.turn.items.push(item); else live.turn.items[index] = item;
    this.note(index < 0 ? 'item/started' : completed ? 'item/completed' : 'item/started', live.row.thread.id, { turnId: live.turn.id, item });
    if (index < 0 && completed) this.note('item/completed', live.row.thread.id, { turnId: live.turn.id, item });
  }
  async run(live, provider, text) {
    const { row } = live, sessionId = row.thread.id;
    if (live.cancelled || this.live.get(sessionId) !== live) return;
    const { launch } = live;
    await this.host.request('open', { runtime: { dataDir: this.dataDir, ...this.runtime }, sessionId, turnId: live.turn.id, sdkSessionId: launch.sdkSessionId,
      resume: launch.resume, ...(launch.fork ? { fork: { ...launch.fork } } : {}), cwd: row.thread.cwd, provider, permissionMode: live.permissionMode,
      instructions: `${row.instructions}\nWork in the selected folder mounted as your current directory. Save deliverables in ./outputs. Use the available tools to complete the task. Do not claim to have created files unless you actually wrote them.` }, 180_000);
    if (live.cancelled || this.live.get(sessionId) !== live) { await this.host.request('close', { sessionId, turnId: live.turn.id }); return; }
    await this.host.request('send', { sessionId, turnId: live.turn.id, sdkSessionId: launch.sdkSessionId, text, messageId: live.turn.items[0].id });
  }
  // R4i-cowork CW2: CB6cNSrW launch (`let lt=K?.pendingRewindTo`): a pending rewind resumes the CLI session at the fork
  // point with forkSession (`X.resume=K.cliSessionId,X.resumeSessionAt=lt,X.forkSession=!0`); "" (first-message
  // rewind) starts fresh. Host: the fork names its new SDK session (--session-id beside --fork-session, allowed by CLI
  // 2.1.280) so init still proves the identity; a CLI that answers with its own new id is adopted (see message()).
  launchFor(row) {
    const pending = row.pendingRewindTo;
    if (pending === undefined) return { sdkSessionId: row.sdkSessionId, resume: row.sdkStarted };
    if (pending && row.sdkStarted) return { sdkSessionId: randomUUID(), resume: false, fork: { from: row.sdkSessionId, at: pending } };
    return { sdkSessionId: randomUUID(), resume: false };
  }
  // R4i-cowork CW2: the host rewindSessionV2 (2.42304.0 CB6cNSrW `async rewindSessionV2(`, reached from preload
  // `LocalAgentModeSessions_$_rewindV2` through bqqpX_jW `n.rewindSessionV2(e,r)`). It never touches files: read the
  // target's text and the CLI transcript, decide the fork point (rewind-chain.mjs), stop the session, record
  // pendingRewindTo for the next launch and return {prefill} or {refusal}. The host also cuts the turns from the target
  // on, which the official view does by reading the transcript only up to pendingRewindTo.
  async rewind(row, targetUuid) {
    const id = row.thread.id;
    if (typeof targetUuid !== 'string' || !targetUuid) throw new Error('Unknown Cowork message.');
    const wasLive = this.live.has(id), gen = this.sendGen.get(id) ?? 0;
    const turnIndex = row.thread.turns.findIndex(turn => turn.items[0]?.type === 'userMessage' && turn.items[0].id === targetUuid);
    let text = turnIndex >= 0 ? promptText(row.thread.turns[turnIndex].items[0]) : null;
    const foundInBuffer = text !== null, buffer = rewindBuffer(row);
    const { chain, targetText } = await readRewindTranscript({ configDir: sessionConfigDir(this.dataDir, id),
      cliSessionId: row.sdkStarted ? row.sdkSessionId : undefined, targetUuid });
    if (text === null) text = targetText;
    const decision = decideRewind({ chain, buffer, targetUuid, text, foundInBuffer });
    if (!wasLive && this.live.has(id)) throw new Error(REWIND_START_RACE);
    if (decision.refusal) return { refusal: decision.refusal };
    const raced = () => { if ((this.sendGen.get(id) ?? 0) !== gen) throw new Error(REWIND_SEND_RACE); };
    raced();
    if (this.live.has(id)) await this.request('turn/interrupt', { threadId: id });
    raced();
    // Await the prior CLI process (official `_priorVmProcessId` wait); the runtime retires it before answering.
    if (row.sdkStarted) await this.host.request('close', { sessionId: id }, 15_000).catch(() => {});
    raced();
    const removed = turnIndex >= 0 ? row.thread.turns.splice(turnIndex) : [];
    for (const turn of removed) if (row.cliRecords) delete row.cliRecords[turn.id];
    if (decision.forkAt !== undefined) row.pendingRewindTo = decision.forkAt;
    row.thread.updatedAt = now(); this.save(row);
    return { prefill: text };
  }
  observe(event) {
    if (event.event === 'status') { this.emit({ kind: 'cowork-runtime', ...event }); return; }
    if (event.event === 'disconnected') { for (const id of [...this.live.keys()]) this.finish(id, 'failed', event.error); return; }
    if (event.event === 'approval-cancel') { this.approvals.get(event.id)?.abort(); return; }
    const live = this.live.get(event.sessionId);
    if (!live) return;
    if (event.turnId && event.turnId !== live.turn.id) return;
    if (event.event === 'approval') { void this.handleApproval(live, event); return; }
    if (event.event === 'failure' || event.event === 'exit') {
      this.finish(event.sessionId, live.cancelled ? 'interrupted' : 'failed', event.error || 'Cowork SDK exited before returning a result.'); return;
    }
    if (event.event !== 'message') return;
    try { this.message(live, event.record); }
    catch (error) { this.finish(event.sessionId, 'failed', error.message); }
  }
  message(live, record) {
    const { row, turn } = live, id = row.thread.id;
    const hostText = text => String(text).replaceAll(`${guestWorkdir(id)}/`, row.thread.cwd.replace(/\/$/, '') + '/').replaceAll(`/sessions/${id}/mnt/work/`, row.thread.cwd.replace(/\/$/, '') + '/');
    if (record.type === 'system' && record.subtype === 'init') {
      const { launch } = live;
      if (!live.initialized) {
        // A fork's CLI may name the new session itself; adopt it unless it is the session being forked (not verified live).
        const adopt = !!launch.fork && validCliSessionId(record.session_id) && record.session_id !== launch.fork.from;
        if (record.session_id !== launch.sdkSessionId && !adopt) throw new Error('Cowork SDK returned a different session identity.');
        live.initialized = true; row.sdkSessionId = record.session_id;
        // CB6cNSrW onSystemInit: `r.pendingRewindTo=void 0`.
        delete row.pendingRewindTo;
      } else if (record.session_id !== row.sdkSessionId) throw new Error('Cowork SDK returned a different session identity.');
      row.sdkStarted = true; this.save(row);
    }
    // Nested agent output remains in its tool result, not the parent's reply.
    if (record.parent_tool_use_id) return;
    // R4i-cowork CW2: the host's message buffer for the rewind (official `messageBuffer`, read by ag): top-level CLI
    // record uuids per turn, kept beside the thread (never sent to the renderer).
    if (typeof record.uuid === 'string' && record.uuid !== turn.items[0]?.id && (record.type === 'assistant' || (record.type === 'user' && isToolResultUser(record)))) {
      const records = ((row.cliRecords ||= {})[turn.id] ||= []);
      records.push(record.type === 'assistant' ? { type: 'assistant', uuid: record.uuid, midTurn: assistantMidTurn(record) === true } : { type: 'user', uuid: record.uuid, toolResult: true });
    }
    if (record.type === 'stream_event') {
      const event = record.event;
      if (event.type === 'message_start') { live.messageId = event.message.id; live.streams.clear(); }
      if (event.type === 'content_block_start') {
        const block = event.content_block, itemId = `${live.messageId}:${event.index}`;
        if (block.type === 'text') { const item = { id: itemId, type: 'agentMessage', text: block.text || '', phase: 'commentary' }; live.streams.set(event.index, item); this.item(live, item); }
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const item = live.streams.get(event.index);
        if (item) { item.text += event.delta.text; this.note('item/agentMessage/delta', id, { turnId: turn.id, itemId: item.id, delta: event.delta.text }); }
      }
    }
    if (record.type === 'assistant') {
      // R4i-cowork CW4 (X2 CW-7): a refused reply keeps the API's stop_reason / stop_details on each of its rows, the
      // fields 2.42304.0 shared-52 _B reads off the last assistant record (`e.stop_reason==="refusal"?{stopDetails:…}`).
      const stop = record.message?.stop_reason === 'refusal' ? { codeDesktop: { stopReason: 'refusal', stopDetails: record.message.stop_details ?? null } } : {};
      for (const [index, block] of (record.message?.content || []).entries()) {
        if (block.type === 'text') this.item(live, { id: `${record.message.id}:${index}`, type: 'agentMessage', text: hostText(block.text), phase: 'commentary', ...stop }, true);
        if (block.type === 'thinking') this.item(live, { id: `${record.message.id}:${index}`, type: 'reasoning', summary: [], content: [block.thinking], ...stop }, true);
        if (block.type === 'tool_use') {
          this.item(live, { id: block.id, type: 'dynamicToolCall', namespace: null, tool: block.name,
            arguments: block.input, status: 'inProgress', contentItems: null, success: null, durationMs: null, ...stop });
          if (block.name === 'TodoWrite' && Array.isArray(block.input?.todos)) {
            this.note('turn/plan/updated', id, { turnId: turn.id, explanation: null,
              plan: block.input.todos.filter(todo => typeof todo.content === 'string').map(todo => ({ step: todo.content,
                status: todo.status === 'completed' ? 'completed' : todo.status === 'in_progress' ? 'inProgress' : 'pending' })) });
          }
        }
      }
      this.save(row);
    }
    if (record.type === 'user') for (const block of record.message?.content || []) {
      if (block.type !== 'tool_result') continue;
      const item = turn.items.find(item => item.id === block.tool_use_id);
      if (item) {
        const text = typeof block.content === 'string' ? block.content : (block.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n');
        this.item(live, { ...item, status: block.is_error ? 'failed' : 'completed', success: !block.is_error, contentItems: [{ type: 'inputText', text }] }, true);
      }
    }
    if (record.type === 'result') {
      if (record.result && !turn.items.some(item => item.type === 'agentMessage')) this.item(live, { id: randomUUID(), type: 'agentMessage', text: hostText(record.result), phase: 'final_answer' }, true);
      const last = turn.items.findLast(item => item.type === 'agentMessage');
      if (last) this.item(live, { ...last, phase: 'final_answer' }, true);
      this.finish(id, record.is_error || record.subtype !== 'success' ? 'failed' : 'completed', record.is_error ? record.errors?.join('; ') || record.result || 'Cowork task failed.' : undefined);
    }
  }
  async handleApproval(live, event) {
    const controller = new AbortController(); this.approvals.set(event.id, controller);
    const { request } = event;
    let response = { behavior: 'deny', message: 'Permission declined.' };
    try {
      const questions = request.tool_name === 'AskUserQuestion' && Array.isArray(request.input?.questions) ? request.input.questions : null;
      if (questions?.length) {
        const result = await this.approval('item/tool/requestUserInput', { threadId: live.row.thread.id, turnId: live.turn.id, itemId: request.tool_use_id,
          questions: questions.map((question, index) => ({ id: String(index), header: question.header || 'Cowork', question: question.question,
            options: question.options || [], multiSelect: question.multiSelect === true, isOther: true, isSecret: false })) }, { signal: controller.signal });
        if (result?.answers && !controller.signal.aborted && questions.every((_question, index) => result.answers[String(index)]?.answers?.length)) {
          response = { behavior: 'allow', updatedInput: { ...request.input, answers: Object.fromEntries(questions.map((question, index) => [question.question, result.answers[String(index)].answers.join(', ')])) } };
        }
      } else {
        const result = await this.approval('item/commandExecution/requestApproval', {
        threadId: live.row.thread.id, turnId: live.turn.id, itemId: request.tool_use_id,
        command: `${request.tool_name}\n${JSON.stringify(request.input, null, 2)}`, cwd: live.row.thread.cwd,
        reason: request.description || request.decision_reason || 'Cowork requests permission to use this tool.',
        availableDecisions: ['accept', 'decline'],
      }, { signal: controller.signal });
      if (!controller.signal.aborted && result?.decision === 'accept') response = { behavior: 'allow', updatedInput: request.input };
      }
      if (this.live.get(live.row.thread.id) !== live) response = { behavior: 'deny', message: 'The Cowork turn ended.' };
      await this.host.request('approval', { id: event.id, response });
    } catch { /* A worker exit already fails the owning turn. */ }
    finally { this.approvals.delete(event.id); }
  }
  finish(id, status, message) {
    const live = this.live.get(id); if (!live) return;
    this.live.delete(id);
    for (const [key, controller] of this.approvals) if (key.startsWith(`${id}:`)) { controller.abort(); this.approvals.delete(key); }
    const { row, turn } = live;
    // R4i-cowork CW2: CB6cNSrW takeRewindRefusal — the CLI refused the fork point (muI2IV6k Qzt "No message found with
    // message.uuid") before init: drop the fork so the next turn resumes the session as it was.
    if (status === 'failed' && live.launch?.fork && !live.initialized && isForkRefusal(message) && row.pendingRewindTo === live.launch.fork.at) delete row.pendingRewindTo;
    if (status === 'completed') {
      const deliverables = changedOutputs(row.thread.cwd, live.outputs);
      if (deliverables.length) this.item(live, { id: randomUUID(), type: 'dynamicToolCall', tool: 'present', namespace: null,
        arguments: {}, status: 'completed', success: true, contentItems: [], durationMs: null, codeDesktop: { deliverables } }, true);
    }
    for (const item of turn.items) if (item.status === 'inProgress') this.item(live, { ...item, status: 'failed', success: false }, true);
    turn.status = status; turn.completedAt = now(); turn.error = message ? { message } : null;
    row.thread.updatedAt = now(); this.save(row); this.note('turn/completed', id, { turn });
    void this.host.request('close', { sessionId: id, turnId: turn.id }, 5000).catch(() => {});
  }
  async stop() { for (const id of [...this.live.keys()]) this.finish(id, 'interrupted'); await this.host.stop(); }
}
