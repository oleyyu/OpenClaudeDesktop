// Workflow task card and task Stop button, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, prestage-btgap:
// Background tasks pane, "Up next" and the 4.16336.0 workflow card).
//
// What the Background tasks pane draws in 4.16336.0 (c9bd7af9c RI, the pane's task row):
//   a local_workflow task  `u(ds, {task: r, variant: "detailed", sessionRef: i, onStop: a, stopping: o?.has(r.taskId),
//                           inRunning: t.inRunning, depth: t.depth, tasksFollow: t.tasksFollow})`, ds = c96d752d0 jU
//                           (exported `Wr`), the workflow task card;
//   any other task's Stop  `u(Zo, {quiet: b === "line", busy: i, busyLabel: …"Stopping…", onClick: U, ariaLabel: …"Stop
//                           this task"…})`, Zo = c96d752d0 QH (exported `Kr`): CDS Button `icon: "StopFilled"`, size
//                           "xs" inside the pane frame (QH `l = T(pf)`, `d = s || l ? "xs" : "sm"`).
// jU's detailed variant is kQe: the task's progress (DQe: the finished run's output file, else `t.workflowProgress`)
// through c62da1b56 at (`$d`: the CLI's workflow_phase / workflow_agent entries -> {counts, phases}); with the pane
// frame's panels context set (`E = T(pf)`, pf = shared-120 Je) a running run is CQe: the title row (Stopping… / the
// elapsed time) and its Stop (QH), the description, the counts line (EU), one collapsible row per started phase (_Qe,
// pieces drawn by wH({…, inParent}) first / last) and last the "Up next: {phases}" piece (`T = Poe(r)`, c62da1b56 ct:
// the phases with no agent yet after the last one that has any — the CLI announces every meta.phases entry as a
// workflow_phase up front). The panels context is the pane frame's own: c4db265df Tn provides `t(we, {value: !0,
// children: t(Yt, {value: null, children: et})})` around the pane body, and the host's Background tasks pane already
// sits in that frame (generated/session-panels-v4 pane-frame.mjs, source-agent.jsx), so nothing is provided here.
//
// One user customisation, not official (U-BT-KEEP, REWRITES below): CQe's description line reads agents + tokens, built
// from the same chunk's official counts / tokens cell.
//
// Host boundaries (HOST_ADAPTERS): DQe reads the desktop's session clients and its session engine store, which the host
// does not have; each is the host answer another graph already uses for the same official binding (3.6556.2 / 4.16336.0):
//   cef1e6037 Z    the local session client (3.6556.2 graph: localSessionClient, no readFile: the card keeps the task's
//                  own workflowProgress, DQe's "workflow-output-unavailable" branch);
//   c5da7eb42 LL   the session band fields hook (session-rail-v4 / turn-box-v4: useSessionBandFields; tde's bridge
//                  `isConnected` read);
//   c06cf64bb vO   the session engine store (code-transcript: sessionBucketsStore; HTe's `wakeSession` for a remote
//                  session's output read: a host session is local, so HTe never wakes one). vO assigns module state
//                  cds-core holds without publishing its writer (code-transcript-v4 CDS_CORE_WRITER_NEEDS): sliced, it
//                  would fail W7-D1;
//   vendor-intl q  react-intl useIntl over the host catalog (transcript-rows-v4 and every 4.16336.0 graph).
// The agent cells' style (c96d752d0 injects c1bc4f7a0 at module load, as 3.6556.2 did) is byte for byte the 3.6556.2
// text scripts/extract-code-transcript.mjs already writes (generated/code-transcript/agent-cell.css): checked here
// (AGENT_CELL_STYLE) and imported once from that file by the adapter module, never written a second time.
//
// Machinery: runSlicer (scripts/extract-working-line.mjs), sourceContract scripts/official-4.16336.0.mjs, sharedGraph
// 'cds-core' (pinned manifest sha256, CDS primitives such as Button / Icon / Collapsible / Tooltip are linked, never
// sliced), linkedAreas for every other 4.16336.0 graph the closure reaches (D1: one holder). Roots are located on the
// official AST (the only top-level declaration carrying the features, under the reviewed local and export alias) with
// their raw declaration sha256 pinned (ROOT_PINS, never refreshed by a script).
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const WORKFLOW_CARD_V4_OUTPUT = 'src/generated/workflow-card-v4';
const ADAPTER_FILE = 'src/source-workflow-card-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const C96 = 'c96d752d0-D9VB6ArX.js', PANE = 'c9bd7af9c-Bvb7EG4D.js', FRAME = 'c4db265df-CHyZjtsm.js', MODEL = 'c62da1b56-Blm2zUF0.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias), probe (raw), features (prettier form), previous } ──
export const ROOTS = {
  [C96]: {
    jU: { name: 'WorkflowTaskCard', export: 'Wr', probe: 'n==="compact"?f(JZe,', previous: 'c96d752d0-CWv_7-n9.js#N$',
      features: ['inRunning: u,', 'tasksFollow: d,', 'n === "compact"', 'f(kQe, {', 'inRunning: u ?? t.status === "running",', 'tasksFollow: h,'] },
    QH: { name: 'TaskStopButton', export: 'Kr', probe: 'icon:"StopFilled"', previous: 'c96d752d0-CWv_7-n9.js#UQ',
      features: ['l = T(pf),', 'd = s || l ? "xs" : "sm",', 'p = s && !l ? "ghost" : "secondary",', 'icon: "StopFilled",', 'iconOnly: !0,'] },
  },
};
export const ROOT_PINS = {
  'c96d752d0-D9VB6ArX.js#jU': '65c35bcdcbb5137c85d692c5050c06da5e9539b7dbead851b9992dea71750ad1',
  'c96d752d0-D9VB6ArX.js#QH': '1fbf6fac9b5696816dfa266501a7f00b4273bed83d4cf2db834b89d4c428a310',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (the host module it re-exports), old
//    (the 3.6556.2 binding the same host answer stands in for), features } ───────────────────────────────────────────
const CT = 'src/source-code-transcript-adapters.jsx', FEED = 'src/source-code-feed-adapters.jsx', SR = 'src/source-session-rail-adapters.jsx',
  TR = 'src/source-transcript-rows-adapters.jsx';
export const HOST_ADAPTERS = {
  'cef1e6037-Dm5Rlsox.js#Z': { name: 'localSessionClient', from: FEED, old: 'cef1e6037-C9OZ_iaL.js#Z',
    features: ['cancelQueuedNeedsConfirm: !1,', 'fetchTail: !1,'] },
  'c5da7eb42-aEqbSKbC.js#LL': { name: 'useSessionBandFields', from: SR, old: 'c5da7eb42-XijZdwf1.js#QI',
    features: ['{ select: t, passive: r, enabled: i }'] },
  'c06cf64bb-CoZso5N4.js#vO': { name: 'sessionBucketsStore', from: CT, old: 'c06cf64bb-CdJdJuVd.js#iD',
    features: ['protocolHandlers', 'r.evictTimer && clearTimeout(r.evictTimer),'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: TR, old: 'vendor-intl-DYfox5Co.js#q',
    features: ['return (Mt(e), e);'] },
};
export const ADAPTER_PINS = {
  'cef1e6037-Dm5Rlsox.js#Z': '5e0de79a41f07ae54196b3301892e44fdfd8f536526eb0e70d399f24ea97d22a',
  'c5da7eb42-aEqbSKbC.js#LL': '6b7105ae24f3ae257f8320347117a0f95159a2f96952da4134221c3550c95cca',
  'c06cf64bb-CoZso5N4.js#vO': '44ae4a01ef85d4d040140e3ed3a8ad66b2751e2109cc88d4c32e0fbc9c4eaf8b',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// ── Linked graphs: the 4.16336.0 graphs that hold what the closure reaches (D1: imported, never sliced again). ────────
export const LINKED_AREAS = [
  'artifact-library-v4', 'cowork-progress-v4', 'cowork-scheduled-v4', 'files-changes-v4', 'frame-sidebar-nav', 'proposal-group-v4',
  'routines-shared-v4', 'session-rail-changes-v4', 'session-rail-context-v4', 'session-rail-kit-v4', 'session-rail-sections-v4',
  'settings-desktop-v4', 'settings-nav', 'transcript-rows-v4', 'turn-plan-v4', 'working-line-v4',
];
// Pure bindings a linked area slices without exporting, sliced again here (d1-lib classify: not module state).
export const linkedCopies = {
  'c966e2bd9-D2U_Ub6d.js#e': 'the ANSI escape pattern (a regex literal; every reader resets lastIndex or clones it), sliced by transcript-rows-v4 without an export: c62da1b56 ft\'s ANSI strip of a run\'s summary reads it through c966e2bd9 s',
};

const target = file => (file === C96 ? 'workflow-card.mjs' : `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`);
// The chunks the closure reaches outside c96d752d0 (dry run with every 4.16336.0 graph linked).
export const CLOSURE_CHUNKS = ['c0a74d72b-BELp4TMv.js', 'c425fb3cf-Gc8R9PSy.js', 'c5da7eb42-aEqbSKbC.js', 'c62da1b56-Blm2zUF0.js', 'c966e2bd9-D2U_Ub6d.js',
  'shared-123-1Hc1RTKl.js', 'shared-140-DfG6VwpK.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js'];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

// ── User customisation U-BT-KEEP (2026-11-11, prestage-btgap; NOT official 4.16336.0) ─────────────────────────────
// The user asked for the panel card's description line (CQe: `O ? <div className={s ? FH : void 0}><SQe text=
// {t.description}/></div> : null`) to read "agents count + tokens count" instead. Built only from official pieces:
//   the counts / tokens span is the same chunk's non-panels detailed card (kQe -> the running full card, the `R` cell):
//     COUNTS_TOKENS (verbatim below), with its running branch taken (CQe only draws a running run: kQe `if(E&&u)`), so
//     `muted:!u` -> `muted:!1` and `v:u?EQe:OU` -> `v:EQe`, and its counts read CQe's own `counts` prop (`i`, which kQe
//     passes as `m?.counts`): `m&&m.counts.total>0` -> `i&&i.total>0`, `counts:m.counts` -> `counts:i`;
//   the line's box is SQe's own non-expandable branch (`f("div",{className:e,children:d})`, `e=st("flex min-h-5 min-w-0
//     items-center",RH)`) inside CQe's own description cell (`f("div",{className:s?FH:void 0,…})`);
//   the condition is the official cell's (`m&&m.counts.total>0||t.usage`), on `i`.
// CQe's memo slots 69..72 for that cell are left unused (the cell now reads i and t.usage; it is recomputed per render).
// Applied by runSlicer's cfg.rewrites on the official minified declaration (each substitution counted exactly once) and
// recorded in manifest.json (rewrites) and provenance.json; the binding's manifest sha256 stays the official one.
export const COUNTS_TOKENS = 'h("span",{className:"flex flex-wrap items-baseline gap-x-sm gap-y-0.75",children:[m&&m.counts.total>0?f(cU,{counts:m.counts,muted:!u}):null,t.usage?f("span",{children:f(Q,{defaultMessage:"<v>{n}</v> tokens",id:"q8yC2bH6mD",values:{n:hu(t.usage.totalTokens),v:u?EQe:OU}})}):null]})';
const COUNTS_TOKENS_SUBST = [['m&&m.counts.total>0?', 'i&&i.total>0?'], ['counts:m.counts,muted:!u', 'counts:i,muted:!1'], ['v:u?EQe:OU', 'v:EQe']];
export const DESCRIPTION_CELL = 'ee=J2($,69,O,s)||J1($,71,t.description)?I1($,71,Z2($,69,O?f("div",{className:s?FH:void 0,children:f(SQe,{text:t.description})}):null,O,s),t.description):$[72]';
export const SQE_BOX = 'let e=st("flex min-h-5 min-w-0 items-center",RH)';
function countsTokensCell() {
  let span = COUNTS_TOKENS;
  for (const [from, to] of COUNTS_TOKENS_SUBST) {
    const count = span.split(from).length - 1;
    if (count !== 1) throw Error(`U-BT-KEEP: ${from} occurs ${count} times in the official counts / tokens cell, expected 1`);
    span = span.split(from).join(to);
  }
  return `ee=/* U-BT-KEEP user customisation, not official 4.16336.0: agents + tokens replace the description (scripts/extract-workflow-card-v4.mjs REWRITES) */i&&i.total>0||t.usage?f("div",{className:s?FH:void 0,children:f("div",{className:st("flex min-h-5 min-w-0 items-center",RH),children:${span}})}):null`;
}
export const REWRITES = {
  [`${C96}#CQe`]: [{ from: DESCRIPTION_CELL, to: countsTokensCell(),
    why: 'User customisation U-BT-KEEP (2026-11-11), not official: the panel card\'s description line reads agents + tokens (the non-panels card\'s official counts / tokens cell, running branch) instead of task.description' }],
};

// ── Raw call sites and the official data source (each feature occurs exactly once in the official chunk). ──────────
export const RAW_CALL_SITES = [
  { source: PANE, role: 'The Background tasks pane row (c9bd7af9c RI) draws a local_workflow task as c96d752d0 jU (Wr as ds), detailed',
    features: ['Wr as ds', 'u(ds,{task:r,variant:"detailed",sessionRef:i,onStop:a,stopping:o?.has(r.taskId),inRunning:t.inRunning,depth:t.depth,tasksFollow:t.tasksFollow})'] },
  { source: PANE, role: 'The pane\'s other task cards stop through c96d752d0 QH (Kr as Zo)',
    features: ['Kr as Zo', 'u(Zo,{quiet:b==="line",busy:i,busyLabel:k.formatMessage({defaultMessage:"Stopping\\u2026",id:"NACfNicI6z"}),onClick:U,ariaLabel:k.formatMessage({defaultMessage:"Stop this task",id:"+ZLTl3VMv+"})'] },
  { source: FRAME, role: 'The pane frame (c4db265df Tn) sets the panels context (shared-120 Je, gn as we) around the pane body',
    features: ['gn as we', 'et=J1($,0,je)?K1($,0,je,t(fe,{value:!1,children:je})):$[1]', 't(we,{value:!0,children:t(Yt,{value:null,children:et})})'] },
  { source: C96, role: 'kQe draws a running workflow as CQe under the panels context; CQe ends in "Up next: {phases}" (Poe = c62da1b56 ct); QH sizes its StopFilled button by the panels context',
    features: ['import{gn as pf,mn as mf,nn as Yoe}from"./shared-120-DCdTP1_5.js"', 'import{A as Poe,', 'E=T(pf),D=!!m&&m.phases.length>0;if(E&&u)',
      'return f(CQe,{task:t,title:x,phases:m?.phases.map(t=>t.index===af?{...t,title:e}:t)??[],counts:m?.counts,stallNow:d,stopping:a,onStop:i&&w,depth:o,tasksFollow:c})',
      'T=Poe(r)', 'defaultMessage:"Up next: {phases}",id:"AbOFlWPZyk"', 'l=T(pf),u=J1($,0,t)', 'icon:"StopFilled"', 'jU as Wr', 'QH as Kr'] },
  { source: C96, role: 'U-BT-KEEP (user customisation, not official): the official pieces the panel card\'s agents + tokens line is built from (REWRITES): the non-panels card\'s counts / tokens cell, SQe\'s line box and CQe\'s description cell it replaces',
    features: ['R=J2($,99,u,m)||J1($,101,t.usage)?I1($,101,Z2($,99,m&&m.counts.total>0||t.usage?', COUNTS_TOKENS, SQE_BOX, DESCRIPTION_CELL] },
  { source: MODEL, role: 'The phases model: a workflow_phase entry opens a phase with no agents (counts.total 0); ct (exported A) is the upcoming ones',
    features: ['if(n.type==="workflow_phase"){a(n.index,n.title);continue}', 'function ct(e){let t=Math.max(-1,...e.filter(e=>e.index!==D&&e.counts.total>0).map(e=>e.index));return e.filter(e=>e.counts.total===0&&e.index>t)}', 'ct as A'] },
];

// c96d752d0's inline style c1bc4f7a0 (the agent cells): the same text as the 3.6556.2 chunk's, already written verbatim
// by scripts/extract-code-transcript.mjs; this graph keeps that one file.
export const AGENT_CELL_STYLE = { source: C96, id: 'c1bc4f7a0', file: 'src/generated/code-transcript/agent-cell.css',
  features: ['.epitaxy-agent-cell{background-color:#0000;border:1px solid #0000;', '.epitaxy-agent-cell--done{background-color:var(--cds-alpha-3)}', '@keyframes epitaxy-agent-pulse{'] };
export function agentCellStyle() {
  const style = AGENT_CELL_STYLE;
  const text = fsSync.readFileSync(path.join(official.ionSource, style.source), 'utf8');
  const prelude = ['querySelector(\'style[data-inline-css="\'+e+\'"]\')', 'r.setAttribute("data-inline-css",e)', 'r.textContent=t,n.head.appendChild(r)'];
  const call = `("${style.id}","`;
  if (text.split(call).length - 1 !== 1) throw Error(`${style.source}: inline style ${style.id} occurs ${text.split(call).length - 1} times, expected 1`);
  const at = text.indexOf(call), head = text.slice(Math.max(0, at - 600), at);
  for (const pin of prelude) if (!head.includes(pin)) throw Error(`${style.source}: inline style ${style.id}: prelude pin ${pin} not found`);
  const literal = text.slice(at + call.length - 1).match(/^"(?:[^"\\]|\\.)*"/);
  if (!literal) throw Error(`${style.source}: inline style ${style.id}: no string literal`);
  const css = JSON.parse(literal[0]);
  for (const feature of style.features) if (css.split(feature).length - 1 !== 1) throw Error(`${style.source}: inline style ${style.id}: ${feature} not found once`);
  const file = fsSync.readFileSync(path.join(root, style.file), 'utf8');
  const body = file.slice(file.indexOf('*/\n') + 3);
  if (body !== `${css}\n`) throw Error(`${style.file} is not the ${official.referenceVersion} ${style.source} inline style ${style.id}: write it from this version`);
  return { source: style.source, id: style.id, file: style.file, cssSha256: sha(css), fileSha256: sha(file) };
}

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, previous: spec.previous, declarationSha256, pinned: true });
    }
  }
  return found;
}

