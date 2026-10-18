import { createBreadcrumbLister } from './file-breadcrumb-model.mjs';
import { readFileView } from './generated/code-current/file-view-memory.mjs';
import {useBlankTreeSelection} from "./use-blank-tree-selection.jsx";
import {selectFileRange,selectAllFiles} from "./file-tree-selection.mjs";
import { SourceFileMenuEntries } from "./source-file-menu-entries.jsx";
import { fileSelectionLabel } from "./file-editor-commands.mjs";
import { guardFileEdits, hasDirtyFileEdit } from "./file-edit-store.mjs";
import { applyFileRead, readIsStale, tabLoaded, tabsForEdits, tabsForFolderChange, watchedDirs } from "./file-live-refresh-model.mjs";
import { useFileViewSettings } from "./use-file-view-settings.mjs";
import { fileViewMenu, fileBehaviorMenu } from "./file-view-settings.mjs";
import { fileTreeVisible, peekOnFileOpen } from './file-tree-mode.mjs';
import {advanceResponseBlocks,remarkPriorDefinitions,remarkResponseBlockQuotes} from './response-block-model.mjs';
import {remarkFrontierDefinitions} from './frontier-definitions.mjs';
import {rehypeResponseReveal} from './response-reveal-model.mjs';
import {reasoningText,isHiddenTranscriptItem} from './transcript-item-visibility.mjs';
import {useResponsePacing} from './use-response-pacing.js';
import {SourceResponseBoundary,SourceBlockBoundary} from './source-response-boundary.jsx';
import {SourceGenericToolBody} from './source-generic-tool.jsx';
// R4g-mcp MA-7: an MCP call whose tool is an MCP App tool of the session is the 2.42304.0 widget card (VX), else this row.
import {SourceMcpAppRow,isMcpCallItem} from './source-mcp-app.jsx';
import {SourcePlanPane, SourcePlanCopyButton} from './source-plan-pane.jsx';
import { useChangesPaneReview } from './source-pane-review.jsx'; // R4f-findings-store
import { SourceFindingsCard, reportFindingsCardTool } from './source-findings-card.jsx';
import {plainReasoningText,thinkingQuote} from './reasoning-model.mjs';
import {createClipboardFeedback} from './clipboard-feedback.mjs';
import {clipboardEnvironment,writeClipboardPayload} from './clipboard-payload.mjs';
import {useSourceToasts} from './source-toast.jsx';
import { downloadFileContents, fileDownloadPlan } from './file-download-model.mjs';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {isGenericTool,observedGenericTool,genericToolLabel,genericToolBody} from './generic-tool-model.mjs';
import {questionOutcome,questionReceipt,toolOutputImages} from './generic-tool-model.mjs';
import {SourceQuestionReceipt,notePendingQuestion} from './source-question-receipt.jsx';
import {SourceToolImages} from './source-tool-images.jsx';
import { isMediaItem, mediaItemRow } from './media-item-model.mjs';
import {computerUseAction} from './computer-use-model.mjs';
import {SourceComputerUseStep} from './source-computer-use.jsx';
import { SourceMarkdownSelection } from './source-markdown-selection.jsx';
import { remarkStreamingInline } from './streaming-inline.mjs';
import { useResponseReveal, ResponseRevealScope, ResponseRevealSpan } from './source-response-reveal.jsx';
import { SourceAgentTool } from "./source-agent.jsx";
import { ActionButton, BusyAnnouncement, SourceApprovalCard, SourceApprovalCardView, currentlyVisible, useAllowArming, useHotkeyArming } from "./source-approval-card.jsx";
import { previewTooLarge } from "./approval-card-model.mjs";
import { SourceQuestionCard } from "./source-question-card.jsx";
import { SourceArtifacts, SourceDeliverables, itemDeliverables } from "./source-deliverables.jsx";
import { chapterOf } from "./agent-tool-titles.mjs";
import { SourceClaudeChapter } from "./source-chapters.jsx";
import { localizeBridgeNote } from "./bridge-text-model.mjs";
import { approvalIdentity, isPlanReviewRequest } from "./approval-draft-model.mjs";
import { SourcePlanApprovalCard, planTargetOf, planAcceptOptions, PlanMoreOptions } from "./source-plan-card.jsx";
import { useCardHotkeys } from './use-card-hotkeys.js';
import "./source-plan-card.css";
import { userMessageContent, shownUserItem } from "./composer-attachments-model.mjs";
import { WebLinkContext } from "./web-link-context.mjs";
import { moveToIndex, useTabDragReorder } from "./use-tab-drag-reorder.mjs";
import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import { remarkResponseMath } from './remark-response-math.mjs';
import { remarkResponseFlow, rehypeResponseFlow } from './response-flow.mjs';
import { remarkResponseFootnotes } from './remark-response-footnotes.mjs';
import { remarkResponseInlineAtoms } from './remark-response-inline-atoms.mjs';
import { directivePriority, rewriteAssistantDirectives } from './assistant-directives-model.mjs';
import { SourceAsyncQuestions } from './source-async-questions.jsx';
import { SourceResponseMath } from './source-response-math.jsx';
import { SourceResponseImage } from './source-response-image.jsx';
import { responseImageTarget } from './response-image-model.mjs';
import { ResponseTaskInput, ResponseTaskItem } from './source-response-task.jsx';
import { Icon } from "./icons";
import { SourceTooltip, SourceTooltipGroup } from "./source-tooltip.jsx";
import { SourceUserFileCard } from "./source-user-file-card.jsx"; // R2-topbar TT-07
import { SourceMenu } from "./source-menu.jsx";
import { FILE_TAB_LABELS, fileViewerMenuItems, fileTabsToRight, insertFileTab, moveFileTab, tabDetail, tabMenuItems, tabRelativePath, tabTooltip } from "./file-tab-menu-model.mjs";
import { fileContextMenu, multiFileContextMenu, fileCopyChoices, fileLinkLabel } from "./file-context-menu-model.mjs";
import { CurrentSessionIdContext, useFileGone, inMultiSelection, openWhenChecked } from "./file-gone-menu.mjs"; // R3-files FT-05
import { stableIds, tabOverflowLayout } from "./file-tab-overflow-model.mjs";
import { SourceSessionFileViewer, FILE_VIEWER_LABELS } from "./source-file-viewer.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { menuTriggerProps } from "./source-menu.jsx";
import { SourceTaskEvent } from "./source-task-event.jsx";
import { workflowTaskEvent } from "./task-event-model.mjs";
import { useSourcePointerResize } from "./use-pointer-resize.js";
import { SourcePaneControls, SourceFilesSearchButton } from "./source-pane-controls";
import { SourceDiff } from "./source-diff";
import { SourceDiffGoToFile } from "./source-pane-go-to-file.jsx";
import { diffPayload } from './diff-context-model.mjs';
import { useDiffViewPreferences } from "./diff-view-store.mjs";
import { changesMenuSections } from "./changes-menu-model.mjs";
import { SourceChangesState, SourcePlanEmpty, SourceFilesTreeState, SourceTreeErrorRow, SourceFilesEmptyPreview } from "./source-pane-states.jsx";
import { SourceUserText } from "./source-user-text.jsx";
import { parseSelectedElementMessage } from './generated/code-editor/preview-element-parser.mjs';
import { SourceSelectedElementTranscript } from './source-selected-element.jsx';
import { SourceUserActions } from "./source-user-actions.jsx";
import { notDeliveredLabel } from "./pending-send-model.mjs";
import "./source-user-delivery.css";
import { promptHeading } from "./transcript-feed-nav.mjs";
import { useShrinkWrap } from "./use-shrink-wrap.js";
import { SourceCodeBlock } from "./source-code-block";
import { SourceResponseTable, SourceTableScope } from "./source-response-table.jsx";
import { parseFileRef, chipPathOpenable } from "./user-inline-model.mjs";
import { responseLinkTarget, responseUrlLabel, responseForgeRef, forgeRefLabel, forgeRefLabelMatches, forgeRefSameRepo } from './response-link-model.mjs';
import { SourceForgeRepoContext, SourceForgeRef } from './source-forge-ref.jsx';
import { SourceFilesSearch } from "./source-files-search";
import { useFileTreeReveal } from "./use-file-tree-reveal";
import { revealChild } from "./files-search-model.mjs";
import { singleChildFolderChain, treeEntryOpenable, fileTreeGuideStyle, treeIndent, onEnterReleased,
  fileTreeCoachmarkEligible, fileTreeNuxDismissed, dismissFileTreeNux } from "./file-tree-row-model.mjs";
// R3-files FT-14: the tree's official classes and kept guides (file-tree-row-model.mjs over generated/files-changes),
// its glyphs (CDS Icon, the c280f9bbb file-type icon), the multi-selection Escape (c856385e2 nt) and the worktree start folder.
import { FILE_TREE_CONTAINER_CLASS, FILE_TREE_GUIDE_LAYER_CLASS, fileTreeRowClassName, fileTreeRowPrimary, fileTreeIconClassName,
  fileTreeNameClassName, fileTreeIconSize, applyKeptGuides } from "./file-tree-row-model.mjs";
import { CdsIcon } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { FileTypeIcon } from "./generated/files-changes/file-type-icon.mjs";
import { useMultiSelectionEscape } from "./generated/files-changes/file-selection-escape.mjs";
import { FilesQueryScope, useTreeStartFolder, startRevealNonce } from "./file-tree-start-folder.jsx";
import { SourceCoachmark } from "./source-coachmark.jsx";
import { readMarkdownCodeBlock } from "./code-fence-model.mjs";
import { detectSecrets, maskSecret, maskSecrets, secretLabel } from "./secret-redaction-model.mjs";
import { showsThinking } from "./transcript-view-model.mjs";
import { SourceCommandBody } from "./source-command.jsx";
import { commandRowLabel, commandRowState, formatDuration } from "./command-row-model.mjs";
import { SourceToolGroup } from "./source-tool-group.jsx";
import { ApprovalFileChangeBody, FileToolMessage } from "./source-file-tool.jsx";
import { fileAction } from "./file-tool-model.mjs";
import { rowExpansionKey, toolRowExpansion } from "./tool-group-expansion.mjs";
import { StatusStep, useTurnStatusRows } from "./source-transcript-rows.jsx";
import { runningCandidate } from "./transcript-rows-model.mjs";
import { SourceToolRun } from "./source-transcript-tool-rows.jsx";
import { ThoughtProcessStep, ToolRow } from "./generated/transcript-rows/group-status.mjs";
import { TranscriptToolScope } from "./transcript-tool-scope.mjs";
const TOOL_SCOPE_DEFAULTS = Object.freeze({ showThinking: true, surface: null, pendingApprovalItemIds: null, renderImages: null, renderMarkdown: null, renderAttachedFiles: null, renderCard: null, liveOutputTask: null, openLiveOutput: null });
import { pathChoices } from "./file-tool-model.mjs";
import "./source-session.css";
import { getLocale, t, tn } from "../electron/i18n/index.mjs";
import { formatTokenCount } from "./usage-cost-model.mjs";

// Source chain and deliberate Codex adaptations: analysis/source-session-batch1.md.
const desktopCall = (action, params) =>
  window.desktop?.call(action, params) ??
  Promise.reject(new Error(t("Open OpenClaude Desktop to connect to DeepSeek.")));
const basename = (path = "") =>
  path.split(/[\\/]/).filter(Boolean).at(-1) || t("Files");
const textOf = (value) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);
const errorMessage = (error) => error?.message || String(error);

// nativeTitle={false}: a control inside a CDS SourceTooltip carries no native title.
function SourceIconButton({ name, label, onClick, nativeTitle = true, ...props }) {
  return (
    <button
      type="button"
      className="source-icon-button"
      aria-label={label}
      title={nativeTitle ? label : undefined}
      onClick={onClick}
      {...props}
    >
      <Icon name={name} size={16} />
    </button>
  );
}

const SourceMarkdownContext = React.createContext({ text: "", isStreaming: false, ownerKey: null });
function SourceMarkdownPre({ node, children, ...props }) {
  const context = React.useContext(SourceMarkdownContext);
  const { text, isStreaming, ownerKey } = context;
  const instanceId = useId();
  const block = readMarkdownCodeBlock(node, text, isStreaming);
  const offset = node?.position?.start?.offset;
  // Later prose may grow while this closed fence stays unchanged. Identity
  // contains only its real owner and stable start position, never source text.
  // A parser node without a position stays isolated to this mounted Pre.
  const scopeKey = JSON.stringify([ownerKey, Number.isInteger(offset) && offset >= 0
    ? ["offset", offset] : ["instance", instanceId]]);
  if (block?.language === 'math' && block.languageSettled) return <SourceResponseMath value={block.text} display fenced />;
  return block ? <SourceCodeBlock {...block} scopeKey={scopeKey} runScope={context.messageKey ?? ownerKey} /> : <SourceMarkdownContext.Provider value={{...context, nonInteractive: true, inPre: true}}><pre {...props}>{children}</pre></SourceMarkdownContext.Provider>;
}

function SourceMarkdownTable({ node, children, ...props }) {
  const context = React.useContext(SourceMarkdownContext);
  return <SourceResponseTable {...props} isStreaming={context.isStreaming}
    wrapSnapshot={rows => <SourceMarkdownContext.Provider value={context}>{rows}</SourceMarkdownContext.Provider>}>{children}</SourceResponseTable>;
}
// code-block-current.js:1043-1100 Dr: one masked secret inside inline code,
// bullets for sighted readers, 'Redacted {label}' for assistive technology and
// a 12px Eye/EyeSlash toggle ('Reveal {label}' / 'Hide {label}').
export function SourceRedactedSecret({ value, patternId, maskValue = maskSecret }) {
  const [revealed, setRevealed] = useState(false);
  const label = secretLabel(patternId);
  const mask = useMemo(() => maskValue(value), [value, maskValue]);
  return <span data-redacted-secret="" className="smd-secret">
    <span className="smd-secret-value">{revealed ? value : <>
      <span data-find-omitted="" className="source-sr-only smd-secret-sr">{t("Redacted {label}", { label })}</span>
      <span aria-hidden="true">{mask}</span>
    </>}</span>
    <button type="button" className="smd-secret-toggle" aria-pressed={revealed} aria-label={t(revealed ? "Hide {label}" : "Reveal {label}", { label })}
      onClick={event => { event.stopPropagation(); setRevealed(value => !value); }}>
      <Icon name={revealed ? "EyeSlash" : "Eye"} size={12} />
    </button>
  </span>;
}
// Or (:1086-1096): plain runs between the masked secrets.
function secretRuns(text, secrets) {
  const runs = []; let offset = 0;
  for (const secret of secrets) {
    if (secret.start > offset) runs.push(text.slice(offset, secret.start));
    runs.push(<SourceRedactedSecret key={secret.start} value={secret.value} patternId={secret.patternId} />);
    offset = secret.end;
  }
  if (offset < text.length) runs.push(text.slice(offset));
  return runs;
}
// markdown-current.js:4236-4252 Pc: inline code carries data-epitaxy-inline-code
// (and data-epitaxy-file-ref when it reads as a file reference) for the
// transcript context menu. Code that is not a file reference is scanned for
// secrets once its block stops growing; a match masks data-code-text and the
// rendered runs (a non-interactive copy shows the masked text only).
function SourceMarkdownCode({ node, children, ...props }) {
  const context = React.useContext(SourceMarkdownContext);
  const raw = typeof children === 'string' ? children : null;
  const parsed = raw !== null && !context.inPre ? parseFileRef(raw) : null;
  const file = context.nonInteractive ? null : parsed;
  const secrets = useMemo(() => raw === null || parsed || context.isStreaming ? null : detectSecrets(raw), [raw, parsed, context.isStreaming]);
  const inline = context.inPre ? {} : { 'data-epitaxy-inline-code': '', 'data-epitaxy-file-ref': parsed ? '' : undefined };
  if (secrets?.length) {
    const masked = maskSecrets(raw, secrets);
    return <code {...props} {...inline} data-code-text={masked}>{context.nonInteractive ? masked : secretRuns(raw, secrets)}</code>;
  }
  const content = <code {...props} {...inline}>{children}</code>;
  if (!file || !context.onOpenFileRef || !chipPathOpenable(file.path, context.cwd)) return content;
  const open = () => context.onOpenFileRef(file);
  return <span role="button" tabIndex={0} className="smd-file-ref" data-file-ref={file.path} data-file-line={file.line}
    onClick={open} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }}>{content}</span>;
}
function SourceMarkdownLink({ node, href, children }) {
  const context = React.useContext(SourceMarkdownContext);
  // The session's opener (main.jsx WebLinkContext): a plain click on a local page's link opens it in Preview.
  const openWebLink = React.useContext(WebLinkContext);
  // A ::code-comment finding's priority (assistant-directives-model findingMarkdown): the P0–P3 badge.
  const priority = directivePriority(href);
  if (priority !== null) return <span className="smd-priority" data-priority={priority} role="img" aria-label={t("Priority {priority}", { priority })}>{`P${priority}`}</span>;
  const repoSlug = React.useContext(SourceForgeRepoContext);
  const target = responseLinkTarget(href, context.cwd);
  const inertChildren = <SourceMarkdownContext.Provider value={{...context,nonInteractive:true}}>{children}</SourceMarkdownContext.Provider>;
  if (target.kind === 'file') {
    // Source pi: simple labels become code; a single-level emphasis/code
    // label uses the destination, while descriptive prose retains markup.
    const parts = React.Children.toArray(children);
    let label = '', formatted = false, simple = parts.length > 0;
    for (const part of parts) {
      if (typeof part === 'string') { label += part; continue; }
      if (!React.isValidElement(part) || !(['strong','em','code'].includes(part.type) || part.type === SourceMarkdownCode)) { simple = false; break; }
      const content = React.Children.toArray(part.props.children);
      if (content.length !== 1 || typeof content[0] !== 'string') { simple = false; break; }
      label += content[0]; formatted = true;
    }
    let decodedHref = href; try { decodedHref = decodeURI(href); } catch { /* Literal malformed URL. */ }
    const codeLabel = simple && label && !/\s/.test(label) ? (formatted ? decodedHref : label) : null;
    const content = codeLabel === null ? inertChildren : <code>{codeLabel}</code>;
    if (!target.openable || !context.onOpenFileRef) return content;
    const open = () => context.onOpenFileRef(target.file);
    return <span role="button" tabIndex={0} className={codeLabel === null ? 'smd-file-link' : 'smd-file-ref'}
      data-file-ref={target.file.path} data-file-line={target.file.line} data-file-end-line={target.file.endLine}
      onClick={open} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }}>{content}</span>;
  }
  if (target.kind !== 'external') return inertChildren;
  const parts = React.Children.toArray(children);
  const open = event => {
    event.preventDefault();
    if (event.button !== 0 && event.button !== 1) return;
    if (openWebLink) openWebLink(target.href, event); else desktopCall('external', { url: target.href }).catch(() => {});
  };
  const onAuxClick = event => { if (event.button === 1) open(event); }, onDragStart = event => event.preventDefault();
  // markdown-current.js:4358-4365, :4543-4555: in transcript text a GitHub PR/issue link whose label
  // is empty, '#N', 'owner/repo#N' or its own URL (Gs), with no empty element child, is the rc chip.
  const forgeRef = repoSlug !== null ? responseForgeRef(href) : null;
  if (forgeRef) {
    const textOf = value => typeof value === 'string' || typeof value === 'number' ? String(value)
      : Array.isArray(value) ? value.map(textOf).join('') : React.isValidElement(value) ? textOf(value.props.children) : '';
    if (!parts.some(part => React.isValidElement(part) && textOf(part) === '') && forgeRefLabelMatches(textOf(parts), forgeRef))
      return <SourceForgeRef href={href} forgeRef={forgeRef} label={forgeRefLabel(href, forgeRef, forgeRefSameRepo(forgeRef, repoSlug))}
        onClick={open} onAuxClick={onAuxClick} onDragStart={onDragStart}/>;
  }
  const shortened = parts.every(part => typeof part === 'string' || typeof part === 'number')
    ? responseUrlLabel(parts.join(''), href) : null;
  return <a href={href} target="_blank" rel="noreferrer" title={shortened?.title} onClick={open}
    onAuxClick={event => { if (event.button === 1) open(event); }} onDragStart={event => event.preventDefault()}>{shortened?.label ?? inertChildren}</a>;
}
function SourceMarkdownImage({src,alt}) {
  const context=React.useContext(SourceMarkdownContext);
  return <SourceResponseImage key={JSON.stringify([context.cwd,src])} src={src} alt={alt} cwd={context.cwd} call={desktopCall}
    fallback={<SourceMarkdownLink href={src}>{alt||src}</SourceMarkdownLink>}/>;
}
const RESPONSE_MARKDOWN_COMPONENTS = { img:SourceMarkdownImage, 'response-math': SourceResponseMath, span: ResponseRevealSpan, pre: SourceMarkdownPre, table: SourceMarkdownTable, code: SourceMarkdownCode, a: SourceMarkdownLink, input: ResponseTaskInput, li: ResponseTaskItem };

