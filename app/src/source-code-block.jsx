import React, { useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CodeBlockActionsContext } from "./code-block-actions.mjs";
import { codeBlockRun, codeBlockRunId, diffSegments, followsOutput, inlineCommandDone, keptRunVisible, outputDiffMode } from "./code-block-run-model.mjs";
import { hasAnsi } from "./ansi-model.mjs";
import { SourceSpinner } from "./source-pane-states.jsx";
import { Icon } from "./icons.jsx";
import { SourceTooltip } from "./source-tooltip";
import { createPlainCodeScheduler } from "./plain-code-scheduler.mjs";
import { createClipboardFeedback } from "./clipboard-feedback.mjs";
import { useSettledHighlight } from "./use-settled-highlight.mjs";
import { useStreamHighlight } from "./use-stream-highlight.mjs";
import { normalizeLanguage, tokenCSS } from "./highlight-model.mjs";
import { detectSecrets, maskSecrets } from "./secret-redaction-model.mjs";
import { SourceAnsiText } from "./source-ansi-text.jsx";
import { useTripleClickSelect } from "./use-triple-click-select.js";
import { CodeBlockLabelContext, CodeBlockOverflowContext, HEADER_GUTTER, codeBlockLayout } from "./code-block-layout-model.mjs";
import "./source-code-block.css";
import "./highlight-tokens.css";
import { t, tn } from "../electron/i18n/index.mjs";

// code-block-current.js:1317 Wr: a growing ANSI fence is styled only up to 20000 code units.
const ANSI_STREAM_LIMIT = 20_000;
function PlainCodeText({text,isFrontier,ansi=false}) {
  const [displayed,setDisplayed]=useState(text),scheduler=useRef(null);
  useLayoutEffect(()=>{
    const owner=createPlainCodeScheduler({initialText:text,onCommit:setDisplayed});scheduler.current=owner;
    return()=>{owner.dispose();scheduler.current=null;};
  },[]);
  useEffect(()=>{scheduler.current?.update(text,isFrontier);},[text,isFrontier]);
  const value=isFrontier?displayed:text;
  // :1566 (Pe = a !== "ansi"): an ansi fence renders its SGR colors, never escape bytes.
  return ansi&&(!isFrontier||value.length<=ANSI_STREAM_LIMIT)?<SourceAnsiText text={value}/>:value;
}

// code-block-current.js:1185-1215 Pr: the fence's ghost Eye/EyeSlash toggle,
// pressed while revealed (Nr: fill-control background, primary text).
function SecretToggle({ revealed, count, onToggle }) {
  return <button type="button" className="scb-copy scb-reveal" aria-pressed={revealed}
    aria-label={revealed ? tn(count, "Hide secret", "Hide secrets") : tn(count, "Reveal secret", "Reveal secrets")}
    onMouseDown={(event) => event.preventDefault()} onClick={onToggle}>
    <Icon name={revealed ? "EyeSlash" : "Eye"} size={16} />
  </button>;
}

// ---- "Run in terminal" (B20; c19e90103 Pg 6878-6918, Lg 6919-6977, Bg 7010-7310) ----

const noSubscribe = () => () => {};
const noRun = () => null;
// Pg (2.42304.0 Ng): the tracked run of this block (the store tracks one run at a time), and what its box shows.
function useBlockRun(actions, id) {
  const run = useSyncExternalStore(actions?.subscribeInline ?? noSubscribe, actions?.inlineRun ?? noRun, noRun);
  const mine = run && id !== null && run.id === id ? run : null;
  const shown = mine ? (mine.prev ?? mine) : null;
  return {
    tracked: !!mine,
    output: shown?.output || null,
    altScreen: !!shown?.altScreen,
    error: mine?.errorKind === "shell-exited" ? t("Shell exited.") : mine?.error ? t(mine.error) : null,
    running: !!mine && !mine.settled,
    finished: !!mine && mine.settled && mine.dispatched,
    // Ng commandDone: the tracked run ended at an idle prompt (endedBy "idle" only).
    commandDone: inlineCommandDone(mine),
    // c26fb8b6b jn: a finished run whose output went to the model.
    record: id !== null ? actions?.runRecord?.(id) : undefined,
  };
}

