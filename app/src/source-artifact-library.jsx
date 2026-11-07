import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { revealInFileManagerLabel } from "./file-manager-labels.mjs";
import { Vi as ArtifactLibrary } from './generated/current-chat/c230724a2-BxatGObJ.js';
import { HostMenuButton, HostButton } from './source-chat-adapters.jsx';
import { fileKindIcon } from './file-kind-icon.mjs';
import { SourceArtifactViewer } from './source-artifact-viewer.jsx';
import { t } from '../electron/i18n/index.mjs';

export function SourceArtifactLibrary({ call, onCreate, onSession, onPreviewChange, viewerNavigation, viewerWindowActions }) {
  const [selected, setSelected] = useState(null);
  const root = useRef(null), scroll = useRef(0);
  const href = record => `/artifacts/local/${encodeURIComponent(record.key)}`;
  function open(record) { scroll.current = root.current?.closest('.conversation')?.scrollTop ?? 0; setSelected(record.key); }
  function close() { const key = selected; setSelected(null); requestAnimationFrame(() => { const node = root.current; const scroller = node?.closest('.conversation'); if (scroller) scroller.scrollTop = scroll.current; [...(node?.querySelectorAll('a[data-primary]') ?? [])].find(link => link.getAttribute('href') === href({ key }))?.focus({ preventScroll: true }); }); }
  const [records, setRecords] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [layout, setLayout] = useState(() => { try { return localStorage.getItem('artifact-layout') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } });
  useEffect(() => {
    let active = true;
    const refresh = () => call('local-artifacts', { action: 'list' }).then(result => { if (active) { setRecords(result.records); setError(result.incomplete ? t('Some artifacts couldn’t be loaded. The list below may be incomplete.') : ''); } }, error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    refresh();
    const unsubscribe = window.desktop?.onEvent?.(event => { if (event.method === 'item/completed') refresh(); });
    return () => { active = false; unsubscribe?.(); };
  }, [call]);
  const act = (operation, params) => call(operation, params).catch(error => setError(error.message));
  async function pin(record) {
    setError('');
    try { const updated = await call('local-artifacts', { action: 'pin', key: record.key, starred: !record.starred }); setRecords(rows => rows.map(row => row.key === updated.key ? updated : row)); }
    catch (error) { setError(error.message); }
  }
  const items = useMemo(() => records.filter(record => `${record.title} ${record.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => Number(!!b.starred) - Number(!!a.starred) || b.updatedAtMs - a.updatedAtMs)
    .map(record => ({ ...record, source: 'cowork', href: href(record), icon: fileKindIcon(record.path),
      onNavigate: () => open(record),
      onToggleStar: () => pin(record),
      menu: ({ contextMenuTrigger } = {}) => contextMenuTrigger ?? <HostMenuButton variant="ghost" size="sm" iconOnly icon="DotsHorizontal" aria-label={t('Artifact options')} items={[
        { label: t('Open'), icon: 'Eye', onSelect: () => open(record) },
        { label: t('Open in default app'), icon: 'ArrowUpRight', onSelect: () => act('open-tool-file', { sessionId: record.threadId, path: record.path }) },
        { label: revealInFileManagerLabel(), icon: 'Folder', onSelect: () => act('reveal-tool-file', { sessionId: record.threadId, path: record.path }) },
        { label: t('Open conversation'), icon: 'Chat', onSelect: () => onSession(record.threadId) },
      ]} />,
    })), [records, query, call, onSession]);
  const selectedRecord = records.find(record => record.key === selected);
  useLayoutEffect(() => { onPreviewChange?.(!!selectedRecord); return () => onPreviewChange?.(false); }, [!!selectedRecord, onPreviewChange]);
  return <div ref={root} className={`surface-artifact-library cds-root ${selectedRecord ? 'surface-artifact-open' : ''}`} data-density="comfortable">
    {selectedRecord ? <SourceArtifactViewer key={selectedRecord.key} record={selectedRecord} call={call} onClose={close} onSession={onSession} onPin={pin} actionError={error} navigation={viewerNavigation} windowActions={viewerWindowActions} /> :
    <ArtifactLibrary title={t('Artifacts')} items={items} isLoading={loading} searchQuery={query} layout={layout}
      search={{ value: query, onChange: setQuery, onClear: () => setQuery(''), placeholder: t('Search artifacts...'), label: t('Search your artifacts') }}
      viewToggle={{ value: layout, onChange: next => { setLayout(next); try { localStorage.setItem('artifact-layout', next); } catch {} } }}
      primaryAction={<HostButton variant="primary" icon="Add" onClick={onCreate}>{t('New artifact')}</HostButton>}
      banner={error && <p role="alert" className="text-body text-danger mb-4">{error}</p>} />}
  </div>;
}
