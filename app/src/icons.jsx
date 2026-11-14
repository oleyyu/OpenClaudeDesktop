import React from "react";
import { CdsIcon } from "./cds-core.mjs";
// The host Icon is the official 4.16336.0 CdsIcon (shared-frame-CJdE5Ria.js Bs, generated in src/generated/cds-core and
// re-exported by cds-core.mjs); this wrapper only maps the host call contract onto its props, so the glyph table
// (gs.icons, 412 + 24 secondary), the optical sizes/weights (bs, gs.wght, Is opsz 18→20 / 24→24), the secondary layer,
// RTL mirroring and the accessibility attributes are the official ones:
//   size   a number of pixels → customSize (Bs: nearest bs token, ties to the larger, then Ls(px, stroke));
//          a CDS size token ("xs" … "xxl", "auto", "auto-sm", "auto-lg") → size, resolved against the density Context.
//          The host default stays 16 px (customSize 16), not the official default "md": callers were written for 16.
//   weight "strong" → bold (the official strong stroke where the token has one: sm / md); anything else → regular.
//   className, style and every other prop (alt, rotate, aria-*, data-*, handlers) pass through to Bs unchanged.
// A name the official table lacks renders an empty Icon span, as Bs does (no Placeholder fallback here).
//   accessibility  The previous host Icon defaulted aria-hidden="true" and let a caller lift it with an explicit
//          'aria-hidden': undefined. Bs instead computes aria-hidden = props["aria-hidden"] ?? (!alt || undefined), so an
//          explicit undefined falls back to hidden. A caller that names the icon (aria-label) and explicitly lifts
//          aria-hidden therefore gets that label as the official alt, which is how Bs exposes an accessible icon
//          (role="img", aria-label, no aria-hidden).
export function Icon({ name, size = 16, weight = "regular", ...props }) {
  if (
    props.alt === undefined &&
    props["aria-label"] != null &&
    Object.hasOwn(props, "aria-hidden") &&
    props["aria-hidden"] === undefined
  ) {
    const { "aria-hidden": _lifted, ...rest } = props;
    props = { ...rest, alt: props["aria-label"] };
  }
  return (
    <CdsIcon
      {...props}
      name={name}
      {...(typeof size === "number" ? { customSize: size } : { size })}
      bold={weight === "strong"}
    />
  );
}
// W14-code r5 cleanup R5DC-02: the 32 Phosphor-name wrappers (ArrowLeft … DotsThree) and their `make` factory are
// gone; nothing imported them after closeout R4DC-N3. Callers use <Icon name="…" /> with the CDS glyph names.
