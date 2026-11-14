// Host answers for the imports scripts/extract-effort-control.mjs maps to this module (W14-code r6-composer-02). The
// effort popover itself is the original 3.6556.2 c8e04f916 EffortControl in src/generated/effort-control; this module
// only answers vendor-frame's own React reads, which the generator would otherwise copy with vendor-frame's bundled React
// module (a second React, whose hooks would have no dispatcher): each export is the member its declaration names.
//   vendor-frame R  = c.useEffect          vendor-frame H  = c.useMemo
//   vendor-frame K  = me.jsx               vendor-frame Hl = e(Vl()).useSyncExternalStore (the use-sync-external-store
//                                          shim, which answers React's own useSyncExternalStore on React 19)
export { useEffect, useMemo, useSyncExternalStore } from 'react';
export { jsx } from 'react/jsx-runtime';
