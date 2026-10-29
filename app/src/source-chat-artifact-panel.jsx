import React, { useEffect, useMemo, useRef, useState } from 'react';
// R6: CDS originals by semantic name from the view-tabs facade.
import { CdsButton, CdsDropdown, CdsIcon, CdsSplitDropdownButton } from './generated/view-tabs/index.js';
import { SourceFileViewer } from './source-file-viewer.jsx';
import { SourceMarkdown } from './source-session.jsx';
import { SourceLoadingPane } from './source-pane-states.jsx';
import { artifactActions, artifactFileName, artifactReadFailure, artifactRenderer, artifactVersionRows } from './chat-artifact-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import './source-chat-artifact-panel.css';

// w13-chatfn-artifacts (research/w13-chatfn.md A3–A5, chatfn-25..31). Chat artifacts are written by the local
// `artifacts` tool (electron/agent-tools/chat-artifacts.mjs) and read through main's `chat-artifacts` IPC.
//
// w13-close-chat-messages: cc1aae219's "Created artifact: {id}" / "Updated artifact: {id}" chip (the
// `Rz.safeParse(callInput)` row) is the Cowork one — its click is `{type:"SELECT_COWORK_ARTIFACT",id:u,opener:"chip"}` —
// so a Chat row is the artifact block (source-chat-artifact-card.jsx) and the host keeps no copy of the chip.
//
// SourceChatArtifactPanel is the 3.6556.2 file detail view (ca2ef848d) as it shows a Chat artifact: the root
// `flex h-full flex-col relative outline-none bg-surface-3`, a header with the title (`h2.text-sm font-normal
// text-secondary min-w-0 truncate`), the "Copied" note, the split button `ye` (CdsSplitDropdownButton, secondary, label
// "Copy", items Download as {EXT} / Copy as image / Add to project / Print as PDF in that order, the drawer's sm size
// and `!rounded-lg`) and Close; the body `flex-1 min-h-0 bg-surface-3 overflow-auto`. The version menu is the frame
// header's (frame-shell-header nt.versionOrdinal "Version {n}", aria-label "Version history, {count} versions").
// Publish / Share artifact need claude.ai and are not offered (E59). The body is the host's file viewer: markdown,
// sandboxed HTML (allow-scripts only, connect-src 'none'), SVG, highlighted code; React / Mermaid stay code (chatfn-27b).

