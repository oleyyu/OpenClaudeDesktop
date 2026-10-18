// R4e-plugin (settings-14): host services for the original 2.42304.0 plugin Overview parts that
// scripts/extract-r4e-plugin.mjs emits (generated/r4e-plugin/overview-sections.mjs = cae01a6fc U / W / X / J / se,
// generated/r4e-plugin/overview-layout.mjs = shared-19 kD / AD / OD). Each export replaces one import of the original
// and is feature-checked by the extractor against the declaration it stands for. The CDS primitives are the host
// stand-ins the Customize page already draws (not the view-tabs graph: see the extractor's header for why).
import React, { useRef } from "react";
import { Icon } from "./icons.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourceTooltip, textOverflows } from "./source-tooltip.jsx";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { SourceInfoTip } from "./source-infotip.jsx";

// shared-frame X is tailwind-merge over clsx. The Overview's joins only ever repeat a class (OverflowTooltip's min-w-0)
// or override the card ring (OD's after:shadow-none), so this keeps the last of identical classes and lets a later
// after:shadow-* drop an earlier one — the same result tailwind-merge gives for these inputs.
function mergeClasses(...parts) {
  const tokens = parts.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  const kept = [];
  tokens.forEach((token, index) => {
    const later = tokens.slice(index + 1);
    if (later.includes(token)) return;
    if (token.startsWith("after:shadow-") && later.some(next => next.startsWith("after:shadow-"))) return;
    kept.push(token);
  });
  return kept.join(" ");
}

// shared-frame $l (exported cl): the CDS Button. Host: SourceSettingsButton (data-cds="Button", variant, size, flush
// start/end/both as ms-/me-/mx-outset against --cds-outset-x), the Customize page's button. X passes a ghost xs
// flush-both button with an onClick; its href form (a CaretRight link) is only for rows that carry an href, which ae
// never builds.
export function OverviewButton({ variant, size, flush, className, onClick, icon, iconPosition, "aria-label": ariaLabel, children }) {
  return <SourceSettingsButton variant={variant} size={size} flush={flush} className={className} onClick={onClick} icon={icon} iconPosition={iconPosition} aria-label={ariaLabel}>{children}</SourceSettingsButton>;
}

// shared-frame Jo (exported Hl): the CDS Icon. Host Icon (CDS "xs" is 12px, the default "sm" 16px); X draws it only for
// string icons (reach and CLI rows), which plugin/read never yields.
export function OverviewIcon({ name, size }) {
  return <Icon name={name} size={size === "xs" ? 12 : 16} />;
}

// shared-frame gm (exported Dc): the CDS OverflowTooltip — its single-line span with the original data-cds and
// classes, showing its text in a tooltip only while truncated (the host SourceTooltip, as EnvironmentOverflowText).
export function OverviewOverflowText({ className, children }) {
  const text = useRef(null);
  return <SourceTooltip content={() => (textOverflows(text.current, { subpixel: true }) ? children : undefined)}>
    <span ref={text} data-cds="OverflowTooltip" className={mergeClasses("block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap", className)}>{children}</span>
  </SourceTooltip>;
}

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog, as the other generators do.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-52 gk (exported Go): `Sa() && ae(<gate 2406162393>)`, the unified plugins UI. The host has no GrowthBook, so the
// gate is closed (D29/D31): headings are the classic "text-caption text-secondary" ones and c24c8737b xs never enables
// the Tool permissions servers.
export function useUnifiedPluginsUi() {
  return false;
}

// shared-5 Jm (exported _s): `P(Bm)?.pageLayout === !0`. Customize lives in the classic settings dialog here
// (pageLayout=false, see source-customize.jsx), so a row's icon tile is "bg-fill-control".
export function usePageLayout() {
  return false;
}

// c79fa23ba g (exported r): GrowthBook gate 1063785924, linkified plugin descriptions. Closed on the host, so the
// description paragraph keeps its plain sanitized text and `linkifyDescription` (c79fa23ba _, exported t) is never
// reached; it returns the text unchanged rather than inventing a second link renderer.
export function useLinkifiedDescription() {
  return false;
}
export function linkifyDescription(text) {
  return text;
}

// shared-frame oE (exported Xi): the CDS InfoTip a row's `hint` opens. The host InfoTip is SourceInfoTip (same trigger,
// popup and copy; numeric glyph size: CDS "xs" is 12px, the default "sm" 16px). Only reach rows carry hints, and
// plugin/read reports no reach, so host rows never draw one.
export function OverviewInfoTip({ size, content, "aria-label": ariaLabel }) {
  return <SourceInfoTip size={size === "xs" ? 12 : 16} content={content} aria-label={ariaLabel} />;
}

// shared-frame yu = Object.assign(pu, { Link, Media }) (exported ol): the CDS Card. It has no view-tabs public name yet
// (only R3-graph edits extract-view-tabs.mjs), so this draws pu's DOM with its class strings, which the extractor pins
// on the original (ru / au / ou / iu, aa's data-size, X = mergeClasses above). Not drawn: pu's depth context
// (su, read only by CardLink / CardMedia) and its press-ratio ResizeObserver (fu, for pressable cards); the Overview
// rail card holds neither.
const CARD = "group/card relative isolate flex flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-['']";
const CARD_LINK_FOCUS = "has-[[data-cds=CardLink]:focus-visible]:after:shadow-focus";
const CARD_FILL = "cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit]";
const CARD_BODY = "cds-card-body flex min-h-0 flex-1 flex-col self-stretch [gap:inherit] [align-items:inherit] [justify-content:inherit] rounded-[inherit] p-lg";
export function OverviewCard({ size, className, backgroundClassName, children, ...rest }) {
  return <div data-cds="Card" {...(size && size !== "base" ? { "data-size": size } : {})} {...rest} className={mergeClasses(CARD, CARD_LINK_FOCUS, className)}>
    <span aria-hidden={true} className={mergeClasses(CARD_FILL, backgroundClassName)} />
    <div data-cds-card-body="" className={CARD_BODY}>{children}</div>
  </div>;
}
