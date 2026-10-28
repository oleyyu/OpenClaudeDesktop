// The computer-use card in the Code session rail: the original's activity-panel card (2.42304.0 c21f11e6d P_ over the
// frame card c5f921d63 N; docs/computer-use-ui-css-source-20261020.md §4) in the rail's own card (RailCard), next to
// Background tasks. The original shows this card only in Cowork's activity panel; the Code rail has none (user's call,
// 2026-10-20). RailCard looks a section's name up by id for its drag grip and Show menu, which know no "computerUse":
// the card sits outside the rail's section order (no grip, not in Show / Reset).
//
// The frame is the live preview while main sends one (electron/computer-use/preview.cjs: the window the session last
// looked at, 1 fps, with the Live badge and "Background · {app}"), else the transcript's last computer-use screenshot
// (the original's `frame ?? screenshotSrc`). The card shows once the session has a computer-use step. Pressing the frame
// opens it in the image viewer (the original opens its activity detail, which this app does not have).
import React, { useEffect, useRef, useState } from "react";
import { RailCard, RailCardGripContext, useRailFlat } from "./generated/session-rail-kit/rail-card.mjs";
import { CdsBadge, CdsShimmer } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import { computerUseAction, computerUseScreenshot } from "./computer-use-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// N.s frame chromes: P (card), F (flat), I (flat without a frame).
const FRAME = "block w-full overflow-hidden rounded-md border-0.5 bg-surface-3";
const FRAME_FLAT = "block w-full overflow-hidden rounded-md border-0.5 my-1.5";
const EMPTY_FLAT = "block w-full min-w-0 text-start";

/** N's R: a button when the frame opens something, else a box. */
function FrameBox({ onOpen, openLabel, chrome, buttonRef, children }) {
  return onOpen
    ? <button ref={buttonRef} type="button" onClick={onOpen} aria-label={openLabel} className={`${chrome} focus-visible:outline-none focus-visible:ring-2`}>{children}</button>
    : <div className={chrome}>{children}</div>;
}

// Asking for access and handing the apps back (app_release) are not steps, as in-use.cjs counts them.
const isStep = (item) => { const action = computerUseAction(item); return !!action && action.kind !== "request_access" && action.kind !== "release"; };

/** Whether main counts the session as using the computer (in-use.cjs), kept current by its events. */
function useInUse(sessionId, desktop) {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    if (!desktop?.call) return undefined;
    let live = true;
    desktop.call("computer-use:in-use").then((list) => { if (live && Array.isArray(list)) setSessions(list); }, () => {});
    const off = desktop.onEvent?.((event) => { if (live && event?.kind === "computer-use-in-use" && Array.isArray(event.sessions)) setSessions(event.sessions); });
    return () => { live = false; off?.(); };
  }, [desktop]);
  return !!sessionId && sessions.includes(sessionId);
}

/** N's setSubscribed: while the card is up for a session in use, main sends its live frames. */
function useLivePreview(sessionId, desktop, wanted) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    setPreview(null);
    if (!wanted || !sessionId || !desktop?.call) return undefined;
    let live = true;
    const off = desktop.onEvent?.((event) => {
      if (live && event?.kind === "computer-use-preview" && event.sessionId === sessionId) setPreview(event.active ? event : null);
    });
    desktop.call("computer-use:preview", { sessionId, on: true }).catch(() => {});
    return () => { live = false; off?.(); desktop.call("computer-use:preview", { sessionId, on: false }).catch(() => {}); };
  }, [sessionId, desktop, wanted]);
  return preview;
}

/**
 * @param {{sessionId: string, items: object[] | null, desktop: object | null, coreName?: string}} props
 */
export function SessionRailComputerUse({ sessionId, items, desktop, coreName }) {
  const flat = useRailFlat();
  const inUse = useInUse(sessionId, desktop);
  const preview = useLivePreview(sessionId, desktop, inUse);
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const steps = Array.isArray(items) ? items.filter(isStep) : [];
  const live = preview?.active === true && typeof preview.frame === "string";
  if (!steps.length && !live) return null;
  let screenshot = null;
  for (let index = steps.length - 1; index >= 0 && !screenshot; index -= 1) screenshot = computerUseScreenshot(steps[index]);
  const frame = live ? preview.frame : screenshot;
  const name = coreName || "Claude";
  const empty = flat
    ? <span className="block py-1.5 text-caption text-muted-as-secondary">{t("{name} is working on your computer. You’ll see updates here as {name} makes progress.", { name })}</span>
    : <p className="text-muted-as-secondary font-small">{t("{name} is working on your computer. You’ll see updates here as {name} makes progress.", { name })}</p>;
  const caption = live
    ? <span className="inline-flex items-center gap-1.5">
        <CdsBadge variant="success" size="xs">{t("Live")}</CdsBadge>
        {preview.mode === "display" ? t("Full control · {target}", { target: preview.targetLabel ?? "" }) : t("Background · {target}", { target: preview.targetLabel ?? "" })}
      </span>
    : undefined;
  const onOpen = frame ? () => setOpen(true) : undefined;
  const openLabel = t("Open computer use activity");
  const title = t("Computer use");
  return (
    <RailCardGripContext.Provider value={null}>
      <RailCard id="computerUse" title={inUse ? <CdsShimmer>{title}</CdsShimmer> : title} busy={inUse}>
        <div className="flex flex-col" data-computer-use-card="" data-live={live || undefined}>
          {flat && !frame
            ? <FrameBox chrome={EMPTY_FLAT}>{empty}</FrameBox>
            : <FrameBox onOpen={onOpen} openLabel={openLabel} buttonRef={button} chrome={flat ? FRAME_FLAT : FRAME}>
                {frame
                  ? <img src={frame} alt="" className="w-full h-auto max-h-72 object-contain" draggable={false} />
                  : <div className="px-3 py-6 text-start">{empty}</div>}
              </FrameBox>}
          {caption !== undefined && <p className={`truncate ${flat ? "py-1.5 text-caption text-muted-as-secondary" : "text-secondary font-small mt-1.5"}`}>{caption}</p>}
        </div>
        {open && frame && <SourceImageViewer src={frame} alt={title} caption={title} originRef={button} onClose={() => setOpen(false)} />}
      </RailCard>
    </RailCardGripContext.Provider>
  );
}