// c7146e7f4 b (xs): the box follows new output while scrolled to its end; scrolling up stops that.
function useFollowOutput(content, enabled) {
  const node = useRef(null), following = useRef(true), lastTop = useRef(0);
  const ref = useCallback((element) => {
    node.current = element;
    if (!element) return;
    following.current = enabled;
    lastTop.current = enabled ? element.scrollHeight : 0;
    element.scrollTop = lastTop.current;
  }, [enabled]);
  const onScroll = useCallback((event) => {
    const element = event.currentTarget;
    following.current = followsOutput({ following: following.current, scrollTop: element.scrollTop, lastTop: lastTop.current,
      scrollHeight: element.scrollHeight, clientHeight: element.clientHeight });
    lastTop.current = element.scrollTop;
  }, []);
  useLayoutEffect(() => {
    const element = node.current;
    if (element && enabled && following.current) { lastTop.current = element.scrollHeight; element.scrollTop = lastTop.current; }
  }, [content, enabled]);
  return { ref, onScroll };
}

// c7146e7f4 F (vs): output in its ANSI colours, or a git diff's added/removed lines on the git backgrounds.
function OutputText({ children, diff }) {
  const ansi = useMemo(() => hasAnsi(children), [children]);
  const segments = useMemo(() => (diff && !ansi ? diffSegments(children, diff) : null), [children, diff, ansi]);
  if (ansi) return <SourceAnsiText text={children} />;
  if (!segments) return children;
  return segments.map((segment, index) => segment.kind
    ? <span key={index} className="scb-output-diff" data-kind={segment.kind}>{segment.text}</span>
    : <React.Fragment key={index}>{segment.text}</React.Fragment>);
}

// Lg: the 160px output box under the block; "Open in terminal" shows the tab the command ran in.
function RunOutput({ command, output, altScreen, error, onOpenInTerminal }) {
  const { ref, onScroll } = useFollowOutput(output, !altScreen);
  return <div className="scb-output-wrap">
    <div ref={ref} onScroll={onScroll} className="scb-output" data-openable={onOpenInTerminal ? "" : undefined}>
      <pre className="scb-output-pre">{error ? <span className="scb-output-error">{error}</span>
        : output ? <OutputText diff={outputDiffMode(command)}>{output}</OutputText> : null}</pre>
    </div>
    {onOpenInTerminal && <div className="scb-output-open">
      <SourceTooltip content={t("Open in terminal")} automatic={true} hoverable={false}>
        <button type="button" className="scb-copy" aria-label={t("Open in terminal")}
          onMouseDown={(event) => event.preventDefault()} onClick={onOpenInTerminal}>
          <Icon name="CommandLinePrompt" size={16} />
        </button>
      </SourceTooltip>
    </div>}
  </div>;
}

