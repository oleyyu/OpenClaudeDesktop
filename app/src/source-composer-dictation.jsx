// The composer's Dictate button: 4.16336.0 c47a58ae1 mS (the chin's $6 renders it), rebuilt over the generated cds-core
// parts it is made of — CdsSplitDropdownButton (shared-frame qj, the chin's "caret" settings menu), CdsButton + CdsTooltip +
// CdsContextMenu (the presets card's "contextMenu" variant, c73f45bc3 kS: settingsMenu "contextMenu", iconSize "md"),
// CdsDropdown rows, CdsSwitch, CdsSpinner, CdsIcon and CdsPopover (shared-8 dL, the mic-guidance popover). The markup,
// classes, copy and the pointer logic (tap toggles; with Hold to record a press held HOLD_TO_RECORD_MS is push-to-talk,
// released → stop) follow mS; the state is the host's (use-composer-dictation.js), not the official store.
//
// NOT a generated slice: mS and its store (shared-2 k1), permission store (shared-1) and helpers (shared-8) are not cut
// by a generator yet — this file transcribes them by hand. Analytics (c68c4283d), the Ant-only rows and the
// claude.ai voice service are left out.
import React, { useEffect, useId, useRef, useState } from "react";
import { CdsButton, CdsContextMenu, CdsDropdown, CdsIcon, CdsPopover, CdsSpinner, CdsSplitDropdownButton, CdsSwitch, CdsTooltip, cdsClassNames } from "./cds-core.mjs";
import { autoGlyphSize, dockGlyphIconClass } from "./generated/code-composer-v4/composer-glyph.mjs";
import { t } from "../electron/i18n/index.mjs";
import { HOLD_TO_RECORD_MS, dictationButtonLabel, disabledReasonText, guidanceFor, languageHint, microphoneRows } from "./composer-dictation-model.mjs";

// shared-8 UI: a click from the keyboard (no pointer).
const keyboardClick = (event) => event?.detail === 0 && !("pointerType" in event && event.pointerType);

// shared-8 TI: Language › [search] Auto + each language (radio).
function LanguageSubmenu({ dictation }) {
  const auto = t("Auto");
  return <CdsDropdown.Submenu>
    <CdsDropdown.SubmenuTrigger hint={languageHint(dictation.language)}>{t("Language")}</CdsDropdown.SubmenuTrigger>
    <CdsDropdown.SearchablePopup searchLabel={t("Search languages")}>
      {(query) => {
        const q = String(query ?? "").toLowerCase();
        const showAuto = auto.toLowerCase().includes(q);
        const rows = dictation.languages.filter((entry) => entry.label.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q));
        if (!showAuto && rows.length === 0) return <div className="px-md py-sm text-footnote text-muted-as-secondary">{t("No matches")}</div>;
        return <CdsDropdown.Group>
          {showAuto && <CdsDropdown.Item checked={dictation.language === null} checkedRole="radio" onClick={() => dictation.selectLanguage(null)}>{auto}</CdsDropdown.Item>}
          {rows.map((entry) => <CdsDropdown.Item key={entry.value} checked={entry.value === dictation.language} checkedRole="radio" onClick={() => dictation.selectLanguage(entry.value)}>{entry.label}</CdsDropdown.Item>)}
        </CdsDropdown.Group>;
      }}
    </CdsDropdown.SearchablePopup>
  </CdsDropdown.Submenu>;
}

