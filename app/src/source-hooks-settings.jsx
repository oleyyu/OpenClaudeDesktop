// Settings › Customize › Hooks: the running core's lifecycle hooks (hooks/list through the customize 'hooks' operation),
// by event, as Codex's /hooks browser shows them. On Codex a hook that is new or changed since it was trusted doesn't
// run until it is trusted here (Trust / Trust all), and each can be switched off (customize 'hooks-state' →
// config.toml hooks.state). Another core's hooks are listed read-only: they live in its own settings.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SourceSwitch } from './source-switch.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { Badge, CatalogSkeleton, EmptyState, ListTable, PageHeader } from './source-customize.jsx';
import { hooksView, hookTrustLabel, hooksReviewSummary } from './hooks-model.mjs';
import { coreForEngine, coreName } from '../electron/core-registry.mjs';
import { localizeBridgeText } from './bridge-text-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import './hooks-settings.css';

// One row per hook, its event's name first; the search matches the event, matcher, command and source.
export function hookRows(view, query = '') {
  const term = query.trim().toLowerCase();
  const rows = (view?.groups ?? []).flatMap((group) => group.hooks.map((hook) => ({ ...hook, eventName: group.name, eventDescription: group.description })));
  if (!term) return rows;
  return rows.filter((row) => [row.eventName, row.eventDescription, row.matcher, row.what, row.source, row.pluginId, row.sourcePath]
    .some((value) => typeof value === 'string' && value.toLowerCase().includes(term)));
}

