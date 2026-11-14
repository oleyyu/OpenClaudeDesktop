// W13 w13-chatui-sidebar-star: the Chat session row menu (official 3.6556.2 shared-16 fm for a hub session with
// sessionType "chat", as shared-22's sidebar row configures it). The entries, their order, icons, hotkeys and copy come
// from chat-starred-model.mjs (official evidence there); this file renders them on the host SourceMenu primitive the
// sidebar's other menus use, and runs the host actions. No view-tabs import (R6 n/a).
import React, { useEffect, useRef } from "react";
import { SourceMenu } from "./source-menu";
import { RegisterSidebarMenuRow } from "./generated/code-current/sidebar-menu-groups.mjs";
import { movePinned, sessionArchived, sessionState } from "./sidebar-model";
import { t } from "../electron/i18n/index.mjs";
import { chatRowHotkeys, chatRowMenuEntries, chatSessionStarred, chatTitleMenuEntries } from "./chat-starred-model.mjs";

// Same editable-target rule as the sidebar's session menu (source-sidebar.jsx EDITABLE_SELECTOR).
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]';

/**
 * fm's body for a Chat row: [Mark as read / unread | —] Pin / Unpin, Rename, [— Move up, Move down], —, Delete.
 * Letter hotkeys (fm `Df(vt)`: p u r d) run while the menu is open, never from an editable target.
 * onAction(action, session, payload) is the sidebar's runAction; onRename starts the inline rename; onDelete(session)
 * opens the hm "Delete chat" confirm; onClose closes the menu.
 */
// projectItems (w13-chatfn-projects): fm's project block (shared-16 yf: Add to project / Change project, Remove from
// project), rendered right after Rename, as fm orders it.
export function SourceChatRowMenu({ session, metadata = {}, state = {}, pinnedSiblings = null, onAction, onRename, onDelete, onClose, projectItems = null }) {
  // shared-22 `readState: Ms(n.sessionId, {isRunning: !X && (t.isRunning || ge), …})`, X = `!!n.isArchived`: an archived
  // row is never running for the read toggle (w13-close-cowork-sidebar, chatui-sidebar-star-02).
  const running = !sessionArchived(session) && (sessionState(session, state) === "working" || !!state.active?.[session.id]);
  const starred = chatSessionStarred(metadata);
  const pinnedIndex = pinnedSiblings && starred ? pinnedSiblings.indexOf(session.id) : -1;
  const entries = chatRowMenuEntries({ starred, unread: metadata.unread === true, running, canRename: !!onRename, canDelete: !!onDelete,
    pinnedIndex, pinnedCount: pinnedSiblings?.length ?? 0 });
  const run = (action) => {
    onClose?.();
    if (action === "rename") return onRename();
    if (action === "delete") return onDelete(session);
    if (action === "move-up" || action === "move-down") {
      const ids = movePinned(pinnedSiblings, session.id, action === "move-up" ? "up" : "down");
      return ids ? onAction?.("pinned-order", session, { ids }) : undefined;
    }
    return onAction?.(action, session);
  };
  const hotkeys = useRef(new Map());
  hotkeys.current = chatRowHotkeys(entries);
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const handler = (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR)) return;
      const action = hotkeys.current.get(event.key.toLowerCase());
      if (!action) return;
      event.preventDefault(); event.stopPropagation();
      runRef.current(action);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);
  return <div className="source-session-menu-contents" data-chat-row-menu="">
    {entries.map((entry) => entry.kind === "separator" ? <SourceMenu.Separator key={entry.key} />
      : <React.Fragment key={entry.key}><RegisterSidebarMenuRow><SourceMenu.Item data-testid={entry.testId} icon={entry.icon} shortcut={entry.shortcut}
        variant={entry.variant} onClick={() => run(entry.action)}>{t(entry.message.defaultMessage)}</SourceMenu.Item></RegisterSidebarMenuRow>
        {entry.action === "rename" && projectItems}</React.Fragment>)}
  </div>;
}

/**
 * w13-close-cowork-sidebar (chatui-sidebar-star-02): the Chat session title's menu, ca2ef848d F5 → shared-16 om → fm as
 * y5 configures it for a sessionType "chat" session (chat-starred-model.mjs chatTitleMenuEntries, evidence there):
 * [Schedule, Turn into skill, —] Pin / Unpin, Rename, [the move-to-space block], —, Delete. Letter hotkeys p r d.
 * onAction(action, session) runs pin / unpin; onRename opens the rename dialog; onDelete(session) the "Delete chat"
 * confirm; onSchedule / onTurnIntoSkill fill the composer; onClose closes the menu.
 */
export function SourceChatTitleMenu({ session, metadata = {}, onAction, onRename, onDelete, onSchedule, onTurnIntoSkill, onClose, projectItems = null }) {
  const entries = chatTitleMenuEntries({ starred: chatSessionStarred(metadata), canRename: !!onRename, canDelete: !!onDelete,
    scheduleOffered: !!onSchedule, turnIntoSkillOffered: !!onTurnIntoSkill });
  const run = (action) => {
    onClose?.();
    if (action === "rename") return onRename();
    if (action === "delete") return onDelete(session);
    if (action === "schedule") return onSchedule();
    if (action === "turn-into-skill") return onTurnIntoSkill();
    return onAction?.(action, session);
  };
  const hotkeys = useRef(new Map());
  hotkeys.current = chatRowHotkeys(entries);
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const handler = (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR)) return;
      const action = hotkeys.current.get(event.key.toLowerCase());
      if (!action) return;
      event.preventDefault(); event.stopPropagation();
      runRef.current(action);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);
  // The `"<English>|<id>"` zh-CN key first (fm's verb "Schedule" next to the Scheduled page's noun), else the English key.
  const label = ({ defaultMessage, id }) => { const keyed = `${defaultMessage}|${id}`; return t(keyed) === keyed ? t(defaultMessage) : t(keyed); };
  return <div className="source-session-menu-contents" data-chat-title-menu="">
    {entries.map((entry) => entry.kind === "separator" ? <SourceMenu.Separator key={entry.key} />
      : <React.Fragment key={entry.key}><RegisterSidebarMenuRow><SourceMenu.Item data-testid={entry.testId} icon={entry.icon} shortcut={entry.shortcut}
        variant={entry.variant} onClick={() => run(entry.action)}>{label(entry.message)}</SourceMenu.Item></RegisterSidebarMenuRow>
        {entry.action === "rename" && projectItems}</React.Fragment>)}
  </div>;
}
