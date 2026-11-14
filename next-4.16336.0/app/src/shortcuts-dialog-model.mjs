// Keyboard shortcuts dialog (2.2553.1 shared-21-D098Wd--.js:14583-14625 IR around zR :14946-15420)
// and the app-level chords that main.jsx's window keydown handles. zR lists General, Panes and
// Composer rows ($ :14466-14506); only rows whose chord this app really binds are kept, with
// zR's labels ("Stop Claude’s response" names the local agent). Every chord is matched by
// globalShortcutCommand below, the session cycler (session-cycle-model.mjs sessionCycleChord), paneShortcutKind
// (pane-shortcuts.mjs), chinShortcutCommand (chin-shortcuts.mjs), the composer's escapeAction
// (composer-keys-model.mjs), the sidebar's jump and archive chords (sidebar-jump-model.mjs
// isMetaJumpChord/jumpDigit, archiveChord) or the menus' 1-9 digit keys (source-menu.jsx
// data-number-key, chin-shortcuts.mjs modeMenuDigit).
import { MODE_MENU_KEYS } from "./chin-shortcuts.mjs";
import { diffChangeShortcuts } from "./diff-change-nav-model.mjs";
import { prCommentKeyboardEnabled } from "./diff-pr-comment-nav-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";

// shortcuts_modal binding {key:"/", modifiers:["cmd"], platform:"mac"} (ion-dist shared-7).
export const SHORTCUTS_DIALOG_KEYS = "cmd+/";

// W14-code r3 r3-shared-02: shared-46 `KL = ["1", …, "9"]`, `qL = [...KL, "0"].flatMap(e => { t = e === "0" ? "newPreset" :
// `selectPreset${e}`, n = `Digit${e}`; [{ command: t, key: `cmd+alt+${e}`, code: n, mac: !0, gate: "sessionPresets" },
// { command: t, key: `alt+${e}`, code: n, mac: !1, when: "isClaudeApp || !isLinux", gate: "sessionPresets" }] })`.
// A target is the index of a picker place (0 for selectPreset1) or "new" (newPreset).
export const PRESET_CHORD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
export function presetShortcut(target, mac = isMacPlatform()) {
  const digit = target === "new" ? "0" : PRESET_CHORD_DIGITS[target];
  if (digit === undefined) return undefined;
  return mac ? `cmd+alt+${digit}` : `alt+${digit}`;
}
// cc43287c9 c8 `Ka(e, { isClaudeApp: c, sessionEnvironments: !0, commands: kae })` then `Aae`: the binding's code (Digit0-9)
// with exactly its modifiers ("newPreset" -> "new", `selectPreset${n}` -> n - 1), else null.
export function presetChordTarget(event, mac = isMacPlatform()) {
  const match = /^Digit(\d)$/.exec(event?.code ?? "");
  if (!match) return null;
  if (!event.altKey || !!event.ctrlKey || !!event.shiftKey || !!event.metaKey !== mac) return null;
  return match[1] === "0" ? "new" : Number(match[1]) - 1;
}

