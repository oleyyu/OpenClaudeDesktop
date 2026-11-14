// desktop:call "chat-import" (main.cjs): the Import Chat History page's main-process side (analysis/import-chat-history
// DESIGN.md "主进程接口"). Ops:
//   sources                      → [{source, label, available, experimental, roots}]   (catalog.mjs listSources)
//   list {sources?, query?, offset?, limit?, includeSubagents?} → {sessions, total, counts, all, offset, hasMore}
//                                  (ops.mjs list: search and source filter here; counts per source for the query)
//   preview {key}                → {session, turns, truncated}   (capped, images as placeholders: ops.mjs preview)
//   import {key, target?, jobId?, pageLoad?} → {threadId, strategy, warnings, trimmed, redacted, sessionMetadata}
//                                  or {code: 'needs-core-switch', target, core} when `target` is not the running core.
//                                  One import per jobId: a second request with the same id gets the first one's answer.
//   jobs {pageLoad}              → [{jobId, state, title, result?, error?}]: this window's imports started by an earlier
//                                  page load (a reload mid-import) that it has not seen finish
//   wait {jobId}                 → the job's answer (it is then acknowledged); ack {jobId} acknowledges it only
//   prefix {threadId}            → {turns, importedFrom}   (the inject/handoff display prefix; turns null otherwise)
// Listing, reading and converting run in a node:worker_threads Worker (worker.mjs), never on the main thread. The
// external histories are only read (catalog.mjs opens them read-only). An import records
// preferences.sessionMetadata[threadId].importedFrom, and an inject/handoff import writes the turns the transcript
// shows before the session's own to <userData>/imports/<threadId>.json (removed with the session: forgetPrefix).
//
// Another core as the target is not switched to here: a core switch (main.cjs "cores" select) restarts the connection
// and the renderer reloads for its new core (Bypass carry tokens, the boot payload), so an import chained after it in
// main would answer a window that no longer waits for it. The page switches first, then imports (src/import-history-model.mjs).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const NEEDS_CORE_SWITCH = "needs-core-switch";
const PREFIX_STRATEGIES = new Set(["inject", "handoff"]);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const JOB_ID = /^[A-Za-z0-9._:-]{8,100}$/;
// A finished job is kept this long for a reloaded page to pick up.
const JOB_TTL = 15 * 60 * 1000;

const text = (value) => (typeof value === "string" ? value : "");
const loadDefault = () => Promise.all([import("./catalog.mjs"), import("./convert.mjs"), import("./targets.mjs")])
  .then(([catalog, convert, targets]) => ({ catalog, convert, targets }));

/** requestRpc answers a JSON-RPC failure as {__codeDesktopRpcError} (main.cjs, for ipcRenderer): thrown again here. */
function unwrapRpc(result) {
  const failure = result?.__codeDesktopRpcError;
  if (!failure) return result;
  const error = new Error(text(failure.message) || "The core refused the request.");
  error.code = failure.code;
  error.data = failure.data ?? null;
  throw error;
}

const prefixFile = (userDataDir, threadId) => path.join(userDataDir, "imports", `${threadId}.json`);

/** Removes a session's display prefix copy (main.cjs thread/delete). Never throws. */
function forgetPrefix(userDataDir, threadId) {
  if (typeof threadId !== "string" || !SAFE_ID.test(threadId) || !userDataDir) return false;
  try { fs.rmSync(prefixFile(userDataDir, threadId), { force: true }); return true; } catch { return false; }
}

/** ops.mjs in this thread (tests, and the fallback when the worker cannot start). */
function createInlineRunner(loadModules = loadDefault) {
  let ops = null;
  const get = () => (ops ??= Promise.all([loadModules(), import("./ops.mjs")]).then(([modules, table]) => table.createOps(modules)).catch((error) => { ops = null; throw error; }));
  return { run: async (op, args) => { const table = await get(); if (!Object.hasOwn(table, op)) throw new Error("Unsupported operation."); return table[op](args); }, dispose() {} };
}

/**
 * ops.mjs in a Worker: {id, op, args} requests, answers by id. The worker is started on first use and again after it
 * dies; it holds the event loop only while requests wait. A worker that fails before its first answer (no Worker
 * support for the packaged path) hands its requests, and every later one, to `fallback`.
 */
