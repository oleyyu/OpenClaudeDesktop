import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu } from "./source-menu";
import { queuedCountLabel, reorderEntries } from "./queued-messages-model.mjs";
import "./source-queued-messages.css";
import { t } from "../electron/i18n/index.mjs";

// 2.2553.1 QueuedMessageBar (cf74bc599 :4028-4051 fp, :4053-4100 pp single
// row, :4101-4240 mp collapsed button / expanded list, :3913-4027 dp rows)
// over the real Codex queue. Entries are QueuedSubmission records listed by
// thread/queue/list; cancel = thread/queue/delete, edit = delete + restore,
// reorder = thread/queue/reorder. Locked ids are in-flight removals.
// Send now (2.31226.0 cf74bc599 :6926-7262 nS row menu, oS single row, aS button): onSteer promotes an entry into
// the running turn; steeringId is the entry being sent (its ArrowReturn button busy 'Sending…'), and while one is
// in flight the others' Send now waits (steerBusy). sendNow(id) says whether an entry may be promoted.
const stopMouseDown = (event) => event.preventDefault();

function GhostButton({ icon, label, busy = false, busyLabel = t("Removing…"), size = 24, className = "", innerRef, ...props }) {
  return (
    <button type="button" ref={innerRef} aria-label={label} aria-busy={busy || undefined} data-cds="Button" data-size={size === 20 ? "sm" : undefined}
      className={`sc-button sc-icon-button sqm-ghost ${className}`} style={{ width: size, height: size, minWidth: size }} onMouseDown={stopMouseDown} {...props}>
      {busy ? <><span className="sc-spinner" aria-hidden="true" /><span className="sqm-sr-only">{busyLabel}</span></> : <Icon name={icon} size={16} />}
    </button>
  );
}

// aS: the ArrowReturn ghost button, described by a hidden note of what Send now does.
function SendNowButton({ busy, onPress, coreName, size = 24 }) {
  const noteId = useId();
  return (
    <>
      <GhostButton icon="ArrowReturn" label={t("Send now")} busy={busy} busyLabel={t("Sending…")} size={size} className="sqm-send-now"
        aria-describedby={noteId} onClick={() => !busy && onPress()} />
      <span id={noteId} hidden>{coreName ? t("{core} reads this message at its next step.", { core: coreName }) : t("The agent reads this message at its next step.")}</span>
    </>
  );
}

// oS: Send now (while a turn runs), Edit in composer, Remove from queue — in that order.
function SingleRow({ entry, locked, steering, onCancel, onEdit, onSteer, coreName }) {
  const removing = locked && !steering;
  return (
    <div className="sqm-row sqm-single" aria-busy={locked || undefined} data-take-back-entry={entry.id}>
      <span className="sqm-count">{queuedCountLabel(1)}</span>
      <span className="sqm-preview">{entry.preview}</span>
      {(onSteer || steering) && <SendNowButton busy={steering} coreName={coreName} onPress={() => onSteer?.(entry.id)} />}
      {onEdit && !locked && <GhostButton icon="Edit" label={t("Edit in composer")} className="sqm-edit" onClick={() => onEdit(entry.id)} />}
      {onCancel && !steering && <GhostButton icon="X" label={t("Remove from queue")} className="sqm-cancel" busy={removing} onClick={() => !locked && onCancel(entry.id)} />}
    </div>
  );
}

function RowMenu({ entry, locked, onCancel, onEdit, onSteer, steerBusy = false, onOpenChange }) {
  const [anchor, setAnchor] = useState(null);
  const trigger = useRef(null);
  const open = (event) => { setAnchor(event.currentTarget); onOpenChange?.(true); };
  const close = () => { setAnchor(null); onOpenChange?.(false); };
  return (
    <>
      <GhostButton innerRef={trigger} icon="DotsVertical" label={t("Queued message actions")} size={20} className="sqm-menu-trigger"
        aria-haspopup="menu" aria-expanded={!!anchor} onClick={open} />
      {anchor && (
        <SourceMenu.Popup anchor={anchor} side="bottom" align="end" label={t("Queued message actions")} onClose={close}>
          {onEdit && <SourceMenu.Item disabled={locked} onClick={() => onEdit(entry.id)}>{t("Edit in composer")}</SourceMenu.Item>}
          {onSteer && <SourceMenu.Item disabled={locked || steerBusy} onClick={() => onSteer(entry.id)}>{t("Send now")}</SourceMenu.Item>}
          {(onEdit || onSteer) && onCancel && <SourceMenu.Separator />}
          {onCancel && <SourceMenu.Item variant="danger" disabled={locked} onClick={() => onCancel(entry.id)}>{t("Remove from queue")}</SourceMenu.Item>}
        </SourceMenu.Popup>
      )}
    </>
  );
}

