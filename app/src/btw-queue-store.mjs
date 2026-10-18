import { emptyQueue, queueFromList, submitLane, isNotSteerable, previewText, steerInputText,
  editableDraft, optimisticRemove, reorderEntries, restoredOrder } from './queued-messages-model.mjs';
import { rpcResult } from './rpc-error.mjs';
import { t } from '../electron/i18n/index.mjs';

// cccc2cf0a zS passes the child ref and priority to sendWithOutcome. This is
// the Codex transport adapter; it never reads the main composer's draft/queue.
export function createBtwQueueStore({ context, restore, onError = () => {}, uuid = () => crypto.randomUUID() }) {
  const records = new Map(), listeners = new Set();
  let snapshot = {};
  const publish = record => {
    if (records.get(record.id) !== record || context(record.id).epoch !== record.epoch) return;
    snapshot = { ...snapshot, [record.id]: { epoch: record.epoch, queue: record.queue,
      pending: record.pending.filter(entry => entry.accepted), busy: record.busy, steeringId: record.steeringId } };
    listeners.forEach(listener => listener());
  };
  function capture(id) {
    const host = context(id);
    if (!host.connected || !host.supported || host.archived) throw new Error(t('Open an active session first.'));
    let record = records.get(id);
    if (!record || record.epoch !== host.epoch) {
      record = { id, epoch: host.epoch, queue: emptyQueue(id), pending: [], busy: false, steeringId: null,
        revision: 0, reads: 0, delivered: new Set(), observedItems: new Map(), consumedItems: new Set(), completed: new Map() };
      records.set(id, record); publish(record);
    }
    const check = () => {
      const now = context(id);
      if (now.epoch !== host.epoch || !now.connected)
        throw new Error(t('The core connection changed. Reopen the session before retrying.'));
    };
    const rpc = (method, params) => { check(); return host.call('rpc', { method, params: { ...params, threadId: id }, expected: host.expected }).then(rpcResult); };
    return { host, record, check, rpc };
  }
  function reconcile(record) {
    if (context(record.id).epoch !== record.epoch) return;
    const items = context(record.id).items ?? [], returned = [];
    const observed = new Map([...items, ...record.observedItems.values()].filter(item => item.id).map(item => [item.id, item]));
    record.pending = record.pending.filter(entry => {
      if (!entry.accepted) return true;
      if (record.delivered.has(entry.id) || items.some(item => item.type === 'userMessage' && item.clientId === entry.id)) return false;
      // Some cores omit clientId. Consume each newly observed row only once,
      // even when two pending messages have identical text.
      const delivered = [...observed.values()].find(item => item.type === 'userMessage' && !item.clientId
        && !entry.observedBefore.has(item.id) && !record.consumedItems.has(item.id) && steerInputText(item.content) === entry.inputText);
      if (delivered) { record.consumedItems.add(delivered.id); return false; }
      const status = record.completed.get(entry.turnId);
      if (!status) return true;
      if (status === 'interrupted') returned.push(entry.text);
      return false;
    });
    if (returned.length) restore(record.id, returned.join('\n\n'));
    publish(record);
  }
  async function listAll(rpc) {
    const data = [], cursors = new Set();
    let cursor;
    do {
      const result = await rpc('thread/queue/list', cursor ? { cursor } : {});
      data.push(...(Array.isArray(result?.data) ? result.data : Array.isArray(result?.entries) ? result.entries : []));
      cursor = result?.nextCursor;
      if (cursor && cursors.has(cursor)) throw new Error('The queued message cursor repeated.');
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return data;
  }
  async function refresh(id) {
    const { record, rpc, check } = capture(id);
    if (record.busy) return;
    const read = ++record.reads, revision = record.revision, data = await listAll(rpc);
    check();
    if (read !== record.reads || revision !== record.revision || record.busy) return;
    record.queue = queueFromList({ data }, id, record.queue); reconcile(record);
  }
  function refreshLater(record) {
    if (context(record.id).epoch !== record.epoch || !context(record.id).connected) return;
    void refresh(record.id).catch(error => {
      if (context(record.id).epoch === record.epoch) onError(error.message);
    });
  }
  async function mutate(id, action, steeringId = null) {
    const captured = capture(id), { record } = captured;
    if (record.busy) throw new Error(t('Wait for the current task to finish or stop it'));
    record.busy = true; record.steeringId = steeringId; record.revision++; publish(record);
    try { return await action(captured); }
    finally { record.busy = false; record.steeringId = null; record.revision++; publish(record); refreshLater(record); }
  }
  async function steer(captured, input, text, clientUserMessageId) {
    const { host, record, check } = captured;
    if (!host.turnId) throw new Error(t('The message could not be sent to the running turn.'));
    const entry = { id: clientUserMessageId, text, inputText: steerInputText(input), preview: previewText(input), turnId: host.turnId,
      observedBefore: new Set([...(host.items ?? []).map(item => item.id), ...record.observedItems.keys()]), accepted: false };
    record.pending.push(entry);
    try {
      check();
      const outcome = await host.call('steer', { threadId: record.id, expectedTurnId: host.turnId, input, clientUserMessageId, expected: host.expected });
      if (outcome?.ok) { entry.accepted = true; reconcile(record); }
      else record.pending = record.pending.filter(value => value !== entry);
      return outcome;
    } catch (error) { record.pending = record.pending.filter(value => value !== entry); throw error; }
  }
  function send(id, text, options = {}) {
    return mutate(id, async captured => {
      const { host, rpc } = captured;
      if (!host.turnId) throw new Error(t('The message could not be sent to the running turn.'));
      const input = [{ type: 'text', text, text_elements: [] }], clientUserMessageId = uuid();
      if (submitLane({ running: true, priority: options.priority }) === 'next') {
        const outcome = await steer(captured, input, text, clientUserMessageId);
        if (outcome?.ok) return outcome;
        if (!isNotSteerable(outcome)) throw new Error(outcome?.message || t('The message could not be sent to the running turn.'));
      }
      return rpc('thread/queue/add', { input, clientUserMessageId });
    });
  }
  function remove(id, entryId, edit = false) {
    return mutate(id, async ({ record, rpc }) => {
      const entry = record.queue.entries.find(value => value.id === entryId);
      if (!entry) return;
      // This side composer currently accepts text. Never discard attachments
      // from a queue entry placed by another window while taking it back.
      if (edit && entry.input.some(part => part.type !== 'text')) throw new Error('Open this session to edit the message with attachments.');
      const result = await rpc('thread/queue/delete', { queuedSubmissionId: entryId });
      record.queue = optimisticRemove(record.queue, entryId).queue;
      if (edit && result?.deleted !== false) restore(id, editableDraft(entry).text, true);
    });
  }
  function reorder(id, from, to) {
    return mutate(id, async ({ record, rpc }) => {
      const entries = reorderEntries(record.queue.entries, from, to);
      if (entries === record.queue.entries) return;
      await rpc('thread/queue/reorder', { queuedSubmissionIds: entries.map(entry => entry.id) });
      record.queue = { ...record.queue, entries };
    });
  }
  function clear(id) {
    return mutate(id, async ({ record, rpc }) => {
      // One transaction for the rendered set; a later submission is not part
      // of the user's Clear all action. Each confirmed removal is retained.
      for (const entry of [...record.queue.entries]) {
        await rpc('thread/queue/delete', { queuedSubmissionId: entry.id });
        record.queue = optimisticRemove(record.queue, entry.id).queue; publish(record);
      }
    });
  }
  function promote(id, entryId) {
    return mutate(id, async captured => {
      const { record, rpc, host } = captured, index = record.queue.entries.findIndex(entry => entry.id === entryId), entry = record.queue.entries[index];
      if (!entry || !host.turnId) return;
      if (entry.input.some(part => part.type !== 'text')) throw new Error('Open this session to send the message with attachments.');
      const deleted = await rpc('thread/queue/delete', { queuedSubmissionId: entryId });
      record.queue = optimisticRemove(record.queue, entryId).queue; publish(record);
      if (deleted?.deleted === false) return; // The queue already consumed it.
      const clientUserMessageId = entry.clientUserMessageId || uuid();
      let outcome;
      try { outcome = await steer(captured, entry.input, editableDraft(entry).text, clientUserMessageId); }
      catch (error) { restore(id, editableDraft(entry).text); throw error; }
      if (outcome?.ok) return outcome;
      if (!isNotSteerable(outcome)) {
        restore(id, editableDraft(entry).text);
        throw new Error(outcome?.message || t('The message could not be sent to the running turn.'));
      }
      // Only an explicit non-steerable refusal is automatically requeued.
      // Transport uncertainty is never an automatic second send.
      let requeued = false;
      try {
        const added = await rpc('thread/queue/add', { input: entry.input, clientUserMessageId });
        requeued = true;
        const addedId = added?.queuedSubmission?.id;
        if (addedId) {
          const listed = await listAll(rpc);
          const order = restoredOrder(listed.map(value => value.id), addedId, index);
          if (order) await rpc('thread/queue/reorder', { queuedSubmissionIds: order });
        }
      } catch (error) { if (!requeued) restore(id, editableDraft(entry).text); throw error; }
      throw new Error(t('This turn can’t take new messages right now. The message stays queued.'));
    }, entryId);
  }
  function observe(event) {
    const id = event.params?.threadId, record = records.get(id);
    if (!record || context(id).epoch !== record.epoch) return;
    const expected = context(id).expected;
    if (event.connectionId && event.connectionId !== expected.connectionId) return;
    if (event.connectionEpoch && event.connectionEpoch !== expected.connectionEpoch) return;
    if (['item/started', 'item/completed'].includes(event.method) && event.params.item?.type === 'userMessage') {
      const item = event.params.item;
      if (item.clientId) record.delivered.add(item.clientId);
      record.observedItems.set(item.id, item); reconcile(record);
    }
    if (event.method === 'turn/completed' && event.params.turn?.id) {
      const turn = event.params.turn;
      for (const item of turn.items ?? []) if (item.type === 'userMessage') {
        if (item.clientId) record.delivered.add(item.clientId);
        record.observedItems.set(item.id, item);
      }
      record.completed.set(turn.id, turn.status); reconcile(record); refreshLater(record);
    }
    if (event.method === 'thread/queue/changed') refreshLater(record);
  }
  return { subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot, refresh, send, remove, reorder, clear, promote, observe };
}
