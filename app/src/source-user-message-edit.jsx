// R4i-cowork CW4 (research-ext/X2-cowork-session-actions.md CW-5): a Cowork session's inline edit of its last human
// message, after 2.42304.0 cc1aae219-DjR8LnUv.js. The closure (VY's stores and hooks, JY's attachment tiles and drive
// copies, shared-2 WX/UX UserMessage with its overflow, beside-actions and collapse machinery, shared-frame RT TextArea)
// is far wider than the Cowork edit uses, so this file is a host port of the pieces it does use, with the original's DOM,
// class strings and decisions:
//   VY (useEdits): `currentEdit` / `editSubmitted`, startEdit `m(n?.draft??F)` + `y(n?.modelOverride)`, finishEdit
//     `if(h||f.length===0||f.trim().length===0&&f!==F||!n||…)return; n.emit("edit",{message:N,text:f,modelOverride:_??d,
//     isModelRetry:_!==void 0,entryPoint:b}) … R()`, cancelEdit `R()`.
//   HY (save disabled): editSubmitted, empty / whitespace-only changed text, `!requestedModelOverride && !hasRemovals &&
//     originalText === currentEdit`, `isCoworkSession && isStreaming` (hub / org / quota / wiggle terms: none here).
//   UY / WY / GY: a Cowork session's note is "restart" → "Saving sends this as your latest message and restarts from
//     here." (4DHkqcnzeZ), shown as the Info tooltip with the "About saving" label.
//   qY → JY → WX editing: `pb-6` › `flex flex-col items-end` › data-cds UserMessage › the surface-1 card bubble holding the
//     bare autosizing TextArea and its field-sizing fallback mirror › the xs row [note] Cancel (ghost) Save (primary).
//   UX keys: ⌘/Ctrl+A selects the field, Escape (stopPropagation) cancels, Enter without Shift saves (`saveOnPlainEnter`:
//     shared-3 nW is true on the desktop), never while composing.
// The edit store stands in for the official `Ou`/`fl` requestEdit store (one edit open per Cowork session).
// Host differences (CW4 report): no attachments to keep or remove (Cowork sends text only), no edit-box arrow navigation
// (`Jl`: only the last message is editable), no HX focus handoff, no entrance animation, no telemetry.
import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CdsButton, CdsIcon, CdsTooltip, cdsClassNames } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { t } from '../electron/i18n/index.mjs';

// ---------------------------------------------------------------- the edit store (Ou / fl requestEdit)

let editing = Object.freeze({});
const listeners = new Set();
const publish = (next) => { editing = Object.freeze(next); for (const listener of listeners) listener(); };
export const coworkMessageEdits = Object.freeze({
  /** requestEdit(sessionId, messageUuid, {entryPoint, modelOverride, draft}) */
  start(sessionId, uuid, { entryPoint = 'human_message_hover', modelOverride, draft } = {}) {
    if (!sessionId || !uuid) return;
    publish({ ...editing, [sessionId]: { uuid, entryPoint, modelOverride, draft } });
  },
  clear(sessionId) {
    if (!sessionId || !editing[sessionId]) return;
    const next = { ...editing }; delete next[sessionId]; publish(next);
  },
  get: (sessionId) => editing[sessionId] ?? null,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
});
/** The open edit of one Cowork session, {uuid, entryPoint, modelOverride, draft} or null. */
export function useCoworkMessageEdit(sessionId) {
  return useSyncExternalStore(coworkMessageEdits.subscribe, () => coworkMessageEdits.get(sessionId), () => coworkMessageEdits.get(sessionId));
}

// ---------------------------------------------------------------- HY / UY / WY

/** cc1aae219 HY: whether Save is disabled. */
export function editSaveDisabled({ currentEdit, originalText, editSubmitted = false, requestedModelOverride, hasRemovals = false,
  isCoworkSession = true, isStreaming = false, wigglePending = false, hubMutationLocked = false, hubEditUnsupported = false,
  orgSendBlocked = false, quotaHeld = false }) {
  return editSubmitted === true || currentEdit.length === 0 || currentEdit.trim().length === 0 && currentEdit !== originalText
    || wigglePending || hubMutationLocked || hubEditUnsupported === true || orgSendBlocked === true || quotaHeld === true
    || !requestedModelOverride && !hasRemovals && originalText === currentEdit || isCoworkSession && isStreaming;
}
/** cc1aae219 UY: the note kind. */
export function editNoteKind({ isCoworkSession, queuedResend = false, hideBranchVersionNav = false }) {
  return queuedResend ? 'resend' : isCoworkSession || hideBranchVersionNav ? 'restart' : 'branch';
}
/** cc1aae219 WY (the "resend" note is a runtime-catalog id, hnwsha, with no text in the bundle). */
export function editNote(kind) {
  switch (kind) {
    case 'restart': return t('Saving sends this as your latest message and restarts from here.');
    case 'branch': return t('Making changes creates a new branch in the conversation.');
    default: return undefined;
  }
}

// ---------------------------------------------------------------- class strings (shared-2 / shared-frame originals)

