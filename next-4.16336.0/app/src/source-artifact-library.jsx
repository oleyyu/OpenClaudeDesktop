import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// 3.6556.2 artifact library page shell (c230724a2 Ns), sliced by scripts/extract-artifact-library.mjs.
import { ArtifactLibraryPage } from './generated/artifact-library/index.mjs';
import { CdsBanner, CdsButton, CdsDropdown } from './generated/view-tabs/index.js';
import { fileKindIcon } from './file-kind-icon.mjs';
import { SourceArtifactViewer } from './source-artifact-viewer.jsx';
import { SourceChatArtifactPanel } from './source-chat-artifact-panel.jsx';
import { t } from '../electron/i18n/index.mjs';

// The item menu is the official path (w11-sweep-curchat): items carry no `menu`, so c69e9937a on renders sn -> the
// generated cn "More options for {label}" trigger (label from shared-28 pP, "Untitled artifact" when empty) for cards and
// rows, and a list row's right click goes through shared-16 uu's context branch (fu); both open the item's
// `menuExtras` (src/source-artifact-v3-adapters.jsx ArtifactItemMenu: CdsDropdown / CdsContextMenu). The extras are
// this host's actions on local files (the claude.ai artifact actions are not offered).

export function SourceArtifactLibrary({ call, onCreate, onSession, onPreviewChange, viewerNavigation, viewerWindowActions }) {
  const [selected, setSelected] = useState(null);
  const root = useRef(null), scroll = useRef(0);
  const href = record => `/artifacts/local/${encodeURIComponent(record.key)}`;
  function open(record) { scroll.current = root.current?.closest('.conversation')?.scrollTop ?? 0; setSelected(record.key); }
  function close() { const key = selected; setSelected(null); requestAnimationFrame(() => { const node = root.current; const scroller = node?.closest('.conversation'); if (scroller) scroller.scrollTop = scroll.current; [...(node?.querySelectorAll('a[data-primary]') ?? [])].find(link => link.getAttribute('href') === href({ key }))?.focus({ preventScroll: true }); }); }
  const [records, setRecords] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [incomplete, setIncomplete] = useState(false);
  const [query, setQuery] = useState(''), [layout, setLayout] = useState(() => { try { return localStorage.getItem('artifact-layout') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } });
  useEffect(() => {
    let active = true;
    const refresh = () => call('local-artifacts', { action: 'list' }).then(result => { if (active) { setRecords(result.records); setIncomplete(!!result.incomplete); setError(''); } }, error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
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
    .map(record => ({ ...record, source: record.source === 'chat' ? 'chat' : 'cowork', href: href(record), icon: fileKindIcon(record.path),
      onNavigate: () => open(record),
      onToggleStar: () => pin(record),
      // w13-chatfn-artifacts (chatfn-31): a Chat artifact (c230724a2 item source "chat", its text as the cover) opens in the
      // Chat artifact panel; it is no file on disk, so only Open and Open conversation apply.
      menuExtras: <>
        <CdsDropdown.Item icon="Eye" onClick={() => open(record)}>{t('Open')}</CdsDropdown.Item>
        {record.source !== 'chat' && <CdsDropdown.Item icon="ArrowUpRight" onClick={() => act('open-tool-file', { sessionId: record.threadId, path: record.path })}>{t('Open in default app')}</CdsDropdown.Item>}
        {record.source !== 'chat' && <CdsDropdown.Item icon="Folder" onClick={() => act('reveal-tool-file', { sessionId: record.threadId, path: record.path })}>{t('Show in Finder')}</CdsDropdown.Item>}
        <CdsDropdown.Item icon="Chat" onClick={() => onSession(record.threadId)}>{t('Open conversation')}</CdsDropdown.Item>
      </>,
    })), [records, query, call, onSession]);
  const selectedRecord = records.find(record => record.key === selected);
  useLayoutEffect(() => { onPreviewChange?.(!!selectedRecord); return () => onPreviewChange?.(false); }, [!!selectedRecord, onPreviewChange]);
  // c230724a2 Hs: a partial listing shows the warning banner (CdsBanner variant warning, mb-6) above the list.
  const banner = (incomplete || error) && <>
    {incomplete && <CdsBanner variant="warning" className="mb-6">{t('Some artifacts couldn’t be loaded. The list below may be incomplete.')}</CdsBanner>}
    {error && <p role="alert" className="text-body text-danger-000 mb-4">{error}</p>}
  </>;
  return <div ref={root} className={`surface-artifact-library cds-root ${selectedRecord ? 'surface-artifact-open' : ''}`} data-density="comfortable">
    {selectedRecord?.source === 'chat' ? <SourceChatArtifactPanel key={selectedRecord.key} call={call} threadId={selectedRecord.threadId} artifactId={selectedRecord.artifactId} onClose={close} onNotice={message => setError(message)} /> :
    selectedRecord ? <SourceArtifactViewer key={selectedRecord.key} record={selectedRecord} call={call} onClose={close} onSession={onSession} onPin={pin} actionError={error} navigation={viewerNavigation} windowActions={viewerWindowActions} /> :
    <ArtifactLibraryPage title={t('Artifacts')} items={items} isLoading={loading} searchQuery={query} layout={layout}
      search={{ value: query, onChange: setQuery, onClear: () => setQuery(''), placeholder: t('Search artifacts...'), label: t('Search your artifacts') }}
      viewToggle={{ value: layout, onChange: next => { setLayout(next); try { localStorage.setItem('artifact-layout', next); } catch {} } }}
      // c230724a2 Pc (one create path): CdsButton variant primary "New artifact", no icon (Ns adds primaryActionCompactIcon "Add").
      primaryAction={<CdsButton variant="primary" onClick={onCreate}>{t('New artifact')}</CdsButton>}
      banner={banner || undefined} />}
  </div>;
}
