import { t } from '../electron/i18n/index.mjs';
import { codeCommentFinding, parseAssistantDirective } from './assistant-directives-model.mjs';
import { appToolCall } from './agent-tool-titles.mjs';
import { findingCategoryLabel } from './generated/review-findings/finding-category.mjs';
import { parseReportFindingsInput, parseReportedFinding } from './generated/r4e-findings/findings-input.mjs';
import { restoreMentions } from './generated/r4e-findings/text-sanitize.mjs';
import { fixFindingsText } from './generated/r4e-findings/fix-findings-text.mjs';

// Code review findings in the Changes pane (2.2553.1 hh findings bar, panes-tile-current.js:3887-4125, and the Rn
// inline card, panes-diff-view-current.js:614-760). Claude's /code-review reports typed findings; here the latest
// review result of the session is read back from the transcript in each core's shape:
//   · Codex review mode (exitedReviewMode.review, codex-rs review_format.rs): "- [P1] Title — /abs/path:10-12" with
//     the body indented under it;
//   · the bridges' typed findings (acp-bridge findingsReview): "**High** (2)" groups of "- `path:12` — summary
//     _(outcome)_" with the failure scenario indented under it;
//   · review skills' `::code-comment{title body file start end priority}` lines in a reply.
// A finding is {id, file (workspace-relative), line, endLine, summary, detail, category}; a reported finding without a
// line keeps line 1 for placement and says so with `lineless` (2.42304.0 c227f4d5e Mq: `line` only when a number).

const relative = (file, cwd) => {
  const value = String(file ?? '').trim().replaceAll('\\', '/');
  const base = typeof cwd === 'string' && cwd ? cwd.replace(/[\\/]+$/, '').replaceAll('\\', '/') : '';
  return base && value.startsWith(`${base}/`) ? value.slice(base.length + 1) : value.replace(/^\.\//, '');
};
const finding = (index, fields) => ({ id: `finding-${index}`, category: null, detail: null, ...fields });

/** Codex's review text (render_review_output_text). */
export function parseCodexReview(text, cwd = null) {
  const out = [];
  let current = null;
  for (const line of String(text ?? '').split('\n')) {
    const item = /^- (?:\[[ x]\] )?(.+?) — (.+?):(\d+)(?:-(\d+))?\s*$/.exec(line);
    if (item) {
      const priority = /^\[[Pp]([0-3])\]\s*/.exec(item[1]);
      const start = Math.max(1, Number(item[3])), end = Math.max(start, Number(item[4] ?? item[3]));
      current = finding(out.length, { file: relative(item[2], cwd), line: start, endLine: end, summary: priority ? item[1].slice(priority[0].length).trim() || item[1] : item[1].trim(), detail: '', category: priority ? `P${priority[1]}` : null });
      out.push(current);
      continue;
    }
    if (current && /^ {2}/.test(line)) current.detail = current.detail ? `${current.detail}\n${line.slice(2)}` : line.slice(2);
    else if (current && line.trim()) current = null;
  }
  return out.map((entry) => ({ ...entry, detail: entry.detail?.trim() || null }));
}

/** The bridges' severity-grouped findings (acp-bridge findingsReview). */
export function parseBridgeReview(text, cwd = null) {
  const out = [];
  let severity = null, current = null;
  for (const line of String(text ?? '').split('\n')) {
    const group = /^\*\*(.+?)\*\* \(\d+\)\s*$/.exec(line);
    if (group) { severity = group[1] === 'Findings' ? null : group[1]; current = null; continue; }
    const item = /^- `([^`]+?)(?::(\d+))?` — (.*?)(?: _\((.+)\)_)?\s*$/.exec(line);
    if (item) {
      const start = item[2] ? Math.max(1, Number(item[2])) : 1;
      current = finding(out.length, { file: relative(item[1], cwd), line: start, endLine: start, summary: item[3].trim(), detail: '', category: severity, ...(item[4] ? { outcome: item[4] } : {}) });
      out.push(current);
      continue;
    }
    if (current && /^ {2}/.test(line)) current.detail = current.detail ? `${current.detail}\n${line.slice(2)}` : line.slice(2);
    else if (current && line.trim()) current = null;
  }
  return out.map((entry) => ({ ...entry, detail: entry.detail?.trim() || null }));
}

/** ::code-comment lines of a reply (outside fenced code). */
export function parseCodeComments(text, cwd = null) {
  const out = [];
  let fence = null;
  for (const line of String(text ?? '').split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) { if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; continue; }
    if (marker) { fence = marker[1]; continue; }
    const content = line.replace(/^[ \t]+/, '');
    if (!/^:{1,3}code-comment\{/.test(content)) continue;
    const parsed = codeCommentFinding(parseAssistantDirective(content, { backslash: true }), cwd);
    if (!parsed) continue;
    out.push(finding(out.length, { file: relative(parsed.display, null), line: parsed.start, endLine: parsed.end, summary: parsed.title, detail: parsed.body || null, category: parsed.priority === null ? null : `P${parsed.priority}` }));
  }
  return out;
}

// The findings read from a ReportFindings call (reportedFindings): the session that made the call has that tool, so the
// fix message may ask it to report the outcomes back (fixFindingsPrompt).
const REPORTED = new WeakSet();

/**
 * The findings a finished ReportFindings call (OpenClaude Desktop's agent tools, electron/agent-tools/findings.mjs) reported,
 * read from its arguments (bridges drop a tool's structured content), or null for any other item. The outcome a
 * re-report sets is kept ('fixed', 'skipped', 'no change needed').
 *
 * R4f-findings-store: a finding's id is the one the transcript's findings card gives it (2.42304.0 c96d752d0 X$
 * ``id:`finding-${e.id}-${n}` ``, n its index among the findings c227f4d5e Nq reads: `t.findings.map(Mq).filter(e => e !==
 * void 0)`), so the Changes pane and the card address the same finding in the session review store. A finding Mq reads
 * but this pane cannot place (an empty path or summary) still takes its index.
 */
export function reportedFindings(item, cwd = null) {
  if (appToolCall(item)?.tool !== 'ReportFindings' || item.status !== 'completed' || item.result?.isError === true || item.error) return null;
  const list = Array.isArray(item.arguments?.findings) ? item.arguments.findings : [];
  const toolId = String(item.id), out = [];
  let readable = -1;
  for (const entry of list) {
    if (parseReportedFinding(entry) === undefined) continue;
    readable += 1;
    if (!(entry.file.trim() && entry.summary.trim())) continue;
    const lined = Number.isInteger(entry.line) && entry.line > 0, line = lined ? entry.line : 1;
    const detail = typeof entry.failure_scenario === 'string' && entry.failure_scenario.trim() ? entry.failure_scenario.trim() : null;
    // R3-terminal FT-09: the category reads as the 2.42304.0 parser labels it (c227f4d5e Mq `category: jq(t.category)`:
    // separators to spaces, first letter up, at most 40 characters).
    const found = finding(out.length, { id: `finding-${toolId}-${readable}`, file: relative(entry.file, cwd), line, endLine: line, summary: entry.summary.trim(), detail,
      category: findingCategoryLabel(entry.category) ?? null, ...(lined ? {} : { lineless: true }),
      ...(typeof entry.outcome === 'string' && entry.outcome ? { outcome: entry.outcome.replace(/_/g, ' ') } : {}),
      ...(entry.verdict === 'CONFIRMED' || entry.verdict === 'PLAUSIBLE' ? { verdict: entry.verdict } : {}) });
    REPORTED.add(found);
    out.push(found);
  }
  return out;
}

/** The Review result card's text for reported findings: the bridges' grouped list (parseBridgeReview reads it back). */
export function reportedFindingsReview(findings) {
  if (!Array.isArray(findings) || !findings.length) return t('No findings.');
  const lines = [`**Findings** (${findings.length})`, ''];
  for (const entry of findings) {
    const where = `\`${plainPath(entry.file)}${entry.line ? `:${entry.line}` : ''}\``;
    lines.push(`- ${where} — ${String(entry.summary).replace(/\s+/g, ' ')}${entry.outcome ? ` _(${entry.outcome})_` : ''}`);
    if (entry.detail) lines.push(...String(entry.detail).split(/\r\n|[\r\n]/).map((line) => `  ${line}`));
  }
  return lines.join('\n');
}