// mS Q: [Microphone group + separator] [Language submenu + separator] Hold to record.
function DictationMenuItems({ dictation }) {
  const rows = microphoneRows(dictation.devices, dictation.deviceUid);
  return <>
    {rows.length > 0 && <>
      <CdsDropdown.Group>
        <CdsDropdown.GroupLabel>{t("Microphone")}</CdsDropdown.GroupLabel>
        {rows.map((row) => <CdsDropdown.Item key={row.uid} labelDir="auto" checkedRole="radio" checked={row.checked} onClick={() => dictation.selectDevice(row.uid)}>{row.label}</CdsDropdown.Item>)}
      </CdsDropdown.Group>
      <CdsDropdown.Separator />
    </>}
    <LanguageSubmenu dictation={dictation} />
    <CdsDropdown.Separator />
    <CdsDropdown.Item role="menuitemcheckbox" aria-checked={dictation.holdToRecord} keepOpen
      trailing={<span inert=""><CdsSwitch size="sm" checked={dictation.holdToRecord} /></span>}
      onClick={() => dictation.setHoldToRecord(!dictation.holdToRecord)}>{t("Hold to record")}</CdsDropdown.Item>
  </>;
}

// shared-8 dL: anchored on the button, title + description, Open System Settings where System Settings fixes it.
function MicGuidance({ dictation, anchor }) {
  const reason = dictation.guidance?.reason ?? null;
  const copy = reason ? guidanceFor(reason, { languageLabel: dictation.languages.find((entry) => entry.value === dictation.locale)?.label }) : null;
  return <CdsPopover.Root open={!!copy} onOpenChange={(open) => { if (!open) dictation.closeGuidance(); }}>
    {copy && <CdsPopover.Popup anchor={anchor} side="top" align="center" data-mic-guidance="" className="flex flex-col gap-sm">
      <CdsPopover.Title className="text-body font-medium">{copy.title}</CdsPopover.Title>
      <CdsPopover.Description className="text-caption text-secondary">{copy.body}</CdsPopover.Description>
      {copy.settings && <div className="flex justify-end">
        <CdsButton size="sm" variant="secondary" onClick={() => dictation.openSettings(copy.settings)}>{t("Open System Settings")}</CdsButton>
      </div>}
    </CdsPopover.Popup>}
  </CdsPopover.Root>;
}

/**
 * @param {object} props
 * @param {ReturnType<import('./use-composer-dictation.js').useComposerDictation>} props.dictation
 * @param {"caret" | "contextMenu"} [props.settingsMenu] mS settingsMenu (the chin: caret; the presets card: contextMenu)
 * @param {string} [props.iconSize] mS iconSize (the chin: "auto", the presets card: "md")
 * @param {string} [props.size] the button size (mS `size`, unset in both callers)
 */
