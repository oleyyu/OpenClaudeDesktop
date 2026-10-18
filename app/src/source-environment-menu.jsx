import React, { Fragment, useMemo } from 'react';
import { SourceMenu, useMenuPopup } from './source-menu.jsx';
import { EnvironmentSettingsAction, EnvironmentStarAction, EnvironmentActionHint, environmentOpenKey } from './generated/code-current/environment-menu-controls.mjs';
import {
  EnvironmentPickerRow, EnvironmentPickerRows, EnvironmentPickerNew, EnvironmentPickerComputer, EnvironmentPickerNoMatches, environmentPresetKey,
} from './generated/code-current/environment-menu-rows.mjs';
import { environmentStarKeys, starredIncludes, thisComputerLabel, thisComputerStarKey } from './generated/code-current/environment-picker-keys.mjs';
import { useStableEnvironmentOrder } from './generated/code-start/view.mjs';
import { EnvironmentSearchablePopup } from './source-environment-folder-adapters.jsx';
import { bindEnvironmentStars, localEnvironmentAvailable, toggleEnvironmentStar } from './source-environment-menu-adapters.jsx';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';
import './source-environment-menu.css';

// cc43287c9 lZ/Rt, local transport branch (the classic env pill's Local menu). Menu lifecycle and environment
// persistence stay with the host; the settings action and its directional hint are c227f4d5e BK/HK.
export function SourceLocalEnvironmentMenu({ onOpenSettings }) {
  const openKey = environmentOpenKey();
  return <SourceMenu.Item checked checkedRole="radio" data-testid="env-picker-local" className="source-env-menu-row"
    onKeyDown={event => {
      if (event.key === openKey) { event.preventDefault(); event.stopPropagation(); onOpenSettings(); }
    }} trailing={<EnvironmentSettingsAction onOpen={onOpenSettings} />}>
    {t('Local')}<EnvironmentActionHint />
  </SourceMenu.Item>;
}

const noop = () => {};
// h2 Yn: a group's More submenu popup (s2) and the start-page SearchablePopup's own class (2.42304.0 cc43287c9).
const MORE_POPUP_CLASS = 'environment-picker-more min-w-[220px]';
const PICKER_POPUP_CLASS = 'environment-picker-popup min-w-[260px]';

/**
 * The start page's environment picker: cc43287c9 h2 with `environments` (I) set, local transport only (research/home-env.md
 * §2.7). The rows are the generated originals (k0 environment, e2 This computer, A0 a kind's rows, j0 New environment,
 * p2 No matches) over the c227f4d5e row actions; this body is h2's arrangement of them:
 * - a query lists This computer when its label matches, then the matching environments (A0, no trailing separator);
 * - otherwise the Starred group (the starred places in starring order: This computer, environments), a separator, then
 *   the Local group: This computer, the first environment not starred, and More (hint: how many it holds) with the rest,
 *   then New environment;
 * - the order is T2's: environments by lastUsedAt, newest first, kept stable by p0 while the picker is open;
 * - the search field is the SearchablePopup's header (shared-frame yC), fixed above the scrolling rows.
 * Host: no remote groups (cloud, Remote Control, SSH, WSL, Run in), no default-environment offer (I0), no chord
 * shortcuts (g0: the rows carry no shortcut and the "{name} selected" status never fills). D14: the recent folders
 * (`folders`, the lH Recent rows and Open folder…) follow the environments inside More. The load error stays above New
 * environment.
 * `popup` are the SourceMenu.Popup props the opener supplies (anchor, side, align, label, onClose).
 */
export function SourceSavedEnvironmentMenu({ popup = {}, environments = [], starred = [], selectedId, onSelect, onStar, onEdit, onCreate, onLocal, onVariables, folders, error }) {
  // XB: the starred store is the saved-environments file; the open picker binds its star op for Zr (k0 / This computer).
  bindEnvironmentStars(onStar);
  const intl = useStartIntl();
  // T2 c / D / O: local and SSH presets by lastUsedAt (newest first), p0's stable order, rows {id, icon (sh), name, target}.
  const sorted = useMemo(() => environments.filter(row => ['local', 'ssh'].includes(row.target?.kind ?? 'local'))
    .toSorted((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)), [environments]);
  const usedAt = useMemo(() => new Map(sorted.map(row => [row.id, row.lastUsedAt ?? 0])), [sorted]);
  const order = useStableEnvironmentOrder(usedAt, true);
  const items = useMemo(() => {
    const rows = new Map(sorted.map(row => [row.id, row]));
    return order.flatMap(id => { const row = rows.get(id); return row ? [{ id: row.id, icon: 'Laptop', name: row.name, target: row.target }] : []; });
  }, [order, sorted]);
  // g0 chordPicked: set when a chord picks a place; this host has no chord shortcuts.
  const chordPicked = null;
  return <>
    <EnvironmentSearchablePopup {...popup} className={PICKER_POPUP_CLASS}
      searchLabel={intl.formatMessage({ defaultMessage: 'Search environments…', id: 'FNP5kSfpMQ' })}>
      {query => <EnvironmentPickerBody query={query} items={items} starred={starred} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit}
        onCreate={onCreate} onLocal={onLocal} onVariables={onVariables} folders={folders} error={error} />}
    </EnvironmentSearchablePopup>
    <span role="status" className="sr-only">
      {chordPicked !== null && <StartMessage defaultMessage="{name} selected" id="quKofZWERy" values={{ name: chordPicked.name }} />}
    </span>
  </>;
}