/**
 * The latest review of a session's items: {key, findings} (key changes with each new review), or null when the
 * latest review reported nothing or there is none. A review is an exitedReviewMode item, a finished ReportFindings call,
 * or a completed reply with ::code-comment findings.
 *
 * R4e-findings review: a ReportFindings call whose findings carry outcomes is the re-report after fixes (2.42304.0
 * cc43287c9 Gte: only a report without outcomes is the review; the watcher applies a re-report's outcomes to that
 * review's findings), so the review before it stays the latest review and the pane keeps its marks. A re-report with no
 * earlier review that has findings still reads as the review.
 */
export function latestReviewFindings(items, cwd = null) {
  const list = Array.isArray(items) ? items : [];
  let rereport = null;
  const review = (found) => found ?? rereport;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const item = list[index];
    if (item?.type === 'exitedReviewMode' && typeof item.review === 'string') {
      const found = /^\*\*.+?\*\* \(\d+\)/m.test(item.review) ? parseBridgeReview(item.review, cwd) : parseCodexReview(item.review, cwd);
      if (found.length) return keyedReview(String(item.id ?? index), found);
      // A review that ended with plain text after a ReportFindings call (the OpenCode bridge's review turns): the
      // reported findings of the same review (its turn, else back to enteredReviewMode) are the review's findings.
      for (let earlier = index - 1; earlier >= 0; earlier -= 1) {
        const prior = list[earlier];
        if (item.turnId !== undefined ? prior?.turnId !== item.turnId : prior?.type === 'enteredReviewMode') break;
        const reported = reportedFindings(prior, cwd);
        if (reported) return review(reported.length ? { key: String(prior.id ?? earlier), findings: reported } : null);
      }
      return review(null);
    }
    const reported = reportedFindings(item, cwd);
    if (reported && reported.length && !reviewReport(appToolCall(item)?.args)) { rereport ??= { key: String(item.id ?? index), findings: reported }; continue; }
    if (reported) return review(reported.length ? { key: String(item.id ?? index), findings: reported } : null);
    if (item?.type === 'agentMessage' && typeof item.text === 'string' && item.text.includes('code-comment{')) {
      const found = parseCodeComments(item.text, cwd);
      if (found.length) return keyedReview(String(item.id ?? index), found);
    }
  }
  return rereport;
}

