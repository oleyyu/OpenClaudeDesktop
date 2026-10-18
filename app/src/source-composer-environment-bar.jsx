// composer-env-bar (research/composer.md §3.4, decisions D13): the Home draft's environment bar under the presets card.
// The bar is the original 2.42304.0 cc43287c9 l0 (generated/code-composer/environment-bar.mjs: the row, the chips and
// pickers groups, the mode slot `empty:hidden`, the trailing group, a0's iconOnly fit with the r0 hysteresis and the n0
// context), its chips the original u0 (ghost CdsButton, no caret) and c0 groups. This module is the host mapping of the
// slots j2 / x6 fill (readable :23801-24030, :33671-33704):
//   - place  = the environment chip (A2 over h2's trigger): Laptop icon (Hk("local")), the chosen saved environment's
//     name or "This computer" (O6 placeLabel, shared-19 Fr), data-testid environment-bar-trigger, "Environment: {value}",
//     in h2's "Where … runs" tooltip (hoverable false, collisionPadding 48/8/8/8) whose detail is the place text while the
//     bar is iconOnly (A2: `tooltipDetail: r ? (t ?? e) : t`); it opens the host environment menu ("home-environment",
//     its content is R3-home's source-environment-menu.jsx);
//   - second = the folder chip (j2 `me`): Folder icon, the folder's basename or "Choose…" (8tJfYE1sr+), the ~ paths as
//     native title and, when iconOnly, as u0's tooltip (`tooltip: pe ? ik(pe) : fe`, ik = c0fbbe82d hn), data-testid
//     environment-bar-folder, "Folder: {value}" (`pe ?? A`, A = basename or "Choose folder…"); it opens the host folder
//     menu ("home-folder": recents, branch / worktree, add folder; U8's H6 with its footer), or browses directly when
//     nothing is recent (the host's folderMenu=false);
//   - mode   = the composer's permission control (x6 `e.permission.control`);
//   - trailing = model, effort and the usage ring, each in a c0 group (x6 rail `modelEffort` + `barRing`).
// Host differences: the mode / model / effort / ring controls are the composer's own triggers (R3-composer
// composer-row-chin: the official tQ / ModelSelector pill / EffortControl / yZ triggers of source-composer-row-chin.jsx, the
// ring 14px like c73f45bc3 Y_; their x6 bar variants and menus are home-env's StartCard rail work), the bar's line / note portal (`lineEl`) is not wired (the host's notices
// and the draft-group chip stay above the card), and an extra folder is not folded into the folder label (its official
// "+N" copy is a secret catalog message): it keeps its chip above the card and joins the folder's paths here.
import React, { useContext } from "react";
import { EnvironmentBar, EnvironmentChip, EnvironmentChipGroup, EnvironmentIconOnlyContext, EnvironmentTriggerLabel, environmentTriggerClass } from "./generated/code-composer/environment-bar.mjs";
import { pathTooltipContent } from "./generated/code-composer/path-tooltip-placement.mjs";
import { homeRelativePath } from "./generated/code-start/home-path.mjs";
// h2's td is the CDS Tooltip (cc43287c9 `Oc as td`), the view-tabs original since R3 (D24).
import { CdsButton, CdsTooltip, cdsClassNames } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { menuTriggerProps } from "./source-menu";
import { t } from "../electron/i18n/index.mjs";

// x6's bar tones (readable :28464-28465 y6, :28828): in modelMenu "bar" the permission trigger is a ghost button
// `y6(true)` = "min-w-0 shrink text-secondary" (outside the chin's Kd tone).
export const ENVIRONMENT_BAR_TRIGGER_TONE = "text-secondary";
// x6 Ce (:28648-28745): the model trigger tail words, fast tier then effort (`s = r && !e.loading`).
export const environmentModelTail = ({ fastLabel = null, effortLabel = null, loading = false } = {}) => loading ? []
  : [{ field: "fastMode", word: fastLabel }, { field: "effort", word: effortLabel }].filter(({ word }) => word);
const TAIL_TONE = Object.freeze({ fastMode: "text-muted-as-secondary", effort: "text-muted-control" });
// The highest effort level reads purple (user decision 2026-10-18), in the menu row's 'text-pro font-medium'.
const TOP_EFFORT_TONE = "text-pro font-medium";

/**
 * x6's model trigger in the bar (`r = l === "bar" && !n`, readable :28672-28745): the ghost CdsButton `y6(r, r)` ("shrink
 * text-secondary") holding b6 with the givesWay name and the tail words, each `shrink-0 whitespace-pre` in its tone
 * (effort text-muted-control, fast text-muted-as-secondary), under zg.Trigger's tooltip "Model" with the openModelMenu
 * chord. The effort is folded in here (its menu is the model menu's Effort submenu, x6 `showEffortSection: !0`).
 * Host adapters: the menu is the composer's SourceModelMenu (menuTriggerProps), and the trigger keeps the host hook
 * class and the accessible name "Model" the chin chords and local automation read (official: "Model: {value}").
 */
