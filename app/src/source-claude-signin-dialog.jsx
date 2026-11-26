import React, { useEffect, useRef, useState } from "react";
import { SourceDialog, SourceDialogFooter } from "./source-dialog.jsx";
import { CdsButton, CdsTextInput } from "./cds-core.mjs";
import { CLAUDE_PROVIDER, claudeSignInText } from "./claude-signin-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-claude-signin-dialog.css";

// 'Sign in to Claude again': OpenCode's Claude models run the user's own Claude Code, whose claude.ai sign-in can end
// (a hard time limit, a revoked token) between two messages. main.jsx opens this when a Claude turn fails for that, or
// when a Claude session's sign-in is gone or about to end (claude-signin-model.mjs claudeSignInPrompt). Sign in starts
// the core's own sign-in for claude-agent (account-operations login → `claude auth login`: claude.ai opens in the
// browser; its page may end on a code, pasted here). The sign-in's state is boot.auth (account-operations), shared
// with Settings › Account; signedInAt newer than this dialog means it succeeded, and Try again resends the failed turn.
//
// prompt {reason, expiresAt, email}; auth = boot.auth; onSignIn() starts it; onAccountAction({operation}) is
// account-auth (open, code, cancel); onRetry (optional) resends the failed turn; onOpenSettings opens Settings › Account.
export function SourceClaudeSignInDialog({ open = true, onExited, prompt, auth, connected = true, onSignIn, onAccountAction, onRetry, onOpenSettings, onClose }) {
  const [openedAt] = useState(() => Date.now());
  const [working, setWorking] = useState(""), [error, setError] = useState(""), [code, setCode] = useState("");
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const phase = auth?.phase || "idle", login = auth?.login || null;
  // This dialog's sign-in: one for claude-agent (a pending sign-in for another provider blocks a second start).
  const mine = !!login && (login.provider === CLAUDE_PROVIDER || !login.provider);
  const pending = mine && ["starting", "waiting", "cancelling"].includes(phase);
  const checking = phase === "refreshing";
  const done = Number.isFinite(auth?.signedInAt) && auth.signedInAt >= openedAt && phase === "idle" && !auth?.error;
  const failure = error || (mine || phase === "idle" ? auth?.error || "" : "");
  const run = async (name, fn) => {
    if (working) return false;
    setWorking(name); setError("");
    try { await fn(); return true; }
    catch (failed) { if (alive.current) setError(failed?.message || String(failed)); return false; }
    finally { if (alive.current) setWorking(""); }
  };
  const close = () => { if (pending && phase === "waiting") void onAccountAction?.({ operation: "cancel" })?.catch?.(() => {}); onClose?.(); };
  const reason = prompt?.reason || "signedOut";
  // Claude Code missing or too old: nothing to sign in to until that is fixed (Settings › Account says how).
  const canSignIn = reason !== "missing" && reason !== "tooOld";
  const title = done ? t("Signed in to Claude") : reason === "soon" ? t("Your Claude sign-in ends soon") : t("Sign in to Claude again");
  const submitCode = async () => {
    const value = code.trim();
    if (value && await run("code", () => onAccountAction({ operation: "code", code: value }))) setCode("");
  };
  let body;
  if (done) body = <p className="ccs-text">{onRetry ? t("You’re signed in. Try your message again.") : t("You’re signed in. Claude models are ready to use.")}</p>;
  else if (pending || checking) body = <>
    <p className="ccs-text" role="status">{checking ? t("Checking your Claude sign-in…")
      : login?.connecting ? t("Connecting with the sign-in already on this Mac. This can take a minute.")
        : phase === "starting" ? t("Starting Claude Code’s sign-in…") : t("Finish signing in in the browser tab Claude Code opened. If the page shows a code, paste it here.")}</p>
    {pending && login?.acceptsCode && <form className="ccs-code" onSubmit={(event) => { event.preventDefault(); void submitCode(); }}>
      <CdsTextInput aria-label={t("Code from the browser")} placeholder={t("If the page shows a code, paste it here")} value={code}
        autoComplete="off" spellCheck={false} onChange={(event) => setCode(event.target.value)} />
      <CdsButton type="submit" busy={working === "code"} disabled={!connected || !code.trim() || (!!working && working !== "code") || phase !== "waiting"}>{t("Submit code")}</CdsButton>
    </form>}
  </>;
  else body = <>
    <p className="ccs-text">{claudeSignInText(reason, { expiresAt: prompt?.expiresAt ?? null })}</p>
    {prompt?.email && <p className="ccs-muted">{t("Account: {email}", { email: prompt.email })}</p>}
    {canSignIn && <p className="ccs-muted">{t("This signs in the Claude Code that OpenCode uses on this Mac: claude.ai opens in your browser.")}</p>}
  </>;
  const footer = done ? <>
      <CdsButton onClick={onClose}>{t("Close")}</CdsButton>
      {onRetry && <CdsButton variant="primary" data-claude-signin="retry" onClick={() => { onRetry(); onClose?.(); }}>{t("Try again")}</CdsButton>}
    </>
    : pending || checking ? <>
      {pending && login?.url && !login?.connecting && <CdsButton disabled={phase !== "waiting"} onClick={() => void run("open", () => onAccountAction({ operation: "open" }))}>{t("Open sign-in page")}</CdsButton>}
      <CdsButton busy={phase === "cancelling"} disabled={phase !== "waiting"} onClick={() => void run("cancel", () => onAccountAction({ operation: "cancel" }))}>{t("Cancel sign-in")}</CdsButton>
    </>
    : <>
      {onOpenSettings && <CdsButton variant="ghost" className="ccs-settings" onClick={() => { onOpenSettings(); onClose?.(); }}>{t("Account settings")}</CdsButton>}
      <CdsButton onClick={onClose}>{canSignIn ? t("Not now") : t("Close")}</CdsButton>
      {canSignIn && <CdsButton variant="primary" data-claude-signin="start" busy={working === "start"} disabled={!connected || !!working || phase !== "idle"}
        onClick={() => void run("start", onSignIn)}>{t("Sign in")}</CdsButton>}
    </>;
  return <SourceDialog open={open} onExited={onExited} size="sm" title={title} onClose={close} className="claude-signin-dialog" alert={!done}>
    <div className="ccs-body" data-claude-signin-state={done ? "done" : pending ? "pending" : checking ? "checking" : "idle"} data-reason={reason}>
      {body}
      {failure && !done && <p role="alert" className="ccs-error">{failure}</p>}
    </div>
    <SourceDialogFooter>{footer}</SourceDialogFooter>
  </SourceDialog>;
}