// Drawn like its Customize siblings (customize-page-shell-current.js): the header row with the h2 title, the collapsible
// search and the page's actions (an icon-only ghost Refresh with its tooltip), the intro as the muted lede, a
// CatalogSkeleton while loading, page-shell Ee (NodeShapes pictogram + secondary copy) when there is nothing, and the
// hooks in the CDS ListTable (Event / Matcher / Command / Source, Trust and the switch in the trailing cell) with the
// shared Badge for Needs review and Managed.
export function SourceHooksSettings({ boot, engine, customize, cwd, initialState = null }) {
  const call = customize?.call;
  const native = coreForEngine(typeof engine === 'string' ? engine : engine?.engine).kind === 'native';
  // A bridge core that switches its own hooks (capabilities.hooksToggle: Gemini) gets each hook's switch, no review.
  const switchable = native || boot?.core?.capabilities?.hooksToggle === true;
  const [state, setState] = useState(() => initialState ?? { status: 'loading', view: null, error: '' });
  const [busy, setBusy] = useState(''), [rowError, setRowError] = useState(null), [query, setQuery] = useState('');
  const load = useCallback(async () => {
    if (!call) { setState({ status: 'error', view: null, error: t('Connect to a core to see its hooks.') }); return; }
    setState((current) => ({ ...current, status: current.view ? 'refreshing' : 'loading', error: '' }));
    try { const result = await call({ operation: 'hooks', cwd: cwd || undefined }); setState({ status: 'ready', view: hooksView(result, cwd || null), error: '' }); }
    catch (error) { setState((current) => ({ status: 'error', view: current.view, error: error?.message || String(error) })); }
  }, [call, cwd]);
  useEffect(() => { if (!initialState) void load(); }, [load, boot?.connected]);
  const change = async (id, payload) => {
    setBusy(id); setRowError(null);
    try { await call({ operation: 'hooks-state', ...payload, ...(native ? {} : { cwd: cwd || undefined }) }); await load(); }
    catch (error) { setRowError({ id, message: error?.message || String(error) }); }
    finally { setBusy(''); }
  };
  // The empty page's way in (Codex): open hooks.json in the core's own folder, or this project's .codex folder,
  // created from a minimal template when missing (customize 'hooks-file'), then list again once it is saved.
  const openHooksFile = async (scope) => {
    setBusy(`file:${scope}`); setRowError(null);
    try { await call({ operation: 'hooks-file', scope, action: 'open', ...(scope === 'project' ? { cwd: cwd || undefined } : {}) }); }
    catch (error) { setRowError({ id: `file:${scope}`, message: error?.message || String(error) }); }
    finally { setBusy(''); }
  };
  const fileActions = native && call ? <div className="hk-empty-actions" data-hooks-empty-actions="">
    <SourceSettingsButton size="sm" busy={busy === 'file:user'} disabled={!!busy || !boot?.connected} onClick={() => void openHooksFile('user')}>{t('Open hooks.json')}</SourceSettingsButton>
    {cwd && <SourceSettingsButton size="sm" busy={busy === 'file:project'} disabled={!!busy || !boot?.connected} onClick={() => void openHooksFile('project')}>{t('Open project hooks.json')}</SourceSettingsButton>}
  </div> : null;
  const view = state.view, name = coreName(boot?.core ?? engine);
  const rows = useMemo(() => hookRows(view, query), [view, query]);
  const reviewKeys = view ? view.groups.flatMap((group) => group.hooks.filter((hook) => hook.needsReview).map((hook) => hook.key)) : [];
  const refreshing = state.status === 'refreshing';
  const refresh = <SourceTooltip content={t('Refresh')} side="bottom">
    <SourceSettingsButton variant="ghost" iconOnly icon="ArrowClockwise" iconSize="auto" aria-label={t('Refresh')}
      busy={refreshing} disabled={state.status === 'loading' || refreshing} onClick={() => void load()} />
  </SourceTooltip>;
  const columns = [
    { key: 'event', header: t('Event'), width: 40 },
    { key: 'matcher', header: t('Matcher'), width: 20 },
    { key: 'command', header: t('Command') },
    { key: 'source', header: t('Source'), width: 32 },
    ...(switchable ? [{ key: 'controls', header: <span className="sr-only">{t('Actions')}</span>, width: 32 }] : []),
  ];
  return <div className="cz-page hk-page" data-cz-page="hooks" data-hooks-page="">
    <PageHeader title={t('Hooks')} searchLabel={t('Search hooks')} searchValue={query} onSearch={setQuery} actions={refresh} />
    <div className="cz-page-body scroll-fade-y scroll-fade-size-6 hk-body">
    <p className="hk-intro text-footnote text-muted">{native
      ? t('Commands {core} runs automatically at points in a session, from your config, this project and enabled plugins. A new or changed hook doesn’t run until you trust it.', { core: name })
      : switchable
        ? t('Commands {core} runs automatically at points in a session. They’re set in {core}’s own settings; switching one off here saves it there.', { core: name })
        : t('Commands {core} runs automatically at points in a session. They’re set in {core}’s own settings; this list shows what it loaded.', { core: name })}</p>
    {native && view?.needsReview > 0 && <div className="hk-review" role="status" data-hooks-review="">
      <span>{hooksReviewSummary(view.needsReview)}</span>
      <SourceSettingsButton size="sm" variant="primary" busy={busy === 'all'} disabled={!!busy || !boot?.connected} onClick={() => void change('all', { trust: reviewKeys })}>{t('Trust all')}</SourceSettingsButton>
    </div>}
    {state.status === 'loading' && <CatalogSkeleton section="hooks" />}
    {state.error && <p className="hk-error" role="alert">{state.error}</p>}
    {view && (view.total === 0 || rows.length === 0) && <EmptyState searchValue={view.total ? query.trim() : ''} noMatchMessage={t('No hooks match your search')}
      pictogram="NodeShapes" emptyMessage={native
        ? t('No hooks yet. Add them to hooks.json in your Codex folder or this project’s .codex folder, or install a plugin that brings some.')
        : t('{core} has no hooks for this folder.', { core: name })} actions={view.total === 0 ? fileActions : null} />}
    {rows.length > 0 && <ListTable columns={columns} label={t('Hooks')}>
      {rows.map((hook) => <tr key={hook.key} data-hook={hook.key} data-hook-active={hook.active ? 'true' : 'false'}>
        <td className="cz-cell-primary"><span className="cz-truncate cz-block" title={hook.eventDescription || undefined}>{hook.eventName}</span></td>
        <td className="cz-cell-secondary">{hook.matcher ? <code className="hk-matcher cz-truncate cz-block" title={hook.matcher}>{hook.matcher}</code> : <span className="cz-truncate cz-block">{t('Every call')}</span>}</td>
        <td className="cz-cell-primary"><div className="cz-name">
          <code className="hk-command cz-truncate" title={hook.async ? `${hook.what} · ${t('runs in the background')}` : hook.what}>{hook.what}</code>
          {hook.needsReview && <Badge title={hookTrustLabel(hook) || undefined}>{t('Needs review')}</Badge>}
          {hook.managed && <Badge>{t('Managed')}</Badge>}
        </div></td>
        <td className="cz-cell-secondary"><span className="cz-truncate cz-block" title={hook.sourcePath || undefined}>{[hook.source, hook.pluginId].filter(Boolean).join(' · ')}</span></td>
        {switchable && <td className="cz-cell-secondary"><span className="hk-controls">
          {!hook.managed && native && hook.needsReview && <SourceSettingsButton size="sm" busy={busy === hook.key} disabled={!!busy || !boot?.connected} onClick={() => void change(hook.key, { trust: [hook.key] })}>{t('Trust')}</SourceSettingsButton>}
          {!hook.managed && <SourceSwitch label={t('Run this hook')} size="sm" checked={hook.enabled && !hook.needsReview} disabled={!!busy || hook.needsReview || !boot?.connected}
            onChange={(value) => void change(hook.key, { enabled: { key: hook.key, enabled: value } })} />}
        </span></td>}
      </tr>)}
    </ListTable>}
    {rowError && <p className="hk-error" role="alert" data-hook-error={rowError.id}>{rowError.message}</p>}
    {view?.warnings.map((warning, index) => <p key={`w${index}`} className="hk-muted" role="note">{localizeBridgeText(warning)}</p>)}
    {view?.errors.map((error, index) => <p key={`e${index}`} className="hk-error" role="alert">{error}</p>)}
    </div>
  </div>;
}
