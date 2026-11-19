import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
// w10-curchat-composer (CC-01): the Chat / Cowork card is the 3.6556.2 CDS ChatComposer that the Code card already uses —
// shared-5-Bg6ZMqvt vm (`ChatComposerShell`) with its parts Sm (`{ Header: Mp, Attachments: rs, Actions: hp, PrimaryAction:
// sf, Chin: Ap, Overlay: jp, Tray: Pp }`), and shared-26-CGuBxVt9 io / lo / Qa (layout context, editorClass,
// editorSizeStyle). The 2.31226.0 current-chat shared-5 Rf / Wd / ef / tf / yd / ai / Br slice and the host Attachments
// stand-in are gone: vm sorts its children by part identity (Rp), so attachments go through Sm.Attachments (rs,
// MessageAttachments). Both generated files take view-tabs from the concrete file, not the facade (E41).
// 4.16336.0 (composer host cutover): the shell is shared-5 _m / xm (generated/code-composer-v4, Cm = hh = Object.assign(mh,
// xm)); its layout context is cds-core's shared-26 Mp (the v4 shell provides that very instance).
import { ChatComposerShell as Composer, ChatComposerParts, markChatComposerChin } from './generated/code-composer-v4/chat-composer-shell.mjs';
import { editorClass, editorSizeStyle } from './generated/code-composer-v4/chat-composer-layout.mjs';
import { ChatComposerLayoutContext as Layout } from './cds-core.mjs';
import { ideaPreviewClass } from './generated/chat/shared-9-BgdM6Y1f.js';
// w13-chatui-composer-shell: the reply placeholder (shared-8 XI replyToClaude) and the model trigger's copy and classes
// (shared-8 $H / NH, kH sliced as splitModelName) come from generated/chat-composer. The trigger is the view-tabs
// CdsButton / CdsIcon / CdsSpinner that $H renders (W = Eu, we = od, Z = Vu); E41: concrete shared-frame file, not the
// facade, since this card is in the composer graph.
import { chatComposerMessages, chatPlaceholderRotation } from './generated/chat-composer/messages.mjs';
// relink C2 S1: shared-9 gO / fO's shell literals (holder class, className, heading cardClassName, dropScope / variant / form
// branches, editorMinLines, the Actions gap shared-3 Lp), picked by extract-chat-composer.mjs.
import { chatComposerCard } from './generated/chat-composer/card.mjs';
// marlin-chin (U-MARLIN): shared-8 GQ / KQ / FQ, shared-36 mC / PT and shared-9 fO's chin literals (extract-chat-composer.mjs).
import { chatComposerChin, chatComposerChinMessages } from './generated/chat-composer/chin.mjs';
import { COMPOSER_MARLIN_DESIGN, CHAT_CONVERSATION_EXTERNAL } from './composer-marlin.mjs';
import { modelSelector, modelSelectorMessages, splitModelName } from './generated/chat-composer/model-selector.mjs';
// 4.16336.0 (composer host cutover): the trigger is the Chin's `trailing` value (ChatComposerParts.Chin = shared-5 jp,
// src/generated/code-composer-v4), rendered inside that Chin's cds-core CdsButtonIconSizeContext (shared-frame Ku) and the
// shell's cds-core CdsSurfaceContext, so it is the cds-core Button / Icon / Spinner (one graph inside the shell). The
// image-limit band's Banner is the cds-core graph's too (shared-frame-CJdE5Ria aj → Qa).
import { CdsBanner, CdsButton, CdsDropdown, CdsIcon, CdsSpinner, CdsTooltip, cdsClassNames, useIsMacPlatform, ariaKeyShortcuts } from './cds-core.mjs';
// chat-home r1 (send action): shared-8 VR's idle / stop arms as picked literals (generated/chat-composer/send-action.mjs).
import { chatSendAction, chatSendMessages } from './generated/chat-composer/send-action.mjs';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
// regions-chat review (P2): DU's `H()` is vendor-frame Xn (`F(Yn)?.direction ?? "ltr"`, Base UI's DirectionContext), the
// same useDirection the sidebar handle reads; the host answers it once, subscribed to the root `dir`, in that adapter.
import { useDirection } from './source-sidebar-resize-adapters.jsx';
import { SourceMenu } from './source-menu.jsx';
import { ChatAddMenu, ChatAddTrigger } from './source-chat-tools-menu.jsx';
import { Icon } from './icons';
import { permissionLabel } from './source-permission-menu.jsx';
import { t } from '../electron/i18n/index.mjs';

const { Actions, Attachments, Chin, Overlay } = ChatComposerParts;

// The reply editor's placeholder. Marlin (U-MARLIN): gO's inlineLayout card takes shared-36 PT's text — "Reply" for an
// external conversation (src/composer-marlin.mjs), "Write a message…" otherwise. The classic arm kept shared-8 XI's
// replyToClaude ("Reply to Claude…"). PT's first arms win over it while dictating: "Connecting..." / "Listening..."
// (dictationPlaceholder, from the host's dictation status in source-composer.jsx).
// Cowork keeps the classic copy: its session composer (a local agent route, PT's isAgentMode arm) is not part of U-MARLIN's
// Chat scope and is unchanged here.
const replyPlaceholder = (mode) => !COMPOSER_MARLIN_DESIGN || mode !== 'chat' ? t(chatComposerMessages.replyToClaude.defaultMessage)
  : t((CHAT_CONVERSATION_EXTERNAL ? chatComposerChinMessages.reply : chatComposerChinMessages.writeMessage).defaultMessage);