/** h2's body inside the open SearchablePopup for one query (exported for the source tests). */
export function EnvironmentPickerBody({ query, items, starred, selectedId, onSelect, onEdit, onCreate, onLocal, onVariables, folders, error }) {
  const popup = useMenuPopup();
  const intl = useStartIntl();
  // Un: close the picker (a row's edit and New environment close it before opening their dialog).
  const closeMenu = () => popup?.close('item-click');
  const environments = { items, selectedId: selectedId ?? undefined, onSelect, onEdit, onNew: onCreate };
  // Kn: e2 for the start page (grouped; Mt: the local environment is available and not locked). The settings action
  // shows once this machine has variables of its own (LR inside e2).
  const computerSelected = !selectedId;
  const thisComputer = <EnvironmentPickerComputer grouped inStartPage checked={computerSelected} available desktopOnlyHint={false}
    locked={false} downloadCta={false} onDownload={noop} onPick={computerSelected ? noop : onLocal}
    settingsOffered={localEnvironmentAvailable()} machineVarsQueried onOpenSettings={onVariables}
    star={<EnvironmentStarAction starred={starred.includes(thisComputerStarKey)} onToggle={() => toggleEnvironmentStar(thisComputerStarKey)} />} />;
  // Jn: an environment row (no chord shortcut here).
  const row = item => <EnvironmentPickerRow key={item.id} item={item} environments={environments} closeMenu={closeMenu}
    starred={starredIncludes(starred, environmentStarKeys(item))} />;
  if (query) {
    // dr: the matching places, else p2.
    const matches = name => (name ?? '').toLowerCase().includes(query);
    const computer = matches(thisComputerLabel(intl));
    if (!items.some(item => matches(item.name)) && !computer) return <EnvironmentPickerNoMatches />;
    return <>
      {computer && thisComputer}
      <EnvironmentPickerRows kind="local" environments={environments} closeMenu={closeMenu} starred={starred} query={query} placesFollow={false} />
    </>;
  }
  // Xt: the starred places, deduplicated by their listed key (a2 for an environment).
  const listed = [], keys = new Set();
  for (const key of starred) {
    const id = key.slice(key.indexOf(':') + 1);
    const item = key.startsWith('preset:') || key.startsWith('machine-preset:') ? items.find(entry => entry.id === id) : undefined;
    const entry = key === thisComputerStarKey ? { key, kind: 'computer' } : item ? { key: environmentPresetKey(item), kind: 'environment', item } : null;
    if (entry && !keys.has(entry.key)) { keys.add(entry.key); listed.push(entry); }
  }
  // tn / nn: the first environment not starred stays in the group; More holds the rest (starred ones included).
  const first = items.filter(item => !keys.has(environmentPresetKey(item))).slice(0, 1);
  const rest = items.filter(item => !first.includes(item));
  return <>
    {listed.length > 0 && <>
      <SourceMenu.Group>
        <SourceMenu.GroupLabel><StartMessage defaultMessage="Starred" id="V7cUPvWFo3" /></SourceMenu.GroupLabel>
        {listed.map(entry => <Fragment key={entry.key}>{entry.kind === 'computer' ? thisComputer : row(entry.item)}</Fragment>)}
      </SourceMenu.Group>
      <SourceMenu.Separator />
    </>}
    <SourceMenu.Group>
      <SourceMenu.GroupLabel><StartMessage defaultMessage="Local" id="MpsZ34EpZH" /></SourceMenu.GroupLabel>
      {thisComputer}
      {first.map(row)}
      {(rest.length > 0 || !!folders) && <SourceMenu.Submenu>
        <SourceMenu.SubmenuTrigger icon="Laptop" hint={rest.length > 0 ? intl.formatNumber(rest.length) : undefined} data-testid="env-picker-more">
          <StartMessage defaultMessage="More" id="Lm50vatbmX" />
        </SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup className={MORE_POPUP_CLASS}>
          {rest.map(row)}
          {folders && <>{rest.length > 0 && <SourceMenu.Separator />}{folders}</>}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>}
    </SourceMenu.Group>
    {error && <div className="text-footnote text-danger" role="alert">{error}</div>}
    <EnvironmentPickerNew environments={environments} closeMenu={closeMenu} />
  </>;
}