// extension {rehypePlugins, components, skipAttributes} (the Plan pane's comment marks, B22): extra rehype plugins and
// component overrides; the document renders as one block so a plugin sees the whole tree (flat-text offsets), and
// skipAttributes wrap each <pre> and math node (cccc2cf0a Uh pre: div[data-plan-comment-skip]).
export function SourceMarkdown({ text = "", isStreaming = false, paceReveal = false, isInterrupting = false, sessionKey = null, itemId, cwd = null, onOpenFileRef = null, extension = null }) {
  const instanceId = useId();
  const ownerKey = JSON.stringify([sessionKey, itemId ?? ["instance", instanceId]]);
  return <OwnedSourceMarkdown key={ownerKey} {...{text,isStreaming,paceReveal,isInterrupting,ownerKey,cwd,onOpenFileRef,extension}}/>;
}
function OwnedSourceMarkdown({ text: rawText, isStreaming, paceReveal, isInterrupting, ownerKey, cwd, onOpenFileRef, extension }) {
  // Codex review findings (::code-comment) as finding items, git receipts (::git-*) hidden, as the Codex TUI shows them.
  const sourceText = useMemo(() => rewriteAssistantDirectives(rawText, { cwd, streaming: isStreaming }), [rawText, cwd, isStreaming]);
  return <SourceResponseBoundary text={sourceText}>
    <RichSourceMarkdown {...{sourceText,isStreaming,paceReveal,isInterrupting,ownerKey,cwd,onOpenFileRef,extension}}/>
  </SourceResponseBoundary>;
}
function extensionComponents(extension) {
  if (!extension?.components && !extension?.skipAttributes) return RESPONSE_MARKDOWN_COMPONENTS;
  const skip = extension.skipAttributes;
  const wrapped = skip ? {
    pre: (props) => <div {...skip}><SourceMarkdownPre {...props} /></div>,
    'response-math': (props) => <span {...skip}><SourceResponseMath {...props} /></span>,
  } : {};
  return { ...RESPONSE_MARKDOWN_COMPONENTS, ...wrapped, ...extension.components };
}
const SourceMarkdownBlock = React.memo(function SourceMarkdownBlock({block,ownerKey,cwd,onOpenFileRef,ledger,extension}) {
  const context=React.useMemo(()=>({text:block.text,isStreaming:block.frontier,ownerKey:JSON.stringify([ownerKey,block.start]),messageKey:ownerKey,cwd,onOpenFileRef}),[block,ownerKey,cwd,onOpenFileRef]);
  const remarkPlugins=React.useMemo(()=>[remarkGfm,[remarkMath,{singleDollarTextMath:false}],remarkResponseMath,remarkResponseFootnotes,[remarkFrontierDefinitions,{enabled:block.frontier}],[remarkPriorDefinitions,{definitions:block.definitions}],[remarkStreamingInline,{enabled:block.frontier}],remarkResponseInlineAtoms,remarkResponseBlockQuotes,remarkResponseFlow],[block.definitions,block.frontier]);
  const rehypePlugins=React.useMemo(()=>[rehypeResponseFlow,...(ledger?[[rehypeResponseReveal,{ledger,blockOffset:block.index}]]:[]),...(extension?.rehypePlugins??[])],[ledger,block.index,extension?.rehypePlugins]);
  const components=React.useMemo(()=>extensionComponents(extension),[extension?.components,extension?.skipAttributes]);
  return <SourceMarkdownContext.Provider value={context}><Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}
    urlTransform={(value,key,node)=>(node.tagName==='a'&&value.startsWith('file:///'))||node.tagName==='img'&&['data','file'].includes(responseImageTarget(value,cwd).kind)?value:defaultUrlTransform(value)}
    components={components}>{block.text}</Markdown></SourceMarkdownContext.Provider>;
});
function SourceMarkdownBlocks({text,isStreaming,ownerKey,cwd,onOpenFileRef,ledger}) {
  const [snapshot,setSnapshot]=React.useState(()=>advanceResponseBlocks(null,text,isStreaming));
  let state=snapshot;
  if(snapshot.text!==text||snapshot.isStreaming!==isStreaming){state=advanceResponseBlocks(snapshot,text,isStreaming);setSnapshot(state);}
  return state.blocks.map(block=><React.Fragment key={block.index}>{block.index>0?'\n':null}<SourceMarkdownBlock {...{block,ownerKey,cwd,onOpenFileRef,ledger}}/></React.Fragment>);
}
function RichSourceMarkdown({ sourceText, isStreaming, paceReveal, isInterrupting, ownerKey, cwd, onOpenFileRef, extension }) {
  const [fallbackActive,setFallbackActive]=React.useState(false);
  const activateFallback=React.useCallback(()=>setFallbackActive(true),[]);
  const text=useResponsePacing(sourceText,{enabled:paceReveal&&isStreaming&&!fallbackActive,interrupting:isInterrupting&&isStreaming});
  const reveal=useResponseReveal(text,isStreaming);
  const open=React.useRef(onOpenFileRef);open.current=onOpenFileRef;
  const openFile=React.useCallback(file=>open.current?.(file),[]);
  return <ResponseRevealScope animations={reveal.animations}><SourceTableScope scopeKey={ownerKey}><SourceMarkdownSelection text={text}>
    <SourceBlockBoundary onFallback={activateFallback} fallback={<SourceMarkdownBlock block={{index:0,start:0,text,definitions:'',frontier:isStreaming}} {...{ownerKey,cwd,extension}} onOpenFileRef={onOpenFileRef?openFile:null} ledger={reveal.ledger}/>}>
      {extension ? <SourceMarkdownBlock block={{index:0,start:0,text,definitions:'',frontier:isStreaming}} {...{ownerKey,cwd,extension}} onOpenFileRef={onOpenFileRef?openFile:null} ledger={reveal.ledger}/>
        : <SourceMarkdownBlocks {...{text,isStreaming,ownerKey,cwd}} onOpenFileRef={onOpenFileRef?openFile:null} ledger={reveal.ledger}/>}
    </SourceBlockBoundary>
  </SourceMarkdownSelection></SourceTableScope></ResponseRevealScope>;
}

function outcome(item) {
  if (item.status === "inProgress" || item.status === "running") return "busy";
  // Codex reports the outcome in `status`; a command's own non-zero exit code
  // is not a tool failure and the official row never reads one
  // (approval-current.js:16934, and "Exit code {code}" at :21215 belongs to the
  // environment setup-script step, not to a tool row). Command rows go through
  // commandRowState; this helper stays status-only for every other item type.
  if (item.status === "failed") return "failed";
  if (["declined", "denied"].includes(item.status)) return "denied";
  if (["interrupted", "cancelled", "canceled", "stopped"].includes(item.status))
    return "stopped";
  if (item.status === "blocked") return "blocked";
  return "done";
}

export { reasoningText } from './transcript-item-visibility.mjs';
/** True when a transcript contains at least one renderable reasoning item (official Ma). */
export function sessionHasThinking(items = []) {
  return items.some((item) => item?.type === "reasoning" && reasoningText(item) !== "");
}

// TurnStatus.Step: the label is muted, meta is primary, and only exceptional
// outcomes have a status word. Successful steps deliberately have no badge.
// Words and tones: c05970c42-DsE8IUGc.js:61-92 (Ce). "blocked" reads
// "Needs approval", not the state name.
const STEP_OUTCOME_WORD = {
  failed: t("Failed"),
  stopped: t("Stopped"),
  unknown: t("Status unavailable"),
  denied: t("Denied"),
  blocked: t("Needs approval"),
};
function SourceStep({
  item,
  label,
  meta,
  metaTitle,
  trailing,
  caretSize = 12,
  classic = false,
  state = "done",
  children,
  className = "",
  defaultOpen = false,
  forcedOpen = false,
  sessionKey = null,
  actions = null,
  actionsLabel,
  after = null,
}) {
  // PN / dN (approval-current:16830–16875): Verbose forces the body open,
  // while the explicit row intention survives remounts and view changes.
  const id = useId();
  const expansionKey = rowExpansionKey(sessionKey ?? id, item.id);
  const remembered = useSyncExternalStore(toolRowExpansion.subscribe,
    () => toolRowExpansion.get(expansionKey), () => toolRowExpansion.get(expansionKey));
  const open = forcedOpen || (remembered ?? defaultOpen);
  const [mountedKey, setMountedKey] = useState(open ? expansionKey : null);
  useEffect(() => { if (open) setMountedKey(expansionKey); }, [open, expansionKey]);
  const mounted = open || mountedKey === expansionKey;
  const toggle = () => { if (!forcedOpen) toolRowExpansion.set(expansionKey, !open); };
  const hasBody = children != null;
  // turnStatusRows (GrowthBook __gb__2846116625, on): the row is the desktop's CDS TurnStatus.Step (c96d752d0 qP / $Ae /
  // HZ), and while its tool runs ZAe's busy row that takes the turn's mark (source-transcript-rows.jsx). The classic
  // markup below is the gate-off branch.
  const statusRows = useTurnStatusRows();
  if (statusRows) {
    const unknown = state === "unknown" ? <span className="shrink-0 text-muted">{STEP_OUTCOME_WORD.unknown}</span> : null;
    return <StatusStep state={state} label={label} meta={meta} metaTitle={metaTitle || (typeof meta === "string" ? meta : undefined)}
      trailing={unknown ? <>{trailing}{unknown}</> : trailing} actions={actions ?? undefined} actionsLabel={actions ? actionsLabel || t("Message actions") : undefined}
      open={open} onOpenChange={next => { if (!forcedOpen && next !== open) toolRowExpansion.set(expansionKey, next); }}
      candidate={state === "busy" ? runningCandidate(item) : undefined} after={after}
      rest={{ "data-transcript-item-id": item.id, className: `source-message ${className}`.trim() }}>{children}</StatusStep>;
  }
  return (
    <div
      className={`source-message source-step ${classic ? 'source-step-classic' : ''} ${className}`}
      data-transcript-item-id={item.id}
      data-cds="TurnStatusStep"
      data-state={state}
    >
      <div
        role="button"
        tabIndex={hasBody ? 0 : -1}
        className="source-step-trigger"
        aria-expanded={hasBody ? open : undefined}
        aria-controls={hasBody ? id : undefined}
        onClick={event => { if (hasBody && event.currentTarget.contains(event.target)) toggle(); }}
        aria-disabled={!hasBody || undefined}
        onKeyDown={event => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); if (hasBody) toggle(); }
        }}
      >
        <span
          className={`source-step-label ${state === "busy" ? "source-shimmer" : ""}`}
        >
          {label}
        </span>
        {meta && (
          <span className="source-step-meta" title={metaTitle || (typeof meta === "string" ? meta : undefined)}>
            {meta}
          </span>
        )}
        {trailing}
        {STEP_OUTCOME_WORD[state] && !(classic && state === "failed") && (
          <span className="source-step-outcome">{STEP_OUTCOME_WORD[state]}</span>
        )}
        {hasBody && (
          <Icon name="CaretRight" size={caretSize} className="source-step-caret" />
        )}
        {state === "busy" && (
          <span className="source-sr-only">{t("In progress")}</span>
        )}
      </div>
      {/* c425fb3cf:j - the body mounts on the first expansion and a later close
          only hides it, so scroll position inside a tool output survives a
          collapse. */}
      {mounted && (
        <div id={id} className="source-step-detail" hidden={!open}>
          {/* TurnStatus.Step Rt (c05970c42:965-1009): the body beside an
              h-[1lh] actions toolbar named by actionsLabel. */}
          {actions ? <div className="source-step-detail-row" data-cds-actions-scope="">
            <div className="source-step-detail-body">{children}</div>
            <div className="source-step-actions" role="toolbar" aria-label={actionsLabel || t("Message actions")}>{actions}</div>
          </div> : children}
        </div>
      )}
      {/* RN (approval-current.js:17093, :17302): content that belongs to the row but sits outside
          its collapsible body, such as the hoisted QO output images, stays in the row root so the
          row is one transcript item (feed article runs, follow-pin and footer-hover lookups). */}
      {after}
    </div>
  );
}

// c96d752d0 UZ: the classic italic thought block (zZ) without turnStatusRows, with it the original HZ (generated
// ThoughtProcessStep): the open "Thought process" up.Step with its copy action, "Thinking actions". Verbose opens it.
function SourceReasoningRow({ item, text, stepDefaults, preceding = false }) {
  const statusRows = useTurnStatusRows();
  const scope = useMemo(() => ({ ...TOOL_SCOPE_DEFAULTS, transcriptView: stepDefaults?.forcedOpen ? "verbose" : "normal" }), [stepDefaults?.forcedOpen]);
  if (statusRows)
    return <div className="source-message source-reasoning source-reasoning-step" data-transcript-item-id={item.id}>
      <TranscriptToolScope.Provider value={scope}><ThoughtProcessStep text={text} expansionKey={`${stepDefaults?.sessionKey ?? ""}:${item.id}:thinking`} /></TranscriptToolScope.Provider>
    </div>;
  if (preceding)
    return <SourceStep item={item} label={t("Thought process")} className="source-reasoning source-reasoning-step" defaultOpen {...stepDefaults}
      actions={<SourceCopyQuote text={text} variant="action" />} actionsLabel={t("Thinking actions")}>
      <div className="source-reasoning-step-text"><bdi>{text}</bdi></div>
    </SourceStep>;
  return (
    <div className="source-message source-reasoning source-reasoning-block" data-transcript-item-id={item.id}>
      <div className="source-reasoning-text">{text}</div>
      <div className="source-reasoning-copy"><SourceCopyQuote text={text} /></div>
    </div>
  );
}

function Diff({ value = "", scopeKey, ...props }) {
  return <SourceDiff value={value} scopeKey={scopeKey} {...props} />;
}

// File actions now have the corresponding UO/GO bodies (edit-read-ui).

// Ordinary user turn (2.2553.1 j1 standard branch): an outer column with the
// source 8px gap holds the bubble group (4px gap: attachments, bubble) and a
// persistent actions row. The article is the pointer/focus latch and hover
// reveal scope. The bubble keeps its 85% ceiling and then shrink-wraps by
// measurement; the row is mounted only for real copyable text.
const IMAGE_URL = /^(?:https?:|data:image\/)/i;
function attachmentSource(part) {
  if (typeof part.path === "string" && part.path.startsWith("/"))
    return encodeURI(`file://${part.path}`);
  const url = part.imageUrl || part.url || part.image_url;
  return typeof url === "string" && IMAGE_URL.test(url) ? url : null;
}
function isImagePart(part) {
  return typeof part.type === "string" && part.type.toLowerCase().includes("image");
}

// ep -> $f (scroll-shared-10): a tile is natural only when the frame setting
// naturalImageTiles is true, or "sized" with finite width/height on the image
// item (Zf). Local Codex image parts carry no dimensions, so the tile is the
// non-natural Of branch: a 7.5rem square rounded-card Card (hairline
// border-strong ring, surface-1, field drop shadow) whose img fills it with
// object-contain and 120x120 attributes, fading in on load. No sr-only name
// (media="content"), no tile-media/picture markers, no lightbox. A failed
// load keeps the square and shows the Image glyph at 50% opacity.
function UserImageTile({ part, index }) {
  const [state, setState] = useState("loading");
  const src = attachmentSource(part);
  const name = part.path ? basename(part.path) : t("Attached image {number}", { number: index + 1 });
  return (
    <div data-cds="MessageAttachmentsImage" data-state={state === "failed" ? "failed" : undefined}
      className="source-user-attachment-image" title={part.path || undefined}>
      <div data-cds="Card" className="source-user-attachment-card">
        <span aria-hidden="true" className="source-user-attachment-fill" />
        {src && state !== "failed" && (
          <img src={src} alt={name} width={120} height={120} loading="lazy" decoding="async"
            className="source-user-attachment-picture" data-loaded={state === "loaded" ? "" : undefined}
            onLoad={() => setState("loaded")} onError={() => setState("failed")}
            onDragStart={(event) => event.preventDefault()} />
        )}
        {(!src || state === "failed") && (
          <span aria-hidden="true" className="source-user-attachment-glyph"><Icon name="Image" size={24} /></span>
        )}
      </div>
    </div>
  );
}

// R2-topbar TT-07 (2.42304.0 shared-2 Pp/Np): a real non-image path part becomes the square file card of
// source-user-file-card.jsx, its name in 2–4 adaptive lines with the head/…/tail split.
function UserFileCard({ part }) {
  return <SourceUserFileCard name={basename(part.path)} path={part.path} />;
}

// Errors a language server found after an edit: a muted list of location and message (no motion).
export function SourceDiagnostics({ diagnostics, cwd = null }) {
  const relative = (file) => (cwd && typeof file === "string" && file.startsWith(`${cwd}/`) ? file.slice(cwd.length + 1) : file);
  return <div className="source-diagnostics" role="group" aria-label={t("Diagnostics")} data-diagnostics="">
    <div className="source-diagnostics-title">{tn(diagnostics.length, "{count} error from the language server", "{count} errors from the language server")}</div>
    <ul>{diagnostics.map((entry, index) => <li key={index}>
      <span className="source-diagnostics-where">{relative(entry.path)}{entry.line ? `:${entry.line}${entry.column ? `:${entry.column}` : ""}` : ""}</span>
      <span className="source-diagnostics-message">{entry.message}</span>
    </li>)}</ul>
  </div>;
}

// 'Scheduled prompt · 10:05' (today) or with its date, for a prompt the agent's scheduler fired.
export function scheduledLabel(firedAt, now = Date.now()) {
  const date = Number.isFinite(firedAt) ? new Date(firedAt) : null;
  if (!date || !Number.isFinite(date.getTime())) return t("Scheduled prompt");
  const today = new Date(now).toDateString() === date.toDateString();
  const time = today ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return t("Scheduled prompt · {time}", { time });
}

// A finished dynamic workflow's notification to the model (Claude Code's <task-notification>), shown as Claude's
// task-event row (source-task-event.jsx): 'Background workflow completed · {name} · took {elapsed}', which focuses
// the run in the Background tasks pane.
function SourceWorkflowNotice({ item, onOpen = null }) {
  const notice = item.workflowNotification;
  // A workflow agent's blocking question (the main agent answers it) and a run waiting on its model provider: rows of
  // their own, the question and its context behind a disclosure.
  if (notice?.kind === "escalation") {
    const label = notice.agent && notice.workflow ? t("{agent} in {workflow} has a question", { agent: notice.agent, workflow: notice.workflow })
      : notice.agent ? t("{agent} has a question", { agent: notice.agent }) : notice.workflow ? t("An agent in {workflow} has a question", { workflow: notice.workflow }) : t("A workflow agent has a question");
    return <details className="source-task-event source-workflow-question" data-transcript-item-id={item.id} data-task-event-status="question">
      <summary className="stev-line"><span className="stev-label">{label}</span></summary>
      {notice.question && <p className="stev-question">{notice.question}</p>}
      {notice.context && <p className="stev-context">{notice.context}</p>}
    </details>;
  }
  if (notice?.kind === "settings") {
    return <div className="source-task-event" data-transcript-item-id={item.id} data-task-event-status="settings">
      <span className="stev-line"><span className="stev-label">{t("Changed the workflow’s settings")}</span>{notice.workflow && <span className="stev-description"><bdi>{`· ${notice.workflow}`}</bdi></span>}</span>
    </div>;
  }
  if (notice?.kind === "stall") {
    const waited = Number.isFinite(notice.stalledMs) ? formatDuration(Math.round(notice.stalledMs / 1000)) : null;
    const label = notice.workflow ? t("{workflow} is waiting for the model provider", { workflow: notice.workflow }) : t("A workflow is waiting for the model provider");
    return <div className="source-task-event" data-transcript-item-id={item.id} data-task-event-status="stalled">
      <span className="stev-line"><span className="stev-label">{label}</span>{waited && <span className="stev-elapsed">{`· ${t("no reply for {duration}", { duration: waited })}`}</span>}</span>
    </div>;
  }
  const event = workflowTaskEvent(notice);
  // A Monitor event (no status): the model reads it; the transcript shows no row, as Claude's.
  if (!event) return null;
  return <SourceTaskEvent events={[event]} itemId={item.id} onOpen={onOpen ? () => onOpen(event) : null} />;
}
function SourceUserMessage({ item, turnStart, sessionKey, cwd = null, onOpenFileRef = null, agentNested = false, turnStartedAtMs = null, userActions = null }) {
  // The attachment note a core without file mentions gets ("[Attached file: P]", live or joined into Codex history)
  // leaves the bubble and shows as the file's card (composer-attachments-model userMessageContent).
  const content = useMemo(() => userMessageContent(item.content || []), [item.content]);
  const rawText = content
    .filter((part) => part.type === "text" || part.text)
    .map((part) => part.text || "")
    .join("\n");
  const selectedElements = useMemo(() => parseSelectedElementMessage(rawText), [rawText]);
  const text = selectedElements.text;
  const attachments = content.filter(
    (part) => !part.text && (part.path || part.imageUrl || part.url || part.image_url),
  );
  // The source associates each context with its preceding screenshot. Our
  // protocol puts selected-element images before ordinary image attachments.
  const elementImages = attachments.filter(part => isImagePart(part) || part.name === 'element-screenshot.png');
  const usedElementImages = new Set();
  let elementImageIndex = 0;
  const elementCards = selectedElements.views.map(view => {
    const part = view.hasScreenshot ? elementImages[elementImageIndex++] : null;
    const src = part && attachmentSource(part);
    if (src) usedElementImages.add(part);
    return { view, screenshot: src ? { src, path: part.path, fileName: part.path ? basename(part.path) : undefined } : undefined };
  });
  const ordinaryAttachments = attachments.filter(part => !usedElementImages.has(part));
  const hasFileAttachments = attachments.some((part) => typeof part.path === "string" && part.path !== "");
  const [interacted, setInteracted] = useState(false);
  const latch = interacted ? undefined : () => setInteracted(true);
  const bubbleRef = useShrinkWrap({ enabled: true });
  // scroll-messages-current.js:39513-39521: the sr-only 'You said: {prompt}'
  // h2 (Fe = af(prompt)) opens the message group, outside find.
  const heading = useMemo(() => promptHeading(text), [text]);
  // A send the core does not have yet (pending-send-model.mjs pendingUserRow): dimmed with 'Sending…', or
  // 'Not delivered · {time}' with Retry / Discard once turn/start was refused.
  const delivery = item.localDelivery ?? null;
  return (
    <article
      className="source-message message user-message source-user-message"
      data-delivery-status={delivery?.status}
      data-transcript-item-id={item.id}
      data-cds="UserMessage"
      data-turn-start={turnStart || undefined}
      onPointerEnter={latch}
      onFocusCapture={latch}
    >
      <div className="source-user-group" data-cds="UserMessageGroup">
        {heading && <h2 data-find-omitted="" className="sr-only select-none">{heading}</h2>}
        {/* A prompt the agent's scheduler fired (MiMo cron / loop: codeDesktop.origin), as the TUI's clock row. */}
        {item.codeDesktop?.origin?.kind === "cron" && <div className="source-user-scheduled" data-scheduled-prompt="">
          <Icon name="Clock" size={14} aria-hidden="true" />
          <span>{scheduledLabel(item.codeDesktop.origin.firedAt)}</span>
        </div>}
        {ordinaryAttachments.length > 0 && (
          <div className="source-user-attachments" data-cds="MessageAttachments">
            {ordinaryAttachments.map((part, index) =>
              isImagePart(part) || !part.path
                ? <UserImageTile key={index} part={part} index={index} />
                : <UserFileCard key={index} part={part} />)}
          </div>
        )}
        {elementCards.map(({ view, screenshot }, index) => <SourceSelectedElementTranscript key={index} view={view} screenshot={screenshot} />)}
        {text && <div className="source-user-bubble" ref={bubbleRef}><SourceUserText text={text} sessionKey={sessionKey} itemId={item.id}
          cwd={cwd} onOpenFileRef={onOpenFileRef} hasFileAttachments={hasFileAttachments} /></div>}
      </div>
      {/* Codex has one startedAt per turn: only the user row that opens its turn
          shows it; a steer added mid-turn gets no time (no per-message timestamp). */}
      {delivery?.status === "sending" && <div className="source-user-delivery" data-find-omitted="">
        <span role="status" className="source-user-delivery-status">{t("Sending…")}</span>
      </div>}
      {delivery?.status === "failed" && <div className="source-user-failed-send" data-testid="epitaxy-failed-send" data-find-omitted="">
        <span className="source-user-failed-note" role="alert"><Icon name="Warning" size={12} aria-hidden="true" />{notDeliveredLabel(delivery.sentAt)}</span>
        {delivery.onRetry && <SourceSettingsButton variant="ghost" data-step="1" className="source-user-failed-button" onMouseDown={(event) => event.preventDefault()} onClick={delivery.onRetry}>{t("Retry")}</SourceSettingsButton>}
        {delivery.onDiscard && <SourceSettingsButton variant="ghost" data-step="1" className="source-user-failed-button" onMouseDown={(event) => event.preventDefault()} onClick={delivery.onDiscard}>{t("Discard")}</SourceSettingsButton>}
      </div>}
      {text && !agentNested && !delivery && <SourceUserActions sessionKey={sessionKey} itemId={item.id} text={text} interacted={interacted}
        startedAtMs={turnStart ? turnStartedAtMs : null} rewind={userActions?.rewind ?? null} onFork={userActions?.fork ?? null} />}
    </article>
  );
}

