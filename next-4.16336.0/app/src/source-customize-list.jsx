// Customize "Your skills" / "Your plugins" tabbed list of 2.31226.0, classic (not pageLayout) branch. Every class
// string is the source's; each utility exists in the loaded original /assets/v1/c6a992d55-C0zTICcS.css.
//
// - ListToolbar      c3c330885-D7u-E456 D (:27-60): Tabs list + "ml-auto flex items-center gap-xs" controls.
// - FilterTrigger    c8963aace-C1OuPgXn Q (:499-534): secondary TriggerButton, Filter icon sm muted,
//                    "Filter" / "Filter · {count}", aria-label "Filter" / "Filter, {count} on".
// - SkillFilterMenu  c3c3eda79-CaFBiSqB ct (:209-389): "Created by" radio group, or with plugin options the
//                    "Filter by" header and Plugin / Created by submenus (hint = the current value).
// - PluginShowFilter c3c3eda79 lt (:390-438): "Show" All plugins / Enabled / Disabled (trigger count 0).
// - SortMenu         c3c330885 j (:117-232): secondary "Sort · {label}" trigger, "Sort by" radio group, and the
//                    ghost xs ArrowCounterClockwise reset (tooltip = its label) while something is held.
// - SectionHeader    c27f32a39-sYqe7mzd at / K (:817-886): span label and the "· {count}" footnote.
// - ListRow          c27f32a39 je (:124-205) + z (:209-228) + Xe (:590-612): drill button over the row, icon
//                    tile, trailing slot, the DotsVertical "More actions for {name}" menu, and the same items as a
//                    context menu on the row.
// - RowCredit / RowMeta / NewBadge / NoMatches  c27f32a39 Ie / qe / ze+U / et.
import React, { useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu, menuTriggerProps } from "./source-menu.jsx";
import { SourceSettingsButton as Button } from "./source-settings-button.jsx";
import { SourceTooltip } from "./source-tooltip.jsx";
import { SourcePictogram } from "./source-pictogram.jsx";
import { narrowRelativeTime } from "./home-model.mjs";
import { recentTooltip } from "./customize-list-model.mjs";
import { getLocale, t } from "../electron/i18n/index.mjs";

// Customize lives in the Settings dialog: menus take the trigger's --cds-layer-base.
const layerBaseOf = (node) => (node ? Number.parseInt(getComputedStyle(node).getPropertyValue("--cds-layer-base"), 10) || 0 : 0);
// The classic dialog's control size (shared-20 Za → "sm").
const SIZE = "sm";
// shared-19 nS: rows and headers scroll clear of the sticky list header and the page footer.
const SCROLL_MARGIN = "[scroll-margin-top:var(--list-header-scroll-offset,0px)] [scroll-margin-bottom:var(--customize-page-footer-offset,0px)]";

function useMenuState() {
  const trigger = useRef(null);
  const [menu, setMenu] = useState(null);
  return { trigger, menu, open: (entry) => setMenu({ entry, layerBase: layerBaseOf(trigger.current) }), close: () => setMenu(null) };
}

/** Menu rows: {label, icon, variant, disabled, description, checked, checkedRole, onClick} or {separator: true}. */
export function MenuEntries({ items }) {
  return items.map((item, index) => item.separator
    ? <SourceMenu.Separator key={`separator:${index}`} />
    : <SourceMenu.Item key={item.key ?? item.label} icon={item.icon} variant={item.variant} disabled={item.disabled} description={item.description}
      checked={item.checked} checkedRole={item.checkedRole} onClick={item.onClick}>{item.label}</SourceMenu.Item>);
}

export function ListToolbar({ label, tab, tabTestId, controls }) {
  return <div className="flex flex-wrap items-center justify-between gap-sm" data-cz-list-toolbar="">
    <div data-cds="Tabs" data-orientation="horizontal"><div role="tablist" aria-label={label} className="cz-plugin-tabs cz-list-tabs" data-size={SIZE}>
      <button type="button" role="tab" aria-selected="true" tabIndex={0} data-testid={tabTestId}>{tab}</button>
    </div></div>
    {controls && <div className="ml-auto flex items-center gap-xs">{controls}</div>}
  </div>;
}

const FilterGlyph = () => <Icon name="Filter" size={16} className="ssb-icon-start text-muted" />;
const SortGlyph = () => <Icon name="Sort" size={16} className="ssb-icon-start text-muted" />;

