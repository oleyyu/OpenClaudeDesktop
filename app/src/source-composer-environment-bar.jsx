// composer-env (surfaces-prod-2, 4.16336.0): the Home draft's environment bar under the presets card. 4.16336.0 cc43287c9
// dxe renders it through the model / permission rail Uye (`modelMenu: "bar"`): `rail: (e) => vge({ place, second,
// worktreeToggle, lastChip, mode: e.permission.control, line, lineEl, note, model: e.modelEffort(Exe), ring: u8(ring) })`.
// The bar, its chips and groups are the code-composer region's 4.16336.0 slices (generated/code-composer-v4/environment-bar.mjs:
// vge EnvironmentBar — one row: the chips on the left, then model, mode and ring on the right —, d8 EnvironmentChip, u8
// EnvironmentChipGroup, X5 EnvironmentTriggerLabel, Y5 environmentTriggerClass, s8 EnvironmentIconOnlyContext); Exe is
// sliced by scripts/extract-composer-env-v4.mjs (generated/composer-env-v4/model-effort.mjs) and the literals 4.16336.0
// writes inline in Uye / Hye / Jge / Kge / $3 are picked there (generated/composer-env-v4/environment-row.mjs). This module
// is the host mapping of the slots:
//   - place  = the environment chip (Jge `ke`: Kge over d8): Laptop icon, the chosen saved environment's name or "This
//     computer", data-testid environment-bar-trigger, "Environment: {value}" (LAJFKqmd8k), in $3's tooltip "Environment"
//     (K7kuIZkkhY; hoverable false, collisionPadding 48/8/8/8) whose detail is Kge's `iconOnly ? (tooltipDetail ??
//     placeText) : tooltipDetail` (tooltipDetail = the saved environment's name; Jge `Ce ?? _?.name ?? g`, g the SSH host);
//     it opens the host environment menu ("home-environment", source-environment-menu.jsx);
//   - second = the folder chip (Jge `We`, only while no saved environment is active): Folder icon, the folder's basename or "Choose…" (36ZE+1nZbE), the ~ paths as
//     native title (`[pe, …extra].map(e => Yg(e, oe)).join(", ")`) and as d8's iconOnly tooltip (`ze ? da(ze) : Re`, da =
//     shared-55 gV pathTooltipContent), "Folder: {value}" / "{folder} +{count}, folder: {value}" and the "+{count}" tail;
//     it opens the host folder menu ("home-folder") or browses directly when nothing is recent (the host's folderMenu=false);
//   - mode   = the composer's permission control (Hye's slot; its bar tone is Y5(inBar));
//   - model  = Exe over the composer's model trigger (Uye renderTrigger, below) and effort control (null in the bar: the
//     effort rides in the model trigger's tail);
//   - ring   = the usage ring in a u8 group.
// The ~ path is cc43287c9 Yg (shared-3 VM) under Jge's label context `oe = localKind ? rT() : iT`: the official cd8a7d7c0
// y (useHomeLabelContext, store u over window.desktopHomePath), linked through source-composer-env-adapters.jsx.
// Not drawn (host): worktreeToggle (Jge qge, shown only for placeVariant arms the host does not run; the Worktree row stays in
// the folder menu) and lastChip (dxe Vi, cloud / remote places). Its line (`line` / `lineEl`) carries only the gone-environment
// block (r2-composer-04) and its note is the draft group's line form (source-composer.jsx DraftGroupNotice). Model names,
// effort levels and permission modes are OpenClaude's own.
import React, { useContext } from "react";
import { EnvironmentBar, EnvironmentChip, EnvironmentChipGroup, EnvironmentIconOnlyContext, EnvironmentTriggerLabel, environmentTriggerClass } from "./generated/code-composer-v4/environment-bar.mjs";
import { pathTooltipContent } from "./generated/code-composer-v4/path-tooltip-placement.mjs";
import { EnvironmentModelEffort } from "./generated/composer-env-v4/model-effort.mjs";
import { environmentRow } from "./generated/composer-env-v4/environment-row.mjs";
import { CdsButton, CdsIcon, CdsTextLink, CdsTooltip, cdsClassNames } from "./cds-core.mjs";
import { environmentPathLabel, useHomeLabelContext } from "./source-composer-env-adapters.jsx";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import { menuTriggerProps } from "./source-menu";
import { t } from "../electron/i18n/index.mjs";

const { modelTrigger: MODEL_TRIGGER, placeChip: PLACE_CHIP, folderChip: FOLDER_CHIP } = environmentRow;

// Hye: in the bar the permission trigger's class is Y5(inBar) = "min-w-0 shrink text-secondary". The composer's Mode trigger
// already carries Y5's "min-w-0 shrink" (source-composer-row-chin.jsx), so the bar adds the tone Y5(true) has over Y5(false).
const baseTriggerClass = new Set(environmentTriggerClass(false).split(" "));
export const ENVIRONMENT_BAR_TRIGGER_TONE = environmentTriggerClass(true).split(" ").filter((token) => !baseTriggerClass.has(token)).join(" ");