// V2 / oue (scroll-messages-current.js:44449-44525): "Copy as quote" writes
// the B2 quote, flips to Check / "Copied" and adds the "Copied" toast. The
// step action sits in the TurnStatus.Step toolbar; the standalone block uses a
// ghost icon button revealed on hover or focus.
function SourceCopyQuote({ text, variant = "hover" }) {
  const toasts = useSourceToasts();
  const button = useRef(null), controller = useRef(null);
  const [state, setState] = useState("idle");
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      timeout: 2000, onState: setState,
      writeText: async value => {
        if (!await writeClipboardPayload(clipboardEnvironment(button.current), { text: value })) throw Error("Clipboard unavailable");
      },
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, []);
  useLayoutEffect(() => { controller.current?.setText(thinkingQuote(text)); }, [text]);
  const copied = state === "copied", label = copied ? t("Copied") : t("Copy as quote");
  const copy = () => { void controller.current?.copy().then(done => { if (done) toasts?.add(t("Copied")); }); };
  return <SourceTooltip content={label} hoverable={false}>
    <SourceSettingsButton ref={button} variant="ghost" size={variant === "action" ? "xs" : undefined} iconOnly icon={copied ? "Check" : "Copy"}
      iconSize={variant === "action" ? "auto-sm" : "auto"} className="source-reasoning-copy-button" aria-label={label}
      onMouseDown={variant === "action" ? undefined : event => event.preventDefault()} onClick={copy} />
  </SourceTooltip>;
}

// transcriptView (official c819d4a78 branch): thinking/verbose render reasoning
// items, normal hides them; verbose additionally mounts steps expanded.
// Group members (inToolGroup) are m8's RN{inGroup, inCard:true}
// (approval-current.js:54035-54063): command and Read/Edit bodies take the
// inCard layouts of Uoe/GO (:6874-6941) and UO (:6784-6837).
const NO_PENDING_APPROVALS = new Set();
// turnStatusRows on (GrowthBook __gb__2846116625, host-growthbook.mjs): a standalone tool row is the 2.42304.0 tool group
// n0 over its SDK tool call (source-transcript-tool-rows.jsx), as every tools entry of the desktop's transcript is. The
// host keeps its own cards for what it draws as one: chapters, deliverables, findings, answered questions, workflow
// runs, agents, computer use and image / sleep / hook items (the last ones also inside original groups, through the
// engine surface).
export function officialToolItem(item) {
  if (!item || item.workflowRun || chapterOf(item) || itemDeliverables(item) || reportFindingsCardTool(item)) return false;
  if (item.type === "commandExecution" || item.type === "fileChange" || fileAction(item)) return true;
  if (!isGenericTool(item) || item.type === "functionCallOutput") return false;
  return !questionReceipt(item, commandRowState(item));
}
// The host's side of the original tool rows (SourceToolRun's `host`): its cards, images, markdown and file openers. The
// tool result bodies are the originals (cb6930dae Tu over the SDK tool call and its result, transcript-sdk-tools.mjs);
// what the host still draws under a row is an item's deliverables (codeDesktop.artifacts, where the desktop draws the
// files a tool attached: cb6930dae iu).
function useToolRunHost({ agentContext, sessionKey, cwd, onOpenFileRef, onOpenChanges, transcriptView, pendingApprovalItemIds, isStreaming, agentNested, liveTail = false }) {
  return useMemo(() => {
    const renderAttachedFiles = (item) => {
      if (!item || !isGenericTool(item)) return null;
      const observed = observedGenericTool(item, agentContext?.state, sessionKey);
      return Array.isArray(observed.codeDesktop?.artifacts) && observed.codeDesktop.artifacts.length ? <SourceArtifacts artifacts={observed.codeDesktop.artifacts} sessionKey={sessionKey} /> : null;
    };
    const renderMarkdown = (text) => <SourceMarkdown text={text} sessionKey={sessionKey} cwd={cwd} onOpenFileRef={onOpenFileRef} />;
    const renderHostRow = (item, props = {}) => <SourceMessage agentContext={agentContext} agentNested={agentNested} inToolGroup={props.inGroup !== false} item={item} isStreaming={isStreaming}
      sessionKey={sessionKey} cwd={cwd} onOpenFileRef={onOpenFileRef} onOpenChanges={onOpenChanges} transcriptView={transcriptView} pendingApprovalItemIds={pendingApprovalItemIds ?? NO_PENDING_APPROVALS} />;
    const renderCard = (kind, props) => {
      const item = props.tool?.hostItem;
      if (!item) return undefined;
      if (kind === "mcp-app" && isMcpCallItem(item))
        return <SourceMcpAppRow item={item} sessionKey={sessionKey} awaitingApproval={!!pendingApprovalItemIds?.has(item.id)} fallback={props.fallback ?? <ToolRow tool={props.tool} />} />;
      if (kind === "findings" && reportFindingsCardTool(item))
        return <SourceFindingsCard item={item} sessionKey={sessionKey} items={agentContext?.state?.items?.[sessionKey] ?? null}
          turnErrors={agentContext?.state?.turnErrors?.[sessionKey] ?? null} turnTimes={agentContext?.state?.turnTimes?.[sessionKey] ?? null} />;
      if (kind === "question") {
        const observed = observedGenericTool(item, agentContext?.state, sessionKey);
        const pairs = questionReceipt(observed, commandRowState(observed, !!pendingApprovalItemIds?.has(item.id)));
        return pairs ? <SourceQuestionReceipt item={item} pairs={pairs} sessionKey={sessionKey} /> : undefined;
      }
      return undefined;
    };
    const renderImages = (images, path) => <SourceToolImages images={images.map(image => `data:${image.mimeType};base64,${image.data}`)} itemId={path || undefined} />;
    const openFilePath = onOpenFileRef ? (path, { line, endLine } = {}) => {
      onOpenFileRef({ path: pathChoices(path, cwd)?.absolute || path, ...(Number.isFinite(line) ? { line } : {}), ...(Number.isFinite(endLine) ? { endLine } : {}) });
    } : null;
    const openDiff = onOpenChanges ? (path) => onOpenChanges(path) === true : null;
    // _M: a running command with a background process, when the tasks pane can show it.
    const liveOutputTask = agentContext?.onTask ? (item) => (item?.type === "commandExecution" && item.processId && (item.status === "inProgress" || item.status === "running") ? item.id : undefined) : null;
    const openLiveOutput = agentContext?.onTask ? (taskId) => agentContext.onTask(taskId) : null;
    return { sessionKey, cwd, transcriptView, pendingApprovalItemIds, renderHostRow, renderCard, renderImages, renderMarkdown, renderAttachedFiles, openFilePath, openDiff,
      liveOutputTask, openLiveOutput, liveTail: !!liveTail,
      isMcpAppTool: (name) => typeof name === "string" && name.startsWith("mcp__") };
  }, [agentContext, sessionKey, cwd, onOpenFileRef, onOpenChanges, transcriptView, pendingApprovalItemIds, isStreaming, agentNested, liveTail]);
}
export { useToolRunHost };
function SourceOfficialToolMessage(props) {
  const statusRows = useTurnStatusRows();
  const host = useToolRunHost(props);
  if (!statusRows) return <SourceMessage {...props} officialChecked />;
  const item = props.item.type === "webSearch" ? observedGenericTool(props.item, props.agentContext?.state, props.sessionKey) : props.item;
  return <SourceToolRun items={[item]} host={host} rest={{ "data-transcript-item-id": item.id, "data-turn-start": props.turnStart || undefined }} />;
}

export function SourceMessage({ isInterrupting = false, item, agentContext = null, agentNested = false, inToolGroup = false, turnStart = false, isStreaming = false, sessionKey = null, cwd = null, onOpenFileRef = null, onOpenChanges = null, transcriptView = "normal", pendingApprovalItemIds = NO_PENDING_APPROVALS, turnStartedAtMs = null, reasoningPlacement = "standalone", userActions = null, officialChecked = false, liveTail = false }) {
  if (isHiddenTranscriptItem(item, transcriptView)) return null;
  if (!inToolGroup && !officialChecked && officialToolItem(item))
    return <SourceOfficialToolMessage isInterrupting={isInterrupting} item={item} agentContext={agentContext} agentNested={agentNested} turnStart={turnStart} isStreaming={isStreaming}
      sessionKey={sessionKey} cwd={cwd} onOpenFileRef={onOpenFileRef} onOpenChanges={onOpenChanges} transcriptView={transcriptView} pendingApprovalItemIds={pendingApprovalItemIds}
      turnStartedAtMs={turnStartedAtMs} reasoningPlacement={reasoningPlacement} userActions={userActions} liveTail={liveTail} />;
  const stepDefaults = { forcedOpen: transcriptView === "verbose", sessionKey };
  if (item.type === "collabAgentToolCall") return <SourceAgentTool item={item} context={agentContext} inGroup={inToolGroup} Step={SourceStep} pendingApprovalItemIds={pendingApprovalItemIds} {...stepDefaults} />;
  if (item.type === "fileToolGroup") return <SourceToolGroup agentContext={agentContext} item={item} pendingApprovalItemIds={pendingApprovalItemIds} transcriptView={transcriptView} isStreaming={isStreaming} agentNested={agentNested}
    liveTail={liveTail} cwd={cwd} sessionKey={sessionKey} onOpenFileRef={onOpenFileRef} onOpenChanges={onOpenChanges}
    renderItem={member => <SourceMessage agentContext={agentContext} agentNested={agentNested} inToolGroup item={member} turnStart={false} isStreaming={isStreaming} sessionKey={sessionKey} cwd={cwd}
      onOpenFileRef={onOpenFileRef} onOpenChanges={onOpenChanges} transcriptView={transcriptView} pendingApprovalItemIds={pendingApprovalItemIds} />} />;

  if (item.type === "userMessage") {
    // Hidden workflow reminders never show as the user's words; a finished workflow's notification turn (the model's
    // Workflow tool, workflow-tool-service.cjs) is a system notice (composer-attachments-model shownUserItem).
    const shown = shownUserItem(item);
    if (shown.workflowNotification) return <SourceWorkflowNotice item={shown} onOpen={agentContext?.onTaskEvent ?? null} />;
    return <SourceUserMessage agentNested={agentNested} item={shown} turnStart={turnStart} sessionKey={sessionKey} cwd={cwd} onOpenFileRef={onOpenFileRef} turnStartedAtMs={turnStartedAtMs} userActions={userActions} />;
  }
  if (item.type === "agentMessage" || item.type === "plan")
    return (
      <article
        className="source-message message assistant-message source-assistant-message"
        data-transcript-item-id={item.id}
        data-cds="AssistantMessage"
        data-turn-start={turnStart || undefined}
      >
        {/* A bridge's own italic turn note (`_…_`, e.g. Gemini's turn-limit note) reads in the UI language. */}
        <SourceMarkdown text={isStreaming ? item.text || "" : localizeBridgeNote(item.text || "")} isStreaming={isStreaming} paceReveal={item.type === "agentMessage"} isInterrupting={isInterrupting} sessionKey={sessionKey} itemId={item.id} cwd={cwd} onOpenFileRef={onOpenFileRef} />
        {/* AgentMessage.memoryCitation {entries[{path, lineStart, lineEnd, note}]}: Codex answered from its memories. */}
        {!isStreaming && Array.isArray(item.memoryCitation?.entries) && item.memoryCitation.entries.length > 0 && <p className="source-memory-citation">
          <span>{t("Used memory")}</span>{" "}
          {item.memoryCitation.entries.slice(0, 5).map((entry, index) => <span key={index} className="source-memory-citation-entry" title={entry?.path ? `${entry.path}:${entry.lineStart ?? ""}` : undefined}>
            {index > 0 ? " · " : ""}<bdi>{entry?.note || String(entry?.path || "").split("/").pop()}</bdi></span>)}
        </p>}
        {/* AgentMessage.questions (delivery 'async'): Codex asked without stopping; answered from here. */}
        {!isStreaming && item.type === "agentMessage" && Array.isArray(item.questions) && item.questions.length > 0 && <SourceAsyncQuestions item={item} />}
      </article>
    );
  if (item.type === "reasoning") {
    // Plain text without the Markdown markers (a Codex summary's '**Title**' line), shown and copied alike.
    const text = plainReasoningText(reasoningText(item));
    if (!text.trim() || !showsThinking(transcriptView)) return null;
    // Thinking before tools is H2, an open "Thought process" step; any other
    // thought is the classic U2 block (scroll-messages-current.js:44475-44545).
    // Both are plain text: no Markdown and no reveal pacing.
    return <SourceReasoningRow item={item} text={text} stepDefaults={stepDefaults} preceding={reasoningPlacement === "preceding-tools"} />;
  }
  if (item.type === "fileChange" || fileAction(item)) {
    // QO under a standalone row, inside the row root after its body (RN approval-current.js:17302);
    // in a group FileToolMessage's body has them (FN :17324).
    const images = inToolGroup ? [] : (item.fileRun || [item]).flatMap(toolOutputImages);
    // Language-server errors the core reported after the edit (OpenCode: codeDesktop.diagnostics).
    const diagnostics = (item.fileRun || [item]).flatMap((entry) => Array.isArray(entry?.codeDesktop?.diagnostics) ? entry.codeDesktop.diagnostics : []);
    const after = images.length || diagnostics.length ? <>
      {images.length > 0 && <SourceToolImages images={images} itemId={item.id} />}
      {diagnostics.length > 0 && <SourceDiagnostics diagnostics={diagnostics} cwd={cwd} />}
    </> : null;
    return <FileToolMessage item={item} Step={SourceStep} pendingApprovalItemIds={pendingApprovalItemIds} {...stepDefaults} inCard={inToolGroup}
      sessionKey={sessionKey} cwd={cwd} onOpenFileRef={onOpenFileRef} onOpenChanges={onOpenChanges} after={after} />;
  }
  if (item.type === "commandExecution") {
    const state = commandRowState(item, pendingApprovalItemIds.has(item.id));
    // approval-current.js:16326-16365 GM/KM/XM + :17279 `ne ? GM : null`: a
    // running bash row with a live background task gets "View live output"
    // in its heading, after verb/meta and before the running text and glyph;
    // it must not toggle the row (stopPropagation on click and keydown).
    const live = state === "busy" && item.processId && agentContext?.onTask
      ? <button type="button" className="src-cmd-live" data-row-live=""
          onClick={event => { event.stopPropagation(); agentContext.onTask(item.id); }}
          onKeyDown={event => event.stopPropagation()}>{t("View live output")}</button>
      : undefined;
    return (
      <SourceStep item={item} {...stepDefaults} {...commandRowLabel(item.command, state, item.description, item.source)} state={state} classic caretSize={14} trailing={live}>
        <SourceCommandBody
          item={item}
          state={state}
          scopeKey={JSON.stringify([sessionKey, item.id, "command"])}
          inCard={inToolGroup}
        />
      </SourceStep>
    );
  }
  // Computer use (computer-use-model.mjs): the bridges' computerUse items and computer tools in any known shape.
  if (computerUseAction(item))
    return <SourceComputerUseStep item={item} state={commandRowState(item, pendingApprovalItemIds.has(item.id))} Step={SourceStep} stepProps={stepDefaults} inToolGroup={inToolGroup} />;
  // `present` (the DeepSeek core's deliverables): file cards instead of a tool row.
  // mark_chapter (OpenClaude Desktop's agent tools): the chapter heading, lifted out of the tool rows (cd5a31703 d2);
  // wX/CX (source-chapters.jsx): hidden or renamed from the Session chapters rail, renamed in place on double-click.
  const chapter = chapterOf(item);
  if (chapter) return <SourceClaudeChapter sessionId={sessionKey} id={chapter.id} title={chapter.title} itemId={item.id} />;
  if (itemDeliverables(item)) return <SourceDeliverables item={item} sessionKey={sessionKey} failed={item.status === "failed" || item.success === false} />;
  // R4e-findings (toolcards-18): a finished ReportFindings call (OpenClaude Desktop's agent tools) is the 2.42304.0
  // findings card (c96d752d0 X$ / h0e, source-findings-card.jsx); its findings also drive the Changes pane's findings bar.
  // An input the card cannot read stays the generic tool row below (X$'s fallback).
  if (reportFindingsCardTool(item))
    return <SourceFindingsCard item={item} sessionKey={sessionKey} items={agentContext?.state?.items?.[sessionKey] ?? null}
      turnErrors={agentContext?.state?.turnErrors?.[sessionKey] ?? null} turnTimes={agentContext?.state?.turnTimes?.[sessionKey] ?? null} />;
  if (isGenericTool(item)) {
    const observed=observedGenericTool(item,agentContext?.state,sessionKey);
    const state=commandRowState(observed,pendingApprovalItemIds.has(item.id));
    // wue (approval-current.js:45232-45240): an answered question is the vZ receipt card, not a row.
    const receipt=questionReceipt(observed,state);
    if(receipt)return <SourceQuestionReceipt item={item} pairs={receipt} sessionKey={sessionKey}/>;
    if((state==='busy'||state==='blocked')&&observed.type==='dynamicToolCall'&&observed.tool==='ask_user_question')notePendingQuestion(sessionKey,item.id);
    // Nothing answered: the Asked row with wue's outcome note ('Skipped') in RN's outcome slot.
    const outcome=questionOutcome(observed,state);
    const images=toolOutputImages(observed);
    // An exit_plan_mode or empty todo_write row has no body, so no caret.
    const body=genericToolBody(observed,state)==='none'?null:<SourceGenericToolBody item={item} state={state} cwd={cwd} onOpenFileRef={onOpenFileRef} inCard={inToolGroup}/>;
    // QO: output images in the body inside a group (FN :17324); under a standalone row they are
    // hoisted out of the collapsible body but stay in the row root, after it (RN :17302).
    // Files and links the core attached to the call (codeDesktop.artifacts: Qwen's recorded artifacts).
    const artifacts=Array.isArray(observed.codeDesktop?.artifacts)&&observed.codeDesktop.artifacts.length?<SourceArtifacts artifacts={observed.codeDesktop.artifacts} sessionKey={sessionKey}/>:null;
    const column=images.length||artifacts?<>{images.length?<SourceToolImages images={images} itemId={item.id}/>:null}{artifacts}</>:null;
    const row=<SourceStep item={item} {...stepDefaults} {...genericToolLabel(observed,state)}
      state={state} classic caretSize={14} className="source-generic-step" trailing={outcome?<span className="source-step-outcome">{outcome}</span>:undefined}
      after={inToolGroup?null:column}>
      {/* KO :6943-6944: an MCP body is the standalone WO card only outside a group row. */}
      {inToolGroup&&column?<>{body}{column}</>:body}
    </SourceStep>;
    // KBe "mcp_app" / m2e / e0 (c96d752d0): VX with this row as its fallback (source-mcp-app.jsx).
    return isMcpCallItem(item)?<SourceMcpAppRow item={item} sessionKey={sessionKey} awaitingApproval={pendingApprovalItemIds.has(item.id)} turnStart={turnStart} fallback={row}/>:row;
  }
  // Codex image generation, view_image, the sleep tool and hook-injected context (media-item-model.mjs).
  if (isMediaItem(item)) {
    const row = mediaItemRow(item);
    const body = row.caption || row.error ? <div className="source-media-detail">
      {row.error && <p className="source-media-error">{row.error}</p>}
      {row.caption && <p className="source-media-caption"><bdi>{row.caption}</bdi></p>}
    </div> : null;
    // QO: a standalone row hoists its image after the row (RN :17302); a group member keeps it in its collapsible
    // body (FN :17324), so a mid-run view_image stays inside the collapsed group.
    const image = row.image ? <SourceToolImages images={[row.image]} itemId={item.id} /> : null;
    return <SourceStep item={item} {...stepDefaults} label={row.label} meta={row.meta || undefined} metaTitle={row.path || undefined} state={row.state} classic caretSize={14}
      className="source-media-step" after={inToolGroup ? null : image}>{inToolGroup && image ? <>{body}{image}</> : body}</SourceStep>;
  }
  if (item.type === "contextCompaction") {
    // A core that reports what it compacted (the DeepSeek bridge's codeDesktop {summary, shadowedItems, shadowedTokens},
    // as the DeepSeek app's 'Compacted {items} history items (~{tokens} tokens)') shows the count and the summary.
    // Any other core: how full the context was before and after (state.js preTokens / postTokens, from the usage the
    // core re-sends after compacting), as the official marker's 'saved {tokens} tokens' / 'from {tokens} tokens'. A
    // compaction that errored failed; only one the user stopped was interrupted. Counts follow the UI language.
    const info = item.codeDesktop, result = outcome(item), done = !isStreaming && !["failed", "stopped"].includes(result);
    const counted = done && info && Number.isFinite(info.shadowedItems) && info.shadowedItems > 0;
    const tokens = (value) => formatTokenCount(Math.round(value), getLocale());
    const pre = Number.isFinite(item.preTokens) && item.preTokens > 0 ? item.preTokens : null, post = Number.isFinite(item.postTokens) ? item.postTokens : null;
    const label = isStreaming ? t("Compacting conversation") : result === "failed" ? t("Compaction failed") : !done ? t("Compaction interrupted")
      : counted ? (Number.isFinite(info.shadowedTokens) && info.shadowedTokens > 0
        ? tn(info.shadowedItems, "Compacted {count} item (~{tokens} tokens)", "Compacted {count} items (~{tokens} tokens)", { tokens: tokens(info.shadowedTokens) })
        : tn(info.shadowedItems, "Compacted {count} item", "Compacted {count} items"))
      : pre !== null && post !== null && post < pre ? t("Compacted conversation · saved {tokens} tokens", { tokens: tokens(pre - post) })
      : pre !== null ? t("Compacted conversation · from {tokens} tokens", { tokens: tokens(pre) })
      : t("Compacted conversation");
    return (
      <SourceStep item={item} {...stepDefaults} label={label} state={outcome(item)}>
        {done && typeof info?.summary === "string" && info.summary.trim() ? <SourceMarkdown text={info.summary} sessionKey={sessionKey} itemId={item.id} cwd={cwd} onOpenFileRef={onOpenFileRef} /> : null}
      </SourceStep>
    );
  }
  if (item.type === "enteredReviewMode" || item.type === "exitedReviewMode")
    return <SourceStep item={item} {...stepDefaults} label={item.type === "enteredReviewMode" ? t("Review started") : t("Review result")} state="done">
      {item.review ? <SourceMarkdown text={item.review} sessionKey={sessionKey} itemId={item.id} cwd={cwd} onOpenFileRef={onOpenFileRef} /> : null}
    </SourceStep>;
  return null;
}