// Sortable row: a 5px activation distance pointer drag on the Reorder handle
// (dnd-kit PointerSensor equivalent) plus ArrowUp/ArrowDown on the handle.
function Row({ entry, locked, steering = false, steerBusy = false, onCancel, onEdit, onSteer, sortable, onDragStart, onDragMove, onDragEnd, dragging, anyDragging, onKeyReorder }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = sortable || !!onEdit || !!onCancel || !!onSteer || locked;
  const pinned = dragging || menuOpen || locked;
  // nS P = sortable || busy (h: removing or sending): the wide 120px mask, else the 76px one.
  const wide = sortable || locked;
  const fade = hasActions ? (pinned ? "" : anyDragging && !dragging ? "sqm-hide" : "sqm-reveal") : "";
  const mask = hasActions ? (wide ? "sqm-mask-wide" : "sqm-mask-narrow") : "";
  const maskMode = pinned ? "sqm-mask-on" : anyDragging && !dragging ? "" : "sqm-mask-hover";
  return (
    <div role="listitem" aria-busy={locked || undefined} data-take-back-entry={entry.id} data-dragging={dragging || undefined}
      className={`sqm-item ${dragging ? "sqm-item--dragging" : ""}`}>
      <span className={`sqm-item-text ${locked ? "sqm-item-text--muted" : ""} ${mask} ${maskMode}`}>{entry.preview}</span>
      {hasActions && (
        <span className={`sqm-item-actions ${fade}`}>
          {locked && !steering && <GhostButton icon="X" label={t("Remove from queue")} size={20} busy />}
          {steering && <GhostButton icon="ArrowReturn" label={t("Send now")} size={20} busy busyLabel={t("Sending…")} />}
          {sortable && !locked && (
            <button type="button" aria-label={t("Reorder queued message")} className={`sqm-handle ${dragging ? "sqm-handle--grabbing" : ""}`}
              onMouseDown={stopMouseDown}
              onPointerDown={(event) => onDragStart(entry.id, event)} onPointerMove={(event) => onDragMove(entry.id, event)}
              onPointerUp={(event) => onDragEnd(entry.id, event)} onPointerCancel={(event) => onDragEnd(entry.id, event, true)}
              onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); onKeyReorder(entry.id, event.key === "ArrowUp" ? -1 : 1); } }}>
              <Icon name="Reorder" size={16} />
            </button>
          )}
          {(onEdit || onCancel || onSteer) && !locked && <RowMenu entry={entry} locked={locked} onCancel={onCancel} onEdit={onEdit} onSteer={onSteer} steerBusy={steerBusy} onOpenChange={setMenuOpen} />}
        </span>
      )}
    </div>
  );
}

