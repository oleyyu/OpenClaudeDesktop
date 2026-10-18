import React, { useCallback, useContext, useRef, useState } from 'react';
import { Rf as Composer, Wd as Actions, ef as Chin, tf as Overlay, yd as Layout, ai as editorClass, Br as editorStyle } from './generated/current-chat/shared-5-DXmEIvP_.js';
import { Attachments } from './source-chat-adapters.jsx';
import { ideaPreviewClass } from './generated/chat/shared-14-BOJVa-jT.js';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceMenu } from './source-menu.jsx';
import { Icon } from './icons';
import { permissionLabel } from './source-permission-menu.jsx';
import { t } from '../electron/i18n/index.mjs';

function Editor({ node, measure, disabled, minLines, current, preview }) {
  const layout = useContext(Layout);
  const inputRef = useCallback(input => { node.props.inputRef?.(input); measure(input); }, [node.props.inputRef, measure]);
  return <div data-cds="ChatComposerEditor" className={editorClass({ startInset: layout.startInset, disabled, settled: true, className: `source-chat-editor${preview ? ' opacity-0' : ''}` })} style={editorStyle(minLines)}>
    {React.cloneElement(node, { inputRef, 'data-cds': undefined, placeholder: current ? t('Reply') : node.props.placeholder })}
  </div>;
}

// Installed 2.31226.0: shared-9 vx -> shared-5 Rf. Reply controls move to the chin.
// Only model, permission, folder and editor data are supplied by the local host.
export function SourceChatComposer({ editorNode, attachments, draft, scope, current, mode, onMode,
  previewPrompt, onClearPreview,
  disabled, busy, sending, canSend, showStop, onStop, submit, onMenu, model, effort, effortLabel,
  modelsLoading, permission, workdir, folderLabel, onFolder, onDrop, canAttach }) {
  const [folderAnchor, setFolderAnchor] = useState(null);
  const input = useRef(null);
  const minLines = current ? 1 : 2;
  const open = kind => event => onMenu(kind, event.currentTarget);
  const send = <Button variant={current ? 'ghost' : 'brand'} iconOnly icon={current ? "ArrowReturn" : "ArrowUp"} iconSize={20}
    aria-label={t('Send message')} type="submit" disabled={!canSend} busy={sending} />;
  const stop = <Button variant="ghost" iconOnly icon="StopCircle" iconSize={20}
    aria-label={t('Stop response')} onClick={() => onStop?.({ trigger: 'button' })} />;
  // R4g-composer CP7 (cov0-03): 2.42304.0 c227f4d5e CQ returns null for hideDictation and Code passes
  // hideDictation:!Lf (cc43287c9); shared-8's voice control returns only its portal host when neither dictation
  // nor voice mode is available. This host has neither, so no microphone / voice slot is rendered at all.
  const modelControl = <Button variant="ghost" className="sc-model-trigger surface-model" size="xs" disabled={sending || modelsLoading || !model}
    aria-label={t('Model')} aria-haspopup="menu" onClick={open('model')}>
    <span>{model?.displayName || model?.model || t('Default model')}</span>
    {effort && <span className="text-muted">{effortLabel}</span>}
  </Button>;
  const permissionControl = mode === 'cowork' && <Button variant="ghost" size="xs" aria-label={t('Permission mode')}
    aria-haspopup="menu" disabled={sending || !permission} onClick={open('permission')}>{permissionLabel(permission)}</Button>;
  const addControl = <Button variant="ghost" iconOnly icon="Add" iconSize={20}
    aria-label={t('Add')} disabled={sending} onClick={open('add')} />;
  const replyLeading = addControl;
  const leading = <Button variant="ghost" size="xs" className="surface-folder-trigger" aria-label={t('Project or folder')}
    aria-haspopup="menu" aria-expanded={!!folderAnchor} disabled={sending}
    onClick={event => setFolderAnchor(folderAnchor ? null : event.currentTarget)}>
    <span>{folderLabel || (workdir ? workdir.split('/').pop() : t('Project or folder'))}</span><Icon name="CaretDown" size={12} />
  </Button>;
  return <>
    <Composer variant="default" form={current ? 'reply' : 'new'} busy={busy} disabled={disabled}
      onPointerDownCapture={onClearPreview} onKeyDownCapture={onClearPreview} onBeforeInputCapture={onClearPreview}
      className="source-chat-composer cds-root" data-density="comfortable" dropScope="card" onFileDrop={canAttach ? onDrop : undefined}
      editor={{ draftStoreKey: scope, minLines, hasDraftText: () => !!draft.trim(), contentKey: draft,
        focus: () => input.current?.focus(), trailingNotch: 'float',
        render: ({ onMeasureTarget, disabled }) => <Editor current={current} preview={!!previewPrompt} node={editorNode} measure={element => { input.current = element; onMeasureTarget(element); }} disabled={disabled} minLines={minLines} /> }}>
      {previewPrompt && <Overlay><p className={ideaPreviewClass}>{previewPrompt}</p></Overlay>}
      {attachments && <Attachments>{attachments}</Attachments>}
      <Actions gap="tight" leading={current ? null : addControl}
        send={<SourceTooltip content={t(showStop ? 'Stop' : 'Send')} shortcut={showStop ? 'escape' : 'enter'}>{showStop ? stop : send}</SourceTooltip>}
        idle={null} />
      <Chin leading={current ? replyLeading : leading} trailing={<>{modelControl}{permissionControl}</>} />
    </Composer>
    {folderAnchor && <SourceMenu.Popup anchor={folderAnchor} side="bottom" align="start" label={t('Project or folder')} onClose={() => setFolderAnchor(null)}>
      <SourceMenu.Item icon="Folder" onClick={() => { setFolderAnchor(null); onFolder?.(); }}>{t('Open folder…')}</SourceMenu.Item>
      {!current && <>
        <SourceMenu.Separator />
        <SourceMenu.Item icon="Chats" checked={mode === 'chat'} checkedRole="radio" onClick={() => { setFolderAnchor(null); onMode?.('chat'); }}>{t('Chat')}</SourceMenu.Item>
        <SourceMenu.Item icon="Tasks" checked={mode === 'cowork'} checkedRole="radio" onClick={() => { setFolderAnchor(null); onMode?.('cowork'); }}>{t('Cowork')}</SourceMenu.Item>
      </>}
      {effort && <><SourceMenu.Separator /><SourceMenu.Item onClick={() => { setFolderAnchor(null); onMenu('effort', folderAnchor); }}>{t('Effort')}: {effortLabel}</SourceMenu.Item></>}
    </SourceMenu.Popup>}
  </>;
}