export function EnvironmentModelTrigger({ name, fastLabel = null, effortLabel = null, effortTop = false, loading = false, loadingLabel, tooltip, shortcut, tooltipOpen, className, ...props }) {
  const tail = environmentModelTail({ fastLabel, effortLabel, loading });
  return <CdsTooltip content={tooltip} shortcut={shortcut} open={tooltipOpen}>
    <CdsButton variant="ghost" className={cdsClassNames(environmentTriggerClass(true, true), className)} data-testid="environment-row-model"
      aria-busy={loading || undefined} {...props}>
      <EnvironmentTriggerLabel overridden={false} label={loading ? loadingLabel : name} givesWay
        tail={tail.map(({ field, word }) => <span key={field} className={`shrink-0 whitespace-pre ${field === "effort" && effortTop ? TOP_EFFORT_TONE : TAIL_TONE[field]}`}
          data-top-tier={field === "effort" && effortTop ? "" : undefined}>{" "}{word}</span>)} />
    </CdsButton>
  </CdsTooltip>;
}

// h2's td around the place trigger (readable :23259-23266).
export const ENVIRONMENT_PLACE_TOOLTIP = Object.freeze({ hoverable: false, collisionPadding: Object.freeze({ top: 48, right: 8, bottom: 8, left: 8 }) });
const basename = (path) => (typeof path === "string" ? path.split("/").filter(Boolean).pop() : "") || path || "";

// The two menus the chips open; side bottom / align start like A2 and H6 (popupSide "bottom", popupAlign "start").
export const ENVIRONMENT_BAR_MENUS = Object.freeze({ place: "home-environment", folder: "home-folder" });

/** The place / folder chip copy for a draft (pure, so tests can read it without rendering). */
export function environmentBarChips({ workdir = "", environmentName = null, additionalFolders = [] } = {}) {
  const placeLabel = environmentName || t("This computer");
  const folderRowLabel = workdir ? basename(workdir) : t("Choose folder…");
  const folderLabel = workdir ? folderRowLabel : t("Choose…");
  // pe: the folder and the extra folders, ~-relative (Gr = shared-19 F7), comma-joined.
  const paths = workdir ? [workdir, ...additionalFolders].map(homeRelativePath).join(", ") : undefined;
  return {
    place: { label: placeLabel, ariaLabel: t("Environment: {value}", { value: placeLabel }) },
    folder: { label: folderLabel, title: paths, tooltipText: paths ?? folderLabel, ariaLabel: t("Folder: {value}", { value: paths ?? folderRowLabel }) },
  };
}

export function EnvironmentPlaceChip({ copy, open, menuKind, onMenu }) {
  // A2: while the bar is iconOnly the chip's text is sr-only, so the tooltip names the place.
  const iconOnly = useContext(EnvironmentIconOnlyContext);
  const kind = ENVIRONMENT_BAR_MENUS.place;
  return <CdsTooltip content={t("Where DeepSeek runs")} detail={iconOnly ? copy.label : undefined} {...ENVIRONMENT_PLACE_TOOLTIP}
    open={menuKind ? false : undefined}>
    <EnvironmentChip icon="Laptop" label={copy.label} data-testid="environment-bar-trigger" aria-label={copy.ariaLabel}
      onClick={(event) => onMenu?.(kind, event.currentTarget)}
      {...menuTriggerProps({ open, onOpen: (entry, event) => onMenu?.(kind, event.currentTarget, undefined, entry) })} />
  </CdsTooltip>;
}

export function EnvironmentFolderChip({ copy, folderMenu, open, onMenu, onBrowse }) {
  const kind = ENVIRONMENT_BAR_MENUS.folder;
  const trigger = folderMenu
    ? { onClick: (event) => onMenu?.(kind, event.currentTarget),
      ...menuTriggerProps({ open, onOpen: (entry, event) => onMenu?.(kind, event.currentTarget, undefined, entry) }) }
    : { onClick: () => onBrowse?.() };
  return <EnvironmentChip icon="Folder" label={copy.label} data-testid="environment-bar-folder" title={copy.title}
    tooltip={copy.title ? pathTooltipContent(copy.title) : copy.tooltipText} aria-label={copy.ariaLabel} {...trigger} />;
}

/**
 * The bar under the Home draft card. `mode` / `model` / `effort` / `ring` are the composer's controls; `children`
 * (the sr-only Fast mode status) follow the bar inside the host scope.
 */
export function SourceComposerEnvironmentBar({ workdir, environmentName, environmentMenu = true, folderMenu = true, additionalFolders = [],
  menuKind, onMenu, onBrowseFolder, mode = null, model = null, effort = null, ring = null, children }) {
  const copy = environmentBarChips({ workdir, environmentName, additionalFolders });
  // The host wrapper keeps the composer chin scope (.sc-chin, display: contents): main.jsx's Mode / Model / Effort chords
  // (chin-shortcuts.mjs) and /effort, /model, /permissions find their triggers here (the same CDS triggers as the row chin).
  return <div className="sc-chin sc-env-bar-scope" data-env-bar-host="">
    <EnvironmentBar
      place={environmentMenu ? <EnvironmentPlaceChip copy={copy.place} open={menuKind === ENVIRONMENT_BAR_MENUS.place} menuKind={menuKind} onMenu={onMenu} /> : null}
      second={<EnvironmentFolderChip copy={copy.folder} folderMenu={folderMenu} open={menuKind === ENVIRONMENT_BAR_MENUS.folder} onMenu={onMenu} onBrowse={onBrowseFolder} />}
      mode={mode} line={null} lineEl={null} note={null}
      trailing={<>
        {model && <EnvironmentChipGroup>{model}</EnvironmentChipGroup>}
        {effort && <EnvironmentChipGroup>{effort}</EnvironmentChipGroup>}
        {ring && <EnvironmentChipGroup>{ring}</EnvironmentChipGroup>}
      </>} />
    {children}
  </div>;
}
