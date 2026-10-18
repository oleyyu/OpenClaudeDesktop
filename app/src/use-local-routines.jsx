import { useCallback, useEffect, useRef, useState } from 'react';

// Both source surfaces consume the same persisted scheduler and its change
// events. Ignore replies from an older request or an unmounted surface.
// `kind` ('code' | 'cowork') narrows the list to one store; without it every row is returned.
export function useLocalRoutines(call, kind) {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const version = ++revision.current;
    try {
      const value = await call('local-routines', kind === undefined ? { action: 'list' } : { action: 'list', kind });
      if (version === revision.current) { setTasks(value); setError(''); }
    } catch (error) {
      if (version === revision.current) setError(error.message);
    }
  }, [call, kind]);
  useEffect(() => {
    const unsubscribe = window.desktop?.onEvent?.(event => {
      if (event.kind === 'local-routines') void reload();
    });
    void reload();
    return () => { revision.current++; unsubscribe?.(); };
  }, [reload]);
  return { tasks, error, reload };
}
