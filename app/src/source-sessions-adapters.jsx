import {getLocale} from '../electron/i18n/index.mjs';
// The local parent projects fresh engine state into each row on every render;
// there is no second Anthropic responding/read-state store to subscribe to.
export const useSessionsLocale=getLocale;
export const useSessionPageRow=row=>row;
const readState={tracking:false,readState:null,viewingChats:{}};
export const useSessionPageReadState=selector=>selector(readState);
export const sessionPageReadMark=row=>row.isUnread;
export {sessionNeedsAttention as sessionPageNeedsAttention} from './generated/code-current/sidebar-session-state.mjs';

// 3.6556.2 shared-25 hs(key, enabled) (2.42304.0 ec) — the GrowthBook gate behind
// cbd6c85c8 Dd (`__gb__4293940309`, the bulk-selection menu) — returns false
// whenever `Vo()?.growthbook` is missing. OpenClaude has no GrowthBook client, so
// every key takes that branch.
export const sessionsFeatureGate=(key,enabled)=>false;

// Code rows are never selectable on the Sessions page (Hf isRowSelectable is
// Qf = `e.ref.kind !== "code"`), and the gate above is closed, so cbd6c85c8 Od
// never renders jd for Code. It stands in for the import the generated bulk
// actions still name, and fails loudly if a future change reaches it instead of
// rendering a substitute: the GrowthBook bulk menu (Md row actions + menu) for
// chats/tasks. The selection status checkbox (cbd6c85c8 R = shared-frame xi) is
// imported by the generated selection bar itself, as view-tabs CdsCheckbox (R6).
function unreachable(name) {
  throw Error(`${name} is not reachable on the Code Sessions page (Code rows are not selectable)`);
}
export function SessionsBulkMenuUnavailable() {
  return unreachable('cbd6c85c8 jd (bulk selection menu)');
}
