// w13-chatfn-artifacts (research/w13-chatfn.md A1, A2, chatfn-25/26/31): the local store behind the Chat `artifacts`
// tool. Official Chat keeps artifacts and their versions on claude.ai (the tool runs server-side, shared-104 VI); here
// the main process keeps them in the user data directory, outside every session's folder:
//   <userData>/chat-artifacts/<threadId>/index.json           {version: 1, artifacts: {<id>: {id, title, type, language,
//                                                              starred, createdAtMs, updatedAtMs, versions: [{n, command,
//                                                              type, language, ext, chars, createdAtMs}]}}}
//   <userData>/chat-artifacts/<threadId>/<id>/v<n>.<ext>      each version's full text (ext: shared-104 HI / GI)
// Only this module writes there (the Chat core is read-only, permission-policy.mjs); writes per thread are serialized.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ARTIFACT_CHAT_MISSING, ARTIFACT_COMMANDS, ARTIFACT_ID, ARTIFACT_NOT_FOUND, ARTIFACT_TYPES, ARTIFACT_VERSION_MISSING, MAX_CONTENT_CHARS,
  MAX_TITLE_CHARS, MAX_VERSIONS, artifactExtension, artifactType,  chatArtifactKey, knowledgeFileName } from './chat-artifact-types.mjs';

export const STORE_DIR = 'chat-artifacts';
const THREAD_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const PREVIEW_CHARS = 600;

export class ArtifactError extends Error {}
const fail = (message) => { throw new ArtifactError(message); };

function threadPart(threadId) {
  if (typeof threadId !== 'string' || !THREAD_ID.test(threadId) || threadId.includes('..')) fail('This chat can’t keep artifacts.');
  return threadId;
}
function idPart(id) {
  if (typeof id !== 'string' || !ARTIFACT_ID.test(id)) fail('Give the artifact an id of letters, digits, “-” or “_” (at most 128).');
  return id;
}
const occurrences = (text, needle) => { let count = 0, at = text.indexOf(needle); while (at !== -1) { count += 1; at = text.indexOf(needle, at + needle.length); } return count; };

