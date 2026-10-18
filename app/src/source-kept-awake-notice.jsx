import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getLocale } from "../electron/i18n/index.mjs";
import { usePersistedValue, writePersistedValue } from "./source-files-changes-adapters.jsx";
import { KEEP_AWAKE_BAND_USED_KEY, keptAwakeNotice, keptAwakeShownFor, keptAwakeStore } from "./kept-awake-model.mjs";

// R4i-small SM1 (cov0-05): cf74bc599 tw for the session the composer shows, as a SourceSessionNotices entry (main.jsx).
// config: the desktop settings (keepAwake = ccKeepAwakeWhileWorking, keepAwakeOnBattery = ccKeepAwakeOnBattery; unset
// reads as on); saveSettings(patch) writes them (official $_ T("while_working"|"on_battery", !1)).
export function useKeptAwakeNotice({ sessionId, running = false, archived = false, config = null, saveSettings }) {
  const subscribe = useCallback((listener) => keptAwakeStore.subscribe(listener), []);
  const snapshot = () => keptAwakeStore.get(sessionId);
  const keptAwake = useSyncExternalStore(subscribe, snapshot, snapshot);
  // ZC "epitaxy-keep-awake-band-used" (account scope): persisted.<key> in this host.
  const bandUsed = usePersistedValue(KEEP_AWAKE_BAND_USED_KEY, false) === true;
  const [dismissed, setDismissed] = useState(null);
  const shownFor = keptAwakeShownFor({ keptAwake, running, archived, whileWorking: config?.keepAwake !== false, bandUsed, dismissedEndedAt: dismissed });
  // ae + A(W): the band is used and this endedAt stays hidden.
  const use = useCallback((endedAt) => { writePersistedValue(KEEP_AWAKE_BAND_USED_KEY, true, false); setDismissed(endedAt); }, []);
  // Om(g,ce): a message sent in the session while the band shows uses it too. Here the sent message's turn start
  // clears keptAwake (kept-awake-model.mjs store), so the band going away under the same session marks it used.
  const shown = useRef(null);
  useEffect(() => {
    if (shownFor !== null) { shown.current = { sessionId, endedAt: shownFor }; return; }
    if (shown.current && shown.current.sessionId === sessionId && keptAwake === null) use(shown.current.endedAt);
    shown.current = null;
  }, [shownFor, sessionId, keptAwake, use]);
  if (shownFor === null) return null;
  const save = (patch) => { if (typeof saveSettings === "function") saveSettings(patch); };
  return keptAwakeNotice({
    keptAwake, shownFor, onBattery: config?.keepAwakeOnBattery !== false, locale: getLocale(),
    onBatteryOff: () => { save({ keepAwakeOnBattery: false }); use(shownFor); },
    onTurnOff: () => { save({ keepAwake: false }); use(shownFor); },
    onDismiss: () => use(shownFor),
  });
}
