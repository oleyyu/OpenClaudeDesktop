// R4g-composer CP4 (X7-10): host answers for the imports scripts/extract-code-composer.mjs maps to this module for the
// generated composer-attachment-tiles.mjs (the 2.42304.0 c0fbbe82d tile wrappers hr / _r / vr / mr / pr). Each export
// names the original binding it stands in for.
import React from 'react';
import { AttachmentFile, AttachmentImage, AttachmentQuote, AttachmentVideo } from './generated/code-composer/chat-composer-attachments.mjs';
import { pathTooltipContent, pathTooltipPlacement } from './generated/code-composer/path-tooltip-placement.mjs';
import { CdsTooltip } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { StartMessage } from './source-code-start-adapters.jsx';

// shared-2 Hp (exported `zg`, the wrappers' `U`) is `Object.assign(Vp, { Image: wp, Video: Ap, File: Pp, Quote: Bp })`.
// The wrappers read U.Image (hr), U.Video (gr, R4i-graph GR3), U.File (_r) and U.Quote (vr): all four generated originals.
// Official Vi shows a Video tile only for an attachment that keeps its File object (remote / SSH staging), never for a
// local environment's _G attachments; source-composer-tiles.jsx applies the same test (a host entry keeps no File).
// Vp itself is left untouched (no Object.assign): the shell's Attachments part stays the generated MessageAttachments.
export const ComposerAttachmentTiles = Object.freeze({ Image: AttachmentImage, Video: AttachmentVideo, File: AttachmentFile, Quote: AttachmentQuote });

// c856385e2 On (exported `i`, c0fbbe82d `Dt`): the path hover card a tile is the trigger of — `disabled: !l` until the
// path resolves (Z(e)), then the path row with open / attach / reveal actions over the file-preview services, shared-28
// and shared-104. The host has no such hover card service; a tile with a path gets the official path tooltip body the
// folder chip already uses (generated path-tooltip-placement.mjs: c0fbbe82d hn in a `side: "bottom"`, `align: "start"`,
// 480px tooltip), and a tile without one (a pasted image) is just its trigger, as On is disabled for it. Opening and
// revealing stay on the tile's own press (the host routes it through onOpenFile).
export function ComposerPathHoverCard({ path, trigger }) {
  if (path === undefined || path === null || path === '') return trigger;
  return <CdsTooltip content={pathTooltipContent(path)} side={pathTooltipPlacement.side} align={pathTooltipPlacement.align}
    className={pathTooltipPlacement.className} multiline>{trigger}</CdsTooltip>;
}

// vendor-intl `l` (react-intl FormattedMessage): the local catalog, as every Code surface (source-code-start-adapters).
export const ComposerMessage = StartMessage;
