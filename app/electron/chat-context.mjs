// Chat context contributors (w13-chatfn-context): what the official Chat gets from claude.ai at completion time —
// memory, project knowledge, the conversation's tool switches (c9b54eb90 _e: enabled_web_search / compass_mode /
// paprika_mode beside the request body) — is added here on the local side, when main decorates a Chat or Cowork
// session's thread/start or thread/resume (main.cjs requestRpc / requestCowork, right after applyProjectContext).
//
// A contributor is app/electron/chat-context/<name>.mjs (read in file-name order, as agent-tools-host.cjs reads
// ./agent-tools), exporting
//   export const id = "memory"                 (unique; contributions are joined in id order)
//   export const surfaces = ["chat"]           ("chat" and/or "cowork": a Code session is never decorated)
//   export async function apply({ config, method, params, surface, project, threadId, dataDir })
//     → a string (developer instructions), or { instructions?: string, config?: { key: value } }, or null
// apply() reads a copy of the request (structuredClone): it can't change it. Its instructions are appended to
// params.developerInstructions (a blank line between blocks), cut to MAX_BLOCK_CHARS each and MAX_TOTAL_CHARS for all
// contributors together; its config keys are added to params.config, never replacing a key the request already has
// (nor one an earlier contributor added). A contributor that throws or answers something else is skipped (logged):
// the user's message still goes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sessionSurface, validSurface } from './surface-policy.mjs';

export const CONTEXT_SURFACES = Object.freeze(['chat', 'cowork']);
export const CONTEXT_METHODS = Object.freeze(['thread/start', 'thread/resume']);
/** One contributor's instructions, at most (longer text is cut, ending with TRUNCATED). */
export const MAX_BLOCK_CHARS = 24000;
/** Every contributor's instructions together, at most, for one request. */
export const MAX_TOTAL_CHARS = 64000;
export const TRUNCATED = '\n[…truncated]';
const CONFIG_KEY = /^[A-Za-z0-9_.-]{1,200}$/;
const CONTRIBUTOR_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'chat-context');

const cut = (text, limit) => text.length <= limit ? text : limit <= TRUNCATED.length ? '' : text.slice(0, limit - TRUNCATED.length) + TRUNCATED;

/** A contributor module as the decorator uses it, or null when it doesn't meet the contract. */
export function contributorOf(module) {
  const id = typeof module?.id === 'string' ? module.id : null;
  if (!id || !CONTRIBUTOR_ID.test(id) || typeof module.apply !== 'function' || !Array.isArray(module.surfaces)) return null;
  const surfaces = CONTEXT_SURFACES.filter(surface => module.surfaces.includes(surface));
  return surfaces.length ? { id, surfaces, apply: module.apply } : null;
}

/** The contributors in a directory (*.mjs, file-name order), loaded once per directory; a module that fails to load
 * or breaks the contract is left out with a warning, and a repeated id keeps the first. */
const loaded = new Map();
export function loadContributors(dir = DEFAULT_DIR, logger = console) {
  if (!loaded.has(dir)) loaded.set(dir, (async () => {
    let files = [];
    try { files = fs.readdirSync(dir).filter(file => file.endsWith('.mjs')).sort(); } catch { files = []; }
    const out = [];
    for (const file of files) {
      let contributor = null;
      try { contributor = contributorOf(await import(pathToFileURL(path.join(dir, file)).href)); }
      catch (error) { logger.warn?.(`chat context: ${file} failed to load: ${error?.message || error}`); continue; }
      if (!contributor) { logger.warn?.(`chat context: ${file} is not a contributor`); continue; }
      if (out.some(entry => entry.id === contributor.id)) { logger.warn?.(`chat context: duplicate contributor ${contributor.id} in ${file}`); continue; }
      out.push(contributor);
    }
    return out;
  })());
  return loaded.get(dir);
}

/** The surface a decorated request is for: thread/start's own (takeSurface), thread/resume's session's. */
export function contextSurface(config, method, params, surface) {
  if (method === 'thread/start') return validSurface(surface) ? surface : 'code';
  if (method === 'thread/resume') return typeof params?.threadId === 'string' ? sessionSurface(params.threadId, config?.sessionMetadata) : 'code';
  return 'code';
}

// thread/start requests of a Chat or Cowork session, until the app's tool server names them: a core lists the app's
// tools for a start token before the thread exists (agent-tools-host.cjs), and main writes the token into the
// request's config after this decorator ran (decorateAgentTools). Bounded; the token's surface is kept once seen.
const AGENT_SESSION_KEY = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION';
const MAX_PENDING_STARTS = 64;
const pendingStarts = [];
const startSurfaces = new Map();
const threadSurfaces = new Map();
function rememberStart(params, surface) {
  pendingStarts.push({ params, surface });
  while (pendingStarts.length > MAX_PENDING_STARTS) pendingStarts.shift();
}
function startSurface(identity) {
  if (typeof identity !== 'string' || !identity) return null;
  if (startSurfaces.has(identity)) return startSurfaces.get(identity);
  const index = pendingStarts.findIndex(entry => entry.params?.config?.[AGENT_SESSION_KEY] === identity);
  if (index < 0) return null;
  const [{ surface }] = pendingStarts.splice(index, 1);
  startSurfaces.set(identity, surface);
  while (startSurfaces.size > MAX_PENDING_STARTS) startSurfaces.delete(startSurfaces.keys().next().value);
  return surface;
}
/**
 * w13-close-main-process (closeout chatfn-context-01): a thread/fork (a Chat version, chat-branches.mjs) is its parent's
 * surface from the start: its start token lists the parent surface's tools before main writes the fork's
 * sessionMetadata (after the fork answered). main.cjs decorateAgentTools calls this once the token is in params.config.
 */
