import { buttonPressHandlers } from './button-press.mjs';
// Source adapter for the ordinary Code turn-tail MessageActions toolbar.
// Eligibility/turn aggregation and the body-to-footer gap belong to the caller.
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { SourceTooltip, SourceTooltipGroup } from './source-tooltip.jsx';
import { createTurnClipboardFeedback, preventRepeatedSelection, turnFooterKeyIndex } from './turn-footer-behavior.mjs';
import { clipboardEnvironment, writeClipboardPayload } from './clipboard-payload.mjs';
import { markdownToClipboardHtml } from './rich-copy-html.mjs';
import { SourceTimestamp } from './source-timestamp.jsx';
import './source-turn-footer.css';
import { t } from '../electron/i18n/index.mjs';

function useCoarseInput(root) {
  const [coarse, setCoarse] = useState(false);
  useLayoutEffect(() => {
    const window = root.current?.ownerDocument.defaultView;
    const media = window?.matchMedia?.('(pointer: coarse), (hover: none)');
    if (!media) return;
    const changed = () => setCoarse(media.matches);
    changed(); media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [root]);
  return coarse;
}

function useTurnCopyFeedback(identity, text, button) {
  const [state, setState] = useState('idle');
  const controller = useRef(null);
  useLayoutEffect(() => {
    const feedback = createTurnClipboardFeedback({
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

// The pressed look of a ghost Button whose pressedVariant "selected" falls back to the default path
// (shared-frame-BfjMqbuN.js $l, exported cl: ue = le && ghost && !href && _r(fizzy, "color"); the fizzy "color" part
// is off by default, so the button keeps Il ghost "group/btn … aria-pressed:text-accent" and its paint takes gc).
// Used by Pin as chapter (c96d752d0 S6e: Uo.Action {icon: f ? "PinFilled" : "Pin", pressed: f, pressedVariant:
// "selected"}) and Good / Bad response (shared-2 TX.PositiveFeedbackAction hX / NegativeFeedbackAction gX, both
// pressedVariant "selected"). Every class is in the loaded c6a992d55 CSS.
const PRESSED_BUTTON = 'group/btn aria-pressed:text-accent';
const PRESSED_PAINT = 'group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent';
// shared-2 lX (MessageActions, 2.42304.0): the toolbar's button colours, "[&_button]:text-muted" and
// "[&_button:hover:not([aria-pressed=true])]:text-primary". They and PRESSED_BUTTON share @layer utilities, where the
// pressed text-accent (0,2,0) outranks the muted (0,1,1); the host's button reset sits in @layer base (D26), so no
// local rule decides the colour.
const MESSAGE_ACTIONS_COLOR = '[&_button]:text-muted [&_button:hover:not([aria-pressed=true])]:text-primary';
// shared-frame-BfjMqbuN.js Il base: a disabled Button keeps its colour and dims with opacity, unless it is busy
// (aria-busy); it takes no pointer events. S6e (c96d752d0) only passes pressed and onClick to PositiveFeedbackAction /
// NegativeFeedbackAction and never disables them; repeated clicks invoke onRate directly.
const DISABLED_BUTTON = '[&:disabled:not([aria-busy])]:opacity-disabled disabled:pointer-events-none';

// rating {value: 'positive'|'negative'|null, onRate(value)}: Good / Bad response (c96d752d0-BOCqU7c2.js S6e + shared-2
// hX/gX, PositiveFeedbackAction / NegativeFeedbackAction, pressed = the current rating; pressing it again clears it).
function FeedbackButton({ kind, pressed, onRate }) {
  const label = kind === 'positive' ? t('Good response') : t('Bad response');
  const icon = kind === 'positive' ? (pressed ? 'ThumbsUpFilled' : 'ThumbsUp') : (pressed ? 'ThumbsDownFilled' : 'ThumbsDown');
  return <SourceTooltip content={label} automatic={true} hoverable={false}>
    <button type="button" className={`stf-copy stf-feedback ${PRESSED_BUTTON} ${DISABLED_BUTTON}`} data-cds="Button" data-variant="ghost" data-cds-icon-only="" data-cds-ghost=""
      {...buttonPressHandlers} data-feedback={kind} aria-label={label} aria-pressed={pressed} tabIndex={-1}
      onClick={() => onRate(kind)}>
      <span className="stf-button-backdrop" aria-hidden="true"><span data-cds-part="paint" className={PRESSED_PAINT} /></span>
      <Icon name={icon} size={16} />
    </button>
  </SourceTooltip>;
}

function TurnFooter({ identity, turnId, text, completedAtMs, interacted, hovered, focused, rating = null, onFork = null, pin = null }) {
  const root = useRef(null), copyButton = useRef(null), focusRequested = useRef(false);
  const [latched, setLatched] = useState(false);
  const coarse = useCoarseInput(root);
  const mounted = latched || interacted || hovered || focused || coarse;
  const statusId = useId();
  const { state, copy } = useTurnCopyFeedback(identity, text, copyButton);
  useLayoutEffect(() => { if (mounted) setLatched(true); }, [mounted]);
  useLayoutEffect(() => {
    if (!mounted || !focusRequested.current) return;
    focusRequested.current = false;
    copyButton.current?.focus();
  }, [mounted]);
  const showActions = () => { focusRequested.current = true; setLatched(true); };
  const copied = state === 'copied', failed = state === 'error';
  const announcement = copied ? t('Copied') : failed ? t('Couldn’t copy to the clipboard. Try again.') : '';
  return <div ref={root} className="stf-footer" data-turn-copy-id={turnId}
    data-row-hovered={hovered ? '' : undefined} data-row-focused={focused ? '' : undefined}
    onPointerEnter={() => setLatched(true)} onFocusCapture={() => setLatched(true)}>
    {!mounted ? <div className="stf-deferred" data-find-omitted="">
      <span className="stf-placeholder" aria-hidden="true" />
      <button type="button" className="stf-show-actions stf-sr-only" onFocusCapture={showActions}
        onClick={showActions}>{t("Show message actions")}</button>
    </div> : <div className={`stf-toolbar ${MESSAGE_ACTIONS_COLOR}`} data-cds="MessageActions" data-reveal="fade"
      role="toolbar" aria-label={t("Message actions")} tabIndex={-1}
      onKeyDown={event => {
        // Roving focus over Copy and, where offered, Fork from here, Pin as chapter and Good / Bad response.
        const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
        const index = turnFooterKeyIndex(event, { count: buttons.length,
          current: buttons.indexOf(event.currentTarget.ownerDocument.activeElement),
          rtl: event.currentTarget.ownerDocument.defaultView.getComputedStyle(event.currentTarget).direction === 'rtl' });
        if (index !== null) { event.preventDefault(); buttons[index]?.focus(); }
      }}>
      <SourceTooltipGroup>
        <SourceTooltip content={t("Copy")} automatic={true} hoverable={false}>
          <button ref={copyButton} type="button" className="stf-copy" data-cds="Button" data-variant="ghost"
            data-cds-icon-only="" data-cds-ghost=""
            aria-label={t("Copy")} aria-describedby={failed ? statusId : undefined} tabIndex={0}
            onMouseDown={event => {
              const editable = Boolean(event.target.closest?.("input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])"));
              if (preventRepeatedSelection({ detail: event.detail, button: event.button, editable })) event.preventDefault();
            }}
            {...buttonPressHandlers} onClick={() => { void copy(); }}>
            <span className="stf-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
            <Icon name={copied ? 'Check' : 'Copy'} size={16} />
          </button>
        </SourceTooltip>
        {/* Z0 (approval-current.js:43120-43128): Fork from here (ArrowSplitRight) after Copy, before the ratings. */}
        {/* PI (cd5a31703 :25826-25843): the tooltip's detail line and aria-description explain the fork (EI.fork). */}
        {typeof onFork === 'function' && <SourceTooltip content={t("Fork from here")} detail={t("Starts a new session from this point. This one stays as it is.")} automatic={true} hoverable={false}>
          <button type="button" className="stf-copy stf-fork" data-cds="Button" data-variant="ghost" data-cds-icon-only="" data-cds-ghost=""
            data-message-action="fork" aria-label={t("Fork from here")} aria-description={t("Starts a new session from this point. This one stays as it is.")} tabIndex={-1}
            {...buttonPressHandlers}
            onClick={() => onFork()}>
            <span className="stf-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
            <Icon name="ArrowSplitRight" size={16} />
          </button>
        </SourceTooltip>}
        {/* H6e (cd5a31703 :76980-77060; 2.42304.0 c96d752d0 S6e): Pin as chapter / Unpin chapter (Pin / PinFilled,
            aria-pressed with the selected-fallback pressed look above) after Fork, before the ratings.
            pin {pinned, onToggle}: the turn's first assistant row in the session-chapters store. */}
        {pin && typeof pin.onToggle === 'function' && <SourceTooltip content={pin.pinned ? t("Unpin chapter") : t("Pin as chapter")} automatic={true} hoverable={false}>
          <button type="button" className={`stf-copy stf-pin ${PRESSED_BUTTON}`} data-cds="Button" data-variant="ghost" data-cds-icon-only="" data-cds-ghost=""
            data-message-action="pin" aria-label={pin.pinned ? t("Unpin chapter") : t("Pin as chapter")} aria-pressed={!!pin.pinned} tabIndex={-1}
            {...buttonPressHandlers}
            onClick={() => pin.onToggle()}>
            <span className="stf-button-backdrop" aria-hidden="true"><span data-cds-part="paint" className={PRESSED_PAINT} /></span>
            <Icon name={pin.pinned ? 'PinFilled' : 'Pin'} size={16} />
          </button>
        </SourceTooltip>}
        {rating && <>
          <FeedbackButton kind="positive" pressed={rating.value === 'positive'} onRate={rating.onRate} />
          <FeedbackButton kind="negative" pressed={rating.value === 'negative'} onRate={rating.onRate} />
        </>}
        <span id={statusId} className="stf-status stf-sr-only" role="status">{announcement}</span>
        {/* Z0 (scroll-messages-current.js:43193): the timestamp is the LAST
            toolbar element, after Copy, so it takes last:pe-0. */}
        {completedAtMs != null && <SourceTimestamp dateMs={completedAtMs} />}
      </SourceTooltipGroup>
    </div>}
  </div>;
}

// Callers pass actual transcript turn interaction state; no document-wide
// lookup, new transcript anchor or automatic scroll-follow opt-in is added.
// completedAtMs: Codex Turn.completedAt*1000, the local stand-in for the
// source entry.timestamp (56825 K = isStreaming ? undefined : timestamp). Null
// while the turn runs or when Codex reported no completion time: no <time>.
// onFork: Fork from here for this finished turn, where the session can fork at a turn (null otherwise).
// pin: {pinned, onToggle} — Pin as chapter / Unpin chapter for this turn (null where there is nothing to pin).
export function SourceTurnFooter({ sessionKey, turnId, text = '', completedAtMs = null, interacted = false, hovered = false, focused = false, rating = null, onFork = null, pin = null }) {
  const identity = JSON.stringify([sessionKey, turnId]);
  return <TurnFooter key={identity} identity={identity} turnId={turnId} text={text} completedAtMs={completedAtMs}
    interacted={interacted} hovered={hovered} focused={focused} rating={rating} onFork={onFork} pin={pin} />;
}
