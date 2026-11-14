import fs from 'node:fs';
import path from 'node:path';

// Only the task's dedicated output folder, bounded and without following links.
export function outputSnapshot(cwd) {
  const files = new Map(), root = path.join(cwd, 'outputs');
  let visited = 0;
  function walk(directory, depth) {
    if (depth > 4 || visited >= 500) return;
    let entries;
    try { if (!fs.lstatSync(directory).isDirectory()) return; entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (++visited > 500) break;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file, depth + 1);
      else if (entry.isFile()) {
        try {
          const stat = fs.lstatSync(file);
          if (stat.isFile()) files.set(file, `${stat.size}:${stat.mtimeMs}`);
        } catch { /* A file may be removed while the task is ending. */ }
      }
    }
  }
  walk(root, 0); return files;
}
export function changedOutputs(cwd, baseline) {
  return [...outputSnapshot(cwd)].filter(([file, fingerprint]) => baseline.get(file) !== fingerprint).map(([file]) => ({ path: file, title: path.basename(file) }));
}
