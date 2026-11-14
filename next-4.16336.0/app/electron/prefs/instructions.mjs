// customInstructions preference (C1). Pure and renderer-safe: no node:* imports.
// Shape: { enabled, global, projects: { [absFolderPath]: { text, useFile } } }.
// No length limit on custom instructions (user preference); long text only costs context tokens.
// On the DeepSeek core a non-empty global text IS the whole system prompt (customSystemPrompt);
// empty keeps the built-in prompt. Codex appends it to its own prompt instead.
import { t } from '../i18n/index.mjs';
export const INSTRUCTIONS_MAX_CHARS = Infinity;
export const INSTRUCTIONS_MAX_PROJECTS = 64;
export const INSTRUCTIONS_MAX_PATH = 1024;
export const INSTRUCTIONS_DEFAULT = Object.freeze({ enabled: true, global: '', projects: Object.freeze({}) });

const cleanText = (value) => String(value).replace(/\r\n?/g, '\n');
const validPath = (key) => typeof key === 'string' && key.startsWith('/') && key.length <= INSTRUCTIONS_MAX_PATH && !key.includes('\0');
// A trailing slash (other than "/") does not make a different project.
const projectKey = (key) => (key.length > 1 ? key.replace(/\/+$/, '') || '/' : key);

/** Lenient read: always returns a valid object (never throws). */
export function normalizeInstructions(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const text = (raw) => (typeof raw === 'string' ? cleanText(raw).replace(/\0/g, '').slice(0, INSTRUCTIONS_MAX_CHARS) : '');
  const projects = {};
  const rawProjects = source.projects && typeof source.projects === 'object' && !Array.isArray(source.projects) ? source.projects : {};
  for (const [rawKey, entry] of Object.entries(rawProjects)) {
    if (Object.keys(projects).length >= INSTRUCTIONS_MAX_PROJECTS) break;
    if (!validPath(rawKey) || !entry || typeof entry !== 'object') continue;
    const next = { text: text(entry.text), useFile: entry.useFile !== false };
    if (!next.text && next.useFile) continue;
    projects[projectKey(rawKey)] = next;
  }
  return { enabled: source.enabled !== false, global: text(source.global), projects };
}

/** Strict: throws Error with a user-facing message; null means "reset to default". */
export function validateInstructions(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(t('Invalid custom instructions setting.'));
  if ('enabled' in value && typeof value.enabled !== 'boolean') throw new Error(t('Invalid custom instructions setting.'));
  const checkText = (raw, where) => {
    if (raw === undefined) return '';
    if (typeof raw !== 'string' || raw.includes('\0')) throw new Error(where === 'global instructions' ? t('Invalid global instructions.') : t('Invalid project instructions.'));
    const clean = cleanText(raw);
    if (clean.length > INSTRUCTIONS_MAX_CHARS) throw new Error(t(where === 'global instructions' ? 'Global instructions must be {max} characters or fewer.' : 'Project instructions must be {max} characters or fewer.', { max: INSTRUCTIONS_MAX_CHARS.toLocaleString('en-US') }));
    return clean;
  };
  checkText(value.global, 'global instructions');
  if (value.projects !== undefined) {
    if (!value.projects || typeof value.projects !== 'object' || Array.isArray(value.projects)) throw new Error(t('Invalid project instructions.'));
    const entries = Object.entries(value.projects);
    if (entries.length > INSTRUCTIONS_MAX_PROJECTS) throw new Error(t('Instructions can be saved for up to {max} projects.', { max: INSTRUCTIONS_MAX_PROJECTS }));
    for (const [key, entry] of entries) {
      if (!validPath(key)) throw new Error(t('Project instructions need an absolute folder path.'));
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(t('Invalid project instructions.'));
      if ('useFile' in entry && typeof entry.useFile !== 'boolean') throw new Error(t('Invalid project instructions.'));
      checkText(entry.text, 'project instructions');
    }
  }
  return normalizeInstructions(value);
}

/** The settings entry for cwd: the longest key equal to cwd or one of its parents. */
export function projectInstructionsFor(prefs, cwd) {
  if (typeof cwd !== 'string' || !cwd.startsWith('/')) return null;
  let best = null;
  for (const key of Object.keys(prefs?.projects || {})) {
    const within = key === '/' || cwd === key || cwd.startsWith(key + '/');
    if (within && (!best || key.length > best.length)) best = key;
  }
  return best ? { root: best, ...prefs.projects[best] } : null;
}

/** The whole object with one project's entry replaced (empty text + useFile drops it). */
export function withProjectInstructions(prefs, root, entry) {
  const base = normalizeInstructions(prefs);
  const projects = { ...base.projects };
  if (entry) projects[root] = { text: entry.text ?? '', useFile: entry.useFile !== false };
  else delete projects[root];
  return normalizeInstructions({ ...base, projects });
}

/** Folders offered on the Instructions page: cwd first, then session folders (unique, ≤20). */
export function instructionsProjectList(cwd, threadMetadata) {
  const seen = new Set(), list = [];
  const add = (value) => { if (typeof value === 'string' && value.startsWith('/') && !seen.has(value) && list.length < 20) { seen.add(value); list.push(value); } };
  add(cwd);
  for (const meta of Object.values(threadMetadata && typeof threadMetadata === 'object' ? threadMetadata : {})) add(meta?.cwd);
  return list;
}

/** The global text that replaces the DeepSeek core's built-in system prompt, or null (built-in). */
export function customSystemPrompt(prefs) {
  const value = normalizeInstructions(prefs);
  const text = value.enabled ? value.global.trim() : '';
  return text || null;
}