function FilterTrigger({ count, state }) {
  const on = count > 0;
  return <Button ref={state.trigger} variant="secondary" size={SIZE} icon={<FilterGlyph />} data-cz-filter=""
    aria-label={on ? t("Filter, {count} on", { count }) : t("Filter")}
    {...menuTriggerProps({ open: !!state.menu, onOpen: (entry) => state.open(entry) })}
    onClick={() => (state.menu ? state.close() : state.open(undefined))}>{on ? t("Filter · {count}", { count }) : t("Filter")}</Button>;
}

function Popup({ state, label, children }) {
  if (!state.menu) return null;
  return <SourceMenu.Popup anchor={state.trigger.current} side="bottom" align="end" label={label} initialHighlight={state.menu.entry}
    layerBase={state.menu.layerBase} onClose={state.close}>{children}</SourceMenu.Popup>;
}

function radio(value, current, label, onPick) {
  return { key: String(value), label, checked: current === value, checkedRole: "radio", onClick: () => onPick(value) };
}

/** c3c3eda79 ct. `createdBy` = [{value, label}], `pluginOptions` = [{id, label}], `reset` = {label, onReset} or null. */
export function SkillFilterMenu({ filter, onChange, pluginOptions, createdBy, count, reset = null }) {
  const state = useMenuState();
  const all = t("All");
  const pickCreatedBy = (value) => onChange({ ...filter, createdBy: value });
  const pickPlugin = (value) => onChange({ ...filter, plugin: value });
  const creators = [radio(null, filter.createdBy, all, pickCreatedBy), ...createdBy.map((option) => radio(option.value, filter.createdBy, option.label, pickCreatedBy))];
  const resetItems = reset ? [{ separator: true }, { key: "reset", label: reset.label, onClick: reset.onReset }] : [];
  return <>
    <FilterTrigger count={count} state={state} />
    <Popup state={state} label={t("Filter")}>
      {pluginOptions.length === 0 ? <>
        <SourceMenu.Group><SourceMenu.GroupLabel>{t("Created by")}</SourceMenu.GroupLabel><MenuEntries items={creators} /></SourceMenu.Group>
      </> : <>
        <SourceMenu.Header>{t("Filter by")}</SourceMenu.Header>
        <SourceMenu.Submenu>
          <SourceMenu.SubmenuTrigger hint={filter.plugin == null ? undefined : pluginOptions.find((option) => option.id === filter.plugin)?.label}>{t("Plugin")}</SourceMenu.SubmenuTrigger>
          <SourceMenu.Popup label={t("Plugin")}><SourceMenu.Group>
            <MenuEntries items={[radio(null, filter.plugin, all, pickPlugin), ...pluginOptions.map((option) => radio(option.id, filter.plugin, option.label, pickPlugin))]} />
          </SourceMenu.Group></SourceMenu.Popup>
        </SourceMenu.Submenu>
        <SourceMenu.Submenu>
          <SourceMenu.SubmenuTrigger hint={filter.createdBy == null ? undefined : createdBy.find((option) => option.value === filter.createdBy)?.label}>{t("Created by")}</SourceMenu.SubmenuTrigger>
          <SourceMenu.Popup label={t("Created by")}><SourceMenu.Group><MenuEntries items={creators} /></SourceMenu.Group></SourceMenu.Popup>
        </SourceMenu.Submenu>
      </>}
      <MenuEntries items={resetItems} />
    </Popup>
  </>;
}

/** c3c3eda79 lt (its trigger always reads plain "Filter"). */
export function PluginShowFilter({ value, onChange, reset = null }) {
  const state = useMenuState();
  const labels = { all: t("All plugins"), enabled: t("Enabled"), disabled: t("Disabled") };
  return <>
    <FilterTrigger count={0} state={state} />
    <Popup state={state} label={t("Filter")}>
      <SourceMenu.Group><SourceMenu.GroupLabel>{t("Show")}</SourceMenu.GroupLabel>
        <MenuEntries items={["all", "enabled", "disabled"].map((option) => radio(option, value, labels[option], onChange))} />
      </SourceMenu.Group>
      {reset && <MenuEntries items={[{ separator: true }, { key: "reset", label: reset.label, onClick: reset.onReset }]} />}
    </Popup>
  </>;
}

