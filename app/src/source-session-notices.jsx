import React, { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { CdsBanner, CdsButton } from "./generated/view-tabs/index.js";
import { ChatComposerNotices } from "./generated/composer-notices/composer-notices.mjs";
import { CODE_NOTICE_SLOT_ORDER, useCodeNoticeSlotEntries, useInCodeNoticeRegion } from "./generated/composer-notices/code-notice-slots.mjs";
import { WorkspaceTrustDialog } from "./generated/code-routines/index.mjs";
import "./source-session-notices.css";
import { t } from "../electron/i18n/index.mjs";
import { SourceMarkdown } from "./source-session.jsx";
import { localizeBridgeText } from "./bridge-text-model.mjs";
// W12b: the 3.6556.2 usage band's live reset countdown (c227f4d5e QF) and the notice card context its card look
// provides around the headline and detail (aL `E(ZF.Provider, { value: !0, children: [T, D] })`).
import { UsageNoticeCardContext, UsageResetCountdown } from "./generated/usage-countdown/usage-countdown.mjs";
import { InlineBand } from "./generated/session-rail/inline-band.mjs";
import { persistedStorageKey, writePersisted } from "./generated/r3b-settings/persisted-store.mjs";
import { KX as workflowTaskLabel } from "./generated/code-transcript/shared-156-BLTosN8U.mjs";
import { USAGE_ACTIVE_OVERAGE_DISMISSED_KEY, USAGE_APPROACHING_DISMISSED_KEY, usageDismissalHolds } from "../electron/usage-model.mjs";

// Non-modal notices above the composer: what the core reported that changes how it behaves but is not a turn
// error (state.js notices / warnings / threadNotices: deprecationNotice, warning, configWarning, guardianWarning,
// strict auto-review, cyber verification, model reroutes) plus the usage-limit notice (usage-model.mjs composerUsageNotice).
// Each can be dismissed for this window; an identical notice is never listed twice (state.js appendNotice).
//
// Codex's own text (summary/details) is shown as is; the fixed sources state.js uses for notices without text are
// translated here.
export const PROJECT_TRUST = /until the project is trusted/i;
// A bridge core's warning that it ignores the session folder's project files until the folder is trusted (Gemini CLI:
// acp-bridge gemini.js GEMINI_UNTRUSTED_FOLDER); main.jsx adds 'Trust workspace' (confirmTrust: the trust dialog) on a
// core with workspaceTrust.
export const UNTRUSTED_FOLDER_NOTICE = /until you trust the folder\.$/;
export function noticeKey(notice) {
  return notice.dismissKey || JSON.stringify([notice.kind, notice.summary, notice.details ?? null, notice.path ?? null]);
}
export function sessionNotices({ notices = [], warnings = [], threadNotices = [] } = {}) {
  return [
    ...threadNotices.map((notice) => ({ ...notice, scope: "thread" })),
    ...warnings.filter((message) => typeof message === "string" && message).map((message) => ({ kind: "warning", summary: message, details: null, scope: "thread" })),
    ...notices.map((notice) => ({ ...notice, scope: "connection" })),
  ];
}
const FIXED = new Set(["strictReview", "verification", "rerouted", "autoReviewDenied", "hookBlocked", "hookFailed"]);
// A bridge's fixed English warning (bridge-text-model.mjs: MiniMax's terminal-session note) reads in the UI language.
export function noticeText(notice) {
  return FIXED.has(notice.kind) ? t(notice.summary, notice.values) : notice.kind === "warning" ? localizeBridgeText(notice.summary) : notice.summary;
}
// The icon follows the notice's weight: warnings keep the triangle, informational notices (level 'info': recap,
// upsell, headline, usage info…) get a neutral Info glyph unless they name their own (recap: Chat).
// Codex writes config keys, model names and paths in its warnings as Markdown code spans (Model metadata for `dummy`
// not found…). A notice's plain text renders those spans as inline code, like a reply's, instead of showing the
// backticks; any other Markdown stays literal text. noticePlainText drops the backticks (for labels).
const CODE_SPAN = /`([^`\n]+)`/g;
export function noticeInline(text) {
  if (typeof text !== "string" || !text.includes("`")) return text;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<code key={match.index} className="ssn-code">{match[1]}</code>);
    last = match.index + match[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
export function noticePlainText(text) {
  return typeof text === "string" ? text.replace(CODE_SPAN, "$1") : text;
}
export function noticeIcon(notice) {
  if (typeof notice.icon === "string" && notice.icon) return notice.icon;
  return notice.level === "info" ? "Info" : "Warning";
}
// W14-code TR-H8 / shared-10: the notice stack is the 3.6556.2 Code session's — cc43287c9 Rde mounts shared-26 RM
// (ChatComposerNotices, src/generated/composer-notices) in a dock-group div (shared-1 Sd "data-cds-dock-group", shared-6
// yd "data-code-column-notices", bd "-mb-1.5 compact:-mb-1.5 comfortable:-mb-2"). RM keys, enters and exits the items
// (one polite live region) and draws a plain one as FM's CDS Banner: tone warning / neutral (a notice's level "info" is
// neutral), role none, the Dismiss ghost button (the CDS label "Dismiss"), one secondary CDS Button action. A notice FM's
// banner cannot carry (Codex's code spans, details, a reset countdown, a file path, several actions, a disabled one, its
// own icon) renders itself in the same CdsBanner props FM passes (variant, role none, composerCalibration "glyph" = OM
// without a composer inset, "@container", the actions as secondary CdsButtons, onDismiss). Codex's own text is kept.
// W14-code r4 shell css4-ssn-list-geometry (E95): in Code the stack sits in the composer column right before the composer
// (`inColumn`, main.jsx renderMainComposer: cc43287c9 `p(Bde, {})` before `p(nk, …)`), so its div is Rde's exactly — the
// dock-group attributes and shared-6 Jg, no host class; the column's gap and Jg's negative margin space it. Chat / Cowork
// still mount it above their column (.ssn-list, the column's width rule in source-composer.css).
const NOTICE_STACK_CLASS = "-mb-1.5 compact:-mb-1.5 comfortable:-mb-2";
// c516e93ca T passes the pending gate's `sources` (what would run there); a host notice names none.
const NO_TRUST_SOURCES = Object.freeze([]);
function noticeActions(notice, { onReveal, onTrust, trusting, onConfirmTrust }) {
  const actions = Array.isArray(notice.actions) ? notice.actions.filter((action) => action?.label && typeof action.run === "function") : [];
  const list = actions.map((action) => action.confirmTrust ? { ...action, run: () => onConfirmTrust(action.confirmTrust, action.run) } : action);
  // shared-08: Codex's "until the project is trusted" opens the Code workspace trust dialog (c165c93f1 ie, "Trust
  // workspace" 0L2liwSugy) for the session's folder, which trusts it on confirm.
  if (notice.kind === "config" && onTrust && PROJECT_TRUST.test(notice.summary))
    list.push({ label: t("Trust workspace"), busy: trusting, run: () => onConfirmTrust(true, onTrust) });
  if (notice.path && onReveal) list.push({ label: t("Show in Finder"), run: () => onReveal(notice.path) });
  return list;
}
const noticeButton = (action) => <CdsButton key={action.label} variant="secondary" busy={action.busy === true} disabled={action.disabled === true || undefined}
  onClick={() => { if (action.busy !== true && action.disabled !== true) action.run(); }}>{action.label}</CdsButton>;
function NoticeBody({ notice, noticeKey: key }) {
  return <UsageNoticeCardContext.Provider value={true}>
    <p className="ssn-summary"><bdi>{noticeInline(noticeText(notice))}</bdi></p>
    {/* A reached usage limit (composerUsageNotice countdown): its text, then the reset as the band's QF, which
        ticks within the hour before it and reads the absolute VI time to assistive tech. */}
    {notice.countdown ? <p className="ssn-details"><bdi>{notice.countdown.lead ? <>{noticeInline(notice.countdown.lead)}{" "}</> : null}<UsageResetCountdown
      resetsAtSeconds={notice.countdown.resetsAtSeconds} absolute={notice.countdown.absolute} /></bdi></p>
    /* Model-written details (a /recap answer) arrive as Markdown: render them like a reply, in a bounded scroller
        so a long catch-up never pushes the transcript away. */
    : notice.details && notice.kind !== "rerouted" && (notice.markdown
      ? <div className="ssn-details ssn-markdown" tabIndex={0} role="group" aria-label={noticePlainText(noticeText(notice))}><SourceMarkdown text={notice.details} sessionKey={`notice-${key}`} itemId={`notice-${key}`} /></div>
      : <p className="ssn-details"><bdi>{noticeInline(notice.details)}</bdi></p>)}
    {notice.path && <p className="ssn-details ssn-path" title={notice.path}><bdi>{notice.path}{notice.line ? `:${notice.line}` : ""}</bdi></p>}
  </UsageNoticeCardContext.Provider>;
}
// W14-code r6 sleep review fix: in Chat / Cowork (no Code notice region) the sleep and kept-awake bands stay entries of
// this stack, drawn as its CdsBanner as before the lane (summary, details, secondary CdsButtons, Dismiss); what they
// say and offer is the band's k_ props (cf74bc599 EO / pO via c227f4d5e oL, source-sleep-notice.jsx useInlineBandNotices),
// read live from the sink.
function InlineBandBanner({ slot: { sink, name }, leaving, onDismiss }) {
  const read = () => sink.band(name);
  const band = useSyncExternalStore(sink.subscribeBands, read, read);
  if (!band) return null;
  const actions = [
    band.ctaLabel ? <CdsButton key="cta" variant="secondary" onClick={band.ctaDone ? undefined : band.onCta}
      disabled={(band.ctaDisabled && !band.ctaBusy && !band.ctaDone) || undefined} busy={band.ctaBusy === true}
      {...(band.ctaDone ? { "aria-disabled": true } : {})}>{band.ctaLabel}</CdsButton> : null,
    band.secondaryCtaLabel ? <CdsButton key="secondary" variant="secondary" onClick={band.onSecondaryCta}
      disabled={(band.secondaryCtaDisabled && !band.secondaryCtaBusy) || undefined} busy={band.secondaryCtaBusy === true}>{band.secondaryCtaLabel}</CdsButton> : null,
  ].filter(Boolean);
  return <CdsBanner variant="neutral" role="none" composerCalibration="glyph" className="@container"
    icon={band.icon ? <Icon name={band.icon} size={16} /> : undefined} action={actions.length ? <>{actions}</> : undefined}
    onDismiss={band.onDismiss && !leaving ? onDismiss : undefined}>
    <p className="ssn-summary"><bdi>{band.message}</bdi></p>
    {band.detail ? <p className="ssn-details"><bdi>{band.detail}</bdi></p> : null}
  </CdsBanner>;
}
/** One RM item for a notice: FM's banner when it fits, else a CdsBanner the notice renders itself. */
export function noticeItem(notice, { onReveal, onTrust, trusting = false, onConfirmTrust = () => {}, onDismiss = () => {} } = {}) {
  if (notice.inlineBand) return { key: noticeKey(notice), dismissible: true, content: { kind: "custom",
    render: ({ leaving }) => <InlineBandBanner slot={notice.inlineBand} leaving={leaving} onDismiss={onDismiss} /> } };
  const key = noticeKey(notice), tone = notice.level === "info" ? "neutral" : "warning";
  const actions = noticeActions(notice, { onReveal, onTrust, trusting, onConfirmTrust });
  const text = noticeText(notice), dismissible = notice.dismissible !== false;
  const plain = typeof text === "string" && text.trim() !== "" && noticeInline(text) === text && !notice.countdown && !notice.path
    && !(notice.details && notice.kind !== "rerouted") && !(typeof notice.icon === "string" && notice.icon)
    && actions.length <= 1 && !actions.some((action) => action.disabled === true);
  if (plain) return { key, dismissible, content: { kind: "banner", tone, copy: text,
    ...(actions.length ? { action: { label: actions[0].label, onClick: actions[0].run, busy: actions[0].busy === true } } : {}) } };
  const icon = typeof notice.icon === "string" && notice.icon ? <Icon name={noticeIcon(notice)} size={16} /> : undefined;
  return { key, dismissible, content: { kind: "custom", render: ({ leaving }) => <CdsBanner variant={tone} role="none" composerCalibration="glyph" className="@container"
    icon={icon} action={actions.length ? <>{actions.map(noticeButton)}</> : undefined}
    onDismiss={dismissible && !leaving ? onDismiss : undefined}>
    <NoticeBody notice={notice} noticeKey={key} />
  </CdsBanner> } };
}
// W14-code r7 notices (r7c-02 / sh7-04 / gates-r7-01, E81): __gb__100087145 is off on the 3P desktop, so cc43287c9 Ide
// mounts no Code notice region and each band draws itself inline as c227f4d5e oL (generated/session-rail/inline-band.mjs)
// where the column mounts it — the workflow size band (cc43287c9 h6, in _6) before the usage band (SD → tL → rL), before
// the sleep / kept-awake bands (vu). These two follow the host's notices that stand for those bands (main.jsx
// workflowSizeNotice / usageNotice) into oL's props as the originals pass them.
// h6: `p(uk, {kind: "warning", icon: "Warning", message: s, detail: l, ctaLabel: i.stopWorkflow, onCta: r.onStop, ctaBusy:
// r.stopPending, secondaryCtaLabel: u, onSecondaryCta: d, secondaryCtaBoxed: !0, onDismiss: r.onDismiss})`, where
// `u = r.onView === null ? void 0 : i.viewWorkflow` ("View workflow" 8vTH0UDtIN). W14-code r8 sh8-02: c6's onView is
// ZE("workflow_notice") (c227f4d5e mQ: the Tasks pane with the workflow focused), which the host has (main.jsx
// openWorkflow), so the notice's `view` action is h6's boxed secondary CTA.
export function SourceInlineWorkflowBand({ notice }) {
  if (!notice) return null;
  const stop = notice.stop ?? null, view = notice.view ?? null;
  return <InlineBand kind="warning" icon="Warning" message={notice.summary} detail={notice.details || undefined}
    ctaLabel={stop?.label} onCta={stop?.run} ctaBusy={stop?.busy === true}
    secondaryCtaLabel={view?.label} onSecondaryCta={view?.run} secondaryCtaBoxed onDismiss={notice.onDismiss} />;
}
// W14-code r8 r8c-04 / sh8-02: cc43287c9 s6 `return Lm(e.name) ?? null` — the workflow task's name through shared-156 KX
// (generated/code-transcript shared-156: control / bidi / invisible characters dropped, at most 64 characters with "…"),
// null when it has none. The host's workflow task names itself as its row does (source-workflow.jsx WorkflowRow: the
// run's title, else its name, else the task's description: the script's file name).
export function workflowSizeName(task) {
  const run = task?.run ?? null;
  return workflowTaskLabel(run?.title || run?.name || task?.description) ?? null;
}
// cc43287c9 p6: "This workflow is larger than most." (Cq4p+nGVpi) without a name, else "{name} is larger than most
// workflows." (BlmlO/YC5d) with the name in `p("bdi", {className: "font-medium", children: t})`.
export function workflowSizeTitle(name) {
  if (name === null || name === undefined) return t("This workflow is larger than most.");
  const [before, after = ""] = t("{name} is larger than most workflows.").split("{name}");
  return <>{before}<bdi className="font-medium">{name}</bdi>{after}</>;
}
// tL's `lt = {kind: J, message, detail, ctaLabel: ge.label, onCta: ge.onClick, ctaDisabled: ge.disabled, ctaBusy: ge.busy,
// onDismiss: J === "approaching" ? U : void 0}` → rL → oL: a reached limit ("exceeded": the danger gauge, not dismissible)
// shows its reset as the live countdown QF (`et = y(QF, {resetsAtSeconds: _e, absolute: VI(_e, u)})`), an approaching one
// ("approaching": the middle gauge) its reset time and a dismiss. composerUsageNotice (electron/usage-model.mjs) marks a
// reached limit with its `nudge` field (present, possibly null, only on that path).
// W14-code r8 r8c-01: credits in use is tL's active overage (`b = v.isActive && !v.isApproachingLimit`), which is J
// "approaching" too: the middle gauge, "Now using usage credits" (UCevJHq7kc; "Now using extra usage" is the extra-usage
// vocabulary the host has none of), no detail (tL's `nt` is undefined there) and a dismiss that persists (the active
// overage flag below).
export function inlineUsageKind(notice) {
  if (!Object.hasOwn(notice, "nudge") || notice.activeOverage === true) return "approaching";
  return notice.level === "info" ? "notice" : "exceeded";
}
// W14-code r8 r8c-01 / r8c-02: the usage band's persisted dismissals. tL reads the approaching map through c2ad44bb9 i
// (shared-25 jH: localStorage "LSS-<key>", `{value, tabId, timestamp}`; the generated persisted-store's fH / OH) and the
// active overage flag through shared-25 UG (mantine useSessionStorage under "SSS-<key>", JSON). Both re-read on another
// window's storage event; this window's writes notify the band directly.
const usageDismissalListeners = new Set();
function subscribeUsageDismissals(listener) {
  usageDismissalListeners.add(listener);
  const target = globalThis.window;
  target?.addEventListener?.("storage", listener);
  return () => { usageDismissalListeners.delete(listener); target?.removeEventListener?.("storage", listener); };
}
const notifyUsageDismissals = () => { for (const listener of [...usageDismissalListeners]) listener(); };
const readStorage = (area, key) => { try { return globalThis[area]?.getItem(key) ?? null; } catch { return null; } };
const parseStored = (raw, unwrap) => {
  if (raw === null) return undefined;
  try { const value = JSON.parse(raw); return unwrap ? (value && typeof value === "object" && "value" in value ? value.value : undefined) : value; } catch { return undefined; }
};
const APPROACHING_KEY = USAGE_APPROACHING_DISMISSED_KEY(undefined);
const OVERAGE_STORAGE_KEY = `SSS-${USAGE_ACTIVE_OVERAGE_DISMISSED_KEY}`;
function useUsageDismissals() {
  const approachingRaw = useSyncExternalStore(subscribeUsageDismissals, () => readStorage("localStorage", persistedStorageKey(APPROACHING_KEY)), () => null);
  const overageRaw = useSyncExternalStore(subscribeUsageDismissals, () => readStorage("sessionStorage", OVERAGE_STORAGE_KEY), () => null);
  const stored = parseStored(approachingRaw, true);
  const approaching = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  return {
    approaching,
    overage: parseStored(overageRaw, false) === true,
    dismissApproaching(window, entry) { writePersisted(APPROACHING_KEY, { ...approaching, [window ?? ""]: entry }); notifyUsageDismissals(); },
    dismissOverage() { try { globalThis.sessionStorage?.setItem(OVERAGE_STORAGE_KEY, JSON.stringify(true)); } catch {} notifyUsageDismissals(); },
  };
}
export function SourceInlineUsageBand({ notice, actions = [] }) {
  const dismissals = useUsageDismissals();
  if (!notice) return null;
  const kind = inlineUsageKind(notice), overage = notice.activeOverage === true, cta = actions[0] ?? null;
  const validUntil = Number.isFinite(notice.validUntil) ? notice.validUntil : 0, threshold = Number.isFinite(notice.threshold) ? notice.threshold : 0;
  // tL `ee = b ? V : ws(R[k ?? ""], I, L)` … `if (… J === "approaching" && ee) return Re`.
  if (kind === "approaching" && (overage ? dismissals.overage : usageDismissalHolds(dismissals.approaching[notice.window ?? ""], threshold, validUntil))) return null;
  const detail = overage ? undefined : notice.countdown ? <>{notice.countdown.lead ? <>{notice.countdown.lead}{" "}</> : null}<UsageResetCountdown
    resetsAtSeconds={notice.countdown.resetsAtSeconds} absolute={notice.countdown.absolute} /></> : notice.details || undefined;
  const dismiss = () => {
    // tL U: `b ? H(!0) : z((e) => ({...e, [k ?? ""]: {validUntil: L, threshold: I}}))`.
    if (overage) dismissals.dismissOverage(); else dismissals.dismissApproaching(notice.window, { validUntil, threshold });
    notice.onDismiss?.();
  };
  return <InlineBand kind={kind} message={overage ? t("Now using usage credits") : notice.summary} detail={detail} ctaLabel={cta?.label} onCta={cta?.disabled ? undefined : cta?.run}
    ctaDisabled={cta?.disabled === true} ctaBusy={cta?.busy === true}
    onDismiss={kind === "approaching" ? dismiss : undefined} />;
}
// W14-code R5DC-07: no caller passed `extra` (main.jsx mounts it with notices only), so the slot is gone.
export function SourceSessionNotices({ notices, onReveal, onTrust, trusting = false, workspace = null, inColumn = false }) {
  const [dismissed, setDismissed] = useState(() => new Set());
  const [trustPrompt, setTrustPrompt] = useState(null);
  const shown = (notices || []).filter((notice) => !dismissed.has(noticeKey(notice)));
  const dismiss = (key) => {
    const notice = shown.find((entry) => noticeKey(entry) === key);
    setDismissed((current) => new Set(current).add(key));
    notice?.onDismiss?.();
  };
  // confirmTrust: true for the session's folder (workspace), or the folder to trust.
  const onConfirmTrust = (folder, accept) => { const target = folder === true ? workspace : folder; if (target) setTrustPrompt({ workspace: target, accept }); else accept(); };
  // W14-code r6 sh6-04: c516e93ca v — `if (!(!N || z.current)) { z.current = !0; try { await I(N.cwd, N.remote) } catch
  // (e) { L(…skoSLd5vgp…); z.current = !1; return } z.current = !1, F(!0, N.id) … }`: the dialog stays open while the
  // trust is saved, a second accept meanwhile does nothing, and a failed save (the host's accept answers false after
  // its addError toast) leaves it open to try again. Only a saved trust closes it.
  const accepting = useRef(false);
  const acceptTrust = async () => {
    if (!trustPrompt || accepting.current) return;
    accepting.current = true;
    let saved;
    try { saved = await trustPrompt.accept(); } catch { saved = false; }
    accepting.current = false;
    if (saved !== false) setTrustPrompt(null);
  };
  // W14-code r6 sleep lane (r6-composer-03 / sh6-01 / r6-composer-05): cc43287c9 Rde — `{entries, setRegionMounted} =
  // HD()` (c227f4d5e mI), the region marks itself mounted (`t(!0), () => t(!1)`), and the items are `VE.flatMap(t => …)`
  // over rI's slot order: `{key: P7(t, r.id) ("code-<slot>:<id>"), content: r.content, dismissible: r.onDismiss !== void
  // 0 && r.dismissible, skipEnter: i (registered before the region) || !s (not inside a [data-band-enter])}`; Rde's
  // onDismiss finds the slot entry whose key it is and calls its onDismiss. The bands (k_: sleep, kept awake) come from
  // the slot table; a host notice naming an official slot (`slot`: "workflow" for the workflow size warning, "limit" for
  // the usage limit) takes that slot's place in rI's order, and the host's own notices (Codex warnings, hooks, buffering,
  // upsell, upgrade, the workspace headline, …) follow the official slots.
  // r6 review fix: that is the Code column (main.jsx codeNoticeSlots). Chat / Cowork mount no region (no slot table: mI
  // reads none) and name no slot, so their stack keeps the order main.jsx lists, with the bands as host entries.
  const { entries, setRegionMounted } = useCodeNoticeSlotEntries();
  useLayoutEffect(() => { setRegionMounted(true); return () => setRegionMounted(false); }, [setRegionMounted]);
  const [stack, setStack] = useState(null);
  const inBandEnter = stack !== null && stack.closest("[data-band-enter]") !== null;
  const noticeItemFor = (notice) => noticeItem(notice, { onReveal, onTrust, trusting, onConfirmTrust, onDismiss: () => dismiss(noticeKey(notice)) });
  const slotted = new Set();
  const slotItems = CODE_NOTICE_SLOT_ORDER.flatMap((slot) => {
    const own = shown.filter((notice) => notice.slot === slot);
    own.forEach((notice) => slotted.add(notice));
    const entry = entries.get(slot);
    const official = entry === undefined ? [] : [{ key: `code-${slot}:${entry.notice.id}`, content: entry.notice.content,
      dismissible: entry.notice.onDismiss !== undefined && entry.notice.dismissible, skipEnter: entry.early || !inBandEnter }];
    return [...own.map(noticeItemFor), ...official];
  });
  const items = [...slotItems, ...shown.filter((notice) => !slotted.has(notice)).map(noticeItemFor)];
  const onDismiss = (key) => {
    for (const slot of CODE_NOTICE_SLOT_ORDER) {
      const notice = entries.get(slot)?.notice;
      if (notice !== undefined && `code-${slot}:${notice.id}` === key) { notice.onDismiss?.(); return; }
    }
    dismiss(key);
  };
  // W14-code r7 r7c-03: inside the Code notice region the stack is cc43287c9 Rde, which zde mounts whenever the region is
  // there (`JE() ? p(Rde, {}) : null`) and which always draws its ref'd div around RM (`p("div", { ref: a, …u, className:
  // Nl, children: p(Os, { items: c, onDismiss: l }) })`), items or not. So the div is in the DOM before the first slot band
  // registers, and that band's `skipEnter: i || !s` sees the stack's [data-band-enter] ancestor and plays band-enter.
  // Outside the region (Chat / Cowork, or Code with __gb__100087145 off) the host stack still draws nothing without items.
  const inRegion = useInCodeNoticeRegion();
  if (!inRegion && !items.length && !trustPrompt) return null;
  return <div ref={setStack} className={inColumn ? NOTICE_STACK_CLASS : `ssn-list ${NOTICE_STACK_CLASS}`} data-cds-dock-group="" data-code-column-notices="">
    {(inRegion || items.length > 0) && <ChatComposerNotices items={items} onDismiss={onDismiss} />}
    {trustPrompt && <WorkspaceTrustDialog isOpen workspace={trustPrompt.workspace} isRemote={false} sources={NO_TRUST_SOURCES}
      onAccept={acceptTrust} onDecline={() => setTrustPrompt(null)} />}
  </div>;
}
