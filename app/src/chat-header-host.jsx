// Host of the Chat top bar on Claude Desktop 4.16336.0 (surfaces wave 2, chat-header lane;
// analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-2/chat-header/report.json).
//
// The top bar is sliced, not written here: generated/chat-header DesktopTopBar (shared-20 Yw → Xw, the row shared-23 QA
// draws while the window is incognito) with its TopBarIncognitoToggle (Zw → Ix: the Exit incognito X). Every declaration
// the slice stops at is a named boundary of scripts/extract-chat-header-v4.mjs, dispatched through the generated
// src/chat-header-adapter.mjs to the table below. This module answers those boundaries from the shell's value
// (ChatHeaderHost) and from the frame-sidebar host (one platform fact, one WindowState object); a capability left out of
// the table throws where the official code reaches it, and the `unreachable` boundaries throw when entered.
//
// Answers, each named in HOST_ANSWERS:
//   host   host state that plays the official part (incognito: main.jsx incognitoArm / chat-incognito-model.mjs, a local
//          chat deleted when left; the route; ⇧⌘I; i18n; platform and WindowState through frame-sidebar-host.jsx)
//   gate   a fixed answer of an official gate on this desktop (the desktop top bar exists; not an agent route)
//   gap    an official service the host does not have (voice mode: the toggle is never held; the activity panel toggle
//          renders nothing in Chat, as $w does officially outside local-session routes)
import React, { createContext, useContext, useMemo } from "react";
import { installChatHeaderHost } from "./chat-header-adapter.mjs";
import { DesktopTopBar } from "./generated/chat-header/top-bar.mjs";
import { HOST_ANSWERS as FRAME_ANSWERS } from "./frame-sidebar-host.jsx";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";

export const ChatHeaderHostContext = createContext(null);
function useHost() {
  const host = useContext(ChatHeaderHostContext);
  if (!host) throw Error("chat-header: ChatHeaderHost is not mounted above the official top bar");
  return host;
}

// shared-1 C6 (useShortcut) for the one id this slice asks: the host binds incognito to ⇧⌘I in Chat (main.jsx capture
// listener, shared-1 h6 `incognito` mac binding {key "i", modifiers ["cmd","shift"]}); shortcutString is shared-1 T6's form
// ([...modifiers, key].join("+")). matchShortcut is main.jsx's listener, not this slice's.
const INCOGNITO_BINDING = Object.freeze({ key: "i", modifiers: Object.freeze(["cmd", "shift"]), platform: "mac" });
const INCOGNITO_SHORTCUT = Object.freeze({
  description: undefined,
  shortcutString: [...INCOGNITO_BINDING.modifiers, INCOGNITO_BINDING.key].join("+"),
  matchShortcut: () => { throw Error("chat-header: ⇧⌘I is matched by main.jsx's incognito listener, not the top bar"); },
  bindings: Object.freeze([INCOGNITO_BINDING]),
});
// shared-1 kE while incognito: the frame shell and its sidebar are unmounted (frameShellMounted), so it is not expanded;
// Xw writes it only from the sidebar toggle it draws when not incognito.
const SIDEBAR_WHILE_INCOGNITO = Object.freeze({
  isExpanded: false,
  setIsExpanded: () => { throw Error("chat-header: the top bar's sidebar toggle is drawn only when not incognito"); },
});
const renderNothing = () => null;
const routeSelector = (selector) => selector(useHost().pathname);

function useIncognitoMode() {
  const { incognito, onToggleIncognito } = useHost();
  return useMemo(() => ({
    incognitoModeEnabled: incognito,
    setIncognitoModeEnabled: (next) => { if (next !== incognito) onToggleIncognito(); },
  }), [incognito, onToggleIncognito]);
}

// The capability table. Keys are the boundary names of scripts/extract-chat-header-v4.mjs.
export const HOST_ANSWERS = {
  useIntl: ["host", () => useStartIntl()],
  FormattedMessage: ["host", StartMessage],
  useIsDesktopApp: ["host", FRAME_ANSWERS.useIsDesktopApp[1]],
  useHasDesktopTopBar: ["gate", () => true], // YI: the host draws its desktop top bar row (source-incognito-shell.jsx)
  WindowState: ["host", FRAME_ANSWERS.WindowState[1]],
  useRoutePathnameSelector: ["host", routeSelector],
  useRouterPathnameSelector: ["host", routeSelector],
  useIsAgentRoute: ["gate", () => false], // FS: the shell is Chat only
  useIncognitoMode: ["host", useIncognitoMode],
  useSidebarExpanded: ["host", () => SIDEBAR_WHILE_INCOGNITO],
  useShortcut: ["host", (id) => { if (id !== "incognito") throw Error(`chat-header: shortcut ${id} is not answered here`); return INCOGNITO_SHORTCUT; }],
  useVoiceSessionHoldsIncognito: ["gap", () => false], // AP: no voice mode service on the host
  TopBarActivityPanelToggle: ["gap", renderNothing], // $w: null outside local-session (agent) routes
};
installChatHeaderHost(Object.fromEntries(Object.entries(HOST_ANSWERS).map(([name, [, answer]]) => [name, answer])));

// The shell mounts the top bar through this: `incognito` (the window's incognito state), `onToggleIncognito` (main.jsx
// incognitoKey: leaves the incognito page / chat), `pathname` (the host route: "/new" or "/chat/<id>").
export function ChatHeaderHost({ value, children }) {
  return <ChatHeaderHostContext.Provider value={value}>{children}</ChatHeaderHostContext.Provider>;
}

// shared-23 QA's row: `d(ud, { replacesFrameHeader: D })` (ud = shared-20 Yw). D = l && !f is true on the desktop frame,
// the 48 px row (k = D ? 48 : 45) the shell keeps (INCOGNITO_TOP_BAR_ROW).
export function ChatDesktopTopBar({ incognito, onToggleIncognito, pathname }) {
  const value = useMemo(() => ({ incognito, onToggleIncognito, pathname }), [incognito, onToggleIncognito, pathname]);
  return <ChatHeaderHost value={value}><DesktopTopBar replacesFrameHeader /></ChatHeaderHost>;
}