/**
 * Uye renderTrigger's tail words in the bar (`o = bar && !loading`): fastMode, effort, then the toggle word
 * (`· {toggleLabel}`), each kept only when it has a word.
 */
export const environmentModelTail = ({ fastLabel = null, effortLabel = null, toggleLabel = null, loading = false } = {}) => loading ? []
  : [{ field: MODEL_TRIGGER.tail.fields[0], word: fastLabel }, { field: MODEL_TRIGGER.tail.fields[1], word: effortLabel },
    { field: null, word: toggleLabel && `${MODEL_TRIGGER.tail.toggle.prefix}${toggleLabel}` }].filter(({ word }) => word);
// Uye: `shrink-0 whitespace-pre ${field === null ? "text-pro" : overridden ? "text-accent" : "text-muted-as-secondary"}`.
// The host has no per-environment model overrides (G(field) false), so a field word is plain.
const tailClass = (field) => `${MODEL_TRIGGER.tail.baseClass} ${field === null ? MODEL_TRIGGER.tail.tone.toggle : MODEL_TRIGGER.tail.tone.plain}`;
// Local extension (user decision 2026-10-18): the highest effort level reads purple, in the menu row's 'text-pro font-medium'.
const TOP_EFFORT_CLASS = `${MODEL_TRIGGER.tail.baseClass} text-pro font-medium`;

/**
 * Uye's model trigger in the bar (`t = d === "bar"`, cc43287c9 renderTrigger, data-testid environment-row-model): the ghost
 * CdsButton `Y5(t, t)` with the Warning icon at its end when the model warns, holding X5 with the givesWay name and the tail
 * words, under the ModelSelector Trigger's tooltip "Model" with the openModelMenu chord. Its accessible name is
 * "Model: {value}" (/BH9qS3xcc), value = the name, the tail words and the warning joined by spaces. The effort is folded
 * in here (its menu is the model menu's Effort submenu). Host: the menu is the composer's SourceModelMenu
 * (menuTriggerProps) and the trigger keeps the host hook class (the chin chords find it by it).
 */
export function EnvironmentModelTrigger({ name, fastLabel = null, effortLabel = null, effortTop = false, toggleLabel = null, warningLabel = null,
  loading = false, loadingLabel, tooltip, shortcut, tooltipOpen, className, ...props }) {
  const tail = environmentModelTail({ fastLabel, effortLabel, toggleLabel, loading });
  const label = loading ? loadingLabel : name;
  const warning = loading ? null : warningLabel;
  const ariaLabel = t(MODEL_TRIGGER.ariaLabel.message.defaultMessage, { value: [label, ...tail.map(({ word }) => word), warning].filter(Boolean).join(MODEL_TRIGGER.ariaLabel.join) });
  const icon = MODEL_TRIGGER.warningIcon;
  return <CdsTooltip content={tooltip} shortcut={shortcut} open={tooltipOpen}>
    <CdsButton variant={MODEL_TRIGGER.variant} className={cdsClassNames(environmentTriggerClass(true, true), className)}
      icon={warning ? <CdsIcon name={icon.name} size={icon.size} alt={warning} className={icon.className} /> : undefined}
      iconPosition={MODEL_TRIGGER.iconPosition} data-testid={MODEL_TRIGGER.testId} aria-busy={loading || undefined} {...props} aria-label={ariaLabel}>
      <EnvironmentTriggerLabel overridden={false} label={label} givesWay={MODEL_TRIGGER.givesWay}
        tail={tail.map(({ field, word }) => {
          const top = field === MODEL_TRIGGER.tail.fields[1] && effortTop;
          return <span key={field ?? MODEL_TRIGGER.tail.toggle.key} className={top ? TOP_EFFORT_CLASS : tailClass(field)}
            data-top-tier={top ? "" : undefined}>{MODEL_TRIGGER.tail.lead}{word}</span>;
        })} />
    </CdsButton>
  </CdsTooltip>;
}

const basename = (path) => (typeof path === "string" ? path.split("/").filter(Boolean).pop() : "") || path || "";

// The two menus the chips open; side bottom / align start like Jge (popupSide "bottom", popupAlign "start").
export const ENVIRONMENT_BAR_MENUS = Object.freeze({ place: "home-environment", folder: "home-folder" });

/** The place / folder chip copy for a draft (pure, so tests can read it without rendering). */
export function environmentBarChips({ workdir = "", environmentName = null, additionalFolders = [], labelContext } = {}) {
  const placeLabel = environmentName || t("This computer");
  const folderRowLabel = workdir ? basename(workdir) : t("Choose folder…");
  const folderLabel = workdir ? folderRowLabel : t(FOLDER_CHIP.messages.choose.defaultMessage);
  // ze: the folder and the extra folders through Yg (~-relative under the home label context), comma-joined.
  const paths = workdir ? [workdir, ...additionalFolders].map((path) => environmentPathLabel(path, labelContext)).join(", ") : undefined;
  const extra = workdir ? additionalFolders.length : 0;
  return {
    place: { label: placeLabel, detail: environmentName || undefined, ariaLabel: t(PLACE_CHIP.ariaLabel.defaultMessage, { value: placeLabel }) },
    folder: { label: folderLabel, tail: extra > 0 ? t(FOLDER_CHIP.messages.extraCount.defaultMessage, { count: extra }) : undefined, title: paths, tooltipText: paths ?? folderLabel,
      ariaLabel: extra > 0 ? t(FOLDER_CHIP.messages.folderExtra.defaultMessage, { folder: folderRowLabel, count: extra, value: paths })
        : t(FOLDER_CHIP.messages.folder.defaultMessage, { value: paths ?? folderRowLabel }) },
  };
}