// R4f-findings-store: the session review store keys a finding's status by its id, so every review's findings carry ids
// of their own and one review's statuses never carry over to the next. A ReportFindings call's findings already have the
// transcript card's ids (reportedFindings); a Codex review's or a reply's ::code-comment findings are numbered under
// their item: `finding-${key}-${index}`.
const keyedReview = (key, found) => ({ key, findings: found.map((entry, index) => ({ ...entry, id: `finding-${key}-${index}` })) });

// $O: a path without backticks or line breaks (reportedFindingsReview).
const plainPath = (file) => String(file).replace(/[`\r\n\u2028\u2029]/g, '');

/**
 * The follow-up turn the Changes pane's "Fix this one" / "Apply fixes" sends for these findings: 2.42304.0 c96d752d0 Jw
 * (generated/r4e-findings/fix-findings-text.mjs), which the pane's fix also sends (cb61be3a2 Qe:
 * `text: me([{file: r.filePath, line: r.line, summary: r.body, detail: r.detail}])`, `line` absent for a lineless
 * finding). Its last paragraph asks the agent to call ReportFindings with the outcomes; a session that reported these
 * findings with ReportFindings has that tool, a Codex review or ::code-comment review may not, so for those findings
 * the message ends before that paragraph (host difference).
 */
export function fixFindingsPrompt(findings) {
  const text = fixFindingsText(findings.map((entry) => ({ file: String(entry.file),
    line: entry.lineless || !Number.isInteger(entry.line) ? undefined : entry.line, summary: String(entry.summary), detail: entry.detail || undefined })));
  if (findings.length > 0 && findings.every((entry) => REPORTED.has(entry))) return text;
  const tail = text.lastIndexOf("\n\nWhen you're done, call the ReportFindings tool");
  return tail < 0 ? text : text.slice(0, tail);
}

/**
 * R3-terminal FT-09 (diffgit-01): the annotation the 2.42304.0 finding card (c44d00c7f ya) reads, as c96d752d0's findings
 * card builds it: `{id, filePath, side: "additions", startLine: line ?? 1, endLine: line ?? 1, line, body: summary,
 * detail: failure_scenario, source: "finding", category, verdict}`. A local finding may span lines (Codex review
 * "path:3-4"), so startLine/endLine are its range; `line` (the "Line N" label's presence and the "Next finding after
 * the one on line {line}" name) is its first line, absent for a lineless reported finding.
 */
export function findingAnnotation(entry) {
  const startLine = Number.isInteger(entry.line) && entry.line > 0 ? entry.line : 1;
  const endLine = Number.isInteger(entry.endLine) && entry.endLine >= startLine ? entry.endLine : startLine;
  return { id: entry.id, filePath: entry.file, side: 'additions', startLine, endLine, line: entry.lineless ? undefined : startLine,
    body: entry.summary, detail: entry.detail ?? undefined, source: 'finding', category: entry.category ?? undefined, verdict: entry.verdict };
}

/** {fixing, addressed, open} over the findings (statuses: id → 'open' | 'fixing' | 'addressed'). */
export function findingCounts(findings, statuses = {}) {
  let fixing = 0, addressed = 0;
  for (const entry of findings) {
    const status = statuses[entry.id] ?? 'open';
    if (status === 'fixing') fixing += 1; else if (status === 'addressed') addressed += 1;
  }
  return { fixing, addressed, open: findings.length - fixing - addressed };
}

/** The findings bar status line: Applying fixes… / Fixes applied / Finding {current} of {total}. */
export function findingsStatusText(findings, statuses, currentIndex) {
  const counts = findingCounts(findings, statuses);
  if (counts.fixing > 0 && counts.open === 0) return t('Applying fixes…');
  if (findings.length > 0 && counts.addressed === findings.length) return t('Fixes applied');
  return t('Finding {current} of {total}', { current: currentIndex + 1, total: findings.length });
}

/** Whether a diff file path and a finding's file name the same file (either may be workspace-relative). */
export function sameFindingFile(diffPath, file) {
  const a = String(diffPath ?? '').replace(/^\.\//, ''), b = String(file ?? '').replace(/^\.\//, '');
  if (!a || !b) return false;
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`);
}

// ── R4e-findings (toolcards-18): the host side of the transcript findings card ─────────────────────────────────────
// The card is the generated 2.42304.0 original (c96d752d0 X$ / h0e, src/generated/r4e-findings/findings-card.mjs). What
// it reads from the desktop's session review store and session watcher is ported here; scripts/extract-r4e-findings.mjs
// pins the original text of every action and branch below.

/**
 * The card's tool (c96d752d0 H$ reads name / status / isError, X$ the input) for a local item, or null for any other
 * item: OpenClaude Desktop's ReportFindings agent tool (electron/agent-tools/findings.mjs; a bridge's report_findings is
 * projected to it), its arguments as the input.
 */
export function findingsCardTool(item) {
  const call = appToolCall(item);
  if (call?.tool !== 'ReportFindings') return null;
  const isError = item.status === 'failed' || item.result?.isError === true || !!item.error;
  return { id: String(item.id), name: 'ReportFindings', status: item.status === 'completed' ? 'completed' : item.status === 'failed' ? 'error' : 'running',
    isError, input: call.args };
}

// cc8941b7b we: a session's review level, seeded tool ids and auto-open mark go (with its findings).
function clearedReviewMarks(e, t) {
  const { [t]: n, ...r } = e.reviewLevelBySession, { [t]: i, ...a } = e.seededFindingsToolIdsBySession, { [t]: o, ...s } = e.latestSettledAtActivationBySession;
  return { reviewLevelBySession: r, seededFindingsToolIdsBySession: a, latestSettledAtActivationBySession: s };
}

