import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export class CoworkWorkerHost extends EventEmitter {
  constructor({ fork }) { super(); this.fork = fork; this.child = null; this.pending = new Map(); }
  ensureChild() {
    if (this.child) return;
    const child = this.fork(fileURLToPath(new URL('./runtime-worker.mjs', import.meta.url)), [], { serviceName: 'OpenClaude Cowork', stdio: 'pipe', allowLoadingUnsignedLibraries: true });
    this.child = child;
    // Drain diagnostics without writing credentials or user data to host logs.
    child.stdout?.on('data', () => {}); child.stderr?.on('data', () => {});
    child.on('message', message => {
      if (this.child !== child) return;
      if (message.event) this.emit('event', message);
      else {
        const pending = this.pending.get(message.id);
        if (pending) { this.pending.delete(message.id); clearTimeout(pending.timer); message.error ? pending.reject(new Error(message.error)) : pending.resolve(message.result); }
      }
    });
    child.on('exit', code => { if (this.child === child) this.disconnected(new Error(`Cowork runtime exited (${code}).`)); });
    child.on('error', error => { if (this.child === child) { child.kill(); this.disconnected(error); } });
  }
  disconnected(error) {
    this.child = null;
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    this.pending.clear(); this.emit('event', { event: 'disconnected', error: error.message });
  }
  request(method, params, timeoutMs = 30_000) {
    if (!this.child && !['open', 'boot'].includes(method)) return Promise.reject(new Error('Cowork runtime is not running.'));
    this.ensureChild(); const id = randomUUID(), child = this.child;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { if (this.child === child) { child.kill(); this.disconnected(new Error(`Cowork ${method} timed out.`)); } }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { child.postMessage({ id, method, params }); }
      catch (error) { this.pending.delete(id); clearTimeout(timer); reject(error); }
    });
  }
  async stop() {
    const child = this.child;
    if (!child) return;
    try { await this.request('stop', {}, 2000); } catch {}
    finally { if (this.child === child) { child.kill(); this.disconnected(new Error('Cowork runtime stopped.')); } }
  }
}
