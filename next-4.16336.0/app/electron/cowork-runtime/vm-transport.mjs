import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { randomUUID } from 'node:crypto';

function deadline(operation, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Cowork ${label} timed out.`)), ms);
    Promise.resolve().then(operation).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// Positional ABI traced from index.chunk-CiiI592G.js: uBr/fLr/lLr.
// The caller owns VM startup/provisioning; this transport only controls guest
// processes created through this instance. It never attaches to Claude's VM.
export class CoworkVmTransport {
  constructor({ vm, events, onStatus = () => {}, spawnTimeoutMs = 30_000, ioTimeoutMs = 10_000 }) {
    if (![spawnTimeoutMs, ioTimeoutMs].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid Cowork process deadlines.');
    this.vm = vm;
    this.events = events;
    this.onStatus = onStatus;
    this.spawnTimeoutMs = spawnTimeoutMs;
    this.ioTimeoutMs = ioTimeoutMs;
    this.processes = new Map();
    this.initializing = null;
    this.closed = false;
    this.disconnected = connected => { if (!connected) this.failAll(new Error('Cowork VM disconnected.')); };
    this.stopped = () => this.failAll(new Error('Cowork VM stopped.'));
  }

  async initialize() {
    if (this.closed) throw new Error('Cowork transport is closed.');
    if (!this.initializing) {
      this.initializing = Promise.resolve().then(async () => {
        await this.vm.setEventCallbacks(
          (id, text) => this.processes.get(id)?.output('stdout', text),
          (id, text) => this.processes.get(id)?.output('stderr', text),
          (id, code, signal, oomKillCount, peakBytes) => this.processes.get(id)?.exited({ code, signal, oomKillCount, peakBytes }),
          (id, message) => this.processes.get(id)?.fail(new Error(message)),
          value => this.onStatus({ kind: 'network', value }),
          value => this.onStatus({ kind: 'reachability', value }),
          value => this.onStatus({ kind: 'startup', value }),
        );
        if (this.closed) return;
        this.events?.on('guestConnectionChanged', this.disconnected);
        this.events?.on('vmStopped', this.stopped);
      }).catch(error => { this.initializing = null; throw error; });
    }
    return this.initializing;
  }

  spawn({ processName, command, args = [], cwd, env = {}, additionalMounts = {}, isResume = false, allowedDomains, oneShot = false, mountSkeletonHome } = {}) {
    if (this.closed) throw new Error('Cowork transport is closed.');
    if (typeof command !== 'string' || !command || typeof processName !== 'string' || !processName) throw new Error('Cowork guest command and process name are required.');
    if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) throw new Error('Cowork command arguments must be strings.');
    const process = new GuestProcess(this, randomUUID());
    this.processes.set(process.id, process);
    const environment = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
    // Source ABI sends the session credential separately, not in the guest env.
    const token = environment.CLAUDE_CODE_OAUTH_TOKEN;
    delete environment.CLAUDE_CODE_OAUTH_TOKEN;
    void (async () => {
      try {
        await this.initialize();
        if (process.finished || this.closed) return;
        if (!await this.vm.isGuestConnected()) throw new Error('Cowork VM guest is not connected.');
        if (process.finished || this.closed) return;
        process.spawnRequested = true;
        const result = await this.vm.spawn(process.id, processName, command, [...args], cwd,
          Object.keys(environment).length ? environment : undefined, additionalMounts, isResume,
          allowedDomains, oneShot, mountSkeletonHome, token);
        if (process.finished || process.killRequested || this.closed) {
          // Cancellation can race the native acknowledgement. Re-send after ack
          // so an early kill cannot leave a late-spawned guest process alive.
          await this.killProcess(process.id, process.killRequested || 'SIGKILL');
          return;
        }
        if (result?.failedMounts?.length) throw new Error('Cowork could not mount all selected folders.');
        process.confirmed();
      } catch (error) {
        process.fail(error);
      }
    })();
    return process;
  }

  failAll(error) {
    for (const process of [...this.processes.values()]) process.fail(error);
  }

  killProcess(id, signal) {
    return deadline(() => this.vm.kill(id, signal), this.ioTimeoutMs, 'process stop');
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.events?.off('guestConnectionChanged', this.disconnected);
    this.events?.off('vmStopped', this.stopped);
    const processes = [...this.processes.values()];
    const stopped = Promise.allSettled(processes.map(process => process.kill('SIGKILL')));
    this.failAll(new Error('Cowork transport closed.'));
    await stopped;
  }
}

class GuestProcess extends EventEmitter {
  constructor(transport, id) {
    super();
    this.transport = transport;
    this.id = id;
    this.finished = false;
    this.spawnRequested = false;
    this.killRequested = null;
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.ready = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; });
    // Callers can subscribe to ready or completion; neither requires an error
    // event listener merely to avoid an unhandled process-level exception.
    this.ready.catch(() => {});
    this.spawnTimer = setTimeout(() => this.fail(new Error('Cowork guest launch timed out.')), transport.spawnTimeoutMs);
    this.completion = new Promise(resolve => { this.resolveCompletion = resolve; });
    const decoder = new StringDecoder('utf8');
    this.stdin = new Writable({
      write: (chunk, encoding, done) => {
        const text = decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        this.ready.then(async () => {
          if (this.finished || this.killRequested) throw new Error('Cowork guest process has ended.');
          if (text) await deadline(() => transport.vm.writeStdin(id, text), transport.ioTimeoutMs, 'stdin write');
        }).then(() => done(), done);
      },
      final: done => {
        const text = decoder.end();
        this.ready.then(async () => {
          if (this.finished || this.killRequested) throw new Error('Cowork guest process has ended.');
          if (text) await deadline(() => transport.vm.writeStdin(id, text), transport.ioTimeoutMs, 'stdin write');
        }).then(() => done(), done);
      },
    });
    this.stdin.on('error', error => this.fail(error));
  }
  confirmed() { clearTimeout(this.spawnTimer); this.resolveReady(); this.emit('spawn'); }
  output(stream, text) { if (!this.finished) this[stream].write(text); }
  exited(result) {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.spawnTimer);
    this.rejectReady(new Error('Cowork guest process exited before spawn acknowledgement.'));
    this.stdout.end(); this.stderr.end(); this.stdin.destroy();
    this.transport.processes.delete(this.id);
    this.resolveCompletion(result);
    this.emit('exit', result.code, result.signal);
  }
  fail(error) {
    error = error instanceof Error ? error : new Error(error?.message || String(error));
    if (this.finished) return;
    if (this.spawnRequested) void this.transport.killProcess(this.id, 'SIGKILL').catch(() => {});
    this.rejectReady(error);
    this.exited({ code: null, signal: null, error });
  }
  async kill(signal = 'SIGTERM') {
    if (this.finished) return;
    if (!['SIGTERM', 'SIGKILL', 'SIGINT'].includes(signal)) throw new Error('Unsupported Cowork process signal.');
    this.killRequested = signal;
    if (this.spawnRequested) await this.transport.killProcess(this.id, signal);
    // The native exit callback reports the result; requesting a stop is not
    // reported as successful completion.
    else this.fail(new Error('Cowork guest launch cancelled.'));
  }
}
