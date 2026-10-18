import { AddServerDialog } from "./source-settings-harness.jsx";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { bindCustomizeScroll } from './customize-scroll.mjs';
import { BUILTIN_PLUGINS, builtinPluginRow, filterBuiltinPlugins } from './builtin-plugins.mjs';
import { pluginDetailTabList, pluginDetailTabs, pluginDetailView, pluginOverview } from './plugin-detail-model.mjs';
import { PluginOverview } from './source-r4e-plugin-overview.jsx';
import { Icon } from "./icons";
import { SourceSkillFile } from './source-skill-file.jsx';
import { SourceSwitch as Switch } from './source-switch.jsx';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceInfoTip } from './source-infotip.jsx';
import { localizeBridgeText } from './bridge-text-model.mjs';
import { cleanErrorReason } from './action-error-model.mjs';
import { SourceMenu, menuTriggerProps } from './source-menu.jsx';
import { SourceSegments } from './source-segments.jsx';
import { SourcePictogram } from './source-pictogram.jsx';
import { SourceDisclosure } from './source-disclosure.jsx';
import { SourceSelect } from './source-select.jsx';
import { SourceConfirmationDialog, SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { useSourceToasts } from './source-toast.jsx';
import { appsView, connectorPairs, connectorApprovalItems, connectorToolRows, pluginAppsNeedingAuth,
  CONNECTOR_TOASTS, MCP_STATUS_FILTERS, MCP_STATUS_LABELS, connectorDetailMessage, connectorDetailState, connectorsListView, customizeCore,
  filterMcp, filterMcpByStatus, filterPlugins, mcpServerConfigValue, nativePluginActions, officialSubtitleFor, pluginChangeOutcome, pluginInstallStatus,
  shortDate, skillAuthor, skillInvocable, skillTrigger, splitArguments, joinArguments, validateServerName,
} from "./customize-model.mjs";
import { getAssistantName, t, tn } from '../electron/i18n/index.mjs';
import { DEFAULT_SKILL_FILTER, DEFAULT_SORT, createdByLabel, createdByOptions, marketplaceInstalledPlugins, marketplaceLabel, marketplaceLastUpdated,
  marketplaceRemovalDescription, marketplaceUpgradeToast, pluginListView, pluginRowFacts, recentReason, sectionLabel, skillCredit,
  skillListView } from './customize-list-model.mjs';
import { ListBadge, ListContainer, ListRow, ListToolbar, MenuEntries, NewBadge, NoMatches, OffBadge, PluginShowFilter, RowCredit, RowMeta,
  SectionHeader, SkillFilterMenu, SortMenu } from './source-customize-list.jsx';
import "./source-customize.css";

// Fills {placeholders} of a translated template with React nodes, so a
// sentence that holds markup stays one dictionary entry.
function richText(template, parts) {
  return template.split(/\{(\w+)\}/).map((piece, index) => index % 2 ? <React.Fragment key={index}>{parts[piece] ?? `{${piece}}`}</React.Fragment> : piece);
}

// 2.2553.1 "Customize" settings group (shared-22 hS): Skills / Connectors /
// Plugins pages over the local Codex catalog. Page shell = title + search +
// actions (customize-page-shell U), optional owner segments (De, only with
// >= 2 groups), a fixed-layout CDS table (q over c51c45b79 Table primitives)
// inside the horizontal scroller (Y), and the official empty states. Cloud
// features (upload, security scan, Directory/Browse, remote install, cloud
// "last updated") have no Codex backend and are not drawn. Copy, skill
// roots and the skill/connector write controls follow the running core
// (customize-model customizeCore over boot.core).

function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function useCatalogNavigation(focus, selectionKey) {
  const [query,setQuery]=useState(focus?.searchSeed||'');
  const [selected,setSelected]=useState(focus?.[selectionKey]||null);
  useEffect(()=>{setQuery(focus?.searchSeed||'');setSelected(focus?.[selectionKey]||null);},[focus,selectionKey]);
  return {query,setQuery,selected,setSelected};
}

// Official CDS SearchInput (ccefd43d9 x / c13348442 t) defaults to
// collapsible: a ghost icon-only Search button that expands into a
// role="search" wrapper (classic pageLayout=false: w-48 = 192px) holding <input type="search"> with a
// Search slotStart and a "Clear search" button. Escape clears first, then
// collapses; blurring an empty field collapses it again.
function PageSearch({ label, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const button = useRef(null);
  const input = useRef(null);
  const returnFocus = useRef(false);
  useLayoutEffect(() => {
    if (returnFocus.current && !expanded && !value) { returnFocus.current = false; button.current?.focus(); }
  }, [expanded, value]);
  const collapse = () => { returnFocus.current = true; setExpanded(false); };
  if (!expanded && value.length === 0) {
    return (
      <button ref={button} type="button" className="cz-search-toggle" data-cds="Button" data-variant="ghost"
        aria-label={label} aria-expanded="false" onClick={() => setExpanded(true)}><Icon name="Search" size={20} /></button>
    );
  }
  return (
    <div className="cz-search" data-cds="TextInput" data-clearable={value !== "" || undefined} role="search" onMouseDown={event => {
      // shared-frame gd: focus on the field chrome, preserving native input,
      // clear-button and non-primary mouse behavior.
      if (event.button !== 0) return;
      const control = event.target.closest?.('input,button,a[href],label,select,textarea,[role="button"],[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])');
      if (control && event.currentTarget.contains(control)) return;
      event.preventDefault(); input.current?.focus();
    }}>
      <Icon name="Search" size={16} aria-hidden="true" />
      <input ref={input} type="search" autoFocus autoComplete="off" aria-label={label} placeholder={label} value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setExpanded(true)}
        onBlur={() => { if (!value) setExpanded(false); }}
        onKeyDown={(event) => {
          // ccefd43d9 x: while the collapsible field is open Escape always
          // stops there — it clears the query and collapses, it does not
          // close the dialog behind it.
          if (event.key !== "Escape") return;
          if (event.nativeEvent.isComposing) { event.stopPropagation(); return; }
          event.preventDefault();
          event.stopPropagation();
          if (value) onChange("");
          collapse();
        }} />
      {value !== "" && (
        <span className="cz-search-end" data-cds-end-slot=""><button type="button" className="cz-search-clear" data-cds="Button" data-cds-ghost="" aria-label={t("Clear search")}
          onMouseDown={event => event.preventDefault()}
          onClick={() => { onChange(""); setExpanded(true); input.current?.focus(); }}><Icon name="X" size={20} /></button></span>
      )}
    </div>
  );
}

// ccefd43d9 b (inDialog): a list page's toolbar (its tabs, filter and sort; c3c330885 D) sits beside the title.
export function PageHeader({ title, searchLabel, searchValue, onSearch, actions, toolbar = null }) {
  return (
    <header className="cz-header">
      {toolbar ? <div className="cz-title-row flex min-w-0 flex-1 items-center gap-md"><h2 className="cz-title text-heading-medium">{title}</h2><div className="shrink-0">{toolbar}</div></div>
        : <h2 className="cz-title text-heading-medium">{title}</h2>}
      <div className="cz-header-controls"><PageSearch label={searchLabel} value={searchValue} onChange={onSearch} />
        {actions && <div className="cz-actions">{actions}</div>}</div>
    </header>
  );
}

export function PageBody({ children, memory, scrollKey = 'list' }) {
  const root = useRef(null);
  useLayoutEffect(() => memory ? bindCustomizeScroll(root.current, memory, scrollKey) : undefined, [memory, scrollKey]);
  return <div ref={root} className="cz-page-body scroll-fade-y scroll-fade-size-6">{children}</div>;
}

// Uncontained SegmentedControl filters (page shell De :628-655 "Filter by owner",
// customize-connectors :3580-3600 "Filter by status"): size A() = shared-20 Za →
// "sm" in the classic dialog, self-start.
function FilterSegments({ label, value, options, onChange, className = "self-start" }) {
  return <SourceSegments label={label} value={value} options={options} onChange={onChange} variant="uncontained" size={DIALOG_BUTTON_SIZE} className={className} />;
}

// `flush` drops q's mt-sm: the connectors table sits in its own gap-sm block
// right under the status filter (customize-connectors :3582-3600, ln without mt-sm).
export function ListTable({ columns, children, label, flush = false }) {
  return (
    <div className="cz-scroller">
      <table className={flush ? "cz-table cz-table-flush" : "cz-table"} data-cds="Table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} scope="col" className={column.width ? `cz-col-${column.width}` : undefined}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Official row (customize-page-shell G, :525-548): both the click and the
// Enter/Space handler ignore events that started inside a nested control, so
// buttons rendered in a cell keep their own activation.
const ROW_CLICK_SKIP = "button, a, [role='menu'], [role='menuitem'], [data-cds='SplitDropdownButton']";
const ROW_KEY_SKIP = "button, a, [role='menu'], [role='menuitem']";

function rowActivates(event, selector) {
  const target = event.target;
  if (!(target instanceof Element)) return true;
  return !target.closest(selector) && event.currentTarget.contains(target);
}

// G :555 names the row "View {name}" (focus-visible:shadow-focus, outline-none).
function Row({ id, name, selected, onSelect, children, ...rest }) {
  return (
    <tr data-hoverable="" data-clickable="" tabIndex={0} aria-selected={selected || undefined} data-selected={selected ? "true" : undefined}
      data-row-id={id} aria-label={t("View {name}", { name })}
      onClick={(event) => { if (rowActivates(event, ROW_CLICK_SKIP)) onSelect(event); }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (!rowActivates(event, ROW_KEY_SKIP)) return;
        event.preventDefault();
        onSelect(event);
      }} {...rest}>
      {children}
    </tr>
  );
}

export function Badge({ children, variant = "default", title }) {
  return <span className="cz-badge" data-variant={variant} data-size="xs" title={title}>{children}</span>;
}

function Dash() {
  return <span aria-hidden="true">—</span>;
}

// Page shell Ee (customize-page-shell-current.js:566-612). A search with no
// match is the plain p (searchActions are null on every local page); otherwise
// a flex-1 column centred in the page body: CDS pictogram, max-w-xs secondary
// copy, then the page's actions.
export function EmptyState({ searchValue = "", noMatchMessage, emptyMessage, pictogram, actions }) {
  if (searchValue) return <p className="cz-empty-search py-lg text-center text-body text-secondary">{noMatchMessage}</p>;
  return (
    <div className="cz-empty flex flex-1 flex-col items-center justify-center gap-lg py-lg text-center" data-cz-empty="">
      {pictogram && <SourcePictogram name={pictogram} />}
      <p className="max-w-xs text-pretty text-body text-secondary">{emptyMessage}</p>
      {actions}
    </div>
  );
}

// _r / shared-13 Jk bordered connector tile: size×size, radius size*.27,
// surface-3, 0.5px --cds-border, shadow-sm. Local MCP servers carry no icon,
// so the tile holds the Connectors glyph at imageSize (24/16 in rows and
// headers, 56/40 in the not-connected drill).
function ConnectorTile({ size = 24 }) {
  const large = size === 56;
  return <span aria-hidden="true" className={large ? "cz-connector-tile cz-connector-tile-lg" : "cz-connector-tile"}><Icon name="Connectors" size={large ? 40 : 16} /></span>;
}

// Ghost icon-only DotsVertical trigger plus its SourceMenu (cfaabd194 ct /
// c08e79e85 Sn: tooltip false, Popup align end). Customize lives in the
// Settings dialog, so the menu takes the page's --cds-layer-base. Without
// items ct disables its trigger (`disabled: !b || !De`) and Sn renders nothing.
function MoreMenu({ label, size, items, className, hideWhenEmpty = false }) {
  const trigger = useRef(null);
  const [menu, setMenu] = useState(null);
  if (!items.length && hideWhenEmpty) return null;
  const open = (entry) => setMenu({ entry, layerBase: Number.parseInt(getComputedStyle(trigger.current).getPropertyValue("--cds-layer-base"), 10) || 0 });
  return <>
    <Button ref={trigger} variant="ghost" size={size} iconOnly icon="DotsVertical" iconSize="auto" aria-label={label} className={className} disabled={!items.length}
      {...menuTriggerProps({ open: !!menu, disabled: !items.length, onOpen: (entry) => open(entry) })}
      onClick={() => (menu ? setMenu(null) : open(undefined))} />
    {menu && <SourceMenu.Popup anchor={trigger.current} side="bottom" align="end" label={label} initialHighlight={menu.entry}
      layerBase={menu.layerBase} onClose={() => setMenu(null)}>
      {items.map((item) => <SourceMenu.Item key={item.label} icon={item.icon} variant={item.variant} disabled={item.disabled} onClick={item.onClick}>{item.label}</SourceMenu.Item>)}
    </SourceMenu.Popup>}
  </>;
}

// Official add-menu trigger (c8963aace ie, shared by every Customize page): a menu TriggerButton whose visible text is
// "Add" (alWu/MbgXB) and whose aria-label names what it adds (Skills "Add skill" tnEMvwSDlT, Plugins "Add plugin"
// 9knX1qH3f1), over a Popup aligned end. Items: {label, icon, onClick, disabled}.
function MenuButton({ label, children, items, variant = "primary", size }) {
  const trigger = useRef(null);
  const [menu, setMenu] = useState(null);
  const open = (entry) => setMenu({ entry, layerBase: Number.parseInt(getComputedStyle(trigger.current).getPropertyValue("--cds-layer-base"), 10) || 0 });
  return <>
    <Button ref={trigger} variant={variant} size={size} aria-label={label} disabled={!items.length}
      {...menuTriggerProps({ open: !!menu, disabled: !items.length, onOpen: (entry) => open(entry) })}
      onClick={() => (menu ? setMenu(null) : open(undefined))}>{children}</Button>
    {menu && <SourceMenu.Popup anchor={trigger.current} side="bottom" align="end" label={label} initialHighlight={menu.entry}
      layerBase={menu.layerBase} onClose={() => setMenu(null)}>
      {items.map((item) => <SourceMenu.Item key={item.label} icon={item.icon} disabled={item.disabled} onClick={item.onClick}>{item.label}</SourceMenu.Item>)}
    </SourceMenu.Popup>}
  </>;
}

// pw (2.31226.0 shared-frame-DVFSKIcx :13467-13521) InfoTip: a muted Info sm button labelled "More info" whose
// Popover opens on hover after 300ms and stays open on a click (source-infotip.jsx), side top, offset 6.
function InfoTip({ content }) {
  return <SourceInfoTip content={content} className="cz-infotip" />;
}

// Catalog loading skeleton (2.2553.1 readable/shared-22-Cz3C_T8d.js). Every
// class string is the source string; each utility exists in the loaded
// original /assets/v1/c6a992d55-C0zTICcS.css.
// TC/OC/kC/AC :3389-3396 → row bar widths (128/160/112/144/96/128px), header
// cell, h-7 + py-sm row cell with an alpha-1 rule, and the 3 column boxes.
export const SKELETON_WIDTHS = ["w-32", "w-40", "w-28", "w-36", "w-24", "w-32"];
const SKELETON_HEADER_CELL = "flex h-control items-center px-md";
const SKELETON_ROW_CELL = "box-content flex h-7 items-center gap-sm border-b border-alpha-1 px-md py-sm";
const SKELETON_COLUMNS = ["min-w-0 flex-1", "w-40 shrink-0", "w-40 shrink-0"];
// K = shared-frame gc (:3448-3480, exported as wc) outside a SkeletonGroup:
// role=status, shimmer ::after and an sr-only "Loading". X is tailwind-merge,
// so a caller's size-6 / h-control replaces the default h-[1em].
const SKELETON_BAR = "max-w-full overflow-hidden rounded bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden";
// gc also takes width/height as inline style; a caller's rounded-* replaces
// the default `rounded` (tailwind-merge).
function SkeletonBar({ className = "", width, height }) {
  const sized = /(^|\s)(size-|h-)/.test(className);
  const base = /(^|\s)rounded-/.test(className) ? SKELETON_BAR.replace(" rounded ", " ") : SKELETON_BAR;
  const style = width !== undefined || height !== undefined ? { width, height } : undefined;
  return <div data-cds="Skeleton" role="status" className={`relative ${sized ? "" : "h-[1em] "}${base} ${className}`.trim()} style={style}><span className="sr-only">{t("Loading")}</span></div>;
}
// Q :2880-2885: a line-height box centring a 1em bar at the given text size.
const SkeletonLine = ({ className, width }) => <div className={`flex h-lh max-w-full items-center ${className}`}><SkeletonBar className={width} /></div>;
// jC :3397-3458 (flush=false: Dp is the page-layout breakpoint, false in the
// classic settings dialog).
function CatalogRowsSkeleton({ count = SKELETON_WIDTHS.length, leadingIcon = false, className = "" }) {
  const widths = Array.from({ length: count }, (_, index) => SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]);
  return <div className={`-mx-pad-lg shrink-0 overflow-hidden px-lg [scrollbar-gutter:stable]${className ? ` ${className}` : ""}`}>
    <div className="flex">{SKELETON_COLUMNS.map((column, index) => <div key={index} className={`${SKELETON_HEADER_CELL} ${column}`}>
      <SkeletonLine className="text-footnote" width={index === 0 ? "w-16" : "w-8"} /></div>)}</div>
    {widths.map((width, row) => <div key={row} className="flex">{SKELETON_COLUMNS.map((column, index) => <div key={index} className={column}>
      <div className={row === 0 ? `${SKELETON_ROW_CELL} border-t` : SKELETON_ROW_CELL}>
        {index === 0 && leadingIcon && <SkeletonBar className="size-6 shrink-0" />}
        <SkeletonLine className="min-w-0 flex-1 text-body" width={index === 0 ? width : index === 1 ? "w-8" : "w-16"} />
      </div></div>)}</div>)}
  </div>;
}
// Loading body of the Customize panel skeleton FC (:3574-3650): an sr-only
// role=status "Loading" (:3620-3628) beside an aria-hidden body. Connectors use
// MC (:3459-3480: data-testid connectors-rows-skeleton, pt-sm, VS w-63 search
// stand-in at :2886-2893, rows with leadingIcon); skills and plugins use
// jC {className:"mt-sm"} without the icon slot (:3876-3881). The real page
// header stays drawn above it, so FC's toolbar stand-ins are not repeated.
export function CatalogSkeleton({ section }) {
  return <>
    <span role="status" className="sr-only">{t("Loading")}</span>
    <div aria-hidden="true" className="flex flex-col" data-cz-skeleton={section}>
      {section === "connectors"
        ? <div className="flex flex-col gap-sm pt-sm" data-testid="connectors-rows-skeleton">
            <div className="shrink-0 self-start"><div className="shrink-0 w-63"><SkeletonBar className="h-control w-full" /></div></div>
            <div aria-hidden="true" className="flex flex-col"><CatalogRowsSkeleton leadingIcon /></div>
          </div>
        : <CatalogRowsSkeleton className="mt-sm" />}
    </div>
  </>;
}

// shared-20 Lf (exported as Za, tmp-shared-20-BrTrXIRV.js:2013):
// `Ff() ? void 0 : "sm"` — page-shell/skill buttons are "sm" unless the
// Customize surface is a pageLayout page. Locally Customize lives in the
// classic settings dialog (pageLayout=false), so Za resolves to "sm".
const DIALOG_BUTTON_SIZE = "sm";

// Catalog load failure. Connectors = so() (customize-connectors-current.js
// :3830-3848, chosen by :3136-3147 G "error"): muted body copy and a secondary
// "Try again". Skills = Ti {missing:"all"} (customize-skills-current.js
// :2380-2396) → c27f32a39 Ie non-partial: role=status data-testid
// skills-tabbed-list-error, secondary busy "Retry" at size:a (a = A() =
// shared-20 Za = Lf, tmp-shared-20:2013 → "sm" outside pageLayout, which the
// classic dialog is; see PageSearch); its ObjectMagnifier
// pictogram (shared-7 tV) is not drawn locally (pictograms are deferred).
// Plugins: the classic plugins page has no load-failure branch; so() is reused
// with the source catalog copy "Couldn’t load plugins." (cb2367241
// catalogLoadFailed / c84e37421). The raw backend message goes to console only.
export function CatalogLoadError({ section, onRetry, busy = false }) {
  if (section === "skills") return <div role="status" data-testid="skills-tabbed-list-error" className="flex flex-1 flex-col items-center justify-center gap-lg px-md py-xl text-center cz-load-error">
    <p className="max-w-xs text-pretty text-body text-secondary">{t("Couldn’t load your skills.")}</p>
    <Button variant="secondary" size={DIALOG_BUTTON_SIZE} busy={busy} onClick={onRetry}>{t("Retry")}</Button>
  </div>;
  return <div className="flex h-full flex-col items-center justify-center gap-md p-lg text-center cz-load-error">
    <p className="text-body text-muted">{section === "plugins" ? t("Couldn’t load plugins.") : t("Couldn’t load connectors")}</p>
    <Button variant="secondary" onClick={onRetry}>{t("Try again")}</Button>
  </div>;
}

// Only the copy above reaches the DOM; each distinct backend failure is logged once.
function useLoadFailureLog(section, status, error) {
  const last = useRef("");
  useEffect(() => {
    if (status !== "error") { last.current = ""; return; }
    if (last.current === error) return;
    last.current = error;
    console.warn(`[customize] ${section} catalog failed to load: ${error || "unknown error"}`);
  }, [section, status, error]);
}

// c9d36aa51 plugin-page skeleton (c36b3644c be: shown while plugin/read has no
// result): a 200×24 title bar with a 40×20 pill and a 32×32 square, a 2-column
// grid of 60/100×14 bars, a 100×14 bar over a full-width 40px block, then a
// 120×18 bar over four 100×32 pills. Only the title bar is announced.
export function PluginPageSkeleton() {
  return <div data-testid="plugin-page-skeleton" className="flex h-full flex-col">
    <div className="flex items-center justify-between px-6 py-3">
      <SkeletonBar width={200} height={24} />
      <div aria-hidden="true" className="flex items-center gap-3">
        <SkeletonBar width={40} height={20} className="rounded-full" />
        <SkeletonBar width={32} height={32} />
      </div>
    </div>
    <div aria-hidden="true" className="grid grid-cols-2 gap-4 px-6 py-3">
      {[0, 1].map((index) => <div key={index} className="flex flex-col gap-1"><SkeletonBar width={60} height={14} /><SkeletonBar width={100} height={14} /></div>)}
    </div>
    <div aria-hidden="true" className="flex flex-col gap-2 px-6 py-4">
      <SkeletonBar width={100} height={14} />
      <SkeletonBar height={40} className="w-full" />
    </div>
    <div aria-hidden="true" className="flex flex-col gap-3 px-6 py-4">
      <SkeletonBar width={120} height={18} />
      <div className="flex flex-wrap gap-2.5">{[0, 1, 2, 3].map((index) => <SkeletonBar key={index} width={100} height={32} className="rounded-full" />)}</div>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Skills

// Skill detail = the official page-shell drill-in (customize-skills
// :2822-2852 -> W :432-517): the list is replaced, the header becomes a ghost
// ArrowLeft button labelled "Skills", and the body is the skill header plus
// the SKILL.md file view (customize-skill-detail :276, :136-176).
function useSkillFile(callRef, path) {
  const [state, setState] = useState({ path, status: "loading", content: null });
  useEffect(() => {
    if (!path) return undefined;
    let live = true;
    setState({ path, status: "loading", content: null });
    callRef.current({ operation: "skill-file", path })
      .then((result) => { if (live) setState({ path, status: "ready", content: typeof result?.content === "string" ? result.content : null }); })
      .catch(() => { if (live) setState({ path, status: "error", content: null }); });
    return () => { live = false; };
  }, [callRef, path]);
  return state.path===path?state:{path,status:"loading",content:null};
}

// Page-shell drill header (customize-page-shell-current.js:486-493): CDS
// Button {variant:"ghost", size:c, icon:"ArrowLeft", flush:true} labelled with
// the page title, c = A() (:442) = shared-20 Za → "sm" here; the icon follows
// the button's density-auto size (Ds) and flush outsets by the sm pad-md.
function BackButton({ onClick, children }) {
  return <Button variant="ghost" size={DIALOG_BUTTON_SIZE} icon="ArrowLeft" iconSize="auto" flush onClick={onClick}>{children}</Button>;
}

// customize-skill-detail :77-87: while the file loads, "p-3" around a 100% ×
// 200px rounded-md shimmer bar with one sr-only "Loading" (here the CDS
// SkeletonBar); B :140-176 owns the empty and error copy.
function SkillFiles({ state }) {
  if (state.status === "error") return <p className="cz-file-empty">{t("Files unavailable right now.")}</p>;
  if (state.status === "loading") return <div className="p-3" data-cz-file-loading=""><SkeletonBar height={200} className="w-full rounded-md" /></div>;
  if (state.content === null) return <p className="cz-file-empty">{t("No files to show.")}</p>;
  return <SourceSkillFile key={state.path} content={state.content} />;
}

// Skill drill body = c9a7e510b D in the drill's isModal branch: "flex flex-col
// h-full px-6 pb-6 gap-3"; header "flex justify-between min-h-14 items-center
// py-3 -me-6 pe-md" (2.42304.0 c9a7e510b-C4qmEmSP D: the logical form of
// 2.37337.1's "-mr-6 pr-md", same F ? "pe-[22px]" : "pe-md" branch) with the h2 "min-w-0 font-large-bold text-primary
// truncate" and cfaabd194 wt headerActions; then the ccb4abbdf facts row, the
// c6f9b6c10 Description block, and the files in "flex-1 min-h-0 flex flex-col
// gap-3 mt-2".
// ccb4abbdf r: the Trigger value is a focusable dotted-underline span whose
// tooltip explains the invocation policy.
const TRIGGER_VALUE = "font-base text-primary whitespace-nowrap cursor-help underline decoration-dotted decoration-alpha-2 underline-offset-4";

// A skill the core installed for the user (~/.qwen/skills/<slug>/SKILL.md, copy.skillInstall): its slug, else null.
export function managedSkillSlug(skill, copy) {
  if (!copy?.skillInstall || typeof skill?.path !== "string") return null;
  const match = /\/\.qwen\/skills\/([A-Za-z0-9._-]+)\/SKILL\.md$/.exec(skill.path);
  return match && skill.scope === "user" ? match[1] : null;
}

// Customize › Skills › Add skill from URL (copy.skillInstall: Qwen's qwen/skills/install): a name and a SKILL.md address.
function AddSkillForm({ onSubmit, onCancel, busy }) {
  const [slug, setSlug] = useState(""), [url, setUrl] = useState(""), [error, setError] = useState("");
  return <form className="cz-form" aria-label={t("Add skill from URL")} onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    try { await onSubmit({ slug: slug.trim(), url: url.trim() }); }
    catch (reason) { setError(reason?.message || t("The skill could not be added.")); }
  }}>
    <h3>{t("Add skill from URL")}</h3>
    <p className="cz-muted">{t("Downloads the SKILL.md at this address into your skills folder.")}</p>
    <label className="cz-field"><span>{t("Name")}</span><input aria-label={t("Skill name")} value={slug} placeholder="my-skill" autoFocus spellCheck={false} onChange={(event) => { setSlug(event.target.value); setError(""); }} /></label>
    <label className="cz-field"><span>URL</span><input aria-label={t("SKILL.md address")} value={url} placeholder="https://example.com/skills/my-skill/SKILL.md" spellCheck={false} onChange={(event) => { setUrl(event.target.value); setError(""); }} /></label>
    {error && <p className="cz-error" role="alert">{error}</p>}
    <div className="cz-form-actions">
      <Button variant="secondary" onClick={onCancel} disabled={busy}>{t("Cancel")}</Button>
      <Button type="submit" variant="primary" busy={busy} disabled={busy || !slug.trim() || !url.trim()}>{t("Add skill")}</Button>
    </div>
  </form>;
}