/**
 * R4f-findings-store: cc8941b7b F's persist options `{name: "diff-annotations", partialize: De}`. De keeps
 * annotationsBySession, sentPrIdsBySession, findingsBySession, reviewLevelBySession, findingStatusBySession and
 * fixingWatermarkBySession; this store has no comment annotations or sent PR ids (the host keeps its diff comments in
 * diff-comments-model.mjs), so it keeps the four review fields, as zustand persist writes them: `{state, version: 0}`.
 */
export const REVIEW_STORE_KEY = 'diff-annotations';
const PERSISTED_FIELDS = ['findingsBySession', 'reviewLevelBySession', 'findingStatusBySession', 'fixingWatermarkBySession'];
export const persistedReviewState = (state) => Object.fromEntries(PERSISTED_FIELDS.map((field) => [field, state[field]]));
const plain = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const REVIEW_STATUSES = new Set(['open', 'fixing', 'addressed', 'dismissed']);
const REVIEW_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
/** The persisted review state (the JSON zustand persist wrote), validated field by field; anything unreadable is empty. */
export function parsePersistedReview(raw) {
  let value;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
  const saved = plain(value?.state) ? value.state : {};
  const bySession = (field, read) => {
    const out = {};
    if (plain(saved[field])) for (const [session, entry] of Object.entries(saved[field])) { const kept = read(entry); if (kept !== undefined) out[session] = kept; }
    return out;
  };
  return {
    findingsBySession: bySession('findingsBySession', (list) => (Array.isArray(list)
      ? list.filter((entry) => plain(entry) && typeof entry.id === 'string' && typeof entry.filePath === 'string' && Number.isFinite(entry.endLine)) : undefined)),
    reviewLevelBySession: bySession('reviewLevelBySession', (level) => (REVIEW_LEVELS.has(level) ? level : undefined)),
    findingStatusBySession: bySession('findingStatusBySession', (statuses) => (plain(statuses)
      ? Object.fromEntries(Object.entries(statuses).filter(([, status]) => REVIEW_STATUSES.has(status))) : undefined)),
    fixingWatermarkBySession: bySession('fixingWatermarkBySession', (mark) => (typeof mark === 'string' || mark === null ? mark : undefined)),
  };
}

/**
 * cc8941b7b F (exported V) with its actions object I (exported A): the session review store, reduced to the state the
 * findings card, the Changes pane and the session watcher use. The original is a zustand store (not shipped here); each
 * action keeps its original body (where the original calls another action through get(), `t().x`, this calls `store.x`).
 * storage (localStorage-like, optional): where the persisted fields (persistedReviewState) are read at creation and
 * written on change, as zustand persist does; none keeps the store in memory.
 */
