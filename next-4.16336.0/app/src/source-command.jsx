import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { createClipboardFeedback } from "./clipboard-feedback.mjs";
import { useSettledHighlight } from "./use-settled-highlight.mjs";
import { tokenCSS } from "./highlight-model.mjs";
import { SourceAnsiText } from './source-ansi-text.jsx';
import {
  commandCopyText,
  commandOutput,
  elapsedSuffix,
  RUNNING_VERB,
} from "./command-row-model.mjs";
import { displayCommand } from "./shell-command-model.mjs";
import "./source-command.css";
import "./highlight-tokens.css";
import { t } from "../electron/i18n/index.mjs";

// Official Bash / Run-a-command body (Uoe, approval-current.js:6874-6941).
// Two branches, chosen by inCard (KO :7006 passes it through gN :16622-16645
// and FN :17308-17330):
//  - standalone (inCard false): the WO card (:6838-6846) with the title
//    header, as below;
//  - classic tool-group rows (m8 :54035-54063 renders RN{inGroup, inCard:true}
//    for every expanded group member): GO non-standalone (:6847-6862) =
//    group/body relative flex w-full pt-xs > flex-1 min-w-0 flex flex-col
//    gap-md text-code {UT, RO, KE} + copyAction. No title span, no WO outline;
//    copyAction is l = c(!r && e.output ? ty : null) (:6882), i.e. only when
//    there is no command but there is output. (The 'cell' variant :6908-6921 is
//    not a local surface.)
//
//   WO      :6838  group/body py-md > epitaxy-card-outline-inset rounded-lg
//   head    :6932  flex items-center px-md py-sm, title span flex-1 text-body
//   content :6936  flex flex-col gap-md px-md pb-lg text-code
//   UT      :2164  epitaxy-code-card rounded-lg flex overflow-clip px-md py-xs,
//                  background Tv, aria-hidden select-none "$ ", Copy at end
//   RO      :6743  role=group aria-label="Tool output" tabIndex=0,
//                  max-h-[400px] overflow-y-auto whitespace-pre-wrap break-all
//   KE      :2894  running footer, min-h-control gap-1.25 font-sans text-body
//   ty      c425fb3cf:oe  Copy -> Check, aria-label Copy/Copied, 1200 ms
//
// Uoe takes the shell from the tool (:6877 `bo(e.name) ?? "bash"`): the title is
// 'PowerShell' with a '>' prompt for PowerShell, else 'Bash' with '$' (:6878,
// :6904-6907). The DeepSeek bridge reports it as item.shell ('bash' |
// 'powershell'). Codex 0.155.1 does not report which shell ran the command
// (ThreadItem commandExecution has pluginId/scriptPath/command/cwd/processId/source
// only), so without item.shell the audited Codex adaptation keeps "Shell" with
// '$'; it is never claimed to be Bash or PowerShell. Run in background has no
// Codex capability. View live output is supplied only for a real observed
// background command. No exit code and no completed duration exist in the
// official transcript row.

// The Copied state resets after 1200 ms inside createClipboardFeedback.
export const SHELL_TITLE = "Shell";
export function shellPresentation(shell) {
  if (shell === "powershell") return { title: "PowerShell", prompt: ">" };
  if (shell === "bash") return { title: "Bash", prompt: "$" };
  return { title: SHELL_TITLE, prompt: "$" };
}

export function CommandCopyButton({ text, compact = false, alwaysVisible = false, title }) {
  const [state, setState] = useState("idle");
  const controller = useRef(null);
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      writeText: (value) =>
        typeof navigator === "undefined" || !navigator.clipboard?.writeText
          ? Promise.reject(new Error("Clipboard unavailable"))
          : navigator.clipboard.writeText(value),
      onState: setState,
    });
    controller.current = feedback;
    return () => {
      controller.current = null;
      feedback.dispose();
    };
  }, []);
  useLayoutEffect(() => {
    controller.current?.setText(text);
  }, [text]);
  const copied = state === "copied";
  return (
    <button
      type="button"
      className="src-cmd-copy"
      data-compact={compact ? "" : undefined}
      data-always-visible={alwaysVisible ? "" : undefined}
      title={title}
      aria-label={copied ? t("Copied") : t("Copy")}
      aria-busy={state === "pending" || undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        void controller.current?.copy();
      }}
    >
      <Icon name={copied ? "Check" : "Copy"} size={compact ? 14 : 16} />
    </button>
  );
}

