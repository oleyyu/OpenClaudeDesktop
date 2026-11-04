// Host services for the Code notice slots scripts/extract-composer-notices.mjs slices from 3.6556.2 (W14-code r6 sleep
// lane: c227f4d5e cI / uI / tI / mI / rI, the Code column's notice slot table; shared-6 kT / shared-26 kM, the band row).
// Each export stands in for one import of the original; the extractor checks the declaration it replaces.

// shared-1 wE (exported Cc): `ss(x(yE), CE)` — whether the session scope is hidden (yE's store, `{hidden}`). No host
// surface provides yE (a session is drawn only while it is shown), so it reads its default store: not hidden.
export function useSessionScopeHidden() {
  return false;
}

// shared-2 RX (exported Ai): registers the keys a surface shows (`LX(`${n}:${r}`, {key, zone})`) in the desktop's visible
// zone registry, which only its diagnostics read. lI passes the slot's analytics id under "code.composer". Nothing
// reads such a registry here (D17: no telemetry), so nothing is registered.
export function useVisibleZoneKeys() {}
