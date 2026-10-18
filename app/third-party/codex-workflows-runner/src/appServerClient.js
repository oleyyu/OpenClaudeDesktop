// Minimal, dependency-free JSON-RPC client for `codex app-server`, in plain ESM.
// Transport is newline-delimited JSON over the child's stdio. The connection is
// bidirectional: the server also
// sends us *requests* (approvals, dynamic-tool calls) that we must answer.

import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const READY_TIMEOUT_MS = 15_000;

export class AppServerClient extends EventEmitter {
  #child;
  #stdoutBuffer = "";
  #stderrTail = "";
  #nextId = 1;
  #pending = new Map();
  #completed = [];
  #toolHandlers = new Map();
  get pid() { return this.#child?.pid; }
  #state = "disconnected";
  #generation = 0;
  #shutdown = false;

  constructor(options = {}) {
    super();
    this.setMaxListeners(0); // many concurrent agents attach notification listeners
    this.options = options; // { cwd, command, args, clientInfo, capabilities, requestHandler }
  }

  get readyState() {
    return this.#state;
  }

  get recentStderr() {
    return this.#stderrTail.slice(-4_000);
  }

  async connect() {
    if (this.#state === "ready") return;
    if (this.#state === "connecting") return this.#waitUntilReady();

    this.#generation += 1;
    const generation = this.#generation;
    this.#state = "connecting";

    const command = this.options.command ?? "codex";
    const args = this.options.args ?? ["app-server", "--listen", "stdio://"];
    const cwd = this.options.cwd ?? process.cwd();

    this.#child = spawn(command, args, {
      cwd,
      env: sanitizeEnv(process.env, cwd),
      stdio: "pipe",
    });

    this.#child.stdout.on("data", (chunk) => {
      if (generation !== this.#generation) return;
      this.#acceptStdout(chunk.toString("utf8"));
    });
    this.#child.stderr.on("data", (chunk) => {
      if (generation !== this.#generation) return;
      this.#stderrTail = (this.#stderrTail + chunk.toString("utf8")).slice(-12_000);
    });
    this.#child.on("exit", (code, signal) => {
      if (generation !== this.#generation) return;
      this.#closePending(new Error(`app-server exited code=${code} signal=${signal}`));
      this.#state = "disconnected";
      this.emit("transport", { stage: "exit", code, signal });
    });
    this.#child.on("error", (err) => {
      this.#closePending(err);
      this.#state = "disconnected";
      this.emit("transport", { stage: "error", error: err });
    });

    // Local: the initialize result (userAgent …) tells the tool-narrowing seam which core answers (toolNarrowing.js).
    this.serverInfo = await this.request(
      "initialize",
      {
        clientInfo: this.options.clientInfo ?? {
          name: "codex-workflows",
          title: "Codex Workflows Runner",
          version: "0.2.0",
        },
        capabilities: this.options.capabilities ?? { experimentalApi: true },
      },
      READY_TIMEOUT_MS,
    );
    this.notify("initialized");
    this.#state = "ready";
    this.emit("transport", { stage: "ready" });
  }

  async shutdown() {
    // Local: fail waiting turns now; the generation bump below silences the exit event they listen for.
    this.#shutdown = true;
    this.emit("transport", { stage: "shutdown" });
    this.#generation += 1;
    this.#closePending(new Error("client shut down"));
    this.#state = "disconnected";
    try {
      this.#child?.stdin.end();
    } catch {}
    const child=this.#child;this.#child=undefined;
    if(child&&child.exitCode===null&&child.signalCode===null){
      await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill("SIGKILL");},1000);child.once("exit",()=>{clearTimeout(timer);resolve();});child.kill("SIGTERM");});
    }
  }

  request(method, params, timeoutMs = 60_000) {
    if (!this.#child || !this.#child.stdin.writable) {
      return Promise.reject(new Error("Transport is not connected"));
    }
    const id = this.#nextId++;
    const frame = { id, method };
    if (params !== undefined) frame.params = params;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Request timed out: ${method}; stderr=${this.recentStderr}`));
      }, timeoutMs);

      this.#pending.set(id, { method, resolve, reject, timeout });
      this.#child.stdin.write(JSON.stringify(frame) + "\n", (err) => {
        if (!err) return;
        clearTimeout(timeout);
        this.#pending.delete(id);
        reject(err);
      });
    });
  }

  notify(method, params) {
    if (!this.#child || !this.#child.stdin.writable) {
      throw new Error("Transport is not connected");
    }
    const frame = { method };
    if (params !== undefined) frame.params = params;
    this.#child.stdin.write(JSON.stringify(frame) + "\n");
  }

  async listModels() {
    const r = await this.request("model/list", { limit: 200, includeHidden: true });
    return r?.data ?? [];
  }

  startThread(params) {
    return this.request("thread/start", params, 60_000);
  }

  // Re-attach to a persisted thread by id (the server loads its rollout from disk
  // and resumes it). Used by sessionful-worker resume; thread-level overrides
  // (cwd, sandbox, model, developerInstructions) ride along like thread/start.
  resumeThread(params) {
    return this.request("thread/resume", params, 60_000);
  }

  startTurn(params) {
    return this.request("turn/start", params, 60_000);
  }

  interruptTurn(threadId, turnId) {
    return this.request("turn/interrupt", { threadId, turnId }, 15_000);
  }

  // A structured agent owns its handler until its thread settles. Concurrent
  // agents share the connection, never the tool handler or captured result.
  registerToolHandler(threadId, handler) {
    if (this.#toolHandlers.has(threadId)) throw new Error('Tool handler already registered for thread');
    this.#toolHandlers.set(threadId, handler);
    return () => { if (this.#toolHandlers.get(threadId) === handler) this.#toolHandlers.delete(threadId); };
  }

  // timeoutMs <= 0 or non-finite waits without a timer (callers own inactivity timeouts);
  // an aborted `signal` rejects with its reason and removes the listeners.
  waitForNotification(predicate, timeoutMs, signal) {
    const found=this.#completed.findIndex(predicate);
    if(found>=0)return Promise.resolve(this.#completed.splice(found,1)[0]);
    // Local: a client that already died or was shut down never emits again.
    if(this.#shutdown)return Promise.reject(new Error("client shut down"));
    if(this.#state!=="ready")return Promise.reject(new Error("app-server disconnected"));
    if(signal?.aborted)return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      const aborted = () => { cleanup(); reject(signal.reason); };
      const timeout = Number.isFinite(timeoutMs)&&timeoutMs>0 ? setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for app-server notification"));
      }, timeoutMs) : undefined;
      const transport = (e) => { if(e.stage!=="ready"){cleanup();reject(new Error(e.stage==="shutdown"?"client shut down":"app-server disconnected"));} };
      const listener = (n) => {
        if (!predicate(n)) return;
        const index=this.#completed.indexOf(n);if(index>=0)this.#completed.splice(index,1);
        cleanup();
        resolve(n);
      };
      const cleanup = () => {
        clearTimeout(timeout);
        this.off("notification", listener);
        this.off("transport", transport);
        signal?.removeEventListener("abort", aborted);
      };
      this.on("notification", listener);
      this.on("transport", transport);
      signal?.addEventListener("abort", aborted, { once: true });
    });
  }

  #acceptStdout(text) {
    this.#stdoutBuffer += text;
    let idx;
    while ((idx = this.#stdoutBuffer.indexOf("\n")) !== -1) {
      const line = this.#stdoutBuffer.slice(0, idx).replace(/\r$/, "");
      this.#stdoutBuffer = this.#stdoutBuffer.slice(idx + 1);
      if (line.trim()) this.#handleFrame(line);
    }
  }

  #handleFrame(line) {
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      // Non-JSON line (e.g., a startup log on stdout) — ignore and keep going.
      this.emit("protocolError", { line });
      return;
    }
    if ("method" in frame && "id" in frame) {
      void this.#handleServerRequest(frame);
      return;
    }
    if ("method" in frame) {
      const notification={ method: frame.method, params: frame.params };
      if(frame.method === "turn/completed"){this.#completed.push(notification);if(this.#completed.length>1024)this.#completed.shift();}
      this.emit("notification", notification);
      return;
    }
    if ("id" in frame) {
      const pending = this.#pending.get(frame.id);
      if (!pending) return;
      this.#pending.delete(frame.id);
      clearTimeout(pending.timeout);
      if (frame.error) {
        const error = new Error(`${pending.method} failed: ${JSON.stringify(frame.error)}`);
        error.code = frame.error.code; error.data = frame.error.data;
        pending.reject(error);
      } else {
        pending.resolve(frame.result);
      }
    }
  }

  async #handleServerRequest(req) {
    let payload;
    const generation = this.#generation;
    try {
      const toolHandler = req.method === 'item/tool/call' ? this.#toolHandlers.get(req.params?.threadId) : undefined;
      const result = toolHandler ? await toolHandler(req) : this.options.requestHandler
        ? await this.options.requestHandler(req)
        : defaultServerResponse(req);
      payload = { id: req.id, result };
    } catch (e) {
      payload = { id: req.id, error: { code: -32603, message: e?.message ?? String(e) } };
    }
    try {
      if (generation === this.#generation) this.#child?.stdin.write(JSON.stringify(payload) + "\n");
    } catch {}
  }

  async #waitUntilReady() {
    for (let i = 0; i < 300; i++) {
      if (this.#state === "ready") return;
      await delay(50);
    }
    throw new Error("Timed out waiting for app-server ready state");
  }

  #closePending(err) {
    for (const p of this.#pending.values()) {
      clearTimeout(p.timeout);
      p.reject(err);
    }
    this.#pending.clear();
  }
}

// With approvalPolicy:"never" the server should not prompt, but answer defensively
// so a stray approval request can never deadlock a turn.
function defaultServerResponse(req) {
  if (req.method === "item/tool/call") {
    return {
      success: false,
      contentItems: [{ type: "inputText", text: "No dynamic tool handler is registered." }],
    };
  }
  if (req.method === "item/commandExecution/requestApproval" || req.method === "item/fileChange/requestApproval") return { decision: "decline" };
  throw new Error("This workflow runtime does not support interactive server requests.");
}

export function sanitizeEnv(env, cwd) {
  const next = { ...env, PWD: cwd };
  // Local: Code Desktop's runner runs as Node under Electron (workflow-service ELECTRON_RUN_AS_NODE); its core does not,
  // unless the core's own launch asked for it, or an Electron program an agent runs would start as plain Node.
  if (next.CODE_DESKTOP_WORKFLOW_RUNNER === "1" && next.CODE_DESKTOP_CORE_RUN_AS_NODE !== "1") delete next.ELECTRON_RUN_AS_NODE;
  for (const k of Object.keys(next)) {
    if (k === "DYLD_INSERT_LIBRARIES" || k === "DYLD_LIBRARY_PATH" || k === "DYLD_FRAMEWORK_PATH") {
      delete next[k];
    }
  }
  return next;
}
