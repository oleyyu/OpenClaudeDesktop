// R4f-error E4 (transcript-09, WI-4): extract the error-card retry decision without executing any desktop runtime
// (decision D0: own generator, own scripts/verify-gen-retry-decision.mjs).
//
// Two release contracts, two output folders (claude-4.16336.0-migrate-20261104 region plan G6, isolated version graph):
//   - 4.16336.0 (official-4.16336.0.mjs) -> src/generated/retry-decision-v4: the migration target. In 4.16336.0 the
//     decision lives in c3e34355f (the 3.6556.2 cee72b629 was merged into the error-card chunk): G / Yt / Bt / Vt / Ut / Ht
//     / Wt (exported E / M / - / - / - / A / -; `JR` / `XR` in cc43287c9), the transcript rows in shared-92 (Gq / Wq / qq /
//     Iq / Rq), the prompt text in shared-62 (_K / JG / tq / QG), the logger in shared-0 (Rc / N), NON_RESENDABLE in
//     c06cf64bb $w, the common copy in c90d7fd86 t, the nudge copy in c73f45bc3 Xv / Zv. Every root is located on the
//     parsed source: by its chunk's export alias (`byExport` / `exported`), as the only free variable of an already
//     proven root carrying its features (`readBy`), or as the only top-level declaration of its chunk carrying all of its
//     features. Semantic changes pinned in the call sites: held input always answers "deliver"; retryWouldSend adds
//     "heldMessage"; conversationLost also covers "worktree_resume_refused"; resend carries the rejected send;
//     retryLastTurn (SC) wraps the handler with the held-message count.
//   - 3.6556.2 (official-3.6556.2.mjs) -> src/generated/retry-decision: kept byte for byte while a 3.6556.2 area links it
//     by original identity. session-rail (3.6556.2) sleep-band.mjs imports retryNudgeMessages as c73f45bc3-B7hbL7H9.js:l_
//     from ../retry-decision/retry-nudge-messages.mjs and its generator resolves that link only against 3.6556.2 modules,
//     so the host (src/retry-turn-model.mjs, src/retry-failed-turn-model.mjs) and session-rail stay on this graph until
//     the production switch (not before region batch 6, together with session-rail). Then the 3.6556.2 contract and
//     folder are removed and the 4.16336.0 output takes over. The two graphs never import each other; each has its own
//     NON_RESENDABLE_REJECTION symbol, so a consumer must take the decision and the sentinel from the same graph.
//
// The per-file notes below use the 2.42304.0 names; in 3.6556.2 they are cee72b629 f / g / s / c / u (l is now the string test) / d, call sites p / m / h, shared-104 Lw / Iw / zw / Ow / Aw,
// shared-52 oG / eG / TK / iG, shared-0 Ui / F, c06cf64bb HC, c73f45bc3 l_ / u_ (u_ also lists shared-9 OT tryAgain, so
// common-messages.mjs carries that table), and cc43287c9's handler is ES (iR / eR / tR, retryLastTurn = DS).
//
//   retry-decision.mjs        cee72b629 d (exported t; `lz` in cc43287c9): what the error card's Try again does —
//                             "resend" (the rejected prompt is still the composer text), "focus", "deliver" (held input),
//                             "repeatPrompt" / "refillPrompt" (a desktop session whose CLI conversation was lost: send
//                             the last prompt again within 10 min, or only put it back), "nudge" / "nudgeBesideDraft"
//                             (the turn died after the prompt reached it: send the short "Try again" instead of the
//                             prompt, beside the draft when the composer has one). With its helpers s (the last turn
//                             ended without success), c (the last prompt before the terminal row, while no assistant row
//                             follows it), l (the terminal row says "no conversation found with session id"), u (the
//                             10 min window), and h (exported i; `oz`): the decision input of a draft whose send was
//                             rejected before the session existed.
//   transcript-rows.mjs       shared-104 sC / oC / lC (exported Ec / _c / rc) that s / c / l read: the last terminal row
//                             (a result, or an API-error assistant row) unless a human prompt follows it, the uuid of the
//                             human prompt still waiting for its result, and whether a terminal row is a failure; with
//                             QS (terminal row) and eC (human prompt row: not synthetic / meta / client- / tool result /
//                             model-switch command), all plain functions over the official message array. Their
//                             incremental snapshot path (OS: rS(e)?.isCurrentSnapshot, a WeakMap only the desktop message
//                             store fills) is never taken for a plain array, so the scan is the linear one.
//   prompt-text.mjs           shared-52 WR / RR / nB / HR (exported sn / mn / ft / hn) that the prompt-row tests read:
//                             tool_result content, trailing and leading system-reminder / task-notification blocks,
//                             the "[Request interrupted by user]" markers.
//   logger.mjs                shared-0 $r / I (exported fb / db): the renderer logger and its categories, which the
//                             snapshot path above would debug-log through (never reached for a plain array).
//   non-resendable.mjs        c06cf64bb Am (exported t): Symbol("NON_RESENDABLE_REJECTION"), the rejected prompt a
//                             failed send records when the text is not the composer's (d answers "focus", never resend).
//   retry-nudge-messages.mjs  c73f45bc3 vh / yh (exported it / rt; `xN` / `MN` in cc43287c9): the "Try again" retry nudge,
//                             the after-usage-limit and after-sleep continue texts, and the canned list (formatted and
//                             English) that lastPrompt skips; vendor-intl tn (defineMessages, the identity) they read.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. A module's bindings are the
// reachable closure of its roots: a declaration's dependencies are its free variables (each declaration is parsed on
// its own and Babel's scope analysis names what it reads from outside), which are the chunk's top-level bindings it
// uses. Nothing is hand-picked, and a renamed or re-pointed minified import fails generation instead of silently
// binding the wrong value. The closure is pure (no store, React, IPC or runtime), so this generator has no host
// adapters, and an import resolves only to another module generated here; anything else stops generation. The 3.6556.2
// contract links no shared graph. The 4.16336.0 contract links cds-core (sharedGraph 'cds-core', cds-integrate wave 5 /
// D1): a binding cds-core publishes (manifest publicNames: the logger's module state Oc / Ac / jc / Pc, one copy shared
// with every other graph) is imported from ../cds-core/<target> under its exportName instead of being sliced again; the
// cds-core manifest is checked like the engine's sharedGraph (version, snapshot, every module's bytes and source hash).
//
// `callSites` (prettier form of a top-level declaration) and `rawCallSites` (the minified bytes, each exactly once) pin
// the original text the host wiring follows but cannot import: how cee72b629 builds the decision input from the session
// bucket (f, `sz`) and the card's retryWouldSend (p / m, `az`), the error-card handler b_ in cc43287c9 and its outcome
// dispatch (nudge = clear the composer, put the formatted retryNudge in it and submit with retryNudge: true;
// nudgeBesideDraft = y_, a separate "error_retry" send that leaves the draft alone), the send core's `ct` (a local
// nudge never arms lastSentText, never restores the draft stash, never merges back into the composer and never records
// a rejected prompt), c6b8adeaf's onError (no NON_RESENDABLE record for a nudge) and c06cf64bb's recordRejectedPrompt.
// `importPins` check that the minified names those pins use are still the right modules' exports.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// ---- 3.6556.2 contract (R1/E6, scripts/official-3.6556.2.mjs) -> src/generated/retry-decision ----
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text. `pins` does the same for bindings the
// closure reaches (each must be selected by it, or, 4.16336.0, linked from cds-core because cds-core publishes it: the
// pinned features are then checked on the official declaration the link stands for).
const modules3 = [
  { target: 'define-messages.mjs', source: 'vendor-intl-DYfox5Co.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  { target: 'logger.mjs', source: 'shared-0-DDOOdL6P.js', exports: { Ui: 'logger', F: 'logCategory' },
    features: { Ui: ['debug: (e, ...t) => {},', 'console.warn(e, ...', 'console.error(e, ...', '__errorMarked: (e, t, ...n) => {', 'console.group(e, ...t),'],
      F: ['EPITAXY: "[EPITAXY]",'] } },
  { target: 'prompt-text.mjs', source: 'shared-52-uHFNjl7C.js',
    exports: { oG: 'hasToolResultBlock', eG: 'stripTrailingContextBlocks', TK: 'isInterruptMarker', iG: 'stripLeadingContextBlocks' },
    features: {
      oG: ['if (!Array.isArray(e)) return !1;', 'if (t[e]?.type === "tool_result") return !0;'],
      eG: [{ loose: 'let r = e.replace($W, "");' }, { loose: 'let e = GW(r.replace(XW, ""), t, n);' }],
      TK: [{ loose: 'return t !== 91 && t > 32 && t < 127 ? !1 : mG.has(e.trim());' }],
      iG: [{ loose: 'if (n === tG) return e;' }, { loose: 'return t > 0 && rG.test(n) ? e : n;' }],
    },
    pins: {
      mG: ['"[Request interrupted by user]",', '"[Request interrupted by user for tool use]",'],
      nG: ['/<(system-reminder|task-notification)(?=[\\s/>])[^>]*>[\\s\\S]*?<\\/\\1>\\s*/y'],
      QW: ['["<system-reminder", "<task-notification"]'],
    } },
  { target: 'transcript-rows.mjs', source: 'shared-104-CTONUSaz.js',
    exports: { Lw: 'lastTerminalRowIndex', Iw: 'pendingPromptUuid', zw: 'isFailedTerminalRow', Ow: 'isTerminalRow', Aw: 'isHumanPromptRow' },
    features: {
      Lw: [{ loose: 'let t = Pw(e, Ow);' }, 'return t.kind === "terminal" ? t.index : null;'],
      Iw: [{ loose: 'if (Ow(t)) return null;' }, { loose: 'if (Aw(t) && !LT(e, n) && !hw(t)) return ow(t) ?? null;' }],
      zw: ['return e.type !== "result" || ("is_error" in e && e.is_error === !0);'],
      Ow: ['e.type === "result" ||', '"isApiErrorMessage" in e &&', 'e.isApiErrorMessage === !0'],
      Aw: ['e.type !== "user" ||', '("isSynthetic" in e && e.isSynthetic) ||', '("isMeta" in e && e.isMeta)',
        { loose: 'return (t && t.startsWith("client-")) || Tw(e) ? !1 : !ET(e);' }],
    },
    pins: {
      Pw: ['return { kind: "terminal", index: i };', 'return { kind: "prompt", index: i };', '?? { kind: "none" }'],
      iw: ['?.isCurrentSnapshot(e)) {', { loose: 'let n = nw(e[i]) ? t(e[i], i) : void 0;' }],
      rw: ['Symbol("turnRowIndexes")'],
      nw: ['(e.type === "user" || e.type === "assistant" || e.type === "result") &&', { loose: '!tw(e)' }],
      tw: ['return "parent_tool_use_id" in e && !!e.parent_tool_use_id;'],
      ST: ['?.name === "/model" ||'],
      hw: ['return e.isOptimisticEcho === !0;'],
      $C: ['"incrementalDerive: stale snapshot"'],
    } },
  { target: 'non-resendable.mjs', source: 'c06cf64bb-CdJdJuVd.js', exports: { HC: 'NON_RESENDABLE_REJECTION' },
    features: { HC: ['Symbol("NON_RESENDABLE_REJECTION")'] } },
  // shared-9 OT (exported at): the shared common-copy table; cannedNudges (u_) reads its tryAgain.
  { target: 'common-messages.mjs', source: 'shared-9-CM21XrJw.js', exports: { OT: 'commonMessages' },
    features: { OT: ['tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },', 'cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },'] } },
  { target: 'retry-nudge-messages.mjs', source: 'c73f45bc3-B7hbL7H9.js', exports: { l_: 'retryNudgeMessages', u_: 'cannedNudges' },
    features: {
      l_: ['retryNudge: { defaultMessage: "Try again", id: "hV5oXfyLn2" },',
        '"I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.",', 'id: "UqWMzb4bJb",',
        '"My computer went to sleep while you were working. Please continue from where you left off.",', 'id: "4g6ivTtQ3C",'],
      u_: [{ loose: 'e.formatMessage(l_.retryNudge),' }, { loose: 'e.formatMessage(ti.tryAgain),' }, { loose: 'e.formatMessage(l_.afterUsageLimit),' },
        { loose: 'e.formatMessage(l_.afterSleep),' }, { loose: 'l_.retryNudge.defaultMessage,' }, { loose: 'l_.afterUsageLimit.defaultMessage,' },
        { loose: 'l_.afterSleep.defaultMessage,' }],
    } },
  // cee72b629: f (exported t) the decision, g (exported a) the rejected-draft input, s / c the turn helpers, u the
  // "no conversation found" check over the messages (3.6556.2 split its string test into l, exported i), d the window.
  { target: 'retry-decision.mjs', source: 'cee72b629-BMo5PDZM.js',
    exports: { f: 'decideErrorRetry', g: 'rejectedDraftRetryState', s: 'lastTurnFailed', c: 'unansweredPromptUuid', u: 'conversationNotFound',
      d: 'REPEAT_PROMPT_WINDOW_MS' },
    features: {
      f: [{ loose: 'function f(e, t, n = Date.now()) {' }, 'let i = e !== void 0 && e.error !== null,', 'a = i ? e.errorRejectedPrompt : null;',
        { loose: 'if (a !== null) return a !== r && t.text === a ? "resend" : "focus";' }, 'if (e !== void 0 && e.heldInput.length > 0)',
        'return t.isEmpty ? "deliver" : "focus";', { loose: 'if (e?.desktopSession && (e.conversationLost || u(e.messages))) {' },
        { loose: 'e.lastPrompt.uuid !== c(e.messages)' }, 'let r = n - (e.lastPrompt.sentAt ?? NaN);', { loose: 'return e.lastPrompt.whole && r >= 0 && r < d' },
        '? "repeatPrompt"', ': "refillPrompt";', { loose: 'return (i && !e.errorKilledTurn) || e === void 0 || !s(e.messages)' }, '? "focus"',
        '? "nudge"', ': "nudgeBesideDraft";'],
      g: ['return e === void 0', 'error: "",', 'errorKilledTurn: !1,', 'errorRejectedPrompt: e,', 'heldInput: [],', 'messages: [],'],
      s: [{ loose: 'let i = t(r);' }, { loose: 'return i === null ? n(r) !== void 0 : e(r[i]);' }],
      c: [{ loose: 'i = r === null ? e : e.slice(0, r),' }, 'o = i.findLastIndex((e) => "uuid" in e && e.uuid === a);',
        'return i.slice(o + 1).some((e) => e.type === "assistant") ? void 0 : a;'],
      u: ['return [r?.result, ...(Array.isArray(r?.errors) ? r.errors : [])].some('],
      d: ['d = 6e5'],
    },
    pins: { l: ['typeof e == "string" &&', 'e.toLowerCase().includes("no conversation found with session id")'] } },
];
// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites3 = [
  { source: 'cee72b629-BMo5PDZM.js', binding: 'p', role: 'Decision input (exported n, `tR` in cc43287c9) from the session bucket: messages snapshot, conversationLost = shownCategory cli_resume_not_found, lastPrompt only for a desktop session (host: the WI-5 projection)',
    features: ['let n = e.messages.getSnapshot();', 'errorKilledTurn: e.errorKilledTurn,', 'errorRejectedPrompt: e.errorRejectedPrompt,', 'heldInput: e.heldInput,',
      'desktopSession: t.desktopSession,', 'conversationLost: t.shownCategory === "cli_resume_not_found",', { loose: 'lastPrompt: (t.desktopSession && a(n, t.canned)) || void 0,' }] },
  { source: 'cee72b629-BMo5PDZM.js', binding: 'm', role: 'The card\'s retryWouldSend (h, exported o, over the bucket store): ownWords / nothing / nudge from f with an empty composer (only remote categories carry retryNeeds; not ported)',
    features: ['if (e.error !== null && e.errorRejectedPrompt !== null) return "ownWords";', { loose: 'let t = f(e, { text: "", isEmpty: !0 });' }, 'return t === "focus"', '? "nothing"',
      '(t !== "nudge" && t !== "nudgeBesideDraft") ||', '(e.error !== null && !e.messages.some((e) => e.type === "assistant"))', '? "ownWords"', ': "nudge";'] },
  { source: 'cee72b629-BMo5PDZM.js', binding: 'h', role: 'retryWouldSend reads the bucket store (c06cf64bb wt) through a compiler-memoised selector — store-bound, not emitted',
    features: [{ loose: 'n = J1($, 0, t) ? K1($, 0, t, (e) => e && m(p(e, t))) : $[1];' }, { loose: 'return i(e, n);' }] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites3 = [
  { source: 'cee72b629-BMo5PDZM.js', role: 'Module exports: iR = f (t), eR = g (a), tR = p (n), nR = h (o), rR = o (r), tb = l (i)',
    features: ['export{g as a,l as i,p as n,h as o,o as r,f as t}', 'import{t as r,wt as i}from"./c06cf64bb-CdJdJuVd.js"', 'import{Cs as e,Ks as t,Ls as n}from"./shared-104-CTONUSaz.js"'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Error-card retry handler ES (handleErrorRetry / retryLastTurn = DS): input from the bucket or the restored draft, then the outcome dispatch',
    features: [
      'import{a as eR,n as tR,o as nR,r as rR,t as iR}from"./cee72b629-BMo5PDZM.js"',
      'n=(t&&tR(t,{desktopSession:eI(q),shownCategory:Sx,canned:gF(I)}))??eR(gx?.restoredDraft)',
      'a=iR(n,{text:r.getText(),isEmpty:!r.hasDraft()});return a==="resend"?(r.submit({personSent:i}),!0):a==="nudgeBesideDraft"&&q?(TS(q,i),r.scheduleFocus(),!0):a==="nudge"?(ic(),$s(I.formatMessage(rF.retryNudge)),r.submit({retryNudge:!0,personSent:i}),!0):a==="repeatPrompt"&&n?.lastPrompt!==void 0?(ic(),$s(n.lastPrompt.text),r.submit({personSent:i}),!0):(a==="refillPrompt"&&n?.lastPrompt!==void 0&&(ic(),ac(n.lastPrompt.text)),a==="deliver"?(Qc(),!0):(r.scheduleFocus(),!1))',
      '()=>ES()?!0:(jd(J_),!1)', 'handleErrorRetry:DS', 'retryLastTurn:DS'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'nudgeBesideDraft (TS over wS): a separate "error_retry" sendWithOutcome of the formatted retryNudge that leaves the composer draft alone',
    features: ['{sendWithOutcome:bS}=GM("error_retry")', 'bS({ref:t,text:I.formatMessage(rF.retryNudge),uuid:crypto.randomUUID(),retryNudge:!0,personSent:n,',
      '"epitaxy: error retry send failed"'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Send core (one): a local nudge never arms lastSentText (ue) and skips the failed-send restores',
    features: ['ft=ve?.retryNudge===!0&&be.type==="local"', 'ft||ue(We,dt)'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'The restored-draft retries (session never started / without worktree) only resend',
    features: ['iR(eR(Ad?.kind==="categorized"?Ad.restoredDraft:void 0),{text:e.getText(),isEmpty:e.isEmpty()})==="resend"',
      'iR(eR(_S),{text:e.getText(),isEmpty:!e.hasDraft()})==="resend"'] },
  { source: 'c6b8adeaf-bLEQVSWL.js', role: 'sendWithOutcome onError: a failed local send records NON_RESENDABLE (Ln) unless it was the retry nudge',
    features: ['let{ref:a,uuid:o,isSynthetic:c,remoteRejectionCard:l,retryNudge:u}=t;', 'u!==!0&&z.getState().buckets[a.id]?.error===r&&z.getState().recordRejectedPrompt(a.id,Ln,f)'] },
  { source: 'c06cf64bb-CdJdJuVd.js', role: 'Bucket store: recordRejectedPrompt (sets local_send_rejected when no error yet) and the NON_RESENDABLE selector',
    features: ['recordRejectedPrompt(e,t,n,r){let i=J(e);if(i){if(i.error===null){if(i.pendingTurn!==null||t===null)return;O(e,{kind:"error",error:n,errorCategory:r?.category??"local_send_rejected",sshFailureReason:r?.sshFailureReason})}Y(e,e=>({...e,errorRejectedPrompt:t}))}}',
      'function qO(e){return e?.errorRejectedPrompt===HC}'] },
];
// The minified names the raw pins use, resolved through the importing chunk's import statement.
const importPins3 = [
  { source: 'cc43287c9-Me-M2ucD.js', from: './c73f45bc3-B7hbL7H9.js', names: { ct: 'rF', st: 'gF' } },
  { source: 'cc43287c9-Me-M2ucD.js', from: './cee72b629-BMo5PDZM.js', names: { t: 'iR', a: 'eR', n: 'tR', o: 'nR' } },
  { source: 'c6b8adeaf-bLEQVSWL.js', from: './c06cf64bb-CdJdJuVd.js', names: { t: 'Ln' } },
];

// ---- 4.16336.0 contract (scripts/official-4.16336.0.mjs) -> src/generated/retry-decision-v4 ----
// As above, plus `byExport` (roots named by the chunk's export alias), `exported` (the alias a root named by its local
// must carry) and `readBy` (a root that is the only free variable of another proven root carrying its features).
const modules4 = [
  { target: 'define-messages.mjs', source: 'vendor-intl-BJgYK7RA.js', byExport: { f: 'defineMessages' }, features: { f: ['return e;'] } },
  { target: 'logger.mjs', source: 'shared-0-CnnWnVrT.js', exports: { Rc: 'logger', N: 'logCategory' },
    features: { Rc: ['debug: (e, ...t) => {},', 'console.warn(e, ...', 'console.error(e, ...', '__errorMarked: (e, t, ...n) => {', 'console.group(e, ...t),'],
      N: ['EPITAXY: "[EPITAXY]",'] } },
  { target: 'prompt-text.mjs', source: 'shared-62-DoCqVpIq.js',
    exports: { _K: 'hasToolResultBlock', JG: 'stripTrailingContextBlocks', tq: 'isInterruptMarker', QG: 'stripLeadingContextBlocks' },
    features: {
      _K: ['if (!Array.isArray(e)) return !1;', 'if (t[e]?.type === "tool_result") return !0;'],
      JG: [{ loose: 'let r = e.replace($W, "");' }, { loose: 'let e = GW(r.replace(XW, ""), t, n);' }],
      tq: [{ loose: 'return t !== 91 && t > 32 && t < 127 ? !1 : mG.has(e.trim());' }],
      QG: [{ loose: 'if (n === tG) return e;' }, { loose: 'return t > 0 && rG.test(n) ? e : n;' }],
    },
    pins: {
      pG: ['"[Request interrupted by user]",', '"[Request interrupted by user for tool use]",'],
      XG: ['/<(system-reminder|task-notification)(?=[\\s/>])[^>]*>[\\s\\S]*?<\\/\\1>\\s*/y'],
      KG: ['["<system-reminder", "<task-notification"]'],
    } },
  { target: 'transcript-rows.mjs', source: 'shared-92-BOgyxePb.js',
    exports: { Gq: 'lastTerminalRowIndex', Wq: 'pendingPromptUuid', qq: 'isFailedTerminalRow', Iq: 'isTerminalRow', Rq: 'isHumanPromptRow' },
    features: {
      Gq: [{ loose: 'let t = Pw(e, Ow);' }, 'return t.kind === "terminal" ? t.index : null;'],
      Wq: [{ loose: 'if (Ow(t)) return null;' }, { loose: 'if (Aw(t) && !LT(e, n) && !hw(t)) return ow(t) ?? null;' }],
      qq: ['return e.type !== "result" || ("is_error" in e && e.is_error === !0);'],
      Iq: ['e.type === "result" ||', '"isApiErrorMessage" in e &&', 'e.isApiErrorMessage === !0'],
      Rq: ['e.type !== "user" ||', '("isSynthetic" in e && e.isSynthetic) ||', '("isMeta" in e && e.isMeta)',
        { loose: 'return (t && t.startsWith("client-")) || Tw(e) ? !1 : !ET(e);' }],
    },
    pins: {
      Hq: ['return { kind: "terminal", index: i };', 'return { kind: "prompt", index: i };', '?? { kind: "none" }'],
      fq: ['?.isCurrentSnapshot(e)) {', { loose: 'let n = nw(e[i]) ? t(e[i], i) : void 0;' }],
      dq: ['Symbol("turnRowIndexes")'],
      uq: ['(e.type === "user" || e.type === "assistant" || e.type === "result") &&', { loose: '!tw(e)' }],
      lq: ['return "parent_tool_use_id" in e && !!e.parent_tool_use_id;'],
      jJ: ['?.name === "/model" ||'],
      Cq: ['return e.isOptimisticEcho === !0;'],
      sq: ['"incrementalDerive: stale snapshot"'],
    } },
  { target: 'non-resendable.mjs', source: 'c06cf64bb-CoZso5N4.js', exports: { $w: 'NON_RESENDABLE_REJECTION' },
    features: { $w: ['Symbol("NON_RESENDABLE_REJECTION")'] } },
  // c90d7fd86 t (exported t; 3.6556.2 shared-9 OT): the shared common-copy table; cannedNudges (Zv) reads its tryAgain.
  { target: 'common-messages.mjs', source: 'c90d7fd86-iWqdaSNP.js', byExport: { t: 'commonMessages' },
    features: { t: ['tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },', 'cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },'] } },
  { target: 'retry-nudge-messages.mjs', source: 'c73f45bc3-C7dtUSq8.js', exports: { Xv: 'retryNudgeMessages', Zv: 'cannedNudges' },
    features: {
      Xv: ['retryNudge: { defaultMessage: "Try again", id: "hV5oXfyLn2" },',
        '"I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.",', 'id: "UqWMzb4bJb",',
        '"My computer went to sleep while you were working. Please continue from where you left off.",', 'id: "4g6ivTtQ3C",'],
      Zv: [{ loose: 'e.formatMessage(l_.retryNudge),' }, { loose: 'e.formatMessage(ti.tryAgain),' }, { loose: 'e.formatMessage(l_.afterUsageLimit),' },
        { loose: 'e.formatMessage(l_.afterSleep),' }, { loose: 'l_.retryNudge.defaultMessage,' }, { loose: 'l_.afterUsageLimit.defaultMessage,' },
        { loose: 'l_.afterSleep.defaultMessage,' }],
    } },
  // c3e34355f (4.16336.0; the 3.6556.2 cee72b629 was merged into this error-card chunk): G (exported E) the decision, Yt
  // (exported M) the rejected-draft input, Bt / Vt the turn helpers, Ut the "no conversation found" check over the messages
  // (Ht, exported A, the string test), Wt the window. New in 4.16336.0: held input always answers "deliver" (3.6556.2:
  // "focus" beside a draft).
  { target: 'retry-decision.mjs', source: 'c3e34355f-DeHzeGRt.js',
    exports: { G: 'decideErrorRetry', Yt: 'rejectedDraftRetryState', Bt: 'lastTurnFailed', Vt: 'unansweredPromptUuid', Ut: 'conversationNotFound',
      Wt: 'REPEAT_PROMPT_WINDOW_MS' },
    exported: { G: 'E', Yt: 'M' },
    // c3e34355f holds two `= 6e5` constants; Wt is the one the decision G reads (`r < Wt`).
    readBy: { Wt: 'G' },
    features: {
      G: [{ loose: 'function G(e, t, n = Date.now()) {' }, 'let r = e !== void 0 && e.error !== null,', 'i = r ? e.errorRejectedPrompt : null;',
        { loose: 'if (i !== null) return i !== dt && t.text === i ? "resend" : "focus";' }, 'if (e !== void 0 && e.heldInput.length > 0) return "deliver";',
        { loose: 'if (e?.desktopSession && (e.conversationLost || Ut(e.messages))) {' },
        { loose: 'e.lastPrompt.uuid !== Vt(e.messages)' }, 'let r = n - (e.lastPrompt.sentAt ?? NaN);', { loose: 'return e.lastPrompt.whole && r >= 0 && r < Wt' },
        '? "repeatPrompt"', ': "refillPrompt";', { loose: 'return (r && !e.errorKilledTurn) || e === void 0 || !Bt(e.messages)' }, '? "focus"',
        '? "nudge"', ': "nudgeBesideDraft";'],
      Yt: ['return e === void 0', 'error: "",', 'errorKilledTurn: !1,', 'errorRejectedPrompt: e,', 'heldInput: [],', 'messages: [],'],
      Bt: [{ loose: 'let t = F(e);' }, { loose: 'return t === null ? I(e) !== void 0 : be(e[t]);' }],
      Vt: [{ loose: 'n = t === null ? e : e.slice(0, t),' }, 'i = n.findLastIndex((e) => "uuid" in e && e.uuid === r);',
        'return n.slice(i + 1).some((e) => e.type === "assistant") ? void 0 : r;'],
      Ut: ['return [n?.result, ...(Array.isArray(n?.errors) ? n.errors : [])].some('],
      Wt: ['= 6e5;'],
    },
    pins: { Ht: ['typeof e == "string" &&', 'e.toLowerCase().includes("no conversation found with session id")'] } },
];
const callSites4 = [
  { source: 'c3e34355f-DeHzeGRt.js', binding: 'Kt', role: 'Decision input (exported D, `qR` in cc43287c9) from the session bucket: messages snapshot, conversationLost = shownCategory cli_resume_not_found or (new in 4.16336.0) worktree_resume_refused, lastPrompt only for a desktop session (host: the WI-5 projection)',
    features: ['let n = e.messages.getSnapshot();', 'errorKilledTurn: e.errorKilledTurn,', 'errorRejectedPrompt: e.errorRejectedPrompt,', 'heldInput: e.heldInput,',
      'desktopSession: t.desktopSession,', 't.shownCategory === "cli_resume_not_found" ||', 't.shownCategory === "worktree_resume_refused",', { loose: 'lastPrompt: (t.desktopSession && ht(n, t.canned)) || void 0,' }] },
  { source: 'c3e34355f-DeHzeGRt.js', binding: 'qt', role: 'The card\'s retryWouldSend (Jt, exported N, over the bucket store): ownWords / nothing / (new in 4.16336.0) heldMessage / nudge from G with an empty composer (only remote categories carry retryNeeds; not ported)',
    features: ['if (e.error !== null && e.errorRejectedPrompt !== null) return "ownWords";', { loose: 'let t = G(e, { text: "", isEmpty: !0 });' }, 'return t === "focus"', '? "nothing"',
      ': t === "deliver"', '? "heldMessage"', '(t !== "nudge" && t !== "nudgeBesideDraft") ||', '(e.error !== null && !e.messages.some((e) => e.type === "assistant"))', '? "ownWords"', ': "nudge";'] },
  { source: 'c3e34355f-DeHzeGRt.js', binding: 'Jt', role: 'retryWouldSend reads the bucket store (c06cf64bb Dt) through a compiler-memoised selector — store-bound, not emitted',
    features: [{ loose: 'n = J1($, 0, t) ? K1($, 0, t, (e) => e && qt(Kt(e, t))) : $[1];' }, { loose: 'return ut(e, n);' }] },
];
const rawCallSites4 = [
  { source: 'c3e34355f-DeHzeGRt.js', role: 'The decision chunk reads NON_RESENDABLE (dt) and the bucket store (ut) from c06cf64bb and the transcript rows (F / I / be) from shared-92',
    features: ['import{Dt as ut,t as dt}from"./c06cf64bb-CoZso5N4.js"', 'import{$r as F,Ar as be,Wr as I,ay as L,ey as xe,rs as Se}from"./shared-92-BOgyxePb.js"',
      'G as E,', 'Yt as M,', 'Ht as A,', 'Kt as D,', 'Jt as N,'] },
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Error-card retry handler bC (handleErrorRetry = xC): input from the bucket or the restored draft, then the outcome dispatch (new in 4.16336.0: resend carries the rejected send, personSent follows the retry timer, deliver flushes the held input and focuses only beside a draft or a held error)',
    features: [
      'n=(t&&qR(t,{desktopSession:_R(q),shownCategory:hS,canned:fL(I)}))??XR(dS?.restoredDraft),r=t?.errorRejectedSend??void 0',
      'let a=dS?.retryAtMs===void 0||void 0,o=JR(n,{text:i.getText(),isEmpty:!i.hasDraft()});return o==="resend"?(i.submit({resendOf:r,personSent:a}),!0):o==="nudgeBesideDraft"&&q?(vC(q,a),i.scheduleFocus(),!0):o==="nudge"?(Vs(),Is(I.formatMessage(hL.retryNudge)),i.submit({retryNudge:!0,personSent:a}),!0):o==="repeatPrompt"&&n?.lastPrompt!==void 0?(Vs(),Is(n.lastPrompt.text),i.submit({personSent:a}),!0):(o==="refillPrompt"&&n?.lastPrompt!==void 0&&(Vs(),Hs(n.lastPrompt.text)),o==="deliver"?(w(),Pc(),(i.hasDraft()||t!==void 0&&t.error!==null&&rE(t.heldHostRedial)===null)&&i.scheduleFocus(),!0):(i.scheduleFocus(),!1))',
      '()=>bC()?!0:(jd(Nf),!1)', 'handleErrorRetry:xC', 'retryLastTurn:SC', '()=>{let e=!!(J&&C_(J));return xC(),!e}'] },
  { source: 'cc43287c9-dzfX-J5i.js', role: 'nudgeBesideDraft (vC over _C): a separate "error_retry" sendWithOutcome of the formatted retryNudge that leaves the composer draft alone',
    features: ['{sendWithOutcome:gC}=UF("error_retry")', 'gC({ref:t,text:I.formatMessage(hL.retryNudge),uuid:crypto.randomUUID(),retryNudge:!0,personSent:n,model:Ay(t)})',
      '"epitaxy: error retry send failed"'] },
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Send core (one): a local nudge never arms lastSentText (ue) and skips the failed-send restores',
    features: ['vt=ve?.retryNudge===!0&&J.type==="local"', 'vt||ue(We,_t)'] },
  { source: 'cc43287c9-dzfX-J5i.js', role: 'The restored-draft retry (session never started) only resends (4.16336.0 keeps the categorized one only)',
    features: ['JR(XR(Ad?.kind==="categorized"?Ad.restoredDraft:void 0),{text:e.getText(),isEmpty:e.isEmpty()})==="resend"'] },
  { source: 'c6b8adeaf-qnfs920E.js', role: 'sendWithOutcome onError: a failed local send records NON_RESENDABLE (Jn) unless it was the retry nudge',
    features: ['let{ref:a,uuid:o,isSynthetic:c,remoteRejectionCard:l,retryNudge:u}=t;', 'u!==!0&&B.getState().buckets[a.id]?.error===r&&B.getState().recordRejectedPrompt(a.id,Jn,h)'] },
  { source: 'c06cf64bb-CoZso5N4.js', role: 'Bucket store: recordRejectedPrompt (sets local_send_rejected when no error yet; new in 4.16336.0: an echoed send is dropped instead, and the rejected send is kept beside the prompt) and the NON_RESENDABLE selector',
    features: ['recordRejectedPrompt(e,n,r,i,a){let o=J(e);if(o){if(a!==void 0&&t().hasEchoedUuid(e,a.uuid)){Y(e,e=>({...e,...eT}));return}if(o.error===null){if(o.pendingTurn!==null||n===null)return;D(e,{kind:"error",error:r,errorCategory:i?.category??"local_send_rejected",sshFailureReason:i?.sshFailureReason})}Y(e,e=>({...e,errorRejectedPrompt:n,errorRejectedSend:a??null}))}}',
      'function dA(e){return e?.errorRejectedPrompt===$w}'] },
];
const importPins4 = [
  { source: 'cc43287c9-dzfX-J5i.js', from: './c73f45bc3-C7dtUSq8.js', names: { lt: 'hL', ct: 'fL' } },
  { source: 'cc43287c9-dzfX-J5i.js', from: './c3e34355f-DeHzeGRt.js', names: { E: 'JR', M: 'XR', D: 'qR', N: 'ZR' } },
  { source: 'c6b8adeaf-qnfs920E.js', from: './c06cf64bb-CoZso5N4.js', names: { t: 'Jn' } },
];

// The release contracts. `production` is the graph the host and the 3.6556.2 areas import today; `target` the migration
// target, generated beside it (isolated: nothing imports it until the production switch).
export const retryDecisionReleases = Object.freeze({
  '3.6556.2': { official: official3, output: 'src/generated/retry-decision', modules: modules3, callSites: callSites3,
    rawCallSites: rawCallSites3, importPins: importPins3, uniqueRoots: false },
  '4.16336.0': { official: official4, output: 'src/generated/retry-decision-v4', modules: modules4, callSites: callSites4,
    rawCallSites: rawCallSites4, importPins: importPins4, uniqueRoots: true, sharedGraph: 'cds-core',
    isolatedGraph: {
      productionGraph: 'src/generated/retry-decision',
      productionSwitchNotBeforeBatch: 6,
      heldBy: 'session-rail sleep-band.mjs imports retryNudgeMessages from ../retry-decision/retry-nudge-messages.mjs as c73f45bc3-B7hbL7H9.js:l_ (original identity, resolved only against 3.6556.2 modules); the host imports src/generated/retry-decision',
    } },
});
export const productionRelease = '3.6556.2';
export const targetRelease = '4.16336.0';

async function readSource(source, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
// The prettier form of one declaration, which features are matched against.
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk (parsed on its own; Babel's program scope
// lists what the snippet reads or assigns without declaring).
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
function missingFeatures(official, text, features = []) {
  const flat = normalised(text);
  // A string feature is matched verbatim (whitespace-insensitive); { loose } through looseFeature() (R2/E5: ≤3-character
  // identifiers generalised, literals and property keys exact).
  return features.filter(f => typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !official.looseFeature(f.loose).test(text));
}
function assertFeatures(official, label, text, features = []) {
  const missing = missingFeatures(official, text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// 4.16336.0: a root named by its minified local must be the only candidate declaration carrying every one of its
// features (names move between releases; the features are what identify it). Candidates are the chunk's top-level
// function / variable declarations, or, for a `readBy` root, the free variables of the root that reads it.
const literalsOf = features => features.flatMap(f => [...(typeof f === 'string' ? f : f.loose).matchAll(/"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]{3,}/g)].map(m => m[0]));
async function assertUniqueRoot(official, src, spec, name, candidates) {
  const features = spec.features?.[name] ?? [];
  if (!features.length) throw Error(`${spec.target}: root ${name} has no features`);
  const hits = [];
  for (const other of candidates) {
    const entry = src.top.get(other);
    if (!entry || (entry.kind !== 'function' && entry.kind !== 'var')) continue;
    // Pre-filter only (the prettier check below decides): every string literal and 4+ character word of the features must
    // occur in the raw declaration (prettier adds parentheses and separators the minified text does not have).
    if (!literalsOf(features).every(literal => declarationText(src, entry).includes(literal))) continue;
    if (!missingFeatures(official, await featureText(src, entry), features).length) hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${spec.target}: root ${name} features match ${hits.join(', ') || 'nothing'}`);
}

// sharedGraph 'cds-core' (4.16336.0): the runSlicer sharedGraph contract (extract-working-line.mjs sharedGraphFor): the
// manifest is on this version and snapshot, every module's bytes equal its recorded sha256 and were sliced from the very
// chunk this contract reads, and every publicName is exported by its module under exportName.
async function sharedGraph(contract) {
  if (!contract.sharedGraph) return null;
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const bytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(bytes);
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  const byTarget = new Map();
  for (const m of manifest.modules) {
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const chunk = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!chunk || sha(chunk) !== m.sourceSha256) throw Error(`${area}/${m.target} was not sliced from the ${path.basename(m.source)} this contract reads`);
    byTarget.set(m.target, m);
  }
  const published = new Map();
  for (const [name, e] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(e.target);
    const exported = m && (m.exports?.[e.local] ?? (m.sharedExports?.includes(e.local) ? e.local : null));
    if (!m || path.basename(m.source) !== e.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === e.local) || exported !== e.exportName)
      throw Error(`${area} publicName ${name} (${e.file}#${e.local}) is not exported by ${e.target} as ${e.exportName}`);
    published.set(`${e.file}#${e.local}`, { name, ...e });
  }
  return { area, manifestSha256: sha(bytes), published };
}

export async function extractRetryDecision({ check = false, release = productionRelease } = {}) {
  const contract = retryDecisionReleases[release];
  if (!contract) throw Error(`No retry decision contract for ${release}`);
  const { official } = contract;
  const { referenceVersion, referenceSnapshot, ionSource: source } = official;
  if (referenceVersion !== release) throw Error(`${release} contract reads ${referenceVersion}`);
  const output = path.join(root, contract.output);
  const shared = await sharedGraph(contract);
  const link = (file, local, via) => {
    const e = shared?.published.get(`${file}#${local}`);
    return e ? { from: `../${shared.area}/${e.target}`, name: e.exportName, via, kind: 'shared-graph', original: local } : null;
  };
  const cache = new Map();
  const read = name => readSource(source, name, cache);
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-retry-decision.mjs', adapterModule: null,
    ...(shared ? { sharedGraph: shared.area, sharedGraphManifestSha256: shared.manifestSha256 } : {}),
    ...(contract.isolatedGraph ? { isolatedGraph: contract.isolatedGraph } : {}),
    modules: [], callSites: [], importPins: [],
  };
  const files = {};
  for (const raw of contract.modules) {
    const src = await read(raw.source);
    // `byExport` names roots by the chunk's export alias (the alias is the proof of identity); `exported` checks the alias
    // of roots named by their local.
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const spec = raw.byExport ? { ...raw,
      exports: Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])),
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([alias, list]) => [byLocal(alias), list])),
      aliasProven: new Set(Object.keys(raw.byExport).map(byLocal)) } : { ...raw, aliasProven: new Set() };
    for (const [local, alias] of Object.entries(raw.exported ?? {})) {
      if (byLocal(alias) !== local) throw Error(`${raw.target}: ${raw.source} exports ${alias} as ${byLocal(alias)}, not ${local}`);
      spec.aliasProven.add(local);
    }
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const { file, alias } = entry, via = `${file}:${alias}`;
        const dep = await read(file);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        const linked = !generated && link(file, local, via);
        if (linked) { imports.set(name, linked); return; }
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local}); the closure must stay within modules generated here`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated', original: local });
        return;
      }
      // A sibling module already emits this declaration of the same chunk.
      const sibling = emitted.find(m => m.spec.source === spec.source && m.spec.exports[name]);
      if (sibling && !Object.hasOwn(spec.exports, name)) {
        imports.set(name, { from: `./${sibling.spec.target}`, name: sibling.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' });
        return;
      }
      // A binding cds-core publishes (4.16336.0) is linked, never sliced again (a root of this module is always sliced).
      const linked = !Object.hasOwn(spec.exports, name) && link(spec.source, name, `${spec.source}#${name}`);
      if (linked) { imports.set(name, linked); return; }
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
    };
    // Roots read by another root are located after it (`readBy`), the rest in declaration order of `exports`.
    const roots = Object.keys(spec.exports);
    const ordered = [...roots.filter(name => !spec.readBy?.[name]), ...roots.filter(name => spec.readBy?.[name])];
    for (const name of ordered) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(official, `${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
      if (contract.uniqueRoots && !spec.aliasProven.has(name)) {
        const reader = spec.readBy?.[name];
        if (reader && !roots.includes(reader)) throw Error(`${spec.target}: root ${name} is read by ${reader}, which is not a root here`);
        await assertUniqueRoot(official, src, spec, name, reader ? declarationDeps(src, reader) : [...src.top.keys()]);
      }
      await add(name);
    }
    for (const [name, features] of Object.entries(spec.pins ?? {})) {
      // A pinned binding cds-core publishes is reached as a link (one copy, wave 5b), not sliced again; its official
      // declaration must still carry the pinned features.
      const entry = selected.get(name) ?? (imports.get(name)?.kind === 'shared-graph' && imports.get(name).original === name ? src.top.get(name) : null);
      if (!entry) throw Error(`${spec.target}: pinned ${name} is not in the closure of its roots`);
      assertFeatures(official, `${spec.target}: ${name}`, await featureText(src, entry), features);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-retry-decision.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'WeakMap',
      'Date', 'NaN', 'undefined', 'Infinity',
      // shared-0's logger writes to the console, and asks the user agent whether it runs in Electron (typeof-guarded).
      'console', 'navigator']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of contract.callSites) {
    const src = await read(site.source);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    const text = await featureText(src, entry);
    assertFeatures(official, `call site ${site.source}:${site.binding}`, text, site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  const raw = new Map();
  const rawText = async name => {
    if (!raw.has(name)) raw.set(name, await fs.readFile(path.join(source, name)));
    return raw.get(name);
  };
  for (const site of contract.rawCallSites) {
    const bytes = await rawText(site.source);
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  for (const pin of contract.importPins) {
    const text = (await rawText(pin.source)).toString();
    const statements = [...text.matchAll(/import\{([^}]*)\}from"([^"]+)"/g)].filter(m => m[2] === pin.from);
    if (statements.length !== 1) throw Error(`import pin ${pin.source}: ${statements.length} imports from ${pin.from}, expected 1`);
    const specifiers = new Map(statements[0][1].split(',').map(s => s.split(' as ')).map(([imported, local]) => [imported, local ?? imported]));
    for (const [imported, local] of Object.entries(pin.names))
      if (specifiers.get(imported) !== local) throw Error(`import pin ${pin.source}: ${pin.from} ${imported} is ${specifiers.get(imported)}, expected ${local}`);
    manifest.importPins.push({ source: pin.source, from: pin.from, names: pin.names });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Retry decision ${release} output set changed: ${present.join(',')}. Run scripts/extract-retry-decision.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Retry decision ${release} source mismatch: ${name}. Run scripts/extract-retry-decision.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} retry decision modules into ${contract.output} (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites, ${manifest.importPins.length} import pins).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // `--release <version>` limits the run to one contract; by default both graphs are generated / checked.
  const at = process.argv.indexOf('--release');
  const releases = at === -1 ? Object.keys(retryDecisionReleases) : [process.argv[at + 1]];
  for (const release of releases) await extractRetryDecision({ check: process.argv.includes('--check'), release });
}
