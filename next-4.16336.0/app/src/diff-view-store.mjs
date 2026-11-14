import { useSyncExternalStore } from 'react';
import { createDiffPreferencesStore } from './diff-view-model.mjs';
let shared;
function getStore() {
  if (!shared) {
    let storage; try { storage = window.localStorage; } catch { /* SSR or unavailable storage. */ }
    shared = createDiffPreferencesStore({ storage, subscribeStorage: listener => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener);
    } });
  }
  return shared;
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { shared?.dispose(); shared = null; });
export function useDiffViewPreferences() {
  const store = getStore();
  return [useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot), store.set];
}
