// CDS Shortcut (2.2553.1 shared-frame-C_2npUJq.js:2031-2110 Qa): the keycap and text variants.
// Key parsing lives in shortcut-model.mjs (fo/po/ho with the ao/so/oo/co tables).
import React, { Fragment, useSyncExternalStore } from "react";
import { MAC_USER_AGENT, shortcutCaps, shortcutSequence } from "./shortcut-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-shortcut.css";

export { shortcutCaps, shortcutSequence } from "./shortcut-model.mjs";

const noSubscribe = () => () => undefined; // eo
// to() :2118-2124: client snapshot tests the UA, server snapshot is non-mac.
export function useMacShortcuts() {
  return useSyncExternalStore(noSubscribe, () => MAC_USER_AGENT.test(navigator.userAgent), () => false);
}

// qa: one grapheme -> Ga square cap, otherwise Ka min-width cap.
const capClass = label => `scds-key ${Array.from(label ?? "").length === 1 ? "scds-key-square" : "scds-key-wide"}`;

// Ya: keycap = caps with a 2px gap; text = bare <kbd> glyphs (Ja) with a 0.15em gap (2.42304.0 shared-frame Es.text,
// menus-01), and off mac the spoken name as the text with "+" joiners (s = text && !mac; mx-[-0.15em]). The original
// component is the view-tabs CdsShortcut (ks); this host copy stays for its callers' className/mac props.
export function SourceShortcut({ keys, variant = "keycap", onFill = false, className = "", mac, ...rest }) {
  const detected = useMacShortcuts();
  const isMac = mac ?? detected;
  const text = variant === "text", spell = text && !isMac;
  const chords = shortcutSequence(keys).map(chord => shortcutCaps(chord, isMac));
  return <span {...rest} data-cds="Shortcut" data-variant={text ? "text" : "keycap"}
    className={["scds-shortcut", text && "scds-text", onFill && "scds-on-fill", className].filter(Boolean).join(" ")}>
    {chords.map((caps, index) => <Fragment key={index}>
      {index > 0 && <span className="scds-then">{t("then")}</span>}
      {caps.map(({ label, spoken }, key) => <Fragment key={key}>
        {spell && key > 0 && <span className="scds-joiner">+</span>}
        <kbd className={text ? "scds-text-key" : capClass(label)}>
          {spoken === undefined ? label : spell ? spoken : <><span aria-hidden="true">{label}</span><span className="scds-sr">{spoken}</span></>}
        </kbd>
      </Fragment>)}
    </Fragment>)}
  </span>;
}