export function ComposerDictationButton({ dictation, settingsMenu = "caret", iconSize = autoGlyphSize, size }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef(null);
  const contextAnchor = useRef(null);
  const press = useRef(null); // { pointerId, at, timer, cleanup } while a pointer press is held
  const connectingId = useId();
  const contextMenu = settingsMenu === "contextMenu";
  const { status, holdToRecord } = dictation;
  const recording = status === "recording";
  const connecting = status === "connecting";
  const finishing = status === "finishing";
  const busy = connecting || finishing;
  const pressed = recording || busy;
  const error = status === "error";

  // mS: opening the session closes the settings menu.
  useEffect(() => { if (pressed) setMenuOpen(false); }, [pressed]);
  useEffect(() => () => { press.current?.cleanup(); press.current = null; }, []);

  if (!dictation.shown) return null;
  const iconProps = { size: iconSize };

  // c227f4d5e $6 without the start handlers: the disabled Microphone with its reason.
  if (dictation.disabledReason) {
    const label = t("Dictate");
    return <CdsButton variant="ghost" iconOnly icon={<CdsIcon name="Microphone" {...iconProps} className={dockGlyphIconClass} />} aria-label={label}
      disabled disabledReason={disabledReasonText(dictation.disabledReason)} />;
  }

  const label = dictationButtonLabel({ status, holdToRecord });
  const icon = <CdsIcon name={pressed ? "MicrophoneFilled" : "Microphone"} {...iconProps} className={error ? "text-danger" : dockGlyphIconClass} />;

  // mS z: the pointer press. Mouse presses keep the editor's focus (preventDefault).
  const onPointerDown = (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (contextMenu && event.ctrlKey) return; // a ctrl-click opens the context menu
    const touch = event.pointerType === "touch";
    if (!touch) event.preventDefault();
    if (press.current !== null || busy) return;
    if (recording) { dictation.stop(); return; }
    dictation.start();
    if (!holdToRecord) return;
    const pointerId = event.pointerId;
    const at = event.nativeEvent.timeStamp;
    const doc = event.currentTarget.ownerDocument ?? document;
    const release = (up) => {
      if (up.pointerId !== pointerId) return;
      const held = up.type !== "pointercancel" && up.timeStamp - at >= HOLD_TO_RECORD_MS;
      press.current?.cleanup(); press.current = null;
      if (held) dictation.stop();
    };
    doc.addEventListener("pointerup", release);
    doc.addEventListener("pointercancel", release);
    press.current = { cleanup: () => { doc.removeEventListener("pointerup", release); doc.removeEventListener("pointercancel", release); } };
  };
  // mS B: keyboard activation (Space / Enter) toggles; pointer clicks were handled on pointerdown.
  const onClick = (event) => {
    if (event !== undefined && !keyboardClick(event.nativeEvent ?? event)) return;
    if (recording) { dictation.stop(); return; }
    if (!busy) dictation.start();
  };
  const connectingLabel = t("Connecting…");
  const described = <span id={connectingId} hidden>{connectingLabel}</span>;
  const guidance = <MicGuidance dictation={dictation} anchor={anchor} />;
  const items = <DictationMenuItems dictation={dictation} />;

  if (contextMenu) {
    const button = <CdsButton ref={anchor} variant="ghost" size={size} iconOnly icon={icon} aria-label={label} aria-keyshortcuts="Shift+F10"
      tooltip={false} pressed={pressed} busy={busy} busyLabel={connecting ? connectingLabel : undefined}
      aria-describedby={connecting ? connectingId : undefined} onPointerDown={onPointerDown} onClick={onClick} />;
    return <>
      <CdsContextMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <CdsContextMenu.Trigger render={<span ref={contextAnchor} className={cdsClassNames("inline-flex", error && "rounded bg-danger")} />} onKeyDown={contextMenuKey}>
          <CdsTooltip content={label} detail={pressed ? undefined : t("Right-click for microphone settings")} open={menuOpen || dictation.guidance ? false : undefined}>{button}</CdsTooltip>
        </CdsContextMenu.Trigger>
        <CdsContextMenu.Popup aria-label={t("Dictation settings")} anchor={contextAnchor} side="top" align="start">{items}</CdsContextMenu.Popup>
      </CdsContextMenu.Root>
      {described}
      {guidance}
    </>;
  }

  const primaryIcon = busy ? <CdsSpinner size="sm" inheritColor label={connecting ? connectingLabel : undefined} /> : icon;
  return <>
    <div className="contents">
      <CdsSplitDropdownButton primaryRef={anchor} variant="ghost" size={size} icon={primaryIcon} aria-label={label}
        aria-describedby={connecting ? connectingId : undefined} groupLabel={t("Dictation")} tooltip pressed={pressed}
        onPrimaryPointerDown={onPointerDown} onPrimaryClick={onClick} menuLabel={t("Dictation settings")}
        className={error ? "bg-danger" : undefined} side="top" align="start" open={menuOpen} onOpenChange={setMenuOpen} items={items} />
    </div>
    {described}
    {guidance}
  </>;
}

// mS Ne: Shift+F10 / the ContextMenu key on the trigger opens the context menu at the button's centre.
function contextMenuKey(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !(event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))) return;
  const target = event.currentTarget, rect = target.getBoundingClientRect();
  const View = target.ownerDocument.defaultView ?? window;
  if (!target.dispatchEvent(new View.MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: -1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }))) event.preventDefault();
}
