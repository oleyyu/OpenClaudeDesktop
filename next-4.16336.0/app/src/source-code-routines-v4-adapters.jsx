// Host adapters for the isolated 4.16336.0 Code Routines graph (src/generated/code-routines-v4, region batch 3 of the
// 4.16336.0 migration; scripts/extract-code-routines.mjs contract 4.16336.0, manifest adapterModule). Every 3.6556.2
// answer is the same export of src/source-code-routines-adapters.jsx (re-exported below, same names, each feature-checked
// by the extractor against its 4.16336.0 original); this module only adds the three answers new in 4.16336.0.
// Nothing imports this module until the cutover (region-plan productionSwitchNotBeforeBatch 11).
//
// It is separate from the 3.6556.2 adapter module because useSidebarSectionsStore comes from
// src/source-sidebar-sections-adapters.jsx, which imports generated/sidebar-routines, which imports the 3.6556.2
// generated/code-routines: re-exported from src/source-code-routines-adapters.jsx it would close an import cycle.
import { useContext, useMemo } from 'react';
import { RoutinesSharedHost } from './source-routines-shared-adapters.jsx';

export * from './source-code-routines-adapters.jsx';

// ---- shared-92 Y (exported qg): the persisted sidebar store ----
// Read by the page's new Show in sidebar toggle (shared-20 Mj -> jj -> shared-39 _m / gm: `[X(vm), gm]`, the Routines
// section's shown flag and its setSectionView writer; 3.6556.2 shared-11 sf). The host answers that store's sections slice
// with one zustand store, the one sidebar-routines' Show › Routines toggle already writes (3.6556.2 shared-52 q). D1: one
// instance, so the page's toggle and the sidebar menu show the same Routines section.
export { useSidebarSectionsStore } from './source-sidebar-sections-adapters.jsx';

// ---- shared-25 dd / shared-183 pj: the ?create-routine=true intent (cbd6c85c8 zu) ----
// zu: `n = dd("create-routine") === "true"`; once the page can create, `pj("create-routine") && openCreate()`. The host
// has no TanStack router: the page's location is the notional one RoutinesSharedHost provides (pathname, search,
// navigate), as useSearchParams / useRouter read it. pj is a plain function (called from zu's effect), so it acts on the
// host location the last dd reader rendered under.
let searchHost = null;
export function useRouterSearchParam(name) {
  const host = useContext(RoutinesSharedHost);
  searchHost = host;
  const search = host.search ?? '';
  return useMemo(() => new URLSearchParams(search).get(name) ?? undefined, [search, name]);
}
// pj(...names): drops the names from the location (replace navigation, no history entry); true when one was present.
// The original also drops them from history.state's router search; the host keeps none there.
export function removeSearchParams(...names) {
  const host = searchHost;
  if (!host) return false;
  const params = new URLSearchParams(host.search ?? '');
  let changed = false;
  for (const name of names) if (params.has(name)) { params.delete(name); changed = true; }
  if (changed) {
    const query = params.toString();
    host.navigate(`${host.pathname ?? ''}${query ? `?${query}` : ''}`, { replace: true });
  }
  return changed;
}