export function createChatArtifactStore({ dataDir, now = () => Date.now() } = {}) {
  if (typeof dataDir !== 'string' || !path.isAbsolute(dataDir)) throw new Error('The artifact store needs the user data directory.');
  const root = path.join(dataDir, STORE_DIR);
  const queues = new Map();
  const threadDir = (threadId) => path.join(root, threadPart(threadId));
  // A version keeps the type and extension it was written with (a later create may change the type).
  const versionFile = (threadId, entry, row) => path.join(threadDir(threadId), idPart(entry.id), `v${row.n}.${row.ext || artifactExtension(row)}`);
  function serial(threadId, task) {
    const previous = queues.get(threadId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    queues.set(threadId, next);
    return next.finally(() => { if (queues.get(threadId) === next) queues.delete(threadId); });
  }
  async function readIndex(threadId) {
    try {
      const value = JSON.parse(await fs.readFile(path.join(threadDir(threadId), 'index.json'), 'utf8'));
      return value && typeof value === 'object' && value.artifacts && typeof value.artifacts === 'object' ? value : { version: 1, artifacts: {} };
    } catch (error) {
      if (error instanceof ArtifactError) throw error;
      return { version: 1, artifacts: {} };
    }
  }
  async function writeIndex(threadId, index) {
    const dir = threadDir(threadId), file = path.join(dir, 'index.json'), temp = `${file}.${process.pid}.${now()}.tmp`;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(temp, JSON.stringify(index));
    await fs.rename(temp, file);
  }
  const summary = (threadId, entry) => ({ threadId, id: entry.id, key: chatArtifactKey(threadId, entry.id), title: entry.title, type: entry.type,
    ...(entry.language ? { language: entry.language } : {}), extension: artifactExtension(entry), starred: !!entry.starred,
    version: entry.versions.at(-1)?.n ?? 0, versions: entry.versions.map(({ n, command, createdAtMs }) => ({ n, command, createdAtMs })),
    createdAtMs: entry.createdAtMs, updatedAtMs: entry.updatedAtMs });

  /**
   * The `artifacts` tool's write (shared-104 VI): create (new id, or a new version of an existing one), rewrite (a new
   * full version of an existing id), update (old_str → new_str in the latest version; old_str must appear exactly once).
   * Resolves {command, created, artifact: summary}. Throws ArtifactError with a message for the model.
   */
  async function apply(threadId, args = {}) {
    threadPart(threadId);
    return serial(threadId, async () => {
      const command = args.command === undefined ? 'create' : args.command;
      if (!ARTIFACT_COMMANDS.includes(command)) fail('command must be create, update or rewrite.');
      const id = idPart(args.id);
      const index = await readIndex(threadId);
      const previous = Object.hasOwn(index.artifacts, id) ? index.artifacts[id] : null;
      if (command !== 'create' && !previous) fail(`There’s no artifact “${id}” in this chat yet. Use command create first.`);
      if (previous && previous.versions.length >= MAX_VERSIONS) fail(`Artifact “${id}” has reached ${MAX_VERSIONS} versions. Create a new artifact instead.`);
      let content;
      if (command === 'update') {
        if (typeof args.old_str !== 'string' || !args.old_str) fail('update needs old_str: the exact text to replace.');
        if (typeof args.new_str !== 'string') fail('update needs new_str: the text to put in its place (may be empty).');
        const latest = previous.versions.at(-1);
        const current = await fs.readFile(versionFile(threadId, previous, latest), 'utf8');
        const found = occurrences(current, args.old_str);
        if (found === 0) fail(`old_str wasn’t found in artifact “${id}” (version ${latest.n}). Copy it exactly from the current version.`);
        if (found > 1) fail(`old_str appears ${found} times in artifact “${id}”. Include more surrounding text so it matches exactly once.`);
        content = current.replace(args.old_str, () => args.new_str);
      } else {
        if (typeof args.content !== 'string') fail(`${command} needs content: the artifact’s full text.`);
        content = args.content;
      }
      if (content.length > MAX_CONTENT_CHARS) fail(`The artifact is too large (over ${MAX_CONTENT_CHARS} characters).`);
      const type = command === 'update' || (args.type === undefined && previous) ? previous.type : artifactType(args.type);
      const language = type === ARTIFACT_TYPES.Code
        ? (typeof args.language === 'string' && args.language.trim() ? args.language.trim().toLowerCase().slice(0, 40) : previous?.language ?? null) : null;
      const title = (typeof args.title === 'string' && args.title.trim() ? args.title.trim() : previous?.title ?? id).slice(0, MAX_TITLE_CHARS);
      const at = now();
      const n = (previous?.versions.at(-1)?.n ?? 0) + 1;
      const row = { n, command, type, language, ext: artifactExtension({ type, language }), chars: content.length, createdAtMs: at };
      const entry = { ...(previous ?? { id, createdAtMs: at, starred: false, versions: [] }), id, title, type, language, updatedAtMs: at,
        versions: [...(previous?.versions ?? []), row] };
      const file = versionFile(threadId, entry, row);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, content);
      index.artifacts[id] = entry;
      await writeIndex(threadId, index);
      return { command, created: !previous, artifact: summary(threadId, entry) };
    });
  }

  /** The artifacts of a chat, most recently changed first. */
  async function list(threadId) {
    const index = await readIndex(threadId);
    return Object.values(index.artifacts).map((entry) => summary(threadId, entry)).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }
  /** One artifact with one version's text (the latest when `version` is not given). */
  async function read(threadId, id, version = null) {
    const index = await readIndex(threadId);
    const entry = Object.hasOwn(index.artifacts, idPart(id)) ? index.artifacts[id] : null;
    if (!entry) fail(ARTIFACT_NOT_FOUND);
    const shown = Number.isInteger(version) ? entry.versions.find((row) => row.n === version) : entry.versions.at(-1);
    if (!shown) fail(ARTIFACT_VERSION_MISSING);
    const file = versionFile(threadId, entry, shown);
    const content = await fs.readFile(file, 'utf8');
    // The shown version's own type / language / extension (what the panel renders and downloads).
    return { ...summary(threadId, entry), shown: shown.n, type: shown.type ?? entry.type, ...(shown.language ? { language: shown.language } : {}),
      extension: shown.ext || artifactExtension(shown), content, file, folder: path.dirname(file), relative: path.basename(file) };
  }
  async function pin(threadId, id, starred) {
    if (typeof starred !== 'boolean') fail('Invalid artifact pin.');
    return serial(threadPart(threadId), async () => {
      const index = await readIndex(threadId);
      const entry = Object.hasOwn(index.artifacts, idPart(id)) ? index.artifacts[id] : null;
      if (!entry) fail(ARTIFACT_NOT_FOUND);
      entry.starred = starred;
      await writeIndex(threadId, index);
      return summary(threadId, entry);
    });
  }
  /** Remove every artifact of a chat (thread/delete cascade, w13-chatfn-history). */
  async function deleteThread(threadId) {
    return serial(threadPart(threadId), async () => { await fs.rm(threadDir(threadId), { recursive: true, force: true }); return true; });
  }
  /** Every chat's artifacts (for the Artifacts library), filtered by `include(threadId)`. */
  async function listAll(include = () => true) {
    let names = [];
    try { names = await fs.readdir(root); } catch { return []; }
    const rows = [];
    for (const threadId of names.sort()) {
      if (!THREAD_ID.test(threadId) || threadId.includes('..') || !include(threadId)) continue;
      const index = await readIndex(threadId);
      for (const entry of Object.values(index.artifacts)) {
        let previewText = '';
        try { previewText = (await fs.readFile(versionFile(threadId, entry, entry.versions.at(-1)), 'utf8')).slice(0, PREVIEW_CHARS); } catch { /* missing version file */ }
        rows.push({ ...summary(threadId, entry), previewText });
      }
    }
    return rows;
  }
  return { root, apply, list, read, pin, deleteThread, listAll };
}