export function createReviewFindingsStore({ storage = null } = {}) {
  let restored = {};
  try { restored = parsePersistedReview(storage?.getItem(REVIEW_STORE_KEY) ?? null); } catch { restored = {}; }
  let state = {
    findingsBySession: {}, findingsIndexBySession: {}, findingsResolvedScopesBySession: {}, reviewLevelBySession: {}, fixingWatermarkBySession: {},
    seededFindingsToolIdsBySession: {}, latestSettledAtActivationBySession: {}, currentFindingBySession: {}, findingStatusBySession: {}, scrollTargetBySession: {},
    ...restored,
  };
  const listeners = new Set();
  let written = persistedReviewState(state);
  const persist = () => {
    if (!storage || PERSISTED_FIELDS.every((field) => written[field] === state[field])) return;
    written = persistedReviewState(state);
    try { storage.setItem(REVIEW_STORE_KEY, JSON.stringify({ state: written, version: 0 })); } catch { /* storage unavailable: kept for this window */ }
  };
  // zustand set(): a partial merged into the state; returning the state itself changes nothing.
  const e = (change) => {
    const next = typeof change === 'function' ? change(state) : change;
    if (Object.is(next, state)) return;
    state = { ...state, ...next };
    persist();
    for (const listener of [...listeners]) listener();
  };
  const t = () => state;
  const store = {
    getState: t,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    consumeAutoOpen: (t, n) => e((e) => ({ latestSettledAtActivationBySession: { ...e.latestSettledAtActivationBySession, [t]: n } })),
    setReviewFindings: (t, n, r) => e((e) => {
      const { level: i, toolId: a, latestSettledToolId: o } = r ?? {};
      const { [t]: s, ...c } = e.reviewLevelBySession;
      const l = e.seededFindingsToolIdsBySession[t] ?? [];
      const u = new Set(n.map((e) => e.id));
      const d = Object.fromEntries(Object.entries(e.findingStatusBySession[t] ?? {}).filter(([e]) => u.has(e)));
      const f = n.filter((e) => d[e.id] !== 'dismissed');
      return {
        findingsBySession: { ...e.findingsBySession, [t]: f },
        ...(i === undefined ? (r === undefined ? {} : { reviewLevelBySession: c }) : { reviewLevelBySession: { ...e.reviewLevelBySession, [t]: i } }),
        ...(a !== undefined && !l.includes(a) ? { seededFindingsToolIdsBySession: { ...e.seededFindingsToolIdsBySession, [t]: [...l, a] } } : {}),
        ...(o === undefined ? {} : { latestSettledAtActivationBySession: { ...e.latestSettledAtActivationBySession, [t]: o } }),
        findingsIndexBySession: { ...e.findingsIndexBySession, [t]: {} },
        findingsResolvedScopesBySession: { ...e.findingsResolvedScopesBySession, [t]: {} },
        currentFindingBySession: { ...e.currentFindingBySession, [t]: f[0]?.id ?? null },
        findingStatusBySession: { ...e.findingStatusBySession, [t]: { ...e.findingStatusBySession[t], ...d } },
      };
    }),
    // R4f-findings-store: the Changes pane's Dismiss (cccc2cf0a nb `ig.clearReviewFindings(_, !0)`), its finding card's X
    // (cb61be3a2 $e `Be.dismissReviewFinding(e.id, r.id, t)`) and Next (c44d00c7f Aa `Dn.stepReviewFinding(r,
    // n.finding.id, s)`), and the scroll target the pane consumes (clearScrollTarget).
    clearReviewFindings: (t, n) => e((e) => {
      const r = e.findingsBySession[t];
      if (!r) return e;
      const { [t]: i, ...a } = e.findingsBySession, { [t]: o, ...s } = e.findingsIndexBySession, { [t]: c, ...l } = e.findingsResolvedScopesBySession,
        { [t]: u, ...d } = e.currentFindingBySession, f = e.findingStatusBySession[t];
      const p = (() => {
        if (!f) return f;
        const e = { ...f };
        let t = false;
        for (const n of r) if (e[n.id] === 'fixing') { e[n.id] = 'open'; t = true; }
        return t ? e : f;
      })();
      const ee = n ? { ...f, ...Object.fromEntries(r.map((e) => [e.id, 'dismissed'])) } : p;
      const { [t]: m, ...h } = e.fixingWatermarkBySession;
      return { findingsBySession: a, findingsIndexBySession: s, findingsResolvedScopesBySession: l, currentFindingBySession: d, fixingWatermarkBySession: h,
        ...clearedReviewMarks(e, t), findingStatusBySession: { ...e.findingStatusBySession, [t]: ee ?? {} } };
    }),
    dismissReviewFinding: (n, r, i) => {
      const a = t().findingsBySession[n];
      if (!a) return;
      const o = a.findIndex((e) => e.id === r);
      if (o < 0) return;
      const s = a[o + 1] ?? a[o - 1], c = t().currentFindingBySession[n] === r;
      e((e) => {
        const t = a.filter((e) => e.id !== r), i = e.findingsIndexBySession[n] ?? {}, o = {};
        for (const [e, t] of Object.entries(i)) {
          const n = {};
          for (const [e, i] of Object.entries(t)) { const t = i.filter((e) => e.id !== r); n[e] = t.length === i.length ? i : t; }
          o[e] = n;
        }
        return {
          ...(t.length === 0 ? clearedReviewMarks(e, n) : {}),
          findingsBySession: { ...e.findingsBySession, [n]: t },
          findingsIndexBySession: { ...e.findingsIndexBySession, [n]: o },
          findingStatusBySession: { ...e.findingStatusBySession, [n]: { ...e.findingStatusBySession[n], [r]: 'dismissed' } },
          ...(e.currentFindingBySession[n] === r ? { currentFindingBySession: { ...e.currentFindingBySession, [n]: s?.id ?? null } } : {}),
        };
      });
      if (c && s) store.scrollToAnnotation(n, s.filePath, { fuzzy: true, tileId: i ?? 'diff', anchor: { side: s.side, line: s.endLine } });
    },
    stepReviewFinding: (e, n, r) => {
      const i = t().findingsBySession[e];
      if (!i) return;
      const a = i[i.findIndex((e) => e.id === n) + 1] ?? i[0];
      if (!a || a.id === n) return;
      store.setCurrentReviewFinding(e, a.id);
      store.scrollToAnnotation(e, a.filePath, { fuzzy: true, tileId: r ?? 'diff', anchor: { side: a.side, line: a.endLine } });
    },
    clearScrollTarget: (t) => e((e) => {
      if (!e.scrollTargetBySession[t]) return e;
      const { [t]: n, ...r } = e.scrollTargetBySession;
      return { scrollTargetBySession: r };
    }),
    setCurrentReviewFinding: (t, n) => e((e) => (e.currentFindingBySession[t] === n ? e : { currentFindingBySession: { ...e.currentFindingBySession, [t]: n } })),
    markReviewFindingsFixing: (t, n) => e((e) => {
      if (n.length === 0) return e;
      const r = { ...e.findingStatusBySession[t] };
      for (const id of n) r[id] = 'fixing';
      return { findingStatusBySession: { ...e.findingStatusBySession, [t]: r } };
    }),
    reopenReviewFindings: (t, n) => e((e) => {
      if (n.length === 0) return e;
      const r = { ...e.findingStatusBySession[t] };
      for (const id of n) if (id in r && r[id] !== 'dismissed') r[id] = 'open';
      return { findingStatusBySession: { ...e.findingStatusBySession, [t]: r } };
    }),
    applyReviewFindingOutcomes: (n, r, i) => {
      const a = t(), o = i?.findings ?? a.findingsBySession[n];
      if (!o || o.length === 0 || r.length === 0) return;
      const s = { ...(a.findingStatusBySession[n] ?? {}) }, l = new Set();
      let c = false;
      const u = (entry, finding) => {
        if (!finding) return false;
        l.add(finding.id);
        const current = s[finding.id];
        if (current === 'dismissed' || (i?.touchFixing === false && current !== undefined && current !== 'open')) return true;
        const next = entry.outcome === 'skipped' ? 'open' : 'addressed';
        if (s[finding.id] !== next) { s[finding.id] = next; c = true; }
        return true;
      };
      const d = [];
      for (const entry of r)
        if (!u(entry, o.find((f) => !l.has(f.id) && f.filePath === entry.file && f.endLine === entry.line && f.body === entry.summary))) d.push(entry);
      for (const entry of d) {
        const same = o.filter((f) => !l.has(f.id) && f.body === entry.summary), inFile = same.filter((f) => f.filePath === entry.file);
        u(entry, (inFile.length === 1 ? inFile[0] : undefined) ?? (same.length === 1 ? same[0] : undefined));
      }
      if (c) e({ findingStatusBySession: { ...a.findingStatusBySession, [n]: s } });
    },
    setReviewFixingWatermark: (t, n) => e((e) => (e.fixingWatermarkBySession[t] === n ? e : { fixingWatermarkBySession: { ...e.fixingWatermarkBySession, [t]: n } })),
    settleFixingReviewFindings: (n) => {
      const r = t(), i = r.findingStatusBySession[n];
      if (!i || !Object.values(i).includes('fixing')) return;
      const a = {};
      for (const [id, status] of Object.entries(i)) a[id] = status === 'fixing' ? 'addressed' : status;
      e({ findingStatusBySession: { ...r.findingStatusBySession, [n]: a } });
    },
    scrollToAnnotation: (t, n, r) => e((e) => ({ scrollTargetBySession: { ...e.scrollTargetBySession, [t]: { filePath: n, nonce: (e.scrollTargetBySession[t]?.nonce ?? 0) + 1,
      ...(r?.fuzzy && { fuzzy: true }), ...(r?.tileId && { tileId: r.tileId }), ...(r?.anchor && { anchor: r.anchor }) } } })),
  };
  return store;
}

