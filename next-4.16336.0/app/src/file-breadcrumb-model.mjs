import { pathWithinRoot } from './generated/code-current/breadcrumb-paths.mjs';
import { isAbsolutePath } from './generated/code-current/file-output-normalize.mjs';

// The shipped breadcrumb uses absolute paths. The host stores in-root file
// tabs by relative path; preserve that identity when opening from a segment.
export function createBreadcrumbLister({ root, list, onOpenFile, posix = !/^[A-Za-z]:|^\\\\/.test(root) }) {
  const base = root.replace(posix ? /\/+$/ : /[\\/]+$/, '');
  const relative = path => pathWithinRoot(path, root, posix) ? path.slice(base.length).replace(posix ? /^\// : /^[\\/]/, '') : path;
  const absolute = path => isAbsolutePath(path) ? path : `${base}/${path}`;
  return {
    root,
    list: async dir => (await list(relative(dir))).map(entry => ({ ...entry, path: absolute(entry.path) })),
    onOpenFile: (path, options) => onOpenFile(relative(path), options),
  };
}