/** The Artifacts library's rows for Chat artifacts (c230724a2 items with source "chat": artifactType, previewText). */
export function chatLibraryRecords(rows) {
  return rows.map((row) => ({ key: row.key, source: 'chat', threadId: row.threadId, artifactId: row.id, title: row.title, description: '',
    path: `${row.id}.${row.extension}`, artifactType: row.type, previewText: row.previewText ?? '', starred: !!row.starred,
    version: row.version, createdAtMs: row.createdAtMs, updatedAtMs: row.updatedAtMs }));
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
// Print as PDF (ca2ef848d To: markdown / plaintext): a static page in an offscreen window with scripts off and nothing
// fetched (default-src 'none'), printed by Chromium. Markdown arrives as the panel's rendered HTML; text is escaped here.
const PRINT_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";
export function printDocument({ title, html, text }) {
  const body = typeof html === 'string' && html ? html : `<pre>${escapeHtml(text ?? '')}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}"><title>${escapeHtml(title ?? '')}</title>`
    + '<style>body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;color:#141413}pre{white-space:pre-wrap;font:12px/1.5 ui-monospace,Menlo,monospace}'
    + 'img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}code{font-family:ui-monospace,Menlo,monospace}</style></head>'
    + `<body>${body}</body></html>`;
}
const safeName = (value, fallback) => String(value || fallback).replace(/[\\/:*?"<>|\0]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || fallback;

/**
 * The renderer's `chat-artifacts` IPC (main.cjs). deps: {store, known(threadId), projectOf(threadId) → project | null,
 * saveDialog(options) → {canceled, filePath}, printToPdf(html) → Buffer, writeImage(dataUrl), previewFrames,
 * addKnowledgeText(projectId, {name, text}) → {added, failed, stats}}.
 */
export async function chatArtifactRequest(p = {}, deps) {
  const { store } = deps;
  const threadId = p.threadId;
  // w13-close-main-process (chatfn-artifacts review low 2): a chat's artifacts go with the chat only (chat-history.mjs
  // cascade after main's own thread/delete); the renderer has no delete of its own.
  if (!deps.known(threadId)) throw new ArtifactError(ARTIFACT_CHAT_MISSING);
  const version = Number.isInteger(p.version) ? p.version : null;
  switch (p.action) {
    case 'list': return store.list(threadId);
    case 'read': {
      const artifact = await store.read(threadId, p.id, version);
      const project = deps.projectOf(threadId);
      const { file, folder, relative, ...shown } = artifact;
      return { ...shown, inProject: !!project };
    }
    case 'preview-frame': {
      const artifact = await store.read(threadId, p.id, version);
      return deps.previewFrames.register({ root: artifact.folder, relative: artifact.relative, text: artifact.content });
    }
    case 'export': {
      const artifact = await store.read(threadId, p.id, version);
      const result = await deps.saveDialog({ defaultPath: `${safeName(artifact.title, artifact.id)}.${artifact.extension}` });
      if (result.canceled || !result.filePath) return { canceled: true };
      await fs.writeFile(result.filePath, artifact.content);
      return { saved: result.filePath };
    }
    case 'print-pdf': {
      const artifact = await store.read(threadId, p.id, version);
      const html = typeof p.html === 'string' && p.html.length <= 8 * 1024 * 1024 ? p.html : null;
      const bytes = await deps.printToPdf(printDocument({ title: artifact.title, html, text: html ? null : artifact.content }));
      const result = await deps.saveDialog({ defaultPath: `${safeName(artifact.title, artifact.id)}.pdf` });
      if (result.canceled || !result.filePath) return { canceled: true };
      await fs.writeFile(result.filePath, bytes);
      return { saved: result.filePath };
    }
    case 'copy-image': {
      if (typeof p.dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl) || p.dataUrl.length > 64 * 1024 * 1024) throw new ArtifactError('Couldn’t copy image');
      deps.writeImage(p.dataUrl);
      return { copied: true };
    }
    case 'add-to-project': {
      // ca2ef848d sc → j2(text, cS(t.path), handleProjectFileUpload, …): the shown version's text, as `<id>.<ext>`, joins
      // the project's knowledge (project-knowledge.mjs addKnowledgeText; no file dialog, nothing written outside the store).
      const project = deps.projectOf(threadId);
      if (!project) throw new ArtifactError('This chat isn’t in a project.');
      const artifact = await store.read(threadId, p.id, version);
      return deps.addKnowledgeText(project.id, { name: knowledgeFileName(artifact), text: artifact.content });
    }
    case 'pin': return store.pin(threadId, p.id, p.starred);
    default: throw new ArtifactError('Unknown artifact operation.');
  }
}
