// Keyboard shortcuts dialog (2.2553.1 shared-21-D098Wd--.js:14583-14625 IR around zR :14946-15420)
// and the app-level chords that main.jsx's window keydown handles. zR lists General, Panes and
// Composer rows ($ :14466-14506); only rows whose chord this app really binds are kept, with
// zR's labels ("Stop Claude’s response" names the local agent). Every chord is matched by
// globalShortcutCommand below, sessionCycleDelta (session-cycle-model.mjs), paneShortcutKind
// (pane-shortcuts.mjs), chinShortcutCommand (chin-shortcuts.mjs), the composer's escapeAction
// (composer-keys-model.mjs), the sidebar's jump and archive chords (sidebar-jump-model.mjs
// isMetaJumpChord/jumpDigit, archiveChord) or the menus' 1-9 digit keys (source-menu.jsx
// data-number-key, chin-shortcuts.mjs modeMenuDigit).
import { MODE_MENU_KEYS } from "./chin-shortcuts.mjs";
import { isMacPlatform } from "./pane-keys-model.mjs";
import { diffChangeShortcuts } from "./diff-change-nav-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// shortcuts_modal binding {key:"/", modifiers:["cmd"], platform:"mac"} (ion-dist shared-7).
export const SHORTCUTS_DIALOG_KEYS = "cmd+/";

