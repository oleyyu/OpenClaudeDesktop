// B29 Suggested tasks under the Home composer (cc43287c9 l0 data hook :30467-30552, v0 chip :30676-30751, A0 chips
// :31089-31160, m0 'Suggested tasks' dialog :30574-30675 with its h0 rows, j0 take/delete :31162-31290). A folder's
// backlog (main task-backlog.cjs: spawn_task suggestions put away without starting them) shows as up to three joined
// chips — the title (eight words at most; the full title and tldr in the tooltip) and an X — then 'See # more', which
// opens the whole list. Taking a task puts its prompt in the message box and takes it off the list; X deletes it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// W14-code r6 R6DC-02: cc43287c9 Hse / Bse / Gse buttons are shared-frame Uu (`B`), the chip is the joined ButtonGroup (`Oe`).
import { CdsButton, CdsButtonGroup } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { SourceTooltip } from "./source-tooltip.jsx";
import { SourceDialog } from "./source-dialog.jsx";
import { BACKLOG_CHIPS, BACKLOG_LIMIT, TAKE_GUARD_MS, backlogDetail, backlogTitle, chipLabel, restoreItem, withoutItem } from "./task-backlog-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-task-backlog.css";

const EMPTY = Object.freeze([]);
// s0/c0: the last eight folders' lists stay in memory, so going back to a folder paints its chips at once.
const cache = new Map();
function remember(folder, items) {
  cache.delete(folder);
  cache.set(folder, items);
  while (cache.size > 8) cache.delete(cache.keys().next().value);
}

/** l0: the folder's backlog ({items, settled, remove}); a failed read keeps what was shown (or nothing). */
export function useTaskBacklog(folder, call, onError) {
  const [, rerender] = useState(0);
  const removed = useRef(new Set());
  const [answer, setAnswer] = useState({ folder: null, answered: false });
  if (answer.folder !== folder) setAnswer({ folder, answered: false });
  useEffect(() => {
    if (!folder || !call) return undefined;
    let cancelled = false;
    const keep = (list) => {
      if (cancelled) return;
      remember(folder, (Array.isArray(list) ? list : []).filter((item) => item && !removed.current.has(item.id)));
      rerender((count) => count + 1);
    };
    call("task-backlog-list", { cwd: folder, limit: BACKLOG_LIMIT })
      .then(keep, () => { if (!cache.has(folder)) keep(EMPTY); })
      .then(() => { if (!cancelled) setAnswer({ folder, answered: true }); });
    return () => { cancelled = true; };
  }, [folder, call]);
  const remove = useCallback((id, taken) => {
    if (!folder) return;
    const before = cache.get(folder) ?? EMPTY;
    const item = before.find((entry) => entry.id === id);
    removed.current.add(id);
    remember(folder, withoutItem(before, id));
    rerender((count) => count + 1);
    call("task-backlog-dismiss", { id, taken }).catch(() => {
      removed.current.delete(id);
      remember(folder, restoreItem(cache.get(folder) ?? EMPTY, item));
      rerender((count) => count + 1);
      onError?.(taken ? t("Couldn’t take this task off the list. It will show up again.") : t("Couldn’t delete this task. Try again."));
    });
  }, [folder, call, onError]);
  const items = (folder && cache.get(folder)) || EMPTY;
  const settled = !folder || cache.has(folder) || answer.answered;
  return { items, settled, remove };
}

/** 3.6556.2 cc43287c9 Hse: one joined chip — the title button (tooltip: full title + tldr) and Delete. */
function BacklogChip({ item, position, onTake, onDelete, onPointerFocus }) {
  const title = backlogTitle(item), detail = backlogDetail(item);
  // Hse d: a chip focused by the pointer hands focus straight back to the message box (only the keyboard parks on it).
  const pointerFocus = (event) => { if (!event.currentTarget.matches(":focus-visible")) onPointerFocus?.(); };
  // Hse: `Oe({"data-task-backlog-chip":"",variant:"joined",buttonVariant:"secondary",size:"xs","aria-label":k,
  // className:"min-w-0 max-w-full shrink"})` > [ae tooltip > B("min-w-0 shrink") > span.truncate, B X tooltip "Delete"].
  return (
    <CdsButtonGroup data-task-backlog-chip="" variant="joined" buttonVariant="secondary" size="xs" aria-label={title} className="min-w-0 max-w-full shrink">
      <SourceTooltip content={title} detail={detail || undefined}>
        <CdsButton className="min-w-0 shrink" onFocus={pointerFocus}
          aria-label={t("Put “{title}” in the message box", { title })}
          onClick={(event) => { event.stopPropagation(); onTake(item, position, { keyboard: event.detail === 0 }); }}>
          <span className="truncate">{chipLabel(title)}</span>
        </CdsButton>
      </SourceTooltip>
      <CdsButton icon="X" iconOnly data-task-backlog-delete="" onFocus={pointerFocus}
        aria-label={t("Delete “{title}”", { title })} tooltip={t("Delete")}
        onClick={(event) => { event.stopPropagation(); onDelete(item, position, { keyboard: event.detail === 0 }, event.currentTarget); }} />
    </CdsButtonGroup>
  );
}