function createWorkerRunner({ file = path.join(__dirname, "worker.mjs"), fallback = null, onFallback = null } = {}) {
  let worker = null, seq = 0, answered = false, inline = null;
  const pending = new Map();
  const settle = () => { if (!worker) return; if (pending.size) worker.ref(); else worker.unref(); };
  const fail = (error, source) => {
    if (worker !== source) return;
    worker = null;
    const waiting = [...pending.values()];
    pending.clear();
    if (!answered && fallback) {
      inline ??= fallback();
      onFallback?.(error);
      for (const entry of waiting) inline.run(entry.op, entry.args).then(entry.resolve, entry.reject);
      return;
    }
    for (const entry of waiting) entry.reject(error);
  };
  const start = () => {
    const { Worker } = require("node:worker_threads");
    const started = new Worker(file);
    started.on("message", ({ id, ok, value, error } = {}) => {
      const entry = pending.get(id);
      if (!entry) return;
      answered = true;
      pending.delete(id);
      settle();
      if (ok) entry.resolve(value);
      else entry.reject(Object.assign(new Error(text(error?.message) || "The import worker failed."), error?.code ? { code: error.code } : {}));
    });
    started.on("error", (error) => fail(error, started));
    started.on("exit", (code) => fail(new Error(`The import worker stopped (${code}).`), started));
    return started;
  };
  return {
    run(op, args) {
      if (inline) return inline.run(op, args);
      return new Promise((resolve, reject) => {
        try { worker ??= start(); } catch (error) { if (fallback) { inline ??= fallback(); onFallback?.(error); inline.run(op, args).then(resolve, reject); } else reject(error); return; }
        const id = ++seq;
        pending.set(id, { op, args, resolve, reject });
        settle();
        worker.postMessage({ id, op, args });
      });
    },
    dispose() { const current = worker; worker = null; for (const entry of pending.values()) entry.reject(new Error("The import worker was closed.")); pending.clear(); return current?.terminate(); },
  };
}

/**
 * @param {object} deps
 * @param {string} deps.home the user's home (os.homedir())
 * @param {object} deps.env process.env
 * @param {string} deps.userDataDir app.getPath('userData'): imports/ lives here, and nothing under it is listed
 * @param {() => Promise<{id: string, capabilities: object, owner?: any, contextWindow?: number | null}>} deps.getCore
 *   the running core, started, with the context window of the model a new session gets (null when unknown)
 * @param {(method: string, params: object, owner?: any, options?: object) => Promise<any>} deps.rpc main's requestRpc
 * @param {(method: string, params: object, owner?: any) => Promise<any>} deps.request the connection's own request
 * @param {(threadId: string, owner?: any) => Promise<{threadId: string}>} [deps.fork] main's forkCoreSession
 * @param {(params: object, owner?: any) => Promise<any>} [deps.importThread] main's importCoreThread (main-only method)
 * @param {(threadId: string, owner?: any) => Promise<any> | any} [deps.discard] archives and forgets a thread this import started
 * @param {() => void} [deps.notify] tells every window the session metadata changed
 * @param {() => object} deps.getConfig preferences (sessionMetadata)
 * @param {() => void} deps.save writes preferences
 * @param {() => string} [deps.defaultCwd] the folder for a session whose own is gone
 * @param {{run: Function, dispose?: Function}} [deps.runner] where ops.mjs runs (default: the worker)
 * @param {() => Promise<{catalog, convert, targets}>} [deps.loadModules] tests: ops.mjs in process over these modules
 */
