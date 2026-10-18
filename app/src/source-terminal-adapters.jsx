// Local services for the original terminal pane pieces that extract-code-ui-current.mjs emits from 2.42304.0
// (generated/code-current/terminal-clear-item.mjs = cccc2cf0a Xy/Zy). The official item renders inside the CDS
// context menu (shared-frame Ii = CdsContextMenu); the terminal tab menu here is the host SourceMenu, so its Item is
// the menu primitive the item is placed in. Messages go through the local catalog (useStartIntl / StartMessage).
// R3-terminal FT-15: the shared strip's overflow row (generated/code-current/terminal-tab-overflow.mjs = cfe7c4b3b ce)
// renders `O.Item` of the CDS dropdown (shared-frame qa); its rows sit in a SourceMenu popup here, so the same Item.
import { SourceMenu } from "./source-menu.jsx";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";

export const TerminalMenu = { Item: SourceMenu.Item };
export const TerminalMessage = StartMessage;
export const useTerminalIntl = useStartIntl;
