import React, { useRef, useState } from 'react';
import { SourceMenu } from './source-menu.jsx';
import { CommandCopyButton, CommandOutput } from './source-command.jsx';
import { useSettledHighlight } from './use-settled-highlight.mjs';
import { fileAction, fileActionFacts, changePath, changePreview, fileBasename, fileRunCounts, fileRunState, fileToolSummary, pathChoices, readContents } from './file-tool-model.mjs';
import { commandOutput, commandRowState } from './command-row-model.mjs';
import { stripAnsi } from './ansi-model.mjs';
import { SourceHighlightedLine } from './source-diff-code.jsx';
import { useDiffHunk } from './use-diff-hunk.mjs';
import { tokenLines, previewHunks, fileHighlightLanguage } from './file-preview-model.mjs';
import { toolOutputImages } from './generic-tool-model.mjs';
import { SourceToolImages } from './source-tool-images.jsx';
import './highlight-tokens.css';
import './source-file-tool.css';
import { t } from '../electron/i18n/index.mjs';

// gy/Bn, c856385e2:1316–1330,1425–1470. Nested activation never toggles
// the containing tool row. No inferred editor or composer capabilities.
export function ToolPath({ path, cwd, sessionKey, onOpenFileRef, onOpenChanges, preferDiff, full = false, title }) {
  const ref = useRef(null), [menu, setMenu] = useState(null), [error, setError] = useState('');
  const choices = pathChoices(path, cwd);
  const open = () => {
    if (preferDiff && onOpenChanges?.(path)) return;
    onOpenFileRef?.({ path: choices?.absolute || path });
  };
  const run = operation => { Promise.resolve().then(operation).catch(error => setError(error.message || String(error))); };
  const name = fileBasename(path), directory = path?.slice(0, path.length - name.length);
  return <>
    <span ref={ref} role="button" tabIndex={0} dir="ltr" title={title || path} aria-label={path}
      className={`sft-path ${full ? 'sft-path-full' : ''}`}
      onClick={event => { event.stopPropagation(); open(); }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
        if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault(); event.stopPropagation(); const rect = ref.current.getBoundingClientRect(); setMenu({ x: rect.left, y: rect.bottom });
        }
      }} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setMenu({ x: event.clientX, y: event.clientY }); }}>
      {full && directory && <span className="sft-directory">{directory}</span>}<span className="sft-basename">{name}</span>
    </span>
    {menu && <SourceMenu.Popup anchor={ref.current} point={menu} dataCds="ContextMenu" layer="contextmenu" label={t("File actions")} onClose={() => setMenu(null)}>
      <SourceMenu.Submenu><SourceMenu.SubmenuTrigger>{t("Copy")}</SourceMenu.SubmenuTrigger><SourceMenu.Popup label={t("Copy")}>
        {choices?.absolute && <SourceMenu.Item onClick={() => run(() => navigator.clipboard.writeText(choices.absolute))}>{t("Absolute path")}</SourceMenu.Item>}
        {choices?.relative && <SourceMenu.Item onClick={() => run(() => navigator.clipboard.writeText(choices.relative))}>{t("Relative path")}</SourceMenu.Item>}
        <SourceMenu.Item onClick={() => run(() => navigator.clipboard.writeText(name))}>{t("Filename")}</SourceMenu.Item>
      </SourceMenu.Popup></SourceMenu.Submenu>
      <SourceMenu.Submenu><SourceMenu.SubmenuTrigger>{t("Open in")}</SourceMenu.SubmenuTrigger><SourceMenu.Popup label={t("Open in")}><SourceMenu.Item onClick={() => onOpenFileRef?.({ path: choices?.absolute || path })}>{t("Files pane")}</SourceMenu.Item></SourceMenu.Popup></SourceMenu.Submenu>
      {choices?.relative && sessionKey && <SourceMenu.Item onClick={() => run(() => window.desktop.call('reveal-tool-file', { sessionId: sessionKey, path: choices.absolute }))}>{t("Reveal in Finder")}</SourceMenu.Item>}
    </SourceMenu.Popup>}
    {error && <span role="alert" className="source-tool-error">{error}</span>}
  </>;
}

