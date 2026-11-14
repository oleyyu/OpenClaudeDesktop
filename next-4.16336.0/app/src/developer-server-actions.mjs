import { t } from '../electron/i18n/index.mjs';
import { coreForEngine } from '../electron/core-registry.mjs';
import { windowCore } from './settings-model.mjs';

// Dot-delimited names need quoted key paths in the existing RPC adapter; keep
// those on Edit config until that capability exists.
export function canRemoveDeveloperServer(definition, status) {
  return typeof definition?.name === 'string' && !status?.pluginId && /^[A-Za-z0-9_-]{1,64}$/.test(definition.name);
}

// The removal confirm names the configuration the running core writes, by the core's name (core-registry
// descriptor: "DeepSeek Harness", "Codex", "ZCode", …). core: boot.core, a serverInfo or an engine/core id; without
// one, the core this window runs (settings-model windowCore), and only when that is unknown the copy names no core.
export function removeDeveloperServerPrompt(name, core) {
  const missing = core === undefined || core === null || core === '';
  const descriptor = missing ? windowCore() : coreForEngine(typeof core === 'string' ? core : core.engine);
  if (!descriptor) return t('Are you sure you want to remove the MCP server “{name}”?\n\nThis changes the agent core’s configuration. Project or managed configuration may still provide this server.', { name });
  return t('Are you sure you want to remove the MCP server “{name}”?\n\nThis changes the {core} configuration. Project or managed configuration may still provide this server.', { name, core: descriptor.name });
}

export async function removeDeveloperServer(name, { confirm, call, refresh, core }) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(name)) throw new Error(t('Use Edit config to remove this server.'));
  const accepted = await confirm(removeDeveloperServerPrompt(name, core));
  if (!accepted) return false;
  let failure;
  try { await call({ operation: 'mcp-remove', name }); }
  catch (error) { failure = error; }
  // A reload can fail after the write succeeded. Re-read either way; do not
  // remove rows optimistically or erase the original actionable error.
  try { await refresh(); }
  catch (error) { failure ||= error; }
  if (failure) throw failure;
  return true;
}

// A removal refresh can overtake the initial settings read. Only the latest
// request in the mounted connection/session may paint a snapshot or error.
// readFast (optional): the same snapshot without the MCP status list, which a core may hold until every MCP
// server finished its handshake (Codex waits up to startup_timeout_sec, 30 s by default). Its value is shown
// first, marked serversPending, so the policy and requirements rows (the Bypass opt-in) don't wait for it; it
// never replaces the full value once that has arrived.
export function createSettingsSnapshotReader({ read, readFast, onValue, onError, refreshCatalog }) {
  let live = true, request = 0;
  return {
    async refresh(catalog = false) {
      if (!live) return;
      const version = ++request;
      let settled = false;
      if (readFast) Promise.resolve().then(readFast).then(value => {
        if (live && version === request && !settled && value) onValue({ ...value, serversPending: true });
      }, () => {});
      try {
        const value = await read();
        settled = true;
        if (live && version === request) {
          onValue(value);
          if (catalog) await refreshCatalog?.();
        }
        return value;
      } catch (reason) {
        settled = true;
        if (live && version === request) onError(reason);
        throw reason;
      }
    },
    dispose() { live = false; },
  };
}