// The command line uses the same settled highlighter as a code fence, with no
// file header, no line numbers and wrapped overflow (UT :2174-2186). The line shows
// the script without Codex's `<shell> -lc '…'` wrapper, as Codex's own TUI does
// (exec_command.rs strip_bash_lc_and_escape); the agent's full string is the tooltip.
export function SourceCommandLine({ command: source, scopeKey, action, prompt = "$", language = "bash" }) {
  const codeRef = useRef(null);
  const { text: command, raw } = displayCommand(source);
  const tokens = useSettledHighlight(
    { text: command, language, isFrontier: false, languageSettled: true, scopeKey },
    codeRef,
  );
  return (
    <div className="src-cmd-line" data-not-prose="">
      <span aria-hidden="true" className="src-cmd-prompt">
        {`${prompt}\u00a0`}
      </span>
      <div className="src-cmd-code" title={raw ?? undefined}>
        <pre className="src-cmd-pre">
          <code ref={codeRef} className="src-cmd-text" data-highlight-source={tokens ? "settled" : "plain"}>
            {tokens
              ? tokens.map((token, index) => (
                  <span key={index} data-code-token="" style={tokenCSS(token)}>
                    {token.text}
                  </span>
                ))
              : command}
          </code>
        </pre>
      </div>
      {action ? <div className="src-cmd-line-action">{action}</div> : null}
    </div>
  );
}

export function CommandOutput({ text, isError }) {
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={t("Tool output")}
      className="src-cmd-output"
      data-error={isError ? "" : undefined}
    >
      <SourceAnsiText text={text}/>
    </div>
  );
}

// ol():588 - one clock aligned to whole seconds, so every running footer in
// the transcript advances on the same tick.
function useSecondTick(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    let timer = null;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    setNow(Date.now());
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [active]);
  return now;
}

// KE :2894-2925 keeps only status, "Run in background" (no Codex equivalent,
// not rendered) and Copy; View live output lives in the row heading (XM).
function RunningFooter({ startedAtMs, copyText }) {
  const now = useSecondTick(true);
  const suffix = elapsedSuffix(startedAtMs, now);
  return (
    <div className="src-cmd-footer" data-find-omitted="">
      <span className="src-cmd-footer-status">
        <span>{RUNNING_VERB}</span>
        {suffix ? <span className="src-cmd-elapsed">{suffix}</span> : null}
      </span>
      <div className="src-cmd-footer-end">
        <CommandCopyButton text={copyText} compact={true} alwaysVisible={true} />
      </div>
    </div>
  );
}

/**
 * What Codex typed into a running process (terminalInteraction stdin), readable: control keys as ⌃C / ⌃D, Enter and
 * Tab as ⏎ / ⇥, other control bytes as \xNN.
 */
export function stdinLabel(stdin) {
  return String(stdin ?? "").replace(/\r\n|[\u0000-\u001f\u007f]/g, (char) => {
    if (char === "\r\n" || char === "\n" || char === "\r") return "⏎";
    if (char === "\t") return "⇥";
    if (char === "\u007f") return "⌫";
    const code = char.charCodeAt(0);
    if (code >= 1 && code <= 26) return `⌃${String.fromCharCode(64 + code)}`;
    return char === "\u001b" ? "⎋" : `\\x${code.toString(16).padStart(2, "0")}`;
  });
}

/**
 * @param state one of the TurnStatus.Step states produced by commandRowState.
 */
export function SourceCommandBody({ item, state, scopeKey, inCard = false }) {
  // The copy payload is the same unwrapped script the line shows (displayCommand).
  const command = displayCommand(item.command).text;
  const output = commandOutput(item, state);
  // HE :2814-2846 - the running footer is withheld while this item still has
  // an unresolved approval request, which is exactly the blocked state.
  const running = state === "busy";
  // Uoe :6878-6879: the copy text starts with the same prompt glyph as the line.
  const shell = shellPresentation(item.shell);
  const copyText = command && shell.prompt !== "$"
    ? commandCopyText(command, output.text).replace(/^\$ /, `${shell.prompt} `)
    : commandCopyText(command, output.text);
  const lineAction = command ? (
    running ? null : <CommandCopyButton text={copyText} compact={true} />
  ) : null;
  const headAction = !command && output.text && !running
    ? <CommandCopyButton text={copyText} />
    : null;
  const content = (
    <div className="src-cmd-content">
      {command ? (
        <SourceCommandLine command={item.command} scopeKey={scopeKey} action={lineAction} prompt={shell.prompt}
          language={item.shell === "powershell" ? "powershell" : "bash"} />
      ) : null}
      {output.text ? <CommandOutput text={output.text} isError={output.isError} /> : null}
      {Array.isArray(item.terminalInputs) && item.terminalInputs.length > 0 ? (
        <div className="src-cmd-inputs" data-terminal-inputs="">
          {item.terminalInputs.map((stdin, index) => <div key={index} className="src-cmd-input">
            <span className="src-cmd-input-label">{t("Sent input")}</span><code className="src-cmd-input-text">{stdinLabel(stdin)}</code>
          </div>)}
        </div>
      ) : null}
      {running ? (
        <RunningFooter startedAtMs={item.startedAtMs} copyText={copyText} />
      ) : null}
    </div>
  );
  // GO non-standalone (:6847-6862): content column, then the copyAction slot.
  if (inCard)
    return <div className="src-cmd-card-outer" data-in-card="">{content}{headAction}</div>;
  return (
    <div className="src-cmd-card-outer">
      <div className="src-cmd-card">
        <div className="src-cmd-head">
          <span className="src-cmd-title">{shell.title}</span>
          {headAction}
        </div>
        {content}
      </div>
    </div>
  );
}
