import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { SourceMenu, useMenuPopup } from './source-menu.jsx';
import { EnvironmentStarAction } from './generated/code-current/environment-menu-controls.mjs';
import {
  EnvironmentPickerRow, EnvironmentPickerRows, EnvironmentPickerNew, EnvironmentPickerComputer, EnvironmentPickerNoMatches, environmentPresetKey,
} from './generated/code-current/environment-menu-rows.mjs';
import { environmentStarKeys, starredIncludes, thisComputerLabel, thisComputerStarKey } from './generated/code-current/environment-picker-keys.mjs';
import { useStableEnvironmentOrder } from './generated/code-start/view.mjs';
import { EnvironmentSearchablePopup } from './source-environment-folder-adapters.jsx';
import { bindEnvironmentStars, localEnvironmentAvailable, toggleEnvironmentStar } from './source-environment-menu-adapters.jsx';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { isMacPlatform, presetChordTarget, presetShortcut } from './shortcuts-dialog-model.mjs';
import { OPEN_LAYER_SELECTOR } from './pane-keys-model.mjs';
import './source-environment-menu.css';

// (W14-code r8 css8-classic-context-row-dead, E95: SourceLocalEnvironmentMenu, the classic context row's Local pill menu,
// is gone with that row; the presets environment bar's picker is SourceSavedEnvironmentMenu below.)

const noop = () => {};
// The picker's places in T2's order: local and SSH presets by lastUsedAt, newest first (as SourceSavedEnvironmentMenu).
const sortedPlaces = environments => environments.filter(row => ['local', 'ssh'].includes(row.target?.kind ?? 'local'))
  .toSorted((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));

/**
 * W14-code r3 r3-shared-02: cc43287c9 h2's `mr` (the places a ⌘⌥1…9 chord picks, in the menu's order), local transport:
 * the Starred places (`Dn`, deduplicated by key; This computer only when it is available, `un`), then `dn && (hr(vr),
 * Ln.forEach(e => hr(yr(e))))` — This computer and the first environment not starred (`Ln = ln.filter(In).slice(0, Fn)`,
 * Fn = 1). A place is {key, name, selected, pick} (vr: Ua / Ja(ne) / gr / _r; yr: w8(e) / e.name / e.id === selectedId /
 * onSelect(e.id)). No cloud, bridge, pool, WSL or SSH host places here.
 */
export function environmentChordPlaces({ environments = [], starred = [], selectedId, onSelect = noop, onLocal = noop, computerName, computerAvailable = true }) {
  const items = sortedPlaces(environments);
  const places = [], keys = new Set();
  const add = place => { if (!keys.has(place.key)) { keys.add(place.key); places.push(place); } };
  const computer = { key: thisComputerStarKey, name: computerName, selected: !selectedId, pick: computerAvailable ? onLocal : null };
  const environment = item => ({ key: environmentPresetKey(item), name: item.name, selected: item.id === selectedId, pick: () => onSelect(item.id) });
  for (const key of starred) {
    const id = key.slice(key.indexOf(':') + 1);
    const item = key.startsWith('preset:') || key.startsWith('machine-preset:') ? items.find(entry => entry.id === id) : undefined;
    if (key === thisComputerStarKey) { if (computerAvailable) add(computer); }
    else if (item) add(environment(item));
  }
  const starredKeys = new Set(keys);
  add(computer);
  for (const item of items.filter(entry => !starredKeys.has(environmentPresetKey(entry))).slice(0, 1)) add(environment(item));
  return places;
}

// c8's `nm(u.document, null, { skipIdleToasts: !0, ownPopup: i })` (pane-keys-model.mjs openLayer's sz): another open
// menu, listbox or dialog (an idle toast aside) holds the keys; the picker's own popup, while it has the focus, does not.
function otherLayerOpen(doc, ownPopup) {
  if (!doc) return false;
  if (doc.getElementById?.('root')?.inert === true) return true;
  for (const layer of doc.querySelectorAll(OPEN_LAYER_SELECTOR)) {
    if (ownPopup && (ownPopup === layer || ownPopup.contains(layer) || layer.contains(ownPopup))) continue;
    if (layer.closest('[data-cds="Toast"]') && !layer.contains(doc.activeElement)) continue;
    if (typeof layer.checkVisibility !== 'function' || layer.checkVisibility()) return true;
  }
  return false;
}

