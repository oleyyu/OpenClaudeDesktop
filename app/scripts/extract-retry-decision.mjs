// R4f-error E4 (transcript-09, WI-4): extract the 2.42304.0 error-card retry decision without executing any desktop
// runtime (decision D0: own generator, own output folder src/generated/retry-decision, own
// scripts/verify-gen-retry-decision.mjs).
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
// adapters: an import resolves only to another module generated here, and anything else stops generation.
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

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/retry-decision');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text. `pins` does the same for bindings the
// closure reaches (each must be selected by it).
const modules = [
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  { target: 'logger.mjs', source: 'shared-0-ByI5P0CP.js', exports: { $r: 'logger', I: 'logCategory' },
    features: { $r: ['debug: (e, ...t) => {},', 'console.warn(e, ...Qr(t));', 'console.error(e, ...Qr(t));'], I: ['EPITAXY: "[EPITAXY]",'] } },
  { target: 'prompt-text.mjs', source: 'shared-52-DGviI8xb.js',
    exports: { WR: 'hasToolResultBlock', RR: 'stripTrailingContextBlocks', nB: 'isInterruptMarker', HR: 'stripLeadingContextBlocks' },
    features: {
      WR: ['if (!Array.isArray(e)) return !1;', 'if (t[e]?.type === "tool_result") return !0;'],
      RR: ['let r = e.replace(LR, "");', 'let e = kR(r.replace(PR, ""), t, n);'],
      nB: ['return t !== 91 && t > 32 && t < 127 ? !1 : QR.has(e.trim());'],
      HR: ['if (n === zR) return e;', 'return t > 0 && VR.test(n) ? e : n;'],
    },
    pins: {
      QR: ['"[Request interrupted by user]",', '"[Request interrupted by user for tool use]",'],
      BR: ['/<(system-reminder|task-notification)(?=[\\s/>])[^>]*>[\\s\\S]*?<\\/\\1>\\s*/y'],
      IR: ['["<system-reminder", "<task-notification"]'],
    } },
  { target: 'transcript-rows.mjs', source: 'shared-104-Cqo2-vQh.js',
    exports: { sC: 'lastTerminalRowIndex', oC: 'pendingPromptUuid', lC: 'isFailedTerminalRow', QS: 'isTerminalRow', eC: 'isHumanPromptRow' },
    features: {
      sC: ['let t = iC(e, QS);', 'return t.kind === "terminal" ? t.index : null;'],
      oC: ['if (QS(t)) return null;', 'if (eC(t) && !sw(e, n) && !zS(t)) return AS(t) ?? null;'],
      lC: ['return e.type !== "result" || ("is_error" in e && e.is_error === !0);'],
      QS: ['e.type === "result" ||', '"isApiErrorMessage" in e &&', 'e.isApiErrorMessage === !0'],
      eC: ['e.type !== "user" ||', '("isSynthetic" in e && e.isSynthetic) ||', '("isMeta" in e && e.isMeta)',
        'return (t && t.startsWith("client-")) || YS(e) ? !1 : !XC(e);'],
    },
    pins: {
      iC: ['if (t(r)) return { kind: "terminal", index: i };', 'if (n(r) && !sw(e, i)) return { kind: "prompt", index: i };', '?? { kind: "none" }'],
      OS: ['if (rS(e)?.isCurrentSnapshot(e)) {', 'let n = ES(e[i]) ? t(e[i], i) : void 0;'],
      nS: ['nS = new WeakMap()'],
      DS: ['Symbol("turnRowIndexes")'],
      ES: ['(e.type === "user" || e.type === "assistant" || e.type === "result") &&', '!TS(e)'],
      TS: ['return "parent_tool_use_id" in e && !!e.parent_tool_use_id;'],
      KC: ['return WC(t)?.name === "/model" || GC.test(t);'],
      zS: ['return e.isOptimisticEcho === !0;'],
      CS: ['Lt.debug(V.EPITAXY, "incrementalDerive: stale snapshot", {'],
    } },
  { target: 'non-resendable.mjs', source: 'c06cf64bb-BE5q2vSr.js', exports: { Am: 'NON_RESENDABLE_REJECTION' },
    features: { Am: ['Am = Symbol("NON_RESENDABLE_REJECTION")'] } },
  { target: 'retry-nudge-messages.mjs', source: 'c73f45bc3-CFrHin0p.js', exports: { vh: 'retryNudgeMessages', yh: 'cannedNudges' },
    features: {
      vh: ['retryNudge: { defaultMessage: "Try again", id: "FazwRldA7z" },',
        '"I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.",', 'id: "UqWMzb4bJb",',
        '"My computer went to sleep while you were working. Please continue from where you left off.",', 'id: "4g6ivTtQ3C",'],
      yh: ['e.formatMessage(vh.retryNudge),', 'e.formatMessage(vh.afterUsageLimit),', 'e.formatMessage(vh.afterSleep),',
        'vh.retryNudge.defaultMessage,', 'vh.afterUsageLimit.defaultMessage,', 'vh.afterSleep.defaultMessage,'],
    } },
  { target: 'retry-decision.mjs', source: 'cee72b629-k4HYmvQy.js',
    exports: { d: 'decideErrorRetry', h: 'rejectedDraftRetryState', s: 'lastTurnFailed', c: 'unansweredPromptUuid', l: 'conversationNotFound',
      u: 'REPEAT_PROMPT_WINDOW_MS' },
    features: {
      d: ['function d(e, t, n = Date.now()) {', 'let i = e !== void 0 && e.error !== null,', 'a = i ? e.errorRejectedPrompt : null;',
        'if (a !== null) return a !== r && t.text === a ? "resend" : "focus";', 'if (e !== void 0 && e.heldInput.length > 0)',
        'return t.isEmpty ? "deliver" : "focus";', 'if (e?.desktopSession && (e.conversationLost || l(e.messages))) {',
        'e.lastPrompt.uuid !== c(e.messages)', 'let r = n - (e.lastPrompt.sentAt ?? NaN);', 'return e.lastPrompt.whole && r >= 0 && r < u',
        '? "repeatPrompt"', ': "refillPrompt";', 'return (i && !e.errorKilledTurn) || e === void 0 || !s(e.messages)', '? "focus"',
        '? "nudge"', ': "nudgeBesideDraft";'],
      h: ['return e === void 0', 'error: "",', 'errorKilledTurn: !1,', 'errorRejectedPrompt: e,', 'heldInput: [],', 'messages: [],'],
      s: ['let i = e(r);', 'return i === null ? t(r) !== void 0 : n(r[i]);'],
      c: ['i = r === null ? n : n.slice(0, r),', 'o = i.findLastIndex((e) => "uuid" in e && e.uuid === a);',
        'return i.slice(o + 1).some((e) => e.type === "assistant") ? void 0 : a;'],
      l: ['return [r?.result, ...(Array.isArray(r?.errors) ? r.errors : [])].some(', 'e.toLowerCase().includes("no conversation found with session id"),'],
      u: ['u = 6e5'],
    } },
];
// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'cee72b629-k4HYmvQy.js', binding: 'f', role: 'Decision input (`sz`) from the session bucket: messages snapshot, conversationLost = shownCategory cli_resume_not_found, lastPrompt only for a desktop session (host: the WI-5 projection)',
    features: ['let n = e.messages.getSnapshot();', 'errorKilledTurn: e.errorKilledTurn,', 'errorRejectedPrompt: e.errorRejectedPrompt,', 'heldInput: e.heldInput,',
      'desktopSession: t.desktopSession,', 'conversationLost: t.shownCategory === "cli_resume_not_found",', 'lastPrompt: (t.desktopSession && a(n, t.canned)) || void 0,'] },
  { source: 'cee72b629-k4HYmvQy.js', binding: 'p', role: 'The card\'s retryWouldSend (`az` via m over the bucket store): ownWords / nothing / nudge from d with an empty composer (only remote categories carry retryNeeds; not ported)',
    features: ['if (e.error !== null && e.errorRejectedPrompt !== null) return "ownWords";', 'let t = d(e, { text: "", isEmpty: !0 });', 'return t === "focus"', '? "nothing"',
      '(e.error !== null && !e.messages.some((e) => e.type === "assistant"))', '? "ownWords"', ': "nudge";'] },
  { source: 'cee72b629-k4HYmvQy.js', binding: 'm', role: 'retryWouldSend reads the bucket store (c06cf64bb Y) — store-bound, not emitted',
    features: ['return i(e, (e) => e && p(f(e, t)));'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'cee72b629-k4HYmvQy.js', role: 'Module exports: lz = d (t), oz = h (i), sz = f (n), az = m (a), cz = o (r)',
    features: ['export{m as a,h as i,f as n,o as r,d as t}', 'import{t as r,wt as i}from"./c06cf64bb-BE5q2vSr.js"', 'import{Ec as e,_c as t,rc as n}from"./shared-104-Cqo2-vQh.js"'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Error-card retry handler b_ (handleErrorRetry / retryLastTurn = x_): input from the bucket or the restored draft, then the outcome dispatch',
    features: [
      'import{a as az,i as oz,n as sz,r as cz,t as lz}from"./cee72b629-k4HYmvQy.js"',
      'n=(t&&sz(t,{desktopSession:qF(G),shownCategory:Hg,canned:MN(V)}))??oz(zg?.restoredDraft)',
      'a=lz(n,{text:r.getText(),isEmpty:!r.hasDraft()});return a==="resend"?(r.submit({personSent:i}),!0):a==="nudgeBesideDraft"&&G?(y_(G,i),r.scheduleFocus(),!0):a==="nudge"?(Ro(),Eo(V.formatMessage(xN.retryNudge)),r.submit({retryNudge:!0,personSent:i}),!0):a==="repeatPrompt"&&n?.lastPrompt!==void 0?(Ro(),Eo(n.lastPrompt.text),r.submit({personSent:i}),!0):(a==="refillPrompt"&&n?.lastPrompt!==void 0&&(Ro(),zo(n.lastPrompt.text)),a==="deliver"?(Fs(),!0):(r.scheduleFocus(),!1))',
      'x_=A(()=>b_()?!0:(bl(fi),!1),[b_,bl])', 'handleErrorRetry:x_', 'retryLastTurn:x_'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'nudgeBesideDraft (y_): a separate "error_retry" sendWithOutcome of the formatted retryNudge that leaves the composer draft alone',
    features: ['{sendWithOutcome:g_}=Lj("error_retry")', 'g_({ref:t,text:V.formatMessage(xN.retryNudge),uuid:crypto.randomUUID(),retryNudge:!0,personSent:n,',
      '"epitaxy: error retry send failed"'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Send core (one): a local nudge never arms lastSentText (fe) and skips the failed-send restores',
    features: ['ct=be?.retryNudge===!0&&W.type==="local"', 'ct||fe(He,st)'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'The restored-draft retries (session never started / without worktree) only resend',
    features: ['lz(oz(yl?.kind==="categorized"?yl.restoredDraft:void 0),{text:e.getText(),isEmpty:e.isEmpty()})==="resend"',
      'lz(oz(f_),{text:e.getText(),isEmpty:!e.hasDraft()})==="resend"'] },
  { source: 'c6b8adeaf-C5Aww7gq.js', role: 'sendWithOutcome onError: a failed local send records NON_RESENDABLE (kn) unless it was the retry nudge',
    features: ['onError:(e,{ref:t,uuid:i,isSynthetic:a,remoteRejectionCard:s,retryNudge:c},p)=>', 'c!==!0&&L.getState().buckets[t.id]?.error===o&&f(t.id,kn,x)'] },
  { source: 'c06cf64bb-BE5q2vSr.js', role: 'Bucket store: recordRejectedPrompt (sets local_send_rejected when no error yet) and the NON_RESENDABLE selector',
    features: ['recordRejectedPrompt(e,t,n,r){let i=q(e);if(i){if(i.error===null){if(i.pendingTurn!==null||t===null)return;A(e,{kind:"error",error:n,errorCategory:r?.category??"local_send_rejected",sshFailureReason:r?.sshFailureReason})}J(e,e=>({...e,errorRejectedPrompt:t}))}}',
      'function cy(e){return Y(e,e=>e?.errorRejectedPrompt===Am)}'] },
];
// The minified names the raw pins use, resolved through the importing chunk's import statement.
const importPins = [
  { source: 'cc43287c9-DAfOi8yP.js', from: './c73f45bc3-CFrHin0p.js', names: { it: 'xN', rt: 'MN' } },
  { source: 'cc43287c9-DAfOi8yP.js', from: './cee72b629-k4HYmvQy.js', names: { t: 'lz', i: 'oz', n: 'sz', a: 'az' } },
  { source: 'c6b8adeaf-C5Aww7gq.js', from: './c06cf64bb-BE5q2vSr.js', names: { t: 'kn' } },
];

async function readSource(name, cache) {
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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

export async function extractRetryDecision({ check = false } = {}) {
  const cache = new Map();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-retry-decision.mjs', adapterModule: null,
    modules: [], callSites: [], importPins: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const { file, alias } = entry, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
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
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
      await add(name);
    }
    for (const [name, features] of Object.entries(spec.pins ?? {})) {
      const entry = selected.get(name);
      if (!entry) throw Error(`${spec.target}: pinned ${name} is not in the closure of its roots`);
      assertFeatures(`${spec.target}: ${name}`, await featureText(src, entry), features);
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
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    const text = await featureText(src, entry);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  const raw = new Map();
  const rawText = async name => {
    if (!raw.has(name)) raw.set(name, await fs.readFile(path.join(source, name)));
    return raw.get(name);
  };
  for (const site of rawCallSites) {
    const bytes = await rawText(site.source);
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  for (const pin of importPins) {
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Retry decision output set changed: ${present.join(',')}. Run scripts/extract-retry-decision.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Retry decision source mismatch: ${name}. Run scripts/extract-retry-decision.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} retry decision modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites, ${manifest.importPins.length} import pins).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractRetryDecision({ check: process.argv.includes('--check') });