function SkillDetail({ skill, author, file, toggling, toggleError, onToggle, onBack, onRevealPath, onUseSkill, onDelete = null, copy, backLabel=t("Skills") }) {
  const toggleLabel = t("Enable skill");
  // A core without a per-skill switch (copy.skillToggle false) gates Try in
  // chat on user invocation alone; Codex keeps `enabled`.
  const tryable = copy.skillToggle ? skill.enabled : skillInvocable(skill);
  const trigger = skillTrigger(skill, copy);
  return (
    <div className="cz-drill" data-cz-detail="skill">
      <div className="cz-drill-header">
        <BackButton onClick={onBack}>{backLabel}</BackButton>
      </div>
      <div className="cz-drill-scroll scroll-fade-y scroll-fade-size-6"><div className="cz-skill-detail flex flex-col h-full px-6 pb-6 gap-3">
        <div className="cz-skill-head flex justify-between min-h-14 items-center py-3 -me-6 pe-md">
          <div className="flex flex-1 flex-col min-w-0"><div className="flex min-w-0 items-center gap-xs">
            <h2 className="min-w-0 font-large-bold text-primary truncate">{skill.name}</h2>
          </div></div>
          <div className="cz-skill-actions flex items-center gap-2">
            {/* wt: primary "Try in chat", size te (Za → sm), icon Chat, disabled
                while the skill is off with disabledReason "Enable skill to try in
                chat". Locally it inserts the skill chip into the composer. */}
            <SourceTooltip disabledReason={tryable || !copy.skillToggle ? undefined : t("Enable skill to try in chat")}>
              <Button variant="primary" size={DIALOG_BUTTON_SIZE} icon="Chat" iconSize="auto" disabled={!tryable || !onUseSkill}
                onClick={() => onUseSkill?.({ name: skill.name, skillName: skill.skillName, path: skill.path })}>{t("Try in chat")}</Button>
            </SourceTooltip>
            {/* wt: Switch size sm, aria-label "Enable skill", no visible label,
                only when the skill can be toggled (cfaabd194 `Ce && Switch`): the
                DeepSeek core has no per-skill switch, and a row the core cannot
                switch (a bridge's slash command) gets none either. */}
            {copy.skillToggle && skill.toggleable !== false && <Switch label={toggleLabel} size="sm" checked={skill.enabled} disabled={toggling} onChange={(value) => onToggle(skill, value)} />}
            {/* ct: ghost icon-only DotsVertical (size sm outside pageLayout) whose
                menu holds "Show in Folder" (the reveal of SKILL.md). */}
            <MoreMenu label={t("More options for {name}", { name: skill.name })} size={DIALOG_BUTTON_SIZE}
              items={[...(onRevealPath ? [{ label: t("Show in Folder"), icon: "Folder", onClick: () => onRevealPath(skill.path) }] : []),
                ...(onDelete ? [{ label: t("Delete skill"), variant: "danger", onClick: () => onDelete(skill) }] : [])]} />
          </div>
        </div>
        {toggleError && <p className="cz-error" role="alert">{localizeBridgeText(toggleError)}</p>}
        {skill.disabledReason && <p className="cz-muted" role="note" data-skill-disabled-reason="">{localizeBridgeText(skill.disabledReason)}</p>}
        {/* ccb4abbdf r: Added by / Version (SKILL.md metadata.version, when
            reported) / Last updated / Trigger (when the core reports the
            invocation policy; a Codex core does not). */}
        <div className="cz-skill-facts flex flex-wrap gap-x-8 gap-y-3">
          <div className="flex min-w-0 max-w-full flex-col gap-1">
            <span className="font-small text-muted whitespace-nowrap">{t("Added by")}</span>
            <span className="font-base text-primary [overflow-wrap:anywhere]">{author}</span>
          </div>
          {skill.version ? <div className="flex flex-col gap-1">
            <span className="font-small text-muted whitespace-nowrap">{t("Version")}</span>
            <span className="font-base text-primary whitespace-nowrap">{skill.version}</span>
          </div> : null}
          {skill.updatedAt ? <div className="flex flex-col gap-1">
            <span className="font-small text-muted whitespace-nowrap">{t("Last updated")}</span>
            <span className="font-base text-primary whitespace-nowrap"><time dateTime={new Date(skill.updatedAt * 1000).toISOString()}>{shortDate(skill.updatedAt)}</time></span>
          </div> : null}
          {trigger && <div className="flex flex-col gap-1" data-cz-skill-trigger="">
            <span className="font-small text-muted whitespace-nowrap">{t("Trigger")}</span>
            <SourceTooltip multiline className="[overflow-wrap:anywhere]" content={trigger.tooltip}>
              <span className={TRIGGER_VALUE} tabIndex={0}>{trigger.label}</span>
            </SourceTooltip>
          </div>}
        </div>
        {/* c9a7e510b T + c6f9b6c10: h3 "Description" (font-small muted) with the InfoTip, then the text. */}
        {skill.description && <div className="cz-skill-description flex flex-col gap-1">
          <div className="flex items-center justify-between"><div className="flex items-center gap-0.5">
            <h3 className="font-small text-muted">{t("Description")}</h3>
            <InfoTip content={copy.skillDescriptionTooltip} />
          </div></div>
          <p className="font-base text-secondary whitespace-pre-wrap [overflow-wrap:anywhere]">{skill.description}</p>
        </div>}
        <div className="cz-skill-files flex-1 min-h-0 flex flex-col gap-3 mt-2"><SkillFiles state={file} /></div>
      </div>
      </div>
    </div>
  );
}

function SkillsPage({ store, cwd, call, onUseSkill, onRevealPath, onNavigate, focus, copy }) {
  const scrollMemory = useRef(new Map());
  const snapshot = useStore(store);
  const ownsCatalog = snapshot.skills.cwd === cwd;
  const { skills, errors, status, error } = ownsCatalog ? snapshot.skills
    : { skills: [], errors: [], status: "loading", error: "" };
  const plugins = snapshot.plugins.cwd === cwd ? snapshot.plugins.rows : [];
  const {query,setQuery,selected,setSelected}=useCatalogNavigation(focus,"skillPath");
  // c5e558aae Mr :1640-1641: the list's sort (default "updated", Last edited) and filter ({plugin, createdBy}).
  const [filter,setFilter]=useState(DEFAULT_SKILL_FILTER), [sort,setSort]=useState(DEFAULT_SORT);
  useEffect(()=>{if(focus)setFilter(DEFAULT_SKILL_FILTER);},[focus]);
  const [toggleError, setToggleError] = useState(""), [toggling, setToggling] = useState(false), [rowBusy, setRowBusy] = useState("");
  // Add skill from URL / Delete (copy.skillInstall).
  const [adding, setAdding] = useState(false), [skillBusy, setSkillBusy] = useState(false), [deleting, setDeleting] = useState(null);
  // Create a skill (CreateSkillDialog) in the first of your own skill folders.
  const [creating, setCreating] = useState(false);
  const toasts = useSourceToasts();
  const callRef = useRef(call);
  callRef.current = call;
  useEffect(() => { store.loadSkills({ cwd }); store.loadPlugins({ cwd }); }, [store, cwd]);
  const view = useMemo(() => skillListView({ skills, errors, plugins, query, filter, sort }), [skills, errors, plugins, query, filter, sort]);
  const current = selected ? skills.find((row) => row.path === selected) : null;
  useEffect(() => { if (status === "ready" && selected && !current) setSelected(null); }, [selected, current, status]);
  const file = useSkillFile(callRef, current?.path || null);
  // Ht (no skill at all) → the page's empty state; a search without a hit → its no-match line; Gt (the filters hide
  // every hit) → on, the "Nothing matches these filters." reset.
  const empty = status === "ready" && view.total === 0;
  const unmatched = status === "ready" && !empty && view.searched === 0;
  const filteredOut = status === "ready" && view.searched > 0 && view.matched === 0;
  // Ie keeps the failure on screen with a busy Retry while ut.retry runs; the
  // store reports that forced reload as "loading" until it settles.
  const [retrying, setRetrying] = useState(false);
  useLoadFailureLog("skills", status, error);
  const retry = async () => { setRetrying(true); try { await store.loadSkills({ cwd, force: true }); } finally { setRetrying(false); } };
  async function toggle(row, enabled) {
    setToggleError(""); setToggling(true);
    try { await store.setSkillEnabled(row.path, enabled); }
    catch (reason) { setToggleError(reason.message || t("The skill setting could not be saved.")); }
    finally { setToggling(false); }
  }
  // detailPresenting (page shell :118, :288): the header and the list are not
  // drawn while a drill-in is open.
  // The skill's Delete (copy.skillInstall: a skill the core installed), from its page or its list row's Remove.
  // ccea1f474 Js: a list row's Remove asks "Remove skill?" (confirm "Remove"); the skill page keeps its Delete.
  const deleteDialog = <SourceConfirmationDialog open={!!deleting} title={deleting?.fromList ? t("Remove skill?") : t("Delete {name}?", { name: deleting?.name ?? "" })}
    confirmLabel={deleting?.fromList ? t("Remove") : t("Delete")} confirmVariant="danger" pending={skillBusy}
    body={t("The skill’s folder is removed from your skills. Sessions stop offering it.")}
    onCancel={() => setDeleting(null)} onConfirm={async () => {
      setSkillBusy(true); setToggleError("");
      try { await call({ operation: "skill-delete", slug: managedSkillSlug(deleting, copy) }); setDeleting(null); setSelected(null); await store.loadSkills({ cwd, force: true }); }
      catch (reason) {
        setDeleting(null);
        const message = reason?.message || t("The skill could not be deleted.");
        if (current) setToggleError(message); else toasts?.add?.(message, { variant: "danger" });
      }
      finally { setSkillBusy(false); }
    }} />;
  if (current) {
    return (
      <div className="cz-page" data-cz-page="skills" data-detail="">
        <SkillDetail skill={current} author={skillAuthor(current, plugins, copy)} file={file} toggling={toggling} toggleError={toggleError}
          onToggle={toggle} onBack={() => { setToggleError(""); setSelected(null); }} onRevealPath={onRevealPath} onUseSkill={onUseSkill} copy={copy}
          onDelete={managedSkillSlug(current, copy) ? (skill) => setDeleting(skill) : null} />
        {deleteDialog}
      </div>
    );
  }
  // customize-skills :3057-3075 / :1120-1200: the header's Add skill menu (Upload skill / Create a skill / Create with
  // Claude). Locally: Create a skill in your own skill folder, Add skill from URL where the core installs skills
  // (copy.skillInstall), and Open skills folder for a skill made by hand.
  const ownRoot = skillOwnRoot(copy.skillRoots);
  const openSkillsFolder = async () => {
    try { await call({ operation: "skill-root", cwd: cwd || undefined, root: ownRoot, action: "open" }); }
    catch (failure) { toasts?.add?.(failure?.message || String(failure), { variant: "danger" }); }
  };
  const addItems = [
    ...(ownRoot && call ? [{ label: t("Create a skill"), icon: "Edit", onClick: () => setCreating(true) }] : []),
    ...(copy.skillInstall ? [{ label: t("Add skill from URL"), icon: "Globe", disabled: adding, onClick: () => setAdding(true) }] : []),
    ...(ownRoot && call ? [{ label: t("Open skills folder"), icon: "FolderOpen", onClick: () => void openSkillsFolder() }] : []),
  ];
  const addMenu = addItems.length ? <MenuButton label={t("Add skill")} items={addItems}>{t("Add")}</MenuButton> : null;
  const createDialog = creating && ownRoot && call ? <CreateSkillDialog root={ownRoot} call={call} cwd={cwd} onClose={() => setCreating(false)}
    onCreated={() => void store.loadSkills?.({ cwd, force: true })} /> : null;
  // c5e558aae bn: the toolbar's Filter (K) and Sort (dn) controls, drawn once there is any skill; zt resets both,
  // Lt (the no-match state's button) the filter only. Classic layout: the filter menu has no reset item (O false).
  const resetBoth = { label: t("Reset filters and sort"), onClear: () => { setFilter(DEFAULT_SKILL_FILTER); setSort(DEFAULT_SORT); } };
  // c5e558aae :1320-1343: the toolbar (and its "Your skills" tab) is always drawn; bn (Filter and Sort) only once
  // there is a row (!Ht).
  const toolbar = <ListToolbar label={t("Skills")} tab={t("Your skills")} tabTestId="skills-tabbed-list-tab-mine" controls={status === "ready" && view.total > 0 ? <>
    <SkillFilterMenu filter={view.filter} onChange={setFilter} pluginOptions={view.pluginOptions} count={view.filterCount}
      createdBy={createdByOptions(view.showPartners).map((value) => ({ value, label: createdByLabel(value, copy) }))} />
    <SortMenu value={view.sort} options={view.sortOptions} onChange={setSort} held={view.held} clear={view.resettable ? resetBoth : null} />
  </> : null} />;
  const header = <PageHeader title={t("Skills")} searchLabel={t("Search skills")} searchValue={query} onSearch={setQuery} actions={addMenu || undefined} toolbar={toolbar} />;
  // ccea1f474 Ws row: a skill's ⋮ menu (Ze): Turn on / off where the core switches it, Show in Folder, then Remove,
  // which only a skill the core installed (Delete) can do.
  async function toggleRow(row, enabled) {
    setRowBusy(row.path);
    try { await store.setSkillEnabled(row.path, enabled); }
    catch { toasts?.add?.(t("Couldn’t update that skill. Try again."), { variant: "danger" }); }
    finally { setRowBusy(""); }
  }
  const rowMenu = (row) => {
    const items = [
      ...(copy.skillToggle && row.toggleable !== false ? [{ key: "toggle", label: row.enabled ? t("Turn off") : t("Turn on"), disabled: rowBusy === row.path, onClick: () => void toggleRow(row, !row.enabled) }] : []),
      ...(onRevealPath && !row.path.startsWith("command:") ? [{ key: "reveal", label: t("Show in Folder"), icon: "Folder", onClick: () => onRevealPath(row.path) }] : []),
    ];
    const removable = !!managedSkillSlug(row, copy);
    return [...items, ...(items.length ? [{ separator: true }] : []),
      { key: "remove", label: t("Remove"), icon: "Trash", variant: "danger", disabled: !removable, onClick: removable ? () => setDeleting({ ...row, fromList: true }) : undefined }];
  };
  const openRow = (row) => { setToggleError(""); setSelected(row.path); };
  const skillRow = (row) => {
    if (row.kind === "error") return <ListRow key={row.id} testId="skills-tabbed-list-row" icon="Warning" reserveMenuColumn data-row-id={row.id} data-skill-error="">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body-medium text-primary" title={row.path}>{row.name}</span>
        <RowCredit plain segments={[row.message]} />
      </div>
    </ListRow>;
    const off = copy.skillToggle && !row.enabled;
    const pluginName = row.pluginId ? skillAuthor(row, plugins, copy) : null;
    // ccea1f474 ec: a plugin's skill names its plugin (Ra chip → the plugin's page) and has no menu of its own.
    return <ListRow key={row.id} testId="skills-tabbed-list-row" icon="Scroll" drillLabel={t("View {name}", { name: row.name })} onDrill={() => openRow(row)}
      data-row-id={row.id} data-skill-scope={row.scope} data-skill-enabled={row.enabled ? "true" : "false"}
      trailing={<RowMeta updatedAt={row.updatedAt} />} menu={row.pluginId ? null : { itemLabel: row.name, items: rowMenu(row) }} reserveMenuColumn={!!row.pluginId}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-xs">
          <span className="truncate text-body-medium text-primary">{row.name}</span>
          {row.pluginId && <button type="button" className="cds-reset rounded-chip focus-visible:shadow-focus" aria-label={t("View {name}", { name: pluginName })} data-cz-plugin-chip=""
            onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate?.("customize-plugins", { pluginId: row.pluginId }); }}>
            <ListBadge variant="neutral" className="whitespace-nowrap">{pluginName}</ListBadge></button>}
          {/* ccea1f474 Ws: New unless the skill was turned off for a reason (none locally); ec (a plugin's skill) has none. */}
          {!row.pluginId && <NewBadge reason={recentReason(row)} onClick={() => openRow(row)} />}
          {/* customize-skills :3130-3131: the off badge needs the toggle capability. */}
          {off && <OffBadge />}
        </div>
        <RowCredit plain credit={skillCredit(row, plugins, copy)} segments={[row.description]} />
      </div>
    </ListRow>;
  };
  if (status === "error" || (retrying && status === "loading"))
    return <div className="cz-page" data-cz-page="skills">{header}<CatalogLoadError section="skills" busy={retrying} onRetry={retry} /></div>;
  // customize-connectors :3136-3147 (the shared page-shell pattern): G "loading"
  // draws the header and the panel skeleton only — no notice, bands or table.
  if (status === "loading")
    return <div className="cz-page" data-cz-page="skills">{header}<PageBody><CatalogSkeleton section="skills" /></PageBody></div>;
  return (
    <div className="cz-page" data-cz-page="skills">
      {header}
      {createDialog}
      {deleteDialog}
      {/* c5e558aae :1260-1330 xn: the sections of the "Your skills" list (ae "skills-tabbed-list-mine"), each a
          titled run with its count, or one untitled run while a sort is held; Gt → on (filters hide every row). */}
      <PageBody memory={scrollMemory.current} scrollKey={JSON.stringify([cwd, view.filter, view.sort, query])}>
      {adding && <AddSkillForm busy={skillBusy} onCancel={() => setAdding(false)} onSubmit={async ({ slug, url }) => {
        setSkillBusy(true);
        try { await call({ operation: "skill-install", slug, url }); setAdding(false); await store.loadSkills({ cwd, force: true }); }
        finally { setSkillBusy(false); }
      }} />}
          {view.matched > 0 && <ListContainer testId="skills-tabbed-list-mine">
            {view.sections.map(({ section, rows }) => <section key={section ?? "flat"} className="flex flex-col" data-cz-list-section={section ?? "flat"}>
              {section !== null && <SectionHeader section={section} label={sectionLabel(section, copy)} count={rows.length} />}
              {rows.map(skillRow)}
            </section>)}
          </ListContainer>}
          {filteredOut && <NoMatches onReset={() => setFilter(DEFAULT_SKILL_FILTER)} />}
          {/* A list that is never empty (Codex's bundled skills) still says where your own skills go: a muted footnote. */}
          {!empty && !query.trim() && copy.skillRoots.length > 0 && <SkillFoldersNote roots={copy.skillRoots} call={call} cwd={cwd} />}
          {/* ObjectBulb (customize-skills :1440-1462): the actions repeat the header's Add skill menu; the core's skill
              folders follow as the muted footnote, so a beginner also sees where a skill made by hand goes. */}
          {(empty || unmatched) && <EmptyState searchValue={unmatched ? query.trim() : ""} noMatchMessage={t("No skills match your search")}
            pictogram="ObjectBulb" emptyMessage={copy.skillsEmpty}
            actions={addMenu || copy.skillRoots.length > 0 ? <div className="flex flex-col items-center gap-3">
              {addMenu}
              {copy.skillRoots.length > 0 && <SkillFoldersNote roots={copy.skillRoots} call={call} cwd={cwd} />}
            </div> : null} />}
          {copy.agentsList && <AgentsSection store={store} cwd={cwd} query={query} onRevealPath={onRevealPath} copy={copy} />}
      </PageBody>
    </div>
  );
}

