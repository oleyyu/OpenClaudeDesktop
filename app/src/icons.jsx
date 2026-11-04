import React from "react";
import glyphs from "./generated/icons.json";
// Glyph mapping from shared-frame-DVFSKIcx.js Ka.icons (2.31226.0, in step with the vendored c0f671921-CWPPK3vl font);
// the optical weight formula (Ka.wght) is unchanged since 2.110.1.
export function Icon({
  name,
  size = 16,
  weight = "regular",
  className = "",
  style,
  glyphMap = glyphs,
  ...props
}) {
  const master = size <= 18 ? 16 : 20;
  // shared-frame ta/sa: nearest size token, with ties choosing the larger token.
  const token = [12, 16, 20, 24, 28, 32].reduce((best, px) => Math.abs(px - size) <= Math.abs(best - size) ? px : best, 12);
  const regular = { 12: .8, 16: 1, 20: 1.2, 24: 1.4, 28: 1.6, 32: 1.8 };
  const stroke = weight === "strong" && [16, 20].includes(token)
    ? token === 16 ? 1.25 : 1.5
    : regular[token];
  const [lo, hi] = master === 16 ? [0.8, 1.25] : [1.125, 1.8];
  const w =
    Math.round(
      Math.max(
        400,
        Math.min(
          700,
          400 + 300 * (((stroke * master) / size - lo) / (hi - lo)),
        ),
      ) * 10,
    ) / 10;
  return (
    <span
      aria-hidden="true"
      data-cds="Icon"
      className={className}
      style={{ fontSize: size, fontWeight: w, ...style }}
      {...props}
    >
      {String.fromCodePoint(glyphMap[name] || glyphMap.Placeholder)}
    </span>
  );
}
// W14-code r5 cleanup R5DC-02: the 32 Phosphor-name wrappers (ArrowLeft … DotsThree) and their `make` factory are
// gone; nothing imported them after closeout R4DC-N3. Callers use <Icon name="…" /> with the CDS glyph names.
