// Local services for the original 3.6556.2 terminal pane pieces extract-code-ui-current.mjs emits
// (generated/code-current/terminal-clear-item.mjs = cccc2cf0a sS). Its `me` is shared-frame qi, view-tabs'
// CdsContextMenu: since w10-ccres-e31-terminal the terminal strip is the official ViewTabBar (cfe7c4b3b t, as
// cccc2cf0a Zx renders it), whose tab menu is that CdsContextMenu (`S.Popup` with `renderTabMenuItems` inside), so
// TerminalMenu is a plain re-export of it, no host menu stand-in. Messages go through the local catalog
// (useStartIntl / StartMessage, vendor-intl l / p).
// The overflow row (terminal-tab-overflow.mjs = cfe7c4b3b se) no longer reads this file: w10-trans-tab-overflow gave it
// the CDS dropdown (shared-frame Jo) directly.
export { CdsContextMenu as TerminalMenu } from "./generated/view-tabs/index.js";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";

export const TerminalMessage = StartMessage;
export const useTerminalIntl = useStartIntl;
