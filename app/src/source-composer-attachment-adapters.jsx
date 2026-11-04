// R4g-composer CP4 (X7-10): host answers for the imports scripts/extract-code-composer.mjs maps to this module for the
// generated composer-attachment-tiles.mjs (the 3.6556.2 c0fbbe82d tile wrappers Vi / Ui / Wi / Bi / Ri; 2.42304.0 hr / _r /
// vr / mr / pr). Each export
// names the original binding it stands in for.
import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { AttachmentFile, AttachmentImage, AttachmentQuote, AttachmentVideo } from './generated/code-composer/chat-composer-attachments.mjs';
import { pathTooltipContent, pathTooltipPlacement } from './generated/code-composer/path-tooltip-placement.mjs';
import { CdsTooltip } from './generated/view-tabs/index.js';
import { StartMessage } from './source-code-start-adapters.jsx';

// shared-2 th (exported `ry`, the wrappers' `it`; 2.42304.0 Hp / `zg`) is `Object.assign(eh, { Image: Im, Video: Um, File:
// qm, Quote: $m })`. The wrappers read it.Image (Vi), it.Video (Hi), it.File (Ui) and it.Quote (Wi): all four generated
// originals.
// Official Vi shows a Video tile only for an attachment that keeps its File object (remote / SSH staging), never for a
// local environment's _G attachments; source-composer-tiles.jsx applies the same test (a host entry keeps no File).
// eh itself is left untouched (no Object.assign): the shell's Attachments part stays the generated MessageAttachments.
export const ComposerAttachmentTiles = Object.freeze({ Image: AttachmentImage, Video: AttachmentVideo, File: AttachmentFile, Quote: AttachmentQuote });

// c856385e2-aEyDzrcK Kn (exported `a`, c0fbbe82d `hn`; 2.42304.0 On / `i`): the path hover card a tile is the trigger of — `disabled: !l` until the
// path resolves (Z(e)), then the path row with open / attach / reveal actions over the file-preview services, shared-28
// and shared-104. The host has no such hover card service; a tile with a path gets the official path tooltip body the
// folder chip already uses (generated path-tooltip-placement.mjs: cc5c56f5c n in a `side: "bottom"`, `align: "start"`,
// 480px tooltip), and a tile without one (a pasted image) is just its trigger, as On is disabled for it. Opening and
// revealing stay on the tile's own press (the host routes it through onOpenFile).
export function ComposerPathHoverCard({ path, trigger }) {
  if (path === undefined || path === null || path === '') return trigger;
  return <CdsTooltip content={pathTooltipContent(path)} side={pathTooltipPlacement.side} align={pathTooltipPlacement.align}
    className={pathTooltipPlacement.className} multiline>{trigger}</CdsTooltip>;
}

// vendor-intl `l` (react-intl FormattedMessage): the local catalog, as every Code surface (source-code-start-adapters).
export const ComposerMessage = StartMessage;

// W14-code composer-15: c0fbbe82d Hr (`Vr.Component`, the lazily loaded cbd02b8f2 ka EpitaxyCodeMirrorText) for the
// generated Saved draft dialog (composer-held-text-dialog.mjs sa). The host has no CodeMirror; this keeps ka's contract
// and box: the root `div` with `cn("flex flex-col", className)`, the handle {getValue, focus, getContentElement}, the
// content's aria-label, readOnly, autoFocus, onDirty on the first change only, Mod-Enter running onSubmit, and onUnmount
// handed the text getter. Da's theme rides on the textarea: flex 1 1 0% with min-height 0, the mono font, 8px block and
// 10px inline padding, wrapped lines (T.lineWrapping), tabindex 0.
export function ComposerHeldTextEditor({ initialValue, readOnly = false, ariaLabel, autoFocus = false, onDirty, onSubmit, onUnmount, className, ref }) {
  const area = useRef(null), dirty = useRef(false), latest = useRef({ onUnmount, initialValue });
  latest.current = { onUnmount, initialValue };
  useImperativeHandle(ref, () => ({
    getValue: () => area.current?.value ?? latest.current.initialValue,
    focus: () => area.current?.focus(),
    getContentElement: () => area.current ?? null,
  }), []);
  useEffect(() => {
    const element = area.current;
    if (autoFocus) element?.focus();
    return () => { const text = element?.value ?? latest.current.initialValue; latest.current.onUnmount?.(() => text); };
  }, []);
  return <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
    <textarea ref={area} defaultValue={initialValue} readOnly={readOnly} aria-label={ariaLabel} tabIndex={0} spellCheck={false}
      data-held-text-editor=""
      style={{ flex: '1 1 0%', minHeight: 0, height: '16rem', padding: '8px 10px', border: 0,
        background: 'transparent', color: 'inherit', font: 'inherit', fontFamily: 'var(--cds-font-mono)', resize: 'none', outline: 'none',
        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      onChange={() => { if (!dirty.current) { dirty.current = true; onDirty?.(); } }}
      onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); onSubmit?.(); } }} />
  </div>;
}