// UO approval-current.js:6784-6837, used by the Read body Yoe (:7211-7234)
// and the Edit/Write diff body (KO :7007-7026). Standalone (inCard false):
// group/body py-md > epitaxy-code-card epitaxy-card-outline-layer rounded-lg
// overflow-clip flex flex-col (background Tv) with the px-md py-sm header
// inside. Classic tool-group rows pass inCard (m8 :54035-54063 -> FN
// :17308-17330 -> gN :16622-16645 -> KO): group/body flex w-full flex-col
// pt-xs > header 'flex items-center gap-1 pb-xs' outside the code box, then
// the box itself 'epitaxy-diff epitaxy-code-card rounded-lg overflow-clip'
// with style {background: Tv, minHeight: reservePx} and no outline layer.
function ToolCard({ path, copyText, copyDiff, lines, inCard = false, children, ...props }) {
  const header = <header className="sft-header" data-find-omitted=""><ToolPath path={path} full {...props} />
    <CommandCopyButton text={copyText} title={copyDiff ? t('Copy diff') : undefined} />
  </header>;
  const code = <div className="sft-code" role="group" aria-label={t("Code")} tabIndex={0} style={{ minHeight: Math.min(400, Math.max(1, lines) * 16) }}>
    {children}
  </div>;
  if (inCard) return <div className="sft-outer" data-in-card="">{header}{code}</div>;
  return <div className="sft-outer"><section className="sft-card">{header}{code}</section></div>;
}

