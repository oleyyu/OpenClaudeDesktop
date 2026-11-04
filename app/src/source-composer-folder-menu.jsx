// W14-code composer-01 / composer-02: the environment bar's folder chip menu, as 3.6556.2 cc43287c9 builds it for a
// local draft with presets on (hse → renderFolderTrigger `O` (:37876) → P8 with the footer `be`):
//   - P8 (:28247-28432): the Recent group (GroupLabel "Recent" iXpep1vGVo, Yoe rows: title = the path, labelDir auto,
//     description = the parent when two rows share a basename, no radio unless the folder is optional), a separator,
//     "Open folder…" (YzhKoa+aW/), then — without a query — a separator and the footer. More than eight recents
//     (`t.length > 8`) make the popup a SearchablePopup ("Search folders…" biG+krWPOa; a query filters every recent by
//     its path and ~ path, "No matches" 96GJ5wSQam in `px-md py-sm text-footnote text-muted-as-secondary`; Enter picks
//     the first match, else browses); otherwise the first eight show.
//   - hse `J` (:29055-29082): the extra folders under GroupLabel "Also included" (QltjY7DzbP), one Item each
//     (labelDir auto, title = the ~ path, data-testid environment-bar-extra-folder, trailing the X glyph xs,
//     aria-label "Remove folder {name}" +4tCWjrGJc with the ~ path; a click removes it).
//   - hse `be` (:29084-29097): that group, a separator when both are there, then `use` (:28638-28700): the Branch
//     submenu (SubmenuTrigger hint = the branch, hintDir auto, data-testid environment-bar-branch, "Branch" 8dAyZIUh9C;
//     its SearchablePopup "Search branches…" NNBHaPuMiG, rows lse = radio Items labelDir auto, empty "No matching
//     branches" ueb6I/aqiQ) when there are branches, and the "Worktree" Item (Cqp4C6aPD2: keepOpen, data-testid
//     environment-bar-worktree, trailing the CDS Checkbox xs, tabIndex -1, aria-label "Worktree").
// Host: the popup is the host SourceMenu.Popup (EnvironmentSearchablePopup = shared-frame IT over it); the rows come
// from recent-folders-model.mjs (the folder is required in Code, so no "No folder" row and no radio, P8 `h` unset).
// Imported by main.jsx only (not the composer graph), so view-tabs comes through the facade (R6 / E41).
import React from 'react';
import { CdsCheckbox, CdsIcon } from './generated/view-tabs/index.js';
import { homeRelativePath } from './generated/code-start/home-path.mjs';
import { SourceMenu } from './source-menu.jsx';
import { EnvironmentSearchablePopup } from './source-environment-folder-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';

/** P8 `t.length > 8`: past eight recents the popup searches. */
export const FOLDER_MENU_SEARCH_AFTER = 8;
const EMPTY_CLASS = 'px-md py-sm text-footnote text-muted-as-secondary';

/** P8 `re`: the rows a (lowercased) query shows — every match, or the first eight without one. */
export function folderMenuRows(rows = [], query = '') {
  if (!query) return rows.slice(0, FOLDER_MENU_SEARCH_AFTER);
  return rows.filter(({ path }) => [path, homeRelativePath(path)].some((value) => String(value).toLowerCase().includes(query)));
}

/** hse `J`: the extra folders' group (null without any). */
export function AlsoIncludedGroup({ folders = [], onRemove }) {
  if (!folders.length) return null;
  return <SourceMenu.Group>
    <SourceMenu.GroupLabel>{t('Also included')}</SourceMenu.GroupLabel>
    {folders.map((path) => {
      const shown = homeRelativePath(path);
      return <SourceMenu.Item key={path} labelDir="auto" title={shown} data-testid="environment-bar-extra-folder"
        trailing={<CdsIcon name="X" size="xs" />} aria-label={t('Remove folder {name}', { name: shown })}
        onClick={() => onRemove?.(path)}>{path.split('/').filter(Boolean).pop() || path}</SourceMenu.Item>;
    })}
  </SourceMenu.Group>;
}

