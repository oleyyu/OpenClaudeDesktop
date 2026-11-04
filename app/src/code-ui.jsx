import React from "react";
// E41: code-ui sits in the menu graph (source-sidebar / source-titlebar), so CDS comes from the concrete view-tabs file.
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { SourceTooltip } from "./source-tooltip";
import { t } from "../electron/i18n/index.mjs";
// W14-code r2 fr2-16 / css2-toolbutton-cds: ToolButton is the CDS ghost iconOnly Button itself (shared-frame Tu / Uu:
// `text-primary font-normal font-control aria-pressed:text-accent`, iconOnly `aspect-square w-control px-0`, the
// cds-btn-squish press layer and paint), as the official titlebar / sidebar controls are (c73f45bc3 lW / Zh, shared-21
// Pz). With no `tooltip` the label is the Button's own CDS tooltip (Uu `we = typeof s == "string" ? s : P`), not a
// native title; an explicit tooltip keeps the host SourceTooltip wrapper (its shortcut / side / open control) with the
// Button's own turned off (`tooltip: !1`); `tooltip={false}` turns both off for an external wrapper. `active` was the
// host's is-selected wash: a pressed toggle passes aria-pressed (the ghost pressed paint), a menu trigger aria-expanded.
export function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  active: _active,
  children,
  tooltip,
  ...props
}) {
  // String copy is looked up here too, so literal labels are localized.
  label = t(label);
  const customTooltip = tooltip != null && tooltip !== false;
  const tooltipProps = tooltip && typeof tooltip === "object" ? tooltip : {};
  const button = (
    <CdsButton
      variant="ghost"
      iconOnly
      icon={children ?? icon}
      aria-label={label}
      tooltip={customTooltip || tooltip === false ? false : undefined}
      onClick={onClick}
      disabled={disabled}
      {...props}
    />
  );
  return customTooltip ? (
    <SourceTooltip
      hoverable={false}
      automatic
      {...tooltipProps}
      content={
        typeof tooltip === "string"
          ? t(tooltip)
          : Object.hasOwn(tooltipProps, "content")
            ? t(tooltipProps.content)
            : label
      }
    >
      {button}
    </SourceTooltip>
  ) : (
    button
  );
}
