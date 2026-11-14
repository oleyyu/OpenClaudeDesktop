// Host adapter for 3.6556.2 c03935b01 Rr (`var Rr=new Map`), the composer registry the draft hook ni fills:
//   if(!n||!o)return;let e={composerRef:n,keptFor:i,setInitialDraft:d};
//   return Rr.set(t,e),Br(t,e),()=>{Rr.get(t)===e&&Rr.delete(t)}
// keyed by session id while that session's composer is shown. The generated Xr / Yr (btw-focus-intent.mjs, cccc2cf0a
// `ou` / `cu`) read `Rr.get(id)?.composerRef.current`. The host registers each /btw child composer (source-btw-pane.jsx)
// with its editor ref; keptFor / setInitialDraft serve ni's kept-draft restore (Br), which the host's draft store does
// not have, so the entry carries only composerRef.
export const btwComposerRegistry = new Map();

// ni's effect body: register this entry, and on cleanup remove it only while it is still the session's own.
export function registerBtwComposer(sessionId, composerRef) {
  if (!sessionId || !composerRef) return () => {};
  const entry = { composerRef };
  btwComposerRegistry.set(sessionId, entry);
  return () => { if (btwComposerRegistry.get(sessionId) === entry) btwComposerRegistry.delete(sessionId); };
}
