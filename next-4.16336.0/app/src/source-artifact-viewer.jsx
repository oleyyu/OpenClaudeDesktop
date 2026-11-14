import React, { useEffect, useRef, useState } from 'react';
// 3.6556.2 viewer title / action (c2bb74286 Lt / Bt) and frame classes (shared-9 fh / ph / mh, exported dr / ur / cr).
import { ArtifactTitle, ArtifactAction, artifactFrameClass, artifactHeaderClass, artifactBodyClass } from './generated/artifact-library/index.mjs';
import { filePreviewKind } from './file-preview-model.mjs';
import { SourceFileViewer } from './source-file-viewer.jsx';
import { SourceMarkdown } from './source-session.jsx';
import { SourceLoadingPane } from './source-pane-states.jsx';
import { t } from '../electron/i18n/index.mjs';

// 3.6556.2 artifact frame (cca654f75 root `Qf = … : dr`, header `oo`, body `cr`), title and action primitives.
// Local files use the existing scoped readers and document renderers in the body slot.
export function SourceArtifactViewer({ record, call, onClose, onSession, onPin, actionError, navigation, windowActions }) {
  const [viewMode, setViewMode] = useState('preview');
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [force, setForce] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    call('local-artifacts', { action: 'read', key: record.key, force }).then(value => { if (active) setData(value); }, error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [record.key, revision, force, call]);
  useEffect(() => { root.current?.focus({ preventScroll: true }); }, []);
  const act = (operation, params) => call(operation, params).catch(error => setError(error.message));
  return <section ref={root} tabIndex={-1} aria-label={t('Artifact preview')} className={`surface-artifact-viewer ${artifactFrameClass} cds-root`} data-density="comfortable"
    onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    {/* cca654f75 oo without the panels branch (fizzy-lake off): header ur plus `dframe-header` (`s(Fn,!r&&"dframe-header")`,
        not a popout; the collapsed-frame clearance rule reads .dframe-root[data-collapsed] .dframe-content-inner), a draggable
        leading group and a draggable actions group. main.jsx passes no collapsed chrome (navigation null, w11-frame-root-cont). */}
    <div data-testid="frame-artifact-viewer-header" className={`${artifactHeaderClass} dframe-header`}>
      <div className="draggable flex min-w-0 shrink-[999] items-center gap-2 self-stretch ps-2" data-testid="frame-artifact-header-leading">
        {navigation}
        <ArtifactAction glyph="ArrowLeft" label={t('Back to artifacts')} onClick={onClose} />
        <ArtifactTitle title={record.title} heading />
      </div>
      {/* oo's actions group holds c2bb74286 Ht, whose root is `jn` = "-mx-2 flex min-w-0 flex-auto items-center justify-end
          gap-1 overflow-x-clip px-2" when no attribution seat is provided (c1f772aa0 T, panels branch only; w11-sweep-curchat). */}
      <div className="draggable flex min-w-0 flex-auto items-center"><div className="-mx-2 flex min-w-0 flex-auto items-center justify-end gap-1 overflow-x-clip px-2">
        {data && typeof data.file.text === 'string' && filePreviewKind(data.file.path) && <ArtifactAction glyph={viewMode === 'source' ? 'Eye' : 'Code'} label={t(viewMode === 'source' ? 'Preview' : 'View source')} onClick={() => setViewMode(value => value === 'source' ? 'preview' : 'source')} />}
        <ArtifactAction glyph={record.starred ? 'PinFilled' : 'Pin'} label={t(record.starred ? 'Unpin' : 'Pin')} aria-pressed={!!record.starred} onClick={() => onPin(record)} />
        <ArtifactAction glyph="ArrowClockwise" label={t('Reload')} onClick={() => setRevision(value => value + 1)} />
        <ArtifactAction glyph="Chat" label={t('Open conversation')} onClick={() => onSession(record.threadId)} />
        <ArtifactAction glyph="ArrowUpRight" label={t('Open in default app')} onClick={() => act('open-tool-file', { sessionId: record.threadId, path: record.path })} />
        {windowActions}
        <ArtifactAction glyph="X" label={t('Close')} onClick={onClose} />
      </div></div>
    </div>
    {/* cca654f75 `l("div",{className:kn,children:…})`: the body element is cr alone; the host file viewer fills it from an
        inner column (host content, the slot's children). */}
    <div className={artifactBodyClass}><div className="absolute inset-0 flex flex-col overflow-hidden">
      {(error || actionError) && <p role="alert" className="text-body text-danger-000 px-4 py-3">{error || actionError}</p>}
      {data ? <SourceFileViewer key={`${record.key}:${revision}:${force}`} showHeader={false} viewMode={viewMode} onViewModeChange={setViewMode} file={data.file} displayPath={data.displayPath} fullPath={data.fullPath} scopeKey={record.key}
        onCopyPath={() => navigator.clipboard.writeText(data.fullPath).catch(error => setError(error.message))}
        onViewAsText={() => setForce(true)} renderMarkdown={text => <SourceMarkdown text={text} cwd={data.root} sessionKey={record.threadId} />} />
        : !error && <SourceLoadingPane label={t('Loading artifact…')} />}
    </div></div>
  </section>;
}
