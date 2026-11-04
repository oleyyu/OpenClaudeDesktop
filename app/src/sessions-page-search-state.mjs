// cbd6c85c8 ed/td (cov11-02): the per-history-entry search store is the generated page's own (registered below and
// cleared through the reset registry); the host's duplicate Map and its read/remember helpers, which only tests used,
// are gone (W14-code r4 closeout R4DC-N7). OpenClaude's account scope is its local engine.
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
  for(const callback of [...resets])callback({sessionExpired:false});
}
// The signed-in identity whose change stands in for sign-out (account/read).
export function sessionsPageAccountScope(accountRead) {
  const account=accountRead?.account;
  return account?`${account.type??''}:${account.email??''}`:null;
}