// The first of your own skill folders (a ~/ root), else the core's first: where Create a skill starts a SKILL.md.
export const skillOwnRoot = (roots = []) => roots.find((root) => root.startsWith("~/")) ?? roots[0] ?? null;

// Below a non-empty skill list and in the empty state: the core's skill folders (descriptor skillRoots) as a muted
// footnote, so a core that always lists bundled skills still tells a beginner where to put their own. call / cwd: each
// folder's Open (creating the folder when missing) through the customize skill-root operation; without them the
// folders are listed as text. Making a skill is the Add skill menu's Create a skill.
export function SkillFoldersNote({ roots, call = null, cwd = null, lead = true }) {
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  const run = async (key, payload) => {
    setBusy(key); setError("");
    try { await call({ operation: "skill-root", cwd: cwd || undefined, ...payload }); }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setBusy(""); }
  };
  return <section className="cz-skill-roots" aria-label={t("Skill folders")} data-cz-skill-roots="">
    {lead && <p className="cz-muted">{t("To add your own skill, put a folder with a SKILL.md file in one of these folders:")}</p>}
    <ul className="cz-roots">{roots.map((root) => <li key={root} className="cz-root-row"><code>{root}</code>
      {call && <Button size="sm" variant="ghost" busy={busy === root} disabled={!!busy || (/^<(project|workspace)>/.test(root) && !cwd)} onClick={() => void run(root, { root, action: "open" })}>{t("Open")}</Button>}
    </li>)}</ul>
    {error && <p className="cz-error" role="alert">{error}</p>}
  </section>;
}

// Create a skill (the Add skill menu's item, oSuR6WVQY6): a small dialog naming the skill's folder; a SKILL.md is started
// in `root` and opened (customize skill-root new-skill). Layered over the Settings dialog like the page's confirms.
export function CreateSkillForm({ root, call, cwd = null, onClose, onCreated = null }) {
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true); setError("");
    try { await call({ operation: "skill-root", cwd: cwd || undefined, root, action: "new-skill", name: name.trim() }); onCreated?.(); onClose(); }
    catch (failure) { setError(failure?.message || String(failure)); setBusy(false); }
  };
  return <form className="cz-dialog-form" aria-label={t("Create a skill")} onSubmit={submit} data-cz-create-skill="">
    <label className="cz-dialog-field">
      <input data-autofocus data-cds="TextInput" className="cds-input cds-reset" aria-label={t("Skill name")} placeholder={t("Skill name")} value={name}
        spellCheck={false} autoCapitalize="off" autoComplete="off" disabled={busy}
        onChange={(event) => { setName(event.target.value.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "")); setError(""); }} />
      <small className="cz-dialog-hint">{t("Creates {path}/<name>/SKILL.md and opens it.", { path: root })}</small>
    </label>
    {error && <p className="cz-error" role="alert">{error}</p>}
    <SourceDialogFooter>
      <Button variant="secondary" disabled={busy} onClick={onClose}>{t("Cancel")}</Button>
      <Button type="submit" variant="primary" busy={busy} disabled={busy || !name.trim()}>{t("Create skill")}</Button>
    </SourceDialogFooter>
  </form>;
}
function CreateSkillDialog(props) {
  return <SourceDialog title={t("Create a skill")} size="sm" layer={SETTINGS_CONFIRM_LAYER} className="cz-dialog" onClose={props.onClose}>
    <CreateSkillForm {...props} />
  </SourceDialog>;
}

// A core's own sub-agents (Qwen: built-in ones and the .qwen/agents files; codeDesktop/agents/list): read-only rows with
// where each comes from. Its own /agents create and manage are TUI-only, so a file is opened in Finder to edit.
export function AgentsSection({ store, cwd, query = "", onRevealPath, copy }) {
  const snapshot = useStore(store);
  useEffect(() => { store.loadAgents?.({ cwd }); }, [store, cwd]);
  const [creating, setCreating] = useState(false), [deleting, setDeleting] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const agents = snapshot.agents?.cwd === cwd ? snapshot.agents.rows : [];
  const term = query.trim().toLowerCase();
  const shown = term ? agents.filter((agent) => `${agent.name} ${agent.displayName ?? ""} ${agent.description}`.toLowerCase().includes(term)) : agents;
  const writable = copy.agentsWrite === true && typeof store.writeAgent === "function";
  if (!shown.length && !(writable && !term)) return null;
  const scopeLabel = (scope) => scope === "builtin" ? t("Built in") : scope === "project" ? t("This project") : t("Your agents");
  const remove = async () => {
    setBusy(true); setError("");
    try { await store.removeAgent(cwd, deleting.name); setDeleting(null); } catch (failure) { setError(cleanErrorReason(failure?.message || "") || t("Couldn’t delete the agent.")); } finally { setBusy(false); }
  };
  return <section className="cz-builtin cz-agents" aria-label={t("Agents")} data-cz-agents="">
    <div className="cz-builtin-head"><h3>{t("Agents")}</h3>{writable && <Button variant="secondary" size="sm" onClick={() => { setError(""); setCreating(true); }}>{t("Create agent")}</Button>}</div>
    {creating && <AgentCreateDialog cwd={cwd} copy={copy} onClose={() => setCreating(false)} onCreate={(agent) => store.writeAgent(cwd, agent)} />}
    <SourceConfirmationDialog open={!!deleting} title={t("Delete {name}?", { name: deleting?.name ?? "" })} confirmLabel={t("Delete")} confirmVariant="danger" pending={busy}
      body={t("The agent’s file is removed. {core} stops offering it.", { core: copy.name })} onCancel={() => { setDeleting(null); setError(""); }} onConfirm={() => void remove()}>
      {error && <p className="cz-error" role="alert">{error}</p>}
    </SourceConfirmationDialog>
    <p className="cz-muted">{t("Sub-agents {core} can hand work to. Ask for one by name in a message.", { core: copy.name })}</p>
    <ul className="cz-builtin-list" role="list">
      {shown.map((agent) => <li key={`${agent.scope}:${agent.name}`} className="cz-builtin-row" data-agent={agent.name}>
        <div className="cz-builtin-text">
          {/* A display name of the agent's own (MiniMax), else its name; the tools it may use when it lists them. */}
          <span className="cz-builtin-name"><span className="cz-truncate" title={agent.displayName ? agent.name : undefined}>{agent.displayName || agent.name}</span>{agent.model && <span className="cz-builtin-version">{agent.model}</span>}</span>
          {agent.description && <span className="cz-builtin-description">{agent.description}</span>}
          {Array.isArray(agent.tools) && agent.tools.length > 0 && <span className="cz-builtin-description" data-agent-tools="">{t("Tools: {tools}", { tools: agent.tools.filter((tool) => typeof tool === "string").slice(0, 12).join(", ") + (agent.tools.length > 12 ? "…" : "") })}</span>}
          <span className="cz-builtin-source" title={agent.path || undefined}>{scopeLabel(agent.scope)}</span>
        </div>
        {(agent.path && onRevealPath || writable && agent.removable) && <div className="cz-builtin-action">
          {agent.path && onRevealPath && <Button variant="ghost" size="sm" onClick={() => onRevealPath(agent.path)}>{t("Show in Finder")}</Button>}
          {writable && agent.removable && <Button variant="ghost" size="sm" aria-label={t("Delete {name}", { name: agent.name })} onClick={() => { setError(""); setDeleting(agent); }}>{t("Delete")}</Button>}
        </div>}
      </li>)}
    </ul>
  </section>;
}

// Create agent (OpenCode / MiMo: `opencode agent create`'s file): a name, when to use it, what it may do, its
// instructions, and where it lives. Every permission starts allowed; unticking one denies it in the file.
const AGENT_PERMISSION_LABELS = [["bash", "Run commands"], ["read", "Read files"], ["edit", "Edit files"], ["glob", "Find files"], ["grep", "Search file contents"],
  ["webfetch", "Fetch web pages"], ["websearch", "Search the web"], ["task", "Start sub-agents"], ["todowrite", "Keep a to-do list"], ["lsp", "Code intelligence"], ["skill", "Use skills"]];