// command: what the chord does here; keys: one Shortcut per alternative ("or" between them).
// Rows follow 2.31226 c518a31cc Ce (:560-1066, the Code route body of ShortcutsModalBody ve), filtered to what this app
// binds. W14-code r5 gates-r5-01 (E81): 3.6556.2 c518a31cc He `p = c("ccd_prompt_jump"), m = c("ccd_palette_session_actions")`
// — neither is in the desktop's Uon, so both are off (host-growthbook.mjs: not listed = off; this replaces B25's "on").
// sessionActionsOnly rows are He's `m &&` block, sessionActionsOff its `!m &&` ⌘⇧⌫ row, promptJumpOnly its `p &&` rows.
const GENERAL = [
  // ⌘K: Ce command_palette row "Search or start a session" toggles the command palette
  // (source-sidebar-palette.jsx); its 'New session' row starts one from the typed text.
  { command: "search", label: t("Search or start a session"), keys: ["cmd+k"] },
  // Ce search_palette row: ⇧⌘K opens (never toggles) the palette in search mode (Go > Search…).
  { command: "search-palette", label: t("Search"), keys: ["cmd+shift+k"] },
  // Ce J = "cmd+b" (main.jsx, View > Hide Sidebar). The older kR ⌘. alternative is gone in 2.31226 (⌘. is the chat
  // route's cai_rosy_feather_toggle), so this app no longer binds it either.
  { command: "toggle-sidebar", label: t("Toggle sidebar"), keys: ["cmd+b"] },
  { command: "shortcuts", label: t("Keyboard shortcuts"), keys: [SHORTCUTS_DIALOG_KEYS] },
  // Ce X: the Claude app's Settings row is "cmd+,".
  { command: "settings", label: t("Settings"), keys: ["cmd+,"] },
  // W14 E81: c518a31cc je after Settings (ve) in He's General: `c("__gb__1686253244")` (cai_soft_fern, Uon always on) with
  // shared-1 focus_next_region / focus_previous_region (kF / AF: f6 / shift+f6), the F6 page-area cycle this app binds
  // (focus-region-model.mjs, use-focus-regions.js).
  { command: "focus-next-region", label: t("Focus next page area"), keys: ["f6"] },
  { command: "focus-previous-region", label: t("Focus previous page area"), keys: ["shift+f6"] },
  { command: "new-session", label: t("New session"), keys: ["cmd+n"] },
  // Ce new_code_session_from_current (File › New Session with Current Settings, app-menu.cjs CmdOrCtrl+Shift+N).
  { command: "new-session-current", label: t("New session with current settings"), keys: ["cmd+shift+n"] },
  // W14-code r3 r3-shared-02: c518a31cc He `ae = t(Ee, { isClaudeApp: w })` right after new_code_session_from_current.
  // Ee: `e = y("selectPreset1", n, { sessionEnvironments: a })`, `s = y("newPreset", …)` (a = L(), the presets gate
  // claudeai_cc_epitaxy_session_presets_main; null when either shortcut is unbound), "Select environment" (oYSOsx4YRS)
  // with `e.replace(/1$/, "1…9")` and "New environment" (5xkWpa1rVR) with s. shared-46 qL: cmd+alt+N on a Mac, alt+N
  // elsewhere (`when: "isClaudeApp || !isLinux"`, the desktop app). Bound by the start page's environment picker
  // (source-environment-menu.jsx useEnvironmentChords, cc43287c9 c8).
  { command: "select-environment", label: t("Select environment"), keys: [presetShortcut(0, true).replace(/1$/, "1…9")], offMac: [presetShortcut(0, false).replace(/1$/, "1…9")], presetsOnly: true },
  { command: "new-environment", label: t("New environment"), keys: [presetShortcut("new", true)], offMac: [presetShortcut("new", false)], presetsOnly: true },
  // Ce isClaudeApp block: "cmd+w" closes the focused pane, else the session view (File > Close Session);
  // U = reopenClosed "cmd+shift+t".
  { command: "close-session", label: t("Close tab, pane, or session"), keys: ["cmd+w"] },
  { command: "reopen-closed", label: t("Reopen closed session"), keys: ["cmd+shift+t"] },
  // Session rows bound by the sidebar cycle (session-cycle-model.mjs, Go menu).
  { command: "next-session", label: t("Next session"), keys: ["cmd+shift+]", "ctrl+tab"] },
  { command: "previous-session", label: t("Previous session"), keys: ["cmd+shift+[", "ctrl+shift+tab"] },
  // ⌘1–9 (sidebar-jump-model.mjs bL).
  { command: "jump-session", label: t("Jump to session"), keys: ["cmd+1…9"] },
  // He `t(Te, {})` after Jump to session: SIDEBAR_TAB_ROWS (sidebarTabOnly).
  ...sidebarTabPlaceholder(),
  // W14-code r5 gates-r5-01: c518a31cc He `t(Te, {}), !m && t(Q, { shortcut: "cmd+shift+backspace", children: "Archive session"
  // (WIm4/6845I) })` — the sidebar's archive chord (source-sidebar.jsx archiveShortcut, sidebar-jump-model.mjs archiveChord).
  { command: "archive-session", label: t("Archive session"), keys: ["cmd+shift+backspace"], sessionActionsOff: true },
  // Ce {shortcut:"alt+click"}: ⌥-click a sidebar row (source-sidebar.jsx onOpenSplit), then he
  // (new_session_pane_right and new_session_pane_below, View › Split View's chords: split-view-model.mjs splitShortcut) and the
  // focus_next_pane / focus_previous_pane / close rows.
  { command: "split-open", label: t("Open session in split view"), keys: ["alt+click"] },
  { command: "split-new-right", label: t("New session on the right"), keys: ["ctrl+cmd+\\"] },
  { command: "split-new-below", label: t("New session below"), keys: ["ctrl+cmd+-"] },
  { command: "split-focus-next", label: t("Focus next split view"), keys: ["ctrl+]"] },
  { command: "split-focus-previous", label: t("Focus previous split view"), keys: ["ctrl+["] },
  { command: "split-close", label: t("Close split view"), keys: ["ctrl+cmd+w"] },
  // Ce h block (ccd_palette_session_actions, `m &&`): ⌥⌘P/R/A/U/G/O on the open session. 3.6556.2 c518a31cc He lists ⌘⇧⌫
  // "Archive session" only under `!m`; with m on, Archive is h's `shortcut: "cmd+alt+a"` alone.
  { command: "pin-session", label: t("Pin / unpin session"), keys: ["cmd+alt+p"], sessionActionsOnly: true },
  { command: "rename-session", label: t("Rename session"), keys: ["cmd+alt+r"], sessionActionsOnly: true },
  { command: "archive-session", label: t("Archive session"), keys: ["cmd+alt+a"], sessionActionsOnly: true },
  { command: "unread-session", label: t("Mark session as read/unread"), keys: ["cmd+alt+u"], sessionActionsOnly: true },
  // open_code_session_pr "cmd+alt+g" (cf74bc599 wO it(t) && xe: the session's PR, else nothing).
  { command: "open-session-pr", label: t("Open session PR"), keys: ["cmd+alt+g"], sessionActionsOnly: true },
  { command: "fork-session", label: t("Fork session"), keys: ["cmd+alt+o"], sessionActionsOnly: true },
  // Ce p (ccd_prompt_jump, `p &&`): jumpPrevPrompt / jumpNextPrompt "cmd+alt+up" / "cmd+alt+down".
  { command: "jump-prev-prompt", label: t("Jump to previous prompt"), keys: ["cmd+alt+up"], promptJumpOnly: true },
  { command: "jump-next-prompt", label: t("Jump to next prompt"), keys: ["cmd+alt+down"], promptJumpOnly: true },
  // cycleTranscriptMode = "ctrl+o".
  { command: "transcript-view", label: t("Transcript view"), keys: ["ctrl+o"] },
  // V3-w12b-settings-dialogs: 3.6556.2 c518a31cc He General `F = J0($, 71) ? K0($, 71, t(Ae, {}))` between Transcript view
  // (P) and Stop (I). Ae: `shortcut: "cmd+f"` Find, `e ? "cmd+g" : Oe` Find next, `e ? "cmd+shift+g" : ke` Find previous
  // (e = S(), the Mac check; Oe = ["cmd+g", "f3"], ke = ["cmd+shift+g", "shift+f3"]). Bound by the transcript find bar
  // (source-find-bar.jsx, transcript-find-model.mjs findShortcut: ⌘F, ⌘G / ⇧⌘G and F3 / ⇧F3).
  { command: "find", label: t("Find"), keys: ["cmd+f"] },
  { command: "find-next", label: t("Find next"), keys: ["cmd+g"], offMac: ["cmd+g", "f3"] },
  { command: "find-previous", label: t("Find previous"), keys: ["cmd+shift+g"], offMac: ["cmd+shift+g", "shift+f3"] },
  { command: "stop", label: t("Stop DeepSeek’s response"), keys: ["esc"] },
  // Ce !L "esc esc": the composer's createDoubleEscape opens Rewind (composer-keys-model.mjs); listed where the core
  // can rewind (thread/revert).
  { command: "rewind", label: t("Rewind the session to an earlier message"), keys: ["esc esc"], rewindOnly: true },
];
const PANES = [
  { command: "changes", label: t("Toggle changes"), keys: ["cmd+shift+d"] },
  // toggleDiffFileList = "cmd+shift+y" (pane-shortcuts.mjs 'file-list').
  { command: "file-list", label: t("Toggle file list in changes or files"), keys: ["cmd+shift+y"] },
  // B34 c518a31cc Ce d (c8e302838 gate, on): nextDiffChange / prevDiffChange as shared-19 w6 lists them on a Mac
  // (⌥F5 then F7; diff-change-nav-model.mjs diffChangeShortcuts), handled by the Changes pane (source-diff.jsx).
  { command: "next-change", label: t("Next change in changes"), keys: diffChangeShortcuts().next },
  { command: "previous-change", label: t("Previous change in changes"), keys: diffChangeShortcuts().prev },
  // W14-code sh7-01: 3.6556.2 c518a31cc He `o && w && E.length > 0 && […"Next unresolved comment" (0ungAlwxa5) E,
  // "Previous unresolved comment" (S8O1UaCzaD) v("prevPrComment", w)]`, E = v("nextPrComment", w): w = u() the Mac check
  // (macOnly), o = G() = c4d5c642f `!e("__gb__3741111118")` (prCommentKeyboardEnabled; not in Uon, so on). shared-46 YL
  // nextPrComment alt+f9 / prevPrComment shift+alt+f9, bound by the Changes pane (diff-pr-comment-nav-model.mjs).
  { command: "next-pr-comment", label: t("Next unresolved comment"), keys: ["alt+f9"], macOnly: true, prCommentOnly: true },
  { command: "previous-pr-comment", label: t("Previous unresolved comment"), keys: ["shift+alt+f9"], macOnly: true, prCommentOnly: true },
  // goToDiffFile = "cmd+p": the Changes pane's Go to file (diff-go-to-file-model.mjs isGoToFileShortcut).
  { command: "go-to-file", label: t("Go to file in changes or files"), keys: ["cmd+p"] },
  // togglePreview "cmd+shift+p".
  { command: "preview", label: t("Toggle preview"), keys: ["cmd+shift+p"] },
  // Ce "cmd+shift+s" Select element in preview: the Preview pane's toggleSelectionMode (source-preview-pane.jsx
  // PICK_SHORTCUT through matchSketchCommand, and from inside the page via preview-service.cjs).
  { command: "select-element", label: t("Select element in preview"), keys: ["cmd+shift+s"] },
  // Ce toggleSketchMode "Annotate page in preview": the Preview pane's Annotate button (SKETCH_SHORTCUT).
  { command: "annotate", label: t("Annotate page in preview"), keys: ["cmd+shift+x"] },
  // W14-code r2 (r2-shared-08): 3.6556.2 c518a31cc He lists the six Browser tab rows only under `V = w && k && r(i, {…
  // "New Browser tab" …})`, k = x() (shared-78 iE: JT() frontend_preview_external_domains, default-off here per D36,
  // || QT() sink_planter_vase / __gb__2035791980, not in Uon), so with k off they are not listed (the tab strip still
  // binds them: source-preview-pane.jsx onKeyDown, electron/preview-tab-shortcuts.mjs).
  // r2-shared-07: then `me = w && t(Ve, { browser: k })`: Ve "Reload page in preview" (wld+KBThBq), `i = "cmd+r"` on a
  // Mac, else `n ? Be : "f5"` (k off: "f5"). Bound by the Preview pane's keydown and, from inside the page,
  // preview-service.cjs previewShortcut "reload"; View › Reload (app-menu.cjs, jPKPzV-P lTi/dTi) reloads the focused preview.
  { command: "preview-reload", label: t("Reload page in preview"), keys: ["cmd+r"], offMac: ["f5"] },
  { command: "files", label: t("Toggle Files"), keys: ["cmd+shift+f"] },
  // attachTerminalOutput "cmd+shift+l": the transcript selection as composer context (source-transcript.jsx).
  { command: "attach-selection", label: t("Attach selection as context"), keys: ["cmd+shift+l"] },
  // toggleTerminal ctrl+` / cmd+j (terminal-pane-model.mjs isTerminalToggle, View › Show Terminal ⌘J).
  { command: "terminal", label: t("Toggle terminal"), keys: ["ctrl+`", "cmd+j"] },
  { command: "close-pane", label: t("Close pane"), keys: ["cmd+\\"] },
  // toggleExpandPane = "cmd+shift+\\".
  { command: "expand-pane", label: t("Expand or collapse pane"), keys: ["cmd+shift+\\"] },
  // Ce "cmd+;" Toggle side chat, bound in main.jsx; listed only where the core serves side questions
  // (session-command-model.mjs sideQuestionsSupported).
  { command: "side-chat", label: t("Toggle side chat"), keys: ["cmd+;"], sideChatOnly: true },
  // V3-w12b-settings-dialogs: 3.6556.2 c518a31cc He has no "ctrl+b" Background tasks row (the chord stays bound below,
  // globalShortcutCommand "background-tasks", but the dialog does not list it).
];
const COMPOSER = [
  { command: "mode", label: t("Open mode menu"), keys: [MODE_MENU_KEYS] },
  { command: "model", label: t("Open model menu"), keys: ["cmd+shift+i"] },
  { command: "effort", label: t("Open effort selector"), keys: ["cmd+shift+e"] },
  // Shown only when a model offers a Fast tier (Ce: setFastMode && some model has fast mode).
  { command: "fast", label: t("Toggle fast mode"), keys: ["cmd+alt+f"], fastOnly: true },
  { command: "menu-item", label: t("Select menu item"), keys: ["1…9"] },
  // file_upload {key:"u", modifiers:["cmd"]}: Add › Add files or photos.
  { command: "file-upload", label: t("Add files or photos"), keys: ["cmd+u"] },
  // V3-w12b-settings-dialogs: 3.6556.2 c518a31cc He Composer `Qe = … N && r(i, { children: [t(Q, { shortcut: De, …
  // "Reuse an earlier prompt" }), t(Q, { shortcut: "ctrl+r", … "Search earlier prompts" })] })` after Xe (file_upload),
  // with `N = l(Ue)`, `function Ue(e) { return _(e)?.kind === "code" }`: only while a Code session is open (route "code").
  // De = ["up", "down"] is SourceComposer's prompt history (promptHistoryStep), ⌃R its history search (isHistorySearchKey).
  { command: "reuse-prompt", label: t("Reuse an earlier prompt"), keys: ["up", "down"], routeOnly: ["code"] },
  { command: "search-prompts", label: t("Search earlier prompts"), keys: ["ctrl+r"], routeOnly: ["code"] },
  // Ce !L "cmd+enter" (named for the local agent, like Stop): queued while a turn runs (composer-keys-model.mjs submitPriority "later"), and ne: on the Home
  // draft it sends and stays there (submitPriority "stay", main.jsx stayOnDraft).
  { command: "queue", label: t("Queue for later (while DeepSeek is working)"), keys: ["cmd+enter"] },
  { command: "send-stay", label: t("Send and stay on the new session page"), keys: ["cmd+enter"] },
  // Ce N (forkSession on the bridge): 'Send in a forked session (local sessions)' cmd+alt+enter.
  { command: "send-fork", label: t("Send in a forked session (local sessions)"), keys: ["cmd+alt+enter"] },
];

