import { recentOutputPaths } from './generated/code-current/file-output-order.mjs';
import { normalizeOutputPath } from './generated/code-current/file-output-normalize.mjs';
import { isSideSessionNotesPath } from './generated/code-current/file-output-paths.mjs';
import { mergeOutputFileOptions, toFileMentionOption } from './generated/code-current/mention-output-files.mjs';
import { itemDeliverables } from './deliverable-records.mjs';

const absolute = value => /^(?:\/|[A-Za-z]:[\\/])/.test(value);
const isWindows = value => /^[A-Za-z]:[\\/]/.test(value);
const privateAlias = value => value.replace(/^\/private(?=\/(?:tmp|var)(?:\/|$))/, '');
const hasHiddenControl = value => /(?![\u200c\u200d])\p{Default_Ignorable_Code_Point}/u.test(value);
const memoryPath = /(?:\/mnt\/\.auto-memory|^\/mnt\/memory|^\/tmp\/claude\/memory|\/\.claude\/(?:agent-memory(?:-local)?|projects\/[^/]+\/(?:memory|tiny_memory))|\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(?:memory|spaces\/[^/]+\/memory|agent\/memory))(?:\/|$)/;

// XJ/YJ's local path presentation and validation. The host model supplies
// completed file changes and explicit deliverables instead of Claude's tool blocks.
export function sessionOutputFiles(items, { workingDir, originCwd, additionalDirectories = [], homePath, platform = 'darwin' } = {}) {
  if (typeof workingDir !== 'string' || !absolute(workingDir)) return [];
  const roots = originCwd ? [workingDir, originCwd] : [workingDir];
  const resolve = value => normalizeOutputPath(absolute(value) ? value : `${workingDir}/${value}`);
  const messages = [];
  for (const item of items ?? []) {
    if (item?.status !== 'completed' || item.error || item.result?.isError) continue;
    const records = [];
    if (item.type === 'fileChange') {
      for (const change of item.changes ?? []) {
        const kind = typeof change.kind === 'string' ? change.kind : change.kind?.type;
        if (kind === 'add' || kind === 'update') records.push({ path: change.kind?.move_path || change.path, written: true });
      }
    }
    for (const file of itemDeliverables(item) ?? []) records.push({ path: file.path, written: false });
    const outputFiles = records.flatMap(record => {
      if (typeof record.path !== 'string' || !record.path || /[\\/]$/.test(record.path)) return [];
      const path = resolve(record.path);
      if (memoryPath.test(path) || isSideSessionNotesPath(path)) return [];
      return [{ path, written: record.written }];
    });
    if (outputFiles.length) messages.push({ author: 'assistant', outputFiles });
  }
  const working = normalizeOutputPath(workingDir).replace(/\/+$/, '') + '/';
  return recentOutputPaths(messages, roots, resolve, [...roots, ...additionalDirectories]).flatMap(path => {
    const windows = isWindows(path), checked = windows ? path.slice(2).replaceAll('\\', '/') : path;
    if (windows !== (platform === 'win32') || path !== path.normalize('NFC') || hasHiddenControl(path)
      || !/^(?:\/(?!(?:~|\.{1,2})(?:\/|$))[\p{L}\p{N}\p{M}._+@(),=~-]+)+(?<=[A-Za-z0-9_])$/u.test(checked)
      || path.startsWith('/mnt/user-data/outputs/')) return [];
    const shownRoot = platform === 'darwin' ? privateAlias(working) : working;
    const shownFile = platform === 'darwin' ? privateAlias(path) : path;
    let shownPath = (windows ? shownFile.toLowerCase().startsWith(shownRoot.toLowerCase()) : shownFile.startsWith(shownRoot)) ? shownFile.slice(shownRoot.length) : path;
    if (homePath) {
      const home = normalizeOutputPath(homePath).replace(/\/+$/, '');
      if (shownPath.startsWith(home + '/')) shownPath = '~' + shownPath.slice(home.length);
    }
    return [{ path, shownPath }];
  });
}

export function mergeSessionOutputMatches(query, matches, outputs) {
  const options = matches.map(match => toFileMentionOption({ path: match.path, isDirectory: match.directory === true, positions: match.positions }));
  const merged = mergeOutputFileOptions(query, options, () => outputs);
  if (merged === options) return matches;
  return merged.map(option => ({ path: option.renderedText, shownPath: option.metadata.path,
    directory: option.metadata.isDirectory, positions: option.metadata.positions }));
}