function AgentCreateDialog({ cwd, copy, onCreate, onClose }) {
  const [name, setName] = useState(""), [description, setDescription] = useState(""), [mode, setMode] = useState("subagent"), [scope, setScope] = useState(cwd ? "project" : "user");
  const [model, setModel] = useState(""), [prompt, setPrompt] = useState(""), [denied, setDenied] = useState(() => new Set()), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const nameOk = /^[a-z0-9][a-z0-9-]{0,63}$/.test(name);
  const ready = nameOk && description.trim() && prompt.trim() && !busy;
  const submit = async (event) => {
    event?.preventDefault?.();
    if (!ready) return;
    setBusy(true); setError("");
    try { await onCreate({ name, description, mode, scope, ...(model.trim() ? { model: model.trim() } : {}), prompt, deny: [...denied] }); onClose(); }
    catch (failure) { setError(localizeBridgeText(cleanErrorReason(failure?.message || "")) || t("Couldn’t create the agent.")); setBusy(false); }
  };
  const toggle = (key) => setDenied((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  return <SourceDialog open title={t("Create agent")} onClose={() => { if (!busy) onClose(); }} size="md"
    footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" busy={busy} disabled={!ready} onClick={() => void submit()}>{t("Create")}</Button></>}>
    <form className="cz-agent-form" onSubmit={(event) => void submit(event)}>
      <label>{t("Name")}<input value={name} placeholder="reviewer" spellCheck={false} aria-invalid={!!name && !nameOk} onChange={(event) => setName(event.target.value.toLowerCase())} /></label>
      {name && !nameOk && <p className="cz-muted">{t("Use lowercase letters, digits and dashes for the agent name.")}</p>}
      <label>{t("When to use it")}<input value={description} placeholder={t("Reviews code changes for bugs")} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="cz-agent-field"><span>{t("Kind")}</span><SourceSelect label={t("Kind")} value={mode} onChange={setMode}
        items={[{ value: "subagent", label: t("Sub-agent"), description: t("{core} hands work to it", { core: copy.name }) }, { value: "primary", label: t("Main agent"), description: t("You can start sessions with it") }, { value: "all", label: t("Both") }]} /></div>
      <div className="cz-agent-field"><span>{t("Save in")}</span><SourceSelect label={t("Save in")} value={scope} onChange={setScope}
        items={[...(cwd ? [{ value: "project", label: t("This project") }] : []), { value: "user", label: t("All projects") }]} /></div>
      <label>{t("Model (optional)")}<input value={model} placeholder={t("Same as the session")} spellCheck={false} onChange={(event) => setModel(event.target.value)} /></label>
      <fieldset className="cz-agent-permissions"><legend>{t("What it may do")}</legend>
        {AGENT_PERMISSION_LABELS.map(([key, label]) => <label key={key}><input type="checkbox" checked={!denied.has(key)} onChange={() => toggle(key)} />{t(label)}</label>)}
      </fieldset>
      <label>{t("Instructions")}<textarea value={prompt} rows={6} placeholder={t("You review code changes. Point out bugs and risky changes, most important first.")} onChange={(event) => setPrompt(event.target.value)} /></label>
      {error && <p className="cz-error" role="alert">{error}</p>}
    </form>
  </SourceDialog>;
}

// ---------------------------------------------------------------------------
// Connectors (MCP servers)

// customize-connectors :3610-3640 header row: sn Connector (flexible), Pa
// Type = sn className "w-40" (:2885-2888, 160px), sn Status "w-40". Every
// server here is run by the local core (stdio or url profile entries), so the
// io Type cell (:3767-3772) reads "Desktop"; the tool count lives in the drill.
const MCP_COLUMNS = [
  { key: "name", header: t("Connector") },
  { key: "type", header: t("Type"), width: "40" },
  { key: "status", header: t("Status"), width: "40" },
];

// customize-connectors ca (:2027-2048) for la's reconnect/blocked branches
// (:2150-2243, row la size "sm" :3800-3808): div "flex min-w-0 items-center
// gap-xs text-warning" = Warning sm (shrink-0, aria-hidden), the action inside
// a CDS tooltip Y whose content is the explanation, and span.sr-only with the
// same explanation — never visible text beside the button.
function WarningStatus({ kind, status, children }) {
  const label = MCP_STATUS_LABELS[kind];
  return <span className="cz-status" data-status={status}><Icon name="Warning" size={16} className="cz-status-icon" aria-hidden="true" />
    <SourceTooltip content={label}><span className="cz-status-action">{children}</span></SourceTooltip><span className="cz-sr-only">{label}</span></span>;
}

// la (:2049-2275): unavailable → sa (:2010-2025) "—" plus sr-only "Not
// available"; the default not-connected branch is a secondary sm Mn "Connect"
// (locally config/mcpServer/reload, which starts never-started servers).
function StatusCell({ row, busy, onReconnect, onSignIn }) {
  switch (row.kind) {
    case "connected":
      return <span className="cz-status" data-status="connected"><Icon name="Check" size={16} aria-hidden="true" /><span className="cz-sr-only">{t("Connected")}</span></span>;
    case "connecting":
      return <span role="status" className="cz-status" data-status="connecting"><span className="sc-spinner" aria-hidden="true" /><span className="cz-sr-only">{t("Connecting")}</span></span>;
    case "unreachable":
      return <WarningStatus kind="unreachable" status="unreachable">
        <Button variant="secondary" size="sm" disabled={busy} onClick={(event) => { event.stopPropagation(); onReconnect(row); }}>{t("Reconnect")}</Button></WarningStatus>;
    case "signIn":
      return <WarningStatus kind="signIn" status="sign-in">
        <Button variant="secondary" size="sm" disabled={busy} onClick={(event) => { event.stopPropagation(); onSignIn(row); }}>{t("Sign in")}</Button></WarningStatus>;
    case "disabled":
      return <span className="cz-status" data-status="disabled"><Dash /><span className="cz-sr-only">{t("Not available")}</span></span>;
    default:
      return <span className="cz-status" data-status="not-started">
        <Button variant="secondary" size="sm" disabled={busy} onClick={(event) => { event.stopPropagation(); onReconnect(row); }}>{t("Connect")}</Button></span>;
  }
}

// customize-connectors va = 5 (:2302): ba shows the first va rows until
// "Show all" is pressed.
export const BROKEN_CARD_LIMIT = 5;

// "Connectors that stopped working" card, customize-connectors ba (:2300-2530)
// with rows Ca (:2644-2750). Heading row "-mx-pad-lg flex items-center
// justify-between gap-md border-b border-alpha-1 px-lg pb-lg"; h3 "flex
// min-w-0 items-start gap-xs text-body-medium text-primary" led by a Warning sm
// in "flex h-[1lh] shrink-0 items-center text-warning". Reconnect all (Sa) is
// the only bulk action and only exists while a sign-in is missing.
function BrokenConnectorsCard({ broken, expired, busy, onReconnectAll, onReconnect, onSignIn }) {
  // ba :2446-2450: [te,H] expanded, W = useId() list id, G = v.length > va;
  // `te && !G && H(!1)` collapses again once the count drops to va or fewer.
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const overflow = broken.length > BROKEN_CARD_LIMIT;
  if (expanded && !overflow) setExpanded(false);
  const rows = overflow && !expanded ? broken.slice(0, BROKEN_CARD_LIMIT) : broken;
  return (
    <section className="cz-broken" aria-label={t("Connectors that stopped working")}>
      <div className="cz-broken-head">
        <h3><span aria-hidden="true" className="cz-broken-icon"><Icon name="Warning" size={16} /></span>
          {broken.length === 1 ? t("{name} stopped working", { name: broken[0].title }) : t("{count} connectors stopped working", { count: broken.length })}</h3>
        {expired.length > 0 && (
          <Button variant="secondary" disabled={busy} onClick={onReconnectAll}
            aria-label={tn(expired.length, "Reconnect all {count} connector whose sign-in expired", "Reconnect all {count} connectors whose sign-in expired")}>{t("Reconnect all")}</Button>
        )}
      </div>
      {/* ul "mt-xs grid gap-x-sm": without the snooze Ce menu (7-day hide is a
          claude.ai account preference with no Codex store) each row has three
          cells, the v2 "grid-cols-[auto_minmax(0,1fr)_auto]" track list. */}
      <ul id={listId} className="cz-broken-list" role="list">
        {rows.map((row) => (
          <li key={row.id} data-broken-name={row.name}>
            {/* Ca :2658-2662 leading slot: the connector tile _r size 24 /
                imageSize 16 (shared-13 lA → Jk bordered tile), shared with the rows. */}
            <ConnectorTile size={24} />
            <div className="cz-broken-text">
              <span className="cz-broken-name">{row.title}</span>
              {/* Si :1674-1692 unreachable "Server not responding". signIn keeps
                  "Sign-in required" (q87c5Fstfm): Codex McpAuthStatus notLoggedIn does
                  not say a previous sign-in expired, so Si's "Sign-in expired" (and Ca's
                  "Reconnect" label below) would claim something Codex never reports. */}
              <span className="cz-broken-reason">{MCP_STATUS_LABELS[row.kind]}</span>
            </div>
            {/* Ca :2733-2748 trailing: secondary Mn, "Retry" for unreachable
                (same local reload as the table's Reconnect). */}
            <div className="cz-broken-action">
              {row.kind === "signIn"
                ? <Button variant="secondary" size="sm" disabled={busy} onClick={() => onSignIn(row)}>{t("Sign in")}</Button>
                : <Button variant="secondary" size="sm" disabled={busy} onClick={() => onReconnect(row)}>{t("Retry")}</Button>}
            </div>
          </li>
        ))}
      </ul>
      {/* ba :2516-2530: ghost Button, size _ (Ze → sm in the classic dialog),
          flush "start", self-start, CaretUp/CaretDown, aria-expanded +
          aria-controls = the list id. */}
      {overflow && (
        <Button variant="ghost" size={DIALOG_BUTTON_SIZE} flush className="cz-broken-more" icon={expanded ? "CaretUp" : "CaretDown"} iconSize="auto"
          aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((value) => !value)}>{expanded ? t("Show less") : t("Show all")}</Button>
      )}
    </section>
  );
}

// Official custom connector dialog (ion-dist ce99eb202): a Dialog Popup size md (!max-w-[33.5rem]) with the Header
// "Add custom connector", stacked full-width TextInputs whose placeholder is the label, each with its hint ("Name" →
// "Shown in the connectors list.", "MCP server URL" → the address hint), the OAuth client fields under "Advanced
// settings", and footer Cancel / Add. A local core also runs a server from a command (config mcp_servers.<name>
// command/args), so a segmented control picks URL or Command; env lines (command) or headers (URL) sit under Advanced
// settings and the file the server is saved to is the muted footnote. The form is exported for window-free tests.
export function AddConnectorForm({ onSubmit, onCancel, busy, existingNames, copy }) {
  const [transport, setTransport] = useState("url");
  const [name, setName] = useState(""), [command, setCommand] = useState(""), [args, setArgs] = useState(""), [url, setUrl] = useState(""), [error, setError] = useState("");
  // Advanced: a stdio server's environment and an HTTP server's headers (tokens most real servers need).
  const [env, setEnv] = useState(""), [headers, setHeaders] = useState("");
  // A remote server's pre-registered OAuth client (copy.mcpOAuthClient), for servers without dynamic registration.
  const [clientId, setClientId] = useState(""), [clientSecret, setClientSecret] = useState(""), [scope, setScope] = useState("");
  const local = transport === "command";
  const edit = (setter) => (event) => { setter(event.target.value); setError(""); };
  const ready = !!name.trim() && !!(local ? command.trim() : url.trim());
  return (
    <form className="cz-dialog-form" aria-label={t("Add custom connector")} onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      const problem = validateServerName(name.trim());
      if (problem) { setError(problem); return; }
      // The core's config may be shared with its CLI: an upsert on an existing
      // mcp_servers.<name> would silently replace that server's command/url.
      if (existingNames.includes(name.trim())) { setError(copy.duplicateConnector(name.trim())); return; }
      let value;
      try { value = mcpServerConfigValue(local
        ? { command, args: splitArguments(args), env: connectorPairs(env, "env") }
        : { url, headers: connectorPairs(headers, "headers"), oauth: copy.mcpOAuthClient ? { clientId, clientSecret, scope } : null }); }
      catch (reason) { setError(reason.message); return; }
      setError("");
      try { await onSubmit({ name: name.trim(), ...value }); }
      catch (reason) { setError(reason.message || t("The connector could not be added.")); }
    }}>
      <SourceSegments label={t("Connector type")} value={transport} disabled={busy} className="cz-dialog-segments"
        options={[{ value: "url", label: t("URL") }, { value: "command", label: t("Command") }]} onChange={(value) => { setTransport(value); setError(""); }} />
      <label className="cz-dialog-field">
        <input data-autofocus data-cds="TextInput" className="cds-input cds-reset" aria-label={t("Connector name")} placeholder={t("Name")} value={name} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setName)} />
        <small className="cz-dialog-hint">{t("Shown in the connectors list.")}</small>
      </label>
      {local ? <>
        <label className="cz-dialog-field">
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t("Command")} placeholder={t("Command")} value={command} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setCommand)} />
          <small className="cz-dialog-hint">{t("The program that starts the server, for example npx.")}</small>
        </label>
        <label className="cz-dialog-field">
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t("Arguments")} placeholder={t("Arguments")} value={args} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setArgs)} />
          <small className="cz-dialog-hint">{t("Separated by spaces, for example -y my-mcp-server. Quote an argument that contains spaces.")}</small>
        </label>
      </> : <label className="cz-dialog-field">
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label="URL" placeholder={t("MCP server URL")} value={url} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setUrl)} />
        <small className="cz-dialog-hint">{t("The HTTPS address where the server accepts MCP requests, for example https://mcp.example.com/mcp.")}</small>
      </label>}
      <SourceDisclosure label={t("Advanced settings")} className="cz-dialog-advanced">
        <div className="cz-dialog-advanced-body">
          {local
            ? <label className="cz-dialog-field">
                <textarea data-cds="TextArea" className="cz-dialog-textarea" aria-label={t("Environment variables")} placeholder={t("Environment variables")} rows={2} value={env} disabled={busy} spellCheck={false} onChange={edit(setEnv)} />
                <small className="cz-dialog-hint">{t("For a command: one NAME=value per line.")}</small>
              </label>
            : <>
              <label className="cz-dialog-field">
                <textarea data-cds="TextArea" className="cz-dialog-textarea" aria-label={t("HTTP headers")} placeholder={t("Headers")} rows={2} value={headers} disabled={busy} spellCheck={false} onChange={edit(setHeaders)} />
                <small className="cz-dialog-hint">{t("For a URL: one Name: value per line.")}</small>
              </label>
              {copy.mcpOAuthClient && <>
                <label className="cz-dialog-field">
                  <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t("OAuth client ID")} placeholder={t("OAuth client ID (optional)")} value={clientId} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setClientId)} />
                  <small className="cz-dialog-hint">{t("For a URL whose sign-in needs an app registered with the server (it doesn’t register apps automatically).")}</small>
                </label>
                <label className="cz-dialog-field">
                  <input type="password" data-cds="TextInput" className="cds-input cds-reset" aria-label={t("OAuth client secret")} placeholder={t("OAuth client secret (optional)")} value={clientSecret} disabled={busy} autoComplete="off" onChange={edit(setClientSecret)} />
                  <small className="cz-dialog-hint">{t("Optional. Saved in {core}’s configuration on this Mac.", { core: copy.name })}</small>
                </label>
                <label className="cz-dialog-field">
                  <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t("OAuth scopes")} placeholder={t("OAuth scopes")} value={scope} disabled={busy} autoComplete="off" spellCheck={false} onChange={edit(setScope)} />
                  <small className="cz-dialog-hint">{t("Optional, separated by spaces.")}</small>
                </label>
              </>}
            </>}
        </div>
      </SourceDisclosure>
      {error && <p className="cz-error" role="alert">{error}</p>}
      <p className="cz-dialog-note">{copy.addConnectorNote}</p>
      <SourceDialogFooter>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{t("Cancel")}</Button>
        <Button type="submit" variant="primary" busy={busy} disabled={busy || !ready}>{t("Add")}</Button>
      </SourceDialogFooter>
    </form>
  );
}
function AddConnectorDialog({ onCancel, busy, ...props }) {
  return <SourceDialog title={t("Add custom connector")} size="md" layer={SETTINGS_CONFIRM_LAYER} className="cz-dialog cz-connector-dialog" onClose={busy ? undefined : onCancel}>
    <AddConnectorForm onCancel={onCancel} busy={busy} {...props} />
  </SourceDialog>;
}

// Local server config, c2e7fd468 export t (_) in En's `mt-4` slot (c08e79e85):
// space-y-4 default-open Collapsible sections titled "font-small-bold
// text-secondary" with a pt-1 panel over the h code block — Command (a URL row
// for a url server), Arguments when there are any, and Environment variables
// as names masked with the source's "=••••••••". The definition comes from
// desktop-settings-read mcpDefinitions (settings-pages.cjs), which carries env
// names only, never values. No matching definition draws nothing.
const LOCAL_CONFIG_CODE = "block overflow-hidden whitespace-pre-wrap [overflow-wrap:anywhere] rounded bg-surface-1 px-2 py-1 font-mono text-sm text-primary";
const LOCAL_CONFIG_MASK = "=\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
function LocalConfigSection({ title, children }) {
  return <SourceDisclosure defaultOpen label={<span className="font-small-bold text-secondary flex items-center gap-sm">{title}</span>}>
    <div className="pt-1">{children}</div>
  </SourceDisclosure>;
}
function LocalConfig({ definition }) {
  const command = typeof definition?.command === "string" && definition.command ? definition.command : null;
  const url = !command && typeof definition?.url === "string" && definition.url ? definition.url : null;
  if (!command && !url) return null;
  const args = Array.isArray(definition.args) ? definition.args.filter((arg) => typeof arg === "string") : [];
  const names = Array.isArray(definition.environmentNames) ? definition.environmentNames.filter((name) => typeof name === "string" && name) : [];
  return <div className="mt-4" data-cz-local-config=""><div className="space-y-4">
    {command ? <LocalConfigSection title={t("Command")}><code className={LOCAL_CONFIG_CODE}>{command}</code></LocalConfigSection>
      : <LocalConfigSection title="URL"><code className={LOCAL_CONFIG_CODE}>{url}</code></LocalConfigSection>}
    {args.length > 0 && <LocalConfigSection title={t("Arguments")}><code className={LOCAL_CONFIG_CODE}>{joinArguments(args)}</code></LocalConfigSection>}
    {names.length > 0 && <LocalConfigSection title={t("Environment variables")}><code className={`${LOCAL_CONFIG_CODE} space-y-1`}>
      {names.map((name) => <span key={name} className="block"><span className="text-secondary">{name}</span>{LOCAL_CONFIG_MASK}</span>)}
    </code></LocalConfigSection>}
  </div></div>;
}

// Connector action feedback = the source's toasts (N() addError/addSuccess):
// reconnect / sign-in failures read "Connection to server failed. You can try
// again." (customize-connectors :2565-2590); the connected drill's Reconnect
// reloads the tools ("Tools list refreshed" / "Couldn’t refresh tools list.
// You can try again.", c08e79e85 Sn); a failed removal is c5fb58ef0's "Failed
// to remove server". Raw reasons go to the console only. Exported for tests.
export function connectorActions({ call, store, toasts, threadId = null, onOpenExternal, onEditConfig, copy = customizeCore() }) {
  const reload = async () => { await call({ operation: "mcp-reload" }); await store.loadMcp({ force: true }); };
  const run = async (label, fn, failure, success) => {
    try { await fn(); }
    catch (reason) {
      console.warn(`[customize] ${label} failed: ${reason?.message || reason}`);
      const message = typeof failure === "function" ? failure(reason) : failure;
      if (message) toasts?.add(message, { variant: "danger" });
      return false;
    }
    if (success) toasts?.add(success, { variant: "neutral" });
    return true;
  };
  return {
    reconnectAll: () => run("reconnect all", reload, CONNECTOR_TOASTS.connectFailed),
    reconnect: (row) => run(`reconnect ${row.name}`, reload, CONNECTOR_TOASTS.connectFailed),
    refresh: (row) => run(`refresh ${row.name}`, reload, CONNECTOR_TOASTS.refreshFailed, CONNECTOR_TOASTS.refreshed),
    signIn: (row) => run(`sign in to ${row.name}`, async () => {
      const result = await call({ operation: "mcp-login", name: row.name, threadId: threadId ?? null });
      await onOpenExternal(result.authorizationUrl);
    }, CONNECTOR_TOASTS.connectFailed),
    signOut: (row) => run(`sign out of ${row.name}`, async () => {
      await call({ operation: "mcp-logout", name: row.name });
      await store.loadMcp({ force: true });
    }, t("Couldn’t sign out of {name}.", { name: row.title ?? row.name }), t("Signed out of {name}.", { name: row.title ?? row.name })),
    remove: (row) => run(`remove ${row.name}`, async () => {
      await call({ operation: "mcp-remove", name: row.name });
      await store.loadMcp({ force: true });
    }, CONNECTOR_TOASTS.removeFailed, copy.connectorRemoved(row.name)),
    // Edit config opens the core's own file; its failure is app copy (main.cjs editConfigTarget).
    editConfig: () => run("edit config", () => onEditConfig(), (reason) => reason?.message || null),
  };
}

// Removal confirm over the Settings dialog (.ss-backdrop z 500, --cds-layer-base 500).
const SETTINGS_CONFIRM_LAYER = Object.freeze({ base: 520, z: 560 });

// Connector drill body, c08e79e85 En by connectorDetailState (customize-model).
// Connected: "px-6 pb-6" with the N header row (min-h-14 py-3, the drill's
// "-me-6 pe-md", 2.42304.0 c08e79e85-CQPpfqXC _n's `we`), the 24/16 tile and h2 font-large-bold name, a secondary
// Reconnect plus the Sn ⋮ menu, then the description, the LocalConfig block
// and the tool names (or "This connector has no tools available.").
// Connecting: the 56/40 tile over a role=status spinner and "Checking
// connection…". Otherwise the centred column with the 56/40 tile, the warning
// "Connection issue" title for a failure, the font-large muted message and one
// primary Reconnect / Sign in / Connect.
// A native core's connector settings (copy.connectorSettings): the connector's on/off switch, its default approval and
// one row per tool with its approval choice and switch (Codex mcp_servers.<name>, written to the core's config.toml).
function ConnectorToolSettings({ row, settings, busy, onSetting }) {
  const tools = connectorToolRows(row, settings);
  const editable = settings?.editable === true && !busy;
  const toolItems = connectorApprovalItems({ tool: true, inherited: settings?.defaultMode ?? null });
  return <>
    <div className="cz-connector-setting" data-connector-setting="default-approval">
      <div className="cz-connector-setting-text">
        <span className="text-sm text-primary">{t("Approval")}</span>
        <span className="text-xs text-muted">{t("When {core} asks before using this connector’s tools. A tool can have its own setting.", { core: getAssistantName() })}</span>
      </div>
      <SourceSelect label={t("Approval for {name}", { name: row.title })} value={settings?.defaultMode ?? ""} disabled={!editable} align="end"
        items={connectorApprovalItems()} onChange={(mode) => onSetting("mcp-tool", { mode: mode || null })} />
    </div>
    {tools.length > 0
      ? <div className="relative mt-4 isolate"><ul className="cz-tool-list" aria-label={t("{name} tools", { name: row.title })}>
          {tools.map((tool) => <li key={tool.name} className="cz-tool-row flex gap-2.5 items-center py-2 border-b last:border-b-0" data-tool={tool.name} data-tool-enabled={tool.enabled || undefined}>
            <span className={`text-sm font-normal min-w-0 flex-1 [overflow-wrap:anywhere] ${tool.enabled ? "text-primary" : "text-muted"}`}>{tool.name}</span>
            <SourceSelect className="cz-tool-approval" label={t("Approval for {tool}", { tool: tool.name })} value={tool.mode} disabled={!editable || !tool.enabled} align="end"
              items={toolItems} onChange={(mode) => onSetting("mcp-tool", { tool: tool.name, mode: mode || null })} />
            <Switch label={t("Use {tool}", { tool: tool.name })} checked={tool.enabled} disabled={!editable}
              onChange={(enabled) => onSetting("mcp-tool", { tool: tool.name, enabled })} />
          </li>)}
        </ul></div>
      : <p className="font-base text-muted mt-4">{t("This connector has no tools available.")}</p>}
    {settings && !settings.editable && <p className="text-xs text-muted mt-3" data-connector-readonly="">{t("This connector is defined outside your own config file, so its settings can’t be changed here.")}</p>}
  </>;
}

function ConnectorDetail({ row, busy, menuItems, onAction, definition, settings = null, onSetting = null, onSampling = null, startupError = null, onDeveloper = null, onEditConfig = null }) {
  const state = connectorDetailState(row);
  const more = <MoreMenu label={t("More options for {name}", { name: row.title })} items={menuItems} hideWhenEmpty />;
  // A project connector of an untrusted folder (Kimi loads them only once the folder is trusted): never run until then.
  if (state.view === "trust") return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="trust">
      <ConnectorTile size={56} />
      <div className="text-center flex flex-col gap-2 px-6 max-w-xl">
        <p className="font-large-bold text-primary [overflow-wrap:anywhere]">{t("{name} comes from this folder", { name: row.title })}</p>
        <p className="font-base text-muted">{t("{core} starts a folder’s own connectors only after you trust the folder. Trust it only if you trust everything this folder would run.", { core: getAssistantName() })}</p>
        {row.trust?.launch && <code className="cz-trust-launch text-xs [overflow-wrap:anywhere]" data-trust-launch="">{row.trust.launch}</code>}
      </div>
      <div className="flex flex-wrap items-start justify-center gap-2">
        <Button variant="primary" disabled={busy || state.disabled} onClick={() => onAction("trust", row)}>{state.label}</Button>
      </div>
    </div>
  );
  // A connector the core won't load (row.blocked: Gemini's organization / settings / folder-trust rules).
  if (row.blocked) return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="blocked" data-blocked={row.blocked.kind}>
      {menuItems.length > 0 && <div className="absolute top-3 right-6">{more}</div>}
      <ConnectorTile size={56} />
      <div className="text-center flex flex-col gap-2 px-6 max-w-xl">
        <p className="font-large-bold text-primary [overflow-wrap:anywhere]">{t("{name} is blocked", { name: row.title })}</p>
        <p className="font-base text-muted">{row.blocked.reason ? t(row.blocked.reason) : t("{core} won’t load this connector.", { core: getAssistantName() })}</p>
      </div>
    </div>
  );
  // A server that refuses dynamic client registration: Sign in can't work until the connector names its OAuth client.
  if (row.oauthClient) return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="oauth-client">
      {menuItems.length > 0 && <div className="absolute top-3 right-6">{more}</div>}
      <ConnectorTile size={56} />
      <div className="text-center flex flex-col gap-2 px-6 max-w-xl">
        <p className="font-large-bold text-primary [overflow-wrap:anywhere]">{t("{name} needs an OAuth client ID", { name: row.title })}</p>
        <p className="font-base text-muted">{t("This server doesn’t register apps automatically, so signing in needs the client ID from its developer settings. Remove the connector, then add it again with the client ID under Advanced.")}</p>
      </div>
    </div>
  );
  // Turned off in the core's config (mcp_servers.<name>.enabled = false): its tools are unavailable until turned on.
  if (settings && settings.enabled === false) return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="off">
      {menuItems.length > 0 && <div className="absolute top-3 right-6">{more}</div>}
      <ConnectorTile size={56} />
      <div className="text-center flex flex-col gap-2 px-6">
        <p className="font-large-bold text-primary [overflow-wrap:anywhere]">{t("{name} is turned off", { name: row.title })}</p>
        <p className="font-base text-muted">{t("{core} can’t use its tools while it’s off.", { core: getAssistantName() })}</p>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-2">
        <Button variant="primary" disabled={busy || !settings.editable} onClick={() => onSetting?.("mcp-enable", { enabled: true })}>{t("Turn on")}</Button>
      </div>
    </div>
  );
  if (state.view === "checking") return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="checking">
      <ConnectorTile size={56} />
      <div role="status" className="cz-checking text-center flex flex-col items-center gap-3">
        <span className="sc-spinner" aria-hidden="true" />
        <p className="font-base text-muted">{t("Checking connection…")}</p>
      </div>
    </div>
  );
  if (state.view === "disconnected") return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4" data-connector-view="disconnected">
      {menuItems.length > 0 && <div className="absolute top-3 right-6">{more}</div>}
      <ConnectorTile size={56} />
      <div className="text-center flex flex-col gap-2 px-6">
        {state.issue && <div className="flex items-center justify-center gap-1.5 text-warning" data-connection-issue="">
          <Icon name="Warning" size={16} /><span className="font-large-bold">{t("Connection issue")}</span></div>}
        <p className="font-large text-muted [overflow-wrap:anywhere]">{connectorDetailMessage(state, row.title)}</p>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-2">
        <Button variant="primary" disabled={busy || state.disabled} onClick={() => onAction(state.action, row)}>{state.label}</Button>
        {/* A failing connector: Reconnect alone fails again, so the saved config can be opened from here too. */}
        {state.issue && onEditConfig && <Button variant="secondary" disabled={busy} onClick={onEditConfig}>{t("Edit config")}</Button>}
      </div>
      {/* What failed and what was saved: the core's startup error (the same text Settings › Developer shows, translated
          when it is a known one) and the command / URL, arguments and environment names, so a typo is visible here. */}
      {(state.issue && startupError) || definition ? <div className="cz-connector-failure w-full max-w-xl px-6 text-left" data-connector-failure="">
        {state.issue && startupError && <div className="cz-connector-error" data-connector-error="">
          <span className="font-small-bold text-secondary">{t("Error")}</span>
          <code className="cz-connector-error-text">{t(startupError)}</code>
          {onDeveloper && <p className="cz-connector-error-more">{t("Settings › Developer lists every connector’s status and error.")}{" "}
            <button type="button" className="cz-text-button" onClick={onDeveloper}>{t("Open Developer settings")}</button></p>}
        </div>}
        <LocalConfig definition={definition} />
      </div> : null}
    </div>
  );
  return (
    <div className="px-6 pb-6" data-connector-view="connected">
      <div className="flex items-center justify-between min-h-14 py-3 -me-6 pe-md">
        <div className="flex items-center gap-3 min-w-0">
          <ConnectorTile size={24} />
          <div className="flex items-center gap-2 min-w-0"><h2 className="font-large-bold text-primary [overflow-wrap:anywhere]">{row.title}</h2></div>
        </div>
        <div className="flex items-center gap-2">
          {settings && <Switch label={t("Turn {name} on or off", { name: row.title })} checked={settings.enabled !== false} disabled={busy || !settings.editable}
            onChange={(enabled) => onSetting?.("mcp-enable", { enabled })} />}
          <Button variant="secondary" disabled={busy} onClick={() => onAction("refresh", row)}>{t("Reconnect")}</Button>
          {more}
        </div>
      </div>
      {row.description && <p className="font-base text-secondary">{row.description}</p>}
      <LocalConfig definition={definition} />
      {row.sampling && onSampling && <ConnectorSampling row={row} busy={busy} onChange={onSampling} />}
      {settings && onSetting && settings.perTool !== false ? <ConnectorToolSettings row={row} settings={settings} busy={busy} onSetting={onSetting} />
      : row.tools.length > 0
        ? <div className="relative mt-6 isolate"><ul className="cz-tool-list" aria-label={t("{name} tools", { name: row.title })}>
            {row.tools.map((tool) => <li key={tool} className="flex gap-2.5 items-center py-2 border-b last:border-b-0"><span className="text-sm font-normal text-primary">{tool}</span></li>)}
          </ul></div>
        : <p className="font-base text-muted">{t("This connector has no tools available.")}</p>}
    </div>
  );
}

