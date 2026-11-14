// Computer use in the transcript (computer-use-model.mjs): one step row per action (the official Code-tab verbs:
// "Clicked", "Typed “hello”", "Pressed key ⌘C"). A step with a screenshot carries the official screenshot thumbnail
// (2.42304.0 cc1aae219 NH: 36×28, hover tilt; docs/computer-use-ui-css-source-20261020.md §2.1) in the step's media
// slot, and pressing it opens the image viewer. Computer use never passes coordinates, so the thumbnail has no click
// dot and the screenshot no marker. SourceComputerUseBanner is the official docked strip (c5f921d63 W; §3) at the top
// of the conversation while the session is using the computer: a pulsing clay dot, "{name} is using your computer" and Stop.
import React, { useRef, useState } from "react";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { computerUseAction, computerUseIcon, computerUseLabel, computerUseScreenshot } from "./computer-use-model.mjs";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";

/** NH: the screenshot thumbnail; the click stays off the row. */
function ScreenshotThumbnail({ src, buttonRef, onOpen }) {
  return (
    <button ref={buttonRef} type="button" data-testid="tool-image-thumbnail"
      className="relative flex-shrink-0 w-9 h-7 rounded border border-border-300 hover:border-border-200 hover:rotate-2 transition-[border-color,box-shadow,rotate,transform,outline-color] duration-150 ease-out hover:shadow-sm overflow-hidden"
      title={t("Click to view full screenshot")} onClick={(event) => { event.stopPropagation(); onOpen(); }}
      onKeyDown={(event) => event.stopPropagation()}>
      <img src={src} alt={t("Screenshot thumbnail")} className="w-full h-full object-cover" loading="lazy" decoding="async" draggable={false} />
    </button>
  );
}

/**
 * One computer-use step as a transcript row: the action's icon, the official verbs, and the screenshot thumbnail when
 * the step has one.
 * Step is the shared SourceStep; the row has no body (as the original, which hides its caret).
 * @param {{item: object, state: string, Step: Function, stepProps: object}} props
 */
export function SourceComputerUseStep({ item, state, Step, stepProps }) {
  const action = computerUseAction(item);
  const screenshot = computerUseScreenshot(item);
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const { label, meta } = computerUseLabel(action, state);
  // zW: 16px, text-muted-as-secondary, before the verb.
  const glyph = computerUseIcon(action);
  const icon = <Icon name={glyph.name} size={16} className="text-muted-as-secondary" dir={glyph.dir} data-icon={glyph.name} />;
  const media = screenshot ? <>
    <ScreenshotThumbnail src={screenshot} buttonRef={button} onOpen={() => setOpen(true)} />
    {open && <SourceImageViewer src={screenshot} alt={t("Screenshot")} caption={[label, meta].filter(Boolean).join(" ")} originRef={button} onClose={() => setOpen(false)} />}
  </> : null;
  return <Step item={item} {...stepProps} label={label} meta={meta} state={state} classic caretSize={14} className={`source-generic-step scu-step scu-kind-${action.kind}`} icon={icon} media={media} />;
}

/**
 * The docked strip while the session uses the computer (official c5f921d63 W, not in a desktop frame: relative shrink-0).
 * The original shows it while its full control lock is held; here while main's in-use signal names the session
 * (electron/computer-use/in-use.cjs), from its first computer-use step until the turn ends — the screen glow's signal.
 * It names no action and shows no screenshot, as the original.
 * @param {{coreName?: string, onStop?: () => void, stopping?: boolean}} props
 */
export function SourceComputerUseBanner({ coreName, onStop, stopping = false }) {
  return (
    <div className="flex items-center gap-2 border-b border-accent-brand/20 bg-surface-1 px-4 py-2 relative shrink-0" data-computer-use-banner="">
      <div className="pointer-events-none absolute inset-0 bg-accent-brand/15" />
      <span className="relative h-2 w-2 shrink-0 motion-safe:animate-pulse rounded-full bg-fill-brand" />
      <span role="status" className="relative text-sm font-semibold text-clay-emphasized">
        {coreName ? t("{name} is using your computer", { name: coreName }) : t("Using your computer")}
      </span>
      <span className="relative ms-auto flex items-center gap-1">
        {onStop && <SourceSettingsButton variant="secondary" size="xs" busy={stopping} onClick={() => onStop()} data-testid="cu-docked-stop">{t("Stop")}</SourceSettingsButton>}
      </span>
    </div>
  );
}