export function EnvironmentPlaceChip({ copy, open, menuKind, onMenu }) {
  // Kge: `k(s8) ? (r ?? n) : r` — the saved environment's name, and while the bar is iconOnly (the chip's text sr-only) the
  // place text when there is no name.
  const iconOnly = useContext(EnvironmentIconOnlyContext);
  const kind = ENVIRONMENT_BAR_MENUS.place;
  const tooltip = PLACE_CHIP.tooltip;
  return <CdsTooltip content={t(tooltip.content.defaultMessage)} detail={iconOnly ? (copy.detail ?? copy.label) : copy.detail}
    hoverable={tooltip.hoverable} collisionPadding={tooltip.collisionPadding} open={menuKind ? false : undefined}>
    <EnvironmentChip icon="Laptop" label={copy.label} data-testid={PLACE_CHIP.testId} aria-label={copy.ariaLabel}
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
  return <EnvironmentChip icon={FOLDER_CHIP.icon} label={copy.label} tail={copy.tail} data-testid={FOLDER_CHIP.testId} title={copy.title}
    tooltip={copy.title ? pathTooltipContent(copy.title) : copy.tooltipText} aria-label={copy.ariaLabel} {...trigger} />;
}

/**
 * W14-code r2-composer-04, 4.16336.0: dxe `{kind: "gone", name: Z.name, at: Yg(L, _n)}` and the rich message j9ML5nKNoc
 * whose <edit> is `p(V, {inheritColor: !0, onClick: Ki, children})` (V = the CDS TextLink, Ki opens the environment's
 * editor) — the bar's line (vge `line`), drawn text-danger into the line host. The host has no RTL locale, so the name and
 * path are never wrapped in dxe's `$t` <bdi>.
 */
export function EnvironmentGoneLine({ name, folder, onEdit }) {
  const intl = useStartIntl();
  // dxe `_n`: the same Jge label context (local environments only: cd8a7d7c0 y).
  const labelContext = useHomeLabelContext();
  return intl.formatMessage({ defaultMessage: "{name} can’t start: {path} no longer exists. <edit>Edit environment</edit>", id: "j9ML5nKNoc" },
    { name, path: environmentPathLabel(folder, labelContext), edit: (chunks) => <CdsTextLink inheritColor onClick={onEdit}>{chunks}</CdsTextLink> });
}

/**
 * The bar under the Home draft card. `mode` / `model` / `effort` / `ring` are the composer's controls; `children`
 * (the sr-only Fast mode status) follow the bar inside the host scope.
 */
export function SourceComposerEnvironmentBar({ workdir, environmentName, environmentMenu = true, folderMenu = true, additionalFolders = [],
  menuKind, onMenu, onBrowseFolder, mode = null, model = null, effort = null, ring = null, line = null, lineEl = null, note = null, children }) {
  const labelContext = useHomeLabelContext();
  const copy = environmentBarChips({ workdir, environmentName, additionalFolders, labelContext });
  // Host mapping, written by hand after the Jge folder slot `shown && !starting && (activeStored === null ||
  // cloudWithoutRepos(activeStored.target))` (the extractor's E5 cross-check pins that shape; environment-row.mjs
  // folderChip.shownWhen only records it and decides nothing here). Host terms: activeStored = the chosen saved environment
  // (environmentName); its target is never cloud (OpenClaude's saved environments are all local), so the cloud arm is
  // always false; `shown` = this bar is mounted (source-composer.jsx draws it only then); `starting` has no host
  // counterpart. So a chosen saved environment hides the chip, as in the official screenshot 01.
  const folderShown = !environmentName;
  // The host wrapper keeps the composer chin scope (.sc-chin, display: contents): main.jsx's Mode / Model / Effort chords
  // (chin-shortcuts.mjs) and /effort, /model, /permissions find their triggers here (the same triggers as the row chin).
  return <div className="sc-chin sc-env-bar-scope" data-env-bar-host="">
    <EnvironmentBar
      place={environmentMenu ? <EnvironmentPlaceChip copy={copy.place} open={menuKind === ENVIRONMENT_BAR_MENUS.place} menuKind={menuKind} onMenu={onMenu} /> : null}
      second={folderShown ? <EnvironmentFolderChip copy={copy.folder} folderMenu={folderMenu} open={menuKind === ENVIRONMENT_BAR_MENUS.folder} onMenu={onMenu} onBrowse={onBrowseFolder} /> : null}
      mode={mode} line={line} lineEl={lineEl} note={note}
      model={<EnvironmentModelEffort model={model} effort={effort} />}
      ring={<EnvironmentChipGroup>{ring}</EnvironmentChipGroup>} />
    {children}
  </div>;
}