function Editor({ node, measure, disabled, minLines, current, mode, preview, rotating = false, dictationPlaceholder = null }) {
  const layout = useContext(Layout);
  const inputRef = useCallback(input => { node.props.inputRef?.(input); measure(input); }, [node.props.inputRef, measure]);
  // 3.6556.2 lo({startInset, disabled, settled, className}) and Qa(minLines, maxHeight, size = "md") keep the 2.31226.0
  // za / Oa shapes (Qa only adds the "lg" size, which this card never passes).
  return <div data-cds="ChatComposerEditor" className={editorClass({ startInset: layout.startInset, disabled, settled: true, className: `source-chat-editor${preview ? ' opacity-0' : ''}` })} style={editorSizeStyle(minLines)}>
    {/* autoHeight off: this ChatComposerEditor box (min-h row-h, max-h-96, overflow-y-auto) sizes and scrolls the editor,
        as source-composer-shell.jsx does for Code; the editor's own 24px floor made a one-line reply card 47px, not 44. */}
    {React.cloneElement(node, { inputRef, 'data-cds': undefined, autoHeight: false, placeholder: current ? dictationPlaceholder ?? replyPlaceholder(mode) : rotating ? '' : node.props.placeholder })}
  </div>;
}

/**
 * regions-chat: every literal below now comes from 4.16336.0 (shared-8-BqfCbkJd qU, the former $H; NH is DU; the
 * caller is c6eb5f8cf-DNzkXANb _n). 4.16336.0 drops `compact:!h-6` from the compact class, renames "Select model" to
 * S8zsaQvAaA and adds NH's right-to-left label branch (rendered below). The structure notes keep the 3.6556.2 names.
 * shared-8 $H's trigger as the 3.6556.2 desktop caller c6eb5f8cf passes it (`compact: !0, triggerClassName:
 * "!rounded-lg"`): `J.Trigger render: W {variant: "ghost", "data-testid": "model-selector-dropdown", "aria-label": wt,
 * icon: CaretDown, iconPosition: "end", className: h("max-w-full", Et, Dt, g), disabled: Pe}` inside the tooltip's
 * `div.overflow-hidden min-w-0 p-2 -m-2`. aria-label wt: "Loading models…" while loading, "Model: {name}" (name = model
 * name + thinking label joined by " ") once settled, else the empty label "Default model". Children kt: the loading
 * row (spinner + truncate), else NH (root class by compact, name div, " {tail · thinking}" span).
 * Host adapters: with `menu` (chat-home r1-05) the trigger sits in $H's `Q.Root {open, onOpenChange}` as `Q.Trigger render:
 * Button` and `menu` is $H's `Q.Popup` (main.jsx SourceChatModelMenu, KH); open is the host menu state (menuOpen), and
 * onOpenChange asks the host to toggle it (onMenuOpenChange). Without `menu` it is the plain button (onClick). The effort label stands in for $H's thinking label (nt); the tooltip (re) only carries the
 * High-usage warning, which the local catalog never sets, so it is not rendered; `sc-model-trigger` is the host hook
 * main.jsx anchors the model menu on.
 * w13-close-chat-composer (composer-shell-03): `"aria-busy": d` is the caller's triggerBusy — pG passes Vt = CE(Rt && !Lt,
 * …), set while a reply streams with the control disabled; here `busy` (the card's running / sending) while disabled.
 * wt's name parts are [jH(We), nt, rt, H]: rt (the High-usage warning label) and H (triggerQualifier) have no local
 * source, so [name, thinking] is the whole list; "Select model" is the unsettled catalog's label, and a local catalog
 * is settled once listed.
 */