// V3-w13-surfaces-shortcuts (surf-22): 3.6556.2 c518a31cc Me picks `t(n ? He : Ne, {})` by isEpitaxyRoute, so off the
// Code route the dialog body is Ne, with the chat message table (shared-78 Sv: `cp() ? xv : bv`, cp off -> bv: "New chat",
// "Close chat", "Next chat", "In chats", "Pin / unpin chat"…). Ne's rows, in Ne order, filtered like the Code list to the
// chords this app binds in Chat and Cowork (one SourceComposer and main.jsx's window keydown serve every surface):
//  - General F: ne command_palette "Quick chat or search" ⌘K, ie search_palette ⇧⌘K, E Toggle sidebar he = "cmd+b",
//    j newConversation `n ? "cmd+n" : …` (n = the desktop app), M `n && H() && … "cmd+w" shortcutClose` (H: shared-22
//    reportCloseMenuTarget), ce Ce next/previous (["cmd+shift+]", "ctrl+tab"] with xe() off) and "cmd+1…9" shortcutJumpTo,
//    N shortcuts_modal, P ve `e ? "cmd+," : …`.
//  - "In chats" xe: L "enter" Send message, R "shift+enter" New line in message, W file_upload, K `(b === "chat" ||
//    b === "cowork") && … shortcut: De` (De = ["up", "down"]: SourceComposer's prompt history), de "esc" Stop, then be
//    `_ && b === "chat" &&` [n && ⌥⌘P shortcutPinUnpin, ⌥⌘R renameConversation, v && ⌥⌘U shortcutMarkReadUnread].
//  - we `_ && b === "cowork" &&` "In tasks": n && ⌥⌘P "Pin / unpin task", ⌥⌘R "Rename task", ⌥⌘U "Mark task as
//    read/unread", ⌥⌘A "Archive task" (session-chord-model.mjs dispatchSessionChord runs on any surface's open session).
// b is the route kind (shared-52 Mv: "chat" only for /chat/<id>, "cowork" for a task route), so the Reuse row and the
// chat/task action rows show only while a chat or task is open (`route`). Left out, each for a reason: T Se and ae
// (gated: shared-18 N, me = !1), le je
// (__gb__1686253244: on per W14 E81 and listed on the Code route; this Code-only wave leaves Ne as it was), B ge Queue/Send now (re()/oe() gates unverified here), V extended_thinking ⇧⌘E (this app's ⇧⌘E
// opens the effort selector), U model_selector ⇧⌘. (not bound; in Chat ⇧⌘I is the incognito chat, shared-21 oO, and the
// model menu opens from the chin), ae the incognito row (`I1($, 4, me, e.incognito)`, me = !1: never listed), G ye (dictation
// binding), fe "esc esc" Edit your last message (se() gate; the local Esc Esc opens Rewind), pe Find ⌘F/⌘G (not bound),
// q/J browser rows, X Toggle activity sidebar ⇧⌘S (`o && d`: o = shared-78 GT, the Cowork built-in browser, off here per
// E63 panel-live-06, even though main.jsx now binds ⇧⌘S), _e cai_rosy_feather_toggle,
// Ee "In projects" (x: a /project/ route; no ⌥⌘R binding there).
const HOME_GENERAL = [
  { command: "search", label: t("Quick chat or search"), keys: ["cmd+k"] },
  { command: "search-palette", label: t("Search"), keys: ["cmd+shift+k"] },
  { command: "toggle-sidebar", label: t("Toggle sidebar"), keys: ["cmd+b"] },
  { command: "new-session", label: t("New chat"), keys: ["cmd+n"] },
  { command: "close-session", label: t("Close chat"), keys: ["cmd+w"] },
  { command: "next-session", label: t("Next chat"), keys: ["cmd+shift+]", "ctrl+tab"] },
  { command: "previous-session", label: t("Previous chat"), keys: ["cmd+shift+[", "ctrl+shift+tab"] },
  { command: "jump-session", label: t("Jump to chat"), keys: ["cmd+1…9"] },
  ...sidebarTabPlaceholder(),
  { command: "shortcuts", label: t("Keyboard shortcuts"), keys: [SHORTCUTS_DIALOG_KEYS] },
  { command: "settings", label: t("Settings"), keys: ["cmd+,"] },
];
const IN_CHATS = [
  { command: "send", label: t("Send message"), keys: ["enter"] },
  { command: "newline", label: t("New line in message"), keys: ["shift+enter"] },
  { command: "file-upload", label: t("Add files or photos"), keys: ["cmd+u"] },
  { command: "reuse-message", label: t("Reuse an earlier message"), keys: ["up", "down"], routeOnly: ["chat", "cowork"] },
  { command: "stop", label: t("Stop DeepSeek’s response"), keys: ["esc"] },
  { command: "pin-session", label: t("Pin / unpin chat"), keys: ["cmd+alt+p"], routeOnly: ["chat"] },
  { command: "rename-session", label: t("Rename chat"), keys: ["cmd+alt+r"], routeOnly: ["chat"] },
  { command: "unread-session", label: t("Mark chat as read/unread"), keys: ["cmd+alt+u"], routeOnly: ["chat"] },
];
const IN_TASKS = [
  { command: "pin-session", label: t("Pin / unpin task"), keys: ["cmd+alt+p"] },
  { command: "rename-session", label: t("Rename task"), keys: ["cmd+alt+r"] },
  { command: "unread-session", label: t("Mark task as read/unread"), keys: ["cmd+alt+u"] },
  { command: "archive-session", label: t("Archive task"), keys: ["cmd+alt+a"] },
];

