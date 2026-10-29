import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
// w10-curchat-composer (CC-01): the Chat / Cowork card is the 3.6556.2 CDS ChatComposer that the Code card already uses —
// shared-5-Bg6ZMqvt vm (`ChatComposerShell`) with its parts Sm (`{ Header: Mp, Attachments: rs, Actions: hp, PrimaryAction:
// sf, Chin: Ap, Overlay: jp, Tray: Pp }`), and shared-26-CGuBxVt9 io / lo / Qa (layout context, editorClass,
// editorSizeStyle). The 2.31226.0 current-chat shared-5 Rf / Wd / ef / tf / yd / ai / Br slice and the host Attachments
// stand-in are gone: vm sorts its children by part identity (Rp), so attachments go through Sm.Attachments (rs,
// MessageAttachments). Both generated files take view-tabs from the concrete file, not the facade (E41).
import { ChatComposerShell as Composer, ChatComposerParts } from './generated/code-composer/chat-composer-shell.mjs';
import { ChatComposerLayoutContext as Layout, editorClass, editorSizeStyle } from './generated/code-composer/chat-composer-layout.mjs';
import { ideaPreviewClass } from './generated/chat/shared-9-CM21XrJw.js';
// w13-chatui-composer-shell: the reply placeholder (shared-8 XI replyToClaude) and the model trigger's copy and classes
// (shared-8 $H / NH, kH sliced as splitModelName) come from generated/chat-composer. The trigger is the view-tabs
// CdsButton / CdsIcon / CdsSpinner that $H renders (W = Eu, we = od, Z = Vu); E41: concrete shared-frame file, not the
// facade, since this card is in the composer graph.
import { chatComposerMessages, chatPlaceholderRotation } from './generated/chat-composer/messages.mjs';
import { modelSelector, modelSelectorMessages, splitModelName } from './generated/chat-composer/model-selector.mjs';
import { CdsBanner, CdsButton, CdsIcon, CdsSpinner, cdsClassNames } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceMenu } from './source-menu.jsx';
import { ChatAddTrigger } from './source-chat-tools-menu.jsx';
import { Icon } from './icons';
import { permissionLabel } from './source-permission-menu.jsx';
import { t } from '../electron/i18n/index.mjs';

const { Actions, Attachments, Chin, Overlay } = ChatComposerParts;

function Editor({ node, measure, disabled, minLines, current, preview, rotating = false }) {
  const layout = useContext(Layout);
  const inputRef = useCallback(input => { node.props.inputRef?.(input); measure(input); }, [node.props.inputRef, measure]);
  // 3.6556.2 lo({startInset, disabled, settled, className}) and Qa(minLines, maxHeight, size = "md") keep the 2.31226.0
  // za / Oa shapes (Qa only adds the "lg" size, which this card never passes).
  return <div data-cds="ChatComposerEditor" className={editorClass({ startInset: layout.startInset, disabled, settled: true, className: `source-chat-editor${preview ? ' opacity-0' : ''}` })} style={editorSizeStyle(minLines)}>
    {React.cloneElement(node, { inputRef, 'data-cds': undefined, placeholder: current ? t(chatComposerMessages.replyToClaude.defaultMessage) : rotating ? '' : node.props.placeholder })}
  </div>;
}

/**
 * shared-8 $H's trigger as the 3.6556.2 desktop caller c6eb5f8cf passes it (`compact: !0, triggerClassName:
 * "!rounded-lg"`): `J.Trigger render: W {variant: "ghost", "data-testid": "model-selector-dropdown", "aria-label": wt,
 * icon: CaretDown, iconPosition: "end", className: h("max-w-full", Et, Dt, g), disabled: Pe}` inside the tooltip's
 * `div.overflow-hidden min-w-0 p-2 -m-2`. aria-label wt: "Loading models…" while loading, "Model: {name}" (name = model
 * name + thinking label joined by " ") once settled, else the empty label "Default model". Children kt: the loading
 * row (spinner + truncate), else NH (root class by compact, name div, " {tail · thinking}" span).
 * Host adapters: the menu is the host's (onMenu('model') → main.jsx SourceChatModelMenu, KH), so the CdsDropdown root
 * is not rendered; the effort label stands in for $H's thinking label (nt); the tooltip (re) only carries the
 * High-usage warning, which the local catalog never sets, so it is not rendered; `sc-model-trigger` is the host hook
 * main.jsx anchors the model menu on.
 * w13-close-chat-composer (composer-shell-03): `"aria-busy": d` is the caller's triggerBusy — pG passes Vt = CE(Rt && !Lt,
 * …), set while a reply streams with the control disabled; here `busy` (the card's running / sending) while disabled.
 * wt's name parts are [jH(We), nt, rt, H]: rt (the High-usage warning label) and H (triggerQualifier) have no local
 * source, so [name, thinking] is the whole list; "Select model" is the unsettled catalog's label, and a local catalog
 * is settled once listed.
 */
