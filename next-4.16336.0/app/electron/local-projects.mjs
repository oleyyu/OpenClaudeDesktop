import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { addKnowledge, addKnowledgeText, insideKnowledge, listKnowledge, removeKnowledge, statsOf, MAX_FILE_BYTES, MAX_FILES } from './project-knowledge.mjs';
import { normalizeProjectSettings } from './chat-tools-store.mjs'; // w13-close-main-process: packaged (src/ is not)

// w13-chatfn-projects: a project holds Chat and Cowork sessions (official shared-16 yf / fm "Add to project", "Change
// project", "Remove from project"); a Code session never belongs to one.
export const PROJECT_SURFACES = Object.freeze(['chat', 'cowork']);

// pickFiles(): the main process's own open dialog (absolute paths, [] when cancelled), for knowledge-add; the renderer
// never names a file to copy.
export async function localProjects(config, request, { dataDir, approveFolder = value => value, now = () => new Date().toISOString(), pickFiles = async () => [], convert } = {}) {
  const projects = Array.isArray(config.localProjects) ? config.localProjects : [];
  if (request.action === 'list') return projects;
  if (request.action === 'create') {
    const name = typeof request.name === 'string' ? request.name.trim() : '';
    const description = typeof request.description === 'string' ? request.description.trim() : '';
    if (!name || name.length > 200) throw new Error('Enter a project name of 1–200 characters.');
    if (description.length > 4000) throw new Error('Project description is too long.');
    if (request.folder && (typeof request.folder !== 'string' || !path.isAbsolute(request.folder))) throw new Error('Choose a directory.');
    const id = randomUUID();
    const cwd = request.folder ? approveFolder(request.folder) : path.join(dataDir, 'projects', id);
    // The knowledge store is never a project's folder: a Cowork session there could rewrite what Chat is given.
    if (request.folder && dataDir && insideKnowledge(dataDir, cwd)) throw new Error('Choose a directory.');
    if (request.folder) {
      if (!(await fs.stat(cwd)).isDirectory()) throw new Error('Choose a directory.');
    } else await fs.mkdir(cwd, { recursive: true });
    const timestamp = now();
    const project = { id, name, description, cwd, createdAt: timestamp, updatedAt: timestamp };
    config.localProjects = [...projects, project];
    return project;
  }
  const project = projects.find(entry => entry.id === request.id);
  if (!project) throw new Error('Project not found.');
  if (request.action === 'update') {
    const patch = {};
    for (const [field, limit] of [['name', 200], ['description', 4000], ['instructions', 16000]]) {
      if (!Object.hasOwn(request, field)) continue;
      if (typeof request[field] !== 'string') throw new Error(`Invalid project ${field}.`);
      const value = request[field].trim();
      if (value.length > limit || (field === 'name' && !value)) throw new Error(`Invalid project ${field}.`);
      patch[field] = value;
    }
    if (Object.hasOwn(request, 'isStarred')) {
      if (typeof request.isStarred !== 'boolean') throw new Error('Invalid project pin.');
      patch.isStarred = request.isStarred;
    }
    // w13-chatfn-tools (chatfn-23): the project's recommended tools, claude.ai's project settings (c9b54eb90 _e
    // `n({settings:o})`), merged key by key. Recommending changes no conversation by itself.
    if (Object.hasOwn(request, 'settings')) {
      const settings = normalizeProjectSettings(request.settings);
      if (!settings) throw new Error('Invalid project settings.');
      patch.settings = { ...(normalizeProjectSettings(project.settings) ?? {}), ...settings };
    }
    Object.assign(project, patch, { updatedAt: now() });
    return project;
  }
  // w13-chatfn-projects: project knowledge (project-knowledge.mjs) and a Chat / Cowork session's project.
  if (request.action === 'knowledge-list') {
    const files = await listKnowledge(dataDir, project.id);
    return { files, stats: statsOf(files) };
  }
  if (request.action === 'knowledge-add') {
    const chosen = await pickFiles();
    const result = await addKnowledge(dataDir, project.id, Array.isArray(chosen) ? chosen : [], { now, ...(convert ? { convert } : {}) });
    if (result.added.length) project.updatedAt = now();
    return { ...result, files: await listKnowledge(dataDir, project.id) };
  }
  // w13-chatui-project-detail (review fix): files dropped on the project rail (cf2f34ee4 qr, handled as Kr does). The
  // renderer reads each dropped File as { name, bytes }; main writes it under its plain name in a private temp folder,
  // adds it exactly as knowledge-add does (conversion, size / count / capacity refusals) and removes the folder.
  if (request.action === 'knowledge-add-content') {
    const result = await addKnowledgeContent(dataDir, project.id, request.files, { now, ...(convert ? { convert } : {}) });
    if (result.added.length) project.updatedAt = now();
    return { ...result, files: await listKnowledge(dataDir, project.id) };
  }
  // w13-close-chat-projects-memory (chatfn-projects-06): cf2f34ee4 _r's "Add text content" (kr: Title, Content, "Add
  // Content") saves { file_name: title, content } as a project doc; here a text knowledge file named by the title.
  if (request.action === 'knowledge-add-text') {
    const result = await addKnowledgeText(dataDir, project.id, { name: typeof request.title === 'string' ? request.title.trim() : '', text: request.content }, { now });
    if (result.added.length) project.updatedAt = now();
    return { ...result, files: await listKnowledge(dataDir, project.id) };
  }
  if (request.action === 'knowledge-remove') {
    const result = await removeKnowledge(dataDir, project.id, request.fileId);
    project.updatedAt = now();
    return { ...result, files: await listKnowledge(dataDir, project.id) };
  }
  if (request.action === 'assign' || request.action === 'unassign') {
    const threadId = request.threadId;
    const known = [...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])];
    if (typeof threadId !== 'string' || !known.includes(threadId)) throw new Error('Unknown session.');
    const metadata = config.sessionMetadata?.[threadId] ?? {};
    if (!PROJECT_SURFACES.includes(metadata.surface)) throw new Error('Only a chat or Cowork session can belong to a project.');
    const { projectId: _previous, ...rest } = metadata;
    const next = request.action === 'assign' ? { ...rest, projectId: project.id } : rest;
    if (request.action === 'unassign' && metadata.projectId !== project.id) return { threadId, sessionMetadata: metadata };
    config.sessionMetadata = { ...config.sessionMetadata, [threadId]: next };
    project.updatedAt = now();
    return { threadId, sessionMetadata: next };
  }
  if (request.action === 'open') {
    if (!(await fs.stat(project.cwd)).isDirectory()) throw new Error('Project folder is unavailable.');
    project.updatedAt = now();
    config.surfaceFolders = { ...config.surfaceFolders, cowork: project.cwd };
    return project;
  }
  throw new Error('Unknown project operation.');
}

