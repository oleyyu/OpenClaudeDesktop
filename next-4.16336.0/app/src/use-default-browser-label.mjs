// V3-w12b-settings-dialogs (S3): 3.6556.2 c8ae173c6 f/p as a hook. f: `t(u, [])` (ask once on mount) and
// `e(l.subscribe, d, d)` (useSyncExternalStore over the module store); p: the named or generic label
// (src/default-browser-name.mjs browserLabel). Used where cf580efe9 On(), cccc2cf0a E_() and c96d752d0 DC() read it.
import { useEffect, useSyncExternalStore } from "react";
import { browserLabel, defaultBrowserName, refreshDefaultBrowserName, subscribeDefaultBrowserName } from "./default-browser-name.mjs";

export function useDefaultBrowserLabel() {
  useEffect(() => { refreshDefaultBrowserName(); }, []);
  return browserLabel(useSyncExternalStore(subscribeDefaultBrowserName, defaultBrowserName, defaultBrowserName));
}
