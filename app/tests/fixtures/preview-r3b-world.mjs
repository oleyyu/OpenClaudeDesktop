// R3b-preview: a stand-in for the sockets and dev-server processes the preview service uses (its `net` and
// `spawnProcess` seams), so its tests bind no real port and start no real process. A port is "bound" in this world
// by a listener the test puts there (occupy) or by a fake dev server (a command whose arguments name server.js, or
// one the test's `behave` hook handles), which listens on its PORT. Fake pids are above every OS's pid range, so the
// service's process-group signal (process.kill(-pid)) fails and falls back to the fake child's own kill().
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

const V4 = ['127.0.0.1', '0.0.0.0'], V6 = ['::1', '::'];
const later = (fn) => setImmediate(fn);

export function processWorld({ firstPid = 9000001, firstEphemeral = 52000 } = {}) {
  const listeners = new Map(); // port → Map(host → owner)
  const children = [];
  const binds = []; // every successful listen: { port, host, owner }
  let nextPid = firstPid, nextEphemeral = firstEphemeral, holdListen = null;
  const hostsFor = (host) => (host === 'localhost' ? [...V4, ...V6] : /:/.test(String(host)) ? V6 : V4);
  const bound = (port, host) => [...(listeners.get(port)?.keys() ?? [])].some((held) => hostsFor(host).includes(held));
  const bind = (port, host, owner) => { if (!listeners.has(port)) listeners.set(port, new Map()); listeners.get(port).set(host, owner); binds.push({ port, host, owner }); };
  const unbind = (port, host) => { listeners.get(port)?.delete(host); if (!listeners.get(port)?.size) listeners.delete(port); };

  class FakeServer extends EventEmitter {
    listen(port, host = '0.0.0.0') {
      const go = () => {
        let chosen = port;
        if (!chosen) { while (listeners.has(nextEphemeral)) nextEphemeral++; chosen = nextEphemeral++; }
        if (bound(chosen, host)) { this.emit('error', Object.assign(new Error(`listen EADDRINUSE: address already in use ${host}:${chosen}`), { code: 'EADDRINUSE' })); return; }
        this.port = chosen; this.host = host;
        bind(chosen, host, 'probe');
        this.emit('listening');
      };
      // holdListen: the next probe waits until the test lets it go (a start caught mid-allocation).
      if (holdListen) { const gate = holdListen; holdListen = null; gate.reached(port); gate.promise.then(() => later(go)); } else later(go);
      return this;
    }
    address() { return { address: this.host, family: 'IPv4', port: this.port }; }
    close(callback) { if (this.port) unbind(this.port, this.host); later(() => callback?.()); return this; }
  }
  class FakeSocket extends EventEmitter {
    setTimeout() { return this; }
    connect(port, host) {
      const options = typeof port === 'object' ? port : { port, host };
      later(() => (bound(options.port, options.host ?? 'localhost') ? this.emit('connect') : this.emit('error', Object.assign(new Error(`connect ECONNREFUSED ${options.host}:${options.port}`), { code: 'ECONNREFUSED' }))));
      return this;
    }
    destroy() { return this; }
  }
  const net = { createServer: () => new FakeServer(), Socket: FakeSocket, connect: (options) => new FakeSocket().connect(options) };

  // behave(child) → true when it handled the child (listened, exited, …); else the default fake dev server.
  let behave = null;
  function spawnProcess(command, args = [], options = {}) {
    const child = new EventEmitter();
    Object.assign(child, { pid: nextPid++, command, args: [...args], options, exitCode: null, signalCode: null, ports: [], stdout: new PassThrough(), stderr: new PassThrough(), killed: false });
    child.listen = (port = Number(options.env?.PORT), host = '127.0.0.1') => { bind(port, host, child); child.ports.push([port, host]); };
    child.exit = (code = 0, signal = null) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      for (const [port, host] of child.ports) unbind(port, host);
      child.exitCode = code; child.signalCode = signal;
      later(() => child.emit('exit', code, signal));
    };
    child.kill = (signal = 'SIGTERM') => { child.killed = true; child.exit(null, signal); return true; };
    children.push(child);
    later(() => {
      if (behave?.(child)) return;
      if (command === 'definitely-not-a-command-xyz') { child.emit('error', Object.assign(new Error(`spawn ${command} ENOENT`), { code: 'ENOENT' })); return; }
      child.listen();
      child.stdout.write(`listening ${options.env?.PORT}\n`);
    });
    return child;
  }

  return {
    net, spawnProcess, children, binds,
    /** Something outside the app listening on the port (another process, pid 4242 unless named). */
    occupy(port, { host = '127.0.0.1', pid = 4242, processName = 'other' } = {}) { bind(port, host, { pid, processName }); return () => unbind(port, host); },
    isBound: (port, host = '127.0.0.1') => bound(port, host),
    owner: (port, host = '127.0.0.1') => listeners.get(port)?.get(host),
    /** The next listen() of a port probe waits for release(); `reached` resolves (with its port) once it is made. */
    holdNextListen() {
      let release, reached;
      const promise = new Promise((resolve) => { release = resolve; });
      const arrived = new Promise((resolve) => { reached = resolve; });
      holdListen = { promise, reached };
      return { release, reached: arrived };
    },
    set behave(fn) { behave = fn; },
    /**
     * The native listener / lineage calls (hostProcessInfo's shape) over this world: every listener but a probe, each
     * process its own group leader under launchd (pid 1), unless `lineage` says otherwise for a pid.
     */
    native({ lineage = {} } = {}) {
      return {
        async listTcpListeners() {
          const rows = [];
          for (const [port, hosts] of listeners) for (const [host, owner] of hosts) if (owner !== 'probe') rows.push({ localPort: port, localAddr: host, pid: owner.pid, processName: owner.processName ?? 'node' });
          return rows;
        },
        async getProcessLineage(pids) { return pids.map((pid) => lineage[pid] ?? { pid, pgid: pid, ancestors: [1] }); },
      };
    },
  };
}

