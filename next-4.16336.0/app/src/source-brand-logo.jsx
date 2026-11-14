// A vendor logo on a small rounded tile (src/brand-logos.mjs), like an app icon: setup's agent cards, Settings ›
// Cores rows and Quick setup presets. An unknown brand shows the generic box glyph.
import React from "react";
import { BRAND_SVGS } from "./brand-logos.mjs";
import { Icon } from "./icons";
import "./source-brand-logo.css";

export function SourceBrandLogo({ brand, size = 40, className = "" }) {
  const svg = brand && Object.hasOwn(BRAND_SVGS, brand) ? BRAND_SVGS[brand] : null;
  return (
    <span className={`sbl ${className}`.trim()} style={{ "--sbl-size": `${size}px` }} data-brand={brand || undefined} aria-hidden="true">
      {svg ? <span className="sbl-mark" dangerouslySetInnerHTML={{ __html: svg }} /> : <Icon name="Box" size={Math.round(size * 0.5)} />}
    </span>
  );
}
