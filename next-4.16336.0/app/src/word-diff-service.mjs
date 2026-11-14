export function createWordDiffService({ createWorker, schedule = setTimeout, cancelTimer = clearTimeout, deadline = 2000 }) {
  let worker = null, active = null, nextId = 0, disposed = false;
  const queue = [];
  const resetWorker = () => { worker?.terminate(); worker = null; };
  const settle = (job, value) => {
    job.signal?.removeEventListener('abort', job.abort);
    if (job.timer !== undefined) cancelTimer(job.timer);
    job.resolve(value);
  };
  const finish = (result, reset = false) => {
    if (!active) return;
    const job = active; active = null;
    if (reset) resetWorker();
    settle(job, result); pump();
  };
  function pump() {
    if (disposed || active || !queue.length) return;
    active = queue.shift();
    const job = active;
    try {
      if (!worker) {
        const current = worker = createWorker();
        current.onmessage = ({ data }) => {
          if (current !== worker || data?.id !== active?.id) return;
          finish(data);
        };
        current.onerror = () => { if (current === worker) finish({ status: 'plain', reason: 'worker-error' }, true); };
      }
      job.timer = schedule(() => { if (active === job) finish({ status: 'plain', reason: 'timeout' }, true); }, deadline);
      worker.postMessage({ id: job.id, rows: job.rows });
    } catch { finish({ status: 'plain', reason: 'worker-error' }, true); }
  }
  return {
    request({ rows, isFrontier }, { signal } = {}) {
      if (disposed || signal?.aborted || isFrontier) return Promise.resolve({ status: 'plain', reason: 'inactive' });
      if (!Array.isArray(rows) || rows.length > 50000 || rows.some(row => typeof row?.text !== 'string') || rows.reduce((n, row) => n + row.text.length, 0) > 4 * 1024 * 1024) return Promise.resolve({ status: 'plain', reason: 'input-limit' });
      // Binding retries transient pressure; never silently lose later hunks.
      if (queue.length >= 32) return Promise.resolve({ status: 'plain', reason: 'queue-limit' });
      return new Promise(resolve => {
        const job = { id: ++nextId, rows, signal, resolve };
        job.abort = () => {
          if (active === job) finish({ status: 'plain', reason: 'aborted' }, true);
          else {
            const index = queue.indexOf(job);
            if (index >= 0) { queue.splice(index, 1); settle(job, { status: 'plain', reason: 'aborted' }); }
          }
        };
        signal?.addEventListener('abort', job.abort, { once: true });
        queue.push(job); pump();
      });
    },
    dispose() {
      disposed = true; resetWorker();
      if (active) { settle(active, { status: 'plain', reason: 'disposed' }); active = null; }
      for (const job of queue.splice(0)) settle(job, { status: 'plain', reason: 'disposed' });
    },
  };
}