function ReadBody({ item, action, scopeKey, ...props }) {
  const text = readContents(item.aggregatedOutput || ''), ref = useRef(null);
  const language = fileHighlightLanguage(action.path);
  const tokens = useSettledHighlight({ text, language, isFrontier: item.status === 'inProgress', languageSettled: true, scopeKey: JSON.stringify([scopeKey, item.id, action.path, 'read']) }, ref);
  const lines = tokenLines(tokens, text);
  // A terminal LF ends the last line; it does not introduce another numbered row.
  if (text.endsWith('\n')) lines.pop();
  return <ToolCard path={action.path} copyText={text} lines={lines.length} {...props}>
    <pre ref={ref} className="sft-read sft-numbered-read" data-highlighted={tokens ? '' : undefined}>{lines.map((line, index) => <span className="sft-read-line" key={index}><span className="sft-read-number" data-number={index + 1} aria-hidden="true"/><code className="scb-code source-diff-code"><SourceHighlightedLine tokens={line}/>{index < lines.length - 1 || text.endsWith('\n') ? '\n' : ''}</code></span>)}</pre>
  </ToolCard>;
}
// A pure addition/deletion (no paired side) is YO (approval-current.js:7189-7210):
// its gutter prefixes the number with the sign ([data-line-number-content]::before
// "+ " / "− ", min-width 1ch, git colour), with no separate indicator column.
// Paired edits keep RT's classic number + sign columns.
function DiffHunk({ hunk, path, scopeKey, isFrontier, pureSide = null }) {
  const ref = useRef(null);
  const { lines, wordRanges, highlighted } = useDiffHunk({ hunk, beforePath: path, afterPath: path, scopeKey, isFrontier }, ref);
  const sign = type => type === 'added' ? '+' : type === 'removed' ? '−' : ' ';
  return <div className="sft-hunk" ref={ref} data-word-diff={wordRanges ? '' : undefined} data-highlighted={highlighted ? '' : undefined}>
    {hunk.header && <div className="sft-separator" title={hunk.header}/>}
    {hunk.rows.map((row, index) => row.type === 'note' ? <div className="sft-diff-note" key={index}>{row.text}</div> :
      <div key={index} className="sft-diff-line" data-kind={row.type}>
        <span className="sft-number" aria-hidden="true">{pureSide && <span className="sft-number-sign">{sign(row.type)}</span>}{pureSide && ' '}{row.newLine ?? row.oldLine}</span>
        {!pureSide && <span className="sft-sign" aria-hidden="true">{sign(row.type)}</span>}
        <code className="scb-code source-diff-code"><SourceHighlightedLine tokens={lines[row.side]?.[row.line] || [{ text: row.text }]} ranges={wordRanges?.[index]}/></code>
      </div>)}
  </div>;
}
function DiffBody({ change, scopeKey, isFrontier, ...props }) {
  const preview = changePreview(change), path = changePath(change);
  return <ToolCard path={path} title={path !== change.path ? t('{path} (from {from})', { path, from: change.path }) : path} copyText={preview.raw} copyDiff lines={preview.rows.length || preview.raw.split('\n').length} {...props}>
    {preview.fallback ? <pre className="sft-read">{preview.raw}</pre> : <div className="sft-diff" data-pure-side={preview.pureSide || undefined}>
      {previewHunks(preview.rows).map((hunk, index) => <DiffHunk key={index} hunk={hunk} path={path} isFrontier={isFrontier} pureSide={preview.pureSide} scopeKey={JSON.stringify([scopeKey, path, index])}/>)}
    </div>}
  </ToolCard>;
}
// cd98a1763 ApprovalFileChangeBody: the transcript tool body (Ma/KO) with inCard,
// i.e. the UO in-card header (path + Copy) over the diff code box, shown under an
// Ask-mode write/edit approval's path detail (approval-current.js:15596-15607 yce).
export function ApprovalFileChangeBody({ change, ...props }) {
  return <DiffBody change={change} inCard {...props} />;
}
// Grep/Glob/LS rows are the generic KO details: qO (approval-current.js:7099-7150)
// lists the call's real input keys, code-styled for Goe's keys (pattern, glob…).
// The bridge forwards the raw arguments as action.arguments; a Codex search action
// has only its query and path, shown as pattern:/path:. Other actions keep command:.
const CODE_KEYS = new Set(['command', 'cmd', 'script', 'shell', 'code', 'pattern', 'regex', 'glob']);
const factText = value => typeof value === 'string' ? value : JSON.stringify(value);
function DetailsBody({ item, action, state }) {
  const facts = fileActionFacts(item, action);
  const output = commandOutput(item, state), input = facts.map(([key, value]) => `${key}: ${factText(value)}`).join('\n');
  return <div className="sft-details"><div role="group" aria-label={t("Tool call details")} tabIndex={0}>
    {facts.map(([key, value]) => <div key={key}><span className="sft-key">{key}:</span>{' '}<span className={CODE_KEYS.has(key) || typeof value !== 'string' ? 'sft-command' : undefined}>{factText(value)}</span></div>)}
    {output.text && <CommandOutput text={output.text} isError={output.isError} />}
    </div><CommandCopyButton text={[input, stripAnsi(output.text)].filter(Boolean).join('\n\n')} />
  </div>;
}
// images: false when the caller draws the output images itself (the original tool rows' gv, source-transcript-tool-rows).
export function FileToolMessage({ item, Step, pendingApprovalItemIds, defaultOpen, forcedOpen, inCard = false, after = null, images: drawImages = true, ...props }) {
  const items = item.fileRun || [item], state = fileRunState(items, pendingApprovalItemIds);
  const summary = fileToolSummary(items, state), counts = fileRunCounts(items);
  const preferDiff = item.type === 'fileChange' && !['failed', 'denied', 'stopped'].includes(state);
  const settled = !['busy', 'blocked'].includes(state);
  return <Step item={item} classic caretSize={14} defaultOpen={defaultOpen} forcedOpen={forcedOpen} sessionKey={props.sessionKey} label={summary.label} state={state} className="sft-step" after={after}
    metaTitle={summary.path} meta={summary.meta && <ToolPath path={summary.path} preferDiff={preferDiff} {...props} />}
    trailing={settled && (counts.added || counts.removed) ? <span className="sft-counts">
      <span className="source-sr-only">{t("{added} added, {removed} removed", { added: counts.added, removed: counts.removed })}</span>
      <span aria-hidden="true" className="sft-added">+{counts.added}</span><span aria-hidden="true" className="sft-removed">-{counts.removed}</span>
    </span> : null}>
    {items.map(member => {
      const action = fileAction(member), memberState = commandRowState(member, pendingApprovalItemIds.has(member.id));
      if (member.type === 'fileChange') return <React.Fragment key={member.id}>{(member.changes || []).map((change, index) => <DiffBody key={index} change={change} preferDiff={preferDiff} inCard={inCard} {...props} scopeKey={JSON.stringify([props.sessionKey, member.id, index])} isFrontier={member.status === 'inProgress'} />)}</React.Fragment>;
      // An image read (read_image) has no file text: its details, and the image itself as QO
      // thumbnails (approval-current.js:7398-7445) — here in a group row's body (FN :17324),
      // hoisted under a standalone row by SourceMessage (RN :17302) — never '[image]'.
      const images = toolOutputImages(member);
      if (images.length) return <React.Fragment key={member.id}><DetailsBody item={member} action={action} state={memberState} />{inCard && drawImages ? <SourceToolImages images={images} itemId={member.id} /> : null}</React.Fragment>;
      if (action?.type === 'read' && !['failed', 'denied', 'stopped'].includes(memberState)) return <ReadBody key={member.id} item={member} action={action} scopeKey={`${props.sessionKey}:${member.id}:read`} inCard={inCard} {...props} />;
      return <DetailsBody key={member.id} item={member} action={action} state={memberState} />;
    })}
  </Step>;
}