/** c3c330885 j. `clear` = {label, onClear} or null. */
export function SortMenu({ value, options, onChange, held = false, clear = null }) {
  const state = useMenuState();
  const current = value === null ? null : options.find((option) => option.value === value) ?? options[0];
  return <div className="flex items-center gap-xs">
    <Button ref={state.trigger} variant="secondary" size={SIZE} icon={<SortGlyph />} data-cz-sort="" data-held={held ? "" : undefined}
      aria-label={current ? t("Sort by {label}", { label: current.label }) : undefined}
      {...menuTriggerProps({ open: !!state.menu, onOpen: (entry) => state.open(entry) })}
      onClick={() => (state.menu ? state.close() : state.open(undefined))}>
      {current ? <><span className="text-muted">{t("Sort ·")}</span> {current.label}</> : t("Sort")}
    </Button>
    <Popup state={state} label={t("Sort by")}>
      <SourceMenu.Group><SourceMenu.GroupLabel>{t("Sort by")}</SourceMenu.GroupLabel>
        <MenuEntries items={options.map((option) => radio(option.value, current?.value, option.label, onChange))} />
      </SourceMenu.Group>
    </Popup>
    {clear && current && <SourceTooltip content={clear.label}>
      <Button iconOnly variant="ghost" size="xs" icon="ArrowCounterClockwise" iconSize={16} aria-label={clear.label} data-cz-reset=""
        onClick={() => { clear.onClear(); state.trigger.current?.focus(); }} />
    </SourceTooltip>}
  </div>;
}

/** shared-19 uT: the list container ("gap-lg" between sections). */
export function ListContainer({ testId, children }) {
  return <div className="flex w-full flex-col gap-lg" data-testid={testId}>{children}</div>;
}

/** c27f32a39 K (classic): span label and the "· {count}" footnote. */
export function SectionHeader({ section, label, count }) {
  return <div className={`flex min-h-7 items-center gap-xs ${SCROLL_MARGIN} px-md`} data-testid={`yours-section-${section}-header`} data-cz-section={section}>
    <span className="text-body-medium text-primary">{label}</span>
    {count !== undefined && <span className="text-footnote text-muted">{`· ${count}`}</span>}
  </div>;
}

/** c27f32a39 Ie: the credit (muted unless plain) and the "·"-separated segments. */
export function RowCredit({ credit, segments = [], plain = false }) {
  const parts = segments.filter((segment) => segment != null && segment !== "" && segment !== false);
  const hasCredit = credit != null && credit !== "" && credit !== false;
  if (!hasCredit && parts.length === 0) return null;
  const tone = plain ? undefined : "text-muted";
  return <span className={`truncate text-secondary ${plain ? "text-footnote" : "text-body"}`}>
    {hasCredit && <span className={tone}>{credit}</span>}
    {parts.map((part, index) => <React.Fragment key={index}>{(hasCredit || index > 0) && <span aria-hidden="true" className={tone ? `px-sm ${tone}` : "px-sm"}>·</span>}{part}</React.Fragment>)}
  </span>;
}

/** c27f32a39 qe → B: the trailing "updated" footnote (narrow relative time; local timestamps are seconds). */
export function RowMeta({ updatedAt, now = Date.now(), locale = getLocale() }) {
  if (!Number.isFinite(updatedAt)) return null;
  const ms = updatedAt * 1000;
  return <span className="text-footnote text-muted truncate"><time dateTime={new Date(ms).toISOString()}>{narrowRelativeTime(ms, now, locale)}</time></span>;
}

/** c27f32a39 V: a focusable chip whose tooltip explains it; clicking opens the row. */
function Chip({ content, onClick, className, children }) {
  return <SourceTooltip content={content}>
    <span tabIndex={0} className={`flex shrink-0 focus-visible:shadow-focus focus-visible:outline-none${onClick ? " cursor-interactive" : ""} ${className}`} onClick={onClick}>{children}</span>
  </SourceTooltip>;
}

// shared-frame Xo (CDS Badge) at size xs, comfortable density: its class string (Ho variants) and the text span
// (na(comfortable, xs) = 2 → "pb-[0.05em]"). Every utility is in the loaded c6a992d55 CSS.
const BADGE = "inline-flex items-center gap-1 align-middle h-control-nested whitespace-nowrap rounded-chip px-sm font-sans text-caption font-medium leading-[round(1.25em,1px)] shrink-0";
const BADGE_VARIANT = { neutral: "bg-neutral text-secondary", accent: "bg-tint-blue text-accent" };
export function ListBadge({ variant = "accent", className = "", children, ...rest }) {
  return <span data-cds="Badge" data-variant={variant} data-size="xs" className={`${BADGE} ${BADGE_VARIANT[variant] ?? BADGE_VARIANT.accent}${className ? ` ${className}` : ""}`} {...rest}>
    <span className="pb-[0.05em]">{children}</span>
  </span>;
}

/** c27f32a39 ze + U: the accent "New" badge. */
export function NewBadge({ reason, onClick }) {
  if (!reason) return null;
  return <Chip content={recentTooltip(reason)} onClick={onClick} className="rounded-chip">
    <ListBadge variant="accent" data-cz-new="">{newBadgeLabel()}</ListBadge>
  </Chip>;
}
// "New" is also the zh "新建" (create) of the menus; the badge reads as the zh "新".
function newBadgeLabel() {
  const key = "badge: New", shown = t(key);
  return shown === key ? t("New") : shown;
}