export function ChatModelTrigger({ model, effortLabel, loading = false, disabled = false, busy = false, compact = true, expanded, onClick }) {
  const { trigger, caret, label } = modelSelector;
  const name = model?.displayName || model?.model || '';
  const thinking = effortLabel || undefined;
  const ariaLabel = loading ? t(modelSelectorMessages.loadingModels.defaultMessage)
    : name ? t(modelSelectorMessages.modelName.defaultMessage, { name: [name, thinking].filter(Boolean).join(trigger.ariaNameJoin) })
      : t(modelSelectorMessages.defaultModel.defaultMessage);
  const { base, tail } = splitModelName(name);
  const tailText = [tail, thinking].filter(Boolean).join(label.join);
  const children = loading
    ? <span className={modelSelector.loading.className}><CdsSpinner size={modelSelector.loading.spinnerSize} /><span className={modelSelector.loading.textClass}>{ariaLabel}</span></span>
    : name ? <div className={`${label.root.prefix} ${compact ? label.root.compact : label.root.regular} ${label.root.suffix}`}>
      <div className={label.name}>{base}{tailText && <span className={label.tail}>{` ${tailText}`}</span>}</div>
    </div>
      : <span className={trigger.emptyClass}>{ariaLabel}</span>;
  return <div className={trigger.tooltipWrapperClass}>
    <CdsButton variant={trigger.variant} data-testid={trigger.testId} aria-label={ariaLabel}
      icon={<CdsIcon name={caret.name} customSize={caret.customSize} className={caret.className} />} iconPosition={trigger.iconPosition}
      className={cdsClassNames(trigger.baseClass, compact && trigger.typeClass, compact && trigger.compactClass, trigger.callerClass, 'sc-model-trigger')}
      disabled={disabled || loading} aria-busy={busy || undefined} aria-haspopup="menu" aria-expanded={expanded} onClick={onClick}>{children}</CdsButton>
  </div>;
}

// w13-close-chat-composer (chatfn-attachments-03): shared-7 Cv's warning as the composer band shows it. Cv keeps the
// dismissed conversations in localStorage "approaching-image-limit-dismissed-conversation-ids" (comma-joined; the
// reached state as `${conversation}:max`): the warning hides when its key (or the :max key) is there, can only be
// dismissed in a conversation, and the pages-gated reached state (`g = m && a`) is never dismissible. Its cardSlots
// carry only onDismiss, so shared-7 MT gives the band wa = shared-26 kM {variant: "neutral" (an info band), icon: null
// (no variantIcon), onDismiss} over the CDS Banner (view-tabs CdsBanner, kM's `ee`) with the composer calibration
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
 * dD's non-bare, non-inline grid (`absolute inset-0 pointer-events-none overflow-hidden` with the entry-floor font
 * size) inside the shell's Overlay (wD's `o(sc, {children: o(uD, …)})`). No typewriter (reduced motion / the "typewriter"
 * animation is not requested) and no element timing mark (no Datadog).
 */