function ConnectorsPage({ store, threadId, cwd, onOpenExternal, call, onNavigate, focus, copy, onEditConfig, mcpDefinitions, mcpServers, onHarnessCall, onRestartCore }) {
  // The DeepSeek core (harnessProfile) can't write MCP config through the core, but the app overlay can
  // (harness-profile.cjs mcp-add, the same Add server form as Settings › Harness): a restart connects it.
  const [harnessAdding, setHarnessAdding] = useState(false), [harnessRestart, setHarnessRestart] = useState(false);
  const harnessAdd = !copy.mcpConfigWrite && copy.deepseek && typeof onHarnessCall === "function";
  const scrollMemory = useRef(new Map());
  const snapshot = useStore(store);
  const ownsCatalog = snapshot.mcp.cwd === cwd && snapshot.mcp.threadId === (threadId ?? null);
  const { rows, status, error } = ownsCatalog ? snapshot.mcp
    : { rows: [], status: "loading", error: "" };
  const {query,setQuery,selected,setSelected}=useCatalogNavigation(focus,"connectorName");
  const [adding,setAdding]=useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(""), [confirmRemove, setConfirmRemove] = useState(null);
  const toasts = useSourceToasts();
  useEffect(()=>{setAdding(false);setConfirmRemove(null);if(focus)setStatusFilter("all");},[focus]);
  useEffect(() => { store.loadMcp({ threadId: threadId ?? null, cwd }); }, [store, threadId, cwd]);
  // A native core's connector settings (on/off, per-tool approval), read with the list.
  useEffect(() => { if (copy.connectorSettings) store.loadMcpConfig?.({ cwd }); }, [store, cwd, copy.connectorSettings]);
  const connectorSettings = copy.connectorSettings && snapshot.mcpConfig?.status === "ready" ? snapshot.mcpConfig.servers ?? {} : null;
  // A bridge's on/off only (no per-tool settings): on unless its status says disabled.
  const settingsFor = (row) => connectorSettings ? connectorSettings[row.name] ?? null
    : copy.connectorToggle && row ? { enabled: row.kind !== "disabled", editable: true, perTool: false } : null;
  const searched = useMemo(() => filterMcp(rows, { query }), [rows, query]);
  const shown = useMemo(() => filterMcpByStatus(searched, statusFilter), [searched, statusFilter]);
  const current = selected ? rows.find((row) => row.name === selected) : null;
  useEffect(() => { if (status === "ready" && selected && !current) { setSelected(null); setConfirmRemove(null); } }, [selected, current, status]);
  // One action at a time; every outcome is a toast (connectorActions), never
  // a paragraph in the page. Add keeps its errors in the form.
  async function act(key, fn) {
    if (busy) return false;
    setBusy(key);
    try { return await fn(); }
    finally { setBusy(""); }
  }
  const actions = connectorActions({ call, store, toasts, threadId, onOpenExternal, onEditConfig, copy });
  const reconnectAll = () => act("reconnect-all", actions.reconnectAll);
  const reconnect = (row) => act(`reconnect:${row.name}`, () => actions.reconnect(row));
  const refresh = (row) => act(`refresh:${row.name}`, () => actions.refresh(row));
  const signIn = (row) => act(`login:${row.name}`, () => actions.signIn(row));
  const add = (payload) => act("add", async () => {
    await call({ operation: "mcp-add", ...payload });
    setAdding(false);
    await store.loadMcp({ force: true });
  });
  // Trust the folder an untrusted project connector comes from (customize mcp-trust → codeDesktop/workspace/trust).
  const trustFolder = (row) => act(`trust:${row.name}`, async () => {
    try { await call({ operation: "mcp-trust", cwd: row.trust?.cwd }); await store.loadMcp({ force: true }); }
    catch (reason) { toasts?.add?.(reason?.message || t("The folder couldn’t be trusted."), { variant: "danger" }); }
  });
  // A connector setting (customize mcp-enable / mcp-tool): one at a time, a failure is a toast.
  const changeSetting = (operation, payload) => act(`setting:${current?.name}`, async () => {
    try { await (operation === "mcp-enable" ? store.setMcpEnabled(current.name, payload.enabled) : store.setMcpTool(current.name, payload.tool ?? null, { ...("enabled" in payload ? { enabled: payload.enabled } : {}), ...("mode" in payload ? { mode: payload.mode } : {}) })); }
    catch (reason) { toasts?.add?.(reason?.message || t("The setting couldn’t be saved."), { variant: "danger" }); }
  });
  // MiMo: whether this connector may ask for model calls on the user's account (customize mcp-sampling), then re-listed.
  const changeSampling = (policy) => act(`sampling:${current?.name}`, async () => {
    try { await call({ operation: "mcp-sampling", name: current.name, policy }); await store.loadMcp?.({ force: true, cwd, threadId: threadId ?? null }); }
    catch (reason) { toasts?.add?.(reason?.message || t("The setting couldn’t be saved."), { variant: "danger" }); }
  });
  const remove = (row) => act(`remove:${row.name}`, async () => {
    const removed = await actions.remove(row);
    setConfirmRemove(null);
    if (removed) setSelected(null);
  });
  useLoadFailureLog("connectors", status, error);
  // Official "Connectors that stopped working" card (customize-connectors ba
  // :2300-2530, BrokenConnectorsCard): the only place a bulk Reconnect all
  // exists, and only when at least one connector's sign-in is missing. It sits
  // in the bands block above the status filter, so the filter never hides it.
  const broken = useMemo(() => searched.filter((row) => row.kind === "unreachable" || row.kind === "signIn"), [searched]);
  const expired = useMemo(() => broken.filter((row) => row.kind === "signIn"), [broken]);
  const editConfig = () => act("edit-config", actions.editConfig);
  const startAdding = () => { setAdding(true); setSelected(null); };
  // A core that cannot write MCP servers (capabilities.mcpConfigWrite false)
  // gets no add/remove controls; its profile patch is edited by hand, so the
  // header actions slot (where the source's add-connector action sits) holds
  // Edit config instead.
  const header = <PageHeader title={t("Connectors")} searchLabel={t("Search connectors")} searchValue={query} onSearch={setQuery}
    actions={copy.mcpConfigWrite
      ? <Button variant="primary" onClick={startAdding} disabled={!!busy || adding}>{t("Add custom connector")}</Button>
      : harnessAdd ? <>
        <Button variant="secondary" disabled={!!busy || !onEditConfig} onClick={editConfig}>{t("Edit config")}</Button>
        <Button variant="primary" disabled={!!busy || harnessAdding} onClick={() => setHarnessAdding(true)}>{t("Add custom connector")}</Button>
      </>
      : <Button variant="secondary" disabled={!!busy || !onEditConfig} onClick={editConfig}>{t("Edit config")}</Button>} />;
  const harnessBits = harnessAdd ? <>
    {harnessRestart && <div className="cz-plugin-restart" role="status" data-connector-restart="">
      <span>{t("The connector starts after DeepSeek restarts. Restarting stops sessions that are running.")}</span>
      {onRestartCore && <Button size="sm" variant="secondary" onClick={async () => { await onRestartCore(); setHarnessRestart(false); }}>{t("Restart DeepSeek")}</Button>}
    </div>}
    {harnessAdding && <AddServerDialog onClose={() => setHarnessAdding(false)} onAdd={async (params) => { await onHarnessCall({ op: "mcp-add", ...params }); setHarnessRestart(true); }} />}
  </> : null;
  // :3136-3147: G "error" renders the page header and so() alone. Mt retries
  // the catalog query; locally that is a forced mcpServerStatus/list.
  if (status === "error")
    return <div className="cz-page" data-cz-page="connectors">{header}<CatalogLoadError section="connectors" onRetry={() => { store.loadMcp({ threadId: threadId ?? null, cwd, force: true }); }} /></div>;
  // G "loading": header + MC only; rows of a previous catalog key (and their
  // stopped-working card) are not shown while the new key loads.
  if (status === "loading")
    return <div className="cz-page" data-cz-page="connectors">{header}<PageBody><CatalogSkeleton section="connectors" /></PageBody></div>;
  // :3164-3178: with a selected connector the page shell drill (wn, backLabel
  // "Connectors") replaces the header and the list; the body is En. Back
  // re-mounts the list body, whose scroll position bindCustomizeScroll restores.
  if (current) {
    const closeDetail = () => { setSelected(null); setConfirmRemove(null); };
    // Sn ⋮ items: Remove (danger) when the core writes MCP config and the
    // server is not plugin-owned; a core without MCP writes edits its config instead.
    const menuItems = [
      // A connector the core signed in to (OAuth tokens it keeps): Sign out where the core can (capabilities.mcpLogout).
      ...(copy.mcpLogout && current.authStatus === "oAuth" ? [{ label: t("Sign out"), disabled: !!busy, onClick: () => act(`logout:${current.name}`, () => actions.signOut(current)) }] : []),
      // A connector saved in the user's config: Edit config opens that file (fix a command or URL in place), then Remove.
      ...(copy.mcpConfigWrite
        ? (current.pluginId ? [] : [...(onEditConfig ? [{ label: t("Edit config"), disabled: !!busy, onClick: editConfig }] : []),
          { label: t("Remove connector"), variant: "danger", disabled: !!busy, onClick: () => setConfirmRemove(current.name) }])
        : [{ label: t("Edit config"), disabled: !!busy || !onEditConfig, onClick: editConfig }])];
    const runAction = (action, row) => (action === "signIn" ? signIn(row) : action === "refresh" ? refresh(row) : action === "trust" ? trustFolder(row) : reconnect(row));
    const definition = Array.isArray(mcpDefinitions) ? mcpDefinitions.find((entry) => entry?.name === current.name) : undefined;
    // Why it fails: the startup error the core reported for this row, else the one Settings › Developer has for it.
    const startupError = current.error || (Array.isArray(mcpServers) ? mcpServers.find((server) => server?.name === current.name)?.toolsError : null) || null;
    return (
      <div className="cz-page" data-cz-page="connectors" data-detail="">
        <div className="cz-drill" data-cz-detail="connector">
          <div className="cz-drill-header"><BackButton onClick={closeDetail}>{t("Connectors")}</BackButton></div>
          <div className="cz-drill-scroll scroll-fade-y scroll-fade-size-6"><div className="cz-connector-detail flex min-h-full flex-col">
            <ConnectorDetail key={current.name} row={current} busy={!!busy} menuItems={menuItems} onAction={runAction} definition={definition}
              startupError={typeof startupError === "string" ? startupError : null} onDeveloper={onNavigate ? () => onNavigate("developer") : null}
              onEditConfig={onEditConfig && !current.pluginId ? editConfig : null}
              settings={settingsFor(current)} onSetting={connectorSettings || copy.connectorToggle ? changeSetting : null}
              onSampling={copy.mcpSampling && call ? changeSampling : null} />
          </div></div>
        </div>
        {/* c5fb58ef0 (c08e79e85 Sn ⋮ Remove → ut): the personal "Remove {serverName}?"
            ConfirmationDialog, confirmLabel "Remove", confirmVariant "danger",
            initial focus on Confirm; layered over the Settings dialog. */}
        {confirmRemove === current.name && copy.mcpConfigWrite && (
          <SourceConfirmationDialog title={t("Remove {name}?", { name: current.title })} confirmLabel={t("Remove")} confirmVariant="danger" layer={SETTINGS_CONFIRM_LAYER}
            pending={busy === `remove:${current.name}`} onCancel={() => setConfirmRemove(null)} onConfirm={() => remove(current)}
            body={<>{t("You can still continue previous chats that reference {name} content.", { name: current.title })}<br /><br />{copy.connectorRemoveNote}</>} />
        )}
      </div>
    );
  }
  const view = connectorsListView({ total: rows.length, visible: shown.length, status: statusFilter, query });
  return (
    <div className="cz-page" data-cz-page="connectors">
      {header}
      {harnessBits}
      {/* :3546-3740: the bands block "flex shrink-0 flex-col gap-lg pt-sm" (the
          stopped-working card), then the body "flex flex-1 flex-col gap-lg" (pt-lg
          below bands, else pt-sm) with the gap-sm filter + table block and Ee. */}
      <PageBody memory={scrollMemory.current} scrollKey={JSON.stringify([cwd, threadId ?? null, statusFilter, query])}>
      {broken.length > 0 && <div className="flex shrink-0 flex-col gap-lg pt-sm">
        <BrokenConnectorsCard broken={broken} expired={expired} busy={!!busy} onReconnectAll={reconnectAll} onReconnect={reconnect} onSignIn={signIn} />
      </div>}
      <div className={`cz-connectors-body flex flex-1 flex-col gap-lg ${broken.length > 0 ? "pt-lg" : "pt-sm"}`}>
        {adding && copy.mcpConfigWrite && <AddConnectorDialog busy={busy === "add"} existingNames={rows.map((row) => row.name)} copy={copy} onSubmit={add} onCancel={() => setAdding(false)} />}
        {(view.filter || view.table) && <div className="flex shrink-0 flex-col gap-sm">
          {view.filter && <FilterSegments label={t("Filter by status")} value={statusFilter} options={MCP_STATUS_FILTERS} onChange={setStatusFilter} className="shrink-0 self-start" />}
          {view.table && (
            <ListTable columns={MCP_COLUMNS} label={t("Connectors")} flush>
              {shown.map((row) => (
                <Row key={row.id} id={row.id} name={row.title} onSelect={() => { setSelected(row.name); setConfirmRemove(null); }}
                  data-mcp-name={row.name} data-mcp-status={row.kind}>
                  <td className="cz-cell-primary">
                    <div className="cz-name">
                      <ConnectorTile size={24} />
                      <span className="cz-truncate">{row.title}</span>
                      {row.pluginId && <button type="button" className="cz-chip" onClick={(event) => { event.stopPropagation(); onNavigate?.("customize-plugins", { pluginId: row.pluginId }); }}>{row.pluginId}</button>}
                    </div>
                  </td>
                  <td className="cz-cell-secondary">
                    <div className="cz-type flex min-w-0 items-center gap-xs overflow-hidden"><span>{t("Desktop")}</span></div>
                  </td>
                  <td className="cz-cell-secondary"><StatusCell row={row} busy={!!busy} onReconnect={reconnect} onSignIn={signIn} /></td>
                </Row>
              ))}
            </ListTable>
          )}
          {view.filterEmpty && <p className="py-lg text-center text-body text-muted" data-cz-filter-empty="">{view.filterEmpty}</p>}
        </div>}
        {/* Ee NodeShapes. Actions as in :3698-3733: Codex keeps the secondary
            Add custom connector; a core that does not write MCP config cannot
            add one, so the body names its config entry and the action is Edit
            config. */}
        {view.empty && <EmptyState searchValue={query.trim()} noMatchMessage={t("No connectors match your search")}
          pictogram="NodeShapes"
          emptyMessage={copy.mcpConfigWrite ? copy.connectorsEmpty : <>{copy.connectorsEmpty}<span className="block" data-cz-config-hint="">{richText(harnessAdd ? t("Choose Add custom connector, or add a {package} entry to {file} and Reconnect.") : copy.connectorConfigHint.text, { package: <code>{copy.connectorConfigHint.package}</code>, file: <code>{copy.configFile}</code> })}</span></>}
          actions={copy.mcpConfigWrite
            ? <div className="flex flex-col items-center gap-3"><Button variant="secondary" onClick={startAdding} disabled={!!busy || adding}>{t("Add custom connector")}</Button></div>
            : <div className="flex flex-col items-center gap-3"><Button variant="secondary" disabled={!!busy || !onEditConfig} onClick={editConfig}>{t("Edit config")}</Button></div>} />}
        {copy.apps && call && !query.trim() && <AppsSection call={call} onOpenExternal={onOpenExternal} />}
      </div>
      </PageBody>
    </div>
  );
}

// MiMo's per-connector model requests (MCP sampling, mcp.<name>.sampling): the connector asks MiMo to run a model call on
// the user's account, for example to transcribe audio it sends. Ask (MiMo's default) shows a card each time.
export function ConnectorSampling({ row, busy = false, onChange }) {
  return <div className="cz-sampling" data-cz-sampling={row.sampling}>
    <div className="cz-sampling-copy"><span className="cz-sampling-title">{t("Model requests from this connector")}</span>
      <span className="cz-muted">{t("{name} can ask to run a model call on your account, billed like your own messages.", { name: row.title })}</span></div>
    <SourceSelect label={t("Model requests from this connector")} align="end" value={row.sampling} disabled={busy}
      items={[{ value: "ask", label: t("Ask every time") }, { value: "allow", label: t("Always allow") }, { value: "deny", label: t("Never allow") }]} onChange={onChange} />
  </div>;
}

