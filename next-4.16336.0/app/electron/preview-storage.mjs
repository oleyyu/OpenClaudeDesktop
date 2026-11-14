import { createHash } from 'node:crypto';

export const PREVIEW_STORAGE_MODES = ['none', 'shared', 'session'];
export function previewStorageMode(value, legacyKeep = false) {
  return PREVIEW_STORAGE_MODES.includes(value) ? value : legacyKeep ? 'shared' : 'none';
}

// Original desktop yN / browser-context constructor: ephemeral jars belong to
// the workspace; persistent session jars belong to one conversation; Cowork
// always uses the shared jar. Keep the existing shared jar for local migration.
export function previewStoragePartition({ mode, sessionId, cwd, cowork = false }) {
  if (cowork || mode === 'shared') return 'persist:preview';
  const hash = value => createHash('sha256').update(value).digest('hex');
  return mode === 'session' ? `persist:preview-session-${hash(sessionId)}` : `preview-workspace-${hash(cwd)}`;
}

// Aei preserves ordinary web tabs when rebinding to an isolated jar. Moving to
// the shared browser starts fresh; file/popup tabs are never replayed as pages.
export function previewStorageRebindTabs(tabs, activeId, mode) {
  if (mode === 'shared') return [];
  return tabs.filter(tab => !tab.popup && !tab.placeholder && /^https?:\/\//i.test(tab.url)).map(tab => ({
    url: tab.url, active: tab.tabId === activeId,
  }));
}