export function SourceWorking({
  stopping = false,
  waiting = false,
  elapsedSeconds,
  label,
}) {
  const text =
    label ||
    (stopping
      ? t("Stopping…")
      : waiting
        ? t("Waiting for your approval")
        : t("Working…"));
  return (
    <div
      className="source-message source-working"
      role="status"
      data-testid="code-working-line"
      data-working-row
    >
      <span className={waiting ? "" : "source-shimmer"}>{text}</span>
      {Number.isFinite(elapsedSeconds) && elapsedSeconds >= 2 && !waiting && (
        <span className="source-working-time">
          {t("{seconds}s", { seconds: Math.floor(elapsedSeconds) })}
        </span>
      )}
    </div>
  );
}

// Plan → implement handoff (approval-card-model planHandoff): a core without permission hints ends a Plan turn with
// a plan item and waits, as Codex's own client asks "Implement this plan?" (codex-rs tui plan_implementation.rs).
// It wears the plan card (Rse, source-plan-card.jsx): left Stay in Plan (Esc); right Implement in Manual when the
// target is another mode (⌘⇧⏎), then the primary that implements in the target mode (⌘⏎). The card answers no
// server request: the caller sends the implementation turn.
export const PLAN_HANDOFF_LABELS = Object.freeze({
  ask: t("Implement"),
  acceptEdits: t("Implement and allow edits"),
  auto: t("Implement and auto mode"),
  bypass: t("Implement and bypass permissions"),
});
export function planHandoffActions(target, { bypass = false, acceptModes } = {}) {
  const mode = planTargetOf(target, { bypass });
  return {
    left: [{ key: "stay", label: t("Stay in Plan"), primary: false, keycap: "esc", shortcut: "Escape" }],
    right: [
      ...(mode !== "ask" ? [{ key: "accept", label: PLAN_HANDOFF_LABELS.ask, primary: false,
        keycap: "cmd+shift+enter", shortcut: "Meta+Shift+Enter Control+Shift+Enter" }] : []),
      { key: "primary", label: PLAN_HANDOFF_LABELS[mode], primary: true, keycap: "cmd+enter", shortcut: "Meta+Enter Control+Enter" },
    ],
    more: planAcceptOptions({ bypass }).filter((option) => option !== mode && (!acceptModes || acceptModes.includes(option))).map((option) => ({ mode: option, label: PLAN_HANDOFF_LABELS[option] })),
  };
}
const composingKey = (event) => event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229;
export function SourcePlanHandoffCard({ handoffKey, target, bypassAvailable = false, acceptModes, captureHotkeys = false, busy = false, isActive = true, menuOpen = false, onImplement, onStay, onOpenPlan }) {
  const root = useRef(null), headingId = useId();
  const [pressed, setPressed] = useState(null);
  const clickArmed = useAllowArming(root, handoffKey, isActive);
  const hotkeyArmed = useHotkeyArming(root, handoffKey, isActive);
  const mode = planTargetOf(target, { bypass: bypassAvailable });
  const actionable = isActive && typeof onImplement === "function";
  const shortcutEnabled = actionable && !busy && !menuOpen, keycapShown = actionable && !menuOpen;
  const act = (key, chosen = mode) => {
    if (!actionable || busy) return;
    setPressed(key);
    if (key === "stay") onStay?.();
    else onImplement(key === "accept" ? "ask" : chosen);
  };
  function keyDown(event) {
    if (event.defaultPrevented || composingKey(event) || event.altKey || !shortcutEnabled) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="menu"],[role="listbox"]')) return;
    if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) act("stay");
      return;
    }
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || !hotkeyArmed() || !currentlyVisible(root.current)) return;
    act(event.shiftKey && mode !== "ask" ? "accept" : "primary");
  }
  useCardHotkeys(root, captureHotkeys && shortcutEnabled, (key, event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    if (key === 'escape') { act('stay'); return; }
    if (!hotkeyArmed() || !currentlyVisible(root.current)) return;
    act(key === 'submit-shift' && mode !== 'ask' ? 'accept' : 'primary');
  }, currentlyVisible);
  const { left, right, more } = planHandoffActions(mode, { bypass: bypassAvailable, acceptModes });
  const button = (action) => <ActionButton key={action.key} action={action} busy={busy} busyAction={pressed}
    enabled={actionable} onAction={act} keycap={keycapShown ? action.keycap : undefined}
    shortcut={shortcutEnabled ? action.shortcut : undefined} />;
  return <section ref={root} className="source-message sac-card spc-card" data-approval-presentation="card"
    data-approval-kind="plan-handoff" data-plan-handoff={handoffKey} role="group" aria-labelledby={headingId}
    aria-busy={busy || undefined} tabIndex={0} onKeyDown={keyDown} onClick={(event) => event.stopPropagation()}>
    <div className="sac-body spc-body">
      <div className="spc-heading">
        <span className="spc-heading-copy"><span id={headingId} className="spc-title">{t("Implement this plan?")}</span></span>
        {onOpenPlan && <span className="spc-trailing">
          <button type="button" className="spc-open-plan" data-cds="TextLink" onClick={onOpenPlan}>{t("Open plan")}</button>
        </span>}
      </div>
    </div>
    <footer className="spc-actions">
      <div className="spc-left">{left.map(button)}</div>
      <div className="spc-right" onClickCapture={(event) => {
        if (!clickArmed()) { event.preventDefault(); event.stopPropagation(); }
      }}>{right.map((action) => action.primary && more.length
        ? <span key={action.key} className="spc-split" data-split="">{button(action)}
            <PlanMoreOptions options={more} enabled={actionable} busy={busy} onChoose={(chosen) => act("primary", chosen)} /></span>
        : button(action))}</div>
    </footer>
    {busy && <BusyAnnouncement />}
  </section>;
}

// Submission identity and draft lifetime are owned by the shared root runtime.
export function SourceApproval(props) {
  if (!approvalIdentity(props.request)) return <SourceApprovalCardView
    request={props.request} item={props.item} enabled={false}
    error={t("This request cannot be answered because its type or required identity is unsupported.")} />;
  // PM (approval-current.js:16105-16127): ExitPlanMode gets Rse's plan card; here the
  // bridge's exit_plan_mode review (question id 'plan-review', R07).
  if (isPlanReviewRequest(props.request)) return <SourcePlanApprovalCard {...props} />;
  return props.request.method === "item/tool/requestUserInput"
    ? <SourceQuestionCard {...props} />
    : <SourceApprovalCard {...props} renderDetails={(detail, model) =>
        detail.kind === "path"
          ? <ApprovalFileDetail detail={detail} meta={model.heading?.meta}
              sessionKey={props.sessionKey} cwd={props.cwd} onOpenFileRef={props.onOpenFileRef} itemId={props.item?.id ?? props.request.params?.itemId} />
          : detail.kind === "workflow" ? <WorkflowApprovalDetail detail={detail} />
          : <pre className="sac-code" title={detail.raw}>{detail.text}</pre>} />;
}
// The "Run a dynamic workflow?" card's body (Claude Code 2.1.280's workflow permission dialog): the description and
// phases, then the script itself — shown outright when meta lists no phases, else behind "View raw script".
function WorkflowApprovalDetail({ detail }) {
  const [open, setOpen] = useState(detail.scriptOpen === true);
  const scriptId = useId();
  return <>
    {detail.text && <pre className="sac-code">{detail.text}</pre>}
    {detail.scriptOpen !== true && <button type="button" className="sac-feedback-toggle sac-script-toggle" aria-expanded={open} aria-controls={scriptId}
      onClick={() => setOpen((value) => !value)}>{open ? t("Hide raw script") : t("View raw script")}</button>}
    {open && <pre id={scriptId} className="sac-code sac-script" aria-label={t("Workflow script")}>{detail.script}</pre>}
    {open && detail.scriptTruncated && <p className="sac-context">{t("The script is too long to be shown in full.")}</p>}
  </>;
}
// EM's file request (approval-current.js:15528-15552 U, :15596-15607 Kv + yce): the
// full-path detail box (shown when it differs from the basename meta), then per change
// the transcript's in-card diff body (cd98a1763 ApprovalFileChangeBody). A change over
// the preview limit gets no body; the card shows the fM sentence instead.
function ApprovalFileDetail({ detail, meta, itemId, sessionKey, ...props }) {
  return <>
    {detail.text && detail.text !== meta && <div className="sac-code sac-path">{detail.text}</div>}
    {detail.value.map((change, index) => previewTooLarge(change) || typeof change?.diff !== "string" ? null
      : <ApprovalFileChangeBody key={index} change={change} sessionKey={sessionKey} {...props}
          scopeKey={JSON.stringify([sessionKey, itemId, "approval", index])} isFrontier={false} />)}
  </>;
}

// Tree keyboard model (2.2553.1 panes-tile-current.js:5059-5165 bg, :4700
// root, :5710 treeitem attributes): the tree container holds the tab stop,
// rows are tabIndex -1 treeitems with a [data-tree-primary] activation button.
function treeRows(tree) {
  return Array.from(tree.querySelectorAll("[data-tree-row]")).filter(
    (row) => !row.closest("[hidden], [inert]"),
  );
}
function focusTreeRow(row) {
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView?.({ block: "nearest" });
}
function activateTreeRow(row) {
  row?.querySelector("[data-tree-primary]")?.click();
}
// Flat row/parent indices for a non-virtualized tree: recomputed after any
// subtree change so ArrowLeft can jump to the parent via data-parent-index.
export function indexTreeRows(tree) {
  const rows = treeRows(tree);
  const parents = [];
  rows.forEach((row, index) => {
    const level = Number(row.getAttribute("aria-level") ?? "1");
    while (parents.length && parents[parents.length - 1].level >= level) parents.pop();
    row.setAttribute("data-row-index", String(index));
    if (parents.length) row.setAttribute("data-parent-index", String(parents[parents.length - 1].index));
    else row.removeAttribute("data-parent-index");
    parents.push({ level, index });
  });
  return rows.length;
}
export function treeFocusTarget(tree) {
  const rows = treeRows(tree);
  const current = rows.find((row) => row.getAttribute("aria-current"));
  if (current) return current;
  const box = tree.getBoundingClientRect();
  return rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return rect.top >= box.top && rect.bottom <= box.bottom;
  }) ?? rows[0] ?? null;
}
// onEnterOpen(tree, activate): B33 cccc2cf0a oy — Enter (not repeated, no modifier) activates the row through
// the pane, which hands focus to a file it opened once Enter is released.
export function treeKeyDown(event, tree, filterInput, selection, onEnterOpen = null) {
  if (event.nativeEvent?.isComposing || event.isComposing || event.altKey) return;
  const rows = treeRows(tree);
  if (rows.length === 0) return;
  const active = tree.ownerDocument.activeElement;
  // Directory rows contain their children: resolve the innermost row.
  const closest = active?.closest?.("[data-tree-row]") ?? null;
  const row = closest && rows.includes(closest) ? closest : null;
  const index = row ? rows.indexOf(row) : -1;
  const last = rows.length - 1;
  const first = () => rows.indexOf(treeFocusTarget(tree));
  const modified=event.metaKey||event.ctrlKey;
  const go = next => {const at=Math.max(0,Math.min(last,next));focusTreeRow(rows[at]);const entry=selection?.nav.entryAt(at);if(entry&&!modified&&!event.shiftKey)selection.store.getState().moveAnchor(entry.absPath);};
  if(selection){
    if(modified&&event.key.toLowerCase()==='a'&&!event.shiftKey){event.preventDefault();selectAllFiles(selection.store,selection.nav);return;}
    // R3-files FT-18 (files-26): Escape on a multi-selection is c856385e2 nt (useMultiSelectionEscape on the tree element).
    if(event.key===' '&&(modified||event.shiftKey)&&index>=0){event.preventDefault();const entry=selection.nav.entryAt(index);if(modified){if(entry)selection.store.getState().toggle(entry);}else selectFileRange(selection.store,selection.nav,index,index);return;}
  }
  const extend=at=>{if(selection&&event.shiftKey&&index>=0)selectFileRange(selection.store,selection.nav,Math.max(0,Math.min(last,at)),index);};
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      go(index < 0 ? first() : index + 1);extend(index+1);
      return;
    case "ArrowUp":
      event.preventDefault();
      if (index === 0 && filterInput && !modified && !event.shiftKey) { filterInput.focus(); return; }
      go(index < 0 ? first() : index - 1);extend(index-1);
      return;
    case "Home":
      event.preventDefault();
      go(0);
      return;
    case "End":
      event.preventDefault();
      go(last);
      return;
    case "Tab":
      if (event.shiftKey && row && !modified) tree.focus({ preventScroll: true });
      return;
    case "Enter":
    case " ":
      if (!row) return;
      event.preventDefault();
      if (event.key === "Enter" && !event.repeat && !modified && !event.shiftKey && onEnterOpen) onEnterOpen(tree, () => activateTreeRow(row));
      else activateTreeRow(row);
      return;
    case "ArrowRight":
      if (!row) return;
      event.preventDefault();
      if (row.getAttribute("aria-expanded") === "false") activateTreeRow(row);
      else go(index + 1);
      return;
    case "ArrowLeft": {
      if (!row) return;
      event.preventDefault();
      if (row.getAttribute("aria-expanded") === "true") { activateTreeRow(row); return; }
      const parentIndex = row.getAttribute("data-parent-index");
      if (parentIndex !== null) { const at = Number(parentIndex); if (at >= 0) go(at); return; }
      const level = Number(row.getAttribute("aria-level") ?? "1");
      for (let at = index - 1; at >= 0; at--)
        if (Number(rows[at].getAttribute("aria-level") ?? "1") < level) { go(at); return; }
      return;
    }
    default:
  }
}