/** cc43287c9 r9: how many of the session's findings are being fixed. */
export function fixingCount(state, sessionId) {
  return Object.values(state.findingStatusBySession[sessionId] ?? {}).filter((status) => status === 'fixing').length;
}

// cc43287c9 Gte / Wte / Jte (pinned): a report without outcomes (the review), the outcomes of a re-report (an unknown
// outcome reads as skipped; the echoed text has its ＠ turned back into @), and the review's findings as annotations.
const isOutcome = (value) => value === 'fixed' || value === 'skipped' || value === 'no_change_needed';
const reviewReport = (input) => {
  const list = input && typeof input === 'object' ? input.findings : undefined;
  return Array.isArray(list) && list.length > 0 && !list.some((entry) => typeof entry === 'object' && !!entry && entry.outcome !== undefined);
};
const reportedOutcomes = (input) => {
  const list = input && typeof input === 'object' ? input.findings : undefined;
  if (!Array.isArray(list)) return [];
  return list.filter((entry) => entry && typeof entry === 'object' && typeof entry.file === 'string' && typeof entry.summary === 'string')
    .map((entry) => ({ file: restoreMentions(entry.file), line: typeof entry.line === 'number' ? entry.line : undefined, summary: restoreMentions(entry.summary),
      outcome: isOutcome(entry.outcome) ? entry.outcome : 'skipped' }));
};
const reviewAnnotations = (toolId, input) => {
  if (toolId === undefined) return null;
  const parsed = parseReportFindingsInput(input);
  return !parsed || parsed.findings.length === 0 ? null
    : parsed.findings.map((finding, index) => ({ id: `finding-${toolId}-${index}`, filePath: finding.file, endLine: finding.line ?? 1, body: finding.summary }));
};

/**
 * cc43287c9 Zte's start: findings still fixing with no fix watermark (the fix began where no watcher saw it) reopen
 * (`if (t.fixingWatermarkBySession[e] === void 0) { … n.length > 0 && MF.reopenReviewFindings(e, n) }`).
 */
export function reopenUnwatchedFixes(store, sessionId) {
  if (!sessionId) return;
  const state = store.getState();
  if (state.fixingWatermarkBySession[sessionId] !== undefined) return;
  const fixing = Object.entries(state.findingStatusBySession[sessionId] ?? {}).filter(([, status]) => status === 'fixing').map(([id]) => id);
  if (fixing.length > 0) store.reopenReviewFindings(sessionId, fixing);
}

/**
 * cc43287c9 Zte, the session watcher behind the card's statuses, over the host transcript (items in order; running: a
 * turn is in flight; turnErrors: state.turnErrors of the session, turn id → error; turnTimes: state.turnTimes of the
 * session, turn id → {startedAt, completedAt}). Outcomes a later ReportFindings call reports are applied to the review's
 * findings (touching fixing ones only after the fix watermark). Once the fix turn has ended and the session is idle, a
 * failed turn or applied outcomes reopen what is still fixing; otherwise the fixes settle (fixing → addressed). The
 * watermark is the last item when the fixing count rose (source-findings-card.jsx); a watermark item not found counts
 * from the start, as the original's findIndex + 1.
 *
 * "The fix turn has ended" is the original's `m && EA(n)` after `CA(a, t)`: a prompt after the watermark (CA: a user
 * message), then the end of its turn (EA: a result row, or an assistant row that ended the turn). The host transcript
 * has no result rows, so the end of the turn is a reply item after the prompt (any item that is not a user message), or
 * the prompt's turn completing (turnTimes completedAt) or failing (turnErrors) — a prompt echoed before its turn is
 * running (`running` still false) does not settle anything. Nk (the session is idle) is `!running`.
 *
 * turnEnded (R4f review fix, the Changes pane's stand-in watcher only): the caller saw the session's turn run and end
 * while the fix was in flight (running true → false with a watermark and findings fixing), so the fix turn has ended
 * even with no reply item after the prompt — a fix turn that fails at once. The pane has no turn errors to tell such a
 * turn apart, so with none given it settles (the pre-store pane did the same on `active` true → false).
 */