// integration-3 review-0 P1: the card's chin end is 4.16336.0 shared-19 → shared-8 FQ → AK → qU, not the c6eb5f8cf
// MiniCompose caller: FQ passes `showChevron: !1, textSize: "inherit"`, AK `compact: placement === "compact"` (the page's
// "onpage": false) and triggerClassName "!rounded !min-w-0 !shrink" (modelSelector.chin, picked by the generator). qU then
// reads them as `W = showChevron === void 0 || showChevron` (no CaretDown when false), `Ot = textSize !== "inherit" &&
// (compact || textSize === "footnote") && typeClass`, `kt = compact && "!px-1.5 !h-7"`, className m("max-w-full", Ot, kt,
// triggerClassName), and DU's root `textSize === "inherit" ? "" : textSize === "footnote" ? "text-footnote" : compact ?
// "text-xs" : "text-[14px] h-[14px]"`. The defaults keep the c6eb5f8cf dn call (compact, caret, !rounded-lg).
export function ChatModelTrigger({ model, effortLabel, loading = false, disabled = false, busy = false, compact = true, showChevron, textSize,
  triggerClassName = modelSelector.trigger.callerClass, expanded, onClick, direction, menu, menuOpen = false, onMenuOpenChange, triggerRef }) {
  const { trigger, caret, label } = modelSelector;
  const chevron = showChevron === undefined || showChevron;
  const typeOn = textSize !== trigger.typeClassRule.inherit && (compact || textSize === trigger.typeClassRule.footnote);
  const rootSize = textSize === trigger.typeClassRule.inherit ? '' : textSize === trigger.typeClassRule.footnote ? label.root.footnote : compact ? label.root.compact : label.root.regular;
  const name = model?.displayName || model?.model || '';
  const thinking = effortLabel || undefined;
  const ariaLabel = loading ? t(modelSelectorMessages.loadingModels.defaultMessage)
    : name ? t(modelSelectorMessages.modelName.defaultMessage, { name: [name, thinking].filter(Boolean).join(trigger.ariaNameJoin) })
      : t(modelSelectorMessages.defaultModel.defaultMessage);
  const { base, tail } = splitModelName(name);
  const tailParts = [tail, thinking].filter(Boolean);
  const tailText = tailParts.join(label.join);
  // 4.16336.0 NH (DU) under a right-to-left direction (`H() === "rtl"`, H = vendor-frame Xn): the base in a `dir="auto"`
  // span and each tail part in its own bdi joined by " · " (OU). The direction is useDirection's subscription to the root
  // `dir` (re-renders when it changes); `direction` overrides it as SourceAppSwitch / SourceViewTabBar allow.
  const rootDirection = useDirection();
  const rtl = (direction ?? rootDirection) === 'rtl';
  const nameRow = rtl
    ? <div className={label.rtl.wrapperClass}>
      <span dir="auto" className={label.rtl.baseClass}>{base}</span>
      {tailText && <span className={label.rtl.tailClass}>{' '}{tailParts.map((part, index) => <React.Fragment key={`${index}${part}`}>
        {index > 0 && label.rtl.partSeparator}<bdi className={label.rtl.partClass}>{part}</bdi></React.Fragment>)}</span>}
    </div>
    : <div className={label.name}>{base}{tailText && <span className={label.tail}>{` ${tailText}`}</span>}</div>;
  const children = loading
    ? <span className={modelSelector.loading.className}><CdsSpinner size={modelSelector.loading.spinnerSize} /><span className={modelSelector.loading.textClass}>{ariaLabel}</span></span>
    : name ? <div className={`${label.root.prefix} ${rootSize} ${label.root.suffix}`}>
      {nameRow}
    </div>
      : <span className={trigger.emptyClass}>{ariaLabel}</span>;
  const buttonProps = { variant: trigger.variant, 'data-testid': trigger.testId, 'aria-label': ariaLabel,
    icon: chevron ? <CdsIcon name={caret.name} customSize={caret.customSize} className={caret.className} /> : undefined, iconPosition: trigger.iconPosition,
    className: cdsClassNames(trigger.baseClass, typeOn && trigger.typeClass, compact && trigger.compactClass, triggerClassName, 'sc-model-trigger'),
    disabled: disabled || loading, 'aria-busy': busy || undefined };
  if (menu) return <CdsDropdown.Root open={menuOpen && !(disabled || loading)} onOpenChange={onMenuOpenChange}>
    <div className={trigger.tooltipWrapperClass}>
      <CdsDropdown.Trigger ref={triggerRef} disabled={disabled || loading} render={<CdsButton {...buttonProps}>{children}</CdsButton>} />
    </div>
    {menu}
  </CdsDropdown.Root>;
  return <div className={trigger.tooltipWrapperClass}>
    <CdsButton {...buttonProps} aria-haspopup="menu" aria-expanded={expanded} onClick={onClick}>{children}</CdsButton>
  </div>;
}

// w13-close-chat-composer (chatfn-attachments-03): shared-7 Cv's warning as the composer band shows it. Cv keeps the
// dismissed conversations in localStorage "approaching-image-limit-dismissed-conversation-ids" (comma-joined; the
// reached state as `${conversation}:max`): the warning hides when its key (or the :max key) is there, can only be
// dismissed in a conversation, and the pages-gated reached state (`g = m && a`) is never dismissible. Its cardSlots
// carry only onDismiss, so shared-7 MT gives the band wa = shared-26 kM {variant: "neutral" (an info band), icon: null
// (no variantIcon), onDismiss} over the CDS Banner (kM's `ee`; host-wiring/chat: cds-core CdsBanner) with the composer calibration
// (OM → "glyph"), its text in "text-body". Host: the band sits in the card's beforeComposer slot.
export const IMAGE_LIMIT_DISMISSED_KEY = 'approaching-image-limit-dismissed-conversation-ids';
export function imageLimitDismissal({ stored = '', conversationId = null, reached = false, pagesGate = false } = {}) {
  const dismissed = stored ? stored.split(',') : [];
  const maxKey = conversationId ? `${conversationId}:max` : null;
  const key = reached ? maxKey : conversationId;
  const locked = reached && pagesGate;
  const hidden = !!key && !!maxKey && (dismissed.includes(key) || dismissed.includes(maxKey)) && !locked;
  const next = !locked && key ? (dismissed.includes(key) ? stored : [...dismissed, key].join(',')) : null;
  return { hidden, next };
}
const readDismissed = () => { try { return window.localStorage.getItem(IMAGE_LIMIT_DISMISSED_KEY) ?? ''; } catch { return ''; } };
export function ChatImageLimitNotice({ notice, conversationId = null, pagesGate = false }) {
  const [stored, setStored] = useState(() => (typeof window === 'undefined' ? '' : readDismissed()));
  if (!notice) return null;
  const { hidden, next } = imageLimitDismissal({ stored, conversationId, reached: notice.key === 'max', pagesGate });
  if (hidden) return null;
  const dismiss = next === null ? undefined : () => {
    try { window.localStorage.setItem(IMAGE_LIMIT_DISMISSED_KEY, next); } catch { /* storage off: dismissed for this view only */ }
    setStored(next);
  };
  return <CdsBanner variant="neutral" icon={null} role="none" composerCalibration="glyph" className="@container" onDismiss={dismiss} data-image-limit={notice.key}>
    <span className="text-body">{notice.text}</span>
  </CdsBanner>;
}