// w13-close-main-jsx-tests (surfaces-shortcuts-02): c518a31cc Te, listed right after "Jump to session" / "Jump to chat" by
// both He and Ne: `e = n() === "rtl"` (useDirection), "Next sidebar tab" (nqrh9gXo0z) `e ? "cmd+alt+left" :
// "cmd+alt+right"`, "Previous sidebar tab" (ObojkXu2Us) the other one. Here the chord is SourceAppSwitch's
// (source-app-switch.jsx useSurfaceChord, AM: ⌥⌘←/→, swapped under RTL), mounted with the sidebar, so the rows are
// listed while main.jsx reports that sidebar (`sidebarChord`).
function sidebarTabPlaceholder() { return [{ command: "sidebar-tabs", sidebarTabOnly: true }]; }
function sidebarTabRows(rtl) {
  return [
    { command: "next-sidebar-tab", label: t("Next sidebar tab"), keys: [rtl ? "cmd+alt+left" : "cmd+alt+right"] },
    { command: "previous-sidebar-tab", label: t("Previous sidebar tab"), keys: [rtl ? "cmd+alt+right" : "cmd+alt+left"] },
  ];
}
// W14-code r5 gates-r5-01 (E81): the two He gates as the host table answers them (neither is in Uon: off). The Code
// route's window keydown (main.jsx) and the ⌘K palette (sidebar-palette-model.mjs) read the same two.
export const codeSessionActionsGate = () => hostGrowthBookFlag("ccd_palette_session_actions");
export const promptJumpGate = () => hostGrowthBookFlag("ccd_prompt_jump");
const withSidebarTabs = (list, { sidebarChord, rtl }) => list.flatMap((row) => (row.sidebarTabOnly ? (sidebarChord ? sidebarTabRows(rtl) : []) : [row]));