/** c27f32a39 Ve: the neutral off badge. */
export const OffBadge = () => <ListBadge variant="neutral">{t("Disabled")}</ListBadge>;

/** c27f32a39 et: no row matches the filters. */
export function NoMatches({ onReset }) {
  return <div role="status" data-testid="tabbed-list-no-matches" className="flex flex-1 flex-col items-center justify-center gap-lg px-md py-xl text-center">
    <SourcePictogram name="ObjectMagnifier" />
    <p className="max-w-xs text-pretty text-body text-secondary">{t("Nothing matches these filters.")}</p>
    <Button variant="secondary" size={SIZE} onClick={onReset}>{t("Reset filters")}</Button>
  </div>;
}

// shared-19 kw: the row's icon tile.
const TILE = "size-9 flex shrink-0 items-center justify-center rounded-lg border bg-surface-0 text-muted";

/**
 * c27f32a39 je. `menu` = {itemLabel, items} (MenuEntries rows); the same items open at the pointer on a right-click.
 * `reserveMenuColumn` keeps the menu column's width for a row without one (Ye).
 */
export function ListRow({ testId, icon = null, logo = null, drillLabel, onDrill, trailing = null, menu = null, reserveMenuColumn = false, children, ...rest }) {
  const dots = useMenuState();
  const [point, setPoint] = useState(null);
  const row = useRef(null);
  const items = menu?.items ?? [];
  const className = ["group/yours-row relative flex items-center gap-md rounded-card", "w-full p-md",
    "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border last:after:hidden [&:has(+[data-popup-open])]:after:hidden",
    onDrill && "hover:after:hidden next-sibling-hover:after:hidden hover:bg-fill-ghost-hover [&:has(>div_button:hover)]:bg-transparent",
    menu && "data-[popup-open]:after:hidden data-[popup-open]:bg-fill-ghost-hover"].filter(Boolean).join(" ");
  return <div ref={row} data-testid={testId} className={className} data-popup-open={point ? "" : undefined} {...rest}
    onContextMenu={menu && items.length ? (event) => {
      // je R: only a right-click on the row itself (not inside a menu it opened) opens the context menu.
      if (!event.currentTarget.contains(event.target)) return;
      event.preventDefault();
      setPoint({ x: event.clientX, y: event.clientY, layerBase: layerBaseOf(row.current) });
    } : undefined}>
    {onDrill && <button type="button" onClick={onDrill} aria-label={drillLabel}
      className={`absolute inset-0 rounded-card focus-visible:shadow-focus focus-visible:outline-none ${SCROLL_MARGIN}`} />}
    <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-md [&_[tabindex]]:pointer-events-auto [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
      <div aria-hidden="true" className={logo ? `${TILE} overflow-hidden` : TILE} data-testid="tabbed-list-icon-tile" data-icon={logo ? undefined : icon}>
        {logo ?? <Icon name={icon} size={20} />}
      </div>
      {children}
    </div>
    {(trailing || menu || reserveMenuColumn) && <div className="pointer-events-none relative flex shrink-0 items-center [&_[tabindex]]:pointer-events-auto [&_a]:pointer-events-auto [&_button]:pointer-events-auto gap-lg">
      {trailing}
      {menu ? <>
        <Button ref={dots.trigger} variant="ghost" size={SIZE} iconOnly icon="DotsVertical" iconSize="auto" className={SCROLL_MARGIN}
          aria-label={t("More actions for {name}", { name: menu.itemLabel })} disabled={!items.length}
          {...menuTriggerProps({ open: !!dots.menu, disabled: !items.length, onOpen: (entry) => dots.open(entry) })}
          onClick={() => (dots.menu ? dots.close() : dots.open(undefined))} />
        <Popup state={dots} label={t("More actions for {name}", { name: menu.itemLabel })}><MenuEntries items={items} /></Popup>
      </> : reserveMenuColumn && <div aria-hidden="true" data-testid="tabbed-list-row-menu-spacer" data-size={SIZE} className="aspect-square h-control shrink-0" />}
    </div>}
    {point && <SourceMenu.Popup anchor={row.current} point={point} dataCds="ContextMenu" layer="contextmenu" layerBase={point.layerBase}
      label={t("More actions for {name}", { name: menu.itemLabel })} onClose={() => setPoint(null)}><MenuEntries items={items} /></SourceMenu.Popup>}
  </div>;
}
