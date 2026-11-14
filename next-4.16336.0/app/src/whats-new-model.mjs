// Home titlebar "What’s new" nudge gate. Source titlebar-release-notes.js
// (current-2.2553.1) :5058-5069 P(surface): N = "ccd-whats-new-seen-version"
// (surface "code" uses N itself); t = running version; n = the notes list has
// an entry whose version === t; [a,o] = persisted string (default "");
// markSeen = () => { t && n && o(t) }; justUpdated = !C() && !!t && n && a !== t.
// C() (shared-11 Gi) is an environment gate whose meaning is unconfirmed; it is
// deliberately left out here. V (:5238-5256) renders the button only while
// `justUpdated || modalOpen`; B (:5156-5168) calls markSeen() as soon as it opens.
export const WHATS_NEW_SEEN_KEY = "ccd-whats-new-seen-version";

export function whatsNewVisible({ version, hasNotes, seen, open }) {
  return (!!version && !!hasNotes && seen !== version) || !!open;
}

// P markSeen: only a running version that has notes is recorded; otherwise the
// persisted value is left as is (null = no write).
export function markSeenValue({ version, hasNotes }) {
  return version && hasNotes ? version : null;
}

// The persisted string is a per-viewer convenience: storage may be missing,
// throw (private/blocked site data) or hold a non-string; all read as "".
export function readSeenVersion(storage) {
  try {
    const value = storage?.getItem(WHATS_NEW_SEEN_KEY);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function writeSeenVersion(storage, value) {
  try {
    storage?.setItem(WHATS_NEW_SEEN_KEY, value);
    return true;
  } catch {
    return false;
  }
}