// shared-9 lD: the new chat's placeholders, [How can I help you today?, Type / for skills].
const newChatPlaceholders = () => [t(chatComposerMessages.howCanIHelpYouToday.defaultMessage), t(chatComposerMessages.typeForSkills.defaultMessage)];
/**
 * shared-9 dD, the fade branch uD takes by default (`animation === void 0 ? "fade"`; the caller passes no
 * rotatingPlaceholderAnimation): every oD.fade ms the next placeholder fades in over the leaving one (aria-hidden,
 * fading out); once the list wraps back to the first (`T = C === 0 && w !== null`) the interval stops. The frame is
 * the call 4.16336.0 gO makes on its inlineLayout arm (the one that renders this fO → gD card): `$D({placeholders, isVisible:
 * !0, animation, inline: Oe, inlineMultiline, bare: !0, markComposerTiming: !0})` inside ro.Overlay, so eO draws only its
 * grid (bare: no absolute frame, no font size — the shell's Overlay already carries the editor row's inset, padding and
 * type size) and each span takes the inline class (truncate). rl-composer verify: the 3.6556.2-era non-bare frame inside
 * the Overlay escaped the Overlay's start inset / row padding (placeholder 8px left of the caret). No typewriter (reduced
 * motion / the "typewriter" animation is not requested) and no element timing mark (no Datadog).
 */
export function RotatingPlaceholder({ placeholders }) {
  const { intervalMs, grid, itemClass: baseItemClass, inlineItemClass, fadeOutClass, fadeInClass } = chatPlaceholderRotation;
  const itemClass = `${baseItemClass} ${inlineItemClass}`;
  const [{ current, previous }, setState] = useState({ current: 0, previous: null });
  const joined = placeholders.join('\0');
  const [seen, setSeen] = useState(joined);
  if (seen !== joined) { setSeen(joined); setState({ current: 0, previous: null }); }
  const done = current === 0 && previous !== null;
  useEffect(() => {
    if (placeholders.length <= 1 || done) return undefined;
    const timer = setInterval(() => setState(({ current: at }) => ({ current: (at + 1) % placeholders.length, previous: at })), intervalMs);
    return () => clearInterval(timer);
  }, [placeholders.length, done, intervalMs]);
  const shown = placeholders[current] ?? placeholders[0];
  const leaving = previous === null ? null : placeholders[previous] ?? null;
  return <div className={grid}>
    {leaving !== null && <span key={previous} aria-hidden className={`${itemClass} ${fadeOutClass}`}>{leaving}</span>}
    <span key={current} className={leaving !== null ? `${itemClass} ${fadeInClass}` : itemClass}>{shown}</span>
  </div>;
}

// 3.6556.2 shared-5 vm. Reply controls move to the chin. vm reads the same editor contract as 2.31226.0 Rf
// (draftStoreKey, onMeasureTarget, minLines, contentKey, trailingNotch, disabled, extraEditorAttributes, render, focus,
// storeCaret, handoffCard, hasDraftText), so the fields below keep their names.
// w13-chatui-composer-shell (research/w13-chatui.md §0.4): claude.ai's composer parts ARE in the 3.6556.2 desktop
// bundle — shared-8-Db1QN4mf XI `replyToClaude` ("Reply to Claude…"), $H (=> Tn) the `model-selector-dropdown` trigger
// with KH's menu (Select model / Search models / More models), kF (+ menu), uB (Research mode), and c9b54eb90 pe (tools
// menu); $H's desktop callers are c6eb5f8cf dn (MiniComposeWindow, compact) and cf6c0e3a1 (ComparisonRoute). This card
// takes the reply placeholder and the $H trigger (ChatModelTrigger above); the + / tools menus are
// w13-chatui-composer-tools.
// Host differences: the model menu's open state is the host's (onMenu('model'); the popup is $H's CDS Dropdown with
// SourceChatModelMenu's KH, chat-home r1-05); the Cowork chin's "Project or
// folder" picker (official copy AMkAhMgTSc, shared-19's Cowork folder picker label) opens the host folder menu.
// chat-home r1 (send action): shared-36 NT (Gh), the entering class a presence child keeps until its animation ends. Inside
// VR's wR (AnimatePresence `initial: !1`) the first child mounts without it; a later child (stop → idle) animates in.
function useEnteringClass(className, skip, presenceInitial) {
  const [on, setOn] = useState(!skip && !presenceInitial);
  const ref = useRef(null);
  useEffect(() => {
    if (!on) return undefined;
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (typeof ref.current?.getAnimations === 'function' && ref.current.getAnimations().length === 0) setOn(false);
    }); });
    return () => cancelAnimationFrame(frame);
  }, [on]);
  return on ? { ref, className, onAnimationEnd: event => { if (event.target === event.currentTarget) setOn(false); } } : { ref, className: undefined };
}