/** Service options that put the preview service in this world: no real socket, process, lsof, or retry sleep. */
export function worldOptions(world, extra = {}) {
  return { net: world.net, spawnProcess: world.spawnProcess, processInfo: null, portWait: async () => {}, ...extra };
}

/**
 * Stand-in Electron objects for the preview service (as tests/preview-service.test.mjs has them), with the preview
 * partition's user agent (an Electron one by default), setUserAgent and onBeforeSendHeaders recorded.
 */
export function fakeElectron({ userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) OpenClaude/1.0.0 Chrome/142.0.7444.52 Electron/39.2.0 Safari/537.36' } = {}) {
  const windows = new Map();
  const cdp = [];
  const partition = {
    handlers: {}, userAgent, setUserAgents: [],
    setPermissionRequestHandler(fn) { this.handlers.request = fn; }, setPermissionCheckHandler(fn) { this.handlers.check = fn; }, on(event, fn) { this.handlers[event] = fn; },
    webRequest: { onBeforeRequest(_filter, fn) { partition.handlers.beforeRequest = fn; }, onBeforeSendHeaders(fn) { partition.handlers.beforeSendHeaders = fn; } },
    getUserAgent() { return this.userAgent; }, setUserAgent(value) { this.setUserAgents.push(value); this.userAgent = value; },
  };
  let nextId = 1;
  class Contents extends EventEmitter {
    constructor() {
      super();
      this.id = nextId++; this.url = ''; this.title = ''; this.entries = []; this.index = -1; this.session = partition; this.destroyed = false;
      this.navigationHistory = { canGoBack: () => this.index > 0, canGoForward: () => this.index < this.entries.length - 1, goBack() {}, goForward() {} };
      this.debugger = { attached: false, attach: () => { this.debugger.attached = true; }, isAttached: () => this.debugger.attached, on() {}, sendCommand: async (method, params) => { cdp.push([method, params]); return {}; } };
    }
    isDestroyed() { return this.destroyed; }
    setWindowOpenHandler(fn) { this.openHandler = fn; }
    async loadURL(url) {
      this.emit('did-start-loading');
      this.entries = [...this.entries.slice(0, this.index + 1), url]; this.index = this.entries.length - 1; this.url = url; this.title = `Title of ${url}`;
      this.emit('did-navigate', {}, url);
      setImmediate(() => { this.emit('did-finish-load'); this.emit('did-stop-loading'); });
    }
    getURL() { return this.url; }
    getTitle() { return this.title; }
    isDevToolsOpened() { return false; }
    reload() {} stop() {} focus() {} close() { this.destroyed = true; }
    async executeJavaScriptInIsolatedWorld() { return { ok: true }; }
  }
  class WebContentsView {
    constructor(options) { this.options = options; this.webContents = new Contents(); this.webContents.session = options.webPreferences.session; this.bounds = null; this.visible = true; }
    setBounds(bounds) { this.bounds = bounds; } setVisible(value) { this.visible = value; } setBackgroundColor() {}
  }
  class BrowserWindow extends EventEmitter {
    constructor(options = {}) { super(); this.options = options; this.children = new Set(); this.destroyed = false; this.contentView = { addChildView: (view) => this.children.add(view), removeChildView: (view) => this.children.delete(view) }; }
    isDestroyed() { return this.destroyed; } isVisible() { return this.options.show !== false; } destroy() { this.destroyed = true; this.emit('closed'); }
    static fromWebContents(sender) { return windows.get(sender) ?? null; }
  }
  const sender = () => {
    const contents = Object.assign(new EventEmitter(), { sent: [], isDestroyed: () => false, getZoomFactor: () => 1, send(_channel, event) { this.sent.push(event); }, focus() {} });
    windows.set(contents, new BrowserWindow({ show: true }));
    return contents;
  };
  return { electron: { WebContentsView, BrowserWindow, session: { fromPartition: () => partition }, shell: { openExternal: async () => {}, openPath: async () => '' }, nativeTheme: { shouldUseDarkColors: false } }, partition, cdp, sender };
}