// shared-78 Do (SE, the S() of c518a31cc Ae; Eo tests the user agent for macintosh|macintel…): the Mac check, read here
// as source-find-bar.jsx isMac reads it (findShortcut takes F3 / ⇧F3 on every platform; Ae lists them off a Mac only).
export const isMacPlatform = () => typeof navigator === "undefined" || /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

/** Ne off the Code route: General, "In chats" and, on an open task, "In tasks". `route`: Mv's kind of the open view. */
function homeShortcutsDialogSections(route, tabs) {
  const rows = (list) => withSidebarTabs(list, tabs).filter((row) => !row.routeOnly || row.routeOnly.includes(route)).map(({ routeOnly, ...row }) => row);
  return [
    { title: t("General"), rows: rows(HOME_GENERAL) },
    { title: t("In chats"), rows: rows(IN_CHATS) },
    ...(route === "cowork" ? [{ title: t("In tasks"), rows: rows(IN_TASKS) }] : []),
  ];
}

/**
 * Ce's General / Panes / Composer sections, filtered to this app's bindings. `surface` is the sidebar mode: off Code
 * (chat, cowork) the dialog is Ne (homeShortcutsDialogSections), with `route` the open chat's or task's surface (null on Home).
 */
export function shortcutsDialogSections({ fastMode = false, sideChat = false, rewind = true, surface = "code", route = null, mac = isMacPlatform(),
  sidebarChord = false, rtl = false, presets = false, sessionActions = codeSessionActionsGate(), promptJump = promptJumpGate(),
  prComment = prCommentKeyboardEnabled() } = {}) {
  const tabs = { sidebarChord, rtl };
  if (surface === "chat" || surface === "cowork") return homeShortcutsDialogSections(route === "chat" || route === "cowork" ? route : null, tabs);
  // V3-w12b-settings-dialogs: He's `N && …` rows (routeOnly) show only on the open Code session's route; Ae's Find next /
  // previous take Oe / ke (with F3) off a Mac.
  // presets: Ee's `a = L()` (claudeai_cc_epitaxy_session_presets_main), the caller's gate read.
  const rows = (list) => withSidebarTabs(list, tabs).filter((row) => (!row.fastOnly || fastMode) && (!row.sideChatOnly || sideChat) && (!row.rewindOnly || rewind)
    && (!row.routeOnly || row.routeOnly.includes(route)) && (!row.presetsOnly || presets)
    && (!row.sessionActionsOnly || sessionActions) && (!row.sessionActionsOff || !sessionActions) && (!row.promptJumpOnly || promptJump)
    && (!row.macOnly || mac) && (!row.prCommentOnly || prComment))
    .map(({ fastOnly, sideChatOnly, rewindOnly, routeOnly, presetsOnly, sessionActionsOnly, sessionActionsOff, promptJumpOnly, macOnly, prCommentOnly, offMac, ...row }) => (offMac && !mac ? { ...row, keys: offMac } : row));
  return [
    { title: t("General"), rows: rows(GENERAL) },
    { title: t("Panes"), rows: rows(PANES) },
    { title: t("Composer"), rows: rows(COMPOSER) },
  ];
}