export function RotatingPlaceholder({ placeholders }) {
  const { intervalMs, grid, overlay, fontSize, itemClass, fadeOutClass, fadeInClass } = chatPlaceholderRotation;
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
  return <div className={`${grid} ${overlay} ${fontSize}`}>
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
// Host differences: the model menu is the host's (onMenu('model') → SourceChatModelMenu); the Cowork chin's "Project or
// folder" picker (official copy AMkAhMgTSc, shared-19's Cowork folder picker label) opens the host folder menu.
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
  modelsLoading, permission, workdir, folderLabel, onFolder, onDrop, canAttach, addMenuOpen = false }) {
  const [folderAnchor, setFolderAnchor] = useState(null);
  const input = useRef(null);
  const minLines = current ? 1 : 2;
  const open = kind => event => onMenu(kind, event.currentTarget);
  const send = <Button variant={current ? 'ghost' : 'brand'} iconOnly icon={current ? "ArrowReturn" : "ArrowUp"} iconSize={20}
    aria-label={t('Send message')} type="submit" disabled={!canSend} busy={sending} />;
  const stop = <Button variant="ghost" iconOnly icon="StopCircle" iconSize={20}
    aria-label={t('Stop response')} onClick={() => onStop?.({ trigger: 'button' })} />;
  // R4g-composer CP7 (cov0-03): 2.42304.0 c227f4d5e CQ returns null for hideDictation and Code passes
  // hideDictation:!Lf (cc43287c9); shared-8's voice control returns only its portal host when neither dictation
  // nor voice mode is available. This host has neither, so no microphone / voice slot is rendered at all.
  // Host: with no model the host menu has nothing to pick, so the trigger stays disabled (official Pe is the caller's
  // disabled or loading only).
  const modelControl = <ChatModelTrigger model={model} effortLabel={effort ? effortLabel : undefined} loading={modelsLoading}
    disabled={sending || !model} busy={(sending || !model) && busy} onClick={open('model')} />;
  const permissionControl = mode === 'cowork' && <Button variant="ghost" size="xs" aria-label={t('Permission mode')}
    aria-haspopup="menu" disabled={sending || !permission} onClick={open('permission')}>{permissionLabel(permission)}</Button>;
  // w13-chatui-composer-tools (K2): shared-8 kF, the "Add files, connectors, and more" trigger (source-chat-tools-menu.jsx).
  // The popup is the host Add menu (onMenu('add')); addMenuOpen (source-composer.jsx `menuKind === "add"`) is kF's
  // isMenuOpen, which drops the tooltip while the menu is open, and the host's aria-expanded.
  const addControl = <ChatAddTrigger aria-haspopup="menu" aria-expanded={addMenuOpen} isMenuOpen={addMenuOpen} disabled={sending} onClick={open('add')} />;
  const replyLeading = addControl;
  const leading = mode === 'cowork' && <Button variant="ghost" size="xs" className="surface-folder-trigger" aria-label={t('Project or folder')}
    aria-haspopup="menu" aria-expanded={!!folderAnchor} disabled={sending}
    onClick={event => setFolderAnchor(folderAnchor ? null : event.currentTarget)}>
    <span>{folderLabel || (workdir ? workdir.split('/').pop() : t('Project or folder'))}</span><Icon name="CaretDown" size={12} />
  </Button>;
  // shared-23 / shared-9: lD's placeholders rotate (uD → dD) only on a new chat's empty editor whose placeholder is lD's
  // first (the caller's own copy, e.g. a running hint, is left alone); the preview overlay wins.
  const rotating = !current && !previewPrompt && !draft && editorNode?.props?.placeholder === t(chatComposerMessages.howCanIHelpYouToday.defaultMessage);
  return <>
    <Composer variant={incognito ? 'incognito' : 'default'} form={current ? 'reply' : 'new'} busy={busy} disabled={disabled}
      onPointerDownCapture={onClearPreview} onKeyDownCapture={onClearPreview} onBeforeInputCapture={onClearPreview}
      className="source-chat-composer cds-root" data-density="comfortable" dropScope="card" onFileDrop={canAttach ? onDrop : undefined}
      editor={{ draftStoreKey: scope, minLines, hasDraftText: () => !!draft.trim(), contentKey: draft,
        focus: () => input.current?.focus(), trailingNotch: 'float',
        render: ({ onMeasureTarget, disabled }) => <Editor current={current} preview={!!previewPrompt} rotating={rotating} node={editorNode} measure={element => { input.current = element; onMeasureTarget(element); }} disabled={disabled} minLines={minLines} /> }}>
      {previewPrompt && <Overlay><p className={ideaPreviewClass}>{previewPrompt}</p></Overlay>}
      {rotating && <Overlay><RotatingPlaceholder placeholders={newChatPlaceholders()} /></Overlay>}
      {attachments && <Attachments>{attachments}</Attachments>}
      <Actions gap="tight" leading={current ? null : addControl}
        send={<SourceTooltip content={t(showStop ? 'Stop' : 'Send')} shortcut={showStop ? 'escape' : 'enter'}>{showStop ? stop : send}</SourceTooltip>}
        idle={null} />
      <Chin leading={current ? replyLeading : leading || null} trailing={<>{modelControl}{permissionControl}</>} />
    </Composer>
    {folderAnchor && <SourceMenu.Popup anchor={folderAnchor} side="bottom" align="start" label={t('Project or folder')} onClose={() => setFolderAnchor(null)}>
      <SourceMenu.Item icon="Folder" onClick={() => { setFolderAnchor(null); onFolder?.(); }}>{t('Open folder…')}</SourceMenu.Item>
    </SourceMenu.Popup>}
  </>;
}