/** shared-8 tz: the Send button under its tooltip (skipInitialAnimation: VR's idle arm passes `!0`). */
function ChatSendButton({ sending, canSend, replyLook, onSend }) {
  const { button, tooltip, enteringClass, sendSkipsEntry } = chatSendAction;
  const entering = useEnteringClass(enteringClass, sendSkipsEntry, true);
  const isMac = useIsMacPlatform();
  const label = t(chatSendMessages.sendMessage.defaultMessage);
  // RR's sendShortcut: the host's Enter sends (composer-keys-model), so the shortcut stays "enter" (as before this round).
  const shortcut = 'enter';
  return <div {...entering}>
    <CdsTooltip multiline={false} content={label} shortcut={shortcut} side={tooltip.side}>
      <div className={button.frameClass}>
        <CdsButton variant={replyLook ? button.replyVariant : button.variant} iconOnly icon={replyLook ? button.replyIcon : button.icon}
          busy={sending} disabled={!canSend && !sending} onClick={onSend} aria-label={label}
          aria-keyshortcuts={ariaKeyShortcuts(shortcut, isMac)} data-testid={button.testId} />
      </div>
    </CdsTooltip>
  </div>;
}

/**
 * shared-8 VR as shared-9 T_ calls it (`inCdsComposer: !0`). Idle: GR (MR, kR's style, Gh(OR) while entering) > WR (NR) >
 * tz. Sampling: JR → the v4 shell's PrimaryAction {state "busy", midTurnSend "hidden" — the host yields Stop to Send
 * itself once a queued draft can go out (source-composer.jsx showStop)} inside HR, keyed "stop". tz's onClick is VR's onSend:
 * here the card form's submit (Chat / Cowork's form onSubmit runs the host's submit request).
 */
function ChatSendAction({ replyLook, sending, canSend, showStop, onStop }) {
  const firstRender = useRef(true);
  const presenceInitial = firstRender.current;
  useEffect(() => { firstRender.current = false; }, []);
  const onSend = event => event.currentTarget.form?.requestSubmit();
  const { stop } = chatSendAction;
  if (showStop) {
    const label = t(chatSendMessages.sendMessage.defaultMessage);
    return <div key={stop.key} className={stop.wrapperClass}>
      <ChatComposerParts.PrimaryAction state={stop.states.busy} midTurnSend={stop.states.hidden} onStop={() => onStop?.({ trigger: 'button' })}
        onSend={onSend} sendLabel={label} stopLabel={t(chatSendMessages.stopResponse.defaultMessage)} stopShortcut={stop.escapeHint}
        sendShortcut="enter" sendDisabled={!canSend} sendBusy={sending} disabledSendVariant={chatSendAction.button.variant}
        sendIcon={replyLook ? chatSendAction.button.replyIcon : chatSendAction.button.icon}
        sendVariant={replyLook ? chatSendAction.button.replyVariant : chatSendAction.button.variant} />
    </div>;
  }
  return <ChatSendSlot key={chatSendAction.idleKey} presenceInitial={presenceInitial}>
    <div className={chatSendAction.shownClass}>
      <ChatSendButton sending={sending} canSend={canSend} replyLook={replyLook} onSend={onSend} />
    </div>
  </ChatSendSlot>;
}

/** shared-8 GR: the motion div (MR, kR's style) with Gh(OR, skipEnter). */
function ChatSendSlot({ presenceInitial, children }) {
  const entering = useEnteringClass(chatSendAction.enteringClass, false, presenceInitial);
  return <div {...entering} className={cdsClassNames(chatSendAction.slotClass, entering.className)} style={chatSendAction.motionStyle}>{children}</div>;
}

// shared-33 Rk's phone check: Hn(vk) with vk = shared-frame Zt, the media query "(width < 40rem)".
const NARROW_QUERY = '(width < 40rem)';
function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia?.(NARROW_QUERY);
    if (!list) return undefined;
    const update = () => setNarrow(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return narrow;
}

/**
 * marlin-chin (U-MARLIN): shared-36 mC, the centred chin band KQ renders around its children when `centred`. It measures
 * the band text against the chin (`[data-cds="ChatComposerChin"]`) and the leading / trailing clusters: centred in the chin
 * when it fits with gapPx on each side, else shifted to the middle of the free span when that is wide enough, else hidden
 * (invisible, aria-hidden, inert). mC also reports the placement ("chin" / "above") to shared-36 dC's context, which no
 * host page provides (the official `a?.(…)` is then a no-op too).
 */
