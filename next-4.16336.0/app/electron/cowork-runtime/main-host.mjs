import { EventEmitter } from 'node:events';

// Virtualization.framework work in the supplied Swift addon uses DispatchQueue.main.
// Electron utility processes do not pump that queue; the official app hosts it in
// its main process. Preserve the same lazy request/event contract for sessions.
export class CoworkMainHost extends EventEmitter {
  constructor({ load = () => import('./runtime-worker.mjs') } = {}) {
    super(); this.load = load; this.runtime = null; this.stopping = null; this.closed = false;
  }
  async request(method, params = {}) {
    if (this.closed) throw new Error('Cowork runtime stopped.');
    if (!this.runtime && !['open', 'boot'].includes(method)) throw new Error('Cowork runtime is not running.');
    if (!this.runtime) this.runtime = this.load().then(({ createCoworkRuntime }) =>
      createCoworkRuntime(event => this.emit('event', event)));
    try { return await (await this.runtime).dispatch(method, params); }
    catch (error) { throw error instanceof Error ? error : new Error(String(error)); }
  }
  stop() {
    if (this.stopping) return this.stopping;
    this.closed = true;
    this.stopping = (async () => { if (this.runtime) await (await this.runtime).dispatch('stop', {}); })();
    return this.stopping;
  }
}
