import { buttonPressHandlers } from './button-press.mjs';
import React, { useId, useMemo, useRef, useState } from "react";
import { parseOrdinaryUserSegments, userCodeDisplayText } from "./user-segments-model.mjs";
import { parseInlineRuns, hasLeadingSlashCommand, chipPathOpenable } from "./user-inline-model.mjs";
import { isUserTextCollapsible, userCollapseState } from "./user-collapse-model.mjs";
import { useSettledHighlight } from "./use-settled-highlight.mjs";
import { useTripleClickSelect } from "./use-triple-click-select.js";
import { tokenCSS } from "./highlight-model.mjs";
import { lightTheme, darkTheme } from "./highlight-themes.mjs";
import "./highlight-tokens.css";
import "./source-user-text.css";
import {SourceTooltip} from "./source-tooltip";
import {sessionCommands} from "./session-command-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// Selected code theme surfaces (main.jsx exposes --code-theme-* from the
// preference); the shipped Claude theme data remains the fallback.
const codeTheme = Object.freeze({
  "--suc-light-bg": `var(--code-theme-light-bg, ${lightTheme.colors["editor.background"]})`,
  "--suc-dark-bg": `var(--code-theme-dark-bg, ${darkTheme.colors["editor.background"]})`,
  "--suc-light-fg": `var(--code-theme-light-fg, ${lightTheme.colors["editor.foreground"]})`,
  "--suc-dark-fg": `var(--code-theme-dark-fg, ${darkTheme.colors["editor.foreground"]})`,
});

const desktopCall = (action, params) =>
  window.desktop?.call(action, params) ??
  Promise.reject(new Error(t("Open OpenClaude Desktop to connect to DeepSeek.")));

// The fence body takes the Rr triple-click (code-block-current.js:1244-1266)
// and carries data-code-text for the transcript context menu's Copy code block.
function UserCodeSegment({ segment, scopeKey }) {
  const codeRef = useRef(null);
  const bodyRef = useTripleClickSelect(".suc-code");
  const text = useMemo(() => userCodeDisplayText(segment.text), [segment.text]);
  const tokens = useSettledHighlight({ text, language: segment.language,
    isFrontier: false, languageSettled: true, scopeKey }, codeRef);
  return <div ref={bodyRef} className="suc-code-card epitaxy-diff" data-user-code="" data-language={segment.language}
    data-user-segment-start={segment.start} data-code-text={text} style={codeTheme}>
    <pre className="suc-pre"><code className="suc-code scb-code" ref={codeRef}>{tokens
      ? tokens.map((token, index) => <span key={index} data-code-token="" style={tokenCSS(token)}>{token.text}</span>)
      : text}</code></pre>
  </div>;
}

// gy/Kn -> Bn: a chip whose text parses as a file reference becomes the
// pane-opening link whenever the path passes the source's syntactic check
// (chipPathOpenable, no stat) and a pane opener exists. Missing files stay
// links; the pane shows the real open failure. The link is a span[role=button]
// with the zQ classes, activated by click, Enter or Space.
function InlineCode({ run, nonInteractive, cwd, onOpenFileRef }) {
  const ref = nonInteractive ? null : run.fileRef;
  const openable = !!ref && !!onOpenFileRef && chipPathOpenable(ref.path, cwd);
  if (!openable) return <code className="suc-inline-code">{run.text}</code>;
  const open = () => onOpenFileRef({ path: ref.path, line: ref.line, endLine: ref.endLine });
  return <span role="button" tabIndex={0} className="suc-inline-code suc-inline-link" data-file-ref={ref.path}
    data-file-line={ref.line ?? undefined} onClick={open}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }}>{run.text}</span>;
}

// px/ud non-interactive branch -> span.cd wrapping eN: a relative pl-2 name
// box whose absolutely positioned, aria-hidden 8x20 slash glyph sits at
// medium weight and 50% opacity beside the bare command name.
function SlashPill({ name, nonInteractive }) {
  const command=sessionCommands.find(c=>c.id===name||c.aliases?.includes(name));
  const pill=<span className="suc-slash">
    <span className="suc-slash-name">
      <span aria-hidden="true" className="suc-slash-glyph">/</span>
      <span>{name}</span>
    </span>
  </span>;
  return command&&!nonInteractive?<SourceTooltip delay={400} multiline content={<><span>/{name}</span><br/>{command.description}</>}>{pill}</SourceTooltip>:pill;
}