/**
 * W14-code r3 r3-shared-02: cc43287c9 c8 for the start page's environment picker. While `shortcutsActive` (h2's
 * `chords.active`: the picker is shown and its pane owns the global shortcuts) a capture-phase window keydown takes
 * shared-46's selectPreset1…9 / newPreset (⌘⌥1…9 / ⌘⌥0 on a Mac): `!r || nm(…) || (e.preventDefault(),
 * e.stopPropagation(), e.repeat || (i !== null && x(), r()))` — the Nth place (not one that cannot be picked) or New
 * environment, closing the picker first when it is open and focused. `shortcutAt(index)` / `newShortcut` label the
 * rows; `chordPicked` is the place a chord picked once it is the selection, for the "{name} selected" status.
 * The places are environmentChordPlaces over `environments` / `starred` / `selectedId` (onSelect, onLocal pick them).
 * `menu`: {rootPopup() (the open picker popup or null), close()}.
 */
export function useEnvironmentChords({ environments, starred, selectedId, onSelect, onLocal, onNew, shortcutsActive = false, namingActive = false, menu }) {
  const intl = useStartIntl();
  // un: This computer is always available and never locked here (EnvironmentPickerBody's `available`, `locked={false}`).
  const places = environmentChordPlaces({ environments, starred, selectedId, onSelect, onLocal, computerName: thisComputerLabel(intl) });
  const mac = isMacPlatform();
  const shortcutAt = index => (shortcutsActive && index < 9 ? presetShortcut(index, mac) : undefined);
  const newShortcut = shortcutsActive ? presetShortcut('new', mac) : undefined;
  const listening = newShortcut !== undefined && !namingActive;
  const selected = places.find(place => place.selected)?.key;
  const [picked, setPicked] = useState(null);
  if (picked !== null) {
    if (picked.id === selected) { if (!picked.reached) setPicked({ ...picked, reached: true }); }
    else if (picked.reached) setPicked(null);
  }
  // g: an index's action (a place that can be picked records the pick for the status), "new" onNew.
  const action = target => {
    if (target === 'new') return onNew ?? null;
    const place = places[target];
    return place && place.pick ? () => { setPicked({ id: place.key, name: place.name, reached: false }); place.pick(); } : null;
  };
  const latest = useRef(null);
  latest.current = { action, menu };
  useEffect(() => {
    if (!listening || typeof window === 'undefined') return undefined;
    const view = window;
    const keydown = event => {
      if (event.defaultPrevented || event.isComposing || (!mac && event.getModifierState?.('AltGraph'))) return;
      const target = presetChordTarget(event, mac);
      const run = target === null ? null : latest.current.action(target);
      // y: the picker's popup only while it holds the focus.
      const popup = latest.current.menu?.rootPopup?.() ?? null;
      const own = popup?.contains(view.document.activeElement) ? popup : null;
      if (!run || otherLayerOpen(view.document, own)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.repeat) return;
      if (own !== null) latest.current.menu?.close?.();
      run();
    };
    view.addEventListener('keydown', keydown, true);
    return () => view.removeEventListener('keydown', keydown, true);
  }, [listening, mac]);
  const chordPicked = picked !== null && picked.id === selected ? { id: picked.id, name: picked.name } : null;
  // D: a pick from the menu itself drops the chord status.
  const pickFromMenu = run => { setPicked(null); run(); };
  // Ar: a row's chord, by its place key.
  const shortcutFor = key => { const index = places.findIndex(place => place.key === key); return index === -1 ? undefined : shortcutAt(index); };
  return { shortcutAt, newShortcut, chordPicked, pickFromMenu, shortcutFor };
}

