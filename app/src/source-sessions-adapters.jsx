import {getLocale} from '../electron/i18n/index.mjs';
// The local parent projects fresh engine state into each row on every render;
// there is no second Anthropic responding/read-state store to subscribe to.
export const useSessionsLocale=getLocale;
export const useSessionPageRow=row=>row;
const readState={tracking:false,readState:null,viewingChats:{}};
export const useSessionPageReadState=selector=>selector(readState);
export const sessionPageReadMark=row=>row.isUnread;
export {sessionNeedsAttention as sessionPageNeedsAttention} from './generated/code-current/sidebar-session-state.mjs';

// 2.42304.0 shared-25 ec(key, enabled) — the GrowthBook gate behind cbd6c85c8
// gu (`__gb__4293940309`, the bulk-selection menu) — returns false whenever
// `ks()?.growthbook` is missing. OpenClaude has no GrowthBook client, so every
// key takes that branch.
export const sessionsFeatureGate=(key,enabled)=>false;

// Code rows are never selectable on the Sessions page (gd isRowSelectable is
// `e.ref.kind !== "code"`), and the gate above is closed, so cbd6c85c8 never
// renders bu for Code. It stands in for the import the generated bulk actions
// still name, and fails loudly if a future change reaches it instead of
// rendering a substitute: the GrowthBook bulk menu (hu row actions + xu menu)
// for chats/tasks.
// Bn, the selection status checkbox (cbd6c85c8 `ui as Bn` from shared-frame,
// local wA), is the original CDS Checkbox through its view-tabs semantic name
// (R3-graph D24), the same Base UI instance as the other CDS parts.
export {CdsCheckbox as SessionsSelectionCheckbox} from './generated/view-tabs/shared-frame-BfjMqbuN.js';
function unreachable(name) {
  throw Error(`${name} is not reachable on the Code Sessions page (Code rows are not selectable)`);
}
export function SessionsBulkMenuUnavailable() {
  return unreachable('cbd6c85c8 bu (bulk selection menu)');
}
