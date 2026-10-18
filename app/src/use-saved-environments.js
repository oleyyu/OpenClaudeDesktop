import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY = { version: 4, revision: -1, selectionRevision: 0, environments: [], selectedId: null, starred: [] };
export function useSavedEnvironments(call, api) {
  const [snapshot, setSnapshot] = useState(EMPTY), [ready, setReady] = useState(false), [error, setError] = useState(null);
  const generation = useRef(0);
  const revision = useRef(-1);
  const accept = useCallback(result => {
    const next = result?.snapshot ?? result;
    if (Array.isArray(next?.environments) && (next.revision ?? 0) >= revision.current) {
      revision.current = next.revision ?? 0; generation.current++; setSnapshot(next); setReady(true); setError(null);
    }
    return result;
  }, []);
  const run = useCallback(request => call('saved-environments', request).then(accept), [call, accept]);
  useEffect(() => {
    let live = true;
    const off = api?.onEvent?.(event => { if (event.kind === 'saved-environments') accept(event.snapshot); });
    const before = generation.current;
    call('saved-environments', { op: 'list' }).then(result => { if (live && before === generation.current) accept(result); }, reason => {
      if (live && before === generation.current) { setReady(true); setError(reason.message); }
    });
    return () => { live = false; off?.(); };
  }, [call, api, accept]);
  return { ...snapshot, ready, error, run };
}
