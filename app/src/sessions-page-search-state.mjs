// cbd6c85c8 ed/td (cov11-02): one window-wide Map from a history entry key
// (TanStack __TSR_key) to the search typed on that entry, so a nonempty search
// and its sort come back only when Back/Forward returns to that same entry,
// never on a new visit. The record carries the account that wrote it
// (orgUuid) and is only read back for that account; OpenClaude's scope is its
// local engine. be(() => ed.clear()) empties the Map on sign-out / session
// expiry; the host clears it when the engine or the signed-in account changes.
const searches=new Map();
// gd: `ed.get(Kn() ?? "")`, kept only when `orgUuid === R`.
export function readSessionsPageSearch(historyKey,scope) {
  const held=searches.get(historyKey??'');
  return held?.scope===scope?held:undefined;
}
// td: writes only for the entry being shown (`r !== null && r === Kn()`); an
// emptied search removes the record. The host has no asynchronous router
// resolution, so the entry the page renders for is always the current one.
export function rememberSessionsPageSearch(historyKey,input,sortBy,scope) {
  if(historyKey==null)return;
  if(input.trim()==='')searches.delete(historyKey);
  else searches.set(historyKey,{input,sortBy,scope});
}
// shared-52 Xi (exported `Jx`) / na: the sign-out reset registry. Generated 3.6556.2 code registers its own
// module-level stores here (cbd6c85c8 `J(() => Tf.clear())`, through the sessions-page adapter registerSessionsReset);
// the host runs every callback where the official build runs na() (sign-out / session expiry), i.e. when the engine or
// the signed-in account changes. `durable` is kept for parity (Ki: also run by ra()); the host has no ra() caller.
const resets=new Set(),durableResets=new Set();
export function registerSessionsPageReset(callback,{durable=false}={}) {
  resets.add(callback);
  if(durable)durableResets.add(callback);
  return ()=>{resets.delete(callback);durableResets.delete(callback);};
}
export function clearSessionsPageSearches() {
  searches.clear();
  for(const callback of [...resets])callback({sessionExpired:false});
}
// The signed-in identity whose change stands in for sign-out (account/read).
export function sessionsPageAccountScope(accountRead) {
  const account=accountRead?.account;
  return account?`${account.type??''}:${account.email??''}`:null;
}