/** h2 `xi`: the sr-only status beside the picker (outside its popup), "{name} selected" after a chord pick. */
export function EnvironmentChordStatus({ picked }) {
  return <span role="status" className="sr-only">
    {picked != null && <StartMessage defaultMessage="{name} selected" id="quKofZWERy" values={{ name: picked.name }} />}
  </span>;
}

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
 * Host: no remote groups (cloud, Remote Control, SSH, WSL, Run in), no default-environment offer (I0). W14-code r3
 * r3-shared-02: `chords` is main.jsx's useEnvironmentChords (c8): its `shortcutFor` labels This computer, the Starred
 * rows and the first environment (Ar; More's rows take none, `Kr(e, !1)`), `newShortcut` New environment (zae `shortcut:
 * Or`); the "{name} selected" status (xi) sits beside the picker, outside this popup (EnvironmentChordStatus). D14: the recent folders
 * (`folders`, the lH Recent rows and Open folder…) follow the environments inside More. The load error stays above New
 * environment.
 * `popup` are the SourceMenu.Popup props the opener supplies (anchor, side, align, label, onClose).
 */
export function SourceSavedEnvironmentMenu({ popup = {}, environments = [], starred = [], selectedId, onSelect, onStar, onEdit, onCreate, onLocal, onVariables, folders, error, chords }) {
  // XB: the starred store is the saved-environments file; the open picker binds its star op for Zr (k0 / This computer).
  bindEnvironmentStars(onStar);
  const intl = useStartIntl();
  // T2 c / D / O: local and SSH presets by lastUsedAt (newest first), p0's stable order, rows {id, icon (sh), name, target}.
  const sorted = useMemo(() => sortedPlaces(environments), [environments]);
  const usedAt = useMemo(() => new Map(sorted.map(row => [row.id, row.lastUsedAt ?? 0])), [sorted]);
  const order = useStableEnvironmentOrder(usedAt, true);
  const items = useMemo(() => {
    const rows = new Map(sorted.map(row => [row.id, row]));
    return order.flatMap(id => { const row = rows.get(id); return row ? [{ id: row.id, icon: 'Laptop', name: row.name, target: row.target }] : []; });
  }, [order, sorted]);
  return <EnvironmentSearchablePopup {...popup} className={PICKER_POPUP_CLASS}
    searchLabel={intl.formatMessage({ defaultMessage: 'Search environments…', id: 'FNP5kSfpMQ' })}>
    {query => <EnvironmentPickerBody query={query} items={items} starred={starred} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit}
      onCreate={onCreate} onLocal={onLocal} onVariables={onVariables} folders={folders} error={error} chords={chords} />}
  </EnvironmentSearchablePopup>;
}

/** h2's body inside the open SearchablePopup for one query (exported for the source tests). */
export function EnvironmentPickerBody({ query, items, starred, selectedId, onSelect, onEdit, onCreate, onLocal, onVariables, folders, error, chords }) {
  const popup = useMenuPopup();
  const intl = useStartIntl();
  // Un: close the picker (a row's edit and New environment close it before opening their dialog).
  const closeMenu = () => popup?.close('item-click');
  const environments = { items, selectedId: selectedId ?? undefined, onSelect, onEdit, onNew: onCreate };
  // Kn: e2 for the start page (grouped; Mt: the local environment is available and not locked). The settings action
  // shows once this machine has variables of its own (LR inside e2).
  const computerSelected = !selectedId;
  const thisComputer = <EnvironmentPickerComputer grouped inStartPage checked={computerSelected} shortcut={chords?.shortcutFor(thisComputerStarKey)} available desktopOnlyHint={false}
    locked={false} downloadCta={false} onDownload={noop} onPick={computerSelected ? noop : onLocal}
    settingsOffered={localEnvironmentAvailable()} machineVarsQueried onOpenSettings={onVariables}
    star={<EnvironmentStarAction starred={starred.includes(thisComputerStarKey)} onToggle={() => toggleEnvironmentStar(thisComputerStarKey)} />} />;
  // Kr(e, t): an environment row, with its chord (Ar(w8(e))) unless it sits in More (`t = !1`).
  const row = (item, chord = true) => <EnvironmentPickerRow key={item.id} item={item} environments={environments} closeMenu={closeMenu}
    starred={starredIncludes(starred, environmentStarKeys(item))} shortcut={chord ? chords?.shortcutFor(environmentPresetKey(item)) : undefined} />;
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
      {first.map(item => row(item))}
      {(rest.length > 0 || !!folders) && <SourceMenu.Submenu>
        <SourceMenu.SubmenuTrigger icon="Laptop" hint={rest.length > 0 ? intl.formatNumber(rest.length) : undefined} data-testid="env-picker-more">
          <StartMessage defaultMessage="More" id="Lm50vatbmX" />
        </SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup className={MORE_POPUP_CLASS}>
          {rest.map(item => row(item, false))}
          {folders && <>{rest.length > 0 && <SourceMenu.Separator />}{folders}</>}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>}
    </SourceMenu.Group>
    {error && <div className="text-footnote text-danger" role="alert">{error}</div>}
    <EnvironmentPickerNew environments={environments} closeMenu={closeMenu} shortcut={chords?.newShortcut} />
  </>;
}
