import path from 'node:path';
import { itemDeliverables } from '../src/deliverable-records.mjs';
import { sessionSurface } from './surface-policy.mjs';

export function recordArtifactItem(config, threadId, item, now = Date.now()) {
  if (!item || item.status !== 'completed' || item.error || item.result?.isError || !['chat', 'cowork'].includes(sessionSurface(threadId, config.sessionMetadata))) return false;
  const cwd = config.threadMetadata?.[threadId]?.cwd;
  if (!cwd || !path.isAbsolute(cwd)) return false;
  const records = { ...config.localArtifacts };
  let changed = false;
  const files = [...(itemDeliverables(item) ?? []), ...(Array.isArray(item.codeDesktop?.artifacts) ? item.codeDesktop.artifacts : [])];
  if (item.type === 'fileChange') for (const entry of item.changes ?? []) files.push({ path: entry.path, deleted: entry.kind?.type === 'delete' });
  for (const file of files) {
    if (typeof file?.path !== 'string' || !file.path.trim() || file.path.includes('\0')) continue;
    const absolute = path.resolve(cwd, file.path), key = JSON.stringify([threadId, absolute]), previous = records[key];
    if (previous && previous.updatedAtMs > now) continue;
    if (file.deleted) { records[key] = { ...previous, key, threadId, path: absolute, itemId: item.id, deleted: true, updatedAtMs: now }; changed = true; continue; }
    if (previous?.itemId === item.id && previous.description === (file.description ?? '')) continue;
    records[key] = { ...previous, key, threadId, deleted: false, path: absolute, title: previous?.title || file.title || path.basename(absolute), description: file.description ?? '', itemId: item.id,
      createdAtMs: previous?.createdAtMs ?? now, updatedAtMs: now };
    changed = true;
  }
  if (changed) config.localArtifacts = records;
  return changed;
}
export function artifactRows(config) {
  const known = new Set([...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])]);
  return Object.values(config.localArtifacts ?? {}).filter(entry => !entry.deleted && known.has(entry.threadId) && sessionSurface(entry.threadId, config.sessionMetadata) !== 'code')
    .sort((a, b) => Number(!!b.starred) - Number(!!a.starred) || b.updatedAtMs - a.updatedAtMs);
}
export function updateArtifact(config, request) {
  const entry = artifactRows(config).find(entry => entry.key === request.key);
  if (!entry) throw new Error('Artifact not found.');
  if (typeof request.starred !== 'boolean') throw new Error('Invalid artifact pin.');
  entry.starred = request.starred;
  return entry;
}

export async function backfillArtifacts(config, request, indexed = new Set()) {
  const { historyRoute, readParams, loadThreadHistory } = await import('../src/thread-history-model.mjs');
  const failed = [];
  for (const threadId of new Set([...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])])) {
    if (indexed.has(threadId) || sessionSurface(threadId, config.sessionMetadata) === 'code') continue;
    try {
      const known = config.threadMetadata?.[threadId];
      const route = historyRoute(known);
      const read = await request('thread/read', readParams(threadId, known));
      const history = await loadThreadHistory(request, { threadId, thread: read.thread, route });
      if (history.unavailable || history.truncated) { failed.push(threadId); continue; }
      if (read.thread?.cwd) config.threadMetadata[threadId] = { ...known, ...read.thread, turns: undefined };
      for (const turn of history.turns) for (const item of turn.items ?? [])
        recordArtifactItem(config, threadId, item, (turn.completedAt ?? turn.startedAt ?? read.thread?.updatedAt ?? Date.now() / 1000) * 1000);
      indexed.add(threadId);
    } catch { failed.push(threadId); }
  }
  return { records: artifactRows(config), incomplete: failed.length > 0 };
}

export async function readArtifact(config, key, readFile, { force = false } = {}) {
  const record = artifactRows(config).find(record => record.key === key);
  if (!record) throw new Error('Artifact not found.');
  const root = config.threadMetadata?.[record.threadId]?.cwd;
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('The session working directory is not available yet.');
  const file = await readFile(root, path.relative(root, record.path), { force: force === true });
  return { file, root, fullPath: record.path, displayPath: path.relative(root, record.path), title: record.title };
}