export function settleReviewFixes(store, sessionId, items, { running = false, turnErrors = null, turnTimes = null, turnEnded = false } = {}) {
  if (!sessionId) return;
  const state = store.getState(), list = Array.isArray(items) ? items : [];
  const watermark = state.fixingWatermarkBySession[sessionId], watched = watermark !== undefined;
  const start = watermark == null ? 0 : list.findIndex((item) => item && String(item.id) === watermark) + 1;
  let baseId, baseInput, prompted = false, ended = false, reported = false;
  const promptTurns = new Set();
  list.forEach((item, index) => {
    if (index >= start && item) {
      if (item.type === 'userMessage') { prompted = true; if (item.turnId) promptTurns.add(item.turnId); }
      else if (prompted) ended = true;
    }
    const call = appToolCall(item);
    if (call?.tool !== 'ReportFindings') return;
    if (reviewReport(call.args)) { baseId = String(item.id); baseInput = call.args; return; }
    const outcomes = reportedOutcomes(call.args);
    if (!outcomes.length) return;
    if (index >= start) reported = true;
    const seeded = baseId !== undefined && !!state.findingsBySession[sessionId]?.some((entry) => entry.id.startsWith(`finding-${baseId}-`));
    const findings = seeded ? undefined : reviewAnnotations(baseId, baseInput);
    if (findings !== null) store.applyReviewFindingOutcomes(sessionId, outcomes, { touchFixing: watched && index >= start, findings });
  });
  if (prompted && !ended) for (const turn of promptTurns) if (turnErrors?.[turn] || turnTimes?.[turn]?.completedAt != null) ended = true;
  if (prompted && turnEnded === true) ended = true;
  if (!watched || !ended || running) return;
  const lastTurn = list.slice(start).findLast((item) => item?.turnId)?.turnId;
  const failed = !!(lastTurn && turnErrors?.[lastTurn]);
  if (failed || reported) {
    const fixing = Object.entries(store.getState().findingStatusBySession[sessionId] ?? {}).filter(([, status]) => status === 'fixing').map(([id]) => id);
    if (fixing.length > 0) store.reopenReviewFindings(sessionId, fixing);
  } else store.settleFixingReviewFindings(sessionId);
}

// ── R4f-findings-store (F1): the Changes pane over the session review store ─────────────────────────────────────────
// 2.42304.0 reads one store on both surfaces: the transcript card (c96d752d0 X$) seeds it, and the Changes pane's bar
// (cccc2cf0a nb: `v=fg(_),b=dg(_)`, `E=ag(_)` — the session's findings, statuses and current finding) and its finding
// cards (c44d00c7f ba/ya: cc8941b7b rt / it) read it. The host's pane also shows the reviews the card does not (a Codex
// review, ::code-comment findings), read back from the transcript (latestReviewFindings), so it seeds the store with the
// review it shows; the statuses, the current finding and the scroll target are the store's.

/**
 * c96d752d0 X$'s annotations for a ReportFindings call (`O`: ``id:`finding-${e.id}-${n}` ``, filePath the reported path,
 * startLine / endLine `t.line ?? 1`, line, body the summary, detail the failure scenario, source "finding", category,
 * verdict, createdAt), from the input as Nle (c227f4d5e Nq) reads it.
 */
export function reportFindingsAnnotations(toolId, input, createdAt = Date.now()) {
  const parsed = parseReportFindingsInput(input);
  return (parsed?.findings ?? []).map((t, n) => ({ id: `finding-${toolId}-${n}`, filePath: t.file, side: 'additions', startLine: t.line ?? 1, endLine: t.line ?? 1,
    line: t.line, body: t.summary, detail: t.failure_scenario, source: 'finding', category: t.category, verdict: t.verdict, createdAt }));
}

/**
 * What the pane seeds the store with for the review it shows (latestReviewFindings' {key, findings}): for a ReportFindings
 * review, the card's own annotations and its level (`ES.setReviewFindings(E, O, {level: x?.level, toolId: e.id, …})`), so
 * either surface may seed first; for any other review, its findings as annotations (findingAnnotation) with no level.
 * null when there is nothing to seed.
 *
 * R4f review fix: no `toolId`. In 2.42304.0 only the card's walkthrough and Apply fixes (c96d752d0 X$ `re` / `ue`, the
 * only setReviewFindings callers) add the tool to seededFindingsToolIdsBySession, and the card's auto walkthrough skips a
 * review found there (`B.includes(e.id)`); a pane visit is not a walkthrough, so it must not mark the review seeded.
 */