function MultiEntry({ entries, lockedIds, steeringId = null, sendNow, onCancel, onEdit, onSteer, onReorder, onClearAll }) {
  const [expanded, setExpanded] = useState(false);
  const collapsedButton = useRef(null), collapseButton = useRef(null), handoff = useRef(false);
  const [drag, setDrag] = useState(null);
  const listRef = useRef(null);
  const locked = (id) => lockedIds.includes(id);
  useLayoutEffect(() => {
    if (handoff.current) { handoff.current = false; (expanded ? collapseButton : collapsedButton).current?.focus(); }
  }, [expanded]);
  useEffect(() => {
    if (!drag) return undefined;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => { document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [drag]);
  const toggle = (next, ref) => { handoff.current = document.activeElement === ref.current; setExpanded(next); };
  const clearAll = () => { if (onClearAll) { onClearAll(); return; } if (onCancel) for (const entry of entries) if (!locked(entry.id)) onCancel(entry.id); };
  const dragStart = (id, event) => {
    if (!onReorder || event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false, over: null });
  };
  const dragMove = (id, event) => {
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 5) return;
    const target = document.elementsFromPoint(event.clientX, event.clientY).find((node) => node.matches?.("[data-take-back-entry]") && listRef.current?.contains(node));
    const over = target?.getAttribute("data-take-back-entry") ?? null;
    setDrag((current) => (current ? { ...current, active: true, over } : current));
  };
  const dragEnd = (id, event, cancelled = false) => {
    if (!drag || drag.id !== id) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!cancelled && drag.active && drag.over && drag.over !== id) onReorder(id, drag.over);
    setDrag(null);
  };
  const keyReorder = (id, delta) => {
    const index = entries.findIndex((entry) => entry.id === id);
    const target = entries[index + delta];
    if (target && onReorder) onReorder(id, target.id);
  };
  const preview = drag?.active && drag.over && drag.over !== drag.id ? reorderEntries(entries, drag.id, drag.over) : entries;
  if (!expanded) {
    return (
      <button ref={collapsedButton} type="button" aria-expanded={false} className="sqm-row sqm-collapsed" onClick={() => toggle(true, collapsedButton)}>
        <span className="sqm-count">{queuedCountLabel(entries.length)}</span>
        <span className="sqm-preview">{t("Next: {preview}", { preview: entries[0].preview })}</span>
        <span aria-hidden="true" className="sqm-caret"><Icon name="CaretDown" size={16} /></span>
      </button>
    );
  }
  return (
    <div className="sqm-expanded">
      <div className="sqm-row sqm-header">
        <span className="sqm-count sqm-count--grow">{queuedCountLabel(entries.length)}</span>
        <GhostButton innerRef={collapseButton} icon="CaretUp" label={t("Collapse queued messages")} aria-expanded={true} onClick={() => toggle(false, collapseButton)} />
      </div>
      <div ref={listRef} role="list" aria-label={t("Queued messages")} className="sqm-list">
        {preview.map((entry, index) => (
          <React.Fragment key={entry.id}>
            {index > 0 && <div role="presentation" aria-hidden="true" className="sqm-divider" />}
            <Row entry={entry} locked={locked(entry.id)} onCancel={locked(entry.id) ? undefined : onCancel} onEdit={locked(entry.id) ? undefined : onEdit}
              onSteer={onSteer && !locked(entry.id) && (!sendNow || sendNow(entry.id) || steeringId) ? onSteer : undefined}
              steering={steeringId === entry.id} steerBusy={!!steeringId}
              sortable={!!onReorder && !locked(entry.id)} dragging={drag?.active && drag.id === entry.id} anyDragging={!!drag?.active}
              onDragStart={dragStart} onDragMove={dragMove} onDragEnd={dragEnd} onKeyReorder={keyReorder} />
          </React.Fragment>
        ))}
      </div>
      {onCancel && (
        <div className="sqm-footer">
          <button type="button" className="sqm-clear" onMouseDown={stopMouseDown} onClick={clearAll}>{t("Clear all")}</button>
        </div>
      )}
    </div>
  );
}

export function SourceQueuedMessages({ entries = [], lockedIds = [], steeringId = null, sendNow, coreName, onCancel, onEdit, onSteer, onReorder, onClearAll }) {
  if (!entries.length) return null;
  const head = entries[0], headLocked = lockedIds.includes(head.id);
  const content = entries.length === 1
    ? <SingleRow entry={head} locked={headLocked} steering={steeringId === head.id} coreName={coreName} onCancel={onCancel} onEdit={headLocked ? undefined : onEdit}
      onSteer={onSteer && !headLocked && (!sendNow || sendNow(head.id)) ? onSteer : undefined} />
    : <MultiEntry entries={entries} lockedIds={lockedIds} steeringId={steeringId} sendNow={sendNow} onCancel={onCancel} onEdit={onEdit} onSteer={onSteer} onReorder={onReorder} onClearAll={onClearAll} />;
  return <div className="sqm-band epitaxy-band-enter" data-queued-messages="" data-count={entries.length}>{content}</div>;
}