// shared-2 yY / bY / NX.
const BUBBLE = 'rounded-[var(--cds-message-bubble-radius)] px-[var(--cds-message-bubble-pad-x)] py-[var(--cds-message-bubble-pad-y)]';
const MEASURE = 'max-w-[var(--cds-message-bubble-measure)]';
const FIELD_MAX = 'max-h-[min(40svh,24rem)]';
// shared-frame RT with bare + autosize + rows 1 (`X("cds-reset",C,i?"block resize-none border-0 bg-transparent p-0
// shadow-none":…,"font-sans text-body text-primary placeholder:text-muted outline-none focus-visible:outline-hidden
// disabled:opacity-disabled",y,x,e)`), e = UX's `${NX} overflow-y-auto text-heading font-normal [@supports_not_…]`.
const TEXTAREA = cdsClassNames('cds-reset', 'w-full', 'block resize-none border-0 bg-transparent p-0 shadow-none',
  'font-sans text-body text-primary placeholder:text-muted outline-none focus-visible:outline-hidden disabled:opacity-disabled',
  '[field-sizing:content]', 'min-h-[calc(var(--cds-textarea-rows)*1lh)]',
  `${FIELD_MAX} overflow-y-auto text-heading font-normal [@supports_not_(field-sizing:content)]:absolute [@supports_not_(field-sizing:content)]:inset-0 [@supports_not_(field-sizing:content)]:h-full`);
const MIRROR = `${FIELD_MAX} cds-text-entry-floored pointer-events-none invisible min-w-px overflow-y-auto font-sans text-heading font-normal break-words whitespace-pre-wrap select-none [@supports_(field-sizing:content)]:hidden`;

/**
 * The open editor of a Cowork user message (qY › JY › WX editing).
 * @param {object} props
 * @param {string} props.originalText the message's text (VY `F`)
 * @param {{entryPoint?: string, modelOverride?: string, draft?: string}} [props.request] the store's edit request
 * @param {boolean} [props.isStreaming] the session has a live turn (JY `k`)
 * @param {(text: string, options: {modelOverride?: string, isModelRetry: boolean, entryPoint?: string}) => void} props.onSave
 *   mk's editMessage (ho) through the action emitter
 * @param {() => void} props.onClose R(): close the editor
 * @param {boolean} [props.saveOnPlainEnter] shared-3 nW
 */
export function SourceUserMessageEdit({ originalText = '', request = null, isStreaming = false, onSave, onClose, saveOnPlainEnter = true }) {
  const [currentEdit, setCurrentEdit] = useState(() => request?.draft ?? originalText);
  const [editSubmitted, setEditSubmitted] = useState(false);
  const requestedModelOverride = request?.modelOverride;
  const field = useRef(null);
  const bodyId = useId();
  const disabled = editSaveDisabled({ currentEdit, originalText, editSubmitted, requestedModelOverride, isCoworkSession: true, isStreaming });
  const note = editNote(editNoteKind({ isCoworkSession: true }));
  const finishEdit = () => {
    if (editSubmitted || currentEdit.length === 0 || currentEdit.trim().length === 0 && currentEdit !== originalText || typeof onSave !== 'function') return;
    onSave(currentEdit, { modelOverride: requestedModelOverride, isModelRetry: requestedModelOverride !== undefined, entryPoint: request?.entryPoint });
    onClose?.();
  };
  // JY `ie=()=>{re||i(…)}`: Save and Enter go through the disabled check first.
  const save = () => { if (!disabled) finishEdit(); };
  // UX: focus the field with the caret at the end when editing starts (`editAutoFocus` defaults to true).
  useLayoutEffect(() => {
    const node = field.current;
    if (!node || node.ownerDocument?.activeElement === node) return;
    const end = node.value.length;
    node.setSelectionRange?.(end, end);
    node.focus?.({ preventScroll: true });
    node.scrollTop = node.scrollHeight;
  }, []);
  useEffect(() => { if (request?.draft !== undefined) setCurrentEdit(request.draft); }, [request?.draft]);
  const onKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) return;
    if (event.key === 'a' && (event.metaKey || event.ctrlKey)) event.currentTarget.select();
    if (event.key === 'Escape') { event.stopPropagation(); onClose?.(); }
    if (event.key === 'Enter' && !event.shiftKey) {
      if (!saveOnPlainEnter && !event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      save();
    }
  };
  return <div className="pb-6" data-cowork-edit="">
    <div className="flex flex-col items-end">
      <div data-cds="UserMessage" className="group/message-row flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end">
        <div className={cdsClassNames('relative flex min-w-0 flex-col gap-xs', BUBBLE, 'text-heading font-normal break-words select-text', 'text-primary', MEASURE,
          'bg-surface-1 shadow-card-ring transition duration-fast focus-within:shadow-focus')}>
          <div id={bodyId}>
            <div className="cds-user-message-body [@supports_not_(field-sizing:content)]:relative">
              <textarea ref={field} data-cds="TextArea" rows={1} style={{ '--cds-textarea-rows': 1 }} value={currentEdit}
                onChange={(event) => setCurrentEdit(event.target.value)} onKeyDown={onKeyDown} aria-label={t('Edit message')} className={TEXTAREA} />
              <div aria-hidden={true} data-find-omitted="" className={MIRROR}>{`${currentEdit}​`}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-xs" data-size="xs">
          {note != null && <CdsTooltip content={note} side="top" hoverable={true}>
            <span tabIndex={0} role="img" aria-label={t('About saving')}
              className="flex rounded-[2px] text-secondary outline-none focus-visible:outline-hidden focus-visible:shadow-focus">
              <CdsIcon name="Info" size="sm" />
            </span>
          </CdsTooltip>}
          <CdsButton size="xs" variant="ghost" onClick={() => onClose?.()} type="button" data-cowork-edit-action="cancel">{t('Cancel')}</CdsButton>
          <CdsButton size="xs" variant="primary" disabled={disabled} onClick={save} type="button" data-cowork-edit-action="save">{t('Save')}</CdsButton>
        </div>
      </div>
    </div>
  </div>;
}