// The app-level chords of main.jsx's window keydown handler, matched exactly as before:
// ⌘, / Ctrl+, Settings and ⌘N / ⌘K / ⌘\ also accept Ctrl; ⌘B and ⌘[ ⌘] are Meta only
// (Ctrl+B stays the text fields' move-backward key) and match e.code; ⌘/ is the
// shortcuts_modal binding (shared-22-Cz3C_T8d.js:11709, :11740-11749); ⇧⌘K is
// search_palette {key:"k", shift:true} (sidebar-main.js:19987), Meta only. ⌘W is pR (shared-21
// :14357-14360, fR: the typed character, else KeyW) and ⇧⌘T reopenClosed (matchBy "char"), both
// Meta only; ⌃O is cycleTranscriptMode (code KeyO), Control only.
const typedChar = (event, letter, code) => (/^[ -~]$/.test(event.key ?? "") ? event.key.toLowerCase() === letter : event.code === code);
export function globalShortcutCommand(event) {
  if (!event) return null;
  const meta = !!event.metaKey, ctrl = !!event.ctrlKey, alt = !!event.altKey, shift = !!event.shiftKey;
  if ((meta || ctrl) && event.key === ",") return "settings";
  const plainMeta = meta && !ctrl && !alt && !shift && !event.isComposing;
  // toggle_sidebar: ⌘B (Ce J; ⌘. is no longer a sidebar chord).
  if (plainMeta && event.code === "KeyB") return "toggle-sidebar";
  if (plainMeta && event.code === "BracketLeft") return "back";
  if (plainMeta && event.code === "BracketRight") return "forward";
  if (plainMeta && typedChar(event,"p","KeyP")) return "go-to-file";
  if (plainMeta && event.code === "Slash") return "shortcuts";
  if (meta && shift && !ctrl && !alt && !event.isComposing && event.code === "KeyK") return "search-palette";
  if ((meta || ctrl) && event.key === "n") return "new-session";
  if ((meta || ctrl) && !alt && event.code === "Backslash") return shift ? "expand-pane" : "close-pane";
  if (meta && !ctrl && !alt && !event.isComposing && typedChar(event, "w", "KeyW")) return shift ? null : "close-session";
  if (meta && shift && !ctrl && !alt && !event.isComposing && typedChar(event, "t", "KeyT")) return "reopen-closed";
  if (ctrl && !meta && !alt && !shift && !event.isComposing && event.code === "KeyO") return "transcript-view";
  // backgroundTasks ctrl+b (matchBy key): Control only; the caller leaves it to a focused text field (move backward).
  if (ctrl && !meta && !alt && !shift && !event.isComposing && event.key?.toLowerCase() === "b") return "background-tasks";
  // file_upload cmd+u.
  if (plainMeta && event.code === "KeyU") return "file-upload";
  // jumpPrevPrompt / jumpNextPrompt cmd+alt+up / cmd+alt+down.
  if (meta && alt && !ctrl && !shift && !event.isComposing && (event.key === "ArrowUp" || event.key === "ArrowDown")) return event.key === "ArrowUp" ? "jump-prev-prompt" : "jump-next-prompt";
  // pB (shared-7 keybinding match): a key binding compares event.key case-insensitively with exact modifiers, so
  // ⌘K with Caps Lock (key "K", no Shift) is still command_palette; ⇧⌘K is search_palette above.
  if ((meta || ctrl) && !shift && event.key?.toLowerCase() === "k") return "search";
  // ⌥⌘ session chords: matched by code (⌥ turns event.key into another character on a Mac).
  if (meta && alt && !ctrl && !shift && !event.isComposing) {
    const chord = { KeyP: "pin-session", KeyR: "rename-session", KeyA: "archive-session", KeyU: "unread-session", KeyO: "fork-session", KeyG: "open-session-pr" }[event.code];
    if (chord) return chord;
  }
  return null;
}

// ⌘K (command_palette, toggles) and ⇧⌘K / Go > Search… (search_palette, opens): the palette is an
// overlay that shows whatever the sidebar state (sidebar-groups.js:4999-5024 sw), so the sidebar is
// never expanded for it. ⌘K closes an open palette or opens it in its default mode; ⇧⌘K opens it in
// search mode, or switches an open one to search mode (sw n("search")).
export function searchShortcutAction({ showSearch = false, toggle = false } = {}) {
  if (toggle) return showSearch ? "close" : "open";
  return "open-search";
}