export function rememberFork(config, params) {
  if (!params || typeof params !== 'object' || typeof params.threadId !== 'string') return;
  const surface = sessionSurface(params.threadId, config?.sessionMetadata);
  if (CONTEXT_SURFACES.includes(surface)) rememberStart(params, surface);
}
function rememberThread(id, surface) {
  threadSurfaces.set(id, surface);
  while (threadSurfaces.size > MAX_PENDING_STARTS) threadSurfaces.delete(threadSurfaces.keys().next().value);
}

/**
 * agent-tools-host.cjs's sessionSurface service (main.cjs host.provide): the surface of the session a tool server
 * names — a start token's from its thread/start request, else the thread's (sessionMetadata), else code.
 * @param {() => object} getConfig
 */
export function sessionSurfaceResolver(getConfig) {
  return (session) => {
    const id = typeof session?.id === 'string' && session.id ? session.id : null;
    const pending = startSurface(session?.identity);
    // Asked for a bound token: its thread keeps that surface (a tool call's ctx names the thread alone, and main writes
    // the thread's sessionMetadata only after an await).
    if (pending) { if (id) rememberThread(id, pending); return pending; }
    if (!id) return 'code';
    const recorded = getConfig()?.sessionMetadata?.[id]?.surface;
    if (validSurface(recorded)) return recorded;
    return threadSurfaces.get(id) ?? sessionSurface(id, getConfig()?.sessionMetadata);
  };
}

function snapshot(params) {
  try { return structuredClone(params); } catch { return JSON.parse(JSON.stringify(params)); }
}

/**
 * Decorate a Chat or Cowork session's thread/start|resume with its contributors (see the header). A Code session, any
 * other method or no contributor leaves params exactly as they were.
 * @returns {Promise<{surface: string, contributors: string[]}>} the request's surface and the contributors that added something
 */
export async function applyChatContext(config, method, params, surface, { dataDir = null, project = null, dir = DEFAULT_DIR, contributors = null, logger = console } = {}) {
  const resolved = contextSurface(config, method, params, surface);
  if (!params || typeof params !== 'object' || !CONTEXT_METHODS.includes(method) || !CONTEXT_SURFACES.includes(resolved)) return { surface: resolved, contributors: [] };
  if (method === 'thread/start') rememberStart(params, resolved);
  const list = (contributors ? contributors.map(contributorOf).filter(Boolean) : await loadContributors(dir, logger))
    .filter(entry => entry.surfaces.includes(resolved)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!list.length) return { surface: resolved, contributors: [] };
  const threadId = method === 'thread/resume' && typeof params.threadId === 'string' ? params.threadId : null;
  const blocks = [], added = {}, applied = [];
  let total = 0;
  for (const contributor of list) {
    let answer;
    try { answer = await contributor.apply({ config, method, params: snapshot(params), surface: resolved, project, threadId, dataDir }); }
    catch (error) { logger.warn?.(`chat context: ${contributor.id} failed: ${error?.message || error}`); continue; }
    if (answer == null) continue;
    const value = typeof answer === 'string' ? { instructions: answer } : answer;
    if (typeof value !== 'object' || Array.isArray(value)) { logger.warn?.(`chat context: ${contributor.id} answered something else`); continue; }
    let used = false;
    const text = typeof value.instructions === 'string' ? value.instructions.trim() : '';
    if (text && total < MAX_TOTAL_CHARS) {
      const block = cut(cut(text, MAX_BLOCK_CHARS), MAX_TOTAL_CHARS - total);
      if (block) { blocks.push(block); total += block.length; used = true; }
    }
    if (value.config && typeof value.config === 'object' && !Array.isArray(value.config)) {
      for (const [key, entry] of Object.entries(value.config)) {
        if (!CONFIG_KEY.test(key) || entry === undefined || typeof entry === 'function' || Object.hasOwn(added, key)) continue;
        if (params.config && typeof params.config === 'object' && Object.hasOwn(params.config, key)) continue;
        added[key] = snapshot(entry); used = true;
      }
    }
    if (used) applied.push(contributor.id);
  }
  if (blocks.length) params.developerInstructions = [params.developerInstructions, ...blocks].filter(value => typeof value === 'string' && value).join('\n\n');
  if (Object.keys(added).length) params.config = { ...(params.config && typeof params.config === 'object' ? params.config : {}), ...added };
  return { surface: resolved, contributors: applied };
}