export function paneReviewSeed(result, items) {
  if (!result?.findings?.length) return null;
  const item = (Array.isArray(items) ? items : []).find((entry) => entry && String(entry.id) === result.key);
  const call = item ? appToolCall(item) : null;
  const parsed = call?.tool === 'ReportFindings' ? parseReportFindingsInput(call.args) : undefined;
  if (parsed) {
    const shown = new Set(result.findings.map((entry) => entry.id));
    return { key: result.key, findings: reportFindingsAnnotations(result.key, call.args).filter((entry) => shown.has(entry.id)), options: { level: parsed.level } };
  }
  return { key: result.key, findings: result.findings.map(findingAnnotation), options: {} };
}

// The review each pane-store pair last seeded per session: a review the card seeded over it (its own Walk through) is
// not seeded back on the next render, only when the pane acts on its findings.
const paneSeeds = new WeakMap();
/**
 * Seeds the store with the pane's review when some finding of it is neither held (findingsBySession) nor dismissed.
 * Once per review unless `force` (the pane's own actions, which need the store to hold what they act on). Returns
 * whether it seeded.
 */
export function seedPaneReview(store, sessionId, seed, { force = false } = {}) {
  if (!sessionId || !seed?.findings?.length) return false;
  const state = store.getState();
  const held = new Set((state.findingsBySession[sessionId] ?? []).map((entry) => entry.id)), statuses = state.findingStatusBySession[sessionId] ?? {};
  if (!seed.findings.some((entry) => !held.has(entry.id) && statuses[entry.id] !== 'dismissed')) return false;
  if (!paneSeeds.has(store)) paneSeeds.set(store, new Map());
  const seeded = paneSeeds.get(store);
  if (!force && seeded.get(sessionId) === seed.key) return false;
  seeded.set(sessionId, seed.key);
  store.setReviewFindings(sessionId, seed.findings, seed.options);
  return true;
}

/**
 * The pane's view of its review over the store: the findings not dismissed, the current one (the store's, else the
 * first: nb `D = Math.max(0, v.findIndex(e => e.id === E))`) and its index.
 */
export function paneReviewView(result, statuses = {}, current = null) {
  const findings = result?.findings?.length ? result.findings.filter((entry) => statuses?.[entry.id] !== 'dismissed') : [];
  const index = Math.max(0, findings.findIndex((entry) => entry.id === current));
  return { findings, index, currentId: findings[index]?.id ?? null };
}

// ── R4h-findings (F1): host fixed-turn / running-queue dispatch and FindingsCardHost value ───────────────────────────

/**
 * The host's fixed-turn sender (main.jsx sendFixedTurn). Starts a turn with `turn/start` when the session is idle;
 * when `queueWhileRunning` is true and a turn is already running (`running` or `isActive(id)`, Y1-R4e-findings-1),
 * queues the message on `thread/queue/add` (the composer's "later" lane in sendWhileRunning) and refreshes the queue
 * (`loadQueue`). Resolves true once started or queued, false when blocked or failed.
 */
export async function sendFixedTurnFlow(text, extraInput = [], {
  queueWhileRunning = false, id, loading = false, sending = false, running = false, actionPending = false,
  commitLock, connected = false, archived = false, ensureResumed, isActive, rpc, loadQueue, setTurnRequested,
  turnOptions, onFailed, onToasted, onWarn, createMessageId = () => crypto.randomUUID(),
} = {}) {
  if (!id || loading || sending || (running && !queueWhileRunning) || actionPending || commitLock?.current) return false;
  const fail = () => { onToasted?.(); onFailed?.(); };
  if (!connected || archived) { fail(); return false; }
  if (commitLock) commitLock.current = true;
  let requested = false;
  try {
    await ensureResumed?.(id);
    const input = [...(text || !extraInput.length ? [{ type: 'text', text, text_elements: [] }] : []), ...extraInput];
    if (running || isActive?.(id)) {
      if (!queueWhileRunning) return false;
      await rpc('thread/queue/add', { threadId: id, input, clientUserMessageId: createMessageId() });
      loadQueue?.(id);
      return true;
    }
    requested = true;
    setTurnRequested?.(id);
    await rpc('turn/start', {
      threadId: id,
      input,
      ...(turnOptions ? turnOptions() : {}),
    });
    return true;
  } catch (e) {
    if (requested) setTurnRequested?.((value) => (value === id ? null : value));
    onWarn?.(e);
    fail();
    return false;
  } finally {
    if (commitLock) commitLock.current = false;
  }
}

/**
 * The FindingsCardHost value main.jsx provides around the transcript, or null when no session is open. Both `send`
 * (idle) and `queue` (while a turn runs) dispatch through `sendFixedTurn` with `{ queueWhileRunning: true }`; a
 * false return while connected and unarchived (without `sendFixedTurn` having shown its own toast) means another
 * action holds the session (loading, sending, actionPending, commitLock), so it throws for X$ to show its send-failed
 * toast and reopen the findings.
 */
export function findingsCardHostValue({
  current, running = false, canViewChanges = false, fileInChanges = null,
  connected = false, archived = false,
  openChanges, sendFixedTurn, rerun, prefill,
} = {}) {
  if (!current) return null;
  const dispatch = (text) => {
    let toasted = false;
    return Promise.resolve(sendFixedTurn(text, [], { queueWhileRunning: true, onToasted: () => { toasted = true; } })).then((sent) => {
      if (sent === false && connected && !archived && !toasted) throw new Error('The session is busy with another action.');
      return sent;
    });
  };
  return {
    sessionKey: current,
    running: Boolean(running),
    canViewChanges: Boolean(canViewChanges),
    fileInChanges,
    openChanges,
    send: dispatch,
    queue: dispatch,
    rerun,
    prefill,
  };
}