function createChatImport(deps) {
  const { home, env, userDataDir, getCore, rpc, request, fork, importThread, discard, notify, getConfig, save, defaultCwd } = deps;
  const runner = deps.runner ?? (deps.loadModules ? createInlineRunner(deps.loadModules)
    : createWorkerRunner({ fallback: () => createInlineRunner(), onFallback: (error) => console.warn("Import Chat History runs without its worker:", error?.message || error) }));
  let targetsModule = null;
  const targets = () => (targetsModule ??= (deps.loadModules ? deps.loadModules().then((modules) => modules.targets) : import("./targets.mjs")));
  // Never listed: OpenClaude's own state (<userData>: imports/, the bridges' <userData>/cores/<id>/state with OpenCode
  // 2.x's opencode-v2/opencode.db and MiniMax's per-thread homes) and a bridge started without
  // CODE_DESKTOP_BRIDGE_STATE (~/.code-desktop/<bridge>, acp-bridge server.js stateDir).
  const scope = () => ({ home, env, exclude: [userDataDir, ...(home ? [path.join(home, ".code-desktop")] : [])] });
  const jobs = new Map();

  const folderFor = (session) => {
    const own = text(session?.cwd);
    if (own && path.isAbsolute(own) && fs.existsSync(own)) return own;
    const fallback = text(defaultCwd?.());
    return fallback && path.isAbsolute(fallback) ? fallback : "";
  };

  function recordImport(threadId, record, prefix) {
    const config = getConfig();
    config.sessionMetadata ??= {};
    config.sessionMetadata[threadId] = { ...config.sessionMetadata[threadId], importedFrom: record };
    if (prefix && typeof prefix.json === "string" && PREFIX_STRATEGIES.has(record.strategy) && SAFE_ID.test(threadId)) {
      const file = prefixFile(userDataDir, threadId);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, `{"version":1,"threadId":${JSON.stringify(threadId)},"importedFrom":${JSON.stringify(record)},"turns":${prefix.json}}`);
      fs.renameSync(temp, file);
    }
    save();
    try { notify?.(); } catch {}
    return config.sessionMetadata[threadId];
  }

  // MiniMax's handoff bound (targets.mjs minimaxHandoffLimit): the user's own AGENTS.md as the bridge finds it
  // (acp-bridge agents/minimax.js homeOf: MINIMAX_DATA_DIR, MAVIS_DATA_DIR, ~/.minimax), only stat'ed, and the
  // app-tools guidance the bridge adds (agent-tools-instructions.cjs).
  function minimaxLimit(tools) {
    const dir = text(env?.MINIMAX_DATA_DIR) || text(env?.MAVIS_DATA_DIR) || (home ? path.join(home, ".minimax") : "");
    let ownBytes = 0;
    try { const stat = dir ? fs.statSync(path.join(dir, "AGENTS.md")) : null; if (stat?.isFile()) ownBytes = stat.size; } catch {}
    let appToolsBytes = 0;
    try { appToolsBytes = Buffer.byteLength(require("../agent-tools-instructions.cjs").INSTRUCTIONS || ""); } catch {}
    return (params) => tools.minimaxHandoffLimit(params, { ownBytes, appToolsBytes });
  }

  async function runImport(p, core) {
    const tools = await targets();
    const budgets = tools.importBudgets(core.contextWindow ?? null, core.id);
    const prepared = await runner.run("prepare", { ...scope(), key: p.key, budgets });
    const owner = core.owner;
    const folder = folderFor(prepared.session);
    const result = await tools.importInto({
      prepared, core, cwd: folder,
      rpc: async (method, params, options) => unwrapRpc(await rpc(method, params, owner, options)),
      request: (method, params) => request(method, params, owner),
      // The folder too: a fork of a session whose folder is gone opens in it instead (main.cjs forkCoreSession).
      ...(fork ? { fork: (threadId) => fork(threadId, owner, { folder }) } : {}),
      ...(importThread ? { importThread: async (params) => unwrapRpc(await importThread(params, owner)) } : {}),
      discard: (threadId) => discard?.(threadId, owner),
      ...(core.id === "minimax" ? { handoffLimit: minimaxLimit(tools) } : {}),
    });
    if (result.details?.length) console.warn("Import Chat History:", result.details.join("; "));
    const sessionMetadata = recordImport(result.threadId, result.importedFrom, result.prefix);
    return { title: prepared.session?.title || prepared.session?.firstPrompt || null,
      answer: { threadId: result.threadId, strategy: result.strategy, warnings: result.warnings, trimmed: result.trimmed, redacted: result.redacted, sessionMetadata } };
  }

  function prune(now = Date.now()) {
    for (const [id, job] of jobs) if (job.state !== "running" && now - job.finishedAt > JOB_TTL) jobs.delete(id);
  }
  const jobView = (job) => ({ jobId: job.jobId, state: job.state, title: job.title, key: job.key,
    ...(job.state === "done" ? { result: job.result } : {}), ...(job.state === "failed" ? { error: job.error } : {}) });

  async function call(p = {}, { senderId = null } = {}) {
    switch (p?.op) {
      case "sources": return runner.run("sources", scope());
      case "list": {
        const sources = Array.isArray(p.sources) ? p.sources.filter((source) => typeof source === "string" && source).slice(0, 32) : undefined;
        const query = text(p.query).trim().slice(0, 200) || undefined;
        const limit = Number.isInteger(p.limit) && p.limit > 0 ? Math.min(p.limit, 2000) : undefined;
        const offset = Number.isInteger(p.offset) && p.offset > 0 ? p.offset : undefined;
        return runner.run("list", { ...scope(), ...(sources?.length ? { sources } : {}), ...(query ? { query } : {}), ...(limit ? { limit } : {}), ...(offset ? { offset } : {}),
          includeSubagents: p.includeSubagents === true });
      }
      case "preview": {
        if (!text(p.key)) throw new Error("Choose a conversation first.");
        return runner.run("preview", { ...scope(), key: p.key });
      }
      case "import": {
        if (!text(p.key)) throw new Error("Choose a conversation first.");
        prune();
        const jobId = JOB_ID.test(text(p.jobId)) ? p.jobId : null;
        const known = jobId ? jobs.get(jobId) : null;
        if (known) {
          // The same import asked again (a resumed page, a retry): its own answer, never a second session.
          if (known.key !== p.key) throw new Error("That import is for another conversation.");
          known.senderId = senderId ?? known.senderId;
          known.pageLoad = text(p.pageLoad) || known.pageLoad;
          const answer = await known.promise;
          known.acked = true;
          return answer;
        }
        const core = await getCore();
        if (typeof p.target === "string" && p.target && p.target !== core.id)
          return { code: NEEDS_CORE_SWITCH, target: p.target, core: core.id, message: `Switch to ${p.target} before importing.` };
        const job = { jobId, key: p.key, title: null, senderId, pageLoad: text(p.pageLoad), state: "running", result: null, error: null, startedAt: Date.now(), finishedAt: 0, acked: false };
        job.promise = runImport(p, core).then(({ title, answer }) => {
          Object.assign(job, { state: "done", title: job.title ?? title, result: answer, finishedAt: Date.now() });
          return answer;
        }, (error) => {
          Object.assign(job, { state: "failed", error: text(error?.message) || String(error), finishedAt: Date.now() });
          throw error;
        });
        if (jobId) jobs.set(jobId, job);
        const answer = await job.promise;
        job.acked = true;
        return answer;
      }
      case "jobs": {
        prune();
        const pageLoad = text(p.pageLoad);
        return [...jobs.values()].filter((job) => !job.acked && job.senderId === senderId && senderId !== null && job.pageLoad !== pageLoad).map(jobView);
      }
      case "wait": case "ack": {
        const job = jobs.get(text(p.jobId));
        if (!job) throw new Error("That import is no longer known.");
        if (p.op === "ack") { job.acked = true; return { ok: true }; }
        try { return await job.promise; } finally { job.acked = true; }
      }
      case "prefix": {
        const threadId = text(p.threadId);
        const importedFrom = getConfig().sessionMetadata?.[threadId]?.importedFrom ?? null;
        if (!SAFE_ID.test(threadId) || !importedFrom || !PREFIX_STRATEGIES.has(importedFrom.strategy)) return { turns: null, importedFrom };
        const { turns } = await runner.run("readPrefix", { file: prefixFile(userDataDir, threadId) });
        return { turns: Array.isArray(turns) ? turns : null, importedFrom };
      }
      default:
        throw new Error("Unsupported operation.");
    }
  }

  return { call, dispose: () => runner.dispose?.() };
}

/**
 * main.cjs importCoreThread's wait for codeDesktop/thread/import: `call` (the request, made with a longer timeout of its
 * own) answers within `timeoutMs`, else this rejects (error.importTimedOut) and a result that still comes later goes
 * to `onLate` (main deletes that session), so the fallback that follows never leaves a duplicate behind.
 * @param {Promise<any>} call
 * @param {number} timeoutMs
 * @param {(late: any) => void} onLate
 */
async function raceImport(call, timeoutMs, onLate) {
  let timer = null;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("codeDesktop/thread/import timed out."), { importTimedOut: true })), timeoutMs);
  });
  try {
    return await Promise.race([call, expired]);
  } catch (error) {
    if (error?.importTimedOut) Promise.resolve(call).then((late) => { try { onLate?.(late); } catch {} }, () => {});
    throw error;
  } finally { clearTimeout(timer); }
}

module.exports = { createChatImport, createWorkerRunner, createInlineRunner, forgetPrefix, raceImport, unwrapRpc, NEEDS_CORE_SWITCH, PREFIX_STRATEGIES };
