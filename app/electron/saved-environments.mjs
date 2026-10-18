import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readEnvironmentRecord, recentEnvironments, sameEnvironmentName } from './generated/environment-presets.mjs';

// Named local places use the shipped v4 record shape. Variables remain in the
// existing encrypted local environment store; they are never written here.
export function createSavedEnvironments({ file, approveFolder = value => value, onSelectFolders = () => {}, emit = () => {}, now = Date.now, uuid = randomUUID }) {
  let state, queue = Promise.resolve();
  const clone = value => structuredClone(value);
  function record(value) {
    const result = readEnvironmentRecord(value)?.environment;
    if (!result || result.target.kind !== 'local' || result.target.wslDistro || result.target.variant || !Number.isFinite(result.createdAt) || !Number.isFinite(result.lastUsedAt)) return null;
    if (![result.target.cwd, ...(result.target.additionalFolders ?? [])].every(dir => typeof dir === 'string' && path.isAbsolute(dir) && !dir.includes('\0'))) return null;
    return result;
  }
  async function read() {
    if (state) return state;
    let raw;
    try { raw = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Couldn’t load saved environments.', { cause: error }); }
    const seen = new Set();
    const environments = (Array.isArray(raw?.environments) ? raw.environments : []).map(record).filter(row => {
      if (!row || seen.has(row.id)) return false;
      seen.add(row.id); return true;
    });
    const ids = new Set(environments.map(row => row.id));
    state = { version: 4, revision: Number.isSafeInteger(raw?.revision) && raw.revision >= 0 ? raw.revision : 0,
      selectionRevision: Number.isSafeInteger(raw?.selectionRevision) ? raw.selectionRevision : 0, environments, selectedId: ids.has(raw?.selectedId) ? raw.selectedId : null,
      starred: [...new Set((Array.isArray(raw?.starred) ? raw.starred : []).filter(id => typeof id === 'string' && (id === 'local:this-computer' || id.startsWith('preset:') && ids.has(id.slice(7)))))] };
    return state;
  }
  async function write(next) {
    next = { ...next, revision: (state?.revision ?? 0) + 1 };
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${uuid()}.tmp`;
    try { await fs.writeFile(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 }); await fs.rename(temp, file); }
    finally { await fs.rm(temp, { force: true }).catch(() => {}); }
    state = next;
    const snapshot = clone(next);
    emit({ kind: 'saved-environments', snapshot });
    return snapshot;
  }
  async function operation(request = {}) {
    const current = await read();
    if (request.op === 'list' || !request.op) return clone(current);
    if (request.op === 'save') {
      const editing = request.id ? current.environments.find(row => row.id === request.id) : null;
      if (request.id && !editing) throw new Error('This environment no longer exists.');
      const name = typeof request.value?.name === 'string' ? request.value.name.trim() : '';
      if (!name || name.length > 256 || name.includes('\0')) throw new Error('Enter a name.');
      if (current.environments.some(row => row.id !== editing?.id && sameEnvironmentName(row.name, name))) throw new Error('Another environment has this name.');
      const value = record({ ...request.value, name, id: editing?.id ?? uuid(), createdAt: editing?.createdAt ?? now(), lastUsedAt: editing?.lastUsedAt ?? 0 });
      if (!value) throw new Error('Choose a local folder for this environment.');
      // This host implements the source's additionalFolderCheckouts=false branch.
      if (Object.keys(value.target.folderSettings ?? {}).length) throw new Error('Separate checkouts for additional folders are not available.');
      for (const dir of [value.target.cwd, ...(value.target.additionalFolders ?? [])]) await approveFolder(dir);
      if (value.target.additionalFolders) value.target.additionalFolders = [...new Set(value.target.additionalFolders)].filter(dir => dir !== value.target.cwd);
      const snapshot = await write({ ...current, environments: [...current.environments.filter(row => row.id !== value.id), value] });
      return { snapshot, environment: clone(value) };
    }
    if (request.op === 'select' && request.id === null) return write({ ...current, selectedId: null, selectionRevision: current.revision + 1 });
    if (request.op === 'star' && request.id === 'local:this-computer') {
      const starred = current.starred.includes(request.id) ? current.starred.filter(id => id !== request.id) : [...current.starred, request.id];
      return write({ ...current, starred });
    }
    const row = current.environments.find(row => row.id === request.id);
    if (!row) throw new Error('This environment no longer exists.');
    if (request.op === 'get') return clone(row);
    if (request.op === 'select') {
      const folders = [row.target.cwd, ...(row.target.additionalFolders ?? [])];
      if (Object.keys(row.target.folderSettings ?? {}).length) throw new Error('Separate checkouts for additional folders are not available.');
      for (const dir of folders) {
        if (!(await fs.stat(dir).catch(() => null))?.isDirectory()) throw new Error(`${row.name} can’t start: ${dir} no longer exists.`);
      }
      const snapshot = await write({ ...current, selectedId: row.id, selectionRevision: current.revision + 1 });
      await onSelectFolders(folders);
      return { snapshot, environment: clone(row) };
    }
    if (request.op === 'delete') return write({ ...current, environments: current.environments.filter(item => item.id !== row.id),
      selectedId: current.selectedId === row.id ? null : current.selectedId, starred: current.starred.filter(id => id !== `preset:${row.id}`) });
    if (request.op === 'star') {
      const key = `preset:${row.id}`;
      return write({ ...current, starred: current.starred.includes(key) ? current.starred.filter(id => id !== key) : [...current.starred, key] });
    }
    if (request.op === 'used') return write({ ...current, environments: recentEnvironments(current.environments.map(item => item.id === row.id ? { ...item, lastUsedAt: now() } : item)) });
    throw new Error('Unknown environment operation.');
  }
  return { run(request) { const result = queue.then(() => operation(request)); queue = result.catch(() => {}); return result; } };
}

// Environment identity is desktop metadata, never a native core RPC parameter.
export async function takeSavedEnvironment(params, { method, surface, getEnvironment, worktreeOrigins = {}, realpath = fs.realpath }) {
  if (!params.codeDesktop || !Object.hasOwn(params.codeDesktop, 'environmentId')) return null;
  const { environmentId, ...rest } = params.codeDesktop;
  if (method !== 'thread/start' || surface !== 'code') throw new Error('An environment can only be chosen for a new Code session.');
  const row = await getEnvironment(environmentId);
  if (Object.keys(row.target.folderSettings ?? {}).length) throw new Error('Separate checkouts for additional folders are not available.');
  const launchRoot = worktreeOrigins[params.cwd] || params.cwd;
  if (typeof launchRoot !== 'string' || await realpath(launchRoot) !== await realpath(row.target.cwd)) throw new Error('The environment folder changed. Select it again.');
  if (Object.keys(rest).length) params.codeDesktop = rest; else delete params.codeDesktop;
  return row;
}
