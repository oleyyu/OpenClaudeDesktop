import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parsePreviewAddress } from './generated/preview-address-parser.mjs';

// Current ra caller: a file's displayed path reloads it; path-like/search text
// on a file page must not fall through to a remote search. The original parser
// decides web/file/search intent; the host only resolves local filesystem paths.
export function previewAddressTarget(text, currentUrl, { cwd, home } = {}) {
  if (typeof text !== 'string') return null;
  let currentFile = null;
  if (/^file:/i.test(currentUrl)) {
    try { currentFile = fileURLToPath(currentUrl); } catch { /* unavailable */ }
  }
  if (currentFile !== null && text.trim() === currentFile) return { kind: 'reload', url: currentUrl };
  const target = parsePreviewAddress(text, currentUrl);
  if (!target) return null;
  if (target.kind === 'file') {
    let file = target.path;
    if (/^file:/i.test(file)) {
      try { file = fileURLToPath(file); } catch { return null; }
    } else {
      if (path.win32.isAbsolute(file) && !path.isAbsolute(file) && process.platform !== 'win32') return null;
      if (/^~($|[/\\])/.test(file)) file = path.join(home || '/', file.slice(1));
      file = path.resolve(cwd || '/', file);
    }
    return { kind: 'file', url: pathToFileURL(file).href };
  }
  if (currentFile !== null && (/^([/\\~$%]|[A-Za-z]:[/\\])/.test(text.trim()) || /\s/.test(text.trim()))) return null;
  return target;
}