function ChatChinBand({ leading, trailing, className, children }) {
  const { band } = chatComposerChin;
  const [text, setText] = useState(null);
  const [{ fits, shift }, setFit] = useState({ fits: true, shift: 0 });
  useLayoutEffect(() => {
    const chin = text?.closest('[data-cds="ChatComposerChin"]');
    if (!text || !chin) return undefined;
    const apply = (ok, dx) => setFit(prev => (prev.fits === ok && prev.shift === dx ? prev : { fits: ok, shift: dx }));
    const measure = () => {
      const box = chin.getBoundingClientRect();
      if (box.width === 0) { apply(true, 0); return; }
      const half = text.getBoundingClientRect().width / 2;
      const middle = box.left + box.width / 2;
      const lead = leading?.getBoundingClientRect();
      const before = lead && lead.width > 0 ? lead : null;
      const after = trailing?.getBoundingClientRect() ?? null;
      const rtl = chin.ownerDocument.documentElement.dir === 'rtl';
      const start = rtl ? after : before, end = rtl ? before : after;
      const from = start ? start.right + band.gapPx : box.left;
      const to = end ? end.left - band.gapPx : box.right;
      if (middle - half >= from && middle + half <= to) apply(true, 0);
      else if (to - from >= 2 * half) apply(true, Math.round((from + to) / 2 - middle));
      else apply(false, 0);
    };
    measure();
    const Observer = chin.ownerDocument.defaultView?.ResizeObserver;
    if (typeof Observer !== 'function') return undefined;
    const observer = new Observer(measure);
    for (const element of [chin, text, leading, trailing]) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [text, leading, trailing, band.gapPx]);
  return <div className={cdsClassNames(band.frameClass, className)} aria-hidden={!fits || undefined} inert={!fits ? true : undefined}>
    <div ref={setText} className={cdsClassNames(band.textClass, fits ? band.shownClass : band.hiddenClass)}
      style={shift === 0 ? undefined : { transform: `translateX(${shift}px)` }}>{children}</div>
  </div>;
}

/**
 * marlin-chin (U-MARLIN): the Chat conversation's chin, ca2ef848d Zle's `chin: u(eee, {…, children: H9 inline})` with eee =
 * shared-8 GQ → KQ. Here GQ has no session picker (no local agent route), no mode picker (no permission binding on a Chat
 * conversation) and no design-system chip; `centred` is shared-36 lC (an external conversation, src/composer-marlin.mjs) and
 * modelControlsInChin is zQ("bottom") (the shared-153 jC default). So KQ draws the shell's Chin {masked (GQ: not seated),
 * leading: div leadingClass [UM: the controls fO relocated (tO: hubChinControls = lC), the HM anchor span], trailing: div
 * trailingClass [FQ: div end.className + gap {the AK model control, the usage ring's rest div}], children: mC's band around
 * the disclaimer}. HQ's fade needs a handoff layout id, which the host never has.
 */
function ChatMarlinChin({ controls, modelControl, disclaimer }) {
  const { leadingClass, trailingClass, end, relocated } = chatComposerChin;
  const [leading, setLeading] = useState(null);
  const [trailing, setTrailing] = useState(null);
  return <Chin masked leading={<div ref={setLeading} className={leadingClass}>
      <div className={relocated.wrapperClass}>{controls}</div>
      <span className="contents" />
    </div>}
    trailing={<div ref={setTrailing} className={trailingClass}>
      <div className={cdsClassNames(end.className, end.gap)}>{modelControl}<div className={end.ring.rest} /></div>
    </div>}>
    <ChatChinBand leading={leading} trailing={trailing}>{disclaimer}</ChatChinBand>
  </Chin>;
}
// shared-8 `Df(GQ)` (Df = shared-5 Bp): the wrapper is the shell's Chin part, so the shell puts it in the chin slot.
markChatComposerChin(ChatMarlinChin);

// w13-close-chat-surface (E73): a Chat card's chin has no folder picker — shared-8 yP() is "disabled" here (its `s = e
// !== null && a` needs unifiedComposerDesign, shared-78 bp "voyage_composer_marlin", off by D29/R15), so _P() and the
// project chip are off; shared-8 jZ's chin leading (F, the `M = p && !!m && …` session picker) needs a local session,
// so a new chat's chin (MZ over wl.Chin) leads with nothing. A Chat session's folder is the
// surface default main.cjs "surface-workspace" hands out (userData/workspaces/chat unless one is saved), a project's
// chat gets the project's folder from local-projects applyProjectContext (thread/start), neither from the chin. The Chat /
// Cowork switch is not in the chin: 3.6556.2 switches surfaces in the app switch (titlebar / sidebar), and shared-23
// WC's chinProjectPicker (`atriumCreate && coworkRemoteMode.orgAvailable && coworkRemoteMode.isRemote`) is never true
// for this local host, so no project picker replaces it.
// w13-close-chat-composer: the folder menu's host "Effort: …" row is gone — the model menu carries shared-28 wE's Effort
// submenu (KH Te) now; `incognito` is shared-9 wD's `Ae = A ? "incognito" : void 0` (vm's variant: shared-5
// `E === "incognito" ? p(rm, im, am)`); a new chat's empty editor rotates lD's placeholders (dD, below).
export function SourceChatComposer({ editorNode, attachments, draft, scope, current, mode, incognito = false,
  previewPrompt, onClearPreview,
  disabled, busy, sending, canSend, showStop, onStop, submit, onMenu, model, effort, effortLabel,
  modelsLoading, permission, workdir, folderLabel, onFolder, onDrop, canAttach, addMenuOpen = false, modelMenuOpen = false, modelMenu, addMenu,
  disclaimer = null, dictationControl = null, dictationPlaceholder = null }) {
  const [folderAnchor, setFolderAnchor] = useState(null);
  const input = useRef(null);
  const minLines = current ? 1 : chatComposerCard.editorMinLines;
  const open = kind => event => onMenu(kind, event.currentTarget);
  const modelAnchor = useRef(null);
  const narrowViewport = useNarrowViewport();
  const sendAction = <ChatSendAction replyLook={current} sending={sending} canSend={canSend} showStop={showStop} onStop={onStop} />;
  // marlin-chin fix2: shared-9 n_'s frame `p = d || disabled || $g(…)` → "opacity-40" + inert. The caller's disabled is fO's
  // `disabled` (the host's composer disabled) and $g's `isSending && !conversation.isSampling && !sawSamplingThisSend` is
  // the host's `sending` (main.jsx: the send request in flight; the running turn is `busy`). n_'s d ("invisible": tap
  // recording, voice, Qg) and $g's isDictationNotIdle are left out: official moves the dictation controls into the send
  // cell then (shared-9 A_ → b_ / zg), which the host has not sliced, so the chin mic stays the visible stop control.
  const micDimmed = !!(disabled || sending);
  // R4g-composer CP7 (cov0-03): 2.42304.0 c227f4d5e CQ returns null for hideDictation and Code passes
  // hideDictation:!Lf (cc43287c9); shared-8's voice control returns only its portal host when neither dictation
  // nor voice mode is available. This host has neither, so no microphone / voice slot is rendered at all.
  // marlin-chin (U-MARLIN): the marlin Chat conversation's chin is the exception — shared-9 n_ (the relocated cluster's
  // "chin-mic" slot) renders when t_ holds (gO's marlin card passes hideAddMenu: !0, so: dictation or voice is available).
  // The host has dictation (use-composer-dictation.js, source-composer.jsx passes its button as dictationControl) and no
  // voice mode, so shared-8 BL draws Dictate + caret and no voice entry (BL S = voiceModeEnabled && !isAgentMode).
  // Host: with no model the host menu has nothing to pick, so the trigger stays disabled (official Pe is the caller's
  // disabled or loading only).
  // integration-3 review-0 P1: the chin end's call (modelSelector.chin: FQ → AK on the page).
  const { chin } = modelSelector;
  const modelControl = <ChatModelTrigger model={model} effortLabel={effort ? effortLabel : undefined} loading={modelsLoading}
    compact={chin.compact} showChevron={chin.showChevron} textSize={chin.textSize} triggerClassName={chin.triggerClassName}
    disabled={sending || !model} busy={(sending || !model) && busy} onClick={open('model')}
    menu={modelMenu} menuOpen={modelMenuOpen} triggerRef={modelAnchor} onMenuOpenChange={next => {
      // The host toggles its menu state on a repeat open of the same trigger (main.jsx openMenu).
      if (next !== modelMenuOpen) onMenu('model', modelAnchor.current);
    }} />;
  const permissionControl = mode === 'cowork' && <Button variant="ghost" size="xs" aria-label={t('Permission mode')}
    aria-haspopup="menu" disabled={sending || !permission} onClick={open('permission')}>{permissionLabel(permission)}</Button>;
  // w13-chatui-composer-tools (K2): shared-8 kF, the "Add files, connectors, and more" trigger (source-chat-tools-menu.jsx).
  // The popup is the host Add menu (onMenu('add')); addMenuOpen (source-composer.jsx `menuKind === "add"`) is kF's
  // isMenuOpen, which drops the tooltip while the menu is open, and the host's aria-expanded.
  // r2 chat-home-r2-01: with `addMenu` (Chat) the trigger is shared-8 wP's `Q.Trigger render: TP` inside its own CDS Dropdown
  // Root / Popup (ChatAddMenu); the open state stays the host's menu "add" (onOpenChange toggles it, as the model menu).
  const addAnchor = useRef(null);
  const addControl = addMenu !== undefined
    ? <ChatAddMenu open={addMenuOpen && !sending} trigger={<ChatAddTrigger ref={addAnchor} isMenuOpen={addMenuOpen} disabled={sending} />}
      onOpenChange={next => { if (next !== addMenuOpen) onMenu('add', addAnchor.current); }}>{addMenu}</ChatAddMenu>
    : <ChatAddTrigger aria-haspopup="menu" aria-expanded={addMenuOpen} isMenuOpen={addMenuOpen} disabled={sending} onClick={open('add')} />;
  const replyLeading = addControl;
  const leading = mode === 'cowork' && <Button variant="ghost" size="xs" className="surface-folder-trigger" aria-label={t('Project or folder')}
    aria-haspopup="menu" aria-expanded={!!folderAnchor} disabled={sending}
    onClick={event => setFolderAnchor(folderAnchor ? null : event.currentTarget)}>
    <span>{folderLabel || (workdir ? workdir.split('/').pop() : t('Project or folder'))}</span><Icon name="CaretDown" size={12} />
  </Button>;
  // shared-23 / shared-9: lD's placeholders rotate (uD → dD) only on a new chat's empty editor whose placeholder is lD's
  // first (the caller's own copy, e.g. a running hint, is left alone); the preview overlay wins.
  const rotating = !current && !previewPrompt && !draft && editorNode?.props?.placeholder === t(chatComposerMessages.howCanIHelpYouToday.defaultMessage);
  // 4.16336.0 shared-9 gO → fO → gD → Cm (shared-5 hh = Object.assign(mh, xm), mh → _m). gO wraps the card in its holder
  // `div[data-composer-card-holder]` "relative in-data-cds-dock-masked:bg-page" (data-dictating / data-send-interceptor
  // are unset: the host has no dictation and no send interceptor). fO hands gD these literals, gD passes them on to Cm:
  //   className "px-2 md:px-0"; size `vf() ? "lg" : void 0` (vf = shared-33 Bk, useContext(zk), which shared-23 provides as
  //   shared-33 Rk(chorusUnifiedComposerDesign) — off here, D29/R15 — so no "lg"); cardClassName `clsx(containerClassName,
  //   !xe && "[--cmp-font-size:var(--cds-font-size-heading)]")` with xe = shared-36 Ek(followsTranscriptTextSize ||
  //   holdsMediumTextSize, …), undefined while neither is set (no transcript text-size setting here), so the heading size;
  //   multiline `forceMultiline ? !0 : void 0` (gO: `!Kt || sn || peekCard === !0`, Kt = min-width 768px: the desktop
  //   window is wider, no peek card, so undefined); editorMinLines `twoLineNew ? 2 : void 0` and the Actions gap
  //   `twoLineNew ? ds : void 0` (ds = shared-3 Lp "tight"; gO twoLineNew = cn = isNewConversation && !sn); dropScope
  //   `enableScreenDrop ? "page" : "card"`; variant `incognitoModeEnabled ? "incognito" : void 0`; form `isNewConversation ?
  //   "new" : "reply"`. Those literals come from generated/chat-composer/card.mjs (relink C2 S1). The host keeps its hook classes (source-chat-composer, cds-root) and density next to them; mh's editor
  //   contract (focus, trailingNotch "float", render) is written out below for the local textarea editor.
  return <>
    <div className={chatComposerCard.holderClass} data-composer-card-holder="">
    {/* fO `Ie = Se ? "lg" : void 0`, Se = vf() (shared-33 Bk, context zk): only the new page provides it (shared-23 `zk.Provider
        value: Rk(Ga())`: the marlin gate and not shared-frame Zt "(width < 40rem)"), so U-MARLIN's home card is "lg" and a
        conversation's is not. */}
    <Composer variant={incognito ? chatComposerCard.variant : undefined} form={current ? chatComposerCard.form.reply : chatComposerCard.form.new} busy={busy} disabled={disabled}
      size={!current && COMPOSER_MARLIN_DESIGN && !narrowViewport ? chatComposerCard.size : undefined}
      onPointerDownCapture={onClearPreview} onKeyDownCapture={onClearPreview} onBeforeInputCapture={onClearPreview}
      className={cdsClassNames(chatComposerCard.className, 'source-chat-composer cds-root')} cardClassName={chatComposerCard.cardFontClass}
      data-density="comfortable" dropScope={chatComposerCard.dropScope.card} onFileDrop={canAttach ? onDrop : undefined}
      editor={{ draftStoreKey: scope, minLines, hasDraftText: () => !!draft.trim(), contentKey: draft,
        focus: () => input.current?.focus(), trailingNotch: 'float',
        render: ({ onMeasureTarget, disabled }) => <Editor current={current} mode={mode} preview={!!previewPrompt} rotating={rotating} node={editorNode} dictationPlaceholder={dictationPlaceholder} measure={element => { input.current = element; onMeasureTarget(element); }} disabled={disabled} minLines={minLines} /> }}>
      {previewPrompt && <Overlay><p className={ideaPreviewClass}>{previewPrompt}</p></Overlay>}
      {rotating && <Overlay><RotatingPlaceholder placeholders={newChatPlaceholders()} /></Overlay>}
      {attachments && <Attachments>{attachments}</Attachments>}
      <Actions gap={current ? undefined : chatComposerCard.actionsGap} leading={current ? null : addControl}
        send={sendAction}
        idle={null} />
      {current && COMPOSER_MARLIN_DESIGN && mode === 'chat'
        ? <ChatMarlinChin controls={<>
            <div className={chatComposerChin.relocated.addMenuClass}>{addControl}</div>
            {dictationControl && <div className={cdsClassNames(chatComposerChin.mic.frameClass, micDimmed && chatComposerChin.mic.dimmedClass)}
              data-testid={chatComposerChin.mic.testId} inert={micDimmed ? true : undefined}>
              <div className={chatComposerChin.mic.splitClass}>{dictationControl}</div>
            </div>}
          </>} modelControl={modelControl} disclaimer={disclaimer} />
        : <Chin leading={current ? replyLeading : leading || null} trailing={<>{modelControl}{permissionControl}</>} />}
    </Composer>
    </div>
    {folderAnchor && <SourceMenu.Popup anchor={folderAnchor} side="bottom" align="start" label={t('Project or folder')} onClose={() => setFolderAnchor(null)}>
      <SourceMenu.Item icon="Folder" onClick={() => { setFolderAnchor(null); onFolder?.(); }}>{t('Open folder…')}</SourceMenu.Item>
    </SourceMenu.Popup>}
  </>;
}