function BranchSubmenu({ branch = '', branches = [], disabled = false, onSelect }) {
  if (!branches.length) return null;
  return <SourceMenu.Submenu>
    <SourceMenu.SubmenuTrigger hint={branch || undefined} disabled={disabled} data-testid="environment-bar-branch">{t('Branch')}</SourceMenu.SubmenuTrigger>
    <EnvironmentSearchablePopup searchLabel={t('Search branches…')}>
      {(query) => {
        const shown = branches.filter((name) => name.toLowerCase().includes(query));
        return shown.length === 0
          ? <div className={EMPTY_CLASS}>{t('No matching branches')}</div>
          : shown.map((name) => <SourceMenu.Item key={name} checked={name === branch} checkedRole="radio" labelDir="auto"
            onClick={() => onSelect?.(name)}>{name}</SourceMenu.Item>);
      }}
    </EnvironmentSearchablePopup>
  </SourceMenu.Submenu>;
}

/** `use`: the Branch submenu and the Worktree row. */
export function CheckoutRows({ checkout, worktree }) {
  const supported = worktree?.supported !== false, checked = !!worktree?.enabled && supported;
  return <>
    <BranchSubmenu branch={checkout.branch} branches={checkout.branches} disabled={checkout.branchDisabled} onSelect={checkout.onSelectBranch} />
    <SourceMenu.Item keepOpen disabled={!supported} data-testid="environment-bar-worktree" onClick={() => worktree?.set?.(!worktree.enabled)}
      trailing={<CdsCheckbox size="xs" checked={checked} disabled={!supported} tabIndex={-1} aria-label={t('Worktree')} />}>{t('Worktree')}</SourceMenu.Item>
  </>;
}

/**
 * The folder chip's menu. `popup` = the SourceMenu.Popup placement (anchor, side, align, label, onClose); `rows` =
 * recentFolderRows; `checkout` = {branch, branches, branchDisabled, onSelectBranch} for a repository, else null.
 */
export function SourceComposerFolderMenu({ popup, rows = [], onSelectFolder, onBrowse, extraFolders = [], onRemoveFolder, checkout = null, worktree = null }) {
  const footer = checkout || extraFolders.length ? <>
    <AlsoIncludedGroup folders={extraFolders} onRemove={onRemoveFolder} />
    {checkout && extraFolders.length > 0 && <SourceMenu.Separator />}
    {checkout && <CheckoutRows checkout={checkout} worktree={worktree} />}
  </> : null;
  const body = (query) => {
    const shown = folderMenuRows(rows, query);
    return <>
      {query && shown.length === 0 && <div className={EMPTY_CLASS}>{t('No matches')}</div>}
      {shown.length > 0 && <>
        <SourceMenu.Group>
          {!query && <SourceMenu.GroupLabel>{t('Recent')}</SourceMenu.GroupLabel>}
          {shown.map((row) => <SourceMenu.Item key={row.path} title={row.path} description={row.description} labelDir="auto"
            data-recent-folder={row.path} onClick={() => onSelectFolder?.(row.path)}>{row.label}</SourceMenu.Item>)}
        </SourceMenu.Group>
        <SourceMenu.Separator />
      </>}
      <SourceMenu.Item onClick={() => onBrowse?.()}>{t('Open folder…')}</SourceMenu.Item>
      {footer && !query && <><SourceMenu.Separator />{footer}</>}
    </>;
  };
  if (rows.length > FOLDER_MENU_SEARCH_AFTER) {
    return <EnvironmentSearchablePopup {...popup} searchLabel={t('Search folders…')}
      onSubmitQuery={(query) => { const first = folderMenuRows(rows, query.toLowerCase())[0]; if (first) onSelectFolder?.(first.path); else onBrowse?.(); }}>
      {(query) => body(query)}
    </EnvironmentSearchablePopup>;
  }
  return <SourceMenu.Popup {...popup}>{body('')}</SourceMenu.Popup>;
}