export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    if (ADAPTER_PINS[key] !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${ADAPTER_PINS[key]}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: true });
  }
  return out;
}

export async function assertRawCallSites() {
  const out = [];
  for (const site of RAW_CALL_SITES) {
    const bytes = await fs.readFile(path.join(official.ionSource, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    out.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), features: site.features });
  }
  return out;
}

// The adapter module: one re-export line per host module (exactly this graph's adapters) and the agent cells' style.
export async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
  const css = `import "./${path.relative('src', AGENT_CELL_STYLE.file)}";`;
  if (text.split(css).length - 1 !== 1) throw Error(`${ADAPTER_FILE}: imports the agent cells' style ${css} ${text.split(css).length - 1} times, expected 1`);
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the workflow-card-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function workflowCardV4Config() {
  return {
    name: 'workflow card (4.16336.0)', generator: 'extract-workflow-card-v4.mjs', output: path.join(root, WORKFLOW_CARD_V4_OUTPUT),
    adapterModule: '../../source-workflow-card-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites: RAW_CALL_SITES, linkedCopies, rewrites: REWRITES, sharedGraph: 'cds-core', generatedRoot, sourceContract: official,
    linkedAreas: LINKED_AREAS, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = workflowCardV4Config;

export async function extractWorkflowCardV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const callSites = await assertRawCallSites();
  const agentCells = agentCellStyle();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...workflowCardV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the workflow-card roots (${official.referenceVersion}); generated by extract-workflow-card-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-workflow-card-v4.mjs',
          previous: { generator: 'scripts/extract-code-transcript.mjs', output: 'src/generated/code-transcript', referenceVersion: official.previousVersion,
            roots: { WorkflowTaskCard: 'c96d752d0-CWv_7-n9.js#N$', TaskStopButton: 'c96d752d0-CWv_7-n9.js#UQ' } },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, adapters, linkedCopies, callSites, agentCells,
          userCustomisations: (m.rewrites ?? []).map(r => ({ decision: 'U-BT-KEEP', official: false, binding: r.binding, why: r.why, fromSha256: r.fromSha256, toSha256: r.toSha256 })),
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractWorkflowCardV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