const FileTreeSelectionContext=React.createContext(null);
function SourceTreeNode({
  entry,
  cwd,
  activePath,
  onOpen,
  level = 0,
  refreshKey,
  // B07 per-folder refresh counts ({[relative dir]: n}) from FilePane's folder watcher (cccc2cf0a mv refetches one listing).
  dirRefresh = null,
  call,
  revealPath,
  revealGeneration = 0,
  // B33: false for an explicit "Reveal in file tree" (centre + highlight flash), true for following the open file.
  revealFollow = true,
  // R3-files FT-14 (cccc2cf0a Nx/DS start reveal): the worktree start folder; onStartShown is DS's onStartFolderShown.
  revealStart = false,
  onStartShown = null,
  treeVisible = true,
  expandedPaths,
  onExpandedChange,
  fileMenu = null,
}) {
  const selection=React.useContext(FileTreeSelectionContext);
  const selectionState=useSyncExternalStore(selection.store.subscribe,selection.store.getState,selection.store.getState);
  const selectionEntry=useMemo(()=>({...entry,absPath:entry.path,relativePath:entry.path}),[entry]);
  useLayoutEffect(()=>{selection.entries.set(entry.path,selectionEntry);return()=>{selection.entries.delete(entry.path);};},[selection,entry.path,selectionEntry]);
  const [localOpen, setLocalOpen] = useState(false);
  // Wr.Root ContextMenu (panes-tile-current.js:5701-5790): the point the menu opens at.
  const [menu, setMenu] = useState(null);
  const nameRef = useRef(null), pointerInside = useRef(false), menuReturnFocus = useRef(null);
  const controlled = expandedPaths instanceof Set;
  const open = controlled ? expandedPaths.has(entry.path) : localOpen;
  const setOpen = useCallback((value) => {
    if (controlled) onExpandedChange?.(entry.path, value);
    else setLocalOpen(value);
  }, [controlled, onExpandedChange, entry.path]);
  const rowRef = useRef(null);
  // R3-files FT-14: the treeitem wraps its children's group too, so its name is its row's button (name + link mark), the
  // content NS's treeitem is named from, not the whole subtree's text.
  const labelId = useId();
  const reveal = useFileTreeReveal({ entry, revealPath, revealGeneration, revealFollow, revealStart, onStartShown, treeVisible,
    expand: setOpen, rowRef });
  // B33 cccc2cf0a My P = ol(e) (cd2efac6e Qo): a broken, circular or external link row stays inert.
  const openable = treeEntryOpenable(entry);
  // B33 cccc2cf0a ne/av (:5484-5503, :3970-3984): expanding a folder by hand also expands the chain of folders
  // below it that are each their parent's only entry (16 levels), while this folder is still expanded.
  const openNow = useRef(open), mountedNode = useRef(true);
  openNow.current = open;
  useEffect(() => { mountedNode.current = true; return () => { mountedNode.current = false; }; }, []);
  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (!next || !controlled || !entry.directory) return;
    singleChildFolderChain(entry.path, (relative) => call("files", { cwd, relative })).then((chain) => {
      if (!chain.length || !mountedNode.current || !openNow.current) return;
      for (const path of chain) onExpandedChange?.(path, true);
    });
  };
  const [children, setChildren] = useState(null);
  const [error, setError] = useState(false);
  const includeChild = revealChild(entry.path, revealPath);
  const folderRefresh = dirRefresh?.[entry.path] ?? 0;
  useEffect(() => {
    if (!open || !openable || !entry.directory) return;
    let live = true;
    // Keep keyed rows mounted during a refresh so expansion survives a clear.
    setError(false);
    call("files", { cwd, relative: entry.path, includeChild })
      .then((data) => live && setChildren(data))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [cwd, entry.path, entry.directory, open, openable, refreshKey, folderRefresh, includeChild, call]);
  // Hu (c44d00c7f ma :3872-3897) around the row: 700ms, bottom/start, not
  // hoverable; the name when it is clipped, or when the pointer is on a row that
  // has a detail (the Rg link text, else a file's folder); nothing while the
  // row's menu is open.
  const linkText = entry.link ? fileLinkLabel(entry.link) : null;
  const folder = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
  const detail = linkText ?? (entry.directory ? null : folder || null);
  const tooltipContent = menu ? null : () => {
    const name = nameRef.current;
    if (name && name.scrollWidth > name.clientWidth) return entry.name;
    return detail && pointerInside.current ? entry.name : null;
  };
  // R3-files FT-05 (cccc2cf0a NS `G`/`Kf(G, G)`): the row's "path gone" check (file-gone-menu.mjs).
  const goneAt = fileMenu ? fileCopyChoices(cwd, entry.path).absolute ?? undefined : undefined;
  const { gone, beforeOpen } = useFileGone(goneAt, goneAt);
  const multi=menu?.selected?.length>1;
  const entries = menu && fileMenu ? (multi?fileMenu.multiEntries(menu.selected.map(e=>e.path),{directories:menu.selected.filter(e=>e.directory).map(e=>e.path)}):fileMenu.entries(entry.path, { surface: "file_browser", directory: !!entry.directory, linkState: entry.link?.state, gone })) : null;
  function contextMenu(event){
    if(!fileMenu||event.target.closest?.('[role="treeitem"]')!==event.currentTarget)return;
    event.preventDefault();event.stopPropagation();
    // R3-files FT-05 (NS `ue` → Yf): asked before the selection moves, never for a row of a multi-selection; the menu
    // opens when the answer arrives (c0cdf4a08 h).
    const pending=inMultiSelection(selection.store,entry.path,true)?undefined:beforeOpen();
    const state=selection.store.getState();if(state.selected.has(entry.path))state.reorder(selection.nav.indexOfKey);else state.selectOnly(selectionEntry);
    const rect=rowRef.current.getBoundingClientRect(),keyboard=event.type==='keydown'||event.clientX===0&&event.clientY===0;
    const point=keyboard?{x:rect.left,y:rect.bottom}:{x:event.clientX,y:event.clientY};
    menuReturnFocus.current=event.currentTarget.ownerDocument.activeElement;
    openWhenChecked(event.currentTarget,pending,()=>setMenu({point,keyboard,selected:[...selection.store.getState().selected.values()]}));
  }
  function clickEntry(event){
    setMenu(null);
    if(event.metaKey||event.ctrlKey){selection.store.getState().toggle(selectionEntry);return;}
    if(event.shiftKey){const index=selection.nav.indexOfKey(entry.path);selectFileRange(selection.store,selection.nav,index,index);return;}
    selection.store.getState().selectOnly(selectionEntry);
    if(!openable)return;
    if(entry.directory)toggleOpen();else onOpen(entry,{preview:event.detail===1});
  }
  const expanded = open && openable;
  const current = activePath === entry.path, selected = selectionState.selected.has(entry.path);
  // R3-files FT-14: 2.42304.0 cccc2cf0a NS. The official treeitem is the painted row; here the treeitem wraps the row
  // and its children's group (nested DOM), so it keeps the ARIA, focus and menus while the row element inside carries
  // NS's classes (fileTreeRowClassName: Cx + dx + Ul/fx/Wl), indent (Bl = treeIndent), data-highlighted and drag.
  return (
    <div
      role="treeitem"
      data-tree-row=""
      aria-level={level + 1}
      aria-expanded={entry.directory ? expanded : undefined}
      aria-selected={selected}
      aria-current={current || undefined}
      aria-disabled={!openable || undefined}
      tabIndex={-1}
      className="source-tree-item outline-none"
      aria-labelledby={labelId}
      data-popup-open={menu ? "" : undefined}
      onContextMenu={contextMenu}
      onKeyDown={event=>{if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)contextMenu(event);}}
    >
      <SourceTooltip content={tooltipContent} detail={menu ? null : detail} side="bottom" align="start" delay={700} hoverable={false}>
      <div
        ref={rowRef}
        // data-tree-row-body: the row that paints the treeitem's focus (source-session.css, the one host rule).
        data-tree-row-body=""
        className={fileTreeRowClassName({ current, selected, revealing: reveal.target })}
        style={treeIndent(level)}
        // NS is a Base UI ContextMenu.Trigger, whose open state is data-popup-open + data-pressed (vendor-frame Ni):
        // F's data-[pressed]:bg-fill-ghost-hover keeps an idle row lit while its menu is open.
        data-popup-open={menu ? "" : undefined}
        data-pressed={menu ? "" : undefined}
        // B33 My: the reveal target flashes (data-highlighted 1200ms, Cx data-[highlighted]:bg-fill-ghost-hover).
        data-highlighted={reveal.highlighted ? "" : undefined}
        data-reveal-target={reveal.target || undefined}
        draggable={(!!fileMenu?.drag && openable) || undefined}
        onDragStart={event=>{
          if(!openable){event.preventDefault();return;}
          const state=selection.store.getState();let entries=[selectionEntry];
          if(state.selected.size>=2&&state.selected.has(entry.path)){state.reorder(selection.nav.indexOfKey);entries=[...selection.store.getState().selected.values()];}
          fileMenu?.drag?.(event,entries);
        }}
        onPointerEnter={() => { pointerInside.current = true; }}
        onPointerLeave={() => { pointerInside.current = false; }}
      >
        {/* NS: below the root, the guide layer (ca7840910 j) whose --file-tree-guides paint on tree hover or focus. */}
        {level > 0 && <span aria-hidden="true" className={FILE_TREE_GUIDE_LAYER_CLASS} style={fileTreeGuideStyle(level)} />}
      <button
        type="button"
        id={labelId}
        className={fileTreeRowPrimary}
        data-tree-primary=""
        tabIndex={-1}
        onClick={clickEntry}
        onMouseDown={event=>{if(event.button===1&&!entry.directory&&openable)event.preventDefault();}}
        onAuxClick={event=>{if(event.button===1&&!entry.directory&&openable){event.preventDefault();onOpen(entry,{preview:false});}}}
        onDoubleClick={() =>
          !entry.directory && openable && onOpen(entry, { preview: false })
        }
        data-file-path={entry.path}
        data-link-state={entry.link?.state}
      >
        {/* NS: a folder's CaretRight (rotate-90 when open) or the file-type icon (c280f9bbb), size Fl() = ca7840910 E
            ("xs"); the name; a symlink's xs ArrowUpRight whose alt is the link text (MS). */}
        {entry.directory
          ? <CdsIcon name="CaretRight" size={fileTreeIconSize()} className={fileTreeIconClassName({ directory: true, openable, expanded })} />
          : <FileTypeIcon fileName={entry.name} size={fileTreeIconSize()} className={fileTreeIconClassName({ openable })} />}
        <span ref={nameRef} className={fileTreeNameClassName(openable)}>{entry.name}</span>
        {linkText && <CdsIcon name="ArrowUpRight" size="xs" alt={linkText} data-testid="file-tree-link-mark"
          className="shrink-0 self-center text-muted-as-secondary" />}
      </button>
      </div>
      </SourceTooltip>
      {entries && (
        <SourceMenu.Popup anchor={rowRef.current} trigger={rowRef.current?.closest('[role="treeitem"]')} point={menu.point} initialHighlight={menu.keyboard?"first":"popup"} side="bottom" align="start"
          sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard
          label={t("File actions")} onClose={() => setMenu(null)} finalFocus={() => {
            // Base UI returns focus to where it was before the context menu opened.
            const previous = menuReturnFocus.current;
            return previous?.isConnected && previous !== previous.ownerDocument.body ? previous : rowRef.current?.closest('[role="treeitem"]');
          }}>
          {multi?<SourceMenu.Group><SourceMenu.GroupLabel>{tn(menu.selected.length,'{count} item selected','{count} items selected')}</SourceMenu.GroupLabel><SourceFileMenuEntries entries={entries} onSelect={item=>fileMenu.select(item,entry.path)}/></SourceMenu.Group>:<SourceFileMenuEntries entries={entries} onSelect={(item) => fileMenu.select(item, entry.path)} />}
        </SourceMenu.Popup>
      )}
      {expanded && entry.directory && (
        <div role="group">
          {/* Pg (panes-tile-current.js:5335-5350): a subfolder without data adds
              only the Lg error row when its read failed; loading and empty add
              no rows, and retained children win over a failed refresh. */}
          {children === null ? (
            error ? <SourceTreeErrorRow depth={level + 1} /> : null
          ) : (
            children.map((child) => (
              <SourceTreeNode
                key={child.path}
                entry={child}
                cwd={cwd}
                activePath={activePath}
                onOpen={onOpen}
                level={level + 1}
                refreshKey={refreshKey}
                dirRefresh={dirRefresh}
                call={call}
                revealPath={revealPath}
                revealGeneration={revealGeneration}
                revealFollow={revealFollow}
                revealStart={revealStart}
                onStartShown={onStartShown}
                treeVisible={treeVisible}
                expandedPaths={expandedPaths}
                onExpandedChange={onExpandedChange}
                fileMenu={fileMenu}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Tree container: single tab stop, focus lands on the current or first fully
// visible row; row indices are refreshed whenever the subtree changes.
function SourceTree({ children, busy, filterInputSelector, selectionStore, active = true, onEnterOpen = null }) {
  const ref = useRef(null);
  // c856385e2 nt (Nx `If(z, H.store)`): Escape clears a multi-selection of the tree element and swallows its repeats.
  const [treeElement, setTreeElement] = useState(null);
  const treeRef = useCallback((node) => { ref.current = node; setTreeElement(node); }, []);
  const selection=useMemo(()=>{const entries=new Map(),store=selectionStore;const rows=()=>treeRows(ref.current);const nav={get count(){return rows().length;},entryAt:index=>entries.get(rows()[index]?.querySelector('[data-tree-primary]')?.dataset.filePath),indexOfKey:key=>rows().findIndex(row=>row.querySelector('[data-tree-primary]')?.dataset.filePath===key)};return {entries,store,nav};},[selectionStore]);
  const blankSelection=useBlankTreeSelection(()=>selection.store.getState().clear());
  useMultiSelectionEscape(active ? treeElement : null, selection.store);
  useLayoutEffect(() => {
    const tree = ref.current;
    if (!tree) return undefined;
    const refresh=()=>{
      if(!active)return;
      indexTreeRows(tree);
      selection.store.getState().retain(path=>selection.nav.indexOfKey(path)>=0);
      // R3-files FT-14 (files-08): cccc2cf0a xS / SS per row, as Lx sets --file-tree-kept-guides on each row.
      applyKeptGuides(treeRows(tree));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(tree, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-level", "hidden", "aria-selected", "aria-current", "aria-expanded"] });
    return () => observer.disconnect();
  }, [active,selection]);
  return (
    <FileTreeSelectionContext.Provider value={selection}><div
      ref={treeRef}
      {...blankSelection}
      role="tree"
      aria-label={t("Project files")}
      aria-busy={busy || undefined}
      aria-multiselectable="true"
      tabIndex={0}
      className={FILE_TREE_CONTAINER_CLASS}
      // Only a keyboard arrival from outside the tree is redirected to the
      // current row (official yg guards): focus handed back from a row
      // (Shift+Tab on its way out) or a pointer press on the background
      // stays on the container, so sequential focus can leave the tree.
      onFocus={(event) => {
        const tree = event.currentTarget;
        if (event.target !== tree || tree.contains(event.relatedTarget) || !tree.matches(":focus-visible")) return;
        const target = treeFocusTarget(tree);
        if (target) focusTreeRow(target);
      }}
      onKeyDown={(event) => {
        const tree = event.currentTarget;
        if (!tree.contains(event.target)) return;
        const input = filterInputSelector ? tree.closest(".sfs-browser")?.querySelector(filterInputSelector) : null;
        treeKeyDown(event, tree, input, selection, onEnterOpen);
      }}
    >
      {children}
    </div></FileTreeSelectionContext.Provider>
  );
}
// R3-files FT-14: the tree and its rows, exported for SSR tests (tests/file-tree-current.test.mjs).
export { SourceTree as SourceFileTree, SourceTreeNode as SourceFileTreeNode };

// Files pane tab (2.2553.1 readable/panes-tabs-current.js:333-491 he; model
// panes-tile-current.js:6656-6710 ce/le). Local adaptations: no Base UI Tabs /
// ContextMenu primitives (the local roving keys, SourceTooltip and
// SourceMenu stand in); pointer drag reorder is use-tab-drag-reorder.mjs. data-vtb-id is the strip
// measure's key (_e); an overflowed tab stays laid out but invisible, a compact
// one drops its close button and label mask (he :364-372, :463-466).
function SourceFileTab({ file, cwd, selected, tabIndex, solo, posinset, setsize, hintId, moveHintId, overflowed = false, compact = false, fileMenu = null, onSelect, onClose, onCloseOthers, onCloseRight, onCloseAll, onKeep, onKeyDown, onPointerDown }) {
  const root = useRef(null), tabRef = useRef(null), labelRef = useRef(null), returnFocus = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // he N/F/ie: a pointer-down on the tab hides its tooltip until the pointer leaves the tab.
  const [pressed, setPressed] = useState(false);
  const [clipped, setClipped] = useState(false);
  const label = basename(file.path), detail = tabDetail(file.path, cwd), preview = file.preview === true;
  // Be (clipped): the label span overflows its max-w-[140px] box.
  useLayoutEffect(() => {
    const node = labelRef.current;
    if (!node) return undefined;
    const measure = () => setClipped(node.scrollWidth > node.clientWidth);
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [label, preview]);
  const tooltip = tabTooltip({ label, detail, clipped, suppressed: menuOpen || pressed });
  const fileEntries = menuOpen && fileMenu ? fileMenu.entries(file.path, { surface: "file_tab", unavailable: file.unavailable }) : null;
  const actions = { keep: () => onKeep(file.path), close: () => onClose(file.path), "close-others": () => onCloseOthers(file.path), "close-right": () => onCloseRight(file.path), "close-all": () => onCloseAll() };
  // Base UI returns focus to where it was before the context menu opened; a
  // closed tab hands it to the tab that is selected afterwards.
  const restoreTarget = () => {
    const previous = returnFocus.current;
    if (previous?.isConnected && previous !== previous.ownerDocument.body) return previous;
    return tabRef.current?.isConnected ? tabRef.current
      : root.current?.ownerDocument.querySelector('.source-file-tabs [role="tab"][aria-selected="true"]') ?? null;
  };
  return (
    <div
      ref={root}
      role="presentation"
      className="source-file-tab"
      data-vtb-id={file.path}
      data-file-path={file.path}
      data-preview={preview || undefined}
      data-deleted={file.unavailable === "missing" || undefined}
      data-selected={selected || undefined}
      data-compact={compact || undefined}
      data-overflowed={overflowed || undefined}
      data-popup-open={menuOpen || undefined}
      onMouseDown={(event) => {
        // _e/Z: a secondary (or macOS Control-) press never moves focus; a middle press is claimed for close.
        if (event.button === 2 || event.button === 1 || (event.button === 0 && event.ctrlKey && /Mac/i.test(navigator.platform ?? ""))) event.preventDefault();
      }}
      // Z (:309-314, he onMouseUp :359): a middle-button mouseup on a closable tab is claimed too.
      onMouseUp={(event) => {
        if (event.button === 1) event.preventDefault();
      }}
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault();
          onClose(file.path);
        }
      }}
      onDoubleClick={preview ? () => onKeep(file.path) : undefined}
      onContextMenu={(event) => {
        event.preventDefault();
        returnFocus.current = event.currentTarget.ownerDocument.activeElement;
        setMenuOpen(true);
      }}
      onPointerDown={overflowed ? undefined : onPointerDown}
      onPointerLeave={() => setPressed(false)}
    >
      <span aria-hidden="true" className="source-file-tab-bg" />
      <SourceTooltip content={tooltip.content} detail={tooltip.detail} side="bottom" align="start" delay={700} hoverable={false}>
        <div
          ref={tabRef}
          role="tab"
          aria-selected={selected}
          aria-posinset={posinset}
          aria-setsize={setsize}
          aria-describedby={[hintId, moveHintId].filter(Boolean).join(" ") || undefined}
          aria-disabled={overflowed || undefined}
          tabIndex={tabIndex}
          onPointerDown={() => setPressed(true)}
          onClick={() => onSelect(file.path)}
          onKeyDown={(event) => {
            // Base UI useButton (nativeButton:false): Enter/Space activate the div tab.
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(file.path);
              return;
            }
            onKeyDown(event, file.path);
          }}
        >
          <span ref={labelRef} className="source-file-tab-label" data-vtb-label="" data-clipped={(clipped && !compact) || undefined}>
            <span>
              {label}
              {preview && <span className="source-sr-only">, {FILE_TAB_LABELS.previewTabHint}</span>}
              {file.unavailable === "missing" && <span className="source-sr-only">, {FILE_TAB_LABELS.deletedTabHint}</span>}
            </span>
          </span>
        </div>
      </SourceTooltip>
      {/* pe: pointer-only close; keyboard users close with Delete/Backspace. A compact tab has none. */}
      {!compact && <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label={FILE_TAB_LABELS.closeTab}
        className="source-file-tab-close"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onClose(file.path)}
      >
        <Icon name="X" size={12} />
      </button>}
      {menuOpen && (
        <SourceMenu.Popup
          anchor={root.current}
          trigger={null}
          side="bottom"
          align="start"
          dataCds="ContextMenu"
          layer="contextmenu"
          contextMenuGuard="always"
          finalFocus={restoreTarget}
          onClose={(reason) => {
            setMenuOpen(false);
            if (reason === "escape-key") restoreTarget()?.focus({ preventScroll: true });
          }}
        >
          {/* he popup (:470-485): renderTabMenuItems Ce — the l_ file items
              (panes-tile-current.js:6809-6862) — then a separator before the
              Keep open / Close items. */}
          {fileEntries?.length > 0 && <>
            <SourceFileMenuEntries entries={fileEntries} onSelect={(item) => fileMenu.select(item, file.path)} />
            <SourceMenu.Separator />
          </>}
          {tabMenuItems({ preview, solo, hasTabsToRight: posinset < setsize }).map((item) => (
            <SourceMenu.Item key={item.action} onClick={actions[item.action]}>
              {item.label}
            </SourceMenu.Item>
          ))}
        </SourceMenu.Popup>
      )}
    </div>
  );
}

// K/q (panes-tabs-current.js:68-178): the ghost icon-only CaretDown "More
// files" trigger (te tooltip) and a menu (side bottom, align end) of the hidden
// tabs: the basename (italic for a preview, sr-only ", preview"), the folder as
// a caption, a pointer-only X "Close file", and ArrowRight closes the
// highlighted row (sr-only "press right arrow to close").
const EMPTY_STRIP = Object.freeze({ hiddenIds: [], compactIds: [], overflowing: false });
// Re-opening a restored tab makes it an ordinary open tab (a later "missing" read shows the deleted card).
const withoutRestored = ({ restored, ...file }) => file;
const TREE_TOGGLE_SHORTCUT = "cmd+shift+y";
function SourceFileTabOverflow({ tabs, cwd, onActivate, onClose }) {
  const [open, setOpen] = useState(null);
  const button = useRef(null);
  const hintId = useId();
  return <>
    <SourceTooltip content={FILE_TAB_LABELS.moreTabs} hoverable={false}>
      <SourceSettingsButton ref={button} variant="ghost" iconOnly icon="CaretDown" iconSize="auto" aria-label={FILE_TAB_LABELS.moreTabs}
        className="source-file-tabs-more" {...menuTriggerProps({ open: !!open, onOpen: (entry) => setOpen(entry) })}
        onClick={() => setOpen((value) => (value ? null : "click"))} />
    </SourceTooltip>
    {open && <SourceMenu.Popup anchor={button.current} side="bottom" align="end" label={FILE_TAB_LABELS.moreTabs} contextMenuGuard="always"
      initialHighlight={open === "first" || open === "last" ? open : undefined} onClose={() => setOpen(null)}>
      <span id={hintId} className="source-sr-only">{FILE_TAB_LABELS.closeTabHint}</span>
      {tabs.map((file) => {
        const label = basename(file.path), detail = tabDetail(file.path, cwd), preview = file.preview === true;
        return <SourceMenu.Item key={file.path} aria-describedby={hintId} className="source-file-overflow-row" data-file-path={file.path}
          onClick={() => onActivate(file.path)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight") return;
            event.preventDefault();
            event.stopPropagation();
            onClose(file.path);
          }}
          trailing={<span aria-hidden="true" title={FILE_TAB_LABELS.closeTab} className="source-file-overflow-close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onClose(file.path); }}>
            <Icon name="X" size={12} />
          </span>}>
          <span className="source-file-overflow-copy">
            <span className="source-file-overflow-label" data-deleted={file.unavailable === "missing" || undefined} data-preview={preview || undefined} title={label}>
              {label}{preview && <span className="source-sr-only">, {FILE_TAB_LABELS.previewTabHint}</span>}
              {file.unavailable === "missing" && <span className="source-sr-only">, {FILE_TAB_LABELS.deletedTabHint}</span>}
            </span>
            {detail !== undefined && <span className="source-file-overflow-detail" title={detail}>{detail}</span>}
          </span>
        </SourceMenu.Item>;
      })}
    </SourceMenu.Popup>}
  </>;
}

export function SourceFilePanel(props) {
  // R3-files FT-05: the session id context (c9b8e0296) the gone hook reads, as the official session pane provides it.
  // R3-files FT-14: the pane's QueryClient (FilesQueryScope), which the worktree start folder's git info query reads.
  return <FilesQueryScope><CurrentSessionIdContext.Provider value={props.sessionId ?? null}><FilePane key={`${props.sessionId ?? "home"}:${props.searchPane ?? "main"}:${props.cwd || "no-folder"}`} {...props} /></CurrentSessionIdContext.Provider></FilesQueryScope>;
}

// Controlled/uncontrolled bridge: the session workspace owns the file view in
// the tile store (tabs, active path, tree visibility, expanded folders) so it
// survives closing the pane, switching sessions and relaunching; the
// artifacts browser keeps component-local state.
function useViewState(view, onViewChange, key, fallback) {
  const [local, setLocal] = useState(fallback);
  const controlled = !!view && !!onViewChange && Object.hasOwn(view, key);
  const value = controlled ? view[key] : local;
  const viewRef = useRef(view);
  viewRef.current = view;
  const set = useCallback((next) => {
    if (controlled) {
      const previous = viewRef.current[key];
      const resolved = typeof next === "function" ? next(previous) : next;
      if (resolved !== previous) {
        // Later functional updates before the next render (two file reads
        // resolving together) build on this value, not on the stale view.
        viewRef.current = { ...viewRef.current, [key]: resolved };
        onViewChange({ [key]: resolved });
      }
    } else setLocal(next);
  }, [controlled, onViewChange, key]);
  return [value, set];
}
function FilePane({
  sessionId = null,
  searchPane = "main",
  cwd,
  tab,
  plan,
  // R09: the latest proposed plan document (state.planDocs) for the Plan pane.
  planDocument = null,
  // B22 (cccc2cf0a Xh/Jh): planCommentsEnabled = a plan review is pending or the session is in plan mode;
  // planHistory {loading, failed, onRetry}: the session's history is still loading, or failed to load.
  planCommentsEnabled = false,
  planHistory = null,
  diff,
  diffScope,
  // F12: the zm "Diff scope: …" trigger (source-diff-scope.jsx) shown in place of the Changes title.
  diffScopeControl = null,
  diffError,
  loading = false,
  // B15 (c44d00c7f Xc): {scope} of the previous comparison shown dimmed while the current scope loads.
  diffStale = null,
  // B15 (cb61be3a2 ze): the failed state's "Try again" is busy while the refetch it started runs.
  diffRetrying = false,
  // B15 (c44d00c7f Zr): useDiffScope().commits for the Commits section of the Changed files column.
  diffCommits = null,
  onClose,
  onRefresh,
  openRequest = null,
  onOpenRequestHandled = null,
  // Changes header actions for SourceDiff placement "changes" (c219730b0 Ze/$e):
  // {root, onCopy, onOpenFile, onAttachFile} from main.jsx.
  diffFileActions = null,
  // Files pane file actions from main.jsx: {onAttachFile(absolute), onRevealFile(absolute)};
  // each is null where it has no target (no composer, no session reveal IPC).
  fileActions = null,
  // shared-5 Sy: the NUX queue shows nothing during onboarding or for a profile under a day old (main.jsx
  // nuxAccountAged); pop-out windows never pass it.
  nuxAllowed = false,
  // main.jsx's ⌘⇧Y (toggleDiffFileList) handle: FilePane registers its tree toggle here
  // (the Files tree for tab "files", the Changed files column for tab "changes").
  treeToggleRef = null,
  // R10 Changes file list state from main.jsx's tile store ({diffShowTree,
  // diffTreeWidth, diffFileTree, diffGroupByKind}) and its setter (patch); without
  // them (popout) the pane keeps component-local state with the same defaults.
  diffTree = null,
  onDiffTreeChange = null,
  call = desktopCall,
  view = null,
  onViewChange = null,
  headerCenter = null,
  paneControls = null,
  // Review findings in the Changes pane (hh / Rn): {items, active, onSend(text), onRerun()} from main.jsx.
  review = null,
  // B07 (c4e0cfada Te/Ee): {paths, seq} from main.jsx when the agent's edits complete; open tabs for those paths re-read.
  filesInvalidate = null,
  // dropRestoredFileTab closePaneIfLast: a pop-out file window (xb) keeps its pane when its last restored tab is gone.
  closeIfRestoredGone = true,
  // R3-files FT-14 (files-10): the folder a worktree session was started from (sessionMetadata.originCwd), from main.jsx.
  worktreeOrigin = null,
}) {
  const toasts = useSourceToasts();
  const [diffPreferences, setDiffPreference] = useDiffViewPreferences();
  const [fileViewSettings, setFileViewSetting] = useFileViewSettings();
  const diffView = diffPayload(diff);
  const [diffCanFitSplit, setDiffCanFitSplit] = useState(true);
  // requestDiffFoldAll (panes-state-current.js:2809-2821): {collapsed, seq}; each
  // request bumps seq so FileDiff applies it once (source-diff.jsx FileDiff).
  const [diffFoldAll, setDiffFoldAll] = useState(null);
  // R10 Changed files column (panes-tile-current.js:3640-3690 dh, :3740-3779 fh,
  // panes-state-current.js:646-647): visibility, width and grouping persist in the
  // tile store; diffCanFitTree is reported by SourceDiff (?? true, uh) and
  // diffIsLarge (Qe) disables "Expand all files".
  const [diffShowTree, setDiffShowTree] = useViewState(diffTree, onDiffTreeChange, "diffShowTree", false);
  const [diffTreeWidth, setDiffTreeWidth] = useViewState(diffTree, onDiffTreeChange, "diffTreeWidth", 240);
  const [diffFileTree, setDiffFileTree] = useViewState(diffTree, onDiffTreeChange, "diffFileTree", true);
  const [diffGroupByKind, setDiffGroupByKind] = useViewState(diffTree, onDiffTreeChange, "diffGroupByKind", false);
  const [diffCommitsCollapsed, setDiffCommitsCollapsed] = useViewState(diffTree, onDiffTreeChange, "diffCommitsCollapsed", false);
  const [diffCanFitTree, setDiffCanFitTree] = useState(true);
  const [diffIsLarge, setDiffIsLarge] = useState(false);
  // uh: the toggle exists while the column can fit and the body is not empty
  // (diffBodyEmpty: the empty and failed states; loading still shows it).
  // B15 (cccc2cf0a Xb Ie/ze): an empty "Uncommitted changes" scope while the branch has commits is not an empty
  // body, so the column (and its Commits section) stays toggleable.
  const diffEmptyWithCommits = tab === "changes" && !diffError && !loading && !diffView.patch && diffCommits?.list?.length > 0;
  const diffListAvailable = tab === "changes" && !diffError && (loading || !!diffView.patch || (diffEmptyWithCommits && diffScope === "uncommitted")) && diffCanFitTree;
  const toggleDiffTree = useCallback(() => setDiffShowTree((shown) => !shown), [setDiffShowTree]);
  // ke failed shows no error detail; keep the raw reason in the console, once per message.
  const warnedDiffError = useRef("");
  useEffect(() => {
    if (tab === "changes" && diffError && warnedDiffError.current !== diffError) { warnedDiffError.current = diffError; console.warn(diffError); }
  }, [tab, diffError]);
  const [entries, setEntries] = useState(null);
  const [fileTabs, setFileTabs] = useViewState(view, onViewChange, "fileTabs", []);
  useLayoutEffect(() => {
    if (!fileViewSettings.previewTabs && fileTabs.some(file => file.preview === true))
      setFileTabs(files => files.map(file => file.preview === true ? { ...file, preview: false } : file));
  }, [fileViewSettings.previewTabs, fileTabs, setFileTabs]);

  const [expandedList, setExpandedList] = useViewState(view, onViewChange, "expandedPaths", null);
  const expandedPaths = useMemo(() => (Array.isArray(expandedList) ? new Set(expandedList) : null), [expandedList]);
  const onExpandedChange = useCallback((path, open) => {
    setExpandedList((list) => {
      const next = new Set(Array.isArray(list) ? list : []);
      if (open) next.add(path); else next.delete(path);
      return [...next];
    });
  }, [setExpandedList]);
  // Inline file-reference chips (2.2553.1 gy -> pane open at line): the
  // request opens the file as a preview tab; the viewer marks line..endLine
  // (data-active rows) and centres it once per request (nonce = the request's
  // sequence, Fu scrollNonce, panes-tile-current.js:6328-6352).
  const [activeLine, setActiveLine] = useState(null);
  const [activePath, setActivePath] = useViewState(view, onViewChange, "activePath", null);
  const [treeError, setTreeError] = useState("");
  const [treeRefreshing, setTreeRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // B07 mv: per-folder listing refreshes ({[relative dir]: n}, "" = root) from the folder watcher.
  const [dirRefresh, setDirRefresh] = useState({});
  const watchId = useId();
  // follow: true while following the open file (search cleared), false for an explicit "Reveal in file tree"
  // (B33: that one clears the filter, centres and flashes the row — cccc2cf0a revealInFilesTree vs followInFilesTree).
  const [treeReveal, setTreeReveal] = useState({ path: null, generation: 0, follow: true });
  // R3-files FT-14 (cccc2cf0a Nx, files-10): until the tree has shown the worktree start folder (DS onStartFolderShown)
  // or another reveal arrives (`r !== void 0 && !M && P(!0)`), the reveal is the start folder's: "dir/" (that folder's
  // row is the target), nonce Rx, start.
  const treeStartFolder = useTreeStartFolder({ cwd, originCwd: worktreeOrigin });
  const [startFolderShown, setStartFolderShown] = useState(false);
  if (treeReveal.generation > 0 && !startFolderShown) setStartFolderShown(true);
  const onStartFolderShown = useCallback(() => setStartFolderShown(true), []);
  const shownReveal = treeReveal.generation === 0 && !startFolderShown && treeStartFolder
    ? { path: `${treeStartFolder}/`, generation: startRevealNonce, follow: false, start: true } : treeReveal;
  // B33 oy: the last file openFile opened ({seq, path}) and the pending hand-off of focus to it.
  const opened = useRef({ seq: 0, path: null });
  const [fileFocusRequest, setFileFocusRequest] = useState(null);
  const includeRootChild = revealChild("", shownReveal.path);
  const [paneWidth, setPaneWidth] = useState(0);
  const [treeShown, setTreeShown] = useViewState(view, onViewChange, "treeShown", false);
  const [treePeek, setTreePeek] = useState(false);
  useLayoutEffect(() => { setTreePeek(false); }, [sessionId, cwd, tab]);
  const [treeHiddenWhileEmpty, setTreeHiddenWhileEmpty] = useViewState(view, onViewChange, "treeHiddenWhileEmpty", false);
  const treeReturnPath = useRef(null);
  const [treeWidth, setTreeWidth] = useState(() => {
    try {
      const saved = Number(
        localStorage.getItem("code-desktop-files-tree-width"),
      );
      return saved >= 160 && saved <= 640 ? saved : 240;
    } catch {
      return 240;
    }
  });
  const [dragTreeWidth, setDragTreeWidth] = useState(null);
  const treeDragStart = useRef(null);
  const treeHandleFocus = useRef(false);
  // Search files (c_ -> focusFilesTreeFilter): the pending filter focus and a
  // tick that re-runs the focus effect when the tree was already visible.
  const filterFocus = useRef(false), searchFocusRef = useRef(null);
  const [filterFocusTick, setFilterFocusTick] = useState(0);
  const tabSequence = useRef(0);
  const closeFocus = useRef(null);
  const mounted = useRef(true);
  const pane = useRef(null);
  const closeHintId = useId(), moveHintId = useId();
  // Tab strip overflow (_e, panes-tabs-current.js:503-680; pure model in
  // file-tab-overflow-model.mjs): hidden tabs stay laid out but invisible and
  // are listed in "More files"; the strip scrolls so the active tab shows.
  const tabBar = useRef(null), tabList = useRef(null), reorderFocus = useRef(null);
  // Drag a file tab to a new slot (panes-tabs-current.js Oe, onReorder :6782); Ctrl/⌘+Shift+←/→ stays the keyboard
  // path. The strip shows the drag's order live and commits it on release.
  const fileTabDrag = useTabDragReorder({ stripRef: tabList, itemSelector: "[data-vtb-id]", idOf: (node) => node.dataset.vtbId,
    onReorder: (path, toIndex) => setFileTabs((files) => moveToIndex(files, path, toIndex, (file) => file.path)) });
  const [strip, setStrip] = useState(EMPTY_STRIP);
  useLayoutEffect(() => {
    const list = tabList.current, root = tabBar.current;
    if (!list || tab !== "files") {
      setStrip((previous) => (previous === EMPTY_STRIP ? previous : EMPTY_STRIP));
      return undefined;
    }
    const measure = () => {
      if (!list.isConnected) return;
      const nodes = [...list.querySelectorAll("[data-vtb-id]")];
      const tabs = nodes.map((node) => {
        const label = node.querySelector("[data-vtb-label]");
        return { id: node.dataset.vtbId, start: node.offsetLeft - 4, end: node.offsetLeft - 4 + node.offsetWidth,
          compact: node.hasAttribute("data-compact"), clipped: !!label && label.scrollWidth > label.clientWidth + 1 };
      });
      let overflowWidth = 0, compactSlack = 0;
      const button = root?.querySelector(":scope > [data-vtb-overflow]");
      const win = list.ownerDocument.defaultView;
      if (root && button) overflowWidth = Math.floor(button.getBoundingClientRect().width) + (parseFloat(win?.getComputedStyle(root).columnGap ?? "") || 0);
      const compactCount = tabs.filter((value) => value.compact).length;
      if (root && compactCount > 0) {
        // The free width at the end of the bar, shared by the compact tabs (:589-601).
        const box = root.getBoundingClientRect();
        let right = box.left;
        for (const child of root.children) {
          const rect = child.getBoundingClientRect();
          if (rect.width > 0) right = Math.max(right, child === list ? rect.right - 4 : rect.right);
        }
        compactSlack = Math.max(0, box.right - right) / compactCount;
      }
      const layout = tabOverflowLayout({ tabs, clientWidth: list.clientWidth, scrollWidth: list.scrollWidth, scrollLeft: list.scrollLeft,
        overflowWidth, activeId: activePath, compactSlack });
      if (Math.abs(list.scrollLeft - layout.scrollLeft) > 1) list.scrollLeft = layout.scrollLeft;
      setStrip((previous) => {
        const hiddenIds = stableIds(previous.hiddenIds, layout.hiddenIds), compactIds = stableIds(previous.compactIds, layout.compactIds);
        return hiddenIds === previous.hiddenIds && compactIds === previous.compactIds && previous.overflowing === layout.overflowing
          ? previous : { hiddenIds, compactIds, overflowing: layout.overflowing };
      });
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (observer) {
      observer.observe(list);
      if (root) observer.observe(root);
      for (const node of list.querySelectorAll("[data-vtb-id]")) observer.observe(node);
    }
    list.addEventListener("scroll", measure, { passive: true });
    return () => { observer?.disconnect(); list.removeEventListener("scroll", measure); };
  }, [fileTabs, activePath, tab]);
  // _e (:640-663): a focused tab that becomes hidden hands focus to the active
  // tab; a reordered tab keeps focus.
  useLayoutEffect(() => {
    const list = tabList.current;
    if (!list) return;
    const focusTab = (path) => [...list.querySelectorAll("[data-vtb-id]")].find((node) => node.dataset.vtbId === path)?.querySelector('[role="tab"]');
    const moved = reorderFocus.current;
    reorderFocus.current = null;
    if (moved) { const node = focusTab(moved); if (node && node.ownerDocument.activeElement !== node) node.focus({ preventScroll: true }); return; }
    const active = list.ownerDocument.activeElement;
    if (strip.hiddenIds.some((path) => focusTab(path)?.contains(active))) focusTab(activePath)?.focus({ preventScroll: true });
  }, [strip.hiddenIds, fileTabs]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenTabs = useMemo(() => fileTabs.filter((file) => strip.hiddenIds.includes(file.path)), [fileTabs, strip.hiddenIds]);
  const activeTab = fileTabs.find((file) => file.path === activePath);
  // The file view (fileView, panes-tile-current.js:6328-6352): the active tab,
  // whatever its body state (loading, text or an unavailable card).
  const preview = activeTab;
  // One read per path at a time; a newer read of the same path wins, and a
  // result only updates a tab that is still open (a closed tab never returns).
  const reads = useRef(new Map());
  // B07 El staleness (cd2efac6e :3378-3386): when each open tab was last read in this mount, and the tabs a
  // "View as text anyway" read forced (a refresh keeps reading those as text).
  const readAt = useRef(new Map()), forcedReads = useRef(new Set());
  // The values an async read result needs (dropRestoredFileTab looks at the store as it is when the read lands).
  const latest = useRef(null);
  latest.current = { fileTabs, activePath, treeShown, onClose, closeIfRestoredGone };
  function loadFile(path, { force = false } = {}) {
    if (!cwd || typeof path !== "string" || !path) return Promise.resolve();
    const token = {};
    reads.current.set(path, token);
    if (force) forcedReads.current.add(path);
    const asText = force || forcedReads.current.has(path) || !!readFileView(sessionId ? `${sessionId}\u0000${path}` : null)?.forcedText;
    return Promise.resolve()
      // B32: sessionId lets main read an outside-root file from one of the session's added folders.
      .then(() => call("file", { cwd, relative: path, ...(sessionId ? { sessionId } : {}), ...(asText ? { force: true } : {}) }))
      .then((file) => (file && typeof file === "object" ? file : { unavailable: "read_error" }),
        () => ({ unavailable: "read_error" }))
      .then(async (file) => {
        if (typeof file.text === "string" && (!file.encoding || file.encoding === 'utf-8')) {
          const editable = await call("file:edit-read", { cwd, relative: path }).catch(() => null);
          if (editable?.hash && typeof editable.text === "string") file = { ...file, text: editable.text, editHash: editable.hash };
        }
        if (!mounted.current || reads.current.get(path) !== token) return;
        reads.current.delete(path);
        readAt.current.set(path, Date.now());
        const result = typeof file.text === "string" ? { text: file.text, size: file.size, encoding: file.encoding, editHash: file.editHash, forcedText: asText } : { unavailable: file.unavailable ?? "read_error", ...(Number.isFinite(file.size) ? { size: file.size } : {}), ...(typeof file.creatable === "boolean" ? { creatable: file.creatable } : {}) };
        const now = latest.current;
        const keepRestored = treeReturnPath.current;
        if (applyFileRead(now.fileTabs, path, result, { keepRestored }).dropped) {
          dropRestoredTab(path);
          return;
        }
        setFileTabs((files) => applyFileRead(files, path, result, { keepRestored }).tabs);
      });
  }
  // dropRestoredFileTab (code-pane.readable.js :3710-3724, cd2efac6e Ic onGone): a tab restored after relaunch whose
  // file is gone leaves quietly; its neighbour becomes the file view, and the pane closes when no tab is left and the
  // tree is not shown beside the file (closePaneIfLast !z && !b).
  function dropRestoredTab(path) {
    const { fileTabs: files, activePath: active, treeShown: shown, onClose: close, closeIfRestoredGone: closeIfLast } = latest.current;
    const index = files.findIndex((file) => file.path === path);
    if (index < 0) return;
    const remaining = files.filter((file) => file.path !== path);
    readAt.current.delete(path); forcedReads.current.delete(path);
    setFileTabs((list) => list.filter((file) => file.path !== path));
    if (active === path) setActivePath(remaining[Math.min(index, remaining.length - 1)]?.path ?? null);
    if (closeIfLast && remaining.length === 0 && !shown) close?.();
  }
  // B07 refresh (c4e0cfada Y :384-400 / El refetchOnWindowFocus): re-read a loaded tab in place unless its viewer has
  // unsaved edits (skipWriteRefetch: the read is only marked stale, and the hash check still guards a save).
  // restart (an agent edit or a folder change): a read already in flight may predate the write, so a newer read
  // replaces it (refetchQueries cancelRefetch); focus/staleness leave an in-flight read alone.
  function refreshTab(path, { restart = false } = {}) {
    const file = latest.current.fileTabs.find((value) => value.path === path);
    const pending = reads.current.has(path);
    if (!file || (pending ? !restart : !tabLoaded(file))) return;
    if (hasDirtyFileEdit({ sessionId, path })) { readAt.current.delete(path); return; }
    loadFile(path);
  }
  // qa: the ⋮ menu's Find in file (bumps the viewer's findRequest), Copy file contents, Download file and Reload
  // file (disabled while the re-read runs) for the active text file; the breadcrumb folder lister (local sessions).
  const [findRequest, setFindRequest] = useState(0);
  const [reloadingPath, setReloadingPath] = useState(null);
  const reloadFile = (path) => {
    if (guardFileEdits(() => reloadFile(path), { sessionId, paths: [path] })) return;
    setReloadingPath(path);
    loadFile(path).finally(() => { if (mounted.current) setReloadingPath((current) => (current === path ? null : current)); });
  };
  const downloads = useRef(new Set());
  const [downloadingPaths, setDownloadingPaths] = useState(() => new Set());
  const downloadFile = async (file) => {
    if (downloads.current.has(file.path)) return;
    downloads.current.add(file.path);
    setDownloadingPaths(new Set(downloads.current));
    try {
      return await downloadFileContents(file, { document: pane.current?.ownerDocument ?? document,
        loadDocument: cwd ? path => call('file:document-bytes', { cwd, relative: path, sessionId }) : undefined,
        notify: (message, options) => toasts?.add(message, options), dismiss: (id) => toasts?.close?.(id) });
    } finally {
      downloads.current.delete(file.path);
      if (mounted.current) setDownloadingPaths(new Set(downloads.current));
    }
  };
  // openFile is a hoisted declaration below; the ref keeps the lister stable across renders.
  const openFileRef = useRef(null);
  openFileRef.current = openFile;
  // B13: the HTML preview frame host (main file-preview-frame.cjs): the active file's shown text as an
  // oc-file-preview document, released when the frame unmounts or the text changes.
  const previewFrame = useMemo(() => (cwd ? {
    register: (text, path) => call("file:preview-frame", { cwd, relative: path, text }),
    release: (url) => { void Promise.resolve(call("file:preview-frame-release", { url })).catch(() => {}); },
  } : null), [cwd, call]);
  const folderLister = useMemo(() => (cwd ? createBreadcrumbLister({
    root: cwd,
    list: (dir) => call("files", { cwd, relative: dir }),
    onOpenFile: (path, { keep = false } = {}) => openFileRef.current?.({ path }, { preview: !keep }),
  }) : null), [cwd, call]);
  // Tabs restored from the persisted store carry only path/preview; the
  // active one is re-read through the same scoped file IPC.
  useEffect(() => {
    if (!activeTab || typeof activeTab.text === "string" || activeTab.unavailable || !cwd || reads.current.has(activeTab.path)) return;
    loadFile(activeTab.path);
  }, [activeTab, cwd]); // eslint-disable-line react-hooks/exhaustive-deps
  // B07 El staleTime/refetchOnWindowFocus (cd2efac6e :3375-3386): the file view re-reads when it is selected or the
  // pane mounts with a body older than FILE_STALE_MS (in-memory tabs keep their text across session switches), and
  // when the window regains focus; never while its editor has unsaved edits.
  useEffect(() => {
    if (!cwd || !activePath || tab !== "files") return;
    if (tabLoaded(latest.current.fileTabs.find((file) => file.path === activePath)) && readIsStale(readAt.current.get(activePath))) refreshTab(activePath);
  }, [activePath, cwd, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cwd || tab !== "files") return undefined;
    const onFocus = () => {
      const path = latest.current.activePath;
      if (path && readIsStale(readAt.current.get(path))) refreshTab(path);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [cwd, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  // B07 Ee (c4e0cfada :361-382): the agent's completed edits re-read the file view now (refetchType active) and mark
  // other open tabs for those paths stale, so selecting one re-reads it.
  useEffect(() => {
    if (!filesInvalidate || !cwd) return;
    for (const path of tabsForEdits(latest.current.fileTabs, filesInvalidate.paths, cwd)) {
      readAt.current.delete(path);
      if (path === latest.current.activePath && tab === "files") refreshTab(path, { restart: true });
    }
  }, [filesInvalidate?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if(openRequest?.filter){
      focusFilesFilter(openRequest.filter);
      onOpenRequestHandled?.(openRequest.sequence);
      return;
    }
    if (!openRequest || typeof openRequest.path !== "string") return;
    setActiveLine(Number.isInteger(openRequest.line) && openRequest.line > 0
      ? { path: openRequest.path, line: openRequest.line, nonce: openRequest.sequence,
          endLine: Number.isInteger(openRequest.endLine) && openRequest.endLine >= openRequest.line ? openRequest.endLine : openRequest.line }
      : null);
    openFile({ path: openRequest.path }, { preview: true });
    onOpenRequestHandled?.(openRequest.sequence);
  }, [openRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const lineMark = preview && activeLine && activeLine.path === preview.path ? activeLine : null;
  // B33 Db fileFocusRequest (cccc2cf0a :6969-6980): focus the requested file's view once it is shown and read —
  // its editor (.cm-content) when editable, else the viewer root (keyboard Find and the card actions). A passive
  // effect, so the editor its child mounts in an effect of the same commit is there.
  useEffect(() => {
    const request = fileFocusRequest;
    if (!request) return;
    if (tab !== "files" || activePath !== request.path) { setFileFocusRequest(null); return; }
    const view = [...(pane.current?.querySelectorAll(".source-file-view") || [])].find((node) => node.dataset.filePath === request.path);
    if (!view || view.dataset.fileState === "loading") return;
    setFileFocusRequest(null);
    (view.querySelector(".cm-content") ?? view).focus({ preventScroll: true });
  }, [fileFocusRequest, activePath, preview, tab]);
  useLayoutEffect(() => {
    const request = closeFocus.current;
    if (!request || tab !== "files") return;
    closeFocus.current = null;
    const tabs = [...(pane.current?.querySelectorAll('[role="tab"]') || [])];
    const visible = (node) => node && !node.disabled && node.getClientRects().length > 0 && !node.closest("[hidden], [inert], [data-overflowed]");
    const browserInput = [...(pane.current?.querySelectorAll(`.source-files-tree input[aria-label="${t("Filter files")}"]`) || [])].find(visible);
    const treeButton = [...(pane.current?.querySelectorAll(".source-files-tree button:not(:disabled)") || [])].find(visible);
    const target =
      tabs.find((node) => visible(node) && node.closest(".source-file-tab")?.dataset.filePath === request.path) ||
      tabs.find((node) => visible(node) && node.getAttribute("aria-selected") === "true") ||
      browserInput || treeButton ||
      pane.current?.querySelector(`button[aria-label="${t("Show file tree")}"]`);
    target?.focus({ preventScroll: true });
  }, [fileTabs, activePath, tab]);
  const treeCanFit = paneWidth >= 400;
  // B33 file tree coachmark (cccc2cf0a Db Oe + Zu epitaxy_files_tree_nux): "idle" until it shows, "shown" while
  // open, "done" once accepted, closed, interrupted or retired (persisted, so it shows once).
  const [treeNux, setTreeNux] = useState(() => (fileTreeNuxDismissed() ? "done" : "idle"));
  const [treeToggleAnchor, setTreeToggleAnchor] = useState(null);
  // Current e_: no selected file is a tree + empty preview when both fit.
  // The hidden-while-empty preference is separate from tree-beside-file.
  const treeMode = { hasFile: !!preview, canFit: treeCanFit, shown: treeShown, peek: treePeek,
    hiddenWhileEmpty: treeHiddenWhileEmpty, hasTabs: fileTabs.length > 0 };
  const treeVisible = fileTreeVisible(treeMode);
  const treeIsColumn = treeVisible && treeCanFit;
  const treeNuxEligible = treeNux !== "done" && fileTreeCoachmarkEligible({ toggleShown: tab === "files" && !!cwd,
    hasFile: !!preview, canFit: treeCanFit, treeVisible, popout: !!pane.current?.closest(".popout-root") });
  useLayoutEffect(() => {
    const anchor = treeNuxEligible ? pane.current?.querySelector(".source-pane-header > button[aria-pressed]") ?? null : null;
    setTreeToggleAnchor((current) => (current === anchor ? current : anchor));
    // ye cleanup: a coachmark that stops qualifying while open is closed for good ("interrupted").
    if (!treeNuxEligible && treeNux === "shown") setTreeNux("done");
  }, [treeNuxEligible, treeNux]);
  const treeLimit = Math.max(160, Math.min(640, paneWidth - 160));
  const visibleTreeWidth = Math.min(dragTreeWidth ?? treeWidth, treeLimit);
  useLayoutEffect(() => {
    if (!treeHandleFocus.current || tab !== "files") return;
    treeHandleFocus.current = false;
    const target = pane.current?.querySelector(
      treeIsColumn
        ? ".source-tree-divider"
        : !treeVisible && treeCanFit
          ? ".source-tree-edge"
          : ".source-pane-header > button[aria-pressed]",
    );
    target?.focus({ preventScroll: true });
  }, [treeVisible, treeIsColumn, treeCanFit, activePath, tab]);
  useEffect(() => {
    const element = pane.current;
    if (!element) return;
    setPaneWidth(element.clientWidth);
    const observer = new ResizeObserver(() =>
      setPaneWidth(element.clientWidth),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function saveTreeWidth(value) {
    const width = Math.max(160, Math.min(treeLimit, Math.round(value)));
    setTreeWidth(width);
    try {
      localStorage.setItem("code-desktop-files-tree-width", String(width));
    } catch {
      /* optional preference */
    }
  }
  // B33 (c51596d2b Z): every way of toggling the tree but the coachmark's own action retires the tree coachmark.
  function setVisibleTree(shown, via) {
    if (via !== "coachmark" && treeNux !== "done") { dismissFileTreeNux("toggled"); setTreeNux("done"); }
    if (shown === treeVisible && !treePeek) return;
    setTreePeek(false);
    if (
      pane.current?.ownerDocument.activeElement?.matches(
        ".source-tree-divider, .source-tree-edge",
      )
    )
      treeHandleFocus.current = true;
    if (preview) {
      if (treeCanFit) setTreeShown(shown);
      else if (shown) selectFile(null);
    } else if (fileTabs.length > 0) {
      if (!shown) {
        const file =
          fileTabs.find((value) => value.path === treeReturnPath.current) ||
          fileTabs.at(-1);
        selectFile(file.path, { retainTree: false });
        if (treeCanFit) setTreeShown(false);
      }
    } else {
      setTreeHiddenWhileEmpty(!shown);
    }
  }
  // focusFilesTreeFilter (panes-state-current.js:3097-3113), behind the c_
  // "Search files" button (panes-tile-current.js:6791-6807): clear "tree hidden
  // while empty"; with a file open the tree is shown beside it when it fits,
  // otherwise the pane switches to the tree (vi: fileView undefined, return
  // path kept). A fitting tree peeks without changing its stored preference.
  // The effect below then focuses "Filter files" and selects its text. The
  // Narrow layouts leave the active file through the same dirty-edit guard.
  function focusFilesFilter(mode = "filter") {
    filterFocus.current = mode;
    if (treeHiddenWhileEmpty) setTreeHiddenWhileEmpty(false);
    if (treeCanFit) setTreePeek(!!preview && (treePeek || !treeShown));
    else if (preview) selectFile(null);
    setFilterFocusTick((value) => value + 1);
  }
  useLayoutEffect(() => {
    if (!filterFocus.current || tab !== "files" || !treeVisible) return;
    const input = pane.current?.querySelector(`.source-files-tree input[aria-label="${t("Filter files")}"]`);
    if (!input || input.disabled || input.closest("[hidden], [inert]")) return;
    if(searchFocusRef.current?.(filterFocus.current))filterFocus.current = false;
  }, [filterFocusTick, treeVisible, tab, activePath]);
  function resizeTreeVisibility(shown) {
    const start = treeDragStart.current;
    // Hiding a tree-only view with open tabs activates its previous file. A
    // drag back across the threshold must restore the original tree-only view.
    if (shown && start.activePath === null && start.hadTabs)
      setActivePath(null);
    else setVisibleTree(shown);
  }
  function cancelTreeResize() {
    const start = treeDragStart.current;
    setActivePath(start.activePath);
    setTreeShown(start.treeShown);
    setTreePeek(start.treePeek);
    setTreeHiddenWhileEmpty(start.hiddenWhileEmpty);
    treeReturnPath.current = start.returnPath;
    setDragTreeWidth(null);
    treeHandleFocus.current = true;
  }
  function treeResizeSnapshot() {
    return {
      width: Math.min(treeWidth, treeLimit),
      activePath,
      hadTabs: fileTabs.length > 0,
      treeShown,
      treePeek,
      hiddenWhileEmpty: treeHiddenWhileEmpty,
      returnPath: treeReturnPath.current,
    };
  }
  const treeResize = useSourcePointerResize({
    onStart: () => {
      treeDragStart.current = treeResizeSnapshot();
    },
    onMove: (delta) => {
      const value = treeDragStart.current.width + delta;
      setDragTreeWidth(Math.max(160, Math.min(treeLimit, value)));
      resizeTreeVisibility(value >= 80);
    },
    onEnd: (delta) => {
      const value = treeDragStart.current.width + delta;
      if (value >= 80 && delta !== 0) saveTreeWidth(value);
      resizeTreeVisibility(value >= 80);
      setDragTreeWidth(null);
    },
    onCancel: cancelTreeResize,
  });
  const edgeResize = useSourcePointerResize({
    onStart: () => {
      treeDragStart.current = treeResizeSnapshot();
    },
    onMove: (delta) => {
      resizeTreeVisibility(delta >= 80);
      setDragTreeWidth(Math.max(160, Math.min(treeLimit, delta)));
    },
    onEnd: (delta) => {
      const shown = Math.abs(delta) < 3 || delta >= 80;
      resizeTreeVisibility(shown);
      if (delta >= 80) saveTreeWidth(delta);
      setDragTreeWidth(null);
    },
    onCancel: cancelTreeResize,
  });
  function resizeTreeKey(event) {
    if (event.metaKey || event.altKey || event.ctrlKey) return;
    const step = event.shiftKey ? 120 : 24;
    let value;
    if (event.key === "ArrowLeft") value = visibleTreeWidth - step;
    else if (event.key === "ArrowRight") value = visibleTreeWidth + step;
    else if (event.key === "Home") value = 160;
    else if (event.key === "End") value = treeLimit;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setVisibleTree(false);
      return;
    } else return;
    event.preventDefault();
    saveTreeWidth(value);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      reads.current.clear();
    };
  }, []);
  useEffect(() => {
    if (tab !== "files" || !cwd) {
      setTreeRefreshing(false);
      return;
    }
    let live = true;
    // Fresh data replaces retained keyed rows without losing open ancestors.
    setTreeError("");
    setTreeRefreshing(true);
    call("files", { cwd, relative: "", includeChild: includeRootChild })
      .then(async (data) => {
        if (!live) return;
        setEntries(data);
        // 2.37337.1 cb/Fv: the first opening also expands a single-directory chain.
        if (expandedList === null) {
          const chain = await singleChildFolderChain("", relative => relative === "" ? Promise.resolve(data) : call("files", { cwd, relative }));
          if (live) setExpandedList(list => Array.isArray(list) ? list : chain);
        }
      })
      .catch((e) => {
        if (live) setTreeError(errorMessage(e));
      })
      .finally(() => {
        if (live) setTreeRefreshing(false);
      });
    return () => {
      live = false;
    };
  }, [cwd, tab, refreshKey, includeRootChild, call]);
  // B07 mv (cccc2cf0a :4053-4086): a watched root refetches in the background — no busy tree, retained rows, and a
  // failed refetch keeps the last listing (a query keeps its data on a refetch error).
  const rootRefresh = dirRefresh[""] ?? 0;
  useEffect(() => {
    if (!rootRefresh || tab !== "files" || !cwd) return undefined;
    let live = true;
    Promise.resolve().then(() => call("files", { cwd, relative: "", includeChild: includeRootChild }))
      .then((data) => { if (live) { setEntries(data); setTreeError(""); } }, (e) => { if (live) setTreeError(errorMessage(e)); });
    return () => { live = false; };
  }, [rootRefresh]); // eslint-disable-line react-hooks/exhaustive-deps
  // watchSessionDirectories {watchId, dirPaths: [root, ...expanded]} while the tree shows; [] releases them on unmount,
  // when the tree hides or the folder changes. Each change event refetches that one folder and re-reads an open file
  // view it names (a local addition: Bash edits reach the view without a tool result).
  const watching = tab === "files" && !!cwd && treeVisible;
  const watchKey = JSON.stringify(watchedDirs(expandedList));
  useEffect(() => {
    if (!watching) return undefined;
    return () => { Promise.resolve().then(() => call("files:watch", { watchId, cwd, dirs: [] })).catch(() => {}); };
  }, [watching, cwd, watchId, call]);
  useEffect(() => {
    if (!watching) return;
    Promise.resolve().then(() => call("files:watch", { watchId, cwd, dirs: JSON.parse(watchKey) })).catch(() => {});
  }, [watching, cwd, watchKey, watchId, call]);
  useEffect(() => {
    if (!watching) return undefined;
    return window.desktop?.onEvent?.((event) => {
      if (event?.kind !== "files-dir-changed" || event.watchId !== watchId) return;
      const dir = typeof event.dir === "string" ? event.dir : "";
      setDirRefresh((counts) => ({ ...counts, [dir]: (counts[dir] ?? 0) + 1 }));
      for (const path of tabsForFolderChange(latest.current.fileTabs, dir, event.names)) {
        readAt.current.delete(path);
        if (path === latest.current.activePath) refreshTab(path, { restart: true });
      }
    });
  }, [watching, watchId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Oy "Try again" (cccc2cf0a :5556-5590): re-list the root; resolves true when it failed again.
  const retryTree = () => Promise.resolve().then(() => call("files", { cwd, relative: "", includeChild: includeRootChild }))
    .then((data) => { if (mounted.current) { setEntries(data); setTreeError(""); } return false; },
      (e) => { if (mounted.current) setTreeError(errorMessage(e)); return true; });
  // openFileTab (panes-state-current.js:2830-2845 -> F :1596-1616): the tab is
  // created or activated at once — a preview takes the preview slot in place —
  // and its body loads (Zo spinner) into the classified read result, so a
  // missing, outside, large, binary or unreadable file still gets its tab and
  // card. Re-opening an open tab refreshes it and keeps showing its text.
  function openFile(entry, { preview: previewTab = true } = {}) {
    previewTab = previewTab && fileViewSettings.previewTabs;
    const path = entry?.path;
    if (typeof path !== "string" || !path) return;
    if (guardFileEdits(() => openFile(entry, { preview: previewTab }), { sessionId, paths: [activePath] })) return;
    if(Number.isInteger(entry.line)&&entry.line>0)setActiveLine({path,line:entry.line,endLine:entry.line,nonce:++tabSequence.current,findQuery:entry.findQuery,findOptions:entry.findOptions});
    if (peekOnFileOpen(treeMode)) setTreePeek(true);
    setTreeHiddenWhileEmpty(false);
    setFileTabs((files) => {
      const existing = files.find((value) => value.path === path);
      const opened = existing
        ? { ...withoutRestored(existing), preview: existing.preview === true && previewTab }
        : { path, preview: previewTab, openSequence: ++tabSequence.current };
      return insertFileTab(files, opened);
    });
    setActivePath(path);
    loadFile(path);
    opened.current = { seq: opened.current.seq + 1, path };
  }
  // B33 cccc2cf0a oy + c82eca2bd M: Enter on a tree or filter-result row that opened a file hands focus to it once
  // Enter is released (focus still in the tree or lost to the body); Db then focuses the file view when it is
  // the one shown (fileFocusRequest, cleared when another file is shown first).
  function focusAfterEnter(container, activate) {
    const before = opened.current.seq;
    activate();
    const after = opened.current;
    if (after.seq === before || !container) return;
    onEnterReleased(container, () => setFileFocusRequest({ path: after.path, seq: after.seq }));
  }
  function closeFile(path) {
    closeFiles([path]);
  }
  // Batch setter for closeFile / "Close other files" / "Close all files"
  // (panes-state-current.js:2891-2951 closeFileTab/closeOtherFileTabs/
  // closeAllFileTabs): one state write, since the controlled view setter
  // cannot chain functional updates within one event.
  // keep: undefined for a single close, null for close-all, the kept path for close-others.
  function closeFiles(paths, keep) {
    if (guardFileEdits(() => closeFiles(paths, keep), { sessionId, paths: [...paths, ...(keep != null && keep !== activePath ? [activePath] : [])] })) return;
    const closing = new Set(paths);
    // An in-flight read of a closed tab must not resurrect it (loadFile only
    // updates open tabs), and its result is dropped.
    for (const path of closing) reads.current.delete(path);
    const index = fileTabs.findIndex((file) => closing.has(file.path) && file.path === activePath);
    const remaining = fileTabs.filter((file) => !closing.has(file.path));
    // closeOtherFileTabs makes the kept tab the file view.
    const nextPath = keep != null ? keep : (closing.has(activePath)
      ? (remaining[Math.min(index, remaining.length - 1)]?.path ?? null)
      : activePath);
    const rows = [
      ...(pane.current?.querySelectorAll(".source-file-tab") || []),
    ].filter((node) => closing.has(node.dataset.filePath));
    if (rows.some((row) => row.contains(row.ownerDocument.activeElement)))
      closeFocus.current = { path: nextPath };
    setFileTabs((files) => files.filter((file) => !closing.has(file.path)));
    if (nextPath !== activePath) selectFile(nextPath);
  }
  function keepFile(path) {
    setFileTabs((files) =>
      files.map((file) =>
        file.path === path ? { ...file, preview: false } : file,
      ),
    );
  }
  function selectFile(path, { retainTree = true } = {}) {
    if (path !== activePath && guardFileEdits(() => selectFile(path, { retainTree }), { sessionId, paths: [activePath] })) return;
    if (path === null && activePath) treeReturnPath.current = activePath;
    if (path !== null && retainTree && peekOnFileOpen(treeMode)) setTreePeek(true);
    setActivePath(path);
  }
  function followSelectedFile(path, { follow = true } = {}) {
    setTreeReveal((previous) => ({ path, generation: previous.generation + 1, follow }));
    setRefreshKey((value) => value + 1);
  }
  // l_ "Reveal in file tree" (revealInFilesTree): show the tree and reveal the row.
  function revealInTree(relative) {
    setTreeHiddenWhileEmpty(false);
    if (treeCanFit) setTreePeek(!!preview && (treePeek || !treeShown));
    else if (preview) selectFile(null);
    followSelectedFile(relative, { follow: false });
  }
  // Ge (c856385e2) copies through the clipboard and confirms with the
  // c3e58cab4 "Copied to clipboard." toast; the breadcrumb (Rs, cd2efac6e
  // :3384-3396) copies the relative path with "Path copied to clipboard.".
  function copyText(value, message = t("Copied to clipboard.")) {
    if (!value) return;
    Promise.resolve().then(() => navigator.clipboard.writeText(value))
      .then(() => toasts?.add(message, { variant: "neutral" }), (reason) => console.warn(reason));
  }
  // Tree rows (file_browser) and tabs (file_tab) share Mn's items; Attach and
  // Show in Finder only where main.jsx gave them a target.
  const fileMenu = tab === "files" && cwd ? {
    drag: fileActions?.onDragFiles ? (event,entries)=>{
      const paths=entries.map(entry=>fileCopyChoices(cwd,entry.path).absolute);
      const directories=entries.filter(entry=>entry.directory).map(entry=>fileCopyChoices(cwd,entry.path).absolute);
      return fileActions.onDragFiles(event,paths,directories);
    } : null,
    multiEntries: (paths,{directories=[]}={}) => multiFileContextMenu({root:cwd,paths,directories,canAttach:!!fileActions?.onAttachFiles,editors:fileActions?.onOpenInEditor?fileActions.editors:[]}),
    entries: (path, { surface = "file_browser", directory = false, unavailable, linkState, line, gone = false } = {}) => fileContextMenu({
      surface, root: cwd, path, directory, line, gone, // R3-files FT-05
      canAttach: !!fileActions?.onAttachFile,
      // The reveal IPC resolves inside the session folder only: no broken, external or looping link.
      canShowInFinder: !!fileActions?.onRevealFile && unavailable !== "missing" && unavailable !== "outside_root" && (!linkState || linkState === "ok")
        // B32 ko → Jt/Ut: a breadcrumb's file segment outside the working directory still shows it in Finder (the
        // session reveal takes an outside regular file); an outside folder gets neither Open in nor the reveal.
        || (surface === "file_breadcrumb" && unavailable === "outside_root" && !directory && !!fileActions?.onShowSessionFile),
      canRevealInTree: unavailable !== "missing",
      // B32 ko: a breadcrumb folder outside the working directory has no Open in (openIn: h || !p).
      editors: fileActions?.onOpenInEditor && unavailable !== "missing" && !(directory && unavailable === "outside_root") ? fileActions.editors : [],
      canOpenTerminal: directory && !!fileActions?.onOpenInTerminal && unavailable !== "missing" && unavailable !== "outside_root" && (!linkState || linkState === "ok"),
    }),
    select: (item, path) => {
      if(item.disabled)return;
      if (item.action === "copy") copyText(item.value);
      else if(item.action === "attach-many" && item.paths.length<=100)fileActions?.onAttachFiles?.(item.paths,item.directories);
      else if(item.action === "open-many-in-editor" && item.paths.length<=100)for(const target of item.paths)fileActions?.onOpenInEditor?.(target,item.editor);
      else if (item.action === "attach") { const absolute = fileCopyChoices(cwd, path).absolute; if(absolute){if(item.directory)fileActions?.onAttachFiles?.([absolute],[absolute]);else fileActions?.onAttachFile?.(absolute);} }
      else if (item.action === "show-in-finder" && fileCopyChoices(cwd, item.value).relative === null && fileActions?.onShowSessionFile)
        void Promise.resolve().then(() => fileActions.onShowSessionFile(item.value)).then((shown) => { if (!shown) throw new Error("not shown"); })
          .catch(() => toasts?.add(t("Couldn’t show this file in its folder."), { variant: "danger" }));
      else if (item.action === "show-in-finder") fileActions?.onRevealFile?.(item.value);
      else if (item.action === "open-in-editor") fileActions?.onOpenInEditor?.(item.value, item.editor, item.line);
      else if (item.action === "reveal-in-tree") revealInTree(item.value);
      else if (item.action === "open-in-terminal") fileActions?.onOpenInTerminal?.(item.value);
    },
  } : null;
  // ⌘⇧Y (uf toggleDiffFileList, panes-tile-current.js:6650-6655): main.jsx calls
  // the open Files pane's tree toggle, the same path as the ListBullet button.
  useLayoutEffect(() => {
    if (!treeToggleRef || tab !== "files" || !cwd) return undefined;
    const toggle = () => setVisibleTree(!treeVisible);
    treeToggleRef.current = toggle;
    return () => { if (treeToggleRef.current === toggle) treeToggleRef.current = null; };
  });
  // R10 ⌘⇧Y on the Changes pane (dh uf, panes-tile-current.js:3651-3660, enabled
  // only while uh): main.jsx routes 'file-list' here (pane-shortcuts fileListRoute).
  useLayoutEffect(() => {
    if (!treeToggleRef || tab !== "changes" || !diffListAvailable) return undefined;
    const toggle = toggleDiffTree;
    treeToggleRef.current = toggle;
    return () => { if (treeToggleRef.current === toggle) treeToggleRef.current = null; };
  }, [treeToggleRef, tab, diffListAvailable, toggleDiffTree]);
  // hh / Rn: the session's latest review findings as the Changes subheader and inline cards, over the session review
  // store the transcript's findings card writes (R4f-findings-store: source-pane-review.jsx useChangesPaneReview).
  const { diffReview, reviewBar } = useChangesPaneReview({ sessionId, review, cwd, enabled: tab === "changes", pane, content: diffView.patch });
  const title = tab === "files" ? t("Files") : tab === "plan" ? t("Plan") : t("Changes");
  const displayTitle =
    tab === "changes" && diffScope === "uncommitted"
      ? t("Uncommitted changes")
      : title;
  // Pane-supplied "{pane} settings" sections (official f_ for the file pane:
  // persistent behavior/display preferences and the tree toggle.
  const viewerText = tab === "files" && preview && typeof preview.text === "string" && !preview.unavailable ? preview : null;
  const menuSections =
    tab === "files" && cwd
      ? [{ key: "file-actions", items: viewerText ? fileViewerMenuItems({
          onFind: () => setFindRequest((value) => value + 1),
          onCopyContents: () => copyText(viewerText.text),
          onDownload: fileDownloadPlan(viewerText, { documentLoader: !!cwd }).available ? () => downloadFile(viewerText) : null,
          downloading: downloadingPaths.has(viewerText.path),
          onReload: () => reloadFile(viewerText.path), reloading: reloadingPath === viewerText.path }) : [] },
        { key: "files-tree", items: [{ value: "files-tree", label: t("Show file tree"), checked: treeVisible, checkedRole: "checkbox", keepOpen: true,
          // f_ (panes-tile-current.js:6872-6900): the item carries the ⌘⇧Y shortcut.
          shortcut: treeToggleRef ? TREE_TOGGLE_SHORTCUT : undefined, onSelect: () => setVisibleTree(!treeVisible) }] }, fileBehaviorMenu(fileViewSettings, setFileViewSetting), fileViewMenu(fileViewSettings, setFileViewSetting)]
      : tab === 'changes' ? changesMenuSections({ hasPatch: !diffError && !loading && !!diffView.patch,
        layoutSplit: diffPreferences.layout === 'split', canFitSplit: diffCanFitSplit, wordWrap: diffPreferences.wordWrap,
        onFoldAll: (collapsed) => setDiffFoldAll((previous) => ({ collapsed, seq: (previous?.seq ?? 0) + 1 })),
        onLayoutChange: (layout) => setDiffPreference('layout', layout), onWordWrapChange: (value) => setDiffPreference('wordWrap', value),
        wordDiff: diffPreferences.wordDiff, hideWhitespace: diffPreferences.hideWhitespace,
        onWordDiffChange: (value) => setDiffPreference('wordDiff', value), onHideWhitespaceChange: (value) => setDiffPreference('hideWhitespace', value),
        // R10 fh :3740-3779 diff-file-list group and :3791-3804 diffIsLarge.
        isLarge: diffIsLarge, fileList: { canFit: diffListAvailable, shown: diffShowTree, tree: diffFileTree, groupByKind: diffGroupByKind,
          shortcut: treeToggleRef ? TREE_TOGGLE_SHORTCUT : undefined, onToggle: toggleDiffTree, onTreeChange: setDiffFileTree, onGroupByKindChange: setDiffGroupByKind },
        onRefresh: () => onRefresh?.() }) : [];
  return (
    <aside
      ref={pane}
      className="source-file-panel detail-panel"
      data-pane-kind={
        tab === "changes" ? "diff" : tab === "files" ? "file" : tab
      }
      data-tree-resizing={
        treeResize.dragging || edgeResize.dragging || undefined
      }
      aria-label={t("{title} panel", { title })}
      aria-busy={
        (tab === "changes" && loading) ||
        (tab === "files" &&
          ((!!activeTab && typeof activeTab.text !== "string" && !activeTab.unavailable) || treeRefreshing || (!!cwd && entries === null && !treeError))) ||
        undefined
      }
      onKeyDown={(event) => {
        // A menu or popover portaled from the pane (header menus, the breadcrumb's "Files in {folder}") still
        // bubbles through React; its Escape closes that layer, not the pane. Only Escape from the pane's own DOM does.
        if (event.key === "Escape" && !event.defaultPrevented && event.currentTarget.contains(event.target) && !event.target.closest?.('[role="menu"]') && !event.currentTarget.ownerDocument.querySelector('[role="menu"]')) {
          event.stopPropagation();
          onClose?.();
        }
      }}
    >
      <header className="source-pane-header" data-pane-header={tab}>
        {tab === "files" && cwd && (
          // Ut around the ListBullet (panes-tile-current.js:6716-6741): CDS
          // tooltip "Show/Hide file tree" with the ⌘⇧Y keycap (uu("files")),
          // side top / align start, not hoverable; no native title.
          <SourceTooltip content={treeVisible ? t("Hide file tree") : t("Show file tree")} shortcut={treeToggleRef ? TREE_TOGGLE_SHORTCUT : undefined}
            side="top" align="start" hoverable={false}>
            <SourceIconButton
              name="ListBullet"
              label={treeVisible ? t("Hide file tree") : t("Show file tree")}
              nativeTitle={false}
              aria-pressed={treeVisible}
              aria-keyshortcuts={treeToggleRef ? "Meta+Shift+Y" : undefined}
              onClick={() => setVisibleTree(!treeVisible)}
            />
          </SourceTooltip>
        )}
        {nuxAllowed && treeNuxEligible && treeToggleAnchor && (
          // cccc2cf0a Db (:7100-7125) Zu epitaxy_files_tree_nux under the tree toggle (be: side bottom, align start,
          // introDelay 0.5); its action shows the tree via "coachmark".
          <SourceCoachmark anchor={treeToggleAnchor} align="start" introDelay={0.5} label={t("File tree")}
            title={t("Browse the project beside your file")} actionLabel={t("Show file tree")}
            onShown={() => { dismissFileTreeNux("shown"); setTreeNux("shown"); }}
            onClose={() => { dismissFileTreeNux("closed"); setTreeNux("done"); }}
            onAction={() => { dismissFileTreeNux("accepted"); setTreeNux("done"); setVisibleTree(true, "coachmark"); }}>
            {t("Show the file tree to jump between files without leaving this pane. Files you open line up here as tabs.")}
          </SourceCoachmark>
        )}
        {tab === "files" && fileTabs.length > 0 ? (
          // Xd tab list (panes-tabs-current.js:1128-1195): the data-view-tab-bar
          // root holds the tablist (a 700ms tooltip provider ne around the
          // tabs, then the end spacer shown while overflowing), the sr-only
          // delete and move hints every tab is described by, and the
          // [data-vtb-overflow] "More files" menu while tabs are hidden.
          <div ref={tabBar} className="source-file-tabbar" data-view-tab-bar="">
          <div
            ref={tabList}
            className="source-file-tabs"
            role="tablist"
            aria-label={t("Open files")}
          >
            <SourceTooltipGroup delay={700}>
              {fileTabDrag.order(fileTabs, (file) => file.path).map((file, index) => (
                <SourceFileTab
                  key={file.path}
                  onPointerDown={(event) => fileTabDrag.onPointerDown(file.path, event)}
                  file={file}
                  cwd={cwd}
                  selected={activePath === file.path}
                  tabIndex={
                    activePath === file.path ||
                    (!activePath && fileTabs[0].path === file.path)
                      ? 0
                      : -1
                  }
                  solo={fileTabs.length === 1}
                  posinset={index + 1}
                  setsize={fileTabs.length}
                  hintId={closeHintId}
                  moveHintId={moveHintId}
                  overflowed={strip.hiddenIds.includes(file.path)}
                  compact={activePath !== file.path && strip.compactIds.includes(file.path)}
                  fileMenu={fileMenu}
                  onSelect={selectFile}
                  onClose={closeFile}
                  onKeep={keepFile}
                  onCloseOthers={(path) => closeFiles(fileTabs.filter((value) => value.path !== path).map((value) => value.path), path)}
                  onCloseRight={(path) => closeFiles(fileTabsToRight(fileTabs, path))}
                  onCloseAll={() => closeFiles(fileTabs.map((value) => value.path), null)}
                  onKeyDown={(event, path) => {
                    // ge (:275-302): Control (or Meta) + Shift + ArrowLeft/Right
                    // moves the tab one slot (onReorder, panes-tile-current.js:6779).
                    if (event.shiftKey && (event.ctrlKey || event.metaKey) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
                      event.preventDefault();
                      reorderFocus.current = path;
                      setFileTabs((files) => moveFileTab(files, path, event.key === "ArrowLeft" ? -1 : 1, strip.hiddenIds));
                      return;
                    }
                    // ge (:275-302): Delete/Backspace close the closable tab.
                    if (event.key === "Delete" || event.key === "Backspace") {
                      event.preventDefault();
                      closeFile(path);
                      return;
                    }
                    // Roving focus skips the tabs hidden behind "More files"
                    // (they are disabled Base UI tabs, he :393-397).
                    const reachable = fileTabs.filter((tab) => tab.path === path || !strip.hiddenIds.includes(tab.path));
                    const index = reachable.findIndex(
                      (tab) => tab.path === path,
                    );
                    const next =
                      event.key === "ArrowRight"
                        ? (index + 1) % reachable.length
                        : event.key === "ArrowLeft"
                          ? (index - 1 + reachable.length) % reachable.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? reachable.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      const target = reachable[next].path;
                      selectFile(target);
                      [...event.currentTarget.closest('[role="tablist"]').querySelectorAll("[data-vtb-id]")]
                        .find((node) => node.dataset.vtbId === target)?.querySelector('[role="tab"]')?.focus();
                    }
                  }}
                />
              ))}
            </SourceTooltipGroup>
            <span aria-hidden="true" className="source-file-tabs-spacer" hidden={!strip.overflowing} />
          </div>
          <span id={closeHintId} className="source-sr-only">
            {FILE_TAB_LABELS.closeTabDeleteHint}
          </span>
          <span id={moveHintId} className="source-sr-only">
            {FILE_TAB_LABELS.moveTabHint}
          </span>
          {hiddenTabs.length > 0 && (
            <span data-vtb-overflow="" className="source-file-tabs-overflow">
              <SourceFileTabOverflow tabs={hiddenTabs} cwd={cwd} onActivate={selectFile} onClose={closeFile} />
            </span>
          )}
          </div>
        ) : tab === "changes" && (diffScopeControl || diffListAvailable) ? (
          // dh (panes-tile-current.js:3640-3690): while uh, the ghost iconOnly
          // ListBullet "Show files"/"Hide files" (-ml-[4px], pressed while shown;
          // Ut side top / align start with the ⇧⌘Y keycap) comes before the F12 zm
          // scope trigger (:2949-3110). The lu coachmark is not ported.
          <>
            {diffListAvailable && (
              <SourceTooltip content={diffShowTree ? t("Hide files") : t("Show files")} shortcut={treeToggleRef ? TREE_TOGGLE_SHORTCUT : undefined}
                side="top" align="start" hoverable={false}>
                <SourceIconButton
                  name="ListBullet"
                  className="source-icon-button -ml-[4px]"
                  data-diff-file-list-toggle=""
                  label={diffShowTree ? t("Hide files") : t("Show files")}
                  nativeTitle={false}
                  aria-pressed={diffShowTree}
                  aria-keyshortcuts={treeToggleRef ? "Meta+Shift+Y" : undefined}
                  onClick={toggleDiffTree}
                />
              </SourceTooltip>
            )}
            {diffScopeControl || <span className="source-pane-title">{displayTitle}</span>}
          </>
        ) : (
          // Mt/Tl (shared-12 vm "text-body text-secondary select-none truncate
          // pl-[4px]", panes-toggle-current.js:1428-1431): regular weight, no
          // native title; pl-0 right after the Files ListBullet (:6776).
          <span className="source-pane-title" data-after-toggle={(tab === "files" && cwd) ? "" : undefined}>{displayTitle}</span>
        )}
        {/* ka (panes-toggle-current.js:1614-1632) renders the tile's center drag
            handle o after the header/title content ([H, t, o], then trailing pe),
            so the absolute 44x16 handle paints above the position:relative tab
            strip (.source-file-tabs) it overlaps in a narrow tile. */}
        {headerCenter}
        {/* Trailing slot (panes-tile-current.js:16366-16378): for the file pane
            c_ "Search files" comes before the yh settings menu, then Expand and
            Close; c_ needs a local workdir (jl(session)). */}
        {(() => {
          // Mp (:1830-1866) leads the Plan trailing slot: "Copy plan" while a plan document exists.
          // nh (panes-tile-current.js:3222-3390): the Changes header's "Go to file" (⌘P) leads it while files are listed.
          const search = tab === "files" && cwd ? <SourceFilesSearchButton onClick={() => focusFilesFilter("filter")} />
            : tab === "plan" && planDocument ? <SourcePlanCopyButton document={planDocument} />
            : tab === "changes" && !diffError && !loading && diffView.patch ? <SourceDiffGoToFile patch={diffView.patch} /> : null;
          const close = <SourceIconButton name="X" label={t("Close panel")} onClick={onClose} />;
          return typeof paneControls === "function"
            ? paneControls({ menuSections, leading: search }) ?? <>{search}{close}</>
            : <>{search}{paneControls ?? close}</>;
        })()}
      </header>
      {tab === "changes" && reviewBar}
      {tab === "files" ? (
        <>
          <div
            className="source-file-body"
            data-has-preview={!!preview}
            data-tree-visible={treeVisible}
            data-tree-peek={treePeek || undefined}
            data-tree-column={treeIsColumn}
          >
            <div
              className="source-files-tree"
              hidden={!treeVisible}
              style={
                treeIsColumn
                  ? {
                      width: visibleTreeWidth,
                      minWidth: "min(160px, 100% - 160px)",
                      maxWidth: "min(640px, 100% - 160px)",
                    }
                  : undefined
              }
            >
              {treeRefreshing && entries !== null && <span className="source-sr-only" role="status">{t("Refreshing files")}</span>}
              <SourceFilesSearch
                focusRef={searchFocusRef}
                sessionId={sessionId}
                searchPane={searchPane}
                cwd={cwd}
                activePath={activePath}
                onOpen={openFile}
                onClear={followSelectedFile}
                // B33: an explicit reveal clears the filter (cccc2cf0a Bv kt/Rv); a folder result reveals its row
                // (V → revealInFilesTree); Enter that opens a file hands focus to it (ly → oy).
                revealNonce={treeReveal.follow ? undefined : treeReveal.generation}
                onRevealFolder={(relative) => revealInTree(`${relative}/`)}
                onEnterOpen={focusAfterEnter}
                fileMenu={fileMenu}
                onAskAbout={fileActions?.onAskAbout}
                enabled={tab === "files" && treeVisible}
                refreshKey={refreshKey}
                call={call}
              >
              {({ filtered, selectionStore }) => !cwd ? (
                // Jg (panes-tile-current.js:4780-4786): no working directory.
                <SourceFilesTreeState state="no-cwd" />
              ) : entries === null ? (
                // Ig (panes-tile-current.js:5496-5512): Yg spinner while loading,
                // fixed copy when the read failed with no data (the raw error is
                // not rendered), "Folder is empty" when there are no rows.
                <SourceFilesTreeState state={treeError ? "error" : "loading"} onRetry={treeError ? retryTree : undefined} />
              ) : !entries.length ? (
                <SourceFilesTreeState state="empty" />
              ) : (
                <SourceTree selectionStore={selectionStore} active={treeVisible && !filtered} busy={treeRefreshing} filterInputSelector={`input[aria-label="${t("Filter files")}"]`} onEnterOpen={focusAfterEnter}>
                  {entries.map((entry) => (
                    <SourceTreeNode
                      key={entry.path}
                      entry={entry}
                      cwd={cwd}
                      activePath={activePath}
                      onOpen={openFile}
                      refreshKey={refreshKey}
                      dirRefresh={dirRefresh}
                      call={call}
                      revealPath={shownReveal.path}
                      revealGeneration={shownReveal.generation}
                      revealFollow={shownReveal.follow}
                      revealStart={shownReveal.start === true}
                      onStartShown={onStartFolderShown}
                      treeVisible={treeVisible && !filtered}
                      expandedPaths={expandedPaths}
                      onExpandedChange={onExpandedChange}
                      fileMenu={fileMenu}
                    />
                  ))}
                </SourceTree>
              )}
              </SourceFilesSearch>
              {treeIsColumn && (
                <div
                  className="source-tree-divider"
                  role="separator"
                  tabIndex={0}
                  aria-label={t("Resize file tree")}
                  aria-orientation="vertical"
                  aria-valuemin={160}
                  aria-valuemax={treeLimit}
                  aria-valuenow={Math.round(visibleTreeWidth)}
                  onPointerDown={treeResize.onPointerDown}
                  onDoubleClick={() => saveTreeWidth(240)}
                  onKeyDown={resizeTreeKey}
                >
                  <span />
                </div>
              )}
            </div>
            {treeCanFit && !treeVisible && (
              <div
                className="source-tree-edge"
                role="separator"
                tabIndex={0}
                aria-label={t("Show file tree")}
                aria-orientation="vertical"
                aria-valuemin={0}
                aria-valuemax={640}
                aria-valuenow={0}
                onPointerDown={edgeResize.onPointerDown}
                onKeyDown={(event) => {
                  if (["Enter", " ", "ArrowRight"].includes(event.key)) {
                    event.preventDefault();
                    setVisibleTree(true);
                  }
                }}
              >
                <span />
              </div>
            )}
            {preview && (() => {
              // Fu (panes-tile-current.js:6328-6352): the file viewer for the
              // file view, with the jump range of a chip request for this path.
              const relative = tabRelativePath(preview.path, cwd);
              const full = cwd && !/^(?:\/|[A-Za-z]:[\\/]|~)/.test(relative) ? `${String(cwd).replace(/\/+$/, "")}/${relative}` : preview.path;
              return <SourceSessionFileViewer
                onSaveComment={fileActions?.onSaveComment ? (entry,options)=>fileActions.onSaveComment({...entry,path:relative},options) : null}
                onDeleteComment={fileActions?.onDeleteComment}
                onAttachFile={fileActions?.onAttachFile ? () => fileActions.onAttachFile(full) : null}
                onAttachSelection={fileActions?.onAttachSelection ? selection => fileActions.onAttachSelection(selection.text, fileSelectionLabel(relative, selection)) : null}
                onDownload={text => downloadFile({ ...preview, text })} downloading={downloadingPaths.has(preview.path)} canLoadDocument={!!cwd}
                onCopyImage={dataUrl => call('image:copy', { dataUrl })}
                onEdit={preview.preview ? () => keepFile(preview.path) : null} sessionId={sessionId} onSaveFile={async (text, expectedHash) => {
                const result = await call("file:save", { cwd, relative: preview.path, text, expectedHash });
                if (result?.status === "saved") setFileTabs(files => files.map(file => file.path === preview.path ? { ...file, text, editHash: result.hash, preview: false } : file));
                return result;
              }} key={preview.path} settings={fileViewSettings} file={preview} displayPath={relative} fullPath={full}
                line={lineMark?.line} endLine={lineMark?.endLine} scrollNonce={lineMark?.nonce}
                contentFind={lineMark?.findQuery?lineMark:null}
                scopeKey={JSON.stringify(["file-viewer", sessionId, cwd, preview.path])}
                onCopyPath={() => copyText(full, FILE_VIEWER_LABELS.pathCopied)}
                onViewAsText={() => loadFile(preview.path, { force: true })}
                cardActions={{
                  // B32 cd2efac6e fp / Tp / Gl / tp+pp: re-read the tab, create the missing file through the editor's
                  // save (no prior hash: an existing in-root parent only), and the session's reveal / folder offer.
                  onRetry: () => loadFile(preview.path),
                  onCreateFile: sessionId ? () => call("file:save", { cwd, relative: preview.path, text: "", expectedHash: null }) : null,
                  canAskClaude: !!sessionId,
                  onShowFile: fileActions?.onShowSessionFile ? () => fileActions.onShowSessionFile(preview.path) : null,
                  suggestFolder: fileActions?.suggestFolder ?? null,
                  onAddFolder: fileActions?.onAddFolder ?? null,
                }}
                findRequest={findRequest} lister={folderLister} fileMenu={fileMenu} previewFrame={previewFrame}
                renderMarkdown={(text, chunk = 0) => <SourceMarkdown text={text} sessionKey={sessionId} itemId={chunk ? `file:${preview.path}#${chunk}` : `file:${preview.path}`} cwd={cwd} />} />;
            })()}
            {/* panes-tile-current.js:6355-6390 (!N || M) empty preview. */}
            {!preview && (!treeVisible || treeCanFit) && (
              <SourceFilesEmptyPreview tabs={fileTabs.length} treeShown={treeVisible} />
            )}
          </div>
        </>
      ) : tab === "plan" && (plan?.length || planDocument) ? (
        // kp (panes-tile-current.js:1751-1790): the plan document, then the Tasks.
        <SourcePlanPane plan={plan} document={planDocument} sessionId={sessionId} commentsEnabled={planCommentsEnabled}
          renderMarkdown={(text, extension) => <SourceMarkdown text={text} sessionKey={sessionId} itemId="plan-document" cwd={cwd} extension={extension} />} />
      ) : tab === "plan" ? (
        // Jh (cccc2cf0a): Loading… while the history loads, the earlier-messages alert when it failed, else No plan yet.
        <SourcePlanEmpty loading={!!planHistory?.loading} failed={!!planHistory?.failed} onRetry={planHistory?.onRetry ?? null} sessionKey={sessionId} />
      ) : diffError ? (
        <SourceChangesState state="failed" onRetry={onRefresh ? () => onRefresh() : null} retrying={diffRetrying} />
      ) : loading ? (
        <SourceChangesState state="loading" />
      ) : diffView.patch || diffEmptyWithCommits ? (
        // R10: SourceDiff lays the body out beside the Changed files column and
        // owns the .source-changes scroller (ChangesFileLayout). B15 (c44d00c7f cl emptyPlaceholder): with
        // commits, an empty comparison keeps the column (Commits section) beside the empty state.
        <Diff value={diffView.patch || ""} emptyPlaceholder={<SourceChangesState state="empty" uncommittedOnly={diffScope === "uncommitted"} />} completeContext={diffView.completeContext} patchesWithheld={diffView.patchesWithheld} comparisonFiles={Array.isArray(diff?.files) ? diff.files : undefined} scopeKey={JSON.stringify([sessionId, cwd, diffStale ? diffStale.scope : diffScope])} layout={diffPreferences.layout} wordWrap={diffPreferences.wordWrap} wordDiff={diffPreferences.wordDiff} hideWhitespace={diffPreferences.hideWhitespace} onCanFitSplitChange={setDiffCanFitSplit} foldAll={diffFoldAll} placement="changes" fileActions={diffFileActions} commentScope={sessionId ? JSON.stringify([sessionId, cwd]) : null}
          onIsLargeChange={setDiffIsLarge} review={diffReview} fileList={{ shown: diffShowTree, width: diffTreeWidth, tree: diffFileTree, groupByKind: diffGroupByKind,
            onShownChange: setDiffShowTree, onWidthChange: setDiffTreeWidth, onCanFitChange: setDiffCanFitTree }}
          stale={!!diffStale} commits={diffCommits ? { ...diffCommits, collapsed: diffCommitsCollapsed, onCollapsedChange: setDiffCommitsCollapsed } : null} />
      ) : (
        <SourceChangesState state="empty" uncommittedOnly={diffScope === "uncommitted"} />
      )}
    </aside>
  );
}