// Limited settled highlighting; language never becomes a header or executable input.
// isFrontier means this particular block can still grow, not the entire message.
export function SourceCodeBlock({ text = "", language = "text", isFrontier = false, languageSettled = true, scopeKey, runScope = null }) {
  const [copyState, setCopyState] = useState("idle");
  const [revealed, setRevealed] = useState(false);
  const controller = useRef(null);
  const codeRef = useRef(null);
  const bodyRef = useTripleClickSelect("code");
  // code-block-current.js:1036-1042 Er and :1515-1518 (R, he, V): secrets are
  // looked for only once the fence stops growing; while masked, the displayed,
  // highlighted, copied and data-code-text text is the bullet-masked one.
  const secrets = useMemo(() => {
    if (isFrontier || !languageSettled) return null;
    const matches = detectSecrets(text);
    return matches.length ? matches : null;
  }, [text, isFrontier, languageSettled]);
  const masked = !!secrets && !revealed;
  const shown = useMemo(() => masked ? maskSecrets(text, secrets) : text, [text, secrets, masked]);
  const ansi = normalizeLanguage(language) === "ansi";
  // Stream tokens while the fence grows (and retained afterwards, official Le);
  // the settled Code palette only when no successful stream result remains.
  const stream = useStreamHighlight({ text: shown, language, isFrontier, languageSettled, scopeKey });
  const settled = useSettledHighlight({ text: shown, language, isFrontier, languageSettled, scopeKey, held: stream.retained, isHeld: stream.isHeld }, codeRef);
  const tokens = stream.tokens ?? (stream.retained ? null : settled);
  const source = stream.tokens ? "stream" : tokens ? "settled" : "plain";
  const trailing = stream.tokens ? shown.slice(stream.coveredText.length) : "";
  const statusId = useId();
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      writeText: (value) => {
        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText)
          return Promise.reject(new Error("Clipboard unavailable"));
        return navigator.clipboard.writeText(value);
      },
      onState: setCopyState,
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, []);
  useLayoutEffect(() => {
    controller.current?.setText(shown);
  }, [shown, isFrontier, languageSettled]);

  // "Run in terminal" (Bg 7037-7100): a one-line shell command of a session with a terminal, never while its secrets
  // are masked or when it holds hidden characters. Play runs it at an idle prompt (its output shows below, Cancel
  // while it runs); when the session's composer can take it, the output also goes to the model (bashTurn).
  const actions = useContext(CodeBlockActionsContext);
  const blockRun = useMemo(() => codeBlockRun(text, language, { powerShell: actions?.powerShell === true, masked }),
    [text, language, actions?.powerShell, masked]);
  const runId = actions && blockRun.shellish ? codeBlockRunId(actions.sessionKey, blockRun.command, runScope) : null;
  const runnable = !!actions && blockRun.runnable;
  const live = useBlockRun(actions, runId);
  const [showsRun, setShowsRun] = useState(!isFrontier || live.tracked || live.record !== undefined);
  if (!isFrontier && !showsRun) setShowsRun(true);
  const output = showsRun && live.tracked ? live.output : null;
  const error = showsRun && live.tracked ? live.error : null;
  // Bg me: the kept record also shows while its run is still tracked once that run is done at the prompt (TT-10 /
  // FT-13); the live box below still wins while there is live output or an error.
  const kept = keptRunVisible({ tracked: live.tracked, commandDone: live.commandDone, showsRun }) ? live.record : undefined;
  const armed = runnable && !!actions?.bashTurn;
  const runLabel = armed ? t("Run in terminal and send output to {core}", { core: actions.bashTurn.target }) : t("Run in terminal");
  const run = () => { if (armed) actions.bashTurn.run(runId, blockRun.command); else actions.run(runId, blockRun.command); };
  const runControl = runnable || live.running;
  const controls = 1 + (runControl ? 1 : 0) + (secrets ? 1 : 0);
  const copied = copyState === "copied";
  const failed = copyState === "error";
  // R4g-files FV1 (toolcards-05): c19e90103 Bg I/L/at/ot/st/ct under the ph/mh contexts (wrap + row unless the
  // Markdown document typography provides scroll + beside-actions). Geometry only; never the copy payload.
  const overflow = useContext(CodeBlockOverflowContext), labelPlacement = useContext(CodeBlockLabelContext);
  const layout = codeBlockLayout({ overflow, labelPlacement, language, text, controls });
  const centred = layout.centred ? " scb-single-line" : "";
  const pre = <pre className="scb-pre"><code ref={codeRef} className="scb-code" data-highlight-source={source}>{tokens
            ? [...tokens.map((token, index) => <span key={index} data-code-token="" style={tokenCSS(token)}>{token.text}</span>), trailing || null]
            : <PlainCodeText key={scopeKey} text={shown} isFrontier={isFrontier} ansi={ansi}/>}</code></pre>;
  const message = copied ? t("Copied") : failed ? t("Couldn’t copy to the clipboard. Try again.") : "";
  return <div className="scb-flow" data-not-prose="">
    {!languageSettled ? <pre className="scb-language-placeholder" aria-hidden="true" /> :
      <div className="scb-block" data-language={language} data-frontier={isFrontier || undefined}
        data-secrets={secrets ? (masked ? "masked" : "revealed") : undefined}
        data-run={runControl ? (live.running ? "running" : "idle") : undefined} data-output={output || error ? "" : undefined}
        data-overflow={layout.scroll ? "scroll" : undefined} data-label={layout.beside ? "beside-actions" : undefined}
        style={layout.scroll ? { "--scb-controls": controls, "--scb-line-end": layout.paddingEnd } : { "--scb-controls": controls }}>
        <div className="scb-fence">
        <div ref={bodyRef} className="scb-body" data-code-text={!isFrontier ? shown : undefined}>
          {/* Sg: the language header (unless beside the actions), the epitaxy-code-scroll scroller with its w-max
              min-w-full content, and for one line the endInset margin plus the 1ch fade into the card background. */}
          {layout.scroll ? <div className="scb-scroll-frame">
            {!layout.beside && <div dir="ltr" className="scb-language-row" style={{ paddingRight: HEADER_GUTTER }}>
              <span data-code-language={layout.label} className="scb-language" /></div>}
            <div className="epitaxy-code-scroll scb-scroller" style={layout.endInset === null ? undefined : { marginInlineEnd: layout.endInset }}>
              <div className="scb-scroll-content">{pre}</div>
            </div>
            {layout.endInset !== null && <div aria-hidden="true" className="scb-scroll-fade" style={{ insetInlineEnd: layout.endInset }} />}
          </div> : pre}
        </div>
        {(!isFrontier || live.running) && <div className="scb-actions-track" data-card-surface={layout.beside || undefined}>
          {/* wg + Eg: beside the actions, the language label fades in over the card background. */}
          {layout.beside && <span data-code-label={layout.label} className={`scb-code-label${centred}`} />}
          <div className={`scb-actions${centred}`}>
            {runControl && (live.running
              ? <SourceTooltip content={t("Running — click to cancel")} automatic={true} hoverable={false}>
                <button type="button" className="scb-copy scb-run scb-cancel" aria-label={t("Cancel")}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => actions?.cancel()}>
                  <span className="scb-cancel-icon"><span className="scb-cancel-spin"><SourceSpinner size="sm" /></span>
                    <span className="scb-cancel-x"><Icon name="X" size={16} /></span></span>
                </button>
              </SourceTooltip>
              : <SourceTooltip content={runLabel} automatic={true} hoverable={false}>
                <button type="button" className="scb-copy scb-run" aria-label={runLabel}
                  onMouseDown={(event) => event.preventDefault()} onClick={run}>
                  <Icon name="Play" size={16} />
                </button>
              </SourceTooltip>)}
            {!isFrontier && secrets && <SecretToggle revealed={revealed} count={secrets.length} onToggle={() => setRevealed((value) => !value)} />}
            {!isFrontier && <SourceTooltip content={message || t("Copy code")} automatic={true} hoverable={false}>
            <button type="button" className="scb-copy" aria-label={copied ? t("Copied") : t("Copy code")}
              aria-busy={copyState === "pending" || undefined} aria-describedby={failed ? statusId : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { void controller.current?.copy(); }}>
              <Icon name={copied ? "Check" : "Copy"} size={16} />
            </button>
            </SourceTooltip>}
          </div>
        </div>}
        </div>
        {output || error
          ? <RunOutput command={blockRun.command} output={output} altScreen={live.altScreen} error={error}
            onOpenInTerminal={actions ? () => actions.openInTerminal(runId) : null} />
          : kept === undefined ? null
          // Bg: the kept box offers Open in terminal while its run is the tracked one (`onOpenInTerminal: se ? De : null`).
          : <RunOutput command={blockRun.command} output={kept.output || t("(no output)")} altScreen={false} error={kept.error === "shell-exited" ? t("Shell exited.") : kept.error || null}
            onOpenInTerminal={live.tracked && actions ? () => actions.openInTerminal(runId) : null} />}
      </div>}
    <span id={statusId} className="scb-status" role="status" aria-live="polite">{message}</span>
  </div>;
}
