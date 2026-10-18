import { buttonPressHandlers } from './button-press.mjs';
// Ordinary user-message actions row. The row always occupies one control
// height (24px) so that revealing controls never moves the following turn;
// until the turn is interacted with, only an aria-hidden reservation and a
// keyboard-reachable "Show message actions" sentinel exist. Copy writes the
// canonical user text exactly. BY (scroll-messages-current.js:39683) puts the
// OY timestamp BEFORE Copy; locally it is the turn's Codex startedAt and is
// omitted when that is null. After Copy: Rewind to here (jY, :33919
// ArrowCounterClockwise; disabled with its reason while the agent works) and
// Fork from here (wi.Action ArrowSplitRight), only where the caller says the
// session can do them (message-actions-model.mjs userMessageActions).
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { SourceTooltip, SourceTooltipGroup } from './source-tooltip.jsx';
import { createTurnClipboardFeedback, preventRepeatedSelection, turnFooterKeyIndex } from './turn-footer-behavior.mjs';
import { clipboardEnvironment, writeClipboardPayload } from './clipboard-payload.mjs';
import { markdownToClipboardHtml } from './rich-copy-html.mjs';
import { SourceTimestamp } from './source-timestamp.jsx';
import './source-user-actions.css';
import { t } from '../electron/i18n/index.mjs';

