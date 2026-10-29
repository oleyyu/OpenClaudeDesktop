// R4g-composer CP4 (X7-10): host answers for the imports scripts/extract-code-composer.mjs maps to this module for the
// generated composer-attachment-tiles.mjs (the 3.6556.2 c0fbbe82d tile wrappers Vi / Ui / Wi / Bi / Ri; 2.42304.0 hr / _r /
// vr / mr / pr). Each export
// names the original binding it stands in for.
import React from 'react';
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