/** 3.6556.2 cc43287c9 Bse: a dialog row — the task (title, tldr) puts it in the message box; X deletes it. */
function BacklogRow({ item, position, onTake, onDelete }) {
  const title = backlogTitle(item), detail = backlogDetail(item);
  const detailId = `stb-detail-${item.id}`;
  return (
    <li className="flex items-center gap-xs">
      <CdsButton variant="ghost" flush className="h-auto min-h-control min-w-0 flex-1 justify-start whitespace-normal py-xs text-start"
        aria-label={t("Put “{title}” in the message box", { title })}
        aria-describedby={detail ? detailId : undefined} onClick={(event) => onTake(item, position, { keyboard: event.detail === 0 })}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 text-body text-primary [overflow-wrap:anywhere]">{title}</span>
          {detail ? <span id={detailId} className="truncate text-body text-secondary">{detail}</span> : null}
        </span>
      </CdsButton>
      <CdsButton variant="ghost" size="sm" icon="X" iconOnly flush="end" className="shrink-0" data-task-backlog-delete=""
        aria-label={t("Delete “{title}”", { title })} tooltip={t("Delete")}
        onClick={(event) => {
          const row = event.currentTarget.closest("li"), next = row?.nextElementSibling ?? row?.previousElementSibling;
          if (onDelete(item, position, { keyboard: event.detail === 0 })) next?.querySelector("[data-task-backlog-delete]")?.focus();
        }} />
    </li>
  );
}

/**
 * j0 (non-list form) under the Home composer: chips for the chosen folder's backlog plus the 'Suggested tasks'
 * dialog. onTake(prompt) puts the prompt in the message box and returns whether it did; onFocusComposer returns focus
 * to the message box when the focused chip goes away.
 */
export function SourceTaskBacklog({ folder, call, onTake, onFocusComposer, onError }) {
  const { items, remove } = useTaskBacklog(folder || null, call, onError);
  // j0 l: the chips form shows the chosen folder's own list (the last settled list is kept only by the O0 list form),
  // so a chip never belongs to the previous folder.
  const list = items;
  const [openFor, setOpenFor] = useState(null);
  const open = !!folder && openFor === folder;
  const wasOpen = useRef(false);
  if (open) wasOpen.current = true;
  const seeAll = useRef(null);
  const lastTake = useRef(0);
  const listRef = useRef(null);
  // m0 initialFocus: the first task in the list.
  const firstRow = useMemo(() => ({ get current() { return listRef.current?.querySelector("button") ?? null; } }), []);
  const take = useCallback((item, _position, how) => {
    const now = Date.now();
    // j0 C: only a pointer take within 500 ms of the last one is a double click.
    if (!how?.keyboard && now - lastTake.current < TAKE_GUARD_MS) return false;
    const taken = onTake?.(item.prompt) === true;
    if (taken) { lastTake.current = now; remove(item.id, true); }
    return taken;
  }, [onTake, remove]);
  const del = useCallback((item, _position, { keyboard }) => {
    const now = Date.now();
    if (!keyboard) {
      if (now - lastTake.current < TAKE_GUARD_MS) return false;
      lastTake.current = now;
    }
    if (list.length <= 1) setOpenFor(null);
    remove(item.id, false);
    return true;
  }, [list.length, remove]);
  const chipTake = useCallback((item, position, how) => {
    if (!take(item, position, how) && !how.keyboard) onFocusComposer?.();
  }, [take, onFocusComposer]);
  const chipDelete = useCallback((item, position, how, button) => {
    const chip = button.closest("[data-task-backlog-chip]");
    const neighbour = how.keyboard ? (chip?.nextElementSibling?.querySelector("[data-task-backlog-delete]") ?? chip?.previousElementSibling?.querySelector("[data-task-backlog-delete]")) : null;
    const deleted = del(item, position, how);
    // y0 c: a keyboard delete moves to the neighbour's X (else the message box); a pointer delete returns to the box.
    if (!how.keyboard) onFocusComposer?.();
    else if (deleted) { if (neighbour) neighbour.focus(); else onFocusComposer?.(); }
  }, [del, onFocusComposer]);
  const rowTake = useCallback((item, position, how) => { if (take(item, position, how)) setOpenFor(null); }, [take]);
  const more = list.length - BACKLOG_CHIPS;
  const visible = useMemo(() => list.slice(0, BACKLOG_CHIPS), [list]);
  if (!folder || list.length === 0) return null;
  return (
    <>
      {/* Gse: `flex min-w-0 flex-wrap items-center gap-sm ${c}` with Jse's className "pr-[96px]"; stb-chips keeps the host slot's top gap. */}
      <div className="stb-chips flex min-w-0 flex-wrap items-center gap-sm pr-[96px]" role="group" aria-label={t("Suggested tasks")} data-task-backlog="">
        {visible.map((item, position) => <BacklogChip key={item.id} item={item} position={position} onTake={chipTake} onDelete={chipDelete} onPointerFocus={onFocusComposer} />)}
        {more > 0 && (
          <CdsButton ref={seeAll} variant="ghost" size="sm" className="text-secondary" aria-haspopup="dialog" aria-expanded={open}
            onClick={(event) => { event.stopPropagation(); setOpenFor(folder); }}>
            {t("See {count} more", { count: more })}
          </CdsButton>
        )}
      </div>
      <SourceDialog open={open} onClose={() => setOpenFor(null)} title={t("Suggested tasks")} size="md" className="epitaxy-root break-words" initialFocusRef={firstRow}
        // m0 finalFocus: back to 'See # more', or the message box when that button is gone (or a take already moved focus there).
        onExited={() => { if (!wasOpen.current) return; wasOpen.current = false; const active = document.activeElement; if (!active || active === document.body) onFocusComposer?.(); }}>
        <ul ref={listRef} role="list" className="flex flex-col gap-0.5">
          {list.map((item, position) => <BacklogRow key={item.id} item={item} position={position} onTake={rowTake} onDelete={del} />)}
        </ul>
      </SourceDialog>
    </>
  );
}
