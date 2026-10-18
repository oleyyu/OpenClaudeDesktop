import { loadCoworkNative } from './reference.mjs';
import { provisionCowork, guestWorkspace } from './provision.mjs';
import { CoworkVmTransport } from './vm-transport.mjs';
import { CoworkSdkChannel, sdkLaunch } from './sdk-channel.mjs';
import { proxyCredentials, providerDomains } from './proxy-credentials.mjs';
import { setTimeout as delay } from 'node:timers/promises';
import { REWIND_FORK_REFUSED, isForkRefusal } from './rewind-chain.mjs';

// R4i-cowork CW2: which CLI session a launch opens. A rewind fork resumes the old session at the fork point and names
// the new one (CB6cNSrW `X.resume=K.cliSessionId,X.resumeSessionAt=lt,X.forkSession=!0`; --session-id is the host's).
export function sdkSessionOptions({ sdkSessionId, resume = false, fork } = {}) {
  if (fork) return { resume: fork.from, resumeSessionAt: fork.at, forkSession: true, sessionId: sdkSessionId };
  return resume ? { resume: sdkSessionId } : { sessionId: sdkSessionId };
}

// The native VM dispatches onto the macOS main run loop. Loading this module
// does not load the addon; boot remains lazy until the first Cowork turn.
export function createCoworkRuntime(send) {
const channels = new Map(), approvals = new Map(), generations = new Map();
let transport, native, starting, config, stopped = false;
function timeout(promise, ms, label) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Cowork ${label} timed out.`)), ms); })]).finally(() => clearTimeout(timer));
}
async function boot(settings) {
  if (stopped) throw new Error('Cowork runtime stopped.');
  if (!starting) starting = (async () => {
    config = settings;
    send({ event: 'status', status: 'preparing' });
    const provision = await provisionCowork(settings);
    if (stopped) throw new Error('Cowork runtime stopped.');
    native = await loadCoworkNative({ root: provision.referenceRoot });
    if (stopped) throw new Error('Cowork runtime stopped.');
    transport = new CoworkVmTransport({ ...native, onStatus: value => send({ event: 'status', ...value }) });
    await transport.initialize();
    if (stopped) throw new Error('Cowork runtime stopped.');
    send({ event: 'status', status: 'booting' });
    await timeout(native.vm.startVM(provision.bundle, 4, 2, 'gvisor', undefined, undefined, undefined, undefined), 60_000, 'VM startup');
    if (stopped) throw new Error('Cowork runtime stopped.');
    const deadline = Date.now() + 60_000;
    while (!await timeout(native.vm.isGuestConnected(), 3000, 'guest probe')) {
      if (stopped || Date.now() >= deadline) throw new Error('Cowork VM guest did not connect.');
      await delay(200);
    }
    await timeout(native.vm.installSdk(provision.sdkStorageSubpath, provision.sdkVersion), 30_000, 'SDK install');
    if (stopped) throw new Error('Cowork runtime stopped.');
    send({ event: 'status', status: 'ready' });
  })().catch(async error => {
    await transport?.close().catch(() => {});
    await timeout(Promise.resolve(native?.vm.stopVM(true)), 5000, 'failed-start cleanup').catch(() => {});
    starting = null; throw error;
  });
  return starting;
}
async function retire(channel) {
  channel.close();
  try { await timeout(channel.finished, 10_000, 'SDK shutdown'); }
  catch {
    await channel.process.kill('SIGKILL');
    await timeout(channel.finished, 5000, 'SDK forced shutdown');
  }
}
async function approval(sessionId, turnId, request, { signal, requestId }) {
  const id = `${sessionId}:${requestId}`;
  return new Promise(resolve => {
    const finish = response => { signal.removeEventListener('abort', cancel); approvals.delete(id); resolve(response); };
    const cancel = () => { finish({ behavior: 'deny', message: 'Cancelled.' }); send({ event: 'approval-cancel', id }); };
    approvals.set(id, finish); signal.addEventListener('abort', cancel, { once: true });
    send({ event: 'approval', id, sessionId, turnId, request });
    if (signal.aborted) cancel();
  });
}
async function dispatch(method, params) {
  if (method === 'boot') return boot(params);
  if (method === 'open') {
    generations.set(params.sessionId, params.turnId);
    await boot(params.runtime);
    if (generations.get(params.sessionId) !== params.turnId) throw new Error('Cowork launch cancelled.');
    const previous = channels.get(params.sessionId); if (previous) await retire(previous);
    if (generations.get(params.sessionId) !== params.turnId) throw new Error('Cowork launch cancelled.');
    const mount = await guestWorkspace({ dataDir: config.dataDir, sessionId: params.sessionId, cwd: params.cwd, readOnly: params.permissionMode === 'plan' });
    const env = { ...params.provider.env, CLAUDE_CONFIG_DIR: mount.configDir,
      CLAUDE_CODE_ENTRYPOINT: 'sdk-ts', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1' };
    for (const token of proxyCredentials(env)) {
      if (native.vm.addApprovedOauthToken) await timeout(native.vm.addApprovedOauthToken(token), 3000, 'credential approval');
    }
    if (generations.get(params.sessionId) !== params.turnId) throw new Error('Cowork launch cancelled.');
    const child = transport.spawn({ ...mount, env,
      ...sdkLaunch({ cwd: mount.cwd, model: params.provider.model, permissionMode: params.permissionMode, ...sdkSessionOptions(params) }),
      allowedDomains: providerDomains(env), isResume: !!params.resume || !!params.fork, oneShot: false, mountSkeletonHome: true });
    const channel = new CoworkSdkChannel({ process: child, handlers: { can_use_tool: (request, context) => approval(params.sessionId, params.turnId, request, context) } });
    channels.set(params.sessionId, channel);
    const active = () => channels.get(params.sessionId) === channel;
    channel.on('message', record => { if (active()) send({ event: 'message', sessionId: params.sessionId, turnId: params.turnId, record }); });
    channel.on('failure', error => { if (active()) send({ event: 'failure', sessionId: params.sessionId, turnId: params.turnId, error: error.message }); });
    // CB6cNSrW takeRewindRefusal reads the CLI's refusal of the fork point from its output; only the fixed marker
    // crosses to the session service, never the diagnostic text itself.
    let diagnosticTail = '';
    if (params.fork) channel.on('diagnostic', text => {
      const seen = diagnosticTail + text; diagnosticTail = seen.slice(1 - REWIND_FORK_REFUSED.length);
      if (active() && isForkRefusal(seen)) send({ event: 'failure', sessionId: params.sessionId, turnId: params.turnId, error: REWIND_FORK_REFUSED });
    });
    channel.on('exit', result => { if (active()) { channels.delete(params.sessionId); send({ event: 'exit', sessionId: params.sessionId, turnId: params.turnId, code: result.code, signal: result.signal }); } });
    const initialized = await channel.initialize({ appendSystemPrompt: params.instructions });
    if (generations.get(params.sessionId) !== params.turnId) { channel.close(); throw new Error('Cowork launch cancelled.'); }
    return initialized;
  }
  if (method === 'send') {
    const channel = channels.get(params.sessionId);
    if (!channel || generations.get(params.sessionId) !== params.turnId) throw new Error('Cowork SDK session is not open.');
    return channel.sendUser(params.text, { uuid: params.messageId, sessionId: params.sdkSessionId });
  }
  if (method === 'interrupt') return channels.get(params.sessionId)?.interrupt();
  if (method === 'close') {
    if (params.turnId && generations.get(params.sessionId) !== params.turnId) return;
    generations.delete(params.sessionId);
    const channel = channels.get(params.sessionId);
    // Retain the retiring channel until native exit so an immediate resume waits
    // for the old process to release this session's name and mounts.
    if (channel) { await retire(channel); if (channels.get(params.sessionId) === channel) channels.delete(params.sessionId); }
    return;
  }
  if (method === 'approval') { approvals.get(params.id)?.(params.response); return; }
  if (method === 'stop') {
    stopped = true;
    for (const channel of channels.values()) channel.close(); channels.clear();
    await transport?.close(); await timeout(Promise.resolve(native?.vm.stopVM(true)), 5000, 'shutdown');
    return;
  }
  throw new Error('Unsupported Cowork worker operation.');
}
return { dispatch };
}

// Retained for protocol fixtures; production uses the Electron main run loop.
if (process.parentPort) {
  const runtime = createCoworkRuntime(value => process.parentPort.postMessage(value));
  process.parentPort.on('message', ({ data }) => {
    void runtime.dispatch(data.method, data.params ?? {}).then(result => process.parentPort.postMessage({ id: data.id, result }), error => process.parentPort.postMessage({ id: data.id, error: error?.message || String(error) }));
  });
}
