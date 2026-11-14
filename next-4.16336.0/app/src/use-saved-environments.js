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

// W14-code r2-composer-04: cc43287c9 bue — while a local saved environment is the start page's pick, its folder is probed
// (`queryKey: ["epitaxy-environment-folder-probe", folder]`, staleTime / refetchInterval 3e4, refetchOnWindowFocus, retry
// !1, silent) and is gone once the probe says `missing`. saved-environments.mjs `probe` answers for the stored folder.
export const ENVIRONMENT_FOLDER_PROBE_MS = 30000;
export function useEnvironmentFolderGone(run, environment) {
  const id = environment?.target?.kind === 'local' ? environment.id : null;
  const folder = id ? environment.target.cwd : null;
  const key = id && folder ? `${id}\0${folder}` : null;
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    const probe = () => { run({ op: 'probe', id }).then(result => { if (live) setAnswer({ key, missing: result?.missing === true }); }, () => {}); };
    probe();
    const timer = setInterval(probe, ENVIRONMENT_FOLDER_PROBE_MS);
    window.addEventListener('focus', probe);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', probe); };
  }, [run, key]);
  return !!key && answer?.key === key && answer.missing;
}