// ChatGPT Apps on Codex (/apps): what app/list offers to this account — installed, off, or installable in the browser —
// with Connect / Manage (the app's page), an on/off switch (config.toml apps.<id>.enabled) and Reload (forceRefetch).
// Shown only when the account has apps to list (a ChatGPT sign-in); an API key lists none.
export function AppsSection({ call, onOpenExternal, initial = null }) {
  const [state, setState] = useState(() => initial ? { status: "ready", view: appsView(initial), error: "" } : { status: "loading", view: null, error: "" });
  const [busy, setBusy] = useState(""), [rowError, setRowError] = useState(null);
  const load = async (reload = false) => {
    setState((current) => ({ ...current, status: current.view ? "refreshing" : "loading", error: "" }));
    try { const result = await call({ operation: "apps", ...(reload ? { reload: true } : {}) }); setState({ status: "ready", view: appsView(result), error: "" }); }
    catch (error) { setState((current) => ({ status: "error", view: current.view, error: localizeBridgeText(cleanErrorReason(error)) })); }
  };
  useEffect(() => { if (!initial) void load(); }, []);
  const toggle = async (app, enabled) => {
    setBusy(app.id); setRowError(null);
    try { await call({ operation: "app-enabled", id: app.id, enabled }); await load(); }
    catch (error) { setRowError({ id: app.id, message: localizeBridgeText(cleanErrorReason(error)) }); }
    finally { setBusy(""); }
  };
  const view = state.view;
  if (!view?.total && state.status !== "error") return null;
  return <section className="cz-apps" aria-label={t("Apps")} data-cz-apps="">
    <div className="cz-section-head cz-apps-head"><h3>{t("Apps")}</h3>
      <Button size="sm" variant="ghost" busy={state.status === "refreshing"} disabled={state.status === "loading"} onClick={() => void load(true)}>{t("Reload")}</Button></div>
    {view?.summary && <p className="cz-muted">{view.summary} · {t("Connect an app in your browser, then reload.")}</p>}
    {state.error && <p className="cz-error" role="alert">{state.error}</p>}
    {view?.total > 0 && <ul className="cz-apps-list" role="list">
      {view.apps.map((app) => <li key={app.id} className="cz-apps-row" data-app-id={app.id} data-installed={app.installed || undefined}>
        {app.icon ? <picture className="cz-apps-icon" aria-hidden="true">{app.iconDark && <source srcSet={app.iconDark} media="(prefers-color-scheme: dark)" />}<img src={app.icon} alt="" width={24} height={24} /></picture>
          : <span className="cz-apps-icon cz-apps-icon-empty" aria-hidden="true"><ConnectorTile size={24} /></span>}
        <div className="cz-apps-text">
          <span className="cz-apps-name">{app.name}</span>
          <span className="cz-apps-meta">{[app.status, app.description].filter(Boolean).join(" · ")}</span>
          {rowError?.id === app.id && <span className="cz-error" role="alert">{rowError.message}</span>}
        </div>
        <div className="cz-apps-actions">
          {app.url && onOpenExternal && <Button size="sm" variant={app.installed ? "ghost" : "secondary"} onClick={() => void onOpenExternal(app.url)}>{app.installed ? t("Manage") : t("Connect")}</Button>}
          {app.installed && <Switch label={t("Use {name}", { name: app.name })} checked={app.enabled} disabled={!!busy} onChange={(value) => void toggle(app, value)} />}
        </div>
      </li>)}
    </ul>}
  </section>;
}

// ---------------------------------------------------------------------------
// Plugins (installed only)

// c36b3644c fe → c26958849 nav row: the 24/16 connector tile in a size-6 slot
// (opacity-50 unless enabled), the server title, its status as the font-small
// muted description, text-muted unless connected; selecting it opens the
// connector drill (pe onSelect → Z).
function PluginConnectorRow({ item, onSelect, onToggle = null, busy = false }) {
  const content = <>
    <span className={`flex-shrink-0 flex items-center justify-center size-6 text-secondary${item.connected ? "" : " opacity-50"}`}><ConnectorTile size={24} /></span>
    <div className="flex flex-col flex-1 min-w-0">
      <span className="flex items-center gap-1.5 min-w-0"><span className="truncate">{item.label}</span></span>
      {item.description && <span className="font-small text-muted truncate" title={t(item.description)}>{t(item.description)}</span>}
    </div>
  </>;
  const tone = `rounded-lg text-sm w-full${onSelect ? " hover:bg-surface-0" : ""} ${item.connected ? "text-primary" : "text-muted"}`;
  const row = onSelect
    ? <button type="button" className={`flex items-center gap-3 px-3 py-1.5 text-left cursor-pointer ${tone}`} data-connector-name={item.connectorName} onClick={() => onSelect(item.connectorName)}>{content}</button>
    : <div className={`flex items-center gap-3 px-3 py-1.5 text-left ${tone}`} data-connector-name={item.connectorName}>{content}</div>;
  // A plugin server the core switches on its own (Kimi's /plugins mcp enable|disable): its switch beside the row.
  if (!onToggle || typeof item.enabled !== "boolean") return row;
  return <div className="cz-plugin-server">{row}<Switch label={t("Run {name}", { name: item.label })} checked={item.enabled} disabled={busy} onChange={(value) => onToggle(item, value)} /></div>;
}

// c36b3644c pe: two h-control skeleton bars while the connector rows load,
// "This plugin has no required connectors." without any, the tab's no-match
// line for a search without results, else the rows. Exported for tests.
export function PluginConnectors({ tab, items, loading, onSelect, onToggle = null, busy = false }) {
  if (loading) return <div className="flex flex-col gap-sm" data-plugin-mcp-loading=""><SkeletonBar className="h-control w-full" /><SkeletonBar className="h-control w-full" /></div>;
  if (!tab.items.length) return <p className="py-md text-body text-muted">{t("This plugin has no required connectors.")}</p>;
  if (!items.length) return <p className="cz-plugin-no-match">{t("No connectors match your search")}</p>;
  return <ul className="cz-plugin-items" data-plugin-mcp="">{items.map((item) => <li key={item.key}><PluginConnectorRow item={item} onSelect={onSelect} onToggle={onToggle} busy={busy} /></li>)}</ul>;
}

const DEFAULT_COPY = customizeCore();

// Plugin icon tile (Claude c27f32a39 row tile size-9 / ca0e5677a card tile size-10 /
// c24c8737b detail size-11): rounded-lg, bordered, surface-1, the bundle's own icon
// (PluginLocalizedMeta.icon, an image data URL) or the Plugin glyph.
export function PluginIcon({ icon, size = "md" }) {
  const glyph = size === "lg" ? 24 : size === "sm" ? 14 : 20;
  return <span className={`cz-plugin-icon cz-plugin-icon-${size}`} aria-hidden="true" data-plugin-icon="">
    {icon ? <img src={icon} alt="" draggable={false} /> : <Icon name="Plugin" size={glyph} />}
  </span>;
}

// "Official" bundles (shipped with the running core's installation — the Harness's dsh-app-boot
// OPTIONAL_BUNDLES —, offered switched off, not removable; ZCode's built-in plugins, on by default) as Claude
// Directory cards (ca0e5677a: 2-column grid,
// rounded-2xl bordered surface-3 card, icon tile + title + muted meta line, 2-line
// description). The trailing control is the bundle's on/off switch (setBundleEnabled);
// the rest of the card opens its detail; the subtitle and byline name the running core
// (officialSubtitleFor: off until turned on, on until turned off, or plain; officialBy). Exported for rendering tests.
export function OfficialPlugins({ rows, store, manage = false, onOpen, copy = DEFAULT_COPY }) {
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  if (!rows.length) return null;
  async function toggle(row, enabled) {
    if (busy) return;
    setBusy(row.id); setError("");
    try { const outcome = await store.setPluginEnabled(row.pluginName, enabled); if (outcome && !outcome.ok) setError(outcome.message); }
    catch (reason) { setError(reason?.message || t("The plugin could not be changed.")); }
    finally { setBusy(""); }
  }
  return <section className="cz-official" aria-label={t("Official")} data-cz-official="">
    <div className="cz-section-head"><h3>{t("Official")}</h3><span>{officialSubtitleFor(rows, copy)}</span></div>
    <ul className="cz-official-grid" role="list">
      {rows.map((row) => <li key={row.id} className="cz-official-card" data-official-plugin={row.id} data-plugin-enabled={row.enabled ? "true" : "false"}>
        {onOpen && <button type="button" className="cz-official-open" aria-label={t("View {name}", { name: row.name })} onClick={() => onOpen(row.id)} />}
        <div className="cz-official-top">
          <PluginIcon icon={row.icon} />
          <div className="cz-official-title">
            <span className="cz-official-name">{row.name}</span>
            <span className="cz-official-meta">{[copy.officialBy, row.version ? `v${row.version}` : null].filter(Boolean).join(" · ")}</span>
          </div>
          {/* A plugin that can't run here gets no switch unless it is on, so it can still be turned off. */}
          {manage && row.manageable && (!row.unavailable || row.enabled) && <div className="cz-official-action">
            <Switch label={t(row.enabled ? "Turn {name} off" : "Turn {name} on", { name: row.name })} size="sm" checked={row.enabled} disabled={!!busy} onChange={(value) => toggle(row, value)} />
          </div>}
        </div>
        {row.description && <p className="cz-official-description" title={row.description}>{row.description}</p>}
        {(row.experimental || row.loadError || row.unavailable) && <div className="cz-official-badges">
          {row.experimental && <Badge>{t("Experimental")}</Badge>}
          {row.unavailable && <Badge title={row.unavailable}>{t("Unavailable here")}</Badge>}
          {row.loadError && <Badge variant="danger">{t("Failed to load")}</Badge>}
        </div>}
      </li>)}
    </ul>
    {error && <p className="cz-error" role="alert" data-official-error="">{error}</p>}
  </section>;
}

