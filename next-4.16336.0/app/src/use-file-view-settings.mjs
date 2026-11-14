import { useSyncExternalStore } from 'react';
import { createFileViewSettings } from './file-view-settings.mjs';
let shared;
function getStore() {
  if (!shared) {
    let storage; try { storage = window.localStorage; } catch { /* SSR / unavailable storage. */ }
    shared = createFileViewSettings({ storage, subscribeStorage: listener => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener);
    } });
  }
  return shared;
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { shared?.dispose(); shared = null; });
export function useFileViewSettings() {
  const store = getStore();
  return [useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot), store.set];
}