// command: what the chord does here; keys: one Shortcut per alternative ("or" between them).
// Rows follow 2.31226 c518a31cc Ce (:560-1066, the Code route body of ShortcutsModalBody ve) with
// ccd_palette_session_actions on (this app binds the ⌥⌘ session chords), filtered to what this app binds.
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
  { command: "new-session", label: t("New session"), keys: ["cmd+n"] },
  // Ce new_code_session_from_current (File › New Session with Current Settings, app-menu.cjs CmdOrCtrl+Shift+N).
  { command: "new-session-current", label: t("New session with current settings"), keys: ["cmd+shift+n"] },
  // Ce isClaudeApp block: "cmd+w" closes the focused pane, else the session view (File > Close Session);
  // U = reopenClosed "cmd+shift+t".
  { command: "close-session", label: t("Close tab, pane, or session"), keys: ["cmd+w"] },
  { command: "reopen-closed", label: t("Reopen closed session"), keys: ["cmd+shift+t"] },
  // Session rows bound by the sidebar cycle (session-cycle-model.mjs, Go menu).
  { command: "next-session", label: t("Next session"), keys: ["cmd+shift+]", "ctrl+tab"] },
  { command: "previous-session", label: t("Previous session"), keys: ["cmd+shift+[", "ctrl+shift+tab"] },
  // ⌘1–9 (sidebar-jump-model.mjs bL).
  { command: "jump-session", label: t("Jump to session"), keys: ["cmd+1…9"] },
  // Ce {shortcut:"alt+click"}: ⌥-click a sidebar row (source-sidebar.jsx onOpenSplit), then he
  // (new_session_pane_right and new_session_pane_below, View › Split View's chords: split-view-model.mjs splitShortcut) and the
  // focus_next_pane / focus_previous_pane / close rows.
  { command: "split-open", label: t("Open session in split view"), keys: ["alt+click"] },
  { command: "split-new-right", label: t("New session on the right"), keys: ["ctrl+cmd+\\"], otherKeys: ["ctrl+alt+\\"] },
  { command: "split-new-below", label: t("New session below"), keys: ["ctrl+cmd+-"], otherKeys: ["ctrl+alt+-"] },
  { command: "split-focus-next", label: t("Focus next split view"), keys: ["ctrl+]"] },
  { command: "split-focus-previous", label: t("Focus previous split view"), keys: ["ctrl+["] },
  { command: "split-close", label: t("Close split view"), keys: ["ctrl+cmd+w"], otherKeys: ["ctrl+alt+w"] },
  // Ce h block (ccd_palette_session_actions): ⌥⌘P/R/A/U/G/O on the open session. Archive keeps the sidebar's
  // ⌘⇧⌫ (shared-19 rg) as a second chord since this app still binds it.
  { command: "pin-session", label: t("Pin / unpin session"), keys: ["cmd+alt+p"] },
  { command: "rename-session", label: t("Rename session"), keys: ["cmd+alt+r"] },
  { command: "archive-session", label: t("Archive session"), keys: ["cmd+alt+a", "cmd+shift+backspace"] },
  { command: "unread-session", label: t("Mark session as read/unread"), keys: ["cmd+alt+u"] },
  // open_code_session_pr "cmd+alt+g" (cf74bc599 wO it(t) && xe: the session's PR, else nothing).
  { command: "open-session-pr", label: t("Open session PR"), keys: ["cmd+alt+g"] },
  { command: "fork-session", label: t("Fork session"), keys: ["cmd+alt+o"] },
  // Ce p (ccd_prompt_jump): jumpPrevPrompt / jumpNextPrompt "cmd+alt+up" / "cmd+alt+down".
  { command: "jump-prev-prompt", label: t("Jump to previous prompt"), keys: ["cmd+alt+up"], otherKeys: ["alt+up"] },
  { command: "jump-next-prompt", label: t("Jump to next prompt"), keys: ["cmd+alt+down"], otherKeys: ["alt+down"] },
  // cycleTranscriptMode = "ctrl+o".
  { command: "transcript-view", label: t("Transcript view"), keys: ["ctrl+o"] },
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
  // goToDiffFile = "cmd+p": the Changes pane's Go to file (diff-go-to-file-model.mjs isGoToFileShortcut).
  { command: "go-to-file", label: t("Go to file in changes or files"), keys: ["cmd+p"] },
  // togglePreview "cmd+shift+p".
  { command: "preview", label: t("Toggle preview"), keys: ["cmd+shift+p"] },
  // Ce "cmd+shift+s" Select element in preview: the Preview pane's toggleSelectionMode (source-preview-pane.jsx
  // PICK_SHORTCUT through matchSketchCommand, and from inside the page via preview-service.cjs).
  { command: "select-element", label: t("Select element in preview"), keys: ["cmd+shift+s"] },
  // Ce toggleSketchMode "Annotate page in preview": the Preview pane's Annotate button (SKETCH_SHORTCUT).
  { command: "annotate", label: t("Annotate page in preview"), keys: ["cmd+shift+x"] },
  // Ce E && j: the Browser tab strip's chords, which the Preview pane's tab strip binds (source-preview-pane.jsx
  // onKeyDown, electron/preview-tab-shortcuts.mjs): ⌘T, U, ⌃⇥ / ⌃⇧⇥, W = selectBrowserTab1 as "cmd+1…9", ⌘L.
  { command: "preview-new-tab", label: t("New Browser tab"), keys: ["cmd+t"] },
  { command: "preview-reopen-tab", label: t("Reopen closed Browser tab"), keys: ["cmd+shift+t"] },
  { command: "preview-next-tab", label: t("Next Browser tab"), keys: ["ctrl+tab"] },
  { command: "preview-previous-tab", label: t("Previous Browser tab"), keys: ["ctrl+shift+tab"] },
  { command: "preview-jump-tab", label: t("Jump to Browser tab"), keys: ["cmd+1…9"] },
  { command: "preview-address", label: t("Focus address bar in Browser"), keys: ["cmd+l"] },
  { command: "files", label: t("Toggle Files"), keys: ["cmd+shift+f"] },
  // attachTerminalOutput "cmd+shift+l": the transcript selection as composer context (source-transcript.jsx).
  { command: "attach-selection", label: t("Attach selection as context"), keys: ["cmd+shift+l"] },
  // toggleTerminal ctrl+` / cmd+j (terminal-pane-model.mjs isTerminalToggle, View › Show Terminal ⌘J).
  { command: "terminal", label: t("Toggle terminal"), keys: ["ctrl+`", "cmd+j"], otherKeys: ["ctrl+`"] },
  { command: "close-pane", label: t("Close pane"), keys: ["cmd+\\"] },
  // toggleExpandPane = "cmd+shift+\\".
  { command: "expand-pane", label: t("Expand or collapse pane"), keys: ["cmd+shift+\\"] },
  // Ce "cmd+;" Toggle side chat, bound in main.jsx; listed only where the core serves side questions
  // (session-command-model.mjs sideQuestionsSupported).
  { command: "side-chat", label: t("Toggle side chat"), keys: ["cmd+;"], sideChatOnly: true },
  // backgroundTasks "ctrl+b" (matchBy key): the Tasks pane's background list; left to a focused text field.
  { command: "background-tasks", label: t("Background tasks"), keys: ["ctrl+b"], otherKeys: ["ctrl+shift+b"] },
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
  // Ce !L "cmd+enter" (named for the local agent, like Stop): queued while a turn runs (composer-keys-model.mjs submitPriority "later"), and ne: on the Home
  // draft it sends and stays there (submitPriority "stay", main.jsx stayOnDraft).
  { command: "queue", label: t("Queue for later (while DeepSeek is working)"), keys: ["cmd+enter"] },
  { command: "send-stay", label: t("Send and stay on the new session page"), keys: ["cmd+enter"] },
  // Ce N (forkSession on the bridge): 'Send in a forked session (local sessions)' cmd+alt+enter.
  { command: "send-fork", label: t("Send in a forked session (local sessions)"), keys: ["cmd+alt+enter"] },
];

