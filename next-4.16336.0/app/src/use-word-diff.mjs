import { useLayoutEffect, useState } from 'react';
import { createHighlightBinding } from './highlight-binding.mjs';
import { createWordDiffService } from './word-diff-service.mjs';

let shared;
const getService = () => shared ||= createWordDiffService({ createWorker: () => new Worker(new URL('./word-diff-worker.mjs', import.meta.url), { type: 'module', name: 'file-word-diff' }) });
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { shared?.dispose(); shared = null; });

// enabled=false ("Highlight changed words" off, panes-tile-current.js:3805-3818) binds nothing and returns null.
export function useWordDiff(rows, scopeKey, isFrontier, codeRef, enabled = true) {
  const [current, setCurrent] = useState(null);
  const key = JSON.stringify([scopeKey, isFrontier, enabled, rows.map(row => [row.type, row.text])]);
  useLayoutEffect(() => {
    if (!enabled || isFrontier || !rows.some(row => row.type === 'added') || !rows.some(row => row.type === 'removed')) return;
    const doc = codeRef.current.ownerDocument;
    const binding = createHighlightBinding({
      service: getService(), onResult: (_, result) => setCurrent({ key, result }),
      isSelectionActive: () => { const selection = doc.getSelection(); return !!(selection && !selection.isCollapsed && codeRef.current && selection.containsNode(codeRef.current, true)); },
      subscribeSelection: callback => { doc.addEventListener('selectionchange', callback); return () => doc.removeEventListener('selectionchange', callback); },
    });
    binding.update({ rows, isFrontier });
    return () => binding.dispose();
  }, [key, codeRef]);
  return current?.key === key ? current.result?.ranges : null;
}
