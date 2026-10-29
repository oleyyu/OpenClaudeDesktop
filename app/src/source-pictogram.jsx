import React from "react";
// E41: source-chat-adapters (chat / composer graph) imports this file, so CdsPictogram comes from its concrete view-tabs
// file by semantic name instead of the facade (index.js evaluates every view-tabs module).
import { CdsPictogram } from "./generated/view-tabs/shared-156-BLTosN8U.js";
import * as DEFS from "./pictogram-defs.mjs";
import { e as HandBlocks } from "./generated/chat/cbcaf521a-CrWJ5SHy.js";

// The official CDS Pictogram (3.6556.2 shared-156 KG, exported as Hr), published by view-tabs as CdsPictogram since
// w11-pictogram-d1 (D1: cowork-scheduled and code-routines import that one copy too). KG draws the asset in a 500×500
// viewBox at BG {sm:64, md:96} (or a number), merges `style` over HG {flexShrink:0}, fills the highlight paths with
// VG[highlightFill] (default / heather / cactus; "peach" reads as default) and the line paths with currentColor,
// clips them to `asset.clip` when the asset has one, and is aria-hidden unless it has an `alt` (WG: role="img" +
// aria-label). Every other prop reaches the svg.
// The host addition is the lookup by `name`: the source lazy-loads each def (shared-1 xR over the def loaders); the
// Customize defs are bundled here (pictogram-defs.mjs) and HandBlocks comes from its own official chunk, so the SVG
// is present on first paint. An explicit `asset` wins over `name`.
export const PICTOGRAM_SIZES = Object.freeze({ sm: 64, md: 96 });

export function SourcePictogram({ name, asset, ...props }) {
  const def = asset ?? (name === "HandBlocks" ? HandBlocks : DEFS[name]);
  if (!def) return null;
  return <CdsPictogram asset={def} {...props} />;
}