/** Ce's General / Panes / Composer sections, filtered to this app's bindings. */
// otherKeys: the row's chords off macOS where they are not just "cmd" read as Ctrl (globalShortcutCommand's
// nonMacShortcutCommand, split-view-model splitShortcut, terminal-pane-model isTerminalToggle).
export function shortcutsDialogSections({ fastMode = false, sideChat = false, rewind = true, mac = isMacPlatform() } = {}) {
  const rows = (list) => list.filter((row) => (!row.fastOnly || fastMode) && (!row.sideChatOnly || sideChat) && (!row.rewindOnly || rewind))
    .map(({ fastOnly, sideChatOnly, rewindOnly, otherKeys, ...row }) => (!mac && otherKeys ? { ...row, keys: otherKeys } : row));
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
export function globalShortcutCommand(event, { mac = isMacPlatform() } = {}) {
  if (!event) return null;
  if (!mac) return nonMacShortcutCommand(event);
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

// Windows / Linux (the official "non-mac" rows, shared-1 Wy: cmd → ctrl). The Windows key (metaKey) is never part of a
// chord. Collisions with the Ctrl-only Mac chords, resolved deliberately:
// - Ctrl+B is toggle_sidebar (official non-mac binding, View › Show/Hide Sidebar CmdOrCtrl+B); Background tasks
//   (⌃B on the Mac) moves to Ctrl+Shift+B, which nothing else binds here.
// - Ctrl+O stays cycleTranscriptMode (the official binding has no platform; Claude Code's own Ctrl+O). Where the
//   renderer leaves it unhandled (no session view) File › Open File… (CmdOrCtrl+O) still applies, as on the Mac with ⌃O.
// - ⌘[ / ⌘] (Back / Forward) are Alt+← / Alt+→ (the Windows convention; Ctrl+[ / Ctrl+] focus split panes).
// - ⌥⌘ chords are Ctrl+Alt; an AltGr press (Ctrl+Alt with AltGraph, which types a character) is no chord.
// - ⌘⌥↑ / ⌘⌥↓ (previous / next prompt) are Alt+↑ / Alt+↓ (official jump_prev_prompt non-mac).
function nonMacShortcutCommand(event) {
  const ctrl = !!event.ctrlKey, alt = !!event.altKey, shift = !!event.shiftKey;
  if (event.metaKey || event.isComposing) return null;
  if (ctrl && alt && event.getModifierState?.("AltGraph")) return null;
  if (ctrl && !alt && event.key === ",") return "settings";
  const plain = ctrl && !alt && !shift;
  if (plain && event.code === "KeyB") return "toggle-sidebar";
  if (alt && !ctrl && !shift && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return event.key === "ArrowLeft" ? "back" : "forward";
  if (plain && typedChar(event, "p", "KeyP")) return "go-to-file";
  if (plain && event.code === "Slash") return "shortcuts";
  if (ctrl && shift && !alt && event.code === "KeyK") return "search-palette";
  if (ctrl && !alt && !shift && event.key?.toLowerCase() === "n") return "new-session";
  if (ctrl && !alt && event.code === "Backslash") return shift ? "expand-pane" : "close-pane";
  if (ctrl && !alt && typedChar(event, "w", "KeyW")) return shift ? null : "close-session";
  if (ctrl && shift && !alt && typedChar(event, "t", "KeyT")) return "reopen-closed";
  if (plain && event.code === "KeyO") return "transcript-view";
  if (ctrl && shift && !alt && event.code === "KeyB") return "background-tasks";
  if (plain && event.code === "KeyU") return "file-upload";
  if (alt && !ctrl && !shift && (event.key === "ArrowUp" || event.key === "ArrowDown")) return event.key === "ArrowUp" ? "jump-prev-prompt" : "jump-next-prompt";
  if (plain && event.key?.toLowerCase() === "k") return "search";
  if (ctrl && alt && !shift) {
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