function useCoarseInput(root) {
  const [coarse, setCoarse] = useState(false);
  useLayoutEffect(() => {
    const media = root.current?.ownerDocument.defaultView?.matchMedia?.('(pointer: coarse), (hover: none)');
    if (!media) return;
    const changed = () => setCoarse(media.matches);
    changed(); media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [root]);
  return coarse;
}

function useUserCopyFeedback(identity, text, button) {
  const [state, setState] = useState('idle');
  const controller = useRef(null);
  useLayoutEffect(() => {
    const feedback = createTurnClipboardFeedback({
      trim: false,
      // Rich text/plain + text/html write with silent plain fallback; the HTML
      // is derived at click time from the same Markdown as the plain payload.
      write: payload => writeClipboardPayload(clipboardEnvironment(button.current), payload),
      getHtml: markdownToClipboardHtml,
      onState: setState,
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, [button]);
  useLayoutEffect(() => { controller.current?.setContent(identity, text); }, [identity, text]);
  return { state, copy: () => controller.current?.copy() };
}

// wi.Action: a ghost icon button with its label as the tooltip; a disabled one (jY under Wr) explains why instead.
// cd5a31703 NI / PI (:25793-25843): an enabled Rewind / Fork also explains itself — the tooltip's detail line and the
// button's aria-description (EI.rewind / EI.fork); a disabled Rewind shows only its reason.
function UserAction({ icon, label, detail = null, onClick = null, disabledReason = null, action, testId }) {
  const disabled = typeof onClick !== 'function';
  return <SourceTooltip content={label} detail={disabled ? undefined : detail || undefined} automatic={true} hoverable={false} disabledReason={disabled ? disabledReason || undefined : undefined}>
    <button type="button" className="sua-copy sua-action" data-cds="Button" data-variant="ghost" data-cds-icon-only="" data-cds-ghost=""
      data-message-action={action} data-testid={testId} aria-label={label} aria-description={disabled ? undefined : detail || undefined} disabled={disabled} tabIndex={-1}
      {...buttonPressHandlers}
      onClick={disabled ? undefined : () => onClick()}>
      <span className="sua-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
      <Icon name={icon} size={16} />
    </button>
  </SourceTooltip>;
}

function UserActions({ identity, itemId, text, startedAtMs, interacted, rewind = null, onFork = null }) {
  const root = useRef(null), copyButton = useRef(null), focusRequested = useRef(false);
  const [latched, setLatched] = useState(false);
  const coarse = useCoarseInput(root);
  const mounted = latched || interacted || coarse;
  const statusId = useId();
  const { state, copy } = useUserCopyFeedback(identity, text, copyButton);
  useLayoutEffect(() => { if (mounted) setLatched(true); }, [mounted]);
  useLayoutEffect(() => {
    if (!mounted || !focusRequested.current) return;
    focusRequested.current = false;
    copyButton.current?.focus();
  }, [mounted]);
  const showActions = () => { focusRequested.current = true; setLatched(true); };
  const copied = state === 'copied', failed = state === 'error';
  const announcement = copied ? t('Copied') : failed ? t('Couldn’t copy to the clipboard. Try again.') : '';
  return <div ref={root} className="sua-row" data-user-actions-id={itemId}>
    {!mounted ? <div className="sua-deferred" data-find-omitted="">
      <span className="sua-placeholder" aria-hidden="true" />
      <button type="button" className="sua-show-actions sua-sr-only" onFocusCapture={showActions}
        onClick={showActions}>{t("Show message actions")}</button>
    </div> : <div className="sua-toolbar" data-cds="MessageActions" data-reveal="fade"
      role="toolbar" aria-label={t("Message actions")} tabIndex={-1}
      onKeyDown={event => {
        // Roving focus over Copy and, where offered, Rewind to here / Fork from here.
        const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
        const index = turnFooterKeyIndex(event, { count: buttons.length,
          current: buttons.indexOf(event.currentTarget.ownerDocument.activeElement),
          rtl: event.currentTarget.ownerDocument.defaultView.getComputedStyle(event.currentTarget).direction === 'rtl' });
        if (index !== null) { event.preventDefault(); buttons[index]?.focus(); }
      }}>
      <SourceTooltipGroup>
        {startedAtMs != null && <SourceTimestamp dateMs={startedAtMs} />}
        <SourceTooltip content={t("Copy")} automatic={true} hoverable={false}>
          <button ref={copyButton} type="button" className="sua-copy" data-cds="Button" data-variant="ghost"
            data-cds-icon-only="" data-cds-ghost=""
            aria-label={t("Copy")} aria-describedby={failed ? statusId : undefined} tabIndex={0}
            onMouseDown={event => {
              const editable = Boolean(event.target.closest?.("input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])"));
              if (preventRepeatedSelection({ detail: event.detail, button: event.button, editable })) event.preventDefault();
            }}
            {...buttonPressHandlers}
            onClick={() => { void copy(); }}>
            <span className="sua-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
            <Icon name={copied ? 'Check' : 'Copy'} size={16} />
          </button>
        </SourceTooltip>
        {/* R4i-cowork CW3: a Cowork session's 2.42304.0 cc1aae219 DN — ghost icon-only ArrowCounterClockwise,
            "data-testid":"user-message-rewind", aria-label formatMessage(r_().restartFromHere) (shared-78 lHlImYcnSM
            "Restart conversation from here"), onClick e(t) = mk's mo. DN carries no detail line. */}
        {rewind?.kind === 'restart' && <UserAction action="restart" testId="user-message-rewind" icon="ArrowCounterClockwise"
          label={t("Restart conversation from here")} onClick={rewind.onClick ?? null} />}
        {/* R4i-cowork CW4: cc1aae219 `xe.showEdit&&o&&y(Hs.EditAction,{"data-testid":"user-message-edit",…,onClick:()=>{…o()}})`
            — shared-2 pX: ghost icon-only "Edit", aria-label G("edit","Edit"); `o` is VY's startEdit (the editor opens). */}
        {rewind?.kind === 'restart' && typeof rewind.edit === 'function' && <UserAction action="edit" testId="user-message-edit" icon="Edit"
          label={t("Edit")} onClick={rewind.edit} />}
        {rewind && rewind.kind !== 'restart' && <UserAction action="rewind" icon="ArrowCounterClockwise" label={t("Rewind to here")} detail={t("Removes this message and everything after it.")}
          onClick={rewind.onClick ?? null} disabledReason={rewind.disabledReason} />}
        {typeof onFork === 'function' && <UserAction action="fork" icon="ArrowSplitRight" label={t("Fork from here")}
          detail={t("Starts a new session from this point. This one stays as it is.")} onClick={onFork} />}
      </SourceTooltipGroup>
      <span id={statusId} className="sua-status sua-sr-only" role="status">{announcement}</span>
    </div>}
  </div>;
}

/** Mounted by the user article only when the message has copyable text. The
 * article owns the pointer/focus latch and the hover reveal scope. */
// rewind: null (not offered) | {onClick} | {disabledReason} (offered, unavailable while the agent works)
//   | {kind: 'restart', onClick} (a Cowork session's Restart conversation from here, R4i-cowork CW3); onFork: null | fn.
export function SourceUserActions({ sessionKey, itemId, text = '', startedAtMs = null, interacted = false, rewind = null, onFork = null }) {
  const identity = JSON.stringify(['user', sessionKey, itemId]);
  return <UserActions key={identity} identity={identity} itemId={itemId} text={text} startedAtMs={startedAtMs} interacted={interacted} rewind={rewind} onFork={onFork} />;
}