// Classic plugin detail: customize-plugins-current Dt/Kt -> c36b3644c ye/_e; its tab list and Overview tab follow
// 2.42304.0 c24c8737b pc Kt / c12456454 ni (R4e-plugin, source-r4e-plugin-overview.jsx).
// Exported for window-free rendering tests of the actual production surface.
// `mcp` = {rows, loading} of the Customize connectors catalog (connector rows'
// titles and status); `onConnector(name)` opens a connector's drill.
// `manage` = the header actions (PluginManageControls), `notices` = the row below the header (workspace sharing).
export function PluginDetail({ plugin, detail, error, skills, view, onView, onBack, onSkill, onConnector, scrollMemory, copy = DEFAULT_COPY, mcp = null, manage = null, notices = null, onServerToggle = null, serverBusy = false }) {
  const id = useId();
  const scroll = useRef(null);
  const mcpRows = mcp?.rows;
  // R4e-plugin (2.42304.0 c24c8737b pc Kt): Overview first, then the content tabs; no Tool permissions servers here.
  const tabs = useMemo(() => detail ? pluginDetailTabList(pluginDetailTabs(detail, plugin.id, skills, { descriptions: copy.pluginTabDescriptions, mcpRows: mcpRows || [] })) : [], [detail, plugin.id, skills, copy, mcpRows]);
  const overview = useMemo(() => pluginOverview(detail, plugin, { mcpRows: mcpRows || [] }), [detail, plugin, mcpRows]);
  const { tab, searchable, items } = pluginDetailView(tabs, view?.tab, view?.query);
  useLayoutEffect(() => scrollMemory ? bindCustomizeScroll(scroll.current, scrollMemory, `detail:${plugin.id}`) : undefined, [scrollMemory, plugin.id]);
  useEffect(() => {
    if (detail && (view?.tab !== tab?.id || (!searchable && view?.query))) onView({ tab: tab?.id, query: '' });
  }, [detail, tab?.id, searchable, view?.tab, view?.query, onView]);
  const changeTab = next => onView({ tab: next, query: '' });
  return <div className="cz-drill" data-cz-detail="plugin">
    <div className="cz-drill-header"><BackButton onClick={onBack}>{t("Plugins")}</BackButton></div>
    <div ref={scroll} className="cz-drill-scroll scroll-fade-y scroll-fade-size-6">
      {/* c36b3644c be: `s || !a ? q` — until plugin/read answers, the whole page is the c9d36aa51 skeleton. */}
      {!detail && !error ? <PluginPageSkeleton /> :
      <section className="cz-plugin-detail" aria-label={plugin.name}>
        <header className="cz-plugin-head">
          {(plugin.icon || plugin.official) && <PluginIcon icon={plugin.icon} size="lg" />}
          <div className="cz-plugin-title">
            <div className="cz-plugin-title-row"><h2 className="text-heading-semibold">{plugin.name}</h2>{plugin.official && <Badge>{t("Official")}</Badge>}{plugin.experimental && <Badge>{t("Experimental")}</Badge>}{!plugin.enabled && <Badge>{t("Disabled")}</Badge>}</div>
            {(plugin.pluginName && plugin.pluginName !== plugin.name) || plugin.components ? <p className="cz-plugin-byline">{[plugin.pluginName !== plugin.name ? plugin.pluginName : null, plugin.components ? tn(plugin.components, "{count} component", "{count} components") : null].filter(Boolean).join(" · ")}</p> : null}
          </div>
          {manage}
        </header>
        {/* c36b3644c :563-590 notices slot "flex flex-col gap-sm px-xl pt-lg pb-md empty:hidden", between the header
            and the metadata. */}
        {(plugin.loadError || plugin.unavailable || notices) && <div className="cz-plugin-notices" data-plugin-notices="">
          {plugin.loadError && <p className="cz-error cz-plugin-message" role="alert" data-plugin-load-error="">{t("This plugin could not load: {error}", { error: plugin.loadError })}</p>}
          {plugin.unavailable && <p className="cz-muted cz-plugin-message" role="status" data-plugin-unavailable="">{plugin.unavailable}</p>}
          {notices}
        </div>}
        <div className="cz-plugin-metadata">
          {plugin.marketplaceName && <div><span>{t("Source")}</span><div>{richText(t("Marketplace ({name})"), { name: <button type="button" className="cz-text-button" onClick={onBack}>{plugin.marketplaceName}</button> })}</div></div>}
          {plugin.author && <div><span>{t("Author")}</span><div className="cz-truncate" title={plugin.author}>{plugin.author}</div></div>}
          {plugin.version && <div><span>{t("Version")}</span><div className="cz-tabular">{plugin.version}</div></div>}
          {/* c26e90ba3 qt `!local && Last updated`: no backend timestamp, so the muted "—". */}
          {plugin.source !== "local" && <div><span>{t("Last updated")}</span><div><span className="text-muted">—</span></div></div>}
        </div>
        {/* R4e-plugin: the Description is the Overview tab's (c12456454 ni → cae01a6fc W), see pluginOverview. */}
        {error ? <p className="cz-error cz-plugin-message" role="alert">{error}</p> :
          <div className="cz-plugin-contents">
            <div className="cz-plugin-controls">
              <div data-cds="Tabs" data-orientation="horizontal"><div role="tablist" aria-label={t("Plugin contents")} className="cz-plugin-tabs" onKeyDown={event => {
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                const at = tabs.findIndex(entry => entry.id === tab?.id);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (at + 1) % tabs.length : event.key === 'ArrowLeft' ? (at - 1 + tabs.length) % tabs.length : null;
                if (next !== null && tabs.length) { event.preventDefault(); event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus(); }
              }}>
                {/* Kt always holds Overview once plugin/read answers, so there is no empty tab strip. */}
                {tabs.map(entry => <button type="button" role="tab" key={entry.id} id={`${id}-${entry.id}`} aria-controls={`${id}-panel`} aria-selected={entry.id === tab.id} tabIndex={entry.id === tab.id ? 0 : -1}
                  onFocus={() => { if (entry.id !== tab.id) changeTab(entry.id); }} onClick={() => { if (entry.id !== tab.id) changeTab(entry.id); }}>{t(entry.label)}</button>)}
              </div></div>
              {searchable && <PageSearch key={tab.id} label={t(`Search ${tab.id}`)} value={view?.query || ''} onChange={query => onView({ tab: tab.id, query })} />}
            </div>
            {tab ? <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab.id}`}>
              {tab.id !== 'overview' && <p className="cz-plugin-tab-description">{tab.description}</p>}
              {/* pc: `qt === "overview" && a(pa, { …, onOpenConnectors: Kt.some(e => e.id === "connectors") ? Dn : void 0 })`. */}
              {tab.id === 'overview' ? <PluginOverview overview={overview} onOpenConnectors={tabs.some(entry => entry.id === 'connectors') ? () => changeTab('connectors') : undefined} /> :
              tab.id === 'connectors' ? <PluginConnectors tab={tab} items={items} loading={!!mcp?.loading} onSelect={onConnector} onToggle={onServerToggle} busy={serverBusy} /> : items.length ? <ul className="cz-plugin-items" {...{ [`data-plugin-${tab.id}`]: '' }}>
                {items.map(item => <li key={item.key}>{item.path ? <button type="button" className="cz-plugin-item" onClick={() => onSkill(item.path)}><span>{item.label}</span>{item.description.trim().length > 1 && <small title={item.description}>{item.description}</small>}{item.disabled && <Badge>{t("Disabled")}</Badge>}</button> :
                  <div className="cz-plugin-item"><span>{item.label}</span>{item.description.trim().length > 1 && <small title={item.description}>{item.description}</small>}{item.disabled && <Badge>{t("Disabled")}</Badge>}
                    {/* cd0c65b43 f: a monitor's command under when it runs. */}
                    {item.command && <code className="block overflow-hidden whitespace-pre-wrap [overflow-wrap:anywhere] rounded bg-surface-1 px-1.5 py-0.5 font-mono text-caption" data-plugin-monitor-command="">{item.command}</code>}</div>}</li>)}
              </ul> : <p className="cz-plugin-no-match">{t(`No ${tab.id} match your search`)}</p>}
            </div> : null}
          </div>}
      </section>}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Plugin management: a core's codeDesktop/plugin/* manager (customize-store
// plugin ops → the DeepSeek core's harness plugins.js over dsh-plugin-manager,
// or a bridge's own), or a native core's protocol plugin management
// (marketplaces, install, uninstall, on/off). The source page has no install
// flow for local bundles; this follows the Connectors page's inline add form.

// The core loads plugin changes when it starts (its profile runs without hot reload).
export function PluginRestartBanner({ onRestartCore }) {
  const [busy, setBusy] = useState(false);
  return <div className="cz-plugin-restart" role="status" data-plugin-restart="">
    <span>{t("Plugin changes apply after DeepSeek restarts. Restarting stops sessions that are running.")}</span>
    {onRestartCore && <Button size="sm" variant="secondary" busy={busy} disabled={busy} onClick={async () => { setBusy(true); try { await onRestartCore(); } finally { setBusy(false); } }}>{t("Restart DeepSeek")}</Button>}
  </div>;
}

export const PLUGIN_REGISTRY_OPTIONS = [
  { value: "", label: "Automatic" },
  { value: "https://registry.npmjs.org/", label: "Official npm registry" },
  { value: "https://registry.npmmirror.com/", label: "Mainland China mirror" },
];
// The form's copy and the npm install source picker follow the core's plugin manager (copy.pluginForm).
export function AddPluginForm({ store, install, onClose, copy = DEFAULT_COPY }) {
  const [spec, setSpec] = useState(install?.spec || ""), [inspection, setInspection] = useState(null), [checking, setChecking] = useState(false), [error, setError] = useState("");
  const [registry, setRegistry] = useState(install?.registry || "");
  const running = install?.status === "running";
  const outcome = install?.outcome;
  const pending = outcome?.pendingBuilds?.length ? outcome.pendingBuilds : null;
  async function submit(event) {
    event.preventDefault();
    if (running || checking || !spec.trim()) return;
    setError(""); setInspection(null); setChecking(true);
    try {
      const found = await store.inspectPlugin(spec.trim(), { registry: registry || undefined });
      setInspection(found);
      if (found?.status !== "accepted") { setError(found?.reason || t("This package cannot be installed.")); return; }
      if (found.bundle === false) { setError(copy.notPluginMessage); return; }
      setChecking(false);
      await store.installPlugin(spec.trim(), { registry: registry || undefined });
    } catch (reason) { setError(reason?.message || t("The plugin could not be installed.")); }
    finally { setChecking(false); }
  }
  const close = () => { store.clearPluginInstall(); onClose(); };
  return (
    <form className="cz-form" aria-label={t("Add plugin")} onSubmit={submit} data-plugin-install={install?.status || "idle"}>
      <h3>{t("Add plugin")}</h3>
      <p className="cz-muted">{copy.pluginForm.intro}</p>
      <label className="cz-field"><span>{t("Package")}</span><input aria-label={t("Plugin package")} value={spec} placeholder={copy.pluginForm.placeholder} disabled={running}
        onChange={(event) => { setSpec(event.target.value); setError(""); setInspection(null); }} autoFocus /></label>
      {copy.pluginForm.registries && <div className="cz-field"><span>{t("Source")}</span>
        <div className="ss-control cz-registry-control"><SourceSegments label={t("Install source")} value={registry} disabled={running || checking} options={PLUGIN_REGISTRY_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))}
          onChange={(value) => { setRegistry(value); setError(""); setInspection(null); }} /></div>
        <small className="cz-muted">{t("Automatic tries the official npm registry, then the mainland China mirror.")}</small>
      </div>}
      {inspection?.status === "accepted" && inspection.name && <p className="cz-muted" data-plugin-inspection="">
        <strong>{inspection.name}</strong>{inspection.version ? ` ${inspection.version}` : ""}{inspection.description ? ` — ${inspection.description}` : ""}</p>}
      {running && <p className="cz-muted" role="status">{checking ? t("Checking…") : pluginInstallStatus(install)}</p>}
      {install?.log && <SourceDisclosure label={t("Output")}><pre className="cz-plugin-log" tabIndex={0} aria-label={t("Install output")}>{install.log}</pre></SourceDisclosure>}
      {outcome?.ok && <p className="cz-muted" role="status">{t(outcome.restartRequired ? "Installed {name}. Restart DeepSeek to load it." : "Installed {name}.", { name: outcome.bundle || install.spec })}</p>}
      {outcome && !outcome.ok && !outcome.cancelled && <p className="cz-error" role="alert">{outcome.message}</p>}
      {outcome?.cancelled && <p className="cz-muted" role="status">{outcome.message}</p>}
      {pending && <div className="cz-plugin-builds" data-plugin-pending-builds="">
        <p>{richText(t("These packages want to run build scripts: {packages}. Build scripts run with your user permissions."), { packages: <strong>{pending.join(", ")}</strong> })}</p>
        <Button size="sm" variant="secondary" onClick={() => store.installPlugin(install.spec, { approvedBuilds: pending, registry: install.registry || undefined })}>{t("Allow these scripts and retry")}</Button>
      </div>}
      {error && <p className="cz-error" role="alert">{error}</p>}
      <div className="cz-form-actions">
        {running
          ? <Button variant="secondary" disabled={install.phase === "cancelling" || install.phase === "applying"} onClick={() => store.cancelPluginInstall()}>{t("Cancel install")}</Button>
          : <Button variant="secondary" disabled={checking} onClick={close}>{outcome ? t("Close") : t("Cancel")}</Button>}
        <Button type="submit" variant="primary" busy={checking || running} disabled={checking || running || !spec.trim()}>{t("Install")}</Button>
      </div>
    </form>
  );
}

// Detail-page controls: on/off and Remove for a bundle the manager may change. `actions`
// = {canToggle, canRemove, toggle(enabled), remove()} (the codeDesktop/plugin/* manager by
// default; PluginsPage passes the native protocol ones on a native core).
export function pluginManager({ plugin, store, copy = DEFAULT_COPY, native = false }) {
  // A native core's own plugin actions (Codex plugin/uninstall, config/value/write plugins.<id>).
  if (native) return { ...nativePluginActions(plugin), toggle: (value) => store.setNativePluginEnabled(plugin.id, value), remove: () => store.uninstallPlugin(plugin.id) };
  return { canToggle: plugin.manageable && (!plugin.unavailable || plugin.enabled), canRemove: plugin.removable, toggle: (value) => store.setPluginEnabled(plugin.pluginName, value), remove: () => store.removePlugin(plugin.pluginName),
    // A core that updates an installed plugin from its source (copy.pluginUpdate: Qwen's `extensions update`).
    ...(copy.pluginUpdate && plugin.removable ? { canUpdate: true, update: () => store.updatePlugin(plugin.pluginName) } : {}) };
}
export function PluginManageControls({ plugin, store, onRemoved, copy = DEFAULT_COPY, actions = null }) {
  const manager = actions ?? pluginManager({ plugin, store, copy });
  // c26e90ba3 :1380-1490 header actions ("flex items-center gap-md shrink-0"): a ⋯ "More options for {label}" menu
  // holding the update and uninstall items, then the on/off Switch; the plugin name truncates before these shrink.
  // Outcomes are toasts, so nothing else is drawn in the title row.
  const toasts = useSourceToasts();
  const [busy, setBusy] = useState(""), [confirm, setConfirm] = useState(false);
  async function run(kind, action) {
    setBusy(kind);
    try { const outcome = await action(); if (!outcome.ok) toasts?.add?.(outcome.message, { variant: "danger" }); return outcome; }
    catch (reason) { toasts?.add?.(reason?.message || t("The plugin change failed."), { variant: "danger" }); return null; }
    finally { setBusy(""); }
  }
  const items = [
    ...(manager.canUpdate ? [{ label: t("Update"), disabled: !!busy, onClick: async () => { const outcome = await run("update", () => manager.update()); if (outcome?.ok) toasts?.add?.(t("Updated. New sessions use the new version."), { variant: "neutral" }); } }] : []),
    ...(manager.canRemove ? [{ label: t("Remove"), variant: "danger", disabled: !!busy, onClick: () => setConfirm(true) }] : []),
  ];
  return <div className="cz-plugin-manage" data-plugin-manage="">
    <MoreMenu label={t("More options for {name}", { name: plugin.name })} size={DIALOG_BUTTON_SIZE} items={items} hideWhenEmpty />
    {manager.canToggle && <Switch label={t(plugin.enabled ? "Turn {name} off" : "Turn {name} on", { name: plugin.name })} size="sm" checked={plugin.enabled} disabled={!!busy}
      onChange={(value) => run("toggle", () => manager.toggle(value))} />}
    <SourceConfirmationDialog open={confirm} title={t("Remove {name}?", { name: plugin.name })} confirmLabel={t("Remove")} confirmVariant="danger" pending={busy === "remove"} layer={SETTINGS_CONFIRM_LAYER}
      body={copy.pluginRemoveBody}
      onCancel={() => setConfirm(false)} onConfirm={async () => { const outcome = await run("remove", () => manager.remove()); setConfirm(false); if (outcome?.ok) onRemoved?.(); }} />
  </div>;
}

// Workspace sharing of a local plugin on Codex (plugin/share/save | delete; the TUI catalog's share context): an unlisted
// link or the workspace directory, the link to copy, and Stop sharing.
export function PluginShareControls({ plugin, store }) {
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [link, setLink] = useState(plugin.share?.url ?? null), [mode, setMode] = useState(plugin.share?.discoverability === "LISTED" ? "LISTED" : "UNLISTED");
  const shared = !!(plugin.share || link);
  async function run(kind, action) {
    setBusy(kind); setError("");
    try { const outcome = await action(); if (!outcome.ok) setError(outcome.message); return outcome; }
    finally { setBusy(""); }
  }
  return <div className="cz-plugin-share" data-plugin-share="">
    <span className="text-sm text-secondary">{shared ? (plugin.share?.creator ? t("Shared with your workspace by {name}.", { name: plugin.share.creator }) : t("Shared with your workspace.")) : t("Share this plugin with your ChatGPT workspace.")}</span>
    {plugin.sourcePath && <SourceSelect label={t("Who can find it")} value={mode} align="end" items={[{ value: "UNLISTED", label: t("Anyone with the link") }, { value: "LISTED", label: t("Listed in your workspace") }]} onChange={setMode} />}
    {plugin.sourcePath && <Button size="sm" variant="secondary" busy={busy === "share"} disabled={!!busy} onClick={async () => {
      const outcome = await run("share", () => store.sharePlugin({ pluginPath: plugin.sourcePath, discoverability: mode, remotePluginId: plugin.share?.remotePluginId }));
      if (outcome?.ok && typeof outcome.result?.shareUrl === "string") setLink(outcome.result.shareUrl);
    }}>{shared ? t("Update sharing") : t("Share")}</Button>}
    {link && <Button size="sm" variant="ghost" onClick={() => void globalThis.navigator?.clipboard?.writeText(link).catch(() => {})}>{t("Copy link")}</Button>}
    {plugin.share?.remotePluginId && <Button size="sm" variant="ghost" busy={busy === "unshare"} disabled={!!busy} onClick={async () => { const outcome = await run("unshare", () => store.unsharePlugin(plugin.share.remotePluginId)); if (outcome?.ok) setLink(null); }}>{t("Stop sharing")}</Button>}
    {error && <p className="cz-error" role="alert">{error}</p>}
  </div>;
}

// Built-in plugins: bundles this app can install itself, listed above the
// installed table so a person can add one without typing a package spec. Only
// the core each entry is for draws it (filterBuiltinPlugins `core`). A finished
// install flows into the page's AddPluginForm (store.install) so progress and
// output stay in one place. Exported for rendering tests.
export function BuiltinPlugins({ entries, rows, store, onInstalled, copy = DEFAULT_COPY }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!entries.length) return null;
  async function install(entry) {
    if (busy) return;
    setBusy(entry.id); setError("");
    try {
      const found = await store.inspectPlugin(entry.spec);
      if (found?.status !== "accepted" || found.bundle === false) {
        setError(found?.reason || copy.notPluginMessage);
        return;
      }
      const outcome = await store.installPlugin(entry.spec);
      if (outcome?.ok) onInstalled?.(entry);
      else if (outcome && !outcome.cancelled) setError(outcome.message);
    } catch (reason) {
      setError(reason?.message || t("The plugin could not be installed."));
    } finally { setBusy(""); }
  }
  async function toggle(entry, row, enabled) {
    if (busy) return;
    setBusy(entry.id); setError("");
    try { const outcome = await store.setPluginEnabled(row.pluginName, enabled); if (outcome && !outcome.ok) setError(outcome.message); }
    catch (reason) { setError(reason?.message || t("The plugin could not be changed.")); }
    finally { setBusy(""); }
  }
  return <section className="cz-builtin" aria-label={t("Built-in plugins")} data-cz-builtin="">
    <div className="cz-builtin-head"><h3>{t("Built-in plugins")}</h3></div>
    <ul className="cz-builtin-list" role="list">
      {entries.map((entry) => {
        const row = builtinPluginRow(entry, rows);
        return (
          <li key={entry.id} className="cz-builtin-row" data-builtin-plugin={entry.id}
            data-builtin-state={row ? (row.enabled ? "enabled" : "disabled") : "not-installed"}>
            <div className="cz-builtin-text">
              <span className="cz-builtin-name"><span className="cz-truncate">{entry.name}</span><Badge>{t("Built-in")}</Badge></span>
              <span className="cz-builtin-description">{entry.description}</span>
              <span className="cz-builtin-source" title={entry.spec}>{entry.repository}</span>
            </div>
            <div className="cz-builtin-action">
              {row
                ? <Switch label={t(row.enabled ? "Turn {name} off" : "Turn {name} on", { name: entry.name })} size="sm" checked={row.enabled} disabled={!!busy}
                    onChange={(value) => toggle(entry, row, value)} />
                : <Button variant="primary" size="sm" busy={busy === entry.id} disabled={!!busy} onClick={() => install(entry)}>{t("Install")}</Button>}
            </div>
          </li>
        );
      })}
    </ul>
    {error && <p className="cz-error" role="alert" data-builtin-error="">{error}</p>}
  </section>;
}

// Native core (copy.nativePlugins): add a plugin marketplace (marketplace/add: a git URL, owner/repo or a
// local folder), whose plugins then appear under Available. The Add plugin menu's "Add marketplace" (cf0e8a0d3 Ya,
// UYlPDbWMZe) opens it as a dialog (AddMarketplaceDialog): one full-width input whose placeholder says what it takes,
// the trust note as the muted footnote, Cancel / Add. The form is exported for rendering tests.
export function AddMarketplaceForm({ store, onClose, copy = DEFAULT_COPY }) {
  const [source, setSource] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [added, setAdded] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy || !source.trim()) return;
    setBusy(true); setError(""); setAdded("");
    try {
      const outcome = await store.addMarketplace(source.trim());
      if (!outcome.ok) { setError(outcome.message); return; }
      const name = outcome.result?.marketplaceName || source.trim();
      setAdded(outcome.result?.alreadyAdded ? t("{name} was already added.", { name }) : t("Added {name}. Its plugins are listed under Available.", { name }));
      setSource("");
    } catch (reason) { setError(reason?.message || t("The marketplace could not be added.")); }
    finally { setBusy(false); }
  }
  return (
    <form className="cz-dialog-form" aria-label={t("Add marketplace")} onSubmit={submit} data-plugin-marketplace-add="">
      <label className="cz-dialog-field">
        <input data-autofocus data-cds="TextInput" className="cds-input cds-reset" aria-label={t("Marketplace source")} value={source} placeholder={t("owner/repo, a git URL or /path/to/marketplace")} disabled={busy}
          autoComplete="off" spellCheck={false} onChange={(event) => { setSource(event.target.value); setError(""); setAdded(""); }} />
      </label>
      {added && <p className="cz-muted" role="status">{added}</p>}
      {error && <p className="cz-error" role="alert">{error}</p>}
      <p className="cz-dialog-note">{t("Add a plugin marketplace to {core} from a git URL, owner/repo or a local folder. Plugins run inside {core} with your user permissions; install only ones you trust.", { core: copy.name })}</p>
      <SourceDialogFooter>
        <Button variant="secondary" disabled={busy} onClick={onClose}>{added ? t("Close") : t("Cancel")}</Button>
        <Button type="submit" variant="primary" busy={busy} disabled={busy || !source.trim()}>{t("Add")}</Button>
      </SourceDialogFooter>
    </form>
  );
}
function AddMarketplaceDialog(props) {
  return <SourceDialog title={t("Add marketplace")} size="md" layer={SETTINGS_CONFIRM_LAYER} className="cz-dialog cz-connector-dialog" onClose={props.onClose}>
    <AddMarketplaceForm {...props} />
  </SourceDialog>;
}

// After a Codex plugin install: the apps it bundles that still need connecting (PluginInstallResponse
// appsNeedingAuth), each with its install page, as the TUI walks through them (chatwidget/plugins.rs).
export function PluginAppsFollowUp({ plugin, apps, onUse, onOpenExternal, onDone }) {
  return <div className="cz-plugin-apps" role="status" data-plugin-apps="">
    <p className="cz-plugin-apps-title">{tn(apps.length, "Connect {app} to finish setting up {plugin}.", "Connect these apps to finish setting up {plugin}:", { app: apps[0]?.name ?? "", plugin })}</p>
    {onUse && <p className="cz-muted">{t("You can also connect it later: {core} asks when the plugin first needs it.", { core: getAssistantName() })}</p>}
    <ul className="cz-plugin-apps-list">
      {apps.map((app) => <li key={app.id} data-plugin-app={app.id}>
        <span className="cz-truncate">{app.name}</span>
        {app.installUrl && onOpenExternal && <Button size="sm" variant="secondary" onClick={() => onOpenExternal(app.installUrl)}>{t("Open")}</Button>}
      </li>)}
    </ul>
    <div className="cz-form-actions"><Button size="sm" variant="primary" onClick={onDone}>{t("Done")}</Button></div>
  </div>;
}

// Native core: the plugins its marketplaces offer that are not installed (plugin/list), each with Install
// (plugin/install). Drawn like the built-in list. Exported for rendering tests.
export function AvailablePlugins({ rows, store, onOpenExternal = null, coreName = "" }) {
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [followUp, setFollowUp] = useState(null);
  if (!rows.length && !followUp) return null;
  async function install(row) {
    if (busy) return;
    setBusy(row.id); setError(""); setFollowUp(null);
    try {
      const outcome = row.installName ? await store.installPlugin(row.installName) : await store.installMarketplacePlugin({ marketplacePath: row.marketplacePath, pluginName: row.pluginName, remoteMarketplaceName: row.remoteMarketplaceName });
      if (!outcome.ok) setError(outcome.message);
      else if (row.installName) void store.loadPluginCatalog?.({ force: true });
      else { const needs = pluginAppsNeedingAuth(outcome.result); if (needs.apps.length) setFollowUp({ plugin: row.name, ...needs }); }
    }
    catch (reason) { setError(reason?.message || t("The plugin could not be installed.")); }
    finally { setBusy(""); }
  }
  return <section className="cz-builtin" aria-label={t("Available")} data-cz-available="">
    {followUp && <PluginAppsFollowUp plugin={followUp.plugin} apps={followUp.apps} onUse={followUp.onUse} onOpenExternal={onOpenExternal}
      onDone={() => { setFollowUp(null); void store.loadPlugins?.({ force: true }); }} />}
    {rows.length > 0 && <>
    <div className="cz-builtin-head"><h3>{t("Available")}</h3></div>
    <ul className="cz-builtin-list" role="list">
      {rows.map((row) => <li key={row.id} className="cz-builtin-row" data-available-plugin={row.id}>
        <div className="cz-builtin-text">
          <span className="cz-builtin-name"><span className="cz-truncate">{row.name}</span>{row.version && <span className="cz-builtin-version">v{row.version}</span>}</span>
          {row.description && <span className="cz-builtin-description">{row.description}</span>}
          <span className="cz-builtin-source" title={row.marketplacePath}>{row.marketplaceName}</span>
          {row.signInRequired && <span className="cz-builtin-description" data-available-signin="">{coreName ? t("Sign in with your {core} account in Settings › Account to install it.", { core: coreName }) : t("Sign in to your account in Settings › Account to install it.")}</span>}
        </div>
        <div className="cz-builtin-action">
          <Button variant="primary" size="sm" busy={busy === row.id} disabled={!!busy || row.signInRequired === true} onClick={() => install(row)}>{t("Install")}</Button>
        </div>
      </li>)}
    </ul>
    </>}
    {error && <p className="cz-error" role="alert" data-available-error="">{localizeBridgeText(error)}</p>}
  </section>;
}

// Native core: the marketplaces that failed to load (plugin/list marketplaceLoadErrors), as a warning above the
// list. The marketplaces the user added are managed in the Add plugin menu's Manage marketplaces dialog.
export function MarketplacesSection({ loadErrors = [] }) {
  if (!loadErrors.length) return null;
  return <section className="cz-builtin" aria-label={t("Marketplaces")} data-cz-marketplaces="">
    <div className="cz-marketplace-errors" role="alert" data-marketplace-errors="">
      <Icon name="Warning" size={16} />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-primary">{tn(loadErrors.length, "A marketplace couldn’t be loaded, so its plugins aren’t listed.", "{count} marketplaces couldn’t be loaded, so their plugins aren’t listed.", { count: loadErrors.length })}</span>
        {loadErrors.map((entry) => <span key={entry.key} className="text-xs text-muted [overflow-wrap:anywhere]">{entry.path ? `${entry.path}: ` : ""}{entry.message}</span>)}
      </div>
    </div>
  </section>;
}

// c6a2a31c4 ys (:2463-2508): "Remove marketplace?" naming the installed plugins its removal uninstalls.
export function RemoveMarketplaceDialog({ open, plugins, pending = false, onCancel, onConfirm }) {
  return <SourceConfirmationDialog open={open} title={t("Remove marketplace?")} body={marketplaceRemovalDescription(plugins.length)} confirmLabel={t("Remove")} confirmVariant="danger"
    pending={pending} layer={SETTINGS_CONFIRM_LAYER} onCancel={onCancel} onConfirm={onConfirm}>
    {plugins.length > 0 && <ul className="mt-sm max-h-32 list-inside list-disc overflow-y-auto text-body text-secondary" data-marketplace-uninstalls="">
      {plugins.map((plugin) => <li key={plugin.id} className="truncate">{plugin.label}</li>)}
    </ul>}
  </SourceConfirmationDialog>;
}

// c6a2a31c4 Us + bs + xs (:2509-2610, :3151-3189): one marketplace you added: its name and source, and a ⋮ menu with
// Check for updates (marketplace/upgrade, a git marketplace only) and Remove (marketplace/remove, confirmed).
export function MarketplaceRow({ marketplace, plugins, store }) {
  const toasts = useSourceToasts();
  const trigger = useRef(null);
  const [menu, setMenu] = useState(null), [busy, setBusy] = useState(""), [confirm, setConfirm] = useState(false);
  const label = marketplaceLabel(marketplace, plugins);
  const installed = marketplaceInstalledPlugins(plugins, marketplace.name);
  const updated = marketplaceLastUpdated(marketplace);
  async function refresh() {
    setBusy("refresh");
    try { const toast = marketplaceUpgradeToast(await store.upgradeMarketplace(marketplace.name)); toasts?.add?.(toast.text, { variant: toast.variant }); }
    catch { toasts?.add?.(t("Couldn’t check for updates. Try again."), { variant: "danger" }); }
    finally { setBusy(""); }
  }
  async function remove() {
    setConfirm(false); setBusy("remove");
    try {
      const outcome = await store.removeMarketplace(marketplace.name);
      toasts?.add?.(outcome?.ok ? t("Marketplace “{marketplaceName}” removed.", { marketplaceName: label }) : t("Marketplace couldn’t be removed. Try again."), { variant: outcome?.ok ? "neutral" : "danger" });
    } catch { toasts?.add?.(t("Marketplace couldn’t be removed. Try again."), { variant: "danger" }); }
    finally { setBusy(""); }
  }
  const items = [
    ...(marketplace.sourceType === "git" ? [{ key: "refresh", label: t("Check for updates"), icon: "ArrowClockwise", disabled: busy === "refresh", onClick: () => void refresh() }, { separator: true }] : []),
    { key: "remove", label: t("Remove"), icon: "Trash", variant: "danger", onClick: () => setConfirm(true) },
  ];
  const menuLabel = t("More actions for {name}", { name: label });
  return <li className="flex items-start gap-sm rounded-lg border border-strong px-md py-sm" data-testid="manage-marketplace-row" data-marketplace={marketplace.name}>
    <div className="flex min-w-0 flex-1 flex-col gap-xs">
      <span className="min-w-0 truncate text-body font-medium text-primary">{label}</span>
      {marketplace.source && <p className="break-all text-caption text-secondary">{marketplace.source}</p>}
      {updated && <p className="text-caption text-muted" data-marketplace-updated="">{updated}</p>}
    </div>
    <Button ref={trigger} iconOnly icon="DotsVertical" iconSize="auto" size="sm" variant="ghost" busy={!!busy} aria-label={menuLabel}
      {...menuTriggerProps({ open: !!menu, onOpen: (entry) => setMenu({ entry }) })} onClick={() => setMenu(menu ? null : { entry: undefined })} />
    {menu && <SourceMenu.Popup anchor={trigger.current} side="bottom" align="end" label={menuLabel} className="min-w-60" initialHighlight={menu.entry}
      layerBase={Number.parseInt(getComputedStyle(trigger.current).getPropertyValue("--cds-layer-base"), 10) || 0} onClose={() => setMenu(null)}>
      <MenuEntries items={items} />
    </SourceMenu.Popup>}
    <RemoveMarketplaceDialog open={confirm} plugins={installed} onCancel={() => setConfirm(false)} onConfirm={() => void remove()} />
  </li>;
}

// c6a2a31c4 Fs → Is / Ls (:2943-3086): "Manage marketplaces", the marketplaces added with the core on this computer,
// and Done. `marketplaces` = the customize "marketplaces" listing; `plugins` = the installed rows (what removal uninstalls).
export function ManageMarketplacesDialog({ marketplaces, plugins, store, copy = DEFAULT_COPY, onClose }) {
  return <SourceDialog title={t("Manage marketplaces")} size="md" layer={SETTINGS_CONFIRM_LAYER} className="cz-dialog" onClose={onClose}
    description={t("Marketplaces added with {core} on this computer. Removing one also uninstalls its plugins.", { core: copy.name })}
    footer={<Button variant="primary" onClick={onClose}>{t("Done")}</Button>}>
    {marketplaces.length === 0 ? <p className="py-lg text-caption text-muted">{t("No marketplaces added yet.")}</p>
      : <ul role="list" className="mt-md flex flex-col gap-sm" data-manage-marketplaces="">
        {marketplaces.map((marketplace) => <MarketplaceRow key={marketplace.name} marketplace={marketplace} plugins={plugins} store={store} />)}
      </ul>}
  </SourceDialog>;
}

// ccea1f474 Ul (:4668-4750) + Kl: an installed plugin in "Your plugins": its tile, name (with the collision suffix),
// badges, "by {author}" and its description (or skill count); the ⋮ / context menu turns it on or off, updates it
// where the core can, and removes it ("Remove plugin?"). `manager` = pluginManager(...) or null (nothing to manage).
function PluginListRow({ row, display, manager, copy, onOpen }) {
  const toasts = useSourceToasts();
  const [busy, setBusy] = useState(""), [confirm, setConfirm] = useState(false);
  async function run(kind, action) {
    setBusy(kind);
    try { const outcome = await action(); return outcome; }
    catch (reason) { return { ok: false, message: reason?.message }; }
    finally { setBusy(""); }
  }
  const items = [];
  if (manager?.canToggle) items.push({ key: "toggle", label: row.enabled ? t("Turn off") : t("Turn on"), disabled: !!busy,
    onClick: async () => { const outcome = await run("toggle", () => manager.toggle(!row.enabled)); if (outcome && !outcome.ok) toasts?.add?.(outcome.message || t("The plugin change failed."), { variant: "danger" }); } });
  if (manager?.canUpdate) items.push({ key: "update", label: t("Check for updates"), disabled: !!busy,
    onClick: async () => { const outcome = await run("update", () => manager.update()); toasts?.add?.(outcome?.ok ? t("Updated. New sessions use the new version.") : outcome?.message || t("The plugin change failed."), { variant: outcome?.ok ? "neutral" : "danger" }); } });
  if (items.length) items.push({ separator: true });
  items.push({ key: "remove", label: t("Remove"), icon: "Trash", variant: "danger", disabled: !manager?.canRemove || !!busy, onClick: manager?.canRemove ? () => setConfirm(true) : undefined });
  const facts = pluginRowFacts(row);
  const open = () => onOpen(row.id);
  return <ListRow testId="plugins-tabbed-list-row" icon="Plugin" logo={row.icon ? <img src={row.icon} alt="" draggable={false} className="size-full" /> : null}
    drillLabel={t("View {name}", { name: display.name })} onDrill={open} menu={{ itemLabel: display.name, items }}
    trailing={<RowMeta updatedAt={row.updatedAt} />} data-plugin-id={row.id} data-plugin-enabled={row.enabled ? "true" : "false"}>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex min-w-0 items-center gap-xs">
        <span className="truncate text-body-medium text-primary">{display.name}</span>
        {display.suffix && <span className="truncate text-footnote text-muted" data-plugin-suffix="">{display.suffix}</span>}
        <NewBadge reason={recentReason(row)} onClick={open} />
        {row.experimental && <Badge>{t("Experimental")}</Badge>}
        {row.unavailable && <Badge title={row.unavailable}>{t("Unavailable here")}</Badge>}
        {row.loadError && <Badge variant="danger">{t("Failed to load")}</Badge>}
        {!row.enabled && <OffBadge />}
      </div>
      <RowCredit plain credit={facts.credit} segments={[facts.detail]} />
    </div>
    <SourceConfirmationDialog open={confirm} title={t("Remove plugin?")} body={t("This plugin’s commands and skills will no longer be available. You can add it back later.")} confirmLabel={t("Remove")} confirmVariant="danger" pending={busy === "remove"} layer={SETTINGS_CONFIRM_LAYER}
      onCancel={() => setConfirm(false)} onConfirm={async () => {
        const outcome = await run("remove", () => manager.remove()); setConfirm(false);
        toasts?.add?.(outcome?.ok ? t("Plugin removed.") : t("Plugin couldn’t be removed. Try again."), { variant: outcome?.ok ? "neutral" : "danger" });
      }} />
  </ListRow>;
}

function PluginsPage({ store, threadId, cwd, call, focus, onUseSkill, onRevealPath, onNavigate, copy, onRestartCore, onOpenExternal }) {
  const scrollMemory = useRef(new Map());
  const [ownedView, setOwnedView] = useState(null);
  const snapshot = useStore(store);
  const { rows, status, error } = snapshot.plugins.cwd === cwd ? snapshot.plugins
    : { rows: [], status: "loading", error: "" };
  const {query,setQuery,selected,setSelected}=useCatalogNavigation(focus,"pluginId");
  const [adding,setAdding]=useState(false),[managing,setManaging]=useState(false);
  // c6a2a31c4 :5850-5934: the "Your plugins" Show filter (Yi: all / enabled / disabled) and sort (Oa).
  const [show,setShow]=useState("all"),[sort,setSort]=useState(DEFAULT_SORT);
  const pluginOps=snapshot.pluginOps||{install:null,restartRequired:false};
  const banner=copy.pluginManage&&pluginOps.restartRequired?<PluginRestartBanner onRestartCore={onRestartCore}/>:null;
  const [ownedDetail,setOwnedDetail]=useState(null),[ownedError,setOwnedError]=useState(null);
  const [skillPath,setSkillPath]=useState(focus?.skillPath||null),[toggling,setToggling]=useState(false),[toggleError,setToggleError]=useState('');
  const request = useRef(0);
  // `call` must not be an effect dependency: App re-renders on every streamed
  // token, and a fresh arrow there would reset `detail` and re-issue
  // plugin/read on each one.
  const callRef = useRef(call);
  callRef.current = call;
  useEffect(() => { store.loadPlugins({ cwd }); store.loadSkills({ cwd }); }, [store, cwd]);
  // A native core's marketplaces (plugin/list) feed the Available section.
  useEffect(() => { if (copy.nativePlugins) { store.loadPluginCatalog?.({ cwd }); store.loadMarketplaces?.(); } else if (copy.pluginCatalog) store.loadPluginCatalog?.({ cwd }); }, [store, cwd, copy.nativePlugins, copy.pluginCatalog]);
  useLoadFailureLog("plugins", status, error);
  useEffect(() => {setSkillPath(focus?.skillPath||null);setToggleError('');},[focus]);
  const shown = useMemo(() => filterPlugins(rows, { query }), [rows, query]);
  const current = selected ? rows.find((row) => row.id === selected) : null;
  const detail=ownedDetail?.id===current?.id?ownedDetail?.value:null;
  const detailError=ownedError?.id===current?.id?ownedError?.message:'';
  useEffect(() => {
    const id=++request.current;
    if(!current)return;
    let live=true;
    setOwnedDetail(null);setOwnedError(null);
    callRef.current({operation:'plugin-read',pluginName:current.pluginName,marketplacePath:current.marketplacePath,cwd})
      .then(result=>{if(live&&id===request.current){if(result?.plugin)setOwnedDetail({id:current.id,value:result.plugin});else setOwnedError({id:current.id,message:t('Plugin details are unavailable.')});}})
      .catch(reason=>{if(live&&id===request.current)setOwnedError({id:current.id,message:reason.message||t('Plugin details are unavailable.')});});
    return()=>{live=false;};
  },[cwd,current?.id,current?.pluginName,current?.marketplacePath]);
  // The Connectors tab names its servers through the connectors catalog (pe's ue(e)).
  const wantsMcp=!!detail?.mcpServers?.length;
  useEffect(()=>{if(wantsMcp)store.loadMcp({threadId:threadId??null,cwd});},[store,wantsMcp,threadId,cwd]);
  const ownsMcp=snapshot.mcp.cwd===cwd&&snapshot.mcp.threadId===(threadId??null);
  const mcp=useMemo(()=>({rows:ownsMcp&&snapshot.mcp.status==='ready'?snapshot.mcp.rows:[],loading:wantsMcp&&(!ownsMcp||snapshot.mcp.status==='loading'||snapshot.mcp.status==='idle')}),[ownsMcp,wantsMcp,snapshot.mcp.rows,snapshot.mcp.status]);
  const currentSkill=current&&snapshot.skills.status==='ready'&&snapshot.skills.cwd===cwd?snapshot.skills.skills.find(skill=>skill.path===skillPath&&skill.pluginId===current.id):null;
  const file=useSkillFile(callRef,currentSkill?.path||null);
  // Hooks stay above the skill drill's early return (React needs the same hook order on every render).
  const [serverBusy,setServerBusy]=useState(false),[serverError,setServerError]=useState('');
  async function toggleSkill(skill,enabled){setToggleError('');setToggling(true);try{await store.setSkillEnabled(skill.path,enabled);}catch(error){setToggleError(error.message);}finally{setToggling(false);}}
  if(currentSkill)return <div className="cz-page" data-cz-page="plugins" data-detail="">
    <SkillDetail skill={currentSkill} author={current.name} backLabel={current.name} file={file} toggling={toggling} toggleError={toggleError}
      onToggle={toggleSkill} onBack={()=>setSkillPath(null)} onUseSkill={onUseSkill} onRevealPath={onRevealPath} copy={copy}/>
  </div>;
  const closeRemoved=()=>{setSelected(null);setSkillPath(null);};
  // One of the plugin's MCP servers on or off (capabilities.pluginServerToggle: Kimi), then the detail and connectors re-read.
  async function toggleServer(item,enabled){
    if(!current||serverBusy)return;setServerBusy(true);setServerError('');
    try{await callRef.current({operation:'plugin-mcp-server',pluginName:current.pluginName,server:item.server,enabled});
      const result=await callRef.current({operation:'plugin-read',pluginName:current.pluginName,marketplacePath:current.marketplacePath,cwd});
      if(result?.plugin)setOwnedDetail({id:current.id,value:result.plugin});
      void store.loadMcp?.({force:true,threadId:threadId??null,cwd});}
    catch(error){setServerError(localizeBridgeText(error?.message||String(error)));}
    finally{setServerBusy(false);}
  }
  // Detail controls: the codeDesktop/plugin/* manager's, or a native core's uninstall and on/off.
  const manageControls=!current?null:copy.pluginManage?((current.manageable||current.removable)?<PluginManageControls plugin={current} store={store} copy={copy} onRemoved={closeRemoved}/>:null)
    :copy.nativePlugins?<PluginManageControls plugin={current} store={store} copy={copy} onRemoved={closeRemoved}
      actions={pluginManager({plugin:current,store,copy,native:true})}/>:null;
  // Workspace sharing (a native core's local plugin) is a notice row below the header, never in the title row.
  const pluginNotices=current&&copy.nativePlugins&&(current.sourcePath||current.share)&&store.sharePlugin?<PluginShareControls plugin={current} store={store}/>:null;
  if(current)return <div className="cz-page" data-cz-page="plugins" data-detail="">
    {banner}
    <PluginDetail plugin={current} manage={manageControls} notices={pluginNotices} detail={detail} error={detailError}
      skills={snapshot.skills.cwd===cwd&&snapshot.skills.status==='ready'?snapshot.skills.skills:[]}
      view={ownedView?.id===current.id?ownedView:null} onView={value=>setOwnedView({id:current.id,...value})}
      onBack={()=>{setSelected(null);setSkillPath(null);}} onSkill={setSkillPath} scrollMemory={scrollMemory.current} copy={copy} mcp={mcp}
      onConnector={onNavigate?connectorName=>onNavigate('customize-connectors',{connectorName}):undefined}
      onServerToggle={copy.pluginServerToggle?toggleServer:null} serverBusy={serverBusy}/>
    {serverError&&<p className="cz-error" role="alert">{serverError}</p>}
  </div>;
  // Built-in plugins: the entries for the running core, where the core lets the app install bundles.
  const builtin = copy.pluginManage ? filterBuiltinPlugins(BUILTIN_PLUGINS, { query, core: copy.id }) : [];
  // A native core: its marketplaces' plugins that are not installed yet.
  const catalog = snapshot.catalog;
  const available = (copy.nativePlugins || copy.pluginCatalog) && catalog?.cwd === cwd && catalog.status === "ready" ? filterPlugins(catalog.rows, { query }) : [];
  // dsh-client-ui-plugin-manager: Official bundles get their own group, and the profile's fixed core layers are hidden.
  // The rest is "Your plugins" (c6a2a31c4 Nt): grouped by section, filtered by Show, sorted; Show also applies to the
  // Official cards, which are installed plugins too.
  const installed = rows.filter((row) => !row.core);
  const listView = pluginListView({ rows: installed.filter((row) => !row.official), query, show, sort });
  const officialView = pluginListView({ rows: installed.filter((row) => row.official), query, show: listView.show, sort: DEFAULT_SORT });
  const official = officialView.sections.flatMap((run) => run.rows).sort((a, b) => a.name.localeCompare(b.name));
  // Kt: no plugin installed → no list controls; qt: the Show filter hides every row the search found → ba.
  const filteredOut = status === "ready" && listView.searched + officialView.searched > 0 && listView.matched + official.length === 0;
  const empty = status === "ready" && !filteredOut && official.length === 0 && listView.matched === 0 && builtin.length === 0 && available.length === 0;
  const resetBoth = { label: t("Reset filters and sort"), onClear: () => { setShow("all"); setSort(DEFAULT_SORT); } };
  // c6a2a31c4 :6266-6300: the toolbar and its "Your plugins" tab are always drawn; tn (Show and Sort) only while a
  // plugin is installed (!Kt).
  const toolbar = <ListToolbar label={t("Plugins")} tab={t("Your plugins")} tabTestId="plugins-tabbed-list-tab-mine" controls={status === "ready" && installed.length > 0 ? <>
    <PluginShowFilter value={listView.show} onChange={setShow} />
    <SortMenu value={listView.sort} options={listView.sortOptions} onChange={setSort} held={listView.held} clear={listView.resettable ? resetBoth : null} />
  </> : null} />;
  // A native core's header action is the official Add plugin menu (c6a2a31c4 Gs createItems: "Add marketplace", then
  // "Manage marketplaces" once you added one); its marketplaces' plugins are installed from the Available list.
  const marketplaces = snapshot.marketplaces?.rows ?? [];
  const addItems = [{ label: t("Add marketplace"), icon: "Globe", onClick: () => setAdding(true) },
    ...(marketplaces.length > 0 ? [{ label: t("Manage marketplaces"), icon: "Settings", onClick: () => setManaging(true) }] : [])];
  const header = <PageHeader title={t("Plugins")} searchLabel={t("Search plugins")} searchValue={query} onSearch={setQuery} toolbar={toolbar}
    actions={copy.pluginManage ? <Button variant="primary" onClick={() => setAdding(true)} disabled={adding || !!pluginOps.install}>{t("Add plugin")}</Button>
      : copy.nativePlugins ? <MenuButton label={t("Add plugin")} items={addItems}>{t("Add")}</MenuButton> : null} />;
  const addForm = copy.pluginManage && (adding || pluginOps.install) ? <AddPluginForm store={store} install={pluginOps.install} copy={copy} onClose={() => setAdding(false)} />
    : copy.nativePlugins && adding ? <AddMarketplaceDialog store={store} copy={copy} onClose={() => setAdding(false)} /> : null;
  const manageDialog = copy.nativePlugins && managing ? <ManageMarketplacesDialog marketplaces={marketplaces} plugins={rows} store={store} copy={copy} onClose={() => setManaging(false)} /> : null;
  if (status === "error")
    return <div className="cz-page" data-cz-page="plugins">{header}<CatalogLoadError section="plugins" onRetry={() => { store.loadPlugins({ cwd, force: true }); }} /></div>;
  if (status === "loading")
    return <div className="cz-page" data-cz-page="plugins">{header}<PageBody><CatalogSkeleton section="plugins" /></PageBody></div>;
  const openRow = (id) => { setSelected(id); setSkillPath(null); };
  const managerFor = (row) => copy.pluginManage ? ((row.manageable || row.removable) ? pluginManager({ plugin: row, store, copy }) : null)
    : copy.nativePlugins ? pluginManager({ plugin: row, store, copy, native: true }) : null;
  return (
    <div className="cz-page" data-cz-page="plugins">
      {header}
      {manageDialog}
      <PageBody memory={scrollMemory.current} scrollKey={JSON.stringify([cwd, query, listView.show, listView.sort])}>
          {banner}
          {addForm}
          <OfficialPlugins rows={official} store={store} manage={!!copy.pluginManage} copy={copy} onOpen={openRow} />
          {builtin.length > 0 && <BuiltinPlugins entries={builtin} rows={rows} store={store} copy={copy} />}
          <AvailablePlugins rows={available} store={store} onOpenExternal={onOpenExternal} coreName={copy.vendor} />
          {copy.nativePlugins && <MarketplacesSection loadErrors={catalog?.cwd === cwd ? catalog.loadErrors ?? [] : []} />}
          {/* c6a2a31c4 :6110-6200 oe "plugins-tabbed-list-mine": one titled run per section (ma, with its count), or
              one untitled run while a sort is held. */}
          {listView.matched > 0 && <ListContainer testId="plugins-tabbed-list-mine">
            {listView.sections.map(({ section, rows: runRows }) => <section key={section ?? "flat"} className="flex flex-col" data-cz-list-section={section ?? "flat"}>
              {section !== null && <SectionHeader section={section} label={sectionLabel(section, copy)} count={runRows.length} />}
              {runRows.map((row) => <PluginListRow key={row.id} row={row} display={listView.names.get(row.id) ?? { name: row.name }} manager={managerFor(row)} copy={copy} onOpen={openRow} />)}
            </section>)}
          </ListContainer>}
          {filteredOut && <NoMatches onReset={() => setShow("all")} />}
          {/* customize-plugins :1409-1430: Ee with ObjectPuzzle (no Directory actions locally). */}
          {empty && <EmptyState searchValue={query.trim()} noMatchMessage={t("No plugins match your search")} pictogram="ObjectPuzzle" emptyMessage={copy.pluginsEmpty} />}
      </PageBody>
    </div>
  );
}

// `core` is boot.core (engine, capabilities, configPath); without one the
// pages keep the Codex copy and every control.
// `mcpDefinitions` is desktop-settings-read's (command/url/args/env names) for
// the connector drill's LocalConfig.
export function SourceCustomize({ section, store, threadId, cwd, call, core, onUseSkill, onOpenExternal, onRevealPath, onEditConfig, onNavigate, focus, mcpDefinitions, mcpServers, onRestartCore, onHarnessCall }) {
  const copy = useMemo(() => customizeCore(core), [core]);
  if (section === "customize-skills") return <SkillsPage store={store} cwd={cwd} call={call} onUseSkill={onUseSkill} onRevealPath={onRevealPath} onNavigate={onNavigate} focus={focus} copy={copy} />;
  if (section === "customize-connectors") return <ConnectorsPage store={store} threadId={threadId} cwd={cwd} onOpenExternal={onOpenExternal} call={call} onNavigate={onNavigate} focus={focus} copy={copy} onEditConfig={onEditConfig} mcpDefinitions={mcpDefinitions} mcpServers={mcpServers} onHarnessCall={onHarnessCall} onRestartCore={onRestartCore} />;
  if (section === "customize-plugins") return <PluginsPage store={store} threadId={threadId} cwd={cwd} call={call} focus={focus} onUseSkill={onUseSkill} onRevealPath={onRevealPath} onNavigate={onNavigate} copy={copy} onRestartCore={onRestartCore} onOpenExternal={onOpenExternal} />;
  return null;
}