function InlineLink({ run, nonInteractive }) {
  const body = run.bare ? run.label : <>
    <bdi>{run.label}</bdi>
    {run.discloseHost !== null && <span dir="ltr" className="suc-link-host">{` (→ ${run.discloseHost})`}</span>}
  </>;
  if (nonInteractive) return <span dir="ltr" className="suc-link">{body}</span>;
  return <a className="suc-link" href={run.href} dir="ltr" target="_blank" rel="noreferrer"
    onClick={(event) => { event.preventDefault(); desktopCall("external", { url: run.href }).catch(() => {}); }}
    onAuxClick={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}>{body}</a>;
}

function UserTextRuns({ text, leadingSlash, nonInteractive, cwd, onOpenFileRef }) {
  const runs = useMemo(() => parseInlineRuns(text, { leadingSlash }), [text, leadingSlash]);
  return runs.map((run) => {
    switch (run.kind) {
      case "slash": return <SlashPill key={run.start} name={run.name} nonInteractive={nonInteractive} />;
      case "code": return <InlineCode key={run.start} run={run} nonInteractive={nonInteractive} cwd={cwd} onOpenFileRef={onOpenFileRef} />;
      case "link": return <InlineLink key={run.start} run={run} nonInteractive={nonInteractive} />;
      default: return run.text;
    }
  });
}

/** The inline runs (code chips, links) of one plain-text line outside a user
 * bubble, e.g. a plan step; the parent carries the suc-text class. */
export function SourceInlineRuns({ text = "", nonInteractive = false, cwd = null, onOpenFileRef = null }) {
  return <UserTextRuns text={text} leadingSlash={false} nonInteractive={nonInteractive} cwd={cwd} onOpenFileRef={onOpenFileRef} />;
}

// Render inside the existing source-user-bubble. Existing attachments remain
// its sibling; ordinary text runs get inline chips, links and a leading
// /command pill (2.2553.1 u1 -> d1 -> Nb/qQ). Bodies over 1200 characters
// collapse behind a masked 16rem column and a ghost "Show more" toggle; the
// ordinary (non-Markdown) branch keeps its text selectable while collapsed
// and only makes links and chips non-interactive.
export function SourceUserText({ text = "", sessionKey = null, itemId, cwd = null, onOpenFileRef = null,
  hasFileAttachments = false }) {
  const instance = useId();
  const parsed = useMemo(() => parseOrdinaryUserSegments(text), [text]);
  const ownerKey = JSON.stringify(["user", sessionKey, itemId ?? ["instance", instance]]);
  const [expanded, setExpanded] = useState(false);
  const collapsible = useMemo(() => isUserTextCollapsible(parsed.segments), [parsed]);
  const state = userCollapseState({ collapsible, expanded });
  const leadingSlash = hasLeadingSlashCommand(parsed.canonicalText, { hasFileAttachments });
  const firstVisible = parsed.segments.find((segment) => segment.kind === "code" || segment.text !== "");
  const column = <div className={state.collapsed ? "suc-segments suc-collapsed" : "suc-segments"} data-user-segments=""
    data-user-fallback={parsed.fallback || undefined} data-collapsed={state.collapsed || undefined}>
    {parsed.segments.map((segment) => segment.kind === "code"
      ? <UserCodeSegment key={segment.start} segment={segment}
          scopeKey={JSON.stringify([ownerKey, ["offset", segment.start]])} />
      : segment.text !== "" && <p key={segment.start} className="suc-text">
          <UserTextRuns text={segment.text} leadingSlash={leadingSlash && segment === firstVisible}
            nonInteractive={state.nonInteractive} cwd={cwd} onOpenFileRef={onOpenFileRef} />
        </p>)}
  </div>;
  if (!state.showToggle) return column;
  return <>
    {column}
    <button type="button" className="suc-show-more" data-cds="Button" data-cds-ghost="" data-step="1"
      {...buttonPressHandlers}
      aria-expanded={expanded} data-find-omitted=""
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setExpanded((value) => !value)}>
      <span aria-hidden="true" className="suc-show-more-backdrop"><span data-cds-part="paint" /></span>
      <span className="suc-show-more-label">{state.toggleLabel}</span>
    </button>
  </>;
}
