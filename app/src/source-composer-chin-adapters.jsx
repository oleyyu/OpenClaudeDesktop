// Host answers for the 4.16336.0 session chin scripts/extract-composer-chin-v4.mjs cuts into src/generated/composer-chin-v4
// (round 3 relink rl-composer, task C1: c227f4d5e-DGDdGBTz.js X6, the chunk's export g, as ComposerSessionChin). Each
// export answers one original declaration X6's closure stops at; the extractor feature-checks every original and pins its
// raw declaration sha256 (HOST_ADAPTERS / ADAPTER_PINS). The answers only forward existing host behaviour (the boundaries
// of surfaces-prod-3/composer/relink-prep/plan.json C1); none adds a control the host does not already have.
//
// Host data the answers read comes through ComposerChinHostContext, which the host composer (src/source-composer.jsx)
// provides around the chin it renders: { requestMenu(kind, anchor), usage: the props of the host ring trigger
// (src/source-composer-row-chin.jsx ComposerUsageRing, w3's stand-in), modePickerAnchor (the ref X6 hands Y6 as anchorRef) }.
// Without a provider the pickers stay closed and inert, and the usage ring is not drawn (X6's own kn slot stays empty).
import React, { createContext, useContext } from "react";
import { ChatComposerParts } from "./generated/code-composer-v4/chat-composer-shell.mjs";
import { ComposerUsageRing } from "./source-composer-row-chin.jsx";

export const ComposerChinHostContext = createContext(null);

// Rendering one of these is a contract break: the host never passes the input that reaches them.
function unreachable(original, why) {
  throw Error(`composer-chin-v4: ${original} is not reachable from the host session chin (${why})`);
}

// vendor-intl p (useIntl, X6 Qe): the composer's host intl, as code-composer-v4 contract4 answers it (CONTRACT4_ADAPTERS).
export { useComposerIntl } from "./source-composer-current-adapters.jsx";

// shared-0 FH (vt, the desktop-platform gate; X6 `nt = vt()` feeds Vn("openModeMenu", nt)): the frame graph's answer, the
// same function frame-sidebar / titlebar-frame import (one host answer per original, D1).
export { useIsDesktopApp } from "./frame-sidebar-adapter.mjs";

// shared-5 hh (= Cm, the ChatComposer compound; X6 uses only `tl.Chin`): code-composer-v4 holds and exports that Chin
// (shared-5 jp, ChatComposerParts.Chin), so this answers the compound's Chin from there instead of cutting shared-5 Cm.
export const ComposerChinShellParts = Object.freeze({ Chin: ChatComposerParts.Chin });

// c227f4d5e W6 (picker state, its keydown chords and numbered mode items): the host's menus are main.jsx's (onMenu state,
// SourceMenu / SourcePopover) and its chords are main.jsx's chin shortcuts, so the official popups stay closed and a
// trigger press asks the host to open its own menu at the trigger. W6's result shape, read by X6.
export function useComposerChinPickers({ modeItems, permissionModeItems }) {
  const host = useContext(ComposerChinHostContext);
  const ask = (kind) => (open) => { if (open) host?.requestMenu?.(kind, host?.modePickerAnchor?.current ?? null); };
  return {
    requestOpen: (kind) => host?.requestMenu?.(kind === "mode" || kind === "permissionMode" ? "permission" : kind, null),
    modeOpen: false, onModeOpenChange: ask("permission"),
    modelOpen: false, onModelOpenChange: ask("model"),
    effortOpen: false, onEffortOpenChange: ask("effort"),
    numberedModeItems: modeItems,
    permissionModeOpen: false, onPermissionModeOpenChange: ask("permission"),
    permissionModeMenuItems: permissionModeItems ?? [],
  };
}

// c227f4d5e w3 (usage ring + its popover): the host ring trigger (ComposerUsageRing, the O3 transcription) with the host's
// usage copy; its popover is the composer's usage popover (main.jsx onMenu "usage"). X6 passes inComposerRow.
export function ComposerChinUsageRing({ inComposerRow = false }) {
  const host = useContext(ComposerChinHostContext);
  return host?.usage ? <ComposerUsageRing {...host.usage} inComposerRow={inComposerRow} /> : null;
}

// c5da7eb42 pR (X6 `rt = oh(Me)`: the session query's mode-picker hide flag, `data ?? !1`): the host session has no such
// field, so the official default.
export const useSessionHidesModePicker = () => false;

// c227f4d5e Q3 (`I(X3)`, the settings-route context) and m6 (whether a route is the settings route): the host composer
// is never rendered on the Settings route, so X6's `yt` is false.
export const useComposerRouteContext = () => null;
export const isComposerOnRoute = () => false;

// c227f4d5e C6 (`fg(zx, x6(e))`, the engine footer registry for a local session): the host registers no engine footer.
export const useEngineFooterRegistry = () => null;

// Gated branches (the host never passes their inputs).
export function ComposerRailPickerKeys() { return unreachable("c227f4d5e L6", "railPickerKeys is never passed"); }
export function ComposerDictationButton() { return unreachable("c227f4d5e $6", "hideDictation is passed, no dictation backend"); }
export function ComposerChinPlusMenu() { return unreachable("c227f4d5e wJ", "the row layout has no + in the chin"); }
export function ComposerCoordinatorToggle() { return unreachable("c227f4d5e O6", "onCoordinatorModeChange is never passed"); }
export function ComposerRailModelRow() { return unreachable("c227f4d5e nD", "rail layout only"); }
export function ComposerRailModeRow() { return unreachable("c227f4d5e tD", "rail layout only"); }