// knowledge-add-content: [{ name, bytes }] → addKnowledge over private copies. A name must be a plain file name (no
// folder part); bytes a Uint8Array / ArrayBuffer of at most MAX_FILE_BYTES; at most MAX_FILES entries per drop.
export async function addKnowledgeContent(dataDir, projectId, files, options = {}) {
  if (!Array.isArray(files) || files.length > MAX_FILES) throw new Error('Choose fewer files.');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaude-knowledge-'));
  try {
    await fs.chmod(temp, 0o700);
    const paths = [], refused = [];
    for (const [index, file] of files.entries()) {
      const name = typeof file?.name === 'string' ? file.name : '';
      const raw = file?.bytes, bytes = raw instanceof Uint8Array ? raw : raw instanceof ArrayBuffer ? new Uint8Array(raw) : null;
      if (!name || name === '.' || name === '..' || /[\\/\0]/.test(name) || path.basename(name) !== name || !bytes) { refused.push({ name, reason: 'invalid' }); continue; }
      if (bytes.byteLength > MAX_FILE_BYTES) { refused.push({ name, reason: 'too_large' }); continue; }
      const dir = path.join(temp, String(index));
      await fs.mkdir(dir, { mode: 0o700 });
      const target = path.join(dir, name);
      await fs.writeFile(target, bytes, { mode: 0o600, flag: 'wx' });
      paths.push(target);
    }
    const result = await addKnowledge(dataDir, projectId, paths, options);
    return { ...result, failed: [...refused, ...result.failed] };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

// Consume host-only routing metadata before the request reaches a model provider.
export function applyProjectContext(config, method, params, surface) {
  const explicitId = params.codeDesktop?.projectId;
  if (params.codeDesktop && Object.hasOwn(params.codeDesktop, 'projectId')) {
    const { projectId, ...rest } = params.codeDesktop;
    if (Object.keys(rest).length) params.codeDesktop = rest; else delete params.codeDesktop;
  }
  const id = method === 'thread/start' ? explicitId : method === 'thread/resume' ? config.sessionMetadata?.[params.threadId]?.projectId : null;
  if (!id) return null;
  const project = config.localProjects?.find(project => project.id === id);
  // A Cowork session works in the project's folder; a Chat session (w13-chatfn-projects, read-only by its surface's
  // policy) is started there, whatever folder the chat home had.
  if (!project || (method === 'thread/start' && !(surface === 'cowork' ? project.cwd === params.cwd : surface === 'chat'))) throw new Error('Project does not match this workspace.');
  if (method === 'thread/start' && surface === 'chat' && typeof project.cwd === 'string' && path.isAbsolute(project.cwd)) params.cwd = project.cwd;
  if (project.instructions) params.developerInstructions = [params.developerInstructions, 'Project instructions:\n' + project.instructions].filter(Boolean).join('\n\n');
  return project;
}