/** ce187ccc8 H (rasterizeSvgToPng): the SVG drawn at twice its size onto a canvas, as a PNG data URL. */
export function svgToPng(svg) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || 1024, height = image.naturalHeight || 1024, scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale; canvas.height = height * scale;
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('canvas')); return; }
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('svg'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

// w13-chatui-artifact-inline: `initialVersion`, the version an artifact block opened (cc1aae219 Y3 onOpenArtifact(id, message, versionUuid)).
export function SourceChatArtifactPanel({ call, threadId, artifactId, initialVersion = null, refreshKey = 0, onClose, onNotice, initialData = null }) {
  const opened = Number.isInteger(initialVersion) ? initialVersion : null;
  const [version, setVersion] = useState(opened);
  const [data, setData] = useState(initialData), [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('preview');
  const [copied, setCopied] = useState(false), [busy, setBusy] = useState(false);
  const body = useRef(null), copiedTimer = useRef(null);
  useEffect(() => { setVersion(opened); setViewMode('preview'); }, [threadId, artifactId, opened]);
  useEffect(() => {
    if (!threadId || !artifactId) return undefined;
    let active = true;
    setError('');
    call('chat-artifacts', { action: 'read', threadId, id: artifactId, ...(Number.isInteger(version) ? { version } : {}) })
      .then((value) => { if (active) setData(value); }, (failure) => { if (active) setError(t(artifactReadFailure(failure))); });
    return () => { active = false; };
  }, [call, threadId, artifactId, version, refreshKey]);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const shown = data && data.id === artifactId ? data : null;
  const renderer = shown ? artifactRenderer(shown) : null;
  const file = useMemo(() => (shown ? { path: artifactFileName({ id: shown.id, type: shown.type, language: shown.language }), text: shown.content } : null), [shown]);
  const previewFrame = useMemo(() => (shown ? {
    register: () => call('chat-artifacts', { action: 'preview-frame', threadId, id: shown.id, version: shown.shown }),
    release: (url) => { void Promise.resolve(call('file:preview-frame-release', { url })).catch(() => {}); },
  } : null), [call, threadId, shown?.id, shown?.shown]);
  const actions = shown ? artifactActions(shown, { inProject: !!shown.inProject }) : [];
  const versions = shown ? artifactVersionRows(shown.versions, shown.shown) : [];
  const params = shown ? { threadId, id: shown.id, version: shown.shown } : null;
  const failed = (failure) => onNotice?.(failure?.message || String(failure), 'danger');
  const note = () => { setCopied(true); clearTimeout(copiedTimer.current); copiedTimer.current = setTimeout(() => setCopied(false), 2000); };
  async function run(action) {
    if (!shown || busy) return;
    if (action === 'copy') {
      try { await navigator.clipboard.writeText(shown.content); note(); } catch (failure) { failed(failure); }
      return;
    }
    setBusy(true);
    try {
      if (action === 'download') await call('chat-artifacts', { action: 'export', ...params });
      else if (action === 'copyAsImage') {
        try { await call('chat-artifacts', { action: 'copy-image', ...params, dataUrl: await svgToPng(shown.content) }); note(); }
        catch { onNotice?.(t('Couldn’t copy image'), 'danger'); }
      } else if (action === 'addToProject') {
        const result = await call('chat-artifacts', { action: 'add-to-project', ...params }).catch(() => null);
        // ca2ef848d vs({onSuccess, onError}): "File added to project" / "Error adding file to project"; over the knowledge
        // limit, the project upload's own "Failed to upload file {filename}. Project knowledge exceeds maximum. …".
        if (result?.added?.length) onNotice?.(t('File added to project'), 'neutral');
        else if (result?.failed?.[0]?.reason === 'capacity') onNotice?.(t('Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue.', { filename: result.failed[0].name }), 'danger');
        else onNotice?.(t('Error adding file to project'), 'danger');
      } else if (action === 'downloadAsPdf') {
        // ca2ef848d HN(text, …, element): the rendered markdown prints as shown; plain text prints as text.
        const rendered = renderer?.kind === 'markdown' && viewMode === 'preview' ? body.current?.querySelector('[data-file-preview="markdown"]')?.innerHTML : null;
        try { await call('chat-artifacts', { action: 'print-pdf', ...params, ...(rendered ? { html: rendered } : {}) }); }
        catch { onNotice?.(t('Error saving as PDF'), 'danger'); }
      }
    } catch (failure) { failed(failure); }
    finally { setBusy(false); }
  }
  const label = (row) => t(row.message, row.values);
  const versionMenu = versions.length > 0 && <CdsDropdown.Root>
    <CdsDropdown.TriggerButton variant="secondary" size="sm" data-testid="chat-artifact-versions"
      aria-label={tn(versions.length, 'Version history, {count} version', 'Version history, {count} versions', { count: versions.length })}>
      <span className="truncate">{t('Version {n}', { n: shown.shown })}</span>
    </CdsDropdown.TriggerButton>
    <CdsDropdown.Popup align="end" className="min-w-[180px]">
      {versions.map((row) => <CdsDropdown.Item key={row.n} icon={row.current ? 'Check' : undefined} data-version={row.n}
        onClick={() => setVersion(row.latest ? null : row.n)}>{label(row)}</CdsDropdown.Item>)}
    </CdsDropdown.Popup>
  </CdsDropdown.Root>;
  return <section tabIndex={-1} aria-label={shown?.title || t('Artifact')} data-testid="chat-artifact-panel" data-artifact-type={shown?.type}
    className="chat-artifact-panel flex h-full flex-col relative outline-none bg-surface-3"
    onKeyDown={(event) => { if (event.key === 'Escape' && !event.defaultPrevented && !event.nativeEvent?.isComposing) { event.preventDefault(); onClose?.(); } }}>
    <div className="chat-artifact-panel-header flex items-center gap-1 ps-3 pe-2">
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        <h2 className="text-sm font-normal text-secondary min-w-0 truncate" title={shown?.title}>{shown?.title ?? ''}</h2>
        <div className="flex-1" />
        {copied && <div className="flex items-center gap-1 text-sm text-success-200 ms-2 me-3 flex-shrink-0" role="status">
          <CdsIcon name="CheckCircle" size="sm" className="text-success-200" /><span className="text-success-200">{t('Copied')}</span>
        </div>}
      </div>
      {versionMenu}
      {shown && <CdsSplitDropdownButton variant="secondary" size="sm" className="!rounded-lg" label={t('Copy')} onPrimaryClick={() => void run('copy')} busy={busy}
        items={<>{actions.map((action) => <CdsDropdown.Item key={action.id} data-action={action.id} onClick={() => void run(action.id)}>{label(action)}</CdsDropdown.Item>)}</>} />}
      <CdsButton variant="ghost" size="sm" iconOnly icon="X" aria-label={t('Close')} onClick={() => onClose?.()} />
    </div>
    {/* w13-chatui-artifact-inline: the "artifact" focus region (cbaae0d6d `xe({kind:"artifact",boxRef:Pe,…})`), Jump to artifact lands here. */}
    {/* ca1d33d05 tn: the landing's group label is the title trimmed, else "Artifact" (07/fBlW5U3). */}
    <div ref={body} className="flex-1 min-h-0 bg-surface-3 overflow-auto" data-focus-region="artifact" data-focus-region-label={shown?.title?.trim() || t('Artifact')}>
      <div className="chat-artifact-panel-body flex h-full min-h-0 flex-col">
        {error && <p role="alert" className="text-body text-danger-000 px-4 py-3">{error}</p>}
        {renderer?.codeOnly && <p className="text-footnote text-muted-as-secondary px-4 pt-3" data-testid="chat-artifact-code-only">
          {t(renderer.codeOnly === 'react' ? 'React artifacts are shown as code here.' : 'Mermaid diagrams are shown as code here.')}</p>}
        {shown ? <SourceFileViewer key={`${shown.id}:${shown.shown}`} showHeader={false} presentation="pane" file={file} displayPath={file.path} fullPath={file.path}
          scopeKey={`chat-artifact:${threadId}:${shown.id}`} viewMode={renderer?.preview ? viewMode : 'source'} onViewModeChange={setViewMode}
          previewFrame={renderer?.kind === 'html' ? previewFrame : null}
          renderMarkdown={(text) => <SourceMarkdown text={text} sessionKey={threadId} />} />
          : !error && <SourceLoadingPane label={t('Loading artifact…')} />}
        {renderer?.kind === 'html' && <p className="text-footnote text-muted-as-secondary px-4 py-2" data-testid="chat-artifact-safety">
          {t('Artifacts are user-generated and may contain unverified or potentially unsafe content.')}</p>}
      </div>
    </div>
  </section>;
}
